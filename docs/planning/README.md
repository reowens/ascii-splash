# Planning & Enhancement Proposals

This directory contains enhancement proposals, feature plans, and future roadmap items for ascii-splash.

---

## Status Overview

| Item | Status | Last Updated |
|------|--------|--------------|
| **v0.2.0 ESM Migration** | ✅ Complete | Nov 4, 2025 |
| **Fireworks Enhancement** | 📋 Proposed | Nov 3, 2025 |
| **Visual Media (GIFs)** | 📋 Proposed | Nov 4, 2025 |
| **Pattern Audit** | 📊 Reference | Nov 3, 2025 |

---

## Enhancement Proposals

### [Fireworks Enhancement](./enhancement-proposals/FIREWORKS.md)
**Status**: Proposed
**Difficulty**: Medium
**Impact**: Visual enhancement for Fireworks pattern

Multi-stage explosions, particle variations, and secondary effects to enhance the Fireworks pattern's visual impact.

- Phase 1: Secondary explosion effects ✅
- Phase 2: Advanced variations (shape bursts, crackles) ✅
- Testing & refinement: 🔄 In Progress

---

### [Visual Media (README GIFs)](./enhancement-proposals/VISUAL_MEDIA.md)
**Status**: Proposed
**Difficulty**: Low-Medium
**Impact**: User engagement & documentation

Add animated GIFs to README.md showcasing 7 priority patterns, improving visual presentation without compromising README load times.

- Phase 1: Setup & tooling
- Phase 2: Pattern recording
- Phase 3: GIF optimization & embedding

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

## Roadmap (Future Versions)

### v0.3.0 - Visual Enhancements
- [ ] Fireworks multi-stage explosions (Phase 1 & 2)
- [ ] Demo GIFs in README
- [ ] Additional particle patterns

### v0.4.0 - Advanced Features
- [ ] Custom color gradient support
- [ ] Performance profiling UI
- [ ] Community pattern showcase

### Future - Nice-to-Have
- [ ] Additional patterns:
  - Constellation Map
  - Ripple Grid
  - Waveform Visualizer
  - Mandelbrot Set
  - Kaleidoscope
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

**Last Updated**: November 4, 2025
**Organization**: Active enhancement proposals separated from completed work
