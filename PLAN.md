# ascii-splash

**A terminal ASCII animation app that adds visual flow to your IDE workspace**

## Concept

A lightweight terminal app that displays animated ASCII patterns (waves, starfield, matrix rain, etc.) designed to fit in a small terminal window within your IDE. Provides ambient motion and visual interest without being distracting or resource-heavy.

## Tech Stack

- **Language**: TypeScript/Node.js
- **Distribution**: npm package (`npx ascii-splash`)
- **Key Libraries**:
  - `terminal-kit` - Advanced terminal features (mouse support, colors)
  - `blessed` - Terminal UI framework
  - `chalk` - Color output
  - `commander` - CLI argument parsing
  - `conf` - Config file management

## Project Structure

```
splash/
├── src/
│   ├── renderer/
│   │   ├── TerminalRenderer.ts     # Core rendering engine
│   │   ├── Buffer.ts               # Double-buffer for flicker-free drawing
│   │   └── ColorManager.ts         # ANSI color handling
│   │
│   ├── engine/
│   │   ├── AnimationEngine.ts      # Main loop, FPS management
│   │   ├── InputHandler.ts         # Keyboard & mouse event handling
│   │   └── State.ts                # Global app state
│   │
│   ├── patterns/
│   │   ├── Pattern.ts              # Base pattern interface
│   │   ├── WavePattern.ts          # Sine wave animations
│   │   ├── StarfieldPattern.ts     # 3D starfield effect
│   │   ├── MatrixPattern.ts        # Digital rain
│   │   ├── RainPattern.ts          # Falling characters
│   │   ├── ParticlePattern.ts      # Floating particles
│   │   ├── SpiralPattern.ts        # Rotating spiral
│   │   └── PlasmaPattern.ts        # Fluid plasma effect
│   │
│   ├── config/
│   │   ├── defaults.ts             # Beautiful default configs
│   │   ├── ConfigLoader.ts         # Load from ~/.splashrc
│   │   └── themes.ts               # Color themes
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   │
│   └── main.ts                     # Entry point
│
├── package.json
├── tsconfig.json
├── README.md
└── examples/
    └── .splashrc.example           # Example config file
```

## Core Features

### 1. Pattern System

All patterns implement a common interface:

```typescript
interface Pattern {
  name: string;
  render(buffer: Buffer, time: number, mousePos?: Point): void;
  onMouseMove?(pos: Point): void;
  onMouseClick?(pos: Point): void;
  reset(): void;
}
```

### 2. Keyboard Controls

```
Ctrl+1-6    - Switch to patterns 1-6
Ctrl+C      - Exit
Ctrl+P      - Pause/Resume
Ctrl+↑/↓    - Increase/Decrease speed
Ctrl+[/]    - Cycle through color themes
Ctrl+R      - Random pattern
Space       - Next pattern
?           - Show help overlay
```

### 3. Mouse Interactions

**Hover Effects:**
- Waves: Create ripples at cursor position
- Starfield: Stars avoid cursor (force field effect)
- Particles: Attract/repel particles
- Matrix: Create distortion field
- Rain: Spawn extra droplets

**Click Effects:**
- Spawn burst animations
- Create attraction/repulsion points
- Drop "pebbles" in wave patterns

### 4. Terminal Renderer

- Detects and adapts to terminal size
- Double-buffering to prevent flicker
- Only redraws changed cells (performance)
- Handles resize events gracefully
- 30-60 FPS target

### 5. Configuration System

**Config file location**: `~/.splashrc` (JSON)

```json
{
  "defaultPattern": "waves",
  "fps": 30,
  "theme": "ocean",
  "keyBindings": {
    "pause": "Ctrl+P",
    "next": "Space"
  },
  "patterns": {
    "waves": {
      "speed": 1.0,
      "amplitude": 5,
      "frequency": 0.1,
      "mouseInteraction": true
    },
    "starfield": {
      "starCount": 100,
      "speed": 1.0,
      "mouseRepelRadius": 5
    }
  }
}
```

## Pattern Specifications

### 1. Waves (Priority 1)
**Description**: Smooth sine wave patterns flowing across the screen

**Characteristics**:
- Multiple wave layers at different frequencies
- Characters: `~ ≈ ∼ - .` for water effect
- Gradient colors (blue → cyan → white)
- Horizontal movement (right to left)

**Mouse Interaction**:
- Cursor creates circular ripples
- Ripples propagate and fade over time

**Config**:
```typescript
{
  speed: 1.0,        // Wave movement speed
  amplitude: 5,      // Wave height
  frequency: 0.1,    // Wave frequency
  layers: 3          // Number of wave layers
}
```

### 2. Starfield (Priority 2)
**Description**: 3D starfield with parallax effect

**Characteristics**:
- Stars of varying sizes: `.` `·` `*` `✦` `✧` `★`
- Stars move toward viewer (Z-axis)
- Multiple depth layers for parallax
- Colors: blue (distant) → cyan → white (close)

**Mouse Interaction**:
- Stars avoid cursor (repulsion force field)
- Click creates explosion/burst effect
- Stars trail behind fast mouse movement

**Config**:
```typescript
{
  starCount: 100,
  speed: 1.0,
  mouseRepelRadius: 5,
  colors: ['blue', 'cyan', 'white']
}
```

### 3. Matrix (Priority 3)
**Description**: Classic digital rain effect

**Characteristics**:
- Falling columns of characters
- Characters: Katakana, numbers, symbols
- Green monochrome (classic) or themed colors
- Varying column speeds
- Bright "head" character, fading trail

**Mouse Interaction**:
- Cursor creates distortion/scramble effect
- Click spawns new columns
- Columns avoid mouse or change direction

**Config**:
```typescript
{
  density: 0.3,      // Percentage of columns active
  speed: 1.0,
  charset: 'katakana' | 'numbers' | 'mixed'
}
```

### 4. Rain (Priority 4)
**Description**: Simple falling character effect

**Characteristics**:
- Individual characters falling at varying speeds
- Characters: `'` `,` `.` `|` `!`
- Simpler than Matrix (no trails)
- Can be themed (water drops, snow, etc.)

**Mouse Interaction**:
- Cursor spawns extra drops
- Drops bounce off cursor
- Click creates splash effect

**Config**:
```typescript
{
  density: 0.2,
  speed: 1.0,
  characters: ['\'', ',', '.', '|']
}
```

## Default Themes

### Ocean (Default)
- Colors: Blues, cyans, teals, white
- Calm and soothing
- Default pattern: Waves

### Matrix
- Color: Green monochrome
- Classic hacker aesthetic
- Default pattern: Matrix

### Starlight
- Colors: Deep blues, purples, white
- Space theme
- Default pattern: Starfield

### Fire
- Colors: Reds, oranges, yellows
- Warm and energetic

### Monochrome
- Colors: Grays, white
- Clean and minimal

## Performance Strategy

1. **Smart Rendering**: Only redraw changed cells
2. **Frame Throttling**: Cap at 30-60 FPS with adjustable setting
3. **Complexity Scaling**: Reduce particle count/detail for smaller windows
4. **Efficient Data Structures**: Use typed arrays for buffers
5. **Mouse Event Throttling**: Debounce hover events to ~60Hz
6. **Graceful Degradation**: Adapt to terminal capabilities

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

### Phase 3: Configuration & Extensibility 🚧 IN PROGRESS
**Goal**: Make the app fully customizable via CLI args, config files, and themes

#### 3.1 CLI Arguments System ✅ COMPLETE
- [x] Install `commander` dependency
- [x] Create argument parser in main.ts
- [x] Support flags:
  - `--pattern <name>` - Start with specific pattern
  - `--quality <low|medium|high>` - Set initial quality preset
  - `--fps <number>` - Custom FPS override
  - `--theme <name>` - Set color theme
  - `--no-mouse` - Disable mouse interaction
  - `--help` - Show usage information
  - `--version` - Show version
- [x] Validate and apply CLI args to app state
- [x] Update README with CLI usage examples

#### 3.2 Configuration File System ✅ COMPLETE
- [x] Install `conf` dependency (v10 for CommonJS support)
- [x] Create `src/config/` directory structure
- [x] Implement `src/config/defaults.ts` - Default configuration values
- [x] Implement `src/config/ConfigLoader.ts` - Load/save config with merge logic
- [x] Define config schema/types (ConfigSchema, pattern-specific interfaces)
- [x] Support configuration for:
  - Default pattern on startup
  - Default quality preset
  - Default FPS
  - Default theme
  - Mouse interaction toggle
  - Pattern-specific configs (speed, density, layers, etc.)
- [x] Merge priority: CLI args > config file > defaults
- [x] Create `examples/.splashrc.example` with comprehensive documentation
- [x] Update README with configuration documentation
- [x] Test configuration loading and CLI override priority

#### 3.3 Theme System ✅ COMPLETE
- [x] Implement `src/config/themes.ts` - Theme definitions
- [x] Define Theme interface (color palettes)
- [x] Create 5 predefined themes:
  - Ocean (blues/cyans/teals) - default
  - Matrix (green monochrome)
  - Starlight (deep blues/purples/white)
  - Fire (reds/oranges/yellows)
  - Monochrome (grays/white)
- [x] Update all patterns to use theme colors
- [x] Add theme cycling keyboard shortcut (t key)
- [x] Add theme to config file support
- [x] Add --theme CLI argument
- [x] Display current theme in debug overlay

#### 3.4 Additional Patterns ✅ COMPLETE
- [x] Implement ParticlePattern (floating particles with physics)
  - Particle system with velocity/acceleration/gravity
  - Mouse attraction/repulsion forces (toggle on click)
  - Boundary bouncing with energy loss
  - Click creates particle burst (20 particles)
  - Theme-based coloring by velocity and life
- [x] Implement SpiralPattern (rotating spiral effect)
  - Logarithmic spiral generation
  - Continuous rotation animation
  - Multiple spiral arms (3 default)
  - Distance-based intensity coloring
  - Theme support with gradient interpolation
- [x] Implement PlasmaPattern (fluid plasma effect)
  - Four sine wave combination for smooth plasma
  - Circular and diagonal wave patterns
  - Theme-based intensity coloring
  - Continuous organic animation
- [x] Add new patterns to configuration system
- [x] Add new patterns to theme system
- [x] Update keyboard shortcuts (1-8 keys)
- [x] Add pattern configs to types and defaults
- [x] Update all documentation

### Phase 4: Polish & Distribution
- [ ] Add shebang to main.js for binary execution
- [ ] Test on multiple terminal emulators
- [ ] Performance profiling and optimization
- [ ] Comprehensive README documentation
- [ ] Create demo GIFs/videos
- [ ] Prepare for npm publish
- [ ] Publish to npm registry

## Usage Examples

```bash
# Run with defaults
npx ascii-splash

# Specific pattern
npx ascii-splash --pattern starfield

# Custom FPS
npx ascii-splash --fps 60

# Specific theme
npx ascii-splash --theme matrix

# Disable mouse
npx ascii-splash --no-mouse

# Show help
npx ascii-splash --help
```

## Package Details

- **Package name**: `ascii-splash`
- **Binary name**: `splash`
- **Entry point**: `./dist/main.js`
- **Target**: ES2020, CommonJS
- **Min Node version**: 16.x

## Notes

- Keep resource usage minimal (target <5% CPU idle, <50MB RAM)
- Ensure clean shutdown on all signals (SIGINT, SIGTERM)
- Graceful handling of non-TTY environments
- Consider terminal color capability detection
- Test on multiple terminal emulators (iTerm2, Terminal.app, Windows Terminal, etc.)
