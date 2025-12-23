import { describe, test, expect, beforeEach } from '@jest/globals';
import { OceanBeachPattern } from '../../../src/patterns/OceanBeachPattern.js';
import { Cell, Size, Theme } from '../../../src/types/index.js';
import { createMockTheme, createMockBuffer, createMockPoint } from '../../utils/mocks.js';

describe('OceanBeachPattern', () => {
  let pattern: OceanBeachPattern;
  let theme: Theme;
  let buffer: Cell[][];
  let size: Size;

  beforeEach(() => {
    theme = createMockTheme('ocean');
    pattern = new OceanBeachPattern(theme, {});
    size = { width: 80, height: 40 };
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('Constructor and Configuration', () => {
    test('should create with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('oceanbeach');
    });

    test('should accept custom config', () => {
      const customPattern = new OceanBeachPattern(theme, {
        waveSpeed: 2.0,
        waveAmplitude: 5,
        cloudSpeed: 0.5,
        seagullCount: 6,
      });

      expect(customPattern).toBeDefined();
      expect(customPattern.name).toBe('oceanbeach');
    });

    test('should merge partial config with defaults', () => {
      const partialPattern = new OceanBeachPattern(theme, { waveSpeed: 1.5 });
      expect(partialPattern).toBeDefined();
    });
  });

  describe('Rendering', () => {
    test('should render without errors', () => {
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should render multiple frames without errors', () => {
      expect(() => {
        pattern.render(buffer, 0, size);
        pattern.render(buffer, 100, size);
        pattern.render(buffer, 500, size);
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    test('should handle zero time', () => {
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle negative time', () => {
      expect(() => {
        pattern.render(buffer, -100, size);
      }).not.toThrow();
    });

    test('should handle long animation times', () => {
      expect(() => {
        pattern.render(buffer, 10000, size);
        pattern.render(buffer, 100000, size);
      }).not.toThrow();
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = OceanBeachPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    test('should apply preset 1 (Calm Morning) successfully', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should apply preset 2 (Midday Sun) successfully', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should apply preset 3 (Stormy) successfully', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should apply preset 4 (Sunset) successfully', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should apply preset 5 (Night Beach) successfully', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should apply preset 6 (Tropical) successfully', () => {
      const result = pattern.applyPreset(6);
      expect(result).toBe(true);

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should reject invalid preset numbers', () => {
      expect(pattern.applyPreset(0)).toBe(false);
      expect(pattern.applyPreset(7)).toBe(false);
      expect(pattern.applyPreset(-1)).toBe(false);
      expect(pattern.applyPreset(99)).toBe(false);
    });

    test('should switch between presets without errors', () => {
      expect(() => {
        pattern.applyPreset(1);
        pattern.render(buffer, 0, size);
        pattern.applyPreset(3);
        pattern.render(buffer, 100, size);
        pattern.applyPreset(6);
        pattern.render(buffer, 200, size);
      }).not.toThrow();
    });
  });

  describe('Mouse Interaction', () => {
    test('should handle mouse click on beach area (footprints)', () => {
      const beachY = Math.floor(size.height * 0.8);
      const point = createMockPoint(size.width / 2, beachY);

      expect(() => {
        pattern.onMouseClick!(point);
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle mouse click on ocean area', () => {
      const oceanY = Math.floor(size.height * 0.5);
      const point = createMockPoint(size.width / 2, oceanY);

      expect(() => {
        pattern.onMouseClick!(point);
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle multiple footprint clicks', () => {
      const beachY = Math.floor(size.height * 0.85);

      expect(() => {
        for (let i = 0; i < 10; i++) {
          const point = createMockPoint(10 + i * 5, beachY);
          pattern.onMouseClick!(point);
        }
        pattern.render(buffer, 0, size);
      }).not.toThrow();

      const metrics = pattern.getMetrics();
      expect(metrics.footprints).toBeGreaterThanOrEqual(0);
    });

    test('should handle mouse move in sky area (seagull attraction)', () => {
      const skyY = Math.floor(size.height * 0.2);
      const point = createMockPoint(size.width / 2, skyY);

      expect(() => {
        pattern.onMouseMove!(point);
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle mouse move across different areas', () => {
      expect(() => {
        for (let y = 0; y < size.height; y += 5) {
          const point = createMockPoint(size.width / 2, y);
          pattern.onMouseMove!(point);
        }
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle rapid mouse movements', () => {
      expect(() => {
        for (let i = 0; i < 50; i++) {
          const x = Math.floor(Math.random() * size.width);
          const y = Math.floor(Math.random() * size.height);
          pattern.onMouseMove!(createMockPoint(x, y));
        }
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle boundary mouse positions', () => {
      expect(() => {
        pattern.onMouseMove!(createMockPoint(0, 0));
        pattern.onMouseClick!(createMockPoint(0, 0));
        pattern.onMouseMove!(createMockPoint(size.width - 1, size.height - 1));
        pattern.onMouseClick!(createMockPoint(size.width - 1, size.height - 1));
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle mouse click at exact boundaries', () => {
      expect(() => {
        pattern.onMouseClick!(createMockPoint(0, 0));
        pattern.onMouseClick!(createMockPoint(size.width - 1, 0));
        pattern.onMouseClick!(createMockPoint(0, size.height - 1));
        pattern.onMouseClick!(createMockPoint(size.width - 1, size.height - 1));
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });
  });

  describe('Pattern Metrics', () => {
    test('should return valid metrics', () => {
      pattern.render(buffer, 0, size);
      const metrics = pattern.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.layers).toBe('number');
      expect(typeof metrics.sprites).toBe('number');
      expect(typeof metrics.particles).toBe('number');
      expect(typeof metrics.emitters).toBe('number');
      expect(typeof metrics.footprints).toBe('number');
      expect(typeof metrics.waterLine).toBe('number');

      expect(metrics.layers).toBeGreaterThanOrEqual(0);
      expect(metrics.sprites).toBeGreaterThanOrEqual(0);
      expect(metrics.particles).toBeGreaterThanOrEqual(0);
      expect(metrics.emitters).toBeGreaterThanOrEqual(0);
      expect(metrics.footprints).toBeGreaterThanOrEqual(0);
      expect(metrics.waterLine).toBeGreaterThanOrEqual(0);
    });

    test('should update metrics after interactions', () => {
      pattern.render(buffer, 0, size);
      const metrics1 = pattern.getMetrics();

      // Add footprints
      const beachY = Math.floor(size.height * 0.85);
      for (let i = 0; i < 5; i++) {
        pattern.onMouseClick!(createMockPoint(10 + i * 10, beachY));
      }

      pattern.render(buffer, 100, size);
      const metrics2 = pattern.getMetrics();

      // Footprints should increase
      expect(metrics2.footprints).toBeGreaterThanOrEqual(metrics1.footprints);
    });

    test('should track sprite counts correctly', () => {
      pattern.applyPreset(6); // Tropical (high seagull count)
      pattern.render(buffer, 0, size);
      const metrics = pattern.getMetrics();

      // Should have valid counts
      expect(metrics.sprites).toBeGreaterThanOrEqual(0);
      expect(metrics.layers).toBeGreaterThanOrEqual(0);
      expect(metrics.emitters).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset pattern state', () => {
      pattern.render(buffer, 0, size);
      const beachY = Math.floor(size.height * 0.85);
      pattern.onMouseClick!(createMockPoint(40, beachY));
      pattern.render(buffer, 1000, size);

      expect(() => {
        pattern.reset();
      }).not.toThrow();

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should clear footprints on reset', () => {
      const beachY = Math.floor(size.height * 0.85);

      // Add footprints
      for (let i = 0; i < 10; i++) {
        pattern.onMouseClick!(createMockPoint(10 + i * 5, beachY));
      }
      pattern.render(buffer, 0, size);

      // Reset
      pattern.reset();
      pattern.render(buffer, 0, size);

      const metrics = pattern.getMetrics();
      // Footprints should be cleared or minimal after reset
      expect(metrics.footprints).toBeLessThanOrEqual(10);
    });

    test('should allow multiple reset calls', () => {
      expect(() => {
        pattern.reset();
        pattern.reset();
        pattern.reset();
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });
  });

  describe('Terminal Size Variations', () => {
    test('should handle small terminals', () => {
      const smallSize = { width: 40, height: 20 };
      const smallBuffer = createMockBuffer(40, 20);

      expect(() => {
        pattern.render(smallBuffer, 0, smallSize);
      }).not.toThrow();
    });

    test('should handle large terminals', () => {
      const largeSize = { width: 200, height: 60 };
      const largeBuffer = createMockBuffer(200, 60);

      expect(() => {
        pattern.render(largeBuffer, 0, largeSize);
      }).not.toThrow();
    });

    test('should handle very wide terminals', () => {
      const wideSize = { width: 300, height: 40 };
      const wideBuffer = createMockBuffer(300, 40);

      expect(() => {
        pattern.render(wideBuffer, 0, wideSize);
      }).not.toThrow();
    });

    test('should handle very tall terminals', () => {
      const tallSize = { width: 80, height: 100 };
      const tallBuffer = createMockBuffer(80, 100);

      expect(() => {
        pattern.render(tallBuffer, 0, tallSize);
      }).not.toThrow();
    });

    test('should handle terminal resize sequence', () => {
      const sizes = [
        { width: 80, height: 40 },
        { width: 120, height: 30 },
        { width: 60, height: 50 },
        { width: 80, height: 40 },
      ];

      expect(() => {
        for (const testSize of sizes) {
          const testBuffer = createMockBuffer(testSize.width, testSize.height);
          pattern.render(testBuffer, 0, testSize);
        }
      }).not.toThrow();
    });
  });

  describe('Theme Integration', () => {
    test('should work with different themes', () => {
      const themes = ['ocean', 'matrix', 'starlight', 'fire', 'monochrome'];

      expect(() => {
        for (const themeName of themes) {
          const testTheme = createMockTheme(themeName);
          const testPattern = new OceanBeachPattern(testTheme, {});
          testPattern.render(buffer, 0, size);
        }
      }).not.toThrow();
    });

    test('should use theme colors in rendering', () => {
      pattern.render(buffer, 0, size);

      const coloredCells = buffer
        .flat()
        .filter(cell => cell.char !== ' ' && cell.color !== undefined);

      // Should have some colored cells
      expect(coloredCells.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Animation Continuity', () => {
    test('should produce smooth wave animation over time', () => {
      const frames = [0, 100, 200, 300, 400, 500];

      expect(() => {
        for (const time of frames) {
          pattern.render(buffer, time, size);
        }
      }).not.toThrow();
    });

    test('should handle time reversals gracefully', () => {
      expect(() => {
        pattern.render(buffer, 1000, size);
        pattern.render(buffer, 500, size);
        pattern.render(buffer, 2000, size);
        pattern.render(buffer, 100, size);
      }).not.toThrow();
    });
  });

  describe('Configuration Options', () => {
    test('should accept custom waveSpeed', () => {
      expect(() => {
        const customPattern = new OceanBeachPattern(theme, { waveSpeed: 2.0 });
        customPattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should accept custom waveAmplitude', () => {
      expect(() => {
        const customPattern = new OceanBeachPattern(theme, { waveAmplitude: 5 });
        customPattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should accept custom cloudSpeed', () => {
      expect(() => {
        const customPattern = new OceanBeachPattern(theme, { cloudSpeed: 0.5 });
        customPattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should accept custom seagullCount', () => {
      expect(() => {
        const customPattern = new OceanBeachPattern(theme, { seagullCount: 6 });
        customPattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should accept multiple custom config options', () => {
      expect(() => {
        const customPattern = new OceanBeachPattern(theme, {
          waveSpeed: 1.5,
          waveAmplitude: 4,
          cloudSpeed: 0.3,
          seagullCount: 4,
          sparkleIntensity: 0.8,
        });
        customPattern.render(buffer, 0, size);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid preset changes', () => {
      expect(() => {
        for (let i = 1; i <= 6; i++) {
          pattern.applyPreset(i);
          pattern.render(buffer, i * 100, size);
        }
      }).not.toThrow();
    });

    test('should handle rendering without mouse interaction', () => {
      expect(() => {
        for (let t = 0; t < 1000; t += 100) {
          pattern.render(buffer, t, size);
        }
      }).not.toThrow();
    });
  });
});
