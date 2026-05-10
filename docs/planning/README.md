# Planning & Enhancement Proposals

This directory contains enhancement proposals, feature plans, and future roadmap items for ascii-splash.

---

## Status Overview

| Item                                     | Status                         | Last Updated |
| ---------------------------------------- | ------------------------------ | ------------ |
| **v0.2.0 ESM Migration**                 | ✅ Published                   | Nov 5, 2025  |
| **v0.3.0 Scene-Based Patterns**          | ✅ Released (Dec 25, 2025)     | Dec 25, 2025 |
| **v0.4.0 Photo / Visual Media Pipeline** | 🚧 Phases 1 + 2 done on branch | May 9, 2026  |
| **Fireworks Enhancement**                | ✅ Complete                    | Nov 3, 2025  |
| **Visual Media (GIFs)**                  | ✅ Complete (v0.1.4)           | Nov 4, 2025  |
| **Pattern Audit**                        | 📊 Reference                   | Nov 3, 2025  |

---

## Enhancement Proposals

### [v0.4.0 Roadmap — "From Engine to Canvas"](./v0.4.0-ROADMAP.md) 🆕

**Status**: 🚧 Phases 1 + 2 done on `feature/v0.4.0-phase1-photo-pattern`; Phases 3–9 planned
**Difficulty**: High
**Impact**: Transformative — Photo/video as first-class input + modern terminal graphics

Comprehensive roadmap for v0.4.0: turning ascii-splash into a canvas that renders any image as colored ASCII alongside procedural patterns. Five rendering modes (ascii-ramp, halfblock, braille, chafa-style symbol matcher, native protocol pass-through), scene composition with photo backgrounds, Kitty/iTerm2/Sixel support, color-mask sprites for richer scenes, seeded PRNG with share codes, and asciinema export. Backed by code-level inspection of chafa, viuer, ascii-image-converter, drawille, tarts, and asciiquarium in `~/Development/packages/`.

- ✅ Phase 1: Half-block PhotoPattern (`splash --photo PATH`, 6 presets, 2× vertical resolution)
- ✅ Phase 2: Braille mode (8× resolution, U+2800–U+28FF), Floyd-Steinberg + Bayer dither, Sobel + DoG edge detection, 12 presets total, real Sobel replaces Phase-1 stub
- ✅ Phase 3: Scene composition (photo bg + procedural overlay; the v0.4 headline) — `LayeredPattern` + `transparentBg` opt-in for dense overlays
- ✅ Phase 4: Chafa-style symbol matcher (`mode: 'symbol'`, 34 hand-authored 8×8 bitmaps, three-step tiebreaker, 6 new presets → 18 photo presets total)
- 📋 Phase 5 (next): Native protocol pass-through (Kitty / iTerm2 / Sixel)
- 📋 Phase 6: Color-mask sprites for hand-drawn scenes
- 📋 Phase 7–8: Seeded PRNG, share codes, asciinema export

---

### [v0.3.0 Roadmap](./v0.3.0-ROADMAP.md)

**Status**: Planning & Discussion
**Difficulty**: High
**Impact**: Transformative - Scene-based patterns + Advanced effects

Comprehensive roadmap for v0.3.0 featuring 5 new scene-based patterns (Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall), one advanced effect (Metaball Playground), and architectural enhancements (scene graph, sprite system, enhanced particles).

- Foundation: Scene graph architecture, Ocean Beach, Campfire
- Core Scenes: Aquarium, Night Sky, Snowfall
- Technical Showcase: Metaball Playground
- Polish: Enhancements, documentation, testing

---

### [Fireworks Enhancement](./enhancement-proposals/FIREWORKS.md)

**Status**: ✅ Complete
**Difficulty**: Medium
**Impact**: Visual enhancement for Fireworks pattern

Multi-stage explosions, particle variations, and secondary effects to enhance the Fireworks pattern's visual impact.

- Phase 1: Secondary explosion effects ✅
- Phase 2: Advanced variations (shape bursts, crackles) ✅
- Testing & refinement: ✅ Complete

---

### [Visual Media (README GIFs)](./enhancement-proposals/VISUAL_MEDIA.md)

**Status**: ✅ Complete (v0.1.4)
**Difficulty**: Low-Medium
**Impact**: User engagement & documentation

Added animated GIFs to README.md showcasing 7 priority patterns, improving visual presentation without compromising README load times.

- ✅ Phase 1: Setup & tooling complete
- ✅ Phase 2: Pattern recording complete
- ✅ Phase 3: GIF optimization & embedding complete

---

### [Pattern Audit & Assessment](./enhancement-proposals/PATTERN_AUDIT.md)

**Status**: Reference
**Date**: November 3, 2025

Comprehensive audit of all 17 patterns, identifying:

- Patterns with excellent quality (9 - no changes needed)
- Patterns with enhancement opportunities (5 - minor improvements)
- Top candidates for enhancement (2-3 patterns)

Key finding: **Fireworks** is the standout candidate for Lightning-style enhancements.

---

## Roadmap

### [v0.3.0 - "Next-Generation Terminal Graphics"](./v0.3.0-ROADMAP.md) 🔄

**Status**: Planning & Discussion  
**Focus**: Scene-based patterns + Advanced effects

**Proposed Features**:

- [ ] **Scene Graph Architecture** - Layered rendering system
- [ ] **Ocean Beach Scene** - Waves, seagulls, clouds, interactive
- [ ] **Campfire Scene** - Flames, sparks, smoke, radial glow
- [ ] **Aquarium Scene** - Fish schools (boids), plants, bubbles
- [ ] **Night Sky with Aurora** - Stars, aurora ribbons, meteors
- [ ] **Snowfall in Park** - Falling snow, accumulation, swaying trees
- [ ] **Metaball Playground** - Interactive liquid physics
- [ ] Particle pattern enhancement (connection lines)
- [ ] Life pattern interactivity (click to edit)

**See**: [v0.3.0-ROADMAP.md](./v0.3.0-ROADMAP.md) for full details

---

### v0.4.0 - "From Engine to Canvas" (current direction)

The original v0.4.0 sketch (fluid dynamics, ray-marching, etc.) was retired in May 2026 in favor of the [Photo / Visual Media Pipeline](./v0.4.0-ROADMAP.md). The retired ideas live on under "Future - Nice-to-Have" below.

- ✅ Phase 1 — Half-block PhotoPattern
- ✅ Phase 2 — Braille + dithering + edge detection
- 📋 Phase 3 — Scene composition (photo bg + procedural overlay)
- 📋 Phase 4 — Chafa-style symbol matcher
- 📋 Phase 5 — Kitty / iTerm2 / Sixel pass-through
- 📋 Phase 6 — Color-mask sprites
- 📋 Phase 7 — Seeded PRNG + share codes
- 📋 Phase 8 — asciinema export
- ⏳ Phase 9 (stretch) — GIF export

### Future - Nice-to-Have (post-v0.4)

Captured in the v0.4.0 roadmap as deferred to v0.5+:

- [ ] ASCII fluid dynamics (water / smoke / fire simulation)
- [ ] Ray-marched / SDF 3D scenes (mountains, cityscapes, rotating donut)
- [ ] Audio-reactive overlays (waits for a real user signal; cross-platform Node audio capture is genuinely painful)
- [ ] Video-to-ASCII (per-frame `PhotoPattern` plus scrub UI)
- [ ] Plugin / scripting system (JSON pattern definitions first, isolated-vm scripts later, WASM eventually)
- [ ] Marketplace / gallery UI for sharing share-codes
- [ ] Custom color gradient support
- [ ] Performance profiling UI
- [ ] Demo / tutorial mode
- [ ] Integration with terminal themes
- [ ] Additional scenes (Forest Clearing, Rainy Window, Mountain Sunrise, Undersea Cave)
- [ ] Additional patterns (Constellation Map, Ripple Grid, Waveform Visualizer, ASCII Art Morphing)

---

## How to Propose an Enhancement

1. **Check existing proposals** - Avoid duplicates
2. **Create a proposal document** - Follow the template below
3. **Assessment** - Evaluate impact, difficulty, scope
4. **Prioritization** - Fit into roadmap timeline
5. **Implementation** - Phase-based approach for large features

### Proposal Template

```markdown
# [Feature Name] Enhancement

**Status**: Proposed | In Progress | Complete
**Date**: YYYY-MM-MM
**Difficulty**: Low | Medium | High
**Scope**: Pattern-specific | Engine-level | System-wide

## Overview

[What is this enhancement? Why is it important?]

## Current State

[What does it look like now?]

## Enhancement Goals

[What should be improved?]

## Implementation Plan

[Phases and specific tasks]

## Success Criteria

[How do we know it's done?]
```

---

## Completed Enhancements (Archive)

Completed features are moved to [../archive/](../archive/) for historical reference:

- **Lightning Enhancement** - Completed Phase 1 & 2
  - See: `archive/lightning-evolution/`
  - `LIGHTNING_V2_COMPLETE.md`

- **ESM Migration** - v0.2.0
  - See: `archive/reports/2025-11-04-esm-migration.md`
  - Full migration to ES modules complete

---

## Contributing to Enhancements

1. Pick a proposal that interests you
2. Read [../core/CONTRIBUTING.md](../core/CONTRIBUTING.md) for guidelines
3. Follow the implementation plan
4. Submit tests with your changes
5. Reference the proposal document in commit messages

---

## Questions?

- **Questions about a proposal?** Check the document's details section
- **Want to propose something new?** See [How to Propose](#how-to-propose-an-enhancement)
- **General contribution help?** See [core/CONTRIBUTING.md](../core/CONTRIBUTING.md)

---

**Last Updated**: May 9, 2026 (v0.4.0 Phases 1 + 2 done on branch; Phase 3 up next)
**Organization**: Active enhancement proposals separated from completed work
