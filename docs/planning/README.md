# Planning & Enhancement Proposals

This directory contains enhancement proposals, feature plans, and future roadmap items for ascii-splash.

---

## Status Overview

| Item                                     | Status               | Last Updated |
| ---------------------------------------- | -------------------- | ------------ |
| **v0.2.0 ESM Migration**                 | ✅ Published         | Nov 5, 2025  |
| **v0.3.0 Scene-Based Patterns**          | 🔄 Planning          | Nov 5, 2025  |
| **v0.4.0 Photo / Visual Media Pipeline** | 📝 Draft             | May 9, 2026  |
| **Fireworks Enhancement**                | ✅ Complete          | Nov 3, 2025  |
| **Visual Media (GIFs)**                  | ✅ Complete (v0.1.4) | Nov 4, 2025  |
| **Pattern Audit**                        | 📊 Reference         | Nov 3, 2025  |

---

## Enhancement Proposals

### [v0.4.0 Roadmap — "From Engine to Canvas"](./v0.4.0-ROADMAP.md) 🆕

**Status**: 📝 Draft — Awaiting Approval
**Difficulty**: High
**Impact**: Transformative — Photo/video as first-class input + modern terminal graphics

Comprehensive roadmap for v0.4.0: turning ascii-splash into a canvas that renders any image as colored ASCII alongside procedural patterns. Five rendering modes (ascii-ramp, halfblock, braille, chafa-style symbol matcher, native protocol pass-through), scene composition with photo backgrounds, Kitty/iTerm2/Sixel support, color-mask sprites for richer scenes, seeded PRNG with share codes, and asciinema export. Backed by code-level inspection of chafa, viuer, ascii-image-converter, drawille, tarts, and asciiquarium in `~/Development/packages/`.

- Phase 1–2: PhotoPattern (halfblock + braille + dither + edge)
- Phase 3: Scene composition (photo bg + procedural overlay)
- Phase 4–5: Symbol matcher + protocol pass-through
- Phase 6: Color-mask sprites for hand-drawn scenes
- Phase 7–8: Seeded PRNG, share codes, asciinema export

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

### v0.4.0 - Advanced Technical Features

- [ ] ASCII Fluid Dynamics (water/smoke/fire simulation)
- [ ] Ray-Marched 3D Scenes (mountains, cityscapes)
- [ ] Custom color gradient support
- [ ] Performance profiling UI
- [ ] Community pattern showcase

### Future - Nice-to-Have

- [ ] Additional scenes:
  - Forest Clearing (swaying trees, wildlife)
  - Rainy Window (droplets, puddles, lightning)
  - Mountain Sunrise (time-of-day control)
  - Undersea Cave (bioluminescent creatures)
- [ ] Additional patterns:
  - Constellation Map
  - Ripple Grid
  - Waveform Visualizer
  - ASCII Art Morphing
- [ ] Demo/tutorial mode
- [ ] Integration with terminal themes

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

**Last Updated**: November 5, 2025
**Organization**: Active enhancement proposals separated from completed work
