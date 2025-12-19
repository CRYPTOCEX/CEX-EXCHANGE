module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@b/(.*)$': '<rootDir>/src/$1',
    '^log-update$': '<rootDir>/tests/__mocks__/log-update.js',
    '^cli-spinners$': '<rootDir>/tests/__mocks__/cli-spinners.js',
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 20000,
  verbose: true,
  // Help with timer cleanup and handle detection
  forceExit: true,
  detectOpenHandles: false,
  // Clear mocks and timers between tests
  clearMocks: true,
  restoreMocks: true,
  // More aggressive cleanup
  maxWorkers: 1,
  workerIdleMemoryLimit: '256MB',
}; 