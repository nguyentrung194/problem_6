# Testing Guide

This directory contains unit tests for the scoreboard service.

## Test Structure

```
tests/
├── setup.ts              # Test environment setup
├── helpers/
│   ├── mocks.ts         # Mock utilities for Express requests/responses
│   └── mockData.ts      # Mock data for tests
└── README.md            # This file
```

Test files (`.test.ts` or `.spec.ts`) are located next to the source files in the `src/` directory.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (with coverage and limited workers)
npm run test:ci
```

## Writing Tests

### Example Test File

```typescript
import { functionToTest } from '../path/to/module.ts';
import { createMockRequest, createMockResponse } from '../../tests/helpers/mocks.ts';

describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    // Test implementation
  });
});
```

### Mock Utilities

Use the helper functions from `tests/helpers/mocks.ts`:

- `createMockRequest()` - Create a mock Express request
- `createMockResponse()` - Create a mock Express response
- `createMockNext()` - Create a mock next function
- `createAuthenticatedRequest(user)` - Create authenticated request

### Mock Data

Use mock data from `tests/helpers/mockData.ts`:

- `mockUser` - Sample user payload
- `mockScoreUpdateRequest` - Sample score update request
- `mockLeaderboardEntry` - Sample leaderboard entry

## Test Coverage

The project aims for 70% code coverage. Coverage reports are generated in the `coverage/` directory.

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Mock external dependencies**: Mock database, Redis, and external services
3. **Use descriptive test names**: Test names should clearly describe what they test
4. **Test edge cases**: Include tests for error conditions and edge cases
5. **Clean up**: Use `beforeEach`/`afterEach` to reset mocks and state

## Mocking Services

When testing controllers, mock the services they depend on:

```typescript
jest.mock('../services/scoreService.ts');
jest.mock('../services/websocketService.ts');
```

Then use `jest.fn()` to create mock implementations in your tests.
