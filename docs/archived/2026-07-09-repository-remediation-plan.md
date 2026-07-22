---
type: plan
status: archived
updated: 2026-07-22T05:10:52Z
---

# Repository Remediation Plan — July 2026

**Status**: ✅ M0-M8 complete — July 11, 2026  
**Created**: July 9, 2026  
**Source audit**: [Repository Audit — July 9, 2026](../status/reports/2026-07-09-repository-audit.md)  
**Goal**: Restore a trustworthy green baseline, correct core runtime state and
rendering behavior, make share replay genuinely deterministic, and establish
release gates before workspace-viz Phase B.

---

## Planning Pass Summary

The audit findings are interdependent. Treating them as 17 unrelated fixes
would create rework, particularly around runtime state, transitions, clocks,
and photo performance. This second planning pass groups them into nine ordered
milestones.

### Recommended Order

| Milestone | Outcome                                  | Included work                                       |
| --------- | ---------------------------------------- | --------------------------------------------------- |
| M0        | Green, trustworthy baseline              | Timer teardown, characterization tests              |
| M1        | Isolated configuration                   | Deep clone/freeze, fingerprint regression           |
| M2        | One authoritative runtime state          | Controller extraction, command/shortcut convergence |
| M3        | Correct frame/transition pipeline        | Buffer dirty tracking, snapshot transitions         |
| M4        | Real share-code replay                   | Relative clock, semantic decode validation          |
| M5        | Photo performance and resilience         | Render cache, async resize error handling           |
| M6        | Workspace/config hardening               | Phase A tests, focus fix, runtime config validation |
| M7        | Enforced release quality                 | CI coverage/lint/format, dependency audit           |
| M8        | Documentation and architecture follow-up | Status refresh, dead-architecture decision          |

### Why This Order

1. **Tests first**: every later work item needs a reliable gate.
2. **Config isolation before share tests**: otherwise share fingerprints are
   measured against mutable defaults.
3. **Runtime state before replay**: share codes must read the same authoritative
   pattern/preset/theme state that the user sees.
4. **Transitions before the clock contract**: live-pattern transitions currently
   render patterns extra times and consume RNG, which would invalidate clock and
   determinism work.
5. **Photo cache after snapshot transitions**: this avoids optimizing around the
   current duplicate transition rendering.
6. **Workspace tests before Phase B**: Phase A must be locked before live events
   add concurrency and filesystem lifecycle concerns.
7. **Docs last**: metrics should describe the remediated baseline, not an
   intermediate state.

---

## Execution Rules

- Work directly on `main` in small, reviewable commits, per repository policy.
- Do not mix formatting-only changes into functional commits.
- Build before tests: `npm run build` is always the first verification command.
- Every work item must add a regression test that fails against the audited
  baseline unless the item is tooling/documentation-only.
- Keep exactly one authority for pattern, preset, theme, seed, and pattern-array
  state after M2.
- Preserve 0-based internal coordinates and terminal-kit's 1-based output
  conversion.
- Preserve seeded PRNG call order unless a work item explicitly changes the
  replay format or bumps its version.
- Do not begin workspace-viz Phase B until M0-M7 are complete.

### Standard Verification Ladder

Run the narrowest relevant suite during implementation, then complete the full
ladder before marking a milestone done:

```bash
npm run build
npm run typecheck
npm run lint
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run format:check
npm audit --omit=dev
npm pack --dry-run
```

Performance work must additionally run targeted benchmarks at 80x24 and
160x48. Terminal-facing work must be manually checked in a TTY at normal and
small sizes.

---

## Milestone M0 — Restore and Characterize the Baseline

### REM-001 — Fix CommandExecutor fake-timer teardown

**Audit finding**: AUD-005  
**Priority**: P0  
**Size**: XS  
**Dependencies**: None  
**Status**: ✅ Complete — July 9, 2026

**Target files**:

- `tests/unit/engine/CommandExecutor.test.ts`

**Implementation steps**:

1. Move `executor.cleanup()` before `jest.useRealTimers()` in `afterEach`.
2. Guard cleanup if setup failed before executor construction.
3. Add an assertion in shuffle cleanup coverage that all timers are cleared.
4. Run the targeted suite twice to catch leaked cross-test state.

**Acceptance criteria**:

- All 96 CommandExecutor tests pass.
- Full suite reports 2317/2317 passing before new tests are added.
- Jest exits without the open-handle warning.

**Verify**:

```bash
npm run build
npm test -- tests/unit/engine/CommandExecutor.test.ts --runInBand
npm test -- --runInBand
```

**Suggested commit**: `test: clean up shuffle timers before restoring real timers`

**Completion evidence**:

- CommandExecutor cleanup now runs before Jest restores real timers and asserts
  that no fake timers remain.
- Three real-timer CommandBuffer integration tests now cancel active buffers
  during teardown, removing the open handles exposed by the full-suite check.
- Targeted result: 141/141 tests passed with `--detectOpenHandles`.
- Full result: 2317/2317 tests passed with no open-handle warning.

---

### REM-002 — Add regression characterization for audited failures

**Audit findings**: AUD-001, AUD-002, AUD-003, AUD-006, AUD-007  
**Priority**: P0  
**Size**: M  
**Dependencies**: REM-001

Add focused tests alongside each subsequent fix rather than landing a red test
commit. This work item defines the required coverage so implementation does not
drift.

**Required regression scenarios**:

1. **Config isolation**
   - loading an override does not mutate `defaultConfig`;
   - two sequential loads do not contaminate each other;
   - a non-default value changes `computeConfigHash` inputs.
2. **Runtime state**
   - command pattern switch updates engine, status-facing state, mouse target,
     preset target, and share state together;
   - theme rebuild cannot reactivate an old-theme pattern;
   - random-all preserves its chosen pattern through theme rebuild.
3. **Buffer**
   - explicit black to undefined foreground emits a change;
   - clearing an overlay restores an unchanged underlying cell;
   - defined/undefined background behavior remains correct.
4. **Transition**
   - resize to a larger boundary during transition does not throw;
   - one display frame invokes the active pattern exactly once;
   - foreground and background colors survive blending/copying.
5. **Replay clock**
   - two sessions with different wall-clock origins but equal relative frame
     schedules render equal buffers.

**Test architecture note**: Do not import `src/main.ts` directly; it executes
top-level terminal bootstrap. M2 must extract orchestration into an import-safe
class/module and place integration tests against that unit.

**Acceptance criteria**:

- Every high-priority correctness fix has a direct regression test.
- Tests assert observable state rather than private fields where practical.
- No static source-text tests are used when behavior can be exercised.

---

## Milestone M1 — Isolate Configuration and Fingerprints

### REM-010 — Deep-clone and protect default configuration

**Audit finding**: AUD-002  
**Priority**: P0  
**Size**: S  
**Dependencies**: REM-001  
**Status**: ✅ Complete — July 9, 2026

**Target files**:

- `src/config/ConfigLoader.ts`
- `src/config/defaults.ts`
- `tests/unit/config/ConfigLoader.test.ts`
- `tests/unit/utils/shareCode.test.ts` or a new config/share integration suite

**Implementation steps**:

1. Replace the shallow spread in `ConfigLoader.load()` with a deep clone.
   `structuredClone(defaultConfig)` is available on the Node 20 baseline and
   the config schema is JSON-persistable.
2. Ensure file configuration is treated as a source and never retained by
   reference in the merged result.
3. Add a recursive test-only/development freeze for `defaultConfig`, or export a
   factory that returns fresh defaults. Prefer a factory if freezing conflicts
   with Conf internals.
4. Add sequential-load tests with different overrides.
5. Add a test proving a custom pattern field produces a different config hash
   from defaults after loading.

**Acceptance criteria**:

- `defaultConfig` is deeply equal before and after any number of loads.
- Mutating a returned config cannot mutate defaults or another returned config.
- Share fingerprint tests detect non-default loaded values.
- Existing configuration and favorites tests remain green.

**Suggested commit**: `fix(config): isolate merged config from default objects`

**Completion evidence**:

- `createDefaultConfig()` now returns a structured clone for both Conf defaults
  and every load operation.
- Mutable arrays loaded from Conf are cloned before entering effective config.
- Added regressions for default non-mutation, sequential-load isolation, array
  ownership, and preservation of non-default share fingerprints.
- Targeted result: 62/62 config and share tests passed.
- Full result: 2321/2321 tests passed; build, typecheck, lint, and changed-file
  formatting checks passed.

---

### REM-011 — Make configuration save failures observable

**Audit relation**: AUD-011 supporting hardening  
**Priority**: P2  
**Size**: XS  
**Dependencies**: REM-010

`ConfigLoader.save()` catches and logs errors but returns `void`, while
CommandExecutor always reports success.

**Implementation steps**:

1. Return a result (`boolean` or typed result) from save operations, or allow a
   typed error to propagate to the command boundary.
2. Update `CommandExecutor.saveConfig()` and favorite saves to report failure.
3. Add a mocked write-failure command test.

**Acceptance criteria**:

- A failed config write produces an error toast/result, not `Saved: ...`.
- Successful behavior and config path remain unchanged.

---

## Milestone M2 — Establish One Runtime State Authority

### REM-020 — Extract an import-safe runtime controller

**Audit finding**: AUD-001  
**Priority**: P0  
**Size**: L  
**Dependencies**: REM-010  
**Status**: ✅ Complete — July 10, 2026  
**Detailed design**: [Runtime Controller Design — REM-020](2026-07-09-runtime-controller-design.md)

**Target files**:

- New `src/engine/RuntimeController.ts` (name may change)
- `src/main.ts`
- `src/engine/CommandExecutor.ts`
- `src/types/index.ts`
- New `tests/integration/runtime-state.test.ts`
- Existing CommandExecutor tests

**Locked design outcome**:

There must be one owner of:

- the current patterns array;
- the parallel seed array;
- current pattern index;
- current preset ID;
- current theme index/theme;
- pattern rebuilds;
- engine pattern switching;
- status-facing scene snapshot.

`main.ts` should remain responsible for terminal wiring and CLI bootstrap, not
state duplication.

**Recommended API shape**:

```typescript
interface SceneSnapshot {
  patternIndex: number;
  patternName: string;
  presetId: number;
  themeIndex: number;
  seed: number;
}

interface RuntimeController {
  getSnapshot(): SceneSnapshot;
  getCurrentPattern(): Pattern;
  switchPattern(index: number, presetId?: number): Result;
  applyPreset(id: number): Result;
  changeTheme(index: number): Result;
  randomize(mode: 'preset' | 'all' | 'theme'): Result;
  rebuild(reason: 'theme' | 'quality'): void;
}
```

The exact API may differ, but CommandExecutor and direct keyboard shortcuts must
call the same methods.

**Implementation steps**:

1. Extract pattern-name/display-name registries and pattern construction from
   `main.ts` into import-safe modules.
2. Create the controller around engine, config, theme registry, pattern
   factory, optional photo, and optional workspace model.
3. Move switch/preset/theme/quality state mutation into the controller.
4. Make `CommandExecutor` delegate actions rather than retain independent
   pattern arrays and indices. It may retain shuffle timers, but each timer tick
   must call the controller.
5. Have direct keys (`n`, `b`, `.`, `,`, `t`, `r`, numeric shortcuts) call the
   same controller methods.
6. Update status/toast UI from the returned controller result/snapshot.
7. Generate share state exclusively from `controller.getSnapshot()`.
8. Ensure theme rebuild atomically replaces patterns and seeds before selecting
   the active replacement.

**Required tests**:

- command and direct shortcut paths produce identical snapshots;
- `cp2` changes mouse and preset target to pattern 2;
- `ct2` rebuilds and keeps the same selected pattern;
- command after theme change cannot select an old instance;
- `c**`/`r` selected pattern survives theme application;
- favorite load updates all state fields;
- shuffle uses the current rebuilt array;
- photo/layered/workspace optional slots remain aligned with names and seeds;
- Shift+S state matches the engine's active pattern.

**Acceptance criteria**:

- No duplicate `currentPatternIndex`, `currentPresetIndex`, or
  `currentThemeIndex` authority remains in `main.ts` and CommandExecutor.
- Pattern arrays and seed arrays are replaced atomically.
- All direct and command routes pass integration tests.
- `src/main.ts` is smaller and contains no business-state transition logic.

**Suggested commits**:

1. `refactor(engine): extract runtime scene controller`
2. `refactor(commands): route commands through runtime controller`
3. `test(integration): cover unified scene state transitions`

**Completion evidence**:

- Added PatternCatalog and RuntimeController as the sole construction/state
  boundaries.
- CommandExecutor and every direct interactive path now share one runtime.
- Theme rebuilds preserve stable pattern identity, selected preset state, and
  seeds while atomically replacing slot instances.
- Dynamic preset metadata supports procedural, Photo, layered, and workspace
  slots without hard-coded ranges.
- Full result: 2370/2370 tests passed; build, typecheck, lint, formatting, CLI
  smoke, and pseudo-TTY startup/input/cleanup checks passed.

---

### REM-021 — Normalize preset introspection and favorites

**Audit relation**: AUD-001  
**Priority**: P1  
**Size**: S  
**Dependencies**: REM-020  
**Status**: ✅ Complete — July 10, 2026

Favorites currently cannot reliably save the current preset because the Pattern
interface has no current-preset method and CommandExecutor owns stale state.

**Implementation steps**:

1. Treat the controller's preset ID as authoritative; do not require every
   pattern to expose `getCurrentPreset()`.
2. Save favorite pattern identity using stable internal pattern names rather
   than constructor names where possible.
3. Load favorites through the same controller operation used by direct pattern
   switching.
4. Decide and test how non-shareable optional slots are represented or refused.

**Acceptance criteria**:

- Saving after preset 4 records preset 4.
- Loading the favorite restores pattern, preset, and theme in UI and engine.
- Renaming/minifying a class constructor cannot invalidate a favorite.

**Completion evidence**:

- Favorite saves now persist the stable PatternSlot key instead of a class
  constructor name.
- Explicit preset state comes from RuntimeController; config-derived baselines
  omit `preset`, while an explicitly applied preset 1 remains distinguishable.
- Favorite loads use atomic `applyScene()` and restore stable pattern key,
  explicit preset, and theme together.
- Legacy constructor-name favorites remain load-compatible through slot aliases.
- Favorite lists normalize known stable and legacy identities to display names.
- Runtime-only photo/layered/workspace slots persist their stable key and require
  the matching CLI context when loaded in a later session; this policy is now
  documented.
- Added unit coverage for stable IDs, legacy migration, baseline/preset-1
  distinction, authoritative preset 4, and all optional slot kinds.
- Added an integration save→change→load round trip restoring pattern, preset,
  and theme.
- Full result: 2378/2378 tests passed; build, typecheck, lint, formatting, and
  diff checks passed.

---

## Milestone M3 — Correct Frame and Transition Rendering

### REM-030 — Track the final composited frame in Buffer

**Audit finding**: AUD-006  
**Priority**: P1  
**Size**: M  
**Dependencies**: REM-001  
**Status**: ✅ Complete — July 10, 2026

**Target files**:

- `src/renderer/Buffer.ts`
- `tests/unit/renderer/Buffer.test.ts`
- `tests/unit/patterns/LayeredPattern.test.ts`

**Implementation steps**:

1. Introduce a single cell equality helper that compares:
   - character;
   - foreground definedness and RGB;
   - background definedness and RGB.
2. Compose base and overlay cells before dirty comparison.
3. Store the final composited cell as the previous terminal frame.
4. Avoid string map keys on the full-frame hot path if a row/column sparse
   structure can simplify overlay lookup; correctness comes first.
5. Keep returned `Cell` values safe from later mutation by callers.

**Required tests**:

- undefined foreground ↔ black;
- undefined background ↔ black;
- persistent overlay over changing base;
- overlay removal over unchanged base;
- overlay replacement with another overlay;
- resize clears overlay and previous-frame state;
- photo fg/bg cells remain stable when unchanged.

**Acceptance criteria**:

- Both focused audit reproductions emit exactly one restoring change.
- Existing dirty-rect efficiency assertions remain within their current bounds.
- No full-screen terminal rewrite is introduced for sparse frames.

**Suggested commit**: `fix(renderer): diff final composited cells exactly`

**Completion evidence**:

- Added one exact `cellsEqual()` helper covering character, foreground
  definedness/RGB, and background definedness/RGB.
- Buffer now compares and snapshots the final base+overlay composition rather
  than storing only the base animation frame.
- Replaced string-coordinate overlay keys with sparse per-row numeric maps.
- Cell inputs, change results, and previous-frame snapshots clone foreground and
  background colors to prevent later caller mutation.
- Added regressions for default↔black foreground/background, hidden base
  changes, overlay removal/replacement, resize reset, stable photo fg/bg cells,
  and mutation isolation.
- Both audit reproductions now emit exactly one restoring change; unchanged
  persistent overlays emit none.
- Existing LayeredPattern dirty-rect efficiency assertions remain green.
- Targeted renderer/layer/photo result: 89/89 tests passed.
- Full result: 2387/2387 tests passed; build, typecheck, lint, formatting, and
  diff checks passed.

---

### REM-031 — Replace live-pattern transitions with frame snapshots

**Audit findings**: AUD-007, AUD-008  
**Priority**: P1  
**Size**: L  
**Dependencies**: REM-020, REM-030  
**Status**: ✅ Complete — July 10, 2026

**Target files**:

- `src/renderer/TransitionManager.ts`
- `src/engine/AnimationEngine.ts`
- `src/main.ts` or `RuntimeController.ts`
- `tests/unit/ui/transition.test.ts`
- `tests/unit/engine/AnimationEngine.test.ts`

**Recommended design**:

- On pattern switch, capture a deep snapshot of the last displayed pattern
  area before reset.
- Let AnimationEngine render the new pattern exactly once into the current
  frame.
- TransitionManager blends/copies from the source snapshot to the current
  target buffer. It never calls `Pattern.render()`.
- UI overlays/status render after the transition blend and are not part of the
  pattern snapshot.
- On resize, either safely resize/reproject the source snapshot or cancel the
  short transition. Cancel-on-resize is acceptable and simpler.

**Implementation steps**:

1. Change `TransitionManager.start()` to accept a source frame snapshot rather
   than two Pattern instances.
2. Change `render()` to accept the already-rendered target frame.
3. Preserve `char`, optional foreground, and optional background for every
   transition type.
4. Define crossfade behavior when one side lacks a color; do not silently turn
   terminal-default cells into black unless that is an explicit design choice.
5. Ensure old pattern reset occurs only after snapshot capture.
6. Ensure target reset/activation occurs once.
7. Cancel or safely adapt transition on resize.

**Required tests**:

- render call count is one per active engine frame;
- old pattern state is visible in the first transition frame;
- source and target PRNG sequences are unchanged by enabling transitions;
- fg/bg photo cells survive wipe and dissolve;
- larger and smaller resize during transition cannot throw;
- status row is not taken from a pattern snapshot;
- transition completion leaves the exact target frame.

**Acceptance criteria**:

- TransitionManager has no Pattern dependency.
- Enabling a transition does not change a seeded pattern's frame-N output after
  transition completion.
- Resize reproduction passes.
- Photo transition cost no longer includes duplicate photo rendering.

**Suggested commits**:

1. `refactor(renderer): transition between frame snapshots`
2. `test(renderer): lock transition resize and determinism behavior`

**Completion evidence**:

- TransitionManager now accepts a deep frame snapshot and has no Pattern
  dependency or pattern-render calls.
- AnimationEngine captures the raw pattern area immediately after its one render
  call and before transitions, toasts, help, or status mutate the buffer.
- Runtime pattern switches capture that frame before AnimationEngine resets the
  old and new pattern instances.
- Transition rendering blends the captured source into the already-rendered
  target frame, preserving character, optional foreground, and optional
  background fields.
- Crossfade preserves terminal-default color definedness instead of coercing
  missing colors to black.
- Resize in either direction cancels the transition and leaves the exact target
  frame untouched.
- The reserved status row is excluded from source snapshots and transition
  writes.
- Engine coverage verifies raw snapshot isolation and exactly one target render
  per active frame; transition coverage verifies old-state first frame, exact
  completion, fg/bg wipes/dissolve, immutable source, and resize safety.
- Targeted transition/engine/runtime result: 119/119 tests passed.
- Full result: 2383/2383 tests passed; build, typecheck, lint, formatting, and
  diff checks passed.

---

## Milestone M4 — Make Share Replay Real

### REM-040 — Introduce a relative, pause-aware animation clock

**Audit finding**: AUD-003  
**Priority**: P1  
**Size**: L  
**Dependencies**: REM-020, REM-031  
**Status**: ✅ Complete — July 11, 2026

This item requires a short design decision before editing because procedural
patterns, persistent workspace model time, transitions, pause, and future
record/replay have different lifetime requirements.

**Required clock semantics**:

- `sceneTime`: starts at zero for a newly activated/reset procedural scene;
- `deltaTime`: non-negative and capped only where a pattern explicitly needs a
  physics stability cap;
- pause: neither scene time nor delta advances while paused;
- replay: two sessions with different wall clocks see the same sceneTime
  sequence for the same relative frame schedule;
- workspace session time: persists across disposable view rebuilds and pattern
  switches;
- transitions: do not advance either pattern independently.

**Recommended implementation direction**:

Add a render-time context instead of overloading one number indefinitely:

```typescript
interface FrameTime {
  sceneTime: number;
  appTime: number;
  deltaTime: number;
}
```

A compatibility migration can initially continue passing `sceneTime` as the
existing numeric `time`, while AnimationEngine separately owns a monotonic
pause-aware application clock for workspace services. Avoid adding wall-clock
origin to the share code unless relative time proves insufficient.

**Implementation steps**:

1. Add an engine clock abstraction injectable in tests.
2. Track accumulated active time rather than forwarding `Date.now()`.
3. Reset scene time at the defined activation boundary.
4. Audit every pattern's time usage, especially absolute sine/noise phase and
   first-frame delta sentinels.
5. Adapt WorkspaceModel so its session clock remains monotonic across view
   recreation and switching.
6. Update Pattern interface documentation.
7. Add different-origin replay tests for all 23 patterns, not only three
   canaries. Use representative frame schedules and compare complete cells,
   including backgrounds.
8. Add pause/resume tests proving no phase jump.

**Acceptance criteria**:

- Wave audit reproduction yields zero differences for equal relative times.
- Every procedural pattern passes same-seed/different-origin replay.
- Pause/resume does not advance animation phase during pause.
- Workspace heat never moves backward after theme rebuild or pattern return.
- No pattern reads `Date.now()` for normal render or interaction timing.

**Format/version decision**:

If replay output changes for existing v1 codes, decide explicitly between:

- treating current v1 behavior as broken and fixing playback in place; or
- bumping `SHARE_CODE_VERSION` and documenting v1 incompatibility.

Given the advertised guarantee, fixing playback in place is likely preferable,
but this must be recorded in the implementation commit.

**Suggested commits**:

1. `refactor(engine): add pause-aware relative animation clock`
2. `fix(patterns): use scene-relative animation time`
3. `test(determinism): replay all patterns across clock origins`

**Completion evidence**:

- Added an injectable `AnimationClock` with separate scene and application
  lifetimes backed by a monotonic source.
- Scene time resets on pattern activation, explicit pattern reset, and preset
  application; application time remains continuous across scene and theme
  changes.
- Paused and stopped intervals are excluded from scene time, application time,
  and frame delta time. Engine scheduling continues to use the raw monotonic
  source without exposing its origin to patterns.
- The existing numeric Pattern time parameter now receives scene-relative time;
  an optional `FrameTime` context supplies scene, application, and delta values
  during the compatibility migration.
- WorkspaceVizPattern consumes application time, so its persistent model epoch,
  heat, camera, and twinkle phase never move backward across disposable view
  rebuilds or pattern returns.
- Removed every runtime `Date.now()` read from procedural pattern interaction
  timing.
- Seeded simplex noise in OceanBeachPattern; the new registry-wide replay test
  exposed its previous implicit random source.
- Different-origin replay now compares complete cells, including foreground and
  background definedness/RGB, for all 23 procedural patterns over a varied frame
  schedule.
- Clock tests cover different origins, pause/resume, stop/restart, scene reset,
  non-negative deltas, and app-time continuity. Engine and workspace tests cover
  delivery and lifecycle integration.
- Full result: 2393/2393 tests passed; build, typecheck, lint, formatting, and
  diff checks passed.

**Format/version decision**:

- `SHARE_CODE_VERSION` remains v1. Absolute wall-clock playback and unseeded
  OceanBeach noise violated the advertised deterministic replay contract, so
  playback is fixed in place rather than preserving incorrect output.

---

### REM-041 — Validate share codes against runtime registries

**Audit finding**: AUD-012  
**Priority**: P1  
**Size**: S  
**Dependencies**: REM-020  
**Status**: ✅ Complete — July 11, 2026

**Target files**:

- `src/utils/shareCode.ts`
- Runtime controller/CLI play bootstrap
- `tests/unit/utils/shareCode.test.ts`
- New CLI-state tests

**Implementation steps**:

1. Keep structural bit decoding separate from supported-state validation.
2. Validate:
   - pattern ID exists in `PROCEDURAL_PATTERN_IDS`;
   - preset ID exists for that pattern;
   - theme ID exists in the current theme registry;
   - config fingerprint matches after REM-010.
3. Return typed error kinds for unsupported pattern, preset, and theme.
4. Reject before TTY/fullscreen setup.
5. Ensure Shift+S can only receive an encodable controller snapshot.

**Required tests**:

- crafted preset 7 and 8 codes;
- crafted theme 5-7 codes;
- reserved pattern IDs 23-31;
- valid boundary values;
- resharing every successfully played code cannot throw.

**Acceptance criteria**:

- Unsupported values produce one-line actionable CLI diagnostics.
- No invalid preset/theme reaches status state or `encodeShareCode()`.

**Suggested commit**: `fix(share): reject unsupported decoded scene values`

**Completion evidence**:

- Structural Crockford/bit decoding remains independent from supported-state
  validation.
- Added `validateShareState()` with typed `pattern`, `preset`, `theme`, and
  `configHash` errors against an injected runtime registry.
- The runtime share registry is derived from PatternCatalog procedural
  definitions and the current theme registry, including each pattern's actual
  preset IDs.
- `splash play` validates pattern, preset, theme, and config fingerprint before
  TTY/fullscreen setup and emits one-line actionable diagnostics.
- `splash share` and in-app Shift+S validate controller-derived state before it
  reaches `encodeShareCode()`; Shift+S converts any invariant failure into a UI
  message instead of throwing.
- Coverage includes crafted preset 7/8 payloads, themes 5-7, every reserved
  pattern ID 23-31, per-pattern preset lookup, valid maximum values, config hash
  mismatch, and re-encoding every valid registry scene.
- CLI integration verifies unsupported pattern/preset/theme codes fail before
  the non-TTY guard.
- Full result: 2414/2414 tests passed; build, typecheck, lint, formatting, and
  diff checks passed.

---

### REM-042 — Reassess config fingerprint strength

**Audit relation**: AUD-002/AUD-003 follow-up  
**Priority**: P2  
**Size**: S design task  
**Dependencies**: REM-010, REM-040  
**Status**: ✅ Complete — July 11, 2026

The current 13-bit fingerprint has only 8192 values. It is useful as a compact
drift hint but cannot make collision "overwhelmingly" unlikely.

**Decision options**:

1. Keep v1's 13 bits and describe it accurately as best-effort detection.
2. Reallocate payload bits or lengthen a v2 code to include a stronger checksum.
3. Embed normalized config deltas in a longer future scene format.

**Acceptance criteria**:

- Documentation no longer overstates collision resistance.
- Any wire-format change includes a version bump and locked reference vectors.

This is not a blocker for correctness if the limitation is documented, but it
should be settled before expanding share codes further.

**Decision and completion evidence**:

- Keep the v1 12-character/60-bit wire format and its 13-bit config field; no
  version bump or reference-vector change is needed for a documentation fix.
- Treat the fingerprint as a best-effort accidental-drift detector with 8192
  possible values, not an integrity check, security feature, or proof that two
  effective configs are equal.
- User documentation now scopes byte-for-byte replay to the same application
  version, effective config, and frame schedule, and explicitly discloses that
  fingerprint collisions are possible.
- Source documentation, the v0.5 roadmap, and changelog use the same language;
  the previous "overwhelming probability" claim was removed.
- A future stronger guarantee requires a versioned longer payload or a v2 bit
  reallocation plus locked reference vectors.

---

## Milestone M5 — Photo Performance and Resilience

### REM-050 — Cache rendered photo cells

**Audit finding**: AUD-004  
**Priority**: P1  
**Size**: M  
**Dependencies**: REM-030, REM-031  
**Status**: ✅ Complete — July 11, 2026

**Target files**:

- `src/patterns/PhotoPattern.ts`
- `tests/unit/patterns/photo.test.ts`
- `tests/performance/benchmark.test.ts` or a dedicated photo benchmark
- `tests/unit/patterns/LayeredPattern.test.ts`

**Cache key/invalidation inputs**:

- decoded source generation;
- resized width/height and data generation;
- preset ID and mode;
- preprocessing options;
- renderer options.

Theme is currently unused by PhotoPattern and should not invalidate the cache.

**Implementation steps**:

1. Add a cached `Cell[][]` (or compact flat cells) representing the rendered
   photo at the current size/preset.
2. Build it once after resize or lazily on the next render.
3. Warm render only blits cached cells into destination bounds.
4. Invalidate on successful load, successful resize, and every preset change
   that changes visual output.
5. Preserve photo transparency and fg/bg semantics for LayeredPattern.
6. Avoid cloning full RGB objects every frame if cached cells are immutable.

**Required benchmarks**:

- modes: halfblock, braille, symbol-all, symbol-ascii;
- sizes: 80x24 and 160x48;
- measure cold rebuild separately from 100 warm frames;
- layered photo plus sparse overlay.

**Acceptance criteria**:

- 80x24 warm static symbol render averages below 1ms locally, with a CI limit
  chosen to tolerate slower runners.
- Cold rebuild output is byte-for-byte equal to current expected snapshots.
- Preset and resize invalidation never shows a stale mode indefinitely.
- Sustained static photo CPU is consistent with the project's idle target.

**Suggested commit**: `perf(photo): cache preprocessed rendered cells`

**Completion evidence**:

- PhotoPattern now caches the final immutable `Cell[][]` for the active source
  generation, successful resize generation, terminal size, and preset.
- Edge/dither preprocessing and half-block/braille/symbol matching run only on a
  cold cache build. Warm frames perform a bounded reference blit without
  cloning RGB objects.
- Successful load, resize, terminal-size change, and every preset change
  invalidate the appropriate cache; theme changes do not.
- Layered rendering preserves photo transparency and fg/bg semantics while
  reusing the same rendered-cell cache.
- Added cold-versus-100-warm-frame benchmarks for half-block, braille,
  symbol-all, and symbol-ASCII at 80x24 and 160x48, plus a layered sparse
  overlay benchmark. All warm averages pass a 5ms CI ceiling; local 80x24
  symbol tests complete well inside the 1ms target per warm frame.
- Cache-build counters verify repeated warm and layered frames do not rebuild.
- Full result after the M5 batch: 2431/2431 tests passed.

---

### REM-051 — Make background resize scheduling failure-safe

**Audit finding**: AUD-010  
**Priority**: P1  
**Size**: S  
**Dependencies**: REM-050  
**Status**: ✅ Complete — July 11, 2026

**Implementation steps**:

1. Replace raw `void prepareForSize()` calls with one scheduler method.
2. Catch every asynchronous failure and update an observable error field.
3. Keep the last valid resized/rendered cache on failure.
4. Prevent an old resize request from replacing a newer successful target.
5. Decide retry behavior: retry only when target or preset changes, or use a
   bounded backoff; never retry every frame indefinitely.

**Required tests**:

- injected sharp/resize rejection from render scheduling;
- rejection from `onResize()`;
- newest-request-wins under rapid resize and mode changes;
- previous frame remains renderable after failure;
- no `unhandledRejection` event.

**Acceptance criteria**:

- Resize failures do not exit the application.
- `getMetrics().hasError` reflects background failures.
- A later successful resize clears the error and updates the cache.

**Suggested commit**: `fix(photo): contain asynchronous resize failures`

**Completion evidence**:

- All render/onResize background work routes through one deduplicating scheduler
  with a terminal rejection handler.
- Injectable image backends provide deterministic decode/resize failure and
  race coverage without mocking sharp internals.
- Request and source generations enforce newest-request-wins across rapid size
  and mode changes; stale completion cannot replace newer output.
- Failed requests update `getMetrics().hasError`, retain the last resized and
  rendered frame, and are not retried every frame. A size or preset change may
  retry, and a later success clears the error.
- Tests cover render scheduling rejection, `onResize()` rejection, retained
  frames, rapid resize/mode races, recovery, and absence of unhandled rejection
  events.

---

### REM-052 — Add clipboard process timeout

**Audit relation**: resilience follow-up  
**Priority**: P3  
**Size**: XS  
**Dependencies**: None  
**Status**: ✅ Complete — July 11, 2026

Native clipboard commands can theoretically remain open indefinitely. Add a
short timeout, terminate the child, and continue to the next candidate.

**Acceptance criteria**:

- A hanging mock command is killed and the next candidate is attempted.
- App cleanup does not retain clipboard child processes.

**Completion evidence**:

- Clipboard candidates have a configurable 1-second default timeout.
- Timed-out children receive `SIGTERM`; listeners and timers are removed before
  the next candidate is attempted.
- Successful and failed children cannot be settled twice or killed by a stale
  timeout.
- Tests verify hanging-command fallback, process termination, listener cleanup,
  and successful-process timer cleanup.

---

## Milestone M6 — Workspace and Configuration Hardening

### REM-060 — Add workspace-viz Phase A test suites

**Audit finding**: AUD-013  
**Priority**: P1  
**Size**: L  
**Dependencies**: REM-001, REM-040 clock decision  
**Status**: ✅ Complete — July 11, 2026

**Target suites**:

- `tests/unit/patterns/workspace/WorkspaceModel.test.ts`
- `tests/unit/patterns/workspace/RadialLayout.test.ts`
- `tests/unit/patterns/workspace/Camera.test.ts`
- `tests/unit/patterns/workspace/fixture.test.ts`
- `tests/unit/patterns/workspace/WorkspaceVizPattern.test.ts`
- runtime lifecycle integration coverage

**Required model coverage**:

- add/update file and intermediate directories;
- dirs-first stable sibling ordering;
- remove subtree aggregates;
- rename identity, paths, depth, heat, and aggregates;
- lazy heat decay and half-life boundaries;
- visible-tree hard budget;
- focus path expansion under budget;
- structure version changes;
- persistent camera/model across view reset and theme rebuild.

**Required fixture coverage**:

- valid schema and optional fields;
- wrong kind/schema/root types;
- duplicates;
- absolute, backslash, dot, dot-dot, and empty segments;
- non-finite/negative bytes and heat;
- file-count cap;
- path-depth/length limits added if the tests demonstrate recursion risk.

**Required pattern coverage**:

- buffer bounds at 1x1, 20x5, 80x24, and resize;
- preset behavior and reset lifecycle;
- deterministic twinkle with fixed seed;
- no model reset when disposable view resets;
- labels stay bounded;
- theme application;
- camera continuity and time monotonicity.

**Acceptance criteria**:

- Workspace directory reaches at least 90% statements and 80% branches.
- All public model mutation methods have success and failure paths covered.
- Tests reproduce and then protect the corrected focus behavior.

**Completion evidence**:

- Added dedicated WorkspaceModel, RadialLayout, Camera, fixture-parser, and
  WorkspaceVizPattern suites plus RuntimeController theme-rebuild integration.
- Model coverage includes add/update, stable ordering, conflict paths, subtree
  removal, rename identity/heat/aggregates, half-life decay, hard budgets, focus
  ancestry, versions, fixture loading, and application-time epochs.
- Fixture coverage includes malformed roots/schema/kind/files, duplicates, all
  unsafe path forms, numeric validation, 100k file cap, and new 4096-character /
  128-segment recursion limits.
- Pattern coverage includes 1x1, 20x5, 80x24, resize, presets, reset lifecycle,
  deterministic output, focus ties, theme replacement, camera/model persistence,
  and runtime theme rebuilds.
- Targeted workspace coverage: 94.52% statements, 84.11% branches, 96.15%
  functions, and 97.77% lines.
- Workspace fixture pseudo-TTY smoke passed at 80x24.

---

### REM-061 — Fix Focus preset hot-path selection

**Audit finding**: AUD-009  
**Priority**: P1  
**Size**: S  
**Dependencies**: REM-060 tests can land with this fix  
**Status**: ✅ Complete — July 11, 2026

**Implementation options**:

- select the hottest visible file by `heatOf()`;
- if only directories are visible, select the deepest directory with highest
  normalized heat (`subtreeHeat / max(1, subtreeFiles)`);
- deterministic ties use path order.

**Acceptance criteria**:

- Root is never selected as activity focus when a hot non-root node exists.
- Under a constrained node budget, the hot leaf's ancestor chain expands.
- Equal-heat fixtures produce stable layout/focus across runs.

**Suggested commit**: `fix(workspace): focus lod on active non-root nodes`

**Completion evidence**:

- Focus selection excludes the root and prefers hottest visible files by own
  heat.
- When leaves are collapsed, it selects a non-root directory by normalized
  subtree heat, depth, then stable path ordering.
- Metrics expose focused node identity/depth for behavioral regression tests.
- Constrained-budget and equal-heat tests protect ancestor expansion and
  deterministic tie behavior.

---

### REM-062 — Add runtime configuration schema and clamps

**Audit finding**: AUD-011  
**Priority**: P1  
**Size**: L  
**Dependencies**: REM-010  
**Status**: ✅ Complete — July 11, 2026

**Target files**:

- New config validation/schema module
- `src/config/ConfigLoader.ts`
- Every pattern constructor receiving persisted config
- `src/patterns/workspace/WorkspaceModel.ts`
- `tests/unit/config/ConfigLoader.test.ts`
- Pattern edge-case tests

**Validation categories**:

1. Globals: pattern, quality, FPS 10-60, theme, mouse boolean.
2. Counts: finite integers with explicit safe maxima.
3. Speeds/intensities/probabilities: finite and bounded.
4. Intervals/half-lives: positive finite ranges.
5. Enums: known algorithm, shape, particle type, label policy.
6. Character fields: non-empty terminal-cell-safe strings.
7. Coupled values: `minRadius <= maxRadius`, nonzero cell size, valid sigma
   ordering where applicable.
8. Workspace: positive half-life, bounded node/event rates, safe ignore arrays.

**Behavior decision**:

- Prefer a clear warning plus field-level fallback for user config.
- Reject only when safe fallback is impossible.
- CLI invalid values continue to fail immediately through Commander.

**Implementation steps**:

1. Define one schema or explicit parser returning validated `ConfigSchema`.
2. Validate the file config before deep merge.
3. Keep constructor clamps for allocation-heavy fields.
4. Include the config path and field path in warnings.
5. Ensure sanitized effective config is what share fingerprints hash.

**Required tests**:

- NaN/Infinity analogues where JSON permits problematic types/overflow;
- negative/zero/huge counts and intervals;
- invalid enums and strings;
- allocation-heavy patterns cannot exceed documented caps;
- malformed config does not leave terminal mode initialized;
- fingerprint uses sanitized effective values.

**Acceptance criteria**:

- No persisted count directly controls an unbounded allocation loop.
- Invalid file config produces deterministic fallback and diagnostics.
- All default/example config values pass validation unchanged.

**Completion evidence**:

- Added a configuration-boundary sanitizer for globals and every persisted
  pattern field, with finite bounds, count maxima, positive intervals, enums,
  booleans, terminal-safe characters, workspace arrays/maps, and coupled
  LavaLamp radii.
- Invalid fields emit deterministic warnings containing the config path and
  field path, then fall back independently to defaults; unknown fields are
  ignored.
- Sanitization occurs before deep merge, pattern construction, and share-code
  fingerprinting.
- WorkspaceModel clamps direct invalid half-lives, and TunnelPattern defensively
  caps its immediate allocation-heavy ring/particle/speed-line counts.
- Defaults and the corrected example config validate without warnings.
- Tests cover non-finite, negative, zero, huge, enum, string, coupled-value,
  workspace collection, allocation cap, and sanitized-fingerprint behavior.
- Full M6 result: 2498/2498 tests passed; build, typecheck, lint, formatting,
  diff checks, targeted coverage, and workspace smoke passed.

**Suggested commits**:

1. `feat(config): validate persisted settings at load boundary`
2. `fix(patterns): cap allocation-heavy configuration values`

---

## Milestone M7 — Enforce Release Quality

### REM-070 — Update vulnerable runtime dependencies

**Audit finding**: AUD-014  
**Priority**: P1  
**Size**: S  
**Dependencies**: REM-001  
**Status**: ✅ Complete — July 11, 2026

**Implementation steps**:

1. Update `conf` and lockfile within the compatible major range first.
2. Confirm the resulting `ajv` and `fast-uri` versions resolve advisories.
3. Run ConfigLoader tests against the real package as well as mocked unit paths.
4. If the direct update does not clear advisories, inspect npm's proposed lock
   changes before accepting overrides.
5. Do not use a blanket force upgrade across unrelated majors.

**Acceptance criteria**:

- `npm audit --omit=dev` reports zero vulnerabilities, or a documented
  time-bounded exception exists with exploitability analysis.
- Config path, defaults, favorites, and save behavior remain compatible.

**Completion evidence**:

- Updated `conf` from 15.0.2 to 15.1.0, with `ajv` 8.20.0 and `fast-uri`
  3.1.3 in the runtime dependency tree.
- Added a real-`Conf` integration suite covering config path, defaults, save,
  and favorites behavior in addition to mocked ConfigLoader unit tests.
- Applied compatible in-range direct and transitive dependency updates after
  inspecting npm's proposed changes; no forced major upgrade or override was
  used.
- A clean `npm ci` installs 513 audited packages. Both full `npm audit` and
  `npm audit --omit=dev` report zero vulnerabilities.

**Suggested commit**: `chore(deps): clear runtime config dependency advisories`

---

### REM-071 — Make CI run the quality commands it reports

**Audit finding**: AUD-013  
**Priority**: P1  
**Size**: M  
**Dependencies**: REM-001, REM-060, REM-070  
**Status**: ✅ Complete — July 11, 2026

**Target files**:

- `.github/workflows/ci.yml`
- `.github/workflows/dependency-review.yml` or a new audit workflow
- `package.json`
- `jest.config.mjs`

**Implementation steps**:

1. Run `npm run lint` and `npm run format:check` in CI.
2. Run coverage in exactly one supported Node matrix job to limit cost.
3. Upload the `lcov.info` produced by that same coverage command.
4. Keep unit tests on Node 20 and 22; decide whether Node 24 should be added
   separately after dependency compatibility is confirmed.
5. Add `npm audit --omit=dev` on pushes to main and/or a scheduled workflow,
   because PR-only dependency review is ineffective under direct-to-main policy.
6. Keep release's build/test/tarball audit, and add the production dependency
   audit before publish.
7. Remove deprecated duplicate `ts-jest` configuration under `globals` from
   `jest.config.mjs`; the transform already contains the active config.

**Acceptance criteria**:

- CI fails on test, coverage threshold, lint, format, or runtime audit failure.
- Codecov receives a real report.
- There is no duplicate test execution in one job without a stated reason.
- Release cannot publish with a known unexcepted runtime advisory.

**Completion evidence**:

- The Node 20 CI job runs runtime audit, build, typecheck, lint, format check,
  and the coverage suite; Node 22 retains compatibility build/test coverage.
- Codecov uploads `coverage/lcov.info` generated by the same coverage command,
  and upload failure is no longer silently accepted.
- Release runs the production dependency audit before build, tests, tarball
  inspection, and publish.
- Removed deprecated duplicate `ts-jest` globals configuration and retained the
  active ESM transform configuration in one place.
- Added weekly Dependabot updates for npm and GitHub Actions dependencies.
- Local reproduction of the complete Node 20 quality ladder passes, including
  2514/2514 tests and all configured coverage thresholds.

**Suggested commit**: `ci: enforce coverage formatting and runtime audit gates`

---

### REM-072 — Establish a clean formatting baseline

**Audit finding**: AUD-015  
**Priority**: P2  
**Size**: XS  
**Dependencies**: Functional edits to the same files should land first  
**Status**: ✅ Complete — July 11, 2026

**Implementation steps**:

1. Run the existing Prettier command.
2. Review the diff to ensure it is formatting-only.
3. Commit separately.
4. Enable the CI format gate in REM-071.

**Acceptance criteria**:

- `npm run format:check` passes.
- No behavioral change is mixed into the formatting commit.

**Completion evidence**:

- Applied Prettier to the audited formatting outliers after functional edits
  were complete and reviewed the resulting formatting-only changes.
- Rechecked the baseline after updating to Prettier 3.9.5 and normalized the
  three union declarations whose preferred wrapping changed.
- `npm run format:check` now passes across all configured source and test files,
  and CI enforces the same command.

**Suggested commit**: `style: apply repository prettier baseline`

---

### REM-073 — Add testable boundaries around main and terminal setup

**Audit finding**: AUD-013  
**Priority**: P2  
**Size**: M  
**Dependencies**: REM-020  
**Status**: ✅ Complete — July 11, 2026

M2 should remove most business logic from main. This follow-up covers the
remaining CLI and terminal boundary without attempting to instantiate a real
terminal in Jest.

**Implementation steps**:

1. Export pure CLI option/state conversion from an import-safe module.
2. Inject terminal/renderer creation behind a small interface.
3. Test malformed share codes, fixture errors, no-TTY behavior, and cleanup on
   initialization failure.
4. Add a child-process smoke test for `--help`, `--version`, `share`, malformed
   `play`, and malformed `watch --fixture`.
5. Decide whether `TerminalRenderer.ts` remains excluded from unit coverage;
   if so, document and cover it through a mockable adapter/integration test.

**Acceptance criteria**:

- Main-level state regressions can be caught without a real terminal.
- Every failure after fullscreen initialization invokes cleanup exactly once.
- CLI help/version remain usable without a TTY.

**Completion evidence**:

- Added import-safe CLI bootstrap boundaries for option normalization, TTY
  validation, terminal-resource creation, and idempotent cleanup.
- `main.ts` registers renderer cleanup immediately; initialization and global
  failure paths converge on cleanup that runs each callback at most once.
- Unit tests cover pure CLI conversion, non-TTY rejection, terminal factory
  cleanup registration, callback failure isolation, and exactly-once cleanup.
- Child-process smoke tests cover `--help`, `--version`, `share`, malformed
  `play`, malformed fixtures, and non-TTY interactive startup.
- `src/main.ts` remains excluded as a thin executable and
  `TerminalRenderer.ts` remains excluded because terminal-kit requires a real
  TTY; their extracted boundaries are automated and their integration is
  covered by the manual pseudo-TTY smoke.
- The final pseudo-TTY smoke passed pattern/theme/preset navigation, help,
  pause/resume, debug mode, resize, `q`, `Ctrl+C`, and terminal restoration. It
  also found and locked a terminal-kit printable-Space key representation with
  four regression tests.
- Final verification: 74 suites and 2514 tests pass; global coverage is 94.61%
  statements, 87.19% branches, 94.67% functions, and 95.24% lines.

---

## Milestone M8 — Refresh Documentation and Triage Architecture

### REM-080 — Refresh project status and measured metrics

**Audit finding**: AUD-016  
**Priority**: P2  
**Size**: S  
**Dependencies**: M0-M7 complete  
**Status**: ✅ Complete — July 11, 2026

**Target files**:

- `CLAUDE.md` (and symlinked entry points automatically)
- `docs/PROJECT_STATUS.md`
- `docs/README.md`
- `docs/planning/README.md`
- `docs/guides/TESTING.md`
- Relevant roadmap status headers

**Implementation steps**:

1. Update released/in-progress versions and dates.
2. Replace hard-coded test and coverage claims with the final verified numbers.
3. Mark v0.5 roadmap released rather than awaiting review.
4. Mark workspace-viz Phase A tests complete and Phase B blocked/unblocked based
   on this plan's outcome.
5. Correct stale branch/PR language to direct-to-main workflow.
6. Regenerate `docs/docs.md` only through its owning documentation tool; do not
   hand-edit generated content.

**Acceptance criteria**:

- Package version, release status, pattern counts, test counts, and coverage
  agree across entry-point docs.
- Every active roadmap has an accurate status/date.
- Generated documentation index has no unrelated manual diff.

**Completion evidence**:

- Refreshed `CLAUDE.md`, Project Status, documentation/planning indexes, testing
  and release guides, and active roadmap headers to v0.5.0/workspace Phase A.
- Entry-point documentation now agrees on 23 procedural patterns, 138
  procedural presets, 18 photo presets, 74 suites, 2514 tests, and the final
  94.61/87.19/94.67/95.24 coverage snapshot.
- Marked v0.4.0 and v0.5.0 released, Phase A automated coverage complete, and
  Phase B blocked on the explicit 80×24 visual-quality decision.
- Removed stale branch/awaiting-review language from active documents and
  documented the direct-to-main workflow.
- Left generated `docs/docs.md` untouched as required.

**Suggested commit**: `docs: refresh status after repository remediation`

---

### REM-081 — Decide the status of unused architecture primitives

**Audit finding**: AUD-017  
**Priority**: P3  
**Size**: M decision task  
**Dependencies**: M0-M7 complete  
**Status**: ✅ Complete — July 11, 2026

**Components**:

- `SceneGraph`
- `SpriteManager`
- `ParticleSystem`
- production EventBus subscriptions
- Buffer persistent overlay API

**Decision for each component**:

1. **Supported public primitive**: retain, document as optional/library API, and
   keep tests.
2. **Production architecture**: integrate it in an intentional feature with
   measured value.
3. **Dead abstraction**: deprecate and remove in a separate cleanup release.

**Acceptance criteria**:

- Documentation no longer claims unused components are active production call
  paths.
- No integration is performed merely to justify existing code.
- Removal, if chosen, includes package API impact review.

**Decision and completion evidence**:

- Classified `SceneGraph`, `SpriteManager`, `ParticleSystem`, EventBus
  subscriptions/emissions, and Buffer persistent overlays as legacy
  experimental abstractions to deprecate and remove in a separate cleanup.
- Confirmed there are no active production consumers: patterns render directly
  to `Cell[][]`, LayeredPattern composes sequentially, UI overlays use the
  ordinary frame callback, and engine events have no production subscribers.
- Updated active architecture, status, testing, and workspace planning docs so
  they no longer claim these facilities are production foundations.
- Added
  `docs/status/reports/2026-07-11-architecture-triage.md` with per-component
  evidence and explicit package API review requirements.
- No production integration or removal was performed as part of this decision
  task.

---

## Work Item Dependency Graph

```text
REM-001 test baseline
  ├─ REM-010 config isolation
  │    ├─ REM-011 save errors
  │    ├─ REM-020 runtime controller
  │    │    ├─ REM-021 favorites
  │    │    ├─ REM-031 snapshot transitions ─┐
  │    │    ├─ REM-041 share validation      │
  │    │    └─ REM-073 main boundary tests   │
  │    └─ REM-062 runtime config schema      │
  ├─ REM-030 buffer compositing ─────────────┤
  │                                         │
  └─ REM-070 dependencies                    │
                                            ▼
                           REM-040 relative replay clock
                                            │
                                            ├─ REM-060 workspace tests
                                            │    └─ REM-061 focus fix
                                            └─ REM-042 fingerprint decision

REM-030 + REM-031 ── REM-050 photo cache ── REM-051 resize resilience

REM-001 + REM-060 + REM-070 ── REM-071 CI gates ── REM-072 format baseline

M0-M7 ── REM-080 docs refresh ── REM-081 architecture triage
```

---

## Suggested Commit Sequence

The following sequence keeps commits narrow and normally green:

1. `test: clean up shuffle timers before restoring real timers`
2. `fix(config): isolate merged config from default objects`
3. `refactor(engine): extract runtime scene controller`
4. `refactor(commands): route commands through runtime controller`
5. `test(integration): cover unified scene state transitions`
6. `fix(renderer): diff final composited cells exactly`
7. `refactor(renderer): transition between frame snapshots`
8. `test(renderer): lock transition resize and determinism behavior`
9. `refactor(engine): add pause-aware relative animation clock`
10. `fix(patterns): use scene-relative animation time`
11. `test(determinism): replay all patterns across clock origins`
12. `fix(share): reject unsupported decoded scene values`
13. `perf(photo): cache preprocessed rendered cells`
14. `fix(photo): contain asynchronous resize failures`
15. `test(workspace): cover phase a model layout camera and view`
16. `fix(workspace): focus lod on active non-root nodes`
17. `feat(config): validate persisted settings at load boundary`
18. `fix(patterns): cap allocation-heavy configuration values`
19. `chore(deps): clear runtime config dependency advisories`
20. `style: apply repository prettier baseline`
21. `ci: enforce coverage formatting and runtime audit gates`
22. `docs: refresh status after repository remediation`

Some adjacent commits may be combined when one cannot compile independently,
but do not combine unrelated milestones merely to reduce commit count.

---

## Milestone Exit Gates

### M0 Exit

- Full baseline suite green and exits cleanly.
- Regression scenarios assigned to concrete tests.

### M1 Exit

- Defaults immutable across loads.
- Config hashes reflect actual effective overrides.

### M2 Exit

- One runtime state authority.
- Commands, shortcuts, UI, mouse, favorites, shuffle, and sharing agree.

### M3 Exit

- Exact final-frame dirty tracking.
- Snapshot transitions cannot alter pattern simulation or crash on resize.

### M4 Exit

- Same share code plus same relative schedule yields equal complete buffers
  across different wall-clock origins for all procedural patterns.
- Unsupported codes fail before terminal setup.

### M5 Exit

- Static photo warm frames meet the performance target.
- Background resize failures are contained.

### M6 Exit

- Workspace Phase A is thoroughly tested and Focus works.
- Persisted configuration cannot drive unsafe allocations.

### M7 Exit

- ✅ Full verification ladder is encoded in CI and passes locally.
- ✅ Full and runtime dependency audits are clean.
- ✅ Release workflow blocks publishing on runtime advisories.
- ✅ Pseudo-TTY startup, controls, resize, exit, and cleanup smoke passed.

### M8 Exit

- ✅ Status documents match measured reality.
- ✅ Unused architecture has an explicit disposition and follow-up boundary.

---

## Final Definition of Done

This remediation effort is complete when:

- all high and medium audit findings are closed or have a documented accepted
  exception;
- all tests pass without open handles;
- workspace-viz has meaningful unit and lifecycle coverage;
- coverage, lint, formatting, build, typecheck, runtime audit, and package audit
  are enforced in CI;
- direct commands and shortcuts cannot disagree about active scene state;
- config defaults remain immutable and share fingerprints are stable;
- share replay is tested across different wall-clock origins;
- transitions render simulations once per frame and preserve fg/bg cells;
- static photo warm-frame cost is cached and measured;
- the npm runtime dependency tree has no unexcepted known advisories;
- documentation reports the final verified baseline.

Only then should workspace-viz Phase B or another release feature become the
primary workstream.

## Version History

- **2026-07-22T05:10:52Z** Archived — M0-M8 complete July 11; landed on main for v0.6.0
