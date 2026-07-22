import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  Easing,
  getTransitionManager,
  resetTransitionManager,
  TransitionManager,
} from '../../../src/renderer/TransitionManager.js';
import type { Cell, Color, Size } from '../../../src/types/index.js';
import { createMockBuffer } from '../../utils/mocks.js';

function frame(size: Size, char: string, color?: Color, bg?: Color): Cell[][] {
  return Array.from({ length: size.height }, () =>
    Array.from({ length: size.width }, () => ({
      char,
      ...(color === undefined ? {} : { color: { ...color } }),
      ...(bg === undefined ? {} : { bg: { ...bg } }),
    }))
  );
}

describe('TransitionManager', () => {
  let transitionManager: TransitionManager;
  const size = { width: 40, height: 20 };
  const source = frame(size, 'A', { r: 255, g: 0, b: 0 });
  const targetColor = { r: 0, g: 0, b: 255 };

  beforeEach(() => {
    resetTransitionManager();
    transitionManager = getTransitionManager();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton', () => {
    test('getTransitionManager returns same instance', () => {
      expect(getTransitionManager()).toBe(getTransitionManager());
    });

    test('resetTransitionManager creates new instance', () => {
      const first = getTransitionManager();
      resetTransitionManager();
      expect(getTransitionManager()).not.toBe(first);
    });
  });

  describe('start and lifecycle', () => {
    test('starts from a non-empty frame snapshot', () => {
      transitionManager.start(source);
      expect(transitionManager.isActive()).toBe(true);
    });

    test('does not start instant, zero-duration, or empty transitions', () => {
      transitionManager.start(source, { type: 'instant' });
      expect(transitionManager.isActive()).toBe(false);
      transitionManager.start(source, { duration: 0 });
      expect(transitionManager.isActive()).toBe(false);
      transitionManager.start([]);
      expect(transitionManager.isActive()).toBe(false);
    });

    test('accepts custom configuration and reports progress', () => {
      transitionManager.start(source, { type: 'dissolve', duration: 1000 });
      jest.mocked(Date.now).mockReturnValue(1500);
      expect(transitionManager.getProgress()).toBe(0.5);
    });

    test('reports complete progress when inactive', () => {
      expect(transitionManager.getProgress()).toBe(1);
    });

    test('cancel is safe and deactivates the transition', () => {
      transitionManager.start(source);
      transitionManager.cancel();
      transitionManager.cancel();
      expect(transitionManager.isActive()).toBe(false);
    });

    test('default configuration can be updated', () => {
      transitionManager.setDefaultConfig({ type: 'dissolve', duration: 200 });
      transitionManager.start(source);
      expect(transitionManager.isActive()).toBe(true);
      const target = frame(size, 'B', targetColor);
      expect(transitionManager.render(target, 1200, size)).toBe(false);
    });

    test('starting a new transition replaces the active source snapshot', () => {
      transitionManager.start(source, { duration: 1000, easing: Easing.linear });
      transitionManager.start(frame(size, 'C'), { duration: 1000, easing: Easing.linear });
      const target = frame(size, 'B');
      transitionManager.render(target, 1000, size);
      expect(target[0][0].char).toBe('C');
    });
  });

  describe('snapshot rendering', () => {
    test('returns false without an active transition', () => {
      expect(transitionManager.render(frame(size, 'B'), 1000, size)).toBe(false);
    });

    test('first transition frame shows the captured old state', () => {
      transitionManager.start(source, { duration: 1000, easing: Easing.linear });
      const target = frame(size, 'B', targetColor);

      expect(transitionManager.render(target, 1000, size)).toBe(true);
      expect(target[10][20]).toEqual(source[10][20]);
    });

    test('completion leaves the exact target frame untouched', () => {
      transitionManager.start(source, { duration: 100, easing: Easing.linear });
      const target = frame(size, 'B', targetColor, { r: 1, g: 2, b: 3 });
      const expected = structuredClone(target);

      expect(transitionManager.render(target, 1100, size)).toBe(false);
      expect(target).toEqual(expected);
      expect(transitionManager.isActive()).toBe(false);
    });

    test('crossfade blends defined foreground and background colors', () => {
      const sourceWithBg = frame(size, 'A', { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 });
      transitionManager.start(sourceWithBg, {
        type: 'crossfade',
        duration: 1000,
        easing: Easing.linear,
      });
      const target = frame(size, 'B', targetColor, { r: 0, g: 0, b: 255 });

      transitionManager.render(target, 1500, size);
      expect(target[10][20]).toEqual({
        char: 'B',
        color: { r: 128, g: 0, b: 128 },
        bg: { r: 0, g: 128, b: 128 },
      });
    });

    test('crossfade preserves terminal-default color definedness', () => {
      transitionManager.start(frame(size, 'A'), {
        type: 'crossfade',
        duration: 1000,
        easing: Easing.linear,
      });
      const early = frame(size, 'B', targetColor, { r: 1, g: 2, b: 3 });
      transitionManager.render(early, 1250, size);
      expect(early[0][0]).toEqual({ char: 'A' });

      transitionManager.cancel();
      transitionManager.start(frame(size, 'A'), {
        type: 'crossfade',
        duration: 1000,
        easing: Easing.linear,
      });
      const late = frame(size, 'B', targetColor, { r: 1, g: 2, b: 3 });
      transitionManager.render(late, 1750, size);
      expect(late[0][0]).toEqual({
        char: 'B',
        color: targetColor,
        bg: { r: 1, g: 2, b: 3 },
      });
    });

    test('dissolve shows a deterministic mix and preserves complete cells', () => {
      const sourceWithBg = frame(size, 'A', { r: 1, g: 2, b: 3 }, { r: 4, g: 5, b: 6 });
      transitionManager.start(sourceWithBg, {
        type: 'dissolve',
        duration: 1000,
        easing: Easing.linear,
      });
      const target = frame(size, 'B', { r: 7, g: 8, b: 9 }, { r: 10, g: 11, b: 12 });
      transitionManager.render(target, 1500, size);

      const cells = target.flat();
      expect(cells.some(cell => cell.char === 'A')).toBe(true);
      expect(cells.some(cell => cell.char === 'B')).toBe(true);
      expect(cells.find(cell => cell.char === 'A')).toEqual(sourceWithBg[0][0]);
      expect(cells.find(cell => cell.char === 'B')).toEqual({
        char: 'B',
        color: { r: 7, g: 8, b: 9 },
        bg: { r: 10, g: 11, b: 12 },
      });
    });

    test.each([
      ['wipe-left', 'B', 'A'],
      ['wipe-right', 'A', 'B'],
    ] as const)('%s reveals the expected half and preserves fg/bg', (type, left, right) => {
      const sourceWithBg = frame(size, 'A', { r: 1, g: 2, b: 3 }, { r: 4, g: 5, b: 6 });
      transitionManager.start(sourceWithBg, {
        type,
        duration: 1000,
        easing: Easing.linear,
      });
      const target = frame(size, 'B', { r: 7, g: 8, b: 9 }, { r: 10, g: 11, b: 12 });
      transitionManager.render(target, 1500, size);

      expect(target[10][5].char).toBe(left);
      expect(target[10][35].char).toBe(right);
      expect(target[10][5].bg).toBeDefined();
      expect(target[10][35].bg).toBeDefined();
    });

    test('does not mutate the caller source and snapshots nested colors', () => {
      const mutable = frame(size, 'A', { r: 1, g: 2, b: 3 });
      transitionManager.start(mutable, { duration: 1000, easing: Easing.linear });
      mutable[0][0].char = 'X';
      if (mutable[0][0].color) mutable[0][0].color.r = 99;
      const target = frame(size, 'B');

      transitionManager.render(target, 1000, size);
      expect(target[0][0]).toEqual({ char: 'A', color: { r: 1, g: 2, b: 3 } });
    });

    test('does not touch the reserved status row', () => {
      transitionManager.start(source, { duration: 1000, easing: Easing.linear });
      const fullTarget = frame({ width: 40, height: 21 }, 'B', targetColor);
      fullTarget[20] = frame({ width: 40, height: 1 }, 'S')[0];

      transitionManager.render(fullTarget, 1500, size);
      expect(fullTarget[20].every(cell => cell.char === 'S')).toBe(true);
    });
  });

  describe('resize safety', () => {
    test.each([
      { width: 60, height: 30 },
      { width: 20, height: 10 },
    ])('cancels safely for resized target $width×$height', resized => {
      transitionManager.start(source, { duration: 1000 });
      const target = frame(resized, 'B', targetColor);
      const expected = structuredClone(target);

      expect(() => transitionManager.render(target, 1200, resized)).not.toThrow();
      expect(target).toEqual(expected);
      expect(transitionManager.isActive()).toBe(false);
    });
  });

  describe('Easing Functions', () => {
    test('linear', () => {
      expect([Easing.linear(0), Easing.linear(0.5), Easing.linear(1)]).toEqual([0, 0.5, 1]);
    });

    test('quadratic easing', () => {
      expect(Easing.easeInQuad(0.5)).toBe(0.25);
      expect(Easing.easeOutQuad(0.5)).toBe(0.75);
      expect(Easing.easeInOutQuad(0.25)).toBeLessThan(0.25);
      expect(Easing.easeInOutQuad(0.75)).toBeGreaterThan(0.75);
    });

    test('cubic easing', () => {
      expect(Easing.easeInCubic(0.5)).toBe(0.125);
      expect(Easing.easeOutCubic(0.5)).toBeGreaterThan(0.5);
      expect(Easing.easeInOutCubic(0.5)).toBe(0.5);
    });
  });

  test('handles an empty target without throwing when inactive', () => {
    expect(() =>
      transitionManager.render(createMockBuffer(0, 0), 1000, { width: 0, height: 0 })
    ).not.toThrow();
  });
});
