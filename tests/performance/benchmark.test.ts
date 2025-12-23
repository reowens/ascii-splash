/**
 * Performance Benchmark Tests
 *
 * Verifies patterns maintain acceptable FPS and performance characteristics
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { MockTerminalRenderer } from '../utils/MockTerminalRenderer.js';
import { createMockTheme } from '../utils/mocks.js';
import { WavePattern } from '../../src/patterns/WavePattern.js';
import { StarfieldPattern } from '../../src/patterns/StarfieldPattern.js';
import { MatrixPattern } from '../../src/patterns/MatrixPattern.js';
import { ParticlePattern } from '../../src/patterns/ParticlePattern.js';
import { PlasmaPattern } from '../../src/patterns/PlasmaPattern.js';
import { SpiralPattern } from '../../src/patterns/SpiralPattern.js';
import { TunnelPattern } from '../../src/patterns/TunnelPattern.js';
import { FireworksPattern } from '../../src/patterns/FireworksPattern.js';
import { LifePattern } from '../../src/patterns/LifePattern.js';
import { MazePattern } from '../../src/patterns/MazePattern.js';
import { DNAPattern } from '../../src/patterns/DNAPattern.js';
import { MetaballPattern } from '../../src/patterns/MetaballPattern.js';
import { AquariumPattern } from '../../src/patterns/AquariumPattern.js';
import { Pattern, Theme, Size } from '../../src/types/index.js';

// Performance thresholds
const TARGET_FPS = 30;
const MAX_FRAME_TIME_MS = 1000 / TARGET_FPS; // ~33ms for 30 FPS
const BENCHMARK_ITERATIONS = 100;
const WARMUP_FRAMES = 10;

describe('Performance Benchmarks', () => {
  let mockRenderer: MockTerminalRenderer;
  let mockTheme: Theme;
  let standardSize: Size;
  let largeSize: Size;

  beforeEach(() => {
    mockRenderer = new MockTerminalRenderer({ width: 80, height: 24 });
    mockTheme = createMockTheme('test');
    standardSize = { width: 80, height: 24 };
    largeSize = { width: 160, height: 48 };
  });

  /**
   * Benchmark a pattern's render performance
   */
  function benchmarkPattern(
    pattern: Pattern,
    size: Size,
    iterations: number = BENCHMARK_ITERATIONS
  ): { avgFrameTime: number; maxFrameTime: number; minFrameTime: number } {
    const buffer = mockRenderer.getBuffer();
    const frameTimes: number[] = [];

    // Warmup
    for (let i = 0; i < WARMUP_FRAMES; i++) {
      pattern.render(buffer, i * 33, size);
    }

    // Benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      pattern.render(buffer, (WARMUP_FRAMES + i) * 33, size);
      const end = performance.now();
      frameTimes.push(end - start);
    }

    return {
      avgFrameTime: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
      maxFrameTime: Math.max(...frameTimes),
      minFrameTime: Math.min(...frameTimes),
    };
  }

  describe('Standard Size (80x24) Performance', () => {
    test('WavePattern should maintain 30+ FPS', () => {
      const pattern = new WavePattern(mockTheme);
      const { avgFrameTime, maxFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
      // Allow some spikes but 95th percentile should be acceptable
      expect(maxFrameTime).toBeLessThan(MAX_FRAME_TIME_MS * 3);
    });

    test('StarfieldPattern should maintain 30+ FPS', () => {
      const pattern = new StarfieldPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('MatrixPattern should maintain 30+ FPS', () => {
      const pattern = new MatrixPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('ParticlePattern should maintain 30+ FPS', () => {
      const pattern = new ParticlePattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('PlasmaPattern should maintain 30+ FPS', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('SpiralPattern should maintain 30+ FPS', () => {
      const pattern = new SpiralPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('TunnelPattern should maintain 30+ FPS', () => {
      const pattern = new TunnelPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('FireworksPattern should maintain 30+ FPS', () => {
      const pattern = new FireworksPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('LifePattern should maintain 30+ FPS', () => {
      const pattern = new LifePattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('MazePattern should maintain 30+ FPS', () => {
      const pattern = new MazePattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('DNAPattern should maintain 30+ FPS', () => {
      const pattern = new DNAPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('MetaballPattern should maintain 30+ FPS', () => {
      const pattern = new MetaballPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });

    test('AquariumPattern should maintain 30+ FPS', () => {
      const pattern = new AquariumPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
    });
  });

  describe('Large Size (160x48) Performance', () => {
    beforeEach(() => {
      mockRenderer.resize(160, 48);
    });

    test('WavePattern should maintain acceptable FPS at large size', () => {
      const pattern = new WavePattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, largeSize, 50);

      // Allow 2x frame time for larger canvas
      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS * 2);
    });

    test('PlasmaPattern should maintain acceptable FPS at large size', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, largeSize, 50);

      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS * 2);
    });

    test('MetaballPattern should maintain acceptable FPS at large size', () => {
      const pattern = new MetaballPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, largeSize, 50);

      // Metaballs are O(n*m*blobs) so allow more headroom
      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS * 3);
    });
  });

  describe('Preset Performance', () => {
    test('all WavePattern presets should maintain 30+ FPS', () => {
      const pattern = new WavePattern(mockTheme);
      const presets = WavePattern.getPresets();

      for (const preset of presets) {
        pattern.applyPreset(preset.id);
        const { avgFrameTime } = benchmarkPattern(pattern, standardSize, 30);

        expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
      }
    });

    test('all ParticlePattern presets should maintain 30+ FPS', () => {
      const pattern = new ParticlePattern(mockTheme);
      const presets = ParticlePattern.getPresets();

      for (const preset of presets) {
        pattern.applyPreset(preset.id);
        const { avgFrameTime } = benchmarkPattern(pattern, standardSize, 30);

        expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS);
      }
    });
  });

  describe('Sustained Performance', () => {
    test('should maintain performance over 1000 frames', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const frameTimes: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        pattern.render(buffer, i * 33, standardSize);
        frameTimes.push(performance.now() - start);
      }

      // Check first 100 vs last 100 frames for degradation
      const first100 = frameTimes.slice(0, 100);
      const last100 = frameTimes.slice(-100);

      const avgFirst = first100.reduce((a, b) => a + b, 0) / 100;
      const avgLast = last100.reduce((a, b) => a + b, 0) / 100;

      // Should not degrade more than 50%
      expect(avgLast).toBeLessThan(avgFirst * 1.5);
    });

    test('particle-heavy pattern should not leak over time', () => {
      const pattern = new ParticlePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const frameTimes: number[] = [];

      // Run for extended period
      for (let i = 0; i < 500; i++) {
        const start = performance.now();
        pattern.render(buffer, i * 33, standardSize);
        frameTimes.push(performance.now() - start);
      }

      // Average should stay consistent
      const overallAvg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      expect(overallAvg).toBeLessThan(MAX_FRAME_TIME_MS);
    });
  });

  describe('Comparative Performance', () => {
    test('complex patterns should not be 10x slower than simple ones', () => {
      const simplePattern = new WavePattern(mockTheme);
      const complexPattern = new MetaballPattern(mockTheme);

      const simpleResult = benchmarkPattern(simplePattern, standardSize);
      const complexResult = benchmarkPattern(complexPattern, standardSize);

      // Complex should not be more than 10x slower
      expect(complexResult.avgFrameTime).toBeLessThan(simpleResult.avgFrameTime * 10);
    });
  });

  describe('Render Efficiency', () => {
    test('should fill buffer efficiently', () => {
      const pattern = new PlasmaPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      pattern.render(buffer, 1000, standardSize);

      const nonEmpty = mockRenderer.countNonEmptyCells();
      const total = standardSize.width * standardSize.height;

      // Plasma should fill most of the screen
      expect(nonEmpty / total).toBeGreaterThan(0.8);
    });

    test('sparse patterns should still be performant', () => {
      const pattern = new StarfieldPattern(mockTheme);
      const { avgFrameTime } = benchmarkPattern(pattern, standardSize);

      // Should be very fast since it's sparse
      expect(avgFrameTime).toBeLessThan(MAX_FRAME_TIME_MS / 2);
    });
  });

  describe('Reset Performance', () => {
    test('pattern reset should be fast', () => {
      const pattern = new ParticlePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Render many frames to build up state
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 33, standardSize);
      }

      // Time the reset
      const start = performance.now();
      pattern.reset();
      const resetTime = performance.now() - start;

      // Reset should be instantaneous
      expect(resetTime).toBeLessThan(5);
    });
  });
});
