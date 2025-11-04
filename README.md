# ascii-splash

[![npm version](https://img.shields.io/npm/v/ascii-splash.svg)](https://www.npmjs.com/package/ascii-splash)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/ascii-splash.svg)](https://nodejs.org)

**A terminal ASCII animation app that adds visual flow to your IDE workspace.**

Transform your terminal into a mesmerizing visual experience with **17 interactive patterns**, **102 presets**, 5 color themes, and a powerful command system. Perfect as an ambient background for your coding sessions!

---

## ✨ Features

- 🎨 **17 Interactive Patterns** - Waves, Starfield, Matrix, Rain, Quicksilver, Particles, Spiral, Plasma, Tunnel, Lightning, Fireworks, Life, Maze, DNA, Lava Lamp, Smoke, Snow
- 🎯 **102 Total Presets** - 6 carefully crafted variations for each pattern
- 🌈 **5 Color Themes** - Ocean, Matrix, Starlight, Fire, Monochrome (all patterns adapt)
- ⌨️ **Advanced Command System** - Multi-key commands for quick pattern/preset/theme switching
- 💾 **Favorites System** - Save and recall your favorite combinations
- 🔀 **Shuffle Mode** - Auto-cycle presets or entire configurations
- 🖱️ **Full Mouse Support** - Interactive effects with mouse movement and clicks
- ⚡ **High Performance** - <5% CPU usage with double-buffered rendering
- 🎛️ **Quality Presets** - LOW (15 FPS), MEDIUM (30 FPS), HIGH (60 FPS)
- 📝 **Configuration File** - Persistent settings with JSON config
- 🔧 **CLI Arguments** - Flexible command-line options

---

## 🚀 Quick Start

```bash
# Run instantly with npx (no install required)
npx ascii-splash

# Or install globally
npm install -g ascii-splash
splash
```

**Local Development:**
```bash
git clone https://github.com/reowens/ascii-splash.git
cd ascii-splash
npm install
npm run build
npm start
```

---

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g ascii-splash
splash
```

### Using npx (No Install)

```bash
npx ascii-splash
```

### Local Development

```bash
git clone https://github.com/reowens/ascii-splash.git
cd ascii-splash
npm install
npm run build
npm start
```

## ⚙️ Command Line Options

```bash
# Run with defaults (medium quality, waves pattern, mouse enabled)
splash

# Start with specific pattern
splash --pattern starfield
splash -p matrix

# Set performance mode
splash --quality high
splash -q low

# Custom FPS (overrides performance mode)
splash --fps 45
splash -f 15

# Set color theme
splash --theme fire
splash -t matrix

# Disable mouse interaction
splash --no-mouse

# Combine options
splash --pattern quicksilver --quality high --theme starlight --no-mouse

# Show version
splash --version
splash -V

# Show help
splash --help
splash -h
```

### Available Options

| Option | Short | Description | Values |
|--------|-------|-------------|--------|
| `--pattern` | `-p` | Starting pattern | waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma, tunnel, lightning, fireworks, life, maze, dna, lavalamp, smoke, snow |
| `--quality` | `-q` | Performance mode | low, medium (default), high |
| `--fps` | `-f` | Custom FPS (10-60) | Number (overrides performance mode FPS) |
| `--theme` | `-t` | Color theme | ocean (default), matrix, starlight, fire, monochrome |
| `--no-mouse` | | Disable mouse | Flag (no value) |
| `--version` | `-V` | Show version | |
| `--help` | `-h` | Show help | |

## 📝 Configuration File

ascii-splash supports persistent configuration via a JSON file at:
- **Linux/macOS**: `~/.config/ascii-splash/.splashrc.json`
- **Windows**: `%APPDATA%\ascii-splash\.splashrc.json`

Settings merge with priority: **CLI args** > **Config file** > **Defaults**

> 💡 **For technical details** (ConfigLoader, schema, implementation), see [docs/ARCHITECTURE.md#configuration-system](docs/ARCHITECTURE.md#configuration-system)

### Example Configuration

See [examples/.splashrc.example](examples/.splashrc.example) for a complete example with all available options.

```json
{
  "defaultPattern": "waves",
  "quality": "medium",
  "fps": 30,
  "mouseEnabled": true,
  
  "patterns": {
    "waves": {
      "frequency": 0.1,
      "amplitude": 3,
      "speed": 1.0,
      "layers": 3,
      "rippleDuration": 2000
    },
    "starfield": {
      "starCount": 200,
      "speed": 50,
      "forceFieldRadius": 15,
      "forceFieldStrength": 200
    }
  }
}
```

### Available Settings

**Global Settings:**
- `defaultPattern` - Starting pattern (waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma, tunnel, lightning, fireworks, life, maze, dna, lavalamp, smoke, snow)
- `quality` - Quality preset (low, medium, high)
- `fps` - Target frames per second (10-60)
- `theme` - Color theme (ocean, matrix, starlight, fire, monochrome)
- `mouseEnabled` - Enable/disable mouse interaction

**Pattern-Specific Settings:**

Each pattern has its own configuration options. See [examples/.splashrc.example](examples/.splashrc.example) for details:
- `waves` - frequency, amplitude, speed, layers, rippleDuration
- `starfield` - starCount, speed, forceFieldRadius, forceFieldStrength
- `matrix` - columnDensity, speed, fadeTime, distortionRadius
- `rain` - dropCount, speed, splashDuration
- `quicksilver` - blobCount, speed, viscosity, mousePull
- `particles` - particleCount, speed, gravity, mouseForce, spawnRate
- `spiral` - spiralCount, rotationSpeed, armLength, density, expandSpeed
- `plasma` - frequency, speed, complexity
- `tunnel` - shape, ringCount, ringSpacing, speed, rotationSpeed, radius
- `lightning` - boltDensity, branchProbability, branchAngle, fadeTime, strikeInterval, maxBranches, thickness
- `fireworks` - burstSize, launchSpeed, gravity, fadeRate, spawnInterval, trailLength
- `life` - cellSize, updateFrequency, initialDensity, birthChance, survivalChance
- `maze` - cellSize, generationSpeed, algorithm

### Creating Your Config

1. Copy the example config:
   ```bash
   mkdir -p ~/.config/ascii-splash
   cp examples/.splashrc.example ~/.config/ascii-splash/.splashrc.json
   ```

2. Edit `~/.config/ascii-splash/.splashrc.json` with your preferences

3. Run splash - your settings will be loaded automatically!

## 🎮 Controls

### ⌨️ Keyboard
- **c**: Command mode (advanced multi-key commands - presets, favorites, search, shuffle)
- **1-9**: Switch to pattern 1-9
- **n/b**: Next/Previous pattern (cycles through all 17 patterns)
- **./,**: Next/Previous preset (cycles through 6 presets per pattern)
- **p**: Pattern mode - Type pattern number, name, or pattern.preset combo:
  - `p` → `12` → Enter: Switch to pattern 12
  - `p` → `3.5` → Enter: Switch to pattern 3, preset 5
  - `p` → `waves` → Enter: Switch to waves pattern
  - `p` → Enter (empty): Previous pattern
  - 5-second timeout or ESC to cancel
- **r**: Random (pattern + preset + theme)
- **s**: Save current config to file
- **Space**: Pause/Resume
- **+/-**: Adjust FPS (10-60)
- **[/]**: Cycle performance modes (LOW/MEDIUM/HIGH)
- **t**: Cycle color themes
- **?**: Toggle help overlay
- **d**: Toggle debug info (performance metrics)
- **q/ESC/Ctrl+C**: Exit

### 🖱️ Mouse
- **Move**: Interactive effects (ripples, repulsion, distortion, spawning)
- **Click**: Special effects (big splash, explosion, spawn columns/drops)

## 🌈 Color Themes

Press `t` to cycle through 5 beautiful color themes:

### Ocean (Default)
- Blues, cyans, and teals
- Calm and soothing palette
- Perfect for waves and water patterns

### Matrix
- Classic green monochrome
- Hacker aesthetic
- Pairs perfectly with Matrix pattern

### Starlight
- Deep blues, purples, and white
- Cosmic space theme
- Ideal for starfield effect

### Fire
- Reds, oranges, and yellows
- Warm and energetic
- Great for high-energy patterns

### Monochrome
- Grayscale gradient
- Clean and minimal
- Works with everything

Each theme uses color interpolation to provide smooth gradients. All patterns automatically adapt to the selected theme!

> 💡 **For technical details** (theme interface, color interpolation algorithm), see [docs/ARCHITECTURE.md#theme-system](docs/ARCHITECTURE.md#theme-system)

## 🎨 Patterns

### 1. Waves (Press 1)
Smooth flowing sine waves with ripple effects
- Multiple wave layers (1-5 depending on quality)
- Mouse creates ripples
- Click for big splashes
- Ocean color gradient
- **Metrics**: Active ripples, wave layers

### 2. Starfield (Press 2)
3D starfield with parallax depth
- Stars move toward viewer (50-200 stars)
- Mouse repels stars (force field)
- Click creates explosion burst
- Size varies with depth
- **Metrics**: Star count, active explosions

### 3. Matrix (Press 3)
Classic digital rain effect
- Falling character columns
- Katakana characters
- Mouse distorts characters
- Click spawns new columns
- **Metrics**: Column count, density

### 4. Rain (Press 4)
Simple falling droplets
- Drops bounce off mouse cursor
- Mouse spawns extra drops
- Click creates splash effects
- Ground splash animations
- **Metrics**: Active drops, splashes

### 5. Quicksilver (Press 5)
Flowing liquid mercury effect
- Organic metallic liquid flow using Perlin noise
- Silver/chrome color gradients
- Mouse creates ripples in metal surface
- Click spawns mercury droplets with physics
- Reflective surface simulation
- **Metrics**: Active droplets, ripples, flow intensity

### 6. Particles (Press 6)
Physics-based particle system
- Particles with gravity, velocity, and collision
- Mouse attract/repel toggle (click to switch)
- Click creates burst of 20 particles
- Boundary bouncing with energy loss
- Theme-based coloring by velocity
- **Metrics**: Particle count, mode (attract/repel)

### 7. Spiral (Press 7)
Rotating logarithmic spirals
- Multiple spiral arms (3 default)
- Continuous rotation animation
- Mathematical spiral formula
- Distance-based intensity
- Theme-based gradient coloring
- **Metrics**: Arm count, point count

### 8. Plasma (Press 8)
Fluid plasma effect
- Multiple sine wave combination
- Smooth color transitions
- Circular and diagonal wave patterns
- Theme-based intensity coloring
- Continuous animation
- **Metrics**: Wave count, complexity level
- **6 Presets**: Gentle Waves, Standard Plasma, Turbulent Energy, Lava Lamp, Electric Storm, Cosmic Nebula

### 9. Tunnel (Press 9)
3D geometric tunnel with perspective
- Multiple shape modes: circle, square, triangle, hexagon, star
- Perspective projection with depth
- Rotation animation for hypnotic effect
- Mouse parallax (shifts vanishing point)
- Click reverses direction + speed boost
- **Metrics**: Ring count, shape, speed, depth
- **6 Presets**: Circle Tunnel, Hyperspeed, Square Vortex, Triangle Warp, Hexagon Grid, Stargate

### 10. Lightning
Electric bolts with recursive branching
- Bresenham line algorithm for bolt segments
- Recursive branching (probability-based)
- Flash effect with fade-out
- Auto-strikes at intervals
- Mouse creates charge particles
- Click spawns 3-4 area bolts
- **Metrics**: Bolt count, branch count, charge particles
- **6 Presets**: Cloud Strike, Tesla Coil, Ball Lightning, Fork Lightning, Chain Lightning, Spider Lightning

### 11. Fireworks
Particle explosions with physics
- 3-phase lifecycle: launch → explode → fall
- Particle trails with history tracking
- Theme-based burst colors with fade
- Gravity and velocity physics
- Auto-spawn timer
- Click for instant 1.5x explosion
- **Metrics**: Active fireworks, particle count, explosions
- **6 Presets**: Sparklers, Grand Finale, Fountain, Roman Candle, Chrysanthemum, Strobe

### 12. Life (Press n from Pattern 11)
Conway's Game of Life cellular automaton
- Classic infinite cellular automaton simulation
- Life/death rules with configurable birth/survival thresholds
- Generates complex living patterns (gliders, oscillators, still lifes)
- Mouse click to toggle cells on/off (paint mode)
- Patterns evolve with natural emergence behavior
- **Metrics**: Living cells, generation count, pattern stability
- **6 Presets**: Still Life, Beehive, Gliders, Oscillators, Garden, Chaos

### 13. Maze (Press n from Pattern 12)
Dynamic maze generation and solving
- Multiple generation algorithms (Recursive Backtrack, Aldous-Broder, Prim, Hunt-Kill, Wilson, Braid)
- Animated maze generation with visual pathfinding
- Click to generate new maze with current algorithm
- Supports different cell sizes for various visual styles
- Perfect for hypnotic ambient animations
- **Metrics**: Maze cells, generation progress, algorithm type
- **6 Presets**: Recursive Backtrack, Aldous-Broder, Prim, Hunt-Kill, Wilson, Braid

### 14. DNA (Press n from Pattern 13)
Double helix DNA strand animation
- Rotating double helix structure with base pairs
- Smooth 3D perspective projection
- Base pair connections with proper geometry
- Mouse interaction affects rotation speed
- Click to randomize strand colors
- **Metrics**: Rotation angle, base pair count
- **6 Presets**: Classic, Fast Spin, Slow Motion, Rainbow, Unraveling, Pulse

### 15. Lava Lamp (Press n from Pattern 14)
Metaball-based lava lamp simulation
- Organic blob shapes using metaball algorithm
- Physics simulation with buoyancy, drift, and turbulence
- Perlin noise for natural flowing motion
- Vertical wrapping for continuous lava lamp cycle
- Mouse attracts/repels blobs with force field
- Click to spawn new blobs (max 20)
- **Metrics**: Blob count, average blob radius
- **6 Presets**: Classic, Turbulent, Gentle, Many Blobs, Giant Blob, Strobe

### 16. Smoke (Press n from Pattern 15)
Physics-based smoke particle simulation
- Rising smoke plumes with Perlin noise turbulence
- Realistic particle opacity and dissipation
- Height-based color gradient for natural smoke effect
- Multiple smoke sources with configurable density
- Mouse creates force field to blow smoke away
- Click spawns burst of 15 smoke particles
- **Metrics**: Active particles, plume count, average opacity
- **6 Presets**: Gentle Wisp, Campfire, Industrial, Incense, Fog, Steam

### 17. Snow (Press n from Pattern 16)
Falling particles with seasonal effects
- Realistic downward falling motion with gravity and wind drift
- Perlin noise turbulence for natural movement
- Particle rotation as they fall
- Ground accumulation feature (optional)
- 5 particle types: snow, cherry blossoms, autumn leaves, confetti, ash
- Mouse creates wind force field pushing particles
- Click spawns burst of 20 particles
- **Metrics**: Active particles, accumulated, average velocity
- **6 Presets**: Light Flurries, Blizzard, Cherry Blossoms, Autumn Leaves, Confetti, Ash

## ⚡ Performance Modes

Press `[` or `]` to cycle through performance modes:

### LOW (15 FPS)
Optimized for low-end systems or minimal CPU usage
- 50% particle count
- Reduced visual layers
- Target: <3% CPU usage

### MEDIUM (30 FPS) - Default
Balanced performance and visual quality
- Standard particle count
- Full visual effects
- Target: <5% CPU usage

### HIGH (60 FPS)
Maximum quality for high-end systems
- 200% particle count
- Enhanced visual layers
- Silky smooth animations

## 📊 Performance Monitoring

Press `d` to toggle the debug overlay showing:
- Current pattern and theme
- Real-time FPS (color-coded: green/yellow/red)
- Current performance mode
- Frame timing breakdown
- Pattern render time
- Changed cells ratio (buffer efficiency)
- Dropped frames counter
- Min/Avg/Max FPS statistics
- Pattern-specific metrics

## 🚄 Performance Characteristics

Optimized for low resource usage:
- **CPU**: 2-6% (depending on FPS preset)
- **Memory**: ~40-50MB
- **Target**: 30 FPS stable (adjustable 15-60)

> 📊 **For detailed metrics and benchmarks**, see [docs/PROJECT_STATUS.md#performance-metrics](docs/PROJECT_STATUS.md#performance-metrics)

## 🏗️ Architecture

ascii-splash uses a clean **3-layer architecture**:
- **Renderer Layer**: Terminal control with double-buffering for flicker-free rendering
- **Engine Layer**: Animation loop running at target FPS, commands, performance monitoring
- **Pattern Layer**: 17 interactive patterns with themes and presets

```
src/
├── types/          # Core interfaces and types
├── renderer/       # Terminal rendering with double-buffering
├── engine/         # Animation loop, commands, performance monitoring
├── patterns/       # Pattern implementations (17 total)
├── config/         # Configuration system
└── main.ts         # Entry point and input handling
```

For **detailed technical architecture**, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🎯 Command System

Press **c** to enter command mode for advanced features:

### Quick Commands
- `c1`, `c2`, etc. - Apply preset to current pattern
- `cp3` - Switch to pattern 3
- `ct2` - Switch to theme 2
- `cp3+t2` - Switch pattern AND theme

### Favorites
- `cF1` - Save current state to favorite slot 1
- `cf1` - Load favorite slot 1
- `cfl` - List all saved favorites

### Special Commands
- `c*` - Random preset (current pattern)
- `c**` - Random pattern + preset + theme
- `c?` - List presets for current pattern
- `c??` - Show ALL presets catalog
- `c!` - Toggle shuffle mode (10s intervals)
- `c!5` - Shuffle with 5s intervals
- `c!!` - Shuffle ALL (pattern+preset+theme)
- `c/term` - Search patterns/themes
- `cs` - Save current config to file

For the complete command reference, see the section above.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT License](LICENSE) - Copyright (c) 2025 reoiv

## 🙏 Acknowledgments

Built with:
- [terminal-kit](https://github.com/cronvel/terminal-kit) - Terminal control and rendering
- [chalk](https://github.com/chalk/chalk) - Color output
- [commander](https://github.com/tj/commander.js) - CLI argument parsing
- [conf](https://github.com/sindresorhus/conf) - Configuration management

## 🔗 Links

- [GitHub Repository](https://github.com/reowens/ascii-splash)
- [npm Package](https://www.npmjs.com/package/ascii-splash)
- [Report Issues](https://github.com/reowens/ascii-splash/issues)
- [Technical Architecture](https://github.com/reowens/ascii-splash/blob/main/docs/ARCHITECTURE.md)

---

**Made with ❤️ for terminal enthusiasts**
