import { TerminalRenderer } from '../renderer/TerminalRenderer.js';
import { Pattern, Size } from '../types/index.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { bufferSafety, safeRenderWrapper } from '../utils/bufferSafety.js';
import { EventBus, EngineEvent, getEventBus } from './EventBus.js';

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
  private eventBus: EventBus;
  private frameNumber = 0;
  private lastSize: Size | null = null;

  constructor(renderer: TerminalRenderer, pattern: Pattern, fps = 30, eventBus?: EventBus) {
    this.renderer = renderer;
    this.pattern = pattern;
    this.fps = fps;
    this.frameTime = 1000 / fps;
    this.perfMonitor = new PerformanceMonitor(fps);
    this.eventBus = eventBus ?? getEventBus();
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  start(): void {
    this.running = true;
    this.lastFrameTime = Date.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  }

  pause(): void {
    this.paused = !this.paused;
    this.eventBus.emit(this.paused ? EngineEvent.PAUSE : EngineEvent.RESUME, undefined);
  }

  isPaused(): boolean {
    return this.paused;
  }

  private loop(): void {
    if (!this.running) return;

    const now = Date.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameTime && !this.paused) {
      this.frameNumber++;
      this.perfMonitor.startFrame();

      // Check for resize
      const currentSize = this.renderer.getSize();
      if (
        this.lastSize &&
        (this.lastSize.width !== currentSize.width || this.lastSize.height !== currentSize.height)
      ) {
        // Emit resize event
        this.eventBus.emit(EngineEvent.RESIZE, {
          oldSize: this.lastSize,
          newSize: currentSize,
        });
        // Call pattern lifecycle hook
        this.pattern.onResize?.(currentSize);
      }
      this.lastSize = { ...currentSize };

      // Emit frame start
      this.eventBus.emit(EngineEvent.FRAME_START, {
        time: now,
        frameNumber: this.frameNumber,
        deltaTime: delta,
      });

      const updateStart = performance.now();
      this.update(now);
      this.perfMonitor.recordUpdateTime(performance.now() - updateStart);

      const renderStart = performance.now();
      this.render();
      this.perfMonitor.recordRenderTime(performance.now() - renderStart);

      // Check for dropped frame
      const frameTime = performance.now() - updateStart;
      if (frameTime > this.frameTime * 1.5) {
        this.eventBus.emit(EngineEvent.FRAME_DROP, {
          time: now,
          frameNumber: this.frameNumber,
          deltaTime: frameTime,
        });
      }

      // Emit frame end
      this.eventBus.emit(EngineEvent.FRAME_END, {
        time: now,
        frameNumber: this.frameNumber,
        deltaTime: frameTime,
      });

      this.lastFrameTime = now - (delta % this.frameTime);
    }

    // Use setTimeout for less aggressive CPU usage
    this.animationTimer = setTimeout(() => {
      this.loop();
    }, 1);
  }

  private update(time: number): void {
    const fullSize = this.renderer.getSize();
    const buffer = this.renderer.getBuffer();

    // Clear buffer
    buffer.clear();

    // Reserve bottom row for banner/status - give patterns reduced height
    const patternSize = {
      width: fullSize.width,
      height: fullSize.height - 1, // Exclude bottom row
    };

    // Render pattern into buffer and track time
    const patternStart = performance.now();

    // Wrap pattern render in error handler
    safeRenderWrapper(this.pattern.name, () => {
      this.pattern.render(buffer.getBuffer(), time, patternSize);
    });

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
    const oldPatternName = this.pattern.name;

    // Emit before-change event
    this.eventBus.emit(EngineEvent.PATTERN_BEFORE_CHANGE, {
      oldPattern: oldPatternName,
      newPattern: pattern.name,
    });

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

    // CRITICAL: Physically clear the terminal screen to remove old pattern
    this.renderer.clearScreen();

    // Emit change event
    this.eventBus.emit(EngineEvent.PATTERN_CHANGE, {
      oldPattern: oldPatternName,
      newPattern: pattern.name,
    });
  }

  getPattern(): Pattern {
    return this.pattern;
  }

  setFps(fps: number): void {
    const oldFps = this.fps;
    this.fps = fps;
    this.frameTime = 1000 / fps;
    this.perfMonitor.setTargetFps(fps);

    // Call lifecycle hook on pattern
    this.pattern.onFpsChange?.(fps);

    // Emit event
    this.eventBus.emit(EngineEvent.FPS_CHANGE, {
      oldFps,
      newFps: fps,
    });
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
}
