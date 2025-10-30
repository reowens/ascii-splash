import { MatrixPattern } from '../../../src/patterns/MatrixPattern';
import { RainPattern } from '../../../src/patterns/RainPattern';
import { QuicksilverPattern } from '../../../src/patterns/QuicksilverPattern';
import { ParticlePattern } from '../../../src/patterns/ParticlePattern';
import { SpiralPattern } from '../../../src/patterns/SpiralPattern';
import { PlasmaPattern } from '../../../src/patterns/PlasmaPattern';
import { TunnelPattern } from '../../../src/patterns/TunnelPattern';
import { LightningPattern } from '../../../src/patterns/LightningPattern';
import { FireworksPattern } from '../../../src/patterns/FireworksPattern';
import { createMockTheme, createMockSize, createMockBuffer } from '../../utils/mocks';

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
      it('Light Drizzle has low density', () => {
        const preset = RainPattern.getPreset(1);
        expect(preset?.config.density).toBe(0.1);
      });

      it('Monsoon has maximum density', () => {
        const preset = RainPattern.getPreset(5);
        expect(preset?.config.density).toBeGreaterThanOrEqual(0.5);
        expect(preset?.config.speed).toBeGreaterThan(2);
      });

      it('Mist has slow speed', () => {
        const preset = RainPattern.getPreset(4);
        expect(preset?.config.speed).toBeLessThan(0.5);
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
          expect(preset.config.spiralCount).toBeDefined();
          expect(preset.config.rotationSpeed).toBeDefined();
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Twin Vortex)', () => {
        const preset = SpiralPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Twin Vortex');
        expect(preset?.config.spiralCount).toBe(2);
      });

      it('returns preset 6 (Nautilus Shell)', () => {
        const preset = SpiralPattern.getPreset(6);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Nautilus Shell');
        expect(preset?.config.spiralCount).toBe(1);
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
      it('Galaxy Arms has 5 spiral arms', () => {
        const preset = SpiralPattern.getPreset(2);
        expect(preset?.config.spiralCount).toBe(5);
      });

      it('Fibonacci Bloom has 8 arms', () => {
        const preset = SpiralPattern.getPreset(3);
        expect(preset?.config.spiralCount).toBe(8);
      });

      it('Hypnotic Spin has fast rotation', () => {
        const preset = SpiralPattern.getPreset(4);
        expect(preset?.config.rotationSpeed).toBeGreaterThanOrEqual(1.5);
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
      it('returns array of 6 presets', () => {
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
        });
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Gentle Waves)', () => {
        const preset = PlasmaPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Gentle Waves');
      });

      it('returns preset 5 (Electric Storm)', () => {
        const preset = PlasmaPattern.getPreset(5);
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
      it('Lava Lamp has low frequency', () => {
        const preset = PlasmaPattern.getPreset(4);
        expect(preset?.config.frequency).toBeLessThanOrEqual(0.05);
      });

      it('Turbulent Energy has high speed', () => {
        const preset = PlasmaPattern.getPreset(3);
        expect(preset?.config.speed).toBeGreaterThan(1.5);
      });

      it('Cosmic Nebula has minimal complexity', () => {
        const preset = PlasmaPattern.getPreset(6);
        expect(preset?.config.complexity).toBe(1);
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
      it('returns preset 1 (Circle Tunnel)', () => {
        const preset = TunnelPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Circle Tunnel');
        expect(preset?.config.shape).toBe('circle');
      });

      it('returns preset 3 (Square Vortex)', () => {
        const preset = TunnelPattern.getPreset(3);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Square Vortex');
        expect(preset?.config.shape).toBe('square');
      });

      it('returns preset 6 (Stargate)', () => {
        const preset = TunnelPattern.getPreset(6);
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
      it('Hyperspeed has high speed', () => {
        const preset = TunnelPattern.getPreset(2);
        expect(preset?.config.speed).toBeGreaterThanOrEqual(2.5);
      });

      it('Triangle Warp has triangle shape', () => {
        const preset = TunnelPattern.getPreset(4);
        expect(preset?.config.shape).toBe('triangle');
      });

      it('Hexagon Grid has hexagon shape', () => {
        const preset = TunnelPattern.getPreset(5);
        expect(preset?.config.shape).toBe('hexagon');
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
          expect(preset.config.boltDensity).toBeDefined();
          expect(preset.config.branchProbability).toBeDefined();
          expect(preset.config.strikeInterval).toBeDefined();
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
      it('Chain Lightning has short strike interval', () => {
        const preset = LightningPattern.getPreset(5);
        expect(preset?.config.strikeInterval).toBeLessThan(1000);
      });

      it('Spider Lightning has high branch probability', () => {
        const preset = LightningPattern.getPreset(6);
        expect(preset?.config.branchProbability).toBeGreaterThanOrEqual(0.5);
      });

      it('Chain Lightning has thick bolts', () => {
        const preset = LightningPattern.getPreset(5);
        expect(preset?.config.thickness).toBeGreaterThanOrEqual(3);
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

      it('handles mouse click events (creates lightning)', () => {
        const mousePos = { x: 10, y: 10 };
        expect(() => {
          pattern.onMouseClick(mousePos);
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
