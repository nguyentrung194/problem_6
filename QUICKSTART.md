# Quick Start Guide

Get the scoreboard service up and running in 5 minutes!

## Option 1: Docker (Recommended - Easiest)

**Prerequisites**: Docker and Docker Compose installed

```bash
# Start all services (PostgreSQL, Redis, and the app)
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f app
```

That's it! The service will be available at `http://localhost:3000`

The database schema is automatically initialized. See [DOCKER.md](./DOCKER.md) for more details.

## Option 2: Local Development

### Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check if PostgreSQL is running
pg_isready

# Check if Redis is running
redis-cli ping
```

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp env.example .env
# Edit .env with your database credentials

# 3. Create database
createdb scoreboard_db
# Or via psql:
# CREATE DATABASE scoreboard_db;

# 4. Run migrations
npm run migrate

# 5. Start server (TypeScript with auto-reload)
npm run dev

# Or build and run production mode:
# npm run build
# npm start
```

## Test It Out

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@test.com",
    "password": "password123"
  }'
```

**Save the token from the response!**

### 2. Update Score

```bash
# Replace YOUR_TOKEN with the token from step 1
curl -X POST http://localhost:3000/api/v1/scores/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "score_increment": 50,
    "action_id": "game_action_1"
  }'
```

### 3. View Leaderboard

```bash
curl http://localhost:3000/api/v1/scores/leaderboard
```

### 4. View API Documentation

Open your browser and navigate to:

```
http://localhost:3000/api-docs
```

This will show the interactive Swagger API documentation where you can:

- View all available endpoints
- See request/response schemas
- Test API endpoints directly from the browser
- Authenticate using the "Authorize" button

### 5. Connect WebSocket (JavaScript)

```javascript
const WebSocket = require('ws');

const token = 'YOUR_TOKEN_HERE';
const ws = new WebSocket(`ws://localhost:3000/api/v1/scores/live?token=${token}`);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📊 Leaderboard Update:', message);
});

// Update score in another terminal to see real-time updates!
```

## Common Issues

### "Database connection failed"

- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Ensure database exists: `createdb scoreboard_db`

### "Redis connection failed"

- Check Redis is running: `redis-cli ping`
- The app will work without Redis, but caching won't function

### "Port 3000 already in use"

- Change `PORT` in `.env`
- Or kill the process: `lsof -ti:3000 | xargs kill`

## Next Steps

- Read `README.md` for full specification
- Check `IMPLEMENTATION.md` for code details
- See `SETUP.md` for detailed setup instructions

## API Endpoints Summary

| Method | Endpoint                     | Auth     | Description               |
| ------ | ---------------------------- | -------- | ------------------------- |
| POST   | `/api/v1/auth/register`      | No       | Register new user         |
| POST   | `/api/v1/auth/login`         | No       | Login user                |
| POST   | `/api/v1/scores/update`      | Yes      | Update score              |
| GET    | `/api/v1/scores/me`          | Yes      | Get my score              |
| GET    | `/api/v1/scores/leaderboard` | Optional | Get top 10                |
| WS     | `/api/v1/scores/live`        | Yes      | Real-time updates         |
| GET    | `/api-docs`                  | No       | Swagger API documentation |

## Example Flow

1. **Register** → Get JWT token
2. **Update Score** → Increase your score
3. **View Leaderboard** → See top 10
4. **Connect WebSocket** → Get real-time updates
5. **Update Score Again** → See live update in WebSocket!

Enjoy! 🎮
