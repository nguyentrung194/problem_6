import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { RedisClientType } from 'redis';
import redisClient from '../config/redis.ts';
import { getLeaderboard } from './leaderboardService.ts';
import dotenv from 'dotenv';
import { ConnectionStats, LeaderboardMessage, ScoreboardUpdateMessage } from '../types/index.ts';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30', 10) * 1000;
const WS_MAX_CONNECTIONS = parseInt(process.env.WS_MAX_CONNECTIONS || '10000', 10);

interface JwtPayload {
  userId: string;
  username: string;
}

let wss: WebSocketServer | null = null;
const connections = new Map<string, Set<WebSocket>>(); // userId -> Set of WebSocket connections

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(server: Server): void {
  wss = new WebSocketServer({
    server,
    path: '/api/v1/scores/live',
  });

  wss.on('connection', handleConnection);

  // Set up Redis subscriber for cross-server communication
  setupRedisSubscriber();

  console.log('✅ WebSocket server initialized');
}

/**
 * Handle new WebSocket connection
 */
async function handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  // Extract token from query string or headers
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || req.headers.authorization?.split(' ')[1];

  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    userId = decoded.userId;
  } catch (error) {
    ws.close(1008, 'Invalid token');
    return;
  }

  // Add connection to map
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);

  // Send initial leaderboard
  try {
    const leaderboard = await getLeaderboard(10, 0, userId);
    const message: LeaderboardMessage = {
      type: 'leaderboard',
      data: leaderboard,
    };
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error('Error sending initial leaderboard:', error);
  }

  // Handle messages
  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe') {
        // Already subscribed by default
        ws.send(
          JSON.stringify({
            type: 'subscribed',
            channel: 'leaderboard',
          })
        );
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle close
  ws.on('close', () => {
    if (connections.has(userId)) {
      const userConnections = connections.get(userId)!;
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        connections.delete(userId);
      }
    }
  });

  // Handle errors
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, WS_HEARTBEAT_INTERVAL);

  ws.on('pong', () => {
    // Client responded to ping
  });
}

/**
 * Broadcast leaderboard update to all connected clients
 */
export async function broadcastLeaderboardUpdate(
  updatedUserId: string | null = null
): Promise<void> {
  if (!wss) return;

  try {
    const leaderboard = await getLeaderboard(10, 0, updatedUserId);

    const message: ScoreboardUpdateMessage = {
      type: 'scoreboard_update',
      data: {
        leaderboard: leaderboard.leaderboard,
        updated_user:
          updatedUserId && leaderboard.userRank
            ? {
                user_id: updatedUserId,
                new_rank: leaderboard.userRank,
              }
            : null,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to all connections
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  } catch (error) {
    console.error('Error broadcasting leaderboard update:', error);
  }
}

/**
 * Set up Redis subscriber for cross-server communication
 */
async function setupRedisSubscriber(): Promise<void> {
  try {
    const { createClient } = await import('redis');
    const subscriber = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0', 10),
    }) as RedisClientType;

    await subscriber.connect();

    // Set up message handler - must be done before subscribe
    const messageHandler = (message: string, channel: string) => {
      if (channel === 'leaderboard:updates') {
        try {
          const data = JSON.parse(message) as { userId: string; timestamp: number };
          broadcastLeaderboardUpdate(data.userId);
        } catch (error) {
          console.error('Error processing Redis message:', error);
        }
      }
    };

    // Subscribe to channel with message handler
    await subscriber.subscribe('leaderboard:updates', messageHandler);

    console.log('✅ Redis subscriber connected');
  } catch (error) {
    console.error('Error setting up Redis subscriber:', error);
    // Continue without Redis pub/sub (single server mode)
  }
}

/**
 * Publish leaderboard update event to Redis
 */
export async function publishLeaderboardUpdate(userId: string): Promise<void> {
  try {
    await redisClient.publish(
      'leaderboard:updates',
      JSON.stringify({ userId, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('Error publishing to Redis:', error);
  }
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): ConnectionStats {
  let totalConnections = 0;
  connections.forEach((connSet) => {
    totalConnections += connSet.size;
  });

  return {
    totalConnections,
    uniqueUsers: connections.size,
    maxConnections: WS_MAX_CONNECTIONS,
  };
}
