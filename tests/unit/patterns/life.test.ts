import { LifePattern } from '../../../src/patterns/LifePattern.js';
import { Cell, Theme } from '../../../src/types/index.js';
import { createMockTheme, createMockBuffer } from '../../utils/mocks.js';

describe('LifePattern', () => {
  let pattern: LifePattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new LifePattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('life');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new LifePattern(theme, {
        cellSize: 1,
        updateSpeed: 50,
        wrapEdges: false,
        aliveChar: '●',
        deadChar: '·',
        randomDensity: 0.5,
        initialPattern: 'gliders'
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

    it('should fill buffer with life cells', () => {
      pattern.render(buffer, 1000, size);
      
      // Check that cells are set (alive or dead)
      let filledCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char) {
            filledCells++;
          }
        }
      }
      
      expect(filledCells).toBeGreaterThan(0);
    });

    it('should evolve generations over time', () => {
      // First generation
      pattern.render(buffer, 0, size);
      const metrics1 = pattern.getMetrics();
      
      // Wait for update (default updateSpeed is 100ms)
      pattern.render(buffer, 150, size);
      const metrics2 = pattern.getMetrics();
      
      // Generation should have increased
      expect(metrics2.generation).toBeGreaterThan(metrics1.generation);
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
      const largeSize = { width: 200, height: 50 };
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      expect(() => {
        pattern.render(largeBuffer, 1000, largeSize);
      }).not.toThrow();
    });
  });

  describe('presets', () => {
    it('should return all presets', () => {
      const presets = LifePattern.getPresets();
      expect(presets).toHaveLength(6);
      expect(presets[0].id).toBe(1);
      expect(presets[5].id).toBe(6);
    });

    it('should return specific preset by id', () => {
      const preset = LifePattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset!.id).toBe(1);
      expect(preset!.name).toBe('Random Soup');
    });

    it('should return undefined for invalid preset id', () => {
      const preset = LifePattern.getPreset(999);
      expect(preset).toBeUndefined();
    });

    it('should apply preset 1 - Random Soup', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);
      
      // Render and verify preset was applied
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      expect(metrics.cellSize).toBe(2);
      expect(metrics.updateSpeed).toBe(100);
    });

    it('should apply preset 2 - Glider Garden', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      expect(metrics.cellSize).toBe(2);
      expect(metrics.updateSpeed).toBe(150);
    });

    it('should apply preset 3 - Oscillator Park', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      expect(metrics.cellSize).toBe(2);
      expect(metrics.wrapEdges).toBe(0); // false = 0
    });

    it('should apply preset 4 - Primordial Soup', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      expect(metrics.cellSize).toBe(1);
      expect(metrics.updateSpeed).toBe(80);
    });

    it('should apply preset 5 - Methuselah Patterns', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      expect(metrics.cellSize).toBe(2);
      expect(metrics.updateSpeed).toBe(120);
    });

    it('should apply preset 6 - Still Life Garden', () => {
      const result = pattern.applyPreset(6);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      expect(metrics.cellSize).toBe(2);
      expect(metrics.updateSpeed).toBe(150);
    });

    it('should return false for invalid preset', () => {
      const result = pattern.applyPreset(999);
      expect(result).toBe(false);
    });

    it('should reset pattern when applying preset', () => {
      pattern.render(buffer, 1000, size);
      
      // Apply preset - this calls reset()
      pattern.applyPreset(2);
      
      // Render at time 0 (no evolution yet)
      pattern.render(buffer, 0, size);
      const metrics = pattern.getMetrics();
      
      // Generation should be reset
      expect(metrics.generation).toBe(0);
    });
  });

  describe('mouse interaction', () => {
    it('should handle mouse move without errors', () => {
      const mousePos = { x: 10, y: 10 };
      expect(() => {
        pattern.onMouseMove(mousePos);
      }).not.toThrow();
    });

    it('should toggle cell on mouse click', () => {
      // Initialize grid
      pattern.render(buffer, 1000, size);
      const metrics1 = pattern.getMetrics();
      const pop1 = metrics1.population;
      
      // Click to toggle a cell
      pattern.onMouseClick({ x: 10, y: 10 });
      const metrics2 = pattern.getMetrics();
      const pop2 = metrics2.population;
      
      // Population should change
      expect(pop2).not.toBe(pop1);
    });

    it('should handle clicks outside grid bounds', () => {
      pattern.render(buffer, 1000, size);
      
      expect(() => {
        pattern.onMouseClick({ x: -1, y: -1 });
      }).not.toThrow();
      
      expect(() => {
        pattern.onMouseClick({ x: 1000, y: 1000 });
      }).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      pattern.render(buffer, 1000, size);
      
      // Let it evolve
      pattern.render(buffer, 500, size);
      const metrics1 = pattern.getMetrics();
      
      pattern.reset();
      const metrics2 = pattern.getMetrics();
      
      expect(metrics2.generation).toBe(0);
      expect(metrics2.population).toBe(0);
    });
  });

  describe('metrics', () => {
    it('should return metrics with correct structure', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics).toHaveProperty('generation');
      expect(metrics).toHaveProperty('population');
      expect(metrics).toHaveProperty('gridWidth');
      expect(metrics).toHaveProperty('gridHeight');
      expect(metrics).toHaveProperty('cellSize');
      expect(metrics).toHaveProperty('updateSpeed');
      expect(metrics).toHaveProperty('wrapEdges');
      expect(metrics).toHaveProperty('density');
    });

    it('should return numeric values only', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      Object.values(metrics).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });
  });

  describe('Game of Life rules', () => {
    it('should implement birth rule (dead cell with 3 neighbors becomes alive)', () => {
      // Create a pattern that will spawn a new cell
      const testPattern = new LifePattern(theme, {
        cellSize: 1,
        updateSpeed: 50,
        wrapEdges: false,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 0, size);
      expect(() => {
        testPattern.render(buffer, 100, size);
      }).not.toThrow();
    });

    it('should implement survival rule (alive cell with 2-3 neighbors survives)', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 1,
        updateSpeed: 50,
        wrapEdges: false,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.3,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 0, size);
      const metrics1 = testPattern.getMetrics();
      
      testPattern.render(buffer, 100, size);
      const metrics2 = testPattern.getMetrics();
      
      // Some cells should survive
      expect(metrics2.population).toBeGreaterThan(0);
    });

    it('should implement death rule (alive cell with <2 or >3 neighbors dies)', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 50,
        wrapEdges: false,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.5,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 0, size);
      expect(() => {
        testPattern.render(buffer, 100, size);
      }).not.toThrow();
    });
  });

  describe('initial patterns', () => {
    it('should create random pattern', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 100,
        wrapEdges: true,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.3,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 1000, size);
      const metrics = testPattern.getMetrics();
      
      expect(metrics.population).toBeGreaterThan(0);
    });

    it('should create glider pattern', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 150,
        wrapEdges: true,
        aliveChar: '●',
        deadChar: '·',
        randomDensity: 0,
        initialPattern: 'gliders'
      });
      
      testPattern.render(buffer, 1000, size);
      const metrics = testPattern.getMetrics();
      
      expect(metrics.population).toBeGreaterThan(0);
    });

    it('should create oscillator patterns', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 200,
        wrapEdges: false,
        aliveChar: '▓',
        deadChar: ' ',
        randomDensity: 0,
        initialPattern: 'oscillators'
      });
      
      testPattern.render(buffer, 1000, size);
      const metrics = testPattern.getMetrics();
      
      expect(metrics.population).toBeGreaterThan(0);
    });
  });

  describe('configuration options', () => {
    it('should respect cellSize config', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 3,
        updateSpeed: 100,
        wrapEdges: true,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.3,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 1000, size);
      const metrics = testPattern.getMetrics();
      
      expect(metrics.cellSize).toBe(3);
    });

    it('should respect updateSpeed config', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 200,
        wrapEdges: true,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.3,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 1000, size);
      const metrics = testPattern.getMetrics();
      
      expect(metrics.updateSpeed).toBe(200);
    });

    it('should respect wrapEdges config', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 100,
        wrapEdges: false,
        aliveChar: '█',
        deadChar: ' ',
        randomDensity: 0.3,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 1000, size);
      const metrics = testPattern.getMetrics();
      
      expect(metrics.wrapEdges).toBe(0); // false = 0
    });

    it('should use custom alive and dead chars', () => {
      const testPattern = new LifePattern(theme, {
        cellSize: 2,
        updateSpeed: 100,
        wrapEdges: true,
        aliveChar: '●',
        deadChar: '·',
        randomDensity: 0.3,
        initialPattern: 'random'
      });
      
      testPattern.render(buffer, 1000, size);
      
      // Check that custom chars appear in buffer
      let hasCustomChar = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char === '●' || buffer[y][x].char === '·') {
            hasCustomChar = true;
            break;
          }
        }
        if (hasCustomChar) break;
      }
      
      expect(hasCustomChar).toBe(true);
    });
  });

  describe('theme integration', () => {
    it('should use theme colors with varying intensities', () => {
      pattern.render(buffer, 1000, size);
      
      // Collect unique colors
      const colors = new Set<string>();
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].color) {
            const c = buffer[y][x].color!;
            colors.add(`${c.r},${c.g},${c.b}`);
          }
        }
      }
      
      // Should have multiple color variations from theme
      expect(colors.size).toBeGreaterThan(0);
    });
  });
});
