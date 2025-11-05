# Developer Quick Start

Get ascii-splash running locally in 5 minutes.

---

## 1. Setup (2 mins)

```bash
# Clone and install
git clone https://github.com/yourusername/ascii-splash.git
cd ascii-splash
npm install

# Build
npm run build

# Verify it works
npm start
```

Press `q` to exit.

---

## 2. Development Mode (Watch for Changes)

```bash
# Terminal 1: Watch & rebuild on file changes
npm run dev

# Terminal 2: Run the app
npm start
```

Now edit `src/patterns/WavePattern.ts`, save, and the changes will rebuild automatically!

---

## 3. Run Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 4. Your First Pattern Contribution

### Create the file

Create `src/patterns/MyFirstPattern.ts`:

```typescript
import { Pattern, Cell, Theme, Size, Point } from '../types';

export class MyFirstPattern implements Pattern {
  name = 'MyFirstPattern';

  constructor(private theme: Theme) {}

  render(buffer: Cell[][], time: number, size: Size): void {
    // Fill buffer with a simple pattern
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const intensity = (Math.sin(time / 1000 + x / 10) + 1) / 2;
        const color = this.theme.getColor(intensity);
        buffer[y][x] = { char: '█', color };
      }
    }
  }

  reset(): void {
    // Cleanup (none needed for this simple pattern)
  }
}
```

### Register it

Edit `src/main.ts` and add to the patterns array:

```typescript
import { MyFirstPattern } from './patterns/MyFirstPattern';

const patterns = [
  // ... existing patterns
  new MyFirstPattern(theme),
];
```

### Test it

```bash
npm run build
npm start
```

Press keys `1`-`9` and `n` to cycle through patterns.

### Add tests

Create `tests/unit/patterns/my-first-pattern.test.ts`:

```typescript
import { MyFirstPattern } from '../../../src/patterns/MyFirstPattern';
import { createMockTheme } from '../test-utils';

describe('MyFirstPattern', () => {
  it('should render', () => {
    const pattern = new MyFirstPattern(createMockTheme());
    const buffer = Array(10)
      .fill(null)
      .map(() =>
        Array(20).fill({ char: ' ', color: { r: 0, g: 0, b: 0 } })
      );

    expect(() => {
      pattern.render(buffer, 1000, { width: 20, height: 10 });
    }).not.toThrow();
  });
});
```

Run tests:

```bash
npm test -- my-first-pattern
```

---

## 5. Key Files for Development

| File | Purpose |
|------|---------|
| `src/main.ts` | Entry point, pattern registration |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/patterns/` | Pattern implementations (17 files) |
| `src/config/defaults.ts` | Default configuration |
| `src/engine/AnimationEngine.ts` | Main loop and pattern lifecycle |
| `tests/unit/` | Test suite (patterns, engine, config) |

---

## 6. Common Tasks

### Add a new command

1. Edit `src/engine/CommandParser.ts` to recognize the format
2. Edit `src/engine/CommandExecutor.ts` to implement the action

### Add a configuration option

1. Add to `src/config/defaults.ts`
2. Add TypeScript type to `src/types/index.ts`
3. Update `src/config/ConfigLoader.ts` if special handling needed

### Debug an issue

```bash
# Run with debug overlay (press 'd' during execution)
npm start

# Watch tests for a specific file
npm run test:watch -- patterns/wave
```

---

## 7. Learn More

- **Pattern Development**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Architecture Deep Dive**: [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Testing Strategy**: [guides/TESTING.md](../guides/TESTING.md)
- **Project Status**: [PROJECT_STATUS.md](../PROJECT_STATUS.md)

---

## Troubleshooting

**Build fails**: Ensure TypeScript is correct
```bash
npm run build
```

**Tests fail**: Check Jest output
```bash
npm test 2>&1 | head -100
```

**App crashes**: Check Node.js version (requires 20+)
```bash
node --version
```

**Pattern not showing**: Check pattern registration in `src/main.ts`

---

**Happy coding!**
