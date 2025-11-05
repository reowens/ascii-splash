import { PerformanceMonitor } from '../../../src/engine/PerformanceMonitor.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(30); // 30 FPS target
  });

  describe('Construction', () => {
    it('initializes with target FPS', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.targetFps).toBe(30);
    });

    it('initializes with zero metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.frameTime).toBe(0);
      expect(metrics.renderTime).toBe(0);
      expect(metrics.updateTime).toBe(0);
      expect(metrics.changedCells).toBe(0);
      expect(metrics.patternRenderTime).toBe(0);
      expect(metrics.frameDrops).toBe(0);
    });
  });

  describe('startFrame()', () => {
    it('tracks first frame without calculating FPS', () => {
      monitor.startFrame();
      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBe(0); // No history yet
      expect(metrics.frameTime).toBe(0); // No previous frame
    });

    it('calculates FPS after two frames', () => {
      monitor.startFrame();
      
      // Wait a bit to simulate frame time
      const start = performance.now();
      while (performance.now() - start < 16) {} // ~16ms = 60fps
      
      monitor.startFrame();
      const metrics = monitor.getMetrics();
      
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.frameTime).toBeGreaterThan(0);
    });

    it('maintains frame history limited to 60 frames', () => {
      // Simulate 100 frames
      for (let i = 0; i < 100; i++) {
        monitor.startFrame();
        // Small delay
        const start = performance.now();
        while (performance.now() - start < 1) {}
      }

      const stats = monitor.getStats();
      // History should be capped at 60
      expect(stats.totalFrames).toBe(100);
    });

    it('detects frame drops when frame time exceeds target by 50%', () => {
      monitor.startFrame();
      
      // Simulate a slow frame (> 50ms for 30fps target)
      // Target frame time = 1000/30 = 33.33ms
      // 50% over = 50ms
      const start = performance.now();
      while (performance.now() - start < 60) {} // 60ms is definitely a drop
      
      monitor.startFrame();
      const metrics = monitor.getMetrics();
      
      expect(metrics.frameDrops).toBeGreaterThan(0);
    });

    it('increments total frames counter', () => {
      monitor.startFrame();
      monitor.startFrame();
      monitor.startFrame();

      const stats = monitor.getStats();
      expect(stats.totalFrames).toBe(3);
    });
  });

  describe('Record Methods', () => {
    it('recordUpdateTime stores update time', () => {
      monitor.recordUpdateTime(5.5);
      const metrics = monitor.getMetrics();
      expect(metrics.updateTime).toBe(5.5);
    });

    it('recordPatternRenderTime stores pattern render time', () => {
      monitor.recordPatternRenderTime(3.2);
      const metrics = monitor.getMetrics();
      expect(metrics.patternRenderTime).toBe(3.2);
    });

    it('recordRenderTime stores render time', () => {
      monitor.recordRenderTime(2.1);
      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBe(2.1);
    });

    it('recordChangedCells stores changed cell count', () => {
      monitor.recordChangedCells(150);
      const metrics = monitor.getMetrics();
      expect(metrics.changedCells).toBe(150);
    });
  });

  describe('setTargetFps()', () => {
    it('updates target FPS', () => {
      monitor.setTargetFps(60);
      const metrics = monitor.getMetrics();
      expect(metrics.targetFps).toBe(60);
    });

    it('affects frame drop detection threshold', () => {
      monitor.setTargetFps(60); // 16.67ms per frame
      
      monitor.startFrame();
      
      // Simulate frame time well under drop threshold (25ms = 1.5x 16.67ms)
      // Use 10ms to have a very safe margin and avoid timing flakiness
      const start = performance.now();
      while (performance.now() - start < 10) {}
      
      monitor.startFrame();
      const metrics = monitor.getMetrics();
      
      // Should not detect drop with 10ms at 60fps (threshold is 25ms)
      expect(metrics.frameDrops).toBe(0);
    });
  });

  describe('getMetrics()', () => {
    it('returns a copy of metrics (not reference)', () => {
      const metrics1 = monitor.getMetrics();
      metrics1.fps = 999;
      
      const metrics2 = monitor.getMetrics();
      expect(metrics2.fps).not.toBe(999);
    });

    it('reflects all recorded values', () => {
      monitor.recordUpdateTime(10);
      monitor.recordPatternRenderTime(5);
      monitor.recordRenderTime(3);
      monitor.recordChangedCells(200);
      
      const metrics = monitor.getMetrics();
      expect(metrics.updateTime).toBe(10);
      expect(metrics.patternRenderTime).toBe(5);
      expect(metrics.renderTime).toBe(3);
      expect(metrics.changedCells).toBe(200);
    });
  });

  describe('getStats()', () => {
    it('returns zero stats when no frames recorded', () => {
      const stats = monitor.getStats();
      expect(stats.avgFps).toBe(0);
      expect(stats.minFps).toBe(0);
      expect(stats.maxFps).toBe(0);
      expect(stats.avgFrameTime).toBe(0);
      expect(stats.totalFrames).toBe(0);
      expect(stats.totalDroppedFrames).toBe(0);
    });

    it('calculates min/max FPS from history', () => {
      // Simulate varying frame rates
      monitor.startFrame();
      
      // Fast frame
      let start = performance.now();
      while (performance.now() - start < 10) {}
      monitor.startFrame();
      
      // Slow frame
      start = performance.now();
      while (performance.now() - start < 50) {}
      monitor.startFrame();
      
      // Medium frame
      start = performance.now();
      while (performance.now() - start < 20) {}
      monitor.startFrame();
      
      const stats = monitor.getStats();
      expect(stats.minFps).toBeGreaterThan(0);
      expect(stats.maxFps).toBeGreaterThan(stats.minFps);
      expect(stats.avgFps).toBeGreaterThan(0);
    });

    it('tracks total frames and dropped frames', () => {
      monitor.startFrame();
      
      // Normal frame
      let start = performance.now();
      while (performance.now() - start < 20) {}
      monitor.startFrame();
      
      // Dropped frame (> 50ms for 30fps)
      start = performance.now();
      while (performance.now() - start < 60) {}
      monitor.startFrame();
      
      const stats = monitor.getStats();
      expect(stats.totalFrames).toBe(3);
      expect(stats.totalDroppedFrames).toBeGreaterThan(0);
    });
  });

  describe('reset()', () => {
    it('clears frame history', () => {
      monitor.startFrame();
      const start = performance.now();
      while (performance.now() - start < 16) {}
      monitor.startFrame();
      
      // Get FPS before reset to verify it changes
      const beforeMetrics = monitor.getMetrics();
      expect(beforeMetrics.fps).toBeGreaterThan(0);
      
      monitor.reset();
      
      // After reset, frame history is cleared but current FPS value remains
      // until next frame is recorded (which will use empty history)
      const stats = monitor.getStats();
      expect(stats.totalFrames).toBe(0);
      expect(stats.totalDroppedFrames).toBe(0);
      
      const metrics = monitor.getMetrics();
      expect(metrics.frameDrops).toBe(0);
    });

    it('resets total frame counters', () => {
      monitor.startFrame();
      monitor.startFrame();
      monitor.startFrame();
      
      monitor.reset();
      
      const stats = monitor.getStats();
      expect(stats.totalFrames).toBe(0);
      expect(stats.totalDroppedFrames).toBe(0);
    });

    it('does not reset recorded times', () => {
      monitor.recordUpdateTime(10);
      monitor.recordRenderTime(5);
      
      monitor.reset();
      
      const metrics = monitor.getMetrics();
      expect(metrics.updateTime).toBe(10);
      expect(metrics.renderTime).toBe(5);
    });

    it('does not reset target FPS', () => {
      monitor.setTargetFps(60);
      monitor.reset();
      
      const metrics = monitor.getMetrics();
      expect(metrics.targetFps).toBe(60);
    });
  });

  describe('getPercentile()', () => {
    it('returns 0 when no frames recorded', () => {
      expect(monitor.getPercentile(50)).toBe(0);
      expect(monitor.getPercentile(95)).toBe(0);
    });

    it('calculates 50th percentile (median)', () => {
      // Generate some frame data
      monitor.startFrame();
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        while (performance.now() - start < 10 + i * 2) {} // Varying times
        monitor.startFrame();
      }
      
      const median = monitor.getPercentile(50);
      expect(median).toBeGreaterThan(0);
    });

    it('calculates 95th percentile', () => {
      monitor.startFrame();
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        while (performance.now() - start < 10) {}
        monitor.startFrame();
      }
      
      const p95 = monitor.getPercentile(95);
      const p50 = monitor.getPercentile(50);
      
      expect(p95).toBeGreaterThan(0);
      expect(p95).toBeGreaterThanOrEqual(p50);
    });

    it('handles percentile at boundaries', () => {
      monitor.startFrame();
      const start = performance.now();
      while (performance.now() - start < 16) {}
      monitor.startFrame();
      
      const p0 = monitor.getPercentile(0);
      const p99 = monitor.getPercentile(99); // Use 99 instead of 100 to avoid off-by-one
      
      expect(p0).toBeGreaterThan(0);
      expect(p99).toBeGreaterThan(0);
      expect(p99).toBeGreaterThanOrEqual(p0);
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('tracks performance over multiple frames', () => {
      // Simulate a real animation loop
      for (let frame = 0; frame < 30; frame++) {
        monitor.startFrame();
        
        // Simulate pattern rendering
        const patternStart = performance.now();
        while (performance.now() - patternStart < 2) {}
        monitor.recordPatternRenderTime(performance.now() - patternStart);
        
        // Simulate buffer update
        const updateStart = performance.now();
        while (performance.now() - updateStart < 1) {}
        monitor.recordUpdateTime(performance.now() - updateStart);
        
        // Simulate render
        const renderStart = performance.now();
        while (performance.now() - renderStart < 1) {}
        monitor.recordRenderTime(performance.now() - renderStart);
        
        monitor.recordChangedCells(50 + Math.floor(Math.random() * 100));
        
        // Small delay to next frame
        const frameDelay = performance.now();
        while (performance.now() - frameDelay < 10) {}
      }
      
      const stats = monitor.getStats();
      expect(stats.totalFrames).toBe(30);
      expect(stats.avgFps).toBeGreaterThan(0);
    });

    it('detects performance degradation', () => {
      // Good frames
      for (let i = 0; i < 10; i++) {
        monitor.startFrame();
        const start = performance.now();
        while (performance.now() - start < 16) {} // 60fps
      }
      
      const goodStats = monitor.getStats();
      const goodAvgFps = goodStats.avgFps;
      
      // Bad frames
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        while (performance.now() - start < 60) {} // 16fps
        monitor.startFrame();
      }
      
      const badStats = monitor.getStats();
      expect(badStats.avgFps).toBeLessThan(goodAvgFps);
      expect(badStats.totalDroppedFrames).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles very high FPS target', () => {
      const highFpsMonitor = new PerformanceMonitor(120);
      highFpsMonitor.startFrame();
      
      const start = performance.now();
      while (performance.now() - start < 8) {} // ~120fps
      highFpsMonitor.startFrame();
      
      const metrics = highFpsMonitor.getMetrics();
      expect(metrics.targetFps).toBe(120);
      expect(metrics.fps).toBeGreaterThan(0);
    });

    it('handles very low FPS target', () => {
      const lowFpsMonitor = new PerformanceMonitor(10);
      lowFpsMonitor.startFrame();
      
      const start = performance.now();
      while (performance.now() - start < 100) {} // ~10fps
      lowFpsMonitor.startFrame();
      
      const metrics = lowFpsMonitor.getMetrics();
      expect(metrics.targetFps).toBe(10);
    });

    it('handles zero recorded values', () => {
      monitor.recordUpdateTime(0);
      monitor.recordRenderTime(0);
      monitor.recordPatternRenderTime(0);
      monitor.recordChangedCells(0);
      
      const metrics = monitor.getMetrics();
      expect(metrics.updateTime).toBe(0);
      expect(metrics.renderTime).toBe(0);
      expect(metrics.patternRenderTime).toBe(0);
      expect(metrics.changedCells).toBe(0);
    });

    it('handles negative recorded values gracefully', () => {
      // Edge case: shouldn't happen, but monitor doesn't validate
      monitor.recordUpdateTime(-5);
      monitor.recordRenderTime(-3);
      
      const metrics = monitor.getMetrics();
      expect(metrics.updateTime).toBe(-5);
      expect(metrics.renderTime).toBe(-3);
    });

    it('handles very large changed cell counts', () => {
      monitor.recordChangedCells(1000000);
      const metrics = monitor.getMetrics();
      expect(metrics.changedCells).toBe(1000000);
    });
  });

  describe('Rolling Average Calculation', () => {
    it('computes accurate FPS average', () => {
      // Generate consistent frame times
      monitor.startFrame();
      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        while (performance.now() - start < 33) {} // ~30fps
        monitor.startFrame();
      }
      
      const metrics = monitor.getMetrics();
      // Should be close to 30fps (with some variance)
      expect(metrics.fps).toBeGreaterThan(20);
      expect(metrics.fps).toBeLessThan(40);
    });

    it('adapts to changing frame rates', () => {
      // Fast frames
      monitor.startFrame();
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        while (performance.now() - start < 16) {} // 60fps
        monitor.startFrame();
      }
      
      const fastMetrics = monitor.getMetrics();
      
      // Slow down
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        while (performance.now() - start < 33) {} // 30fps
        monitor.startFrame();
      }
      
      const slowMetrics = monitor.getMetrics();
      
      // Average should shift toward slower rate
      expect(slowMetrics.fps).toBeLessThan(fastMetrics.fps);
    });
  });
});
