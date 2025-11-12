import { Response } from 'express';
import {
  updateScore,
  getUserScore,
  getUserRank,
  isUserInTop10,
  validateScoreUpdateRequest,
} from '../services/scoreService.ts';
import {
  broadcastLeaderboardUpdate,
  publishLeaderboardUpdate,
} from '../services/websocketService.ts';
import {
  AuthenticatedRequest,
  ErrorResponse,
  SuccessResponse,
  ScoreUpdateResponse,
} from '../types/index.ts';

/**
 * Update user's score
 */
export async function updateUserScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { score_increment, action_id, timestamp } = req.body as {
      score_increment: number;
      action_id?: string;
      timestamp?: number;
    };

    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user.userId;
    const ipAddress = req.ip || (req.socket.remoteAddress as string);
    const userAgent = req.get('user-agent');

    // Validate request
    try {
      validateScoreUpdateRequest(score_increment, timestamp);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: error instanceof Error ? error.message : 'Invalid request',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Update score
    const { previousScore, newScore } = await updateScore(
      userId,
      score_increment,
      action_id,
      ipAddress,
      userAgent
    );

    // Get user's rank
    const rank = await getUserRank(userId);
    const inTop10 = await isUserInTop10(userId);

    // Broadcast update if user is in top 10
    if (inTop10) {
      // Broadcast to WebSocket clients
      await broadcastLeaderboardUpdate(userId);

      // Publish to Redis for cross-server communication
      await publishLeaderboardUpdate(userId);
    }

    const response: SuccessResponse<ScoreUpdateResponse> = {
      success: true,
      data: {
        user_id: userId,
        previous_score: previousScore,
        new_score: newScore,
        rank: rank,
        is_top_10: inTop10,
      },
      message: 'Score updated successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating score:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating the score',
      },
    };
    res.status(500).json(errorResponse);
  }
}

/**
 * Get user's current score
 */
export async function getUserScoreInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user.userId;
    const score = await getUserScore(userId);
    const rank = await getUserRank(userId);

    const response: SuccessResponse<{ user_id: string; score: number; rank: number }> = {
      success: true,
      data: {
        user_id: userId,
        score: score,
        rank: rank,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting user score:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching the score',
      },
    };
    res.status(500).json(errorResponse);
  }
}
