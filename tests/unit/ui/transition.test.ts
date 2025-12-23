/**
 * TransitionManager Unit Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  TransitionManager,
  getTransitionManager,
  resetTransitionManager,
  Easing,
} from '../../../src/renderer/TransitionManager.js';
import { createMockBuffer } from '../../utils/mocks.js';
import { Pattern, Cell, Size, Point } from '../../../src/types/index.js';

// Simple mock pattern for testing
class MockPattern implements Pattern {
  name = 'MockPattern';
  private char: string;
  private color: { r: number; g: number; b: number };

  constructor(char: string, color: { r: number; g: number; b: number }) {
    this.char = char;
    this.color = color;
  }

  render(buffer: Cell[][], _time: number, size: Size, _mousePos?: Point): void {
    for (let y = 0; y < size.height && y < buffer.length; y++) {
      for (let x = 0; x < size.width && x < buffer[y].length; x++) {
        buffer[y][x] = { char: this.char, color: this.color };
      }
    }
  }

  reset(): void {}
}

describe('TransitionManager', () => {
  let transitionManager: TransitionManager;
  let patternA: Pattern;
  let patternB: Pattern;
  const size = { width: 40, height: 20 };

  beforeEach(() => {
    resetTransitionManager();
    transitionManager = getTransitionManager();
    patternA = new MockPattern('A', { r: 255, g: 0, b: 0 });
    patternB = new MockPattern('B', { r: 0, g: 0, b: 255 });
  });

  describe('Singleton', () => {
    test('getTransitionManager returns same instance', () => {
      const instance1 = getTransitionManager();
      const instance2 = getTransitionManager();
      expect(instance1).toBe(instance2);
    });

    test('resetTransitionManager creates new instance', () => {
      const instance1 = getTransitionManager();
      resetTransitionManager();
      const instance2 = getTransitionManager();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('start()', () => {
    test('should start a transition', () => {
      transitionManager.start(patternA, patternB, size);
      expect(transitionManager.isActive()).toBe(true);
    });

    test('should not start transition for instant type', () => {
      transitionManager.start(patternA, patternB, size, { type: 'instant' });
      expect(transitionManager.isActive()).toBe(false);
    });

    test('should not start transition for zero duration', () => {
      transitionManager.start(patternA, patternB, size, { duration: 0 });
      expect(transitionManager.isActive()).toBe(false);
    });

    test('should accept custom configuration', () => {
      transitionManager.start(patternA, patternB, size, {
        type: 'dissolve',
        duration: 1000,
      });
      expect(transitionManager.isActive()).toBe(true);
    });
  });

  describe('isActive()', () => {
    test('should return false when no transition', () => {
      expect(transitionManager.isActive()).toBe(false);
    });

    test('should return true during transition', () => {
      transitionManager.start(patternA, patternB, size);
      expect(transitionManager.isActive()).toBe(true);
    });
  });

  describe('getProgress()', () => {
    test('should return 1 when no transition', () => {
      expect(transitionManager.getProgress()).toBe(1);
    });

    test('should return value between 0 and 1 during transition', () => {
      transitionManager.start(patternA, patternB, size, { duration: 1000 });
      const progress = transitionManager.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  describe('cancel()', () => {
    test('should cancel active transition', () => {
      transitionManager.start(patternA, patternB, size);
      expect(transitionManager.isActive()).toBe(true);

      transitionManager.cancel();
      expect(transitionManager.isActive()).toBe(false);
    });

    test('should be safe to call when no transition', () => {
      expect(() => {
        transitionManager.cancel();
      }).not.toThrow();
    });
  });

  describe('setDefaultConfig()', () => {
    test('should update default transition type', () => {
      transitionManager.setDefaultConfig({ type: 'dissolve' });
      transitionManager.start(patternA, patternB, size);
      expect(transitionManager.isActive()).toBe(true);
    });

    test('should update default duration', () => {
      transitionManager.setDefaultConfig({ duration: 200 });
      transitionManager.start(patternA, patternB, size);
      expect(transitionManager.isActive()).toBe(true);
    });
  });

  describe('render()', () => {
    test('should return false when no transition', () => {
      const buffer = createMockBuffer(40, 20);
      const result = transitionManager.render(buffer, Date.now(), size);
      expect(result).toBe(false);
    });

    test('should return true during active transition', () => {
      const buffer = createMockBuffer(40, 20);
      transitionManager.start(patternA, patternB, size, { duration: 1000 });
      const result = transitionManager.render(buffer, Date.now(), size);
      expect(result).toBe(true);
    });

    test('should return false when transition completes', () => {
      const buffer = createMockBuffer(40, 20);
      const startTime = Date.now();
      transitionManager.start(patternA, patternB, size, { duration: 100 });

      // Render at completion time
      const result = transitionManager.render(buffer, startTime + 200, size);
      expect(result).toBe(false);
    });

    test('crossfade should blend colors', () => {
      const buffer = createMockBuffer(40, 20);
      const startTime = Date.now();
      transitionManager.start(patternA, patternB, size, {
        type: 'crossfade',
        duration: 1000,
        easing: Easing.linear,
      });

      // Render at 50% progress
      transitionManager.render(buffer, startTime + 500, size);

      // At 50%, colors should be blended
      const cell = buffer[10][20];
      expect(cell.color).toBeDefined();
      // Blended color should have both red and blue components
      expect(cell.color!.r).toBeGreaterThan(0);
      expect(cell.color!.b).toBeGreaterThan(0);
    });

    test('dissolve should show mixed cells', () => {
      const buffer = createMockBuffer(40, 20);
      const startTime = Date.now();
      transitionManager.start(patternA, patternB, size, {
        type: 'dissolve',
        duration: 1000,
        easing: Easing.linear,
      });

      // Render at 50% progress
      transitionManager.render(buffer, startTime + 500, size);

      // Should have mix of A and B cells
      let hasA = false;
      let hasB = false;
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 40; x++) {
          if (buffer[y][x].char === 'A') hasA = true;
          if (buffer[y][x].char === 'B') hasB = true;
        }
      }
      expect(hasA).toBe(true);
      expect(hasB).toBe(true);
    });

    test('wipe-left should show progressive reveal', () => {
      const buffer = createMockBuffer(40, 20);
      const startTime = Date.now();
      transitionManager.start(patternA, patternB, size, {
        type: 'wipe-left',
        duration: 1000,
        easing: Easing.linear,
      });

      // Render at 50% progress
      transitionManager.render(buffer, startTime + 500, size);

      // Left half should be B, right half should be A
      const leftCell = buffer[10][5];
      const rightCell = buffer[10][35];
      expect(leftCell.char).toBe('B');
      expect(rightCell.char).toBe('A');
    });

    test('wipe-right should show progressive reveal', () => {
      const buffer = createMockBuffer(40, 20);
      const startTime = Date.now();
      transitionManager.start(patternA, patternB, size, {
        type: 'wipe-right',
        duration: 1000,
        easing: Easing.linear,
      });

      // Render at 50% progress
      transitionManager.render(buffer, startTime + 500, size);

      // Right half should be B, left half should be A
      const leftCell = buffer[10][5];
      const rightCell = buffer[10][35];
      expect(leftCell.char).toBe('A');
      expect(rightCell.char).toBe('B');
    });

    test('should handle resize during transition', () => {
      const buffer1 = createMockBuffer(40, 20);
      const startTime = Date.now();
      transitionManager.start(patternA, patternB, size, { duration: 1000 });

      // Render at original size
      transitionManager.render(buffer1, startTime + 100, size);

      // Render at different size
      const newSize = { width: 60, height: 30 };
      const buffer2 = createMockBuffer(60, 30);

      expect(() => {
        transitionManager.render(buffer2, startTime + 200, newSize);
      }).not.toThrow();
    });
  });

  describe('Easing Functions', () => {
    test('linear should return input value', () => {
      expect(Easing.linear(0)).toBe(0);
      expect(Easing.linear(0.5)).toBe(0.5);
      expect(Easing.linear(1)).toBe(1);
    });

    test('easeInQuad should accelerate', () => {
      expect(Easing.easeInQuad(0)).toBe(0);
      expect(Easing.easeInQuad(0.5)).toBe(0.25);
      expect(Easing.easeInQuad(1)).toBe(1);
    });

    test('easeOutQuad should decelerate', () => {
      expect(Easing.easeOutQuad(0)).toBe(0);
      expect(Easing.easeOutQuad(0.5)).toBe(0.75);
      expect(Easing.easeOutQuad(1)).toBe(1);
    });

    test('easeInOutQuad should ease in and out', () => {
      expect(Easing.easeInOutQuad(0)).toBe(0);
      expect(Easing.easeInOutQuad(0.5)).toBe(0.5);
      expect(Easing.easeInOutQuad(1)).toBe(1);
      // First half should be slower
      expect(Easing.easeInOutQuad(0.25)).toBeLessThan(0.25);
      // Second half should be faster approach
      expect(Easing.easeInOutQuad(0.75)).toBeGreaterThan(0.75);
    });

    test('easeInCubic should accelerate more aggressively', () => {
      expect(Easing.easeInCubic(0)).toBe(0);
      expect(Easing.easeInCubic(0.5)).toBe(0.125);
      expect(Easing.easeInCubic(1)).toBe(1);
    });

    test('easeOutCubic should decelerate more smoothly', () => {
      expect(Easing.easeOutCubic(0)).toBe(0);
      expect(Easing.easeOutCubic(1)).toBe(1);
      // Should approach 1 faster than linear
      expect(Easing.easeOutCubic(0.5)).toBeGreaterThan(0.5);
    });

    test('easeInOutCubic should ease in and out smoothly', () => {
      expect(Easing.easeInOutCubic(0)).toBe(0);
      expect(Easing.easeInOutCubic(0.5)).toBe(0.5);
      expect(Easing.easeInOutCubic(1)).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty buffer', () => {
      const buffer: Cell[][] = [];
      const emptySize = { width: 0, height: 0 };

      transitionManager.start(patternA, patternB, emptySize);

      expect(() => {
        transitionManager.render(buffer, Date.now(), emptySize);
      }).not.toThrow();
    });

    test('should handle starting new transition while one is active', () => {
      const buffer = createMockBuffer(40, 20);
      transitionManager.start(patternA, patternB, size, { duration: 1000 });
      expect(transitionManager.isActive()).toBe(true);

      // Start new transition
      const patternC = new MockPattern('C', { r: 0, g: 255, b: 0 });
      transitionManager.start(patternB, patternC, size, { duration: 500 });
      expect(transitionManager.isActive()).toBe(true);

      // Render should work with new transition
      transitionManager.render(buffer, Date.now(), size);
    });

    test('should handle mousePos parameter', () => {
      const buffer = createMockBuffer(40, 20);
      transitionManager.start(patternA, patternB, size);

      expect(() => {
        transitionManager.render(buffer, Date.now(), size, { x: 20, y: 10 });
      }).not.toThrow();
    });
  });
});
