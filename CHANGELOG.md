# Changelog

All notable changes to ascii-splash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  - **Release Workflow**: Automated npm publishing on git tag push (v*.*.*)
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

[Unreleased]: https://github.com/reowens/ascii-splash/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/reowens/ascii-splash/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/reowens/ascii-splash/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/reowens/ascii-splash/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/reowens/ascii-splash/releases/tag/v0.1.0
