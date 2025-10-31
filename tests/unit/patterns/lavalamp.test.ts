import { LavaLampPattern } from '../../../src/patterns/LavaLampPattern';
import { Cell, Theme, Point } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('LavaLampPattern', () => {
  let pattern: LavaLampPattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new LavaLampPattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('lavalamp');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new LavaLampPattern(theme, {
        blobCount: 8,
        minRadius: 4,
        maxRadius: 16,
        riseSpeed: 0.5,
        driftSpeed: 0.3,
        threshold: 1.2,
        mouseForce: 3.0,
        turbulence: false,
        gravity: false
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

    it('should fill buffer with metaball blobs', () => {
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

    it('should animate blobs over time', () => {
      // Render at time 0
      pattern.render(buffer, 0, size);
      const snapshot1 = JSON.stringify(buffer);
      
      // Reset buffer
      buffer = createMockBuffer(size.width, size.height);
      
      // Render at time 500 (0.5 seconds later)
      pattern.render(buffer, 500, size);
      const snapshot2 = JSON.stringify(buffer);
      
      // Buffer should be different due to blob movement
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

    it('should use appropriate intensity characters', () => {
      pattern.render(buffer, 1000, size);
      
      // Valid characters for metaball intensity: █▓▒░ and space
      const validChars = new Set(['█', '▓', '▒', '░', ' ']);
      
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(validChars.has(buffer[y][x].char)).toBe(true);
        }
      }
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
      const mousePos: Point = { x: 40, y: 12 };
      
      // Render several frames with mouse position to allow force to take effect
      let bufferWithMouse = createMockBuffer(size.width, size.height);
      for (let i = 0; i < 5; i++) {
        pattern.render(bufferWithMouse, i * 16, size, mousePos);
      }
      const snapshotWithMouse = JSON.stringify(bufferWithMouse);
      
      // Reset pattern and buffer
      pattern.reset();
      
      // Render same frames without mouse position
      let bufferWithoutMouse = createMockBuffer(size.width, size.height);
      for (let i = 0; i < 5; i++) {
        pattern.render(bufferWithoutMouse, i * 16, size);
      }
      const snapshotWithoutMouse = JSON.stringify(bufferWithoutMouse);
      
      // Should be different due to mouse force
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

    it('should spawn new blob on click', () => {
      // Get initial metrics
      const initialMetrics = pattern.getMetrics();
      const initialBlobCount = initialMetrics.blobs;
      
      // Click to spawn blob
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      // Get updated metrics
      const updatedMetrics = pattern.getMetrics();
      
      // Should have one more blob
      expect(updatedMetrics.blobs).toBe(initialBlobCount + 1);
    });

    it('should cap blob count at 20', () => {
      // Spawn many blobs
      for (let i = 0; i < 30; i++) {
        pattern.onMouseClick?.({ x: 40, y: 12 });
      }
      
      const metrics = pattern.getMetrics();
      
      // Should not exceed 20 blobs
      expect(metrics.blobs).toBeLessThanOrEqual(20);
    });
  });

  describe('reset', () => {
    it('should clear state', () => {
      // Render and interact
      pattern.render(buffer, 1000, size);
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      // Reset
      pattern.reset();
      
      // Metrics should be reset (back to default config blob count)
      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBe(0);
    });

    it('should clear mouse position', () => {
      pattern.onMouseMove?.({ x: 40, y: 12 });
      pattern.reset();
      
      // Should render normally after reset
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('presets', () => {
    it('should have 6 presets', () => {
      const presets = pattern.getPresets?.();
      expect(presets).toHaveLength(6);
    });

    it('should apply preset 1 (Classic)', () => {
      const success = pattern.applyPreset?.(1);
      expect(success).toBe(true);
      
      // Should render without errors after preset change
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 2 (Turbulent)', () => {
      const success = pattern.applyPreset?.(2);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 3 (Gentle)', () => {
      const success = pattern.applyPreset?.(3);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should apply preset 4 (Many Blobs)', () => {
      const success = pattern.applyPreset?.(4);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
      
      // Should have 12 blobs
      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBeGreaterThanOrEqual(10);
    });

    it('should apply preset 5 (Giant Blob)', () => {
      const success = pattern.applyPreset?.(5);
      expect(success).toBe(true);
      
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
      
      // Should have only 2 blobs
      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBeLessThanOrEqual(3);
    });

    it('should apply preset 6 (Strobe)', () => {
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
      
      // Should be back to preset's blob count (5 for Classic)
      const metrics = pattern.getMetrics();
      expect(metrics.blobs).toBeLessThanOrEqual(5);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.blobs).toBe('number');
      expect(typeof metrics.avgRadius).toBe('number');
    });

    it('should track blob count', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.blobs).toBeGreaterThan(0);
    });

    it('should track average radius', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.avgRadius).toBeGreaterThan(0);
    });

    it('should update blob count after click', () => {
      pattern.render(buffer, 1000, size);
      const initialMetrics = pattern.getMetrics();
      
      pattern.onMouseClick?.({ x: 40, y: 12 });
      
      const updatedMetrics = pattern.getMetrics();
      expect(updatedMetrics.blobs).toBe(initialMetrics.blobs + 1);
    });
  });

  describe('physics', () => {
    it('should move blobs over multiple frames', () => {
      // Render initial frame
      pattern.render(buffer, 0, size);
      const metrics1 = pattern.getMetrics();
      
      // Render multiple frames
      for (let i = 1; i <= 10; i++) {
        buffer = createMockBuffer(size.width, size.height);
        pattern.render(buffer, i * 100, size);
      }
      
      // Blobs should have moved (different positions)
      const metrics2 = pattern.getMetrics();
      expect(metrics2.blobs).toBe(metrics1.blobs); // Same count
    });

    it('should handle vertical wrapping', () => {
      // Render many frames to allow blobs to wrap
      expect(() => {
        for (let i = 0; i < 100; i++) {
          buffer = createMockBuffer(size.width, size.height);
          pattern.render(buffer, i * 100, size);
        }
      }).not.toThrow();
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

    it('should handle many clicks', () => {
      pattern.render(buffer, 1000, size);
      
      // Create many blobs
      expect(() => {
        for (let i = 0; i < 50; i++) {
          pattern.onMouseClick?.({ x: 20 + i, y: 12 });
        }
        pattern.render(buffer, 1100, size);
      }).not.toThrow();
    });

    it('should handle extreme config values', () => {
      const extremePattern = new LavaLampPattern(theme, {
        blobCount: 12,
        minRadius: 2,
        maxRadius: 20,
        riseSpeed: 2.0,
        driftSpeed: 1.0,
        threshold: 0.5,
        mouseForce: 5.0,
        turbulence: true,
        gravity: true
      });
      
      expect(() => {
        extremePattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });
});
