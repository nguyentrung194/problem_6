import pool from '../config/database.ts';
import redisClient from '../config/redis.ts';
import { LeaderboardEntry, LeaderboardResponse } from '../types/index.ts';

const LEADERBOARD_CACHE_KEY = 'leaderboard:top10';
const LEADERBOARD_CACHE_TTL = 30; // 30 seconds

/**
 * Get top N users from leaderboard
 */
export async function getTopUsers(limit: number = 10, offset: number = 0): Promise<LeaderboardEntry[]> {
  try {
    // Try cache first
    if (offset === 0) {
      const cached = await redisClient.get(LEADERBOARD_CACHE_KEY);
      if (cached) {
        const leaderboard = JSON.parse(cached) as LeaderboardEntry[];
        return leaderboard.slice(0, limit);
      }
    }

    // Query database
    const result = await pool.query(
      `SELECT 
        s.user_id,
        u.username,
        s.score,
        ROW_NUMBER() OVER (ORDER BY s.score DESC) as rank
       FROM scores s
       INNER JOIN users u ON s.user_id = u.user_id
       ORDER BY s.score DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const leaderboard: LeaderboardEntry[] = result.rows.map((row) => ({
      user_id: row.user_id as string,
      username: row.username as string,
      score: parseInt(row.score as string, 10),
      rank: parseInt(row.rank as string, 10) + offset,
    }));

    // Cache top 10 if offset is 0
    if (offset === 0) {
      await redisClient.setEx(
        LEADERBOARD_CACHE_KEY,
        LEADERBOARD_CACHE_TTL,
        JSON.stringify(leaderboard)
      );
    }

    return leaderboard;
  } catch (error) {
    console.error('Error getting top users:', error);
    throw error;
  }
}

/**
 * Get total number of users with scores
 */
export async function getTotalUsers(): Promise<number> {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM scores');
    return parseInt(result.rows[0].count as string, 10);
  } catch (error) {
    console.error('Error getting total users:', error);
    return 0;
  }
}

/**
 * Get leaderboard with user's rank if authenticated
 */
export async function getLeaderboard(
  limit: number = 10,
  offset: number = 0,
  userId: string | null = null
): Promise<LeaderboardResponse> {
  const leaderboard = await getTopUsers(limit, offset);
  const totalUsers = await getTotalUsers();

  let userRank: number | null = null;
  if (userId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) + 1 as rank
         FROM scores
         WHERE score > (SELECT COALESCE(score, 0) FROM scores WHERE user_id = $1)`,
        [userId]
      );
      userRank = parseInt(result.rows[0].rank as string, 10);
    } catch (error) {
      console.error('Error getting user rank:', error);
    }
  }

  return {
    leaderboard,
    userRank,
    totalUsers,
    lastUpdated: new Date().toISOString(),
  };
}

