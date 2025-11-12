import express from 'express';
import { authenticateToken } from '../middleware/auth.ts';
import { userRateLimiter, ipRateLimiter } from '../middleware/rateLimiter.ts';
import { validateScoreUpdate } from '../middleware/validator.ts';
import { updateUserScore, getUserScoreInfo } from '../controllers/scoreController.ts';

const router = express.Router();

/**
 * @swagger
 * /api/v1/scores/update:
 *   post:
 *     summary: Update user's score
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScoreUpdateRequest'
 *     responses:
 *       200:
 *         description: Score updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScoreUpdateResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/scores/me:
 *   get:
 *     summary: Get current user's score
 *     tags: [Scores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User score information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserScoreResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticateToken, getUserScoreInfo);

export default router;
