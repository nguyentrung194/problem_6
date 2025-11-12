import { Request } from 'express';

// User types
export interface User {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPayload {
  userId: string;
  username: string;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// Score types
export interface Score {
  id: number;
  userId: string;
  score: number;
  updatedAt: Date;
}

export interface ScoreHistory {
  id: number;
  userId: string;
  scoreIncrement: number;
  previousScore: number;
  newScore: number;
  actionId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ScoreUpdateRequest {
  score_increment: number;
  action_id?: string;
  timestamp?: number;
}

export interface ScoreUpdateResponse {
  user_id: string;
  previous_score: number;
  new_score: number;
  rank: number;
  is_top_10: boolean;
}

// Leaderboard types
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  score: number;
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  totalUsers: number;
  lastUpdated: string;
}

// Auth types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user_id: string;
  username: string;
  token: string;
}

// WebSocket types
export interface WebSocketMessage {
  type: 'leaderboard' | 'scoreboard_update' | 'subscribed';
  data?: any;
}

export interface ScoreboardUpdateMessage {
  type: 'scoreboard_update';
  data: {
    leaderboard: LeaderboardEntry[];
    updated_user: {
      user_id: string;
      new_rank: number;
    } | null;
    timestamp: string;
  };
}

export interface LeaderboardMessage {
  type: 'leaderboard';
  data: LeaderboardResponse;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any[];
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
}

// Success response type
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

// Database types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
}

// Service types
export interface UpdateScoreResult {
  previousScore: number;
  newScore: number;
}

export interface ConnectionStats {
  totalConnections: number;
  uniqueUsers: number;
  maxConnections: number;
}
