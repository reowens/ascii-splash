import { WavePattern } from '../../../src/patterns/WavePattern';
import { StarfieldPattern } from '../../../src/patterns/StarfieldPattern';
import { createMockTheme, createMockSize, createMockBuffer } from '../../utils/mocks';

describe('Pattern Presets', () => {
  describe('WavePattern Presets', () => {
    let pattern: WavePattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new WavePattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = WavePattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('returns a copy of presets (not reference)', () => {
        const presets1 = WavePattern.getPresets();
        const presets2 = WavePattern.getPresets();
        expect(presets1).not.toBe(presets2);
      });

      it('each preset has required fields', () => {
        const presets = WavePattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.speed).toBeDefined();
          expect(preset.config.amplitude).toBeDefined();
          expect(preset.config.frequency).toBeDefined();
          expect(preset.config.layers).toBeDefined();
        });
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = WavePattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('all preset names are unique', () => {
        const presets = WavePattern.getPresets();
        const names = presets.map(p => p.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(6);
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Calm Seas)', () => {
        const preset = WavePattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Calm Seas');
        expect(preset?.config.speed).toBe(0.5);
      });

      it('returns preset 2 (Ocean Storm)', () => {
        const preset = WavePattern.getPreset(2);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Ocean Storm');
        expect(preset?.config.amplitude).toBe(8);
      });

      it('returns undefined for non-existent preset', () => {
        const preset = WavePattern.getPreset(99);
        expect(preset).toBeUndefined();
      });

      it('returns undefined for preset ID 0', () => {
        const preset = WavePattern.getPreset(0);
        expect(preset).toBeUndefined();
      });

      it('returns undefined for negative preset ID', () => {
        const preset = WavePattern.getPreset(-1);
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

      it('applies Calm Seas preset (ID 1)', () => {
        pattern.applyPreset(1);
        // Verify config was updated (indirectly by rendering)
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        // Should not throw
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('applies Ocean Storm preset (ID 2)', () => {
        pattern.applyPreset(2);
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('switching presets resets internal state', () => {
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        const mousePos = { x: 10, y: 10 };
        
        // Create some ripples
        pattern.onMouseClick(mousePos);
        pattern.render(buffer, 1000, size);
        
        // Apply new preset (should clear ripples)
        pattern.applyPreset(3);
        
        // Should render without errors
        expect(() => {
          pattern.render(buffer, 2000, size);
        }).not.toThrow();
      });

      it('can apply same preset multiple times', () => {
        expect(pattern.applyPreset(1)).toBe(true);
        expect(pattern.applyPreset(1)).toBe(true);
        expect(pattern.applyPreset(1)).toBe(true);
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
      it('Calm Seas has low speed and amplitude', () => {
        const preset = WavePattern.getPreset(1);
        expect(preset?.config.speed).toBeLessThan(1);
        expect(preset?.config.amplitude).toBeLessThan(5);
      });

      it('Ocean Storm has high amplitude and multiple layers', () => {
        const preset = WavePattern.getPreset(2);
        expect(preset?.config.amplitude).toBeGreaterThan(5);
        expect(preset?.config.layers).toBeGreaterThan(3);
      });

      it('Glass Lake has minimal amplitude and single layer', () => {
        const preset = WavePattern.getPreset(4);
        expect(preset?.config.amplitude).toBeLessThanOrEqual(2);
        expect(preset?.config.layers).toBe(1);
      });

      it('Tsunami has very high amplitude', () => {
        const preset = WavePattern.getPreset(5);
        expect(preset?.config.amplitude).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe('StarfieldPattern Presets', () => {
    let pattern: StarfieldPattern;
    const mockTheme = createMockTheme();

    beforeEach(() => {
      pattern = new StarfieldPattern(mockTheme);
    });

    describe('getPresets()', () => {
      it('returns array of 6 presets', () => {
        const presets = StarfieldPattern.getPresets();
        expect(presets).toHaveLength(6);
      });

      it('each preset has required fields', () => {
        const presets = StarfieldPattern.getPresets();
        presets.forEach(preset => {
          expect(preset.id).toBeDefined();
          expect(preset.name).toBeDefined();
          expect(preset.description).toBeDefined();
          expect(preset.config).toBeDefined();
          expect(preset.config.starCount).toBeDefined();
          expect(preset.config.speed).toBeDefined();
        });
      });

      it('preset IDs are sequential 1-6', () => {
        const presets = StarfieldPattern.getPresets();
        const ids = presets.map(p => p.id).sort();
        expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      });
    });

    describe('getPreset()', () => {
      it('returns preset 1 (Deep Space)', () => {
        const preset = StarfieldPattern.getPreset(1);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Deep Space');
      });

      it('returns preset 2 (Warp Speed)', () => {
        const preset = StarfieldPattern.getPreset(2);
        expect(preset).toBeDefined();
        expect(preset?.name).toBe('Warp Speed');
      });

      it('returns undefined for non-existent preset', () => {
        const preset = StarfieldPattern.getPreset(99);
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

      it('applies Deep Space preset (ID 1)', () => {
        pattern.applyPreset(1);
        const buffer = createMockBuffer(80, 24);
        const size = createMockSize(80, 24);
        
        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      });

      it('applies Warp Speed preset (ID 2)', () => {
        pattern.applyPreset(2);
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
      it('Deep Space has calm settings', () => {
        const preset = StarfieldPattern.getPreset(1);
        expect(preset?.config.speed).toBeLessThan(50);
      });

      it('Warp Speed has high speed', () => {
        const preset = StarfieldPattern.getPreset(2);
        expect(preset?.config.speed).toBeGreaterThan(2);
      });

      it('Asteroid Field has many stars', () => {
        const preset = StarfieldPattern.getPreset(3);
        expect(preset?.config.starCount).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Preset System Integration', () => {
    it('WavePattern and StarfieldPattern have consistent preset IDs (1-6)', () => {
      const wavePresets = WavePattern.getPresets();
      const starfieldPresets = StarfieldPattern.getPresets();
      
      expect(wavePresets.length).toBe(starfieldPresets.length);
      expect(wavePresets.map(p => p.id).sort()).toEqual([1, 2, 3, 4, 5, 6]);
      expect(starfieldPresets.map(p => p.id).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('patterns can be rendered after applying presets', () => {
      const buffer = createMockBuffer(80, 24);
      const size = createMockSize(80, 24);
      const theme = createMockTheme();
      
      const wavePattern = new WavePattern(theme);
      const starfieldPattern = new StarfieldPattern(theme);
      
      wavePattern.applyPreset(1);
      starfieldPattern.applyPreset(1);
      
      expect(() => {
        wavePattern.render(buffer, 1000, size);
        starfieldPattern.render(buffer, 1000, size);
      }).not.toThrow();
    });

    it('invalid preset IDs are handled gracefully', () => {
      const theme = createMockTheme();
      const wavePattern = new WavePattern(theme);
      const starfieldPattern = new StarfieldPattern(theme);
      
      expect(wavePattern.applyPreset(0)).toBe(false);
      expect(wavePattern.applyPreset(-1)).toBe(false);
      expect(wavePattern.applyPreset(999)).toBe(false);
      
      expect(starfieldPattern.applyPreset(0)).toBe(false);
      expect(starfieldPattern.applyPreset(-1)).toBe(false);
      expect(starfieldPattern.applyPreset(999)).toBe(false);
    });
  });
});
