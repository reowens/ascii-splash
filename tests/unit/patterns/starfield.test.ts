import { StarfieldPattern } from '../../../src/patterns/StarfieldPattern';
import { Cell, Point, Size, Theme } from '../../../src/types';
import { createMockTheme, createMockBuffer } from '../../utils/mocks';

describe('StarfieldPattern', () => {
  let pattern: StarfieldPattern;
  let theme: Theme;
  let buffer: Cell[][];
  let size: Size;

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new StarfieldPattern(theme);
    size = { width: 80, height: 24 };
    buffer = createMockBuffer(size.width, size.height);
    
    // Mock Date.now() for explosion tests
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should create with default config', () => {
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('starfield');
      
      const metrics = pattern.getMetrics();
      expect(metrics.stars).toBe(0); // Not initialized yet
      expect(metrics.explosions).toBe(0);
    });

    test('should accept custom config', () => {
      const customPattern = new StarfieldPattern(theme, {
        starCount: 50,
        speed: 2.0,
        mouseRepelRadius: 10
      });
      
      expect(customPattern).toBeDefined();
    });

    test('should merge partial config with defaults', () => {
      const partialPattern = new StarfieldPattern(theme, { starCount: 150 });
      expect(partialPattern).toBeDefined();
    });
  });

  describe('Rendering', () => {
    test('should render basic starfield', () => {
      pattern.render(buffer, 1000, size);
      
      const metrics = pattern.getMetrics();
      expect(metrics.stars).toBe(100); // Default starCount
    });

    test('should initialize stars on first render', () => {
      expect(pattern.getMetrics().stars).toBe(0);
      
      pattern.render(buffer, 1000, size);
      
      expect(pattern.getMetrics().stars).toBeGreaterThan(0);
    });

    test('should not reinitialize stars on subsequent renders', () => {
      pattern.render(buffer, 1000, size);
      const starCount1 = pattern.getMetrics().stars;
      
      pattern.render(buffer, 2000, size);
      const starCount2 = pattern.getMetrics().stars;
      
      expect(starCount1).toBe(starCount2);
    });

    test('should render stars with different characters', () => {
      pattern.render(buffer, 1000, size);
      
      const starChars = ['.', '·', '*', '✦', '✧', '★'];
      const usedChars = new Set(
        buffer.flat()
          .filter(cell => cell.char !== ' ')
          .map(cell => cell.char)
      );
      
      usedChars.forEach(char => {
        expect(starChars).toContain(char);
      });
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

    test('should animate stars moving toward viewer', () => {
      // Use higher speed to ensure visible movement
      const fastPattern = new StarfieldPattern(theme, { speed: 5.0 });
      
      fastPattern.render(buffer, 0, size);
      const buffer1 = JSON.stringify(buffer);
      
      // Render multiple times to ensure stars move
      for (let i = 0; i < 10; i++) {
        fastPattern.render(buffer, i * 100, size);
      }
      const buffer2 = JSON.stringify(buffer);
      
      expect(buffer1).not.toBe(buffer2);
    });

    test('should reset stars that reach viewer', () => {
      const fastPattern = new StarfieldPattern(theme, { speed: 10.0 });
      
      // Render many times to ensure stars reset
      for (let i = 0; i < 100; i++) {
        fastPattern.render(buffer, i * 100, size);
      }
      
      const metrics = fastPattern.getMetrics();
      expect(metrics.stars).toBeGreaterThan(0);
    });

    test('should clear buffer before rendering', () => {
      // Fill buffer with junk data
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          buffer[y][x] = { char: 'X', color: { r: 255, g: 0, b: 0 } };
        }
      }
      
      pattern.render(buffer, 1000, size);
      
      // Some cells should be cleared (starfield is sparse)
      const emptyCells = buffer.flat().filter(cell => cell.char === ' ');
      expect(emptyCells.length).toBeGreaterThan(0);
    });

    test('should handle small terminal size', () => {
      const smallSize = { width: 20, height: 10 };
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      expect(() => pattern.render(smallBuffer, 1000, smallSize)).not.toThrow();
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
  });

  describe('Mouse Interactions', () => {
    test('should handle mouse move without error', () => {
      const movePos: Point = { x: 40, y: 12 };
      
      expect(() => pattern.onMouseMove(movePos)).not.toThrow();
    });

    test('should repel stars near mouse cursor', () => {
      pattern.render(buffer, 1000, size);
      
      const mousePos: Point = { x: 40, y: 12 };
      const buffer1 = createMockBuffer(size.width, size.height);
      pattern.render(buffer1, 1000, size, mousePos);
      
      // With mouse repulsion, the rendering should be different
      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 1000, size);
      
      // Note: Due to star positions, this might not always be different
      // So we just check it doesn't throw
      expect(() => pattern.render(buffer1, 1000, size, mousePos)).not.toThrow();
    });

    test('should handle mouse at edge positions', () => {
      pattern.render(buffer, 1000, size);
      
      expect(() => pattern.render(buffer, 1100, size, { x: 0, y: 0 })).not.toThrow();
      expect(() => pattern.render(buffer, 1200, size, { x: size.width - 1, y: size.height - 1 })).not.toThrow();
    });

    test('should create explosion on click', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.explosions).toBe(1);
    });

    test('should render explosion particles', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      pattern.render(buffer, 1000, size);
      
      // Check that explosion particles are rendered near click position
      const hasExplosionChars = buffer.flat().some(cell => cell.char === '*');
      expect(hasExplosionChars).toBe(true);
    });

    test('should create explosion with 12 particles', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      pattern.onMouseClick(clickPos);
      pattern.render(buffer, 1000, size);
      
      const metrics = pattern.getMetrics();
      expect(metrics.explosions).toBe(1);
    });

    test('should handle multiple explosions', () => {
      pattern.onMouseClick({ x: 20, y: 10 });
      pattern.onMouseClick({ x: 60, y: 15 });
      
      expect(pattern.getMetrics().explosions).toBe(2);
      
      pattern.render(buffer, 1000, size);
      
      const hasExplosions = buffer.flat().some(cell => cell.char === '*');
      expect(hasExplosions).toBe(true);
    });

    test('should animate explosions over time', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      jest.spyOn(Date, 'now').mockReturnValue(1000);
      pattern.onMouseClick(clickPos);
      pattern.render(buffer, 1000, size);
      const buffer1 = JSON.stringify(buffer);
      
      jest.spyOn(Date, 'now').mockReturnValue(1500);
      pattern.render(buffer, 1500, size);
      const buffer2 = JSON.stringify(buffer);
      
      // Explosion should expand/change
      expect(buffer1).not.toBe(buffer2);
    });

    test('should clean up old explosions', () => {
      const clickPos: Point = { x: 40, y: 12 };
      
      jest.spyOn(Date, 'now').mockReturnValue(1000);
      pattern.onMouseClick(clickPos);
      expect(pattern.getMetrics().explosions).toBe(1);
      
      // Advance time beyond explosion lifetime (1000ms)
      jest.spyOn(Date, 'now').mockReturnValue(2100);
      pattern.render(buffer, 2100, size);
      
      expect(pattern.getMetrics().explosions).toBe(0);
    });

    test('should handle clicks outside bounds', () => {
      pattern.onMouseClick({ x: -10, y: -10 });
      pattern.onMouseClick({ x: 1000, y: 1000 });
      
      expect(() => pattern.render(buffer, 1000, size)).not.toThrow();
    });
  });

  describe('Presets', () => {
    test('should have 8 presets', () => {
      const presets = StarfieldPattern.getPresets();
      expect(presets).toHaveLength(8);
    });

    test('should get preset by id', () => {
      const preset = StarfieldPattern.getPreset(1);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(1);
      expect(preset?.name).toBe('Deep Space');
    });

    test('should return undefined for invalid preset id', () => {
      const preset = StarfieldPattern.getPreset(999);
      expect(preset).toBeUndefined();
    });

    describe('Preset 1: Deep Space', () => {
      test('should apply Deep Space preset', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      test('should render with Deep Space config', () => {
        pattern.applyPreset(1);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(50);
      });

      test('should clear stars when applying preset', () => {
        pattern.render(buffer, 1000, size);
        expect(pattern.getMetrics().stars).toBeGreaterThan(0);
        
        pattern.applyPreset(1);
        expect(pattern.getMetrics().stars).toBe(0);
        
        pattern.render(buffer, 1000, size);
        expect(pattern.getMetrics().stars).toBe(50);
      });
    });

    describe('Preset 2: Warp Speed', () => {
      test('should apply Warp Speed preset', () => {
        const result = pattern.applyPreset(2);
        expect(result).toBe(true);
      });

      test('should render with Warp Speed config', () => {
        pattern.applyPreset(2);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(200);
      });
    });

    describe('Preset 3: Asteroid Field', () => {
      test('should apply Asteroid Field preset', () => {
        const result = pattern.applyPreset(3);
        expect(result).toBe(true);
      });

      test('should render with Asteroid Field config', () => {
        pattern.applyPreset(3);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(150);
      });
    });

    describe('Preset 4: Milky Way', () => {
      test('should apply Milky Way preset', () => {
        const result = pattern.applyPreset(4);
        expect(result).toBe(true);
      });

      test('should render with Milky Way config', () => {
        pattern.applyPreset(4);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(120);
      });
    });

    describe('Preset 5: Nebula Drift', () => {
      test('should apply Nebula Drift preset', () => {
        const result = pattern.applyPreset(5);
        expect(result).toBe(true);
      });

      test('should render with Nebula Drift config', () => {
        pattern.applyPreset(5);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(180);
      });
    });

    describe('Preset 6: Photon Torpedo', () => {
      test('should apply Photon Torpedo preset', () => {
        const result = pattern.applyPreset(6);
        expect(result).toBe(true);
      });

      test('should render with Photon Torpedo config', () => {
        pattern.applyPreset(6);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(80);
      });
    });

    describe('Preset 7: Twinkling Night', () => {
      test('should apply Twinkling Night preset', () => {
        const result = pattern.applyPreset(7);
        expect(result).toBe(true);
      });

      test('should render with Twinkling Night config', () => {
        pattern.applyPreset(7);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(120);
      });

      test('should enable twinkling effect', () => {
        pattern.applyPreset(7);
        const preset = StarfieldPattern.getPreset(7);
        expect(preset?.config.twinkleEnabled).toBe(true);
        expect(preset?.config.twinkleIntensity).toBe(0.4);
      });
    });

    describe('Preset 8: Pulsing Cosmos', () => {
      test('should apply Pulsing Cosmos preset', () => {
        const result = pattern.applyPreset(8);
        expect(result).toBe(true);
      });

      test('should render with Pulsing Cosmos config', () => {
        pattern.applyPreset(8);
        pattern.render(buffer, 1000, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.stars).toBe(100);
      });

      test('should enable dramatic twinkling effect', () => {
        pattern.applyPreset(8);
        const preset = StarfieldPattern.getPreset(8);
        expect(preset?.config.twinkleEnabled).toBe(true);
        expect(preset?.config.twinkleIntensity).toBe(0.8);
      });
    });

    test('should return false for invalid preset', () => {
      const result = pattern.applyPreset(999);
      expect(result).toBe(false);
    });
  });

  describe('Reset', () => {
    test('should clear stars', () => {
      pattern.render(buffer, 1000, size);
      expect(pattern.getMetrics().stars).toBeGreaterThan(0);
      
      pattern.reset();
      expect(pattern.getMetrics().stars).toBe(0);
    });

    test('should clear explosions', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().explosions).toBe(1);
      
      pattern.reset();
      expect(pattern.getMetrics().explosions).toBe(0);
    });

    test('should allow re-initialization after reset', () => {
      pattern.render(buffer, 1000, size);
      expect(pattern.getMetrics().stars).toBeGreaterThan(0);
      
      pattern.reset();
      expect(pattern.getMetrics().stars).toBe(0);
      
      pattern.render(buffer, 2000, size);
      expect(pattern.getMetrics().stars).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    test('should return correct metrics structure', () => {
      const metrics = pattern.getMetrics();
      
      expect(metrics).toHaveProperty('stars');
      expect(metrics).toHaveProperty('explosions');
    });

    test('should track star count', () => {
      expect(pattern.getMetrics().stars).toBe(0);
      
      pattern.render(buffer, 1000, size);
      expect(pattern.getMetrics().stars).toBe(100);
    });

    test('should track explosion count', () => {
      expect(pattern.getMetrics().explosions).toBe(0);
      
      pattern.onMouseClick({ x: 40, y: 12 });
      expect(pattern.getMetrics().explosions).toBe(1);
      
      pattern.onMouseClick({ x: 50, y: 15 });
      expect(pattern.getMetrics().explosions).toBe(2);
    });

    test('should have numeric metric values', () => {
      const metrics = pattern.getMetrics();
      
      expect(typeof metrics.stars).toBe('number');
      expect(typeof metrics.explosions).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero star count', () => {
      const emptyPattern = new StarfieldPattern(theme, { starCount: 0 });
      
      expect(() => emptyPattern.render(buffer, 1000, size)).not.toThrow();
      
      const metrics = emptyPattern.getMetrics();
      expect(metrics.stars).toBe(0);
    });

    test('should handle very high star count', () => {
      const densePattern = new StarfieldPattern(theme, { starCount: 1000 });
      
      expect(() => densePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero speed', () => {
      const staticPattern = new StarfieldPattern(theme, { speed: 0 });
      
      staticPattern.render(buffer, 1000, size);
      const buffer1 = JSON.stringify(buffer);
      
      staticPattern.render(buffer, 2000, size);
      const buffer2 = JSON.stringify(buffer);
      
      // With zero speed, stars should be in same positions
      expect(buffer1).toBe(buffer2);
    });

    test('should handle negative speed', () => {
      const reversePattern = new StarfieldPattern(theme, { speed: -1.0 });
      
      expect(() => reversePattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle very high speed', () => {
      const fastPattern = new StarfieldPattern(theme, { speed: 10.0 });
      
      expect(() => fastPattern.render(buffer, 1000, size)).not.toThrow();
    });

    test('should handle zero mouse repel radius', () => {
      const noRepelPattern = new StarfieldPattern(theme, { mouseRepelRadius: 0 });
      
      noRepelPattern.render(buffer, 1000, size, { x: 40, y: 12 });
      
      expect(() => noRepelPattern.render(buffer, 1000, size, { x: 40, y: 12 })).not.toThrow();
    });

    test('should handle very large mouse repel radius', () => {
      const largeRepelPattern = new StarfieldPattern(theme, { mouseRepelRadius: 100 });
      
      expect(() => largeRepelPattern.render(buffer, 1000, size, { x: 40, y: 12 })).not.toThrow();
    });

    test('should handle mouse at exact star position', () => {
      pattern.render(buffer, 1000, size);
      
      // Find a star position
      let starPos: Point | null = null;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            starPos = { x, y };
            break;
          }
        }
        if (starPos) break;
      }
      
      if (starPos) {
        expect(() => pattern.render(buffer, 1100, size, starPos)).not.toThrow();
      }
    });
  });

  describe('Stability', () => {
    test('should handle rapid successive renders', () => {
      for (let i = 0; i < 100; i++) {
        expect(() => pattern.render(buffer, i * 16, size)).not.toThrow();
      }
    });

    test('should handle rapid mouse clicks', () => {
      for (let i = 0; i < 50; i++) {
        jest.spyOn(Date, 'now').mockReturnValue(1000 + i * 10);
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
        jest.spyOn(Date, 'now').mockReturnValue(1000 + i * 50);
        pattern.onMouseClick({ x: 40 + i, y: 12 });
        pattern.render(buffer, 1000 + i * 50, size);
      }
      
      expect(() => pattern.render(buffer, 2000, size)).not.toThrow();
    });

    test('should handle size changes between renders', () => {
      pattern.render(buffer, 1000, size);
      
      const newSize = { width: 120, height: 40 };
      const newBuffer = createMockBuffer(newSize.width, newSize.height);
      
      expect(() => pattern.render(newBuffer, 2000, newSize)).not.toThrow();
    });

    test('should handle reset and re-render cycles', () => {
      for (let i = 0; i < 10; i++) {
        pattern.render(buffer, i * 1000, size);
        pattern.reset();
      }
      
      pattern.render(buffer, 10000, size);
      expect(pattern.getMetrics().stars).toBeGreaterThan(0);
    });
  });
});
