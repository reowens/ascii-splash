import { TunnelPattern } from '../../../src/patterns/TunnelPattern';
import { Cell, Point, Size, Theme } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('TunnelPattern', () => {
  let pattern: TunnelPattern;
  let theme: Theme;
  let buffer: Cell[][];
  let size: Size;

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new TunnelPattern(theme);
    size = { width: 80, height: 24 };
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('Constructor and Configuration', () => {
    test('should create with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('tunnel');
      
      const metrics = pattern.getMetrics();
      expect(metrics.rings).toBe(35); // Default ringCount
      expect(metrics.particles).toBe(60); // Default particleCount
      expect(metrics.boost).toBe(0);
    });

    test('should accept custom config', () => {
      const customPattern = new TunnelPattern(theme, {
        shape: 'square',
        ringCount: 50,
        speed: 3.0,
        particleCount: 100,
        speedLineCount: 30
      });
      
      const metrics = customPattern.getMetrics();
      expect(metrics.rings).toBe(50);
      expect(metrics.particles).toBe(100);
    });

    test('should merge partial config with defaults', () => {
      const partialPattern = new TunnelPattern(theme, { ringCount: 40 });
      const metrics = partialPattern.getMetrics();
      expect(metrics.rings).toBe(40);
      expect(metrics.particles).toBe(60); // Should use default
    });
  });

  describe('Rendering', () => {
    test('should render tunnel with rings', () => {
      pattern.render(buffer, 1000, size);
      
      const hasContent = buffer.some(row => 
        row.some(cell => cell.char !== ' ')
      );
      expect(hasContent).toBe(true);
    });

    test('should render vanishing point', () => {
      pattern.render(buffer, 1000, size);
      
      const centerX = Math.floor(size.width / 2);
      const centerY = Math.floor(size.height / 2);
      
      // The center should have a vanishing point marker
      expect(buffer[centerY][centerX].char).not.toBe(' ');
    });

    test('should animate rings moving forward', () => {
      pattern.render(buffer, 0, size);
      const buffer1 = JSON.stringify(buffer);
      
      pattern.render(buffer, 1000, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Rings should move, changing the buffer
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

    test('should use depth characters', () => {
      pattern.render(buffer, 1000, size);
      
      const depthChars = ['.', '·', '∘', '○', '◎', '◉', '●', '█'];
      const usedChars = new Set(
        buffer.flat()
          .filter(cell => cell.char !== ' ' && cell.char !== '+' && cell.char !== '-' && cell.char !== '=')
          .map(cell => cell.char)
      );
      
      // At least some used characters should be depth chars
      let hasDepthChars = false;
      usedChars.forEach(char => {
        if (depthChars.includes(char)) {
          hasDepthChars = true;
        }
      });
      
      expect(hasDepthChars).toBe(true);
    });

    test('should render streaming particles', () => {
      pattern.render(buffer, 1000, size);
      
      // Particles use '●', '○', '·' characters
      const particleChars = ['●', '○', '·'];
      const hasParticles = buffer.flat().some(cell => 
        particleChars.includes(cell.char)
      );
      
      expect(hasParticles).toBe(true);
    });

    test('should render speed lines', () => {
      // Use high speed with minimal rings/particles so speed lines are visible
      const fastPattern = new TunnelPattern(theme, { 
        speed: 5.0, 
        speedLineCount: 30,
        ringCount: 5,  // Fewer rings to reduce occlusion
        particleCount: 10  // Fewer particles to reduce occlusion
      });
      
      // Render multiple times to ensure we catch speed lines at various phases
      let hasSpeedLines = false;
      for (let t = 0; t < 10 && !hasSpeedLines; t++) {
        const testBuffer = createMockBuffer(size.width, size.height);
        fastPattern.render(testBuffer, t * 100, size);
        
        // Speed lines use '-' or '=' characters
        const speedLineChars = ['-', '='];
        hasSpeedLines = testBuffer.flat().some(cell => 
          speedLineChars.includes(cell.char)
        );
      }
      
      expect(hasSpeedLines).toBe(true);
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

    test('should not render outside buffer bounds', () => {
      pattern.render(buffer, 1000, size);
      
      buffer.forEach((row, y) => {
        expect(y).toBeLessThan(size.height);
        row.forEach((cell, x) => {
          expect(x).toBeLessThan(size.width);
        });
      });
    });

    test('should rotate rings over time', () => {
      const rotatingPattern = new TunnelPattern(theme, { rotationSpeed: 0.5 });
      
      rotatingPattern.render(buffer, 0, size);
      const buffer1 = JSON.stringify(buffer);
      
      rotatingPattern.render(buffer, 2000, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Rotation should change the pattern
      expect(buffer1).not.toBe(buffer2);
    });
  });

  describe('Tunnel Shapes', () => {
    test('should render circle tunnel', () => {
      const circlePattern = new TunnelPattern(theme, { shape: 'circle' });
      expect(() => circlePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should render square tunnel', () => {
      const squarePattern = new TunnelPattern(theme, { shape: 'square' });
      expect(() => squarePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should render hexagon tunnel', () => {
      const hexPattern = new TunnelPattern(theme, { shape: 'hexagon' });
      expect(() => hexPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should render star tunnel', () => {
      const starPattern = new TunnelPattern(theme, { shape: 'star' });
      expect(() => starPattern.render(buffer, 1000, size)).not.toThrow();
    });
  });

  describe('Mouse Interactions', () => {
    test('should handle mouse click', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.boost).toBe(1); // Boost should be active
    });

    test('should activate boost mode on click', () => {
      expect(pattern.getMetrics().boost).toBe(0);
      
      pattern.onMouseClick({ x: 40, y: 12 });
      
      expect(pattern.getMetrics().boost).toBe(1);
    });

    test('should render boost effect at center', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      pattern.render(buffer, 1000, size);
      
      const centerX = Math.floor(size.width / 2);
      const centerY = Math.floor(size.height / 2);
      
      // Check for boost glow around center
      const nearbyChars = [
        buffer[centerY]?.[centerX]?.char,
        buffer[centerY - 1]?.[centerX]?.char,
        buffer[centerY + 1]?.[centerX]?.char,
        buffer[centerY]?.[centerX - 1]?.char,
        buffer[centerY]?.[centerX + 1]?.char,
      ].filter(char => char && char !== ' ');
      
      expect(nearbyChars.length).toBeGreaterThan(0);
    });

    test('should deactivate boost after timeout', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().boost).toBe(1);
      
      // Render at time beyond boost duration (2 seconds)
      pattern.render(buffer, 3000, size);
      
      const metrics = pattern.getMetrics();
      expect(metrics.boost).toBe(0);
    });

    test('should handle mouse move for parallax', () => {
      const movePos: Point = { x: 50, y: 15 };
      
      expect(() => pattern.onMouseMove(movePos)).not.toThrow();
      
      // Render to see parallax effect
      pattern.render(buffer, 1000, size);
      
      expect(() => pattern.render(buffer, 1100, size)).not.toThrow();
    });

    test('should handle clicks at edge positions', () => {
      pattern.onMouseClick({ x: 0, y: 0 });
      
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
      expect(pattern.getMetrics().boost).toBe(1);
    });

    test('should handle multiple clicks', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      pattern.render(buffer, 1000, size);
      
      // Click again to reset boost timer
      pattern.onMouseClick({ x: 45, y: 12 });
      
      expect(pattern.getMetrics().boost).toBe(1);
    });
  });

  describe('Presets', () => {
    test('should have 6 presets', () => {
      const presets = TunnelPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    test('should get preset by id', () => {
      const preset = TunnelPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(1);
      expect(preset?.name).toBe('Warp Speed');
    });

    test('should return undefined for invalid preset id', () => {
      const preset = TunnelPattern.getPreset(999);
      expect(preset).toBeUndefined();
    });

    describe('Preset 1: Warp Speed', () => {
      test('should apply Warp Speed preset', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.rings).toBe(35);
        expect(metrics.particles).toBe(80);
      });

      test('should render with Warp Speed config', () => {
        pattern.applyPreset(1);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 2: Hyperspace Jump', () => {
      test('should apply Hyperspace Jump preset', () => {
        const result = pattern.applyPreset(2);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.rings).toBe(40);
        expect(metrics.particles).toBe(100);
      });

      test('should render with Hyperspace Jump config', () => {
        pattern.applyPreset(2);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 3: Gentle Cruise', () => {
      test('should apply Gentle Cruise preset', () => {
        const result = pattern.applyPreset(3);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.rings).toBe(25);
        expect(metrics.particles).toBe(30);
      });

      test('should render with Gentle Cruise config', () => {
        pattern.applyPreset(3);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 4: Asteroid Tunnel', () => {
      test('should apply Asteroid Tunnel preset', () => {
        const result = pattern.applyPreset(4);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.rings).toBe(30);
        expect(metrics.particles).toBe(60);
      });

      test('should render with Asteroid Tunnel config', () => {
        pattern.applyPreset(4);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 5: Stargate', () => {
      test('should apply Stargate preset', () => {
        const result = pattern.applyPreset(5);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.rings).toBe(30);
        expect(metrics.particles).toBe(50);
      });

      test('should render with Stargate config', () => {
        pattern.applyPreset(5);
        pattern.render(buffer, 1000, size);
        
        const hasContent = buffer.some(row => 
          row.some(cell => cell.char !== ' ')
        );
        expect(hasContent).toBe(true);
      });
    });

    describe('Preset 6: Lightspeed', () => {
      test('should apply Lightspeed preset', () => {
        const result = pattern.applyPreset(6);
        expect(result).toBe(true);
        
        const metrics = pattern.getMetrics();
        expect(metrics.rings).toBe(50);
        expect(metrics.particles).toBe(120);
      });

      test('should render with Lightspeed config', () => {
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
      // Activate boost
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().boost).toBe(1);
      
      // Apply preset should reset
      pattern.applyPreset(1);
      expect(pattern.getMetrics().boost).toBe(0);
    });
  });

  describe('Reset', () => {
    test('should clear boost state', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().boost).toBe(1);
      
      pattern.reset();
      expect(pattern.getMetrics().boost).toBe(0);
    });

    test('should reinitialize rings', () => {
      const metrics1 = pattern.getMetrics();
      const ringCount1 = metrics1.rings;
      
      pattern.reset();
      
      const metrics2 = pattern.getMetrics();
      const ringCount2 = metrics2.rings;
      
      // Ring count should remain the same (config-based)
      expect(ringCount1).toBe(ringCount2);
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

    test('should reset vanishing point offset', () => {
      pattern.onMouseMove({ x: 60, y: 18 });
      pattern.reset();
      pattern.render(buffer, 0, size);
      
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
    });
  });

  describe('Metrics', () => {
    test('should return correct metrics structure', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toHaveProperty('rings');
      expect(metrics).toHaveProperty('particles');
      expect(metrics).toHaveProperty('boost');
    });

    test('should return correct ring count', () => {
      const customPattern = new TunnelPattern(theme, { ringCount: 50 });
      const metrics = customPattern.getMetrics();
      
      expect(metrics.rings).toBe(50);
    });

    test('should return correct particle count', () => {
      const customPattern = new TunnelPattern(theme, { particleCount: 100 });
      const metrics = customPattern.getMetrics();
      
      expect(metrics.particles).toBe(100);
    });

    test('should track boost state', () => {
      expect(pattern.getMetrics().boost).toBe(0);
      
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().boost).toBe(1);
    });

    test('should have numeric metric values', () => {
      const metrics = pattern.getMetrics();
      
      expect(typeof metrics.rings).toBe('number');
      expect(typeof metrics.particles).toBe('number');
      expect(typeof metrics.boost).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero ring count', () => {
      const zeroPattern = new TunnelPattern(theme, { ringCount: 0 });
      
      expect(() => zeroPattern.render(buffer, 1000, size)).not.toThrow();
      expect(zeroPattern.getMetrics().rings).toBe(0);
    });

    test('should handle extreme ring count', () => {
      const extremePattern = new TunnelPattern(theme, { ringCount: 100 });
      
      expect(() => extremePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero speed', () => {
      const staticPattern = new TunnelPattern(theme, { speed: 0, rotationSpeed: 0, turbulence: 0 });
      
      staticPattern.render(buffer, 1000, size);
      const buffer1 = JSON.stringify(buffer);
      
      staticPattern.render(buffer, 1000, size); // Same time
      const buffer2 = JSON.stringify(buffer);
      
      // With zero speed and rotation, rendering at the same time should be identical
      expect(buffer1).toBe(buffer2);
    });

    test('should handle negative speed', () => {
      const reversePattern = new TunnelPattern(theme, { speed: -1.0 });
      
      expect(() => reversePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle very high speed', () => {
      const fastPattern = new TunnelPattern(theme, { speed: 10.0 });
      
      expect(() => fastPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero particle count', () => {
      const emptyPattern = new TunnelPattern(theme, { particleCount: 0 });
      
      expect(() => emptyPattern.render(buffer, 1000, size)).not.toThrow();
      expect(emptyPattern.getMetrics().particles).toBe(0);
    });

    test('should handle very high particle count', () => {
      const densePattern = new TunnelPattern(theme, { particleCount: 300 });
      
      expect(() => densePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero turbulence', () => {
      const calmPattern = new TunnelPattern(theme, { turbulence: 0 });
      
      expect(() => calmPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle high turbulence', () => {
      const chaoticPattern = new TunnelPattern(theme, { turbulence: 1.0 });
      
      expect(() => chaoticPattern.render(buffer, 1000, size)).not.toThrow();
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
      for (let i = 0; i < 20; i++) {
        pattern.onMouseClick({ x: 40 + i % 10, y: 12 });
      }
      
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

    test('should handle boost timeout edge case', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Render exactly at boost end time
      pattern.render(buffer, 1000, size);
      pattern.render(buffer, 3000, size);
      
      expect(pattern.getMetrics().boost).toBe(0);
    });
  });
});
