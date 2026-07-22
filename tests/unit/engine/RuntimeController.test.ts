import { describe, expect, jest, test } from '@jest/globals';
import {
  RuntimeController,
  type RuntimeChangeEvent,
  type RuntimeControllerOptions,
  type RuntimeEngine,
} from '../../../src/engine/RuntimeController.js';
import type {
  Pattern,
  PatternPresetInfo,
  PatternSlot,
  PatternSlotKind,
  Theme,
} from '../../../src/types/index.js';

interface MockPattern extends Pattern {
  reset: jest.Mock<() => void>;
  applyPreset?: jest.Mock<(presetId: number) => boolean>;
}

function mockPattern(name: string, presetIds: readonly number[] = [1, 2, 3]): MockPattern {
  return {
    name,
    render: jest.fn(),
    reset: jest.fn(),
    applyPreset: presetIds.length === 0 ? undefined : jest.fn(id => presetIds.includes(id)),
  };
}

function presets(count: number): readonly PatternPresetInfo[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Preset ${String(index + 1)}`,
  }));
}

function slot(
  key: string,
  options: {
    seed?: number | null;
    presetCount?: number;
    pattern?: MockPattern;
    kind?: PatternSlotKind;
    shareable?: boolean;
  } = {}
): PatternSlot {
  const presetCount = options.presetCount ?? 3;
  return Object.freeze({
    key,
    displayName: key.toUpperCase(),
    kind: options.kind ?? 'procedural',
    pattern:
      options.pattern ??
      mockPattern(
        key,
        presets(presetCount).map(p => p.id)
      ),
    seed: options.seed === undefined ? 100 : options.seed,
    shareable: options.shareable ?? true,
    presets: presets(presetCount),
    legacyNames: Object.freeze([`${key}Pattern`]),
  });
}

function theme(name: string): Theme {
  return {
    name,
    displayName: name.toUpperCase(),
    colors: [],
    getColor: jest.fn(() => ({ r: 0, g: 0, b: 0 })),
  };
}

interface Harness {
  controller: RuntimeController;
  engine: RuntimeEngine;
  setPattern: jest.Mock<(pattern: Pattern) => void>;
  resetSceneTime: jest.Mock<() => void>;
  setFps: jest.Mock<(fps: number) => void>;
  rebuildSlots: jest.Mock<RuntimeControllerOptions['rebuildSlots']>;
  initialSlots: readonly PatternSlot[];
  themes: readonly Theme[];
}

function createHarness(
  overrides: Partial<RuntimeControllerOptions> & {
    slots?: readonly PatternSlot[];
    fps?: number;
  } = {}
): Harness {
  const initialSlots = overrides.slots ?? [slot('waves', { seed: 0 }), slot('stars', { seed: 42 })];
  const themes = overrides.themes ?? [theme('ocean'), theme('fire')];
  let currentPattern = initialSlots[overrides.initialPatternIndex ?? 0].pattern;
  let fps = overrides.fps ?? 30;
  const setPattern = jest.fn((pattern: Pattern) => {
    currentPattern = pattern;
  });
  const setFps = jest.fn((value: number) => {
    fps = value;
  });
  const resetSceneTime = jest.fn();
  const engine: RuntimeEngine = {
    getPattern: () => currentPattern,
    setPattern,
    getFps: () => fps,
    setFps,
    resetSceneTime,
  };
  const rebuildSlots = jest.fn<RuntimeControllerOptions['rebuildSlots']>((_theme, priorSeeds) =>
    initialSlots.map(entry =>
      slot(entry.key, {
        seed: entry.seed === null ? null : priorSeeds.get(entry.key),
        presetCount: entry.presets.length,
        kind: entry.kind,
        shareable: entry.shareable,
      })
    )
  );
  const controller = new RuntimeController({
    engine,
    themes,
    initialSlots,
    initialPatternIndex: 0,
    initialThemeIndex: 0,
    initialQuality: 'medium',
    rebuildSlots,
    ...overrides,
  });
  return {
    controller,
    engine,
    setPattern,
    resetSceneTime,
    setFps,
    rebuildSlots,
    initialSlots,
    themes,
  };
}

describe('RuntimeController', () => {
  describe('construction and snapshots', () => {
    test('captures an immutable initial snapshot matching the engine', () => {
      const { controller } = createHarness();
      const snapshot = controller.getSnapshot();

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(snapshot).toMatchObject({
        patternIndex: 0,
        patternKey: 'waves',
        presetId: 1,
        presetApplied: false,
        themeIndex: 0,
        themeName: 'ocean',
        quality: 'medium',
        fps: 30,
        seed: 0,
        patternCount: 2,
      });
      expect(controller.getCurrentPattern()).toBe(controller.getCurrentSlot().pattern);
      expect(Object.isFrozen(controller.getSlots())).toBe(true);
      expect(Object.isFrozen(controller.getThemes())).toBe(true);
    });

    test('applies an explicitly selected initial preset', () => {
      const pattern = mockPattern('waves');
      const { controller } = createHarness({
        slots: [slot('waves', { pattern })],
        initialPresetId: 2,
        initialPresetApplied: true,
      });

      expect(pattern.applyPreset).toHaveBeenCalledWith(2);
      expect(controller.getSnapshot()).toMatchObject({ presetId: 2, presetApplied: true });
    });

    test.each([
      { label: 'empty slots', slots: [], themes: [theme('ocean')], patternIndex: 0, themeIndex: 0 },
      {
        label: 'duplicate keys',
        slots: [slot('a'), slot('a')],
        themes: [theme('ocean')],
        patternIndex: 0,
        themeIndex: 0,
      },
      { label: 'empty themes', slots: [slot('a')], themes: [], patternIndex: 0, themeIndex: 0 },
      {
        label: 'bad pattern index',
        slots: [slot('a')],
        themes: [theme('ocean')],
        patternIndex: 2,
        themeIndex: 0,
      },
      {
        label: 'bad theme index',
        slots: [slot('a')],
        themes: [theme('ocean')],
        patternIndex: 0,
        themeIndex: 2,
      },
    ])('rejects $label', ({ slots, themes, patternIndex, themeIndex }) => {
      const active = slots[0]?.pattern ?? mockPattern('unused');
      const engine: RuntimeEngine = {
        getPattern: () => active,
        setPattern: jest.fn(),
        getFps: () => 30,
        setFps: jest.fn(),
      };
      expect(
        () =>
          new RuntimeController({
            engine,
            themes,
            initialSlots: slots,
            initialPatternIndex: patternIndex,
            initialThemeIndex: themeIndex,
            initialQuality: 'medium',
            rebuildSlots: () => slots,
          })
      ).toThrow();
    });

    test('rejects an initial engine/pattern mismatch', () => {
      const slots = [slot('waves')];
      expect(
        () =>
          new RuntimeController({
            engine: {
              getPattern: () => mockPattern('other'),
              setPattern: jest.fn(),
              getFps: () => 30,
              setFps: jest.fn(),
            },
            themes: [theme('ocean')],
            initialSlots: slots,
            initialPatternIndex: 0,
            initialThemeIndex: 0,
            initialQuality: 'medium',
            rebuildSlots: () => slots,
          })
      ).toThrow(/does not match/);
    });
  });

  describe('lookup', () => {
    test('finds patterns by 1-based number, stable key, display name, legacy name, and partial name', () => {
      const { controller } = createHarness();
      expect(controller.findPattern(2)).toBe(1);
      expect(controller.findPattern('stars')).toBe(1);
      expect(controller.findPattern('STARS')).toBe(1);
      expect(controller.findPattern('starsPattern')).toBe(1);
      expect(controller.findPattern('tar')).toBe(1);
      expect(controller.findPattern(99)).toBe(-1);
      expect(controller.findPattern('')).toBe(-1);
    });

    test('finds themes by 1-based number, key, and display name', () => {
      const { controller } = createHarness();
      expect(controller.findTheme(2)).toBe(1);
      expect(controller.findTheme('fire')).toBe(1);
      expect(controller.findTheme('FIRE')).toBe(1);
      expect(controller.findTheme(99)).toBe(-1);
      expect(controller.findTheme('missing')).toBe(-1);
    });
  });

  describe('pattern and preset actions', () => {
    test('switches engine and authoritative state once', () => {
      const before = jest.fn();
      const harness = createHarness({ beforePatternSwitch: before });
      const result = harness.controller.switchPattern(1);

      expect(result).toMatchObject({ success: true, changed: true });
      expect(harness.setPattern).toHaveBeenCalledTimes(1);
      expect(harness.setPattern).toHaveBeenCalledWith(harness.initialSlots[1].pattern);
      expect(before).toHaveBeenCalledWith(harness.initialSlots[0], harness.initialSlots[1]);
      expect(result.snapshot).toMatchObject({
        patternIndex: 1,
        patternKey: 'stars',
        presetId: 1,
        presetApplied: false,
      });
      expect(harness.engine.getPattern()).toBe(harness.controller.getCurrentPattern());
    });

    test('treats selection of the active pattern as a no-op', () => {
      const { controller, setPattern } = createHarness();
      expect(controller.switchPattern(0)).toMatchObject({ success: true, changed: false });
      expect(setPattern).not.toHaveBeenCalled();
    });

    test('rejects an invalid pattern without mutation', () => {
      const { controller, setPattern } = createHarness();
      const before = controller.getSnapshot();
      expect(controller.switchPattern(50)).toMatchObject({
        success: false,
        changed: false,
        error: 'pattern-not-found',
      });
      expect(controller.getSnapshot()).toEqual(before);
      expect(setPattern).not.toHaveBeenCalled();
    });

    test('applies an explicit preset after switching the engine pattern', () => {
      const order: string[] = [];
      const targetPattern = mockPattern('stars');
      targetPattern.applyPreset = jest.fn(() => {
        order.push('preset');
        return true;
      });
      const slots = [slot('waves'), slot('stars', { pattern: targetPattern })];
      const harness = createHarness({ slots });
      harness.setPattern.mockImplementation(pattern => {
        order.push('engine');
        (harness.engine as RuntimeEngine & { current?: Pattern }).current = pattern;
      });

      const result = harness.controller.switchPattern(1, 2);
      expect(order).toEqual(['engine', 'preset']);
      expect(result.snapshot).toMatchObject({ presetId: 2, presetApplied: true });
    });

    test('rejects an invalid target preset before switching', () => {
      const { controller, setPattern } = createHarness();
      expect(controller.switchPattern(1, 99)).toMatchObject({
        success: false,
        error: 'preset-not-found',
      });
      expect(setPattern).not.toHaveBeenCalled();
      expect(controller.getSnapshot().patternIndex).toBe(0);
    });

    test('applies a preset to the active pattern and tracks explicit preset 1', () => {
      const { controller, initialSlots, setPattern, resetSceneTime } = createHarness();
      const result = controller.applyPreset(1);
      expect(initialSlots[0].pattern.applyPreset).toHaveBeenCalledWith(1);
      expect(result.snapshot).toMatchObject({ presetId: 1, presetApplied: true });
      expect(setPattern).not.toHaveBeenCalled();
      expect(resetSceneTime).toHaveBeenCalledTimes(1);
    });

    test('reports unsupported and advertised-but-failed presets without changing tracking', () => {
      const unsupported = createHarness({ slots: [slot('plain', { presetCount: 0 })] });
      expect(unsupported.controller.applyPreset(1).error).toBe('presets-unsupported');

      const failingPattern = mockPattern('broken');
      failingPattern.applyPreset = jest.fn(() => false);
      const failing = createHarness({ slots: [slot('broken', { pattern: failingPattern })] });
      expect(failing.controller.applyPreset(2).error).toBe('preset-not-found');
      expect(failing.controller.getSnapshot()).toMatchObject({ presetId: 1, presetApplied: false });
    });

    test.each([3, 6, 18])('cycles and wraps a %i-preset slot dynamically', count => {
      const forward = createHarness({ slots: [slot('pattern', { presetCount: count })] });
      expect(forward.controller.cyclePreset(1).snapshot.presetId).toBe(2);

      const backward = createHarness({ slots: [slot('pattern', { presetCount: count })] });
      expect(backward.controller.cyclePreset(-1).snapshot.presetId).toBe(count);
    });
  });

  describe('theme rebuilds', () => {
    test('preserves active stable key, seed, and config baseline across reordered slots', () => {
      const harness = createHarness();
      harness.controller.switchPattern(1);
      harness.rebuildSlots.mockImplementation((_nextTheme, priorSeeds) => [
        slot('stars', { seed: priorSeeds.get('stars') }),
        slot('waves', { seed: priorSeeds.get('waves') }),
      ]);

      const result = harness.controller.changeTheme(1);
      expect(result.snapshot).toMatchObject({
        patternIndex: 0,
        patternKey: 'stars',
        seed: 42,
        presetId: 1,
        presetApplied: false,
        themeIndex: 1,
      });
      expect(result.snapshot.themeName).toBe('fire');
      expect(result.snapshot.patternKey).toBe('stars');
      expect(harness.rebuildSlots.mock.calls[0][1]).toEqual(
        new Map([
          ['waves', 0],
          ['stars', 42],
        ])
      );
    });

    test('reapplies only explicitly applied presets on replacement instances', () => {
      const baseline = createHarness();
      baseline.controller.changeTheme(1);
      expect(baseline.controller.getCurrentPattern().applyPreset).not.toHaveBeenCalled();

      const explicit = createHarness();
      explicit.controller.applyPreset(2);
      explicit.controller.changeTheme(1);
      expect(explicit.controller.getCurrentPattern().applyPreset).toHaveBeenCalledWith(2);
      expect(explicit.controller.getSnapshot()).toMatchObject({
        presetId: 2,
        presetApplied: true,
      });
    });

    test('builder failure leaves controller and engine untouched', () => {
      const harness = createHarness();
      const before = harness.controller.getSnapshot();
      harness.rebuildSlots.mockImplementation(() => {
        throw new Error('build failed');
      });

      expect(() => harness.controller.changeTheme(1)).toThrow('build failed');
      expect(harness.controller.getSnapshot()).toEqual(before);
      expect(harness.setPattern).not.toHaveBeenCalled();
    });

    test('missing active key fails before engine mutation', () => {
      const harness = createHarness();
      harness.rebuildSlots.mockReturnValue([slot('other')]);
      expect(() => harness.controller.changeTheme(1)).toThrow(/missing active slot/);
      expect(harness.controller.getSnapshot().themeIndex).toBe(0);
      expect(harness.setPattern).not.toHaveBeenCalled();
    });

    test('cycles themes and wraps', () => {
      const harness = createHarness();
      expect(harness.controller.cycleTheme().snapshot.themeIndex).toBe(1);
      expect(harness.controller.cycleTheme().snapshot.themeIndex).toBe(0);
    });

    test('rejects invalid themes and treats the active theme as a no-op', () => {
      const harness = createHarness();
      expect(harness.controller.changeTheme(99).error).toBe('theme-not-found');
      expect(harness.controller.changeTheme(0)).toMatchObject({ success: true, changed: false });
      expect(harness.rebuildSlots).not.toHaveBeenCalled();
    });
  });

  describe('atomic scene actions', () => {
    test('changes theme, pattern, and preset with one engine switch and one event', () => {
      const beforeSwitch = jest.fn();
      const harness = createHarness({ beforePatternSwitch: beforeSwitch });
      harness.rebuildSlots.mockImplementation((_nextTheme, priorSeeds) => [
        slot('stars', { seed: priorSeeds.get('stars') }),
        slot('waves', { seed: priorSeeds.get('waves') }),
      ]);
      const events: RuntimeChangeEvent[] = [];
      harness.controller.subscribe(event => events.push(event));

      const result = harness.controller.applyScene({ patternIndex: 1, themeIndex: 1, presetId: 3 });
      expect(result.snapshot).toMatchObject({
        patternKey: 'stars',
        patternIndex: 0,
        themeIndex: 1,
        presetId: 3,
        presetApplied: true,
      });
      expect(harness.setPattern).toHaveBeenCalledTimes(1);
      expect(beforeSwitch).toHaveBeenCalledTimes(1);
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe('scene');
    });

    test('validates a complete scene before engine mutation', () => {
      const harness = createHarness();
      expect(
        harness.controller.applyScene({ patternIndex: 1, themeIndex: 1, presetId: 99 })
      ).toMatchObject({ success: false, error: 'preset-not-found' });
      expect(harness.setPattern).not.toHaveBeenCalled();
      expect(harness.controller.getSnapshot()).toMatchObject({ patternIndex: 0, themeIndex: 0 });
    });

    test('can apply a preset atomically without replacing the current pattern', () => {
      const harness = createHarness();
      const result = harness.controller.applyScene({ patternIndex: 0, presetId: 2 });
      expect(result.snapshot).toMatchObject({ presetId: 2, presetApplied: true });
      expect(harness.setPattern).not.toHaveBeenCalled();
    });
  });

  describe('quality, FPS, reset, and events', () => {
    test('changes quality FPS without rebuilding patterns', () => {
      const harness = createHarness();
      const result = harness.controller.setQuality('high');
      expect(harness.setFps).toHaveBeenCalledWith(60);
      expect(harness.rebuildSlots).not.toHaveBeenCalled();
      expect(result.snapshot).toMatchObject({ quality: 'high', fps: 60 });
    });

    test('reasserts quality FPS after a manual FPS adjustment', () => {
      const harness = createHarness();
      harness.controller.setFps(35);
      expect(harness.controller.getSnapshot()).toMatchObject({ quality: 'medium', fps: 35 });
      harness.controller.setQuality('medium');
      expect(harness.controller.getSnapshot()).toMatchObject({ quality: 'medium', fps: 30 });
    });

    test('rejects invalid FPS and treats the current FPS as a no-op', () => {
      const harness = createHarness();
      expect(harness.controller.setFps(9).error).toBe('invalid-fps');
      expect(harness.controller.setFps(30)).toMatchObject({ success: true, changed: false });
      expect(harness.setFps).not.toHaveBeenCalled();
    });

    test('resets the current pattern and emits a reset event', () => {
      const harness = createHarness();
      const listener = jest.fn();
      harness.controller.subscribe(listener);
      const current = harness.controller.getCurrentPattern() as MockPattern;

      expect(harness.controller.resetCurrentPattern().changed).toBe(true);
      expect(current.reset).toHaveBeenCalledTimes(1);
      expect(harness.resetSceneTime).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ kind: 'reset' }));
    });

    test('publishes frozen before/after snapshots and supports unsubscribe', () => {
      const harness = createHarness();
      const events: RuntimeChangeEvent[] = [];
      const unsubscribe = harness.controller.subscribe(event => events.push(event));
      harness.controller.switchPattern(1);
      unsubscribe();
      unsubscribe();
      harness.controller.switchPattern(0);

      expect(events).toHaveLength(1);
      expect(Object.isFrozen(events[0])).toBe(true);
      expect(Object.isFrozen(events[0].previous)).toBe(true);
      expect(Object.isFrozen(events[0].current)).toBe(true);
      expect(events[0].previous.patternKey).toBe('waves');
      expect(events[0].current.patternKey).toBe('stars');
    });

    test('isolates listener failures from successful runtime mutations', () => {
      const harness = createHarness();
      const surviving = jest.fn();
      harness.controller.subscribe(() => {
        throw new Error('UI failed');
      });
      harness.controller.subscribe(surviving);

      expect(harness.controller.switchPattern(1)).toMatchObject({ success: true, changed: true });
      expect(surviving).toHaveBeenCalledTimes(1);
    });

    test('keeps valid seed zero distinct from a null non-seeded slot', () => {
      const harness = createHarness({
        slots: [
          slot('waves', { seed: 0 }),
          slot('photo', { seed: null, kind: 'photo', shareable: false }),
        ],
      });
      expect(harness.controller.getSnapshot()).toMatchObject({ seed: 0, shareable: true });
      expect(harness.controller.switchPattern(1).snapshot).toMatchObject({
        seed: null,
        shareable: false,
      });
    });
  });
});
