// Mock dependencies before imports
const mockQuery = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSetEx = jest.fn();
const mockRedisDel = jest.fn();
const mockEnsureConnected = jest.fn().mockResolvedValue(undefined);

jest.mock('../config/database.ts', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

jest.mock('../config/redis.ts', () => ({
  __esModule: true,
  default: {
    get: mockRedisGet,
    setEx: mockRedisSetEx,
    del: mockRedisDel,
  },
  ensureConnected: mockEnsureConnected,
}));

import {
  validateScoreUpdateRequest,
  getUserScore,
  getUserRank,
  isUserInTop10,
} from '../services/scoreService.ts';

describe('Score Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks
    mockQuery.mockClear();
    mockRedisGet.mockClear();
    mockRedisSetEx.mockClear();
    mockRedisDel.mockClear();
    mockEnsureConnected.mockClear();
    mockEnsureConnected.mockResolvedValue(undefined);
  });

  describe('validateScoreUpdateRequest', () => {
    it('should validate correct score increment', () => {
      expect(() => validateScoreUpdateRequest(10, undefined)).not.toThrow();
      expect(() => validateScoreUpdateRequest(1, undefined)).not.toThrow();
      expect(() => validateScoreUpdateRequest(1000, undefined)).not.toThrow();
    });

    it('should throw error for invalid score increment', () => {
      expect(() => validateScoreUpdateRequest(0, undefined)).toThrow();
      expect(() => validateScoreUpdateRequest(-10, undefined)).toThrow();
      expect(() => validateScoreUpdateRequest(1001, undefined)).toThrow();
      expect(() => validateScoreUpdateRequest(1.5, undefined)).toThrow();
    });

    it('should validate timestamp if provided', () => {
      const validTimestamp = Date.now();
      expect(() => validateScoreUpdateRequest(10, validTimestamp)).not.toThrow();

      const invalidTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      expect(() => validateScoreUpdateRequest(10, invalidTimestamp)).toThrow();
    });
  });

  describe('getUserScore', () => {
    it('should return cached score if available', async () => {
      mockRedisGet.mockResolvedValue('150');

      const score = await getUserScore('user123');

      expect(score).toBe(150);
      expect(mockEnsureConnected).toHaveBeenCalled();
      expect(mockRedisGet).toHaveBeenCalledWith('user_score:user123');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not cached', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue({
        rows: [{ score: '200' }],
      });
      mockRedisSetEx.mockResolvedValue('OK');

      const score = await getUserScore('user123');

      expect(score).toBe(200);
      expect(mockEnsureConnected).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith('SELECT score FROM scores WHERE user_id = $1', [
        'user123',
      ]);
      expect(mockRedisSetEx).toHaveBeenCalledWith('user_score:user123', 300, '200');
    });

    it('should return 0 if user has no score', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue({ rows: [] });
      mockRedisSetEx.mockResolvedValue('OK');

      const score = await getUserScore('user123');

      expect(score).toBe(0);
      expect(mockEnsureConnected).toHaveBeenCalled();
    });
  });

  describe('getUserRank', () => {
    it('should return correct rank', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ rank: '5' }],
      });

      const rank = await getUserRank('user123');

      expect(rank).toBe(5);
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('isUserInTop10', () => {
    it('should return true if user is in top 10', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ count: '1' }],
      });

      const result = await isUserInTop10('user123');

      expect(result).toBe(true);
    });

    it('should return false if user is not in top 10', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ count: '0' }],
      });

      const result = await isUserInTop10('user123');

      expect(result).toBe(false);
    });
  });
});
