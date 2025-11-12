# Docker Setup Guide

This guide explains how to run the scoreboard service using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed

## Quick Start

### Development Mode

1. **Start all services** (PostgreSQL, Redis, and the app):

   ```bash
   docker-compose up
   ```

2. **Start in detached mode** (runs in background):

   ```bash
   docker-compose up -d
   ```

3. **View logs**:

   ```bash
   docker-compose logs -f app
   ```

4. **Stop all services**:

   ```bash
   docker-compose down
   ```

5. **Stop and remove volumes** (clean slate):
   ```bash
   docker-compose down -v
   ```

### Running Database Migrations

The database schema is automatically initialized when PostgreSQL starts for the first time (via the `schema.sql` file mounted in the init directory).

Additionally, a test database (`scoreboard_test_db`) is automatically created for running tests (via `docker/postgres-init.sh`).

If you need to run migrations manually:

```bash
docker-compose exec app npm run migrate
```

### Running Tests with Docker

You can run tests with isolated test databases using Docker:

```bash
# Run tests with Docker (starts test containers, runs tests, then cleans up)
npm run test:docker

# Or manually:
docker-compose -f docker-compose.test.yml up -d
npm test
docker-compose -f docker-compose.test.yml down -v
```

The test setup uses:

- PostgreSQL on port `5433` (to avoid conflicts)
- Redis on port `6380` (to avoid conflicts)
- Test database: `scoreboard_test_db`

## Production Mode

For production, use the production Docker Compose file:

1. **Create a `.env` file** with production values:

   ```env
   DB_PASSWORD=your_secure_password
   JWT_SECRET=your_super_secret_jwt_key
   REDIS_PASSWORD=your_redis_password
   ```

2. **Start production services**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **View production logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## Services

### Application Service (`app`)

- **Port**: 3000
- **Environment**: Development (with hot reload) or Production
- **Dependencies**: PostgreSQL and Redis must be healthy before starting

### PostgreSQL Service (`postgres`)

- **Port**: 5432
- **Database**: `scoreboard_db`
- **User**: `scoreboard_user`
- **Password**: `scoreboard_password` (change in production!)
- **Volume**: Persistent data storage

### Redis Service (`redis`)

- **Port**: 6379
- **Volume**: Persistent data storage with AOF (Append Only File) enabled

## Environment Variables

### Development (`docker-compose.yml`)

The development compose file includes default values. You can override them by:

1. Creating a `.env` file
2. Modifying the `environment` section in `docker-compose.yml`

### Production (`docker-compose.prod.yml`)

All environment variables should be set in a `.env` file:

```env
# Database
DB_NAME=scoreboard_db
DB_USER=scoreboard_user
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379

# Application
PORT=3000
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION=24h
CORS_ORIGIN=https://yourdomain.com
```

## Useful Commands

### View running containers

```bash
docker-compose ps
```

### Execute commands in containers

```bash
# Run migration
docker-compose exec app npm run migrate

# Access PostgreSQL
docker-compose exec postgres psql -U scoreboard_user -d scoreboard_db

# Access Redis CLI
docker-compose exec redis redis-cli

# View app logs
docker-compose logs -f app

# Restart a service
docker-compose restart app
```

### Rebuild containers

```bash
# Rebuild after code changes
docker-compose build app

# Rebuild and restart
docker-compose up -d --build
```

### Clean up

```bash
# Stop and remove containers
docker-compose down

# Stop, remove containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all
```

## Troubleshooting

### Port Already in Use

If ports 3000, 5432, or 6379 are already in use:

1. Stop the conflicting services
2. Or modify ports in `docker-compose.yml`:
   ```yaml
   ports:
     - '3001:3000' # Use 3001 instead of 3000
   ```

### Database Connection Issues

1. **Check if PostgreSQL is healthy**:

   ```bash
   docker-compose ps postgres
   ```

2. **View PostgreSQL logs**:

   ```bash
   docker-compose logs postgres
   ```

3. **Verify database exists**:
   ```bash
   docker-compose exec postgres psql -U scoreboard_user -l
   ```

### Redis Connection Issues

1. **Check if Redis is healthy**:

   ```bash
   docker-compose ps redis
   ```

2. **Test Redis connection**:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

### Application Issues

1. **View application logs**:

   ```bash
   docker-compose logs -f app
   ```

2. **Restart the application**:

   ```bash
   docker-compose restart app
   ```

3. **Rebuild the application**:
   ```bash
   docker-compose build app
   docker-compose up -d app
   ```

## Development Workflow

1. **Start services**:

   ```bash
   docker-compose up -d
   ```

2. **Make code changes** (files are mounted as volumes, so changes are reflected immediately)

3. **View logs**:

   ```bash
   docker-compose logs -f app
   ```

4. **Run tests** (if you add them):
   ```bash
   docker-compose exec app npm test
   ```

## Production Deployment

1. **Set up environment variables** in `.env` file

2. **Build and start**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **Set up reverse proxy** (nginx/traefik) if needed

4. **Monitor logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## Data Persistence

Data is persisted in Docker volumes:

- `postgres_data` / `postgres_data_prod`: PostgreSQL data
- `redis_data` / `redis_data_prod`: Redis data

To backup data:

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U scoreboard_user scoreboard_db > backup.sql

# Backup Redis
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

## Network

All services are on the `scoreboard-network` bridge network, allowing them to communicate using service names:

- `postgres` (instead of `localhost`)
- `redis` (instead of `localhost`)

This is why the app uses `DB_HOST=postgres` and `REDIS_HOST=redis` in Docker Compose.
