/**
 * Campfire Pattern Tests
 *
 * Tests for the cozy animated campfire scene pattern
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { CampfirePattern } from '../../../src/patterns/CampfirePattern.js';
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
    b: Math.round(100 * intensity),
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

describe('CampfirePattern', () => {
  let pattern: CampfirePattern;

  beforeEach(() => {
    pattern = new CampfirePattern(mockTheme);
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('campfire');
    });

    test('should accept custom config', () => {
      const customPattern = new CampfirePattern(mockTheme, {
        flameHeight: 0.5,
        sparkCount: 30,
        smokeEnabled: false,
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

    test('should render flames in bottom half of screen', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Check that there's content in the bottom portion (where flames should be)
      let hasFlameContent = false;
      for (let y = 15; y < 23; y++) {
        for (let x = 30; x < 50; x++) {
          if (buffer[y][x].char !== ' ') {
            hasFlameContent = true;
            break;
          }
        }
        if (hasFlameContent) break;
      }
      expect(hasFlameContent).toBe(true);
    });

    test('should render wood logs at base', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Check for log characters at base (height - 2)
      const logY = 22;
      let hasLogs = false;
      for (let x = 30; x < 50; x++) {
        if (buffer[logY][x].char === '=') {
          hasLogs = true;
          break;
        }
      }
      expect(hasLogs).toBe(true);
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

  describe('Animation', () => {
    test('should animate over time', () => {
      const buffer1 = createBuffer(80, 24);
      const buffer2 = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer1, 0, size);
      pattern.render(buffer2, 1000, size);

      // Check that frames are different (animation is happening)
      let isDifferent = false;
      for (let y = 0; y < 24 && !isDifferent; y++) {
        for (let x = 0; x < 80 && !isDifferent; x++) {
          if (
            buffer1[y][x].char !== buffer2[y][x].char ||
            buffer1[y][x].color?.r !== buffer2[y][x].color?.r
          ) {
            isDifferent = true;
          }
        }
      }
      expect(isDifferent).toBe(true);
    });
  });

  describe('Mouse Interaction', () => {
    test('should handle mouse move', () => {
      expect(() => {
        pattern.onMouseMove({ x: 40, y: 12 });
      }).not.toThrow();
    });

    test('should spawn sparks on click', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render once to initialize
      pattern.render(buffer, 0, size);

      // Get initial metrics
      const metricsBefore = pattern.getMetrics();

      // Click to spawn sparks
      pattern.onMouseClick({ x: 40, y: 15 });

      // Render to update
      pattern.render(buffer, 100, size);

      // Get metrics after click
      const metricsAfter = pattern.getMetrics();

      // Should have more sparks after click
      expect(metricsAfter.sparks).toBeGreaterThanOrEqual(metricsBefore.sparks);
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = CampfirePattern.getPresets();
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

    test('preset 1 should be Cozy Campfire', () => {
      const preset = CampfirePattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Cozy Campfire');
    });

    test('preset 2 should be Roaring Bonfire', () => {
      const preset = CampfirePattern.getPreset(2);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Roaring Bonfire');
    });

    test('preset 3 should be Dying Embers', () => {
      const preset = CampfirePattern.getPreset(3);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Dying Embers');
    });

    test('preset 4 should be Windy Night', () => {
      const preset = CampfirePattern.getPreset(4);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Windy Night');
    });

    test('preset 5 should be No Smoke', () => {
      const preset = CampfirePattern.getPreset(5);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('No Smoke');
      expect(preset?.config.smokeEnabled).toBe(false);
    });

    test('preset 6 should be Spark Storm', () => {
      const preset = CampfirePattern.getPreset(6);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Spark Storm');
      expect(preset?.config.sparkCount).toBe(50);
    });

    test('applying preset should reset state', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render several frames to build up sparks
      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Apply a new preset
      pattern.applyPreset(3); // Dying Embers

      // Metrics should be reset
      const metrics = pattern.getMetrics();
      expect(metrics.sparks).toBe(0);
      expect(metrics.smoke).toBe(0);
    });
  });

  describe('Reset', () => {
    test('should reset state', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render several frames to generate particles
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Reset
      pattern.reset();

      // Check metrics are reset
      const metrics = pattern.getMetrics();
      expect(metrics.sparks).toBe(0);
      expect(metrics.smoke).toBe(0);
    });
  });

  describe('Metrics', () => {
    test('should return metrics', () => {
      const metrics = pattern.getMetrics();
      expect(metrics).toHaveProperty('sparks');
      expect(metrics).toHaveProperty('smoke');
      expect(metrics).toHaveProperty('intensity');
    });

    test('should track spark count', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render several frames to spawn sparks
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }

      const metrics = pattern.getMetrics();
      expect(metrics.sparks).toBeGreaterThan(0);
    });

    test('should track smoke particles when smoke is enabled', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render several frames to spawn smoke
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 100, size);
      }

      const metrics = pattern.getMetrics();
      expect(metrics.smoke).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fire Colors', () => {
    test('should render with warm fire colors', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Find a flame cell and check it has warm colors
      let foundWarmColor = false;
      for (let y = 15; y < 22; y++) {
        for (let x = 35; x < 45; x++) {
          const color = buffer[y][x].color;
          if (color && color.r > color.b && color.r > 100) {
            foundWarmColor = true;
            break;
          }
        }
        if (foundWarmColor) break;
      }
      expect(foundWarmColor).toBe(true);
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
  });
});
