# ascii-splash

A terminal ASCII animation app that adds visual flow to your IDE workspace.

## Current Status: Phase 3.4 Complete - 8 Patterns!

### Working Features
- Terminal renderer with double-buffering (flicker-free)
- Adaptive animation engine (15-60 FPS)
- **8 Interactive Patterns**: Waves, Starfield, Matrix, Rain, Quicksilver, Particles, Spiral, Plasma
- **5 Color Themes**: Ocean, Matrix, Starlight, Fire, Monochrome
- Pattern switching with keyboard shortcuts
- Theme cycling with live preview
- Full mouse interaction support (can be disabled via CLI)
- Terminal resize handling
- Pause/resume functionality
- **Performance monitoring system** with real-time metrics
- **Quality presets** (LOW/MEDIUM/HIGH) for performance tuning
- Pattern-specific metrics tracking
- **CLI argument parsing** with validation and help system
- **Configuration file system** (~/.config/ascii-splash/.splashrc.json)

## Installation & Running

```bash
# Install dependencies
npm install

# Build
npm run build

# Run with defaults
npm start
```

Or run directly:
```bash
node dist/main.js
```

## Command Line Options

```bash
# Run with defaults (medium quality, waves pattern, mouse enabled)
node dist/main.js

# Start with specific pattern
node dist/main.js --pattern starfield
node dist/main.js -p matrix

# Set quality preset
node dist/main.js --quality high
node dist/main.js -q low

# Custom FPS (overrides quality preset)
node dist/main.js --fps 45
node dist/main.js -f 15

# Set color theme
node dist/main.js --theme fire
node dist/main.js -t matrix

# Disable mouse interaction
node dist/main.js --no-mouse

# Combine options
node dist/main.js --pattern quicksilver --quality high --theme starlight --no-mouse

# Show version
node dist/main.js --version
node dist/main.js -V

# Show help
node dist/main.js --help
node dist/main.js -h
```

### Available Options

| Option | Short | Description | Values |
|--------|-------|-------------|--------|
| `--pattern` | `-p` | Starting pattern | waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma |
| `--quality` | `-q` | Quality preset | low, medium (default), high |
| `--fps` | `-f` | Custom FPS (10-60) | Number (overrides quality preset FPS) |
| `--theme` | `-t` | Color theme | ocean (default), matrix, starlight, fire, monochrome |
| `--no-mouse` | | Disable mouse | Flag (no value) |
| `--version` | `-V` | Show version | |
| `--help` | `-h` | Show help | |

## Configuration File

ascii-splash supports persistent configuration via a JSON file. The config file is automatically loaded at startup.

### Config File Location

The config file is stored at:
- **Linux/macOS**: `~/.config/ascii-splash/.splashrc.json`
- **Windows**: `%APPDATA%\ascii-splash\config.json`

### Priority Order

Settings are merged with the following priority (highest to lowest):
1. **CLI arguments** (e.g., `--pattern waves --fps 60`)
2. **Config file** (`~/.config/ascii-splash/.splashrc.json`)
3. **Defaults** (built-in fallback values)

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
- `defaultPattern` - Starting pattern (waves, starfield, matrix, rain, quicksilver, particles, spiral, plasma)
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

### Creating Your Config

1. Copy the example config:
   ```bash
   mkdir -p ~/.config/ascii-splash
   cp examples/.splashrc.example ~/.config/ascii-splash/.splashrc.json
   ```

2. Edit `~/.config/ascii-splash/.splashrc.json` with your preferences

3. Run splash - your settings will be loaded automatically!

## Controls

### Keyboard
- **1-8**: Switch to pattern 1-8
- **n/p**: Next/Previous pattern
- **Space**: Pause/Resume
- **+/-**: Adjust FPS (10-60)
- **[/]**: Cycle quality presets (LOW/MEDIUM/HIGH)
- **t**: Cycle color themes
- **?**: Toggle help overlay
- **d**: Toggle debug info (performance metrics)
- **q/ESC/Ctrl+C**: Exit

### Mouse
- **Move**: Interactive effects (ripples, repulsion, distortion, spawning)
- **Click**: Special effects (big splash, explosion, spawn columns/drops)

## Color Themes

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

## Patterns

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

## Quality Presets

Press `[` or `]` to cycle through performance presets:

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

## Performance Monitoring

Press `d` to toggle the debug overlay showing:
- Current pattern and theme
- Real-time FPS (color-coded: green/yellow/red)
- Current quality preset
- Frame timing breakdown
- Pattern render time
- Changed cells ratio (buffer efficiency)
- Dropped frames counter
- Min/Avg/Max FPS statistics
- Pattern-specific metrics

## Performance Characteristics

**Measured on Apple M1:**
- MEDIUM preset: 30 FPS stable, 2-4% CPU
- HIGH preset: 60 FPS stable, 4-6% CPU
- LOW preset: 15 FPS stable, 1-2% CPU
- Memory: ~40-50MB RSS

**Optimizations:**
- Double-buffering with dirty cell tracking
- Pattern-specific optimizations (early rejection tests)
- Mouse event throttling (~60 FPS)
- Efficient terminal writes (only changed cells)

## Architecture

```
src/
├── types/          Core interfaces (Pattern, Cell, Point, etc.)
├── renderer/       Terminal rendering with double-buffering
├── engine/         Animation loop and performance monitoring
├── patterns/       Pattern implementations
└── main.ts         Entry point and input handling
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Next Steps

- ✅ Phase 3.1: CLI arguments
- ✅ Phase 3.2: Configuration system
- ✅ Phase 3.3: Theme support
- ✅ Phase 3.4: Additional patterns (Particles, Spiral, Plasma)
- Phase 4: Packaging and distribution

See [PLAN.md](PLAN.md) for the full roadmap.
