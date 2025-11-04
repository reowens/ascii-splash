import { TerminalRenderer } from '../renderer/TerminalRenderer';
import { Pattern } from '../types';
import { PerformanceMonitor } from './PerformanceMonitor';
import { bufferSafety, safeRenderWrapper } from '../utils/bufferSafety';

export class AnimationEngine {
  private renderer: TerminalRenderer;
  private pattern: Pattern;
  private running: boolean = false;
  private paused: boolean = false;
  private fps: number;
  private frameTime: number;
  private lastFrameTime: number = 0;
  private animationTimer: NodeJS.Timeout | null = null;
  private perfMonitor: PerformanceMonitor;
  private afterRenderCallback?: () => void;
  private beforeTerminalRenderCallback?: () => void;

  constructor(renderer: TerminalRenderer, pattern: Pattern, fps: number = 30) {
    this.renderer = renderer;
    this.pattern = pattern;
    this.fps = fps;
    this.frameTime = 1000 / fps;
    this.perfMonitor = new PerformanceMonitor(fps);
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
  }

  private loop(): void {
    if (!this.running) return;

    const now = Date.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameTime && !this.paused) {
      this.perfMonitor.startFrame();
      
      const updateStart = performance.now();
      this.update(now);
      this.perfMonitor.recordUpdateTime(performance.now() - updateStart);
      
      const renderStart = performance.now();
      this.render();
      this.perfMonitor.recordRenderTime(performance.now() - renderStart);
      
      this.lastFrameTime = now - (delta % this.frameTime);
    }

    // Use setTimeout for less aggressive CPU usage
    this.animationTimer = setTimeout(() => this.loop(), 1);
  }

  private update(time: number): void {
    const fullSize = this.renderer.getSize();
    const buffer = this.renderer.getBuffer();
    
    // Clear buffer
    buffer.clear();
    
    // Reserve bottom row for banner/status - give patterns reduced height
    const patternSize = {
      width: fullSize.width,
      height: fullSize.height - 1  // Exclude bottom row
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
    // Reset OLD pattern to clean up its state
    this.pattern.reset();
    
    // Switch to NEW pattern
    this.pattern = pattern;
    
    // Reset NEW pattern to ensure clean starting state
    this.pattern.reset();
    
    // CRITICAL: Physically clear the terminal screen to remove old pattern
    this.renderer.clearScreen();
  }

  getPattern(): Pattern {
    return this.pattern;
  }

  setFps(fps: number): void {
    this.fps = fps;
    this.frameTime = 1000 / fps;
    this.perfMonitor.setTargetFps(fps);
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
