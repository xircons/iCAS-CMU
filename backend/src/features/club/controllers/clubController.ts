import { Request, Response, NextFunction } from 'express';
import pool from '../../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ApiError } from '../../../middleware/errorHandler';
import { AuthRequest } from '../../auth/middleware/authMiddleware';
import type { Club, ClubMembership, CreateClubRequest, JoinClubRequest } from '../types/club';

// Get socket.io instance (will be set by socketServer)
let io: any = null;
export const setClubSocketIO = (socketIO: any) => {
  io = socketIO;
};

// Get all clubs
export const getAllClubs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        u.first_name as presidentFirstName,
        u.last_name as presidentLastName,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.created_at as createdAt,
        COUNT(DISTINCT cm.id) as memberCount
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      LEFT JOIN club_memberships cm ON c.id = cm.club_id AND cm.status = 'approved'
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query);

    const clubs = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category || undefined,
      presidentId: row.presidentId || undefined,
      presidentName: row.presidentFirstName && row.presidentLastName
        ? `${row.presidentFirstName} ${row.presidentLastName}`
        : undefined,
      meetingDay: row.meetingDay || undefined,
      location: row.location || undefined,
      logo: row.logo || undefined,
      status: row.status || 'active',
      memberCount: parseInt(row.memberCount) || 0,
      createdAt: row.createdAt,
    }));

    res.json({
      success: true,
      clubs,
    });
  } catch (error) {
    next(error);
  }
};

// Get club by ID
export const getClubById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        u.first_name as presidentFirstName,
        u.last_name as presidentLastName,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.created_at as createdAt,
        COUNT(DISTINCT cm.id) as memberCount
      FROM clubs c
      LEFT JOIN users u ON c.president_id = u.id
      LEFT JOIN club_memberships cm ON c.id = cm.club_id AND cm.status = 'approved'
      WHERE c.id = ?
      GROUP BY c.id
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const row = rows[0] as any;
    const club: Club = {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category || undefined,
      presidentId: row.presidentId || undefined,
      presidentName: row.presidentFirstName && row.presidentLastName
        ? `${row.presidentFirstName} ${row.presidentLastName}`
        : undefined,
      meetingDay: row.meetingDay || undefined,
      location: row.location || undefined,
      logo: row.logo || undefined,
      status: row.status || 'active',
      memberCount: parseInt(row.memberCount) || 0,
      createdAt: row.createdAt,
    };

    res.json({
      success: true,
      club,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new club (admin only)
export const createClub = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      const error: ApiError = new Error('Only admins can create clubs');
      error.statusCode = 403;
      throw error;
    }

    const { name, description, category, meetingDay, location, status }: CreateClubRequest = req.body;

    if (!name) {
      const error: ApiError = new Error('Club name is required');
      error.statusCode = 400;
      throw error;
    }

    const query = `
      INSERT INTO clubs (name, description, category, meeting_day, location, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute<ResultSetHeader>(
      query,
      [name, description || null, category || null, meetingDay || null, location || null, status || 'active']
    );

    const clubId = result.insertId;

    // Get the created club
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM clubs WHERE id = ?',
      [clubId]
    );

    const row = rows[0] as any;
    const club: Club = {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category || undefined,
      meetingDay: row.meeting_day || undefined,
      location: row.location || undefined,
      logo: row.logo || undefined,
      status: row.status || 'active',
      memberCount: 0,
      createdAt: row.created_at,
    };

    res.status(201).json({
      success: true,
      club,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's club memberships
export const getUserMemberships = async (
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

    const userId = req.user.userId;

    const query = `
      SELECT 
        cm.id,
        cm.user_id as userId,
        cm.club_id as clubId,
        cm.status,
        cm.role,
        cm.request_date as requestDate,
        cm.approved_date as approvedDate,
        cm.approved_by as approvedBy,
        cm.created_at as createdAt,
        c.name as clubName
      FROM club_memberships cm
      JOIN clubs c ON cm.club_id = c.id
      WHERE cm.user_id = ?
      ORDER BY cm.created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId]);

    const memberships = rows.map((row: any) => ({
      id: row.id,
      clubId: row.clubId,
      clubName: row.clubName,
      status: row.status,
      role: row.role,
      requestDate: row.requestDate,
      approvedDate: row.approvedDate || undefined,
      approvedBy: row.approvedBy || undefined,
      createdAt: row.createdAt,
    }));

    res.json({
      success: true,
      memberships,
    });
  } catch (error) {
    next(error);
  }
};

// Request to join a club
export const joinClub = async (
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

    const { clubId }: JoinClubRequest = req.body;
    const userId = req.user.userId;

    if (!clubId) {
      const error: ApiError = new Error('Club ID is required');
      error.statusCode = 400;
      throw error;
    }

    // Check if club exists
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name FROM clubs WHERE id = ?',
      [clubId]
    );

    if (clubRows.length === 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if membership already exists
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM club_memberships WHERE user_id = ? AND club_id = ?',
      [userId, clubId]
    );

    let membershipId: number;

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.status === 'pending') {
        const error: ApiError = new Error('You already have a pending request for this club');
        error.statusCode = 400;
        throw error;
      }
      if (existing.status === 'approved') {
        const error: ApiError = new Error('You are already a member of this club');
        error.statusCode = 400;
        throw error;
      }
      
      // If status is 'left' or 'rejected', update the existing membership to 'pending'
      if (existing.status === 'left' || existing.status === 'rejected') {
        membershipId = existing.id;
        await pool.execute(
          `UPDATE club_memberships 
           SET status = 'pending', 
               role = 'member',
               request_date = NOW(),
               approved_date = NULL,
               approved_by = NULL
           WHERE id = ?`,
          [membershipId]
        );
      } else {
        // For any other status, create new membership
        const insertQuery = `
          INSERT INTO club_memberships (user_id, club_id, status, role)
          VALUES (?, ?, 'pending', 'member')
        `;
        const [result] = await pool.execute<ResultSetHeader>(insertQuery, [userId, clubId]);
        membershipId = result.insertId;
      }
    } else {
      // No existing membership, create new one
      const insertQuery = `
        INSERT INTO club_memberships (user_id, club_id, status, role)
        VALUES (?, ?, 'pending', 'member')
      `;
      const [result] = await pool.execute<ResultSetHeader>(insertQuery, [userId, clubId]);
      membershipId = result.insertId;
    }

    // Get the created membership
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = rows[0] as any;
    const membership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      createdAt: row.created_at,
    };

    // Emit WebSocket event to club room
    if (io) {
      io.to(`club-${clubId}`).emit('club-join-request', {
        clubId,
        membership,
        userId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Join request submitted successfully',
      membership,
    });
  } catch (error) {
    next(error);
  }
};

// Get pending join requests for a club (leader/admin only)
export const getClubJoinRequests = async (
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

    const { clubId } = req.params;
    const userId = req.user.userId;

    // Check if user is leader of this club or admin
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubId]
    );

    if (clubRows.length === 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const club = clubRows[0];
    const isPresident = club.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubId, 'approved']
    );
    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders and admins can view join requests');
      error.statusCode = 403;
      throw error;
    }

    const query = `
      SELECT 
        cm.id,
        cm.user_id as userId,
        cm.club_id as clubId,
        cm.status,
        cm.role,
        cm.request_date as requestDate,
        cm.created_at as createdAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.major
      FROM club_memberships cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ? AND cm.status = 'pending'
      ORDER BY cm.request_date DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    const requests = rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      clubId: row.clubId,
      status: row.status,
      role: row.role,
      requestDate: row.requestDate,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        major: row.major,
      },
    }));

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// Approve or reject a join request (leader/admin only)
export const updateMembershipStatus = async (
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

    const { membershipId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      const error: ApiError = new Error('Status must be "approved" or "rejected"');
      error.statusCode = 400;
      throw error;
    }

    // Get membership details
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.*, c.president_id, c.name as clubName
       FROM club_memberships cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.id = ?`,
      [membershipId]
    );

    if (membershipRows.length === 0) {
      const error: ApiError = new Error('Membership request not found');
      error.statusCode = 404;
      throw error;
    }

    const membership = membershipRows[0];
    const isPresident = membership.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership for this club
    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, membership.club_id, 'approved']
    );
    const hasLeaderMembership = leaderMembershipRows.length > 0 && leaderMembershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders and admins can approve/reject requests');
      error.statusCode = 403;
      throw error;
    }

    // Update membership status
    const updateQuery = status === 'approved'
      ? `UPDATE club_memberships 
         SET status = ?, approved_date = NOW(), approved_by = ?
         WHERE id = ?`
      : `UPDATE club_memberships 
         SET status = ?, approved_by = ?
         WHERE id = ?`;

    await pool.execute(
      updateQuery,
      status === 'approved' ? [status, userId, membershipId] : [status, userId, membershipId]
    );

    // Get updated membership
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = updatedRows[0] as any;
    const updatedMembership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      approvedDate: row.approved_date || undefined,
      approvedBy: row.approved_by || undefined,
      createdAt: row.created_at,
    };

    // Emit WebSocket event to club room and user
    if (io) {
      const clubId = membership.club_id;
      io.to(`club-${clubId}`).emit('club-membership-updated', {
        clubId,
        membership: updatedMembership,
        status,
      });
      // Also notify the user who made the request
      io.to(`user-${membership.user_id}`).emit('membership-status-changed', {
        clubId,
        membership: updatedMembership,
        status,
      });
    }

    res.json({
      success: true,
      message: `Membership request ${status} successfully`,
      membership: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};

// Get club membership statistics - leader/admin only
export const getClubMembershipStats = async (
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

    const { clubId } = req.params;
    const userId = req.user.userId;

    // Check if user is leader of this club or admin
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubId]
    );

    if (clubRows.length === 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const club = clubRows[0];
    const isPresident = club.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubId, 'approved']
    );

    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders and admins can view statistics');
      error.statusCode = 403;
      throw error;
    }

    // Get counts for each status
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as activeMemberCount
      FROM club_memberships
      WHERE club_id = ?`,
      [clubId]
    );

    const stats = statsRows[0] as any;

    res.json({
      success: true,
      stats: {
        pending: parseInt(stats.pendingCount) || 0,
        approved: parseInt(stats.approvedCount) || 0,
        rejected: parseInt(stats.rejectedCount) || 0,
        activeMembers: parseInt(stats.activeMemberCount) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get club members (approved memberships) - leader/admin only
export const getClubMembers = async (
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

    const { clubId } = req.params;
    const userId = req.user.userId;

    // Check if user is leader of this club or admin
    const [clubRows] = await pool.execute<RowDataPacket[]>(
      'SELECT president_id, status FROM clubs WHERE id = ?',
      [clubId]
    );

    if (clubRows.length === 0) {
      const error: ApiError = new Error('Club not found');
      error.statusCode = 404;
      throw error;
    }

    const club = clubRows[0];
    const isPresident = club.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, clubId, 'approved']
    );

    const hasLeaderMembership = membershipRows.length > 0 && membershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders and admins can view members');
      error.statusCode = 403;
      throw error;
    }

    const query = `
      SELECT 
        cm.id,
        cm.user_id as userId,
        cm.club_id as clubId,
        cm.status,
        cm.role,
        cm.request_date as requestDate,
        cm.approved_date as approvedDate,
        cm.created_at as createdAt,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        u.major,
        u.avatar
      FROM club_memberships cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ? AND cm.status = 'approved'
      ORDER BY cm.approved_date DESC, u.first_name ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [clubId]);

    const members = rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      clubId: row.clubId,
      status: row.status,
      role: row.role,
      requestDate: row.requestDate.toISOString(),
      approvedDate: row.approvedDate ? row.approvedDate.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
      user: {
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        major: row.major,
        avatar: row.avatar || undefined,
      },
    }));

    res.json({
      success: true,
      members,
    });
  } catch (error) {
    next(error);
  }
};

// Update member role - leader/admin only
export const updateMemberRole = async (
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

    const { membershipId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;

    if (!role || (role !== 'member' && role !== 'staff' && role !== 'leader')) {
      const error: ApiError = new Error('Role must be "member", "staff", or "leader"');
      error.statusCode = 400;
      throw error;
    }

    // Get membership details
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.*, c.president_id, c.name as clubName
       FROM club_memberships cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.id = ?`,
      [membershipId]
    );

    if (membershipRows.length === 0) {
      const error: ApiError = new Error('Membership not found');
      error.statusCode = 404;
      throw error;
    }

    const membership = membershipRows[0];
    const isPresident = membership.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership for this club
    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, membership.club_id, 'approved']
    );
    const hasLeaderMembership = leaderMembershipRows.length > 0 && leaderMembershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders and admins can update member roles');
      error.statusCode = 403;
      throw error;
    }

    // Update member role
    await pool.execute(
      'UPDATE club_memberships SET role = ? WHERE id = ?',
      [role, membershipId]
    );

    // Update user's role in users table if needed
    const targetUserId = membership.user_id;
    
    // Check if user has any leader memberships or is president of any club
    const [leaderCheckRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as leaderCount FROM club_memberships 
       WHERE user_id = ? AND status = 'approved' AND role = 'leader'`,
      [targetUserId]
    );
    
    const [presidentCheckRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as presidentCount FROM clubs WHERE president_id = ?`,
      [targetUserId]
    );
    
    const targetHasLeaderMembership = (leaderCheckRows[0]?.leaderCount || 0) > 0;
    const targetIsPresident = (presidentCheckRows[0]?.presidentCount || 0) > 0;
    const shouldBeLeader = targetHasLeaderMembership || targetIsPresident;
    
    // Get current user role
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM users WHERE id = ?',
      [targetUserId]
    );
    
    const currentUserRole = userRows[0]?.role || 'member';
    
    // Update user role if needed (only if not admin)
    if (currentUserRole !== 'admin') {
      if (shouldBeLeader && currentUserRole !== 'leader') {
        // User should be leader but isn't
        await pool.execute(
          'UPDATE users SET role = ? WHERE id = ?',
          ['leader', targetUserId]
        );
      } else if (!shouldBeLeader && currentUserRole === 'leader') {
        // User was leader but no longer has leader memberships
        await pool.execute(
          'UPDATE users SET role = ? WHERE id = ?',
          ['member', targetUserId]
        );
      }
    }

    // Get updated membership
    const [updatedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM club_memberships WHERE id = ?',
      [membershipId]
    );

    const row = updatedRows[0] as any;
    const updatedMembership: ClubMembership = {
      id: row.id,
      userId: row.user_id,
      clubId: row.club_id,
      status: row.status,
      role: row.role,
      requestDate: row.request_date,
      approvedDate: row.approved_date || undefined,
      approvedBy: row.approved_by || undefined,
      createdAt: row.created_at,
    };

    // Emit WebSocket event
    if (io) {
      const clubId = membership.club_id;
      io.to(`club-${clubId}`).emit('club-member-role-updated', {
        clubId,
        membership: updatedMembership,
      });
      
      // Notify the user whose role was changed to refresh their session
      io.to(`user-${targetUserId}`).emit('user-role-updated', {
        userId: targetUserId,
        newRole: shouldBeLeader ? 'leader' : 'member',
        message: 'Your role has been updated. Please refresh the page.',
      });
    }

    res.json({
      success: true,
      message: 'Member role updated successfully',
      membership: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};

// Remove member (set status to 'left') - leader/admin only
export const removeMember = async (
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

    const { membershipId } = req.params;
    const userId = req.user.userId;

    // Get membership details
    const [membershipRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.*, c.president_id, c.name as clubName
       FROM club_memberships cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.id = ?`,
      [membershipId]
    );

    if (membershipRows.length === 0) {
      const error: ApiError = new Error('Membership not found');
      error.statusCode = 404;
      throw error;
    }

    const membership = membershipRows[0];
    const isPresident = membership.president_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Check if user has leader role in membership for this club
    const [leaderMembershipRows] = await pool.execute<RowDataPacket[]>(
      'SELECT role FROM club_memberships WHERE user_id = ? AND club_id = ? AND status = ?',
      [userId, membership.club_id, 'approved']
    );
    const hasLeaderMembership = leaderMembershipRows.length > 0 && leaderMembershipRows[0].role === 'leader';
    const isLeader = isPresident || hasLeaderMembership;

    if (!isLeader && !isAdmin) {
      const error: ApiError = new Error('Only club leaders and admins can remove members');
      error.statusCode = 403;
      throw error;
    }

    // Prevent user from removing themselves
    if (membership.user_id === userId) {
      const error: ApiError = new Error('You cannot remove yourself from the club');
      error.statusCode = 400;
      throw error;
    }

    // Set status to 'left'
    await pool.execute(
      'UPDATE club_memberships SET status = ? WHERE id = ?',
      ['left', membershipId]
    );

    // Emit WebSocket event
    if (io) {
      const clubId = membership.club_id;
      io.to(`club-${clubId}`).emit('club-member-removed', {
        clubId,
        membershipId,
        userId: membership.user_id,
      });
    }

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get leader's clubs (clubs where user is president or has leader role)
export const getLeaderClubs = async (
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

    const userId = req.user.userId;

    // Get clubs where user is president OR has approved membership with role='leader'
    const query = `
      SELECT DISTINCT
        c.id,
        c.name,
        c.description,
        c.category,
        c.president_id as presidentId,
        c.meeting_day as meetingDay,
        c.location,
        c.logo,
        c.status,
        c.created_at as createdAt,
        COUNT(DISTINCT cm.id) as memberCount
      FROM clubs c
      LEFT JOIN club_memberships cm ON c.id = cm.club_id AND cm.status = 'approved'
      WHERE c.president_id = ? 
         OR EXISTS (
           SELECT 1 FROM club_memberships cm2 
           WHERE cm2.club_id = c.id 
           AND cm2.user_id = ? 
           AND cm2.status = 'approved' 
           AND cm2.role = 'leader'
         )
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [userId, userId]);

    const clubs = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      category: row.category || undefined,
      presidentId: row.presidentId || undefined,
      meetingDay: row.meetingDay || undefined,
      location: row.location || undefined,
      logo: row.logo || undefined,
      status: row.status || 'active',
      memberCount: parseInt(row.memberCount) || 0,
      createdAt: row.createdAt,
    }));

    res.json({
      success: true,
      clubs,
    });
  } catch (error) {
    next(error);
  }
};

