---
type: doc
status: reference
---

# Testing Guide

**Last updated:** July 12, 2026

## Current Baseline

| Metric      | Verified value |
| ----------- | -------------: |
| Test suites |     70 passing |
| Tests       |   2390 passing |
| Statements  |         94.56% |
| Branches    |         87.24% |
| Functions   |         94.56% |
| Lines       |         95.14% |

The configured global thresholds are 80% statements, 70% branches, 75%
functions, and 80% lines.

## Commands

Build before testing because the executable entry point is `dist/main.js`.

```bash
npm run build
npm test
npm run test:coverage
npm run test:integration
npm run test:perf
npm run typecheck
npm run lint
npm run format:check
npm run audit:runtime
```

Use `--runInBand` for deterministic full-suite verification and constrained CI
environments:

```bash
npm test -- --runInBand
npm run test:coverage -- --runInBand
```

## Suite Organization

```text
tests/
├── integration/       # CLI, command flow, share/play, real Conf behavior
├── performance/       # Photo cache and renderer performance guards
├── unit/
│   ├── cli/           # Import-safe bootstrap and key normalization
│   ├── config/        # Merge isolation, validation, themes
│   ├── engine/        # Runtime controller, clock, animation, commands
│   ├── patterns/      # Procedural, photo, layered, workspace views
│   ├── renderer/      # Buffers, transitions, image renderers
│   ├── ui/            # Status, toast, help overlays
│   └── utils/         # Random, share code, drawing, image utilities
├── fixtures/          # Schema-versioned workspace fixtures
└── utils/             # Mocks and shared helpers
```

## Required Coverage Areas

### Runtime state

- All scene mutations route through `RuntimeController`.
- Direct shortcuts and command execution produce the same authoritative state.
- Favorites survive theme rebuilds through stable pattern keys.
- Invalid scene changes do not partially mutate runtime state.

### Determinism and timing

- Procedural patterns receive injected `Random` instances.
- Complete rendered cells, including foreground and background colors, replay
  byte-for-byte from the same seed and relative schedule.
- Pause and stop intervals do not advance scene or application time.
- Pattern switches reset scene time without moving application time backward.

### Renderer and transitions

- Coordinates remain 0-based internally and are converted at terminal-kit
  boundaries.
- Buffer writes stay within `x < width` and `y < height`.
- Dirty tracking compares final cells exactly, including terminal-default
  versus explicit RGB colors.
- Transitions use immutable snapshots, survive resize, and do not render a
  pattern simulation more than once per frame.

### Configuration and external input

- File config is validated before merge and cannot mutate defaults.
- Allocation-driving values have finite, documented clamps.
- Share codes receive both structural and runtime-registry validation before
  TTY initialization.
- Real-`Conf` integration verifies path, defaults, save, and favorites behavior.
- Clipboard subprocesses time out, terminate, and fall through safely.

### Photo and workspace modes

- Static photo preprocessing is cached across warm frames.
- Newest-request-wins image resizing preserves the last valid frame on failure.
- Workspace model, layout, camera, fixture parsing, focus behavior, and
  persistent-model/disposable-view lifecycle are covered independently.

## Coverage Boundaries

`src/main.ts` is excluded as a thin executable bootstrap. Its pure CLI and
terminal-resource logic lives in import-safe modules and is covered by unit and
child-process integration tests.

`src/renderer/TerminalRenderer.ts` is excluded because terminal-kit requires a
real TTY. Terminal setup, controls, resize, exit, and cleanup are covered by the
manual pseudo-TTY smoke below.

The removed `SceneGraph`, `SpriteManager`, `ParticleSystem`, EventBus, and
persistent-overlay experiments have no characterization suites in the current
baseline. Local pattern-specific particle behavior remains covered with its
own pattern tests.

## Manual Interactive-TTY Smoke

Run in a real interactive terminal:

```bash
npm run build && node dist/main.js
```

Verify:

1. animation starts without errors;
2. `n`/`b`, `t`, and `.`/`,` navigate patterns, themes, and presets;
3. `?` opens help and `Esc` closes it;
4. `Space` pauses and resumes;
5. `d` toggles debug information;
6. resizing smaller and larger recovers cleanly;
7. `q` returns a normal prompt with cursor, echo, colors, and mouse mode reset;
8. a second run terminated with `Ctrl+C` restores the terminal identically.

For workspace fixture mode:

```bash
node dist/main.js watch --fixture tests/fixtures/tree-medium.json
```

Judge the 80×24 layout separately before enabling Phase B live watching.

## CI and Release

Node 20 CI runs runtime audit, build, typecheck, lint, format, and coverage, then
uploads the generated `coverage/lcov.info`. Node 22 runs compatibility
build/tests. Release repeats the runtime audit and verifies the package tarball
before publishing.

## Writing Tests

- Put behavior beside the owning unit and use existing mocks from
  `tests/utils/`.
- Inject clocks, randomness, stores, process spawning, and terminal resources.
- Prefer complete-cell equality over character-only assertions.
- Use fake timers only when necessary and drain/clear timers before restoring
  real timers.
- Add lifecycle checks for `reset()`, resize, pause, pattern switching, and
  cleanup when behavior touches those paths.
- Run the narrowest relevant suite while developing, then the full verification
  ladder before declaring the work complete.

See [Project Status](../PROJECT_STATUS.md) for the current measured baseline and
[Architecture](../ARCHITECTURE.md) for runtime ownership boundaries.
