---
type: doc
status: reference
---

# ascii-splash Architecture Guide

**For Developers**: Complete technical architecture and implementation details.

**Quick Links**:

- 📊 [Current metrics & status](PROJECT_STATUS.md)
- 🧪 [Testing strategy](guides/TESTING.md)
- 👤 [User guide](../README.md)
- 📦 [Release process](guides/RELEASE.md)

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
- `Cell` interface: `{ char: string; color?: Color; bg?: Color }`
  - `color` is the foreground (existing behavior).
  - `bg` is **optional** — used by half-block / symbol-matcher renderers (v0.4.0+)
    to encode two stacked source pixels per terminal cell. Existing patterns
    leave `bg` undefined and behave unchanged.
- `render(changes)`: Only writes changed cells to terminal (optimization)
- `getChanges()`: Diffs current vs previous to find modified cells. Uses a
  `-1` sentinel for `bg` so `undefined → undefined` transitions are not flagged
  but `undefined ↔ defined` are.
- `swap()`: Copies current to previous after each frame
- Prevents flicker and minimizes terminal writes (critical for performance)

**Performance Benefit**: Only ~5-10% of cells typically change per frame, reducing terminal writes by 90%

**HalfBlockRenderer** (v0.4.0 Phase 1, `src/renderer/HalfBlockRenderer.ts`)

- Pure function: `renderHalfBlock(buffer, pixels, w, h, options) → void`.
- Direct port of viuer's `block.rs` algorithm (MIT) targeting our `Cell[][]` model.
- Each terminal cell encodes two stacked source pixels: emits `▄` with
  `color = bottom_pixel`, `bg = top_pixel` (or `▀` for the unpaired last row
  of an odd-height image, or for cells with only one opaque pixel).
- 2× vertical resolution vs. plain ASCII; 24-bit truecolor fg+bg per cell.
- Optional preprocessing flags: `invert`, `grayscale`, `contrast`, `threshold`, `bgTint`.
- Reused by `PhotoPattern` and by `LayeredPattern`'s photo background.

**BrailleRenderer** (v0.4.0 Phase 2, `src/renderer/BrailleRenderer.ts`)

- Pure function: `renderBraille(buffer, pixels, w, h, options) → void`.
- Re-derived from the Unicode 8-dot Braille spec (drawille is AGPL-3.0; no code
  was copied).
- Each terminal cell encodes 2 wide × 4 tall = 8 dots packed into a U+2800–U+28FF
  codepoint. **8× resolution** vs. plain ASCII.
- Cell color is the **mean RGB of lit dots** (transparent dots ignored). Cells
  with no lit dots are emitted as `' '` so the layer below shows through (the
  engine's space-transparency convention).
- Options: `threshold` (default 128), `invert`, `preBinarized` (skip luminance
  calc when input is already 0 or 255 from dither / edge preprocessing).
- Bit-mapping (per the spec):

  ```
  ┌─────┬─────┐
  │ 0x01│ 0x08│   row 0
  ├─────┼─────┤
  │ 0x02│ 0x10│   row 1
  ├─────┼─────┤
  │ 0x04│ 0x20│   row 2
  ├─────┼─────┤
  │ 0x40│ 0x80│   row 3
  └─────┴─────┘
  ```

**SymbolRenderer** (v0.4.0 Phase 4, `src/renderer/SymbolRenderer.ts`)

- Pure function: `renderSymbol(buffer, pixels, w, h, options) → void`.
- Algorithm re-implemented from chafa's `symbol-renderer.c:98-268` description (chafa is LGPL; the code + bitmaps are MIT, authored from scratch).
- Each terminal cell pulls an 8×8 source patch. For each candidate symbol in the active tag set, the matcher computes `fg = mean(patch[i] for bitmap[i]==1)`, `bg = mean(patch[i] for bitmap[i]==0)`, and `err = Σ squared-color-distance(patch[i], expected)`. Lowest error wins. **8× resolution** (`w·8 × h·8` source canvas).
- Tiebreaker (every bitmap has a bit-complement that scores identical err with fg/bg swapped — e.g. `▘`↔`▟`, `▚`↔`▞`, `▀`↔`▄`): lower err → higher fg luminance → higher litCount. The fg-luminance step picks the "lit = brighter pixels" interpretation; the litCount step settles uniform-color patches toward `█` (avoids leaking the terminal background through what should be a solid-color cell).
- Cell emission: bestSym = ` ` → `{ char: ' ', bg }`; bestSym = `█` → `{ char: '█', color: fg }`; otherwise `{ char: codepoint, color: fg, bg }`. Skip fg/bg when unused to keep the ANSI surface minimal.
- Symbol library (`src/renderer/symbols.ts`): 34 hand-authored 8×8 bitmaps across `TAG_ASCII | TAG_BLOCK | TAG_QUADRANT | TAG_SHADE` (plain numeric bitmask — the repo's strictTypeChecked eslint config rejects TS `const enum`). 16 ASCII shapes + 16 quadrant/block combinations + 3 shades, with space + `█` shared across multiple tags so they're always candidates. Tag-filtered candidate arrays are memoized per mask.
- Options: `tagMask` (default = all), `contrast`, `grayscale`, `invert` — same preprocessing semantics as `HalfBlockOptions`.
- Perf: ~20 ms for an 80×24 frame with all 34 candidates on Node 25 / Apple Silicon. Within the brief's microbenchmark envelope (49 fps / 20 ms for 50 candidates). Larger terminals (120×40+) may need a fast-path; deferred until requested.

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

**Legacy cleanup** (July 2026)

The unused v0.3.0 `SceneGraph`, `SpriteManager`, `ParticleSystem`, and EventBus
experiments were removed after package-surface review. Persistent Buffer
overlays were removed at the same time. Scene-style patterns and their local
particle behavior continue to render directly into `Cell[][]`; `LayeredPattern`
composes sequentially; UI overlays write through the ordinary frame callback.

These facilities were never supported package APIs. See the
[July 2026 architecture triage](status/reports/2026-07-11-architecture-triage.md)
for the evidence and compatibility assessment.

### 4. UI Layer (`src/ui/`) - v0.3.0

Provides overlay components for user feedback:

**StatusBar**

- Persistent bottom-row display
- Shows: Pattern.Preset | Theme | FPS (color-coded) | Shuffle status | Help hint
- FPS color coding: green (≥25), yellow (15-24), red (<15)

**ToastManager**

- Notification toasts in top-right corner
- Types: success (green), error (red), info (blue), warning (yellow)
- Auto-dismiss after configurable duration
- Stacked display (max 3 visible)

**HelpOverlay**

- Tabbed interface: Controls, Commands, Patterns, Themes
- Tab navigation with TAB/LEFT/RIGHT keys
- Centered modal with border and styling

### 5. Transition Layer (`src/renderer/`) - v0.3.0

**TransitionManager**

- Smooth transitions between pattern switches
- Effects: crossfade, dissolve, wipe-left, wipe-right, instant
- Configurable duration and easing functions
- Built-in easing: linear, easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic, easeOutCubic

### 6. Pattern Layer (`src/patterns/`)

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

**Pattern Categories** (23 patterns total + optional `PhotoPattern`):

- **Classic Patterns** (17): Wave, Starfield, Matrix, Rain, Quicksilver, Particle, Spiral, Plasma, Tunnel, Lightning, Fireworks, Life, Maze, DNA, LavaLamp, Smoke, Snow
- **Scene-Based Patterns** (5, v0.3.0): Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park
- **Enhanced Patterns** (1, v0.3.0): Metaball Playground with physics simulation modes
- **Image-Driven** (v0.4.0 Phases 1 + 2 + 4): `PhotoPattern` — instantiated on demand when `splash --photo <path>` is supplied. Decodes via `sharp`; runs an `edge → dither → renderer` pipeline per frame. Async lifecycle (`load()` + `prepareForSize()`) sits off the render path; `render()` itself stays sync. Three render modes: half-block (2× vertical resolution via `HalfBlockRenderer`), braille (8× resolution via `BrailleRenderer`), and symbol (8× resolution via `SymbolRenderer`, chafa-style 8×8 bitmap matching). Eighteen presets cover combinations of mode / dither (Floyd-Steinberg, Bayer 8/16) / edge detection (Sobel, DoG) / symbol-set tag mask. Switching mode triggers an async re-resize at the new mode's canvas size. Aspect-preserving fit matches viuer's `fit_dimensions`.

**Pattern Implementation Constraints**:

- Buffer bounds: `0 <= x < size.width`, `0 <= y < size.height`
- Colors: RGB objects `{r: 0-255, g: 0-255, b: 0-255}`
- Mouse coordinates: 0-based (pre-converted from terminal-kit's 1-based)
- Time parameter: Milliseconds since animation start
- No external side effects (file I/O, network, etc.)

---

## Photo Rendering Pipeline (v0.4.0 Phases 1 + 2 + 4)

`PhotoPattern` is the only pattern that consumes external input (an image file via `--photo PATH`). To keep `render()` synchronous, it splits image work across three lifecycle phases:

```
constructor()         no I/O — stores config, picks initial preset
       ↓
async load()          decode source via sharp into raw RGBA  (called once at startup)
       ↓
async prepareForSize() resize to fit terminal × mode-aware canvas (called on resize / mode change)
       ↓
sync render()         apply edge → dither → renderer per frame
```

### Per-frame pipeline

Each frame, `render()` runs:

```
cached resized RGBA
        │
        ▼   (preset.edge ≠ 'off')
 rgbaToLuminance ─→ sobelMagnitude  or  differenceOfGaussians
        │
        ▼   threshold to 0/255 → maskToRgba
working RGBA buffer
        │
        ▼   (preset.dither ≠ 'none')
 floydSteinberg  or  bayerOrdered (in place, 1-bit or 8-level quantization)
        │
        ▼
 renderHalfBlock  or  renderBraille  or  renderSymbol  (writes into Cell[][])
```

The pipeline is fully gated by preset config — a preset that sets `edge: 'off'` and `dither: 'none'` skips both stages and feeds the cached pixels straight into the renderer (Phase 1 default behavior). The symbol-mode renderer applies its own per-pixel preprocessing (`grayscale`, `invert`, `contrast`) inline during patch extraction, so edge/dither stages typically aren't paired with symbol presets in v0.4.0.

### Mode-aware resize

The cached resize size depends on the preset's `mode`:

| Mode      | Source canvas (pixels) | Resolution multiplier                                         |
| --------- | ---------------------- | ------------------------------------------------------------- |
| halfblock | `width × height·2`     | 2× vertical                                                   |
| braille   | `width·2 × height·4`   | 8× total (2× h × 4× v)                                        |
| symbol    | `width·8 × height·8`   | 8× horizontal × 8× vertical (one 8×8 patch per terminal cell) |

Switching preset (e.g., from preset 6 halfblock-Sobel to preset 11 braille-Sobel, or to preset 13 symbol) invalidates the resize cache, kicking off an async `prepareForSize()` on the next frame. The first frame after a switch may render against the previous cache; sharp typically completes the new resize in under 16 ms.

### Source-of-truth references

| Algorithm               | Implementation                                              | Tests                                           |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Half-block emit         | `src/renderer/HalfBlockRenderer.ts`                         | `tests/unit/renderer/HalfBlockRenderer.test.ts` |
| Braille bit-pack        | `src/renderer/BrailleRenderer.ts`                           | `tests/unit/renderer/BrailleRenderer.test.ts`   |
| Symbol bitmap matcher   | `src/renderer/SymbolRenderer.ts`, `src/renderer/symbols.ts` | `tests/unit/renderer/SymbolRenderer.test.ts`    |
| Floyd-Steinberg dither  | `src/utils/dither.ts` → `floydSteinberg`                    | `tests/unit/utils/dither.test.ts`               |
| Bayer ordered dither    | `src/utils/dither.ts` → `bayerOrdered`, `BAYER_8/16`        | `tests/unit/utils/dither.test.ts`               |
| BT.601 luminance        | `src/utils/edges.ts` → `rgbaToLuminance`                    | `tests/unit/utils/edges.test.ts`                |
| Sobel magnitude         | `src/utils/edges.ts` → `sobelMagnitude`                     | `tests/unit/utils/edges.test.ts`                |
| Difference of Gaussians | `src/utils/edges.ts` → `differenceOfGaussians`              | `tests/unit/utils/edges.test.ts`                |
| Mask → RGBA bridge      | `src/utils/edges.ts` → `maskToRgba`                         | `tests/unit/utils/edges.test.ts`                |

### Tuning notes

- **DoG defaults**: σ1=1, σ2=2 (changed from canonical Marr–Hildreth σ2=1.6 in May 2026 after empirical comparison on a 71×48 photo showed σ2=1.6 underflows: max magnitude 33/255 vs. 47/255 at σ2=2). Override per-call for higher-resolution sources.
- **Phase 1 `edge-only` preset (id 6)**: shipped as a hard-threshold stub in Phase 1; upgraded to real Sobel in Phase 2. Existing preset id is preserved.
- **Phase 4 `mode: 'symbol'`** (added May 2026): chafa-style 8×8 bitmap matcher. Plugs into the same dispatch in `PhotoPattern.render()` and uses the same `prepareForSize()` flow as halfblock / braille — just with a larger source canvas (8W × 8H).
- **Future modes**: Phase 5 will add `mode: 'kitty' | 'iterm2' | 'sixel'` (protocol pass-through), plugging into the same dispatch.

---

## Scene Composition (v0.4.0 Phase 3)

`LayeredPattern` (`src/patterns/LayeredPattern.ts`) is a `Pattern`-shaped composite that wraps a `PhotoPattern` background plus an arbitrary procedural overlay. CLI entry point: `splash --photo bg.jpg --pattern starfield`.

### Render order

```ts
render(buffer, time, size, mousePos) {
  this.photo.render(buffer, time, size);            // photo first
  this.overlay.render(buffer, time, size, mousePos); // overlay on top
}
```

That's the entire compositor. Two sequential `render()` calls into the same `Cell[][]` — the buffer is cleared each frame by `AnimationEngine.update()`, so both layers paint from a clean slate.

### Why sequential composition?

The v0.3.0 SceneGraph experiment never gained a production caller and was
removed in July 2026. The active two-layer design remains deliberately small:

- Two sequential `render()` calls provide the required photo-then-overlay
  ordering without adapters or extra frame storage.
- The engine and all 23 procedural patterns remain independent of composition.
- A future 3+ layer scenario should introduce only the smallest compositor its
  measured requirements need.

### Transparency convention

The space character is treated as transparent by convention. The overlay leaves
the photo visible at every cell where it does not write or where it would write
`' '`.

- **Sparse overlays** (Matrix, Starfield, Lightning, Fireworks, Rain, Snow, DNA, Particles, Smoke, Snowfall, Quicksilver) only paint a small subset of cells — the photo shows through naturally, no flag needed.
- **Dense overlays** (Plasma, Wave) paint every cell. They opt-in via `transparentBg: true` to skip writes at their background-color cells:
  - **Plasma** skips its top 2 brightness bins (chars `·` and `' '`). The natural skip-on-`' '` predicate alone is unreachable in practice — char `' '` only emits at intensity exactly 1.0 (all 4 sines at peak simultaneously), which is essentially never. The broader threshold gives plasma real transparency at its dimmest cells.
  - **Wave** skips when `char === ' '`, the fall-through default for cells far from the wave height.
  - Both preserve `transparentBg` across `applyPreset` cycling so the photo stays visible when the user changes preset in layered mode.
  - Other dense patterns (Tunnel, Spiral, Maze, Life, LavaLamp, Metaball, scene-based) deferred until requested.

### Pattern-list wiring (`src/main.ts`)

When `--photo` alone: a 24th `'photo'` slot is appended.
When `--photo + --pattern X`: also a 25th `'layered'` slot (display name `Photo + <Overlay>`). Both slots stay cyclable via `n` / `b`.

A `buildPatterns(cfg, theme)` helper wraps `createPatternsFromConfig` and re-attaches the photo + layered slot on every theme rebuild. Without this, the Phase-1 path would silently drop `PhotoPattern` on every theme cycle (a latent crash that Phase 3 fixed as a bonus).

### Per-frame work

The `Buffer.getChanges()` cell-level diff (already including the `Cell.bg` field added in Phase 1) handles dirty-rect under overlay automatically: with a static photo + sparse overlay, only the overlay's footprint produces buffer changes between frames. Verified by the `LayeredPattern.test.ts` dirty-rect test.

The heavy photo work (sharp decode + resize) runs only on resize via `PhotoPattern.prepareForSize()` — unchanged from Phase 1+2. Per-frame per-cell ANSI emission is the same cost as the standalone photo case.

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
  fpsHistory: number[] = []; // 60-frame rolling window

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

terminal.on('mouse', event => {
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
    const config = { ...DEFAULT_CONFIG };

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
    this.conf.store = config; // Cross-platform file storage
  }
}
```

**Config Schema** (`src/types/index.ts`):

```typescript
interface ConfigSchema {
  // Global settings
  defaultPattern?: string; // waves, starfield, matrix, etc.
  quality?: 'low' | 'medium' | 'high';
  fps?: number; // 10-60
  theme?: string; // ocean, matrix, starlight, fire, monochrome
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
  pattern: string; // e.g., "WavePattern"
  preset?: number; // Preset ID
  theme: string; // e.g., "fire"
  config?: any; // Custom pattern config
  note?: string; // User annotation
  savedAt: string; // ISO timestamp
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
  name: string; // Unique identifier (ocean, matrix, etc.)
  displayName: string; // User-facing name
  colors: Color[]; // Array of RGB colors for interpolation
  getColor(intensity: number): Color; // Interpolate color by intensity (0-1)
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
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
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
      buffer[y][x] = { char: '≈', color };
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
const bufferX = 0,
  bufferY = 0;

// Convert to 1-based for terminal-kit
const terminalX = bufferX + 1;
const terminalY = bufferY + 1;
term.moveTo(terminalX, terminalY);
```

**When receiving mouse events**:

```typescript
// terminal-kit provides 1-based coordinates
const event = { x: 1, y: 1 }; // Top-left in terminal-kit

// Convert to 0-based for patterns
const patternPos = { x: event.x - 1, y: event.y - 1 }; // (0, 0)
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
- **Testing Strategy**: [guides/TESTING.md](guides/TESTING.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **v0.4.0 Roadmap**: [planning/v0.4.0-ROADMAP.md](planning/v0.4.0-ROADMAP.md) — image rendering, scene composition, protocol pass-through, share codes, asciinema export
- **Configuration Example**: [examples/.splashrc.example](../examples/.splashrc.example)

---

**Last Updated**: May 9, 2026
**For**: Developer contributions and deep technical understanding
