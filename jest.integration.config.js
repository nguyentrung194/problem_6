/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.integration.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.(ts|js)$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
        },
      },
    ],
  },
  // setupFiles runs BEFORE imports, setupFilesAfterEnv runs AFTER
  setupFiles: ['<rootDir>/tests/integration/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.after.ts'],
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 1, // Run integration tests sequentially to avoid conflicts
  verbose: true,
};

