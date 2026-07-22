---
type: doc
status: active
---

# Project Status — ascii-splash

**Last updated:** July 12, 2026

## Current Status

- **Latest release:** v0.5.0, “Shareable Scenes” — May 11, 2026
- **Previous release:** v0.4.0, “Photos in the Terminal” — May 10, 2026
- **Current feature:** workspace visualization via `splash watch`
- **Workspace Phase A:** model, radial layout, camera, fixture parser, static
  renderer, CLI fixture mode, and unit/lifecycle coverage complete
- **Next gate:** tune and approve the 80×24 visual result before beginning the
  Phase B live-filesystem watcher
- **Repository audit:** M0–M8 remediation complete; all findings resolved

## Verified Statistics

| Metric              |     Current value |
| ------------------- | ----------------: |
| Procedural patterns |                23 |
| Procedural presets  |               138 |
| Photo presets       |                18 |
| Color themes        |                 5 |
| Test suites         |                70 |
| Tests               |      2390 passing |
| Statement coverage  |            94.56% |
| Branch coverage     |            87.24% |
| Function coverage   |            94.56% |
| Line coverage       |            95.14% |
| Runtime audit       | 0 vulnerabilities |
| Full npm audit      | 0 vulnerabilities |

Workspace-viz coverage is 94.52% statements, 84.11% branches, 96.15%
functions, and 97.77% lines.

## Product Surface

- **Procedural mode:** 23 interactive patterns with six presets each.
- **Photo mode:** `splash --photo <path>` adds `PhotoPattern`, supporting
  half-block, braille, and chafa-style symbol rendering.
- **Layered mode:** `splash --photo <path> --pattern <name>` composes a photo
  background with a procedural overlay.
- **Shareable scenes:** `splash share`, `splash play <code>`, and in-app
  `Shift+S` use seeded procedural state and 12-character share codes.
- **Workspace fixture mode:**
  `splash watch --fixture tests/fixtures/tree-medium.json` renders the Phase A
  static workspace view. Live filesystem events are planned for Phase B.

## Runtime Architecture

The active runtime is organized around:

- `PatternCatalog` for construction of stable pattern slots;
- `RuntimeController` as the single authority for pattern, preset, theme,
  quality, FPS, and seed state;
- `AnimationClock` for pause-aware scene-relative and application-relative
  timing;
- `AnimationEngine` for the frame loop and pattern lifecycle;
- `Buffer` and `TerminalRenderer` for final-cell diffing and terminal output;
- `TransitionManager` for immutable snapshot transitions;
- buffer-based status, toast, and help overlays;
- import-safe CLI/bootstrap boundaries with idempotent cleanup.

### Legacy cleanup

The unused `SceneGraph`, `SpriteManager`, `ParticleSystem`, EventBus, and Buffer
persistent-overlay experiments were removed in July 2026 after package-surface
review. Current patterns render directly into `Cell[][]`; `LayeredPattern`
composes sequentially; UI overlays use the ordinary frame buffer.

See [Architecture](ARCHITECTURE.md) and the
[architecture triage](status/reports/2026-07-11-architecture-triage.md).

## Quality Gates

The Node 20 CI job enforces:

1. runtime dependency audit;
2. build and strict typecheck;
3. ESLint and Prettier;
4. Jest coverage thresholds;
5. Codecov upload from the generated `coverage/lcov.info`.

Node 22 runs compatibility build/tests. Release additionally blocks publishing
on runtime advisories and audits the package tarball. Weekly Dependabot checks
npm and GitHub Actions dependencies.

The latest local verification passed build, typecheck, lint, formatting,
2390/2390 tests, coverage, full/runtime npm audits, package dry-run, and an
interactive pseudo-TTY smoke covering controls, resize, exit, and terminal
restoration.

## Release History

### v0.5.0 — Shareable Scenes

- Injected seeded randomness across every procedural pattern.
- Added versioned Crockford base32 share codes and config drift fingerprints.
- Added CLI and in-app share/play workflows.
- Added deterministic complete-buffer replay tests.

### v0.4.0 — Photos in the Terminal

- Added optional Photo and Layered pattern slots.
- Added half-block, braille, dither, edge, and symbol renderers.
- Added 18 photo presets.

### v0.3.0 — Next-Generation Terminal Graphics

- Added five scene-style procedural patterns and the enhanced Metaball pattern.
- Added status, toast, help, and transition UI components.
- Introduced experimental scene/sprite/particle primitives, now classified as
  legacy because production patterns ultimately used direct rendering.

## Roadmaps

- [Workspace Visualization](planning/enhancement-proposals/WORKSPACE_VIZ.md)
- [v0.5.0 roadmap](archived/v0.5.0-ROADMAP.md) — released
- [v0.4.0 roadmap](planning/v0.4.0-ROADMAP.md) — released phases 1–4; remaining
  graphics/export ideas deferred
- [Repository remediation plan](archived/2026-07-09-repository-remediation-plan.md)

## Quick Links

- [User guide](../README.md)
- [Architecture](ARCHITECTURE.md)
- [Testing guide](guides/TESTING.md)
- [Configuration guide](guides/CONFIGURATION.md)
- [Documentation index](README.md)
