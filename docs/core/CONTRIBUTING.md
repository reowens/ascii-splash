# Contributing to ascii-splash

Welcome! This guide explains how to contribute to ascii-splash, whether you're adding new patterns, improving the engine, or enhancing existing features.

**Quick Links**:

- 🏗️ [Technical Architecture](../ARCHITECTURE.md) - System design and deep dive
- 🧪 [Testing Guide](../guides/TESTING.md) - Test strategy and coverage
- 📊 [Project Status](../PROJECT_STATUS.md) - Current metrics and roadmap
- 👤 [User Guide](../../README.md) - Installation and usage

---

## Pattern Development (Most Common Contribution)

### 1. Create the Pattern File

Create `src/patterns/YourPattern.ts`:

```typescript
import { Pattern, Cell, Theme, Size, Point, Color } from '../types';

interface YourPatternConfig {
  // Your pattern-specific settings
  speed?: number;
  intensity?: number;
}

export class YourPattern implements Pattern {
  name = 'YourPattern';
  private config: YourPatternConfig;

  constructor(theme: Theme, config?: Partial<YourPatternConfig>) {
    this.theme = theme;
    this.config = { speed: 1, intensity: 0.5, ...config };
  }

  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void {
    // Your animation logic here
    // buffer[y][x] = { char: '█', color: { r: 255, g: 0, b: 0 } }
  }

  onMouseMove?(pos: Point): void {
    // Optional: Handle mouse movement
    // pos is 0-based: { x: 0-width, y: 0-height }
  }

  onMouseClick?(pos: Point): void {
    // Optional: Handle mouse clicks
  }

  reset(): void {
    // Clean up internal state when pattern switches
    // Important for preventing memory leaks!
  }

  getPresets?(): PatternPreset[] {
    return [
      { id: 0, name: 'Default', config: {} },
      { id: 1, name: 'Fast', config: { speed: 2 } },
      { id: 2, name: 'Slow', config: { speed: 0.5 } },
      { id: 3, name: 'Intense', config: { intensity: 1 } },
      { id: 4, name: 'Subtle', config: { intensity: 0.2 } },
      { id: 5, name: 'Custom', config: { speed: 1.5, intensity: 0.7 } },
    ];
  }

  applyPreset?(presetId: number): boolean {
    const preset = this.getPresets()?.[presetId];
    if (preset?.config) {
      this.config = { ...this.config, ...preset.config };
      return true;
    }
    return false;
  }
}
```

### 2. Register Your Pattern

Edit `src/main.ts` and add to the patterns array:

```typescript
import { YourPattern } from './patterns/YourPattern';

// In the AnimationEngine initialization:
const patterns = [
  // ... existing patterns
  new YourPattern(theme, config.patterns.yourPattern),
];
```

### 3. Add Configuration

Edit `src/config/defaults.ts`:

```typescript
patterns: {
  yourPattern: {
    speed: 1,
    intensity: 0.5,
  },
}
```

Add the type definition to `src/types/index.ts`:

```typescript
interface YourPatternConfig {
  speed?: number;
  intensity?: number;
}
```

#### Where pattern types live

The codebase has **two** valid homes for pattern config types — pick based on what the config carries:

| Where                                      | When to use it                                                                                                                                                                                                                                                                          | Example                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **`src/types/index.ts` (centralized)**     | The config is JSON-serializable and you want it persistable to `~/.splashrc`. Wire it into `ConfigSchema.patterns` so users can override defaults. **All 23 procedural patterns follow this convention.**                                                                               | `WavePatternConfig`, `MatrixPatternConfig`             |
| **Local to `src/patterns/YourPattern.ts`** | The config carries non-serializable runtime data (file paths bound to image buffers, sockets, callback handles, etc.) that can't round-trip through JSON. **Don't** add it to `ConfigSchema`. `PhotoPatternConfig` is the canonical example (`source: string \| Buffer \| Uint8Array`). | `PhotoPatternConfig` in `src/patterns/PhotoPattern.ts` |

If you ever need both — a JSON-persistable defaults blob AND a runtime config — split them: put the persistable half in `types/index.ts`, keep the runtime half local.

### 4. Write Tests

Create `tests/unit/patterns/your-pattern.test.ts`:

```typescript
import { YourPattern } from '../../../src/patterns/YourPattern';
import { createMockTheme } from '../test-utils';

describe('YourPattern', () => {
  let pattern: YourPattern;
  const theme = createMockTheme();

  beforeEach(() => {
    pattern = new YourPattern(theme);
  });

  it('should render without errors', () => {
    const buffer: Cell[][] = Array(10)
      .fill(null)
      .map(() => Array(20).fill({ char: ' ', color: { r: 0, g: 0, b: 0 } }));

    expect(() => {
      pattern.render(buffer, 1000, { width: 20, height: 10 });
    }).not.toThrow();
  });

  it('should handle mouse movement', () => {
    expect(() => {
      pattern.onMouseMove?.({ x: 5, y: 5 });
    }).not.toThrow();
  });

  it('should support presets', () => {
    const presets = pattern.getPresets?.();
    expect(presets).toHaveLength(6);
    expect(pattern.applyPreset?.(0)).toBe(true);
  });

  it('should clean up on reset', () => {
    expect(() => {
      pattern.reset();
    }).not.toThrow();
  });
});
```

---

## Key Implementation Guidelines

### Coordinate System ⚠️ IMPORTANT

- **Internal patterns**: Use 0-based coordinates `(0,0)` is top-left
- **Mouse events**: Already converted to 0-based before reaching patterns
- **Buffer access**: Always use `buffer[y][x]`

```typescript
render(buffer: Cell[][], time: number, size: Size, mousePos?: Point) {
  // Correct: 0-based
  buffer[0][0] = { char: '█', color: { r: 255, g: 0, b: 0 } };

  // Correct: mousePos already 0-based
  if (mousePos && mousePos.x < size.width) {
    // Handle mouse
  }
}
```

### Color Usage

Use the theme's `getColor()` method for smooth interpolation:

```typescript
const color = this.theme.getColor(intensity); // intensity: 0-1
buffer[y][x] = { char: '█', color };
```

### Performance Tips

1. **Early rejection**: Test bounds before expensive calculations

   ```typescript
   if (distance > maxDistance) continue; // Skip before sqrt!
   ```

2. **Squared distances**: Avoid `Math.sqrt()`

   ```typescript
   const distSq = dx * dx + dy * dy;
   if (distSq > maxDistSq) continue;
   ```

3. **Preallocate arrays**: Don't create arrays in render loop

   ```typescript
   private positions: Point[] = [];  // In constructor
   ```

4. **Clean up state**: Always implement `reset()`
   ```typescript
   reset(): void {
     this.positions = [];
     this.particles = [];
   }
   ```

### Mouse Interaction

Patterns can optionally handle mouse input:

```typescript
onMouseMove?(pos: Point): void {
  // pos: { x: 0-width, y: 0-height }
  // Called ~60 FPS max (throttled)
}

onMouseClick?(pos: Point): void {
  // Called on left-click
}
```

---

## Engine Contributions

### Adding New Commands

Edit `src/engine/CommandParser.ts` to recognize new command formats, then `CommandExecutor.ts` to implement the action.

### Improving Performance

See [ARCHITECTURE.md#performance-strategy](../ARCHITECTURE.md#performance-strategy) for benchmarking and optimization techniques.

### Configuration System

New global settings go in `src/config/defaults.ts`. See [guides/CONFIGURATION.md](../guides/CONFIGURATION.md) for details.

### Image-driven patterns (v0.4.0+)

If your pattern reads pixel data (photo input, video frames, generative-art bitmaps), you can reuse the v0.4.0 rendering helpers instead of writing your own pixel-to-cell loop:

| Helper                                                  | What it does                                                                                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderHalfBlock(buffer, rgba, w, h, opts)`             | RGBA → `Cell[][]` using `▀` / `▄` block characters with truecolor fg+bg. Each cell encodes 2 stacked pixels (2× vertical resolution). Opts: `invert`, `grayscale`, `contrast`, `threshold`, `bgTint`. |
| `renderBraille(buffer, rgba, w, h, opts)`               | RGBA → `Cell[][]` using Unicode Braille (U+2800–U+28FF). Each cell encodes 2×4 dots (8× resolution); cell color is the mean of lit dots. Opts: `threshold`, `invert`, `preBinarized`.                 |
| `floydSteinberg(rgba, w, h, levels)`                    | In-place error-diffusion dither. `levels=2` for braille (1-bit per channel); `levels=8` for halfblock retro banding.                                                                                  |
| `bayerOrdered(rgba, w, h, matrix, n, strength, levels)` | In-place ordered dither. Hue-preserving (same offset across channels). Pre-built matrices: `BAYER_8`, `BAYER_16`.                                                                                     |
| `rgbaToLuminance(rgba, w, h)`                           | RGBA → single-channel BT.601 luminance. Treats `alpha=0` as 0 luminance.                                                                                                                              |
| `sobelMagnitude(lum, w, h)`                             | 3×3 gradient magnitude. Borders are written as 0.                                                                                                                                                     |
| `differenceOfGaussians(lum, w, h, σ1, σ2)`              | Band-pass edge detector. Defaults σ=(1, 2) tuned for small canvas sizes (~70×50 to ~140×100); override σ2 upward for larger sources.                                                                  |
| `maskToRgba(mask, w, h)`                                | Wrap a single-channel mask back into grayscale RGBA so the renderers can consume it.                                                                                                                  |

The `PhotoPattern.applyPipeline` helper is the canonical example of stitching these together: `resized RGBA → optional edge → optional dither → renderer`. See `src/patterns/PhotoPattern.ts` for the full pattern.

> **Async lifecycle:** if your pattern decodes images, do it off the render path. `PhotoPattern` exposes `async load()` (decode once) and `async prepareForSize(size)` (resize on terminal-size or mode change). `render()` itself stays synchronous and rendering whatever is currently cached. See `PhotoPattern.ts` for the resize-coalescing pattern.

---

## Before Submitting

- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run build` - no TypeScript errors
- [ ] Pattern renders without errors at multiple sizes
- [ ] Mouse interaction works (if implemented)
- [ ] Presets (if implemented) work correctly
- [ ] No console errors or warnings
- [ ] `reset()` method properly cleans up state

---

## Questions?

- **Architecture questions**: See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Testing help**: See [guides/TESTING.md](../guides/TESTING.md)
- **API reference**: See [src/types/index.ts](../../src/types/index.ts)

---

**Last Updated**: May 9, 2026 (added v0.4.0 image-rendering helpers and the type-location convention)
