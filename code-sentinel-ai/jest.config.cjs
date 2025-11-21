module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 55,
      lines: 65,
      statements: 65
    }
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit|bottleneck|axios)/)'
  ],
  moduleNameMapper: {
    '^openai$': '<rootDir>/tests/mocks/openai.mock.ts',
    '^@octokit/plugin-throttling$': '<rootDir>/tests/mocks/octokit-plugin-throttling.mock.ts',
    '^@octokit/plugin-retry$': '<rootDir>/tests/mocks/octokit-plugin-retry.mock.ts'
  }
};
