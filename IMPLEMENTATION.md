# Implementation Details

This document provides additional implementation details and code structure information.

## Architecture Overview

The implementation follows a **layered architecture** pattern:

```
┌─────────────────────────────────────┐
│         API Routes Layer            │
│  (Express Router)                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Controllers Layer              │
│  (Request/Response Handling)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Services Layer                │
│  (Business Logic)                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Data Access Layer                │
│  (Database, Cache)                  │
└─────────────────────────────────────┘
```

## Key Components

### 1. Authentication & Authorization

**File**: `src/middleware/auth.ts`

- **JWT-based authentication**: All protected endpoints require a valid JWT token
- **Token generation**: Tokens include `userId` and `username` claims
- **Token validation**: Middleware verifies token signature and expiration
- **Optional auth**: Leaderboard endpoint supports optional authentication for personalized rank

### 2. Rate Limiting

**File**: `src/middleware/rateLimiter.ts`

- **Dual-layer protection**: Both per-user and per-IP rate limiting
- **Redis-backed**: Uses Redis for distributed rate limiting
- **Configurable limits**: Environment variables control limits
- **Graceful degradation**: Falls back to in-memory if Redis unavailable

**Rate Limits**:
- Per user: 60 requests/minute (default)
- Per IP: 1000 requests/minute (default)

### 3. Score Service

**File**: `src/services/scoreService.ts`

**Key Functions**:
- `getUserScore(userId)`: Get user's current score (with caching)
- `updateScore(userId, increment, ...)`: Update score atomically
- `getUserRank(userId)`: Calculate user's rank
- `isUserInTop10(userId)`: Check if user is in top 10

**Features**:
- **Atomic updates**: Uses database transactions
- **Audit trail**: All score changes logged to `score_history`
- **Cache invalidation**: Automatically invalidates caches on update
- **Validation**: Prevents invalid score increments and replay attacks

### 4. Leaderboard Service

**File**: `src/services/leaderboardService.ts`

**Key Functions**:
- `getTopUsers(limit, offset)`: Get top N users
- `getLeaderboard(limit, offset, userId)`: Get leaderboard with user rank
- `getTotalUsers()`: Get total user count

**Caching Strategy**:
- **Cache key**: `leaderboard:top10`
- **TTL**: 30 seconds
- **Cache invalidation**: On any score update affecting top 10
- **Cache-first**: Queries cache before database

### 5. WebSocket Service

**File**: `src/services/websocketService.ts`

**Features**:
- **Authentication**: Requires JWT token on connection
- **Initial state**: Sends current leaderboard on connect
- **Real-time updates**: Broadcasts updates when top 10 changes
- **Heartbeat**: Ping/pong to detect dead connections
- **Cross-server**: Redis Pub/Sub for multi-server deployments

**Message Types**:
- `leaderboard`: Initial leaderboard data
- `scoreboard_update`: Real-time update notification
- `subscribed`: Confirmation of subscription

### 6. Database Schema

**Tables**:

1. **users**: User accounts
   - `user_id` (PK): Unique user identifier
   - `username`: Unique username
   - `email`: Unique email
   - `password_hash`: Bcrypt hashed password

2. **scores**: Current user scores
   - `id` (PK): Auto-increment ID
   - `user_id` (FK): Reference to users
   - `score`: Current score (BIGINT)
   - `updated_at`: Last update timestamp

3. **score_history**: Audit trail
   - `id` (PK): Auto-increment ID
   - `user_id` (FK): Reference to users
   - `score_increment`: Amount added
   - `previous_score`: Score before update
   - `new_score`: Score after update
   - `action_id`: Optional action identifier
   - `ip_address`: Client IP address
   - `user_agent`: Client user agent
   - `created_at`: Timestamp

**Indexes**:
- `idx_scores_score_desc`: For efficient leaderboard queries
- `idx_scores_user_id`: For fast user lookups
- `idx_score_history_user_id`: For user history queries
- `idx_score_history_created_at`: For time-based queries

### 7. Caching Strategy

**Redis Keys**:
- `leaderboard:top10`: Cached top 10 leaderboard (TTL: 30s)
- `user_score:{userId}`: Cached user score (TTL: 5min)
- `rate_limit:user:{userId}`: User rate limit counter
- `rate_limit:ip:{ip}`: IP rate limit counter

**Cache Invalidation**:
- User score cache: Invalidated on score update
- Leaderboard cache: Invalidated on any score update
- Rate limit keys: Auto-expire based on window

## Security Features

### 1. Authentication
- JWT tokens with expiration
- Token validation on every protected request
- Secure password hashing (bcrypt)

### 2. Authorization
- Users can only update their own scores
- User ID extracted from JWT (cannot be spoofed)

### 3. Input Validation
- Score increment: 1-1000 range
- Action ID: Optional string validation
- Timestamp: Replay attack prevention (5-minute window)

### 4. Rate Limiting
- Per-user limits prevent individual abuse
- Per-IP limits prevent distributed attacks
- Redis-backed for distributed systems

### 5. Audit Trail
- All score updates logged with:
  - IP address
  - User agent
  - Timestamp
  - Action ID

## Performance Optimizations

### 1. Database
- Indexed queries for leaderboard
- Connection pooling
- Read replicas support (configurable)

### 2. Caching
- Multi-layer caching (Redis + in-memory)
- Smart cache invalidation
- Cache warming on startup

### 3. Query Optimization
- Efficient top-N queries using indexes
- Pagination support
- Minimal data transfer

### 4. WebSocket
- Connection pooling
- Heartbeat for dead connection detection
- Binary protocol support (future)

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [] // Optional additional details
  }
}
```

### Error Codes

- `UNAUTHORIZED`: Missing or invalid token
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Invalid input data
- `INVALID_REQUEST`: Invalid request parameters
- `INTERNAL_ERROR`: Server error
- `NOT_FOUND`: Endpoint not found

## Testing

### Manual Testing

1. **Register User**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test","email":"test@test.com","password":"pass123"}'
   ```

2. **Update Score**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/scores/update \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"score_increment":10,"action_id":"action_1"}'
   ```

3. **Get Leaderboard**:
   ```bash
   curl http://localhost:3000/api/v1/scores/leaderboard
   ```

### WebSocket Testing

```javascript
const WebSocket = require('ws');

const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:3000/api/v1/scores/live?token=${token}`);

ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Update:', msg);
});
```

## Deployment Considerations

### Environment Variables

All configuration via environment variables:
- Database connection
- Redis connection
- JWT secret
- Rate limits
- CORS origins

### Scaling

**Horizontal Scaling**:
- Stateless API servers
- Load balancer in front
- Shared Redis for caching
- Shared PostgreSQL database

**Database Scaling**:
- Read replicas for leaderboard queries
- Connection pooling
- Query optimization

**WebSocket Scaling**:
- Redis Pub/Sub for cross-server communication
- Sticky sessions (optional)
- Connection limits per server

### Monitoring

**Key Metrics**:
- Request rate
- Response latency
- Error rate
- Cache hit ratio
- WebSocket connections
- Database connection pool usage

**Health Checks**:
- `/health` endpoint
- Database connectivity
- Redis connectivity

## Future Enhancements

1. **Redis Sorted Sets**: Native leaderboard support
2. **GraphQL API**: Flexible querying
3. **Batch Updates**: Multiple score updates in one request
4. **Time-based Leaderboards**: Daily/weekly/monthly
5. **Analytics Dashboard**: Real-time metrics
6. **Machine Learning**: Anomaly detection
7. **Microservices**: Split into separate services
8. **Event Sourcing**: Complete audit trail

