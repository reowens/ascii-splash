import { DNAPattern } from '../../../src/patterns/DNAPattern';
import { Cell, Theme, Point } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('DNAPattern', () => {
  let pattern: DNAPattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new DNAPattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('dna');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new DNAPattern(theme, {
        rotationSpeed: 1.0,
        helixRadius: 12,
        basePairDensity: 0.4,
        twistRate: 3,
        showLabels: false
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

    it('should fill buffer with DNA helix structure', () => {
      pattern.render(buffer, 1000, size);
      
      // Check that cells are set
      let filledCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char && buffer[y][x].char !== ' ') {
            filledCells++;
          }
        }
      }
      
      expect(filledCells).toBeGreaterThan(0);
    });

    it('should render helix centered horizontally', () => {
      pattern.render(buffer, 1000, size);
      
      // Find cells with content
      const filledColumns = new Set<number>();
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char && buffer[y][x].char !== ' ') {
            filledColumns.add(x);
          }
        }
      }
      
      // Check that most content is near center
      const centerX = size.width / 2;
      const columnsNearCenter = Array.from(filledColumns).filter(
        x => Math.abs(x - centerX) < size.width / 3
      );
      
      expect(columnsNearCenter.length).toBeGreaterThan(0);
    });

    it('should animate rotation over time', () => {
      // Render at time 0
      pattern.render(buffer, 0, size);
      const snapshot1 = JSON.stringify(buffer);
      
      // Reset buffer
      buffer = createMockBuffer(size.width, size.height);
      
      // Render at time 1000 (1 second later)
      pattern.render(buffer, 1000, size);
      const snapshot2 = JSON.stringify(buffer);
      
      // Buffer should be different due to rotation
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

    it('should respond to mouse position', () => {
      // Use a mouse position far from center (center = 40) to create dramatic twist
      const mousePos: Point = { x: 10, y: 12 };
      
      // Render with mouse position
      pattern.render(buffer, 1000, size, mousePos);
      const snapshotWithMouse = JSON.stringify(buffer);
      
      // Reset buffer
      buffer = createMockBuffer(size.width, size.height);
      
      // Render without mouse position
      pattern.render(buffer, 1000, size);
      const snapshotWithoutMouse = JSON.stringify(buffer);
      
      // Should be different due to mouse twist effect
      expect(snapshotWithMouse).not.toBe(snapshotWithoutMouse);
    });
  });

  describe('mouse interaction', () => {
    it('should handle mouse move', () => {
      const mousePos: Point = { x: 40, y: 12 };
      
      expect(() => {
        pattern.onMouseMove?.(mousePos);
      }).not.toThrow();
    });

    it('should handle mouse click', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      expect(() => {
        pattern.onMouseClick?.(clickPos);
      }).not.toThrow();
    });

    it('should create mutations on click', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      // Get initial metrics
      const initialMetrics = pattern.getMetrics();
      
      // Click to create mutation
      pattern.onMouseClick?.(clickPos);
      
      // Get updated metrics
      const updatedMetrics = pattern.getMetrics();
      
      // Should have at least one mutation
      expect(updatedMetrics.mutations).toBeGreaterThan(initialMetrics.mutations);
    });
  });

  describe('reset', () => {
    it('should clear state', () => {
      // Render and interact
      pattern.render(buffer, 1000, size);
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      // Reset
      pattern.reset();
      
      // Metrics should be reset
      const metrics = pattern.getMetrics();
      expect(metrics.mutations).toBe(0);
    });
  });

  describe('presets', () => {
    it('should have 6 presets', () => {
      const presets = DNAPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should apply preset 1 (Slow Helix)', () => {
      const success = pattern.applyPreset?.(1);
      expect(success).toBe(true);
      
      // Should render without errors after preset change
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 2 (Fast Spin)', () => {
      const success = pattern.applyPreset?.(2);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 3 (Unwinding)', () => {
      const success = pattern.applyPreset?.(3);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 4 (Replication)', () => {
      const success = pattern.applyPreset?.(4);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 5 (Mutation)', () => {
      const success = pattern.applyPreset?.(5);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 6 (Rainbow)', () => {
      const success = pattern.applyPreset?.(6);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should return false for invalid preset', () => {
      const success = pattern.applyPreset?.(99);
      expect(success).toBe(false);
    });

    it('should reset state when applying preset', () => {
      // Create some state
      pattern.render(buffer, 1000, size);
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      // Apply preset should reset
      pattern.applyPreset?.(1);
      
      const metrics = pattern.getMetrics();
      expect(metrics.mutations).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.basePairs).toBe('number');
      expect(typeof metrics.mutations).toBe('number');
    });

    it('should track base pair count', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.basePairs).toBeGreaterThan(0);
    });

    it('should track mutation count after clicks', () => {
      pattern.render(buffer, 1000, size);
      
      // Click to create mutations
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      const metrics = pattern.getMetrics();
      expect(metrics.mutations).toBeGreaterThan(0);
    });
  });

  describe('base pairs', () => {
    it('should create appropriate number of base pairs', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      // Should have base pairs proportional to height
      expect(metrics.basePairs).toBeGreaterThan(0);
      expect(metrics.basePairs).toBeLessThan(size.height);
    });
  });

  describe('stability', () => {
    it('should handle rapid renders', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          pattern.render(buffer, i * 16, size);
          buffer = createMockBuffer(size.width, size.height);
        }
      }).not.toThrow();
    });

    it('should handle resize during animation', () => {
      // Render at one size
      pattern.render(buffer, 1000, size);
      
      // Change size
      const newSize = { width: 100, height: 30 };
      const newBuffer = createMockBuffer(newSize.width, newSize.height);
      
      // Should handle gracefully
      expect(() => {
        pattern.render(newBuffer, 1100, newSize);
      }).not.toThrow();
    });

    it('should handle many mutations', () => {
      pattern.render(buffer, 1000, size);
      
      // Create many mutations
      expect(() => {
        for (let i = 0; i < 50; i++) {
          pattern.onMouseClick?.({ x: 40 + i, y: 12 });
        }
        pattern.render(buffer, 1100, size);
      }).not.toThrow();
    });
  });
});
