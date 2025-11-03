#!/usr/bin/env node
import terminalKit from 'terminal-kit';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TerminalRenderer } from './renderer/TerminalRenderer';
import { AnimationEngine } from './engine/AnimationEngine';
import { WavePattern } from './patterns/WavePattern';
import { StarfieldPattern } from './patterns/StarfieldPattern';
import { MatrixPattern } from './patterns/MatrixPattern';
import { RainPattern } from './patterns/RainPattern';
import { QuicksilverPattern } from './patterns/QuicksilverPattern';
import { ParticlePattern } from './patterns/ParticlePattern';
import { SpiralPattern } from './patterns/SpiralPattern';
import { PlasmaPattern } from './patterns/PlasmaPattern';
import { TunnelPattern } from './patterns/TunnelPattern';
import { LightningPattern } from './patterns/LightningPattern';
import { FireworksPattern } from './patterns/FireworksPattern';
import { MazePattern } from './patterns/MazePattern';
import { LifePattern } from './patterns/LifePattern';
import { DNAPattern } from './patterns/DNAPattern';
import { LavaLampPattern } from './patterns/LavaLampPattern';
import { SmokePattern } from './patterns/SmokePattern';
import { SnowPattern } from './patterns/SnowPattern';
import { Pattern, CliOptions, QualityPreset, ConfigSchema, Theme } from './types';
import { ConfigLoader } from './config/ConfigLoader';
import { getTheme, getNextThemeName } from './config/themes';
import { CommandBuffer } from './engine/CommandBuffer';
import { CommandParser } from './engine/CommandParser';
import { CommandExecutor } from './engine/CommandExecutor';

const term = terminalKit.terminal;

/**
 * Parse command line arguments
 */
function parseCliArguments(): CliOptions {
  const program = new Command();
  
  // Read package.json for version
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );
  
  program
    .name('splash')
    .description('A terminal ASCII animation app that adds visual flow to your IDE workspace')
    .version(packageJson.version);
  
  // Pattern selection
  program.option(
    '-p, --pattern <name>',
    'Start with specific pattern (waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma, tunnel, lightning, fireworks, maze, life, dna, lavalamp, smoke, snow)'
  );
  
  // Quality preset
  program.option(
    '-q, --quality <preset>',
    'Set quality preset (low, medium, high)',
    'medium'
  );
  
  // FPS override
  program.option(
    '-f, --fps <number>',
    'Set custom FPS (10-60)',
    (value) => {
      const fps = parseInt(value, 10);
      if (isNaN(fps) || fps < 10 || fps > 60) {
        program.error(`FPS must be a number between 10 and 60 (got: ${value})`);
      }
      return fps;
    }
  );
  
  // Theme
  program.option(
    '-t, --theme <name>',
    'Set color theme (ocean, matrix, starlight, fire, monochrome)'
  );
  
  // Mouse control
  program.option(
    '--no-mouse',
    'Disable mouse interaction'
  );
  
  program.parse();
  const options = program.opts();
  
  // Validate pattern if provided
  const validPatterns = ['waves', 'starfield', 'matrix', 'rain', 'quicksilver', 'particles', 'spiral', 'plasma', 'tunnel', 'lightning', 'fireworks', 'maze', 'life', 'dna', 'lavalamp', 'smoke', 'snow'];
  if (options.pattern && !validPatterns.includes(options.pattern.toLowerCase())) {
    program.error(
      `Invalid pattern: ${options.pattern}\nValid patterns: ${validPatterns.join(', ')}`
    );
  }
  
  // Validate quality
  const validQualities: QualityPreset[] = ['low', 'medium', 'high'];
  if (options.quality && !validQualities.includes(options.quality.toLowerCase())) {
    program.error(
      `Invalid quality: ${options.quality}\nValid qualities: ${validQualities.join(', ')}`
    );
  }
  
  return {
    pattern: options.pattern?.toLowerCase(),
    quality: options.quality?.toLowerCase() as QualityPreset,
    fps: options.fps,
    theme: options.theme?.toLowerCase(),
    mouse: options.mouse
  };
}

/**
 * Check if running in a TTY environment
 * Exits with error if not interactive
 */
function checkTTY(): void {
  if (!process.stdout.isTTY) {
    console.error('Error: ascii-splash requires an interactive terminal (TTY)');
    console.error('It cannot be run via pipe, redirect, or non-interactive environments.');
    console.error('');
    console.error('Usage: splash [options]');
    console.error('Try: splash --help');
    process.exit(1);
  }
}

function main() {
  // Parse CLI arguments (allows --help/--version to work without TTY)
  const cliOptions = parseCliArguments();
  
  // Check TTY after parsing arguments (so --help works)
  checkTTY();
  
  // Load configuration (CLI > config file > defaults)
  const configLoader = new ConfigLoader();
  const config = configLoader.load(cliOptions);
  
  // Determine mouse enabled state from config
  const mouseEnabled = config.mouseEnabled !== false;
  
  // Create renderer with mouse setting
  const renderer = new TerminalRenderer(mouseEnabled);
  
  // Current quality setting
  let currentQuality: QualityPreset = config.quality || 'medium';
  
  // Quality-based FPS presets (used when quality changes)
  const qualityFpsPresets = {
    low: 15,
    medium: 30,
    high: 60
  };
  
  // Load theme from config
  let currentTheme: Theme = getTheme(config.theme);
  
  // Create patterns with configuration
  let patterns: Pattern[] = [];
  
  function createPatternsFromConfig(cfg: ConfigSchema, theme: Theme): Pattern[] {
    return [
      new WavePattern(theme, {
        layers: cfg.patterns?.waves?.layers,
        amplitude: cfg.patterns?.waves?.amplitude,
        speed: cfg.patterns?.waves?.speed,
        frequency: cfg.patterns?.waves?.frequency
      }),
      new StarfieldPattern(theme, {
        starCount: cfg.patterns?.starfield?.starCount,
        speed: cfg.patterns?.starfield?.speed
      }),
      new MatrixPattern(theme, {
        density: cfg.patterns?.matrix?.columnDensity,
        speed: cfg.patterns?.matrix?.speed
      }),
      new RainPattern(theme, {
        density: cfg.patterns?.rain?.dropCount ? cfg.patterns.rain.dropCount / 500 : undefined,
        speed: cfg.patterns?.rain?.speed
      }),
      new QuicksilverPattern(theme, {
        speed: cfg.patterns?.quicksilver?.speed,
        flowIntensity: cfg.patterns?.quicksilver?.viscosity,
        noiseScale: 0.05
      }),
      new ParticlePattern(theme, {
        particleCount: cfg.patterns?.particles?.particleCount,
        speed: cfg.patterns?.particles?.speed,
        gravity: cfg.patterns?.particles?.gravity,
        mouseForce: cfg.patterns?.particles?.mouseForce,
        spawnRate: cfg.patterns?.particles?.spawnRate
      }),
      new SpiralPattern(theme, {
        armCount: cfg.patterns?.spiral?.armCount,
        particleCount: cfg.patterns?.spiral?.particleCount,
        spiralTightness: cfg.patterns?.spiral?.spiralTightness,
        rotationSpeed: cfg.patterns?.spiral?.rotationSpeed,
        particleSpeed: cfg.patterns?.spiral?.particleSpeed,
        trailLength: cfg.patterns?.spiral?.trailLength,
        direction: cfg.patterns?.spiral?.direction,
        pulseEffect: cfg.patterns?.spiral?.pulseEffect
      }),
      new PlasmaPattern(theme, {
        frequency: cfg.patterns?.plasma?.frequency,
        speed: cfg.patterns?.plasma?.speed,
        complexity: cfg.patterns?.plasma?.complexity
      }),
      new TunnelPattern(theme, {
        shape: cfg.patterns?.tunnel?.shape,
        ringCount: cfg.patterns?.tunnel?.ringCount,
        speed: cfg.patterns?.tunnel?.speed,
        particleCount: cfg.patterns?.tunnel?.particleCount,
        speedLineCount: cfg.patterns?.tunnel?.speedLineCount,
        turbulence: cfg.patterns?.tunnel?.turbulence,
        glowIntensity: cfg.patterns?.tunnel?.glowIntensity,
        chromatic: cfg.patterns?.tunnel?.chromatic,
        rotationSpeed: cfg.patterns?.tunnel?.rotationSpeed,
        radius: cfg.patterns?.tunnel?.radius
      }),
      new LightningPattern(theme, {
        boltDensity: cfg.patterns?.lightning?.boltDensity,
        branchProbability: cfg.patterns?.lightning?.branchProbability,
        branchAngle: cfg.patterns?.lightning?.branchAngle,
        fadeTime: cfg.patterns?.lightning?.fadeTime,
        strikeInterval: cfg.patterns?.lightning?.strikeInterval,
        maxBranches: cfg.patterns?.lightning?.maxBranches,
        thickness: cfg.patterns?.lightning?.thickness
      }),
      new FireworksPattern(theme, {
        burstSize: cfg.patterns?.fireworks?.burstSize,
        launchSpeed: cfg.patterns?.fireworks?.launchSpeed,
        gravity: cfg.patterns?.fireworks?.gravity,
        fadeRate: cfg.patterns?.fireworks?.fadeRate,
        spawnInterval: cfg.patterns?.fireworks?.spawnInterval,
        trailLength: cfg.patterns?.fireworks?.trailLength
      }),
      new MazePattern(theme, {
        algorithm: cfg.patterns?.maze?.algorithm,
        cellSize: cfg.patterns?.maze?.cellSize,
        generationSpeed: cfg.patterns?.maze?.generationSpeed,
        wallChar: cfg.patterns?.maze?.wallChar,
        pathChar: cfg.patterns?.maze?.pathChar,
        animateGeneration: cfg.patterns?.maze?.animateGeneration
      }),
      new LifePattern(theme, {
        cellSize: cfg.patterns?.life?.cellSize,
        updateSpeed: cfg.patterns?.life?.updateSpeed,
        wrapEdges: cfg.patterns?.life?.wrapEdges,
        aliveChar: cfg.patterns?.life?.aliveChar,
        deadChar: cfg.patterns?.life?.deadChar,
        randomDensity: cfg.patterns?.life?.randomDensity,
        initialPattern: cfg.patterns?.life?.initialPattern

      }),
      new DNAPattern(theme, {
        rotationSpeed: cfg.patterns?.dna?.rotationSpeed,
        helixRadius: cfg.patterns?.dna?.helixRadius,
        basePairDensity: cfg.patterns?.dna?.basePairSpacing ? 1 / cfg.patterns.dna.basePairSpacing : undefined,
        twistRate: cfg.patterns?.dna?.twistRate,
        showLabels: true
      }),
      new LavaLampPattern(theme, {
        blobCount: cfg.patterns?.lavaLamp?.blobCount,
        minRadius: cfg.patterns?.lavaLamp?.minRadius,
        maxRadius: cfg.patterns?.lavaLamp?.maxRadius,
        riseSpeed: cfg.patterns?.lavaLamp?.riseSpeed,
        driftSpeed: cfg.patterns?.lavaLamp?.driftSpeed,
        threshold: cfg.patterns?.lavaLamp?.threshold,
        mouseForce: cfg.patterns?.lavaLamp?.mouseForce,
        turbulence: cfg.patterns?.lavaLamp?.turbulence,
        gravity: cfg.patterns?.lavaLamp?.gravity
      }),
      new SmokePattern(theme, {
        plumeCount: cfg.patterns?.smoke?.plumeCount,
        particleCount: cfg.patterns?.smoke?.particleCount,
        riseSpeed: cfg.patterns?.smoke?.riseSpeed,
        dissipationRate: cfg.patterns?.smoke?.dissipationRate,
        turbulence: cfg.patterns?.smoke?.turbulence,
        spread: cfg.patterns?.smoke?.spread,
        windStrength: cfg.patterns?.smoke?.windStrength,
        mouseBlowForce: cfg.patterns?.smoke?.mouseBlowForce
      }),
      new SnowPattern(theme, {
        particleCount: cfg.patterns?.snow?.particleCount,
        fallSpeed: cfg.patterns?.snow?.fallSpeed,
        windStrength: cfg.patterns?.snow?.windStrength,
        turbulence: cfg.patterns?.snow?.turbulence,
        rotationSpeed: cfg.patterns?.snow?.rotationSpeed,
        particleType: cfg.patterns?.snow?.particleType,
        accumulation: cfg.patterns?.snow?.accumulation,
        mouseWindForce: cfg.patterns?.snow?.mouseWindForce
      })
    ];
  }
  
  patterns = createPatternsFromConfig(config, currentTheme);
  
  // Pattern names mapping (internal names)
  const patternNames = ['waves', 'starfield', 'matrix', 'rain', 'quicksilver', 'particles', 'spiral', 'plasma', 'tunnel', 'lightning', 'fireworks', 'maze', 'life', 'dna', 'lavalamp', 'smoke', 'snow'];
  
  // Pattern display names for user-facing messages
  const patternDisplayNames: Record<string, string> = {
    'waves': 'Waves',
    'starfield': 'Starfield',
    'matrix': 'Matrix',
    'rain': 'Rain',
    'quicksilver': 'Quicksilver',
    'particles': 'Particles',
    'spiral': 'Spiral',
    'plasma': 'Plasma',
    'tunnel': 'Tunnel',
    'lightning': 'Lightning',
    'fireworks': 'Fireworks',
    'maze': 'Maze',
    'life': 'Life',
    'dna': 'DNA',
    'lavalamp': 'Lava Lamp',
    'smoke': 'Smoke',
    'snow': 'Snow'
  };
  
  // Determine starting pattern from config
  let currentPatternIndex = 0;
  if (config.defaultPattern) {
    const index = patternNames.indexOf(config.defaultPattern);
    if (index >= 0) {
      currentPatternIndex = index;
    }
  }
  
  let showingHelp = false;
  let debugMode = false;
  
  // Determine initial FPS from config
  const initialFps = ConfigLoader.getFpsFromConfig(config);
  
  // Create animation engine with selected pattern and FPS
  const engine = new AnimationEngine(renderer, patterns[currentPatternIndex], initialFps);
  
  // Initialize command system
  const commandBuffer = new CommandBuffer();
  const commandParser = new CommandParser();
  let currentThemeIndex = ['ocean', 'matrix', 'starlight', 'fire', 'monochrome'].indexOf(currentTheme.name);
  const commandExecutor = new CommandExecutor(
    engine,
    patterns,
    Object.values({ ocean: getTheme('ocean'), matrix: getTheme('matrix'), starlight: getTheme('starlight'), fire: getTheme('fire'), monochrome: getTheme('monochrome') }),
    currentPatternIndex,
    currentThemeIndex,
    configLoader  // Pass ConfigLoader for favorites support
  );
  
  // Set up theme change callback for command executor
  commandExecutor.setThemeChangeCallback((themeIndex: number) => {
    const themeNames = ['ocean', 'matrix', 'starlight', 'fire', 'monochrome'];
    currentTheme = getTheme(themeNames[themeIndex]);
    currentThemeIndex = themeIndex;
    patterns = createPatternsFromConfig(config, currentTheme);
    engine.setPattern(patterns[currentPatternIndex]);
    commandExecutor.updateState(currentPatternIndex, currentThemeIndex);
  });
  
  // Command result message state (tracked for cleanup timing)
  let commandResultTimeout: NodeJS.Timeout | null = null;
  
  // Pattern buffer state (for enhanced 'p' key functionality)
  let patternBuffer = '';
  let patternBufferActive = false;
  let patternBufferTimeout: NodeJS.Timeout | null = null;
  const patternBufferTimeoutMs = 5000; // 5 seconds
  
  // Preset tracking state (for cycling presets)
  let currentPresetIndex = 1; // Default to preset 1 (1-6)
  
  function switchPattern(index: number) {
    if (index >= 0 && index < patterns.length) {
      currentPatternIndex = index;
      currentPresetIndex = 1; // Reset to preset 1 when switching patterns
      engine.setPattern(patterns[currentPatternIndex]);
      commandExecutor.updateState(currentPatternIndex, currentThemeIndex);
      showPatternName(patterns[currentPatternIndex].name);
    }
  }

  function setQuality(quality: QualityPreset) {
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
    const nextThemeName = getNextThemeName(currentTheme.name);
    currentTheme = getTheme(nextThemeName);
    currentThemeIndex = ['ocean', 'matrix', 'starlight', 'fire', 'monochrome'].indexOf(currentTheme.name);
    
    // Recreate patterns with new theme
    patterns = createPatternsFromConfig(config, currentTheme);
    engine.setPattern(patterns[currentPatternIndex]);
    commandExecutor.updateState(currentPatternIndex, currentThemeIndex);
    
    showMessage(`Theme: ${currentTheme.displayName}`);
  }

  function showPatternName(name: string) {
    const displayName = patternDisplayNames[name] || name;
    term.moveTo(1, 1);
    term.eraseLine();
    term.bold.cyan(`Pattern: ${displayName}`);
    
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
        'c        Command mode (advanced)',
        '1-9      Switch patterns (1-9)',
        'n/b      Next/Previous pattern',
        './,      Next/Previous preset',
        'p        Pattern mode (p12, p3.5, pwaves)',
        'r        Random (pattern+preset+theme)',
        's        Save current config',
        'SPACE    Pause/Resume',
        '+/-      Speed up/down',
        '[/]      Performance mode (low/high)',
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
    } else {
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
    if (!debugMode) return;

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
    
    // Add shuffle info if active
    const shuffleInfo = commandExecutor.getShuffleInfo();
    if (shuffleInfo) {
      lines.push(shuffleInfo);
    }

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
      } else if (i === 1) {
        term.dim.white(line);
      } else {
        // Color code FPS
        if (line.startsWith('FPS:')) {
          const fpsRatio = metrics.fps / metrics.targetFps;
          if (fpsRatio >= 0.9) {
            term.green(line);
          } else if (fpsRatio >= 0.7) {
            term.yellow(line);
          } else {
            term.red(line);
          }
        } else {
          term.white(line);
        }
      }
    });
    
    term.defaultColor();
    term.bgDefaultColor();
  }

  function renderCommandOverlay() {
    const size = renderer.getSize();
    const bottomLine = size.height;
    
    term.moveTo(1, bottomLine);
    term.eraseLine();
    
    if (commandBuffer.isActive()) {
      const buffer = commandBuffer.getBuffer();
      const cursorPos = commandBuffer.getCursorPos();
      
      // Draw command prompt with cursor
      term.bgBlack();
      term.bold.cyan('COMMAND: ');
      term.green(buffer.slice(0, cursorPos));
      term.inverse('_'); // Cursor
      term.styleReset();
      term.bgBlack();
      term.green(buffer.slice(cursorPos));
      
      term.defaultColor();
      term.bgDefaultColor();
    }
  }

  function renderPatternOverlay() {
    const size = renderer.getSize();
    const bottomLine = size.height;
    
    term.moveTo(1, bottomLine);
    term.eraseLine();
    
    if (patternBufferActive) {
      // Draw pattern prompt with cursor (yellow to distinguish from command mode)
      term.bgBlack();
      term.bold.yellow('PATTERN: ');
      term.green(patternBuffer);
      term.inverse('_'); // Cursor
      
      term.defaultColor();
      term.bgDefaultColor();
    }
  }

  function showCommandResult(message: string, success: boolean) {
    const size = renderer.getSize();
    const bottomLine = size.height;
    
    // Clear any existing timeout
    if (commandResultTimeout) {
      clearTimeout(commandResultTimeout);
    }
    
    // Show result message
    term.moveTo(1, bottomLine);
    term.eraseLine();
    term.bgBlack();
    
    if (success) {
      term.bold.green('✓ ');
      term.white(message);
    } else {
      term.bold.red('✗ ');
      term.white(message);
    }
    
    term.defaultColor();
    term.bgDefaultColor();
    
    // Auto-clear after 2.5 seconds
    commandResultTimeout = setTimeout(() => {
      term.moveTo(1, bottomLine);
      term.eraseLine();
    }, 2500);
  }
  
  function activatePatternBuffer() {
    patternBuffer = '';
    patternBufferActive = true;
    
    // Clear any existing timeout
    if (patternBufferTimeout) {
      clearTimeout(patternBufferTimeout);
    }
    
    // Set timeout to auto-cancel
    patternBufferTimeout = setTimeout(() => {
      patternBufferActive = false;
      patternBuffer = '';
    }, patternBufferTimeoutMs);
  }
  
  function cancelPatternBuffer() {
    patternBufferActive = false;
    patternBuffer = '';
    if (patternBufferTimeout) {
      clearTimeout(patternBufferTimeout);
      patternBufferTimeout = null;
    }
  }
  
  function executePatternBuffer() {
    const input = patternBuffer.trim();
    patternBufferActive = false;
    if (patternBufferTimeout) {
      clearTimeout(patternBufferTimeout);
      patternBufferTimeout = null;
    }
    
    if (!input) {
      // Empty input = previous pattern
      const nextIndex = currentPatternIndex - 1;
      switchPattern(nextIndex < 0 ? patterns.length - 1 : nextIndex);
      return;
    }
    
    // Check for pattern.preset format (e.g., "3.5" or "12.2")
    if (input.includes('.')) {
      const parts = input.split('.');
      if (parts.length === 2) {
        const patternNum = parseInt(parts[0], 10);
        const presetNum = parseInt(parts[1], 10);
        
        if (!isNaN(patternNum) && !isNaN(presetNum) && patternNum >= 1 && patternNum <= patterns.length) {
          const patternIndex = patternNum - 1;
          switchPattern(patternIndex);
          
          // Apply preset
          const pattern = patterns[patternIndex];
          if (pattern.applyPreset && presetNum >= 1 && presetNum <= 6) {
            if (pattern.applyPreset(presetNum)) {
              const displayName = patternDisplayNames[pattern.name] || pattern.name;
              showMessage(`${displayName} - Preset ${presetNum}`);
            } else {
              showMessage(`Invalid preset: ${presetNum}`);
            }
          } else {
            showMessage(`Invalid preset: ${presetNum}`);
          }
          return;
        }
      }
    }
    
    // Check if input is a number (pattern index)
    const patternNum = parseInt(input, 10);
    if (!isNaN(patternNum) && patternNum >= 1 && patternNum <= patterns.length) {
      switchPattern(patternNum - 1);
      return;
    }
    
    // Check if input is a pattern name
    const lowerInput = input.toLowerCase();
    const patternIndex = patternNames.indexOf(lowerInput);
    if (patternIndex >= 0) {
      switchPattern(patternIndex);
      return;
    }
    
    // Partial name match
    const partialMatch = patternNames.findIndex(name => name.startsWith(lowerInput));
    if (partialMatch >= 0) {
      switchPattern(partialMatch);
      return;
    }
    
    // Invalid input
    showCommandResult(`Unknown pattern: ${input}`, false);
  }
  
  // Handle input
  term.on('key', (name: string, _matches: any, data: any) => {
    // Check if command buffer is active
    if (commandBuffer.isActive()) {
      // Command mode is active - route to command buffer
      if (name === 'ESCAPE') {
        commandBuffer.cancel();
      } else if (name === 'ENTER') {
        const cmdString = commandBuffer.execute();
        
        // Parse and execute command
        if (cmdString) {
          const parsed = commandParser.parse(cmdString);
          if (parsed) {
            const result = commandExecutor.execute(parsed);
            showCommandResult(result.message, result.success);
          } else {
            showCommandResult('Invalid command', false);
          }
        }
      } else if (name === 'BACKSPACE') {
        commandBuffer.backspace();
      } else if (name === 'UP') {
        commandBuffer.previousCommand();
      } else if (name === 'DOWN') {
        commandBuffer.nextCommand();
      } else if (name === 'LEFT') {
        commandBuffer.moveCursorLeft();
      } else if (name === 'RIGHT') {
        commandBuffer.moveCursorRight();
      } else if (data.isCharacter) {
        // Regular character input - but allow single-digit keys to pass through
        const char = String.fromCharCode(data.codepoint);
        if (/^[1-9]$/.test(char)) {
          // Single digit - cancel command mode and let normal handling proceed
          commandBuffer.cancel();
          // Don't return - let normal key handling process the digit
        } else {
          commandBuffer.addChar(char);
          return; // Stay in command mode
        }
      }
      
      return; // Don't process other keys in command mode
    }
    
    // Check if pattern buffer is active
    if (patternBufferActive) {
      // Pattern mode is active
      if (name === 'ESCAPE') {
        cancelPatternBuffer();
      } else if (name === 'ENTER') {
        executePatternBuffer();
      } else if (name === 'BACKSPACE') {
        patternBuffer = patternBuffer.slice(0, -1);
      } else if (data.isCharacter) {
        // Accept numbers, letters, and dots
        const char = String.fromCharCode(data.codepoint);
        if (/[0-9a-zA-Z.]/.test(char)) {
          // Allow single-digit keys (1-9) to also work as direct pattern switching
          if (/^[1-9]$/.test(char) && patternBuffer === '') {
            // Single digit with empty buffer - cancel pattern mode and let normal handling proceed
            patternBufferActive = false;
            patternBuffer = '';
            // Don't return - let normal key handling process the digit
          } else {
            patternBuffer += char;
            
            // Reset timeout on input
            if (patternBufferTimeout) {
              clearTimeout(patternBufferTimeout);
            }
            patternBufferTimeout = setTimeout(() => {
              patternBufferActive = false;
              patternBuffer = '';
            }, patternBufferTimeoutMs);
            return; // Stay in pattern mode
          }
        }
      }
      
      return; // Don't process other keys in pattern mode
    }
    
    // Normal mode - existing keyboard shortcuts
    
    // Quit commands
    if (name === 'CTRL_C' || name === 'q' || name === 'ESCAPE') {
      cleanup();
    }
    // Command mode activation
    else if (name === 'c') {
      commandBuffer.activate();
    }
    // Pause/Resume
    else if (name === 'SPACE') {
      engine.pause();
    }
    // Pattern selection - direct
    else if (name === '1') {
      switchPattern(0); // Waves
    } else if (name === '2') {
      switchPattern(1); // Starfield
    } else if (name === '3') {
      switchPattern(2); // Matrix
    } else if (name === '4') {
      switchPattern(3); // Rain
    } else if (name === '5') {
      switchPattern(4); // Quicksilver
    } else if (name === '6') {
      switchPattern(5); // Particles
    } else if (name === '7') {
      switchPattern(6); // Spiral
    } else if (name === '8') {
      switchPattern(7); // Plasma
    } else if (name === '9') {
      switchPattern(8); // Tunnel
    }
    // Pattern selection - next/previous
    else if (name === 'n') {
      switchPattern((currentPatternIndex + 1) % patterns.length);
    } else if (name === 'b') {
      // Previous pattern (back)
      const prevIndex = currentPatternIndex === 0 ? patterns.length - 1 : currentPatternIndex - 1;
      switchPattern(prevIndex);
    } else if (name === 'p') {
      // Activate pattern buffer mode
      activatePatternBuffer();
    }
    // Preset cycling
    else if (name === '.') {
      const currentPattern = patterns[currentPatternIndex];
      if (currentPattern.applyPreset) {
        // Cycle to next preset (1-6)
        const nextPreset = (currentPresetIndex % 6) + 1;
        if (currentPattern.applyPreset(nextPreset)) {
          currentPresetIndex = nextPreset;
          const displayName = patternDisplayNames[patternNames[currentPatternIndex]] || patternNames[currentPatternIndex];
          showMessage(`${displayName} - Preset ${nextPreset}`);
        }
      }
    } else if (name === ',') {
      const currentPattern = patterns[currentPatternIndex];
      if (currentPattern.applyPreset) {
        // Cycle to previous preset
        const prevPreset = currentPresetIndex === 1 ? 6 : currentPresetIndex - 1;
        if (currentPattern.applyPreset(prevPreset)) {
          currentPresetIndex = prevPreset;
          const displayName = patternDisplayNames[patternNames[currentPatternIndex]] || patternNames[currentPatternIndex];
          showMessage(`${displayName} - Preset ${prevPreset}`);
        }
      }
    }
    // Speed controls
    else if (name === '+' || name === '=') {
      const newFps = Math.min(60, engine.getFps() + 5);
      engine.setFps(newFps);
      showMessage(`Speed: ${newFps} FPS`);
    } else if (name === '-' || name === '_') {
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
    // Quick random (pattern + preset + theme)
    else if (name === 'r') {
      const parsed = commandParser.parse('**');
      if (parsed) {
        const result = commandExecutor.execute(parsed);
        showCommandResult(result.message, result.success);
      }
    }
    // Quick save
    else if (name === 's') {
      const parsed = commandParser.parse('s');
      if (parsed) {
        const result = commandExecutor.execute(parsed);
        showCommandResult(result.message, result.success);
      }
    }
    // Quality presets
    else if (name === '[') {
      if (currentQuality === 'high') setQuality('medium');
      else if (currentQuality === 'medium') setQuality('low');
    } else if (name === ']') {
      if (currentQuality === 'low') setQuality('medium');
      else if (currentQuality === 'medium') setQuality('high');
    }
  });

  // Handle mouse events with throttling
  let lastMouseMoveTime = 0;
  const mouseThrottleMs = 16; // ~60fps for mouse events
  
  term.on('mouse', (name: string, data: any) => {
    const currentPattern = patterns[currentPatternIndex];
    const now = Date.now();
    
    if (name === 'MOUSE_MOTION' && currentPattern.onMouseMove) {
      // Throttle mouse move events
      if (now - lastMouseMoveTime >= mouseThrottleMs) {
        // terminal-kit uses 1-based indexing, convert to 0-based
        currentPattern.onMouseMove({ x: data.x - 1, y: data.y - 1 });
        lastMouseMoveTime = now;
      }
    } else if (name === 'MOUSE_LEFT_BUTTON_PRESSED' && currentPattern.onMouseClick) {
      currentPattern.onMouseClick({ x: data.x - 1, y: data.y - 1 });
    }
  });

  function showMessage(msg: string) {
    term.moveTo(1, 1);
    term.eraseLine();
    term.bold.cyan(msg);
    
    setTimeout(() => {
      term.moveTo(1, 1);
      term.eraseLine();
    }, 1500);
  }

  function cleanup() {
    commandExecutor.cleanup();
    engine.stop();
    renderer.cleanup();
  }

  // Start animation
  engine.start();
  
  // Set up overlay rendering after each frame
  engine.setAfterRenderCallback(() => {
    renderDebugOverlay();
    renderCommandOverlay();
    renderPatternOverlay();
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
  
  return cleanup;
}

// Set up global signal handlers for graceful cleanup
let cleanupHandler: (() => void) | null = null;

process.on('SIGINT', () => {
  if (cleanupHandler) {
    cleanupHandler();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (cleanupHandler) {
    cleanupHandler();
  }
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  if (cleanupHandler) {
    cleanupHandler();
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (cleanupHandler) {
    cleanupHandler();
  }
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Run the app
cleanupHandler = main();
