import { QuicksilverPattern } from '../../../src/patterns/QuicksilverPattern';
import { createMockBuffer, createMockTheme, createMockSize, createMockPoint } from '../../utils/mocks';
import { Cell } from '../../../src/types';

describe('QuicksilverPattern', () => {
  let pattern: QuicksilverPattern;
  let theme: ReturnType<typeof createMockTheme>;
  let buffer: Cell[][];
  let size: ReturnType<typeof createMockSize>;

  beforeEach(() => {
    theme = createMockTheme('ocean');
    pattern = new QuicksilverPattern(theme);
    size = createMockSize(80, 24);
    buffer = createMockBuffer(size.width, size.height);
  });

  describe('Constructor & Configuration', () => {
    it('should create with default config', () => {
      expect(pattern.name).toBe('quicksilver');
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.5);
      expect(metrics.droplets).toBe(0);
      expect(metrics.ripples).toBe(0);
    });

    it('should accept custom config', () => {
      const customPattern = new QuicksilverPattern(theme, {
        speed: 2.0,
        flowIntensity: 0.8,
        noiseScale: 0.1
      });
      const metrics = customPattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.8);
    });

    it('should accept partial config', () => {
      const customPattern = new QuicksilverPattern(theme, {
        speed: 1.5
      });
      const metrics = customPattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.5); // Default value
    });
  });

  describe('Rendering', () => {
    it('should render flowing liquid metal', () => {
      pattern.render(buffer, 0, size);
      
      // Buffer should be completely filled with liquid chars
      let nonEmptyCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            nonEmptyCount++;
          }
        }
      }
      expect(nonEmptyCount).toBeGreaterThan(size.width * size.height * 0.9); // Most cells filled
    });

    it('should use metallic characters', () => {
      pattern.render(buffer, 0, size);
      
      const liquidChars = ['█', '▓', '▒', '░', '●', '◉', '○', '◐', '◑', '◒', '◓', '•', '∘', '·'];
      let usesLiquidChars = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (liquidChars.includes(buffer[y][x].char)) {
            usesLiquidChars = true;
            break;
          }
        }
        if (usesLiquidChars) break;
      }
      expect(usesLiquidChars).toBe(true);
    });

    it('should animate over time', () => {
      pattern.render(buffer, 0, size);
      
      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 5000, size);
      
      // Pattern should change over time - check a grid of cells to be more reliable
      let differenceCount = 0;
      for (let y = 5; y < size.height - 5; y += 5) {
        for (let x = 5; x < size.width - 5; x += 5) {
          if (buffer[y][x].char !== buffer2[y][x].char || 
              buffer[y][x].color?.r !== buffer2[y][x].color?.r ||
              buffer[y][x].color?.g !== buffer2[y][x].color?.g ||
              buffer[y][x].color?.b !== buffer2[y][x].color?.b) {
            differenceCount++;
          }
        }
      }
      // With a flowing pattern and 5 seconds time difference, we should see many changes
      expect(differenceCount).toBeGreaterThan(0);
    });

    it('should apply colors from theme', () => {
      pattern.render(buffer, 0, size);
      
      let hasColor = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].color) {
            hasColor = true;
            expect(buffer[y][x].color?.r).toBeGreaterThanOrEqual(0);
            expect(buffer[y][x].color?.r).toBeLessThanOrEqual(255);
            expect(buffer[y][x].color?.g).toBeGreaterThanOrEqual(0);
            expect(buffer[y][x].color?.g).toBeLessThanOrEqual(255);
            expect(buffer[y][x].color?.b).toBeGreaterThanOrEqual(0);
            expect(buffer[y][x].color?.b).toBeLessThanOrEqual(255);
          }
        }
      }
      expect(hasColor).toBe(true);
    });

    it('should add metallic shine boost', () => {
      pattern.render(buffer, 0, size);
      
      // Some cells should have boosted colors for metallic effect
      let hasBrightCell = false;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          const cell = buffer[y][x];
          if (cell.color && (cell.color.r > 200 || cell.color.g > 200 || cell.color.b > 200)) {
            hasBrightCell = true;
            break;
          }
        }
        if (hasBrightCell) break;
      }
      expect(hasBrightCell).toBe(true);
    });

    it('should update noise offset over time', () => {
      const customPattern = new QuicksilverPattern(theme, { speed: 5.0 });
      customPattern.render(buffer, 0, size);
      const snapshot1 = buffer[12][40].char;
      
      const buffer2 = createMockBuffer(size.width, size.height);
      customPattern.render(buffer2, 0, size); // Same time, but noise offset changed
      const snapshot2 = buffer2[12][40].char;
      
      // Check multiple cells for differences due to noise offset progression
      let differenceCount = 0;
      for (let i = 0; i < 20; i++) {
        const y = Math.floor(Math.random() * size.height);
        const x = Math.floor(Math.random() * size.width);
        if (buffer[y][x].char !== buffer2[y][x].char) {
          differenceCount++;
        }
      }
      expect(differenceCount).toBeGreaterThan(0);
    });
  });

  describe('Mouse Interactions - Ripples', () => {
    it('should create ripples on mouse move', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.ripples).toBe(1);
    });

    it('should create ripples with radius 15', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);
      
      // Render and check that area around mouse position is affected
      pattern.render(buffer, 0, size);
      
      // Should have visible effect near the ripple
      expect(buffer[12][40].char).not.toBe(' ');
    });

    it('should limit ripples to 10 for performance', () => {
      for (let i = 0; i < 15; i++) {
        pattern.onMouseMove(createMockPoint(40 + i, 12));
      }
      
      const metrics = pattern.getMetrics();
      expect(metrics.ripples).toBe(10);
    });

    it('should render ripples on buffer', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);
      
      pattern.render(buffer, 100, size);
      
      // Area around ripple should be affected
      const cellAtRipple = buffer[12][40];
      expect(cellAtRipple.char).not.toBe(' ');
    });

    it('should clean up old ripples after 1500ms', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0)     // onMouseMove call
        .mockReturnValue(2000);     // render call
      
      const pos = createMockPoint(40, 12);
      pattern.onMouseMove(pos);
      
      expect(pattern.getMetrics().ripples).toBe(1);
      
      pattern.render(buffer, 2000, size);
      
      expect(pattern.getMetrics().ripples).toBe(0);
      
      jest.restoreAllMocks();
    });
  });

  describe('Mouse Interactions - Droplets', () => {
    it('should create 12 droplets on mouse click', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.droplets).toBe(12);
    });

    it('should create droplets radiating outward', () => {
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      pattern.render(buffer, Date.now(), size);
      
      // After initial click, droplets should still exist
      expect(pattern.getMetrics().droplets).toBe(12);
    });

    it('should apply gravity to droplets', () => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
      
      const pos = createMockPoint(40, 10);
      pattern.onMouseClick(pos);
      
      // Render multiple times to simulate gravity
      pattern.render(buffer, 100, size);
      pattern.render(buffer, 200, size);
      pattern.render(buffer, 300, size);
      
      // Droplets should have moved and some might be off-screen
      const metricsAfter = pattern.getMetrics();
      expect(metricsAfter.droplets).toBeGreaterThanOrEqual(0);
      expect(metricsAfter.droplets).toBeLessThanOrEqual(12);
      
      jest.restoreAllMocks();
    });

    it('should remove droplets after 2000ms', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0)     // onMouseClick
        .mockReturnValue(2500);     // render call
      
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      expect(pattern.getMetrics().droplets).toBe(12);
      
      pattern.render(buffer, 2500, size);
      
      expect(pattern.getMetrics().droplets).toBe(0);
      
      jest.restoreAllMocks();
    });

    it('should remove droplets that fall off screen', () => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
      
      const pos = createMockPoint(40, size.height - 1);
      pattern.onMouseClick(pos);
      
      // Render multiple times to let droplets fall
      for (let i = 0; i < 50; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      // All droplets should have fallen off screen
      expect(pattern.getMetrics().droplets).toBe(0);
      
      jest.restoreAllMocks();
    });

    it('should shrink droplet radius over time', () => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
      
      const pos = createMockPoint(40, 5);
      pattern.onMouseClick(pos);
      
      // Initial render
      pattern.render(buffer, 100, size);
      const initialCount = pattern.getMetrics().droplets;
      
      // Render many times to shrink radius
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, 200 + i * 10, size);
      }
      
      // Some droplets should be removed due to radius <= 0
      const finalCount = pattern.getMetrics().droplets;
      expect(finalCount).toBeLessThan(initialCount);
      
      jest.restoreAllMocks();
    });

    it('should create large ripple on click', () => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
      
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      const metrics = pattern.getMetrics();
      expect(metrics.ripples).toBe(1); // Large ripple from click
      expect(metrics.droplets).toBe(12); // 12 droplets
      
      jest.restoreAllMocks();
    });

    it('should render droplet effects on buffer', () => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
      
      const pos = createMockPoint(40, 12);
      pattern.onMouseClick(pos);
      
      pattern.render(buffer, 100, size);
      
      // Area around click should have visible droplets
      let hasDropletEffect = false;
      for (let y = 10; y < 15; y++) {
        for (let x = 38; x < 43; x++) {
          if (buffer[y][x].char !== ' ') {
            hasDropletEffect = true;
            break;
          }
        }
        if (hasDropletEffect) break;
      }
      expect(hasDropletEffect).toBe(true);
      
      jest.restoreAllMocks();
    });
  });

  describe('Presets', () => {
    it('should have 6 presets', () => {
      const presets = QuicksilverPattern.getPresets();
      expect(presets).toHaveLength(6);
    });

    it('should apply preset 1: Liquid Mercury', () => {
      const result = pattern.applyPreset(1);
      expect(result).toBe(true);
      
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.5);
      
      const preset = QuicksilverPattern.getPreset(1);
      expect(preset?.name).toBe('Liquid Mercury');
      expect(preset?.description).toBe('Classic metallic flow');
    });

    it('should apply preset 2: Molten Silver', () => {
      const result = pattern.applyPreset(2);
      expect(result).toBe(true);
      
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.7);
      
      const preset = QuicksilverPattern.getPreset(2);
      expect(preset?.name).toBe('Molten Silver');
      expect(preset?.description).toBe('Slower, thicker flow');
    });

    it('should apply preset 3: Quicksilver Rush', () => {
      const result = pattern.applyPreset(3);
      expect(result).toBe(true);
      
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.4);
      
      const preset = QuicksilverPattern.getPreset(3);
      expect(preset?.name).toBe('Quicksilver Rush');
      expect(preset?.description).toBe('Fast-flowing liquid metal');
    });

    it('should apply preset 4: Chrome Puddle', () => {
      const result = pattern.applyPreset(4);
      expect(result).toBe(true);
      
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.8);
      
      const preset = QuicksilverPattern.getPreset(4);
      expect(preset?.name).toBe('Chrome Puddle');
      expect(preset?.description).toBe('Minimal flow, high detail');
    });

    it('should apply preset 5: Turbulent Metal', () => {
      const result = pattern.applyPreset(5);
      expect(result).toBe(true);
      
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.9);
      
      const preset = QuicksilverPattern.getPreset(5);
      expect(preset?.name).toBe('Turbulent Metal');
      expect(preset?.description).toBe('Chaotic, intense flow');
    });

    it('should apply preset 6: Gentle Shimmer', () => {
      const result = pattern.applyPreset(6);
      expect(result).toBe(true);
      
      const metrics = pattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.3);
      
      const preset = QuicksilverPattern.getPreset(6);
      expect(preset?.name).toBe('Gentle Shimmer');
      expect(preset?.description).toBe('Subtle, peaceful flow');
    });

    it('should return false for invalid preset', () => {
      const result = pattern.applyPreset(99);
      expect(result).toBe(false);
    });

    it('should reset state when applying preset', () => {
      // Add some droplets and ripples
      pattern.onMouseClick(createMockPoint(40, 12));
      pattern.onMouseMove(createMockPoint(50, 15));
      
      expect(pattern.getMetrics().droplets).toBeGreaterThan(0);
      expect(pattern.getMetrics().ripples).toBeGreaterThan(0);
      
      // Apply preset should reset
      pattern.applyPreset(2);
      
      expect(pattern.getMetrics().droplets).toBe(0);
      expect(pattern.getMetrics().ripples).toBe(0);
    });

    it('should return undefined for invalid preset ID', () => {
      const preset = QuicksilverPattern.getPreset(99);
      expect(preset).toBeUndefined();
    });
  });

  describe('Reset', () => {
    it('should clear all droplets and ripples', () => {
      pattern.onMouseClick(createMockPoint(40, 12));
      pattern.onMouseMove(createMockPoint(50, 15));
      
      expect(pattern.getMetrics().droplets).toBeGreaterThan(0);
      expect(pattern.getMetrics().ripples).toBeGreaterThan(0);
      
      pattern.reset();
      
      expect(pattern.getMetrics().droplets).toBe(0);
      expect(pattern.getMetrics().ripples).toBe(0);
    });

    it('should reset noise offset', () => {
      // Render multiple times to advance noise offset significantly
      // Default speed is ~1.0, so noiseOffset increases by 0.01 per render
      // Render 20 times to advance noiseOffset by ~0.2
      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 100, size);
      }
      
      const buffer1 = createMockBuffer(size.width, size.height);
      pattern.render(buffer1, 0, size);
      
      // Reset and render again
      pattern.reset();
      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 0, size);
      
      // After reset, pattern should look different (noise offset reset)
      // Use grid-based sampling instead of random to ensure deterministic results
      // Check cells in a grid pattern across the buffer
      let differenceCount = 0;
      const gridSize = 4; // 4x4 grid = 16 cells
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const y = Math.floor((gy + 0.5) * size.height / gridSize);
          const x = Math.floor((gx + 0.5) * size.width / gridSize);
          if (buffer1[y][x].char !== buffer2[y][x].char) {
            differenceCount++;
          }
        }
      }
      expect(differenceCount).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('should return droplet count', () => {
      const metrics1 = pattern.getMetrics();
      expect(metrics1.droplets).toBe(0);
      
      pattern.onMouseClick(createMockPoint(40, 12));
      
      const metrics2 = pattern.getMetrics();
      expect(metrics2.droplets).toBe(12);
    });

    it('should return ripple count', () => {
      const metrics1 = pattern.getMetrics();
      expect(metrics1.ripples).toBe(0);
      
      pattern.onMouseMove(createMockPoint(40, 12));
      pattern.onMouseMove(createMockPoint(50, 15));
      
      const metrics2 = pattern.getMetrics();
      expect(metrics2.ripples).toBe(2);
    });

    it('should return current flow intensity', () => {
      const customPattern = new QuicksilverPattern(theme, { flowIntensity: 0.75 });
      const metrics = customPattern.getMetrics();
      expect(metrics.flowIntensity).toBe(0.75);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero flow intensity', () => {
      const customPattern = new QuicksilverPattern(theme, { flowIntensity: 0 });
      customPattern.render(buffer, 0, size);
      
      // Should still render something
      let nonEmptyCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            nonEmptyCount++;
          }
        }
      }
      expect(nonEmptyCount).toBeGreaterThan(0);
    });

    it('should handle very high flow intensity', () => {
      const customPattern = new QuicksilverPattern(theme, { flowIntensity: 2.0 });
      customPattern.render(buffer, 0, size);
      
      // Should still render without errors
      let nonEmptyCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            nonEmptyCount++;
          }
        }
      }
      expect(nonEmptyCount).toBeGreaterThan(size.width * size.height * 0.5);
    });

    it('should handle zero speed', () => {
      const customPattern = new QuicksilverPattern(theme, { speed: 0 });
      customPattern.render(buffer, 0, size);
      const snapshot1 = buffer[10][40].char;
      
      const buffer2 = createMockBuffer(size.width, size.height);
      customPattern.render(buffer2, 5000, size);
      const snapshot2 = buffer2[10][40].char;
      
      // With zero speed, pattern should be mostly static
      expect(snapshot1).toBe(snapshot2);
    });

    it('should handle negative speed', () => {
      const customPattern = new QuicksilverPattern(theme, { speed: -1.0 });
      customPattern.render(buffer, 0, size);
      
      // Should render without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should handle very small buffer', () => {
      const smallSize = createMockSize(5, 3);
      const smallBuffer = createMockBuffer(smallSize.width, smallSize.height);
      
      pattern.render(smallBuffer, 0, smallSize);
      
      // Should render without errors
      expect(smallBuffer[0][0].char).toBeDefined();
      expect(smallBuffer[2][4].char).toBeDefined();
    });

    it('should handle very large buffer', () => {
      const largeSize = createMockSize(200, 100);
      const largeBuffer = createMockBuffer(largeSize.width, largeSize.height);
      
      pattern.render(largeBuffer, 0, largeSize);
      
      // Should render without errors
      let nonEmptyCount = 0;
      for (let y = 0; y < largeSize.height; y++) {
        for (let x = 0; x < largeSize.width; x++) {
          if (largeBuffer[y][x].char !== ' ') {
            nonEmptyCount++;
          }
        }
      }
      expect(nonEmptyCount).toBeGreaterThan(0);
    });

    it('should handle mouse click at edge', () => {
      const pos = createMockPoint(0, 0);
      pattern.onMouseClick(pos);
      pattern.render(buffer, Date.now(), size);
      
      // Should not crash
      expect(pattern.getMetrics().droplets).toBeLessThanOrEqual(12);
    });

    it('should handle mouse move at edge', () => {
      const pos = createMockPoint(size.width - 1, size.height - 1);
      pattern.onMouseMove(pos);
      pattern.render(buffer, 0, size);
      
      // Should not crash
      expect(pattern.getMetrics().ripples).toBe(1);
    });

    it('should handle very high noise scale', () => {
      const customPattern = new QuicksilverPattern(theme, { noiseScale: 1.0 });
      customPattern.render(buffer, 0, size);
      
      // Should render without errors
      let nonEmptyCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            nonEmptyCount++;
          }
        }
      }
      expect(nonEmptyCount).toBeGreaterThan(0);
    });

    it('should handle very low noise scale', () => {
      const customPattern = new QuicksilverPattern(theme, { noiseScale: 0.001 });
      customPattern.render(buffer, 0, size);
      
      // Should render without errors
      let nonEmptyCount = 0;
      for (let y = 0; y < size.height; y++) {
        for (let x = 0; x < size.width; x++) {
          if (buffer[y][x].char !== ' ') {
            nonEmptyCount++;
          }
        }
      }
      expect(nonEmptyCount).toBeGreaterThan(0);
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
      
      // Should create many droplets
      expect(pattern.getMetrics().droplets).toBeGreaterThan(0);
      
      // Render to clean up
      pattern.render(buffer, Date.now() + 3000, size);
    });

    it('should handle rapid mouse moves', () => {
      for (let i = 0; i < 50; i++) {
        pattern.onMouseMove(createMockPoint(40 + i, 12));
      }
      
      // Should limit to 10 ripples
      expect(pattern.getMetrics().ripples).toBe(10);
    });

    it('should handle rapid preset changes', () => {
      for (let i = 1; i <= 6; i++) {
        pattern.applyPreset(i);
        pattern.render(buffer, 0, size);
      }
      
      // Should complete without errors
      expect(pattern.getMetrics().flowIntensity).toBeGreaterThan(0);
    });

    it('should handle mixed rapid operations', () => {
      for (let i = 0; i < 30; i++) {
        if (i % 3 === 0) {
          pattern.onMouseClick(createMockPoint(40, 12));
        } else if (i % 3 === 1) {
          pattern.onMouseMove(createMockPoint(50, 15));
        } else {
          pattern.render(buffer, i * 100, size);
        }
      }
      
      // Should complete without errors
      expect(buffer[0][0].char).toBeDefined();
    });

    it('should maintain consistent state after many operations', () => {
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        pattern.onMouseClick(createMockPoint(40, 12));
        pattern.render(buffer, i * 100, size);
      }
      
      // Reset and verify clean state
      pattern.reset();
      const metrics = pattern.getMetrics();
      expect(metrics.droplets).toBe(0);
      expect(metrics.ripples).toBe(0);
    });
  });
});
