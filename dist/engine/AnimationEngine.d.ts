import { TerminalRenderer } from '../renderer/TerminalRenderer';
import { Pattern } from '../types';
import { PerformanceMonitor } from './PerformanceMonitor';
export declare class AnimationEngine {
    private renderer;
    private pattern;
    private running;
    private paused;
    private fps;
    private frameTime;
    private lastFrameTime;
    private animationTimer;
    private perfMonitor;
    private afterRenderCallback?;
    constructor(renderer: TerminalRenderer, pattern: Pattern, fps?: number);
    start(): void;
    stop(): void;
    pause(): void;
    private loop;
    private update;
    private render;
    setPattern(pattern: Pattern): void;
    getPattern(): Pattern;
    setFps(fps: number): void;
    getFps(): number;
    getPerformanceMonitor(): PerformanceMonitor;
    setAfterRenderCallback(callback: () => void): void;
}
//# sourceMappingURL=AnimationEngine.d.ts.map