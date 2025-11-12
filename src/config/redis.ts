import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient: RedisClientType = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0', 10),
}) as RedisClientType;

redisClient.on('error', (err: Error) => {
  console.error('❌ Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

// Lazy connection - connect when first used
let isConnected = false;
export const ensureConnected = async (): Promise<void> => {
  if (!isConnected && !redisClient.isOpen) {
    try {
      await redisClient.connect();
      isConnected = true;
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      // Continue without Redis (graceful degradation)
    }
  }
};

// Auto-connect on import (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  ensureConnected();
}

export default redisClient;
