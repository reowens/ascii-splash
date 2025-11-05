# Testing Plan for ascii-splash

## Overview

This document outlines the comprehensive testing strategy for ascii-splash, a terminal ASCII animation application with 17 patterns, 102 presets, 5 themes, and an advanced command system.

**Current Status**: ✅ **1505 tests passing** across 28 test suites (100%)  
**Current Coverage**: 92.35% overall (core components at 96-100%)  
**Target Coverage**: 80%+ for core logic ✅ **EXCEEDED**  
**Testing Framework**: Jest 29.7.0 (✅ Installed and configured)  
**Document Version**: 2.0 (v0.2.0 Published to npm)

**Quick Links**:
- 📊 [Current project status](../PROJECT_STATUS.md)
- 🏗️ [Technical architecture](../ARCHITECTURE.md)
- 👤 [User guide](../../README.md)
- 📚 [Documentation Index](../README.md)

---

## Table of Contents

1. [Automated Testing Strategy](#1-automated-testing-strategy)
   - [Unit Tests](#11-unit-tests-high-priority)
   - [Integration Tests](#12-integration-tests-medium-priority)
   - [Snapshot Tests](#13-snapshot-tests-medium-priority)

2. [Manual Testing Checklist](#2-manual-testing-checklist)
   - [Pattern Testing](#21-pattern-testing-66-total-tests)
   - [Command System Testing](#22-command-system-testing)
   - [Keyboard Controls](#23-keyboard-controls)
   - [Configuration System](#24-configuration-system)
   - [Theme System](#25-theme-system-55-tests)
   - [Performance Testing](#26-performance-testing)
   - [Edge Cases & Error Handling](#27-edge-cases--error-handling)

3. [Test Automation Setup](#3-test-automation-setup)
   - [Jest Configuration](#31-jest-configuration)
   - [Directory Structure](#32-directory-structure)
   - [Test Utilities](#33-test-utilities)

4. [CI/CD Integration](#4-cicd-integration)
   - [GitHub Actions Workflow](#41-github-actions-workflow)

5. [Testing Milestones](#5-testing-milestones)

6. [Test Execution Guide](#6-test-execution-guide)
   - [Running Tests](#running-tests)
   - [Coverage Goals](#coverage-goals)

7. [Bug Tracking Template](#7-bug-tracking-template)

8. [Next Steps](#8-next-steps)

9. [Appendix: Quick Smoke Test Script](#appendix-quick-smoke-test-script)

10. [Test Results Summary](#test-results-summary)
    - [Completed Test Suites](#completed-test-suites-1010-passing-)
    - [CommandBuffer Test Suite](#commandbuffer-test-suite)
    - [AnimationEngine Test Suite](#animationengine-test-suite)

---

## 1. Automated Testing Strategy

### 1.1 Unit Tests (High Priority)

Test individual classes in isolation without terminal I/O dependencies.

#### **Target Components**

##### A. CommandParser (`src/engine/CommandParser.ts`)
**Coverage Goal**: 100% (critical path) ✅ **ACHIEVED**

```typescript
describe('CommandParser', () => {
  describe('Preset Commands', () => {
    test('parses single-digit preset: 01');
    test('parses multi-digit preset: 012');
    test('parses triple-digit preset: 0123');
    test('rejects invalid format: 0abc');
  });

  describe('Pattern Commands', () => {
    test('parses pattern by number: 0p3');
    test('parses pattern by name: 0pwaves');
    test('parses pattern with preset: 0p3.5');
    test('handles case-insensitive names: 0pWaVeS');
    test('rejects invalid pattern: 0p99');
  });

  describe('Theme Commands', () => {
    test('parses theme picker: 0t');
    test('parses theme by number: 0t2');
    test('parses theme by name: 0tfire');
    test('parses random theme: 0tr');
    test('rejects invalid theme: 0txyz');
  });

  describe('Favorite Commands', () => {
    test('parses favorite load: 0f1');
    test('parses favorite save: 0F1');
    test('parses favorite list: 0fl');
    test('handles two-digit slots: 0f99');
    test('rejects zero slot: 0f0');
  });

  describe('Special Commands', () => {
    test('parses random preset: 0*');
    test('parses random all: 0**');
    test('parses preset list: 0?');
    test('parses full catalog: 0??');
    test('parses randomize: 0r');
    test('parses save config: 0s');
    test('parses reset: 0x');
    test('parses shuffle: 0!');
    test('parses shuffle with interval: 0!5');
    test('parses shuffle all: 0!!');
    test('parses search: 0/waves');
  });

  describe('Combination Commands', () => {
    test('parses pattern + preset: 0p3+05');
    test('parses pattern + theme: 0p3+t2');
    test('parses pattern + preset + theme: 0p3+05+t2');
    test('handles whitespace: 0p3 + 05 + t2');
    test('rejects invalid combinations');
  });

  describe('Edge Cases', () => {
    test('handles empty string');
    test('handles single "0"');
    test('handles very long input');
    test('handles special characters');
  });
});
```

##### B. ConfigLoader (`src/config/ConfigLoader.ts`)
**Coverage Goal**: 95% ✅ **ACHIEVED (100%)**

```typescript
describe('ConfigLoader', () => {
  describe('Configuration Merging', () => {
    test('loads defaults when no config exists');
    test('merges config file over defaults');
    test('merges CLI args over config file');
    test('respects merge priority: CLI > file > defaults');
  });

  describe('FPS Resolution', () => {
    test('uses explicit FPS when provided');
    test('resolves FPS from quality preset (LOW=20, MEDIUM=30, HIGH=60)');
    test('prefers explicit FPS over quality preset');
  });

  describe('Favorites Management', () => {
    test('getFavorite returns undefined for non-existent slot');
    test('saveFavorite persists to config file');
    test('getAllFavorites returns all stored favorites');
    test('deleteFavorite removes favorite from config');
  });

  describe('Pattern Config Loading', () => {
    test('loads pattern-specific config from file');
    test('applies default pattern config when not in file');
    test('validates pattern config structure');
  });

  describe('Error Handling', () => {
    test('handles corrupted config file gracefully');
    test('handles missing config file');
    test('handles invalid JSON');
    test('handles missing config sections');
  });
});
```

##### C. Buffer (`src/renderer/Buffer.ts`)
**Coverage Goal**: 90% ✅ **ACHIEVED (100%)**

```typescript
describe('Buffer', () => {
  describe('Cell Management', () => {
    test('initializes buffer with correct dimensions');
    test('resizes buffer correctly');
    test('sets cell char and color');
    test('clears buffer to blank cells');
  });

  describe('Dirty Tracking', () => {
    test('detects changed cells after modification');
    test('returns empty array when no changes');
    test('tracks multiple changed cells');
    test('resets dirty tracking after swap');
  });

  describe('Double Buffering', () => {
    test('swap copies current to previous');
    test('getChanges compares current vs previous');
    test('multiple swaps maintain consistency');
  });

  describe('Edge Cases', () => {
    test('handles 1×1 buffer');
    test('handles very large buffer (200×100)');
    test('handles all cells changing');
  });
});
```

##### D. PerformanceMonitor (`src/engine/PerformanceMonitor.ts`)
**Coverage Goal**: 85% ✅ **ACHIEVED (100%)**

```typescript
describe('PerformanceMonitor', () => {
  describe('Frame Tracking', () => {
    test('records frame start time');
    test('records frame end time');
    test('calculates frame time correctly');
  });

  describe('FPS Calculation', () => {
    test('calculates FPS from frame time');
    test('maintains rolling average (60 frames)');
    test('tracks min/max FPS');
  });

  describe('Component Timing', () => {
    test('records update time');
    test('records render time');
    test('records pattern render time');
  });

  describe('Frame Drop Detection', () => {
    test('detects frame drops when time exceeds threshold');
    test('increments drop counter');
  });
});
```

##### E. Pattern Presets (All 11 Patterns)
**Coverage Goal**: 80% ✅ **ACHIEVED** (173 tests, coverage range: 53%-94%)

**Test Coverage by Pattern**:
- TunnelPattern: 94.16% ⭐ (excellent)
- WavePattern: 92.95% ⭐ (excellent)
- LightningPattern: 84.78% ✅ (good)
- ParticlePattern: 80.51% ✅ (good)
- QuicksilverPattern: 74.50% ✅ (good)
- MatrixPattern: 69.13% ✅ (fair)
- SpiralPattern: 67.56% ✅ (fair)
- PlasmaPattern: 65.75% ✅ (fair)
- StarfieldPattern: 64.89% ✅ (fair)
- RainPattern: 55.05% ⚠️ (needs improvement)
- FireworksPattern: 53.33% ⚠️ (needs improvement)
- SnowPattern: (newly added)

```typescript
describe('Pattern Presets', () => {
  describe.each([
    'WavePattern',      // 38 tests (presets.test.ts)
    'StarfieldPattern', // 38 tests (presets.test.ts)
    'MatrixPattern',    // 15 tests (additional-patterns.test.ts)
    'RainPattern',      // 15 tests
    'QuicksilverPattern', // 15 tests
    'ParticlePattern',  // 15 tests
    'SpiralPattern',    // 15 tests
    'PlasmaPattern',    // 15 tests
    'TunnelPattern',    // 15 tests
    'LightningPattern', // 15 tests
    'FireworksPattern'  // 15 tests
  ])('%s', (patternName) => {
    test('getPresets() returns array of 6 presets');
    test('getPresets() preset IDs are sequential 1-6');
    test('getPresets() all presets have required fields');
    test('getPresets() all preset names are unique');
    test('getPresets() returns copy not reference');
    test('getPreset(id) returns correct preset by ID');
    test('getPreset() returns undefined for invalid IDs');
    test('applyPreset() returns true for valid presets');
    test('applyPreset() returns false for invalid presets');
    test('applyPreset() can switch between presets');
    test('preset characteristics validation');
    test('renders without errors');
    test('handles mouse events');
  });
});
```

##### F. Theme System (`src/config/themes.ts`)
**Coverage Goal**: 90% ✅ **ACHIEVED (100%)**

```typescript
describe('Theme System', () => {
  describe('Color Interpolation', () => {
    test('getColor(0) returns first color');
    test('getColor(1) returns last color');
    test('getColor(0.5) returns interpolated middle color');
    test('interpolates RGB components correctly');
  });

  describe('Theme Definitions', () => {
    test('Ocean theme has correct colors');
    test('Matrix theme has correct colors');
    test('Starlight theme has correct colors');
    test('Fire theme has correct colors');
    test('Monochrome theme has correct colors');
  });

  describe('Theme Lookup', () => {
    test('getThemeByName returns correct theme');
    test('getThemeByName is case-insensitive');
    test('getThemeByName returns undefined for invalid name');
  });
});
```

---

### 1.2 Integration Tests (Medium Priority)

Test components working together with mocked terminal I/O.

```typescript
describe('Integration Tests', () => {
  describe('Animation Flow', () => {
    test('AnimationEngine → Pattern → Buffer pipeline');
    test('Pattern render updates buffer correctly');
    test('Buffer returns changed cells after pattern render');
  });

  describe('Command Execution Flow', () => {
    test('CommandParser → CommandExecutor → Pattern switch');
    test('Preset command updates pattern state');
    test('Theme command recreates patterns with new theme');
  });

  describe('Configuration Flow', () => {
    test('ConfigLoader → Pattern initialization with config');
    test('Pattern-specific config applied on creation');
  });

  describe('Favorites Flow', () => {
    test('Save favorite → Load favorite → Restore state');
    test('Favorite includes pattern, preset, theme');
  });

  describe('Shuffle Mode Flow', () => {
    test('Shuffle mode cycles presets at interval');
    test('Shuffle all mode randomizes pattern + preset + theme');
  });
});
```

---

### 1.3 Snapshot Tests (Medium Priority)

Capture pattern render output for regression testing.

```typescript
describe('Snapshot Tests', () => {
  describe('Pattern Rendering', () => {
    test('WavePattern renders consistently for time=0');
    test('WavePattern renders consistently for time=1000');
    test('StarfieldPattern renders consistently');
    // ... for all patterns
  });

  describe('Preset Rendering', () => {
    test('WavePattern preset 1 vs preset 2 produces different output');
    test('Pattern + theme combinations render correctly');
  });
});
```

---

## 2. Manual Testing Checklist

### 2.1 Pattern Testing (66 Total Tests)

**For EACH pattern (1-11):**

#### Basic Functionality
- [ ] Pattern loads without errors
- [ ] Animation renders smoothly (no flicker)
- [ ] Frame rate matches target (check debug overlay)
- [ ] Pattern fills entire terminal window
- [ ] Pattern responds to window resize

#### Mouse Interaction
- [ ] Mouse move creates visual effects
- [ ] Mouse click creates burst/spawn effects
- [ ] Effects respect pattern boundaries
- [ ] No crashes from rapid mouse movement
- [ ] No crashes from rapid clicking

#### Preset Testing
- [ ] Preset 1 loads (command: `01`)
- [ ] Preset 2 loads (command: `02`)
- [ ] Preset 3 loads (command: `03`)
- [ ] Preset 4 loads (command: `04`)
- [ ] Preset 5 loads (command: `05`)
- [ ] Preset 6 loads (command: `06`)
- [ ] Each preset produces visually distinct behavior
- [ ] Preset changes are immediate
- [ ] Pattern info shows correct preset name

#### Theme Testing
- [ ] Ocean theme colors applied
- [ ] Matrix theme colors applied
- [ ] Starlight theme colors applied
- [ ] Fire theme colors applied
- [ ] Monochrome theme colors applied
- [ ] Theme switch preserves pattern state
- [ ] Theme + preset combinations work

---

### 2.2 Command System Testing

#### Preset Commands
- [ ] `01` - Load preset 1
- [ ] `06` - Load preset 6
- [ ] `012` - Multi-digit preset (if pattern has 12+ presets)
- [ ] `099` - Invalid preset shows error
- [ ] `0*` - Random preset loads successfully
- [ ] `0?` - Shows preset list for current pattern
- [ ] `0??` - Shows all presets catalog (17 patterns × 6 presets)

#### Pattern Jump Commands
- [ ] `0p1` - Jump to pattern 1 (Waves)
- [ ] `0p11` - Jump to pattern 11 (Fireworks)
- [ ] `0p99` - Invalid pattern shows error
- [ ] `0pwaves` - Jump by name (case-insensitive)
- [ ] `0pWaVeS` - Case variation works
- [ ] `0pxyz` - Invalid name shows error
- [ ] `0p3.5` - Jump to pattern 3, preset 5
- [ ] `0p1.1` - Pattern + preset combination

#### Theme Commands
- [ ] `0t` - Shows theme picker menu
- [ ] `0t1` - Jump to theme 1 (Ocean)
- [ ] `0t5` - Jump to theme 5 (Monochrome)
- [ ] `0t9` - Invalid theme shows error
- [ ] `0tfire` - Jump by name (case-insensitive)
- [ ] `0tFIRE` - Case variation works
- [ ] `0txyz` - Invalid name shows error
- [ ] `0tr` - Random theme loads

#### Favorite Commands
- [ ] `0F1` - Save to favorite slot 1
- [ ] `0f1` - Load favorite slot 1
- [ ] `0F99` - Save to slot 99 (boundary test)
- [ ] `0f99` - Load from slot 99
- [ ] `0f50` - Load non-existent favorite shows error
- [ ] `0fl` - List all favorites (formatted correctly)
- [ ] Favorites persist after app restart
- [ ] Favorite includes pattern, preset, theme, timestamp

#### Special Commands
- [ ] `0**` - Randomizes pattern + preset + theme
- [ ] `0r` - Randomizes current pattern settings
- [ ] `0s` - Saves config to file (verify file updated)
- [ ] `0x` - Resets pattern to defaults
- [ ] `0!` - Toggles shuffle mode (10s default)
- [ ] `0!5` - Shuffle with 5-second interval
- [ ] `0!60` - Shuffle with 60-second interval (boundary)
- [ ] `0!!` - Shuffle all (pattern + preset + theme)
- [ ] `0/waves` - Search returns relevant results
- [ ] `0/fire` - Search finds patterns and themes

#### Combination Commands
- [ ] `0p3+05` - Pattern 3 + preset 5
- [ ] `0p3+t2` - Pattern 3 + Fire theme
- [ ] `0p3+05+t2` - Pattern 3 + preset 5 + Fire theme
- [ ] `0p1+01+t1` - Full combination with pattern 1
- [ ] Combinations with whitespace: `0p3 + 05`

#### Command Buffer UI
- [ ] Command overlay appears at bottom: `COMMAND: 0[buffer]_`
- [ ] Buffer clears after 10 seconds of inactivity
- [ ] ESC cancels command buffer
- [ ] ENTER executes command
- [ ] Success message shows (✓ green) for 2.5s
- [ ] Error message shows (✗ red) for 2.5s
- [ ] Up/down arrows navigate command history
- [ ] Command history persists across commands

---

### 2.3 Keyboard Controls

#### Pattern Switching
- [ ] `1` - Switch to Waves
- [ ] `2` - Switch to Starfield
- [ ] `3` - Switch to Matrix
- [ ] `4` - Switch to Rain
- [ ] `5` - Switch to Quicksilver
- [ ] `6` - Switch to Particles
- [ ] `7` - Switch to Spiral
- [ ] `8` - Switch to Plasma
- [ ] `9` - Switch to Tunnel
- [ ] `n` - Next pattern (cycles through all 11)
- [ ] `p` - Previous pattern (cycles through all 11)
- [ ] `n` from pattern 11 wraps to pattern 1
- [ ] `p` from pattern 1 wraps to pattern 11

#### Animation Controls
- [ ] `SPACE` - Pause animation
- [ ] `SPACE` again - Resume animation
- [ ] `+` - Increase FPS (max 60)
- [ ] `-` - Decrease FPS (min 10)
- [ ] `[` - Cycle quality down (HIGH → MEDIUM → LOW)
- [ ] `]` - Cycle quality up (LOW → MEDIUM → HIGH)
- [ ] Quality change updates FPS accordingly

#### Theme & Display
- [ ] `t` - Cycle to next theme
- [ ] `t` cycles through all 5 themes
- [ ] `t` from Monochrome wraps to Ocean
- [ ] Theme change preserves pattern and preset
- [ ] `?` - Toggle help overlay
- [ ] `?` again - Hide help overlay
- [ ] `d` - Toggle debug overlay
- [ ] `d` again - Hide debug overlay

#### Exit
- [ ] `q` - Quit application
- [ ] `ESC` - Quit application
- [ ] `Ctrl+C` - Quit application
- [ ] All exit methods restore terminal state
- [ ] No leftover artifacts after quit

---

### 2.4 Configuration System

#### Config File Loading
- [ ] App loads config from `~/.config/ascii-splash/.splashrc.json`
- [ ] Missing config file uses defaults
- [ ] Corrupted JSON shows error and uses defaults
- [ ] Partial config merges with defaults

#### CLI Arguments
- [ ] `--pattern waves` - Starts with Waves pattern
- [ ] `--pattern starfield` - Starts with Starfield
- [ ] `--pattern invalid` - Shows error
- [ ] `--fps 60` - Sets target FPS to 60
- [ ] `--fps 5` - Clamps to minimum (10)
- [ ] `--quality low` - Sets LOW quality (20 FPS)
- [ ] `--quality high` - Sets HIGH quality (60 FPS)
- [ ] `--theme fire` - Starts with Fire theme
- [ ] `--no-mouse` - Disables mouse input
- [ ] `--help` - Shows help text
- [ ] `--version` - Shows version number

#### Config Priority
- [ ] CLI arg overrides config file (test with `--fps 60` vs config fps: 30)
- [ ] Config file overrides defaults (set pattern in config, verify)
- [ ] Defaults apply when no config or CLI args

#### Config Persistence
- [ ] `0s` command saves current state to config
- [ ] Favorites saved to config file persist
- [ ] Pattern-specific configs persist
- [ ] Config changes survive app restart

---

### 2.5 Theme System (55 Tests)

**For EACH theme (5 themes) × EACH pattern (17 patterns):**

- [ ] Pattern uses theme colors (verify visually)
- [ ] Color gradient respects theme palette
- [ ] No hardcoded colors override theme
- [ ] Theme switch is instant (no lag)
- [ ] Pattern reset preserves theme

---

### 2.6 Performance Testing

#### FPS & Timing
- [ ] Debug overlay shows accurate FPS
- [ ] FPS stays at target ±5%
- [ ] Frame time breakdown is reasonable (update + render < 33ms @ 30 FPS)
- [ ] No consistent frame drops during idle animation
- [ ] Changed cell count is reasonable (<20% of screen for most patterns)

#### Resource Usage
- [ ] CPU usage < 5% when idle (no mouse movement)
- [ ] CPU usage < 15% during active mouse interaction
- [ ] Memory usage < 50MB
- [ ] No memory leaks after 5+ minutes
- [ ] No memory leaks after pattern switching 50+ times

#### Stress Testing
- [ ] Rapid pattern switching (1-9 keys spam)
- [ ] Rapid preset changes (01-06 rapid fire)
- [ ] Rapid theme cycling (t key spam)
- [ ] Mouse spam (move rapidly across screen)
- [ ] Mouse click spam (100+ clicks)
- [ ] Shuffle mode runs for 5+ minutes without issues
- [ ] Shuffle all mode runs for 5+ minutes

---

### 2.7 Edge Cases & Error Handling

#### Terminal Size
- [ ] Very small terminal (20×10) - no crashes
- [ ] Very large terminal (200×100) - acceptable performance
- [ ] Resize while animating - smooth transition
- [ ] Resize to 1×1 - graceful handling
- [ ] Rapid resize changes - stable

#### Input Edge Cases
- [ ] Command buffer with 50+ characters
- [ ] Command buffer timeout (10s idle)
- [ ] Typing during command execution
- [ ] Typing during pattern switch
- [ ] Mouse events during pattern switch
- [ ] Mouse events during window resize

#### Error States
- [ ] Non-existent favorite load shows friendly error
- [ ] Invalid preset number shows error
- [ ] Invalid pattern name shows suggestions
- [ ] Config file with invalid JSON recovered
- [ ] Missing config sections use defaults
- [ ] Pattern render error doesn't crash app

---

## 3. Test Automation Setup

### 3.1 Jest Configuration

**Install dependencies:**
```bash
npm install --save-dev jest @types/jest ts-jest
```

**Create `jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  }
};
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

### 3.2 Directory Structure ✅ **IMPLEMENTED**

```
tests/
├── unit/
│   ├── config/
│   │   ├── ConfigLoader.test.ts       (28 tests, 100% coverage)
│   │   └── themes.test.ts             (48 tests, 100% coverage)
│   ├── engine/
│   │   ├── AnimationEngine.test.ts    (55 tests, 98.14% coverage)
│   │   ├── CommandBuffer.test.ts      (56 tests, 100% coverage)
│   │   ├── CommandExecutor.test.ts    (96 tests, 96.63% coverage)
│   │   ├── CommandParser.test.ts      (68 tests, 100% coverage)
│   │   └── PerformanceMonitor.test.ts (35 tests, 100% coverage)
│   ├── patterns/
│   │   ├── presets.test.ts            (38 tests, WavePattern + StarfieldPattern)
│   │   └── additional-patterns.test.ts (135 tests, 9 remaining patterns)
│   └── renderer/
│       └── Buffer.test.ts             (33 tests, 100% coverage)
├── utils/
│   └── mocks.ts                        (Test utilities and mocks)
├── integration/                         (Not implemented - optional)
└── snapshots/                           (Not implemented - optional)
```

**Total: 10 test files, 817 tests**

---

### 3.3 Test Utilities

**Create `tests/utils/MockTerminal.ts`:**
```typescript
// Mock terminal-kit for testing
export class MockTerminal {
  width = 80;
  height = 24;
  
  moveTo(x: number, y: number) {}
  str(text: string) {}
  eraseDisplay() {}
  grabInput() {}
  hideCursor() {}
  clear() {}
}
```

**Create `tests/utils/PatternTestHelpers.ts`:**
```typescript
import { Pattern, Cell, Size, Point } from '../../src/types';

export function createMockBuffer(width: number, height: number): Cell[][] {
  return Array(height).fill(null).map(() =>
    Array(width).fill(null).map(() => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
  );
}

export function renderPattern(pattern: Pattern, time: number, size: Size): Cell[][] {
  const buffer = createMockBuffer(size.width, size.height);
  pattern.render(buffer, time, size);
  return buffer;
}

export function countNonBlankCells(buffer: Cell[][]): number {
  return buffer.flat().filter(cell => cell.char !== ' ').length;
}
```

---

## 4. CI/CD Integration

### 4.1 GitHub Actions Workflow

**Create `.github/workflows/test.yml`:**
```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run TypeScript compiler
      run: npm run build
    
    - name: Run tests
      run: npm test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      if: matrix.node-version == '20.x'
```

---

## 5. Testing Milestones

### Milestone 1: Foundation (Week 1) ✅ **COMPLETE**
- [x] Install Jest and configure
- [x] Write tests for CommandParser (100% coverage) - 68 tests
- [x] Write tests for Buffer (90% coverage) - 33 tests
- [ ] Set up CI/CD pipeline

### Milestone 2: Core Logic (Week 2) ✅ **COMPLETE**
- [x] Write tests for ConfigLoader (95% coverage) - 28 tests
- [x] Write tests for PerformanceMonitor (85% coverage) - 35 tests
- [x] Write tests for Theme system (90% coverage) - 48 tests
- [ ] Integration tests for command execution flow

### Milestone 3: Patterns (Week 3) ✅ **COMPLETE**
- [x] Write preset tests for sample patterns (WavePattern, StarfieldPattern) - 38 tests
- [x] Write preset tests for remaining 9 patterns - 135 tests (additional-patterns.test.ts)
- [ ] Snapshot tests for pattern rendering (optional - deferred)
- [ ] Integration tests for pattern switching (optional - deferred)

### Milestone 4: Manual QA (Week 4)
- [ ] Complete full manual testing checklist
- [ ] Document any bugs found
- [ ] Performance testing and profiling
- [ ] Cross-terminal compatibility testing

---

## 6. Test Execution Guide

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- CommandParser.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Preset Commands"
```

### Coverage Goals

- **CommandParser**: 100% ✅ **ACHIEVED**
- **ConfigLoader**: 95% ✅ **ACHIEVED (100%)**
- **Buffer**: 90% ✅ **ACHIEVED (100%)**
- **PerformanceMonitor**: 85% ✅ **ACHIEVED (100%)**
- **Theme System**: 90% ✅ **ACHIEVED (100%)**
- **CommandBuffer**: 95% ✅ **ACHIEVED (100%)**
- **AnimationEngine**: 90% ✅ **ACHIEVED (98.14%)**
- **CommandExecutor**: 90% ✅ **ACHIEVED (96.63%)**
- **Pattern Presets**: 80% ✅ **ACHIEVED (667 tests passing, 95%-100% coverage range)**
- **Overall Project**: 80%+ ✅ **EXCEEDED (92.35%)**

---

## 7. Bug Tracking Template

When issues are found during testing:

```markdown
**Bug**: [Short description]
**Severity**: Critical | High | Medium | Low
**Component**: [Pattern/Command/Config/etc]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. ...

**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happens]
**Environment**: [Terminal, Node version, OS]
**Test Case**: [Reference to test checklist item]
```

---

## 8. Next Steps

**All Core Testing Complete** ✅

With 1505 tests and 92.35% coverage achieved, all primary testing goals are complete. Future enhancements are **optional** and not required for production:

1. **Integration Tests** (Optional) - End-to-end flow testing across components (~30 tests)
2. **CI/CD Pipeline** (Optional) - Automated testing on push/PR (see [Section 4.1](#41-github-actions-workflow))
3. **Snapshot Tests** (Optional) - Pattern output regression testing
4. **Cross-Terminal Testing** (Manual) - Verify behavior across different terminal emulators
5. **Performance Profiling** (Manual) - Long-running stability tests (5+ hours)

**For current project status**, see [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Appendix: Quick Smoke Test Script

Run this 5-minute test to verify basic functionality:

```bash
# Build and start
npm run build && npm start

# Test sequence:
1. Press 1-9    → All patterns load
2. Press n 10x  → Cycles through patterns 1-11
3. Type 01-06   → Presets load for each pattern
4. Press t 5x   → All themes apply
5. Type 0F1     → Save favorite
6. Type 0f1     → Load favorite (matches current state)
7. Type 0*      → Random preset loads
8. Type 0**     → Random pattern+preset+theme loads
9. Press d      → Debug overlay shows metrics
10. Press q     → Clean exit
```

**Pass criteria**: No crashes, no visual artifacts, all commands execute

---

**Document Version**: 2.0  
**Last Updated**: 2025-11-05  
**Status**: ✅ v0.2.0 Published to npm - All milestones complete, 1505 tests passing (100%), 92.35% coverage achieved, 17 patterns complete

---

## Test Results Summary

**Current Status** (v0.2.0):
- ✅ **1505 tests passing** across 28 test suites (100%)
- ✅ **92.35% overall coverage** (target: 80%+ **EXCEEDED**)
- ✅ **All 17 patterns tested** (667 pattern tests)
- ✅ **All engine components tested** (CommandParser, CommandBuffer, CommandExecutor, AnimationEngine)
- ✅ **All core systems tested** (Config, Buffer, PerformanceMonitor, Themes)

**Test Suite Breakdown**:
- **Engine Tests** (310 tests): CommandParser (68), CommandBuffer (56), CommandExecutor (96), AnimationEngine (55), PerformanceMonitor (35)
- **Pattern Tests** (667 tests): All 17 patterns with preset/rendering tests
- **Config Tests** (76 tests): ConfigLoader (28), Themes (48)
- **Renderer Tests** (113 tests): Buffer with dirty tracking, TerminalRenderer
- **Utility Tests** (339 tests): Drawing, math, noise, validation, metaballs, buffer safety

**Coverage by Component**:
- Core Engine: 96-100% (CommandParser, CommandBuffer, PerformanceMonitor)
- Animation: 98.14% (AnimationEngine)
- Configuration: 100% (ConfigLoader, Themes)
- Rendering: 88.49-100% (Buffer: 100%, TerminalRenderer: 88.49%)
- Patterns: 95-100% statements for core patterns (average ~97%)
- Utilities: 91-100% (Drawing: 94.52%, Math: 91.12%, Noise: 92.10%)

**For detailed coverage metrics and test breakdowns**, see [PROJECT_STATUS.md](PROJECT_STATUS.md#testing-coverage).

---
