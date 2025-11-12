import { UserPayload } from '../../src/types/index.ts';

export const mockUser: UserPayload = {
  userId: 'user_test_123',
  username: 'testuser',
};

export const mockUser2: UserPayload = {
  userId: 'user_test_456',
  username: 'testuser2',
};

export const mockScoreUpdateRequest = {
  score_increment: 10,
  action_id: 'action_test_123',
  timestamp: Date.now(),
};

export const mockLeaderboardEntry = {
  user_id: 'user_test_123',
  username: 'testuser',
  score: 100,
  rank: 1,
};
