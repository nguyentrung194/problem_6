// IMPORTANT: This file runs BEFORE any imports
// Set environment variables FIRST so config files pick up correct test ports

// Set test environment variables for integration tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
// Use scoreboard_db (main DB) or scoreboard_test_db (created by init script)
process.env.DB_NAME = 'scoreboard_test_db';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433'; // Test DB port (from docker-compose.test.yml)
process.env.DB_USER = 'scoreboard_user';
process.env.DB_PASSWORD = 'scoreboard_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380'; // Test Redis port (from docker-compose.test.yml)

// Load test environment variables (if .env.test exists, it can override)
// Note: dotenv.config() is called here, but env vars above take precedence
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Increase timeout for integration tests (they use real DB/Redis)
jest.setTimeout(30000);

