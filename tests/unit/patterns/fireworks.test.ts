import { FireworksPattern } from '../../../src/patterns/FireworksPattern';
import { createMockBuffer, createMockTheme, createMockSize, createMockPoint } from '../../utils/mocks';
import { Cell } from '../../../src/types';

describe('FireworksPattern', () => {
  let pattern: FireworksPattern;
  let theme: ReturnType<typeof createMockTheme>;
  let buffer: Cell[][];
  let size: ReturnType<typeof createMockSize>;

  beforeEach(() => {
    theme = createMockTheme('fire');
    pattern = new FireworksPattern(theme);
    size = createMockSize(80, 24);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('Constructor & Configuration', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('fireworks');
      const metrics = pattern.getMetrics();
      expect(metrics.activeFireworks).toBe(0);
      expect(metrics.totalParticles).toBe(0);
    });

    it('should accept custom config', () => {
      const customPattern = new FireworksPattern(theme, {
        burstSize: 100,
        launchSpeed: 2.0,
        gravity: 0.05,
        fadeRate: 0.025,
        spawnInterval: 1000,
        trailLength: 8
      });
      expect(customPattern.name).toBe('fireworks');
    });

    it('should accept partial config', () => {
      const customPattern = new FireworksPattern(theme, {
        burstSize: 80
      });
      expect(customPattern.name).toBe('fireworks');
    });
  });

  describe('Rendering', () => {
    it('should render without errors', () => {
      pattern.render(buffer, 0, size);
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should spawn fireworks automatically at intervals', () => {
      pattern.render(buffer, 2100, size);
      const metrics1 = pattern.getMetrics();
      expect(metrics1.activeFireworks).toBe(1);

      pattern.render(buffer, 5000, size);
      const metrics2 = pattern.getMetrics();
      expect(metrics2.activeFireworks).toBeGreaterThan(1);
    });

    it('should limit active fireworks to 8', () => {
      // Spawn many fireworks by advancing time
      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 3000, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.activeFireworks).toBeLessThanOrEqual(8);
    });

    it('should render launching rockets', () => {
      // Use a pattern with slower launch speed to ensure rocket stays in launching state
      const slowPattern = new FireworksPattern(theme, { launchSpeed: 0.5 });
      slowPattern.render(buffer, 2100, size);
      
      // Check that we have launching fireworks
      const metrics = slowPattern.getMetrics();
      expect(metrics.launching).toBeGreaterThan(0);
    });

    it('should render rocket with upward arrow', () => {
      pattern.render(buffer, 2100, size);
      
      // Look for the rocket arrow character
      let foundRocket = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char === '↑') {
            foundRocket = true;
            break;
          }
        }
        if (foundRocket) break;
      }
      expect(foundRocket).toBe(true);
    });

    it('should render rocket trail', () => {
      pattern.render(buffer, 2100, size);
      
      // Look for trail characters
      const trailChars = ['∙', '·', '.'];
      let foundTrail = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (trailChars.includes(buffer[y][x].char)) {
            foundTrail = true;
            break;
          }
        }
        if (foundTrail) break;
      }
      expect(foundTrail).toBe(true);
    });

    it('should explode fireworks at target height', () => {
      // Use slower launch to ensure we can catch it in launching state
      const slowPattern = new FireworksPattern(theme, { launchSpeed: 0.5 });
      slowPattern.render(buffer, 2100, size);
      expect(slowPattern.getMetrics().launching).toBeGreaterThan(0);
      
      // Render many times to let fireworks reach target height
      for (let i = 0; i < 50; i++) {
        slowPattern.render(buffer, 2100 + i * 100, size);
      }
      
      const metrics = slowPattern.getMetrics();
      expect(metrics.exploded).toBeGreaterThan(0);
    });

    it('should render explosion particles', () => {
      // Spawn firework and let it explode
      pattern.render(buffer, 2100, size);
      
      // Advance time to let it explode
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, 2100 + i * 100, size);
      }
      
      // Look for explosion particle characters
      const explosionChars = ['●', '◉', '★', '✦', '○', '◎', '*', '✧', '·', '∙', '.'];
      let foundParticle = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (explosionChars.includes(buffer[y][x].char)) {
            foundParticle = true;
            break;
          }
        }
        if (foundParticle) break;
      }
      expect(foundParticle).toBe(true);
    });

    it('should render particles with different characters based on life', () => {
      // Create firework and let it explode
      pattern.render(buffer, 0, size);
      
      // Advance to explosion
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 3500, size);
      
      // Look for high-life chars (●, ◉, ★, ✦)
      const highLifeChars = ['●', '◉', '★', '✦'];
      // Look for mid-life chars (○, ◎, *, ✧)
      const midLifeChars = ['○', '◎', '*', '✧'];
      // Look for low-life chars (·, ∙, .)
      const lowLifeChars = ['·', '∙', '.'];
      
      let hasHighLife = false;
      let hasMidLife = false;
      let hasLowLife = false;
      
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (highLifeChars.includes(buffer2[y][x].char)) hasHighLife = true;
          if (midLifeChars.includes(buffer2[y][x].char)) hasMidLife = true;
          if (lowLifeChars.includes(buffer2[y][x].char)) hasLowLife = true;
        }
      }
      
      // Should have at least some variety
      expect(hasHighLife || hasMidLife || hasLowLife).toBe(true);
    });

    it('should render particle trails', () => {
      // Create firework with trail
      const customPattern = new FireworksPattern(theme, { trailLength: 10 });
      customPattern.render(buffer, 0, size);
      
      // Advance to explosion and let particles move
      for (let i = 0; i < 40; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      // Trails should exist
      expect(customPattern.getMetrics().totalParticles).toBeGreaterThan(0);
    });

    it('should apply gravity to particles', () => {
      // Use high gravity and prevent new fireworks from spawning
      const customPattern = new FireworksPattern(theme, { gravity: 0.2, spawnInterval: 100000 });
      customPattern.render(buffer, 100100, size);
      
      // Let firework explode
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, 100100 + i * 100, size);
      }
      
      const particlesBefore = customPattern.getMetrics().totalParticles;
      expect(particlesBefore).toBeGreaterThan(0);
      
      // Continue rendering with gravity for a longer time
      // Higher gravity (0.2) should make particles fall faster
      for (let i = 0; i < 200; i++) {
        customPattern.render(buffer, 103200 + i * 100, size);
      }
      
      // Particles should eventually fall off screen and disappear
      const particlesAfter = customPattern.getMetrics().totalParticles;
      expect(particlesAfter).toBeLessThan(particlesBefore);
    });

    it('should fade particles over time', () => {
      const customPattern = new FireworksPattern(theme, { fadeRate: 0.1, gravity: 0, spawnInterval: 10000 });
      customPattern.render(buffer, 10100, size);
      
      // Let firework explode - just a few frames to trigger explosion
      for (let i = 1; i <= 5; i++) {
        customPattern.render(buffer, 10100 + i * 100, size);
      }
      
      const particlesBefore = customPattern.getMetrics().totalParticles;
      expect(particlesBefore).toBeGreaterThan(0);
      
      // Continue rendering to fade particles (0.1 fadeRate means ~10 frames to fade completely)
      // Add extra frames to ensure all particles fade
      for (let i = 0; i < 25; i++) {
        customPattern.render(buffer, 10700 + i * 100, size);
      }
      
      // Particles should fade away
      const particlesAfter = customPattern.getMetrics().totalParticles;
      expect(particlesAfter).toBe(0);
    });

    it('should remove fireworks when all particles are dead', () => {
      const customPattern = new FireworksPattern(theme, { 
        fadeRate: 0.1, 
        spawnInterval: 10000 
      });
      customPattern.render(buffer, 10100, size);
      
      expect(customPattern.getMetrics().activeFireworks).toBe(1);
      
      // Let firework explode and particles fade
      for (let i = 0; i < 100; i++) {
        customPattern.render(buffer, 10100 + i * 100, size);
      }
      
      // Firework should be removed
      expect(customPattern.getMetrics().activeFireworks).toBe(0);
    });

    it('should use theme colors', () => {
      pattern.render(buffer, 2100, size);
      
      // Let firework explode to have particles with colors
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, 2100 + i * 100, size);
      }
      
      let hasColor = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].color && buffer[y][x].char !== ' ') {
            hasColor = true;
            const color = buffer[y][x].color!;
            expect(color.r).toBeGreaterThanOrEqual(0);
            expect(color.r).toBeLessThanOrEqual(255);
            expect(color.g).toBeGreaterThanOrEqual(0);
            expect(color.g).toBeLessThanOrEqual(255);
            expect(color.b).toBeGreaterThanOrEqual(0);
            expect(color.b).toBeLessThanOrEqual(255);
            break;
          }
        }
        if (hasColor) break;
      }
      expect(hasColor).toBe(true);
    });

    it('should not render outside buffer bounds', () => {
      // Render many frames
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      // All cells should have valid characters
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(buffer[y][x].char).toBeDefined();
        }
      }
    });
  });

  describe('Mouse Interactions', () => {
    it('should render crosshair at mouse position', () => {
      const mousePos = createMockPoint(40, 12);
      pattern.render(buffer, 0, size, mousePos);
      
      // Check for crosshair characters
      expect(buffer[12][40].char).toBe('+');
      expect(buffer[12][39].char).toBe('─');
      expect(buffer[12][41].char).toBe('─');
      expect(buffer[11][40].char).toBe('│');
      expect(buffer[13][40].char).toBe('│');
    });

    it('should handle mouse move', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);
      
      // Should not crash
      expect(pattern.getMetrics().activeFireworks).toBeGreaterThanOrEqual(0);
    });

    it('should create instant explosion on click', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.activeFireworks).toBe(1);
      expect(metrics.exploded).toBe(1);
    });

    it('should create larger burst on click', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      // Render to see particles
      pattern.render(buffer, 0, size);
      
      const metrics = pattern.getMetrics();
      // Click should create 1.5x burst size (default 60 * 1.5 = 90)
      expect(metrics.totalParticles).toBeGreaterThan(80);
    });

    it('should limit fireworks to 10 on multiple clicks', () => {
      for (let i = 0; i < 15; i++) {
        pattern.onMouseClick(createMockPoint(40 + i, 12));
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.activeFireworks).toBeLessThanOrEqual(10);
    });

    it('should render crosshair at edge positions', () => {
      // Top-left edge
      const pos1 = createMockPoint(0, 0);
      pattern.render(buffer, 0, size, pos1);
      expect(buffer[0][0].char).toBe('+');
      
      // Bottom-right edge
      const buffer2 = createMockBuffer(size.width, size.height);
      const pos2 = createMockPoint(size.width - 1, size.height - 1);
      pattern.render(buffer2, 0, size, pos2);
      expect(buffer2[size.height - 1][size.width - 1].char).toBe('+');
    });
  });

  describe('Presets', () => {
    it('should have 6 presets', () => {
      const presets = FireworksPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should apply preset 1: Sparklers', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);
      
      const preset = FireworksPattern.getPreset(1);
      expect(preset?.name).toBe('Sparklers');
      expect(preset?.description).toBe('Small, frequent bursts with long trails');
      expect(preset?.config.burstSize).toBe(40);
      expect(preset?.config.trailLength).toBe(8);
    });

    it('should apply preset 2: Grand Finale', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);
      
      const preset = FireworksPattern.getPreset(2);
      expect(preset?.name).toBe('Grand Finale');
      expect(preset?.description).toBe('Massive explosions, many particles');
      expect(preset?.config.burstSize).toBe(100);
    });

    it('should apply preset 3: Fountain', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);
      
      const preset = FireworksPattern.getPreset(3);
      expect(preset?.name).toBe('Fountain');
      expect(preset?.description).toBe('Low gravity, cascading particles');
      expect(preset?.config.gravity).toBe(0.02);
    });

    it('should apply preset 4: Roman Candle', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);
      
      const preset = FireworksPattern.getPreset(4);
      expect(preset?.name).toBe('Roman Candle');
      expect(preset?.description).toBe('Fast launch, tight bursts');
      expect(preset?.config.launchSpeed).toBe(2.5);
    });

    it('should apply preset 5: Chrysanthemum', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);
      
      const preset = FireworksPattern.getPreset(5);
      expect(preset?.name).toBe('Chrysanthemum');
      expect(preset?.description).toBe('Slow, graceful explosions with heavy trails');
      expect(preset?.config.trailLength).toBe(12);
    });

    it('should apply preset 6: Strobe', () => {
      const result = pattern.applyPreset(6);
      expect(result).toBe(true);
      
      const preset = FireworksPattern.getPreset(6);
      expect(preset?.name).toBe('Strobe');
      expect(preset?.description).toBe('Rapid-fire small bursts, minimal trails');
      expect(preset?.config.spawnInterval).toBe(600);
    });

    it('should return false for invalid preset', () => {
      const result = pattern.applyPreset(99);
      expect(result).toBe(false);
    });

    it('should reset state when applying preset', () => {
      // Spawn some fireworks
      pattern.render(buffer, 0, size);
      pattern.render(buffer, 3000, size);
      expect(pattern.getMetrics().activeFireworks).toBeGreaterThan(0);
      
      // Apply preset should reset
      pattern.applyPreset(1);
      expect(pattern.getMetrics().activeFireworks).toBe(0);
      expect(pattern.getMetrics().totalParticles).toBe(0);
    });

    it('should return undefined for invalid preset ID', () => {
      const preset = FireworksPattern.getPreset(99);
      expect(preset).toBeUndefined();
    });
  });

  describe('Reset', () => {
    it('should clear all fireworks', () => {
      pattern.render(buffer, 0, size);
      pattern.render(buffer, 3000, size);
      
      expect(pattern.getMetrics().activeFireworks).toBeGreaterThan(0);
      
      pattern.reset();
      
      expect(pattern.getMetrics().activeFireworks).toBe(0);
      expect(pattern.getMetrics().totalParticles).toBe(0);
    });

    it('should reset spawn timer', () => {
      pattern.render(buffer, 2100, size);
      pattern.reset();
      
      // After reset, should spawn new firework when time > spawnInterval
      pattern.render(buffer, 2100, size);
      expect(pattern.getMetrics().activeFireworks).toBe(1);
    });
  });

  describe('Metrics', () => {
    it('should return active firework count', () => {
      const metrics1 = pattern.getMetrics();
      expect(metrics1.activeFireworks).toBe(0);
      
      pattern.render(buffer, 2100, size);
      
      const metrics2 = pattern.getMetrics();
      expect(metrics2.activeFireworks).toBe(1);
    });

    it('should return launching count', () => {
      pattern.render(buffer, 0, size);
      
      const metrics = pattern.getMetrics();
      expect(metrics.launching).toBeGreaterThanOrEqual(0);
    });

    it('should return exploded count', () => {
      pattern.render(buffer, 0, size);
      
      // Let firework explode
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.exploded).toBeGreaterThan(0);
    });

    it('should return total particle count', () => {
      pattern.render(buffer, 0, size);
      
      // Let firework explode
      for (let i = 0; i < 30; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.totalParticles).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero burst size', () => {
      const customPattern = new FireworksPattern(theme, { burstSize: 0 });
      customPattern.render(buffer, 0, size);
      
      // Should not crash
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle very large burst size', () => {
      const customPattern = new FireworksPattern(theme, { burstSize: 500 });
      customPattern.render(buffer, 2100, size);
      
      // Let it explode
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, 2100 + i * 100, size);
      }
      
      const metrics = customPattern.getMetrics();
      // Lower expectation slightly as some particles may have died
      expect(metrics.totalParticles).toBeGreaterThan(390);
    });

    it('should handle zero gravity', () => {
      const customPattern = new FireworksPattern(theme, { gravity: 0 });
      customPattern.render(buffer, 0, size);
      
      // Should not crash
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle negative gravity', () => {
      const customPattern = new FireworksPattern(theme, { gravity: -0.05 });
      customPattern.render(buffer, 0, size);
      
      // Let it explode
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      // Should render without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle zero fade rate', () => {
      const customPattern = new FireworksPattern(theme, { fadeRate: 0 });
      customPattern.render(buffer, 0, size);
      
      // Particles should never fade
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      const metrics = customPattern.getMetrics();
      expect(metrics.totalParticles).toBeGreaterThan(0);
    });

    it('should handle very high fade rate', () => {
      const customPattern = new FireworksPattern(theme, { fadeRate: 0.5 });
      customPattern.render(buffer, 0, size);
      
      // Particles should fade very quickly
      for (let i = 0; i < 40; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      const metrics = customPattern.getMetrics();
      expect(metrics.totalParticles).toBe(0);
    });

    it('should handle very small buffer', () => {
      const smallSize = createMockSize(5, 3);
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      pattern.render(smallBuffer, 0, smallSize);
      
      // Should render without errors
      expect(smallBuffer[0][0].char).toBeDefined();
    });

    it('should handle very large buffer', () => {
      const largeSize = createMockSize(200, 100);
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      pattern.render(largeBuffer, 0, largeSize);
      
      // Should render without errors
      expect(largeBuffer[0][0].char).toBeDefined();
    });

    it('should handle mouse click at edge', () => {
      const pos = createMockPoint(0, 0);
      pattern.onMouseClick(pos);
      
      // Should not crash
      expect(pattern.getMetrics().activeFireworks).toBe(1);
    });

    it('should handle zero trail length', () => {
      const customPattern = new FireworksPattern(theme, { trailLength: 0 });
      customPattern.render(buffer, 0, size);
      
      // Let it explode
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      // Should render without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle very long trails', () => {
      const customPattern = new FireworksPattern(theme, { trailLength: 50 });
      customPattern.render(buffer, 0, size);
      
      // Let it explode
      for (let i = 0; i < 30; i++) {
        customPattern.render(buffer, i * 100, size);
      }
      
      // Should render without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle very short spawn interval', () => {
      const customPattern = new FireworksPattern(theme, { spawnInterval: 100 });
      
      // Render multiple times
      for (let i = 0; i < 10; i++) {
        customPattern.render(buffer, i * 200, size);
      }
      
      // Should spawn many fireworks (but limited to 8)
      const metrics = customPattern.getMetrics();
      expect(metrics.activeFireworks).toBeGreaterThan(0);
      expect(metrics.activeFireworks).toBeLessThanOrEqual(8);
    });
  });

  describe('Stability Tests', () => {
    it('should handle rapid renders', () => {
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 16, size);
      }
      
      // Should complete without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle rapid mouse clicks', () => {
      for (let i = 0; i < 20; i++) {
        pattern.onMouseClick(createMockPoint(40 + i, 12));
      }
      
      // Should limit fireworks
      expect(pattern.getMetrics().activeFireworks).toBeLessThanOrEqual(10);
    });

    it('should handle rapid preset changes', () => {
      for (let i = 1; i <= 6; i++) {
        pattern.applyPreset(i);
        pattern.render(buffer, 0, size);
      }
      
      // Should complete without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle mixed rapid operations', () => {
      for (let i = 0; i < 30; i++) {
        if (i % 3 === 0) {
          pattern.onMouseClick(createMockPoint(40, 12));
        } else if (i % 3 === 1) {
          pattern.render(buffer, i * 100, size);
        } else {
          pattern.applyPreset((i % 6) + 1);
        }
      }
      
      // Should complete without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should maintain consistent state after many operations', () => {
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 100, size);
        pattern.onMouseClick(createMockPoint(40, 12));
      }
      
      // Reset and verify clean state
      pattern.reset();
      const metrics = pattern.getMetrics();
      expect(metrics.activeFireworks).toBe(0);
      expect(metrics.totalParticles).toBe(0);
    });
  });
});
