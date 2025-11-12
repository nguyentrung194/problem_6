# Integration Tests Guide

## What are Integration Tests?

Integration tests verify that different parts of your application work together correctly. Unlike unit tests (which use mocks), integration tests use **real** database and Redis connections to test the full flow.

### Unit Tests vs Integration Tests

| Aspect | Unit Tests | Integration Tests |
|--------|------------|-------------------|
| **Purpose** | Test individual functions in isolation | Test how components work together |
| **Dependencies** | Mocked (fake) | Real (database, Redis) |
| **Speed** | Fast | Slower (real I/O) |
| **Scope** | Single function/class | Full flow (DB → Service → Cache) |
| **When to use** | Test logic, edge cases | Test real behavior, data flow |

## Running Integration Tests

### Prerequisites

1. **Start Docker test containers**:
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```

2. **Wait for services to be ready** (about 5-10 seconds)

### Run Integration Tests

```bash
# Run only integration tests
npm run test:integration

# Run integration tests with Docker (auto-start/stop containers)
npm run test:integration:docker

# Run unit tests only
npm run test:unit

# Run all tests (unit + integration)
npm run test:all
```

## What Integration Tests Cover

Our integration tests verify:

1. **Real Database Operations**
   - Inserting/updating scores
   - Querying leaderboard
   - Transaction handling
   - Data consistency

2. **Real Redis Caching**
   - Cache storage and retrieval
   - Cache invalidation
   - Cache expiration

3. **Full Flow**
   - Score update → Database → Cache invalidation → Leaderboard update
   - User score retrieval → Cache check → Database fallback

4. **Data Integrity**
   - Score history tracking
   - Rank calculations
   - Top 10 detection

## Test Structure

```
tests/
├── integration/
│   ├── setup.ts                    # Integration test setup
│   └── scoreService.integration.test.ts  # Integration tests
└── helpers/                        # Shared test utilities
```

## Example Integration Test

```typescript
it('should update score and cache correctly', async () => {
  // 1. Update score (real database)
  await updateScore(userId, 50, 'action_1', '127.0.0.1', 'agent');
  
  // 2. Verify in database (real query)
  const dbResult = await pool.query('SELECT score FROM scores WHERE user_id = $1', [userId]);
  expect(dbResult.rows[0].score).toBe('50');
  
  // 3. Verify cache was invalidated (real Redis)
  const cached = await redisClient.get(`user_score:${userId}`);
  expect(cached).toBeNull();
  
  // 4. Get score (should query database and cache)
  const score = await getUserScore(userId);
  expect(score).toBe(50);
  
  // 5. Verify cache was populated (real Redis)
  const cachedAfter = await redisClient.get(`user_score:${userId}`);
  expect(cachedAfter).toBe('50');
});
```

## Best Practices

1. **Clean Up**: Always clean up test data in `afterAll` and `beforeEach`
2. **Isolation**: Use unique test user IDs (e.g., `test_user_${Date.now()}`)
3. **Real Connections**: Use actual database and Redis, not mocks
4. **Verify Everything**: Check database, cache, and service responses
5. **Sequential Execution**: Integration tests run sequentially to avoid conflicts

## Troubleshooting

### Tests fail with connection errors

- Ensure Docker containers are running: `docker-compose -f docker-compose.test.yml ps`
- Check ports: PostgreSQL on 5433, Redis on 6380
- Verify environment variables in `tests/integration/setup.ts`

### Tests leave data behind

- Integration tests should clean up in `afterAll`
- Manually clean: `docker-compose -f docker-compose.test.yml down -v`

### Tests are slow

- This is normal! Integration tests use real I/O
- Run unit tests for fast feedback: `npm run test:unit`
- Run integration tests before committing: `npm run test:integration`

## When to Write Integration Tests

✅ **Write integration tests for:**
- Critical business flows (score updates, leaderboard)
- Database transactions
- Cache behavior
- End-to-end user scenarios

❌ **Don't write integration tests for:**
- Pure logic functions (use unit tests)
- Simple validations (use unit tests)
- Error handling edge cases (use unit tests)

## CI/CD Integration

In CI/CD, run both:
```bash
npm run test:unit      # Fast feedback
npm run test:integration  # Verify real behavior
```

Or use the combined command:
```bash
npm run test:all
```

