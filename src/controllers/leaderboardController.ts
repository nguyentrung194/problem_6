import { Response } from 'express';
import { getLeaderboard } from '../services/leaderboardService.ts';
import {
  AuthenticatedRequest,
  ErrorResponse,
  SuccessResponse,
  LeaderboardResponse,
} from '../types/index.ts';

/**
 * Get leaderboard
 */
export async function getLeaderboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const userId = req.user?.userId || null;

    // Validate limit
    if (limit < 1 || limit > 100) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Limit must be between 1 and 100',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const data = await getLeaderboard(limit, offset, userId);

    const response: SuccessResponse<LeaderboardResponse> = {
      success: true,
      data: data,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching the leaderboard',
      },
    };
    res.status(500).json(errorResponse);
  }
}
