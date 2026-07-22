#!/usr/bin/env node
import terminalKit from 'terminal-kit';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TerminalRenderer } from './renderer/TerminalRenderer.js';
import { AnimationEngine } from './engine/AnimationEngine.js';
import { PhotoPattern } from './patterns/PhotoPattern.js';
import { WorkspaceModel } from './patterns/workspace/WorkspaceModel.js';
import { buildPatternSlots, PROCEDURAL_PATTERN_DEFINITIONS } from './patterns/PatternCatalog.js';
import { parseWorkspaceFixture } from './patterns/workspace/fixture.js';
import { CliOptions, QualityPreset, ConfigSchema, Theme } from './types/index.js';
import { ConfigLoader } from './config/ConfigLoader.js';
import { defaultConfig } from './config/defaults.js';
import { getTheme, THEME_NAMES } from './config/themes.js';
import { CommandBuffer } from './engine/CommandBuffer.js';
import { CommandParser } from './engine/CommandParser.js';
import { CommandExecutor } from './engine/CommandExecutor.js';
import { RuntimeController } from './engine/RuntimeController.js';
import { getStatusBar } from './ui/StatusBar.js';
import { getToastManager } from './ui/ToastManager.js';
import { getHelpOverlay } from './ui/HelpOverlay.js';
import { randomSeed } from './utils/random.js';
import {
  encodeShareCode,
  decodeShareCode,
  hashConfig,
  patternIdByName,
  patternNameById,
  ShareCodeError,
  validateShareState,
  type ShareCodeRegistry,
  type ShareState,
} from './utils/shareCode.js';
import { copyToClipboard, ClipboardError } from './utils/clipboard.js';
import { getTransitionManager } from './renderer/TransitionManager.js';
import {
  assertInteractiveTTY,
  createIdempotentCleanup,
  createTerminalResource,
  toCliOptions,
  type ParsedCli,
} from './cli/bootstrap.js';
import { isPauseKey } from './cli/keyBindings.js';

const term = terminalKit.terminal;

const SHARE_CODE_REGISTRY: ShareCodeRegistry = Object.freeze({
  patterns: Object.freeze(
    PROCEDURAL_PATTERN_DEFINITIONS.map(definition =>
      Object.freeze({
        key: definition.key,
        presetIds: Object.freeze(definition.getPresets().map(preset => preset.id)),
      })
    )
  ),
  themes: Object.freeze([...THEME_NAMES]),
});

/**
 * Parse command line arguments
 */
function parseCliArguments(): ParsedCli {
  const program = new Command();

  // Read package.json for version
  const packageJson = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8')
  );

  program
    .name('splash')
    .description('A terminal ASCII animation app that adds visual flow to your IDE workspace')
    .version(packageJson.version);

  // Pattern selection
  program.option(
    '-p, --pattern <name>',
    'Start with specific pattern (waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma, tunnel, lightning, fireworks, maze, life, dna, lavalamp, smoke, snow, oceanbeach, campfire, nightsky, aquarium, snowfallpark, metaball)'
  );

  // Quality preset
  program.option('-q, --quality <preset>', 'Set quality preset (low, medium, high)', 'medium');

  // FPS override
  program.option('-f, --fps <number>', 'Set custom FPS (10-60)', value => {
    const fps = parseInt(value, 10);
    if (isNaN(fps) || fps < 10 || fps > 60) {
      program.error(`FPS must be a number between 10 and 60 (got: ${value})`);
    }
    return fps;
  });

  // Theme
  program.option(
    '-t, --theme <name>',
    'Set color theme (ocean, matrix, starlight, fire, monochrome)'
  );

  // Mouse control
  program.option('--no-mouse', 'Disable mouse interaction');

  // Photo source (v0.4.0 Phase 1)
  program.option(
    '--photo <path>',
    'Render an image file via PhotoPattern (half-block, 2× vertical resolution)'
  );

  // v0.5.0 Phase 7e: share-code subcommands. `splash share` prints a code
  // for the would-be-initial-state (config defaults + a fresh random seed)
  // and exits. `splash play <code>` decodes a code and boots directly into
  // its encoded state. The default invocation (`splash` with no
  // subcommand) still runs the interactive engine.
  //
  // Object wrapper (rather than two `let`s) keeps TS from narrowing the
  // mode type to its initial value — the .action callbacks mutate it
  // after assignment, but TS's control-flow analysis can't prove the
  // closures fired, so we'd otherwise lose the union.
  const subcommand: {
    mode: 'run' | 'share' | 'play' | 'watch';
    code?: string;
    watchPath?: string;
    fixture?: string;
  } = { mode: 'run' };

  program
    .command('share')
    .description('Print a share code for the bootstrapped state and exit')
    .action(() => {
      subcommand.mode = 'share';
    });

  program
    .command('play <code>')
    .description('Boot directly into the scene encoded by a share code')
    .action((code: string) => {
      subcommand.mode = 'play';
      subcommand.code = code;
    });

  // workspace-viz Phase A: `splash watch --fixture <file>` renders a
  // static workspace tree from a schema-versioned JSON snapshot. Live
  // filesystem watching (the [path] argument) lands in Phase B.
  program
    .command('watch [path]')
    .description('Visualize a working directory as an ambient animated scene')
    .option('--fixture <file>', 'Render a workspace snapshot fixture (JSON) instead of watching')
    .action((watchPath: string | undefined, cmdOpts: { fixture?: string }) => {
      subcommand.mode = 'watch';
      subcommand.watchPath = watchPath;
      subcommand.fixture = cmdOpts.fixture;
    });

  // Commander shows help when a program has subcommands but no root action.
  // Keep the historical `splash` default as the interactive runtime.
  program.action(() => {
    subcommand.mode = 'run';
  });

  program.parse();
  const options = program.opts();

  // Validate pattern if provided
  const validPatterns = PROCEDURAL_PATTERN_DEFINITIONS.map(definition => definition.key);
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

  const opts = toCliOptions(options);
  if (subcommand.mode === 'play' && subcommand.code) {
    return { mode: 'play', options: opts, code: subcommand.code };
  }
  if (subcommand.mode === 'share') return { mode: 'share', options: opts };
  if (subcommand.mode === 'watch') {
    return {
      mode: 'watch',
      options: opts,
      watchPath: subcommand.watchPath,
      fixture: subcommand.fixture,
    };
  }
  return { mode: 'run', options: opts };
}

/**
 * Map a procedural pattern name to its key in `ConfigSchema.patterns`.
 * Most names match 1:1 (e.g., `'matrix'` → `'matrix'`); the only exception
 * today is `'lavalamp'` → `'lavaLamp'`. Patterns added after Snow
 * (oceanbeach, campfire, …) don't have a slot in `ConfigSchema.patterns`
 * yet — those return `null` and contribute a zero config fingerprint.
 */
function configKeyFor(patternName: string): keyof NonNullable<ConfigSchema['patterns']> | null {
  switch (patternName) {
    case 'waves':
      return 'waves';
    case 'starfield':
      return 'starfield';
    case 'matrix':
      return 'matrix';
    case 'rain':
      return 'rain';
    case 'quicksilver':
      return 'quicksilver';
    case 'particles':
      return 'particles';
    case 'spiral':
      return 'spiral';
    case 'plasma':
      return 'plasma';
    case 'tunnel':
      return 'tunnel';
    case 'lightning':
      return 'lightning';
    case 'fireworks':
      return 'fireworks';
    case 'maze':
      return 'maze';
    case 'life':
      return 'life';
    case 'dna':
      return 'dna';
    case 'lavalamp':
      return 'lavaLamp';
    case 'smoke':
      return 'smoke';
    case 'snow':
      return 'snow';
    default:
      return null;
  }
}

/**
 * Compute the 13-bit config fingerprint for a pattern, using the live
 * config diffed against {@link defaultConfig}. Returns 0 for patterns
 * with no `ConfigSchema.patterns` entry (no overridable fields → no
 * fingerprint to track).
 */
function computeConfigHash(patternName: string, cfg: ConfigSchema): number {
  const key = configKeyFor(patternName);
  if (!key) return 0;
  return hashConfig(
    cfg.patterns?.[key] as Record<string, unknown> | undefined,
    (defaultConfig.patterns?.[key] ?? {}) as Record<string, unknown>
  );
}

/**
 * `splash share` entry point. Bootstraps just enough state to emit a
 * share code for the would-be-initial-scene (config-default pattern +
 * theme, a fresh random seed, preset 1) and exits. No animation runs;
 * useful for generating reproducible codes from scripts.
 */
function runShareCommand(opts: CliOptions): never {
  const configLoader = new ConfigLoader();
  const cfg = configLoader.load(opts);
  const patternName = (opts.pattern ?? cfg.defaultPattern ?? 'waves').toLowerCase();

  if (patternName === 'photo' || patternName === 'layered') {
    console.error(
      `Error: share codes are procedural-only. ${patternName === 'photo' ? 'PhotoPattern' : 'LayeredPattern'} ` +
        `depends on a local image file that can't be reproduced from a code. ` +
        `Pass --pattern <procedural> or remove --photo, then try again.`
    );
    process.exit(1);
  }

  const patternId = patternIdByName(patternName);
  if (patternId < 0) {
    console.error(`Error: unknown pattern "${patternName}" — cannot encode a share code.`);
    process.exit(1);
  }

  const themeName = (opts.theme ?? cfg.theme ?? 'ocean').toLowerCase();
  const themeId = Math.max(0, THEME_NAMES.indexOf(themeName));

  const state: ShareState = {
    patternId,
    presetId: 1,
    themeId,
    seed: randomSeed(),
    configHash: computeConfigHash(patternName, cfg),
  };
  const code = encodeShareCode(
    validateShareState(state, SHARE_CODE_REGISTRY, name => computeConfigHash(name, cfg))
  );
  process.stdout.write(`${code}\n`);
  process.exit(0);
}

async function main() {
  // Parse CLI arguments (allows --help/--version to work without TTY)
  const parsed = parseCliArguments();

  // `splash share` short-circuits before any engine setup — emits a code
  // for the bootstrapped state and exits. No TTY required: useful in
  // scripts / CI for generating reproducible codes.
  if (parsed.mode === 'share') {
    runShareCommand(parsed.options);
  }

  const cliOptions = parsed.options;

  // Load configuration (CLI > config file > defaults)
  const configLoader = new ConfigLoader();
  const config = configLoader.load(cliOptions);

  // v0.5.0 Phase 7e: `splash play <code>` decodes the share code and
  // overrides config.defaultPattern + config.theme so the rest of main()
  // boots into the encoded scene. Done *before* the TTY check so a
  // malformed/version-skewed code reports cleanly when piped. `playState`
  // flows down to the pattern construction so the chosen pattern uses
  // the decoded seed instead of a fresh randomSeed().
  let playState: ShareState | null = null;
  if (parsed.mode === 'play') {
    try {
      playState = validateShareState(decodeShareCode(parsed.code), SHARE_CODE_REGISTRY, name =>
        computeConfigHash(name, config)
      );
    } catch (err) {
      if (err instanceof ShareCodeError) {
        console.error(`Error: ${err.message}`);
      } else {
        console.error(
          `Error: failed to decode share code "${parsed.code}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
      process.exit(1);
    }
    const decodedName = patternNameById(playState.patternId);
    if (!decodedName) {
      console.error('Error: validated share code lost its runtime pattern mapping.');
      process.exit(1);
    }
    config.defaultPattern = decodedName;
    config.theme = THEME_NAMES[playState.themeId];
  }

  // workspace-viz Phase A: `splash watch --fixture <file>` builds the
  // persistent WorkspaceModel from a snapshot. The model is created HERE
  // (owned by main.ts, like photoPattern) so theme rebuilds and pattern
  // switches construct fresh disposable views over the same session state.
  let workspaceModel: WorkspaceModel | null = null;
  if (parsed.mode === 'watch') {
    if (!parsed.fixture) {
      console.error(
        'Error: `splash watch` currently requires --fixture <file>.\n' +
          'Live filesystem watching lands in a later release; until then:\n' +
          '  splash watch --fixture tests/fixtures/tree-medium.json'
      );
      process.exit(1);
    }
    try {
      const fixture = parseWorkspaceFixture(JSON.parse(readFileSync(parsed.fixture, 'utf-8')));
      workspaceModel = new WorkspaceModel({
        heatHalfLifeMs: config.patterns?.workspaceViz?.heatHalfLifeMs,
      });
      workspaceModel.loadFixture(fixture);
    } catch (err) {
      console.error(
        `Error: failed to load fixture "${parsed.fixture}": ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }
  }

  // Check TTY *after* play-code validation so malformed codes get a
  // friendly diagnostic even when stdout is piped.
  assertInteractiveTTY(process.stdout.isTTY);

  // Determine mouse enabled state from config
  const mouseEnabled = config.mouseEnabled !== false;

  // Create renderer with mouse setting
  const renderer = createTerminalResource(
    () => new TerminalRenderer(mouseEnabled),
    cleanup => {
      // Install cleanup immediately after entering fullscreen. Any later
      // initialization failure is caught by the top-level bootstrap.
      cleanupHandler = cleanup;
    }
  );

  // Current quality setting
  const initialQuality: QualityPreset = config.quality || 'medium';

  // Load theme from config
  const initialTheme: Theme = getTheme(config.theme);

  // v0.4.0 Phase 1+3: photo + optional layered scene. These references
  // outlive rebuilt catalogs so theme changes can re-attach them.
  let photoPattern: PhotoPattern | null = null;
  const layeredOverlayName: string | null =
    cliOptions.photo && cliOptions.pattern ? cliOptions.pattern : null;

  // v0.4.0 Phase 1: optional PhotoPattern when --photo <path> is supplied.
  // Decoded once up front so the first frame doesn't ship a blank screen.
  // v0.4.0 Phase 3: when --pattern is also supplied, build a LayeredPattern
  // slot that composes the photo with the chosen procedural overlay.
  if (cliOptions.photo) {
    photoPattern = new PhotoPattern(initialTheme, { source: cliOptions.photo });
    try {
      await photoPattern.load();
      await photoPattern.prepareForSize(renderer.getSize());
    } catch (err) {
      throw new Error(
        `failed to load --photo "${cliOptions.photo}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Inject the decoded seed for the played pattern; every other procedural
  // slot still gets a fresh random seed because it is not the active scene.
  const initialPatternName = playState ? patternNameById(playState.patternId) : undefined;
  const initialSeedOverrides =
    playState && initialPatternName ? new Map([[initialPatternName, playState.seed]]) : undefined;
  const patternSlots = buildPatternSlots({
    config,
    theme: initialTheme,
    seedOverrides: initialSeedOverrides,
    photoPattern,
    layeredOverlayKey: layeredOverlayName,
    workspaceModel,
  });

  // Determine starting pattern from config
  let initialPatternIndex = 0;
  if (config.defaultPattern) {
    const index = patternSlots.findIndex(slot => slot.key === config.defaultPattern);
    if (index >= 0) {
      initialPatternIndex = index;
    }
  }

  // --photo overrides startup selection so the user sees their image
  // immediately. With --photo + --pattern, start in the layered slot.
  if (cliOptions.photo) {
    const targetName = layeredOverlayName ? 'layered' : 'photo';
    const targetIdx = patternSlots.findIndex(slot => slot.key === targetName);
    if (targetIdx >= 0) {
      initialPatternIndex = targetIdx;
    }
  }

  // `splash watch` starts on the workspace slot — that's the whole point.
  if (workspaceModel) {
    const workspaceIdx = patternSlots.findIndex(slot => slot.key === 'workspace');
    if (workspaceIdx >= 0) {
      initialPatternIndex = workspaceIdx;
    }
  }

  let debugMode = false;

  // Pattern switching mutex to prevent overlay corruption
  let isPatternSwitching = false;

  // Determine initial FPS from config
  const initialFps = ConfigLoader.getFpsFromConfig(config);

  // Create animation engine with selected pattern and FPS
  const engine = new AnimationEngine(
    renderer,
    patternSlots[initialPatternIndex].pattern,
    initialFps
  );

  // Initialize StatusBar with initial state
  const statusBar = getStatusBar();
  statusBar.update({
    patternName: patternSlots[initialPatternIndex].displayName,
    presetNumber: playState?.presetId ?? 1,
    themeName: initialTheme.displayName,
    fps: initialFps,
    shuffleMode: 'off',
    paused: false,
  });

  // Initialize ToastManager
  const toastManager = getToastManager();

  // Initialize HelpOverlay
  const helpOverlay = getHelpOverlay();

  // Initialize TransitionManager for smooth pattern switching
  const transitionManager = getTransitionManager();
  transitionManager.setDefaultConfig({ type: 'crossfade', duration: 300 });

  // Initialize command system
  const commandBuffer = new CommandBuffer();
  const commandParser = new CommandParser();
  const initialThemeIndex = ['ocean', 'matrix', 'starlight', 'fire', 'monochrome'].indexOf(
    initialTheme.name
  );
  const themes = [
    getTheme('ocean'),
    getTheme('matrix'),
    getTheme('starlight'),
    getTheme('fire'),
    getTheme('monochrome'),
  ];
  const runtime = new RuntimeController({
    engine,
    themes,
    initialSlots: patternSlots,
    initialPatternIndex,
    initialThemeIndex,
    initialPresetId: playState?.presetId ?? 1,
    initialPresetApplied: Boolean(playState && playState.presetId !== 1),
    initialQuality,
    rebuildSlots: (theme, priorSeeds) =>
      buildPatternSlots({
        config,
        theme,
        priorSeeds,
        photoPattern,
        layeredOverlayKey: layeredOverlayName,
        workspaceModel,
      }),
    beforePatternSwitch: () => {
      isPatternSwitching = true;
      const sourceFrame = engine.getLastPatternFrame();
      if (sourceFrame) transitionManager.start(sourceFrame);
      setTimeout(() => {
        isPatternSwitching = false;
      }, 16);
    },
  });
  const commandExecutor = new CommandExecutor(runtime, configLoader);

  // Command result message state (tracked for cleanup timing)
  const _commandResultTimeout: NodeJS.Timeout | null = null;

  // Pattern buffer state (for enhanced 'p' key functionality)
  let patternBuffer = '';
  let patternBufferActive = false;
  let patternBufferTimeout: NodeJS.Timeout | null = null;
  const patternBufferTimeoutMs = 5000; // 5 seconds

  const unsubscribeRuntime = runtime.subscribe(event => {
    const state = event.current;
    statusBar.update({
      patternName: state.patternDisplayName,
      presetNumber: state.presetId,
      themeName: state.themeDisplayName,
      fps: state.fps,
    });
    if (event.kind === 'pattern' || event.kind === 'scene') {
      showPatternName(state.patternKey);
    }
  });

  function switchPattern(index: number) {
    runtime.switchPattern(index);
  }

  function setQuality(quality: QualityPreset) {
    config.quality = quality;
    runtime.setQuality(quality);

    const qualityNames = { low: 'LOW (15 FPS)', medium: 'MEDIUM (30 FPS)', high: 'HIGH (60 FPS)' };
    showMessage(`Quality: ${qualityNames[quality]}`);
  }

  function cycleTheme() {
    const result = runtime.cycleTheme();
    showMessage(`Theme: ${result.snapshot.themeDisplayName}`);
  }

  function showPatternName(name: string) {
    const displayName = runtime.getSlots().find(slot => slot.key === name)?.displayName ?? name;
    toastManager.info(`Pattern: ${displayName}`, 2000);
  }

  function toggleHelp() {
    helpOverlay.toggle();
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
    const currentPattern = runtime.getCurrentPattern();
    const runtimeState = runtime.getSnapshot();
    const bufferSafety = engine.getBufferSafety();
    const errorsByPattern = bufferSafety.getErrorsByPattern();
    const totalErrors = Object.values(errorsByPattern).reduce((sum, count) => sum + count, 0);

    const lines = [
      `PERFORMANCE DEBUG`,
      `────────────────────────────`,
      `Pattern: ${currentPattern.name}`,
      `Theme: ${runtimeState.themeDisplayName}`,
      `Quality: ${runtimeState.quality.toUpperCase()}`,
      `FPS: ${metrics.fps.toFixed(1)} / ${metrics.targetFps} (target)`,
      `Frame: ${metrics.frameTime.toFixed(2)}ms`,
      `Update: ${metrics.updateTime.toFixed(2)}ms`,
      `Pattern: ${metrics.patternRenderTime.toFixed(2)}ms`,
      `Render: ${metrics.renderTime.toFixed(2)}ms`,
      `Changed Cells: ${metrics.changedCells} / ${size.width * size.height}`,
      `Dropped Frames: ${stats.totalDroppedFrames}`,
      `Min/Avg/Max FPS: ${stats.minFps.toFixed(1)} / ${stats.avgFps.toFixed(1)} / ${stats.maxFps.toFixed(1)}`,
      `Total Frames: ${stats.totalFrames}`,
    ];

    // Add buffer safety errors if any
    if (totalErrors > 0) {
      lines.push(`────────────────────────────`);
      lines.push(`⚠️  RENDER ERRORS: ${totalErrors}`);
      for (const [pattern, count] of Object.entries(errorsByPattern)) {
        lines.push(`  ${pattern}: ${count} errors`);
      }
    }

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

  /**
   * Unified bottom overlay renderer with priority system
   * Priority order:
   *   1. Command mode (highest)
   *   2. Pattern selection mode
   *   3. Message banner (pattern names, status messages)
   *   4. None (clear the line)
   */
  function renderBottomOverlay() {
    // Skip overlay rendering during pattern switch to prevent terminal corruption
    if (isPatternSwitching) return;

    try {
      const size = renderer.getSize();
      const bottomRow = size.height; // terminal-kit uses 1-based coordinates

      // Priority 1: Command mode
      if (commandBuffer.isActive()) {
        const buffer = commandBuffer.getBuffer();
        const cursorPos = commandBuffer.getCursorPos();

        term.moveTo(1, bottomRow);
        term.eraseLine();
        term.bgBlack();
        term.bold.cyan('COMMAND: ');
        term.green(buffer.slice(0, cursorPos));
        term.inverse('_'); // Cursor
        term.styleReset();
        term.bgBlack();
        term.green(buffer.slice(cursorPos));
        term.defaultColor();
        term.bgDefaultColor();
        term.styleReset(); // Final reset to ensure clean state
        return;
      }

      // Priority 2: Pattern selection mode
      if (patternBufferActive) {
        term.moveTo(1, bottomRow);
        term.eraseLine();
        term.bgBlack();
        term.bold.yellow('PATTERN: ');
        term.green(patternBuffer);
        term.inverse('_'); // Cursor
        term.defaultColor();
        term.bgDefaultColor();
        term.styleReset(); // Final reset to ensure clean state
        return;
      }

      // No overlay active - the status bar handles the bottom row via buffer rendering
    } catch {
      // Catch any terminal state errors during rapid operations
      // Terminal may be in inconsistent state, but don't crash the app
    }
  }

  function showCommandResult(message: string, success: boolean) {
    // Show toast notification
    if (success) {
      toastManager.success(message);
    } else {
      toastManager.error(message);
    }

    // Update status bar shuffle mode based on command executor state
    const shuffleInfo = commandExecutor.getShuffleInfo();
    if (shuffleInfo) {
      // Parse shuffle mode from info string
      const shuffleMode = shuffleInfo.includes('ALL') ? 'all' : 'preset';
      statusBar.update({ shuffleMode });
    } else {
      statusBar.update({ shuffleMode: 'off' });
    }
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
      const state = runtime.getSnapshot();
      const nextIndex = state.patternIndex - 1;
      switchPattern(nextIndex < 0 ? state.patternCount - 1 : nextIndex);
      return;
    }

    // Check for pattern.preset format (e.g., "3.5" or "12.2")
    if (input.includes('.')) {
      const parts = input.split('.');
      if (parts.length === 2) {
        const patternNum = parseInt(parts[0], 10);
        const presetNum = parseInt(parts[1], 10);

        if (
          !isNaN(patternNum) &&
          !isNaN(presetNum) &&
          patternNum >= 1 &&
          patternNum <= runtime.getSnapshot().patternCount
        ) {
          const patternIndex = patternNum - 1;
          const result = runtime.switchPattern(patternIndex, presetNum);
          if (result.success) {
            showMessage(`${result.snapshot.patternDisplayName} - Preset ${presetNum}`);
          } else {
            showMessage(`Invalid preset: ${presetNum}`);
          }
          return;
        }
      }
    }

    // Check if input is a number (pattern index)
    const patternNum = parseInt(input, 10);
    if (!isNaN(patternNum) && patternNum >= 1 && patternNum <= runtime.getSnapshot().patternCount) {
      switchPattern(patternNum - 1);
      return;
    }

    // Check if input is a pattern name
    const patternIndex = runtime.findPattern(input);
    if (patternIndex >= 0) {
      switchPattern(patternIndex);
      return;
    }

    // Invalid input
    showCommandResult(`Unknown pattern: ${input}`, false);
  }

  // Handle input
  term.on('key', (name: string, _matches: any, data: any) => {
    // Check if help overlay is visible - handle navigation and close
    if (helpOverlay.isVisible()) {
      if (name === 'ESCAPE' || name === '?') {
        helpOverlay.hide();
      } else if (name === 'TAB' || name === 'RIGHT') {
        helpOverlay.nextTab();
      } else if (name === 'LEFT') {
        helpOverlay.prevTab();
      }
      // Block other input while help is visible
      return;
    }

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
        // Regular character input - but allow direct shortcuts to pass through
        const char = String.fromCharCode(data.codepoint);
        // Allow pattern navigation keys (n, b) to exit command mode, but NOT digits
        // (digits need to stay in command mode for multi-digit commands like c14)
        if (/^[nNbB]$/.test(char)) {
          // Pattern nav - cancel command mode and let normal handling proceed
          commandBuffer.cancel();
          // Don't return - let normal key handling process the key
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
    else if (isPauseKey(name, data)) {
      engine.pause();
      statusBar.update({ paused: engine.isPaused() });
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
    } else if (name === 'o') {
      switchPattern(17); // Ocean Beach
    }
    // Pattern selection - next/previous
    else if (name === 'n') {
      const state = runtime.getSnapshot();
      switchPattern((state.patternIndex + 1) % state.patternCount);
    } else if (name === 'b') {
      // Previous pattern (back)
      const state = runtime.getSnapshot();
      const prevIndex = state.patternIndex === 0 ? state.patternCount - 1 : state.patternIndex - 1;
      switchPattern(prevIndex);
    } else if (name === 'p') {
      // Activate pattern buffer mode
      activatePatternBuffer();
    }
    // Preset cycling
    else if (name === '.') {
      const result = runtime.cyclePreset(1);
      if (result.success) {
        showMessage(`${result.snapshot.patternDisplayName} - Preset ${result.snapshot.presetId}`);
      }
    } else if (name === ',') {
      const result = runtime.cyclePreset(-1);
      if (result.success) {
        showMessage(`${result.snapshot.patternDisplayName} - Preset ${result.snapshot.presetId}`);
      }
    }
    // Speed controls
    else if (name === '+' || name === '=') {
      const newFps = Math.min(60, engine.getFps() + 5);
      runtime.setFps(newFps);
      showMessage(`Speed: ${newFps} FPS`);
    } else if (name === '-' || name === '_') {
      const newFps = Math.max(10, engine.getFps() - 5);
      runtime.setFps(newFps);
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
    // v0.5.0 Phase 7e: copy a share code for the current scene. Refuses
    // on Photo/Layered slots (those depend on a local image file).
    else if (name === 'S') {
      const runtimeState = runtime.getSnapshot();
      const patternName = runtimeState.patternKey;
      const patternId = patternIdByName(patternName);
      if (!runtimeState.shareable || patternId < 0 || runtimeState.seed === null) {
        showMessage(
          `Share codes are procedural-only — ${runtimeState.patternDisplayName} can't be encoded.`
        );
      } else {
        const state: ShareState = {
          patternId,
          presetId: runtimeState.presetId,
          themeId: runtimeState.themeIndex,
          seed: runtimeState.seed,
          configHash: computeConfigHash(patternName, config),
        };
        let code: string;
        try {
          code = encodeShareCode(
            validateShareState(state, SHARE_CODE_REGISTRY, key => computeConfigHash(key, config))
          );
        } catch (err) {
          showMessage(
            `Can't share this scene: ${err instanceof Error ? err.message : String(err)}`
          );
          return;
        }
        copyToClipboard(code)
          .then(() => {
            showMessage(`Share code ${code} copied`);
          })
          .catch((err: unknown) => {
            if (err instanceof ClipboardError) {
              showMessage(`Share code: ${code} (clipboard unavailable)`);
            } else {
              showMessage(`Share code: ${code}`);
            }
          });
      }
    }
    // Quality presets
    else if (name === '[') {
      const quality = runtime.getSnapshot().quality;
      if (quality === 'high') setQuality('medium');
      else if (quality === 'medium') setQuality('low');
    } else if (name === ']') {
      const quality = runtime.getSnapshot().quality;
      if (quality === 'low') setQuality('medium');
      else if (quality === 'medium') setQuality('high');
    }
  });

  // Handle mouse events with throttling
  let lastMouseMoveTime = 0;
  const mouseThrottleMs = 16; // ~60fps for mouse events

  term.on('mouse', (name: string, data: any) => {
    const currentPattern = runtime.getCurrentPattern();
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
    // Show toast notification
    toastManager.info(msg, 1500);
  }

  const cleanup = createIdempotentCleanup(
    unsubscribeRuntime,
    () => {
      commandExecutor.cleanup();
    },
    () => {
      engine.stop();
    },
    () => {
      renderer.cleanup();
    }
  );
  cleanupHandler = cleanup;

  // Start animation
  engine.start();

  // Set up buffer-based overlays (render to buffer before terminal write)
  engine.setBeforeTerminalRenderCallback(() => {
    const size = renderer.getSize();
    const buffer = renderer.getBuffer();
    const now = Date.now();

    // Render transition if active (overwrites the pattern render with blended output)
    if (transitionManager.isActive()) {
      transitionManager.render(buffer.getBuffer(), now, {
        width: size.width,
        height: Math.max(0, size.height - 1),
      });
    }

    // Update and render toasts
    toastManager.update(now);
    toastManager.render(buffer.getBuffer(), size);

    // Render help overlay if visible (covers most of the screen)
    if (helpOverlay.isVisible()) {
      helpOverlay.render(buffer.getBuffer(), size);
    }

    // Render status bar to the bottom row of the buffer
    // Only if not in command/pattern mode (those use direct terminal writes)
    if (!commandBuffer.isActive() && !patternBufferActive) {
      statusBar.render(buffer.getBuffer(), size);
    }
  });

  // Set up terminal-based overlays (render after terminal write)
  // Unified bottom overlay system with priority: command > pattern > message > none
  engine.setAfterRenderCallback(() => {
    renderDebugOverlay();
    renderBottomOverlay();
  });

  // Display welcome message briefly using the overlay system
  showMessage('ascii-splash - Press ? for help | q to quit');

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

process.on('uncaughtException', err => {
  if (cleanupHandler) {
    cleanupHandler();
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  if (cleanupHandler) {
    cleanupHandler();
  }
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Run the app. Initialization failures after fullscreen setup use the cleanup
// handler installed immediately after renderer construction.
try {
  cleanupHandler = await main();
} catch (error) {
  try {
    cleanupHandler?.();
  } catch (cleanupError) {
    console.error('Cleanup failed:', cleanupError);
  }
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
