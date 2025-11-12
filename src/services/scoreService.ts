import pool from '../config/database.ts';
import redisClient, { ensureConnected } from '../config/redis.ts';
import { validateTimestamp } from '../middleware/validator.ts';
import { UpdateScoreResult } from '../types/index.ts';

const LEADERBOARD_CACHE_KEY = 'leaderboard:top10';
const USER_SCORE_CACHE_TTL = 300; // 5 minutes

/**
 * Get user's current score
 */
export async function getUserScore(userId: string): Promise<number> {
  try {
    // Ensure Redis is connected
    await ensureConnected();

    // Try cache first
    const cacheKey = `user_score:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return parseInt(cached, 10);
    }

    // Query database
    const result = await pool.query('SELECT score FROM scores WHERE user_id = $1', [userId]);

    const score = result.rows.length > 0 ? parseInt(result.rows[0].score as string, 10) : 0;

    // Cache the result
    await redisClient.setEx(cacheKey, USER_SCORE_CACHE_TTL, score.toString());

    return score;
  } catch (error) {
    console.error('Error getting user score:', error);
    throw error;
  }
}

/**
 * Update user's score
 */
export async function updateScore(
  userId: string,
  scoreIncrement: number,
  actionId: string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined
): Promise<UpdateScoreResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current score
    const currentResult = await client.query(
      'SELECT score FROM scores WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    const currentScore =
      currentResult.rows.length > 0 ? parseInt(currentResult.rows[0].score as string, 10) : 0;

    const newScore = currentScore + scoreIncrement;

    // Update or insert score
    await client.query(
      `INSERT INTO scores (user_id, score, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET score = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, newScore]
    );

    // Insert into history
    await client.query(
      `INSERT INTO score_history 
       (user_id, score_increment, previous_score, new_score, action_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, scoreIncrement, currentScore, newScore, actionId, ipAddress, userAgent]
    );

    await client.query('COMMIT');

    // Invalidate caches
    await invalidateUserScoreCache(userId);
    await invalidateLeaderboardCache();

    return {
      previousScore: currentScore,
      newScore: newScore,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating score:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user's rank
 */
export async function getUserRank(userId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM scores
       WHERE score > (SELECT score FROM scores WHERE user_id = $1)`,
      [userId]
    );

    return parseInt(result.rows[0].rank as string, 10);
  } catch (error) {
    console.error('Error getting user rank:', error);
    throw error;
  }
}

/**
 * Check if user is in top 10
 */
export async function isUserInTop10(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM (
         SELECT user_id FROM scores ORDER BY score DESC LIMIT 10
       ) top10
       WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count as string, 10) > 0;
  } catch (error) {
    console.error('Error checking top 10:', error);
    return false;
  }
}

/**
 * Invalidate user score cache
 */
async function invalidateUserScoreCache(userId: string): Promise<void> {
  try {
    await ensureConnected();
    await redisClient.del(`user_score:${userId}`);
  } catch (error) {
    console.error('Error invalidating user score cache:', error);
    // Continue without cache invalidation
  }
}

/**
 * Invalidate leaderboard cache
 */
async function invalidateLeaderboardCache(): Promise<void> {
  try {
    await ensureConnected();
    await redisClient.del(LEADERBOARD_CACHE_KEY);
  } catch (error) {
    console.error('Error invalidating leaderboard cache:', error);
    // Continue without cache invalidation
  }
}

/**
 * Validate score update request
 */
export function validateScoreUpdateRequest(
  scoreIncrement: number,
  timestamp: number | undefined
): boolean {
  // Validate score increment
  if (!Number.isInteger(scoreIncrement) || scoreIncrement < 1 || scoreIncrement > 1000) {
    throw new Error('Score increment must be between 1 and 1000');
  }

  // Validate timestamp if provided
  if (timestamp && !validateTimestamp(timestamp)) {
    throw new Error('Invalid timestamp - possible replay attack');
  }

  return true;
}
