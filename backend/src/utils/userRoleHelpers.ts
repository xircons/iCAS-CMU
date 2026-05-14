import pool from '../config/database';
import type { RowDataPacket } from '../types/db';

/**
 * Set users.role to leader vs member based on presidency + approved leader memberships (non-admin only).
 */
export async function reconcileAggregateUserRole(targetUserId: number): Promise<void> {
  const [leaderCheckRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*)::bigint as leadercount FROM club_memberships 
       WHERE user_id = ? AND status = 'approved' AND role IN ('leader', 'staff')`,
    [targetUserId]
  );

  const [presidentCheckRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*)::bigint as presidentcount FROM clubs WHERE president_id = ?`,
    [targetUserId]
  );

  const lc = leaderCheckRows[0] as Record<string, unknown> | undefined;
  const pc = presidentCheckRows[0] as Record<string, unknown> | undefined;
  const leaderCount = Number(lc?.leadercount ?? lc?.leaderCount ?? 0);
  const presidentCount = Number(pc?.presidentcount ?? pc?.presidentCount ?? 0);

  const targetHasLeaderMembership = leaderCount > 0;
  const targetIsPresident = presidentCount > 0;
  const shouldBeLeader = targetHasLeaderMembership || targetIsPresident;

  const [userRows] = await pool.execute<RowDataPacket[]>('SELECT role FROM users WHERE id = ?', [targetUserId]);
  const currentUserRole = ((userRows[0] as { role?: string } | undefined)?.role || 'member') as string;

  if (currentUserRole !== 'admin') {
    if (shouldBeLeader && currentUserRole !== 'leader') {
      await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['leader', targetUserId]);
    } else if (!shouldBeLeader && currentUserRole === 'leader') {
      await pool.execute('UPDATE users SET role = ? WHERE id = ?', ['member', targetUserId]);
    }
  }
}
