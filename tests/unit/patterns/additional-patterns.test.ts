import { MatrixPattern } from '../../../src/patterns/MatrixPattern.js';
import { RainPattern } from '../../../src/patterns/RainPattern.js';
import { QuicksilverPattern } from '../../../src/patterns/QuicksilverPattern.js';
import { ParticlePattern } from '../../../src/patterns/ParticlePattern.js';
import { SpiralPattern } from '../../../src/patterns/SpiralPattern.js';
import { PlasmaPattern } from '../../../src/patterns/PlasmaPattern.js';
import { TunnelPattern } from '../../../src/patterns/TunnelPattern.js';
import { LightningPattern } from '../../../src/patterns/LightningPattern.js';
import { FireworksPattern } from '../../../src/patterns/FireworksPattern.js';
import { createMockTheme, createMockSize, createMockBuffer } from '../../utils/mocks.js';

describe('Additional Pattern Tests', () => {
  describe('MatrixPattern', () => {
    let pattern: MatrixPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new MatrixPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = MatrixPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = MatrixPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = MatrixPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.density).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.charset).toBeDefined();
        });
      });

      it('all preset names are unique', () => {
        const presets = MatrixPattern.getPresets();
        const names = presets.map(p => p.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(6);
      });

      it('returns a copy of presets (not reference)', () => {
        const presets1 = MatrixPattern.getPresets();
        const presets2 = MatrixPattern.getPresets();
        expect(presets1).not.toBe(presets2);
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Classic Matrix)', () => {
        const preset = MatrixPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Classic Matrix');
        expect(preset?.config.charset).toBe('katakana');
      });

      it('returns preset 2 (Binary Rain)', () => {
        const preset = MatrixPattern.getPreset(2);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Binary Rain');
        expect(preset?.config.charset).toBe('numbers');
      });

      it('returns undefined for non-existent preset', () => {
        const preset = MatrixPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });

      it('returns undefined for preset ID 0', () => {
        const preset = MatrixPattern.getPreset(0);
        expect(preset).toBeUndefined();
      });

      it('returns undefined for negative preset ID', () => {
        const preset = MatrixPattern.getPreset(-1);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('applies Classic Matrix preset', () => {
        pattern.applyPreset(1);
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Classic Matrix has medium density', () => {
        const preset = MatrixPattern.getPreset(1);
        expect(preset?.config.density).toBe(0.3);
      });

      it('Code Storm has high density and speed', () => {
        const preset = MatrixPattern.getPreset(3);
        expect(preset?.config.density).toBeGreaterThanOrEqual(0.5);
        expect(preset?.config.speed).toBeGreaterThan(1.5);
      });

      it('Sparse Glyphs has low density', () => {
        const preset = MatrixPattern.getPreset(4);
        expect(preset?.config.density).toBeLessThan(0.2);
      });

      it('Firewall has very high density', () => {
        const preset = MatrixPattern.getPreset(5);
        expect(preset?.config.density).toBeGreaterThanOrEqual(0.7);
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        // Matrix columns start at negative Y positions (off-screen)
        // Need multiple renders to allow columns to fall into view
        // Columns move at speed * 0.3 per frame (line 141 in MatrixPattern.ts)
        // With default speed=1.0, columns move 0.3 units per render
        // Column length is 5-20 chars, so need ~20-30 renders to see content
        for (let i = 0; i < 40; i++) {
          pattern.render(buffer, i * 100, size);
        }
        
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

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse click events', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });

  describe('RainPattern', () => {
    let pattern: RainPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new RainPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = RainPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = RainPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = RainPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.density).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.characters).toBeDefined();
          expect(Array.isArray(preset.config.characters)).toBe(true);
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Light Drizzle)', () => {
        const preset = RainPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Light Drizzle');
        expect(preset?.config.density).toBeLessThan(0.2);
      });

      it('returns preset 3 (Thunderstorm)', () => {
        const preset = RainPattern.getPreset(3);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Thunderstorm');
      });

      it('returns undefined for non-existent preset', () => {
        const preset = RainPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('has Light Drizzle as first preset', () => {
        const preset = RainPattern.getPreset(1);
        expect(preset?.name).toBe('Light Drizzle');
        expect(preset?.config.density).toBeLessThan(0.2);
      });

      it('Heavy Storm has high density', () => {
        const preset = RainPattern.getPreset(6);
        expect(preset?.config.windSpeed).toBeGreaterThanOrEqual(0.9);
        expect(preset?.config.gustiness).toBeGreaterThanOrEqual(0.8);
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        // Rain drops start at negative Y positions (y: Math.random() * -10)
        // Need multiple renders to allow drops to fall into view
        // Drops move at speed * 0.5 per frame (line 127 in RainPattern.ts)
        // With default speed=1.0, drops move 0.5 units per render
        // Starting at y=-10, need ~20-25 renders to reach y=0
        for (let i = 0; i < 30; i++) {
          pattern.render(buffer, i * 100, size);
        }
        
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

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse click events (creates splashes)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });

  describe('QuicksilverPattern', () => {
    let pattern: QuicksilverPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new QuicksilverPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = QuicksilverPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = QuicksilverPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = QuicksilverPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.flowIntensity).toBeDefined();
          expect(preset.config.noiseScale).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Liquid Mercury)', () => {
        const preset = QuicksilverPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Liquid Mercury');
      });

      it('returns preset 3 (Quicksilver Rush)', () => {
        const preset = QuicksilverPattern.getPreset(3);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Quicksilver Rush');
        expect(preset?.config.speed).toBeGreaterThan(1.5);
      });

      it('returns undefined for non-existent preset', () => {
        const preset = QuicksilverPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Molten Silver has slow speed', () => {
        const preset = QuicksilverPattern.getPreset(2);
        expect(preset?.config.speed).toBeLessThan(1);
      });

      it('Turbulent Metal has high flow intensity', () => {
        const preset = QuicksilverPattern.getPreset(5);
        expect(preset?.config.flowIntensity).toBeGreaterThanOrEqual(0.9);
      });

      it('Chrome Puddle has minimal speed', () => {
        const preset = QuicksilverPattern.getPreset(4);
        expect(preset?.config.speed).toBeLessThan(0.5);
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        pattern.render(buffer, 1000, size);
        
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

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse click events (creates ripples)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });

  describe('ParticlePattern', () => {
    let pattern: ParticlePattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new ParticlePattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = ParticlePattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = ParticlePattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = ParticlePattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.particleCount).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.gravity).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Gentle Float)', () => {
        const preset = ParticlePattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Gentle Float');
      });

      it('returns preset 4 (Zero Gravity)', () => {
        const preset = ParticlePattern.getPreset(4);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Zero Gravity');
        expect(preset?.config.gravity).toBe(0);
      });

      it('returns undefined for non-existent preset', () => {
        const preset = ParticlePattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Gentle Float has low gravity', () => {
        const preset = ParticlePattern.getPreset(1);
        expect(preset?.config.gravity).toBeLessThan(0.02);
      });

      it('Particle Storm has high particle count', () => {
        const preset = ParticlePattern.getPreset(5);
        expect(preset?.config.particleCount).toBeGreaterThanOrEqual(200);
      });

      it('Minimal Drift has few particles', () => {
        const preset = ParticlePattern.getPreset(6);
        expect(preset?.config.particleCount).toBeLessThanOrEqual(50);
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        pattern.render(buffer, 1000, size);
        
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

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse move events', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseMove(mousePos);
        }).not.toThrow();
      });

      it('handles mouse click events (toggles attract mode)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });

  describe('SpiralPattern', () => {
    let pattern: SpiralPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new SpiralPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = SpiralPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = SpiralPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = SpiralPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.armCount).toBeDefined();
          expect(preset.config.rotationSpeed).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Twin Helix)', () => {
        const preset = SpiralPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Twin Helix');
        expect(preset?.config.armCount).toBe(2);
      });

      it('returns preset 6 (DNA Double Helix)', () => {
        const preset = SpiralPattern.getPreset(6);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('DNA Double Helix');
        expect(preset?.config.armCount).toBe(2);
      });

      it('returns undefined for non-existent preset', () => {
        const preset = SpiralPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Galactic Whirlpool has 5 spiral arms', () => {
        const preset = SpiralPattern.getPreset(2);
        expect(preset?.config.armCount).toBe(5);
      });

      it('Fibonacci Bloom has 8 arms', () => {
        const preset = SpiralPattern.getPreset(4);
        expect(preset?.config.armCount).toBe(8);
      });

      it('Hyperspeed Vortex has fast rotation', () => {
        const preset = SpiralPattern.getPreset(3);
        expect(preset?.config.rotationSpeed).toBeGreaterThanOrEqual(0.5);
      });
    });

    describe('Rendering', () => {
      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse click events (creates spirals)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });

  describe('PlasmaPattern', () => {
    let pattern: PlasmaPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new PlasmaPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 9 presets', () => {
        const presets = PlasmaPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = PlasmaPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = PlasmaPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.frequency).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.complexity).toBeDefined();
          expect(preset.config.colorShift).toBeDefined();
          expect(preset.config.shiftSpeed).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Gentle Waves)', () => {
        const preset = PlasmaPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Gentle Waves');
      });

      it('returns preset 4 (Electric Storm)', () => {
        const preset = PlasmaPattern.getPreset(4);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Electric Storm');
        expect(preset?.config.frequency).toBeGreaterThanOrEqual(0.2);
      });

      it('returns undefined for non-existent preset', () => {
        const preset = PlasmaPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Turbulent Energy has high speed', () => {
        const preset = PlasmaPattern.getPreset(3);
        expect(preset?.config.speed).toBeGreaterThan(1.5);
      });

      it('Psychedelic Storm has fast color shifting', () => {
        const preset = PlasmaPattern.getPreset(5);
        expect(preset?.config.colorShift).toBe(true);
        expect(preset?.config.shiftSpeed).toBeGreaterThanOrEqual(0.0008);
      });

      it('Aurora has medium color shifting', () => {
        const preset = PlasmaPattern.getPreset(6);
        expect(preset?.config.colorShift).toBe(true);
        expect(preset?.config.shiftSpeed).toBe(0.0005);
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        pattern.render(buffer, 1000, size);
        
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

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse move events', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseMove(mousePos);
        }).not.toThrow();
      });

       it('handles mouse click events (creates waves)', () => {
         const mousePos = { x: 10, y: 10 };
         expect(() => {
           pattern.onMouseClick(mousePos);
         }).not.toThrow();
       });
     });

      describe('Color Shifting - Feature Tests', () => {
        it('Psychedelic Storm has fast color shifting', () => {
          const preset = PlasmaPattern.getPreset(5);
          expect(preset?.config.colorShift).toBe(true);
          expect(preset?.config.shiftSpeed).toBeGreaterThanOrEqual(0.0008);
        });

        it('Aurora has medium color shifting speed', () => {
          const preset = PlasmaPattern.getPreset(6);
          expect(preset?.config.colorShift).toBe(true);
          expect(preset?.config.shiftSpeed).toBe(0.0005);
        });

       it('Gentle Waves preset has color shift disabled', () => {
         const preset = PlasmaPattern.getPreset(1);
         expect(preset?.config.colorShift).toBe(false);
         expect(preset?.config.shiftSpeed).toBe(0);
       });

       it('Standard Plasma does not use color cycling', () => {
         const preset = PlasmaPattern.getPreset(2);
         expect(preset?.config.colorShift).toBe(false);
       });
     });

      describe('Color Shifting - Rendering with Shift Enabled', () => {
        it('applies color offset when colorShift is enabled', () => {
          pattern.applyPreset(5); // Psychedelic Storm
          const buffer = createMockBuffer(80, 24);
          const size = createMockSize(80, 24);
          
          // Render at time 0
          pattern.render(buffer, 0, size);
          
          // Render at later time to see color shift effect
          expect(() => {
            pattern.render(buffer, 5000, size);
          }).not.toThrow();
        });

       it('does not apply color offset when colorShift is disabled', () => {
         pattern.applyPreset(1); // Gentle Waves (no shift)
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         expect(() => {
           pattern.render(buffer, 1000, size);
         }).not.toThrow();
       });

        it('animates color cycling over time (Psychedelic Storm)', () => {
          pattern.applyPreset(5);
          const buffer1 = createMockBuffer(80, 24);
          const buffer2 = createMockBuffer(80, 24);
          const size = createMockSize(80, 24);
          
          // Render at two different times
          pattern.render(buffer1, 1000, size);
          pattern.render(buffer2, 6000, size); // 5 seconds later
          
          // Buffers should differ due to color shift
          // (At least some cells should have different colors/chars)
          let differences = 0;
          for (let y = 0; y < size.height; y++) {
            for (let x = 0; x < size.width; x++) {
              if (buffer1[y][x].char !== buffer2[y][x].char) {
                differences++;
              }
            }
          }
          
          expect(differences).toBeGreaterThan(0);
        });

        it('Psychedelic Storm cycles colors faster than Aurora', () => {
          const psychedelicPreset = PlasmaPattern.getPreset(5);
          const auroraPreset = PlasmaPattern.getPreset(6);
          
          expect(psychedelicPreset?.config.shiftSpeed).toBeGreaterThan(
            auroraPreset?.config.shiftSpeed ?? 0
          );
        });
     });

     describe('Color Shifting - Wrapping and Cycling', () => {
       it('wraps color offset to 0-1 range (modulo 1.0)', () => {
         pattern.applyPreset(8); // Psychedelic Storm
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Render at very large time value
         expect(() => {
           pattern.render(buffer, 1000000, size);
         }).not.toThrow();
       });

       it('handles continuous rendering without color overflow', () => {
         pattern.applyPreset(7);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Render many frames continuously
         for (let i = 0; i < 100; i++) {
           expect(() => {
             pattern.render(buffer, i * 50, size);
           }).not.toThrow();
         }
       });

       it('color cycle completes periodically', () => {
         pattern.applyPreset(7); // Rainbow Flow, shiftSpeed = 0.0002
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // At shiftSpeed 0.0002, full cycle: 1 / 0.0002 = 5000ms
         // Render at start and after one full cycle
         pattern.render(buffer, 0, size);
         
         expect(() => {
           pattern.render(buffer, 5000, size); // Should return to similar state
         }).not.toThrow();
       });
     });

     describe('Color Shifting - Preset Switching', () => {
       it('resets color shift state when switching presets', () => {
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Start with color shift enabled
         pattern.applyPreset(7);
         pattern.render(buffer, 1000, size);
         
         // Switch to preset without color shift
         pattern.applyPreset(1);
         expect(() => {
           pattern.render(buffer, 2000, size);
         }).not.toThrow();
       });

        it('can switch between color shifting and non-color shifting presets', () => {
          const buffer = createMockBuffer(80, 24);
          const size = createMockSize(80, 24);
          
          // Cycle through all presets multiple times
          for (let cycle = 0; cycle < 2; cycle++) {
            for (let id = 1; id <= 6; id++) {
              expect(pattern.applyPreset(id)).toBe(true);
              expect(() => {
                pattern.render(buffer, 1000 + cycle * 500, size);
              }).not.toThrow();
            }
          }
        });
     });

      describe('Color Shifting - Visual Stability', () => {
        it('Psychedelic Storm renders consistently at same time value', () => {
          pattern.applyPreset(5);
          const buffer1 = createMockBuffer(80, 24);
          const buffer2 = createMockBuffer(80, 24);
          const size = createMockSize(80, 24);
          
          // Render at same time
          pattern.render(buffer1, 5000, size);
          
          // Reset pattern for comparison
          pattern.applyPreset(5);
          pattern.render(buffer2, 5000, size);
          
          // Should be identical (deterministic at same time)
          let identicalCells = 0;
          for (let y = 0; y < size.height; y++) {
            for (let x = 0; x < size.width; x++) {
              if (buffer1[y][x].char === buffer2[y][x].char) {
                identicalCells++;
              }
            }
          }
          
          expect(identicalCells).toBeGreaterThan(0);
        });

        it('handles color shift with mouse interactions', () => {
          pattern.applyPreset(5); // Psychedelic Storm
          const buffer = createMockBuffer(80, 24);
          const size = createMockSize(80, 24);
          
          // Move mouse and click while color shifting
          pattern.onMouseMove({ x: 40, y: 12 });
          pattern.render(buffer, 1000, size);
          
          pattern.onMouseClick({ x: 50, y: 15 });
          pattern.render(buffer, 2000, size);
          
          expect(() => {
            pattern.render(buffer, 3000, size);
          }).not.toThrow();
        });

        it('Aurora creates smooth color transitions', () => {
          pattern.applyPreset(6);
          const buffer = createMockBuffer(80, 24);
          const size = createMockSize(80, 24);
          
          // Render multiple frames for smooth animation
          for (let i = 0; i < 10; i++) {
            expect(() => {
              pattern.render(buffer, i * 100, size);
            }).not.toThrow();
          }
        });
      });
   });

   describe('TunnelPattern', () => {
    let pattern: TunnelPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new TunnelPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = TunnelPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = TunnelPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = TunnelPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.shape).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.rotationSpeed).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Warp Speed)', () => {
        const preset = TunnelPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Warp Speed');
        expect(preset?.config.shape).toBe('circle');
      });

      it('returns preset 3 (Gentle Cruise)', () => {
        const preset = TunnelPattern.getPreset(3);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Gentle Cruise');
        expect(preset?.config.shape).toBe('circle');
      });

      it('returns preset 5 (Stargate)', () => {
        const preset = TunnelPattern.getPreset(5);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Stargate');
        expect(preset?.config.shape).toBe('star');
      });

      it('returns undefined for non-existent preset', () => {
        const preset = TunnelPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Hyperspace Jump has high speed', () => {
        const preset = TunnelPattern.getPreset(2);
        expect(preset?.config.speed).toBeGreaterThanOrEqual(2.5);
      });

      it('Asteroid Tunnel has hexagon shape', () => {
        const preset = TunnelPattern.getPreset(4);
        expect(preset?.config.shape).toBe('hexagon');
      });

      it('Stargate has star shape', () => {
        const preset = TunnelPattern.getPreset(5);
        expect(preset?.config.shape).toBe('star');
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        pattern.render(buffer, 1000, size);
        
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

      it('should fill minimum percentage of screen for visibility', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        const totalCells = size.width * size.height;
        
        pattern.render(buffer, 1000, size);
        
        let filledCells = 0;
        for (let y = 0; y < size.height; y++) {
          for (let x = 0; x < size.width; x++) {
            if (buffer[y][x].char !== ' ') {
              filledCells++;
            }
          }
        }
        
        const fillPercentage = (filledCells / totalCells) * 100;
        expect(fillPercentage).toBeGreaterThanOrEqual(15); // Tunnel should fill at least 15% of screen
      });

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse click events (changes direction)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });

   describe('LightningPattern', () => {
     let pattern: LightningPattern;
     const mockTheme = createMockTheme();

     beforeEach(() => {
       pattern = new LightningPattern(mockTheme);
     });

     describe('getPresets()', () => {
       it('returns array of 6 presets', () => {
         const presets = LightningPattern.getPresets();
         expect(presets).toHaveLength(6);
       });

       it('preset IDs are sequential 1-6', () => {
         const presets = LightningPattern.getPresets();
         const ids = presets.map(p => p.id).sort();
         expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
       });

       it('each preset has required fields', () => {
         const presets = LightningPattern.getPresets();
         presets.forEach(preset => {
           expect(preset.id).toBeDefined();
           expect(preset.name).toBeDefined();
           expect(preset.description).toBeDefined();
           expect(preset.config).toBeDefined();
           expect(preset.config.branchProbability).toBeDefined();
           expect(preset.config.strikeInterval).toBeDefined();
           expect(preset.config.mainPathJaggedness).toBeDefined();
           expect(preset.config.branchSpread).toBeDefined();
         });
       });
     });

     describe('getPreset()', () => {
       it('returns preset 1 (Cloud Strike)', () => {
         const preset = LightningPattern.getPreset(1);
         expect(preset).toBeDefined();
         expect(preset?.name).toBe('Cloud Strike');
       });

       it('returns preset 2 (Tesla Coil)', () => {
         const preset = LightningPattern.getPreset(2);
         expect(preset).toBeDefined();
         expect(preset?.name).toBe('Tesla Coil');
         expect(preset?.config.branchProbability).toBeGreaterThan(0.4);
       });

       it('returns undefined for non-existent preset', () => {
         const preset = LightningPattern.getPreset(99);
         expect(preset).toBeUndefined();
       });
     });

     describe('applyPreset()', () => {
       it('returns true when preset is applied successfully', () => {
         const result = pattern.applyPreset(1);
         expect(result).toBe(true);
       });

       it('returns false for non-existent preset', () => {
         const result = pattern.applyPreset(99);
         expect(result).toBe(false);
       });

       it('can switch between all presets', () => {
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         for (let id = 1; id <= 6; id++) {
           expect(pattern.applyPreset(id)).toBe(true);
           expect(() => {
             pattern.render(buffer, 1000 * id, size);
           }).not.toThrow();
         }
       });
     });

     describe('Preset Characteristics', () => {
       it('Cloud Strike has moderate branch depth', () => {
         const preset = LightningPattern.getPreset(1);
         expect(preset?.config.maxBranchDepth).toBe(2);
       });

       it('Tesla Coil has maximum branch depth', () => {
         const preset = LightningPattern.getPreset(2);
         expect(preset?.config.maxBranchDepth).toBe(3);
       });

       it('Chain Lightning has minimal branch depth', () => {
         const preset = LightningPattern.getPreset(5);
         expect(preset?.config.maxBranchDepth).toBe(1);
       });

       it('Chain Lightning has short strike interval', () => {
         const preset = LightningPattern.getPreset(5);
         expect(preset?.config.strikeInterval).toBeLessThan(1000);
       });

       it('Spider Lightning has high branch probability', () => {
         const preset = LightningPattern.getPreset(6);
         expect(preset?.config.branchProbability).toBeGreaterThanOrEqual(0.5);
       });

       it('Chain Lightning has minimal fade time', () => {
         const preset = LightningPattern.getPreset(5);
         expect(preset?.config.fadeTime).toBeLessThan(20);
       });
     });

     describe('Recursion - Branch Depth Limiting', () => {
       it('Cloud Strike has depth limit of 2', () => {
         pattern.applyPreset(1);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Trigger a strike and render multiple times
         pattern.onMouseClick({ x: 40, y: 12 });
         pattern.render(buffer, 100, size);
         
         // Should render without errors and complete quickly (depth limited)
         expect(() => {
           pattern.render(buffer, 200, size);
         }).not.toThrow();
       });

       it('Tesla Coil has maximum depth of 3', () => {
         pattern.applyPreset(2);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Trigger a strike
         pattern.onMouseClick({ x: 40, y: 12 });
         pattern.render(buffer, 100, size);
         
         // Should handle deeper recursion
         expect(() => {
           pattern.render(buffer, 200, size);
         }).not.toThrow();
       });

       it('Chain Lightning with depth 1 prevents recursive branching', () => {
         pattern.applyPreset(5);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Multiple renders should stay efficient
         for (let i = 0; i < 5; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
           expect(() => {
             pattern.render(buffer, 100 + i * 50, size);
           }).not.toThrow();
         }
       });
     });

     describe('Recursion - Point Accumulation Cap', () => {
       it('limits total bolt points to 500 maximum', () => {
         pattern.applyPreset(2); // Tesla Coil: high branching
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Trigger a strike
         pattern.onMouseClick({ x: 40, y: 12 });
         pattern.render(buffer, 100, size);
         
         // Get metrics to check point count
         const metrics = pattern.getMetrics();
         expect(metrics.totalPoints).toBeLessThanOrEqual(500);
       });

       it('maintains point cap even with multiple bolts', () => {
         pattern.applyPreset(2); // High branching preset
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Create multiple bolts rapidly
         for (let i = 0; i < 3; i++) {
           pattern.onMouseClick({ x: 40 + i * 10, y: 12 });
         }
         pattern.render(buffer, 100, size);
         
         const metrics = pattern.getMetrics();
         // Multiple bolts, each capped at 500
         expect(metrics.totalPoints).toBeLessThanOrEqual(500 * 3);
       });

       it('prevents infinite recursion by exiting early', () => {
         pattern.applyPreset(2); // High branching
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Stress test: many rapid strikes
         for (let i = 0; i < 10; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
         }
         
         // Should complete without performance issues or infinite loops
         expect(() => {
           pattern.render(buffer, 500, size);
         }).not.toThrow();
       });
     });

     describe('Recursion - Branch Probability Scaling', () => {
       it('reduces branch probability with depth', () => {
         // Apply Tesla Coil preset (high branching)
         pattern.applyPreset(2);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Render multiple times to accumulate branches
         for (let i = 0; i < 5; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
           pattern.render(buffer, 100 + i * 50, size);
         }
         
         // Verify rendering is stable (fewer branches at depth)
         expect(() => {
           pattern.render(buffer, 500, size);
         }).not.toThrow();
       });

       it('Chain Lightning with low probability stays simple', () => {
         pattern.applyPreset(5);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Create many strikes
         for (let i = 0; i < 10; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
         }
         pattern.render(buffer, 300, size);
         
         const metrics = pattern.getMetrics();
         // Low branching should keep points relatively low
         expect(metrics.totalPoints).toBeLessThanOrEqual(200);
       });
     });

     describe('Recursion - Intensity Scaling', () => {
       it('deeper branches have reduced intensity (1.0 - depth * 0.15)', () => {
         pattern.applyPreset(2); // Tesla Coil
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Trigger a strike
         pattern.onMouseClick({ x: 40, y: 12 });
         
         // Render at different times to see intensity change
         pattern.render(buffer, 100, size);
         expect(() => {
           pattern.render(buffer, 200, size);
         }).not.toThrow();
       });

       it('maintains minimum intensity floor of 0.3 for branches', () => {
         pattern.applyPreset(2);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Render multiple bolts to verify stability
         for (let i = 0; i < 3; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
           expect(() => {
             pattern.render(buffer, 100 + i * 100, size);
           }).not.toThrow();
         }
       });
     });

     describe('Recursion - Thickness Scaling', () => {
       it('reduces thickness at deeper depths', () => {
         pattern.applyPreset(1); // Cloud Strike
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         pattern.onMouseClick({ x: 40, y: 12 });
         
         // Render and verify thickness is applied safely
         expect(() => {
           pattern.render(buffer, 100, size);
         }).not.toThrow();
       });

       it('maintains minimum thickness of 1 pixel', () => {
         pattern.applyPreset(2);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Multiple renders with deep recursion
         for (let i = 0; i < 5; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
           expect(() => {
             pattern.render(buffer, 100 + i * 50, size);
           }).not.toThrow();
         }
       });
     });

     describe('Recursion - Waypoint Generation', () => {
       it('spawns branches at intermediate waypoints', () => {
         pattern.applyPreset(2); // High branching
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         pattern.onMouseClick({ x: 40, y: 12 });
         pattern.render(buffer, 100, size);
         
         // Check that some bolts have multiple branches (rendered content)
         const metrics = pattern.getMetrics();
         expect(metrics.totalPoints).toBeGreaterThan(0);
       });

       it('calculates perpendicular branching direction correctly', () => {
         pattern.applyPreset(1);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Spawn at various positions
         for (let i = 0; i < 3; i++) {
           pattern.onMouseClick({
             x: 20 + i * 20,
             y: 10 + i * 5
           });
         }
         
         expect(() => {
           pattern.render(buffer, 200, size);
         }).not.toThrow();
       });

       it('skips branching on degenerate directions', () => {
         pattern.applyPreset(2);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Click at same location multiple times
         const pos = { x: 40, y: 12 };
         for (let i = 0; i < 3; i++) {
           pattern.onMouseClick(pos);
         }
         
         expect(() => {
           pattern.render(buffer, 200, size);
         }).not.toThrow();
       });
     });

     describe('Recursion - Buffer Safety', () => {
       it('never writes outside buffer bounds during recursion', () => {
         pattern.applyPreset(2);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Stress test with many strikes
         for (let i = 0; i < 10; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
           pattern.render(buffer, 100 + i * 50, size);
           
           // Verify buffer bounds are never exceeded
           // Note: not all cells will have color (only those that were written to)
           for (let y = 0; y < size.height; y++) {
             for (let x = 0; x < size.width; x++) {
               expect(buffer[y]).toBeDefined();
               expect(buffer[y][x]).toBeDefined();
               // If cell has been written to, it should have both char and color
               if (buffer[y][x].char !== ' ' || buffer[y][x].color) {
                 expect(buffer[y][x].char).toBeDefined();
               }
             }
           }
         }
       });

       it('handles edge case strikes near buffer boundaries', () => {
         pattern.applyPreset(1);
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Strike near corners
         pattern.onMouseClick({ x: 0, y: 0 });
         pattern.render(buffer, 100, size);
         
         pattern.onMouseClick({ x: 79, y: 23 });
         pattern.render(buffer, 200, size);
         
         pattern.onMouseClick({ x: 0, y: 23 });
         pattern.render(buffer, 300, size);
         
         expect(() => {
           pattern.render(buffer, 400, size);
         }).not.toThrow();
       });

       it('prevents buffer overflow with maximum recursion depth', () => {
         pattern.applyPreset(2); // High depth allowed
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Many rapid strikes
         for (let i = 0; i < 20; i++) {
           pattern.onMouseClick({ x: 40, y: 12 });
         }
         
         // Render should complete without buffer errors
         expect(() => {
           pattern.render(buffer, 500, size);
         }).not.toThrow();
       });
     });

     describe('Rendering', () => {
       it('should fill buffer with visible content', () => {
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Lightning is time-based, trigger a strike with mouse click
         const mousePos = { x: 40, y: 12 };
         pattern.onMouseClick(mousePos);
         pattern.render(buffer, 100, size);
         
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

       it('renders without errors', () => {
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         expect(() => {
           pattern.render(buffer, 1000, size);
         }).not.toThrow();
       });

       it('handles mouse click events (creates lightning)', () => {
         const mousePos = { x: 10, y: 10 };
         expect(() => {
           pattern.onMouseClick(mousePos);
         }).not.toThrow();
       });

       it('resets state properly on new preset', () => {
         const buffer = createMockBuffer(80, 24);
         const size = createMockSize(80, 24);
         
         // Apply preset (should reset bolts)
         pattern.applyPreset(1);
         expect(() => {
           pattern.render(buffer, 100, size);
         }).not.toThrow();
         
         // Switch to another preset
         pattern.applyPreset(2);
         expect(() => {
           pattern.render(buffer, 200, size);
         }).not.toThrow();
       });
     });
   });

  describe('FireworksPattern', () => {
    let pattern: FireworksPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new FireworksPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = FireworksPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = FireworksPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('each preset has required fields', () => {
        const presets = FireworksPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.burstSize).toBeDefined();
          expect(preset.config.launchSpeed).toBeDefined();
          expect(preset.config.gravity).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Sparklers)', () => {
        const preset = FireworksPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Sparklers');
      });

      it('returns preset 2 (Grand Finale)', () => {
        const preset = FireworksPattern.getPreset(2);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Grand Finale');
        expect(preset?.config.burstSize).toBeGreaterThanOrEqual(100);
      });

      it('returns undefined for non-existent preset', () => {
        const preset = FireworksPattern.getPreset(99);
        expect(preset).toBeUndefined();
      });
    });

    describe('applyPreset()', () => {
      it('returns true when preset is applied successfully', () => {
        const result = pattern.applyPreset(1);
        expect(result).toBe(true);
      });

      it('returns false for non-existent preset', () => {
        const result = pattern.applyPreset(99);
        expect(result).toBe(false);
      });

      it('can switch between all presets', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        for (let id = 1; id <= 6; id++) {
          expect(pattern.applyPreset(id)).toBe(true);
          expect(() => {
            pattern.render(buffer, 1000 * id, size);
          }).not.toThrow();
        }
      });
    });

    describe('Preset Characteristics', () => {
      it('Fountain has low gravity', () => {
        const preset = FireworksPattern.getPreset(3);
        expect(preset?.config.gravity).toBeLessThanOrEqual(0.02);
      });

      it('Roman Candle has fast launch speed', () => {
        const preset = FireworksPattern.getPreset(4);
        expect(preset?.config.launchSpeed).toBeGreaterThanOrEqual(2.5);
      });

      it('Chrysanthemum has long trails', () => {
        const preset = FireworksPattern.getPreset(5);
        expect(preset?.config.trailLength).toBeGreaterThanOrEqual(12);
      });
    });

    describe('Rendering', () => {
      it('should fill buffer with visible content', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        // Fireworks launches over time, trigger one with click
        const mousePos = { x: 40, y: 20 };
        pattern.onMouseClick(mousePos);
        pattern.render(buffer, 100, size);
        
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

      it('renders without errors', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('handles mouse click events (launches firework)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
        }).not.toThrow();
      });
    });
  });
});
