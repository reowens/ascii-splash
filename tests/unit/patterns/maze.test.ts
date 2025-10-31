import { MazePattern } from '../../../src/patterns/MazePattern';
import { Cell, Theme } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

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
    it('should reset the pattern', () => {
      pattern.render(buffer, 1000, size);
      
      expect(() => {
        pattern.reset();
      }).not.toThrow();
      
      // After reset, should start fresh
      pattern.render(buffer, 100, size);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    it('should include maze-specific metrics', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      // Should have grid dimensions
      expect(metrics.gridWidth).toBeDefined();
      expect(metrics.gridHeight).toBeDefined();
      
      // Should have generation progress
      expect(metrics.generationProgress).toBeDefined();
      expect(metrics.generationComplete).toBeDefined();
    });
  });

  describe('different algorithms', () => {
    it('should render with DFS algorithm', () => {
      const dfsPattern = new MazePattern(theme, { algorithm: 'dfs' });
      expect(() => {
        dfsPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should render with Prim algorithm', () => {
      const primPattern = new MazePattern(theme, { algorithm: 'prim' });
      expect(() => {
        primPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should render with Recursive Division algorithm', () => {
      const rdPattern = new MazePattern(theme, { algorithm: 'recursive-division' });
      expect(() => {
        rdPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should render with Kruskal algorithm', () => {
      const kruskalPattern = new MazePattern(theme, { algorithm: 'kruskal' });
      expect(() => {
        kruskalPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should render with Eller algorithm', () => {
      const ellerPattern = new MazePattern(theme, { algorithm: 'eller' });
      expect(() => {
        ellerPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should render with Wilson algorithm', () => {
      const wilsonPattern = new MazePattern(theme, { algorithm: 'wilson' });
      expect(() => {
        wilsonPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('configuration options', () => {
    it('should respect cellSize config', () => {
      const pattern1 = new MazePattern(theme, { cellSize: 2 });
      const pattern2 = new MazePattern(theme, { cellSize: 5 });
      
      expect(() => {
        pattern1.render(buffer, 1000, size);
        pattern2.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should respect wallChar and pathChar config', () => {
      const customPattern = new MazePattern(theme, {
        wallChar: '#',
        pathChar: '.'
      });
      
      customPattern.render(buffer, 1000, size);
      
      // Check that custom characters are used
      let hasWallChar = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char === '#') {
            hasWallChar = true;
            break;
          }
        }
        if (hasWallChar) break;
      }
      
      expect(hasWallChar).toBe(true);
    });

    it('should respect animateGeneration config', () => {
      const animatedPattern = new MazePattern(theme, { animateGeneration: true });
      const staticPattern = new MazePattern(theme, { animateGeneration: false });
      
      expect(() => {
        animatedPattern.render(buffer, 1000, size);
        staticPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('theme integration', () => {
    it('should work with different themes', () => {
      const themes = [
        createMockTheme('ocean'),
        createMockTheme('fire'),
        createMockTheme('matrix'),
      ];

      themes.forEach(t => {
        const p = new MazePattern(t);
        expect(() => {
          p.render(buffer, 1000, size);
        }).not.toThrow();
      });
    });
  });
});
