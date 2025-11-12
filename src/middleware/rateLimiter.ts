import { rateLimit } from 'express-rate-limit';
import { Request, Response } from 'express';
import redisClient, { ensureConnected } from '../config/redis.ts';
import dotenv from 'dotenv';
import { ErrorResponse } from '../types/index.ts';

dotenv.config();

const RATE_LIMIT_PER_USER = parseInt(process.env.RATE_LIMIT_PER_USER || '60', 10);
const RATE_LIMIT_PER_IP = parseInt(process.env.RATE_LIMIT_PER_IP || '1000', 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10) * 1000; // Convert to milliseconds

/**
 * Redis-based rate limiter store for express-rate-limit v7
 */
class RedisStore {
  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    try {
      await ensureConnected();
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, Math.ceil(RATE_LIMIT_WINDOW / 1000));
      }
      const ttl = await redisClient.ttl(key);
      return {
        totalHits: count,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined,
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fallback: allow request if Redis fails
      return { totalHits: 1, resetTime: undefined };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await ensureConnected();
      await redisClient.decr(key);
    } catch (error) {
      console.error('Redis rate limit decrement error:', error);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await ensureConnected();
      await redisClient.del(key);
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
    }
  }
}

/**
 * Per-user rate limiter
 */
export const userRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  limit: RATE_LIMIT_PER_USER,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user ? `rate_limit:user:${user.userId}` : `rate_limit:ip:${req.ip}`;
  },
  store: new RedisStore(),
  handler: (_req: Request, res: Response): void => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    };
    res.status(429).json(errorResponse);
  },
});

/**
 * Per-IP rate limiter
 */
export const ipRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  limit: RATE_LIMIT_PER_IP,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again later.',
    },
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request): string => `rate_limit:ip:${req.ip}`,
  store: new RedisStore(),
});
