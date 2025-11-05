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
const color = this.theme.getColor(intensity);  // intensity: 0-1
buffer[y][x] = { char: '█', color };
```

### Performance Tips

1. **Early rejection**: Test bounds before expensive calculations
   ```typescript
   if (distance > maxDistance) continue;  // Skip before sqrt!
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

**Last Updated**: November 4, 2025
