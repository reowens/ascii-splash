# CLAUDE.md (AI Assistant Context)

> ⚠️ **FOR AI ASSISTANTS ONLY**: This file provides project context for AI code assistants to navigate and understand the ascii-splash project. It is NOT user or developer documentation.
>
> **Human readers**:
> - 👤 **Users**: See [README.md](README.md) for installation and usage
> - 👨‍💻 **Developers**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
> - 🗺️ **Navigation**: See [docs/README.md](docs/README.md) for documentation index

---

## Project Overview

**ascii-splash** is a lightweight terminal ASCII animation application that displays interactive animated patterns in a terminal window. Designed for IDE workspaces as an ambient visual effect.

**Key Stats**:
- **17 interactive patterns** with full theme support
- **102 total presets** (6 per pattern)
- **5 color themes** (Ocean, Matrix, Starlight, Fire, Monochrome)
- **40+ commands** via multi-key command system
- **Performance**: <5% CPU, ~40-50MB RAM
- **Target**: Node.js 20+

**Tech Stack**:
- TypeScript/Node.js (ES2020, CommonJS)
- `terminal-kit` - Terminal control & input
- `chalk` - Color output
- `commander` - CLI parsing
- `conf` - Config file management

---

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

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

**Critical**: Always build with `npm run build` before running. Entry point is `dist/main.js`, not source files.

---

## File Structure (For Navigation)

```
splash/
├── src/                          # TypeScript source
│   ├── types/index.ts           # All interfaces (Pattern, Cell, Config, etc.)
│   ├── main.ts                  # Entry point, CLI parsing, input handling
│   │
│   ├── config/
│   │   ├── defaults.ts          # Default configuration values
│   │   ├── ConfigLoader.ts      # Config merging & file management
│   │   └── themes.ts            # 5 color themes with interpolation
│   │
│   ├── renderer/
│   │   ├── TerminalRenderer.ts  # Terminal setup, input, resize handling
│   │   └── Buffer.ts            # Double-buffering with dirty tracking
│   │
│   ├── engine/
│   │   ├── AnimationEngine.ts   # Main loop, pattern switching
│   │   ├── PerformanceMonitor.ts # FPS & timing metrics
│   │   ├── CommandBuffer.ts     # Multi-key input accumulation
│   │   ├── CommandParser.ts     # Parse command strings
│   │   └── CommandExecutor.ts   # Execute parsed commands
│   │
│   └── patterns/                # 17 pattern implementations
│       ├── WavePattern.ts
│       ├── StarfieldPattern.ts
│       ├── MatrixPattern.ts
│       ├── RainPattern.ts
│       ├── QuicksilverPattern.ts
│       ├── ParticlePattern.ts
│       ├── SpiralPattern.ts
│       ├── PlasmaPattern.ts
│       ├── TunnelPattern.ts
│       ├── LightningPattern.ts
│       ├── FireworksPattern.ts
│       ├── LifePattern.ts
│       ├── MazePattern.ts
│       ├── DNAPattern.ts
│       ├── LavaLampPattern.ts
│       ├── SmokePattern.ts
│       └── SnowPattern.ts
│
├── tests/                        # Jest test suites
│   └── unit/patterns/
│       ├── wave.test.ts
│       ├── starfield.test.ts
│       └── ... (17 pattern tests + engine/config/renderer tests)
│
├── docs/                         # Developer documentation
│   ├── ARCHITECTURE.md          # ⭐ Technical architecture (for developers)
│   ├── README.md                # Documentation navigation index
│   ├── PROJECT_STATUS.md        # Current status snapshot
│   ├── TESTING_PLAN.md          # Testing strategy & coverage
│   └── DOCUMENTATION_AUDIT.md   # Documentation structure audit
│
├── examples/
│   └── .splashrc.example        # Example configuration file
│
├── README.md                     # ⭐ User guide & features
├── CHANGELOG.md                  # Version history
├── AGENTS.md                     # ⚠️ Symlink to CLAUDE.md
├── WARP.md                       # ⚠️ Symlink to CLAUDE.md
├── package.json
├── tsconfig.json
└── jest.config.js
```

**Note**: Session reports and audit documents are in `docs/archive/` for historical reference.

**Key Navigation**:
- 👤 **User documentation**: [README.md](README.md)
- 👨‍💻 **Technical details**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 📊 **Project status**: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
- 🧪 **Testing info**: [docs/TESTING_PLAN.md](docs/TESTING_PLAN.md)

---

## Pattern Development (AI Guidelines)

When creating new patterns, implement the `Pattern` interface:

```typescript
interface Pattern {
  name: string;
  render(buffer: Cell[][], time: number, size: Size, mousePos?: Point): void;
  onMouseMove?(pos: Point): void;
  onMouseClick?(pos: Point): void;
  reset(): void;
  getPresets?(): PatternPreset[];
  applyPreset?(presetId: number): boolean;
  getMetrics?(): Record<string, number>;
}
```

**Key Implementation Rules**:
1. **Buffer**: 2D array of `{char: string, color: Color}`
2. **Coordinates**: 0-based (0,0 is top-left), `x < width`, `y < height`
3. **Colors**: RGB objects `{r: 0-255, g: 0-255, b: 0-255}`
4. **Time**: Milliseconds since pattern start
5. **Mouse**: Already converted to 0-based from terminal-kit
6. **Presets**: Implement 6 presets per pattern
7. **Reset**: Clean up state when pattern switches
8. **Performance**: Minimize sqrt/trig, use squared distances, limit elements

**Performance Tips**:
- Early rejection tests before expensive math
- Preallocate arrays
- Cache repeated calculations
- Clean up in `reset()` to prevent leaks
- Check bounds before buffer access

**For full technical details**, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#contribution-points).

---

## Configuration (AI Context)

**Quick Overview**:
- **Config file**: `~/.config/ascii-splash/.splashrc.json`
- **Priority**: CLI args > Config file > Defaults
- **Patterns**: 17 patterns, each with custom config options
- **Themes**: 5 themes (Ocean, Matrix, Starlight, Fire, Monochrome)
- **Favorites**: Save/load pattern+preset+theme combinations

**For implementation details**, see:
- [docs/ARCHITECTURE.md#configuration-system](docs/ARCHITECTURE.md#configuration-system)
- [examples/.splashrc.example](examples/.splashrc.example) - Example config file

---

## Theme System (AI Context)

**Quick Overview**:
- **5 themes** provided (Ocean default)
- **Color interpolation**: Linear interpolation based on intensity (0-1)
- **Pattern integration**: Patterns receive Theme in constructor
- **Cycling**: Press `t` to cycle, or set via CLI/config

**Theme Interface**:
```typescript
interface Theme {
  name: string;
  displayName: string;
  colors: Color[];
  getColor(intensity: number): Color;  // Interpolate by intensity
}
```

**For implementation details**, see [docs/ARCHITECTURE.md#theme-system](docs/ARCHITECTURE.md#theme-system).

---

## Command System (Brief Overview)

**Multi-key command system** with `c` prefix:
- `c01-c99`: Apply presets
- `cp#`: Switch pattern
- `ct#`: Switch theme
- `cF#`: Save favorite
- `cf#`: Load favorite
- `c*`: Random preset
- `c**`: Random everything
- `c!`: Toggle shuffle
- `c!!`: Toggle shuffle all

**Quick shortcuts** (no prefix needed):
- `r`: Random pattern + preset + theme (same as `c**`)
- `s`: Save configuration (same as `cs`)
- `.` / `,`: Cycle presets
- `b`: Previous pattern

**For full command reference**, see [README.md#controls](README.md#controls).

---

## Current Status (AI Awareness)

**Status**: v0.1.0 - Published and Live ✅

**Completion**:
- ✅ 17 Interactive patterns (11 core + Life + Maze + DNA + LavaLamp + Smoke + Snow)
- ✅ 102 presets (6 per pattern)
- ✅ 5 color themes
- ✅ Configuration system
- ✅ Favorites & shuffle mode
- ✅ 817 tests, 82.34% coverage
- ✅ Complete documentation
- ✅ Published to npm (v0.1.0: Nov 2, v0.1.3: Nov 4, 2025)

**Future Enhancements**:
- Additional patterns (Constellation, Ripple Grid, Waveform, Mandelbrot, Kaleidoscope)
- Demo GIFs/videos for README
- Performance profiling and optimization
- Community feedback integration

---

## Testing & Debugging (AI Development)

**Running Tests**:
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

**Debug Mode** (in app):
- Press `d` to toggle debug overlay
- Shows: FPS, frame timing, pattern metrics, dropped frames

**Manual Testing Tips**:
- Test each pattern individually (keys 1-9, then n)
- Test mouse interaction (move, click)
- Test command system (prefix with 0)
- Resize terminal to check responsive rendering
- Monitor CPU usage with `top` or Activity Monitor

**Test Organization**:
- `tests/unit/patterns/`: Pattern-specific tests (17 files)
- `tests/unit/engine/`: Engine tests (AnimationEngine, PerformanceMonitor)
- `tests/unit/config/`: Configuration tests (ConfigLoader, defaults)
- `tests/unit/renderer/`: Renderer & Buffer tests

**Coverage Target**: 83% (currently met)

---

## Known Constraints (AI Pitfalls)

**Terminal Limitations**:
- RGB color support varies by emulator (some only 256-color or 16-color)
- Mouse support depends on terminal capabilities
- Very small terminal windows (<20 cols) may have rendering issues
- Not suitable for piped/redirected output (needs TTY)

**Performance Targets**:
- Keep CPU usage <5% idle, <6% at 60 FPS
- Memory: ~40-50 MB
- Frame drops OK at <5% occurrence

**Coordinate Systems**:
- ⚠️ **CRITICAL**: Terminal-kit uses 1-based (1,1 is top-left)
- ⚠️ **CRITICAL**: Internal APIs use 0-based (0,0 is top-left)
- Convert when calling terminal-kit functions

**No External Side Effects**:
- Patterns should not do file I/O, network calls, or subprocess spawning
- All state should be encapsulated in pattern instance
- No global variables outside of main.ts

---

## Symlinks (Developer Notes)

**AGENTS.md** and **WARP.md** are symlinks to this file. This allows:
- Multiple entry points for different users/contexts
- Single source of truth (CLAUDE.md content updates both)
- No duplication to maintain

**Do NOT delete these symlinks** - they maintain backward compatibility.

---

## References

### Documentation
- 👤 **User Guide**: [README.md](README.md) - Installation, features, controls
- 👨‍💻 **Technical Details**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architecture, design patterns
- 📊 **Status**: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) - Current project status
- 🧪 **Testing**: [docs/TESTING_PLAN.md](docs/TESTING_PLAN.md) - Test strategy and coverage
- 📋 **Audit**: [docs/DOCUMENTATION_AUDIT.md](docs/DOCUMENTATION_AUDIT.md) - Documentation structure
- 🗂️ **Index**: [docs/README.md](docs/README.md) - Documentation navigation

### External Resources
- [terminal-kit docs](https://github.com/cronvel/terminal-kit)
- [chalk docs](https://github.com/chalk/chalk)
- [commander.js docs](https://github.com/tj/commander.js)
- [conf docs](https://github.com/sindresorhus/conf)

---

## Quick Checklist for AI Coding Sessions

- [ ] Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
- [ ] Check [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for current status
- [ ] Review relevant test file in `tests/unit/` before modifying code
- [ ] Run `npm test` after changes
- [ ] Remember: 0-based coordinates in patterns, 1-based for terminal-kit!
- [ ] Clean up state in pattern `reset()` method
- [ ] Check performance: keep CPU <5%, prefer early rejection
- [ ] Update related tests alongside code changes
- [ ] Reference [README.md](README.md) for user-facing behavior

---

**Last Updated**: November 4, 2025
**For**: AI Assistant navigation and project context
**Human Readers**: Please see [README.md](README.md) instead
