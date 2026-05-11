# CLAUDE.md (AI Assistant Context)

> ⚠️ **FOR AI ASSISTANTS ONLY**: This file provides project context for AI code assistants to navigate and understand the ascii-splash project. It is NOT user or developer documentation.
>
> **Human readers**:
>
> - 👤 **Users**: See [README.md](README.md) for installation and usage
> - 👨‍💻 **Developers**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
> - 🗺️ **Navigation**: See [docs/README.md](docs/README.md) for documentation index

---

## Project Overview

**ascii-splash** is a lightweight terminal ASCII animation application that displays interactive animated patterns in a terminal window. Designed for IDE workspaces as an ambient visual effect.

**Key Stats** (released v0.4.0, May 10, 2026):

- **23 interactive procedural patterns** with full theme support (including 5 scene-based patterns)
- **+ optional `PhotoPattern`** (24th slot, loaded only when `--photo <path>` is supplied) with **18 photo presets** across half-block / braille / symbol render modes
- **+ optional `LayeredPattern`** slot (Photo + procedural overlay, e.g. `splash --photo bg.jpg --pattern starfield`)
- **138 procedural presets** (6 per pattern) + 18 photo presets
- **5 color themes** (Ocean, Matrix, Starlight, Fire, Monochrome)
- **40+ commands** via multi-key command system
- **2244 tests** with 92%+ coverage (2097 in v0.3.0; +147 from v0.4.0 Phases 1–4)
- **Performance**: <5% CPU, ~40-50MB RAM
- **Target**: Node.js 20+

**v0.4.0 released** (2026-05-10, npm: `ascii-splash@0.4.0`):

- **Phase 1 shipped**: `PhotoPattern` (24th slot, optional via `--photo <path>`), `HalfBlockRenderer`, `Cell.bg` field for two-tone cells, 6 photo presets, `sharp` runtime dep.
- **Phase 2 shipped**: `BrailleRenderer` (8× resolution via U+2800–U+28FF), Floyd-Steinberg + Bayer dithering, Sobel + DoG edge detection, 6 additional presets (ids 7–12), `edge-only` upgraded from stub to real Sobel.
- **Phase 3 shipped**: `LayeredPattern` composes a `PhotoPattern` background with a procedural overlay (`splash --photo bg.jpg --pattern starfield`). Plasma + Wave gained an opt-in `transparentBg` flag for dense-pattern compositing; sparse patterns (Matrix, Starfield, Lightning, …) compose naturally. Adds a `'layered'` slot displayed as `Photo + <Overlay>`. Bonus: latent Phase 1 theme-cycle crash fixed via a `buildPatterns()` helper that re-attaches the photo on every theme rebuild.
- **Phase 4 shipped**: chafa-style symbol matcher. `SymbolRenderer` picks, per 8×8 source patch, the bitmap whose lit/unlit partition best separates the patch into two color clusters (squared-color error). 34 hand-authored bitmaps across `TAG_ASCII | TAG_BLOCK | TAG_QUADRANT | TAG_SHADE`. Three-step tiebreaker (err → fg luminance → litCount) makes the choice between visually-equivalent bit-complement symbols deterministic. Adds `mode: 'symbol'` to `PhotoPattern` with an 8× source canvas and 6 new presets (ids 13–18) covering all-tags / ASCII-only / block-only / high-contrast / grayscale combos. 18 photo presets total.
- Release infra: `release.yml` does CI-side `npm publish --provenance` gated on tarball audit + tag-on-main + tag-matches-package.json. `npm version <bump>` fires `preversion` (test + typecheck) and `postversion` (push main + tag, watch CI, reinstall global) — one-command releases.
- Phases 5–9 planned: Kitty/iTerm2/Sixel pass-through, color-mask sprites, seeded PRNG + share codes, asciinema export.
- Full plan: [docs/planning/v0.4.0-ROADMAP.md](docs/planning/v0.4.0-ROADMAP.md).

**Tech Stack**:

- TypeScript/Node.js (ES2020, **ESM** - migrated in v0.2.0)
- `terminal-kit` - Terminal control & input
- `chalk` - Color output
- `commander` - CLI parsing
- `conf` v15.0.2 - Config file management (updated in v0.2.0)
- `sharp` v0.34+ — image decode + resize (added v0.4.0, only loaded on `--photo`)

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
│   ├── engine/
│   │   ├── AnimationEngine.ts   # Main loop, pattern switching
│   │   ├── PerformanceMonitor.ts # FPS & timing metrics
│   │   ├── CommandBuffer.ts     # Multi-key input accumulation
│   │   ├── CommandParser.ts     # Parse command strings
│   │   ├── CommandExecutor.ts   # Execute parsed commands
│   │   ├── SceneGraph.ts        # Hierarchical scene management (v0.3.0)
│   │   ├── SpriteManager.ts     # Sprite pooling & animation (v0.3.0)
│   │   ├── ParticleSystem.ts    # Particle emitters & physics (v0.3.0)
│   │   └── EventBus.ts          # Decoupled event system (v0.3.0)
│   │
│   ├── ui/                      # UI components (v0.3.0)
│   │   ├── StatusBar.ts         # Bottom status bar
│   │   ├── ToastManager.ts      # Toast notifications
│   │   └── HelpOverlay.ts       # Tabbed help system
│   │
│   ├── renderer/
│   │   ├── TerminalRenderer.ts  # Terminal setup, input, resize
│   │   ├── Buffer.ts            # Double-buffering with dirty tracking
│   │   └── TransitionManager.ts # Pattern transitions (v0.3.0)
│   │
│   └── patterns/                # 23 pattern implementations
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
│       ├── SnowPattern.ts
│       ├── OceanBeachPattern.ts   # Scene-based (v0.3.0)
│       ├── CampfirePattern.ts     # Scene-based (v0.3.0)
│       ├── AquariumPattern.ts     # Scene-based (v0.3.0)
│       ├── NightSkyPattern.ts     # Scene-based (v0.3.0)
│       ├── SnowfallParkPattern.ts # Scene-based (v0.3.0)
│       └── MetaballPattern.ts     # Enhanced (v0.3.0)
│
├── tests/                        # Jest test suites (2244 tests)
│   ├── unit/patterns/           # Pattern tests (23 + optional Photo)
│   ├── unit/engine/             # SceneGraph, SpriteManager, ParticleSystem
│   ├── unit/ui/                 # StatusBar, ToastManager, HelpOverlay
│   ├── unit/renderer/           # Buffer, HalfBlockRenderer, BrailleRenderer, TransitionManager
│   └── unit/utils/              # math, noise, drawing, dither, edges, validation
│
├── docs/                         # Developer documentation (reorganized Nov 4)
│   ├── ARCHITECTURE.md          # ⭐ Technical architecture reference
│   ├── PROJECT_STATUS.md        # Current metrics & status
│   ├── README.md                # 📍 Navigation index
│   │
│   ├── core/                    # ⭐ Essential developer guides
│   │   ├── QUICK_START.md       # 5-minute dev setup
│   │   └── CONTRIBUTING.md      # Pattern development guide
│   │
│   ├── guides/                  # How-to and operational docs
│   │   ├── TESTING.md           # Test strategy & coverage
│   │   ├── RELEASE.md           # Release procedures
│   │   └── CONFIGURATION.md     # Config reference
│   │
│   ├── planning/                # Enhancement proposals & roadmap
│   │   ├── README.md            # Planning overview
│   │   ├── enhancement-proposals/
│   │   │   ├── FIREWORKS.md
│   │   │   ├── VISUAL_MEDIA.md
│   │   │   └── PATTERN_AUDIT.md
│   │   └── roadmap/
│   │
│   ├── status/                  # Project reports & snapshots
│   │   └── reports/
│   │       ├── 2025-11-04-esm-migration.md
│   │       └── 2025-11-03-audit-report.md
│   │
│   ├── issues/                  # Issue tracking & testing
│   │   ├── README.md
│   │   ├── checklists/
│   │   └── completed/
│   │
│   └── archive/                 # Historical reference
│       ├── lightning-evolution/ # Lightning pattern V1/V2
│       ├── crash-analysis/      # Terminal crash investigations
│       └── sessions/            # Session notes & reports
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

**Note**: Documentation reorganized Nov 4, 2025 for clarity and maintainability (see [docs/README.md](docs/README.md)).

**Key Navigation**:

- 👤 **User documentation**: [README.md](README.md)
- 📚 **Developer quick start**: [docs/core/QUICK_START.md](docs/core/QUICK_START.md)
- 👨‍💻 **Technical architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 📖 **Contributing guide**: [docs/core/CONTRIBUTING.md](docs/core/CONTRIBUTING.md)
- 📊 **Project status**: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
- 🧪 **Testing guide**: [docs/guides/TESTING.md](docs/guides/TESTING.md)
- ⚙️ **Configuration reference**: [docs/guides/CONFIGURATION.md](docs/guides/CONFIGURATION.md)
- 📈 **Planning & roadmap**: [docs/planning/README.md](docs/planning/README.md)
- 📍 **Documentation index**: [docs/README.md](docs/README.md)

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

**Where pattern types live (convention)**:

- **JSON-persistable** pattern config (frequencies, speeds, density, etc.) → centralize in `src/types/index.ts` and wire into `ConfigSchema.patterns` so `~/.splashrc` can override defaults. All 23 procedural patterns follow this pattern.
- **Runtime-only** pattern config that carries non-serializable data (file paths bound to image buffers, sockets, etc.) → keep local to the pattern file. `PhotoPatternConfig` is the canonical example: its `source: string | Buffer | Uint8Array` field cannot round-trip through JSON, so it lives in `src/patterns/PhotoPattern.ts` and is not exposed via `ConfigSchema`.

**For full technical details**, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#contribution-points).

---

## Configuration (AI Context)

**Quick Overview**:

- **Config file**: `~/.config/ascii-splash/.splashrc.json`
- **Priority**: CLI args > Config file > Defaults
- **Patterns**: 23 patterns + optional `PhotoPattern` (loaded only when `--photo <path>` is supplied), each with custom config options
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
  getColor(intensity: number): Color; // Interpolate by intensity
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

**Released**: v0.4.0 — "Photos in the Terminal" ✅ **STABLE RELEASE** (2026-05-10)
**Previous**: v0.3.0 — Next-Generation Terminal Graphics (2025-12-23)
**In progress**: v0.5.0 — "Shareable Scenes" on `feature/v0.5.0-phase7-share-codes`, all phases complete, awaiting review before tagging. Seeded PRNG + 12-char Crockford base32 share codes (`splash share` / `splash play <code>` / in-app `Shift+S` to copy). All 7a–7f phases shipped: every pattern on injected `Random` (zero `Math.random()` in `src/patterns/`), encoder/decoder with version-prefix + 13-bit FNV-1a config fingerprint, CLI subcommands + clipboard helper, determinism test suite with byte-for-byte replay canaries on DNA + Starfield + Fireworks. 2317 tests. See [docs/planning/v0.5.0-ROADMAP.md](docs/planning/v0.5.0-ROADMAP.md).
**Next**: Remaining v0.4 roadmap phases (Kitty/iTerm2/Sixel, color-mask sprites, asciinema export, GIF export) — likely v0.6+.

**v0.3.0 (released)**:

- ✅ 23 Interactive patterns (17 classic + 5 scene-based + enhanced Metaball)
- ✅ 138 presets (6 per pattern)
- ✅ 5 color themes
- ✅ Configuration system
- ✅ Favorites & shuffle mode
- ✅ 2097 tests, **92%+ coverage**
- ✅ **Scene-based Architecture** - SceneGraph, SpriteManager, ParticleSystem
- ✅ **UI Components** - StatusBar, ToastManager, HelpOverlay, TransitionManager
- ✅ Published to npm (v0.3.0: Dec 25, 2025)

**v0.3.0 Highlights**:

- 5 new scene-based patterns: Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park
- Enhanced Metaball Playground with physics simulation modes
- SceneGraph architecture for hierarchical rendering
- New UI components integrated throughout

**v0.4.0 progress** (see [docs/planning/v0.4.0-ROADMAP.md](docs/planning/v0.4.0-ROADMAP.md)):

- ✅ **Phase 1 — Half-block PhotoPattern** (shipped in v0.4.0)
  - `splash --photo <path>` renders any image at 2× vertical resolution
  - 6 presets, aspect-preserving fit, truecolor fg+bg ANSI per cell
  - New `Cell.bg?: Color` field; backward-compatible
  - +43 tests
- ✅ **Phase 2 — Braille mode + dithering + edge detection** (shipped in v0.4.0)
  - `BrailleRenderer` (8× resolution): U+2800–U+28FF codepoints, mean-of-lit-dots color
  - Floyd-Steinberg error-diffusion dither with configurable quantization levels
  - Bayer ordered dither (8×8 + 16×16, hue-preserving offsets)
  - Sobel + DoG edge detectors (default DoG σ=(1,2) tuned for halfblock canvas size)
  - 6 new presets (ids 7–12); `edge-only` (id 6) upgraded from stub to real Sobel; 12 total
  - +57 tests; total 2197
  - All Phase 2 features reachable via runtime preset cycling — no new CLI flags (deferred to Phase 7's seeded-share-code mechanism)
- ✅ **Phase 3 — Scene composition (photo bg + procedural overlay)** (shipped in v0.4.0)
  - `splash --photo bg.jpg --pattern starfield` builds a `LayeredPattern` slot displayed as `Photo + <Overlay>`
  - `transparentBg` opt-in on Plasma + Wave for dense-overlay compositing; sparse overlays compose naturally via the existing space-character convention
  - Bonus fix: `buildPatterns()` helper in `main.ts` re-attaches `PhotoPattern` + layered slot on every theme rebuild (fixes a latent Phase 1 theme-cycle crash)
  - +19 tests; total 2216
- ✅ **Phase 4 — Chafa-style symbol matcher** (shipped in v0.4.0)
  - `SymbolRenderer` (`src/renderer/SymbolRenderer.ts`): per 8×8 patch picks the bitmap whose lit/unlit partition best separates the patch into two color clusters (squared color error)
  - 34 hand-authored bitmaps in `src/renderer/symbols.ts` across `TAG_ASCII | TAG_BLOCK | TAG_QUADRANT | TAG_SHADE` (16 ASCII shapes + 16 quadrant/block + 3 shades; space + `█` shared across tags). Numeric tag bitmask, not a TS const enum (repo eslint config rejects const enums)
  - Three-step tiebreaker (lowest err → higher fg luminance → higher litCount) — bit-complement symbols tie on err with fg/bg swapped; the tiebreaker picks the "lit = brighter" interpretation deterministically and settles uniform patches toward `█` (avoids leaking terminal bg through solid-color regions)
  - `PhotoRenderMode` extended with `'symbol'`; `canvasForMode` returns `width·8 × height·8` for symbol mode; mode change invalidates the resize cache. `getMetrics().mode` enum extended to `0|1|2`
  - 6 new presets (ids 13–18): `symbol`, `symbol-ascii`, `symbol-block`, `symbol-high-contrast`, `symbol-mono`, `symbol-ascii-mono`. PhotoPattern total: 18 presets
  - +28 tests (22 in `SymbolRenderer.test.ts`, +6 in `photo.test.ts`); total 2244
  - All Phase 4 features reachable via runtime preset cycling — no new CLI flags
- 📋 **Phase 5** — Kitty / iTerm2 / Sixel pass-through
- 📋 **Phase 6** — color-mask sprites (richer hand-drawn scenes)
- 📋 **Phase 7–8** — seeded PRNG + share codes; asciinema `.cast` export
- 📋 **Phase 9 (stretch)** — GIF export

**Post-v0.4 stretch ideas** (in roadmap, deferred to v0.5+):

- Audio-reactive overlays, video-to-ASCII, SDF/raymarching framework, fluid sandbox, plugin system, marketplace, time-of-day automation, theme designer mode.

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

- `tests/unit/patterns/`: Pattern-specific tests (23 patterns + optional Photo)
- `tests/unit/engine/`: Engine tests (AnimationEngine, PerformanceMonitor, SceneGraph, SpriteManager, ParticleSystem)
- `tests/unit/config/`: Configuration tests (ConfigLoader, defaults)
- `tests/unit/renderer/`: Renderer, Buffer & TransitionManager tests
- `tests/unit/ui/`: UI component tests (StatusBar, ToastManager, HelpOverlay)

**Coverage**: 92%+ (2244 tests)

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
- 📍 **Documentation Index**: [docs/README.md](docs/README.md) - Full documentation navigation
- 👨‍💻 **Technical Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and deep dive
- 📊 **Project Status**: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) - Current metrics and status
- 📚 **Core Docs**: [docs/core/](docs/core/) - Quick start and contributing guide
  - [Quick Start](docs/core/QUICK_START.md) - Get running in 5 minutes
  - [Contributing](docs/core/CONTRIBUTING.md) - Pattern development guide
- 📖 **Implementation Guides**: [docs/guides/](docs/guides/) - How-to and reference
  - [Testing Guide](docs/guides/TESTING.md) - Test strategy and coverage
  - [Release Process](docs/guides/RELEASE.md) - Release procedures
  - [Configuration Guide](docs/guides/CONFIGURATION.md) - Configuration reference
- 📈 **Planning & Roadmap**: [docs/planning/README.md](docs/planning/README.md) - Enhancement proposals
- 📦 **Archive**: [docs/archive/](docs/archive/) - Historical reference and completed work

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

**Last Updated**: May 11, 2026 (v0.5.0 phases 7d–7f complete — share-code encoder/decoder, CLI wiring (`splash share` / `splash play <code>` / in-app `Shift+S`), determinism test suite. 2317 tests passing on the branch. Awaiting review before tagging.)
**For**: AI Assistant navigation and project context
**Human Readers**: Please see [README.md](README.md) instead
