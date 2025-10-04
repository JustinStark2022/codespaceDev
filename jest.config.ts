import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/node_backend/src/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }]
  },
  collectCoverageFrom: [
    'node_backend/src/**/*.ts',
    '!**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  clearMocks: true
};

export default config;
     