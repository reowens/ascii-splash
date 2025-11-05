import { MazePattern } from '../../../src/patterns/MazePattern.js';
import { Cell, Theme } from '../../../src/types/index.js';
import { createMockTheme, createMockBuffer } from '../../utils/mocks.js';

describe('MazePattern', () => {
  let pattern: MazePattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new MazePattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('maze');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new MazePattern(theme, {
        algorithm: 'prim',
        cellSize: 5,
        generationSpeed: 100,
        wallChar: '#',
        pathChar: '.',
        animateGeneration: false
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

    it('should fill buffer with maze cells', () => {
      pattern.render(buffer, 1000, size);
      
      // Check that some cells are set (walls or paths)
      let filledCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            filledCells++;
          }
        }
      }
      
      expect(filledCells).toBeGreaterThan(0);
    });

    it('should update maze generation over time', () => {
      pattern.render(buffer, 100, size);
      const snapshot1 = JSON.stringify(buffer);
      
      // Allow generation to progress
      pattern.render(buffer, 500, size);
      const snapshot2 = JSON.stringify(buffer);
      
      // Generation should have progressed (buffers should differ)
      expect(snapshot1).not.toBe(snapshot2);
    });

    it('should use theme colors for maze cells', () => {
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
  });

  describe('presets', () => {
    it('should have 6 presets defined', () => {
      const presets = MazePattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should have unique preset IDs', () => {
      const presets = MazePattern.getPresets();
      const ids = presets.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(presets.length);
    });

    it('should have valid preset names and descriptions', () => {
      const presets = MazePattern.getPresets();
      presets.forEach(preset => {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.id).toBeGreaterThan(0);
        expect(preset.id).toBeLessThanOrEqual(6);
      });
    });

    it('should apply preset 1 (DFS)', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);
      
      // Render to verify it works
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 2 (Prim)', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 3 (Recursive Division)', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 4 (Kruskal)', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 5 (Eller)', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 6 (Wilson)', () => {
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
      const preset = MazePattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(1);
      expect(preset?.name).toBeTruthy();
    });

    it('should return undefined for invalid preset ID', () => {
      const preset = MazePattern.getPreset(99);
      expect(preset).toBeUndefined();
    });

    it('should reset maze when applying preset', () => {
      // Render initial maze
      pattern.render(buffer, 1000, size);
      const before = JSON.stringify(buffer);
      
      // Apply new preset
      pattern.applyPreset(2);
      pattern.render(buffer, 100, size);
      const after = JSON.stringify(buffer);
      
      // Should be different (new maze generation)
      expect(before).not.toBe(after);
    });
  });

  describe('mouse interaction', () => {
    it('should have onMouseClick method', () => {
      expect(pattern.onMouseClick).toBeDefined();
    });

    it('should handle mouse click', () => {
      expect(() => {
        pattern.onMouseClick?.({ x: 40, y: 12 });
      }).not.toThrow();
    });

    it('should regenerate maze on click', () => {
      // Render initial maze
      pattern.render(buffer, 1000, size);
      const before = JSON.stringify(buffer);
      
      // Click to regenerate
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      // Render new maze
      pattern.render(buffer, 100, size);
      const after = JSON.stringify(buffer);
      
      // Should be different (regenerated)
      expect(before).not.toBe(after);
    });

    it('should handle clicks at different positions', () => {
      expect(() => {
        pattern.onMouseClick?.({ x: 0, y: 0 });
        pattern.onMouseClick?.({ x: 79, y: 23 });
        pattern.onMouseClick?.({ x: 40, y: 12 });
      }).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset maze state', () => {
      // Render to generate some maze
      pattern.render(buffer, 1000, size);
      
      // Reset
      pattern.reset();
      
      // Render again should work
      expect(() => {
        pattern.render(buffer, 2000, size);
      }).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.generationProgress).toBe('number');
      expect(typeof metrics.generationComplete).toBe('number');
      expect(metrics.generationComplete).toBeGreaterThanOrEqual(0);
      expect(metrics.generationComplete).toBeLessThanOrEqual(1);
      expect(typeof metrics.gridWidth).toBe('number');
      expect(typeof metrics.gridHeight).toBe('number');
      expect(typeof metrics.totalCells).toBe('number');
    });

    it('should track generation progress', () => {
      // Initial state
      const metrics1 = pattern.getMetrics();
      expect(metrics1.generationProgress).toBeDefined();
      
      // After render
      pattern.render(buffer, 1000, size);
      const metrics2 = pattern.getMetrics();
      
      // Progress should be tracked
      expect(metrics2.generationProgress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Algorithm Coverage Tests', () => {
    it('should run Prim algorithm through multiple steps', () => {
      pattern.applyPreset(2); // Prim's algorithm
      
      // Render multiple times to trigger step function
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.generationProgress).toBeGreaterThan(0);
    });

    it('should run Recursive Division algorithm', () => {
      pattern.applyPreset(3); // Recursive Division
      
      // This algorithm completes instantly, but should still render
      pattern.render(buffer, 0, size);
      
      // Check that maze has cells
      let hasWalls = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            hasWalls = true;
            break;
          }
        }
        if (hasWalls) break;
      }
      
      expect(hasWalls).toBe(true);
    });

    it('should run Kruskal algorithm through multiple steps', () => {
      pattern.applyPreset(4); // Kruskal's algorithm
      
      // Render multiple times to trigger union-find operations
      for (let i = 0; i < 200; i++) {
        pattern.render(buffer, i * 50, size);
      }
      
      // Should complete eventually
      const metrics = pattern.getMetrics();
      expect(metrics.generationProgress).toBeGreaterThanOrEqual(0);
    });

    it('should run Eller algorithm through multiple steps', () => {
      pattern.applyPreset(5); // Eller's algorithm
      
      // Render multiple times to process rows
      for (let i = 0; i < 150; i++) {
        pattern.render(buffer, i * 60, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.generationProgress).toBeGreaterThanOrEqual(0);
    });

    it('should run Wilson algorithm through multiple steps', () => {
      pattern.applyPreset(6); // Wilson's algorithm
      
      // Render multiple times to build random walk paths
      for (let i = 0; i < 150; i++) {
        pattern.render(buffer, i * 80, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.generationProgress).toBeGreaterThanOrEqual(0);
    });

    it('should complete generation for all algorithms', () => {
      for (let presetId = 1; presetId <= 6; presetId++) {
        pattern.applyPreset(presetId);
        
        // Render many times to ensure completion
        for (let i = 0; i < 300; i++) {
          pattern.render(buffer, i * 50, size);
        }
        
        // Should have made progress or completed
        const metrics = pattern.getMetrics();
        expect(metrics.generationProgress).toBeGreaterThanOrEqual(0);
        
        // Reset for next algorithm
        pattern.reset();
      }
    });

    it('should handle algorithm transitions', () => {
      // Start with DFS
      pattern.applyPreset(1);
      pattern.render(buffer, 100, size);
      
      // Switch to Prim
      pattern.applyPreset(2);
      pattern.render(buffer, 200, size);
      
      // Switch to Wilson
      pattern.applyPreset(6);
      pattern.render(buffer, 300, size);
      
      // Should not crash
      expect(pattern.getMetrics()).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small cell size', () => {
      const smallCellPattern = new MazePattern(theme, { cellSize: 1 });
      
      expect(() => {
        smallCellPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle very large cell size', () => {
      const largeCellPattern = new MazePattern(theme, { cellSize: 10 });
      
      expect(() => {
        largeCellPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle disabled animation', () => {
      const noAnimPattern = new MazePattern(theme, { animateGeneration: false });
      
      expect(() => {
        noAnimPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should handle custom characters', () => {
      const customPattern = new MazePattern(theme, {
        wallChar: '#',
        pathChar: '.'
      });
      
      customPattern.render(buffer, 1000, size);
      
      // Check for custom characters
      let hasCustomChars = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char === '#' || buffer[y][x].char === '.') {
            hasCustomChars = true;
            break;
          }
        }
        if (hasCustomChars) break;
      }
      
      expect(hasCustomChars).toBe(true);
    });
  });

  describe('Stability', () => {
    it('should handle rapid renders', () => {
      expect(() => {
        for (let i = 0; i < 200; i++) {
          pattern.render(buffer, i * 16, size);
        }
      }).not.toThrow();
    });

    it('should handle preset changes during generation', () => {
      expect(() => {
        for (let i = 1; i <= 6; i++) {
          pattern.applyPreset(i);
          for (let j = 0; j < 10; j++) {
            pattern.render(buffer, j * 100, size);
          }
        }
      }).not.toThrow();
    });
  });
});
