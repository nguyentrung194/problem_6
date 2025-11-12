import express from 'express';
import { optionalAuth } from '../middleware/auth.ts';
import { getLeaderboardData } from '../controllers/leaderboardController.ts';

const router = express.Router();

/**
 * GET /api/v1/scores/leaderboard
 * Get leaderboard (top N users)
 */
router.get(
  '/',
  optionalAuth,
  getLeaderboardData
);

export default router;

