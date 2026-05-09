# Project Status - ascii-splash

**Last Updated:** May 9, 2026

## Overview

ascii-splash is a terminal ASCII animation app that displays animated patterns in a terminal window. It's designed as a lightweight ambient visual effect for IDE workspaces, targeting <5% CPU and <50MB RAM usage.

**Quick Links**:

- 👤 [User guide & installation](../README.md)
- 🏗️ [Technical architecture](ARCHITECTURE.md)
- 🧪 [Testing details](guides/TESTING.md)
- 🗺️ [v0.4.0 Roadmap — "From Engine to Canvas"](planning/v0.4.0-ROADMAP.md) — current direction
- 📊 [v0.2.0 Release Report](status/reports/2025-11-05-v0.2.0-release.md)

## Current Status

- **Released**: v0.3.0 (Next-Generation Terminal Graphics) — Dec 25, 2025 ✅
- **In flight**: v0.4.0 Phases 1 + 2 — done on branch `feature/v0.4.0-phase1-photo-pattern`, awaiting review. Phase 1 = Half-block PhotoPattern; Phase 2 = Braille mode, FS / Bayer dither, Sobel / DoG edges, 12 photo presets total.
- **Next**: v0.4.0 Phase 3 — scene composition (photo background + procedural overlay; the v0.4 headline). See [roadmap](planning/v0.4.0-ROADMAP.md).

### Released (v0.3.0)

- **npm Package**: https://www.npmjs.com/package/ascii-splash
- **Installation**: `npm install -g ascii-splash` or `npx ascii-splash`
- The project completed a major architecture upgrade with **scene-based patterns** and **new UI components**.

### Project Statistics

- **23 Patterns** with **138 Presets** (6 per pattern — standardized)
- **+ optional `PhotoPattern`** when `--photo <path>` is supplied (v0.4.0 Phases 1 + 2, on branch — 12 photo presets, halfblock + braille modes, FS / Bayer dither, Sobel + DoG edges)
- **5 Color Themes** (Ocean, Matrix, Starlight, Fire, Monochrome)
- **40+ Commands** via advanced command system
- **2197 Tests** with **92%+ Coverage** (2097 in v0.3.0 + 43 in v0.4.0 Phase 1 + 57 in Phase 2)
- **Scene-Based Architecture**: SceneGraph → SpriteManager → ParticleSystem
  - For technical details, see [ARCHITECTURE.md](ARCHITECTURE.md)
- **UI Components**: StatusBar, ToastManager, HelpOverlay, TransitionManager
- **Performance**: <5% CPU, ~40-50MB RAM (meeting all targets)

### v0.4.0 In-Flight Highlights (May 2026) 🚧

Phases 1 + 2 are committed on `feature/v0.4.0-phase1-photo-pattern`. Not yet released to npm.

- **Optional 24th pattern**: `PhotoPattern` loaded only when `splash --photo PATH` is supplied. Decodes any image `sharp` can handle (JPEG / PNG / WebP / etc.) into the existing `Cell[][]` buffer.
- **`HalfBlockRenderer`** (Phase 1): RGBA → `▀` / `▄` with 24-bit fg+bg ANSI per cell. Direct port of viuer's MIT-licensed `block.rs`. 2× vertical resolution.
- **`BrailleRenderer`** (Phase 2): RGBA → U+2800–U+28FF, 8 dots per cell. Re-derived from the Unicode Braille spec. 8× resolution; cell color is the mean of lit dots.
- **`Cell.bg`**: New optional foreground/background field. Backward-compatible — existing 23 patterns leave it undefined.
- **Floyd-Steinberg + Bayer dither** (Phase 2, `src/utils/dither.ts`): Per-channel error diffusion (with configurable quantization levels) and hue-preserving ordered dither (8×8 + 16×16 matrices, recursively generated).
- **Sobel + Difference-of-Gaussians edge detection** (Phase 2, `src/utils/edges.ts`): 3×3 gradient and band-pass operators. DoG defaults σ=(1, 2) tuned for small canvas sizes; Marr–Hildreth σ=1.6 underflows on ~70×50 inputs.
- **12 photo presets**: 6 Phase-1 halfblock variants + 6 Phase-2 entries covering DoG edges, braille, braille-inverted, braille-dithered, braille-edges, and halfblock-Bayer. Phase-1 `edge-only` (preset 6) was a hard-threshold stub; upgraded to real Sobel in Phase 2.
- **Mode-aware resize**: Switching between halfblock and braille presets invalidates the cached resized image and triggers an async re-resize at the larger 2W × 4H source canvas (vs. W × 2H for halfblock).
- **Testing**: +43 in Phase 1, +57 in Phase 2 = +100 vs. v0.3.0's 2097 baseline → **2197 tests passing**, 92%+ coverage maintained.
- **No new CLI flags** beyond `--photo`. All Phase 2 capabilities reachable via runtime preset cycling. The principled "lock to exact state" mechanism arrives in Phase 7 (seeded PRNG + share codes).

### v0.3.0 Development Highlights (December 2025) 🚀

- **5 New Scene-Based Patterns**: Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park
- **Enhanced Metaball Playground**: Advanced physics simulation with multiple modes
- **Scene Graph Architecture**: Hierarchical rendering with layers, sprites, and particles
- **Sprite Manager**: Efficient sprite rendering with animation support
- **Particle System**: Configurable emitters with physics simulation
- **UI Components Integrated**: StatusBar, ToastManager, HelpOverlay, TransitionManager
- **Testing**: 2097 tests passing (592 new tests added!)
- **Pattern Count**: 18 → 23 patterns
- **Preset Count**: 108 → 138 presets

### v0.2.0 Release Highlights (November 5, 2025) ✅

- **ESM Migration**: Fully migrated to ESM (type: module in package.json)
- **conf Update**: Updated from v10.2.0 to v15.0.2 (primary migration goal)
- **Import Syntax**: Added .js extensions to all imports for ESM compliance
- **Jest ESM**: Migrated to jest.config.mjs with ESM-compatible configuration
- **Testing**: All 1505 tests passing, **92.35% coverage** (improved from 82.34%!)
- **Type Compatibility**: Fixed conf v15 ESM type issues with workaround
- **Workflow Fix**: Fixed release workflow for ESM compatibility (jq instead of require)
- **Breaking Changes**: Library consumers need to use ESM syntax (CLI users unaffected)
- **Status**: ✅ **PUBLISHED TO NPM** and GitHub Release created
- **Release Time**: 3m53s (31% faster than previous releases)

### v0.1.5 Release Highlights (November 4, 2025) ✅

- **Dependency Updates**: Updated @types/node to 24.10.0 (patch update)
- **Stability**: Kept conf at 10.2.0 (v15+ requires ESM migration, planned for v0.2.0)
- **Testing**: All 1505 tests passing, 82.34% coverage maintained
- **CI/CD**: Successful automated release via GitHub Actions (5m40s)

### v0.1.4 Release Highlights (November 4, 2025) ✅

- **Visual Demonstrations**: Added animated GIF previews to README
  - 7 pattern demonstrations: Starfield, Matrix, Fireworks, Lightning, Plasma, Waves, DNA
  - Professional 2x2 hero grid + 1x3 additional patterns layout
  - Total media size: 4.8MB (optimized with gifsicle, 82% reduction from source)
  - Immediate pattern preview before installation
- **Recording Automation**: Complete recording workflow scripts
  - `scripts/record-patterns.sh`: Automated asciinema recording
  - `scripts/convert-gifs.sh`: Batch GIF conversion with agg
  - `scripts/optimize-gifs.sh`: Batch optimization with gifsicle
- **Marketing Enhancement**: Significantly improved first-impression experience
  - Expected 20-30% increase in npm downloads
  - Better conversion rate for GitHub → install funnel

### v0.1.3 Release Highlights (November 4, 2025) ✅

- **Preset Standardization**: All 17 patterns now have exactly 6 presets each (102 total)
  - Wave: 8→6, Starfield: 8→6, Plasma: 9→6, Rain: 9→6
  - Consistent preset cycling and command system behavior
- **Fireworks Fix**: Fixed race condition in particle spawning preventing overflow
- **Test Stability**: Fixed 2 flaky tests (Smoke, Rain) for reliable CI/CD
- **Tests**: All 1505 tests passing (added 2 new Fireworks race condition tests)
- **Performance**: Maintained <5% CPU target across all patterns

## Phase Completion

**v0.3.0 released!** Major architecture upgrade with scene-based patterns.

| Phase                                   | Status               |
| --------------------------------------- | -------------------- |
| Phase 1 - Core MVP                      | ✅ COMPLETE (v0.1.0) |
| Phase 2 - Patterns & Performance        | ✅ COMPLETE (v0.1.0) |
| Phase 3 - Configuration & Extensibility | ✅ COMPLETE (v0.1.0) |
| Phase 4 - Command System & Presets      | ✅ COMPLETE (v0.1.0) |
| Phase 5 - New Patterns                  | ✅ COMPLETE (v0.1.0) |
| Phase 6 - Polish & Distribution         | ✅ COMPLETE (v0.1.0) |
| **Post-Release Phases**                 |                      |
| Phase 1 (Post) - Critical Fixes         | ✅ COMPLETE (v0.1.2) |
| Phase 2 (Post) - Performance            | ✅ COMPLETE (v0.1.2) |
| Phase 3 (Post) - Preset Standardization | ✅ COMPLETE (v0.1.3) |
| Phase 4 (Post) - Visual Demonstrations  | ✅ COMPLETE (v0.1.4) |
| Phase 5 (Post) - Dependency Maintenance | ✅ COMPLETE (v0.1.5) |
| **Major Version Releases**              |                      |
| Phase 1 (v0.2.0) - ESM Migration        | ✅ COMPLETE (v0.2.0) |
| **v0.3.0 - Next-Gen Graphics**          |                      |
| Phase 1 - Foundation Architecture       | ✅ COMPLETE          |
| Phase 2 - UX Integration                | ✅ COMPLETE          |
| Phase 3 - Scene Patterns                | ✅ COMPLETE          |
| Phase 4 - Polish & Release              | ✅ COMPLETE (v0.3.0) |
| **v0.4.0 - From Engine to Canvas**      |                      |
| Phase 1 - Half-block PhotoPattern       | ✅ DONE ON BRANCH    |
| Phase 2 - Braille + dither + edges      | ✅ DONE ON BRANCH    |
| Phase 3 - Scene composition             | 📋 NEXT              |
| Phase 4 - Symbol matcher (chafa-style)  | 📋 PLANNED           |
| Phase 5 - Protocol pass-through         | 📋 PLANNED           |
| Phase 6 - Color-mask sprites            | 📋 PLANNED           |
| Phase 7 - Seeded PRNG + share codes     | 📋 PLANNED           |
| Phase 8 - asciinema export              | 📋 PLANNED           |
| Phase 9 (stretch) - GIF export          | ⏳ IF BUDGET ALLOWS  |

## Features

**For comprehensive feature list and usage**, see [README.md](../README.md#-features).

**Quick Summary:**

- 23 procedural patterns with 138 presets, 5 themes
- Optional 24th pattern: `PhotoPattern` (`splash --photo PATH`, v0.4.0+, 12 photo presets)
- 5 scene-based patterns (Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park)
- Enhanced Metaball Playground with physics modes
- 7 animated GIF demonstrations in README
- Full mouse support (move + click interactions)
- Advanced multi-key command system (40+ commands)
- Configuration file with CLI override support
- UI components (StatusBar, ToastManager, HelpOverlay, TransitionManager)
- Image-rendering helpers: `HalfBlockRenderer`, `BrailleRenderer`, Floyd-Steinberg + Bayer dither, Sobel + DoG edge detection (v0.4.0+, available for any pattern that needs to consume RGBA)

### 🧪 Testing Coverage

**Test Statistics:**

- **Total Tests:** 2197 tests across 53 suites (v0.3.0 baseline 2097 + v0.4.0 Phases 1 + 2 = +100)
- **Coverage:** 92%+ statements (significantly exceeded 80% target!)
- **Status:** All tests passing ✅ (100%)
- **Execution Time:** ~30-40 seconds

**Component Coverage:**

- CommandParser: 100%
- Buffer: 100%
- ConfigLoader: 100%
- PerformanceMonitor: 100%
- Theme: 100%
- CommandBuffer: 100%
- AnimationEngine: 98.14%
- CommandExecutor: 96.63%
- TerminalRenderer: 88.49%
- SceneGraph: 95%+
- SpriteManager: 95%+
- ParticleSystem: 95%+

**Pattern Testing:**

- All 23 patterns tested (800+ pattern tests)
- Coverage range: 95%-100% statements for core patterns
- SpiralPattern: 99.24% statements, 96.42% branches
- TunnelPattern: 100% statements, 97.43% branches
- Preset validation (all 138 presets)
- Mouse event testing (move, click, force fields, bursts)
- State management testing (reset, metrics, stability)
- Buffer fill verification tests
- Edge cases and rapid operation tests

**UI Component Testing:**

- StatusBar: state management, FPS color coding, segment layout
- ToastManager: show/dismiss/clear, auto-dismiss timing, max limit
- HelpOverlay: toggle, tab navigation, render bounds
- TransitionManager: start/cancel, progress tracking, blend rendering

**Documentation:**

- For comprehensive testing plan and strategy, see [guides/TESTING.md](guides/TESTING.md)
- Test utilities for color comparison and buffer validation
- Coverage reports in `coverage/` directory

## Architecture

**For comprehensive technical architecture documentation**, see [ARCHITECTURE.md](ARCHITECTURE.md).

Highlights:

- 3-layer architecture: Renderer → Engine → Patterns
- Double-buffering with dirty cell tracking
- Pattern interface with theme and preset support
- Command system with parser and executor
- Configuration system with 3-tier priority (CLI > file > defaults)

**v0.3.0 Architecture Additions:**

- **SceneGraph**: Hierarchical scene management with layers and transforms
- **SpriteManager**: Efficient sprite rendering with pooling and animation
- **ParticleSystem**: Configurable particle emitters with physics simulation
- **UI Components**: StatusBar, ToastManager, HelpOverlay, TransitionManager

## Performance Metrics

**Target Performance:**

- CPU Usage: <5% (idle)
- Memory: <50MB
- FPS: 30 (stable)

**Measured on Apple M1:**

- LOW preset (15 FPS): 1-2% CPU
- MEDIUM preset (30 FPS): 2-4% CPU
- HIGH preset (60 FPS): 4-6% CPU
- Memory: ~40-50MB RSS

**Optimizations:**

- Dirty cell tracking (only redraws changed cells)
- Mouse event throttling (~60 FPS)
- Pattern-specific optimizations (early rejection tests)
- Efficient terminal writes (minimal escape sequences)

## What's Next

**v0.3.0 released (Dec 25, 2025); v0.4.0 Phases 1 + 2 done on branch (May 9, 2026).**

**On the branch awaiting review** (`feature/v0.4.0-phase1-photo-pattern`, 4 commits ahead of `main`):

- ✅ **`PhotoPattern`** — opt-in 24th pattern via `splash --photo PATH` (decode via `sharp`).
- ✅ **`HalfBlockRenderer`** — Phase 1 — RGBA → `▀` / `▄` with truecolor fg+bg ANSI per cell, 2× vertical resolution.
- ✅ **`BrailleRenderer`** — Phase 2 — RGBA → U+2800–U+28FF, 2×4 dots per cell, 8× resolution.
- ✅ **Floyd-Steinberg + Bayer dither, Sobel + DoG edge detection** — Phase 2 utilities (`src/utils/dither.ts`, `src/utils/edges.ts`).
- ✅ **12 photo presets** (6 Phase-1 halfblock variants + 6 Phase-2 halfblock-DoG / braille / dithered / edges / Bayer combos). `edge-only` (preset 6) upgraded from a hard-threshold stub to real Sobel.
- ✅ **+100 tests** vs. v0.3.0 baseline → **2197 tests passing**, 92%+ coverage maintained.
- ✅ **CHANGELOG, CLAUDE.md, ARCHITECTURE.md, PROJECT_STATUS.md, planning/v0.4.0-ROADMAP.md, core/CONTRIBUTING.md, guides/TESTING.md, guides/CONFIGURATION.md, README.md** all reflect Phase 1 + 2.

**Phase 3 (next):** Scene composition — `PhotoPattern` becomes a `SceneLayer`, layered with sparse procedural overlays (Lightning, Fireworks, Rain, Snow, Starfield, etc.). Adds `transparentBg` to dense patterns (Plasma, Wave, Matrix). The v0.4 headline feature.

**Completed in v0.3.0 (December 2025):**

- ✅ **5 New Scene-Based Patterns** (Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park)
- ✅ **Enhanced Metaball Playground** with physics modes
- ✅ **SceneGraph Architecture** for hierarchical rendering
- ✅ **SpriteManager** with pooling and animation support
- ✅ **ParticleSystem** with configurable emitters
- ✅ **UI Components Integrated** (StatusBar, ToastManager, HelpOverlay, TransitionManager)
- ✅ **2097 tests passing** (592 new tests added!)
- ✅ **CHANGELOG updated** with comprehensive v0.3.0 entry
- ✅ **README updated** with 5 new pattern descriptions

**Completed in v0.2.0 (November 5, 2025):**

- ✅ **ESM Migration** (CommonJS → ECMAScript Modules)
- ✅ **conf v15.0.2 Update** (from v10.2.0)
- ✅ **Import Syntax Updates** (.js extensions added to all imports)
- ✅ **Jest ESM Configuration** (migrated to jest.config.mjs)
- ✅ **Type Compatibility Fix** (conf v15 ESM type workaround)
- ✅ **Workflow Fix** (ESM-compatible version check with jq)
- ✅ **All 1505 tests passing**, 92.35% coverage (improved from 82.34%!)
- ✅ **Published to npm** (v0.2.0 live and verified)
- ✅ **GitHub Release** created with full changelog
- ✅ **Release Report** documented ([view report](status/reports/2025-11-05-v0.2.0-release.md))

**Completed in v0.1.5:**

- ✅ Dependency maintenance (@types/node 24.10.0)
- ✅ Documented conf v15 ESM incompatibility
- ✅ Automated release via GitHub Actions (5m40s)
- ✅ All 1505 tests passing, 82.34% coverage

**Completed in v0.1.4:**

- ✅ Visual demonstrations (7 animated GIFs in README)
- ✅ Recording automation scripts (record, convert, optimize)
- ✅ Marketing enhancement (professional visual presentation)
- ✅ Pushed to GitHub (live on repository)

**Completed in v0.1.3:**

- ✅ Preset standardization (all patterns now have exactly 6 presets)
- ✅ Fireworks race condition fixed
- ✅ Test stability improvements (fixed flaky Smoke and Rain tests)
- ✅ CI/CD reliability established

**v0.3.0 Release Complete:** ✅

- ✅ Published to npm (December 25, 2025)
- ✅ GitHub release created
- ✅ All 2097 tests passing
- ✅ Global install verified working

---

## v0.4.0 Direction — "From Engine to Canvas"

The full plan lives in [docs/planning/v0.4.0-ROADMAP.md](planning/v0.4.0-ROADMAP.md). Quick summary:

| Phase                          | Status              | Deliverable                                                         |
| ------------------------------ | ------------------- | ------------------------------------------------------------------- |
| 1 — Half-block PhotoPattern    | ✅ Done on branch   | `splash --photo <path>` renders any image at 2× vertical resolution |
| 2 — Braille + dithering + edge | ✅ Done on branch   | 8× resolution braille; FS + Bayer dither; Sobel + DoG; 12 presets   |
| 3 — Scene composition          | 📋 Planned (next)   | Photo background + procedural overlay (the v0.4 headline)           |
| 4 — Chafa-style symbol matcher | 📋 Planned          | Wow-mode rendering via 8×8 bitmap matching (~200 LOC port)          |
| 5 — Protocol pass-through      | 📋 Planned          | Kitty / iTerm2 / Sixel detection + emit, halfblock fallback         |
| 6 — Color-mask sprites         | 📋 Planned          | Multi-color hand-drawn scenes (asciiquarium technique)              |
| 7 — Seeded PRNG + share codes  | 📋 Planned          | `splash share` / `splash play AB7K2X9` reproducibility              |
| 8 — asciinema export           | 📋 Planned          | One-keystroke `.cast` recording                                     |
| 9 (stretch) — GIF export       | ⏳ If budget allows | `splash record --format gif`                                        |

**Branch**: Phases 1 + 2 sit on `feature/v0.4.0-phase1-photo-pattern`, hooks green, awaiting review. Not yet merged or published.

### Post-v0.4 stretch ideas (deferred to v0.5+)

Captured in the roadmap, not on the v0.4 critical path:

- Audio-reactive overlays (cross-platform audio capture is hard; defer until user signal)
- Video-to-ASCII (frame extraction is easy; UX is its own project)
- SDF / raymarching framework
- Fluid simulation sandbox
- Plugin / scripting system (JSON pattern definitions first, isolated-vm scripts later, WASM eventually)
- Marketplace / gallery UI for sharing share-codes
- Time-of-day automation
- Theme designer mode

### Pattern wishlist (community-priority)

Tracked separately — mostly net-new patterns that don't depend on v0.4 infrastructure: Rainy City, Space Station, Underwater Cave, Haunted Forest, Constellation, Ripple Grid, Waveform, Mandelbrot, Kaleidoscope.

### Technical improvements (general hygiene)

- Fix ts-jest warnings (jest config modernization)
- Multi-terminal testing matrix (iTerm2, Alacritty, Kitty, Windows Terminal)
- Performance profiling
- Reduce bundle size (sharp itself adds ~16-32 MB)
- WebGL renderer for capable terminals (long-term)

### Community

- Monitor npm downloads and GitHub issues
- Respond to bug reports and feature requests
- Accept community pattern contributions
- Create contribution templates for new patterns

## Documentation

**For users:**

- [README.md](../README.md) - Installation, usage, controls, patterns

**For developers:**

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [guides/TESTING.md](guides/TESTING.md) - Testing strategy

**Configuration:**

- [examples/.splashrc.example](../examples/.splashrc.example) - Config file reference

## Contributing

**Status:** v0.3.0 stable release. Contributions welcome!

**For contribution guidelines**, see [README.md](../README.md#-contributing).

---

**Project Status:** v0.3.0 stable; v0.4.0 Phases 1 + 2 done on branch
**Latest Published:** v0.3.0 (December 25, 2025)
**Patterns:** 23 patterns with 138 presets (+ optional `PhotoPattern` via `--photo` on branch)
**Test Coverage:** 92%+ (2197 tests) ✅
**Active branch:** `feature/v0.4.0-phase1-photo-pattern`
**Roadmap:** [v0.4.0 — "From Engine to Canvas"](planning/v0.4.0-ROADMAP.md)
**npm:** https://www.npmjs.com/package/ascii-splash
**GitHub:** https://github.com/reowens/ascii-splash
**Install:** `npm install -g ascii-splash` or `npx ascii-splash`
