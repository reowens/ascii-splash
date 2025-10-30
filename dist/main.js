"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const terminal_kit_1 = __importDefault(require("terminal-kit"));
const TerminalRenderer_1 = require("./renderer/TerminalRenderer");
const AnimationEngine_1 = require("./engine/AnimationEngine");
const WavePattern_1 = require("./patterns/WavePattern");
const StarfieldPattern_1 = require("./patterns/StarfieldPattern");
const MatrixPattern_1 = require("./patterns/MatrixPattern");
const RainPattern_1 = require("./patterns/RainPattern");
const term = terminal_kit_1.default.terminal;
function main() {
    // Create renderer
    const renderer = new TerminalRenderer_1.TerminalRenderer();
    let currentQuality = 'medium';
    const qualityConfigs = {
        low: {
            fps: 15,
            wave: { layers: 1, amplitude: 3 },
            starfield: { starCount: 50 },
            matrix: { density: 0.2 },
            rain: { density: 0.1 }
        },
        medium: {
            fps: 30,
            wave: { layers: 3, amplitude: 5 },
            starfield: { starCount: 100 },
            matrix: { density: 0.3 },
            rain: { density: 0.2 }
        },
        high: {
            fps: 60,
            wave: { layers: 5, amplitude: 7 },
            starfield: { starCount: 200 },
            matrix: { density: 0.4 },
            rain: { density: 0.3 }
        }
    };
    // Create patterns with medium quality
    let patterns = [];
    function createPatternsForQuality(quality) {
        const config = qualityConfigs[quality];
        return [
            new WavePattern_1.WavePattern(config.wave),
            new StarfieldPattern_1.StarfieldPattern(config.starfield),
            new MatrixPattern_1.MatrixPattern(config.matrix),
            new RainPattern_1.RainPattern(config.rain)
        ];
    }
    patterns = createPatternsForQuality(currentQuality);
    let currentPatternIndex = 0;
    let showingHelp = false;
    let debugMode = false;
    // Create animation engine with default pattern
    const engine = new AnimationEngine_1.AnimationEngine(renderer, patterns[currentPatternIndex], qualityConfigs[currentQuality].fps);
    function switchPattern(index) {
        if (index >= 0 && index < patterns.length) {
            currentPatternIndex = index;
            engine.setPattern(patterns[currentPatternIndex]);
            showPatternName(patterns[currentPatternIndex].name);
        }
    }
    function setQuality(quality) {
        currentQuality = quality;
        patterns = createPatternsForQuality(quality);
        engine.setFps(qualityConfigs[quality].fps);
        engine.setPattern(patterns[currentPatternIndex]);
        const qualityNames = { low: 'LOW (15 FPS)', medium: 'MEDIUM (30 FPS)', high: 'HIGH (60 FPS)' };
        showMessage(`Quality: ${qualityNames[quality]}`);
    }
    function showPatternName(name) {
        term.moveTo(1, 1);
        term.eraseLine();
        term.bold.cyan(`Pattern: ${name}`);
        setTimeout(() => {
            term.moveTo(1, 1);
            term.eraseLine();
        }, 2000);
    }
    function toggleHelp() {
        showingHelp = !showingHelp;
        if (showingHelp) {
            const helpLines = [
                'KEYBOARD CONTROLS',
                '─────────────────',
                '1-4      Switch patterns',
                'n/p      Next/Previous pattern',
                'SPACE    Pause/Resume',
                '+/-      Speed up/down',
                '[/]      Quality presets (low/high)',
                '?        Toggle this help',
                'd        Toggle debug info',
                'q/ESC    Quit',
                '',
                'MOUSE',
                '─────────────────',
                'Move     Interactive effects',
                'Click    Ripple/burst effect'
            ];
            const startY = Math.floor((renderer.getSize().height - helpLines.length) / 2);
            const startX = 5;
            helpLines.forEach((line, i) => {
                term.moveTo(startX, startY + i);
                term.bold.cyan(line);
            });
        }
        else {
            term.clear();
        }
    }
    function toggleDebug() {
        debugMode = !debugMode;
        if (!debugMode) {
            // Clear debug overlay area (up to 20 lines to handle pattern metrics)
            for (let i = 0; i < 20; i++) {
                term.moveTo(1, i + 1);
                term.eraseLine();
            }
        }
    }
    function renderDebugOverlay() {
        if (!debugMode)
            return;
        const metrics = engine.getPerformanceMonitor().getMetrics();
        const stats = engine.getPerformanceMonitor().getStats();
        const size = renderer.getSize();
        const currentPattern = patterns[currentPatternIndex];
        const lines = [
            `PERFORMANCE DEBUG`,
            `────────────────────────────`,
            `Quality: ${currentQuality.toUpperCase()}`,
            `FPS: ${metrics.fps.toFixed(1)} / ${metrics.targetFps} (target)`,
            `Frame: ${metrics.frameTime.toFixed(2)}ms`,
            `Update: ${metrics.updateTime.toFixed(2)}ms`,
            `Pattern: ${metrics.patternRenderTime.toFixed(2)}ms`,
            `Render: ${metrics.renderTime.toFixed(2)}ms`,
            `Changed Cells: ${metrics.changedCells} / ${size.width * size.height}`,
            `Dropped Frames: ${stats.totalDroppedFrames}`,
            `Min/Avg/Max FPS: ${stats.minFps.toFixed(1)} / ${stats.avgFps.toFixed(1)} / ${stats.maxFps.toFixed(1)}`,
            `Total Frames: ${stats.totalFrames}`,
            `Pattern: ${currentPattern.name}`
        ];
        // Add pattern-specific metrics if available
        if (currentPattern.getMetrics) {
            const patternMetrics = currentPattern.getMetrics();
            lines.push(`Pattern Metrics:`);
            for (const [key, value] of Object.entries(patternMetrics)) {
                lines.push(`  ${key}: ${value}`);
            }
        }
        lines.forEach((line, i) => {
            term.moveTo(2, i + 1);
            term.bgBlack();
            if (i === 0) {
                term.bold.yellow(line);
            }
            else if (i === 1) {
                term.dim.white(line);
            }
            else {
                // Color code FPS
                if (line.startsWith('FPS:')) {
                    const fpsRatio = metrics.fps / metrics.targetFps;
                    if (fpsRatio >= 0.9) {
                        term.green(line);
                    }
                    else if (fpsRatio >= 0.7) {
                        term.yellow(line);
                    }
                    else {
                        term.red(line);
                    }
                }
                else {
                    term.white(line);
                }
            }
        });
        term.defaultColor();
        term.bgDefaultColor();
    }
    // Handle input
    term.on('key', (name) => {
        // Quit commands
        if (name === 'CTRL_C' || name === 'q' || name === 'ESCAPE') {
            cleanup();
        }
        // Pause/Resume
        else if (name === 'SPACE') {
            engine.pause();
        }
        // Pattern selection - direct
        else if (name === '1') {
            switchPattern(0); // Waves
        }
        else if (name === '2') {
            switchPattern(1); // Starfield
        }
        else if (name === '3') {
            switchPattern(2); // Matrix
        }
        else if (name === '4') {
            switchPattern(3); // Rain
        }
        // Pattern selection - next/previous
        else if (name === 'n') {
            switchPattern((currentPatternIndex + 1) % patterns.length);
        }
        else if (name === 'p') {
            const nextIndex = currentPatternIndex - 1;
            switchPattern(nextIndex < 0 ? patterns.length - 1 : nextIndex);
        }
        // Speed controls
        else if (name === '+' || name === '=') {
            const newFps = Math.min(60, engine.getFps() + 5);
            engine.setFps(newFps);
            showMessage(`Speed: ${newFps} FPS`);
        }
        else if (name === '-' || name === '_') {
            const newFps = Math.max(10, engine.getFps() - 5);
            engine.setFps(newFps);
            showMessage(`Speed: ${newFps} FPS`);
        }
        // Help toggle
        else if (name === '?') {
            toggleHelp();
        }
        // Debug toggle
        else if (name === 'd') {
            toggleDebug();
        }
        // Quality presets
        else if (name === '[') {
            if (currentQuality === 'high')
                setQuality('medium');
            else if (currentQuality === 'medium')
                setQuality('low');
        }
        else if (name === ']') {
            if (currentQuality === 'low')
                setQuality('medium');
            else if (currentQuality === 'medium')
                setQuality('high');
        }
    });
    // Handle mouse events with throttling
    let lastMouseMoveTime = 0;
    const mouseThrottleMs = 16; // ~60fps for mouse events
    term.on('mouse', (name, data) => {
        const currentPattern = patterns[currentPatternIndex];
        const now = Date.now();
        if (name === 'MOUSE_MOTION' && currentPattern.onMouseMove) {
            // Throttle mouse move events
            if (now - lastMouseMoveTime >= mouseThrottleMs) {
                // terminal-kit uses 1-based indexing, convert to 0-based
                currentPattern.onMouseMove({ x: data.x - 1, y: data.y - 1 });
                lastMouseMoveTime = now;
            }
        }
        else if (name === 'MOUSE_LEFT_BUTTON_PRESSED' && currentPattern.onMouseClick) {
            currentPattern.onMouseClick({ x: data.x - 1, y: data.y - 1 });
        }
    });
    function showMessage(msg) {
        term.moveTo(1, 1);
        term.eraseLine();
        term.bold.cyan(msg);
        setTimeout(() => {
            term.moveTo(1, 1);
            term.eraseLine();
        }, 1500);
    }
    function cleanup() {
        engine.stop();
        renderer.cleanup();
    }
    // Start animation
    engine.start();
    // Set up debug overlay rendering
    engine.setAfterRenderCallback(() => {
        renderDebugOverlay();
    });
    // Display welcome message briefly
    term.moveTo(1, 1);
    term.bold.cyan('ascii-splash');
    term.moveTo(1, 2);
    term.dim('Press ? for help | q to quit');
    // Clear message after 3 seconds
    setTimeout(() => {
        term.moveTo(1, 1);
        term.eraseLine();
        term.moveTo(1, 2);
        term.eraseLine();
    }, 3000);
}
// Run the app
main();
//# sourceMappingURL=main.js.map