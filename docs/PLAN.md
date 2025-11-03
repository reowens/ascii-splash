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

> **For detailed technical architecture, system design patterns, and implementation details**, see [ARCHITECTURE.md](ARCHITECTURE.md).

**Feature Summary**:
- 13 interactive patterns with 78 presets (6 per pattern)
- Dual-layer input system: direct keys + command buffer with `0` prefix
- 5 color themes (Ocean, Matrix, Starlight, Fire, Monochrome)
- Full mouse support (move/click interactions)
- Preset system with favorites storage
- Configuration file at `~/.config/ascii-splash/.splashrc.json`
- Advanced command system (pattern jumping, shuffling, searching)

**For detailed controls and usage**, see [README.md](../README.md) or run `splash --help`.

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

**Result**: All 13 patterns now have full theme support AND mouse interactivity!

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
- [x] Comprehensive test suite: 817 tests with 82.34% coverage

**Result**: 13 total patterns with 78 presets (6 per pattern)!

### Testing Achievements 🧪

**Test Coverage**: 82.34% (exceeded 80% target)
- **Test Suites**: 10 suites, all passing ✅
- **Total Tests**: 817 tests, all passing ✅
- **Execution Time**: ~35 seconds

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

**Pattern Coverage**: All 13 patterns tested
- 173 pattern tests covering rendering, mouse events, presets, and state management
- Coverage range: 53%-94% across patterns
- Comprehensive preset testing (66 presets validated)

**Documentation**:
- Detailed testing plan in `docs/TESTING_PLAN.md`
- Test utilities for color comparison and buffer validation
- Coverage reports in `coverage/` directory

### Phase 6: Polish & Distribution 📦 IN PROGRESS

#### 6.1 Stage 1: Essential Pre-Publish ✅ COMPLETE
**Goal**: Prepare package for npm publication

- [x] Update package.json for v1.0.0
  - Version bump: 0.1.0 → 1.0.0
  - Enhanced description with features
  - Expanded keywords (19 total)
  - Added author, repository, bugs, homepage
  - Added `files` field for package contents control
  - Added `prepublishOnly` safety script
  
- [x] Add shebang to main.ts (`#!/usr/bin/env node`)
  - Enables `splash` and `npx ascii-splash` commands
  - Verified in compiled output
  
- [x] Create .npmignore
  - Excludes: src/, tests/, docs/, coverage/
  - Includes: dist/, LICENSE, README.md, examples/
  - Package size: 79.7 kB (411.1 kB unpacked)
  
- [x] Add LICENSE file (MIT)
  - Copyright (c) 2025 reoiv
  
- [x] Polish README.md
  - Added npm badges (version, license, Node.js)
  - Restructured with emojis and clear sections
  - Added Quick Start section
  - Enhanced installation instructions
  - Updated all commands to use `splash` binary
  - Added Contributing, License, Acknowledgments sections
  
- [x] Test package locally
  - `npm pack` successful (96 files, 79.7 kB)
  - Verified package contents
  - Tested `--help` and `--version` commands

**Package Status**: Ready for npm publication ✅

#### 6.2 Stage 2: Additional Patterns 🎨 IN PROGRESS
**Goal**: Expand pattern library before v1.0.0 release

**Current Status**: 17 patterns complete for v0.1.0 → **Future Goal**: 22+ patterns

**Patterns Implemented** (6 complete):

1. [x] **Maze Generator** - Recursive backtracking maze generation animation
   - [x] Implement MazePattern class
   - [x] 6 presets (DFS, Prim's, Recursive Division, Kruskal's, Eller's, Wilson's)
   - [x] Theme support + mouse interaction (click spawns new maze from that point)
   - [x] Unit tests + config

2. [x] **Game of Life** - Conway's cellular automaton with interactive seeding
   - [x] Implement LifePattern class
   - [x] 6 presets (Classic, Acorn, Glider Gun, Pulsar, Pentadecathlon, Random Soup)
   - [x] Theme support + mouse interaction (click toggles cells)
   - [x] Unit tests + config

**Patterns to Implement** (8 remaining, in priority order):

3. [x] **DNA Helix** - Double helix rotation with base pairs
   - [x] Implement DNAPattern class
   - [x] 6 presets (Slow Helix, Fast Spin, Unwinding, Replication, Mutation, Rainbow)
   - [x] Theme support + mouse interaction (twist helix, spawn mutations)
   - [x] Unit tests + config (30 tests passing)

4. [x] **Lava Lamp** - Blobby metaball simulation
   - [x] Implement LavaLampPattern class (277 lines)
   - [x] 6 presets (Classic, Turbulent, Gentle, Many Blobs, Giant Blob, Strobe)
   - [x] Theme support + mouse interaction (attract/repel blobs, spawn on click)
   - [x] Unit tests + config (35 tests passing, 100% coverage)
   - [x] Metaball algorithm with physics (buoyancy, turbulence, drift, gravity)
   - [x] Vertical wrapping for continuous lava lamp cycle effect

5. [x] **Smoke** - Rising smoke plumes with turbulence
   - [x] Implement SmokePattern class (352 lines)
   - [x] 6 presets (Gentle Wisp, Campfire, Industrial, Incense, Fog, Steam)
   - [x] Theme support + mouse interaction (blow smoke, spawn bursts)
   - [x] Unit tests + config (37 tests passing, 100% coverage)
   - [x] Physics-based particle simulation with Perlin noise turbulence
   - [x] Realistic opacity-based rendering with height-gradient coloring

6. [x] **Falling Snow** - Seasonal particle effects with wind
   - [x] Implement SnowPattern class (442 lines)
   - [x] 6 presets (Light Flurries, Blizzard, Cherry Blossoms, Autumn Leaves, Confetti, Ash)
   - [x] Theme support + mouse interaction (wind force field, spawn burst)
   - [x] Unit tests + config (48 tests passing, 100% coverage)
   - [x] Downward falling physics with gravity and wind drift
   - [x] Perlin noise turbulence, particle rotation, ground accumulation
   - [x] 5 particle types: snow, cherry blossoms, autumn leaves, confetti, ash

7. [ ] **Constellation** - Star patterns that connect and fade
   - [ ] Implement ConstellationPattern class
   - [ ] 6 presets (Orion, Big Dipper, Random Stars, Zodiac, Connect All, Pulsing)
   - [ ] Theme support + mouse interaction (connect to cursor, spawn constellation)
   - [ ] Unit tests + config

8. [ ] **Ripple Grid** - Grid of intersecting wave ripples
   - [ ] Implement RippleGridPattern class
   - [ ] 6 presets (Calm Pool, Interference, Raindrops, Sonar, Earthquake, Frozen)
   - [ ] Theme support + mouse interaction (spawn ripples on click)
   - [ ] Unit tests + config

9. [ ] **Waveform** - Audio visualizer style frequency bars
   - [ ] Implement WaveformPattern class
   - [ ] 6 presets (Oscilloscope, Frequency Bars, Spectrum, Waveform, Circular, Radial)
   - [ ] Theme support + mouse interaction (change frequency, spawn beat pulse)
   - [ ] Unit tests + config

10. [ ] **Mandelbrot Zoom** - Fractal zoom animation
    - [ ] Implement MandelbrotPattern class
    - [ ] 6 presets (Classic Zoom, Julia Set, Slow Crawl, Deep Dive, Spiral Zoom, Edge Trace)
    - [ ] Theme support + mouse interaction (zoom center, reset zoom)
    - [ ] Unit tests + config

11. [ ] **Kaleidoscope** - Mirrored geometric patterns
    - [ ] Implement KaleidoscopePattern class
    - [ ] 6 presets (4-Way Mirror, 6-Way, 8-Way, Rotating, Pulsing, Fractal)
    - [ ] Theme support + mouse interaction (change symmetry, spawn pattern)
    - [ ] Unit tests + config

**Note**: Life and Maze patterns have been integrated into the codebase with full theme support, presets, and comprehensive testing.

**Requirements per pattern**:
- Implement Pattern interface
- Full theme support (5 themes)
- Mouse interactivity (move + click)
- 6 presets (Tier 1)
- Unit tests (>80% coverage)
- Config interface + defaults
- Documentation in CLAUDE.md

**After patterns complete**:
- [x] Update README with new pattern count (16 patterns, 96 presets)
- [ ] Update CHANGELOG.md with new patterns
- [ ] Update CLAUDE.md with new patterns
- [ ] Update keyboard shortcuts in main.ts (1-9 keys + n/p cycling)
- [ ] Add new patterns to config/defaults.ts
- [ ] Add new pattern configs to types/index.ts
- [ ] Regenerate test coverage report (target: maintain >80%)
- [ ] Update help overlay
- [ ] Build and verify all patterns work
- [ ] Test all 22 patterns with all 5 themes (110 combinations)

**Future Goal**: 22 patterns × 6 presets each = **132 total presets**
**Current Status (v0.1.0)**: 17 patterns × 6 presets = **102 total presets** ✅

#### 6.3 Stage 3: v0.1.0 Publication ✅ COMPLETE
**Goal**: Publish initial release to npm and GitHub

- [x] Set version to 0.1.0 (appropriate for initial release)
- [x] Update package.json with correct metadata
- [x] Update CHANGELOG.md with v0.1.0 release notes
- [x] Fix buffer fill verification tests (MatrixPattern, RainPattern)
- [x] Verify all 817 tests passing (100%)
- [x] Final coverage: 82.34% (exceeds 80% target)
- [x] Documentation updates for release
- [x] Package ready for `npm publish`
- [x] Run `npm publish` to publish v0.1.0
- [x] Verify package on npmjs.com
- [x] Test global installation: `npm install -g ascii-splash`
- [x] Test npx execution: `npx ascii-splash`
- [x] Create GitHub release with tag v0.1.0
- [x] Push to GitHub with `git push origin main --tags`
- [x] Update GitHub repository description and topics
- [x] Attach release tarball to GitHub release

**Publication Complete:** November 2, 2025
- npm: https://www.npmjs.com/package/ascii-splash
- GitHub: https://github.com/reowens/ascii-splash/releases/tag/v0.1.0

#### 6.4 Stage 4: Future Enhancements (Post-v0.1.0) 🔮
**Goal**: Improve discoverability and expand features

**Documentation**:
- [x] Create CHANGELOG.md with v0.1.0 release notes
- [ ] Add demo GIFs/videos to README
- [ ] Create usage examples gallery
- [ ] Add screenshots of patterns and themes
- [ ] Document pattern preset showcase

**Additional Patterns** (5 remaining for v0.2.0):
- [ ] Constellation - Star patterns that connect and fade
- [ ] Ripple Grid - Grid of intersecting wave ripples
- [ ] Waveform - Audio visualizer style frequency bars
- [ ] Mandelbrot Zoom - Fractal zoom animation
- [ ] Kaleidoscope - Mirrored geometric patterns

**Testing**:
- [ ] Test on multiple terminal emulators
  - [ ] iTerm2 (macOS)
  - [ ] Terminal.app (macOS)
  - [ ] Windows Terminal (Windows)
  - [ ] Alacritty (cross-platform)
  - [ ] Hyper (Electron-based)
  
**Performance**:
- [ ] Performance optimization pass
- [ ] Profile CPU usage across patterns
- [ ] Memory leak testing (long-running sessions)
- [ ] Benchmark preset switching performance

**Promotion**:
- [ ] Share on Reddit (r/commandline, r/node)
- [ ] Post on Hacker News
- [ ] Tweet/share on social media
- [ ] Add to awesome-cli-apps lists
- [ ] Create demo video for YouTube

## Usage Examples

**For detailed usage examples and command reference**, see [README.md](../README.md#-controls) and [README.md](../README.md#-command-system).

## Package Details

- **Package name**: `ascii-splash`
- **Binary name**: `splash`
- **Entry point**: `./dist/main.js`
- **Target**: ES2020, CommonJS
- **Min Node version**: 16.x

## Performance Strategy

**For detailed performance optimization strategies and metrics**, see [ARCHITECTURE.md](ARCHITECTURE.md#performance-strategy).

**Target Metrics**:
- CPU usage: <5% idle, <15% active
- Memory: <50MB
- FPS: Adjustable 10-60 (default 30)

## Notes

- Keep resource usage minimal
- Ensure clean shutdown on all signals (SIGINT, SIGTERM)
- Graceful handling of non-TTY environments
- Terminal color capability detection
- Test on multiple terminal emulators
- Command buffer has no conflicts with direct keys
- Preset system fully backwards compatible
