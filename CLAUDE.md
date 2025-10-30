# CLAUDE.md

## Project Overview

ascii-splash is a terminal ASCII animation app that displays animated patterns (waves, starfield, matrix rain, etc.) in a terminal window. It's designed as a lightweight ambient visual effect for IDE workspaces, targeting <5% CPU and <50MB RAM usage.

**Tech Stack:**
- TypeScript/Node.js (ES2020, CommonJS)
- `terminal-kit` for terminal control and mouse/keyboard input
- `chalk` for color output
- Target: Node 16+

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Watch mode (rebuilds on file changes)
npm run dev

# Run the application
npm start
# or directly:
node dist/main.js
```

**Note:** Always build before running. The entry point is `dist/main.js`, not source files.

## Architecture

### Core System (3-Layer Design)

The app follows a clean separation of concerns:

**1. Renderer Layer** ([src/renderer/](src/renderer/))
- `TerminalRenderer`: Manages terminal state, input events, and resize handling
- `Buffer`: Implements double-buffering with dirty-cell tracking for flicker-free rendering
- Only changed cells are redrawn each frame for performance

**2. Engine Layer** ([src/engine/](src/engine/))
- `AnimationEngine`: Main loop running at target FPS (default 30), orchestrates pattern rendering
- `PerformanceMonitor`: Tracks FPS, frame time, render time, and frame drops with rolling averages
- Uses `setTimeout(1)` instead of `requestAnimationFrame` (which doesn't exist in Node)

**3. Pattern Layer** ([src/patterns/](src/patterns/))
- All patterns implement the `Pattern` interface from [src/types/index.ts](src/types/index.ts)
- Each pattern:
  - Renders directly into a `Cell[][]` buffer (2D array of `{char, color}`)
  - Receives `time` (milliseconds) and `size` for animations
  - Implements `onMouseMove` and `onMouseClick` for interaction
  - Has a `reset()` method called when switching patterns

### Data Flow

```
User Input → TerminalRenderer (events) → main.ts (dispatch)
  ↓
AnimationEngine.loop() every ~33ms (30 FPS)
  ↓
Pattern.render(buffer, time, size, mousePos)
  ↓
Buffer.getChanges() → TerminalRenderer.render() → Terminal output
```

### Key Architectural Patterns

**Double Buffering:** Buffer class maintains current and previous frame state. `getChanges()` diffs them to find modified cells, then `swap()` copies current to previous. This prevents flicker and minimizes terminal writes.

**Performance Tracking:** PerformanceMonitor measures:
- Pattern render time (pattern computation)
- Update time (buffer clearing + pattern render)
- Render time (terminal writes)
- Changed cell count
- FPS with 60-frame rolling average

**Mouse Event Throttling:** Mouse motion events are throttled to 16ms (~60 FPS) in [src/main.ts](src/main.ts) to prevent overwhelming the pattern rendering.

## Pattern Development

To add a new pattern:

1. Create `src/patterns/YourPattern.ts` implementing the `Pattern` interface
2. Add to the patterns array in [src/main.ts](src/main.ts)
3. Update keyboard shortcuts if needed

**Pattern Implementation Guidelines:**
- Use the provided `time` parameter for animation (milliseconds since start)
- Respect buffer bounds: `0 <= x < size.width`, `0 <= y < size.height`
- Colors are RGB objects: `{r: 0-255, g: 0-255, b: 0-255}`
- Available chars include Unicode: `~≈∼*✦✧★` etc.
- Store interactive state (ripples, particles, etc.) as class properties
- Clean up old effects in `render()` to prevent memory leaks
- Mouse coordinates are 0-based (already converted from terminal-kit's 1-based)

**Performance Tips:**
- Minimize expensive calculations (sqrt, trigonometry) where possible
- Use squared distance for proximity checks before calculating sqrt
- Limit number of interactive elements (particles, ripples, etc.)
- Consider early rejection tests before complex calculations

## Terminal Coordinate Systems

**Important:** terminal-kit uses 1-based indexing (top-left is 1,1), but the app internally uses 0-based coordinates:
- Buffer and Pattern APIs: 0-based
- terminal-kit calls: Add 1 to x and y before `term.moveTo()`
- Mouse events: Converted to 0-based in [src/main.ts](src/main.ts) before passing to patterns

## Application Controls

**Keyboard:**
- 1-4: Switch to patterns 1-4
- n/p: Next/Previous pattern
- SPACE: Pause/Resume
- +/-: Adjust FPS (10-60 range)
- ?: Toggle help overlay
- d: Toggle debug overlay (shows performance metrics)
- q/ESC/Ctrl+C: Quit

**Mouse:**
- Move: Triggers pattern `onMouseMove()`
- Click: Triggers pattern `onMouseClick()`
- Mouse support enabled via `term.grabInput({ mouse: 'motion' })`

## Files and Structure

```
src/
├── types/index.ts          # Core interfaces (Pattern, Cell, Point, Size)
├── main.ts                 # Entry point, input handling, UI overlays
├── renderer/
│   ├── TerminalRenderer.ts # Terminal setup, resize handling, rendering
│   └── Buffer.ts           # Double-buffering with dirty tracking
├── engine/
│   ├── AnimationEngine.ts  # Main loop, pattern switching
│   └── PerformanceMonitor.ts # FPS and timing metrics
└── patterns/
    ├── WavePattern.ts      # Sine waves with ripple effects
    ├── StarfieldPattern.ts # 3D starfield with parallax
    ├── MatrixPattern.ts    # Digital rain effect
    ├── RainPattern.ts      # Simple falling droplets
    └── QuicksilverPattern.ts # Liquid metal flow
```

## Current Status

**Phase 2 Complete** - 5 interactive patterns working:
1. Waves - Flowing sine waves with mouse ripples
2. Starfield - 3D stars with force field mouse interaction
3. Matrix - Digital rain with distortion effects
4. Rain - Falling drops with bounce effects
5. Quicksilver - Metallic liquid flow

**Phase 3 Goals** (see [PLAN.md](PLAN.md)):
- Configuration system (~/.splashrc)
- Theme support
- Additional patterns (Particles, Spiral, Plasma)

## Testing and Debugging

**Debug Mode:** Press `d` while running to see performance overlay with:
- Real-time FPS vs target
- Frame time breakdown (update, pattern render, terminal render)
- Changed cell count (lower is more efficient)
- Dropped frame count
- Min/Avg/Max FPS

**Manual Testing:**
- Test patterns individually with number keys
- Verify mouse interaction in each pattern
- Resize terminal window to test resize handling
- Check CPU usage (should stay under 5% when idle)

## Known Constraints

- Terminal color support varies by emulator; app uses RGB colors (24-bit)
- Mouse events depend on terminal capabilities
- Performance degrades with very small terminal windows (more cells to update)
- Not suitable for non-TTY environments (pipe, redirect)
