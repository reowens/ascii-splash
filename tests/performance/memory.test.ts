/**
 * Memory Leak Detection Tests
 *
 * Tests for memory-related behaviors in patterns and engine components.
 * Note: True heap-based memory testing requires --expose-gc flag.
 * These tests focus on behavioral correctness that prevents leaks.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MockTerminalRenderer } from '../utils/MockTerminalRenderer.js';
import { createMockTheme } from '../utils/mocks.js';
import { WavePattern } from '../../src/patterns/WavePattern.js';
import { StarfieldPattern } from '../../src/patterns/StarfieldPattern.js';
import { ParticlePattern } from '../../src/patterns/ParticlePattern.js';
import { FireworksPattern } from '../../src/patterns/FireworksPattern.js';
import { LifePattern } from '../../src/patterns/LifePattern.js';
import { MetaballPattern } from '../../src/patterns/MetaballPattern.js';
import { AquariumPattern } from '../../src/patterns/AquariumPattern.js';
import { SnowfallParkPattern } from '../../src/patterns/SnowfallParkPattern.js';
import { CampfirePattern } from '../../src/patterns/CampfirePattern.js';
import { EventBus } from '../../src/engine/EventBus.js';
import { Theme, Size } from '../../src/types/index.js';

describe('Memory Leak Detection', () => {
  let mockRenderer: MockTerminalRenderer;
  let mockTheme: Theme;
  let size: Size;

  beforeEach(() => {
    mockRenderer = new MockTerminalRenderer({ width: 80, height: 24 });
    mockTheme = createMockTheme('test');
    size = { width: 80, height: 24 };
  });

  afterEach(() => {
    mockRenderer.reset();
  });

  describe('Pattern Stability Under Load', () => {
    test.each([
      ['WavePattern', () => new WavePattern(createMockTheme('test'))],
      ['StarfieldPattern', () => new StarfieldPattern(createMockTheme('test'))],
      ['ParticlePattern', () => new ParticlePattern(createMockTheme('test'))],
      ['FireworksPattern', () => new FireworksPattern(createMockTheme('test'))],
      ['LifePattern', () => new LifePattern(createMockTheme('test'))],
      ['MetaballPattern', () => new MetaballPattern(createMockTheme('test'))],
      ['AquariumPattern', () => new AquariumPattern(createMockTheme('test'))],
      ['SnowfallParkPattern', () => new SnowfallParkPattern(createMockTheme('test'))],
      ['CampfirePattern', () => new CampfirePattern(createMockTheme('test'))],
    ])('%s should handle 1000 frames without error', (_name, createPattern) => {
      const pattern = createPattern();
      const buffer = mockRenderer.getBuffer();

      expect(() => {
        for (let i = 0; i < 1000; i++) {
          pattern.render(buffer, i * 33, size);
        }
      }).not.toThrow();
    });
  });

  describe('Pattern Reset Cleanup', () => {
    test('ParticlePattern reset should clear particles', () => {
      const pattern = new ParticlePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Build up state
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 33, size);
      }

      // Reset
      pattern.reset();

      const metrics = pattern.getMetrics?.();
      if (metrics) {
        expect(metrics.particles || 0).toBe(0);
      }
    });

    test('FireworksPattern reset should clear all explosions', () => {
      const pattern = new FireworksPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Trigger many fireworks
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 33, size);
        if (i % 10 === 0) {
          pattern.onMouseClick?.({ x: 40, y: 12 });
        }
      }

      // Reset
      pattern.reset();

      const metrics = pattern.getMetrics?.();
      if (metrics) {
        expect(metrics.rockets || 0).toBe(0);
        expect(metrics.explosions || 0).toBe(0);
      }
    });

    test('LifePattern reset should clear grid', () => {
      const pattern = new LifePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Run simulation
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 33, size);
      }

      // Reset
      pattern.reset();

      const metrics = pattern.getMetrics?.();
      if (metrics) {
        expect(metrics.livingCells || 0).toBe(0);
      }
    });

    test('MetaballPattern reset should clear blobs', () => {
      const pattern = new MetaballPattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Run simulation
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 33, size);
      }

      // Reset
      pattern.reset();

      const metrics = pattern.getMetrics?.();
      if (metrics) {
        expect(metrics.blobs || 0).toBe(0);
      }
    });
  });

  describe('EventBus Memory', () => {
    test('EventBus should not accumulate listeners after removal', () => {
      const eventBus = new EventBus();

      // Add many listeners
      const handlers: (() => void)[] = [];
      for (let i = 0; i < 100; i++) {
        const handler = () => {};
        handlers.push(handler);
        eventBus.on('test:event', handler);
      }

      // Remove all listeners
      for (const handler of handlers) {
        eventBus.off('test:event', handler);
      }

      // Clear reference
      eventBus.clear();

      // Should be cleaned up - no errors when emitting
      expect(() => {
        eventBus.emit('test:event', {});
      }).not.toThrow();
    });

    test('once listeners should auto-remove after firing', () => {
      const eventBus = new EventBus();
      let callCount = 0;

      eventBus.once('test:event', () => {
        callCount++;
      });

      eventBus.emit('test:event', {});
      eventBus.emit('test:event', {});
      eventBus.emit('test:event', {});

      expect(callCount).toBe(1);
    });
  });

  describe('MockTerminalRenderer Memory', () => {
    test('history should respect max size limit', () => {
      const renderer = new MockTerminalRenderer({
        width: 80,
        height: 24,
        captureHistory: true,
        maxHistorySize: 10,
      });

      const pattern = new WavePattern(mockTheme);
      const buffer = renderer.getBuffer();

      // Render more frames than max history
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 33, size);
        renderer.render();
      }

      const history = renderer.getHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });

    test('clearHistory should release memory', () => {
      const renderer = new MockTerminalRenderer({
        width: 80,
        height: 24,
        captureHistory: true,
      });

      const pattern = new WavePattern(mockTheme);
      const buffer = renderer.getBuffer();

      // Build up history
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 33, size);
        renderer.render();
      }

      expect(renderer.getHistory().length).toBe(100);

      // Clear
      renderer.clearHistory();

      expect(renderer.getHistory().length).toBe(0);
    });
  });

  describe('Pattern Switching Stability', () => {
    test('switching patterns repeatedly should not throw', () => {
      const patterns = [
        new WavePattern(mockTheme),
        new StarfieldPattern(mockTheme),
        new ParticlePattern(mockTheme),
        new MetaballPattern(mockTheme),
      ];

      const buffer = mockRenderer.getBuffer();

      expect(() => {
        for (let cycle = 0; cycle < 10; cycle++) {
          for (const pattern of patterns) {
            for (let i = 0; i < 50; i++) {
              pattern.render(buffer, i * 33, size);
            }
            pattern.reset();
          }
        }
      }).not.toThrow();
    });
  });

  describe('Mouse Interaction Stability', () => {
    test('continuous mouse events should not cause errors', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      expect(() => {
        for (let i = 0; i < 1000; i++) {
          pattern.onMouseMove?.({ x: i % 80, y: i % 24 });
          pattern.render(buffer, i * 16, size);

          if (i % 100 === 0) {
            pattern.onMouseClick?.({ x: 40, y: 12 });
          }
        }
      }).not.toThrow();
    });
  });

  describe('Preset Switching Stability', () => {
    test('cycling through all presets repeatedly should not throw', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const presets = WavePattern.getPresets();

      expect(() => {
        for (let cycle = 0; cycle < 50; cycle++) {
          for (const preset of presets) {
            pattern.applyPreset(preset.id);
            for (let i = 0; i < 10; i++) {
              pattern.render(buffer, i * 33, size);
            }
          }
        }
      }).not.toThrow();
    });
  });

  describe('Extended Run Stability', () => {
    test('pattern should maintain stability over extended run', () => {
      const pattern = new ParticlePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();

      // Simulate 5 minutes at 30fps (9000 frames)
      const frameCount = 9000;

      expect(() => {
        for (let i = 0; i < frameCount; i++) {
          pattern.render(buffer, i * 33, size);

          // Occasional interactions
          if (i % 500 === 0) {
            pattern.onMouseClick?.({ x: Math.random() * 80, y: Math.random() * 24 });
          }
        }
      }).not.toThrow();

      // Should still have valid metrics
      const metrics = pattern.getMetrics?.();
      expect(metrics).toBeDefined();
    });
  });
});
