import { describe, expect, jest, test } from '@jest/globals';
import { createDefaultConfig } from '../../../src/config/defaults.js';
import { LayeredPattern } from '../../../src/patterns/LayeredPattern.js';
import {
  assertProceduralRegistryAlignment,
  buildPatternSlots,
  PROCEDURAL_PATTERN_DEFINITIONS,
} from '../../../src/patterns/PatternCatalog.js';
import { PhotoPattern } from '../../../src/patterns/PhotoPattern.js';
import { WorkspaceModel } from '../../../src/patterns/workspace/WorkspaceModel.js';
import { PROCEDURAL_PATTERN_IDS } from '../../../src/utils/shareCode.js';
import { createMockTheme } from '../../utils/mocks.js';

const theme = createMockTheme();

function sequentialSeedFactory(start = 100): jest.Mock<() => number> {
  let next = start;
  return jest.fn(() => next++);
}

describe('PatternCatalog', () => {
  test('matches the frozen share-code registry exactly', () => {
    expect(() => assertProceduralRegistryAlignment()).not.toThrow();
    expect(PROCEDURAL_PATTERN_DEFINITIONS.map(entry => entry.key)).toEqual(PROCEDURAL_PATTERN_IDS);
  });

  test('builds one unique self-describing slot per procedural pattern', () => {
    const seedFactory = sequentialSeedFactory();
    const slots = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      seedFactory,
    });

    expect(slots).toHaveLength(PROCEDURAL_PATTERN_IDS.length);
    expect(slots.map(slot => slot.key)).toEqual(PROCEDURAL_PATTERN_IDS);
    expect(new Set(slots.map(slot => slot.key)).size).toBe(slots.length);
    expect(slots.every(slot => slot.kind === 'procedural')).toBe(true);
    expect(slots.every(slot => slot.shareable)).toBe(true);
    expect(slots.every(slot => slot.pattern && slot.presets.length === 6)).toBe(true);
    expect(slots[0].seed).toBe(0);
    expect(slots[1].seed).toBe(100);
    expect(slots.at(-1)?.seed).toBe(121);
    expect(seedFactory).toHaveBeenCalledTimes(22);
  });

  test('keeps slot metadata, pattern, and seed in one frozen entry', () => {
    const slots = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      seedFactory: sequentialSeedFactory(),
    });
    const dna = slots.find(slot => slot.key === 'dna');

    expect(Object.isFrozen(slots)).toBe(true);
    expect(Object.isFrozen(dna)).toBe(true);
    expect(Object.isFrozen(dna?.presets)).toBe(true);
    expect(Object.isFrozen(dna?.legacyNames)).toBe(true);
    expect(dna).toMatchObject({
      displayName: 'DNA',
      kind: 'procedural',
      shareable: true,
      legacyNames: ['DNAPattern'],
    });
    expect(dna?.pattern.constructor.name).toBe('DNAPattern');
  });

  test('uses explicit seed overrides before prior seeds', () => {
    const slots = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      priorSeeds: new Map([['starfield', 111]]),
      seedOverrides: new Map([['starfield', 0xfeedface]]),
      seedFactory: sequentialSeedFactory(),
    });

    expect(slots.find(slot => slot.key === 'starfield')?.seed).toBe(0xfeedface);
  });

  test('preserves every procedural seed across a rebuild by stable key', () => {
    const first = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      seedFactory: sequentialSeedFactory(1000),
    });
    const priorSeeds = new Map(
      first.flatMap(slot => (slot.seed === null ? [] : [[slot.key, slot.seed] as const]))
    );
    const unexpectedSeed = jest.fn(() => {
      throw new Error('seed factory should not be used');
    });

    const rebuilt = buildPatternSlots({
      config: createDefaultConfig(),
      theme: createMockTheme(),
      priorSeeds,
      seedFactory: unexpectedSeed,
    });

    expect(rebuilt.map(slot => [slot.key, slot.seed])).toEqual(
      first.map(slot => [slot.key, slot.seed])
    );
    expect(unexpectedSeed).not.toHaveBeenCalled();
  });

  test('appends photo, layered, and workspace slots in stable order', () => {
    const photo = new PhotoPattern(theme, { source: new Uint8Array([0]) });
    const workspace = new WorkspaceModel();
    const slots = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      photoPattern: photo,
      layeredOverlayKey: 'starfield',
      workspaceModel: workspace,
      seedFactory: sequentialSeedFactory(),
    });

    expect(slots.slice(-3).map(slot => slot.key)).toEqual(['photo', 'layered', 'workspace']);
    expect(slots.at(-3)).toMatchObject({
      displayName: 'Photo',
      kind: 'photo',
      pattern: photo,
      seed: null,
      shareable: false,
    });
    expect(slots.at(-3)?.presets).toHaveLength(18);
    expect(slots.at(-2)).toMatchObject({
      displayName: 'Photo + Starfield',
      kind: 'layered',
      shareable: false,
    });
    expect(slots.at(-1)).toMatchObject({
      displayName: 'Workspace',
      kind: 'workspace',
      shareable: false,
    });
    expect(slots.at(-1)?.presets).toHaveLength(3);
  });

  test('constructs a layered overlay independent of the standalone pattern', () => {
    const photo = new PhotoPattern(theme, { source: new Uint8Array([0]) });
    const slots = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      photoPattern: photo,
      layeredOverlayKey: 'matrix',
      seedFactory: sequentialSeedFactory(),
    });
    const standalone = slots.find(slot => slot.key === 'matrix')?.pattern;
    const layered = slots.find(slot => slot.key === 'layered')?.pattern as LayeredPattern;

    expect(layered).toBeInstanceOf(LayeredPattern);
    expect(layered.getPhotoLayer()).toBe(photo);
    expect(layered.getOverlayLayer()).not.toBe(standalone);
    expect(layered.getOverlayLayer().constructor).toBe(standalone?.constructor);
  });

  test.each(['waves', 'plasma'])(
    'enables transparent background for a dense %s overlay',
    overlayKey => {
      const photo = new PhotoPattern(theme, { source: new Uint8Array([0]) });
      const slots = buildPatternSlots({
        config: createDefaultConfig(),
        theme,
        photoPattern: photo,
        layeredOverlayKey: overlayKey,
        seedFactory: sequentialSeedFactory(),
      });
      const layered = slots.find(slot => slot.key === 'layered')?.pattern as LayeredPattern;
      const overlay = layered.getOverlayLayer() as unknown as {
        config: { transparentBg?: boolean };
      };

      expect(overlay.config.transparentBg).toBe(true);
    }
  );

  test('does not append layered when the overlay key is unknown', () => {
    const photo = new PhotoPattern(theme, { source: new Uint8Array([0]) });
    const slots = buildPatternSlots({
      config: createDefaultConfig(),
      theme,
      photoPattern: photo,
      layeredOverlayKey: 'unknown',
      seedFactory: sequentialSeedFactory(),
    });

    expect(slots.at(-1)?.key).toBe('photo');
    expect(slots.some(slot => slot.key === 'layered')).toBe(false);
  });
});
