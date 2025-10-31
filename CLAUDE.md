# CLAUDE.md

> **⚠️ Symlink Note**: `AGENTS.md` and `WARP.md` are symlinks pointing to this file. Do not delete them. This design allows multiple entry points while maintaining a single source of truth.

## Project Overview

ascii-splash is a terminal ASCII animation app that displays animated patterns (waves, starfield, matrix rain, etc.) in a terminal window. It's designed as a lightweight ambient visual effect for IDE workspaces, targeting <5% CPU and <50MB RAM usage.

**Tech Stack:**
- TypeScript/Node.js (ES2020, CommonJS)
- `terminal-kit` for terminal control and mouse/keyboard input
- `chalk` for color output
- Target: Node 16+

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Watch mode (rebuilds on file changes)
npm run dev

# Run the application
npm start
# or directly:
node dist/main.js
```

**Note:** Always build before running. The entry point is `dist/main.js`, not source files.

## Architecture

### Core System (3-Layer Design)

The app follows a clean separation of concerns:

**1. Renderer Layer** ([src/renderer/](src/renderer/))
- `TerminalRenderer`: Manages terminal state, input events, and resize handling
- `Buffer`: Implements double-buffering with dirty-cell tracking for flicker-free rendering
- Only changed cells are redrawn each frame for performance

**2. Engine Layer** ([src/engine/](src/engine/))
- `AnimationEngine`: Main loop running at target FPS (default 30), orchestrates pattern rendering
- `PerformanceMonitor`: Tracks FPS, frame time, render time, and frame drops with rolling averages
- Uses `setTimeout(1)` instead of `requestAnimationFrame` (which doesn't exist in Node)

**3. Pattern Layer** ([src/patterns/](src/patterns/))
- All patterns implement the `Pattern` interface from [src/types/index.ts](src/types/index.ts)
- Each pattern:
  - Renders directly into a `Cell[][]` buffer (2D array of `{char, color}`)
  - Receives `time` (milliseconds) and `size` for animations
  - Implements `onMouseMove` and `onMouseClick` for interaction
  - Has a `reset()` method called when switching patterns

### Data Flow

```
User Input → TerminalRenderer (events) → main.ts (dispatch)
  ↓
AnimationEngine.loop() every ~33ms (30 FPS)
  ↓
Pattern.render(buffer, time, size, mousePos)
  ↓
Buffer.getChanges() → TerminalRenderer.render() → Terminal output
```

### Key Architectural Patterns

**Double Buffering:** Buffer class maintains current and previous frame state. `getChanges()` diffs them to find modified cells, then `swap()` copies current to previous. This prevents flicker and minimizes terminal writes.

**Performance Tracking:** PerformanceMonitor measures:
- Pattern render time (pattern computation)
- Update time (buffer clearing + pattern render)
- Render time (terminal writes)
- Changed cell count
- FPS with 60-frame rolling average

**Mouse Event Throttling:** Mouse motion events are throttled to 16ms (~60 FPS) in [src/main.ts](src/main.ts) to prevent overwhelming the pattern rendering.

## Pattern Development

To add a new pattern:

1. Create `src/patterns/YourPattern.ts` implementing the `Pattern` interface
2. Add to the patterns array in [src/main.ts](src/main.ts)
3. Update keyboard shortcuts if needed

**Pattern Implementation Guidelines:**
- Use the provided `time` parameter for animation (milliseconds since start)
- Respect buffer bounds: `0 <= x < size.width`, `0 <= y < size.height`
- Colors are RGB objects: `{r: 0-255, g: 0-255, b: 0-255}`
- Available chars include Unicode: `~≈∼*✦✧★` etc.
- Store interactive state (ripples, particles, etc.) as class properties
- Clean up old effects in `render()` to prevent memory leaks
- Mouse coordinates are 0-based (already converted from terminal-kit's 1-based)

**Performance Tips:**
- Minimize expensive calculations (sqrt, trigonometry) where possible
- Use squared distance for proximity checks before calculating sqrt
- Limit number of interactive elements (particles, ripples, etc.)
- Consider early rejection tests before complex calculations

## Terminal Coordinate Systems

**Important:** terminal-kit uses 1-based indexing (top-left is 1,1), but the app internally uses 0-based coordinates:
- Buffer and Pattern APIs: 0-based
- terminal-kit calls: Add 1 to x and y before `term.moveTo()`
- Mouse events: Converted to 0-based in [src/main.ts](src/main.ts) before passing to patterns

## Configuration System

### Overview

ascii-splash has a 3-tier configuration system with clear priority:

**Priority Order** (highest to lowest):
1. **CLI Arguments** - Passed when running the app
2. **Config File** - Persistent settings at `~/.config/ascii-splash/.splashrc.json`
3. **Defaults** - Built-in fallback values in `src/config/defaults.ts`

### Implementation

**ConfigLoader Class** ([src/config/ConfigLoader.ts](src/config/ConfigLoader.ts)):
- Uses the `conf` package (v10) for cross-platform config file management
- `load(cliOptions)` - Merges config from all sources with correct priority
- `save(config)` - Persists settings to config file
- `getConfigPath()` - Returns path to config file
- `reset()` - Clears config file, resetting to defaults
- `getFpsFromConfig(config)` - Resolves FPS from explicit value or quality preset
- `getFavorite(slot)` - Retrieves a favorite from the config
- `saveFavorite(slot, favorite)` - Saves a favorite to the config
- `getAllFavorites()` - Returns all saved favorites
- `deleteFavorite(slot)` - Removes a favorite from the config

**Config Schema** ([src/types/index.ts](src/types/index.ts)):
```typescript
interface ConfigSchema {
  // Global settings
  defaultPattern?: string;
  quality?: QualityPreset;
  fps?: number;
  theme?: string;
  mouseEnabled?: boolean;
  
  // Favorites storage (slot number → favorite data)
  favorites?: {
    [slot: number]: FavoriteSlot;
  };
  
  // Pattern-specific configurations
  patterns?: {
    waves?: WavePatternConfig;
    starfield?: StarfieldPatternConfig;
    matrix?: MatrixPatternConfig;
    rain?: RainPatternConfig;
    quicksilver?: QuicksilverPatternConfig;
    particles?: ParticlePatternConfig;
    spiral?: SpiralPatternConfig;
    plasma?: PlasmaPatternConfig;
    tunnel?: TunnelPatternConfig;
    lightning?: LightningPatternConfig;
    fireworks?: FireworkPatternConfig;
    life?: LifePatternConfig;
    maze?: MazePatternConfig;
  };
}

interface FavoriteSlot {
  pattern: string;     // Pattern name (e.g., "WavePattern")
  preset?: number;     // Preset ID (if applicable)
  theme: string;       // Theme name (e.g., "ocean")
  config?: any;        // Custom pattern config (if any)
  note?: string;       // Optional user note
  savedAt: string;     // ISO timestamp
}
```

**Config File Location**:
- Linux/macOS: `~/.config/ascii-splash/.splashrc.json`
- Windows: `%APPDATA%\ascii-splash\config.json`

**Usage in main.ts** ([src/main.ts](src/main.ts:98-172)):
```typescript
const cliOptions = parseCliArguments();        // Parse CLI
const configLoader = new ConfigLoader();
const config = configLoader.load(cliOptions);  // Merge all sources

// Apply config to patterns
patterns = createPatternsFromConfig(config);
const initialFps = ConfigLoader.getFpsFromConfig(config);
```

### Pattern-Specific Configs

Each pattern can have custom settings defined in the config file:

**Example** (`~/.config/ascii-splash/.splashrc.json`):
```json
{
  "patterns": {
    "waves": {
      "frequency": 0.1,
      "amplitude": 3,
      "layers": 3,
      "rippleDuration": 2000
    },
    "starfield": {
      "starCount": 300,
      "speed": 50,
      "forceFieldRadius": 20
    }
  }
}
```

See [examples/.splashrc.example](examples/.splashrc.example) for a complete example.

### Favorites System

The favorites system allows users to save and recall their favorite pattern/preset/theme combinations.

**Commands:**
- `0F1` - Save current state to favorite slot 1 (slots 1-99)
- `0f1` - Load favorite from slot 1
- `0fl` - List all saved favorites

**Example Usage:**
```
# In the app:
Press 1        → Switch to Waves
Type 03        → Apply preset 3 (Ocean Storm)
Press t        → Switch to Fire theme
Type 0F1       → Save to favorite slot 1
# Message: "Saved to favorite 1: WavePattern + Fire"

# Later...
Type 0f1       → Load favorite 1
# Message: "Loaded favorite 1: WavePattern + preset 3 + Fire"
```

**Storage Format** (in `~/.config/ascii-splash/.splashrc.json`):
```json
{
  "favorites": {
    "1": {
      "pattern": "WavePattern",
      "preset": 3,
      "theme": "fire",
      "savedAt": "2025-10-30T12:34:56.789Z",
      "note": "Optional user note"
    }
  }
}
```

**Features:**
- Stores pattern name, preset ID, theme, and timestamp
- Up to 99 favorite slots (1-99)
- Persisted across sessions in config file
- Displays info on load (pattern, preset, theme)
- Can be manually edited in config file

## Shuffle Mode System

The shuffle mode automatically cycles through presets or entire configurations at regular intervals, creating a dynamic ambient experience.

**Commands:**
- `0!` - Toggle shuffle mode (presets only, 10-second default interval)
- `0!5` - Toggle shuffle with custom interval (e.g., every 5 seconds)
- `0!!` - Toggle shuffle all mode (randomizes pattern + preset + theme)

**Example Usage:**
```
# In the app:
Type 0!       → Enable shuffle mode (cycles presets every 10s)
Type 0!       → Disable shuffle mode (toggle off)
Type 0!3      → Enable shuffle with 3-second intervals
Type 0!!      → Enable shuffle all (patterns + presets + themes)
```

**Implementation Details** ([src/engine/CommandExecutor.ts](src/engine/CommandExecutor.ts)):
- Shuffle state managed in CommandExecutor class
- Uses `setInterval()` for periodic randomization
- Interval range: 1-300 seconds
- Shuffle mode indicator shown in debug overlay (press `d`)
- Automatically cleaned up on app shutdown
- Two modes:
  - **Preset shuffle** (`0!`): Only changes presets of current pattern
  - **Full shuffle** (`0!!`): Randomizes pattern, preset, AND theme

## Theme System

### Overview

The theme system provides 5 predefined color themes that all patterns automatically use. Themes are implemented using color interpolation for smooth gradients.

### Theme Implementation

**Theme Interface** ([src/types/index.ts](src/types/index.ts)):
```typescript
interface Theme {
  name: string;
  displayName: string;
  colors: Color[];
  getColor(intensity: number): Color;
}
```

**Theme Definitions** ([src/config/themes.ts](src/config/themes.ts)):
- **Ocean** (default): Blues, cyans, teals (calm and soothing)
- **Matrix**: Green monochrome (classic hacker aesthetic)
- **Starlight**: Deep blues, purples, white (cosmic space)
- **Fire**: Reds, oranges, yellows (warm and energetic)
- **Monochrome**: Grayscale gradient (clean and minimal)

### Usage in Patterns

Patterns that support themes (WavePattern, StarfieldPattern, MatrixPattern, ParticlePattern, SpiralPattern, PlasmaPattern) receive a `Theme` object in their constructor:

```typescript
constructor(theme: Theme, config?: Partial<PatternConfig>) {
  this.theme = theme;
  // ...
}

// In render method, use intensity (0-1) to get colors
const color = this.theme.getColor(intensity);
```

The `getColor(intensity)` method uses linear interpolation between the theme's color array to provide smooth gradients.

### Theme Cycling

Press `t` during runtime to cycle through themes. The current theme is:
- Displayed in the debug overlay (press `d`)
- Stored in the config file for persistence
- Can be set via `--theme` CLI argument
- Recreates all patterns with the new theme when changed

## Application Controls

**Keyboard:**
- 0: Command mode (advanced multi-key commands)
- 1-9: Switch to patterns 1-9 (Waves, Starfield, Matrix, Rain, Quicksilver, Particles, Spiral, Plasma, Tunnel)
- n/p: Next/Previous pattern (cycles through all 11 patterns)
- SPACE: Pause/Resume
- +/-: Adjust FPS (10-60 range)
- [/]: Cycle quality presets (LOW/MEDIUM/HIGH)
- t: Cycle color themes
- ?: Toggle help overlay
- d: Toggle debug overlay (shows performance metrics)
- q/ESC/Ctrl+C: Quit

**Mouse:**
- Move: Triggers pattern `onMouseMove()`
- Click: Triggers pattern `onMouseClick()`
- Mouse support enabled via `term.grabInput({ mouse: 'motion' })`

## Files and Structure

```
src/
├── types/index.ts          # Core interfaces (Pattern, Cell, ConfigSchema, Theme, etc.)
├── main.ts                 # Entry point, CLI parsing, input handling, UI overlays
├── config/
│   ├── defaults.ts         # Default configuration values
│   ├── ConfigLoader.ts     # Load/merge config from file and CLI
│   └── themes.ts           # 5 color themes with interpolation
├── renderer/
│   ├── TerminalRenderer.ts # Terminal setup, resize handling, rendering
│   └── Buffer.ts           # Double-buffering with dirty tracking
├── engine/
│   ├── AnimationEngine.ts  # Main loop, pattern switching
│   ├── PerformanceMonitor.ts # FPS and timing metrics
│   ├── CommandBuffer.ts    # Multi-key command input system (NEW)
│   ├── CommandParser.ts    # Parse command strings (NEW)
│   └── CommandExecutor.ts  # Execute parsed commands (NEW)
└── patterns/
    ├── WavePattern.ts      # Sine waves with ripple effects + 6 presets
    ├── StarfieldPattern.ts # 3D starfield with parallax + 6 presets
    ├── MatrixPattern.ts    # Digital rain effect + 6 presets
    ├── RainPattern.ts      # Falling droplets + 6 presets
    ├── QuicksilverPattern.ts # Liquid metal flow + 6 presets
    ├── ParticlePattern.ts  # Physics-based particles + 6 presets
    ├── SpiralPattern.ts    # Rotating logarithmic spirals + 6 presets
    ├── PlasmaPattern.ts    # Fluid plasma effect + 6 presets
    ├── TunnelPattern.ts    # 3D geometric tunnel + 6 presets
    ├── LightningPattern.ts # Electric bolts with branching + 6 presets
    ├── FireworksPattern.ts # Particle explosions + 6 presets
    ├── LifePattern.ts      # Conway's Game of Life cellular automaton + 6 presets
    └── MazePattern.ts      # Dynamic maze generation and solving + 6 presets
```

## Current Status

**Phase 6 In Progress!** - New patterns: Life and Maze added to complete 13-pattern suite!

**Completed Features:**
1. **13 Interactive Patterns**: All with full theme support, mouse interactivity, AND 6 presets each (78 presets total!)
   - **Waves** (6 presets): Calm Seas, Ocean Storm, Ripple Tank, Glass Lake, Tsunami, Choppy Waters
   - **Starfield** (6 presets): Deep Space, Warp Speed, Asteroid Field, Milky Way, Nebula Drift, Photon Torpedo
   - **Matrix** (6 presets): Classic Matrix, Binary Rain, Code Storm, Sparse Glyphs, Firewall, Zen Code
   - **Rain** (6 presets): Light Drizzle, Steady Rain, Thunderstorm, Mist, Monsoon, Spring Shower
   - **Quicksilver** (6 presets): Liquid Mercury, Molten Silver, Quicksilver Rush, Chrome Puddle, Turbulent Metal, Gentle Shimmer
   - **Particles** (6 presets): Gentle Float, Standard Physics, Heavy Rain, Zero Gravity, Particle Storm, Minimal Drift
   - **Spiral** (6 presets): Twin Vortex, Galaxy Arms, Fibonacci Bloom, Hypnotic Spin, Slow Mandala, Nautilus Shell
   - **Plasma** (6 presets): Gentle Waves, Standard Plasma, Turbulent Energy, Lava Lamp, Electric Storm, Cosmic Nebula
   - **Tunnel** (6 presets): Circle Tunnel, Hyperspeed, Square Vortex, Triangle Warp, Hexagon Grid, Stargate
   - **Lightning** (6 presets): Cloud Strike, Tesla Coil, Ball Lightning, Fork Lightning, Chain Lightning, Spider Lightning
   - **Fireworks** (6 presets): Sparklers, Grand Finale, Fountain, Roman Candle, Chrysanthemum, Strobe
   - **Life** (6 presets): Still Life, Beehive, Gliders, Oscillators, Garden, Chaos
   - **Maze** (6 presets): Recursive Backtrack, Aldous-Broder, Prim, Hunt-Kill, Wilson, Braid

2. **Command System** (Phase 4.1):
   - `CommandBuffer`: Multi-key input accumulation with 10-second timeout
   - `CommandParser`: Parses pattern, theme, preset, favorite, and special commands
   - `CommandExecutor`: Executes parsed commands with success/error feedback
   - Command overlay at bottom of screen: `COMMAND: 0[buffer]_`
   - Success (✓ green) and error (✗ red) messages with 2.5s auto-dismiss
   - Command history with up/down arrow navigation
   - Working commands: `0p3`, `0pwaves`, `0p3.5`, `0t2`, `0tfire`, `0tr`, `0r`, `0x`, `0/term`, `0p`, `0t`
   - Combination commands: `0p3+t2` (pattern + theme)

3. **Preset System** (Phase 4.2):
   - All 13 patterns implement `applyPreset(presetId: number): boolean`
   - Static `getPresets()` and `getPreset(id)` methods on each pattern class
   - Users can apply presets via commands: `01`, `02`, `0p3.5`, `0pwaves.2`
   - Each pattern has 6 carefully designed preset variations (78 total presets)

4. **Favorites System** (Phase 4.3):
   - Save current state to favorite slots (1-99): `0F1`, `0F2`, etc.
   - Load favorites: `0f1`, `0f2`, etc.
   - List all saved favorites: `0fl`
   - Stores pattern, theme, preset, optional note, and timestamp
   - Persisted in config file at `~/.config/ascii-splash/.splashrc.json`
   - Displays favorite info on load (pattern, preset, theme, note)

5. **5 Color Themes**: Ocean (default), Matrix, Starlight, Fire, Monochrome - ALL patterns support themes

6. **CLI Arguments System** (Phase 3.1):
   - Pattern selection via `--pattern`
   - Quality presets via `--quality`
   - FPS override via `--fps`
   - Theme selection via `--theme`
   - Mouse toggle via `--no-mouse`
   - Help and version commands

7. **Configuration File System** (Phase 3.2):
   - Config file: `~/.config/ascii-splash/.splashrc.json`
   - Merge priority: CLI args > config file > defaults
   - Global settings: pattern, quality, FPS, theme, mouse
   - Pattern-specific settings for all 13 patterns
   - Favorites storage in config file
   - Example config at `examples/.splashrc.example`

5. **Special Commands** (Phase 4.4):
   - `0*` - Random preset from current pattern
   - `0**` - Random pattern AND preset (with theme randomization)
   - `0?` - List presets for current pattern
   - `0??` - Show ALL presets catalog across all patterns
   - `0s` - Save current state to config file
   - `0!` - Toggle shuffle mode (auto-cycle presets every 10s)
   - `0!5` - Toggle shuffle with custom interval (e.g., every 5 seconds)
   - `0!!` - Toggle shuffle all mode (patterns + presets + themes)
   - `0/term` - Search patterns/themes by keyword
   - Shuffle status displayed in debug overlay

**Next Steps:** Phase 6 - Polish and distribution (see [docs/PLAN.md](docs/PLAN.md))

## Testing and Debugging

**Debug Mode:** Press `d` while running to see performance overlay with:
- Real-time FPS vs target
- Frame time breakdown (update, pattern render, terminal render)
- Changed cell count (lower is more efficient)
- Dropped frame count
- Min/Avg/Max FPS

**Manual Testing:**
- Test patterns individually with number keys
- Verify mouse interaction in each pattern
- Resize terminal window to test resize handling
- Check CPU usage (should stay under 5% when idle)

## Known Constraints

- Terminal color support varies by emulator; app uses RGB colors (24-bit)
- Mouse events depend on terminal capabilities
- Performance degrades with very small terminal windows (more cells to update)
- Not suitable for non-TTY environments (pipe, redirect)
