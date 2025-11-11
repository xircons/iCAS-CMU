import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';
import pool from '../../../config/database';
import { generateToken, verifyToken } from '../utils/jwt';
import { User, DatabaseUser } from '../../../types';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';
import { validateThaiOnly, validateThaiOnlyNoSpaces, validatePhoneNumber, validateMajor } from '../utils/validation';

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, phoneNumber, major } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !major) {
      const error: ApiError = new Error('All required fields must be provided');
      error.statusCode = 400;
      throw error;
    }

    // Validate Thai-only for first name (no spaces)
    if (!validateThaiOnlyNoSpaces(firstName)) {
      const error: ApiError = new Error('First name must contain only Thai characters without spaces');
      error.statusCode = 400;
      throw error;
    }

    // Validate Thai-only for last name (no spaces)
    if (!validateThaiOnlyNoSpaces(lastName)) {
      const error: ApiError = new Error('Last name must contain only Thai characters without spaces');
      error.statusCode = 400;
      throw error;
    }

    // Validate email format and domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: ApiError = new Error('Invalid email format');
      error.statusCode = 400;
      throw error;
    }

    // Validate email domain - must be @cmu.ac.th
    if (!email.endsWith('@cmu.ac.th')) {
      const error: ApiError = new Error('Email must be from @cmu.ac.th domain');
      error.statusCode = 400;
      throw error;
    }

    // Validate password
    if (password.length < 6) {
      const error: ApiError = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      const error: ApiError = new Error('Passwords do not match');
      error.statusCode = 400;
      throw error;
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      const error: ApiError = new Error('Phone number must be in format 0XX-XXX-XXXX');
      error.statusCode = 400;
      throw error;
    }

    // Validate major
    if (!validateMajor(major)) {
      const error: ApiError = new Error('Invalid major selected');
      error.statusCode = 400;
      throw error;
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as [DatabaseUser[], any];

    if (existingUsers.length > 0) {
      const error: ApiError = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user with default role 'member'
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, first_name, last_name, phone_number, major, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
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

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
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
      const error: ApiError = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    // Find user by email
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      const error: ApiError = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const dbUser = rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);

    if (!isPasswordValid) {
      const error: ApiError = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
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

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
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

export const verify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: ApiError = new Error('No token provided');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.substring(7);

    // Verify token and get user from database
    const decoded = verifyToken(token);

    // Get fresh user data from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const dbUser = rows[0];

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
      },
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
      const error: ApiError = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    // Get user from database
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId]
    ) as [DatabaseUser[], any];

    if (rows.length === 0) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const dbUser = rows[0];

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
      },
    });
  } catch (error) {
    next(error);
  }
};

