"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationEngine = void 0;
const PerformanceMonitor_1 = require("./PerformanceMonitor");
class AnimationEngine {
    constructor(renderer, pattern, fps = 30) {
        this.running = false;
        this.paused = false;
        this.lastFrameTime = 0;
        this.animationTimer = null;
        this.renderer = renderer;
        this.pattern = pattern;
        this.fps = fps;
        this.frameTime = 1000 / fps;
        this.perfMonitor = new PerformanceMonitor_1.PerformanceMonitor(fps);
    }
    start() {
        this.running = true;
        this.lastFrameTime = Date.now();
        this.loop();
    }
    stop() {
        this.running = false;
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }
    pause() {
        this.paused = !this.paused;
    }
    loop() {
        if (!this.running)
            return;
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
    update(time) {
        const size = this.renderer.getSize();
        const buffer = this.renderer.getBuffer();
        // Clear buffer
        buffer.clear();
        // Render pattern into buffer and track time
        const patternStart = performance.now();
        this.pattern.render(buffer.getBuffer(), time, size);
        this.perfMonitor.recordPatternRenderTime(performance.now() - patternStart);
    }
    render() {
        const changedCells = this.renderer.render();
        this.perfMonitor.recordChangedCells(changedCells);
        // Call after-render callback (for debug overlay, etc)
        if (this.afterRenderCallback) {
            this.afterRenderCallback();
        }
    }
    setPattern(pattern) {
        this.pattern.reset();
        this.pattern = pattern;
        // Clear the screen when switching patterns
        this.renderer.getBuffer().clear();
    }
    getPattern() {
        return this.pattern;
    }
    setFps(fps) {
        this.fps = fps;
        this.frameTime = 1000 / fps;
        this.perfMonitor.setTargetFps(fps);
    }
    getFps() {
        return this.fps;
    }
    getPerformanceMonitor() {
        return this.perfMonitor;
    }
    setAfterRenderCallback(callback) {
        this.afterRenderCallback = callback;
    }
}
exports.AnimationEngine = AnimationEngine;
//# sourceMappingURL=AnimationEngine.js.map