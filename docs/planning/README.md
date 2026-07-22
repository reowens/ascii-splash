---
type: doc
status: reference
---

# Planning and Enhancement Proposals

**Last updated:** July 11, 2026

## Status Overview

| Item                          | Status                                                     | Updated  |
| ----------------------------- | ---------------------------------------------------------- | -------- |
| v0.3.0 scene-style patterns   | Released December 25, 2025                                 | Dec 2025 |
| v0.4.0 Photos in the Terminal | Released May 10, 2026                                      | May 2026 |
| v0.5.0 Shareable Scenes       | Released May 11, 2026                                      | Jul 2026 |
| Repository remediation        | M0–M8 complete                                             | Jul 2026 |
| Workspace visualization       | Phase A implementation/tests complete; visual gate pending | Jul 2026 |
| Fireworks enhancement         | Complete                                                   | Nov 2025 |
| README visual media           | Complete                                                   | Nov 2025 |

## Active Work

### [Workspace Visualization — `splash watch`](./enhancement-proposals/WORKSPACE_VIZ.md)

Phase A now includes the persistent workspace model, radial layout, camera,
fixture parser, disposable view, CLI fixture mode, and comprehensive unit and
lifecycle coverage. The next decision is the 80×24 visual-quality gate. Phase B
live filesystem watching must not begin until that result is accepted.

Planned later phases:

- Phase B: live filesystem watcher and normalized event stream;
- Phase C: Git state and commit events;
- Phase D: actor/agent visualization;
- Phase E: record and replay;
- Phase F: alternate skins and polish.

### [Repository Remediation](../archived/2026-07-09-repository-remediation-plan.md)

M0–M8 are complete. The work established one runtime state authority, exact
final-cell rendering, snapshot transitions, relative replay timing, photo
caching and resize resilience, workspace/config hardening, CI/release gates,
current documentation, and explicit disposition of unused architecture.

## Released Roadmaps

### [v0.5.0 — Shareable Scenes](../archived/v0.5.0-ROADMAP.md)

Released May 11, 2026. Added injected seeded randomness, versioned 12-character
share codes, CLI/in-app share and play flows, config drift fingerprints, and
deterministic replay tests.

### [v0.4.0 — From Engine to Canvas](./v0.4.0-ROADMAP.md)

Released May 10, 2026 with phases 1–4:

- half-block PhotoPattern;
- braille, dithering, and edge detection;
- photo/procedural `LayeredPattern` composition;
- chafa-style symbol matching and 18 photo presets.

Seeded randomness/share codes moved to and shipped in v0.5. Native graphics
protocols, color-mask sprites, asciinema export, and GIF export remain deferred
ideas rather than unfinished v0.4 release requirements.

### [v0.3.0 — Next-Generation Terminal Graphics](./v0.3.0-ROADMAP.md)

Released December 25, 2025. The roadmap remains historical. Its experimental
SceneGraph/SpriteManager/ParticleSystem architecture did not become the active
production rendering path and was removed in July 2026; see the
[architecture triage](../status/reports/2026-07-11-architecture-triage.md).

## Other Proposals

- [Fireworks enhancement](./enhancement-proposals/FIREWORKS.md) — complete
- [README visual media](./enhancement-proposals/VISUAL_MEDIA.md) — complete
- [Pattern audit](./enhancement-proposals/PATTERN_AUDIT.md) — historical reference

## Deferred Ideas

- Kitty, iTerm2, and Sixel native graphics protocols
- Color-mask scene sprites
- Asciinema and GIF export
- Audio-reactive overlays
- Video-to-ASCII
- SDF/ray-marched scenes and fluid simulation
- Plugin or scripting system
- Share-code gallery
- Time-of-day automation and theme design tools

## Proposing Work

1. Check this index and existing proposals for overlap.
2. Define the user problem, scope, non-goals, and measurable success criteria.
3. Identify runtime, compatibility, performance, and testing impact.
4. Split large work into independently demonstrable phases.
5. Add tests with implementation and update the relevant status entry directly
   on `main`; branch or pull-request workflows are used only when explicitly
   requested.

Completed plans remain available as historical design context and should not be
read as current production architecture without checking
[Project Status](../PROJECT_STATUS.md) and [Architecture](../ARCHITECTURE.md).
