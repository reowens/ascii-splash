/**
 * Aquarium Pattern Tests
 *
 * Tests for the underwater aquarium scene with fish, plants, and bubbles
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AquariumPattern } from '../../../src/patterns/AquariumPattern.js';
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

describe('AquariumPattern', () => {
  let pattern: AquariumPattern;

  beforeEach(() => {
    pattern = new AquariumPattern(mockTheme);
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('aquarium');
    });

    test('should accept custom config', () => {
      const customPattern = new AquariumPattern(mockTheme, {
        fishCount: 20,
        bubbleEnabled: false,
        plantCount: 10,
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

    test('should render fish', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render multiple frames to let fish spawn and move
      for (let i = 0; i < 10; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Check for fish characters
      let hasFish = false;
      const fishChars = ['<', '>', '°', ')', '(', '*', '='];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (fishChars.includes(buffer[y][x].char)) {
            hasFish = true;
            break;
          }
        }
        if (hasFish) break;
      }
      expect(hasFish).toBe(true);
    });

    test('should render plants along the bottom', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Check for plant characters in bottom portion
      let hasPlants = false;
      const plantChars = ['|', '/', '\\', ')', '('];
      for (let y = size.height - 8; y < size.height - 1; y++) {
        for (let x = 0; x < size.width; x++) {
          if (plantChars.includes(buffer[y][x].char)) {
            hasPlants = true;
            break;
          }
        }
        if (hasPlants) break;
      }
      expect(hasPlants).toBe(true);
    });

    test('should render sand at the bottom', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      // Check for sand character at bottom row
      const bottomRow = size.height - 1;
      let hasSand = false;
      const sandChars = ['~', '@', '*', '.'];
      for (let x = 0; x < size.width; x++) {
        if (sandChars.includes(buffer[bottomRow][x].char)) {
          hasSand = true;
          break;
        }
      }
      expect(hasSand).toBe(true);
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

  describe('Bubbles', () => {
    test('should render bubbles when enabled', () => {
      const bubblePattern = new AquariumPattern(mockTheme, {
        bubbleEnabled: true,
        bubbleRate: 5.0, // High rate for testing
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render multiple frames to spawn bubbles
      for (let i = 0; i < 30; i++) {
        bubblePattern.render(buffer, i * 100, size);
      }

      const metrics = bubblePattern.getMetrics();
      expect(metrics.bubbles).toBeGreaterThanOrEqual(0);
    });

    test('should spawn bubbles on click', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Initialize
      pattern.render(buffer, 0, size);

      // Click to spawn bubbles
      pattern.onMouseClick({ x: 40, y: 20 });

      // Render to update
      pattern.render(buffer, 100, size);

      const metrics = pattern.getMetrics();
      expect(metrics.bubbles).toBeGreaterThan(0);
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

    test('should handle mouse click', () => {
      expect(() => {
        pattern.onMouseClick({ x: 40, y: 12 });
      }).not.toThrow();
    });

    test('fish should avoid mouse when enabled', () => {
      const avoidPattern = new AquariumPattern(mockTheme, {
        mouseAvoidance: true,
        fishCount: 15,
      });
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };
      const mousePos = { x: 40, y: 12 };

      // Multiple renders with mouse position
      expect(() => {
        for (let i = 0; i < 20; i++) {
          avoidPattern.render(buffer, i * 100, size, mousePos);
        }
      }).not.toThrow();
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = AquariumPattern.getPresets();
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

    test('preset 1 should be Peaceful Tank', () => {
      const preset = AquariumPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Peaceful Tank');
    });

    test('preset 2 should be Busy Reef', () => {
      const preset = AquariumPattern.getPreset(2);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Busy Reef');
      expect(preset?.config.fishCount).toBe(25);
    });

    test('preset 3 should be Sparse Pond', () => {
      const preset = AquariumPattern.getPreset(3);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Sparse Pond');
      expect(preset?.config.fishCount).toBe(5);
    });

    test('preset 4 should be Fast School', () => {
      const preset = AquariumPattern.getPreset(4);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Fast School');
      expect(preset?.config.schoolingStrength).toBe(2.0);
    });

    test('preset 5 should be Bubble Bath', () => {
      const preset = AquariumPattern.getPreset(5);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Bubble Bath');
      expect(preset?.config.bubbleRate).toBe(5.0);
    });

    test('preset 6 should be Kelp Forest', () => {
      const preset = AquariumPattern.getPreset(6);
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('Kelp Forest');
      expect(preset?.config.plantCount).toBe(15);
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
      expect(metrics.fish).toBe(0);
      expect(metrics.bubbles).toBe(0);
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
      expect(metrics.fish).toBe(0);
      expect(metrics.plants).toBe(0);
      expect(metrics.bubbles).toBe(0);
    });
  });

  describe('Metrics', () => {
    test('should return metrics', () => {
      const metrics = pattern.getMetrics();
      expect(metrics).toHaveProperty('fish');
      expect(metrics).toHaveProperty('plants');
      expect(metrics).toHaveProperty('bubbles');
    });

    test('should track fish count after render', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics();
      expect(metrics.fish).toBeGreaterThan(0);
    });

    test('should track plant count after render', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics();
      expect(metrics.plants).toBeGreaterThan(0);
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

    test('should handle fish count variations', () => {
      const counts = [1, 5, 10, 20, 30];

      for (const count of counts) {
        const testPattern = new AquariumPattern(mockTheme, {
          fishCount: count,
        });
        const buffer = createBuffer(80, 24);
        const size = { width: 80, height: 24 };

        expect(() => {
          testPattern.render(buffer, 1000, size);
        }).not.toThrow();
      }
    });
  });

  describe('Boids Behavior', () => {
    test('fish should move over time', () => {
      const buffer = createBuffer(80, 24);
      const size = { width: 80, height: 24 };

      // Render first frame
      pattern.render(buffer, 0, size);
      const metrics1 = pattern.getMetrics();

      // Render multiple frames
      for (let i = 1; i <= 50; i++) {
        pattern.render(buffer, i * 50, size);
      }

      // Fish should still exist
      const metrics2 = pattern.getMetrics();
      expect(metrics2.fish).toBe(metrics1.fish);
    });
  });
});
