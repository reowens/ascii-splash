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
export declare class PerformanceMonitor {
    private metrics;
    private frameHistory;
    private frameTimeHistory;
    private maxHistorySize;
    private startTime;
    private lastFrameTime;
    private totalFrames;
    private totalDroppedFrames;
    constructor(targetFps: number);
    startFrame(): void;
    recordUpdateTime(time: number): void;
    recordPatternRenderTime(time: number): void;
    recordRenderTime(time: number): void;
    recordChangedCells(count: number): void;
    setTargetFps(fps: number): void;
    getMetrics(): PerformanceMetrics;
    getStats(): PerformanceStats;
    reset(): void;
    getPercentile(percentile: number): number;
}
//# sourceMappingURL=PerformanceMonitor.d.ts.map