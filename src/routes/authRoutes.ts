import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.ts';
import { generateToken } from '../middleware/auth.ts';
import { body, validationResult } from 'express-validator';
import {
  ErrorResponse,
  SuccessResponse,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
} from '../types/index.ts';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
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
  '/register',
  [
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      const { username, email, password } = req.body as RegisterRequest;

      // Check if user exists
      const existingUser = await pool.query(
        'SELECT user_id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'Username or email already exists',
          },
        };
        res.status(409).json(errorResponse);
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Create user
      await pool.query(
        'INSERT INTO users (user_id, username, email, password_hash) VALUES ($1, $2, $3, $4)',
        [userId, username, email, passwordHash]
      );

      // Initialize score
      await pool.query('INSERT INTO scores (user_id, score) VALUES ($1, 0)', [userId]);

      // Generate token
      const token = generateToken(userId, username);

      const response: SuccessResponse<AuthResponse> = {
        success: true,
        data: {
          user_id: userId,
          username: username,
          token: token,
        },
        message: 'User registered successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error registering user:', error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while registering the user',
        },
      };
      res.status(500).json(errorResponse);
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
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
  '/login',
  [body('username').notEmpty(), body('password').notEmpty()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username and password are required',
          },
        };
        res.status(400).json(errorResponse);
        return;
      }

      const { username, password } = req.body as LoginRequest;

      // Get user
      const result = await pool.query(
        'SELECT user_id, username, password_hash FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        };
        res.status(401).json(errorResponse);
        return;
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash as string);
      if (!isValid) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
          },
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Generate token
      const token = generateToken(user.user_id as string, user.username as string);

      const response: SuccessResponse<AuthResponse> = {
        success: true,
        data: {
          user_id: user.user_id as string,
          username: user.username as string,
          token: token,
        },
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      console.error('Error logging in:', error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while logging in',
        },
      };
      res.status(500).json(errorResponse);
    }
  }
);

export default router;
