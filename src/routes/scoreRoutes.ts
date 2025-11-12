import express from 'express';
import { authenticateToken } from '../middleware/auth.ts';
import { userRateLimiter, ipRateLimiter } from '../middleware/rateLimiter.ts';
import { validateScoreUpdate } from '../middleware/validator.ts';
import { updateUserScore, getUserScoreInfo } from '../controllers/scoreController.ts';

const router = express.Router();

/**
 * POST /api/v1/scores/update
 * Update user's score
 */
router.post(
  '/update',
  authenticateToken,
  ipRateLimiter,
  userRateLimiter,
  validateScoreUpdate,
  updateUserScore
);

/**
 * GET /api/v1/scores/me
 * Get current user's score
 */
router.get(
  '/me',
  authenticateToken,
  getUserScoreInfo
);

export default router;

