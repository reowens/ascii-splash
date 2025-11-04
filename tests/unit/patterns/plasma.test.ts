import { PlasmaPattern } from '../../../src/patterns/PlasmaPattern';
import { Cell, Theme } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('PlasmaPattern', () => {
  let pattern: PlasmaPattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new PlasmaPattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('plasma');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new PlasmaPattern(theme, {
        frequency: 0.2,
        speed: 2.0,
        complexity: 5
      });
      expect(customPattern).toBeDefined();
    });

    it('should use partial config with defaults', () => {
      const partialPattern = new PlasmaPattern(theme, { speed: 3.0 });
      expect(partialPattern).toBeDefined();
    });
  });

  describe('render', () => {
    it('should render without errors', () => {
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should fill buffer with plasma cells', () => {
      pattern.render(buffer, 1000, size);
      
      // Check that all cells are filled
      let filledCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== undefined) {
            filledCells++;
          }
        }
      }
      
      expect(filledCells).toBe(size.width * size.height);
    });

    it('should use plasma characters', () => {
      pattern.render(buffer, 1000, size);
      
      const plasmaChars = ['█', '▓', '▒', '░', '▪', '▫', '·', ' '];
      let hasPlasmaChars = false;
      
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (plasmaChars.includes(buffer[y][x].char)) {
            hasPlasmaChars = true;
            break;
          }
        }
        if (hasPlasmaChars) break;
      }
      
      expect(hasPlasmaChars).toBe(true);
    });

    it('should animate over time', () => {
      pattern.render(buffer, 100, size);
      const snapshot1 = JSON.stringify(buffer);
      
      pattern.render(buffer, 500, size);
      const snapshot2 = JSON.stringify(buffer);
      
      // Animation should have progressed (buffers should differ)
      expect(snapshot1).not.toBe(snapshot2);
    });

    it('should use theme colors', () => {
      pattern.render(buffer, 1000, size);
      
      // Find a colored cell
      let hasColor = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].color && 
              (buffer[y][x].color!.r > 0 || 
               buffer[y][x].color!.g > 0 || 
               buffer[y][x].color!.b > 0)) {
            hasColor = true;
            break;
          }
        }
        if (hasColor) break;
      }
      
      expect(hasColor).toBe(true);
    });

    it('should handle small terminal sizes', () => {
      const smallSize = { width: 20, height: 10 };
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      expect(() => {
        pattern.render(smallBuffer, 1000, smallSize);
      }).not.toThrow();
    });

    it('should handle large terminal sizes', () => {
      const largeSize = { width: 200, height: 60 };
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      expect(() => {
        pattern.render(largeBuffer, 1000, largeSize);
      }).not.toThrow();
    });

    it('should render with mouse position', () => {
      const mousePos = { x: 40, y: 12 };
      
      expect(() => {
        pattern.render(buffer, 1000, size, mousePos);
      }).not.toThrow();
    });

    it('should apply mouse distortion effect', () => {
      const mousePos = { x: 40, y: 12 };
      
      // Render without mouse
      pattern.render(buffer, 1000, size);
      const withoutMouse = JSON.stringify(buffer);
      
      // Reset pattern
      pattern.reset();
      
      // Render with mouse
      pattern.render(buffer, 1000, size, mousePos);
      const withMouse = JSON.stringify(buffer);
      
      // Buffers should be different due to mouse distortion
      expect(withoutMouse).not.toBe(withMouse);
    });
  });

  describe('mouse interaction', () => {
    it('should have onMouseMove method', () => {
      expect(pattern.onMouseMove).toBeDefined();
    });

    it('should handle mouse move', () => {
      expect(() => {
        pattern.onMouseMove({ x: 40, y: 12 });
      }).not.toThrow();
    });

    it('should update mouse influence on move', () => {
      pattern.onMouseMove({ x: 40, y: 12 });
      
      // Render and check metrics
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.mouseActive).toBe(1);
    });

    it('should have onMouseClick method', () => {
      expect(pattern.onMouseClick).toBeDefined();
    });

    it('should handle mouse click', () => {
      expect(() => {
        pattern.onMouseClick({ x: 40, y: 12 });
      }).not.toThrow();
    });

    it('should create click waves', () => {
      const clickPos = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBeGreaterThan(0);
    });

    it('should create multiple click waves', () => {
      pattern.onMouseClick({ x: 20, y: 10 });
      pattern.onMouseClick({ x: 40, y: 12 });
      pattern.onMouseClick({ x: 60, y: 15 });
      
      const metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBe(3);
    });

    it('should limit click waves to 5', () => {
      // Create 10 click waves
      for (let i = 0; i < 10; i++) {
        pattern.onMouseClick({ x: i * 8, y: i * 2 });
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBeLessThanOrEqual(5);
    });

    it('should apply click wave effects to rendering', () => {
      // Mock Date.now for controlled wave timing
      const originalNow = Date.now;
      const startTime = 1000;
      Date.now = jest.fn(() => startTime);
      
      // Render without click waves
      pattern.render(buffer, 1000, size);
      const withoutWaves = JSON.stringify(buffer);
      
      // Create click wave
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Render with click waves at same time
      pattern.render(buffer, 1000, size);
      const withWaves = JSON.stringify(buffer);
      
      // Restore Date.now
      Date.now = originalNow;
      
      // Buffers should differ due to click wave
      expect(withoutWaves).not.toBe(withWaves);
    });

    it('should clean up old click waves', () => {
      // Mock Date.now to control wave age
      const originalNow = Date.now;
      const startTime = 1000;
      Date.now = jest.fn(() => startTime);
      
      // Create click wave
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Move time forward past wave lifetime (3000ms)
      Date.now = jest.fn(() => startTime + 4000);
      
      // Render to trigger cleanup
      pattern.render(buffer, 4000, size);
      
      const metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBe(0);
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should handle mouse at edge positions', () => {
      expect(() => {
        pattern.onMouseMove({ x: 0, y: 0 });
        pattern.onMouseClick({ x: 0, y: 0 });
        pattern.render(buffer, 1000, size);
        
        pattern.onMouseMove({ x: 79, y: 23 });
        pattern.onMouseClick({ x: 79, y: 23 });
        pattern.render(buffer, 1100, size);
      }).not.toThrow();
    });
  });

  describe('presets', () => {
    it('should have 6 presets defined', () => {
      const presets = PlasmaPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should have unique preset IDs', () => {
      const presets = PlasmaPattern.getPresets();
      const ids = presets.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(presets.length);
    });

    it('should have valid preset names and descriptions', () => {
      const presets = PlasmaPattern.getPresets();
      presets.forEach(preset => {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.id).toBeGreaterThan(0);
        expect(preset.id).toBeLessThanOrEqual(6);
        expect(preset.config).toBeDefined();
        expect(preset.config.frequency).toBeDefined();
        expect(preset.config.speed).toBeDefined();
        expect(preset.config.complexity).toBeDefined();
        expect(preset.config.colorShift).toBeDefined();
        expect(preset.config.shiftSpeed).toBeDefined();
      });
    });

    it('should apply preset 1 (Gentle Waves)', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 2 (Standard Plasma)', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 3 (Turbulent Energy)', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 4 (Electric Storm)', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 5 (Psychedelic Storm)', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 6 (Aurora)', () => {
      const result = pattern.applyPreset(6);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should return false for invalid preset ID', () => {
      const result = pattern.applyPreset(99);
      expect(result).toBe(false);
    });

    it('should get preset by ID', () => {
      const preset = PlasmaPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(1);
      expect(preset?.name).toBe('Gentle Waves');
    });

    it('should return undefined for invalid preset ID', () => {
      const preset = PlasmaPattern.getPreset(99);
      expect(preset).toBeUndefined();
    });

    it('should reset state when applying preset', () => {
      // Create some state
      pattern.onMouseMove({ x: 40, y: 12 });
      pattern.onMouseClick({ x: 40, y: 12 });
      
      let metrics = pattern.getMetrics();
      expect(metrics.mouseActive).toBe(1);
      expect(metrics.clickWaves).toBeGreaterThan(0);
      
      // Apply preset (should reset)
      pattern.applyPreset(2);
      
      metrics = pattern.getMetrics();
      expect(metrics.mouseActive).toBe(0);
      expect(metrics.clickWaves).toBe(0);
    });

    it('should return a copy of presets array', () => {
      const presets1 = PlasmaPattern.getPresets();
      const presets2 = PlasmaPattern.getPresets();
      
      expect(presets1).not.toBe(presets2);
      expect(presets1).toEqual(presets2);
    });
  });

  describe('reset', () => {
    it('should reset mouse influence', () => {
      pattern.onMouseMove({ x: 40, y: 12 });
      
      let metrics = pattern.getMetrics();
      expect(metrics.mouseActive).toBe(1);
      
      pattern.reset();
      
      metrics = pattern.getMetrics();
      expect(metrics.mouseActive).toBe(0);
    });

    it('should reset click waves', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      
      let metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBeGreaterThan(0);
      
      pattern.reset();
      
      metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBe(0);
    });

    it('should allow rendering after reset', () => {
      pattern.render(buffer, 1000, size);
      pattern.reset();
      
      expect(() => {
        pattern.render(buffer, 2000, size);
      }).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.waves).toBe('number');
      expect(typeof metrics.complexity).toBe('number');
      expect(typeof metrics.clickWaves).toBe('number');
      expect(typeof metrics.mouseActive).toBe('number');
    });

    it('should report wave count', () => {
      const metrics = pattern.getMetrics();
      expect(metrics.waves).toBe(4);
    });

    it('should track complexity from config', () => {
      const customPattern = new PlasmaPattern(theme, { complexity: 7 });
      const metrics = customPattern.getMetrics();
      
      expect(metrics.complexity).toBe(7);
    });

    it('should track mouse active state', () => {
      let metrics = pattern.getMetrics();
      expect(metrics.mouseActive).toBe(0);
      
      pattern.onMouseMove({ x: 40, y: 12 });
      metrics = pattern.getMetrics();
      expect(metrics.mouseActive).toBe(1);
    });

    it('should track click waves count', () => {
      let metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBe(0);
      
      pattern.onMouseClick({ x: 40, y: 12 });
      metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBe(1);
      
      pattern.onMouseClick({ x: 50, y: 14 });
      metrics = pattern.getMetrics();
      expect(metrics.clickWaves).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high frequency', () => {
      const highFreqPattern = new PlasmaPattern(theme, { frequency: 1.0 });
      
      expect(() => {
        highFreqPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle very low frequency', () => {
      const lowFreqPattern = new PlasmaPattern(theme, { frequency: 0.01 });
      
      expect(() => {
        lowFreqPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle zero speed', () => {
      const staticPattern = new PlasmaPattern(theme, { speed: 0 });
      
      expect(() => {
        staticPattern.render(buffer, 1000, size);
        staticPattern.render(buffer, 2000, size);
      }).not.toThrow();
    });

    it('should handle very high speed', () => {
      const fastPattern = new PlasmaPattern(theme, { speed: 10.0 });
      
      expect(() => {
        fastPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle minimal complexity', () => {
      const simplePattern = new PlasmaPattern(theme, { complexity: 1 });
      
      expect(() => {
        simplePattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle high complexity', () => {
      const complexPattern = new PlasmaPattern(theme, { complexity: 10 });
      
      expect(() => {
        complexPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('Stability', () => {
    it('should handle rapid renders', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          pattern.render(buffer, i * 16, size);
        }
      }).not.toThrow();
    });

    it('should handle rapid mouse movements', () => {
      expect(() => {
        for (let i = 0; i < 50; i++) {
          pattern.onMouseMove({ x: i, y: i / 2 });
        }
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle rapid clicks', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          pattern.onMouseClick({ x: i * 8, y: i * 2 });
        }
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle preset changes during rendering', () => {
      expect(() => {
        for (let i = 1; i <= 6; i++) {
          pattern.applyPreset(i);
          pattern.render(buffer, i * 100, size);
          pattern.onMouseClick({ x: 40, y: 12 });
        }
      }).not.toThrow();
    });
  });
});
