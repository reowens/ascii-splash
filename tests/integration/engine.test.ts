/**
 * Engine Integration Tests
 *
 * Tests the full render pipeline from pattern to buffer output
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MockTerminalRenderer } from '../utils/MockTerminalRenderer.js';
import { createMockTheme, createMockBuffer } from '../utils/mocks.js';
import { WavePattern } from '../../src/patterns/WavePattern.js';
import { StarfieldPattern } from '../../src/patterns/StarfieldPattern.js';
import { MatrixPattern } from '../../src/patterns/MatrixPattern.js';
import { ParticlePattern } from '../../src/patterns/ParticlePattern.js';
import { PerformanceMonitor } from '../../src/engine/PerformanceMonitor.js';
import { EventBus, EngineEvent } from '../../src/engine/EventBus.js';
import { Theme } from '../../src/types/index.js';

describe('Engine Integration Tests', () => {
  let mockRenderer: MockTerminalRenderer;
  let mockTheme: Theme;
  let eventBus: EventBus;

  beforeEach(() => {
    mockRenderer = new MockTerminalRenderer({
      width: 80,
      height: 24,
      captureHistory: true,
    });
    mockTheme = createMockTheme('test');
    eventBus = new EventBus();
  });

  afterEach(() => {
    mockRenderer.reset();
  });

  describe('Pattern Rendering Pipeline', () => {
    test('should render pattern to buffer', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Render a frame
      pattern.render(buffer, 1000, size);

      // Buffer should have content
      expect(mockRenderer.countNonEmptyCells()).toBeGreaterThan(0);
    });

    test('should render multiple patterns without errors', () => {
      const patterns = [
        new WavePattern(mockTheme),
        new StarfieldPattern(mockTheme),
        new MatrixPattern(mockTheme),
        new ParticlePattern(mockTheme),
      ];

      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      for (const pattern of patterns) {
        expect(() => {
          for (let i = 0; i < 10; i++) {
            pattern.render(buffer, i * 100, size);
          }
        }).not.toThrow();
      }
    });

    test('should produce different output over time', () => {
      const pattern = new WavePattern(mockTheme);
      const size = mockRenderer.getSize();

      // Capture first frame
      const buffer1 = createMockBuffer(size.width, size.height);
      pattern.render(buffer1, 0, size);
      const snapshot1 = buffer1.map(row => row.map(cell => cell.char).join('')).join('');

      // Capture second frame (later in time)
      const buffer2 = createMockBuffer(size.width, size.height);
      pattern.render(buffer2, 2000, size);
      const snapshot2 = buffer2.map(row => row.map(cell => cell.char).join('')).join('');

      // Buffers should be different (animation is happening)
      expect(snapshot1).not.toBe(snapshot2);
    });

    test('should handle pattern reset correctly', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Render several frames
      for (let i = 0; i < 20; i++) {
        pattern.render(buffer, i * 100, size);
      }

      // Reset pattern
      pattern.reset();

      // Should still render after reset
      expect(() => {
        pattern.render(buffer, 0, size);
      }).not.toThrow();
    });

    test('should handle pattern switching', () => {
      const wave = new WavePattern(mockTheme);
      const starfield = new StarfieldPattern(mockTheme);
      let buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Render wave
      wave.render(buffer, 1000, size);
      const waveContent = mockRenderer.countNonEmptyCells();

      // Clear and switch to starfield
      mockRenderer.reset();
      buffer = mockRenderer.getBuffer(); // Get fresh buffer reference after reset
      starfield.render(buffer, 1000, size);
      const starfieldContent = mockRenderer.countNonEmptyCells();

      // Both should produce content
      expect(waveContent).toBeGreaterThan(0);
      expect(starfieldContent).toBeGreaterThan(0);
    });
  });

  describe('Buffer Safety', () => {
    test('should not write outside buffer bounds', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Render many frames
      for (let i = 0; i < 100; i++) {
        pattern.render(buffer, i * 50, size);
      }

      // Check buffer dimensions haven't changed
      expect(buffer.length).toBe(size.height);
      for (let y = 0; y < size.height; y++) {
        expect(buffer[y].length).toBe(size.width);
      }
    });

    test('should handle small buffer sizes', () => {
      mockRenderer.resize(10, 5);
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      expect(() => {
        for (let i = 0; i < 20; i++) {
          pattern.render(buffer, i * 100, size);
        }
      }).not.toThrow();
    });

    test('should handle large buffer sizes', () => {
      mockRenderer.resize(200, 60);
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();

      expect(mockRenderer.countNonEmptyCells()).toBeGreaterThan(0);
    });

    test('should handle resize during animation', () => {
      const pattern = new WavePattern(mockTheme);

      // Render at initial size
      let buffer = mockRenderer.getBuffer();
      let size = mockRenderer.getSize();
      pattern.render(buffer, 0, size);

      // Resize
      mockRenderer.resize(40, 12);
      buffer = mockRenderer.getBuffer();
      size = mockRenderer.getSize();

      // Should handle resize gracefully
      expect(() => {
        pattern.render(buffer, 1000, size);
      }).not.toThrow();
    });
  });

  describe('Mouse Interaction Pipeline', () => {
    test('should pass mouse position to pattern', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();
      const mousePos = { x: 40, y: 12 };

      mockRenderer.setMousePos(mousePos);

      expect(() => {
        pattern.render(buffer, 1000, size, mousePos);
      }).not.toThrow();
    });

    test('should handle mouse move events', () => {
      const pattern = new WavePattern(mockTheme);

      expect(() => {
        pattern.onMouseMove?.({ x: 20, y: 10 });
        pattern.onMouseMove?.({ x: 40, y: 12 });
        pattern.onMouseMove?.({ x: 60, y: 20 });
      }).not.toThrow();
    });

    test('should handle mouse click events', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Initialize pattern
      pattern.render(buffer, 0, size);

      expect(() => {
        pattern.onMouseClick?.({ x: 40, y: 12 });
      }).not.toThrow();
    });
  });

  describe('Performance Monitor Integration', () => {
    test('should track FPS correctly', () => {
      const monitor = new PerformanceMonitor(30);

      // Simulate frames
      for (let i = 0; i < 60; i++) {
        monitor.startFrame();
        monitor.recordUpdateTime(5);
        monitor.recordRenderTime(10);
      }

      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBeDefined();
      expect(metrics.frameDrops).toBeDefined();
    });

    test('should track frame metrics', () => {
      const monitor = new PerformanceMonitor(30);

      // Simulate a few frames
      for (let i = 0; i < 10; i++) {
        monitor.startFrame();
        monitor.recordUpdateTime(5);
        monitor.recordRenderTime(10);
        monitor.recordChangedCells(100);
      }

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveProperty('frameDrops');
      expect(metrics).toHaveProperty('updateTime');
      expect(metrics).toHaveProperty('renderTime');
    });
  });

  describe('EventBus Integration', () => {
    test('should emit and receive events', () => {
      const received: string[] = [];

      eventBus.on(EngineEvent.PATTERN_CHANGE, () => {
        received.push('pattern_change');
      });

      eventBus.emit(EngineEvent.PATTERN_CHANGE, { pattern: 'wave' });

      expect(received).toContain('pattern_change');
    });

    test('should support multiple listeners', () => {
      let count = 0;

      eventBus.on(EngineEvent.FRAME_START, () => count++);
      eventBus.on(EngineEvent.FRAME_START, () => count++);
      eventBus.on(EngineEvent.FRAME_START, () => count++);

      eventBus.emit(EngineEvent.FRAME_START, { time: 0, frameNumber: 1, deltaTime: 16 });

      expect(count).toBe(3);
    });

    test('should allow unsubscribing', () => {
      let count = 0;
      const handler = () => count++;

      eventBus.on(EngineEvent.FRAME_END, handler);
      eventBus.emit(EngineEvent.FRAME_END, { time: 100, frameNumber: 1, deltaTime: 16 });
      expect(count).toBe(1);

      eventBus.off(EngineEvent.FRAME_END, handler);
      eventBus.emit(EngineEvent.FRAME_END, { time: 200, frameNumber: 2, deltaTime: 16 });
      expect(count).toBe(1);
    });
  });

  describe('Preset System Integration', () => {
    test('should apply presets to patterns', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Get presets
      const presets = WavePattern.getPresets();
      expect(presets.length).toBeGreaterThan(0);

      // Apply each preset and render
      for (const preset of presets) {
        const success = pattern.applyPreset(preset.id);
        expect(success).toBe(true);

        expect(() => {
          pattern.render(buffer, 1000, size);
        }).not.toThrow();
      }
    });

    test('should return metrics after rendering', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      pattern.render(buffer, 1000, size);

      const metrics = pattern.getMetrics?.();
      if (metrics) {
        expect(typeof metrics).toBe('object');
      }
    });
  });

  describe('Full Render Loop Simulation', () => {
    test('should complete 100 frames without errors', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      const startTime = Date.now();
      for (let frame = 0; frame < 100; frame++) {
        const time = frame * 33; // ~30fps timing
        pattern.render(buffer, time, size);
        mockRenderer.render();
      }
      const elapsed = Date.now() - startTime;

      expect(mockRenderer.getFrameCount()).toBe(100);
      // Should complete reasonably fast (less than 5 seconds for 100 frames)
      expect(elapsed).toBeLessThan(5000);
    });

    test('should capture frame history when enabled', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      for (let i = 0; i < 10; i++) {
        pattern.render(buffer, i * 100, size);
        mockRenderer.render();
      }

      const history = mockRenderer.getHistory();
      expect(history.length).toBe(10);
      expect(history[0].frameNumber).toBe(1);
      expect(history[9].frameNumber).toBe(10);
    });

    test('should show animation progression in history', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      // Render 5 frames
      for (let i = 0; i < 5; i++) {
        pattern.render(buffer, i * 500, size);
        mockRenderer.render();
      }

      const history = mockRenderer.getHistory();

      // Frames should be different from each other (animation)
      let allSame = true;
      for (let i = 1; i < history.length; i++) {
        if (!MockTerminalRenderer.buffersEqual(history[0].buffer, history[i].buffer)) {
          allSame = false;
          break;
        }
      }

      expect(allSame).toBe(false);
    });
  });

  describe('Theme Integration', () => {
    test('should use theme colors in rendering', () => {
      const pattern = new WavePattern(mockTheme);
      const buffer = mockRenderer.getBuffer();
      const size = mockRenderer.getSize();

      pattern.render(buffer, 1000, size);

      // Check that some cells have colors
      let hasColors = false;
      for (let y = 0; y < size.height && !hasColors; y++) {
        for (let x = 0; x < size.width && !hasColors; x++) {
          if (buffer[y][x].color && buffer[y][x].char !== ' ') {
            hasColors = true;
          }
        }
      }

      expect(hasColors).toBe(true);
    });
  });
});
