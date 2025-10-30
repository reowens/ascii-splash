export interface PerformanceMetrics {
  fps: number;
  targetFps: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
  changedCells: number;
  patternRenderTime: number;
  frameDrops: number;
}

export interface PerformanceStats {
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgFrameTime: number;
  totalFrames: number;
  totalDroppedFrames: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private maxHistorySize = 60; // Track last 60 frames (1 second at 60fps)
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private totalFrames: number = 0;
  private totalDroppedFrames: number = 0;

  constructor(targetFps: number) {
    this.metrics = {
      fps: 0,
      targetFps,
      frameTime: 0,
      renderTime: 0,
      updateTime: 0,
      changedCells: 0,
      patternRenderTime: 0,
      frameDrops: 0
    };
  }

  startFrame(): void {
    this.startTime = performance.now();
    
    if (this.lastFrameTime > 0) {
      const delta = this.startTime - this.lastFrameTime;
      this.metrics.frameTime = delta;
      
      // Calculate FPS from actual frame time
      const currentFps = 1000 / delta;
      this.frameHistory.push(currentFps);
      this.frameTimeHistory.push(delta);
      
      // Keep history limited
      if (this.frameHistory.length > this.maxHistorySize) {
        this.frameHistory.shift();
        this.frameTimeHistory.shift();
      }
      
      // Calculate average FPS from history
      this.metrics.fps = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
      
      // Track frame drops (when frame time exceeds target by 50%)
      const targetFrameTime = 1000 / this.metrics.targetFps;
      if (delta > targetFrameTime * 1.5) {
        this.metrics.frameDrops++;
        this.totalDroppedFrames++;
      }
    }
    
    this.lastFrameTime = this.startTime;
    this.totalFrames++;
  }

  recordUpdateTime(time: number): void {
    this.metrics.updateTime = time;
  }

  recordPatternRenderTime(time: number): void {
    this.metrics.patternRenderTime = time;
  }

  recordRenderTime(time: number): void {
    this.metrics.renderTime = time;
  }

  recordChangedCells(count: number): void {
    this.metrics.changedCells = count;
  }

  setTargetFps(fps: number): void {
    this.metrics.targetFps = fps;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getStats(): PerformanceStats {
    const minFps = this.frameHistory.length > 0 
      ? Math.min(...this.frameHistory) 
      : 0;
    const maxFps = this.frameHistory.length > 0 
      ? Math.max(...this.frameHistory) 
      : 0;
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;

    return {
      avgFps: this.metrics.fps,
      minFps,
      maxFps,
      avgFrameTime,
      totalFrames: this.totalFrames,
      totalDroppedFrames: this.totalDroppedFrames
    };
  }

  reset(): void {
    this.frameHistory = [];
    this.frameTimeHistory = [];
    this.totalFrames = 0;
    this.totalDroppedFrames = 0;
    this.metrics.frameDrops = 0;
  }

  getPercentile(percentile: number): number {
    if (this.frameHistory.length === 0) return 0;
    
    const sorted = [...this.frameHistory].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index];
  }
}
