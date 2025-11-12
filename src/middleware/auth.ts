import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { UserPayload, ErrorResponse } from '../types/index.ts';

dotenv.config();

// Read from environment each time to allow test overrides
const getJwtSecret = (): string => process.env.JWT_SECRET || 'default-secret-key';
const getJwtExpiration = (): string => process.env.JWT_EXPIRATION || '24h';

interface JwtPayload {
  userId: string;
  username: string;
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, getJwtSecret(), {
    expiresIn: getJwtExpiration(),
  } as jwt.SignOptions);
}

/**
 * Verify JWT token middleware
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
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

  jwt.verify(token, getJwtSecret(), (err, decoded) => {
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
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, getJwtSecret(), (err, decoded) => {
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
