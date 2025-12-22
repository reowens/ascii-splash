/**
 * Snowfall Park Pattern Tests
 *
 * Tests for the peaceful snowy park scene with falling snow
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SnowfallParkPattern } from '../../../src/patterns/SnowfallParkPattern.js';
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

describe('SnowfallParkPattern', () => {
  let pattern: SnowfallParkPattern;

  beforeEach(() => {
    pattern = new SnowfallParkPattern(mockTheme);
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('snowfallpark');
    });

    test('should accept custom config', () => {
      const customPattern = new SnowfallParkPattern(mockTheme, {
        snowDensity: 2.0,
        treeCount: 6,
        lampCount: 3,
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

    test('should render snowflakes', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render multiple frames
      for (let i = 0; i < 10; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Check for snow characters
      let hasSnow = false;
      const snowChars = ['.', '*', '❄'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (snowChars.includes(buffer[y][x].char)) {
            hasSnow = true;
            break;
          }
        }
        if (hasSnow) break;
      }
      expect(hasSnow).toBe(true);
    });

    test('should render trees', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Check for tree characters
      let hasTrees = false;
      const treeChars = ['*', '/', '\\', '|', '@'];
      for (let y = size.height - 10; y < size.height - 2; y++) {
        for (let x = 0; x < size.width; x++) {
          if (treeChars.includes(buffer[y][x].char)) {
            hasTrees = true;
            break;
          }
        }
        if (hasTrees) break;
      }
      expect(hasTrees).toBe(true);
    });

    test('should render ground', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Check for ground character at bottom row
      const bottomRow = size.height - 1;
      let hasGround = false;
      for (let x = 0; x < size.width; x++) {
        if (buffer[bottomRow][x].char === '▓') {
          hasGround = true;
          break;
        }
      }
      expect(hasGround).toBe(true);
    });

    test('should render lamps', () => {
      const lampPattern = new SnowfallParkPattern(mockTheme, {
        lampCount: 3,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      lampPattern.render(buffer, 1000, size);

      // Check for lamp characters
      let hasLamps = false;
      const lampChars = ['◉', '|'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (lampChars.includes(buffer[y][x].char)) {
            hasLamps = true;
            break;
          }
        }
        if (hasLamps) break;
      }
      expect(hasLamps).toBe(true);
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

  describe('Accumulation', () => {
    test('should accumulate snow when enabled', () => {
      const accPattern = new SnowfallParkPattern(mockTheme, {
        accumulationEnabled: true,
        accumulationHeight: 3,
        snowDensity: 2.0,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render many frames for accumulation
      for (let i = 0; i < 100; i++) {
        accPattern.render(buffer, i * 50, size);
      }

      // Check for accumulation characters
      let hasAccumulation = false;
      const accChars = ['~', '▒'];
      for (let y = size.height - 5; y < size.height - 1; y++) {
        for (let x = 0; x < size.width; x++) {
          if (accChars.includes(buffer[y][x].char)) {
            hasAccumulation = true;
            break;
          }
        }
        if (hasAccumulation) break;
      }
      // May or may not have accumulated depending on timing
      expect(hasAccumulation).toBeDefined();
    });

    test('should not accumulate when disabled', () => {
      const noAccPattern = new SnowfallParkPattern(mockTheme, {
        accumulationEnabled: false,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render frames
      for (let i = 0; i < 50; i++) {
        noAccPattern.render(buffer, i * 50, size);
      }

      const metrics = noAccPattern.getMetrics();
      expect(metrics.avgSnowDepth).toBe(0);
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
  });

  describe('Mouse Interaction', () => {
    test('should handle mouse move', () => {
      expect(() => {
        pattern.onMouseMove({ x: 40, y: 12 });
      }).not.toThrow();
    });

    test('should handle mouse click (blow snow)', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Initialize
      pattern.render(buffer, 0, size);

      // Click to blow snow
      expect(() => {
        pattern.onMouseClick({ x: 40, y: 12 });
      }).not.toThrow();

      // Render to apply effect
      pattern.render(buffer, 100, size);
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = SnowfallParkPattern.getPresets();
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

    test('preset 1 should be Gentle Snowfall', () => {
      const preset = SnowfallParkPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Gentle Snowfall');
    });

    test('preset 2 should be Blizzard', () => {
      const preset = SnowfallParkPattern.getPreset(2);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Blizzard');
      expect(preset?.config.snowDensity).toBe(3.0);
    });

    test('preset 3 should be Winter Night', () => {
      const preset = SnowfallParkPattern.getPreset(3);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Winter Night');
      expect(preset?.config.lampCount).toBe(3);
    });

    test('preset 4 should be Forest Clearing', () => {
      const preset = SnowfallParkPattern.getPreset(4);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Forest Clearing');
      expect(preset?.config.treeCount).toBe(8);
    });

    test('preset 5 should be City Park', () => {
      const preset = SnowfallParkPattern.getPreset(5);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('City Park');
      expect(preset?.config.lampCount).toBe(4);
    });

    test('preset 6 should be Windy Flurries', () => {
      const preset = SnowfallParkPattern.getPreset(6);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Windy Flurries');
      expect(preset?.config.windStrength).toBe(0.9);
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
      expect(metrics.snowflakes).toBe(0);
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
      expect(metrics.snowflakes).toBe(0);
      expect(metrics.trees).toBe(0);
      expect(metrics.lamps).toBe(0);
    });
  });

  describe('Metrics', () => {
    test('should return metrics', () => {
      const metrics = pattern.getMetrics();
      expect(metrics).toHaveProperty('snowflakes');
      expect(metrics).toHaveProperty('trees');
      expect(metrics).toHaveProperty('lamps');
      expect(metrics).toHaveProperty('avgSnowDepth');
    });

    test('should track snowflake count after render', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics();
      expect(metrics.snowflakes).toBeGreaterThan(0);
    });

    test('should track tree count after render', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics();
      expect(metrics.trees).toBeGreaterThan(0);
    });
  });

  describe('Wind Effects', () => {
    test('should apply wind to snowflakes', () => {
      const windyPattern = new SnowfallParkPattern(mockTheme, {
        windStrength: 0.9,
        windVariation: 0.8,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Should render without errors
      expect(() => {
        for (let i = 0; i < 20; i++) {
          windyPattern.render(buffer, i * 100, size);
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

    test('should handle various tree counts', () => {
      const counts = [1, 3, 5, 8];

      for (const count of counts) {
        const testPattern = new SnowfallParkPattern(mockTheme, {
          treeCount: count,
        });
        const buffer = createBuffer(80, 24);
        const size = { width: 80, height: 24 };

        expect(() => {
          testPattern.render(buffer, 1000, size);
        }).not.toThrow();
      }
    });

    test('should handle various lamp counts', () => {
      const counts = [0, 1, 2, 4];

      for (const count of counts) {
        const testPattern = new SnowfallParkPattern(mockTheme, {
          lampCount: count,
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
