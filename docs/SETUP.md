# Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ installed and running
- Redis 6+ installed and running

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Build TypeScript (Optional for development)

For development, you can use `npm run dev` which uses `tsx` to run TypeScript directly.
For production, build first:

```bash
npm run build
```

### 3. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE scoreboard_db;

# Create user (optional)
CREATE USER scoreboard_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE scoreboard_db TO scoreboard_user;
```

#### Run Migrations

```bash
# Make sure your .env file has correct database credentials
npm run migrate
```

**Note**: The migrate script uses `tsx` to run TypeScript directly, so no build step is needed.

### 3. Redis Setup

Make sure Redis is running:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### 4. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scoreboard_db
DB_USER=scoreboard_user
DB_PASSWORD=your_password_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 5. Start the Server

```bash
# Development mode (with auto-reload, runs TypeScript directly)
npm run dev

# Production mode (requires build first)
npm run build
npm start
```

The server will start on `http://localhost:3000`

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Response will include a JWT token. Save it for subsequent requests.

### 2. Update Score

```bash
curl -X POST http://localhost:3000/api/v1/scores/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "score_increment": 10,
    "action_id": "action_12345"
  }'
```

### 3. Get Leaderboard

```bash
curl http://localhost:3000/api/v1/scores/leaderboard
```

### 4. Connect via WebSocket

```javascript
// Using JavaScript/Node.js
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/api/v1/scores/live?token=YOUR_JWT_TOKEN');

ws.on('open', () => {
  console.log('Connected to WebSocket');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Scores

- `POST /api/v1/scores/update` - Update user's score (requires auth)
- `GET /api/v1/scores/me` - Get current user's score (requires auth)

### Leaderboard

- `GET /api/v1/scores/leaderboard` - Get top 10 leaderboard (optional auth)

### WebSocket

- `WS /api/v1/scores/live?token=JWT_TOKEN` - Real-time leaderboard updates

### Documentation

- `GET /api-docs` - Swagger API documentation (interactive)

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists and user has permissions

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check Redis configuration in `.env`
- The application will continue without Redis but caching won't work

### Port Already in Use

- Change `PORT` in `.env` file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

## Development

### Project Structure

```
scoreboard-service/
├── src/
│   ├── config/          # Database and Redis configuration
│   ├── controllers/     # Request handlers
│   ├── database/        # SQL schema and migrations
│   ├── middleware/      # Auth, rate limiting, validation
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   └── server.ts        # Main application entry point
├── dist/                # Compiled JavaScript (generated)
├── README.md            # Full specification
├── SETUP.md            # This file
├── tsconfig.json        # TypeScript configuration
└── package.json
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI (with coverage and optimized for CI environments)
npm run test:ci
```

See [tests/README.md](./tests/README.md) for more details on writing tests.

### Code Style

The project uses ES6 modules and follows standard Node.js conventions.

#### Prettier

The project uses Prettier for code formatting. Format your code with:

```bash
# Format all code
npm run format

# Check formatting without making changes
npm run format:check

# Run format check and type check
npm run lint:format
```

**VS Code Integration**: If you use VS Code, install the Prettier extension and format on save will work automatically (see `.vscode/settings.json`).

**Pre-commit Hooks**: The project uses Husky to automatically run checks before commits:

```bash
# After installing dependencies, Husky will be set up automatically
npm install

# The pre-commit hook will:
# 1. Format staged files with Prettier
# 2. Run type checking on staged TypeScript files
# 3. Run tests related to staged files
# 4. Run full type check
# 5. Run all tests
```

To manually set up Husky (if needed):

```bash
npm install
npx husky install
```

The pre-commit hook is configured in `.husky/pre-commit` and uses `lint-staged` for efficient checks on only staged files.
