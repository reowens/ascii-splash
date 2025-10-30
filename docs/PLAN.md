# ascii-splash

**A terminal ASCII animation app that adds visual flow to your IDE workspace**

## Concept

A lightweight terminal app that displays animated ASCII patterns (waves, starfield, matrix rain, etc.) designed to fit in a small terminal window within your IDE. Provides ambient motion and visual interest without being distracting or resource-heavy.

## Tech Stack

- **Language**: TypeScript/Node.js
- **Distribution**: npm package (`npx ascii-splash`)
- **Key Libraries**:
  - `terminal-kit` - Advanced terminal features (mouse support, colors)
  - `chalk` - Color output
  - `commander` - CLI argument parsing
  - `conf` - Config file management

## Project Structure

```
splash/
├── src/
│   ├── renderer/
│   │   ├── TerminalRenderer.ts     # Core rendering engine
│   │   └── Buffer.ts               # Double-buffer for flicker-free drawing
│   │
│   ├── engine/
│   │   ├── AnimationEngine.ts      # Main loop, FPS management
│   │   ├── PerformanceMonitor.ts   # FPS and timing metrics
│   │   ├── CommandBuffer.ts        # Multi-key command input system
│   │   ├── CommandParser.ts        # Parse command strings
│   │   └── CommandExecutor.ts      # Execute parsed commands
│   │
│   ├── patterns/
│   │   ├── WavePattern.ts          # Sine wave animations
│   │   ├── StarfieldPattern.ts     # 3D starfield effect
│   │   ├── MatrixPattern.ts        # Digital rain
│   │   ├── RainPattern.ts          # Falling droplets
│   │   ├── QuicksilverPattern.ts   # Liquid metal flow
│   │   ├── ParticlePattern.ts      # Physics-based particles
│   │   ├── SpiralPattern.ts        # Rotating logarithmic spirals
│   │   ├── PlasmaPattern.ts        # Fluid plasma effect
│   │   ├── TunnelPattern.ts        # 3D tunnel zoom effect
│   │   ├── LightningPattern.ts     # Branching electric arcs
│   │   └── FireworksPattern.ts     # Explosive particle bursts
│   │
│   ├── config/
│   │   ├── defaults.ts             # Default configuration values
│   │   ├── ConfigLoader.ts         # Load/save config with merge logic
│   │   └── themes.ts               # 5 color themes
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   │
│   └── main.ts                     # Entry point
│
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md                       # Development documentation
└── examples/
    └── .splashrc.example           # Example config file
```

## Core Features

### 1. Pattern System

All patterns implement a common interface:

```typescript
interface Pattern {
  name: string;
  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
  onMouseMove?(pos: Point): void;
  onMouseClick?(pos: Point): void;
  reset(): void;
  getMetrics?(): Record<string, number>;
  
  // NEW: Preset support
  getPresets?(): PatternPreset[];
  applyPreset?(presetId: string): void;
  getCurrentPreset?(): string;
}
```

### 2. Dual-Layer Input System

**Layer 1: Direct Keys (Instant Actions)**
```
1-8       Switch to patterns 1-8
n/p       Next/Previous pattern
SPACE     Pause/Resume
t         Cycle themes
d         Toggle debug overlay
?         Toggle help overlay
+/-       Speed up/down
[/]       Quality presets (LOW/MEDIUM/HIGH)
q/ESC     Quit
```

**Layer 2: Command Buffer (Extended Features via `0` prefix)**
```
PRESETS:
  01-99+     Load preset # for current pattern (e.g., 01, 012, 0123)
  
FAVORITES:
  0f1-0f99   Load favorite slot
  0F1-0F99   SAVE current to favorite slot
  0fl        List all favorites
  
PATTERN JUMPS:
  0p3        Jump to pattern #3
  0p3.5      Jump to pattern #3, preset #5
  0pwaves    Jump to "waves" by name
  
THEME COMMANDS:
  0t         Show theme picker
  0t2        Jump to theme #2
  0tfire     Jump to theme by name
  0tr        Random theme
  
SPECIAL COMMANDS:
  0*         Random preset from current pattern
  0**        Random pattern AND preset
  0?         Show preset list for current pattern
  0??        Show ALL presets catalog
  0r         Randomize current settings
  0s         Save settings to config file
  0x         Reset pattern to defaults
  0!         Toggle shuffle mode (auto-cycle presets)
  0!!        Shuffle all patterns
  0!5        Shuffle every 5 seconds
  0/         Search presets
  0\         Undo last command
  
COMBINATIONS:
  0p3+05     Pattern 3 + Preset 5
  0p3+t2     Pattern 3 + Theme 2
```

### 3. Preset System

Each pattern supports 3 tiers of presets:
- **Tier 1 (01-09)**: Essential presets - most common variations
- **Tier 2 (10-29)**: Extended presets - specialized effects
- **Tier 3 (30+)**: Experimental/community presets

Users can explore variations with `0?` to see available presets, then load with `0[number]`.

### 4. Mouse Interactions

**All patterns support:**
- **Move**: Pattern-specific hover effects
- **Click**: Burst animations, spawning effects, mode toggles

**Examples:**
- Waves: Ripples at cursor, click for big splash
- Starfield: Force field repulsion, click for burst
- Matrix: Distortion field, spawn columns
- Rain: Extra drops, dramatic splash
- Quicksilver: Ripples, droplet explosions
- Particles: Attract/repel toggle
- Spiral: Click spawns mini-spirals
- Plasma: Warping field, expanding waves

### 5. Theme System

5 built-in themes that all patterns adapt to:
- **Ocean** (default): Blues, cyans, teals
- **Matrix**: Green monochrome
- **Starlight**: Deep blues, purples, white
- **Fire**: Reds, oranges, yellows
- **Monochrome**: Grayscale

Press `t` to cycle, or use `0t2` for direct jump.

### 6. Configuration System

**Config file location**: `~/.config/ascii-splash/.splashrc.json`

```json
{
  "defaultPattern": "waves",
  "defaultPreset": "02",
  "quality": "medium",
  "fps": 30,
  "theme": "ocean",
  "mouseEnabled": true,
  
  "favorites": {
    "1": {
      "pattern": "waves",
      "preset": "03",
      "theme": "ocean",
      "note": "My storm setting",
      "savedAt": "2025-10-30T12:34:56Z"
    }
  },
  
  "patterns": {
    "waves": {
      "frequency": 0.1,
      "amplitude": 3,
      "speed": 1.0,
      "layers": 3
    },
    "starfield": {
      "starCount": 200,
      "speed": 50
    }
    // ... etc
  }
}
```

## Development Phases

### Phase 1: Core (MVP) ✅ COMPLETE
- [x] Basic terminal renderer with double-buffering
- [x] Simple animation loop (30 FPS)
- [x] One pattern (Waves)
- [x] Terminal resize handling
- [x] Exit on Ctrl+C

### Phase 2: Patterns & Performance ✅ COMPLETE
- [x] Add Starfield pattern
- [x] Add Matrix pattern
- [x] Add Rain pattern
- [x] Add Quicksilver pattern
- [x] Pattern switching (keyboard)
- [x] Mouse tracking implementation
- [x] Mouse-based effects for all patterns
- [x] Help overlay (? key)
- [x] Debug overlay (d key)
- [x] Performance monitoring system
- [x] Quality presets (LOW/MEDIUM/HIGH)
- [x] Pattern-specific metrics tracking

### Phase 3: Configuration & Extensibility ✅ COMPLETE
**Goal**: Make the app fully customizable via CLI args, config files, and themes

#### 3.1 CLI Arguments System ✅ COMPLETE
- [x] Install `commander` dependency
- [x] Create argument parser in main.ts
- [x] Support flags: `--pattern`, `--quality`, `--fps`, `--theme`, `--no-mouse`, `--help`, `--version`
- [x] Validate and apply CLI args to app state
- [x] Update README with CLI usage examples

#### 3.2 Configuration File System ✅ COMPLETE
- [x] Install `conf` dependency (v10 for CommonJS support)
- [x] Create `src/config/` directory structure
- [x] Implement `src/config/defaults.ts` - Default configuration values
- [x] Implement `src/config/ConfigLoader.ts` - Load/save config with merge logic
- [x] Define config schema/types (ConfigSchema, pattern-specific interfaces)
- [x] Merge priority: CLI args > config file > defaults
- [x] Create `examples/.splashrc.example` with comprehensive documentation
- [x] Update README with configuration documentation

#### 3.3 Theme System ✅ COMPLETE
- [x] Implement `src/config/themes.ts` - 5 theme definitions
- [x] Define Theme interface with color interpolation
- [x] Update all patterns to use theme colors
- [x] Add theme cycling keyboard shortcut (t key)
- [x] Add theme to config file support
- [x] Add --theme CLI argument
- [x] Display current theme in debug overlay

#### 3.4 Additional Patterns ✅ COMPLETE
- [x] Implement ParticlePattern (floating particles with physics)
- [x] Implement SpiralPattern (rotating logarithmic spirals)
- [x] Implement PlasmaPattern (fluid plasma effect)
- [x] Add new patterns to configuration system
- [x] Add new patterns to theme system
- [x] Update keyboard shortcuts (1-8 keys)

#### 3.5 Pattern Refinement ✅ COMPLETE
**Goal**: Fix issues with existing patterns and ensure full theme + interaction support

- [x] Debug and fix SpiralPattern (pattern 7)
  - Increased spiral arms from 3 → 5
  - Doubled density from 15 → 30
  - Faster rotation speed (0.5 → 0.8)
  - Better character set with block chars (█▓▒░●◉○◐·)
  - Added breathing/pulsing animation
  - Click spawns interactive mini-spirals
  
- [x] Add theme support to RainPattern
  - Converted from hardcoded colors to theme-adaptive
  - Enhanced splash effects with radial ripples
  - More dramatic click splashes (15-drop burst)
  
- [x] Add theme support to QuicksilverPattern
  - Theme-adaptive with metallic shimmer preserved
  - Enhanced droplet effects (12 droplets on click)
  
- [x] Add mouse interactivity to PlasmaPattern
  - Mouse warping/distortion field
  - Click creates expanding ring waves

**Result**: All 8 patterns now have full theme support AND mouse interactivity!

### Phase 4: Command System & Presets ✅ COMPLETE
**Goal**: Create extensible command system with unlimited presets per pattern

#### 4.1 Command Buffer Foundation ✅ COMPLETE
- [x] Create CommandBuffer class
  - Input accumulation with 10-second timeout
  - Command history (up/down arrow navigation)
  - Visual feedback overlay at screen bottom
  - ENTER executes, ESC cancels
  
- [x] Create CommandParser class
  - Parse numeric presets: `0[digits]` → preset #
  - Parse favorites: `0f#`, `0F#`
  - Parse pattern jumps: `0p#`, `0p#.#`, `0pname`
  - Parse theme commands: `0t#`, `0tname`, `0tr`
  - Parse special commands: `0*`, `0?`, `0r`, `0s`, `0x`, `0!`
  - Support combinations: `0p3+05+t2`
  
- [x] Create CommandExecutor class
  - Execute preset application
  - Handle favorites load/save
  - Handle pattern/theme switching
  - Handle special commands (random, shuffle, save, etc.)
  
- [x] UI integration in main.ts
  - Command buffer overlay rendering
  - Status messages for command results
  - Error handling and user feedback
  - Help text updates

#### 4.2 Preset System Implementation ✅ COMPLETE
- [x] Extend Pattern interface with preset methods
  - `applyPreset(id)` applies preset config
  - Static `getPresets()` returns array of available presets
  - Static `getPreset(id)` returns specific preset
  
- [x] Add 6 Tier 1 presets to each existing pattern:
  - [x] WavePattern (Calm Seas, Ocean Storm, Ripple Tank, Glass Lake, Tsunami, Choppy Waters)
  - [x] StarfieldPattern (Deep Space, Warp Speed, Asteroid Field, Milky Way, Nebula Drift, Photon Torpedo)
  - [x] MatrixPattern (Classic Matrix, Binary Rain, Code Storm, Sparse Glyphs, Firewall, Zen Code)
  - [x] RainPattern (Light Drizzle, Steady Rain, Thunderstorm, Mist, Monsoon, Spring Shower)
  - [x] QuicksilverPattern (Liquid Mercury, Molten Silver, Quicksilver Rush, Chrome Puddle, Turbulent Metal, Gentle Shimmer)
  - [x] ParticlePattern (Gentle Float, Standard Physics, Heavy Rain, Zero Gravity, Particle Storm, Minimal Drift)
  - [x] SpiralPattern (Twin Vortex, Galaxy Arms, Fibonacci Bloom, Hypnotic Spin, Slow Mandala, Nautilus Shell)
  - [x] PlasmaPattern (Gentle Waves, Standard Plasma, Turbulent Energy, Lava Lamp, Electric Storm, Cosmic Nebula)
  
- [x] Add preset UI
  - [x] `0?` shows preset list for current pattern
  - [x] `0??` shows full catalog across all patterns
  - [x] Preset overlay with tier organization

#### 4.3 Favorites System ✅ COMPLETE
- [x] Extend ConfigSchema with favorites storage
- [x] Implement favorite load: `0f#`
- [x] Implement favorite save: `0F#`
- [x] Implement favorite list: `0fl`
- [x] Store pattern + preset + theme + custom config + timestamp
- [x] Show favorite info on load

#### 4.4 Special Commands ✅ COMPLETE
- [x] `0*` - Random preset from current pattern
- [x] `0**` - Random pattern AND preset
- [x] `0r` - Randomize current pattern settings
- [x] `0s` - Save current state to config file
- [x] `0x` - Reset pattern to defaults
- [x] `0!` - Shuffle mode (auto-cycle presets)
- [x] `0!!` - Shuffle all patterns
- [x] `0!5` - Shuffle with custom interval
- [x] `0/term` - Search presets by name
- [ ] `0\` - Undo last command (deferred)

### Phase 5: New Patterns ✅ COMPLETE
**Goal**: Add 3 visually stunning new patterns with full preset support

#### 5.1 Tunnel Pattern ✅ COMPLETE
**Visual**: 3D tunnel with rotating concentric shapes zooming toward viewer

- [x] Implement TunnelPattern class
- [x] Support multiple shapes: circle, square, triangle, hexagon, star
- [x] Depth-based perspective rendering
- [x] Rotation animation
- [x] Mouse parallax effect (shift focal point)
- [x] Click reverses zoom direction
- [x] Theme-adaptive color gradient (far → near)
- [x] 6 presets: Circle Tunnel, Hyperspeed, Square Vortex, Triangle Warp, Hexagon Grid, Stargate

#### 5.2 Fireworks Pattern ✅ COMPLETE
**Visual**: Explosive particle bursts with trails, gravity, and fading

- [x] Implement FireworksPattern class
- [x] Shell launch → explosion → particle fall physics
- [x] Trail rendering with fade
- [x] Multiple simultaneous bursts
- [x] Auto-spawn at intervals
- [x] Click spawns instant firework (1.5x size)
- [x] Theme-based burst colors
- [x] 6 presets: Sparklers, Grand Finale, Fountain, Roman Candle, Chrysanthemum, Strobe

#### 5.3 Lightning Pattern ✅ COMPLETE
**Visual**: Branching electric arcs with recursive forking

- [x] Implement LightningPattern class
- [x] Recursive branch generation algorithm
- [x] Segment-based bolt rendering (Bresenham)
- [x] Flash effect on strike
- [x] Auto-strike at intervals
- [x] Mouse creates charge particles
- [x] Click spawns area lightning (3-4 bolts)
- [x] Theme-adaptive with bright core
- [x] 6 presets: Cloud Strike, Tesla Coil, Ball Lightning, Fork Lightning, Chain Lightning, Spider Lightning

#### 5.4 Integration & Testing ✅ COMPLETE
- [x] Add new patterns to main.ts pattern array
- [x] Add keyboard shortcuts (9 for Tunnel, 10-11 via n/p cycling)
- [x] Add config interfaces to types (TunnelPatternConfig, LightningPatternConfig, FireworkPatternConfig)
- [x] Add defaults to config/defaults.ts
- [x] Update help overlay
- [x] All patterns work with all 5 themes
- [x] Build successful with no TypeScript errors
- [x] Documentation updates (README.md, CLAUDE.md, examples/.splashrc.example)
- [x] Comprehensive test suite: 579 tests with 83.01% coverage

**Result**: 11 total patterns with 66 presets (6 per pattern)!

### Testing Achievements 🧪

**Test Coverage**: 83.01% (exceeded 80% target)
- **Test Suites**: 10 suites, all passing ✅
- **Total Tests**: 579 tests, all passing ✅
- **Execution Time**: ~7.4 seconds

**Component Coverage**:
- CommandParser: 100%
- Buffer: 100%
- ConfigLoader: 100%
- PerformanceMonitor: 100%
- Theme: 100%
- CommandBuffer: 100%
- AnimationEngine: 98.14%
- CommandExecutor: 96.63%
- TerminalRenderer: 88.49%

**Pattern Coverage**: All 11 patterns tested
- 173 pattern tests covering rendering, mouse events, presets, and state management
- Coverage range: 53%-94% across patterns
- Comprehensive preset testing (66 presets validated)

**Documentation**:
- Detailed testing plan in `docs/TESTING_PLAN.md`
- Test utilities for color comparison and buffer validation
- Coverage reports in `coverage/` directory

### Phase 6: Polish & Distribution 📦 FINAL
- [ ] Performance optimization pass
- [ ] Test on multiple terminal emulators (iTerm2, Terminal.app, Windows Terminal, Alacritty)
- [ ] Add shebang to main.js for binary execution
- [ ] Create demo GIFs/videos for README
- [ ] Comprehensive README documentation
- [ ] Update examples with new features
- [ ] Package.json preparation
- [ ] npm publish

## Usage Examples

```bash
# Run with defaults
npx ascii-splash

# Specific pattern
npx ascii-splash --pattern starfield

# Custom FPS and theme
npx ascii-splash --fps 60 --theme fire

# Disable mouse
npx ascii-splash --no-mouse

# Show help
npx ascii-splash --help
```

**Command Buffer Examples:**
```
# In the app:
Press 1        → Waves pattern
Type 0?        → See all wave presets
Type 03        → Load "Storm" preset
Type 0F1       → Save to favorite 1

Press n        → Next pattern (Starfield)
Type 0*        → Random starfield preset

Type 0p3.05    → Jump to Matrix, preset 5
Type 0tfire    → Switch to Fire theme
Type 0!10      → Auto-shuffle every 10 seconds
```

## Package Details

- **Package name**: `ascii-splash`
- **Binary name**: `splash`
- **Entry point**: `./dist/main.js`
- **Target**: ES2020, CommonJS
- **Min Node version**: 16.x

## Performance Strategy

1. **Smart Rendering**: Only redraw changed cells (Buffer dirty tracking)
2. **Frame Throttling**: 30 FPS default, adjustable 10-60 FPS
3. **Mouse Event Throttling**: Debounce to ~60Hz
4. **Pattern Optimization**: Pre-calculate where possible, limit particle counts
5. **Command Buffer**: 10-second timeout, minimal overhead when inactive
6. **Target**: <5% CPU idle, <50MB RAM

## Notes

- Keep resource usage minimal
- Ensure clean shutdown on all signals (SIGINT, SIGTERM)
- Graceful handling of non-TTY environments
- Terminal color capability detection
- Test on multiple terminal emulators
- Command buffer has no conflicts with direct keys
- Preset system fully backwards compatible
