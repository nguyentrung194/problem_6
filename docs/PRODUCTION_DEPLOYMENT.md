# Production Deployment Guide

This guide covers deploying the Scoreboard Service to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Production Deployment](#docker-production-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Setup](#database-setup)
6. [Security Checklist](#security-checklist)
7. [Monitoring & Logging](#monitoring--logging)
8. [Scaling Considerations](#scaling-considerations)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services

- **PostgreSQL 12+** (or managed database service)
- **Redis 6+** (or managed Redis service)
- **Node.js 18+** (if deploying without Docker)
- **Docker & Docker Compose** (if using containerized deployment)

### Infrastructure Requirements

- **CPU**: Minimum 2 cores (4+ recommended for production)
- **RAM**: Minimum 2GB (4GB+ recommended)
- **Storage**: 20GB+ for database and logs
- **Network**: Stable internet connection for database/Redis access

## Environment Configuration

### 1. Create Production Environment File

Create a `.env.production` file with production values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Database Configuration
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=scoreboard_prod
DB_USER=scoreboard_prod_user
DB_PASSWORD=your-secure-database-password

# Redis Configuration
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRATION=24h

# Rate Limiting
RATE_LIMIT_PER_USER=60
RATE_LIMIT_PER_IP=1000
RATE_LIMIT_WINDOW=60

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30
WS_MAX_CONNECTIONS=10000
```

### 2. Security Best Practices

**⚠️ CRITICAL: Never commit `.env.production` to version control!**

- Use strong, randomly generated passwords (minimum 32 characters)
- Use different JWT secrets for each environment
- Rotate secrets regularly
- Use secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)

## Docker Production Deployment

### Option 1: Docker Compose (Recommended for Single Server)

1. **Prepare production environment file**:

   ```bash
   cp env.example .env.production
   # Edit .env.production with production values
   ```

2. **Build and start services**:

   ```bash
   # Build production images
   docker-compose -f docker-compose.prod.yml build

   # Start services
   docker-compose -f docker-compose.prod.yml up -d

   # View logs
   docker-compose -f docker-compose.prod.yml logs -f app
   ```

3. **Verify deployment**:

   ```bash
   # Check health
   curl http://localhost:3000/health

   # Check API docs
   curl http://localhost:3000/api-docs
   ```

4. **Run database migrations**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec app npm run migrate
   ```

### Option 2: Docker Swarm (For Multi-Server Deployment)

1. **Initialize Swarm**:

   ```bash
   docker swarm init
   ```

2. **Create secrets**:

   ```bash
   echo "your-db-password" | docker secret create db_password -
   echo "your-redis-password" | docker secret create redis_password -
   echo "your-jwt-secret" | docker secret create jwt_secret -
   ```

3. **Deploy stack**:
   ```bash
   docker stack deploy -c docker-compose.prod.yml scoreboard
   ```

### Option 3: Kubernetes

See [KUBERNETES.md](./KUBERNETES.md) for Kubernetes deployment (if created). Note: This file doesn't exist yet.

## Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL client (if needed)
sudo apt-get install -y postgresql-client
```

### 2. Application Setup

```bash
# Clone repository
git clone <your-repo-url> scoreboard-service
cd scoreboard-service

# Install dependencies
npm ci --only=production

# Build TypeScript (if needed)
npm run build

# Set up environment
cp env.example .env.production
# Edit .env.production with production values
```

### 3. Database Migration

```bash
# Run migrations
npm run migrate
```

### 4. Start Application

**Using PM2 (Recommended)**:

```bash
# Start with PM2
pm2 start npm --name "scoreboard-service" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

**Using systemd**:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/scoreboard.service
```

Service file content:

```ini
[Unit]
Description=Scoreboard Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/scoreboard-service
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable scoreboard
sudo systemctl start scoreboard
sudo systemctl status scoreboard
```

## Database Setup

### PostgreSQL Production Setup

1. **Create production database**:

   ```sql
   CREATE DATABASE scoreboard_prod;
   CREATE USER scoreboard_prod_user WITH PASSWORD 'secure-password';
   GRANT ALL PRIVILEGES ON DATABASE scoreboard_prod TO scoreboard_prod_user;
   ```

2. **Run schema migration**:

   ```bash
   # Using Docker
   docker-compose -f docker-compose.prod.yml exec app npm run migrate

   # Or manually
   psql -h your-db-host -U scoreboard_prod_user -d scoreboard_prod -f src/database/schema.sql
   ```

3. **Set up database backups**:
   ```bash
   # Add to crontab (daily backup at 2 AM)
   0 2 * * * pg_dump -h your-db-host -U scoreboard_prod_user scoreboard_prod > /backups/scoreboard_$(date +\%Y\%m\%d).sql
   ```

### Redis Production Setup

1. **Configure Redis for production**:

   ```conf
   # redis.conf
   requirepass your-secure-redis-password
   maxmemory 2gb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   save 60 10000
   ```

2. **Enable Redis persistence**:
   - AOF (Append Only File) for better durability
   - RDB snapshots for backups

## Security Checklist

### ✅ Pre-Deployment Security

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters, random)
- [ ] Enable HTTPS/TLS (use reverse proxy like Nginx)
- [ ] Configure firewall (only allow necessary ports)
- [ ] Set up rate limiting (already configured)
- [ ] Disable unnecessary services
- [ ] Set up proper CORS origins (not `*`)
- [ ] Enable database SSL connections
- [ ] Use Redis AUTH password
- [ ] Set up log rotation
- [ ] Configure proper file permissions

### ✅ Network Security

- [ ] Use reverse proxy (Nginx/Traefik) for HTTPS
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set up firewall rules
- [ ] Use VPN or private network for database/Redis
- [ ] Enable DDoS protection (Cloudflare, AWS Shield)

### ✅ Application Security

- [ ] Keep dependencies updated (`npm audit`)
- [ ] Enable Helmet.js (already configured)
- [ ] Validate all inputs (already configured)
- [ ] Use parameterized queries (already configured)
- [ ] Implement proper error handling (don't expose internals)
- [ ] Set secure cookie flags (if using cookies)

## Monitoring & Logging

### Application Monitoring

**Using PM2**:

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs scoreboard-service

# Check status
pm2 status
```

**Using systemd**:

```bash
# View logs
sudo journalctl -u scoreboard -f

# Check status
sudo systemctl status scoreboard
```

### Health Checks

The application provides a health endpoint:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

### Logging Setup

1. **Application logs**: Already configured with console.log
2. **Access logs**: Consider adding Morgan middleware
3. **Error tracking**: Integrate Sentry or similar
4. **Log aggregation**: Use ELK stack, CloudWatch, or similar

### Metrics to Monitor

- **Application**: Response times, error rates, request counts
- **Database**: Connection pool usage, query performance
- **Redis**: Memory usage, hit/miss ratio, connection count
- **System**: CPU, memory, disk usage
- **WebSocket**: Active connections, message throughput

## Scaling Considerations

### Horizontal Scaling

1. **Stateless API**: The API is stateless, so you can run multiple instances behind a load balancer

2. **Load Balancer Configuration**:

   ```nginx
   # Nginx example
   upstream scoreboard_backend {
       least_conn;
       server app1:3000;
       server app2:3000;
       server app3:3000;
   }

   server {
       listen 443 ssl;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://scoreboard_backend;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **WebSocket Scaling**:
   - Use Redis Pub/Sub (already implemented)
   - All instances subscribe to the same Redis channel
   - Updates broadcast to all connected clients across instances

4. **Database Scaling**:
   - Use read replicas for leaderboard queries
   - Connection pooling (already configured)
   - Consider database sharding for very large scale

5. **Redis Scaling**:
   - Use Redis Cluster for high availability
   - Consider Redis Sentinel for failover
   - Monitor memory usage

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Increase connection pool size
- Tune Redis memory limits

## Backup & Recovery

### Database Backups

**Automated Daily Backup**:

```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/scoreboard"
mkdir -p $BACKUP_DIR

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

**Add to crontab**:

```bash
0 2 * * * /path/to/backup-db.sh
```

### Redis Backups

```bash
# Enable RDB snapshots in redis.conf
save 900 1
save 300 10
save 60 10000

# Manual backup
redis-cli --rdb /backups/redis/dump.rdb
```

### Recovery Procedures

**Database Recovery**:

```bash
# Restore from backup
gunzip < /backups/scoreboard/db_20240115.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

**Application Rollback**:

```bash
# Using Git
git checkout <previous-version>
npm ci --only=production
pm2 restart scoreboard-service

# Or using Docker
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Reverse Proxy Setup (Nginx)

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/scoreboard
upstream scoreboard_backend {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API endpoints
    location /api/ {
        proxy_pass http://scoreboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket endpoint
    location /api/v1/scores/live {
        proxy_pass http://scoreboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://scoreboard_backend;
        access_log off;
    }
}
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already set up by certbot)
```

## Deployment Checklist

### Pre-Deployment

- [ ] Review and update all environment variables
- [ ] Test in staging environment
- [ ] Run all tests (`npm run test:all`)
- [ ] Security audit (`npm audit`)
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] SSL certificates ready
- [ ] DNS configured
- [ ] Firewall rules configured

### Deployment

- [ ] Deploy application
- [ ] Run database migrations
- [ ] Verify health endpoint
- [ ] Test API endpoints
- [ ] Test WebSocket connection
- [ ] Verify logging
- [ ] Check error rates
- [ ] Monitor resource usage

### Post-Deployment

- [ ] Verify all services running
- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Verify backups running
- [ ] Test failover scenarios
- [ ] Document deployment
- [ ] Notify team

## Troubleshooting

### Application Won't Start

1. **Check logs**:

   ```bash
   docker-compose -f docker-compose.prod.yml logs app
   # or
   pm2 logs scoreboard-service
   ```

2. **Check environment variables**:

   ```bash
   docker-compose -f docker-compose.prod.yml config
   ```

3. **Verify database connection**:

   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   ```

4. **Verify Redis connection**:
   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
   ```

### High Memory Usage

1. **Check connection pools**:
   - Reduce database connection pool size
   - Limit Redis connections
   - Check for memory leaks

2. **Monitor WebSocket connections**:
   - Implement connection limits
   - Add connection timeouts
   - Clean up stale connections

### Database Performance Issues

1. **Check indexes**:

   ```sql
   EXPLAIN ANALYZE SELECT * FROM scores ORDER BY score DESC LIMIT 10;
   ```

2. **Monitor slow queries**:

   ```sql
   -- Enable slow query log in PostgreSQL
   ```

3. **Optimize connection pool**:
   - Adjust `max` connections in database config
   - Monitor active connections

### Redis Performance Issues

1. **Check memory usage**:

   ```bash
   redis-cli INFO memory
   ```

2. **Monitor hit/miss ratio**:

   ```bash
   redis-cli INFO stats
   ```

3. **Check for key expiration**:
   - Verify TTL settings
   - Monitor key count

## Production Environment Variables Reference

| Variable              | Description        | Example             | Required    |
| --------------------- | ------------------ | ------------------- | ----------- |
| `NODE_ENV`            | Environment        | `production`        | Yes         |
| `PORT`                | Server port        | `3000`              | Yes         |
| `DB_HOST`             | Database host      | `db.example.com`    | Yes         |
| `DB_PORT`             | Database port      | `5432`              | Yes         |
| `DB_NAME`             | Database name      | `scoreboard_prod`   | Yes         |
| `DB_USER`             | Database user      | `scoreboard_user`   | Yes         |
| `DB_PASSWORD`         | Database password  | `***`               | Yes         |
| `REDIS_HOST`          | Redis host         | `redis.example.com` | Yes         |
| `REDIS_PORT`          | Redis port         | `6379`              | Yes         |
| `REDIS_PASSWORD`      | Redis password     | `***`               | Recommended |
| `JWT_SECRET`          | JWT signing secret | `***`               | Yes         |
| `JWT_EXPIRATION`      | Token expiration   | `24h`               | No          |
| `CORS_ORIGIN`         | Allowed origins    | `https://app.com`   | Yes         |
| `RATE_LIMIT_PER_USER` | User rate limit    | `60`                | No          |
| `RATE_LIMIT_PER_IP`   | IP rate limit      | `1000`              | No          |

## Additional Resources

- [DOCKER.md](./DOCKER.md) - Docker setup details
- [SETUP.md](./SETUP.md) - Development setup
- [SCRIPTS.md](./SCRIPTS.md) - NPM scripts reference
- [SWAGGER_TESTING.md](./SWAGGER_TESTING.md) - API testing guide

## Support

For deployment issues:

1. Check application logs
2. Verify environment configuration
3. Review this deployment guide
4. Check GitHub issues (if applicable)
