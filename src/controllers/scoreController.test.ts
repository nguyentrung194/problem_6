import { updateUserScore, getUserScoreInfo } from '../controllers/scoreController.ts';
import * as scoreService from '../services/scoreService.ts';
import * as websocketService from '../services/websocketService.ts';
import {
  createAuthenticatedRequest,
  createMockResponse,
  createMockRequest,
} from '../../tests/helpers/mocks.ts';
import { mockUser } from '../../tests/helpers/mockData.ts';

// Mock services
jest.mock('../services/scoreService.ts');
jest.mock('../services/websocketService.ts');

describe('Score Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserScore', () => {
    it('should update score successfully', async () => {
      const req = createAuthenticatedRequest(mockUser, {
        body: {
          score_increment: 10,
          action_id: 'action_123',
        },
        ip: '127.0.0.1',
      }) as any;
      const res = createMockResponse();

      (scoreService.validateScoreUpdateRequest as jest.Mock).mockReturnValue(true);
      (scoreService.updateScore as jest.Mock).mockResolvedValue({
        previousScore: 100,
        newScore: 110,
      });
      (scoreService.getUserRank as jest.Mock).mockResolvedValue(5);
      (scoreService.isUserInTop10 as jest.Mock).mockResolvedValue(true);
      (websocketService.broadcastLeaderboardUpdate as jest.Mock).mockResolvedValue(undefined);
      (websocketService.publishLeaderboardUpdate as jest.Mock).mockResolvedValue(undefined);

      await updateUserScore(req, res as any);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user_id: mockUser.userId,
            previous_score: 100,
            new_score: 110,
            rank: 5,
            is_top_10: true,
          }),
        })
      );
    });

    it('should return 400 for invalid request', async () => {
      const req = createAuthenticatedRequest(mockUser, {
        body: {
          score_increment: 2000, // Invalid
        },
      }) as any;
      const res = createMockResponse();

      (scoreService.validateScoreUpdateRequest as jest.Mock).mockImplementation(() => {
        throw new Error('Score increment must be between 1 and 1000');
      });

      await updateUserScore(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_REQUEST',
          }),
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      const req = createMockRequest({
        body: {
          score_increment: 10,
        },
      }) as any;
      const res = createMockResponse();

      await updateUserScore(req, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getUserScoreInfo', () => {
    it('should return user score info', async () => {
      const req = createAuthenticatedRequest(mockUser) as any;
      const res = createMockResponse();

      (scoreService.getUserScore as jest.Mock).mockResolvedValue(150);
      (scoreService.getUserRank as jest.Mock).mockResolvedValue(3);

      await getUserScoreInfo(req, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user_id: mockUser.userId,
            score: 150,
            rank: 3,
          }),
        })
      );
    });
  });
});
