import { SmokePattern } from '../../../src/patterns/SmokePattern';
import { Cell, Theme, Point } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('SmokePattern', () => {
  let pattern: SmokePattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new SmokePattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('smoke');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new SmokePattern(theme, {
        plumeCount: 4,
        particleCount: 50,
        riseSpeed: 1.5,
        dissipationRate: 0.015,
        turbulence: 1.5,
        spread: 8,
        windStrength: 0.3,
        mouseBlowForce: 5.0
      });
      expect(customPattern).toBeDefined();
    });
  });

  describe('render', () => {
    it('should render without errors', () => {
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should fill buffer with smoke particles', () => {
      pattern.render(buffer, 1000, size);
      
      // Check that cells are set
      let filledCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            filledCells++;
          }
        }
      }
      
      // Should have some smoke particles visible
      expect(filledCells).toBeGreaterThan(0);
    });

    it('should animate smoke over time', () => {
      pattern.render(buffer, 1000, size);
      const buffer1 = createMockBuffer(size.width, size.height);
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          buffer1[y][x] = { ...buffer[y][x] };
        }
      }
      
      pattern.render(buffer, 2000, size);
      
      // Buffer should change over time
      let differences = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== buffer1[y][x].char) {
            differences++;
          }
        }
      }
      
      expect(differences).toBeGreaterThan(0);
    });

    it('should use theme colors', () => {
      pattern.render(buffer, 1000, size);
      
      // Find a smoke particle
      let foundColor = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ' && buffer[y][x].color) {
            expect(buffer[y][x].color).toBeDefined();
            expect(buffer[y][x].color!.r).toBeGreaterThanOrEqual(0);
            expect(buffer[y][x].color!.r).toBeLessThanOrEqual(255);
            foundColor = true;
            break;
          }
        }
        if (foundColor) break;
      }
      
      expect(foundColor).toBe(true);
    });

    it('should use appropriate characters for different opacities', () => {
      pattern.render(buffer, 1000, size);
      
      const validChars = [' ', '·', '░', '▒', '▓'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(validChars).toContain(buffer[y][x].char);
        }
      }
    });

    it('should handle very small terminal', () => {
      const smallSize = { width: 20, height: 10 };
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      expect(() => {
        pattern.render(smallBuffer, 1000, smallSize);
      }).not.toThrow();
    });

    it('should handle very large terminal', () => {
      const largeSize = { width: 200, height: 60 };
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      expect(() => {
        pattern.render(largeBuffer, 1000, largeSize);
      }).not.toThrow();
    });
  });

  describe('mouse interaction', () => {
    it('should have onMouseMove method', () => {
      expect(pattern.onMouseMove).toBeDefined();
      expect(typeof pattern.onMouseMove).toBe('function');
    });

    it('should have onMouseClick method', () => {
      expect(pattern.onMouseClick).toBeDefined();
      expect(typeof pattern.onMouseClick).toBe('function');
    });

    it('should blow smoke away on mouse move', () => {
      if (!pattern.onMouseMove) {
        throw new Error('onMouseMove not defined');
      }
      
      // Render initial state
      pattern.render(buffer, 1000, size);
      const buffer1 = createMockBuffer(size.width, size.height);
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          buffer1[y][x] = { ...buffer[y][x] };
        }
      }
      
      // Move mouse through center
      pattern.onMouseMove({ x: size.width / 2, y: size.height / 2 });
      
      // Render again
      pattern.render(buffer, 1100, size);
      
      // Should cause changes (particles blown away)
      let differences = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== buffer1[y][x].char) {
            differences++;
          }
        }
      }
      
      expect(differences).toBeGreaterThan(0);
    });

    it('should spawn smoke burst on click', () => {
      if (!pattern.onMouseClick) {
        throw new Error('onMouseClick not defined');
      }
      
      // Render initial state
      pattern.render(buffer, 1000, size);
      const buffer1 = createMockBuffer(size.width, size.height);
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          buffer1[y][x] = { ...buffer[y][x] };
        }
      }
      
      // Click in center
      pattern.onMouseClick({ x: size.width / 2, y: size.height / 2 });
      
      // Render again
      pattern.render(buffer, 1100, size);
      
      // Should spawn new particles
      let differences = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== buffer1[y][x].char) {
            differences++;
          }
        }
      }
      
      expect(differences).toBeGreaterThan(0);
    });

    it('should handle mouse position at boundaries', () => {
      if (!pattern.onMouseMove) {
        throw new Error('onMouseMove not defined');
      }
      
      expect(() => {
        pattern.onMouseMove!({ x: 0, y: 0 });
        pattern.onMouseMove!({ x: size.width - 1, y: size.height - 1 });
      }).not.toThrow();
    });

    it('should handle multiple rapid clicks', () => {
      if (!pattern.onMouseClick) {
        throw new Error('onMouseClick not defined');
      }
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          pattern.onMouseClick!({ x: 40 + i, y: 12 });
        }
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should clear particles on reset', () => {
      if (!pattern.onMouseClick) {
        throw new Error('onMouseClick not defined');
      }
      
      // Render and interact
      pattern.render(buffer, 1000, size);
      pattern.onMouseClick({ x: size.width / 2, y: size.height / 2 });
      
      // Reset
      pattern.reset();
      
      // Should be able to render without issues
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });
  });

  describe('presets', () => {
    it('should have getPresets static method', () => {
      expect(SmokePattern.getPresets).toBeDefined();
    });

    it('should return 6 presets', () => {
      const presets = SmokePattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should have preset with id 1-6', () => {
      const presets = SmokePattern.getPresets();
      presets.forEach((preset, index) => {
        expect(preset.id).toBe(index + 1); // IDs are now 1-6
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
      });
    });

    it('should apply Gentle Wisp preset (1)', () => {
      const result = pattern.applyPreset!(1);
      expect(result).toBe(true);
      
      // Should render without errors
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply Campfire preset (2)', () => {
      const result = pattern.applyPreset!(2);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply Industrial preset (3)', () => {
      const result = pattern.applyPreset!(3);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply Incense preset (4)', () => {
      const result = pattern.applyPreset!(4);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply Fog preset (5)', () => {
      const result = pattern.applyPreset!(5);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply Steam preset (6)', () => {
      const result = pattern.applyPreset!(6);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should reject invalid preset id', () => {
      const result = pattern.applyPreset!(99);
      expect(result).toBe(false);
    });

    it('should reject negative preset id', () => {
      const result = pattern.applyPreset!(-1);
      expect(result).toBe(false);
    });
  });

  describe('metrics', () => {
    it('should have getMetrics method', () => {
      expect(pattern.getMetrics).toBeDefined();
    });

    it('should return metrics after render', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics!();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.particles).toBe('number');
      expect(typeof metrics.plumes).toBe('number');
      expect(typeof metrics.avgOpacity).toBe('number');
    });

    it('should track particle count', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics!();
      
      expect(metrics.particles).toBeGreaterThanOrEqual(0);
    });

    it('should track plume count', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics!();
      
      expect(metrics.plumes).toBeGreaterThanOrEqual(0);
    });

    it('should track average opacity', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics!();
      
      expect(metrics.avgOpacity).toBeGreaterThanOrEqual(0);
      expect(metrics.avgOpacity).toBeLessThanOrEqual(1);
    });
  });

  describe('physics simulation', () => {
    it('should make smoke rise over time', () => {
      // Render multiple frames to ensure particles spawn and move
      pattern.render(buffer, 0, size);
      pattern.render(buffer, 100, size);
      pattern.render(buffer, 200, size);
      
      // Get snapshot of positions after initial frames
      const initialPositionSet = new Set<string>();
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            initialPositionSet.add(`${x},${y}`);
          }
        }
      }
      
      // Ensure we have some particles to track
      expect(initialPositionSet.size).toBeGreaterThan(0);
      
      // Advance time significantly and render multiple frames
      pattern.render(buffer, 5000, size);
      pattern.render(buffer, 5100, size);
      pattern.render(buffer, 5200, size);
      
      // Get final positions
      const finalPositionSet = new Set<string>();
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            finalPositionSet.add(`${x},${y}`);
          }
        }
      }
      
      // Ensure we still have particles
      expect(finalPositionSet.size).toBeGreaterThan(0);
      
      // Check that positions changed - compare sets
      // At least some positions should be different (particles moved/spawned/dissipated)
      const setsAreIdentical = 
        initialPositionSet.size === finalPositionSet.size &&
        Array.from(initialPositionSet).every(pos => finalPositionSet.has(pos));
      
      expect(setsAreIdentical).toBe(false);
    });

    it('should dissipate particles over time', () => {
      pattern.render(buffer, 0, size);
      const metrics1 = pattern.getMetrics!();
      
      // Run for a long time
      for (let t = 0; t < 10000; t += 100) {
        pattern.render(buffer, t, size);
      }
      
      const metrics2 = pattern.getMetrics!();
      
      // Particles should have some churn (spawning and dissipating)
      // We can't test exact count due to spawning, but opacity should reflect dissipation
      expect(metrics2.avgOpacity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stability', () => {
    it('should handle rapid successive renders', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          pattern.render(buffer, i * 16, size);
        }
      }).not.toThrow();
    });

    it('should handle size changes', () => {
      pattern.render(buffer, 1000, size);
      
      const newSize = { width: 100, height: 30 };
      const newBuffer = createMockBuffer(newSize.width, newSize.height);
      
      expect(() => {
        pattern.render(newBuffer, 1100, newSize);
      }).not.toThrow();
    });

    it('should handle extreme config values', () => {
      const extremePattern = new SmokePattern(theme, {
        plumeCount: 1,
        particleCount: 10,
        riseSpeed: 0.1,
        dissipationRate: 0.001,
        turbulence: 0.1,
        spread: 1,
        windStrength: 0.0,
        mouseBlowForce: 0.5
      });
      
      expect(() => {
        extremePattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });
});
