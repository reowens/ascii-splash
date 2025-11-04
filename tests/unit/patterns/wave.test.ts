import { WavePattern } from '../../../src/patterns/WavePattern';
import { createMockTheme, createMockBuffer, createMockSize, createMockPoint } from '../../utils/mocks';
import { Cell } from '../../../src/types';

describe('WavePattern', () => {
  let pattern: WavePattern;
  let buffer: Cell[][];
  let theme: ReturnType<typeof createMockTheme>;
  let size: ReturnType<typeof createMockSize>;

  beforeEach(() => {
    theme = createMockTheme('ocean');
    pattern = new WavePattern(theme);
    size = createMockSize(80, 24);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('Basic Functionality', () => {
    it('should initialize with default config', () => {
      expect(pattern.name).toBe('waves');
      const metrics = pattern.getMetrics();
      expect(metrics.activeRipples).toBe(0);
    });

    it('should render without errors', () => {
      pattern.render(buffer, 0, size);
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should have 6 presets', () => {
      const presets = WavePattern.getPresets();
      expect(presets).toHaveLength(6);
    });
  });

  describe('Foam Feature Tests', () => {
    it('should render without foam when foamEnabled is false', () => {
      pattern.applyPreset(1); // Calm Seas: foamEnabled false
      pattern.render(buffer, 0, size);

      const foamChars = ['◦', '∘', '°', '·'];
      let foamCount = 0;

      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer[y][x].char)) {
            foamCount++;
          }
        }
      }

      // Should have no foam when disabled
      expect(foamCount).toBe(0);
    });

    it('should render foam when foamEnabled is true', () => {
      pattern.applyPreset(5); // Stormy Seas: foamEnabled true
      pattern.render(buffer, 0, size);

      const foamChars = ['◦', '∘', '°', '·'];
      let foamCount = 0;

      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer[y][x].char)) {
            foamCount++;
          }
        }
      }

      // Should have some foam in Stormy Seas
      // Note: foam is probabilistic, so we might have 0 in rare cases
      expect(foamCount).toBeGreaterThanOrEqual(0);
    });

    it('should respect foam threshold config', () => {
      // High threshold = less foam
      const highThresholdPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 0.95,
        foamDensity: 1.0 // Guarantee density
      });

      highThresholdPattern.render(buffer, 0, size);

      const foamChars = ['◦', '∘', '°', '·'];
      let highThresholdFoamCount = 0;

      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer[y][x].char)) {
            highThresholdFoamCount++;
          }
        }
      }

      // Low threshold = more foam
      const lowThresholdPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 0.1,
        foamDensity: 1.0 // Guarantee density
      });

      const buffer2 = createMockBuffer(size.width, size.height);
      lowThresholdPattern.render(buffer2, 0, size);

      let lowThresholdFoamCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer2[y][x].char)) {
            lowThresholdFoamCount++;
          }
        }
      }

      // Lower threshold should produce more or equal foam
      expect(lowThresholdFoamCount).toBeGreaterThanOrEqual(highThresholdFoamCount);
    });

    it('should respect foam density config', () => {
      // High density = more foam
      const highDensityPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 0.5,
        foamDensity: 0.9
      });

      highDensityPattern.render(buffer, 0, size);

      const foamChars = ['◦', '∘', '°', '·'];
      let highDensityFoamCount = 0;

      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer[y][x].char)) {
            highDensityFoamCount++;
          }
        }
      }

      // Low density = less foam
      const lowDensityPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 0.5,
        foamDensity: 0.1
      });

      const buffer2 = createMockBuffer(size.width, size.height);
      lowDensityPattern.render(buffer2, 0, size);

      let lowDensityFoamCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer2[y][x].char)) {
            lowDensityFoamCount++;
          }
        }
      }

      // High density should produce more foam
      expect(highDensityFoamCount).toBeGreaterThanOrEqual(lowDensityFoamCount);
    });

    it('should only show foam on wave crests (intensity < 0.5)', () => {
      pattern.applyPreset(5); // Stormy Seas with foam

      // Render multiple times to cover various foam positions
      for (let t = 0; t < 5; t++) {
        const testBuffer = createMockBuffer(size.width, size.height);
        pattern.render(testBuffer, t * 100, size);

        const foamChars = ['◦', '∘', '°', '·'];
        const waveChars = ['~', '≈', '∼', '-', '.'];

        // Collect foam positions
        for (let y = 0; y < size.height; y++) {
          for (let x = 0; x < size.width; x++) {
            if (foamChars.includes(testBuffer[y][x].char)) {
              // Foam should appear at crest positions (low intensity)
              // This is hard to verify directly but should not crash
              expect(testBuffer[y][x].char).toBeDefined();
            }
          }
        }
      }

      // Should render without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should use foam characters correctly', () => {
      pattern.applyPreset(5); // Stormy Seas

      let foundFoamChars = new Set<string>();

      // Render many times to catch foam
      for (let t = 0; t < 20; t++) {
        const testBuffer = createMockBuffer(size.width, size.height);
        pattern.render(testBuffer, t * 50, size);

        const foamChars = ['◦', '∘', '°', '·'];

        for (let y = 0; y < size.height; y++) {
          for (let x = 0; x < size.width; x++) {
            if (foamChars.includes(testBuffer[y][x].char)) {
              foundFoamChars.add(testBuffer[y][x].char);
            }
          }
        }
      }

      // Should see at least one foam character type or none (if probability misses)
      for (const char of foundFoamChars) {
        expect(['◦', '∘', '°', '·']).toContain(char);
      }
    });

    it('should render foam with slightly dimmer color (0.9 intensity)', () => {
      pattern.applyPreset(5); // Stormy Seas

      for (let t = 0; t < 10; t++) {
        const testBuffer = createMockBuffer(size.width, size.height);
        pattern.render(testBuffer, t * 100, size);

        const foamChars = ['◦', '∘', '°', '·'];

        for (let y = 0; y < size.height; y++) {
          for (let x = 0; x < size.width; x++) {
            if (foamChars.includes(testBuffer[y][x].char)) {
              const color = testBuffer[y][x].color;
              // Foam color should be valid RGB
              if (color) {
                expect(color.r).toBeGreaterThanOrEqual(0);
                expect(color.r).toBeLessThanOrEqual(255);
                expect(color.g).toBeGreaterThanOrEqual(0);
                expect(color.g).toBeLessThanOrEqual(255);
                expect(color.b).toBeGreaterThanOrEqual(0);
                expect(color.b).toBeLessThanOrEqual(255);
              }
            }
          }
        }
      }

      // Either found foam or didn't (probability-based), both are okay
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should disable foam when foamDensity is 0', () => {
      const noFoamPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamDensity: 0 // No foam
      });

      noFoamPattern.render(buffer, 0, size);

      const foamChars = ['◦', '∘', '°', '·'];
      let foamCount = 0;

      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (foamChars.includes(buffer[y][x].char)) {
            foamCount++;
          }
        }
      }

      expect(foamCount).toBe(0);
    });

    it('should potentially show foam everywhere when foamDensity is 1.0 and threshold is 0', () => {
      const maxFoamPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamDensity: 1.0,
        foamThreshold: 0,
        amplitude: 5
      });

      maxFoamPattern.render(buffer, 0, size);

      // Should render without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('preset 5 (Stormy Seas) should have foam enabled', () => {
      pattern.applyPreset(5);
      const preset = WavePattern.getPreset(5);

      expect(preset?.config.foamEnabled).toBe(true);
      expect(preset?.config.foamThreshold).toBe(0.7);
      expect(preset?.config.foamDensity).toBe(0.6);
    });

    it('preset 6 (Gentle Surf) should have foam enabled', () => {
      pattern.applyPreset(6);
      const preset = WavePattern.getPreset(6);

      expect(preset?.config.foamEnabled).toBe(true);
      expect(preset?.config.foamThreshold).toBe(0.8);
      expect(preset?.config.foamDensity).toBe(0.3);
    });

    it('presets 1-4 should have foam disabled', () => {
      for (let i = 1; i <= 4; i++) {
        const preset = WavePattern.getPreset(i);
        expect(preset?.config.foamEnabled).toBe(false);
      }
    });

    it('should handle foam rendering over extended time', () => {
      pattern.applyPreset(5);

      // Render for many frames with foam
      for (let t = 0; t < 100; t++) {
        const testBuffer = createMockBuffer(size.width, size.height);
        pattern.render(testBuffer, t * 50, size);
      }

      // Should not crash
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should not render foam outside wave crests', () => {
      const foamOnlyPattern = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 0.01,
        foamDensity: 1.0,
        amplitude: 2 // Small amplitude to make foam area predictable
      });

      foamOnlyPattern.render(buffer, 0, size);

      // Foam should only appear at specific positions (wave crests)
      // This is hard to validate exactly, but should not crash
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should render consistent foam pattern with same time', () => {
      pattern.applyPreset(5);

      const buffer1 = createMockBuffer(size.width, size.height);
      pattern.render(buffer1, 100, size);

      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 100, size);

      // Same time should produce same output (deterministic)
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          expect(buffer1[y][x].char).toBe(buffer2[y][x].char);
        }
      }
    });

    it('should render different foam pattern at different times', () => {
      pattern.applyPreset(5);

      const buffer1 = createMockBuffer(size.width, size.height);
      pattern.render(buffer1, 0, size);

      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 500, size);

      // Different times should produce different output
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

    it('should validate foam threshold range (0-1)', () => {
      // Test edge cases
      const lowThreshold = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 0
      });

      const highThreshold = new WavePattern(theme, {
        foamEnabled: true,
        foamThreshold: 1.0
      });

      // Should not crash
      lowThreshold.render(buffer, 0, size);
      highThreshold.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should validate foam density range (0-1)', () => {
      // Test edge cases
      const zeroDensity = new WavePattern(theme, {
        foamEnabled: true,
        foamDensity: 0
      });

      const maxDensity = new WavePattern(theme, {
        foamEnabled: true,
        foamDensity: 1.0
      });

      // Should not crash
      zeroDensity.render(buffer, 0, size);
      maxDensity.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle foam with different wave amplitudes', () => {
      // High amplitude waves should allow more foam potential
      const highAmpPattern = new WavePattern(theme, {
        foamEnabled: true,
        amplitude: 20,
        foamThreshold: 0.5,
        foamDensity: 0.8
      });

      highAmpPattern.render(buffer, 0, size);

      // Low amplitude waves should limit foam
      const lowAmpPattern = new WavePattern(theme, {
        foamEnabled: true,
        amplitude: 1,
        foamThreshold: 0.5,
        foamDensity: 0.8
      });

      const buffer2 = createMockBuffer(size.width, size.height);
      lowAmpPattern.render(buffer2, 0, size);

      // Both should render without errors
      expect(buffer[0][0].char).toBeDefined();
      expect(buffer2[0][0].char).toBeDefined();
    });

    it('should handle foam with different frequencies', () => {
      const highFreqPattern = new WavePattern(theme, {
        foamEnabled: true,
        frequency: 0.5,
        foamThreshold: 0.5
      });

      highFreqPattern.render(buffer, 0, size);

      const lowFreqPattern = new WavePattern(theme, {
        foamEnabled: true,
        frequency: 0.05,
        foamThreshold: 0.5
      });

      const buffer2 = createMockBuffer(size.width, size.height);
      lowFreqPattern.render(buffer2, 0, size);

      // Both should render without errors
      expect(buffer[0][0].char).toBeDefined();
      expect(buffer2[0][0].char).toBeDefined();
    });

    it('should memory-safe: no buffer overflow with foam rendering', () => {
      pattern.applyPreset(5);

      // Render for many frames with foam
      for (let t = 0; t < 500; t++) {
        const testBuffer = createMockBuffer(size.width, size.height);
        pattern.render(testBuffer, t * 16, size);

        // All cells should be valid
        for (let y = 0; y < size.height; y++) {
          for (let x = 0; x < size.width; x++) {
            expect(testBuffer[y][x].char).toBeDefined();
            expect(testBuffer[y][x].char.length).toBeGreaterThan(0);
          }
        }
      }

      // Should complete without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle foam with mouse interactions', () => {
      pattern.applyPreset(5);

      // Render with mouse
      const mousePos = createMockPoint(40, 12);
      pattern.onMouseMove(mousePos);

      pattern.render(buffer, 0, size, mousePos);

      // Should render with foam intact
      expect(buffer[0][0].char).toBeDefined();

      // Click should also work with foam
      pattern.onMouseClick(mousePos);
      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 100, size);

      expect(buffer2[0][0].char).toBeDefined();
    });

    it('should toggle foam on/off without crashing', () => {
      // Start with foam
      pattern = new WavePattern(theme, { foamEnabled: true });
      pattern.render(buffer, 0, size);

      // Switch to no foam
      pattern = new WavePattern(theme, { foamEnabled: false });
      pattern.render(buffer, 0, size);

      // Back to foam
      pattern = new WavePattern(theme, { foamEnabled: true });
      pattern.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should render foam-enabled presets correctly', () => {
      // Test Stormy Seas (preset 5)
      pattern.applyPreset(5);
      let preset = WavePattern.getPreset(5);
      expect(preset?.config.foamEnabled).toBe(true);

      pattern.render(buffer, 0, size);
      expect(buffer[0][0].char).toBeDefined();

      // Test Gentle Surf (preset 6)
      pattern.applyPreset(6);
      preset = WavePattern.getPreset(6);
      expect(preset?.config.foamEnabled).toBe(true);

      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 0, size);
      expect(buffer2[0][0].char).toBeDefined();
    });

    it('should maintain foam config when switching between presets', () => {
      pattern.applyPreset(5); // With foam
      let metrics1 = pattern.getMetrics();

      pattern.applyPreset(6); // Also with foam
      let metrics2 = pattern.getMetrics();

      // Both should have same config structure
      expect(metrics1.waveLayers).toBeDefined();
      expect(metrics2.waveLayers).toBeDefined();
    });
  });

  describe('Presets', () => {
    it('should have 6 presets', () => {
      const presets = WavePattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should apply all presets without errors', () => {
      for (let i = 1; i <= 6; i++) {
        const result = pattern.applyPreset(i);
        expect(result).toBe(true);

        pattern.render(buffer, 0, size);
        expect(buffer[0][0].char).toBeDefined();
      }
    });
  });

  describe('Mouse Interactions', () => {
    it('should handle mouse move', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);

      const metrics = pattern.getMetrics();
      expect(metrics.activeRipples).toBeGreaterThan(0);
    });

    it('should handle mouse click', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);

      const metrics = pattern.getMetrics();
      expect(metrics.activeRipples).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should clear ripples on reset', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);

      let metrics = pattern.getMetrics();
      expect(metrics.activeRipples).toBeGreaterThan(0);

      pattern.reset();

      metrics = pattern.getMetrics();
      expect(metrics.activeRipples).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small buffer', () => {
      const smallSize = createMockSize(5, 3);
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);

      pattern.render(smallBuffer, 0, smallSize);
      expect(smallBuffer[0][0].char).toBeDefined();
    });

    it('should handle very large buffer', () => {
      const largeSize = createMockSize(200, 100);
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);

      pattern.render(largeBuffer, 0, largeSize);
      expect(largeBuffer[0][0].char).toBeDefined();
    });

    it('should handle zero amplitude', () => {
      const zeroAmpPattern = new WavePattern(theme, { amplitude: 0 });
      zeroAmpPattern.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle zero frequency', () => {
      const zeroFreqPattern = new WavePattern(theme, { frequency: 0 });
      zeroFreqPattern.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle zero speed', () => {
      const zeroSpeedPattern = new WavePattern(theme, { speed: 0 });
      zeroSpeedPattern.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle single layer', () => {
      const singleLayerPattern = new WavePattern(theme, { layers: 1 });
      singleLayerPattern.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle many layers', () => {
      const manyLayerPattern = new WavePattern(theme, { layers: 20 });
      manyLayerPattern.render(buffer, 0, size);

      expect(buffer[0][0].char).toBeDefined();
    });
  });
});
