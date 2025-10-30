"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const terminal_kit_1 = __importDefault(require("terminal-kit"));
const commander_1 = require("commander");
const fs_1 = require("fs");
const path_1 = require("path");
const TerminalRenderer_1 = require("./renderer/TerminalRenderer");
const AnimationEngine_1 = require("./engine/AnimationEngine");
const WavePattern_1 = require("./patterns/WavePattern");
const StarfieldPattern_1 = require("./patterns/StarfieldPattern");
const MatrixPattern_1 = require("./patterns/MatrixPattern");
const RainPattern_1 = require("./patterns/RainPattern");
const QuicksilverPattern_1 = require("./patterns/QuicksilverPattern");
const ParticlePattern_1 = require("./patterns/ParticlePattern");
const SpiralPattern_1 = require("./patterns/SpiralPattern");
const PlasmaPattern_1 = require("./patterns/PlasmaPattern");
const ConfigLoader_1 = require("./config/ConfigLoader");
const themes_1 = require("./config/themes");
const term = terminal_kit_1.default.terminal;
/**
 * Parse command line arguments
 */
function parseCliArguments() {
    const program = new commander_1.Command();
    // Read package.json for version
    const packageJson = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', 'package.json'), 'utf-8'));
    program
        .name('splash')
        .description('A terminal ASCII animation app that adds visual flow to your IDE workspace')
        .version(packageJson.version);
    // Pattern selection
    program.option('-p, --pattern <name>', 'Start with specific pattern (waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma)');
    // Quality preset
    program.option('-q, --quality <preset>', 'Set quality preset (low, medium, high)', 'medium');
    // FPS override
    program.option('-f, --fps <number>', 'Set custom FPS (10-60)', (value) => {
        const fps = parseInt(value, 10);
        if (isNaN(fps) || fps < 10 || fps > 60) {
            program.error(`FPS must be a number between 10 and 60 (got: ${value})`);
        }
        return fps;
    });
    // Theme
    program.option('-t, --theme <name>', 'Set color theme (ocean, matrix, starlight, fire, monochrome)');
    // Mouse control
    program.option('--no-mouse', 'Disable mouse interaction');
    program.parse();
    const options = program.opts();
    // Validate pattern if provided
    const validPatterns = ['waves', 'starfield', 'matrix', 'rain', 'quicksilver', 'particles', 'spiral', 'plasma'];
    if (options.pattern && !validPatterns.includes(options.pattern.toLowerCase())) {
        program.error(`Invalid pattern: ${options.pattern}\nValid patterns: ${validPatterns.join(', ')}`);
    }
    // Validate quality
    const validQualities = ['low', 'medium', 'high'];
    if (options.quality && !validQualities.includes(options.quality.toLowerCase())) {
        program.error(`Invalid quality: ${options.quality}\nValid qualities: ${validQualities.join(', ')}`);
    }
    return {
        pattern: options.pattern?.toLowerCase(),
        quality: options.quality?.toLowerCase(),
        fps: options.fps,
        theme: options.theme?.toLowerCase(),
        mouse: options.mouse
    };
}
function main() {
    // Parse CLI arguments
    const cliOptions = parseCliArguments();
    // Load configuration (CLI > config file > defaults)
    const configLoader = new ConfigLoader_1.ConfigLoader();
    const config = configLoader.load(cliOptions);
    // Determine mouse enabled state from config
    const mouseEnabled = config.mouseEnabled !== false;
    // Create renderer with mouse setting
    const renderer = new TerminalRenderer_1.TerminalRenderer(mouseEnabled);
    // Current quality setting
    let currentQuality = config.quality || 'medium';
    // Quality-based FPS presets (used when quality changes)
    const qualityFpsPresets = {
        low: 15,
        medium: 30,
        high: 60
    };
    // Load theme from config
    let currentTheme = (0, themes_1.getTheme)(config.theme);
    // Create patterns with configuration
    let patterns = [];
    function createPatternsFromConfig(cfg, theme) {
        return [
            new WavePattern_1.WavePattern(theme, {
                layers: cfg.patterns?.waves?.layers,
                amplitude: cfg.patterns?.waves?.amplitude,
                speed: cfg.patterns?.waves?.speed,
                frequency: cfg.patterns?.waves?.frequency
            }),
            new StarfieldPattern_1.StarfieldPattern(theme, {
                starCount: cfg.patterns?.starfield?.starCount,
                speed: cfg.patterns?.starfield?.speed
            }),
            new MatrixPattern_1.MatrixPattern(theme, {
                density: cfg.patterns?.matrix?.columnDensity,
                speed: cfg.patterns?.matrix?.speed
            }),
            new RainPattern_1.RainPattern({
                density: cfg.patterns?.rain?.dropCount ? cfg.patterns.rain.dropCount / 500 : undefined,
                speed: cfg.patterns?.rain?.speed
            }),
            new QuicksilverPattern_1.QuicksilverPattern({
                speed: cfg.patterns?.quicksilver?.speed,
                flowIntensity: cfg.patterns?.quicksilver?.viscosity,
                noiseScale: 0.05
            }),
            new ParticlePattern_1.ParticlePattern(theme, {
                particleCount: cfg.patterns?.particles?.particleCount,
                speed: cfg.patterns?.particles?.speed,
                gravity: cfg.patterns?.particles?.gravity,
                mouseForce: cfg.patterns?.particles?.mouseForce,
                spawnRate: cfg.patterns?.particles?.spawnRate
            }),
            new SpiralPattern_1.SpiralPattern(theme, {
                spiralCount: cfg.patterns?.spiral?.spiralCount,
                rotationSpeed: cfg.patterns?.spiral?.rotationSpeed,
                armLength: cfg.patterns?.spiral?.armLength,
                density: cfg.patterns?.spiral?.density,
                expandSpeed: cfg.patterns?.spiral?.expandSpeed
            }),
            new PlasmaPattern_1.PlasmaPattern(theme, {
                frequency: cfg.patterns?.plasma?.frequency,
                speed: cfg.patterns?.plasma?.speed,
                complexity: cfg.patterns?.plasma?.complexity
            })
        ];
    }
    patterns = createPatternsFromConfig(config, currentTheme);
    // Determine starting pattern from config
    let currentPatternIndex = 0;
    if (config.defaultPattern) {
        const patternNames = ['waves', 'starfield', 'matrix', 'rain', 'quicksilver', 'particles', 'spiral', 'plasma'];
        const index = patternNames.indexOf(config.defaultPattern);
        if (index >= 0) {
            currentPatternIndex = index;
        }
    }
    let showingHelp = false;
    let debugMode = false;
    // Determine initial FPS from config
    const initialFps = ConfigLoader_1.ConfigLoader.getFpsFromConfig(config);
    // Create animation engine with selected pattern and FPS
    const engine = new AnimationEngine_1.AnimationEngine(renderer, patterns[currentPatternIndex], initialFps);
    function switchPattern(index) {
        if (index >= 0 && index < patterns.length) {
            currentPatternIndex = index;
            engine.setPattern(patterns[currentPatternIndex]);
            showPatternName(patterns[currentPatternIndex].name);
        }
    }
    function setQuality(quality) {
        currentQuality = quality;
        // Update config with new quality
        config.quality = quality;
        patterns = createPatternsFromConfig(config, currentTheme);
        engine.setFps(qualityFpsPresets[quality]);
        engine.setPattern(patterns[currentPatternIndex]);
        const qualityNames = { low: 'LOW (15 FPS)', medium: 'MEDIUM (30 FPS)', high: 'HIGH (60 FPS)' };
        showMessage(`Quality: ${qualityNames[quality]}`);
    }
    function cycleTheme() {
        const nextThemeName = (0, themes_1.getNextThemeName)(currentTheme.name);
        currentTheme = (0, themes_1.getTheme)(nextThemeName);
        // Recreate patterns with new theme
        patterns = createPatternsFromConfig(config, currentTheme);
        engine.setPattern(patterns[currentPatternIndex]);
        showMessage(`Theme: ${currentTheme.displayName}`);
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
                '1-8      Switch patterns',
                'n/p      Next/Previous pattern',
                'SPACE    Pause/Resume',
                '+/-      Speed up/down',
                '[/]      Quality presets (low/high)',
                't        Cycle themes',
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
            `Pattern: ${currentPattern.name}`,
            `Theme: ${currentTheme.displayName}`,
            `Quality: ${currentQuality.toUpperCase()}`,
            `FPS: ${metrics.fps.toFixed(1)} / ${metrics.targetFps} (target)`,
            `Frame: ${metrics.frameTime.toFixed(2)}ms`,
            `Update: ${metrics.updateTime.toFixed(2)}ms`,
            `Pattern: ${metrics.patternRenderTime.toFixed(2)}ms`,
            `Render: ${metrics.renderTime.toFixed(2)}ms`,
            `Changed Cells: ${metrics.changedCells} / ${size.width * size.height}`,
            `Dropped Frames: ${stats.totalDroppedFrames}`,
            `Min/Avg/Max FPS: ${stats.minFps.toFixed(1)} / ${stats.avgFps.toFixed(1)} / ${stats.maxFps.toFixed(1)}`,
            `Total Frames: ${stats.totalFrames}`
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
        else if (name === '5') {
            switchPattern(4); // Quicksilver
        }
        else if (name === '6') {
            switchPattern(5); // Particles
        }
        else if (name === '7') {
            switchPattern(6); // Spiral
        }
        else if (name === '8') {
            switchPattern(7); // Plasma
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
        // Theme cycling
        else if (name === 't') {
            cycleTheme();
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