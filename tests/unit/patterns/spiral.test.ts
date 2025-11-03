import { SpiralPattern } from '../../../src/patterns/SpiralPattern';
import { Cell, Point, Size, Theme } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('SpiralPattern', () => {
  let pattern: SpiralPattern;
  let theme: Theme;
  let buffer: Cell[][];
  let size: Size;

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new SpiralPattern(theme);
    size = { width: 80, height: 24 };
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('Constructor and Configuration', () => {
    test('should create with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('spiral');
      
      const metrics = pattern.getMetrics();
      expect(metrics.particles).toBe(100); // Default particleCount
      expect(metrics.arms).toBe(4); // Default armCount
      expect(metrics.bursts).toBe(0);
    });

    test('should accept custom config', () => {
      const customPattern = new SpiralPattern(theme, {
        armCount: 3,
        particleCount: 150,
        spiralTightness: 0.15,
        rotationSpeed: 0.5,
        particleSpeed: 1.5
      });
      
      const metrics = customPattern.getMetrics();
      expect(metrics.arms).toBe(3);
      expect(metrics.particles).toBe(150);
    });

    test('should merge partial config with defaults', () => {
      const partialPattern = new SpiralPattern(theme, { armCount: 5 });
      const metrics = partialPattern.getMetrics();
      expect(metrics.arms).toBe(5);
      expect(metrics.particles).toBe(100); // Should use default
    });
  });

  describe('Rendering', () => {
    test('should render spiral pattern with particles', () => {
      pattern.render(buffer, 1000, size);
      
      const hasContent = buffer.some(row => 
        row.some(cell => cell.char !== ' ')
      );
      expect(hasContent).toBe(true);
    });

    test('should render center marker', () => {
      pattern.render(buffer, 1000, size);
      
      const centerX = Math.floor(size.width / 2);
      const centerY = Math.floor(size.height / 2);
      
      // The center should have a marker character
      expect(buffer[centerY][centerX].char).not.toBe(' ');
    });

    test('should animate particles over time', () => {
      pattern.render(buffer, 0, size);
      const buffer1 = JSON.stringify(buffer);
      
      pattern.render(buffer, 1000, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Particles should move, changing the buffer
      expect(buffer1).not.toBe(buffer2);
    });

    test('should use theme colors', () => {
      pattern.render(buffer, 1000, size);
      
      const coloredCells = buffer.flat().filter(cell => 
        cell.char !== ' ' && cell.color !== undefined
      );
      
      expect(coloredCells.length).toBeGreaterThan(0);
      coloredCells.forEach(cell => {
        expect(cell.color).toMatchObject({
          r: expect.any(Number),
          g: expect.any(Number),
          b: expect.any(Number)
        });
      });
    });

    test('should use particle characters', () => {
      pattern.render(buffer, 1000, size);
      
      const particleChars = ['·', '∘', '○', '◉', '●', '◎', '✦', '✧', '★'];
      const usedChars = new Set(
        buffer.flat()
          .filter(cell => cell.char !== ' ')
          .map(cell => cell.char)
      );
      
      usedChars.forEach(char => {
        expect(particleChars).toContain(char);
      });
    });

    test('should render particles with trails', () => {
      pattern.render(buffer, 1000, size);
      
      // Trails use '·', '∘', '○' characters
      const trailChars = ['·', '∘', '○'];
      const hasTrails = buffer.flat().some(cell => 
        trailChars.includes(cell.char)
      );
      
      expect(hasTrails).toBe(true);
    });

    test('should handle small terminal size', () => {
      const smallSize = { width: 20, height: 10 };
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      expect(() => pattern.render(smallBuffer, 1000, smallSize)).not.toThrow();
      
      const hasContent = smallBuffer.some((row: Cell[]) => 
        row.some((cell: Cell) => cell.char !== ' ')
      );
      expect(hasContent).toBe(true);
    });

    test('should handle large terminal size', () => {
      const largeSize = { width: 200, height: 60 };
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      expect(() => pattern.render(largeBuffer, 1000, largeSize)).not.toThrow();
    });

    test('should render multiple spiral arms', () => {
      const multiArmPattern = new SpiralPattern(theme, { armCount: 5 });
      multiArmPattern.render(buffer, 1000, size);
      
      const metrics = multiArmPattern.getMetrics();
      expect(metrics.arms).toBe(5);
      
      const cellCount = buffer.flat().filter(cell => cell.char !== ' ').length;
      expect(cellCount).toBeGreaterThan(10);
    });

    test('should not render outside buffer bounds', () => {
      pattern.render(buffer, 1000, size);
      
      buffer.forEach((row, y) => {
        expect(y).toBeLessThan(size.height);
        row.forEach((cell, x) => {
          expect(x).toBeLessThan(size.width);
        });
      });
    });

    test('should rotate spiral arms over time', () => {
      const rotatingPattern = new SpiralPattern(theme, { rotationSpeed: 0.5 });
      
      rotatingPattern.render(buffer, 0, size);
      const buffer1 = JSON.stringify(buffer);
      
      rotatingPattern.render(buffer, 2000, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Rotation should change the pattern
      expect(buffer1).not.toBe(buffer2);
    });
  });

  describe('Mouse Interactions', () => {
    test('should handle mouse click', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.bursts).toBe(1);
    });

    test('should spawn burst particles at click position', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      pattern.render(buffer, 1000, size);
      
      // Check that cells near click position are populated
      const nearbyChars = [
        buffer[clickPos.y]?.[clickPos.x]?.char,
        buffer[clickPos.y - 1]?.[clickPos.x]?.char,
        buffer[clickPos.y + 1]?.[clickPos.x]?.char,
        buffer[clickPos.y]?.[clickPos.x - 1]?.char,
        buffer[clickPos.y]?.[clickPos.x + 1]?.char,
      ].filter(char => char && char !== ' ');
      
      expect(nearbyChars.length).toBeGreaterThan(0);
    });

    test('should limit burst count to 3', () => {
      // Spawn 5 bursts
      for (let i = 0; i < 5; i++) {
        pattern.onMouseClick({ x: 20 + i * 5, y: 10 });
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.bursts).toBe(3); // Should cap at 3
    });

    test('should animate burst particles', () => {
      const clickPos: Point = { x: 40, y: 12 };
      pattern.onMouseClick(clickPos);
      
      pattern.render(buffer, 1000, size);
      const buffer1 = JSON.stringify(buffer);
      
      pattern.render(buffer, 1100, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Burst particles should animate (rotate and fade)
      expect(buffer1).not.toBe(buffer2);
    });

    test('should remove old burst particles', () => {
      const clickPos: Point = { x: 40, y: 12 };
      pattern.onMouseClick(clickPos);
      
      expect(pattern.getMetrics().bursts).toBe(1);
      
      // Render many times to age the burst beyond 2 seconds
      for (let i = 0; i < 150; i++) {
        pattern.render(buffer, i * 20, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.bursts).toBe(0);
    });

    test('should handle multiple bursts', () => {
      pattern.onMouseClick({ x: 20, y: 10 });
      pattern.onMouseClick({ x: 60, y: 15 });
      
      expect(pattern.getMetrics().bursts).toBe(2);
      
      pattern.render(buffer, 1000, size);
      
      const hasContent = buffer.some(row => 
        row.some(cell => cell.char !== ' ')
      );
      expect(hasContent).toBe(true);
    });

    test('should handle mouse move without error', () => {
      const movePos: Point = { x: 50, y: 12 };
      
      expect(() => pattern.onMouseMove(movePos)).not.toThrow();
    });

    test('should handle clicks at edge positions', () => {
      pattern.onMouseClick({ x: 0, y: 0 });
      pattern.onMouseClick({ x: size.width - 1, y: size.height - 1 });
      
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
      expect(pattern.getMetrics().bursts).toBe(2);
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = SpiralPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    test('should get preset by id', () => {
      const preset = SpiralPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(1);
      expect(preset?.name).toBe('Twin Helix');
    });

    test('should return undefined for invalid preset id', () => {
      const preset = SpiralPattern.getPreset(999);
      expect(preset).toBeUndefined();
    });

    describe('Preset 1: Twin Helix', () => {
      test('should apply Twin Helix preset', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.arms).toBe(2);
        expect(metrics.particles).toBe(80);
      });

      test('should render with Twin Helix config', () => {
        pattern.applyPreset(1);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 2: Galactic Whirlpool', () => {
      test('should apply Galactic Whirlpool preset', () => {
        const result = pattern.applyPreset(2);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.arms).toBe(5);
        expect(metrics.particles).toBe(150);
      });

      test('should render with Galactic Whirlpool config', () => {
        pattern.applyPreset(2);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 3: Hyperspeed Vortex', () => {
      test('should apply Hyperspeed Vortex preset', () => {
        const result = pattern.applyPreset(3);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.arms).toBe(3);
        expect(metrics.particles).toBe(120);
      });

      test('should render with Hyperspeed Vortex config', () => {
        pattern.applyPreset(3);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 4: Fibonacci Bloom', () => {
      test('should apply Fibonacci Bloom preset', () => {
        const result = pattern.applyPreset(4);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.arms).toBe(8);
        expect(metrics.particles).toBe(180);
      });

      test('should render with Fibonacci Bloom config', () => {
        pattern.applyPreset(4);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 5: Black Hole', () => {
      test('should apply Black Hole preset', () => {
        const result = pattern.applyPreset(5);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.arms).toBe(1);
        expect(metrics.particles).toBe(100);
      });

      test('should render with Black Hole config', () => {
        pattern.applyPreset(5);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 6: DNA Double Helix', () => {
      test('should apply DNA Double Helix preset', () => {
        const result = pattern.applyPreset(6);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.arms).toBe(2);
        expect(metrics.particles).toBe(90);
      });

      test('should render with DNA Double Helix config', () => {
        pattern.applyPreset(6);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    test('should return false for invalid preset', () => {
      const result = pattern.applyPreset(999);
      expect(result).toBe(false);
    });

    test('should reset state when applying preset', () => {
      // Add some click bursts
      pattern.onMouseClick({ x: 40, y: 12 });
      pattern.onMouseClick({ x: 50, y: 15 });
      expect(pattern.getMetrics().bursts).toBe(2);
      
      // Apply preset should reset
      pattern.applyPreset(1);
      expect(pattern.getMetrics().bursts).toBe(0);
    });
  });

  describe('Reset', () => {
    test('should clear click bursts', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      pattern.onMouseClick({ x: 50, y: 15 });
      expect(pattern.getMetrics().bursts).toBe(2);
      
      pattern.reset();
      expect(pattern.getMetrics().bursts).toBe(0);
    });

    test('should reinitialize particles', () => {
      const metrics1 = pattern.getMetrics();
      const particleCount1 = metrics1.particles;
      
      pattern.reset();
      
      const metrics2 = pattern.getMetrics();
      const particleCount2 = metrics2.particles;
      
      // Particle count should remain the same (config-based)
      expect(particleCount1).toBe(particleCount2);
    });

    test('should reset arm rotation', () => {
      // Render to advance rotation
      pattern.render(buffer, 5000, size);
      pattern.reset();
      pattern.render(buffer, 0, size);
      
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
    });
  });

  describe('Metrics', () => {
    test('should return correct metrics structure', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toHaveProperty('particles');
      expect(metrics).toHaveProperty('arms');
      expect(metrics).toHaveProperty('bursts');
    });

    test('should return correct particle count', () => {
      const customPattern = new SpiralPattern(theme, { particleCount: 150 });
      const metrics = customPattern.getMetrics();
      
      expect(metrics.particles).toBe(150);
    });

    test('should return correct arms count', () => {
      const customPattern = new SpiralPattern(theme, { armCount: 5 });
      const metrics = customPattern.getMetrics();
      
      expect(metrics.arms).toBe(5);
    });

    test('should track burst count', () => {
      expect(pattern.getMetrics().bursts).toBe(0);
      
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().bursts).toBe(1);
      
      pattern.onMouseClick({ x: 50, y: 15 });
      expect(pattern.getMetrics().bursts).toBe(2);
    });

    test('should have numeric metric values', () => {
      const metrics = pattern.getMetrics();
      
      expect(typeof metrics.particles).toBe('number');
      expect(typeof metrics.arms).toBe('number');
      expect(typeof metrics.bursts).toBe('number');
    });
  });

  describe('Direction Modes', () => {
    test('should flow particles outward', () => {
      const outwardPattern = new SpiralPattern(theme, { direction: 'outward' });
      outwardPattern.render(buffer, 1000, size);
      
      expect(() => outwardPattern.render(buffer, 2000, size)).not.toThrow();
    });

    test('should flow particles inward', () => {
      const inwardPattern = new SpiralPattern(theme, { direction: 'inward' });
      inwardPattern.render(buffer, 1000, size);
      
      expect(() => inwardPattern.render(buffer, 2000, size)).not.toThrow();
    });

    test('should flow particles bidirectionally', () => {
      const biPattern = new SpiralPattern(theme, { direction: 'bidirectional' });
      biPattern.render(buffer, 1000, size);
      
      expect(() => biPattern.render(buffer, 2000, size)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero arm count', () => {
      const zeroPattern = new SpiralPattern(theme, { armCount: 0 });
      
      expect(() => zeroPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle extreme arm count', () => {
      const extremePattern = new SpiralPattern(theme, { armCount: 20 });
      
      expect(() => extremePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero rotation speed', () => {
      const staticPattern = new SpiralPattern(theme, { rotationSpeed: 0 });
      
      staticPattern.render(buffer, 1000, size);
      const buffer1 = JSON.stringify(buffer);
      
      staticPattern.render(buffer, 2000, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Particles still move even with zero rotation
      expect(buffer1).not.toBe(buffer2);
    });

    test('should handle negative rotation speed', () => {
      const reversePattern = new SpiralPattern(theme, { rotationSpeed: -1.0 });
      
      expect(() => reversePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle very high rotation speed', () => {
      const fastPattern = new SpiralPattern(theme, { rotationSpeed: 10.0 });
      
      expect(() => fastPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero particle count', () => {
      const emptyPattern = new SpiralPattern(theme, { particleCount: 0 });
      
      expect(() => emptyPattern.render(buffer, 1000, size)).not.toThrow();
      expect(emptyPattern.getMetrics().particles).toBe(0);
    });

    test('should handle very high particle count', () => {
      const densePattern = new SpiralPattern(theme, { particleCount: 500 });
      
      expect(() => densePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle very tight spiral', () => {
      const tightPattern = new SpiralPattern(theme, { spiralTightness: 0.01 });
      
      expect(() => tightPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle very loose spiral', () => {
      const loosePattern = new SpiralPattern(theme, { spiralTightness: 0.5 });
      
      expect(() => loosePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle clicks outside bounds', () => {
      pattern.onMouseClick({ x: -10, y: -10 });
      pattern.onMouseClick({ x: 1000, y: 1000 });
      
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
    });
  });

  describe('Stability', () => {
    test('should handle rapid successive renders', () => {
      for (let i = 0; i < 100; i++) {
        expect(() => pattern.render(buffer, i * 16, size)).not.toThrow();
      }
    });

    test('should handle rapid mouse clicks', () => {
      for (let i = 0; i < 10; i++) {
        pattern.onMouseClick({ x: 40 + i % 10, y: 12 });
      }
      
      // Should cap at 3 bursts
      expect(pattern.getMetrics().bursts).toBe(3);
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle rapid preset changes', () => {
      for (let i = 1; i <= 6; i++) {
        pattern.applyPreset(i);
        pattern.render(buffer, i * 1000, size);
      }
      
      expect(() => pattern.render(buffer, 7000, size)).not.toThrow();
    });

    test('should handle interleaved clicks and renders', () => {
      for (let i = 0; i < 20; i++) {
        pattern.onMouseClick({ x: 40 + i, y: 12 });
        pattern.render(buffer, i * 100, size);
      }
      
      expect(() => pattern.render(buffer, 2000, size)).not.toThrow();
    });

    test('should handle size changes between renders', () => {
      pattern.render(buffer, 1000, size);
      
      const newSize = { width: 120, height: 40 };
      const newBuffer = createMockBuffer(newSize.width, newSize.height);
      
      expect(() => pattern.render(newBuffer, 2000, newSize)).not.toThrow();
    });
  });
});
