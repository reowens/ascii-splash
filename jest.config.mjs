export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'Node16',
        moduleResolution: 'node16',
        target: 'ES2020',
        esModuleInterop: true,
        isolatedModules: true,
      },
    },
  },
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
    '^(\\.{1,2}/.*)\\.js$': '$1',  // Map .js imports to .ts files
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(conf|atomically|env-paths|dot-prop|stubborn-fs)/)'  // Transform ESM packages
  ],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',           // Exclude entry point
    '!src/**/*.d.ts',         // Exclude type definitions
    '!src/renderer/TerminalRenderer.ts',  // Exclude terminal-dependent code
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  // Suppress console output during tests
  silent: false,
  verbose: true
};
