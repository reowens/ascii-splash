/**
 * Metaball Pattern Tests
 *
 * Tests for the interactive liquid blob playground pattern
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { MetaballPattern } from '../../../src/patterns/MetaballPattern.js';
import { Theme, Cell, Color } from '../../../src/types/index.js';

// Mock theme for testing
const mockTheme: Theme = {
  name: 'test',
  displayName: 'Test Theme',
  colors: [
    { r: 0, g: 0, b: 0 },
    { r: 128, g: 128, b: 128 },
    { r: 255, g: 255, b: 255 },
  ],
  getColor: (intensity: number): Color => ({
    r: Math.round(255 * intensity),
    g: Math.round(200 * intensity),
    b: Math.round(150 * intensity),
  }),
};

// Helper to create a test buffer
function createBuffer(width: number, height: number): Cell[][] {
  return Array(height)
    .fill(null)
    .map(() =>
      Array(width)
        .fill(null)
        .map(() => ({ char: ' ', color: { r: 0, g: 0, b: 0 } }))
    );
}

describe('MetaballPattern', () => {
  let pattern: MetaballPattern;

  beforeEach(() => {
    pattern = new MetaballPattern(mockTheme);
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('metaball');
    });

    test('should accept custom config', () => {
      const customPattern = new MetaballPattern(mockTheme, {
        blobCount: 10,
        gravity: 0.5,
        colorMode: 'rainbow',
      });
      expect(customPattern).toBeDefined();
    });
  });

  describe('Rendering', () => {
    test('should render without errors', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should render metaball surfaces', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render multiple frames
      for (let i = 0; i < 10; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Check for metaball density characters
      let hasMetaballs = false;
      const densityChars = ['░', '▒', '▓', '█'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (densityChars.includes(buffer[y][x].char)) {
            hasMetaballs = true;
            break;
          }
        }
        if (hasMetaballs) break;
      }
      expect(hasMetaballs).toBe(true);
    });

    test('should render with mouse position', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };
      const mousePos = { x: 40, y: 12 };

      expect(() => {
        pattern.render(buffer, 1000, size, mousePos);
      }).not.toThrow();
    });
  });

  describe('Color Modes', () => {
    test('should render with theme color mode', () => {
      const themePattern = new MetaballPattern(mockTheme, {
        colorMode: 'theme',
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        themePattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    test('should render with rainbow color mode', () => {
      const rainbowPattern = new MetaballPattern(mockTheme, {
        colorMode: 'rainbow',
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        rainbowPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    test('should render with gradient color mode', () => {
      const gradientPattern = new MetaballPattern(mockTheme, {
        colorMode: 'gradient',
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        gradientPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('Animation', () => {
    test('should animate over time', () => {
      const buffer1 = createBuffer(80, 24);
      const buffer2 = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer1, 0, size);
      pattern.render(buffer2, 2000, size);

      // Check for animation differences
      let hasDifference = false;
      for (let y = 0; y < size.height && !hasDifference; y++) {
        for (let x = 0; x < size.width && !hasDifference; x++) {
          if (buffer1[y][x].char !== buffer2[y][x].char) {
            hasDifference = true;
          }
        }
      }
      expect(hasDifference).toBe(true);
    });

    test('should apply gravity', () => {
      const gravityPattern = new MetaballPattern(mockTheme, {
        gravity: 1.0,
        blobCount: 5,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render many frames
      for (let i = 0; i < 50; i++) {
        gravityPattern.render(buffer, i * 50, size);
      }

      // Should not throw even with high gravity
      expect(gravityPattern.getMetrics().blobs).toBe(5);
    });
  });

  describe('Mouse Interaction', () => {
    test('should handle mouse move', () => {
      expect(() => {
        pattern.onMouseMove({ x: 40, y: 12 });
      }).not.toThrow();
    });

    test('should spawn blob on click when enabled', () => {
      const spawnPattern = new MetaballPattern(mockTheme, {
        spawnOnClick: true,
        blobCount: 5,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Initialize
      spawnPattern.render(buffer, 0, size);
      const metricsBefore = spawnPattern.getMetrics();

      // Click to spawn
      spawnPattern.onMouseClick({ x: 40, y: 12 });

      // Render to update
      spawnPattern.render(buffer, 100, size);
      const metricsAfter = spawnPattern.getMetrics();

      expect(metricsAfter.blobs).toBeGreaterThan(metricsBefore.blobs);
    });

    test('should repel blobs on click when spawn disabled', () => {
      const repelPattern = new MetaballPattern(mockTheme, {
        spawnOnClick: false,
        blobCount: 5,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Initialize
      repelPattern.render(buffer, 0, size);

      // Click should not throw
      expect(() => {
        repelPattern.onMouseClick({ x: 40, y: 12 });
      }).not.toThrow();

      // Blob count should remain the same
      const metrics = repelPattern.getMetrics();
      expect(metrics.blobs).toBe(5);
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = MetaballPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    test('should apply preset successfully', () => {
      expect(pattern.applyPreset(1)).toBe(true);
      expect(pattern.applyPreset(2)).toBe(true);
      expect(pattern.applyPreset(6)).toBe(true);
    });

    test('should return false for invalid preset', () => {
      expect(pattern.applyPreset(0)).toBe(false);
      expect(pattern.applyPreset(7)).toBe(false);
      expect(pattern.applyPreset(99)).toBe(false);
    });

    test('preset 1 should be Lava Lamp', () => {
      const preset = MetaballPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Lava Lamp');
    });

    test('preset 2 should be Bouncy Balls', () => {
      const preset = MetaballPattern.getPreset(2);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Bouncy Balls');
      expect(preset?.config.colorMode).toBe('rainbow');
    });

    test('preset 3 should be Mercury Drops', () => {
      const preset = MetaballPattern.getPreset(3);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Mercury Drops');
    });

    test('preset 4 should be Bubble Bath', () => {
      const preset = MetaballPattern.getPreset(4);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Bubble Bath');
      expect(preset?.config.blobCount).toBe(15);
    });

    test('preset 5 should be Zero Gravity', () => {
      const preset = MetaballPattern.getPreset(5);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Zero Gravity');
      expect(preset?.config.gravity).toBe(0.0);
    });

    test('preset 6 should be Giant Amoeba', () => {
      const preset = MetaballPattern.getPreset(6);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Giant Amoeba');
      expect(preset?.config.blobCount).toBe(4);
    });

    test('applying preset should reset state', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render several frames
      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Apply a new preset
      pattern.applyPreset(2);

      // Metrics should reset
      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBe(0);
    });
  });

  describe('Reset', () => {
    test('should reset state', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render several frames
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Reset
      pattern.reset();

      // Check metrics are reset
      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBe(0);
    });
  });

  describe('Metrics', () => {
    test('should return metrics', () => {
      const metrics = pattern.getMetrics();
      expect(metrics).toHaveProperty('blobs');
      expect(metrics).toHaveProperty('totalMass');
      expect(metrics).toHaveProperty('avgRadius');
    });

    test('should track blob count after render', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBeGreaterThan(0);
    });

    test('should calculate average radius', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics();
      expect(metrics.avgRadius).toBeGreaterThan(0);
    });
  });

  describe('Physics', () => {
    test('should handle bouncing off walls', () => {
      const bouncyPattern = new MetaballPattern(mockTheme, {
        bounce: 0.9,
        blobCount: 5,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Run many frames
      expect(() => {
        for (let i = 0; i < 100; i++) {
          bouncyPattern.render(buffer, i * 50, size);
        }
      }).not.toThrow();
    });

    test('should handle blob-blob collisions', () => {
      const collisionPattern = new MetaballPattern(mockTheme, {
        blobCount: 10,
        blobMinRadius: 3,
        blobMaxRadius: 5,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Run many frames with collisions likely
      expect(() => {
        for (let i = 0; i < 100; i++) {
          collisionPattern.render(buffer, i * 50, size);
        }
      }).not.toThrow();
    });
  });

  describe('Small Terminal', () => {
    test('should render correctly on small terminal', () => {
      const buffer = createBuffer(40, 12);
      const size = { width: 40, height: 12 };

      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero time', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle very large time values', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        pattern.render(buffer, 1000000000, size);
      }).not.toThrow();
    });

    test('should handle rapid consecutive renders', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      expect(() => {
        for (let i = 0; i < 100; i++) {
          pattern.render(buffer, i, size);
        }
      }).not.toThrow();
    });

    test('should handle various blob counts', () => {
      const counts = [1, 3, 8, 15];

      for (const count of counts) {
        const testPattern = new MetaballPattern(mockTheme, {
          blobCount: count,
        });
        const buffer = createBuffer(80, 24);
        const size = { width: 80, height: 24 };

        expect(() => {
          testPattern.render(buffer, 1000, size);
        }).not.toThrow();
      }
    });

    test('should handle threshold variations', () => {
      const thresholds = [0.5, 1.0, 1.5, 2.0];

      for (const threshold of thresholds) {
        const testPattern = new MetaballPattern(mockTheme, {
          threshold,
        });
        const buffer = createBuffer(80, 24);
        const size = { width: 80, height: 24 };

        expect(() => {
          testPattern.render(buffer, 1000, size);
        }).not.toThrow();
      }
    });
  });
});
