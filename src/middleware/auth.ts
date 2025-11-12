import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { UserPayload, ErrorResponse } from '../types/index.ts';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

interface JwtPayload {
  userId: string;
  username: string;
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, username: string): string {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Verify JWT token middleware
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required',
      },
    };
    res.status(401).json(errorResponse);
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      };
      res.status(401).json(errorResponse);
      return;
    }

    const payload = decoded as JwtPayload;
    // Attach user info to request
    (req as any).user = {
      userId: payload.userId,
      username: payload.username,
    } as UserPayload;

    next();
  });
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        const payload = decoded as JwtPayload;
        (req as any).user = {
          userId: payload.userId,
          username: payload.username,
        } as UserPayload;
      }
    });
  }

  next();
}

