export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['tsx', {
      tsconfig: {
        module: 'ES2020',
        moduleResolution: 'node16',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',  // Map .js imports to .ts files
    '^@/(.*)$': '<rootDir>/src/$1'
  },
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
