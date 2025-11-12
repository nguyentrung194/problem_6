import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import scoreRoutes from './routes/scoreRoutes.ts';
import leaderboardRoutes from './routes/leaderboardRoutes.ts';
import authRoutes from './routes/authRoutes.ts';
import { initializeWebSocketServer } from './services/websocketService.ts';
import { ErrorResponse } from './types/index.ts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/scores', scoreRoutes);
app.use('/api/v1/scores/leaderboard', leaderboardRoutes);

// 404 handler
app.use((req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  };
  res.status(404).json(errorResponse);
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Unhandled error:', err);
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(errorResponse);
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initializeWebSocketServer(server);

// Start server
server.listen(PORT, (): void => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server available at ws://localhost:${PORT}/api/v1/scores/live`);
  console.log(`📚 API Documentation: See README.md`);
});

// Graceful shutdown
process.on('SIGTERM', (): void => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close((): void => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', (): void => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close((): void => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

