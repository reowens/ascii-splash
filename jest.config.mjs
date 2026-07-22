export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'Node16',
          moduleResolution: 'node16',
          target: 'ES2020',
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to .ts files
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(conf|atomically|env-paths|dot-prop|stubborn-fs)/)', // Transform ESM packages
  ],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts', // Thin executable bootstrap; pure boundaries are covered separately.
    '!src/**/*.d.ts',
    // terminal-kit requires a real TTY; exercised by pseudo-TTY smoke tests.
    '!src/renderer/TerminalRenderer.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  // Suppress console output during tests
  silent: false,
  verbose: true,
};
