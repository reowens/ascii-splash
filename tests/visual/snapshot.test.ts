/**
 * Visual Snapshot Tests
 *
 * Tests pattern visual output consistency and correctness
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { MockTerminalRenderer } from '../utils/MockTerminalRenderer.js';
import { createMockTheme } from '../utils/mocks.js';
import {
  captureSnapshot,
  compareSnapshots,
  snapshotSimilarity,
  snapshotDiff,
  snapshotContainsChars,
  getFillRatio,
  getNonEmptyCount,
  extractRegion,
  BufferSnapshot,
} from '../utils/bufferSnapshot.js';
import { WavePattern } from '../../src/patterns/WavePattern.js';
import { StarfieldPattern } from '../../src/patterns/StarfieldPattern.js';
import { MatrixPattern } from '../../src/patterns/MatrixPattern.js';
import { PlasmaPattern } from '../../src/patterns/PlasmaPattern.js';
import { SpiralPattern } from '../../src/patterns/SpiralPattern.js';
import { ParticlePattern } from '../../src/patterns/ParticlePattern.js';
import { RainPattern } from '../../src/patterns/RainPattern.js';
import { DNAPattern } from '../../src/patterns/DNAPattern.js';
import { MetaballPattern } from '../../src/patterns/MetaballPattern.js';
import { AquariumPattern } from '../../src/patterns/AquariumPattern.js';
import { SnowfallParkPattern } from '../../src/patterns/SnowfallParkPattern.js';
import { CampfirePattern } from '../../src/patterns/CampfirePattern.js';
import { NightSkyPattern } from '../../src/patterns/NightSkyPattern.js';
import { OceanBeachPattern } from '../../src/patterns/OceanBeachPattern.js';
import { Theme, Size } from '../../src/types/index.js';

describe('Visual Snapshot Tests', () => {
  let mockRenderer: MockTerminalRenderer;
  let mockTheme: Theme;
  let size: Size;

  beforeEach(() => {
    mockRenderer = new MockTerminalRenderer({ width: 80, height: 24 });
    mockTheme = createMockTheme('test');
    size = { width: 80, height: 24 };
  });

  describe('Pattern Visual Characteristics', () => {
    test('WavePattern should produce wave-like characters', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Waves use specific characters
      const waveChars = ['~', '≈', '∿', '≋', '-', '_'];
      expect(snapshotContainsChars(snapshot, waveChars)).toBe(true);
    });

    test('StarfieldPattern should be mostly empty with stars', () => {
      const pattern = new StarfieldPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Starfield should be sparse
      const fillRatio = getFillRatio(snapshot);
      expect(fillRatio).toBeLessThan(0.3); // Less than 30% filled

      // Should contain star characters
      const starChars = ['.', '*', '·', '✦', '✧', '+'];
      expect(snapshotContainsChars(snapshot, starChars)).toBe(true);
    });

    test('MatrixPattern should have vertical rain effect', () => {
      const pattern = new MatrixPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Render several frames to establish the rain
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 50, size);
      }

      const snapshot = captureSnapshot(buffer);

      // Matrix should have some content (katakana or numbers)
      // Lower threshold (10) for CI variance - matrix spawns columns probabilistically
      expect(getNonEmptyCount(snapshot)).toBeGreaterThan(10);
    });

    test('PlasmaPattern should fill most of the screen', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Plasma fills the screen
      const fillRatio = getFillRatio(snapshot);
      expect(fillRatio).toBeGreaterThan(0.8);
    });

    test('SpiralPattern should have content in center', () => {
      const pattern = new SpiralPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Extract center region
      const centerRegion = extractRegion(snapshot, 30, 8, 20, 8);
      const centerFill = getFillRatio(centerRegion);

      // Center should have content
      expect(centerFill).toBeGreaterThan(0.1);
    });

    test('RainPattern should have rain characters', () => {
      const pattern = new RainPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 50, size);
      }

      const snapshot = captureSnapshot(buffer);

      // Rain uses various characters including punctuation
      const rainChars = ['|', "'", ',', '.', '`', '·', '!', '∙'];
      expect(snapshotContainsChars(snapshot, rainChars)).toBe(true);
    });

    test('DNAPattern should have helix structure', () => {
      const pattern = new DNAPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // DNA uses specific characters for helix
      const dnaChars = ['A', 'T', 'G', 'C', '(', ')', '-', '='];
      expect(snapshotContainsChars(snapshot, dnaChars)).toBe(true);
    });

    test('MetaballPattern should have density characters', () => {
      const pattern = new MetaballPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Metaballs use density characters
      const densityChars = ['░', '▒', '▓', '█'];
      expect(snapshotContainsChars(snapshot, densityChars)).toBe(true);
    });

    test('AquariumPattern should have fish and plant characters', () => {
      const pattern = new AquariumPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 50, size);
      }

      const snapshot = captureSnapshot(buffer);

      // Should have various characters
      expect(getNonEmptyCount(snapshot)).toBeGreaterThan(50);
    });

    test('SnowfallParkPattern should have snow and trees', () => {
      const pattern = new SnowfallParkPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 50, size);
      }

      const snapshot = captureSnapshot(buffer);

      // Snow characters
      const snowChars = ['.', '*', '❄', '·'];
      expect(snapshotContainsChars(snapshot, snowChars)).toBe(true);
    });

    test('CampfirePattern should have flame characters', () => {
      const pattern = new CampfirePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Should have content in lower portion
      const lowerRegion = extractRegion(snapshot, 0, 16, 80, 8);
      expect(getNonEmptyCount(lowerRegion)).toBeGreaterThan(20);
    });

    test('NightSkyPattern should have stars and possibly aurora', () => {
      const pattern = new NightSkyPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Should have star characters
      const starChars = ['.', '*', '·', '✦', '✧', '+', '○'];
      expect(snapshotContainsChars(snapshot, starChars)).toBe(true);
    });

    test('OceanBeachPattern should have waves and sand', () => {
      const pattern = new OceanBeachPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Should fill most of the screen (sky, ocean, sand)
      expect(getNonEmptyCount(snapshot)).toBeGreaterThan(500);
    });
  });

  describe('Animation Produces Changes', () => {
    test('consecutive frames should be different', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Capture frame 1
      pattern.render(buffer, 0, size);
      const snapshot1 = captureSnapshot(buffer);

      // Capture frame 2 (later in time)
      pattern.render(buffer, 500, size);
      const snapshot2 = captureSnapshot(buffer);

      // Frames should be different
      expect(compareSnapshots(snapshot1, snapshot2)).toBe(false);
    });

    test('animation similarity should be reasonable', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Capture two frames close in time
      pattern.render(buffer, 1000, size);
      const snapshot1 = captureSnapshot(buffer);

      pattern.render(buffer, 1100, size);
      const snapshot2 = captureSnapshot(buffer);

      // Close frames should be similar but not identical
      const similarity = snapshotSimilarity(snapshot1, snapshot2);
      expect(similarity).toBeGreaterThan(0.3);
      expect(similarity).toBeLessThan(1.0);
    });

    test('distant frames should show some difference', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 0, size);
      const snapshot1 = captureSnapshot(buffer);

      pattern.render(buffer, 10000, size);
      const snapshot2 = captureSnapshot(buffer);

      // Frames should not be identical
      const similarity = snapshotSimilarity(snapshot1, snapshot2);
      expect(similarity).toBeLessThan(1.0);
    });
  });

  describe('Preset Visual Differences', () => {
    test('different presets should produce different visuals', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const presets = WavePattern.getPresets();

      const snapshots: BufferSnapshot[] = [];

      for (const preset of presets) {
        pattern.applyPreset(preset.id);
        pattern.render(buffer, 1000, size);
        snapshots.push(captureSnapshot(buffer));
      }

      // At least some presets should be visually different
      let differentPairs = 0;
      for (let i = 0; i < snapshots.length; i++) {
        for (let j = i + 1; j < snapshots.length; j++) {
          if (snapshotSimilarity(snapshots[i], snapshots[j]) < 0.9) {
            differentPairs++;
          }
        }
      }

      expect(differentPairs).toBeGreaterThan(0);
    });
  });

  describe('Reset Visual State', () => {
    test('reset should produce consistent initial state', () => {
      const pattern = new ParticlePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Run for a while
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 33, size);
      }

      // Reset
      pattern.reset();

      // First frame after reset
      pattern.render(buffer, 0, size);
      const snapshot1 = captureSnapshot(buffer);

      // Reset again
      pattern.reset();

      // First frame after second reset
      pattern.render(buffer, 0, size);
      const snapshot2 = captureSnapshot(buffer);

      // Should be identical or very similar (same seed state)
      // Note: Some patterns use random initialization, so we allow some variance
      const similarity = snapshotSimilarity(snapshot1, snapshot2);
      expect(similarity).toBeGreaterThan(0.5);
    });
  });

  describe('Buffer Bounds', () => {
    test('snapshot dimensions should match buffer', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      expect(snapshot.width).toBe(size.width);
      expect(snapshot.height).toBe(size.height);
    });

    test('should handle different sizes', () => {
      const sizes = [
        { width: 40, height: 12 },
        { width: 80, height: 24 },
        { width: 120, height: 40 },
      ];

      for (const testSize of sizes) {
        mockRenderer.resize(testSize.width, testSize.height);
        const pattern = new PlasmaPattern(mockTheme);
        const buffer = mockRenderer.getBuffer();

        pattern.render(buffer, 1000, testSize);
        const snapshot = captureSnapshot(buffer);

        expect(snapshot.width).toBe(testSize.width);
        expect(snapshot.height).toBe(testSize.height);
        expect(getFillRatio(snapshot)).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Visual Diff Utilities', () => {
    test('snapshotDiff should identify differences', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 0, size);
      const snapshot1 = captureSnapshot(buffer);

      pattern.render(buffer, 1000, size);
      const snapshot2 = captureSnapshot(buffer);

      const diff = snapshotDiff(snapshot1, snapshot2);

      // Should have differences
      expect(diff.length).toBeGreaterThan(0);
    });

    test('identical snapshots should have no diff', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot1 = captureSnapshot(buffer);
      const snapshot2 = captureSnapshot(buffer);

      const diff = snapshotDiff(snapshot1, snapshot2);
      expect(diff.length).toBe(0);
    });
  });

  describe('Color Capture', () => {
    test('should capture colors when enabled', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer, { includeColors: true });

      expect(snapshot.colors).toBeDefined();
      expect(snapshot.colors!.length).toBeGreaterThan(0);
    });

    test('should not capture colors when disabled', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer, { includeColors: false });

      expect(snapshot.colors).toBeUndefined();
    });
  });

  describe('Region Extraction', () => {
    test('should extract correct region', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const fullSnapshot = captureSnapshot(buffer);
      const region = extractRegion(fullSnapshot, 10, 5, 20, 10);

      expect(region.width).toBe(20);
      expect(region.height).toBe(10);
    });

    test('should handle edge regions', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, size);
      const snapshot = captureSnapshot(buffer);

      // Top-left corner
      const topLeft = extractRegion(snapshot, 0, 0, 10, 5);
      expect(topLeft.width).toBe(10);
      expect(topLeft.height).toBe(5);

      // Bottom-right corner
      const bottomRight = extractRegion(snapshot, 70, 19, 10, 5);
      expect(bottomRight.width).toBe(10);
      expect(bottomRight.height).toBe(5);
    });
  });
});
