# Testing API with Swagger UI

This guide explains how to test the Scoreboard API manually using Swagger UI.

## Access Swagger UI

1. **Start the server** (if not already running):

   ```bash
   docker-compose up -d
   # or
   npm run dev
   ```

2. **Open Swagger UI** in your browser:
   ```
   http://localhost:3000/api-docs
   ```

## Step-by-Step Testing Guide

### Step 1: Register a New User

1. In Swagger UI, find the **Authentication** section
2. Expand the `POST /api/v1/auth/register` endpoint
3. Click **"Try it out"**
4. Fill in the request body:
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "password123"
   }
   ```
5. Click **"Execute"**
6. **Copy the `token`** from the response - you'll need it for authenticated requests

### Step 2: Authenticate in Swagger

1. At the top of Swagger UI, click the **"Authorize"** button (🔒 lock icon)
2. In the `bearerAuth` field, paste your token (without "Bearer " prefix)
3. Click **"Authorize"**
4. Click **"Close"**

Now all authenticated endpoints will use this token automatically.

### Step 3: Test Score Endpoints

#### Get Your Score

1. Expand `GET /api/v1/scores/me`
2. Click **"Try it out"**
3. Click **"Execute"**
4. You should see your score (initially 0)

#### Update Your Score

1. Expand `POST /api/v1/scores/update`
2. Click **"Try it out"**
3. Fill in the request body:
   ```json
   {
     "score_increment": 50,
     "action_id": "test_action_1"
   }
   ```
4. Click **"Execute"**
5. Check the response - it should show:
   - `previous_score`: 0
   - `new_score`: 50
   - `rank`: Your current rank
   - `is_top_10`: Whether you're in top 10

#### Get Your Score Again

1. Go back to `GET /api/v1/scores/me`
2. Click **"Try it out"** → **"Execute"**
3. Your score should now be 50

### Step 4: Test Leaderboard

1. Expand `GET /api/v1/scores/leaderboard`
2. Click **"Try it out"**
3. Optionally set query parameters:
   - `limit`: Number of top users (default: 10)
   - `offset`: Pagination offset (default: 0)
4. Click **"Execute"**
5. You should see the leaderboard with your user included

### Step 5: Test WebSocket (Optional)

Swagger doesn't support WebSocket testing. Use a WebSocket client instead:

```javascript
// In browser console or WebSocket client
const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:3000/api/v1/scores/live?token=${token}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## Example Test Flow

1. **Register** → Get token
2. **Authorize** in Swagger with token
3. **Get score** → Should be 0
4. **Update score** → Add 50 points
5. **Get score** → Should be 50
6. **Update score** → Add 25 more points
7. **Get score** → Should be 75
8. **Get leaderboard** → See your rank

## Common Issues

### "401 Unauthorized"

- Make sure you clicked **"Authorize"** and pasted your token
- Token might be expired - register/login again to get a new token

### "429 Too Many Requests"

- You've hit the rate limit
- Wait a minute and try again
- Or increase rate limits in `.env` file

### "400 Bad Request"

- Check your request body format
- Make sure `score_increment` is between 1 and 1000
- Check required fields are present

## Tips

1. **Keep the token**: Once you authorize, Swagger remembers it for the session
2. **Test incrementally**: Start with small score increments to see changes
3. **Check leaderboard**: After updating scores, check the leaderboard to see your rank
4. **Multiple users**: Register multiple users to test leaderboard rankings
5. **WebSocket**: Use a separate WebSocket client to test real-time updates

## API Endpoints Summary

| Endpoint                     | Method    | Auth Required | Description              |
| ---------------------------- | --------- | ------------- | ------------------------ |
| `/api/v1/auth/register`      | POST      | No            | Register new user        |
| `/api/v1/auth/login`         | POST      | No            | Login user               |
| `/api/v1/scores/update`      | POST      | Yes           | Update user score        |
| `/api/v1/scores/me`          | GET       | Yes           | Get current user's score |
| `/api/v1/scores/leaderboard` | GET       | No            | Get leaderboard          |
| `/api/v1/scores/live`        | WebSocket | Yes           | Real-time updates        |

## Example cURL Commands

If you prefer command line testing:

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Update Score (replace TOKEN with actual token)
curl -X POST http://localhost:3000/api/v1/scores/update \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score_increment":50,"action_id":"test_1"}'

# Get Score
curl -X GET http://localhost:3000/api/v1/scores/me \
  -H "Authorization: Bearer TOKEN"

# Get Leaderboard
curl -X GET http://localhost:3000/api/v1/scores/leaderboard?limit=10
```
