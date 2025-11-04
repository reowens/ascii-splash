# ascii-splash Architecture Guide

**For Developers**: Complete technical architecture and implementation details.

**Quick Links**:
- 📊 [Current metrics & status](PROJECT_STATUS.md)
- 🧪 [Testing strategy](TESTING_PLAN.md)
- 👤 [User guide](../README.md)
- 📦 [Release process](RELEASE_PROCESS.md)

---

## Core System (3-Layer Design)

The app follows a clean separation of concerns with three distinct layers:

### 1. Renderer Layer (`src/renderer/`)

Manages all terminal I/O and rendering:

**TerminalRenderer**
- Initializes terminal and sets up input handling
- Manages terminal state (cursor visibility, colors, dimensions)
- Handles window resize events and terminal capability detection
- Orchestrates rendering cycle: gets changes from buffer, writes to terminal

**Buffer** (Double-Buffering Implementation)
- Maintains two frame buffers: current and previous
- `Cell` interface: `{char: string, color: Color}`
- `render(changes)`: Only writes changed cells to terminal (optimization)
- `getChanges()`: Diffs current vs previous to find modified cells
- `swap()`: Copies current to previous after each frame
- Prevents flicker and minimizes terminal writes (critical for performance)

**Performance Benefit**: Only ~5-10% of cells typically change per frame, reducing terminal writes by 90%

### 2. Engine Layer (`src/engine/`)

Orchestrates the animation loop and system control:

**AnimationEngine**
- Main loop running at configurable target FPS (default: 30)
- Uses `setTimeout(1)` instead of `requestAnimationFrame` (unavailable in Node.js)
- Implements frame timing: measures actual frame time, drops frames if needed
- Manages pattern lifecycle: init → update → render → cleanup
- Handles pattern switching with state reset

**PerformanceMonitor**
- Real-time FPS tracking with 60-frame rolling average
- Frame time breakdown:
  - Pattern render time (computation only)
  - Update time (buffer clear + pattern render)
  - Render time (terminal writes)
  - Changed cell count (efficiency metric)
- Frame drop detection
- Pattern-specific metrics collection

**CommandBuffer** (Multi-Key Input System)
- Accumulates keystrokes with `c` prefix
- 10-second timeout before clearing buffer
- Command history for up/down arrow navigation

**CommandParser**
- Parses accumulated commands: presets, patterns, themes, favorites
- Pattern matching for:
  - Presets: `c01`, `c02-c99`
  - Patterns: `cp3`, `cpwaves`, `cp3.5`
  - Themes: `ct2`, `ctfire`, `ctr` (random)
  - Favorites: `cF#` (save), `cf#` (load), `cfl` (list)
  - Special: `c*`, `c**`, `c?`, `c??`, `c!`, `c!!`, `cs`

**CommandExecutor**
- Executes parsed commands
- Updates app state (pattern, theme, FPS, favorites)
- Manages shuffle mode with configurable intervals
- Shows success/error feedback messages

### 3. Pattern Layer (`src/patterns/`)

Encapsulates visual effects with consistent interface:

**Pattern Interface** (`src/types/index.ts`):
```typescript
interface Pattern {
  name: string;
  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
  onMouseMove?(pos: Point): void;
  onMouseClick?(pos: Point): void;
  reset(): void;
  getMetrics?(): Record<string, number>;
  getPresets?(): PatternPreset[];
  applyPreset?(presetId: number): boolean;
}
```

**Pattern Responsibilities**:
- Render animation frame into provided buffer (2D array of cells)
- Respond to mouse events (movement, clicks)
- Maintain interactive state (particles, ripples, etc.)
- Implement `reset()` for state cleanup on pattern switch
- Support 6 presets with unique visual variations
- Adapt to theme colors via `getColor(intensity)` method

**Pattern Implementation Constraints**:
- Buffer bounds: `0 <= x < size.width`, `0 <= y < size.height`
- Colors: RGB objects `{r: 0-255, g: 0-255, b: 0-255}`
- Mouse coordinates: 0-based (pre-converted from terminal-kit's 1-based)
- Time parameter: Milliseconds since animation start
- No external side effects (file I/O, network, etc.)

---

## Data Flow

```
┌─────────────────┐
│   User Input    │
│ (keyboard/mouse)│
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│  TerminalRenderer       │
│  (input handler)        │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  main.ts                │
│  (dispatch events)      │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  AnimationEngine.loop() │
│  Every ~33ms (30 FPS)   │
└────────┬────────────────┘
         │
         ├──→ CommandBuffer/Parser (keyboard input)
         ├──→ CommandExecutor (process commands)
         │
         ↓
┌─────────────────────────┐
│  Pattern.render()       │
│  (compute frame)        │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Buffer (double buffer) │
│  (diff changes)         │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  TerminalRenderer       │
│  (write to terminal)    │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Terminal Output        │
│  (visual display)       │
└─────────────────────────┘
```

---

## Key Architectural Patterns

### Double Buffering with Dirty-Cell Tracking

**Problem**: Terminal writes are expensive; updating entire screen every frame causes flicker.

**Solution**:
```typescript
class Buffer {
  current: Cell[][];   // Working buffer for current frame
  previous: Cell[][];  // Previous frame state

  render(size: Size) {
    // Fill current buffer with new content
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        current[y][x] = {...};
      }
    }
  }

  getChanges(): Change[] {
    // Compare current to previous, return only differences
    const changes = [];
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        if (current[y][x] !== previous[y][x]) {
          changes.push({x, y, cell: current[y][x]});
        }
      }
    }
    return changes;  // Typically 10-15% of all cells
  }

  swap() {
    // After rendering, swap buffers
    [this.current, this.previous] = [this.previous, this.current];
  }
}
```

**Benefits**:
- Prevents flicker (two-phase: compute then display)
- 90% reduction in terminal writes (only changed cells)
- CPU-friendly: minimal data movement

### Performance Monitoring with Rolling Averages

**Implementation**:
```typescript
class PerformanceMonitor {
  fpsHistory: number[] = [];  // 60-frame rolling window

  recordFrame(time: number) {
    const fps = 1000 / time;
    this.fpsHistory.push(fps);

    // Keep only last 60 frames
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }
  }

  getAverageFps(): number {
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }
}
```

**Benefits**:
- Smooth FPS reporting (not jittery)
- Detects frame drops vs normal variance
- Guides performance optimization efforts

### Mouse Event Throttling

**Problem**: Mouse motion events fire at ~200 Hz, overwhelming pattern rendering.

**Solution** (in `src/main.ts`):
```typescript
let lastMouseTime = 0;
const MOUSE_THROTTLE = 16; // ~60 FPS

terminal.on('mouse', (event) => {
  const now = Date.now();
  if (now - lastMouseTime > MOUSE_THROTTLE) {
    pattern.onMouseMove?.(event.pos);
    lastMouseTime = now;
  }
});
```

**Benefit**: Limits pattern processing to ~60 FPS even with more frequent input events

### Command Buffer Pattern

**Problem**: Need to accept multi-key sequences (e.g., `cp3t2`) as single commands.

**Solution**:
```typescript
class CommandBuffer {
  buffer: string = '';
  timeout: NodeJS.Timeout | null = null;

  addChar(char: string) {
    if (char === 'c' && this.buffer === '') {
      this.buffer = 'c';
      this.resetTimeout();
    } else if (this.buffer.startsWith('c')) {
      this.buffer += char;
      this.resetTimeout();
    }
  }

  resetTimeout() {
    clearTimeout(this.timeout!);
    this.timeout = setTimeout(() => {
      if (this.buffer.length > 1) {
        commandParser.parse(this.buffer);
      }
      this.buffer = '';
    }, 10000); // 10-second timeout
  }
}
```

**Benefit**: Allows complex commands while remaining responsive

---

## Configuration System

### Architecture Overview

**Three-tier configuration** with clear priority:

```
1. CLI Arguments (highest priority)
   ↓
2. Config File (~/.config/ascii-splash/.splashrc.json)
   ↓
3. Defaults (src/config/defaults.ts)
```

### ConfigLoader Implementation

**Class Structure** (`src/config/ConfigLoader.ts`):
```typescript
class ConfigLoader {
  load(cliOptions: any): Config {
    // 1. Load defaults
    const config = {...DEFAULT_CONFIG};

    // 2. Merge config file if exists
    const fileConfig = this.conf.store;
    Object.assign(config, fileConfig);

    // 3. Override with CLI options
    if (cliOptions.pattern) config.defaultPattern = cliOptions.pattern;
    if (cliOptions.fps) config.fps = cliOptions.fps;
    // ... etc

    return config;
  }

  save(config: Config): void {
    this.conf.store = config;  // Cross-platform file storage
  }
}
```

**Config Schema** (`src/types/index.ts`):
```typescript
interface ConfigSchema {
  // Global settings
  defaultPattern?: string;           // waves, starfield, matrix, etc.
  quality?: 'low' | 'medium' | 'high';
  fps?: number;                      // 10-60
  theme?: string;                    // ocean, matrix, starlight, fire, monochrome
  mouseEnabled?: boolean;

  // Favorites (slot → favorite data)
  favorites?: {
    [slot: number]: FavoriteSlot;
  };

  // Pattern-specific configurations
  patterns?: {
    waves?: WavePatternConfig;
    starfield?: StarfieldPatternConfig;
    // ... 16 patterns total
  };
}

interface FavoriteSlot {
  pattern: string;          // e.g., "WavePattern"
  preset?: number;          // Preset ID
  theme: string;            // e.g., "fire"
  config?: any;             // Custom pattern config
  note?: string;            // User annotation
  savedAt: string;          // ISO timestamp
}
```

### Config File Location

- **Linux/macOS**: `~/.config/ascii-splash/.splashrc.json`
- **Windows**: `%APPDATA%\ascii-splash\config.json`
- Uses `conf` package (v10) for cross-platform compatibility

### Pattern-Specific Configurations

Each pattern can be customized independently:

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

---

## Theme System

### Architecture

**Theme Interface** (`src/types/index.ts`):
```typescript
interface Theme {
  name: string;              // Unique identifier (ocean, matrix, etc.)
  displayName: string;       // User-facing name
  colors: Color[];           // Array of RGB colors for interpolation
  getColor(intensity: number): Color;  // Interpolate color by intensity (0-1)
}
```

### Theme Definitions (`src/config/themes.ts`)

**5 predefined themes**:

1. **Ocean** (default)
   - Colors: Blues, cyans, teals
   - Mood: Calm and soothing
   - Best for: Waves, Starfield

2. **Matrix**
   - Colors: Green monochrome
   - Mood: Classic hacker aesthetic
   - Best for: Matrix pattern

3. **Starlight**
   - Colors: Deep blues, purples, white
   - Mood: Cosmic space
   - Best for: Starfield, Tunnel

4. **Fire**
   - Colors: Reds, oranges, yellows
   - Mood: Warm and energetic
   - Best for: Plasma, Fireworks, Lightning

5. **Monochrome**
   - Colors: Grayscale gradient
   - Mood: Clean and minimal
   - Best for: All patterns

### Color Interpolation

**Linear interpolation** for smooth gradients:

```typescript
interface Color {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

function lerp(a: Color, b: Color, t: number): Color {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

// Theme.getColor(0.0) → colors[0]
// Theme.getColor(0.5) → interpolated between colors[2] and colors[3]
// Theme.getColor(1.0) → colors[colors.length - 1]
```

### Pattern Integration

**Patterns receive theme in constructor**:

```typescript
export class WavePattern implements Pattern {
  private theme: Theme;

  constructor(theme: Theme, config?: Partial<WavePatternConfig>) {
    this.theme = theme;
  }

  render(buffer: Cell[][], time: number, size: Size) {
    for (let x = 0; x < size.width; x++) {
      const intensity = (this.waveHeight[x] + 1) / 2; // Normalize to 0-1
      const color = this.theme.getColor(intensity);
      buffer[y][x] = {char: '≈', color};
    }
  }
}
```

### Theme Cycling

**User control**: Press `t` to cycle through themes
- Real-time update: Recreates all patterns with new theme
- Persisted: Stored in config file
- CLI override: `--theme fire`

---

## Shuffle Mode System

### Architecture

**Shuffle state managed in CommandExecutor**:

```typescript
class CommandExecutor {
  private shuffleInterval: NodeJS.Timeout | null = null;
  private shuffleMode: 'off' | 'presets' | 'all' = 'off';
  private shuffleIntervalMs: number = 10000;

  executeShuffleCommand(cmd: string) {
    if (cmd === 'c!') {
      // Toggle preset shuffle
      this.toggleShuffle('presets', 10000);
    } else if (cmd === 'c!!') {
      // Toggle all shuffle
      this.toggleShuffle('all', 10000);
    } else if (cmd.startsWith('c!')) {
      // Custom interval
      const intervalSeconds = parseInt(cmd.substring(2));
      this.toggleShuffle('presets', intervalSeconds * 1000);
    }
  }

  toggleShuffle(mode: 'presets' | 'all', interval: number) {
    if (this.shuffleMode === mode) {
      clearInterval(this.shuffleInterval!);
      this.shuffleMode = 'off';
      return;
    }

    this.shuffleMode = mode;
    this.shuffleIntervalMs = interval;

    this.shuffleInterval = setInterval(() => {
      if (mode === 'presets') {
        // Random preset of current pattern
      } else if (mode === 'all') {
        // Random pattern + preset + theme
      }
    }, interval);
  }
}
```

### Two Shuffle Modes

1. **Preset Shuffle** (`c!`)
   - Cycles only through presets of current pattern
   - Maintains pattern consistency
   - Default interval: 10 seconds
   - Custom interval: `c!5` (5 seconds)

2. **Full Shuffle** (`c!!`)
   - Randomizes pattern, preset, AND theme
   - Complete visual variety
   - Default interval: 10 seconds
   - Great for ambient background animations

### Cleanup

- Automatically cleared on app shutdown
- Can be toggled off mid-shuffle with same command
- Interval range: 1-300 seconds

---

## Terminal Coordinate Systems

### Important Convention

**Critical difference** between terminal-kit and internal coordinates:

**terminal-kit** (external): 1-based indexing
- Top-left: (1, 1)
- Used in: `term.moveTo(x, y)`, mouse events

**ascii-splash** (internal): 0-based indexing
- Top-left: (0, 0)
- Used in: Buffer, Pattern API, mouse handling

### Conversion

**When calling terminal-kit**:
```typescript
// Buffer uses 0-based: (0, 0) to (width-1, height-1)
const bufferX = 0, bufferY = 0;

// Convert to 1-based for terminal-kit
const terminalX = bufferX + 1;
const terminalY = bufferY + 1;
term.moveTo(terminalX, terminalY);
```

**When receiving mouse events**:
```typescript
// terminal-kit provides 1-based coordinates
const event = {x: 1, y: 1};  // Top-left in terminal-kit

// Convert to 0-based for patterns
const patternPos = {x: event.x - 1, y: event.y - 1};  // (0, 0)
pattern.onMouseMove?.(patternPos);
```

**In pattern render**:
```typescript
render(buffer: Cell[][], time: number, size: Size, mousePos?: Point) {
  // mousePos already in 0-based coordinates!
  // size.width and size.height in cells
  // buffer[y][x] for 0-based access
}
```

---

## Performance Strategy

### Targets

- **CPU**: <5% idle, <6% at 60 FPS (on Apple M1)
- **Memory**: ~40-50 MB RSS
- **Frame rate**: Stable at 15 FPS (LOW), 30 FPS (MEDIUM), 60 FPS (HIGH)

### Optimization Techniques

**1. Dirty-Cell Tracking**
- Only update changed cells (~10-15% per frame)
- Reduces terminal writes by 90%

**2. Pattern-Specific Optimizations**
- Early rejection tests before expensive calculations
- Squared distance for proximity (avoid sqrt)
- Limit interactive elements (particles, ripples, etc.)
- Cache repeated calculations

**3. Mouse Throttling**
- Limit mouse events to ~60 FPS
- Prevent event queue overflow

**4. Frame Skipping**
- Drop frames gracefully if rendering too slow
- Maintain smooth visual appearance

**5. Memory Management**
- Clean up old effects in pattern `render()`
- No unbounded arrays or memory leaks
- Preallocate buffers where possible

### Measured Performance

> 📊 **For current benchmarks and detailed metrics**, see [PROJECT_STATUS.md#performance-metrics](PROJECT_STATUS.md#performance-metrics)

---

## Contribution Points

### Adding New Patterns

**Step 1**: Create `src/patterns/YourPattern.ts`
```typescript
export class YourPattern implements Pattern {
  name = 'YourPattern';

  constructor(theme: Theme, config?: Partial<YourPatternConfig>) {}

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    // Implement animation
  }

  onMouseMove?(pos: Point): void {
    // Optional: handle mouse movement
  }

  onMouseClick?(pos: Point): void {
    // Optional: handle mouse click
  }

  reset(): void {
    // Clean up state
  }

  getPresets?(): PatternPreset[] {
    return [/* 6 presets */];
  }

  applyPreset?(presetId: number): boolean {
    // Apply preset and return success
  }
}
```

**Step 2**: Register in `src/main.ts`
```typescript
const patterns = [
  // ... existing patterns
  new YourPattern(theme, config),
];
```

**Step 3**: Add tests in `tests/unit/patterns/your-pattern.test.ts`

### Configuration Extension

Add pattern config to `src/config/defaults.ts`:
```typescript
patterns: {
  yourPattern: {
    // Your pattern-specific settings
  },
}
```

Add type to `src/types/index.ts`:
```typescript
interface YourPatternConfig {
  // Your configuration interface
}
```

---

## References

- **User Guide**: [README.md](../README.md)
- **Testing Strategy**: [TESTING_PLAN.md](TESTING_PLAN.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **Configuration Example**: [examples/.splashrc.example](../examples/.splashrc.example)

---

**Last Updated**: November 4, 2025
**For**: Developer contributions and deep technical understanding
