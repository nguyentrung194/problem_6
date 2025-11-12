# NPM Scripts Documentation

This document describes all available npm scripts in the project and how to use them.

## Development Scripts

### `npm run dev`
**Purpose**: Start the development server with hot-reload  
**Command**: `tsx watch src/server.ts`  
**Usage**: 
```bash
npm run dev
```
- Watches for file changes and automatically restarts the server
- Runs TypeScript directly (no build step needed)
- Best for active development

### `npm start`
**Purpose**: Start the production server  
**Command**: `tsx src/server.ts`  
**Usage**:
```bash
npm start
```
- Starts the server without file watching
- Use in production or when you don't need hot-reload

## Build Scripts

### `npm run build`
**Purpose**: Compile TypeScript to JavaScript  
**Command**: `tsc`  
**Usage**:
```bash
npm run build
```
- Compiles TypeScript files to `dist/` directory
- Note: This project uses `tsx` for direct TypeScript execution, so build is optional

### `npm run type-check`
**Purpose**: Check TypeScript types without emitting files  
**Command**: `tsc --noEmit`  
**Usage**:
```bash
npm run type-check
```
- Validates TypeScript types across the codebase
- Useful for CI/CD or pre-commit checks
- Doesn't generate output files

## Testing Scripts

### `npm test` or `npm run test`
**Purpose**: Run all unit tests  
**Command**: `jest`  
**Usage**:
```bash
npm test
```
- Runs all unit tests (excludes integration tests)
- Uses mocks for database and Redis
- Fast execution (~1-2 seconds)

### `npm run test:unit`
**Purpose**: Run only unit tests (explicit)  
**Command**: `jest --testPathIgnorePatterns=integration`  
**Usage**:
```bash
npm run test:unit
```
- Same as `npm test` but more explicit
- Excludes integration tests

### `npm run test:integration`
**Purpose**: Run integration tests with real database and Redis  
**Command**: `jest --config jest.integration.config.js`  
**Usage**:
```bash
# First, start Docker test containers
docker-compose -f docker-compose.test.yml up -d

# Then run integration tests
npm run test:integration
```
- **Requires**: Docker test containers running
- Uses real PostgreSQL (port 5433) and Redis (port 6380)
- Tests full flow with actual database operations
- Slower execution (~30 seconds)

### `npm run test:integration:docker`
**Purpose**: Automatically start Docker, run integration tests, then cleanup  
**Command**: `docker-compose -f docker-compose.test.yml up -d && sleep 5 && npm run test:integration && docker-compose -f docker-compose.test.yml down -v`  
**Usage**:
```bash
npm run test:integration:docker
```
- **One-command solution** for integration testing
- Starts Docker containers
- Waits 5 seconds for services to be ready
- Runs integration tests
- Cleans up containers and volumes after

### `npm run test:all`
**Purpose**: Run both unit and integration tests  
**Command**: `npm run test:unit && npm run test:integration`  
**Usage**:
```bash
# Make sure Docker test containers are running first
docker-compose -f docker-compose.test.yml up -d
npm run test:all
```
- Runs unit tests first (fast feedback)
- Then runs integration tests (full verification)
- Best for CI/CD or before major commits

### `npm run test:watch`
**Purpose**: Run tests in watch mode  
**Command**: `jest --watch`  
**Usage**:
```bash
npm run test:watch
```
- Watches for file changes and re-runs relevant tests
- Interactive mode - press keys to filter/run specific tests
- Great for TDD (Test-Driven Development)

### `npm run test:coverage`
**Purpose**: Run tests with coverage report  
**Command**: `jest --coverage`  
**Usage**:
```bash
npm run test:coverage
```
- Generates code coverage report
- Shows which lines/functions are tested
- Coverage report saved in `coverage/` directory
- Opens HTML report in browser (if configured)

### `npm run test:ci`
**Purpose**: Run tests optimized for CI/CD  
**Command**: `jest --ci --coverage --maxWorkers=2`  
**Usage**:
```bash
npm run test:ci
```
- Runs in CI mode (no watch, no interactive)
- Generates coverage report
- Limits workers to 2 (for CI environments)
- Best for GitHub Actions, GitLab CI, etc.

### `npm run test:docker`
**Purpose**: Run unit tests with Docker test containers  
**Command**: `docker-compose -f docker-compose.test.yml up -d && sleep 5 && npm test && docker-compose -f docker-compose.test.yml down -v`  
**Usage**:
```bash
npm run test:docker
```
- Starts Docker test containers
- Runs unit tests (with mocks)
- Cleans up after
- Note: This runs unit tests, not integration tests

## Database Scripts

### `npm run migrate`
**Purpose**: Run database migrations  
**Command**: `tsx src/database/migrate.ts`  
**Usage**:
```bash
npm run migrate
```
- Applies database schema
- Creates tables, indexes, etc.
- Uses TypeScript directly (no build needed)

## Code Quality Scripts

### `npm run format`
**Purpose**: Format code with Prettier  
**Command**: `prettier --write "src/**/*.{ts,json}" "*.{json,md}"`  
**Usage**:
```bash
npm run format
```
- Formats all TypeScript and JSON files
- Formats markdown files
- Automatically fixes formatting issues
- **Modifies files in place**

### `npm run format:check`
**Purpose**: Check if code is formatted correctly  
**Command**: `prettier --check "src/**/*.{ts,json}" "*.{json,md}"`  
**Usage**:
```bash
npm run format:check
```
- Checks formatting without modifying files
- Returns exit code 1 if files need formatting
- Useful for CI/CD to enforce formatting

### `npm run lint:format`
**Purpose**: Check formatting AND type checking  
**Command**: `prettier --check "src/**/*.{ts,json}" "*.{json,md}" && npm run type-check`  
**Usage**:
```bash
npm run lint:format
```
- Runs format check
- Runs TypeScript type checking
- Fails if either check fails
- Used in pre-commit hooks

## Setup Scripts

### `npm run prepare`
**Purpose**: Husky setup (runs automatically after `npm install`)  
**Command**: `husky`  
**Usage**:
```bash
# Automatically runs after npm install
npm install
```
- Sets up Git hooks for pre-commit
- Configures Husky to run lint-staged
- No need to run manually

## Script Usage Examples

### Daily Development Workflow
```bash
# Start development server
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch
```

### Before Committing
```bash
# Format code
npm run format

# Check types
npm run type-check

# Run tests
npm test
```

### Full Quality Check
```bash
# Format and type check
npm run lint:format

# Run all tests
npm run test:all
```

### CI/CD Pipeline
```bash
# Install dependencies
npm ci

# Type check
npm run type-check

# Format check
npm run format:check

# Run tests with coverage
npm run test:ci
```

## Script Categories

| Category | Scripts |
|----------|---------|
| **Development** | `dev`, `start` |
| **Build** | `build`, `type-check` |
| **Testing** | `test`, `test:unit`, `test:integration`, `test:integration:docker`, `test:all`, `test:watch`, `test:coverage`, `test:ci`, `test:docker` |
| **Database** | `migrate` |
| **Code Quality** | `format`, `format:check`, `lint:format` |
| **Setup** | `prepare` |

## Environment Variables

Some scripts use environment variables. Check `.env` or `env.example` for:
- Database connection settings
- Redis connection settings
- JWT secret
- Rate limiting configuration

## Troubleshooting

### Tests fail with connection errors
- **Unit tests**: Should use mocks, no connection needed
- **Integration tests**: Ensure Docker containers are running
  ```bash
  docker-compose -f docker-compose.test.yml ps
  ```

### Type check fails
- Run `npm run type-check` to see specific errors
- Fix TypeScript errors before committing

### Format check fails
- Run `npm run format` to auto-fix formatting
- Then commit the formatted files

### Docker containers not starting
- Check Docker is running: `docker ps`
- Check ports are available: `lsof -i :5433` and `lsof -i :6380`
- Remove old containers: `docker-compose -f docker-compose.test.yml down -v`

