import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import type { RowDataPacket, ResultSetHeader } from '../../../types/db';
import pool from '../../../config/database';
import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from '../utils/jwt';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies } from '../utils/cookies';
import { User, DatabaseUser } from '../../../types';
import { createApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import { validateThaiOnly, validateThaiOnlyNoSpaces, validatePhoneNumber, validateMajor } from '../utils/validation';
import { createAndSendOTP, verifyOTP } from '../../../services/otpService';
import { isSuspendedDbRow } from '../../../utils/suspendedHelpers';

/** node-pg returns lowercase keys for unquoted column aliases (e.g. clubid not clubId). */
function mapClubMembershipRow(row: Record<string, any>) {
  const clubIdRaw = row.clubId ?? row.clubid;
  const clubPublicIdRaw = row.clubPublicId ?? row.clubpublicid;
  const rd = row.requestDate ?? row.requestdate;
  const ad = row.approvedDate ?? row.approveddate;
  return {
    id: row.id,
    clubId: clubIdRaw != null && clubIdRaw !== '' ? Number(clubIdRaw) : undefined,
    clubPublicId: clubPublicIdRaw != null && clubPublicIdRaw !== '' ? String(clubPublicIdRaw) : undefined,
    clubName: row.clubName ?? row.clubname,
    status: row.status,
    role: row.role,
    requestDate: rd
      ? rd instanceof Date
        ? rd.toISOString()
        : new Date(String(rd)).toISOString()
      : undefined,
    approvedDate: ad
      ? ad instanceof Date
        ? ad.toISOString()
        : new Date(String(ad)).toISOString()
      : undefined,
  };
}

export const requestOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createApiError('กรุณากรอกอีเมล', 400, 'AUTH_EMAIL_REQUIRED');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createApiError('รูปแบบอีเมลไม่ถูกต้อง', 400, 'AUTH_EMAIL_INVALID');
    }

    if (!email.endsWith('@cmu.ac.th')) {
      throw createApiError('ต้องใช้อีเมล @cmu.ac.th เท่านั้น', 400, 'AUTH_EMAIL_DOMAIN');
    }

    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as [DatabaseUser[], any];

    if (existingUsers.length > 0) {
      throw createApiError('อีเมลนี้ลงทะเบียนแล้ว', 409, 'AUTH_EMAIL_TAKEN');
    }

    const result = await createAndSendOTP(email);

    if (!result.success) {
      throw createApiError(result.message, 429, 'AUTH_OTP_RATE_LIMIT');
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, phoneNumber, major, otp } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !major || !otp) {
      throw createApiError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ รวมถึงรหัส OTP', 400, 'AUTH_SIGNUP_FIELDS');
    }

    // Validate Thai-only for first name (no spaces)
    if (!validateThaiOnlyNoSpaces(firstName)) {
      throw createApiError('ชื่อจริงต้องเป็นภาษาไทยเท่านั้น ไม่มีช่องว่าง', 400, 'AUTH_FIRST_NAME_THAI');
    }

    // Validate Thai-only for last name (no spaces)
    if (!validateThaiOnlyNoSpaces(lastName)) {
      throw createApiError('นามสกุลต้องเป็นภาษาไทยเท่านั้น ไม่มีช่องว่าง', 400, 'AUTH_LAST_NAME_THAI');
    }

    // Validate email format and domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createApiError('รูปแบบอีเมลไม่ถูกต้อง', 400, 'AUTH_EMAIL_INVALID');
    }

    // Validate email domain - must be @cmu.ac.th
    if (!email.endsWith('@cmu.ac.th')) {
      throw createApiError('ต้องใช้อีเมล @cmu.ac.th เท่านั้น', 400, 'AUTH_EMAIL_DOMAIN');
    }

    // Validate password
    if (password.length < 6) {
      throw createApiError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400, 'AUTH_PASSWORD_SHORT');
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw createApiError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 400, 'AUTH_PASSWORD_MISMATCH');
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      throw createApiError('เบอร์โทรศัพท์ต้องอยู่ในรูปแบบ 0XX-XXX-XXXX', 400, 'AUTH_PHONE_INVALID');
    }

    // Validate major
    if (!validateMajor(major)) {
      throw createApiError('สาขาที่เลือกไม่ถูกต้อง', 400, 'AUTH_MAJOR_INVALID');
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as [DatabaseUser[], any];

    if (existingUsers.length > 0) {
      throw createApiError('อีเมลนี้ลงทะเบียนแล้ว', 409, 'AUTH_EMAIL_TAKEN');
    }

    const isOTPValid = await verifyOTP(email, otp);
    if (!isOTPValid) {
      throw createApiError('รหัส OTP ไม่ถูกต้องหรือหมดอายุ', 400, 'AUTH_OTP_INVALID');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user with default role 'member'
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, first_name, last_name, phone_number, major, role) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [email, hashedPassword, firstName.trim(), lastName.trim(), phoneNumber || null, major, 'member']
    ) as any;

    const userId = result.insertId;

    // Get the created user
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as [DatabaseUser[], any];

    const dbUser = rows[0];

    // Convert database user to application user
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phoneNumber: dbUser.phone_number || undefined,
      major: dbUser.major,
      role: dbUser.role,
      clubId: dbUser.club_id || undefined,
      clubName: dbUser.club_name || undefined,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    // Generate JWT tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set HttpOnly cookies
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        major: user.major,
        role: user.role,
        clubId: user.clubId,
        clubName: user.clubName,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createApiError('กรุณากรอกอีเมลและรหัสผ่าน', 400, 'AUTH_LOGIN_FIELDS');
    }

    const normalizedEmail = String(email).trim();
    if (!normalizedEmail) {
      throw createApiError('กรุณากรอกอีเมลและรหัสผ่าน', 400, 'AUTH_LOGIN_FIELDS');
    }

    // Case-insensitive match; reject ambiguous duplicates (same local-part different casing)
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
      [normalizedEmail]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      throw createApiError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    if (rows.length > 1) {
      throw createApiError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const dbUser = rows[0];

    if (isSuspendedDbRow(dbUser as unknown as Record<string, unknown>)) {
      throw createApiError('บัญชีของคุณถูกระงับการใช้งาน', 403, 'AUTH_ACCOUNT_SUSPENDED');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);

    if (!isPasswordValid) {
      throw createApiError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    // Get user's club memberships (if table exists)
    let memberships: any[] = [];
    try {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.club_id as clubId, cm.status, cm.role, cm.request_date as requestDate,
                cm.approved_date as approvedDate, c.public_id as clubPublicId, c.name as clubName
         FROM club_memberships cm
         JOIN clubs c ON cm.club_id = c.id
         WHERE cm.user_id = ?
         ORDER BY cm.created_at DESC`,
        [dbUser.id]
      ) as [RowDataPacket[], any];

      memberships = membershipRows.map((row: any) => mapClubMembershipRow(row));
    } catch (error: any) {
      // If club_memberships table doesn't exist, just use empty array
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  club_memberships table not found, using empty memberships array');
      }
      memberships = [];
    }

    // Convert database user to application user
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phoneNumber: dbUser.phone_number || undefined,
      major: dbUser.major,
      role: dbUser.role,
      clubId: dbUser.club_id || undefined,
      clubName: dbUser.club_name || undefined,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    // Generate JWT tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set HttpOnly cookies
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        major: user.major,
        role: user.role,
        clubId: user.clubId,
        clubName: user.clubName,
        avatar: user.avatar,
        memberships,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get token from cookie first, then fallback to Authorization header
    const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

    if (!token) {
      throw createApiError('ไม่พบโทเคนการเข้าสู่ระบบ', 401, 'AUTH_NO_TOKEN');
    }

    // Verify token and get user from database
    const decoded = verifyToken(token);

    // Get fresh user data from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = rows[0];

    if (isSuspendedDbRow(dbUser as unknown as Record<string, unknown>)) {
      clearAuthCookies(res);
      throw createApiError('บัญชีของคุณถูกระงับการใช้งาน', 403, 'AUTH_ACCOUNT_SUSPENDED');
    }

    // Get user's club memberships (if table exists)
    let memberships: any[] = [];
    try {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.club_id as clubId, cm.status, cm.role, cm.request_date as requestDate,
                cm.approved_date as approvedDate, c.public_id as clubPublicId, c.name as clubName
         FROM club_memberships cm
         JOIN clubs c ON cm.club_id = c.id
         WHERE cm.user_id = ?
         ORDER BY cm.created_at DESC`,
        [dbUser.id]
      ) as [RowDataPacket[], any];

      memberships = membershipRows.map((row: any) => mapClubMembershipRow(row));
    } catch (error: any) {
      // If club_memberships table doesn't exist, just use empty array
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  club_memberships table not found, using empty memberships array');
      }
      memberships = [];
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phoneNumber: dbUser.phone_number || undefined,
      major: dbUser.major,
      role: dbUser.role,
      clubId: dbUser.club_id || undefined,
      clubName: dbUser.club_name || undefined,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        major: user.major,
        role: user.role,
        clubId: user.clubId,
        clubName: user.clubName,
        avatar: user.avatar,
        memberships,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Clear both access and refresh token cookies
    clearAuthCookies(res);
    
    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    // Get user from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = rows[0];

    if (isSuspendedDbRow(dbUser as unknown as Record<string, unknown>)) {
      clearAuthCookies(res);
      throw createApiError('บัญชีของคุณถูกระงับการใช้งาน', 403, 'AUTH_ACCOUNT_SUSPENDED');
    }

    // Get user's club memberships (if table exists)
    let memberships: any[] = [];
    try {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.club_id as clubId, cm.status, cm.role, cm.request_date as requestDate,
                cm.approved_date as approvedDate, c.public_id as clubPublicId, c.name as clubName
         FROM club_memberships cm
         JOIN clubs c ON cm.club_id = c.id
         WHERE cm.user_id = ?
         ORDER BY cm.created_at DESC`,
        [dbUser.id]
      ) as [RowDataPacket[], any];

      memberships = membershipRows.map((row: any) => mapClubMembershipRow(row));
    } catch (error: any) {
      // If club_memberships table doesn't exist, just use empty array
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  club_memberships table not found, using empty memberships array');
      }
      memberships = [];
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phoneNumber: dbUser.phone_number || undefined,
      major: dbUser.major,
      role: dbUser.role,
      clubId: dbUser.club_id || undefined,
      clubName: dbUser.club_name || undefined,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        major: user.major,
        role: user.role,
        clubId: user.clubId,
        clubName: user.clubName,
        avatar: user.avatar,
        memberships,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile (name, phone number - email cannot be changed)
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { firstName, lastName, phoneNumber } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!firstName || !lastName) {
      throw createApiError('กรุณากรอกชื่อจริงและนามสกุล', 400, 'AUTH_PROFILE_NAMES');
    }

    // Validate Thai-only for first name (no spaces)
    if (!validateThaiOnlyNoSpaces(firstName)) {
      throw createApiError('ชื่อจริงต้องเป็นภาษาไทยเท่านั้น ไม่มีช่องว่าง', 400, 'AUTH_FIRST_NAME_THAI');
    }

    // Validate Thai-only for last name (no spaces)
    if (!validateThaiOnlyNoSpaces(lastName)) {
      throw createApiError('นามสกุลต้องเป็นภาษาไทยเท่านั้น ไม่มีช่องว่าง', 400, 'AUTH_LAST_NAME_THAI');
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      throw createApiError('เบอร์โทรศัพท์ต้องอยู่ในรูปแบบ 0XX-XXX-XXXX', 400, 'AUTH_PHONE_INVALID');
    }

    // Update user profile
    const [result] = await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, phone_number = ? WHERE id = ?',
      [firstName.trim(), lastName.trim(), phoneNumber || null, userId]
    ) as any;

    if (result.affectedRows === 0) {
      throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
    }

    // Get updated user
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as [DatabaseUser[], any];

    const dbUser = rows[0];

    // Get user's club memberships
    let memberships: any[] = [];
    try {
      const [membershipRows] = await pool.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.club_id as clubId, cm.status, cm.role, cm.request_date as requestDate,
                cm.approved_date as approvedDate, c.public_id as clubPublicId, c.name as clubName
         FROM club_memberships cm
         JOIN clubs c ON cm.club_id = c.id
         WHERE cm.user_id = ?
         ORDER BY cm.created_at DESC`,
        [userId]
      ) as [RowDataPacket[], any];

      memberships = membershipRows.map((row: any) => mapClubMembershipRow(row));
    } catch (error: any) {
      // If club_memberships table doesn't exist, just use empty array
      memberships = [];
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phoneNumber: dbUser.phone_number || undefined,
      major: dbUser.major,
      role: dbUser.role,
      clubId: dbUser.club_id || undefined,
      clubName: dbUser.club_name || undefined,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    res.json({
      success: true,
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        major: user.major,
        role: user.role,
        clubId: user.clubId,
        clubName: user.clubName,
        avatar: user.avatar,
        memberships,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Change password (requires old password)
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw createApiError('กรุณากรอกรหัสผ่านเดิม รหัสผ่านใหม่ และยืนยันรหัสผ่าน', 400, 'AUTH_CHANGE_PASSWORD_FIELDS');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw createApiError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 400, 'AUTH_NEW_PASSWORD_SHORT');
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      throw createApiError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 400, 'AUTH_NEW_PASSWORD_MISMATCH');
    }

    // Get user from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = rows[0];

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, dbUser.password);
    if (!isOldPasswordValid) {
      throw createApiError('รหัสผ่านเดิมไม่ถูกต้อง', 401, 'AUTH_OLD_PASSWORD_WRONG');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createApiError('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ', 401, 'AUTH_UNAUTHORIZED');
    }

    const { password } = req.body;
    const userId = req.user.userId;

    // Validate password
    if (!password) {
      throw createApiError('กรุณากรอกรหัสผ่านเพื่อลบบัญชี', 400, 'AUTH_DELETE_PASSWORD_REQUIRED');
    }

    // Get user from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    if (!isPasswordValid) {
      throw createApiError('รหัสผ่านไม่ถูกต้อง', 401, 'AUTH_PASSWORD_WRONG');
    }

    // Delete user account (CASCADE will handle related records)
    await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    // Clear auth cookies
    clearAuthCookies(res);

    res.json({
      success: true,
      message: 'ลบบัญชีสำเร็จ',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw createApiError('ไม่พบโทเคนรีเฟรช', 401, 'AUTH_NO_REFRESH_TOKEN');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      throw createApiError('ไม่พบผู้ใช้', 404, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = rows[0];

    if (isSuspendedDbRow(dbUser as unknown as Record<string, unknown>)) {
      clearAuthCookies(res);
      throw createApiError('บัญชีของคุณถูกระงับการใช้งาน', 403, 'AUTH_ACCOUNT_SUSPENDED');
    }

    // Convert database user to application user
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phoneNumber: dbUser.phone_number || undefined,
      major: dbUser.major,
      role: dbUser.role,
      clubId: dbUser.club_id || undefined,
      clubName: dbUser.club_name || undefined,
      avatar: dbUser.avatar || undefined,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    // Generate new access token
    const newAccessToken = generateToken(user);

    // Set new access token cookie
    setAccessTokenCookie(res, newAccessToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

