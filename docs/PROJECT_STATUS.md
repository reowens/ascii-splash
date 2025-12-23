# Project Status - ascii-splash

**Last Updated:** December 23, 2025

## Overview

ascii-splash is a terminal ASCII animation app that displays animated patterns in a terminal window. It's designed as a lightweight ambient visual effect for IDE workspaces, targeting <5% CPU and <50MB RAM usage.

**Quick Links**:

- 👤 [User guide & installation](../README.md)
- 🏗️ [Technical architecture](ARCHITECTURE.md)
- 🧪 [Testing details](TESTING_PLAN.md)
- 📊 [v0.2.0 Release Report](status/reports/2025-11-05-v0.2.0-release.md)

## Current Status: v0.3.0 (Next-Generation Terminal Graphics) 🚀

The project has completed a major architecture upgrade with **scene-based patterns** and **new UI components**.

- **npm Package**: https://www.npmjs.com/package/ascii-splash
- **Current Development**: v0.3.0 (December 2025)
- **Previous Release**: v0.2.0 (November 5, 2025)
- **Installation**: `npm install -g ascii-splash` or `npx ascii-splash`

### Project Statistics

- **23 Patterns** with **138 Presets** (6 per pattern - standardized!)
- **5 Color Themes** (Ocean, Matrix, Starlight, Fire, Monochrome)
- **40+ Commands** via advanced command system
- **2097 Tests** with **92%+ Coverage** (comprehensive test suite!)
- **Scene-Based Architecture**: SceneGraph → SpriteManager → ParticleSystem
  - For technical details, see [ARCHITECTURE.md](ARCHITECTURE.md)
- **UI Components**: StatusBar, ToastManager, HelpOverlay, TransitionManager
- **Performance**: <5% CPU, ~40-50MB RAM (meeting all targets)

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

**v0.3.0 development in progress!** Major architecture upgrade with scene-based patterns.

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
| Phase 4 - Polish & Release              | 🔄 IN PROGRESS       |

## Features

**For comprehensive feature list and usage**, see [README.md](../README.md#-features).

**Quick Summary:**

- 23 patterns with 138 presets, 5 themes
- 5 new scene-based patterns (Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park)
- Enhanced Metaball Playground with physics modes
- 7 animated GIF demonstrations in README
- Full mouse support (move + click interactions)
- Advanced multi-key command system (40+ commands)
- Configuration file with CLI override support
- New UI components (StatusBar, ToastManager, HelpOverlay, TransitionManager)

### 🧪 Testing Coverage

**Test Statistics:**

- **Total Tests:** 2097 tests across 35+ suites
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

- For comprehensive testing plan and strategy, see [TESTING_PLAN.md](TESTING_PLAN.md)
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

**v0.3.0 Development Complete!** 🚀 Ready for release

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

**Immediate Next Steps (v0.3.0 Release):**

- 🎬 **Create GIF demos** for new scene-based patterns (optional)
- 📦 **Version bump** to v0.3.0 in package.json
- 🚀 **Publish to npm** and create GitHub release

**Future Enhancements (v0.4.0+):**

- Pattern refinements and bug fixes from user feedback
- Additional visual enhancements and effects
- Additional patterns (Constellation, Ripple Grid, Waveform, Mandelbrot, Kaleidoscope)
- Multi-terminal emulator testing
- Further performance profiling and optimization
- Community feedback integration

## Documentation

**For users:**

- [README.md](../README.md) - Installation, usage, controls, patterns

**For developers:**

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [TESTING_PLAN.md](TESTING_PLAN.md) - Testing strategy

**Configuration:**

- [examples/.splashrc.example](../examples/.splashrc.example) - Config file reference

## Contributing

**Status:** v0.1.5 ready for release. Future contributions welcome!

**For contribution guidelines**, see [README.md](../README.md#-contributing).

---

**Project Status:** v0.3.0 - Next-Generation Terminal Graphics 🚀
**Current Development:** v0.3.0 (December 2025)
**Latest Published on npm:** v0.2.0 (November 5, 2025)
**Patterns:** 23 patterns with 138 presets
**Test Coverage:** 92%+ (2097 tests) ✅
**Branch:** feature/v0.3.0-phase1-architecture
**npm Registry:** https://www.npmjs.com/package/ascii-splash
**GitHub Repository:** https://github.com/reowens/ascii-splash
**Visual Demos:** 7 animated GIFs (4.8MB total, optimized)
**New in v0.3.0:** Scene-based patterns, SceneGraph, SpriteManager, ParticleSystem, UI components
