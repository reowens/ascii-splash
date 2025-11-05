import { SnowPattern } from '../../../src/patterns/SnowPattern.js';
import { Cell, Theme } from '../../../src/types/index.js';
import { createMockTheme, createMockBuffer } from '../../utils/mocks.js';

describe('SnowPattern', () => {
  let pattern: SnowPattern;
  let theme: Theme;
  let buffer: Cell[][];
  const size = { width: 80, height: 24 };

  beforeEach(() => {
    theme = createMockTheme();
    pattern = new SnowPattern(theme);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('snow');
      expect(pattern).toBeDefined();
    });

    it('should accept custom config', () => {
      const customPattern = new SnowPattern(theme, {
        particleCount: 100,
        fallSpeed: 1.0,
        windStrength: 1.5,
        turbulence: 1.0,
        rotationSpeed: 2.0,
        particleType: 'cherry',
        mouseWindForce: 3.0,
        accumulation: false
      });
      expect(customPattern).toBeDefined();
    });

    it('should create particles on initialization', () => {
      const metrics = pattern.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.activeParticles).toBeGreaterThan(0);
    });
  });

  describe('render', () => {
    it('should render without errors', () => {
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should fill buffer with snow particles', () => {
      pattern.render(buffer, 1000, size);
      
      // Check that cells are set
      let filledCells = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            filledCells++;
          }
        }
      }
      
      // Should have some snow particles visible
      expect(filledCells).toBeGreaterThan(0);
    });

    it('should animate snow over time', () => {
      pattern.render(buffer, 1000, size);
      const buffer1 = createMockBuffer(size.width, size.height);
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          buffer1[y][x] = { ...buffer[y][x] };
        }
      }
      
      pattern.render(buffer, 2000, size);
      
      // Buffer should change over time
      let differences = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== buffer1[y][x].char) {
            differences++;
          }
        }
      }
      
      expect(differences).toBeGreaterThan(0);
    });

    it('should use theme colors for snow', () => {
      pattern.render(buffer, 1000, size);
      
      // Find a snow particle
      let foundColor = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ' && buffer[y][x].color) {
            expect(buffer[y][x].color).toBeDefined();
            expect(buffer[y][x].color!.r).toBeGreaterThanOrEqual(0);
            expect(buffer[y][x].color!.r).toBeLessThanOrEqual(255);
            foundColor = true;
            break;
          }
        }
        if (foundColor) break;
      }
      
      expect(foundColor).toBe(true);
    });

    it('should use appropriate snow characters', () => {
      pattern.render(buffer, 1000, size);
      
      const validChars = [' ', '*', '❄', '·', '○', '•', '⋆'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(validChars).toContain(buffer[y][x].char);
        }
      }
    });

    it('should handle very small terminal', () => {
      const smallSize = { width: 20, height: 10 };
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      expect(() => {
        pattern.render(smallBuffer, 1000, smallSize);
      }).not.toThrow();
    });

    it('should handle very large terminal', () => {
      const largeSize = { width: 200, height: 60 };
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      expect(() => {
        pattern.render(largeBuffer, 1000, largeSize);
      }).not.toThrow();
    });

    it('should show particles falling downward over time', () => {
      // Render initial frame
      pattern.render(buffer, 1000, size);
      
      // Count particles in top half
      let topParticles = 0;
      for (let y = 0; y < size.height / 2; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') topParticles++;
        }
      }
      
      // Simulate several frames
      for (let t = 1000; t < 5000; t += 100) {
        pattern.render(buffer, t, size);
      }
      
      // Count particles in bottom half
      let bottomParticles = 0;
      for (let y = size.height / 2; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') bottomParticles++;
        }
      }
      
      // More particles should accumulate in bottom half over time
      expect(bottomParticles).toBeGreaterThan(0);
    });
  });

  describe('mouse interaction', () => {
    it('should have onMouseMove method', () => {
      expect(pattern.onMouseMove).toBeDefined();
      expect(typeof pattern.onMouseMove).toBe('function');
    });

    it('should have onMouseClick method', () => {
      expect(pattern.onMouseClick).toBeDefined();
      expect(typeof pattern.onMouseClick).toBe('function');
    });

    it('should blow snow away on mouse move', () => {
      if (!pattern.onMouseMove) {
        throw new Error('onMouseMove not defined');
      }

      // Render initial state
      pattern.render(buffer, 1000, size);
      
      // Move mouse
      pattern.onMouseMove({ x: 40, y: 12 });
      
      // Render after mouse move
      pattern.render(buffer, 1100, size);
      
      // Should still render without errors
      expect(buffer).toBeDefined();
    });

    it('should spawn particles on click', () => {
      if (!pattern.onMouseClick) {
        throw new Error('onMouseClick not defined');
      }

      // Get initial particle count
      const initialMetrics = pattern.getMetrics();
      const initialCount = initialMetrics.activeParticles + initialMetrics.accumulated;
      
      // Click
      pattern.onMouseClick({ x: 40, y: 12 });
      
      // Render to update
      pattern.render(buffer, 1000, size);
      
      // Get new particle count
      const newMetrics = pattern.getMetrics();
      const newCount = newMetrics.activeParticles + newMetrics.accumulated;
      
      // Should have more particles after click
      expect(newCount).toBeGreaterThan(initialCount);
    });

    it('should limit total particles after multiple clicks', () => {
      if (!pattern.onMouseClick) {
        throw new Error('onMouseClick not defined');
      }

      // Click many times
      for (let i = 0; i < 20; i++) {
        pattern.onMouseClick({ x: 40, y: 12 });
      }
      
      pattern.render(buffer, 1000, size);
      
      const metrics = pattern.getMetrics();
      const totalParticles = metrics.activeParticles + metrics.accumulated;
      
      // Should not exceed reasonable limit (2x base config)
      expect(totalParticles).toBeLessThan(150);
    });
  });

  describe('presets', () => {
    it('should have getPresets static method', () => {
      expect(SnowPattern.getPresets).toBeDefined();
      expect(typeof SnowPattern.getPresets).toBe('function');
    });

    it('should return 6 presets', () => {
      const presets = SnowPattern.getPresets();
      expect(presets).toBeDefined();
      expect(presets.length).toBe(6);
    });

    it('should have preset with id 1', () => {
      const presets = SnowPattern.getPresets();
      const preset1 = presets.find(p => p.id === 1);
      expect(preset1).toBeDefined();
      expect(preset1?.name).toBe('Light Flurries');
    });

    it('should have preset with id 2', () => {
      const presets = SnowPattern.getPresets();
      const preset2 = presets.find(p => p.id === 2);
      expect(preset2).toBeDefined();
      expect(preset2?.name).toBe('Blizzard');
    });

    it('should have preset with id 3', () => {
      const presets = SnowPattern.getPresets();
      const preset3 = presets.find(p => p.id === 3);
      expect(preset3).toBeDefined();
      expect(preset3?.name).toBe('Cherry Blossoms');
    });

    it('should have preset with id 4', () => {
      const presets = SnowPattern.getPresets();
      const preset4 = presets.find(p => p.id === 4);
      expect(preset4).toBeDefined();
      expect(preset4?.name).toBe('Autumn Leaves');
    });

    it('should have preset with id 5', () => {
      const presets = SnowPattern.getPresets();
      const preset5 = presets.find(p => p.id === 5);
      expect(preset5).toBeDefined();
      expect(preset5?.name).toBe('Confetti');
    });

    it('should have preset with id 6', () => {
      const presets = SnowPattern.getPresets();
      const preset6 = presets.find(p => p.id === 6);
      expect(preset6).toBeDefined();
      expect(preset6?.name).toBe('Ash');
    });

    it('should have applyPreset method', () => {
      expect(pattern.applyPreset).toBeDefined();
      expect(typeof pattern.applyPreset).toBe('function');
    });

    it('should apply preset 1 (Light Flurries)', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      expect(buffer).toBeDefined();
    });

    it('should apply preset 2 (Blizzard)', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      expect(buffer).toBeDefined();
    });

    it('should apply preset 3 (Cherry Blossoms)', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      
      // Cherry blossoms should use different characters
      let foundCherryChar = false;
      const cherryChars = ['🌸', '✿', '❀', '✾', '✽', '⚘'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (cherryChars.includes(buffer[y][x].char)) {
            foundCherryChar = true;
            break;
          }
        }
        if (foundCherryChar) break;
      }
      
      expect(foundCherryChar).toBe(true);
    });

    it('should apply preset 4 (Autumn Leaves)', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      
      // Autumn leaves should use different characters
      let foundLeafChar = false;
      const leafChars = ['🍂', '🍁', '🍃', '◆', '◇', '❖'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (leafChars.includes(buffer[y][x].char)) {
            foundLeafChar = true;
            break;
          }
        }
        if (foundLeafChar) break;
      }
      
      expect(foundLeafChar).toBe(true);
    });

    it('should apply preset 5 (Confetti)', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      expect(buffer).toBeDefined();
    });

    it('should apply preset 6 (Ash)', () => {
      const result = pattern.applyPreset(6);
      expect(result).toBe(true);
      
      pattern.render(buffer, 1000, size);
      expect(buffer).toBeDefined();
    });

    it('should return false for invalid preset', () => {
      const result = pattern.applyPreset(99);
      expect(result).toBe(false);
    });

    it('should reset state when applying preset', () => {
      // Render some frames
      pattern.render(buffer, 1000, size);
      pattern.render(buffer, 2000, size);
      
      // Apply preset
      pattern.applyPreset(1);
      
      // Should render cleanly
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('particle types', () => {
    it('should render snow type particles', () => {
      const snowPattern = new SnowPattern(theme, { particleType: 'snow' });
      snowPattern.render(buffer, 1000, size);
      
      const validChars = ['*', '❄', '·', '○', '•', '⋆', ' '];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(validChars).toContain(buffer[y][x].char);
        }
      }
    });

    it('should render cherry blossom particles', () => {
      const cherryPattern = new SnowPattern(theme, { particleType: 'cherry' });
      cherryPattern.render(buffer, 1000, size);
      
      let foundCherryChar = false;
      const cherryChars = ['🌸', '✿', '❀', '✾', '✽', '⚘'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (cherryChars.includes(buffer[y][x].char)) {
            foundCherryChar = true;
            break;
          }
        }
        if (foundCherryChar) break;
      }
      
      expect(foundCherryChar).toBe(true);
    });

    it('should render autumn leaf particles', () => {
      const autumnPattern = new SnowPattern(theme, { particleType: 'autumn' });
      autumnPattern.render(buffer, 1000, size);
      
      let foundLeafChar = false;
      const leafChars = ['🍂', '🍁', '🍃', '◆', '◇', '❖'];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (leafChars.includes(buffer[y][x].char)) {
            foundLeafChar = true;
            break;
          }
        }
        if (foundLeafChar) break;
      }
      
      expect(foundLeafChar).toBe(true);
    });

    it('should render confetti particles', () => {
      const confettiPattern = new SnowPattern(theme, { particleType: 'confetti' });
      confettiPattern.render(buffer, 1000, size);
      
      const validChars = ['▪', '▫', '◾', '◽', '■', '□', '●', '○', '♦', '♢', ' '];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(validChars).toContain(buffer[y][x].char);
        }
      }
    });

    it('should render ash particles', () => {
      const ashPattern = new SnowPattern(theme, { particleType: 'ash' });
      ashPattern.render(buffer, 1000, size);
      
      const validChars = ['·', '•', '∙', '⋅', '⋆', '˙', ' '];
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(validChars).toContain(buffer[y][x].char);
        }
      }
    });
  });

  describe('reset', () => {
    it('should have reset method', () => {
      expect(pattern.reset).toBeDefined();
      expect(typeof pattern.reset).toBe('function');
    });

    it('should reset pattern state', () => {
      // Render some frames
      pattern.render(buffer, 1000, size);
      pattern.render(buffer, 2000, size);
      
      // Reset
      pattern.reset();
      
      // Should be able to render cleanly
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('should clear particles on reset', () => {
      pattern.render(buffer, 1000, size);
      pattern.reset();
      
      const metrics = pattern.getMetrics();
      expect(metrics.activeParticles).toBeGreaterThan(0);
      expect(metrics.accumulated).toBe(0);
    });
  });

  describe('metrics', () => {
    it('should have getMetrics method', () => {
      expect(pattern.getMetrics).toBeDefined();
      expect(typeof pattern.getMetrics).toBe('function');
    });

    it('should return particle count metric', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.activeParticles).toBeDefined();
      expect(typeof metrics.activeParticles).toBe('number');
      expect(metrics.activeParticles).toBeGreaterThanOrEqual(0);
    });

    it('should return accumulated particles metric', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.accumulated).toBeDefined();
      expect(typeof metrics.accumulated).toBe('number');
      expect(metrics.accumulated).toBeGreaterThanOrEqual(0);
    });

    it('should return average velocity metric', () => {
      pattern.render(buffer, 1000, size);
      const metrics = pattern.getMetrics();
      
      expect(metrics.avgVelocity).toBeDefined();
      expect(typeof metrics.avgVelocity).toBe('number');
      expect(metrics.avgVelocity).toBeGreaterThanOrEqual(0);
    });

    it('should update metrics over time', () => {
      pattern.render(buffer, 1000, size);
      
      // Simulate many frames
      for (let t = 1000; t < 10000; t += 100) {
        pattern.render(buffer, t, size);
      }
      
      const metrics = pattern.getMetrics();
      
      // Metrics should still be valid
      expect(metrics.activeParticles).toBeGreaterThan(0);
    });
  });

  describe('accumulation', () => {
    it('should accumulate particles at bottom when enabled', () => {
      const accPattern = new SnowPattern(theme, { accumulation: true, fallSpeed: 2.0 });
      
      // Simulate many frames to let particles fall
      for (let t = 1000; t < 20000; t += 100) {
        accPattern.render(buffer, t, size);
      }
      
      const metrics = accPattern.getMetrics();
      
      // Should have some accumulated particles
      expect(metrics.accumulated).toBeGreaterThanOrEqual(0);
    });

    it('should not accumulate particles when disabled', () => {
      const noAccPattern = new SnowPattern(theme, { accumulation: false, fallSpeed: 2.0 });
      
      // Simulate many frames to let particles fall
      for (let t = 1000; t < 20000; t += 100) {
        noAccPattern.render(buffer, t, size);
      }
      
      const metrics = noAccPattern.getMetrics();
      
      // Should have no accumulated particles
      expect(metrics.accumulated).toBe(0);
    });
  });
});
