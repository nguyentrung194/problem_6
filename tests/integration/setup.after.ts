// This runs AFTER all imports, so we can verify connections here
// Global setup - verify connections
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  console.log(`📊 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`🔴 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
});

