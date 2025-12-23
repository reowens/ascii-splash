# Changelog

All notable changes to ascii-splash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2025-12-23

### 🎯 Theme: "Next-Generation Terminal Graphics"

This release transforms ascii-splash from an abstract animation engine into a **living environment simulator** with 5 new scene-based patterns, enhanced architecture, and polished UX components.

### ⚠️ HIGHLIGHTS

- **5 New Scene-Based Patterns**: Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park
- **New Architecture**: Scene Graph, Sprite Manager, Enhanced Particle System
- **UI Overhaul**: StatusBar, ToastManager, HelpOverlay, TransitionManager
- **Test Coverage**: 2097 tests (up from 1505), comprehensive integration & visual tests

### Added

#### 🌊 Scene-Based Patterns (5 New)

- **Ocean Beach** - Serene beach scene with multi-layered rendering
  - Animated wave system with realistic water motion using Perlin noise
  - Seagulls that fly across sky and react to mouse movement
  - Interactive footprints on beach (mouse click)
  - Dynamic clouds drifting across the sky
  - 6 presets: Calm Morning, Midday Sun, Stormy, Sunset, Night Beach, Tropical

- **Campfire** - Cozy campfire with realistic fire physics
  - Flickering flames using noise-based shapes
  - Rising sparks with physics simulation
  - Drifting smoke particles
  - Radial light glow effect
  - 6 presets: Kindling, Roaring Fire, Dying Embers, Windy Night, Campfire Stories, Bonfire

- **Aquarium** - Interactive fish tank with boids flocking
  - Fish schools using boids algorithm (separation, alignment, cohesion)
  - Swaying plants with sine-based animation
  - Rising bubbles particle system
  - Fish flee from or attract to cursor (toggle with spacebar)
  - 6 presets: Tropical Reef, Deep Sea, Goldfish Bowl, Piranha Tank, Koi Pond, Neon Tetras

- **Night Sky** - Aurora borealis with twinkling stars
  - Aurora ribbons using Perlin noise flow (green → cyan → purple → pink)
  - Twinkling stars with individual brightness modulation
  - Shooting stars / meteors on mouse click
  - Subtle nebula clouds
  - 6 presets: Polar Lights, Cosmic Storm, Silent Night, Solar Storm, Stargazer, Nebula Dreams

- **Snowfall Park** - Winter scene with accumulating snow
  - Falling snow with wind and drift effects
  - Snow accumulation on ground (builds up over time)
  - Swaying evergreen trees
  - Streetlamp with radial glow
  - 6 presets: First Snowfall, Blizzard, Winter Wonderland, Evening Snow, Frozen Park, Thaw

#### 💧 Enhanced Pattern

- **Metaball Playground** - Interactive liquid physics simulation
  - Multiple metaballs with merge/split dynamics
  - RGB color blending between blobs
  - Physics: gravity, mouse attraction/repulsion, wall collision
  - Shimmer highlights on metallic surfaces
  - 6 presets: Liquid Mercury, Lava Blobs, RGB Fusion, Plasma Orbs, Water Droplets, Chaotic

#### 🏗️ New Architecture Components

- **Scene Graph System** (`src/engine/SceneGraph.ts`)
  - Layer management with z-ordering (background, midground, foreground, UI)
  - Per-layer update/render cycles
  - Proper depth rendering for complex scenes

- **Sprite Manager** (`src/engine/SpriteManager.ts`)
  - Sprite class with position, animation frames, physics
  - Batch updates for performance
  - Collision detection helpers

- **Enhanced Particle System** (`src/engine/ParticleSystem.ts`)
  - Emitter patterns: point, line, area
  - Force fields: gravity, wind, vortex
  - Particle pooling for performance

#### 🎨 UI Components

- **StatusBar** (`src/ui/StatusBar.ts`)
  - Persistent bottom-row display
  - Shows: Pattern.Preset | Theme | FPS (color-coded) | Shuffle status | Help hint
  - FPS color coding: green (≥25), yellow (15-24), red (<15)

- **ToastManager** (`src/ui/ToastManager.ts`)
  - Notification toasts in top-right corner
  - Types: success (green), error (red), info (blue), warning (yellow)
  - Auto-dismiss after configurable duration
  - Stacked display (max 3 visible)

- **HelpOverlay** (`src/ui/HelpOverlay.ts`) - Enhanced
  - Tabbed interface: Controls, Commands, Patterns, Themes
  - Tab navigation with TAB/LEFT/RIGHT keys
  - Centered modal with border and styling

- **TransitionManager** (`src/renderer/TransitionManager.ts`)
  - Smooth transitions between pattern switches
  - Effects: crossfade, dissolve, wipe-left, wipe-right, instant
  - Configurable duration and easing functions
  - Built-in easing: linear, easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic, easeOutCubic

#### 🧪 Testing Infrastructure

- **Integration Tests** (`tests/integration/`)
  - `engine.test.ts`: Full render pipeline, pattern switching, resize handling
  - `commands.test.ts`: Command buffer, parser, executor pipeline

- **Visual Snapshot Tests** (`tests/visual/`)
  - `snapshot.test.ts`: Pattern visual characteristics, animation progression
  - Buffer snapshot utilities for visual regression testing

- **UI Component Tests** (`tests/unit/ui/`)
  - `toast.test.ts`: ToastManager singleton, show/dismiss, auto-expire (23 tests)
  - `help.test.ts`: HelpOverlay visibility, tab navigation (27 tests)
  - `statusbar.test.ts`: StatusBar state, FPS colors, segments (26 tests)
  - `transition.test.ts`: TransitionManager effects, easing (30 tests)

### Changed

- **Pattern count**: 23 patterns (up from 18)
- **Preset count**: 138 presets (up from 108)
- **Test count**: 2097 tests (up from 1505)
- **Test suites**: 48 suites (up from 32)

### Technical

- **Dependencies**: Added `simplex-noise@4.0.3` for organic motion in scene patterns
- **Architecture**: Patterns can now use SceneGraph for layered rendering
- **Rendering**: UI components render to buffer before terminal output
- **Transitions**: Pattern switches now have 300ms crossfade by default

### Performance

- **Scene patterns**: 4-6% CPU target per scene (variable by complexity)
  - Ocean Beach: ~4% CPU
  - Campfire: ~4% CPU
  - Aquarium: ~5-6% CPU (boids algorithm)
  - Night Sky: ~3-4% CPU
  - Snowfall Park: ~4% CPU
  - Metaball: ~5% CPU
- **Memory**: <60 MB total
- **Frame rate**: 60 FPS steady

## [0.2.0] - 2025-11-04

### ⚠️ BREAKING CHANGES

**This is a major version bump due to the ESM migration.**

- **ESM Migration**: Project now uses ECMAScript Modules (ESM) instead of CommonJS
  - **CLI users**: ✅ **NO CHANGES REQUIRED** - Installation and usage remain identical
  - **Library consumers** (if any): ⚠️ Must update to ESM syntax (`import` instead of `require()`)
  - Node.js 20+ required (already a requirement since v0.1.0)

### Changed

- **Module System**: Migrated from CommonJS to ESM
  - All source files now use ESM `import`/`export` syntax
  - All imports now include explicit `.js` file extensions (required by ESM)
  - `package.json` now has `"type": "module"`
  - TypeScript outputs ESM syntax (`"module": "Node16"`)
- **Dependencies**: Updated `conf` from v10.2.0 to v15.0.2 (ESM-compatible)
  - Primary motivation for ESM migration
  - Enables future updates to other modern ESM-only packages

### Technical

- **TypeScript Configuration**:
  - Changed `"module"` from `"commonjs"` to `"Node16"`
  - Changed `"moduleResolution"` to `"node16"` for proper ESM resolution
  - All compiled output uses ESM syntax
- **Jest Configuration**:
  - Renamed `jest.config.js` to `jest.config.mjs`
  - Configured for ESM testing with `--experimental-vm-modules`
  - Using `ts-jest` with ESM support
  - All 1505 tests passing with ESM configuration
- **Import Conventions**:
  - All relative imports include `.js` extensions (e.g., `'./Pattern.js'`)
  - ESM imports work correctly in both source TypeScript and compiled JavaScript
- **Build System**:
  - TypeScript compilation produces clean ESM output
  - Binary execution works correctly: `node dist/main.js`
  - Package exports configured for ESM

### Migration Details

**Phases Completed**:

1. ✅ Configuration updates (package.json, tsconfig.json, jest.config.mjs)
2. ✅ Code updates (added `.js` extensions to all imports)
3. ✅ Jest ESM compatibility fixes (explicit Jest imports, ESM mocking)
4. ✅ Build and runtime testing (all tests passing, application works)

**Files Modified**: 58 TypeScript files (source + tests)
**Test Results**: All 1505 tests passing, 28 test suites
**Coverage**: 92.35% (maintained and improved from 82.34%)

### For Library Consumers

If you use ascii-splash as a library (not via CLI), you'll need to update your code:

**Before (CommonJS):**

```javascript
const { AnimationEngine } = require('ascii-splash');
```

**After (ESM):**

```javascript
import { AnimationEngine } from 'ascii-splash';
```

**Note**: The vast majority of users install via `npm install -g ascii-splash` or use `npx ascii-splash`, which are **not affected** by this change.

## [0.1.5] - 2025-11-04

### Changed

- Updated `@types/node` to 24.10.0 (patch update for Node.js 24 type definitions)

### Maintenance

- Confirmed all 1505 tests passing with updated dependencies
- Maintained 82.34% test coverage
- **Note**: `conf` remains at v10.2.0 (v15+ requires ESM migration, planned for v0.2.0)

## [0.1.4] - 2025-11-04

### Added

- **Visual Demonstrations**: Added animated GIF previews to README showcasing 7 key patterns
  - Hero patterns: Starfield, Matrix, Fireworks, Lightning
  - Additional patterns: Plasma, Waves, DNA
  - Total media size: 4.8MB (optimized with gifsicle)
  - Enhanced first-impression experience for potential users
- **Recording Scripts**: Automated pattern recording workflow
  - `scripts/record-patterns.sh`: Records pattern demonstrations with asciinema
  - `scripts/convert-gifs.sh`: Converts recordings to GIF format with agg
  - `scripts/optimize-gifs.sh`: Optimizes GIFs with gifsicle (32% size reduction)
  - All scripts support batch processing and progress reporting

### Changed

- **README**: Added "Visual Preview" section with embedded pattern demonstrations
  - 2x2 hero pattern grid with descriptions
  - 1x3 additional patterns showcase
  - Improved visual appeal and user engagement
- **Documentation**: Added `docs/VISUAL_ENHANCEMENT_PLAN.md` with complete recording process

### Technical

- Recording settings: 80x24 terminal, 30 FPS cap, 10 seconds duration
- Optimization: lossy=80, colors=256, optimize=3
- Tools: asciinema 3.0.1, agg 1.7.0, gifsicle 1.96

## [0.1.3] - 2025-11-03

### Changed

- **Preset Standardization**: All 17 patterns now have exactly 6 presets each (102 total)
  - **WavePattern**: Reduced from 8 to 6 presets (removed "Glass Lake" and one duplicate)
  - **StarfieldPattern**: Reduced from 8 to 6 presets (consolidated similar variations)
  - **PlasmaPattern**: Reduced from 9 to 6 presets (removed redundant color variations)
  - **RainPattern**: Reduced from 9 to 6 presets (streamlined intensity variations)
  - Improved consistency: All patterns follow the same 6-preset structure
  - Enhanced user experience with predictable preset cycling (`.` and `,` keys)
  - Command system now consistent across all patterns (`c01-c06`)

### Fixed

- **FireworksPattern**: Race condition where particle count could exceed hard caps during concurrent explosions
  - Now recalculates total particle count immediately before spawning secondary bursts (400 cap)
  - Now recalculates total particle count immediately before spawning sparkles (450 cap)
  - Prevents performance degradation from excessive particles
  - Added comprehensive unit tests for concurrent spawn scenarios

### Tests

- Updated all pattern tests to reflect new 6-preset structure
- All 1505 tests passing with zero regressions (1503 existing + 2 new Fireworks race condition tests)
- Test suites updated: wave.test.ts, starfield.test.ts, plasma.test.ts, additional-patterns.test.ts, presets.test.ts, fireworks.test.ts

### Added

- **Visual Enhancements**: Comprehensive improvements to all 17 patterns with new visual effects
  - **Starfield**: Star twinkling effect with individual twinkle rates and phases for organic shimmer
  - **Wave**: Foam/whitecap effects on wave crests with intermittent foam generation
  - **Rain**: Wind and gust effects creating diagonal rain with variable wind speeds
  - **Plasma**: Color cycling through theme palette with configurable shift speeds and 3 new presets
  - **Matrix**: Size variation for columns, fading heads, and enhanced column density
  - **Spiral**: Multi-arm bursts, branch angles, and variable rotation speeds
  - **Tunnel**: Independent ring speeds, depth pulsing, and boost mode for dynamic effects
  - **Lightning**: Variable branch angles, fork distance variation, and pulsing walls for electric atmosphere
  - **Snow**: Particle size pulsing during fall creating breathing/shimmer effect
  - **DNA**: Base pair pulsing/breathing animation on connecting lines and base labels
  - **Smoke**: Enhanced height-based temperature gradient with cooling effect as particles rise
  - **Fireworks**: Multi-stage recursive explosions with sparkle particles and shaped bursts
    - 3-level depth explosions (primary → secondary → tertiary bursts)
    - Sparkle particles (bright white/yellow, fast, short-lived)
    - 5 burst shapes: circle, ring, heart, star, random
    - Rainbow color variation within bursts blending HSV rainbow with theme colors
    - Performance: All presets under 500 particles, <1000 writes/frame
  - **LavaLamp**: Temperature-based color variation modulating blob intensity
  - **Particle**: Particle trails with fading opacity showing motion history
  - **Life**: Cell age-based coloring where older cells glow brighter (ages 0-20)
  - **Maze**: Solved path highlighting using BFS pathfinding with visual path overlay
  - **Quicksilver**: Surface tension variation using noise field affecting droplet behavior

### Changed

- All 17 patterns now include enhanced visual effects while maintaining performance targets
- Presets updated across patterns to showcase new visual enhancements
- Pattern rendering more dynamic and visually engaging across the board

## [0.1.2] - 2025-11-03

### Fixed

- **Time Handling Consistency**: Fixed 7 patterns using `Date.now()` directly instead of `time` parameter
  - Affected patterns: Wave, Starfield, Rain, DNA, Lightning, Plasma, Quicksilver
  - **Impact**: Enables proper time-based testing, pause/resume functionality, and consistent behavior
  - Each pattern now tracks `currentTime` internally and uses it in mouse handlers
  - All patterns properly reset `currentTime` to 0 in `reset()` method
- **Reset Method Cleanup**: Audited and fixed `reset()` methods across all patterns
  - Ensures clean state when switching patterns
  - Prevents stale time values and other state from carrying over

### Changed

- **Metrics Naming Standardization**: All patterns now use camelCase for metric keys
  - SnowPattern updated: `'Active Particles'` → `activeParticles`, `'Accumulated'` → `accumulated`, `'Avg Velocity'` → `avgVelocity`
  - Consistent naming across all 17 patterns improves debug overlay readability
  - Updated 15+ test assertions to match new naming convention

### Performance

- **Spiral Pattern**: Optimized distance calculations with early rejection
  - Only calls `Math.sqrt()` when particles are within range
  - Prevents wasted computation on out-of-bounds particles
- **Tunnel Pattern**: Optimized character selection using squared distance
  - Reduced unnecessary `sqrt()` calls in pulse rendering
  - Maintains identical visual output with better performance
- **Quicksilver Pattern**: Added early rejection in ripple/droplet effect loops
  - Uses squared distance for boundary checks before computing actual distance
  - Reduces expensive calculations in nested pixel loops
- **Life Pattern**: Implemented neighbor count caching
  - Added `neighborCounts[][]` grid to store computed values
  - Cache updated once per generation, reused in render method
  - **Major win**: Eliminates redundant `countNeighbors()` calls per frame
  - Significantly improves performance for Game of Life simulation

### Added

- **Pattern Enhancement Plan**: Added comprehensive `PATTERN_ENHANCEMENT_PLAN.md`
  - Documents systematic analysis of all 17 patterns
  - Tracks completed and planned improvements
  - Phase 1 (Critical Fixes) and Phase 2 (Performance) completed

### Tests

- All 1407 tests passing
- Zero regressions introduced
- All optimizations maintain visual parity with original implementations

## [0.1.1] - 2025-11-02

### Fixed

- **Text Overlay Display**: Fixed critical UX issue where text overlays were overwritten by pattern rendering
  - Command mode overlay, pattern mode overlay, and debug info now properly persist
  - Root cause: Text rendered on input events but pattern buffer cleared/re-rendered 30-60x per second
  - Solution: Consolidated all overlay rendering into `afterRenderCallback()` for correct z-order
  - Removed 18+ redundant overlay render calls from event handlers
  - Significantly improves user experience when using command mode or pattern selection

### Added

- **GitHub Actions CI/CD Pipeline**: Complete automated testing and release infrastructure
  - **CI Workflow**: Runs on push/PR to main/develop branches
    - Tests on Node.js 20, 22 for compatibility
    - TypeScript compilation checks
    - Build verification and package validation
    - Coverage upload to Codecov
  - **Release Workflow**: Automated npm publishing on git tag push (v*.*.\*)
    - Full test suite execution
    - Version/tag verification
    - Automated npm publish (requires NPM_TOKEN secret)
    - GitHub Release creation with changelog notes
  - **Dependency Review**: Security scanning for pull requests
    - Vulnerability checks for new dependencies
    - Automated PR comments with security findings
  - **Documentation**: Comprehensive guides added
    - `docs/RELEASE_PROCESS.md`: Full release workflow guide
    - `docs/QUICK_RELEASE.md`: Quick reference for releases
    - `docs/GITHUB_ACTIONS.md`: Workflow documentation
- **Build Script**: Added `lint` script to package.json for type-checking (`npm run lint`)
- **Test Suite Expansion**: Comprehensive unit tests for additional patterns
  - Added tests for: Fireworks, Plasma, Quicksilver, Rain, Starfield patterns
  - Added utility module tests: drawing.ts, math.ts, noise.ts
  - **Test Results**: 1357 tests passing, 26 test suites

### Changed

- **Test Suite Refactoring**: Updated tests for refactored Spiral and Tunnel patterns
  - SpiralPattern: Complete test rewrite (67 tests) for particle-based architecture
    - Updated property names: `spiralCount` → `armCount`
    - Updated preset names: "Twin Vortex" → "Twin Helix", "Nautilus Shell" → "DNA Double Helix"
    - New metrics: `particles`, `arms`, `bursts`
  - TunnelPattern: Created comprehensive test suite (67 tests)
    - Tests all 6 presets with new metrics: `rings`, `particles`, `boost`
  - **Pattern Coverage**: SpiralPattern 99.24%, TunnelPattern 100%
- **Test Infrastructure**: Organized manual test scripts into `tests/manual/` directory

## [0.1.0] - 2025-11-02

### 🎉 Initial Release

The first public release of ascii-splash - a terminal ASCII animation app with visual flow for your IDE workspace.

**Published to npm**: https://www.npmjs.com/package/ascii-splash  
**GitHub Release**: https://github.com/reowens/ascii-splash/releases/tag/v0.1.0  
**Installation**: `npm install -g ascii-splash` or `npx ascii-splash`

### Changed (Breaking Changes - Keyboard Controls)

- **BREAKING**: Command mode key changed from `0` to `c` for better mnemonics
  - Old: `0` prefix for commands (e.g., `01`, `0p3`, `0t2`)
  - New: `c` prefix for commands (e.g., `c01`, `cp3`, `ct2`)
  - Reason: `c` is more intuitive (stands for "command") and follows keyboard proximity patterns
- **Renamed**: "Quality presets" → "Performance mode" throughout CLI, help text, and documentation
  - Avoids confusion between quality presets and pattern presets
  - More accurately describes LOW/MEDIUM/HIGH FPS settings

### Added (Phase 6 - Keyboard Improvements)

- **Preset cycling**: Press `.` for next preset, `,` for previous preset
  - Explore all 102 presets easily without memorizing preset numbers
  - Wraps around at boundaries (preset 6 → preset 1)
  - Visual feedback shows current preset number
- **Previous pattern navigation**: Press `b` to go back to previous pattern
  - Complements existing `n` (next) key for bi-directional pattern browsing
  - Wraps around (pattern 1 → pattern 17)
- **Quick random**: Press `r` for instant random pattern + preset + theme
  - Shortcut for `c**` command
  - Perfect for discovering new combinations quickly
- **Quick save**: Press `s` to save current configuration to file
  - Shortcut for `cs` command
  - Persists current pattern, preset, theme, and settings
- **Enhanced help overlay**: Updated with all new keyboard shortcuts and clearer organization

### Added (Phase 6 - UI/UX Improvements)

- **Enhanced Pattern Selection**: New interactive pattern mode activated by pressing `p`
  - Type pattern number: `p12` → Pattern 12
  - Type pattern name: `pwaves` → Waves pattern
  - Type pattern.preset combo: `p3.5` → Pattern 3, Preset 5
  - Press `p` then Enter (empty) → Previous pattern (original behavior)
  - 5-second timeout with visual feedback (yellow "PATTERN:" overlay)
  - ESC to cancel, partial name matching supported
  - Replaces old `p` = previous pattern (now requires empty input + Enter)
  - Updated help overlay and documentation

### Added (Phase 6 - Release Preparation)

- **DNA Helix Pattern**: Double helix rotation with base pairs (A-T, G-C, T-A, C-G)
  - 6 presets: Slow Helix, Fast Spin, Unwinding, Replication, Mutation, Rainbow
  - Mouse move creates twist effect, click spawns mutations
  - Configurable rotation speed, helix radius, base pair density, twist rate
  - 30 comprehensive unit tests
- **Lava Lamp Pattern**: Metaball-based lava lamp simulation with organic blob shapes
  - 6 presets: Classic, Turbulent, Gentle, Many Blobs, Giant Blob, Strobe
  - Physics simulation with buoyancy, drift, turbulence (Perlin noise), and gravity
  - Vertical wrapping for continuous lava lamp cycle effect
  - Mouse attracts/repels blobs with force field, click spawns new blobs (max 20)
  - Intensity-based character rendering (█▓▒░) for depth effect
  - 35 comprehensive unit tests
- **Smoke Pattern**: Physics-based smoke particle simulation with realistic rising behavior
  - 6 presets: Gentle Wisp, Campfire, Industrial, Incense, Fog, Steam
  - Rising smoke plumes with Perlin noise turbulence for organic movement
  - Realistic particle opacity and dissipation over time
  - Height-based color gradient for natural smoke appearance
  - Mouse creates force field to blow smoke away, click spawns 15-particle burst
  - Configurable plume count, particle density, rise speed, dissipation rate
  - 37 comprehensive unit tests
- **Snow Pattern**: Falling particle system with seasonal effects
  - 6 presets: Light Flurries, Blizzard, Cherry Blossoms, Autumn Leaves, Confetti, Ash
  - Realistic downward falling motion with gravity and wind drift
  - Perlin noise turbulence for natural movement
  - Particle rotation as they fall for added realism
  - Ground accumulation feature (optional) for settled particles
  - 5 particle types: snow, cherry blossoms, autumn leaves, confetti, ash
  - Mouse creates wind force field pushing particles, click spawns 20-particle burst
  - Configurable particle count, fall speed, wind strength, turbulence, rotation
  - 48 comprehensive unit tests
- Utility modules for advanced pattern development:
  - `math.ts`: 3D projection, rotation matrices, complex numbers
  - `noise.ts`: Perlin noise implementation for organic effects
  - `drawing.ts`: Line drawing, symmetry helpers
  - `metaballs.ts`: Metaball field calculations for blob rendering

### Fixed (Release Preparation - November 2, 2025)

- **TTY Guard**: Added `checkTTY()` function to prevent execution in non-interactive environments
  - Gracefully handles pipes, redirects, and cron jobs with helpful error message
  - Allows `--help` and `--version` to work without TTY
- **Signal Handlers**: Added global handlers for SIGINT, SIGTERM, uncaughtException, unhandledRejection
  - Ensures terminal cleanup always runs before exit
  - Prevents terminal from being left in raw mode on crash
- **Terminal Cleanup**: Removed forced `processExit()` call from TerminalRenderer
  - Renderer now only restores terminal state
  - Makes embedding and testing safer
- **Help Text**: Corrected pattern count from "all 16" to "all 17"
- **Windows Config Path**: Fixed README documentation to show `.splashrc.json` instead of `config.json`
- **Package Description**: Updated to reflect current feature set (17 patterns, 102 presets, 5 themes)
- **Dependencies**: Removed unused `chalk` dependency

### Changed

- Pattern count increased from 13 to 17
- Total presets increased from 78 to 102
- Test suite expanded to 803 total tests
- Main function now returns cleanup handler for better control flow

### ✨ Features

#### 🎨 13 Interactive Patterns (v1.0.0)

- **Waves**: Sine wave animations with ripple effects
- **Starfield**: 3D parallax starfield with force fields
- **Matrix**: Digital rain effect with column spawning
- **Rain**: Falling droplets with splash effects
- **Quicksilver**: Liquid metal flow simulation
- **Particles**: Physics-based particle system
- **Spiral**: Rotating logarithmic spirals
- **Plasma**: Fluid plasma energy effect
- **Tunnel**: 3D geometric tunnel zoom
- **Lightning**: Branching electric arcs
- **Fireworks**: Explosive particle bursts
- **Life**: Conway's Game of Life cellular automaton
- **Maze**: Dynamic maze generation and solving

#### 🎭 78 Built-in Presets (v1.0.0)

- **6 presets per pattern** (13 patterns × 6 = 78 total)
- Each preset offers unique visual variations
- Examples: "Ocean Storm", "Warp Speed", "Tesla Coil", "Grand Finale"
- Access via command system: `01-99` for quick loading

#### 🌈 5 Color Themes

- **Ocean**: Blues, cyans, teals (default, calm and soothing)
- **Matrix**: Green monochrome (classic hacker aesthetic)
- **Starlight**: Deep blues, purples, white (cosmic space)
- **Fire**: Reds, oranges, yellows (warm and energetic)
- **Monochrome**: Grayscale gradient (clean and minimal)
- All patterns automatically adapt to themes
- Cycle with `t` key or jump directly with `0t2`, `0tfire`

#### 🖱️ Full Mouse Support

- **Mouse Move**: Pattern-specific hover effects (ripples, force fields, distortion)
- **Mouse Click**: Burst animations, spawning effects, mode toggles
- **Examples**: Click for splash in Waves, spawn bolts in Lightning, launch fireworks
- Enable/disable with `--no-mouse` CLI flag

#### ⌨️ Advanced Command System

- **Dual-layer input**: Direct keys (instant) + Command buffer (extended features)
- **Command Buffer** (prefix with `c`):
  - Presets: `c01-c99` (load preset)
  - Favorites: `cf1-cf99` (load), `cF1-cF99` (save), `cfl` (list)
  - Pattern jumps: `cp3`, `cp3.5`, `cpwaves`
  - Theme commands: `ct2`, `ctfire`, `ctr` (random)
  - Special: `c*` (random preset), `c**` (random all), `c?` (list presets), `c??` (catalog)
  - Shuffle: `c!` (toggle, 10s default), `c!5` (custom interval), `c!!` (shuffle all)
  - Combinations: `cp3+05+t2` (pattern + preset + theme)
- **10-second timeout** with visual feedback
- **Command history** with up/down arrow navigation

#### 💾 Favorites System

- Save current state (pattern + preset + theme) to slots 1-99
- Persistent storage in config file
- Quick recall with `0f#` commands
- List all saved favorites with `0fl`
- Includes timestamps and optional notes

#### 🔀 Shuffle Mode

- **Auto-cycle presets** at regular intervals (1-300 seconds)
- Two modes:
  - Preset shuffle (`0!`): Cycles presets of current pattern
  - Full shuffle (`0!!`): Randomizes pattern + preset + theme
- Configurable interval: `0!5` for 5-second cycles
- Perfect for ambient background animations

#### ⚙️ Configuration System

- **Config file**: `~/.config/ascii-splash/.splashrc.json`
- **Merge priority**: CLI args > config file > defaults
- **Global settings**: defaultPattern, quality, fps, theme, mouseEnabled
- **Pattern-specific configs**: Customize each pattern's behavior
- **Favorites storage**: Persisted across sessions
- **CLI arguments**: `--pattern`, `--quality`, `--fps`, `--theme`, `--no-mouse`

#### 📊 Performance Monitoring

- Real-time FPS display with 60-frame rolling average
- Frame time breakdown (update, pattern render, terminal render)
- Changed cell count tracking
- Frame drop detection
- Pattern-specific metrics
- Toggle debug overlay with `d` key
- **Target**: <5% CPU idle, <50MB RAM

#### 🎯 Performance Mode

- **LOW**: 20 FPS - Battery saver mode
- **MEDIUM**: 30 FPS - Balanced (default)
- **HIGH**: 60 FPS - Smooth animations
- Cycle with `[` / `]` keys
- Set via `--quality` CLI flag or config file

#### 🔧 Double-Buffering Renderer

- Flicker-free rendering with dirty cell tracking
- Only changed cells are redrawn each frame
- Efficient terminal output with minimal writes
- Automatic terminal resize handling

### 📦 Distribution

- **npm package**: `ascii-splash`
- **Global install**: `npm install -g ascii-splash`
- **Run with npx**: `npx ascii-splash`
- **Binary name**: `splash`
- **Package size**: 124.2 kB (137 files)

### 🧪 Testing

- **817 tests**, all passing ✅
- **82.34% code coverage**
- 16 test suites covering:
  - All 17 patterns with preset validation and buffer fill tests
  - Configuration system (defaults, loader, themes)
  - Engine components (animation, performance, command system)
  - Renderer (buffer, terminal)
- Comprehensive pattern testing (rendering, mouse events, presets, state)

### 📚 Documentation

- **README.md**: Installation, usage, features overview
- **CLAUDE.md**: Development guide, architecture, pattern development
- **examples/.splashrc.example**: Comprehensive config file example
- **docs/ARCHITECTURE.md**: Technical architecture and design patterns
- **docs/TESTING_PLAN.md**: Testing strategy and coverage goals
- **docs/PROJECT_STATUS.md**: Current status and feature completion

### 🎮 Controls Reference

**Direct Keys** (instant actions):

- `1-9`: Switch to patterns 1-9
- `n` / `b`: Next/Previous pattern
- `.` / `,`: Next/Previous preset
- `p`: Pattern mode (interactive selection)
- `SPACE`: Pause/Resume
- `t`: Cycle themes
- `r`: Random pattern + preset + theme
- `s`: Save configuration
- `+` / `-`: Adjust FPS
- `[` / `]`: Cycle performance mode (LOW/MEDIUM/HIGH)
- `d`: Toggle debug overlay
- `?`: Toggle help overlay
- `q` / `ESC` / `Ctrl+C`: Quit

**Command Buffer** (prefix with `c`):

- See command system features above

### 🛠️ Technical Details

- **Language**: TypeScript, compiled to ES2020 CommonJS
- **Runtime**: Node.js 20+
- **Key Dependencies**:
  - `terminal-kit`: Terminal control and mouse input
  - `commander`: CLI argument parsing
  - `conf`: Cross-platform config file management
- **Architecture**: 3-layer design (Renderer, Engine, Pattern)
- **License**: MIT

### 🙏 Acknowledgments

Built with `terminal-kit` for terminal control and inspired by classic terminal screensavers.

---

## Future Releases

**Potential future enhancements**:

- Additional patterns and presets
- Custom pattern creation API
- Plugin system
- Web-based preset editor
- Performance optimizations
- Extended terminal emulator support

[Unreleased]: https://github.com/reowens/ascii-splash/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/reowens/ascii-splash/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/reowens/ascii-splash/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/reowens/ascii-splash/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/reowens/ascii-splash/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/reowens/ascii-splash/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/reowens/ascii-splash/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/reowens/ascii-splash/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/reowens/ascii-splash/releases/tag/v0.1.0
