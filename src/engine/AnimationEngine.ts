import { TerminalRenderer } from '../renderer/TerminalRenderer.js';
import { Cell, FrameTime, Pattern, Size } from '../types/index.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { bufferSafety, safeRenderWrapper } from '../utils/bufferSafety.js';
import { AnimationClock } from './AnimationClock.js';

export class AnimationEngine {
  private renderer: TerminalRenderer;
  private pattern: Pattern;
  private running = false;
  private paused = false;
  private fps: number;
  private frameTime: number;
  private lastFrameTime = 0;
  private animationTimer: NodeJS.Timeout | null = null;
  private perfMonitor: PerformanceMonitor;
  private afterRenderCallback?: () => void;
  private beforeTerminalRenderCallback?: () => void;
  private lastSize: Size | null = null;
  private lastPatternFrame: Cell[][] | null = null;
  private readonly clock: AnimationClock;

  constructor(
    renderer: TerminalRenderer,
    pattern: Pattern,
    fps = 30,
    clock = new AnimationClock()
  ) {
    this.renderer = renderer;
    this.pattern = pattern;
    this.fps = fps;
    this.frameTime = 1000 / fps;
    this.perfMonitor = new PerformanceMonitor(fps);
    this.clock = clock;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.lastFrameTime = this.clock.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    this.clock.stop();
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }

  pause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.clock.pause();
    } else {
      this.clock.resume();
      this.lastFrameTime = this.clock.now();
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  private loop(): void {
    if (!this.running) return;

    const now = this.clock.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameTime && !this.paused) {
      const timing = this.clock.frame();
      this.perfMonitor.startFrame();

      // Check for resize
      const currentSize = this.renderer.getSize();
      if (
        this.lastSize &&
        (this.lastSize.width !== currentSize.width || this.lastSize.height !== currentSize.height)
      ) {
        // Call pattern lifecycle hook
        this.pattern.onResize?.(currentSize);
      }
      this.lastSize = { ...currentSize };

      const updateStart = performance.now();
      this.update(timing);
      this.perfMonitor.recordUpdateTime(performance.now() - updateStart);

      const renderStart = performance.now();
      this.render();
      this.perfMonitor.recordRenderTime(performance.now() - renderStart);

      this.lastFrameTime = now - (delta % this.frameTime);
    }

    // Use setTimeout for less aggressive CPU usage
    this.animationTimer = setTimeout(() => {
      this.loop();
    }, 1);
  }

  private update(frameTime: FrameTime): void {
    const fullSize = this.renderer.getSize();
    const buffer = this.renderer.getBuffer();

    // Clear buffer
    buffer.clear();

    // Reserve bottom row for banner/status - give patterns reduced height
    const patternSize = {
      width: fullSize.width,
      height: Math.max(0, fullSize.height - 1), // Exclude bottom row
    };

    // Render pattern into buffer and track time
    const patternStart = performance.now();

    // Wrap pattern render in error handler
    safeRenderWrapper(this.pattern.name, () => {
      this.pattern.render(
        buffer.getBuffer(),
        frameTime.sceneTime,
        patternSize,
        undefined,
        frameTime
      );
    });

    // Capture the raw pattern area before transitions, toasts, help, and status
    // mutate the renderer buffer. Pattern switches consume this immutable frame.
    this.lastPatternFrame = this.cloneFrame(buffer.getBuffer(), patternSize);

    this.perfMonitor.recordPatternRenderTime(performance.now() - patternStart);

    // Call before-terminal-render callback (for overlays that need to write to buffer)
    if (this.beforeTerminalRenderCallback) {
      this.beforeTerminalRenderCallback();
    }
  }

  private render(): void {
    const changedCells = this.renderer.render();
    this.perfMonitor.recordChangedCells(changedCells);

    // Call after-render callback (for overlays that write directly to terminal)
    if (this.afterRenderCallback) {
      this.afterRenderCallback();
    }
  }

  setPattern(pattern: Pattern): void {
    // Call lifecycle hook on old pattern
    this.pattern.onDeactivate?.();

    // Reset OLD pattern to clean up its state
    this.pattern.reset();

    // Switch to NEW pattern
    this.pattern = pattern;

    // Reset NEW pattern to ensure clean starting state
    this.pattern.reset();

    // Call lifecycle hook on new pattern
    this.pattern.onActivate?.();
    this.clock.resetScene();

    // CRITICAL: Physically clear the terminal screen to remove old pattern
    this.renderer.clearScreen();
    this.lastPatternFrame = null;
  }

  getPattern(): Pattern {
    return this.pattern;
  }

  /** Restart scene-relative timing without affecting application time. */
  resetSceneTime(): void {
    this.clock.resetScene();
  }

  /** Deep copy of the latest raw pattern frame, excluding the reserved status row. */
  getLastPatternFrame(): Cell[][] | null {
    if (!this.lastPatternFrame) return null;
    return this.cloneFrame(this.lastPatternFrame, {
      width: this.lastPatternFrame[0]?.length ?? 0,
      height: this.lastPatternFrame.length,
    });
  }

  setFps(fps: number): void {
    this.fps = fps;
    this.frameTime = 1000 / fps;
    this.perfMonitor.setTargetFps(fps);

    // Call lifecycle hook on pattern
    this.pattern.onFpsChange?.(fps);
  }

  getFps(): number {
    return this.fps;
  }

  getPerformanceMonitor(): PerformanceMonitor {
    return this.perfMonitor;
  }

  getBufferSafety(): typeof bufferSafety {
    return bufferSafety;
  }

  setAfterRenderCallback(callback: () => void): void {
    this.afterRenderCallback = callback;
  }

  setBeforeTerminalRenderCallback(callback: () => void): void {
    this.beforeTerminalRenderCallback = callback;
  }

  private cloneFrame(frame: Cell[][], size: Size): Cell[][] {
    const snapshot: Cell[][] = [];
    for (let y = 0; y < size.height; y++) {
      snapshot[y] = [];
      for (let x = 0; x < size.width; x++) {
        const cell = frame[y]?.[x] ?? { char: ' ' };
        snapshot[y][x] = {
          char: cell.char,
          ...(cell.color === undefined ? {} : { color: { ...cell.color } }),
          ...(cell.bg === undefined ? {} : { bg: { ...cell.bg } }),
        };
      }
    }
    return snapshot;
  }
}
