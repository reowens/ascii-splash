# Changelog

All notable changes to ascii-splash will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-07-21 — "Solid Ground"

Tracking doc: [docs/planning/2026-07-09-repository-remediation-plan.md](docs/planning/2026-07-09-repository-remediation-plan.md)
(milestones M0–M8) and [docs/planning/2026-07-09-runtime-controller-design.md](docs/planning/2026-07-09-runtime-controller-design.md).

A repository-wide remediation pass that restores a trustworthy green baseline,
makes v0.5.0's share-code replay genuinely deterministic across real process
starts, gives the runtime a single authoritative scene-state owner, and adds the
release-quality gates that were previously reported but not enforced. Also lands
workspace-viz Phase A (`splash watch --fixture`) with full test coverage and
removes the unused experimental engine primitives. Final baseline: **2390 tests
across 70 suites**; coverage 94.56% statements, 87.24% branches, 94.56%
functions, 95.14% lines.

### Added

- **`RuntimeController`** (`src/engine/RuntimeController.ts`): the single mutable
  owner of active scene state — current pattern/slot, preset ID, theme index,
  quality, FPS, the slot collection, and per-slot seeds. Command execution and
  direct keyboard shortcuts now route through the same controller methods
  (`switchPattern`, `applyPreset`, `cyclePreset`, `changeTheme`, `applyScene`,
  `setQuality`, `setFps`, `resetCurrentPattern`), so they can no longer disagree
  about the active scene. Emits one typed `RuntimeChangeEvent` after each
  successful mutation; exposes immutable `RuntimeSnapshot` values for
  status/share/save without leaking mutable `Pattern`/`Theme` objects. Theme
  rebuilds resolve the active pattern by stable key, preserve seeds and the
  selected preset, and swap every slot atomically. `presetApplied` distinguishes
  the config-derived baseline from an explicitly applied preset 1.
- **`PatternCatalog`** (`src/patterns/PatternCatalog.ts`): the single source of
  runtime pattern construction and self-describing `PatternSlot` metadata (stable
  key, display name, kind, seed, shareability, presets, legacy names). Replaces
  the parallel name/display/seed arrays previously embedded in `main.ts`. The
  frozen procedural definition registry is asserted to match
  `PROCEDURAL_PATTERN_IDS` in order at module load and in tests. Optional photo,
  layered, and workspace slots are appended by the same builder; layered overlays
  now receive independent `Pattern` instances instead of sharing the standalone
  slot's object.
- **`AnimationClock`** (`src/engine/AnimationClock.ts`): an injectable,
  pause-aware relative clock with separate scene and application lifetimes over a
  monotonic source. Scene time resets on pattern activation, explicit reset, and
  preset application; application time stays continuous across scene and theme
  changes; paused and stopped intervals are excluded from scene time, application
  time, and frame delta. Patterns now receive scene-relative time (with an
  optional `FrameTime` context supplying scene/app/delta), making share-code
  replay reproduce byte-for-byte across sessions that start at different
  wall-clock origins. `WorkspaceVizPattern` consumes application time so its model
  epoch, heat, camera, and twinkle phase never move backward across disposable
  view rebuilds.
- **Runtime configuration validation** (`src/config/validateConfig.ts`): a
  boundary sanitizer that validates persisted globals and every persisted pattern
  field before the deep merge, pattern construction, and share-code fingerprint —
  finite bounds, count maxima, positive intervals, enums, booleans, terminal-safe
  characters, workspace arrays/maps, and coupled values (e.g. LavaLamp
  `minRadius <= maxRadius`). Invalid fields emit deterministic warnings carrying
  the config path and field path, then fall back per field to defaults; unknown
  fields are ignored. Backs AUD-011.
- **`splash watch --fixture <file>`** (workspace-viz Phase A): renders a
  schema-v1 workspace snapshot fixture as a Gource-style radial visualization.
  Live filesystem watching remains deferred to Phase B; `splash watch` without
  `--fixture` prints a one-line message pointing at the fixture form. Ships with
  `tests/fixtures/tree-small.json` and `tree-medium.json`. (The Phase A source and
  the `watch --fixture` surface landed in `0a79bb0`; this release adds their
  comprehensive test suites.)
- **Import-safe CLI bootstrap** (`src/cli/`): pure CLI option normalization, TTY
  validation, terminal-resource creation behind a small interface, and idempotent
  cleanup, extracted so main-level state and startup behavior can be tested
  without a real terminal. `main.ts` registers renderer cleanup immediately and
  every failure path converges on cleanup that runs each callback at most once.
- **Share-code semantic validation**: `validateShareState()` in
  `src/utils/shareCode.ts` separates structural Crockford/bit decoding from
  supported-state validation, returning typed `pattern`, `preset`, `theme`, and
  `configHash` errors against the runtime registry derived from PatternCatalog and
  the theme registry. `splash play` now rejects unsupported pattern/preset/theme
  values and config-fingerprint mismatches before TTY/fullscreen setup with
  one-line actionable diagnostics; Shift+S converts any invariant failure into a
  UI message instead of throwing. Backs AUD-012.
- **New test suites and benchmarks**:
  - Unit: `RuntimeController`, `PatternCatalog`, `AnimationClock`, CLI
    (`bootstrap`, `keyBindings`), and the full workspace-viz set
    (`WorkspaceModel`, `RadialLayout`, `Camera`, `fixture`, `WorkspaceVizPattern`).
    Workspace coverage reaches 94.52% statements / 84.11% branches.
  - Integration: `share-play`, `config-real` (against real `Conf`), and
    `cli-smoke` child-process tests covering `--help`, `--version`, `share`,
    malformed `play`, and malformed `watch --fixture`.
  - Performance: `tests/performance/photo-cache.test.ts` — cold-rebuild vs.
    100-warm-frame benchmarks for half-block, braille, symbol-all, and
    symbol-ASCII at 80×24 and 160×48, plus a layered sparse-overlay benchmark.
- **CI/release quality gates** (`.github/workflows/`): the Node 20 CI job now runs
  `npm audit --omit=dev`, build, typecheck, lint, `format:check`, and the coverage
  suite, and uploads the `lcov.info` produced by that same run (Codecov upload
  failure is no longer silently ignored); Node 22 retains a compatibility
  build/test job, plus a weekly scheduled run. The release workflow runs the
  runtime dependency audit before build/test/publish. Added `.github/dependabot.yml`
  for weekly npm and GitHub Actions updates.

### Changed

- **`main.ts` is terminal/CLI wiring only**: no mutable pattern array, seed
  array, or active pattern/preset/theme/quality index remains. Direct navigation,
  preset cycling, theme/quality/FPS controls, pattern input, mouse, debug, status,
  save, and share all read or mutate the shared `RuntimeController`; runtime events
  keep the status bar synchronized for both command and shuffle-timer changes.
- **`CommandExecutor` is a command-to-controller adapter**: it depends only on a
  narrow `SceneRuntime` interface (plus optional `ConfigLoader`); the engine,
  pattern/theme arrays, current indices, theme-change callback, and `updateState()`
  were removed. Random-all and favorite loads apply as one atomic `applyScene()`
  transaction. The UX-random `Math.random()` carve-out (`c*`, `c**`, `r`) is
  retained and still guarded by the determinism suite.
- **Favorites persist a stable slot key** instead of a class constructor name, so
  minifying/renaming a pattern class can no longer invalidate a favorite; explicit
  preset state comes from the controller. Legacy constructor-name favorites remain
  load-compatible via slot aliases.
- **Snapshot-based transitions**: `TransitionManager` now accepts a deep frame
  snapshot and has no `Pattern` dependency — it never calls `Pattern.render()`.
  `AnimationEngine` captures the raw pattern area immediately after its single
  render call (before transitions, toasts, help, or status touch the buffer), and
  blends the captured source into the already-rendered target. Enabling a
  transition no longer advances the target pattern twice or consumes extra PRNG
  values, and crossfade preserves terminal-default color definedness instead of
  coercing missing colors to black. The reserved status row is excluded from
  snapshots and transition writes. `AnimationEngine`'s fourth constructor argument
  is now the injected `AnimationClock`.
- **Exact final-frame dirty tracking in `Buffer`**: a single `cellsEqual()` helper
  compares character plus foreground and background definedness/RGB, and the buffer
  now snapshots the final base+overlay composition rather than only the base
  animation frame. Overlay lookups use sparse per-row numeric maps instead of
  string-coordinate keys, and cell inputs/results/snapshots clone colors to prevent
  later caller mutation.
- **PhotoPattern caches rendered cells**: the final immutable `Cell[][]` is cached
  per source generation, resize generation, terminal size, and preset. Edge/dither
  preprocessing and half-block/braille/symbol matching run only on a cold cache
  build; warm frames perform a bounded reference blit with no per-frame RGB
  cloning. Successful load, resize, size change, and every visually-significant
  preset change invalidate the cache; theme changes do not. Layered rendering
  reuses the same cache while preserving photo transparency and fg/bg semantics.
- **`ConfigLoader` isolates configuration from defaults**: `createDefaultConfig()`
  returns a structured clone for both Conf defaults and every load; mutable arrays
  loaded from Conf are cloned before entering effective config. Defaults are now
  deeply equal before and after any number of loads, and share fingerprints
  correctly reflect non-default effective values.
- **Config save failures are observable**: save operations report failure to the
  command boundary, so a failed write produces an error result/toast rather than a
  spurious success message.
- Updated runtime dependencies to clear every `npm audit` advisory: `conf`
  15.0.2 → 15.1.0 (pulling `ajv` 8.20.0), `sharp` 0.34.5 → 0.35.3 (inherited
  libvips CVEs), and transitive `fast-uri` → 3.1.4 (host-confusion advisory).
  Both `npm audit` and `npm audit --omit=dev` now report zero vulnerabilities,
  which the new CI/release audit gates enforce.
- Removed the deprecated duplicate `ts-jest` `globals` configuration from
  `jest.config.mjs`, retaining the active ESM transform config in one place, and
  applied the repository Prettier baseline so `npm run format:check` passes.
- Share-code documentation no longer overstates collision resistance: the 13-bit
  config fingerprint (8192 values) is described as a best-effort accidental-drift
  detector, not an integrity check, and byte-for-byte replay is scoped to the same
  application version, effective config, and frame schedule. Wire format stays v1.

### Fixed

- **Runtime state no longer diverges between direct keys and commands** (AUD-001):
  a command-driven pattern/preset/theme change and the corresponding mouse target,
  preset target, transition source, status/debug identity, and Shift+S share state
  now always agree, including after theme and quality rebuilds.
- **Share-code replay is deterministic across wall-clock origins** (AUD-003):
  patterns use scene-relative time, every runtime `Date.now()` read was removed
  from procedural interaction timing, and `OceanBeachPattern`'s previously unseeded
  simplex noise was moved onto the injected PRNG. A registry-wide different-origin
  replay test now compares complete cells (including background) for all 23
  procedural patterns; pause/resume no longer causes a phase jump.
- **Static photos no longer rerun the full pipeline every frame** (AUD-004): warm
  symbol-mode frames dropped from ~15.7 ms to a bounded blit, bringing sustained
  static-photo CPU back within the idle target.
- **Async photo resize failures are contained** (AUD-010): background decode/resize
  work routes through one deduplicating scheduler with a terminal rejection
  handler; failures set `getMetrics().hasError`, retain the last valid frame, and
  are not retried every frame — a later success clears the error. A `sharp` resize
  rejection no longer crashes the application via the global unhandled-rejection
  handler.
- **Buffer dirty tracking** (AUD-006): a foreground change from explicit black to
  terminal-default now emits a dirty cell, and clearing a static overlay restores
  the underlying cell even when the base cell was unchanged.
- **Resize during a transition no longer crashes** (AUD-007): a resize in either
  direction cancels the transition and leaves the exact target frame intact.
- **Transition lifecycle** (AUD-008): the old visual state is captured before the
  outgoing pattern is reset, the target renders exactly once per frame, and
  foreground/background photo cells survive wipe and dissolve.
- **Workspace Focus preset** (AUD-009): focus selection excludes the root and
  prefers the hottest visible file by own heat, falling back to a non-root
  directory by normalized subtree heat, depth, then stable path order — so under a
  constrained node budget a hot leaf's ancestor chain expands.
- **Allocation-heavy config is bounded** (AUD-011): `WorkspaceModel` clamps invalid
  half-lives and `TunnelPattern` defensively caps ring/particle/speed-line counts,
  so no persisted count directly drives an unbounded allocation loop.
- **Fake-timer teardown** (AUD-005): `CommandExecutor` shuffle cleanup runs before
  Jest restores real timers, and real-timer CommandBuffer integration tests cancel
  active buffers during teardown, clearing the eight failures and the open-handle
  warning that made the suite red.
- Native clipboard commands gained a configurable 1-second default timeout;
  timed-out children receive `SIGTERM` and the next candidate is attempted, and
  children cannot be settled twice.

### Removed

- Removed the unsupported compiled `SceneGraph`, `SpriteManager`,
  `ParticleSystem`, and `EventBus` experimental modules, their central-only
  types, and their characterization tests. These modules were never exported
  from the package root or used by the active runtime, although unsupported
  direct imports from `dist/` will no longer resolve. (Classified as legacy
  experimental abstractions in
  [docs/status/reports/2026-07-11-architecture-triage.md](docs/status/reports/2026-07-11-architecture-triage.md).)
- Removed unused persistent-overlay storage and methods from `Buffer` and
  `TerminalRenderer`; active status, toast, help, transition, and layered-photo
  rendering continue through the ordinary final frame.
- Removed EventBus emission from `AnimationEngine`, including `getEventBus()`
  and the optional constructor parameter. The injected `AnimationClock` is now
  the fourth constructor argument.

## [0.5.0] - 2026-05-11 — "Shareable Scenes"

Tracking doc: [docs/planning/v0.5.0-ROADMAP.md](docs/planning/v0.5.0-ROADMAP.md).

Every pattern is now seeded by a constructor-injected PRNG so scenes can be reproduced byte-for-byte from a 12-character share code (`splash share` / `splash play <code>`) when the app version and effective config match. Includes the deterministic foundation (7a–7c), the encoder/decoder (7d), the CLI surface (7e), and an end-to-end determinism test suite (7f).

### Added

- **`Random` interface + `Mulberry32`** (`src/utils/random.ts`): deterministic, u32-seeded PRNG with `next` / `range` / `int` / `choice` / `bool` / `reseed`. `randomSeed()` helper picks a fresh u32 from `Math.random()` for non-deterministic sessions. 21 unit tests, including pinned reference vectors for `seed=1` so future PRNG swaps require an explicit migration.
- **Pattern constructors threaded with `Random`**: `(theme, random, config?)` signature; required, not optional. All 22 patterns migrated across 7a–7c; zero `Math.random()` calls remain in `src/patterns/`. Landed in batches:
  - Phase 7a (`7f9b4c1`): foundation + `DNAPattern` proof of concept.
  - Phase 7b (`f18eb65`): `boids.createFlock` and `ParticleSystem` accept `Random`; `AquariumPattern` constructor wired up.
  - Phase 7c batch 1 (`433dbc9`): `PlasmaPattern`, `QuicksilverPattern`, `LifePattern`, `MetaballPattern`, `MatrixPattern`, `StarfieldPattern`, `ParticlePattern`, `SpiralPattern`.
  - Phase 7c batch 2 (`df6bebe`): `RainPattern`, `TunnelPattern`, `MazePattern`, `SmokePattern`, `LavaLampPattern`. Adds `RainPattern.pickChar()` helper so an empty `characters` config keeps degrading gracefully instead of throwing from `Random.choice`.
  - Phase 7c batch 3 (`abdac12`): finish `AquariumPattern` (~20 internal sites left from 7b).
  - Phase 7c batch 4 (`123aefa`): `SnowPattern`, `SnowfallParkPattern`, `OceanBeachPattern`, `LightningPattern`, `NightSkyPattern`.
  - Phase 7c batch 5 (`9a32fa2`): `CampfirePattern`, `FireworksPattern`.
- **Share-code encoder/decoder** (Phase 7d, `c4e4ae7`): `src/utils/shareCode.ts` — 12-character Crockford base32 (no I/L/O/U). 60-bit payload: `[v4][pat5][pre3][thm3][seed32][hash13]`. `ShareCodeError` provides typed structural, registry, and config-fingerprint diagnostics. `hashConfig()` is an order-independent 13-bit FNV-1a best-effort drift detector; its 8192-value space can collide and is not an integrity check. `PROCEDURAL_PATTERN_IDS` frozen registry locks the on-the-wire `patternId` byte — appending a pattern is safe, reordering or renaming is a breaking change. Locked reference vector `2TTVTPVXVYNW` pins the format. +32 unit tests.
- **`splash share`** (Phase 7e, `6d57515`): prints a code for the would-be-initial-state (config defaults + a fresh random seed) and exits. No engine, no TTY required — usable in scripts and CI.
- **`splash play <code>`** (Phase 7e): decodes + boots directly into the encoded scene; validates configHash against local config and refuses on mismatch (so cross-machine config drift fails loudly instead of silently playing a different scene). Malformed / version-skewed codes report cleanly even when stdout is piped.
- **In-app `Shift+S`** (Phase 7e): encodes current state, copies to clipboard, toast shows the code. Refuses on Photo/Layered slots ("share codes are procedural-only"). Falls back to printing the code in the toast if no clipboard tool is available. Documented in the help overlay.
- **Built-in clipboard helper** (`src/utils/clipboard.ts`): cross-platform spawn (pbcopy / clip / wl-copy → xclip → xsel). No new runtime dependency. Injectable spawn for tests. +10 unit tests.
- **Determinism test suite** (Phase 7f, `b8fb026`): `tests/unit/determinism.test.ts` — round-trip across every patternId in the registry, byte-for-byte replay across two runs for DNA + Starfield + Fireworks (canaries), version-skew rejection, and a static guard that `CommandExecutor.ts` still uses `Math.random()` (UX-random carve-out intact). +10 tests.

### Changed

- `src/main.ts`: `createPatternsFromConfig` and `buildPatterns` now return `{patterns, seeds}` so per-slot u32 seeds are addressable; supports `seedOverride` so `splash play` seeds the chosen pattern deterministically while every other slot still gets a fresh random seed. `patternNames` sourced from `PROCEDURAL_PATTERN_IDS` so the on-the-wire `patternId` byte tracks the runtime index.

### Notes

- `src/engine/CommandExecutor.ts` intentionally stays on `Math.random()` — the `c*`, `c**`, and `r` "surprise me" commands are UX random, not scene random. The 7f static guard catches future accidental migration.
- `Random.int(min, max)` is **inclusive on both ends**, unlike `Math.floor(Math.random() * N)` which is `[0, N-1]`. The migration recipe in the v0.5.0 roadmap documents the careful translation table.
- PhotoPattern and LayeredPattern slots are intentionally not encodable in share codes — they depend on a local image file that can't be reproduced from a code alone. The `Shift+S` key shows a friendly message on those slots.
- Total: 2317 tests passing on the branch (2265 baseline + 32 shareCode + 10 clipboard + 10 determinism).

## [0.4.0] - 2026-05-10

### 🎯 Theme: "Photos in the Terminal"

This release adds image-based rendering as a first-class peer to the procedural patterns: half-block (2×) and braille (8×) photo rendering, a chafa-style symbol matcher, and live composition of procedural overlays on top of a photo background. Four shippable phases (1–4 of the v0.4.0 roadmap); native protocol pass-through (Phase 5), share codes (Phase 7) and asciinema export (Phase 8) remain for follow-up releases.

### ⚠️ HIGHLIGHTS

- **`splash --photo <path>`** renders any image into the terminal at 2× / 8× resolution (half-block, braille, or chafa-style symbol matcher).
- **Layered scene composition**: `splash --photo bg.jpg --pattern starfield` overlays any procedural pattern on top of a photo.
- **18 photo presets** across three render modes (half-block / braille / symbol), reachable via `.` / `,` or `c01`–`c18`.
- **+147 tests** (2244 total, up from 2097 in v0.3.0).

### Added

- **PhotoPattern (v0.4.0 Phase 1)**: Render any image into the existing terminal at 2× vertical resolution using upper/lower half-block characters (▀ ▄). Supports truecolor 24-bit output via combined fg + bg ANSI sequences.
  - New CLI flag: `splash --photo <path>` loads and renders an image immediately on startup.
  - Aspect-preserving fit (mirrors viuer's `fit_dimensions`): square / portrait images are letterboxed rather than stretched to the terminal's aspect.
  - Direct port of viuer's `block.rs` half-block algorithm (MIT) targeting our `Cell[][]` model.
- **`HalfBlockRenderer`** (`src/renderer/HalfBlockRenderer.ts`): Pure function that fills a `Cell[][]` from an RGBA pixel buffer. Re-usable by upcoming symbol-matcher mode (Phase 4) and protocol pass-through (Phase 5).
- **`Cell.bg`** (background color): New optional field on `Cell`. Required by half-block rendering; will also be used by the symbol matcher in Phase 4 and protocol pass-through in Phase 5. Backward-compatible — existing patterns leave it undefined.
- **`sharp`** dependency for image decode + resize (ESM-compatible, Node 20+).
- **PhotoPattern (v0.4.0 Phase 2)**: Adds braille mode, dithering preprocessors, and edge detection.
  - **`BrailleRenderer`** (`src/renderer/BrailleRenderer.ts`): Renders RGBA into Unicode Braille Patterns (U+2800–U+28FF). Each terminal cell encodes 2 wide × 4 tall = 8 dots — 8× resolution vs. plain ASCII. Cell color is the mean of lit dots. Re-derived from the Unicode 8-dot Braille spec (drawille is AGPL-3.0, so no code copied).
  - **Floyd-Steinberg dither** (`src/utils/dither.ts`): Error-diffusion preprocessor with configurable quantization levels. Re-derived from the original 1976 paper.
  - **Bayer ordered dither** (8×8 and 16×16): Pre-generated threshold matrices using the recursive 1973 Bayer construction. Hue-preserving (same offset applied to all channels — chafa's convention).
  - **Sobel edge detection** (`src/utils/edges.ts`): 3×3 Gx/Gy gradient magnitude on a luminance image.
  - **Difference-of-Gaussians edge detection**: Separable Gaussian blur ×2, subtract, normalize. σ1=1, σ2=1.6 by default.
  - **Six new presets** (ids 7–12): `edge-dog`, `braille`, `braille-inverted`, `braille-dithered`, `braille-edges`, `halfblock-bayer`. PhotoPattern now exposes 12 total presets.
  - **`edge-only` preset (id 6) upgraded** from a hard-threshold stub to real Sobel-based edge detection.
- 89 new unit tests across `tests/unit/utils/dither.test.ts`, `tests/unit/utils/edges.test.ts`, `tests/unit/renderer/HalfBlockRenderer.test.ts`, `tests/unit/renderer/BrailleRenderer.test.ts`, and `tests/unit/patterns/photo.test.ts`. Total: 2197 tests (up from 2097 in v0.3.0).
- **Scene composition (v0.4.0 Phase 3)**: layer a procedural pattern over a photo background. The v0.4 headline feature.
  - New CLI usage: `splash --photo bg.jpg --pattern starfield` builds a `LayeredPattern` slot that renders the photo first, then the procedural overlay on top each frame.
  - **`LayeredPattern`** (`src/patterns/LayeredPattern.ts`): Pattern-shaped composite that owns a `PhotoPattern` + an arbitrary overlay `Pattern` and delegates lifecycle (preset / reset / mouse / theme / fps) to the overlay. Photo's `onResize` is forwarded so its cached resize tracks the terminal. Sequential render — no `SceneGraph` adapter glue needed for the 2-layer case.
  - **`transparentBg` config option** for dense overlays (Plasma, Wave): when true, cells the pattern would render as background (Plasma's sparsest brightness bins; Wave's far-from-crest fall-through to `' '`) are left untouched, leaving the photo visible. Sparse overlays (Matrix, Starfield, Lightning, Fireworks, Rain, Snow, DNA, Particles, Smoke, Snowfall, Quicksilver) compose naturally without a flag — their cleared cells already let the photo through.
  - Status bar reads `Photo + <Overlay>` when on the layered slot. The standalone photo (cyclable via `n`) and standalone procedural patterns remain available.
  - Bonus fix: cycling themes while on the photo slot no longer crashes — the new `buildPatterns()` helper re-attaches `PhotoPattern` (and the layered slot) on every theme rebuild instead of silently dropping it.
  - 19 new unit tests in `tests/unit/patterns/LayeredPattern.test.ts` (composition, sparse vs. dense overlay behavior, dirty-rect under overlay, lifecycle delegation), plus `transparentBg` cases in `plasma.test.ts` + `wave.test.ts` and a Matrix-already-sparse pin-down in `additional-patterns.test.ts`. Total: 2216 tests (up from 2197).
- **Chafa-style symbol matcher (v0.4.0 Phase 4)**: a third PhotoPattern render mode (`mode: 'symbol'`) that picks, per 8×8 source patch, the bitmap whose lit/unlit partition best separates the patch into two color clusters. "Wow mode" rendering competitive with chafa.
  - **`SymbolRenderer`** (`src/renderer/SymbolRenderer.ts`, ~280 LOC): two-pass matcher — compute `fg = mean(patch[lit])` and `bg = mean(patch[unlit])` for each candidate symbol, then squared-color-error over all 64 dots. Lowest error wins; the chosen codepoint is emitted with the matching fg/bg ANSI. Re-implemented from chafa's `symbol-renderer.c:98-268` description; chafa is LGPL, so the code and bitmaps are authored from scratch under MIT. Per-pixel preprocessing (`grayscale`, `invert`, `contrast`) applied inline during patch extraction.
  - **Symbol library** (`src/renderer/symbols.ts`, ~430 LOC including hand-authored bitmap strings): 34 8×8 bitmaps across four tag groups — `TAG_ASCII` (16 shapes: `. ' " _ - | / \ + x = ~ o O #` + space), `TAG_QUADRANT` (16 four-corner partitions: `▘ ▝ ▖ ▗ ▀ ▄ ▌ ▐ ▚ ▞ ▛ ▜ ▙ ▟ █` + space), `TAG_BLOCK` (subset of quadrant — the five half-blocks `▀ ▄ ▌ ▐ █` + space), `TAG_SHADE` (`░ ▒ ▓` + space + full block). Plain numeric tag bitmask (TS `const enum` rejected by the repo's strictTypeChecked eslint config). Tag-filtered candidate arrays are memoized per mask.
  - **Three-step tiebreaker** to handle bit-complement symmetry (every bitmap has a complement that scores identical squared error with fg/bg swapped — `▘`↔`▟`, `▚`↔`▞`, `▀`↔`▄`, `░`↔`▓`, `' '`↔`█`, …): lowest err → higher fg luminance ("lit = brighter pixels", the natural reading for photo highlights) → higher litCount (settles uniform-color patches toward `█` instead of `' '`, avoiding terminal-bg leak through what should be a solid-color region).
  - **Six new presets** (ids 13–18): `symbol` (all 34 candidates), `symbol-ascii` (text-art aesthetic), `symbol-block` (no letters), `symbol-high-contrast` (contrast 1.6×), `symbol-mono` (grayscale), `symbol-ascii-mono` (ASCII + grayscale). PhotoPattern total: **18 presets** (up from 12).
  - **Perf**: 80×24 frame with all 34 candidates renders in ~20 ms on Node 25 / Apple Silicon, within the brief's microbenchmark envelope (49 fps / ~20 ms for 50 candidates). CI perf-sanity test caps at 200 ms. Larger terminals (120×40+) may need a fast-path (candidate pre-screening by mean brightness); deferred until a user reports lag.
  - **No new CLI flags** — preset cycling reaches all six presets via `.` / `,` or `c13`–`c18`. Deferred to Phase 7's seeded share-code mechanism, same call as Phases 2 + 3.
  - 28 new unit tests across `tests/unit/renderer/SymbolRenderer.test.ts` (22: exact-match selection, tag filtering, preprocessing, edge cases, perf sanity) and `tests/unit/patterns/photo.test.ts` (+6: mode metric, canvas dimensions, mode-change cache invalidation, ASCII-only emission, block-codepoint emission, preset enumeration). Total: **2244 tests** (up from 2216).

### Changed

- `Buffer.getChanges()` now detects background-color changes in addition to char + foreground.
- `TerminalRenderer.render()` now emits `\x1b[48;2;r;g;bm` background-color escapes when `cell.bg` is set.
- `PhotoPatternConfig` extended with optional `mode` (`halfblock` | `braille`), `dither` (`none` | `floyd-steinberg` | `bayer-8` | `bayer-16`), `edge` (`off` | `sobel` | `dog`), and `edgeThreshold` knobs (Phase 2). Defaults preserve Phase 1 behavior.
- Switching to a braille preset triggers a re-resize at the larger 2W × 4H source canvas (vs. W × 2H for half-block).
- `PlasmaPatternConfig` + `WavePatternConfig` gained an optional `transparentBg` flag (Phase 3, default `false`). Preserved across `applyPreset` cycling so the photo stays visible when the user changes preset in layered mode.
- `PhotoRenderMode` extended from `'halfblock' | 'braille'` to `'halfblock' | 'braille' | 'symbol'` (Phase 4). Switching to a symbol preset triggers a re-resize at the 8W × 8H source canvas. `PhotoPresetEntry` gains an optional `symbol?: SymbolOptions` field. `PhotoPattern.getMetrics().mode` enum extended to `0 | 1 | 2` (halfblock / braille / symbol).

## [0.3.1] - 2026-01-22

### Fixed

- **CI/CD**: Skip tests in release workflow for faster deploys
- **Tests**: Lower threshold for matrix visual test on CI
- **Tests**: Increase tolerance for performance benchmark test on CI

### Changed

- Updated dependencies and documentation for v0.3.1

## [0.3.0] - 2025-12-23

### 🎯 Theme: "Next-Generation Terminal Graphics"

This release transforms ascii-splash from an abstract animation engine into a **living environment simulator** with 5 new scene-based patterns, enhanced architecture, and polished UX components.

### ⚠️ HIGHLIGHTS

- **5 New Scene-Based Patterns**: Ocean Beach, Campfire, Aquarium, Night Sky, Snowfall Park
- **New Architecture**: Scene Graph, Sprite Manager, Enhanced Particle System
- **UI Overhaul**: StatusBar, ToastManager, HelpOverlay, TransitionManager
- **Test Coverage**: 2097 tests (up from 1505), comprehensive integration & visual tests

### Added

#### 🌊 Scene-Based Patterns (5 New)

- **Ocean Beach** - Serene beach scene with multi-layered rendering
  - Animated wave system with realistic water motion using Perlin noise
  - Seagulls that fly across sky and react to mouse movement
  - Interactive footprints on beach (mouse click)
  - Dynamic clouds drifting across the sky
  - 6 presets: Calm Morning, Midday Sun, Stormy, Sunset, Night Beach, Tropical

- **Campfire** - Cozy campfire with realistic fire physics
  - Flickering flames using noise-based shapes
  - Rising sparks with physics simulation
  - Drifting smoke particles
  - Radial light glow effect
  - 6 presets: Kindling, Roaring Fire, Dying Embers, Windy Night, Campfire Stories, Bonfire

- **Aquarium** - Interactive fish tank with boids flocking
  - Fish schools using boids algorithm (separation, alignment, cohesion)
  - Swaying plants with sine-based animation
  - Rising bubbles particle system
  - Fish flee from or attract to cursor (toggle with spacebar)
  - 6 presets: Tropical Reef, Deep Sea, Goldfish Bowl, Piranha Tank, Koi Pond, Neon Tetras

- **Night Sky** - Aurora borealis with twinkling stars
  - Aurora ribbons using Perlin noise flow (green → cyan → purple → pink)
  - Twinkling stars with individual brightness modulation
  - Shooting stars / meteors on mouse click
  - Subtle nebula clouds
  - 6 presets: Polar Lights, Cosmic Storm, Silent Night, Solar Storm, Stargazer, Nebula Dreams

- **Snowfall Park** - Winter scene with accumulating snow
  - Falling snow with wind and drift effects
  - Snow accumulation on ground (builds up over time)
  - Swaying evergreen trees
  - Streetlamp with radial glow
  - 6 presets: First Snowfall, Blizzard, Winter Wonderland, Evening Snow, Frozen Park, Thaw

#### 💧 Enhanced Pattern

- **Metaball Playground** - Interactive liquid physics simulation
  - Multiple metaballs with merge/split dynamics
  - RGB color blending between blobs
  - Physics: gravity, mouse attraction/repulsion, wall collision
  - Shimmer highlights on metallic surfaces
  - 6 presets: Liquid Mercury, Lava Blobs, RGB Fusion, Plasma Orbs, Water Droplets, Chaotic

#### 🏗️ New Architecture Components

- **Scene Graph System** (`src/engine/SceneGraph.ts`)
  - Layer management with z-ordering (background, midground, foreground, UI)
  - Per-layer update/render cycles
  - Proper depth rendering for complex scenes

- **Sprite Manager** (`src/engine/SpriteManager.ts`)
  - Sprite class with position, animation frames, physics
  - Batch updates for performance
  - Collision detection helpers

- **Enhanced Particle System** (`src/engine/ParticleSystem.ts`)
  - Emitter patterns: point, line, area
  - Force fields: gravity, wind, vortex
  - Particle pooling for performance

#### 🎨 UI Components

- **StatusBar** (`src/ui/StatusBar.ts`)
  - Persistent bottom-row display
  - Shows: Pattern.Preset | Theme | FPS (color-coded) | Shuffle status | Help hint
  - FPS color coding: green (≥25), yellow (15-24), red (<15)

- **ToastManager** (`src/ui/ToastManager.ts`)
  - Notification toasts in top-right corner
  - Types: success (green), error (red), info (blue), warning (yellow)
  - Auto-dismiss after configurable duration
  - Stacked display (max 3 visible)

- **HelpOverlay** (`src/ui/HelpOverlay.ts`) - Enhanced
  - Tabbed interface: Controls, Commands, Patterns, Themes
  - Tab navigation with TAB/LEFT/RIGHT keys
  - Centered modal with border and styling

- **TransitionManager** (`src/renderer/TransitionManager.ts`)
  - Smooth transitions between pattern switches
  - Effects: crossfade, dissolve, wipe-left, wipe-right, instant
  - Configurable duration and easing functions
  - Built-in easing: linear, easeInQuad, easeOutQuad, easeInOutQuad, easeInCubic, easeOutCubic

#### 🧪 Testing Infrastructure

- **Integration Tests** (`tests/integration/`)
  - `engine.test.ts`: Full render pipeline, pattern switching, resize handling
  - `commands.test.ts`: Command buffer, parser, executor pipeline

- **Visual Snapshot Tests** (`tests/visual/`)
  - `snapshot.test.ts`: Pattern visual characteristics, animation progression
  - Buffer snapshot utilities for visual regression testing

- **UI Component Tests** (`tests/unit/ui/`)
  - `toast.test.ts`: ToastManager singleton, show/dismiss, auto-expire (23 tests)
  - `help.test.ts`: HelpOverlay visibility, tab navigation (27 tests)
  - `statusbar.test.ts`: StatusBar state, FPS colors, segments (26 tests)
  - `transition.test.ts`: TransitionManager effects, easing (30 tests)

### Changed

- **Pattern count**: 23 patterns (up from 18)
- **Preset count**: 138 presets (up from 108)
- **Test count**: 2097 tests (up from 1505)
- **Test suites**: 48 suites (up from 32)

### Technical

- **Dependencies**: Added `simplex-noise@4.0.3` for organic motion in scene patterns
- **Architecture**: Patterns can now use SceneGraph for layered rendering
- **Rendering**: UI components render to buffer before terminal output
- **Transitions**: Pattern switches now have 300ms crossfade by default

### Performance

- **Scene patterns**: 4-6% CPU target per scene (variable by complexity)
  - Ocean Beach: ~4% CPU
  - Campfire: ~4% CPU
  - Aquarium: ~5-6% CPU (boids algorithm)
  - Night Sky: ~3-4% CPU
  - Snowfall Park: ~4% CPU
  - Metaball: ~5% CPU
- **Memory**: <60 MB total
- **Frame rate**: 60 FPS steady

## [0.2.0] - 2025-11-04

### ⚠️ BREAKING CHANGES

**This is a major version bump due to the ESM migration.**

- **ESM Migration**: Project now uses ECMAScript Modules (ESM) instead of CommonJS
  - **CLI users**: ✅ **NO CHANGES REQUIRED** - Installation and usage remain identical
  - **Library consumers** (if any): ⚠️ Must update to ESM syntax (`import` instead of `require()`)
  - Node.js 20+ required (already a requirement since v0.1.0)

### Changed

- **Module System**: Migrated from CommonJS to ESM
  - All source files now use ESM `import`/`export` syntax
  - All imports now include explicit `.js` file extensions (required by ESM)
  - `package.json` now has `"type": "module"`
  - TypeScript outputs ESM syntax (`"module": "Node16"`)
- **Dependencies**: Updated `conf` from v10.2.0 to v15.0.2 (ESM-compatible)
  - Primary motivation for ESM migration
  - Enables future updates to other modern ESM-only packages

### Technical

- **TypeScript Configuration**:
  - Changed `"module"` from `"commonjs"` to `"Node16"`
  - Changed `"moduleResolution"` to `"node16"` for proper ESM resolution
  - All compiled output uses ESM syntax
- **Jest Configuration**:
  - Renamed `jest.config.js` to `jest.config.mjs`
  - Configured for ESM testing with `--experimental-vm-modules`
  - Using `ts-jest` with ESM support
  - All 1505 tests passing with ESM configuration
- **Import Conventions**:
  - All relative imports include `.js` extensions (e.g., `'./Pattern.js'`)
  - ESM imports work correctly in both source TypeScript and compiled JavaScript
- **Build System**:
  - TypeScript compilation produces clean ESM output
  - Binary execution works correctly: `node dist/main.js`
  - Package exports configured for ESM

### Migration Details

**Phases Completed**:

1. ✅ Configuration updates (package.json, tsconfig.json, jest.config.mjs)
2. ✅ Code updates (added `.js` extensions to all imports)
3. ✅ Jest ESM compatibility fixes (explicit Jest imports, ESM mocking)
4. ✅ Build and runtime testing (all tests passing, application works)

**Files Modified**: 58 TypeScript files (source + tests)
**Test Results**: All 1505 tests passing, 28 test suites
**Coverage**: 92.35% (maintained and improved from 82.34%)

### For Library Consumers

If you use ascii-splash as a library (not via CLI), you'll need to update your code:

**Before (CommonJS):**

```javascript
const { AnimationEngine } = require('ascii-splash');
```

**After (ESM):**

```javascript
import { AnimationEngine } from 'ascii-splash';
```

**Note**: The vast majority of users install via `npm install -g ascii-splash` or use `npx ascii-splash`, which are **not affected** by this change.

## [0.1.5] - 2025-11-04

### Changed

- Updated `@types/node` to 24.10.0 (patch update for Node.js 24 type definitions)

### Maintenance

- Confirmed all 1505 tests passing with updated dependencies
- Maintained 82.34% test coverage
- **Note**: `conf` remains at v10.2.0 (v15+ requires ESM migration, planned for v0.2.0)

## [0.1.4] - 2025-11-04

### Added

- **Visual Demonstrations**: Added animated GIF previews to README showcasing 7 key patterns
  - Hero patterns: Starfield, Matrix, Fireworks, Lightning
  - Additional patterns: Plasma, Waves, DNA
  - Total media size: 4.8MB (optimized with gifsicle)
  - Enhanced first-impression experience for potential users
- **Recording Scripts**: Automated pattern recording workflow
  - `scripts/record-patterns.sh`: Records pattern demonstrations with asciinema
  - `scripts/convert-gifs.sh`: Converts recordings to GIF format with agg
  - `scripts/optimize-gifs.sh`: Optimizes GIFs with gifsicle (32% size reduction)
  - All scripts support batch processing and progress reporting

### Changed

- **README**: Added "Visual Preview" section with embedded pattern demonstrations
  - 2x2 hero pattern grid with descriptions
  - 1x3 additional patterns showcase
  - Improved visual appeal and user engagement
- **Documentation**: Added `docs/VISUAL_ENHANCEMENT_PLAN.md` with complete recording process

### Technical

- Recording settings: 80x24 terminal, 30 FPS cap, 10 seconds duration
- Optimization: lossy=80, colors=256, optimize=3
- Tools: asciinema 3.0.1, agg 1.7.0, gifsicle 1.96

## [0.1.3] - 2025-11-03

### Changed

- **Preset Standardization**: All 17 patterns now have exactly 6 presets each (102 total)
  - **WavePattern**: Reduced from 8 to 6 presets (removed "Glass Lake" and one duplicate)
  - **StarfieldPattern**: Reduced from 8 to 6 presets (consolidated similar variations)
  - **PlasmaPattern**: Reduced from 9 to 6 presets (removed redundant color variations)
  - **RainPattern**: Reduced from 9 to 6 presets (streamlined intensity variations)
  - Improved consistency: All patterns follow the same 6-preset structure
  - Enhanced user experience with predictable preset cycling (`.` and `,` keys)
  - Command system now consistent across all patterns (`c01-c06`)

### Fixed

- **FireworksPattern**: Race condition where particle count could exceed hard caps during concurrent explosions
  - Now recalculates total particle count immediately before spawning secondary bursts (400 cap)
  - Now recalculates total particle count immediately before spawning sparkles (450 cap)
  - Prevents performance degradation from excessive particles
  - Added comprehensive unit tests for concurrent spawn scenarios

### Tests

- Updated all pattern tests to reflect new 6-preset structure
- All 1505 tests passing with zero regressions (1503 existing + 2 new Fireworks race condition tests)
- Test suites updated: wave.test.ts, starfield.test.ts, plasma.test.ts, additional-patterns.test.ts, presets.test.ts, fireworks.test.ts

### Added

- **Visual Enhancements**: Comprehensive improvements to all 17 patterns with new visual effects
  - **Starfield**: Star twinkling effect with individual twinkle rates and phases for organic shimmer
  - **Wave**: Foam/whitecap effects on wave crests with intermittent foam generation
  - **Rain**: Wind and gust effects creating diagonal rain with variable wind speeds
  - **Plasma**: Color cycling through theme palette with configurable shift speeds and 3 new presets
  - **Matrix**: Size variation for columns, fading heads, and enhanced column density
  - **Spiral**: Multi-arm bursts, branch angles, and variable rotation speeds
  - **Tunnel**: Independent ring speeds, depth pulsing, and boost mode for dynamic effects
  - **Lightning**: Variable branch angles, fork distance variation, and pulsing walls for electric atmosphere
  - **Snow**: Particle size pulsing during fall creating breathing/shimmer effect
  - **DNA**: Base pair pulsing/breathing animation on connecting lines and base labels
  - **Smoke**: Enhanced height-based temperature gradient with cooling effect as particles rise
  - **Fireworks**: Multi-stage recursive explosions with sparkle particles and shaped bursts
    - 3-level depth explosions (primary → secondary → tertiary bursts)
    - Sparkle particles (bright white/yellow, fast, short-lived)
    - 5 burst shapes: circle, ring, heart, star, random
    - Rainbow color variation within bursts blending HSV rainbow with theme colors
    - Performance: All presets under 500 particles, <1000 writes/frame
  - **LavaLamp**: Temperature-based color variation modulating blob intensity
  - **Particle**: Particle trails with fading opacity showing motion history
  - **Life**: Cell age-based coloring where older cells glow brighter (ages 0-20)
  - **Maze**: Solved path highlighting using BFS pathfinding with visual path overlay
  - **Quicksilver**: Surface tension variation using noise field affecting droplet behavior

### Changed

- All 17 patterns now include enhanced visual effects while maintaining performance targets
- Presets updated across patterns to showcase new visual enhancements
- Pattern rendering more dynamic and visually engaging across the board

## [0.1.2] - 2025-11-03

### Fixed

- **Time Handling Consistency**: Fixed 7 patterns using `Date.now()` directly instead of `time` parameter
  - Affected patterns: Wave, Starfield, Rain, DNA, Lightning, Plasma, Quicksilver
  - **Impact**: Enables proper time-based testing, pause/resume functionality, and consistent behavior
  - Each pattern now tracks `currentTime` internally and uses it in mouse handlers
  - All patterns properly reset `currentTime` to 0 in `reset()` method
- **Reset Method Cleanup**: Audited and fixed `reset()` methods across all patterns
  - Ensures clean state when switching patterns
  - Prevents stale time values and other state from carrying over

### Changed

- **Metrics Naming Standardization**: All patterns now use camelCase for metric keys
  - SnowPattern updated: `'Active Particles'` → `activeParticles`, `'Accumulated'` → `accumulated`, `'Avg Velocity'` → `avgVelocity`
  - Consistent naming across all 17 patterns improves debug overlay readability
  - Updated 15+ test assertions to match new naming convention

### Performance

- **Spiral Pattern**: Optimized distance calculations with early rejection
  - Only calls `Math.sqrt()` when particles are within range
  - Prevents wasted computation on out-of-bounds particles
- **Tunnel Pattern**: Optimized character selection using squared distance
  - Reduced unnecessary `sqrt()` calls in pulse rendering
  - Maintains identical visual output with better performance
- **Quicksilver Pattern**: Added early rejection in ripple/droplet effect loops
  - Uses squared distance for boundary checks before computing actual distance
  - Reduces expensive calculations in nested pixel loops
- **Life Pattern**: Implemented neighbor count caching
  - Added `neighborCounts[][]` grid to store computed values
  - Cache updated once per generation, reused in render method
  - **Major win**: Eliminates redundant `countNeighbors()` calls per frame
  - Significantly improves performance for Game of Life simulation

### Added

- **Pattern Enhancement Plan**: Added comprehensive `PATTERN_ENHANCEMENT_PLAN.md`
  - Documents systematic analysis of all 17 patterns
  - Tracks completed and planned improvements
  - Phase 1 (Critical Fixes) and Phase 2 (Performance) completed

### Tests

- All 1407 tests passing
- Zero regressions introduced
- All optimizations maintain visual parity with original implementations

## [0.1.1] - 2025-11-02

### Fixed

- **Text Overlay Display**: Fixed critical UX issue where text overlays were overwritten by pattern rendering
  - Command mode overlay, pattern mode overlay, and debug info now properly persist
  - Root cause: Text rendered on input events but pattern buffer cleared/re-rendered 30-60x per second
  - Solution: Consolidated all overlay rendering into `afterRenderCallback()` for correct z-order
  - Removed 18+ redundant overlay render calls from event handlers
  - Significantly improves user experience when using command mode or pattern selection

### Added

- **GitHub Actions CI/CD Pipeline**: Complete automated testing and release infrastructure
  - **CI Workflow**: Runs on push/PR to main/develop branches
    - Tests on Node.js 20, 22 for compatibility
    - TypeScript compilation checks
    - Build verification and package validation
    - Coverage upload to Codecov
  - **Release Workflow**: Automated GitHub Release creation on git tag push (v*.*.\*)
    - Version/tag verification
    - GitHub Release creation with changelog notes
    - Note: npm publishing is done manually via `npm publish`
  - **Dependency Review**: Security scanning for pull requests
    - Vulnerability checks for new dependencies
    - Automated PR comments with security findings
  - **Documentation**: Comprehensive guides added
    - `docs/RELEASE_PROCESS.md`: Full release workflow guide
    - `docs/QUICK_RELEASE.md`: Quick reference for releases
    - `docs/GITHUB_ACTIONS.md`: Workflow documentation
- **Build Script**: Added `lint` script to package.json for type-checking (`npm run lint`)
- **Test Suite Expansion**: Comprehensive unit tests for additional patterns
  - Added tests for: Fireworks, Plasma, Quicksilver, Rain, Starfield patterns
  - Added utility module tests: drawing.ts, math.ts, noise.ts
  - **Test Results**: 1357 tests passing, 26 test suites

### Changed

- **Test Suite Refactoring**: Updated tests for refactored Spiral and Tunnel patterns
  - SpiralPattern: Complete test rewrite (67 tests) for particle-based architecture
    - Updated property names: `spiralCount` → `armCount`
    - Updated preset names: "Twin Vortex" → "Twin Helix", "Nautilus Shell" → "DNA Double Helix"
    - New metrics: `particles`, `arms`, `bursts`
  - TunnelPattern: Created comprehensive test suite (67 tests)
    - Tests all 6 presets with new metrics: `rings`, `particles`, `boost`
  - **Pattern Coverage**: SpiralPattern 99.24%, TunnelPattern 100%
- **Test Infrastructure**: Organized manual test scripts into `tests/manual/` directory

## [0.1.0] - 2025-11-02

### 🎉 Initial Release

The first public release of ascii-splash - a terminal ASCII animation app with visual flow for your IDE workspace.

**Published to npm**: https://www.npmjs.com/package/ascii-splash  
**GitHub Release**: https://github.com/reowens/ascii-splash/releases/tag/v0.1.0  
**Installation**: `npm install -g ascii-splash` or `npx ascii-splash`

### Changed (Breaking Changes - Keyboard Controls)

- **BREAKING**: Command mode key changed from `0` to `c` for better mnemonics
  - Old: `0` prefix for commands (e.g., `01`, `0p3`, `0t2`)
  - New: `c` prefix for commands (e.g., `c01`, `cp3`, `ct2`)
  - Reason: `c` is more intuitive (stands for "command") and follows keyboard proximity patterns
- **Renamed**: "Quality presets" → "Performance mode" throughout CLI, help text, and documentation
  - Avoids confusion between quality presets and pattern presets
  - More accurately describes LOW/MEDIUM/HIGH FPS settings

### Added (Phase 6 - Keyboard Improvements)

- **Preset cycling**: Press `.` for next preset, `,` for previous preset
  - Explore all 102 presets easily without memorizing preset numbers
  - Wraps around at boundaries (preset 6 → preset 1)
  - Visual feedback shows current preset number
- **Previous pattern navigation**: Press `b` to go back to previous pattern
  - Complements existing `n` (next) key for bi-directional pattern browsing
  - Wraps around (pattern 1 → pattern 17)
- **Quick random**: Press `r` for instant random pattern + preset + theme
  - Shortcut for `c**` command
  - Perfect for discovering new combinations quickly
- **Quick save**: Press `s` to save current configuration to file
  - Shortcut for `cs` command
  - Persists current pattern, preset, theme, and settings
- **Enhanced help overlay**: Updated with all new keyboard shortcuts and clearer organization

### Added (Phase 6 - UI/UX Improvements)

- **Enhanced Pattern Selection**: New interactive pattern mode activated by pressing `p`
  - Type pattern number: `p12` → Pattern 12
  - Type pattern name: `pwaves` → Waves pattern
  - Type pattern.preset combo: `p3.5` → Pattern 3, Preset 5
  - Press `p` then Enter (empty) → Previous pattern (original behavior)
  - 5-second timeout with visual feedback (yellow "PATTERN:" overlay)
  - ESC to cancel, partial name matching supported
  - Replaces old `p` = previous pattern (now requires empty input + Enter)
  - Updated help overlay and documentation

### Added (Phase 6 - Release Preparation)

- **DNA Helix Pattern**: Double helix rotation with base pairs (A-T, G-C, T-A, C-G)
  - 6 presets: Slow Helix, Fast Spin, Unwinding, Replication, Mutation, Rainbow
  - Mouse move creates twist effect, click spawns mutations
  - Configurable rotation speed, helix radius, base pair density, twist rate
  - 30 comprehensive unit tests
- **Lava Lamp Pattern**: Metaball-based lava lamp simulation with organic blob shapes
  - 6 presets: Classic, Turbulent, Gentle, Many Blobs, Giant Blob, Strobe
  - Physics simulation with buoyancy, drift, turbulence (Perlin noise), and gravity
  - Vertical wrapping for continuous lava lamp cycle effect
  - Mouse attracts/repels blobs with force field, click spawns new blobs (max 20)
  - Intensity-based character rendering (█▓▒░) for depth effect
  - 35 comprehensive unit tests
- **Smoke Pattern**: Physics-based smoke particle simulation with realistic rising behavior
  - 6 presets: Gentle Wisp, Campfire, Industrial, Incense, Fog, Steam
  - Rising smoke plumes with Perlin noise turbulence for organic movement
  - Realistic particle opacity and dissipation over time
  - Height-based color gradient for natural smoke appearance
  - Mouse creates force field to blow smoke away, click spawns 15-particle burst
  - Configurable plume count, particle density, rise speed, dissipation rate
  - 37 comprehensive unit tests
- **Snow Pattern**: Falling particle system with seasonal effects
  - 6 presets: Light Flurries, Blizzard, Cherry Blossoms, Autumn Leaves, Confetti, Ash
  - Realistic downward falling motion with gravity and wind drift
  - Perlin noise turbulence for natural movement
  - Particle rotation as they fall for added realism
  - Ground accumulation feature (optional) for settled particles
  - 5 particle types: snow, cherry blossoms, autumn leaves, confetti, ash
  - Mouse creates wind force field pushing particles, click spawns 20-particle burst
  - Configurable particle count, fall speed, wind strength, turbulence, rotation
  - 48 comprehensive unit tests
- Utility modules for advanced pattern development:
  - `math.ts`: 3D projection, rotation matrices, complex numbers
  - `noise.ts`: Perlin noise implementation for organic effects
  - `drawing.ts`: Line drawing, symmetry helpers
  - `metaballs.ts`: Metaball field calculations for blob rendering

### Fixed (Release Preparation - November 2, 2025)

- **TTY Guard**: Added `checkTTY()` function to prevent execution in non-interactive environments
  - Gracefully handles pipes, redirects, and cron jobs with helpful error message
  - Allows `--help` and `--version` to work without TTY
- **Signal Handlers**: Added global handlers for SIGINT, SIGTERM, uncaughtException, unhandledRejection
  - Ensures terminal cleanup always runs before exit
  - Prevents terminal from being left in raw mode on crash
- **Terminal Cleanup**: Removed forced `processExit()` call from TerminalRenderer
  - Renderer now only restores terminal state
  - Makes embedding and testing safer
- **Help Text**: Corrected pattern count from "all 16" to "all 17"
- **Windows Config Path**: Fixed README documentation to show `.splashrc.json` instead of `config.json`
- **Package Description**: Updated to reflect current feature set (17 patterns, 102 presets, 5 themes)
- **Dependencies**: Removed unused `chalk` dependency

### Changed

- Pattern count increased from 13 to 17
- Total presets increased from 78 to 102
- Test suite expanded to 803 total tests
- Main function now returns cleanup handler for better control flow

### ✨ Features

#### 🎨 13 Interactive Patterns (v1.0.0)

- **Waves**: Sine wave animations with ripple effects
- **Starfield**: 3D parallax starfield with force fields
- **Matrix**: Digital rain effect with column spawning
- **Rain**: Falling droplets with splash effects
- **Quicksilver**: Liquid metal flow simulation
- **Particles**: Physics-based particle system
- **Spiral**: Rotating logarithmic spirals
- **Plasma**: Fluid plasma energy effect
- **Tunnel**: 3D geometric tunnel zoom
- **Lightning**: Branching electric arcs
- **Fireworks**: Explosive particle bursts
- **Life**: Conway's Game of Life cellular automaton
- **Maze**: Dynamic maze generation and solving

#### 🎭 78 Built-in Presets (v1.0.0)

- **6 presets per pattern** (13 patterns × 6 = 78 total)
- Each preset offers unique visual variations
- Examples: "Ocean Storm", "Warp Speed", "Tesla Coil", "Grand Finale"
- Access via command system: `01-99` for quick loading

#### 🌈 5 Color Themes

- **Ocean**: Blues, cyans, teals (default, calm and soothing)
- **Matrix**: Green monochrome (classic hacker aesthetic)
- **Starlight**: Deep blues, purples, white (cosmic space)
- **Fire**: Reds, oranges, yellows (warm and energetic)
- **Monochrome**: Grayscale gradient (clean and minimal)
- All patterns automatically adapt to themes
- Cycle with `t` key or jump directly with `0t2`, `0tfire`

#### 🖱️ Full Mouse Support

- **Mouse Move**: Pattern-specific hover effects (ripples, force fields, distortion)
- **Mouse Click**: Burst animations, spawning effects, mode toggles
- **Examples**: Click for splash in Waves, spawn bolts in Lightning, launch fireworks
- Enable/disable with `--no-mouse` CLI flag

#### ⌨️ Advanced Command System

- **Dual-layer input**: Direct keys (instant) + Command buffer (extended features)
- **Command Buffer** (prefix with `c`):
  - Presets: `c01-c99` (load preset)
  - Favorites: `cf1-cf99` (load), `cF1-cF99` (save), `cfl` (list)
  - Pattern jumps: `cp3`, `cp3.5`, `cpwaves`
  - Theme commands: `ct2`, `ctfire`, `ctr` (random)
  - Special: `c*` (random preset), `c**` (random all), `c?` (list presets), `c??` (catalog)
  - Shuffle: `c!` (toggle, 10s default), `c!5` (custom interval), `c!!` (shuffle all)
  - Combinations: `cp3+05+t2` (pattern + preset + theme)
- **10-second timeout** with visual feedback
- **Command history** with up/down arrow navigation

#### 💾 Favorites System

- Save current state (pattern + preset + theme) to slots 1-99
- Persistent storage in config file
- Quick recall with `0f#` commands
- List all saved favorites with `0fl`
- Includes timestamps and optional notes

#### 🔀 Shuffle Mode

- **Auto-cycle presets** at regular intervals (1-300 seconds)
- Two modes:
  - Preset shuffle (`0!`): Cycles presets of current pattern
  - Full shuffle (`0!!`): Randomizes pattern + preset + theme
- Configurable interval: `0!5` for 5-second cycles
- Perfect for ambient background animations

#### ⚙️ Configuration System

- **Config file**: `~/.config/ascii-splash/.splashrc.json`
- **Merge priority**: CLI args > config file > defaults
- **Global settings**: defaultPattern, quality, fps, theme, mouseEnabled
- **Pattern-specific configs**: Customize each pattern's behavior
- **Favorites storage**: Persisted across sessions
- **CLI arguments**: `--pattern`, `--quality`, `--fps`, `--theme`, `--no-mouse`

#### 📊 Performance Monitoring

- Real-time FPS display with 60-frame rolling average
- Frame time breakdown (update, pattern render, terminal render)
- Changed cell count tracking
- Frame drop detection
- Pattern-specific metrics
- Toggle debug overlay with `d` key
- **Target**: <5% CPU idle, <50MB RAM

#### 🎯 Performance Mode

- **LOW**: 20 FPS - Battery saver mode
- **MEDIUM**: 30 FPS - Balanced (default)
- **HIGH**: 60 FPS - Smooth animations
- Cycle with `[` / `]` keys
- Set via `--quality` CLI flag or config file

#### 🔧 Double-Buffering Renderer

- Flicker-free rendering with dirty cell tracking
- Only changed cells are redrawn each frame
- Efficient terminal output with minimal writes
- Automatic terminal resize handling

### 📦 Distribution

- **npm package**: `ascii-splash`
- **Global install**: `npm install -g ascii-splash`
- **Run with npx**: `npx ascii-splash`
- **Binary name**: `splash`
- **Package size**: 124.2 kB (137 files)

### 🧪 Testing

- **817 tests**, all passing ✅
- **82.34% code coverage**
- 16 test suites covering:
  - All 17 patterns with preset validation and buffer fill tests
  - Configuration system (defaults, loader, themes)
  - Engine components (animation, performance, command system)
  - Renderer (buffer, terminal)
- Comprehensive pattern testing (rendering, mouse events, presets, state)

### 📚 Documentation

- **README.md**: Installation, usage, features overview
- **CLAUDE.md**: Development guide, architecture, pattern development
- **examples/.splashrc.example**: Comprehensive config file example
- **docs/ARCHITECTURE.md**: Technical architecture and design patterns
- **docs/TESTING_PLAN.md**: Testing strategy and coverage goals
- **docs/PROJECT_STATUS.md**: Current status and feature completion

### 🎮 Controls Reference

**Direct Keys** (instant actions):

- `1-9`: Switch to patterns 1-9
- `n` / `b`: Next/Previous pattern
- `.` / `,`: Next/Previous preset
- `p`: Pattern mode (interactive selection)
- `SPACE`: Pause/Resume
- `t`: Cycle themes
- `r`: Random pattern + preset + theme
- `s`: Save configuration
- `+` / `-`: Adjust FPS
- `[` / `]`: Cycle performance mode (LOW/MEDIUM/HIGH)
- `d`: Toggle debug overlay
- `?`: Toggle help overlay
- `q` / `ESC` / `Ctrl+C`: Quit

**Command Buffer** (prefix with `c`):

- See command system features above

### 🛠️ Technical Details

- **Language**: TypeScript, compiled to ES2020 CommonJS
- **Runtime**: Node.js 20+
- **Key Dependencies**:
  - `terminal-kit`: Terminal control and mouse input
  - `commander`: CLI argument parsing
  - `conf`: Cross-platform config file management
- **Architecture**: 3-layer design (Renderer, Engine, Pattern)
- **License**: MIT

### 🙏 Acknowledgments

Built with `terminal-kit` for terminal control and inspired by classic terminal screensavers.

---

## Future Releases

**Potential future enhancements**:

- Additional patterns and presets
- Custom pattern creation API
- Plugin system
- Web-based preset editor
- Performance optimizations
- Extended terminal emulator support

[Unreleased]: https://github.com/reowens/ascii-splash/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/reowens/ascii-splash/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/reowens/ascii-splash/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/reowens/ascii-splash/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/reowens/ascii-splash/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/reowens/ascii-splash/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/reowens/ascii-splash/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/reowens/ascii-splash/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/reowens/ascii-splash/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/reowens/ascii-splash/releases/tag/v0.1.0
