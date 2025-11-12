/**
 * Integration Tests for Score Service
 *
 * These tests use REAL database and Redis connections to test the full flow.
 * They verify that all components work together correctly.
 *
 * Run with: npm run test:integration
 *
 * Prerequisites: Docker test containers must be running
 * (docker-compose -f docker-compose.test.yml up -d)
 */

import {
  getUserScore,
  updateScore,
  getUserRank,
  isUserInTop10,
  validateScoreUpdateRequest,
} from '../../src/services/scoreService.ts';
import pool from '../../src/config/database.ts';
import redisClient, { ensureConnected } from '../../src/config/redis.ts';
import { getTopUsers } from '../../src/services/leaderboardService.ts';
import { readFileSync } from 'fs';
import { join } from 'path';

// Apply database schema to test database
async function applySchema() {
  const schemaPath = join(process.cwd(), 'src', 'database', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Remove comments and split by semicolons
  const statements = schema
    .split('\n')
    .filter((line) => !line.trim().startsWith('--')) // Remove comment lines
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    if (statement && !statement.startsWith('--')) {
      try {
        await pool.query(statement);
      } catch (error: any) {
        // Ignore "already exists" errors (tables/indexes might already exist)
        const errorMsg = error.message.toLowerCase();
        if (
          !errorMsg.includes('already exists') &&
          !errorMsg.includes('duplicate') &&
          !errorMsg.includes('relation') &&
          !errorMsg.includes('does not exist')
        ) {
          console.warn('Schema application warning:', error.message);
          console.warn('Statement:', statement.substring(0, 100));
        }
      }
    }
  }
}

describe('Score Service Integration Tests', () => {
  const testUserId = `test_user_${Date.now()}`;
  const testUserId2 = `test_user_2_${Date.now()}`;
  const testUserId3 = `test_user_3_${Date.now()}`;

  beforeAll(async () => {
    // Ensure Redis is connected
    await ensureConnected();

    // Apply database schema to test database
    await applySchema();

    // Clean up any existing test data (use try-catch in case tables don't exist yet)
    try {
      await pool.query('DELETE FROM score_history WHERE user_id LIKE $1', [`test_user_%`]);
    } catch (error) {
      // Table might not exist, that's okay
    }
    try {
      await pool.query('DELETE FROM scores WHERE user_id LIKE $1', [`test_user_%`]);
    } catch (error) {
      // Table might not exist, that's okay
    }
    try {
      await pool.query('DELETE FROM users WHERE user_id LIKE $1', [`test_user_%`]);
    } catch (error) {
      // Table might not exist, that's okay
    }

    // Create test users
    await pool.query(
      'INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [testUserId, `testuser_${Date.now()}`, `test${Date.now()}@test.com`, 'hashed_password']
    );
    await pool.query(
      'INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [testUserId2, `testuser2_${Date.now()}`, `test2${Date.now()}@test.com`, 'hashed_password']
    );
    await pool.query(
      'INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [testUserId3, `testuser3_${Date.now()}`, `test3${Date.now()}@test.com`, 'hashed_password']
    );
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await pool.query('DELETE FROM score_history WHERE user_id LIKE $1', [`test_user_%`]);
      await pool.query('DELETE FROM scores WHERE user_id LIKE $1', [`test_user_%`]);
      await pool.query('DELETE FROM users WHERE user_id LIKE $1', [`test_user_%`]);
    } catch (error) {
      // Ignore errors during cleanup
    }

    // Clear Redis cache
    try {
      await redisClient.del(`user_score:${testUserId}`);
      await redisClient.del(`user_score:${testUserId2}`);
      await redisClient.del(`user_score:${testUserId3}`);
      await redisClient.del('leaderboard:top10');
    } catch (error) {
      // Ignore Redis errors during cleanup
    }

    // Close connections
    try {
      await pool.end();
    } catch (error) {
      // Ignore pool close errors
    }
    try {
      await redisClient.quit();
    } catch (error) {
      // Ignore Redis quit errors
    }
  });

  beforeEach(async () => {
    // Clear scores before each test
    await pool.query('DELETE FROM scores WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM scores WHERE user_id = $1', [testUserId2]);
    await pool.query('DELETE FROM scores WHERE user_id = $1', [testUserId3]);
    await redisClient.del(`user_score:${testUserId}`);
    await redisClient.del(`user_score:${testUserId2}`);
    await redisClient.del(`user_score:${testUserId3}`);
  });

  describe('getUserScore - Real Database & Redis', () => {
    it('should return 0 for new user with no score', async () => {
      const score = await getUserScore(testUserId);
      expect(score).toBe(0);
    });

    it('should cache score in Redis after first query', async () => {
      // Insert score directly into database
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId, 100]
      );

      // First call - should query database
      const score1 = await getUserScore(testUserId);
      expect(score1).toBe(100);

      // Check if cached in Redis
      const cached = await redisClient.get(`user_score:${testUserId}`);
      expect(cached).toBe('100');

      // Update score in database (but cache should still return old value)
      await pool.query('UPDATE scores SET score = 200 WHERE user_id = $1', [testUserId]);

      // Second call - should return cached value
      const score2 = await getUserScore(testUserId);
      expect(score2).toBe(100); // Still cached

      // Clear cache and verify it queries database again
      await redisClient.del(`user_score:${testUserId}`);
      const score3 = await getUserScore(testUserId);
      expect(score3).toBe(200); // Now queries database
    });
  });

  describe('updateScore - Full Flow', () => {
    it('should update score and create history record', async () => {
      const result = await updateScore(testUserId, 50, 'test_action_1', '127.0.0.1', 'test-agent');

      expect(result.previousScore).toBe(0);
      expect(result.newScore).toBe(50);

      // Verify in database
      const dbResult = await pool.query('SELECT score FROM scores WHERE user_id = $1', [
        testUserId,
      ]);
      expect(dbResult.rows[0].score).toBe('50');

      // Verify history
      const historyResult = await pool.query(
        'SELECT * FROM score_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testUserId]
      );
      // PostgreSQL returns numeric values as strings, so we need to parse them
      expect(parseInt(historyResult.rows[0].score_increment as string, 10)).toBe(50);
      expect(parseInt(historyResult.rows[0].previous_score as string, 10)).toBe(0);
      expect(parseInt(historyResult.rows[0].new_score as string, 10)).toBe(50);
      expect(historyResult.rows[0].action_id).toBe('test_action_1');
      expect(historyResult.rows[0].ip_address).toBe('127.0.0.1');

      // Verify cache is invalidated
      const cached = await redisClient.get(`user_score:${testUserId}`);
      expect(cached).toBeNull();
    });

    it('should increment score correctly', async () => {
      // Set initial score
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId, 100]
      );

      const result = await updateScore(testUserId, 25, 'test_action_2', '127.0.0.1', 'test-agent');

      expect(result.previousScore).toBe(100);
      expect(result.newScore).toBe(125);

      // Verify in database
      const dbResult = await pool.query('SELECT score FROM scores WHERE user_id = $1', [
        testUserId,
      ]);
      // PostgreSQL returns BIGINT as string
      expect(parseInt(dbResult.rows[0].score as string, 10)).toBe(125);
    });
  });

  describe('getUserRank - Real Database', () => {
    it('should return correct rank based on score', async () => {
      // Create users with different scores
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId, 100]
      );
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId2, 200]
      );
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId3, 150]
      );

      // User with 200 should be rank 1
      const rank1 = await getUserRank(testUserId2);
      expect(rank1).toBe(1);

      // User with 150 should be rank 2
      const rank2 = await getUserRank(testUserId3);
      expect(rank2).toBe(2);

      // User with 100 should be rank 3
      const rank3 = await getUserRank(testUserId);
      expect(rank3).toBe(3);
    });
  });

  describe('isUserInTop10 - Real Database', () => {
    it('should return true for user in top 10', async () => {
      // Create user with high score
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId, 1000]
      );

      const result = await isUserInTop10(testUserId);
      expect(result).toBe(true);
    });

    it('should return false for user not in top 10', async () => {
      // Create 10 users with higher scores
      for (let i = 0; i < 10; i++) {
        const userId = `top10_user_${i}_${Date.now()}`;
        await pool.query(
          'INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [userId, `top10user${i}`, `top10${i}@test.com`, 'hash']
        );
        await pool.query(
          'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
          [userId, 1000 + i]
        );
      }

      // Our test user with score 100 should not be in top 10
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId, 100]
      );

      const result = await isUserInTop10(testUserId);
      expect(result).toBe(false);

      // Clean up
      await pool.query('DELETE FROM scores WHERE user_id LIKE $1', ['top10_user_%']);
      await pool.query('DELETE FROM users WHERE user_id LIKE $1', ['top10_user_%']);
    });
  });

  describe('Leaderboard Integration', () => {
    it('should return leaderboard with real data', async () => {
      // Create users with scores
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId, 100]
      );
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId2, 200]
      );
      await pool.query(
        'INSERT INTO scores (user_id, score, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [testUserId3, 150]
      );

      // Clear cache to force database query
      await redisClient.del('leaderboard:top10');

      const leaderboard = await getTopUsers(10, 0);

      // Should return users ordered by score descending
      expect(leaderboard.length).toBeGreaterThanOrEqual(3);
      // Leaderboard service already converts scores to numbers, so direct comparison is fine
      expect(leaderboard[0].score).toBeGreaterThanOrEqual(leaderboard[1].score);
      expect(leaderboard[1].score).toBeGreaterThanOrEqual(leaderboard[2].score);

      // Verify cache was created
      const cached = await redisClient.get('leaderboard:top10');
      expect(cached).not.toBeNull();
    });
  });

  describe('validateScoreUpdateRequest', () => {
    it('should validate score increment correctly', () => {
      expect(() => validateScoreUpdateRequest(10, undefined)).not.toThrow();
      expect(() => validateScoreUpdateRequest(1, undefined)).not.toThrow();
      expect(() => validateScoreUpdateRequest(1000, undefined)).not.toThrow();
      expect(() => validateScoreUpdateRequest(0, undefined)).toThrow();
      expect(() => validateScoreUpdateRequest(-10, undefined)).toThrow();
      expect(() => validateScoreUpdateRequest(1001, undefined)).toThrow();
    });

    it('should validate timestamp correctly', () => {
      const validTimestamp = Date.now();
      expect(() => validateScoreUpdateRequest(10, validTimestamp)).not.toThrow();

      const invalidTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      expect(() => validateScoreUpdateRequest(10, invalidTimestamp)).toThrow();
    });
  });
});
