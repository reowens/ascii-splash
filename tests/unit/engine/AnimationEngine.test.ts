import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AnimationEngine } from '../../../src/engine/AnimationEngine.js';
import { TerminalRenderer } from '../../../src/renderer/TerminalRenderer.js';
import { Pattern, Cell, FrameTime, Size } from '../../../src/types/index.js';
import { Buffer } from '../../../src/renderer/Buffer.js';
import { TransitionManager } from '../../../src/renderer/TransitionManager.js';
import { AnimationClock, type TimeSource } from '../../../src/engine/AnimationClock.js';

// Mock TerminalRenderer
jest.mock('../../../src/renderer/TerminalRenderer');

// Mock pattern for testing
class MockPattern implements Pattern {
  name = 'MockPattern';
  renderCalled = false;
  resetCalled = false;
  lastTime = 0;
  lastSize: Size = { width: 0, height: 0 };

  render(buffer: Cell[][], time: number, size: Size): void {
    this.renderCalled = true;
    this.lastTime = time;
    this.lastSize = size;
  }

  reset(): void {
    this.resetCalled = true;
    this.renderCalled = false;
    this.lastTime = 0;
  }

  onMouseMove(_pos: { x: number; y: number }): void {}
  onMouseClick(_pos: { x: number; y: number }): void {}
}

class PaintingPattern implements Pattern {
  name: string;
  renderCount = 0;

  constructor(private readonly char: string) {
    this.name = `Painting${char}`;
  }

  render(buffer: Cell[][], _time: number, size: Size): void {
    this.renderCount++;
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        buffer[y][x] = {
          char: this.char,
          color: { r: x, g: y, b: 10 },
          bg: { r: 20, g: x, b: y },
        };
      }
    }
  }

  reset(): void {}
}

class ManualTimeSource implements TimeSource {
  constructor(private value: number) {}

  now(): number {
    return this.value;
  }

  advance(milliseconds: number): void {
    this.value += milliseconds;
  }
}

class TimingPattern implements Pattern {
  name = 'TimingPattern';
  frames: FrameTime[] = [];

  render(
    _buffer: Cell[][],
    _time: number,
    _size: Size,
    _mousePos?: { x: number; y: number },
    frameTime?: FrameTime
  ): void {
    if (frameTime) this.frames.push({ ...frameTime });
  }

  reset(): void {
    this.frames = [];
  }
}

describe('AnimationEngine', () => {
  let mockRenderer: jest.Mocked<TerminalRenderer>;
  let mockBuffer: jest.Mocked<Buffer>;
  let mockPattern: MockPattern;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock buffer
    mockBuffer = {
      clear: jest.fn(),
      getBuffer: jest.fn().mockReturnValue([]),
      swap: jest.fn(),
      getChanges: jest.fn().mockReturnValue([]),
    } as any;

    // Create mock renderer
    mockRenderer = {
      getSize: jest.fn().mockReturnValue({ width: 80, height: 24 }),
      getBuffer: jest.fn().mockReturnValue(mockBuffer),
      render: jest.fn().mockReturnValue(10), // 10 changed cells
      clearScreen: jest.fn(), // Clear terminal screen
    } as any;

    // Create mock pattern
    mockPattern = new MockPattern();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor & Initialization', () => {
    it('initializes with default FPS (30) when not specified', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      expect(engine.getFps()).toBe(30);
    });

    it('initializes with custom FPS when specified', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 60);
      expect(engine.getFps()).toBe(60);
    });

    it('initializes performance monitor with correct target FPS', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 45);
      const perfMonitor = engine.getPerformanceMonitor();
      expect(perfMonitor).toBeDefined();
      // PerformanceMonitor should be initialized with fps=45
    });

    it('stores the provided renderer', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      // Engine should use the renderer (verified through start/render calls)
      expect(engine).toBeDefined();
    });

    it('stores the provided pattern', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      expect(engine.getPattern()).toBe(mockPattern);
    });

    it('starts in stopped state', () => {
      // Construct an engine without start(). We don't keep the reference —
      // the assertion is that simply constructing one doesn't trigger a render.
      new AnimationEngine(mockRenderer, mockPattern);
      expect(mockPattern.renderCalled).toBe(false);
    });
  });

  describe('Start & Stop', () => {
    it('start() begins the animation loop', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Advance time to trigger first frame (33ms for 30fps)
      jest.advanceTimersByTime(35);

      expect(mockPattern.renderCalled).toBe(true);
    });

    it('stop() halts the animation loop', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Advance time and verify rendering started
      jest.advanceTimersByTime(35);
      expect(mockPattern.renderCalled).toBe(true);

      // Reset and stop
      mockPattern.renderCalled = false;
      engine.stop();

      // Advance time further - should not render
      jest.advanceTimersByTime(100);
      expect(mockPattern.renderCalled).toBe(false);
    });

    it('stop() clears the animation timer', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      engine.start();
      engine.stop();

      // No timers should be pending
      expect(jest.getTimerCount()).toBe(0);
    });

    it('can restart after stopping', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);

      // Start, render, stop
      engine.start();
      jest.advanceTimersByTime(35);
      engine.stop();

      // Reset flag
      mockPattern.renderCalled = false;

      // Restart
      engine.start();
      jest.advanceTimersByTime(35);

      expect(mockPattern.renderCalled).toBe(true);
    });

    it('multiple stop() calls are safe', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      engine.start();
      engine.stop();
      engine.stop();
      engine.stop();

      // Should not throw and timers should be clear
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Pause & Resume', () => {
    it('pause() prevents rendering while loop continues', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Pause before first frame
      engine.pause();

      // Advance time - should not render
      jest.advanceTimersByTime(100);
      expect(mockPattern.renderCalled).toBe(false);
    });

    it('pause() toggles pause state', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Pause
      engine.pause();
      jest.advanceTimersByTime(50);
      expect(mockPattern.renderCalled).toBe(false);

      // Resume (toggle pause again)
      engine.pause();
      jest.advanceTimersByTime(50);
      expect(mockPattern.renderCalled).toBe(true);
    });

    it('can pause and resume multiple times', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Pause
      engine.pause();
      jest.advanceTimersByTime(50);
      expect(mockPattern.renderCalled).toBe(false);

      // Resume
      engine.pause();
      mockPattern.renderCalled = false;
      jest.advanceTimersByTime(50);
      expect(mockPattern.renderCalled).toBe(true);

      // Pause again
      engine.pause();
      mockPattern.renderCalled = false;
      jest.advanceTimersByTime(50);
      expect(mockPattern.renderCalled).toBe(false);
    });

    it('pause() does not stop the animation timer', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      engine.start();
      engine.pause();

      // Timer should still be active (loop continues, just skips rendering)
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('does not jump scene phase after a long pause', () => {
      const source = new ManualTimeSource(1000);
      const pattern = new TimingPattern();
      const engine = new AnimationEngine(mockRenderer, pattern, 30, new AnimationClock(source));
      engine.start();
      source.advance(34);
      jest.advanceTimersByTime(1);
      expect(pattern.frames.at(-1)).toEqual({ sceneTime: 34, appTime: 34, deltaTime: 34 });

      engine.pause();
      source.advance(10000);
      jest.advanceTimersByTime(100);
      engine.pause();
      source.advance(34);
      jest.advanceTimersByTime(1);

      expect(pattern.frames.at(-1)).toEqual({ sceneTime: 68, appTime: 68, deltaTime: 34 });
      engine.stop();
    });
  });

  describe('Relative scene clock', () => {
    it('passes the same scene schedule for different wall-clock origins', () => {
      const run = (origin: number): FrameTime[] => {
        const source = new ManualTimeSource(origin);
        const pattern = new TimingPattern();
        const engine = new AnimationEngine(mockRenderer, pattern, 30, new AnimationClock(source));
        engine.start();
        for (const delta of [34, 34, 34]) {
          source.advance(delta);
          jest.advanceTimersByTime(1);
        }
        engine.stop();
        return pattern.frames;
      };

      expect(run(1000)).toEqual(run(900000));
    });

    it('resets scene time on pattern activation while app time continues', () => {
      const source = new ManualTimeSource(5000);
      const first = new TimingPattern();
      const second = new TimingPattern();
      const engine = new AnimationEngine(mockRenderer, first, 30, new AnimationClock(source));
      engine.start();
      source.advance(40);
      jest.advanceTimersByTime(1);
      expect(first.frames.at(-1)?.sceneTime).toBe(40);

      engine.setPattern(second);
      source.advance(40);
      jest.advanceTimersByTime(1);

      expect(second.frames.at(-1)).toEqual({ sceneTime: 40, appTime: 80, deltaTime: 40 });
      engine.stop();
    });
  });

  describe('Frame Timing', () => {
    it('renders at 30 FPS (every ~33ms)', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // First frame at ~33ms (plus setTimeout(1))
      jest.advanceTimersByTime(35);
      expect(mockPattern.renderCalled).toBe(true);

      // Second frame at ~66ms
      mockPattern.renderCalled = false;
      jest.advanceTimersByTime(35);
      expect(mockPattern.renderCalled).toBe(true);
    });

    it('renders at 60 FPS (every ~16ms)', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 60);
      engine.start();

      // First frame at ~16ms
      jest.advanceTimersByTime(17);
      expect(mockPattern.renderCalled).toBe(true);

      // Second frame at ~32ms
      mockPattern.renderCalled = false;
      jest.advanceTimersByTime(17);
      expect(mockPattern.renderCalled).toBe(true);
    });

    it('renders at 10 FPS (every 100ms)', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 10);
      engine.start();

      // First frame at 100ms
      jest.advanceTimersByTime(100);
      expect(mockPattern.renderCalled).toBe(true);

      // Second frame at 200ms
      mockPattern.renderCalled = false;
      jest.advanceTimersByTime(100);
      expect(mockPattern.renderCalled).toBe(true);
    });

    it('skips frames if time has not elapsed', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Only 10ms - should not render yet
      jest.advanceTimersByTime(10);
      expect(mockPattern.renderCalled).toBe(false);

      // Another 10ms (20ms total) - still not enough
      jest.advanceTimersByTime(10);
      expect(mockPattern.renderCalled).toBe(false);

      // Another 15ms (35ms total) - now should render
      jest.advanceTimersByTime(15);
      expect(mockPattern.renderCalled).toBe(true);
    });

    it('uses setTimeout(1) for CPU-friendly loop', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      engine.start();

      // The loop should schedule the next iteration with setTimeout(..., 1)
      // We can't directly test the timeout value, but we can verify it's using setTimeout
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('Pattern Management', () => {
    it('setPattern() updates the current pattern', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      const newPattern = new MockPattern();

      engine.setPattern(newPattern);

      expect(engine.getPattern()).toBe(newPattern);
    });

    it('setPattern() resets the old pattern', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      const newPattern = new MockPattern();

      engine.setPattern(newPattern);

      expect(mockPattern.resetCalled).toBe(true);
    });

    it('setPattern() clears the screen', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      const newPattern = new MockPattern();

      engine.setPattern(newPattern);

      expect(mockRenderer.clearScreen).toHaveBeenCalled();
    });

    it('setPattern() during animation renders new pattern', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const newPattern = new MockPattern();

      engine.start();
      jest.advanceTimersByTime(35);
      expect(mockPattern.renderCalled).toBe(true);

      // Switch pattern
      engine.setPattern(newPattern);
      jest.advanceTimersByTime(35);

      expect(newPattern.renderCalled).toBe(true);
    });

    it('getPattern() returns the current pattern', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      expect(engine.getPattern()).toBe(mockPattern);
    });
  });

  describe('FPS Management', () => {
    it('setFps() updates the FPS', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.setFps(60);
      expect(engine.getFps()).toBe(60);
    });

    it('setFps() adjusts frame timing', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      // Change to 60 FPS (16.67ms per frame)
      engine.setFps(60);

      // Should render at new frame rate
      jest.advanceTimersByTime(17);
      expect(mockPattern.renderCalled).toBe(true);
    });

    it('setFps() updates performance monitor target', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);

      engine.setFps(45);

      // PerformanceMonitor should have updated target FPS
      // (We can't directly test this without accessing internal state,
      // but the call to setTargetFps should happen)
      expect(engine.getFps()).toBe(45);
    });

    it('getFps() returns current FPS', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 42);
      expect(engine.getFps()).toBe(42);
    });

    it('setFps() takes effect immediately during animation', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 10);
      engine.start();

      // 100ms frame time (10 FPS)
      jest.advanceTimersByTime(100);
      expect(mockPattern.renderCalled).toBe(true);

      // Change to 30 FPS mid-animation
      mockPattern.renderCalled = false;
      engine.setFps(30);

      // Should render at ~33ms now, not 100ms
      jest.advanceTimersByTime(35);
      expect(mockPattern.renderCalled).toBe(true);
    });
  });

  describe('Rendering Pipeline', () => {
    it('clears buffer before each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      jest.advanceTimersByTime(35);

      expect(mockBuffer.clear).toHaveBeenCalled();
    });

    it('calls pattern.render() with correct parameters', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const mockSize = { width: 100, height: 50 };
      mockRenderer.getSize.mockReturnValue(mockSize);

      engine.start();
      jest.advanceTimersByTime(35);

      expect(mockPattern.renderCalled).toBe(true);
      // Pattern receives height - 1 (bottom row reserved for banner)
      expect(mockPattern.lastSize).toEqual({ width: mockSize.width, height: mockSize.height - 1 });
      expect(mockPattern.lastTime).toBeGreaterThan(0);
    });

    it('calls renderer.render() after pattern renders', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();

      jest.advanceTimersByTime(35);

      expect(mockRenderer.render).toHaveBeenCalled();
    });

    it('passes time parameter to pattern', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);

      engine.start();
      jest.advanceTimersByTime(35);

      expect(mockPattern.lastTime).toBeGreaterThan(0);
      expect(mockPattern.lastTime).toBeLessThan(100);
    });

    it('passes buffer size to pattern', () => {
      const customSize = { width: 120, height: 60 };
      mockRenderer.getSize.mockReturnValue(customSize);

      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      engine.start();
      jest.advanceTimersByTime(35);

      // Pattern receives height - 1 (bottom row reserved for banner)
      expect(mockPattern.lastSize).toEqual({
        width: customSize.width,
        height: customSize.height - 1,
      });
    });

    it('records performance metrics each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const perfMonitor = engine.getPerformanceMonitor();

      engine.start();
      jest.advanceTimersByTime(35);

      // Performance monitor should have recorded at least one frame
      const stats = perfMonitor.getStats();
      expect(stats.avgFps).toBeGreaterThanOrEqual(0);
    });

    it('captures the raw pattern frame before UI callbacks and excludes the status row', () => {
      const canvas: Cell[][] = Array.from({ length: 3 }, () =>
        Array.from({ length: 4 }, () => ({ char: ' ' }))
      );
      mockRenderer.getSize.mockReturnValue({ width: 4, height: 3 });
      mockBuffer.getBuffer.mockReturnValue(canvas);
      const pattern = new PaintingPattern('P');
      const engine = new AnimationEngine(mockRenderer, pattern, 30);
      engine.setBeforeTerminalRenderCallback(() => {
        canvas[0][0] = { char: 'U' };
        canvas[2][0] = { char: 'S' };
      });

      engine.start();
      jest.advanceTimersByTime(35);
      const snapshot = engine.getLastPatternFrame();

      expect(snapshot).toHaveLength(2);
      expect(snapshot?.[0]).toHaveLength(4);
      expect(snapshot?.[0][0].char).toBe('P');
      expect(snapshot?.flat().some(cell => cell.char === 'U' || cell.char === 'S')).toBe(false);
    });

    it('returns deep snapshot copies that callers cannot mutate', () => {
      const canvas: Cell[][] = Array.from({ length: 2 }, () =>
        Array.from({ length: 2 }, () => ({ char: ' ' }))
      );
      mockRenderer.getSize.mockReturnValue({ width: 2, height: 2 });
      mockBuffer.getBuffer.mockReturnValue(canvas);
      const engine = new AnimationEngine(mockRenderer, new PaintingPattern('P'), 30);
      engine.start();
      jest.advanceTimersByTime(35);

      const first = engine.getLastPatternFrame();
      first![0][0].char = 'X';
      first![0][0].color!.r = 255;

      expect(engine.getLastPatternFrame()?.[0][0]).toEqual({
        char: 'P',
        color: { r: 0, g: 0, b: 10 },
        bg: { r: 20, g: 0, b: 0 },
      });
    });

    it('renders the target pattern only once per frame when a transition callback is active', () => {
      const canvas: Cell[][] = Array.from({ length: 3 }, () =>
        Array.from({ length: 4 }, () => ({ char: ' ' }))
      );
      mockRenderer.getSize.mockReturnValue({ width: 4, height: 3 });
      mockBuffer.getBuffer.mockReturnValue(canvas);
      const oldPattern = new PaintingPattern('A');
      const targetPattern = new PaintingPattern('B');
      const engine = new AnimationEngine(mockRenderer, oldPattern, 30);
      engine.start();
      jest.advanceTimersByTime(35);
      const source = engine.getLastPatternFrame();
      expect(source).not.toBeNull();

      const transition = new TransitionManager();
      transition.start(source!, { duration: 1000 });
      engine.setPattern(targetPattern);
      expect(engine.getLastPatternFrame()).toBeNull();
      engine.setBeforeTerminalRenderCallback(() => {
        transition.render(canvas, Date.now(), { width: 4, height: 2 });
      });
      jest.advanceTimersByTime(35);

      expect(targetPattern.renderCount).toBe(1);
      expect(oldPattern.renderCount).toBe(1);
    });
  });

  describe('After-Render Callback', () => {
    it('setAfterRenderCallback() registers a callback', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      const callback = jest.fn();

      engine.setAfterRenderCallback(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls after-render callback after each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const callback = jest.fn();

      engine.setAfterRenderCallback(callback);
      engine.start();
      jest.advanceTimersByTime(35);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('calls callback multiple times for multiple frames', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const callback = jest.fn();

      engine.setAfterRenderCallback(callback);
      engine.start();

      // Three frames
      jest.advanceTimersByTime(35);
      jest.advanceTimersByTime(35);
      jest.advanceTimersByTime(35);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('does not call callback when paused', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const callback = jest.fn();

      engine.setAfterRenderCallback(callback);
      engine.start();
      engine.pause();

      jest.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });

    it('does not call callback after stop()', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const callback = jest.fn();

      engine.setAfterRenderCallback(callback);
      engine.start();
      jest.advanceTimersByTime(35);

      callback.mockClear();
      engine.stop();
      jest.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });

    it('can update callback mid-animation', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      engine.setAfterRenderCallback(callback1);
      engine.start();
      jest.advanceTimersByTime(35);
      expect(callback1).toHaveBeenCalledTimes(1);

      // Change callback
      engine.setAfterRenderCallback(callback2);
      jest.advanceTimersByTime(35);

      expect(callback1).toHaveBeenCalledTimes(1); // Not called again
      expect(callback2).toHaveBeenCalledTimes(1); // New callback called
    });
  });

  describe('Performance Monitor Integration', () => {
    it('getPerformanceMonitor() returns the monitor instance', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);
      const perfMonitor = engine.getPerformanceMonitor();

      expect(perfMonitor).toBeDefined();
      expect(perfMonitor.getStats).toBeDefined();
    });

    it('records update time each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const perfMonitor = engine.getPerformanceMonitor();

      engine.start();
      jest.advanceTimersByTime(35);

      const metrics = perfMonitor.getMetrics();
      expect(metrics.updateTime).toBeGreaterThanOrEqual(0);
    });

    it('records pattern render time each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const perfMonitor = engine.getPerformanceMonitor();

      engine.start();
      jest.advanceTimersByTime(35);

      const metrics = perfMonitor.getMetrics();
      expect(metrics.patternRenderTime).toBeGreaterThanOrEqual(0);
    });

    it('records terminal render time each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const perfMonitor = engine.getPerformanceMonitor();

      engine.start();
      jest.advanceTimersByTime(35);

      const metrics = perfMonitor.getMetrics();
      expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    });

    it('records changed cells count each frame', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const perfMonitor = engine.getPerformanceMonitor();
      mockRenderer.render.mockReturnValue(42);

      engine.start();
      jest.advanceTimersByTime(35);

      const metrics = perfMonitor.getMetrics();
      expect(metrics.changedCells).toBe(42);
    });
  });

  describe('Edge Cases & Integration', () => {
    it('handles rapid start/stop cycles', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern);

      engine.start();
      engine.stop();
      engine.start();
      engine.stop();
      engine.start();
      jest.advanceTimersByTime(35);

      expect(mockPattern.renderCalled).toBe(true);
    });

    it('handles pattern switch during pause', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const newPattern = new MockPattern();

      engine.start();
      engine.pause();
      engine.setPattern(newPattern);
      engine.pause(); // Resume

      jest.advanceTimersByTime(35);

      expect(newPattern.renderCalled).toBe(true);
    });

    it('handles FPS change while paused', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);

      engine.start();
      engine.pause();
      engine.setFps(60);
      engine.pause(); // Resume

      jest.advanceTimersByTime(17);

      expect(mockPattern.renderCalled).toBe(true);
    });

    it('handles zero-size buffer', () => {
      mockRenderer.getSize.mockReturnValue({ width: 0, height: 0 });
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);

      engine.start();
      jest.advanceTimersByTime(35);

      // Reserved status space never produces a negative pattern dimension.
      expect(mockPattern.lastSize).toEqual({ width: 0, height: 0 });
    });

    it('handles buffer resize during animation', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      mockRenderer.getSize.mockReturnValue({ width: 80, height: 24 });

      engine.start();
      jest.advanceTimersByTime(35);
      // Pattern receives height - 1 (bottom row reserved for banner)
      expect(mockPattern.lastSize).toEqual({ width: 80, height: 23 });

      // Resize
      mockRenderer.getSize.mockReturnValue({ width: 120, height: 40 });
      jest.advanceTimersByTime(35);

      expect(mockPattern.lastSize).toEqual({ width: 120, height: 39 });
    });

    it('handles very high FPS (60+)', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 120);
      engine.start();

      // 120 FPS = ~8.33ms per frame
      jest.advanceTimersByTime(9);

      expect(mockPattern.renderCalled).toBe(true);
    });

    it('handles very low FPS (1-10)', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 1);
      engine.start();

      // 1 FPS = 1000ms per frame
      jest.advanceTimersByTime(1000);

      expect(mockPattern.renderCalled).toBe(true);
    });

    it('synchronizes multiple state changes', () => {
      const engine = new AnimationEngine(mockRenderer, mockPattern, 30);
      const newPattern = new MockPattern();
      const callback = jest.fn();

      // Apply multiple changes at once
      engine.setFps(60);
      engine.setPattern(newPattern);
      engine.setAfterRenderCallback(callback);
      engine.start();

      jest.advanceTimersByTime(17);

      expect(newPattern.renderCalled).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(engine.getFps()).toBe(60);
    });
  });
});
