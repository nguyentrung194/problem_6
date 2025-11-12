import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import redisClient from '../config/redis.ts';
import dotenv from 'dotenv';
import { ErrorResponse } from '../types/index.ts';

dotenv.config();

const RATE_LIMIT_PER_USER = parseInt(process.env.RATE_LIMIT_PER_USER || '60', 10);
const RATE_LIMIT_PER_IP = parseInt(process.env.RATE_LIMIT_PER_IP || '1000', 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10) * 1000; // Convert to milliseconds

interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
}

/**
 * Redis-based rate limiter store
 */
const createRedisStore = (): RateLimitStore => {
  return {
    async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
      try {
        const count = await redisClient.incr(key);
        if (count === 1) {
          await redisClient.expire(key, Math.ceil(RATE_LIMIT_WINDOW / 1000));
        }
        return {
          totalHits: count,
          resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW),
        };
      } catch (error) {
        console.error('Redis rate limit error:', error);
        // Fallback: allow request if Redis fails
        return { totalHits: 1, resetTime: new Date() };
      }
    },
  };
};

/**
 * Per-user rate limiter
 */
export const userRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_PER_USER,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user ? `rate_limit:user:${user.userId}` : `rate_limit:ip:${req.ip}`;
  },
  store: createRedisStore(),
  handler: (req: Request, res: Response): void => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retry_after: Math.ceil(RATE_LIMIT_WINDOW / 1000),
      },
    };
    res.status(429).json(errorResponse);
  },
});

/**
 * Per-IP rate limiter
 */
export const ipRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_PER_IP,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => `rate_limit:ip:${req.ip}`,
  store: createRedisStore(),
});

