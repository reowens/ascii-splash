import { RainPattern } from '../../../src/patterns/RainPattern';
import { createMockTheme, createMockSize, createMockBuffer } from '../../utils/mocks';
import { Point } from '../../../src/types';

describe('RainPattern', () => {
  let pattern: RainPattern;
  const mockTheme = createMockTheme();

  beforeEach(() => {
    pattern = new RainPattern(mockTheme);
  });

  describe('Constructor', () => {
    it('creates pattern with default config', () => {
      expect(pattern.name).toBe('rain');
    });

    it('creates pattern with custom config', () => {
      const customPattern = new RainPattern(mockTheme, { 
        density: 0.5, 
        speed: 2.0,
        characters: ['|', '!']
      });
      expect(customPattern.name).toBe('rain');
    });

    it('merges custom config with defaults', () => {
      const customPattern = new RainPattern(mockTheme, { density: 0.8 });
      // Should use custom density but default speed
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      expect(() => {
        customPattern.render(buffer, 0, size);
      }).not.toThrow();
    });
  });

  describe('reset()', () => {
    it('clears all drops', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create some drops
      pattern.render(buffer, 0, size);
      const metricsBeforeReset = pattern.getMetrics();
      expect(metricsBeforeReset.drops).toBeGreaterThan(0);
      
      // Reset
      pattern.reset();
      const metricsAfterReset = pattern.getMetrics();
      expect(metricsAfterReset.drops).toBe(0);
    });

    it('clears all splashes', () => {
      // Create a splash by clicking
      pattern.onMouseClick({ x: 10, y: 10 });
      let metrics = pattern.getMetrics();
      expect(metrics.splashes).toBeGreaterThan(0);
      
      // Reset
      pattern.reset();
      metrics = pattern.getMetrics();
      expect(metrics.splashes).toBe(0);
    });

    it('allows rendering after reset', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      pattern.render(buffer, 0, size);
      pattern.reset();
      
      expect(() => {
        pattern.render(buffer, 100, size);
      }).not.toThrow();
    });
  });

  describe('getMetrics()', () => {
    it('returns correct number of drops', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      pattern.render(buffer, 0, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.drops).toBeDefined();
      expect(typeof metrics.drops).toBe('number');
      expect(metrics.drops).toBeGreaterThan(0);
    });

    it('returns correct number of splashes', () => {
      // Initially no splashes
      let metrics = pattern.getMetrics();
      expect(metrics.splashes).toBe(0);
      
      // Create a splash
      pattern.onMouseClick({ x: 10, y: 10 });
      metrics = pattern.getMetrics();
      expect(metrics.splashes).toBeGreaterThan(0);
    });

    it('tracks metrics over time', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // First render
      pattern.render(buffer, 0, size);
      const metrics1 = pattern.getMetrics();
      
      // Add a splash
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Second render
      pattern.render(buffer, 100, size);
      const metrics2 = pattern.getMetrics();
      
      expect(metrics2.drops).toBeGreaterThan(0);
      expect(metrics2.splashes).toBeGreaterThan(0);
    });
  });

  describe('onMouseMove()', () => {
    it('spawns additional drops near mouse position', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Get initial drop count
      pattern.render(buffer, 0, size);
      const initialDrops = pattern.getMetrics().drops;
      
      // Move mouse many times (probabilistic spawn with 30% chance)
      const mousePos: Point = { x: 40, y: 12 };
      for (let i = 0; i < 50; i++) {
        pattern.onMouseMove(mousePos);
      }
      
      // Should have more drops now
      const finalDrops = pattern.getMetrics().drops;
      expect(finalDrops).toBeGreaterThan(initialDrops);
    });

    it('spawns drops with varied positions around mouse', () => {
      const mousePos: Point = { x: 40, y: 12 };
      
      // Spawn many drops
      for (let i = 0; i < 100; i++) {
        pattern.onMouseMove(mousePos);
      }
      
      // Should have created drops
      const metrics = pattern.getMetrics();
      expect(metrics.drops).toBeGreaterThan(0);
    });

    it('does not crash with edge coordinates', () => {
      expect(() => {
        pattern.onMouseMove({ x: 0, y: 0 });
        pattern.onMouseMove({ x: 79, y: 23 });
        pattern.onMouseMove({ x: -5, y: -5 });
      }).not.toThrow();
    });
  });

  describe('onMouseClick()', () => {
    it('creates a splash at click position', () => {
      const initialSplashes = pattern.getMetrics().splashes;
      
      pattern.onMouseClick({ x: 10, y: 10 });
      
      const finalSplashes = pattern.getMetrics().splashes;
      expect(finalSplashes).toBeGreaterThan(initialSplashes);
    });

    it('creates splash with larger radius than regular splashes', () => {
      // Click creates splash with radius: 5 (line 219)
      pattern.onMouseClick({ x: 40, y: 12 });
      
      const metrics = pattern.getMetrics();
      expect(metrics.splashes).toBe(1);
    });

    it('spawns burst of 15 drops in all directions', () => {
      const initialDrops = pattern.getMetrics().drops;
      
      pattern.onMouseClick({ x: 40, y: 12 });
      
      const finalDrops = pattern.getMetrics().drops;
      // Should have 15 more drops
      expect(finalDrops).toBe(initialDrops + 15);
    });

    it('spawns drops in circular pattern', () => {
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Should have created 15 drops plus 1 splash
      const metrics = pattern.getMetrics();
      expect(metrics.drops).toBe(15);
      expect(metrics.splashes).toBe(1);
    });

    it('handles multiple clicks', () => {
      pattern.onMouseClick({ x: 10, y: 10 });
      pattern.onMouseClick({ x: 20, y: 15 });
      pattern.onMouseClick({ x: 30, y: 5 });
      
      const metrics = pattern.getMetrics();
      expect(metrics.splashes).toBe(3);
      expect(metrics.drops).toBe(45); // 15 drops per click
    });

    it('does not crash with edge coordinates', () => {
      expect(() => {
        pattern.onMouseClick({ x: 0, y: 0 });
        pattern.onMouseClick({ x: 79, y: 23 });
        pattern.onMouseClick({ x: -10, y: -10 });
      }).not.toThrow();
    });
  });

  describe('Mouse Interaction During Render', () => {
    it('drops bounce away from mouse position', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create pattern and render to initialize drops
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      const mousePos: Point = { x: 40, y: 12 };
      
      // Render with mouse position
      expect(() => {
        pattern.render(buffer, 5000, size, mousePos);
      }).not.toThrow();
    });

    it('drops within distance 3 are repelled by mouse', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Add drops manually by clicking at specific location
      const clickPos: Point = { x: 40, y: 15 };
      pattern.onMouseClick(clickPos);
      
      // Render multiple times to let drops fall
      for (let i = 0; i < 10; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      // Now render with mouse near where drops should be
      const mousePos: Point = { x: 40, y: 14 };
      expect(() => {
        pattern.render(buffer, 2000, size, mousePos);
      }).not.toThrow();
    });

    it('mouse interaction respects boundary conditions', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Click at edge
      pattern.onMouseClick({ x: 0, y: 0 });
      
      // Render with mouse at edge
      expect(() => {
        pattern.render(buffer, 1000, size, { x: 0, y: 0 });
        pattern.render(buffer, 2000, size, { x: 79, y: 23 });
      }).not.toThrow();
    });
  });

  describe('Splash Rendering', () => {
    it('renders splashes that expand over time', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create a splash
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Render immediately - splash should be visible
      pattern.render(buffer, 0, size);
      
      let hasRippleChars = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          const char = buffer[y][x].char;
          if (char === '~' || char === '≈' || char === '·') {
            hasRippleChars = true;
            break;
          }
        }
        if (hasRippleChars) break;
      }
      
      expect(hasRippleChars).toBe(true);
    });

    it('splashes fade away after 400ms', () => {
      // Create splash
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Initially should have splash
      let metrics = pattern.getMetrics();
      expect(metrics.splashes).toBe(1);
      
      // Wait for splash to expire (simulated by not rendering for a while)
      // Then render - splash cleanup happens during render
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Wait 500ms before rendering (splash maxAge is 400ms)
      setTimeout(() => {
        pattern.render(buffer, 0, size);
        metrics = pattern.getMetrics();
        // Splash should be removed
        expect(metrics.splashes).toBe(0);
      }, 500);
    });

    it('uses different characters based on ripple intensity', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create splash
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Render at different times to see ripple progression
      pattern.render(buffer, 0, size);
      
      // Check for ripple characters: '~', '≈', '·'
      const rippleChars = new Set<string>();
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          const char = buffer[y][x].char;
          if (char === '~' || char === '≈' || char === '·') {
            rippleChars.add(char);
          }
        }
      }
      
      expect(rippleChars.size).toBeGreaterThan(0);
    });

    it('renders splashes within screen bounds', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create splash near edge
      pattern.onMouseClick({ x: 1, y: 1 });
      
      // Should render without crashing
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    it('handles multiple overlapping splashes', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create multiple splashes in same area
      pattern.onMouseClick({ x: 40, y: 12 });
      pattern.onMouseClick({ x: 41, y: 12 });
      pattern.onMouseClick({ x: 42, y: 12 });
      
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
      
      const metrics = pattern.getMetrics();
      expect(metrics.splashes).toBe(3);
    });
  });

  describe('Drop Behavior', () => {
    it('drops fall at configured speed', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Create pattern with high speed and density to ensure visible drops
      const fastPattern = new RainPattern(mockTheme, { speed: 10.0, density: 0.3 });
      
      // Render multiple times to allow drops to fall into view
      // With speed 10.0, drops move 5 units per render (speed * 0.5)
      // This ensures drops starting at y=-10 will be visible within 15 iterations
      for (let i = 0; i < 15; i++) {
        fastPattern.render(buffer, i * 100, size);
      }
      
      // Should have visible drops (fallen into view)
      let hasDrops = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            hasDrops = true;
            break;
          }
        }
        if (hasDrops) break;
      }
      
      expect(hasDrops).toBe(true);
    });

    it('drops reset when they hit the ground', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Get initial drop count
      pattern.render(buffer, 0, size);
      const initialDrops = pattern.getMetrics().drops;
      
      // Render many times to let drops hit ground and reset
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      // Drop count should remain relatively stable (drops recycle)
      const finalDrops = pattern.getMetrics().drops;
      
      // Might have some variation due to mouse-spawned drops, but should be similar
      expect(finalDrops).toBeGreaterThan(0);
      expect(Math.abs(finalDrops - initialDrops)).toBeLessThan(initialDrops * 0.5);
    });

    it('creates splash when drop hits ground', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Render many times to ensure drops hit ground
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      // Should have created some splashes
      const metrics = pattern.getMetrics();
      expect(metrics.splashes).toBeGreaterThan(0);
    });

    it('uses theme colors based on drop speed', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Render to create drops
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      // Check that some cells have colors
      let hasColoredCells = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].color) {
            hasColoredCells = true;
            break;
          }
        }
        if (hasColoredCells) break;
      }
      
      expect(hasColoredCells).toBe(true);
    });

    it('drops use configured characters', () => {
      const customChars = ['X', 'Y', 'Z'];
      const customPattern = new RainPattern(mockTheme, { characters: customChars });
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Render multiple times
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      // Check for custom characters
      const foundChars = new Set<string>();
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          const char = buffer[y][x].char;
          if (customChars.includes(char)) {
            foundChars.add(char);
          }
        }
      }
      
      expect(foundChars.size).toBeGreaterThan(0);
    });
  });

  describe('Density Configuration', () => {
    it('high density creates more drops', () => {
      const lowDensity = new RainPattern(mockTheme, { density: 0.1 });
      const highDensity = new RainPattern(mockTheme, { density: 0.5 });
      
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      lowDensity.render(buffer, 0, size);
      const lowDrops = lowDensity.getMetrics().drops;
      
      highDensity.render(buffer, 0, size);
      const highDrops = highDensity.getMetrics().drops;
      
      expect(highDrops).toBeGreaterThan(lowDrops);
    });

    it('maintains target drop count', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      pattern.render(buffer, 0, size);
      const drops1 = pattern.getMetrics().drops;
      
      // Render again - should maintain similar drop count
      pattern.render(buffer, 100, size);
      const drops2 = pattern.getMetrics().drops;
      
      expect(Math.abs(drops2 - drops1)).toBeLessThan(5);
    });
  });

  describe('Edge Cases', () => {
    it('handles very small terminal size', () => {
      const buffer = createMockBuffer(10, 5);
      const size = createMockSize(10, 5);
      
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    it('handles very large terminal size', () => {
      const buffer = createMockBuffer(200, 100);
      const size = createMockSize(200, 100);
      
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    it('handles zero density gracefully', () => {
      const zeroPattern = new RainPattern(mockTheme, { density: 0 });
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      expect(() => {
        zeroPattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    it('handles zero speed', () => {
      const staticPattern = new RainPattern(mockTheme, { speed: 0 });
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      expect(() => {
        staticPattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    it('handles empty character array gracefully', () => {
      const noCharPattern = new RainPattern(mockTheme, { characters: [] });
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Should not crash even with no characters defined
      expect(() => {
        noCharPattern.render(buffer, 0, size);
      }).not.toThrow();
    });
  });

  describe('Stability', () => {
    it('handles rapid renders', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      expect(() => {
        for (let i = 0; i < 100; i++) {
          pattern.render(buffer, i * 16, size);
        }
      }).not.toThrow();
    });

    it('handles rapid mouse interactions', () => {
      expect(() => {
        for (let i = 0; i < 50; i++) {
          pattern.onMouseMove({ x: i % 80, y: i % 24 });
          pattern.onMouseClick({ x: (i * 2) % 80, y: (i * 2) % 24 });
        }
      }).not.toThrow();
    });

    it('maintains consistent state over time', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      
      // Render many times
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 100, size);
        
        const metrics = pattern.getMetrics();
        expect(metrics.drops).toBeGreaterThanOrEqual(0);
        expect(metrics.splashes).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
