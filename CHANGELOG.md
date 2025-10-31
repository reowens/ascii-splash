# Changelog

All notable changes to ascii-splash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-30

### 🎉 Initial Release

The first stable release of ascii-splash - a terminal ASCII animation app with visual flow for your IDE workspace.

### ✨ Features

#### 🎨 13 Interactive Patterns
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

#### 🎭 78 Built-in Presets
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
- **Command Buffer** (prefix with `0`):
  - Presets: `01-99` (load preset)
  - Favorites: `0f1-0f99` (load), `0F1-0F99` (save), `0fl` (list)
  - Pattern jumps: `0p3`, `0p3.5`, `0pwaves`
  - Theme commands: `0t2`, `0tfire`, `0tr` (random)
  - Special: `0*` (random preset), `0**` (random all), `0?` (list presets), `0??` (catalog)
  - Shuffle: `0!` (toggle, 10s default), `0!5` (custom interval), `0!!` (shuffle all)
  - Combinations: `0p3+05+t2` (pattern + preset + theme)
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

#### 🎯 Quality Presets
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
- **Package size**: 79.7 kB (96 files)

### 🧪 Testing

- **653 tests**, all passing ✅
- **83.01% code coverage**
- 12 test suites covering:
  - All 13 patterns with preset validation (including Life and Maze)
  - Configuration system (defaults, loader, themes)
  - Engine components (animation, performance, command system)
  - Renderer (buffer, terminal)
- Comprehensive pattern testing (rendering, mouse events, presets, state)

### 📚 Documentation

- **README.md**: Installation, usage, features overview
- **CLAUDE.md**: Development guide, architecture, pattern development
- **examples/.splashrc.example**: Comprehensive config file example
- **docs/PLAN.md**: Project roadmap and phase completion
- **docs/TESTING_PLAN.md**: Testing strategy and coverage goals
- **docs/PROJECT_STATUS.md**: Current status and next steps

### 🎮 Controls Reference

**Direct Keys** (instant actions):
- `1-9`: Switch to patterns 1-9
- `n` / `p`: Next/Previous pattern
- `SPACE`: Pause/Resume
- `t`: Cycle themes
- `+` / `-`: Adjust FPS
- `[` / `]`: Cycle quality presets
- `d`: Toggle debug overlay
- `?`: Toggle help overlay
- `q` / `ESC` / `Ctrl+C`: Quit

**Command Buffer** (prefix with `0`):
- See command system features above

### 🛠️ Technical Details

- **Language**: TypeScript, compiled to ES2020 CommonJS
- **Runtime**: Node.js 16+
- **Key Dependencies**:
  - `terminal-kit`: Terminal control and mouse input
  - `chalk`: Color output
  - `commander`: CLI argument parsing
  - `conf`: Cross-platform config file management
- **Architecture**: 3-layer design (Renderer, Engine, Pattern)
- **License**: MIT

### 🙏 Acknowledgments

Built with `terminal-kit` for terminal control and inspired by classic terminal screensavers.

---

## Future Releases

See [docs/PLAN.md](docs/PLAN.md) for planned features and improvements.

**Potential future enhancements**:
- Additional patterns and presets
- Custom pattern creation API
- Plugin system
- Web-based preset editor
- Performance optimizations
- Extended terminal emulator support

[1.0.0]: https://github.com/reowens/ascii-splash/releases/tag/v1.0.0
