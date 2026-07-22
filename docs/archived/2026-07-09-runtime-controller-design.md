---
type: plan
status: archived
updated: 2026-07-22T05:10:54Z
---

# Runtime Controller Design — REM-020

**Status**: ✅ Complete — July 10, 2026  
**Created**: July 9, 2026  
**Parent plan**: [Repository Remediation Plan](2026-07-09-repository-remediation-plan.md)  
**Audit finding**: [AUD-001](../status/reports/2026-07-09-repository-audit.md#aud-001--runtime-state-splits-between-maints-and-commandexecutor)

---

## Decision Summary

Implement REM-020 as two focused components:

1. **PatternCatalog** builds self-describing pattern slots from stable pattern
   definitions.
2. **RuntimeController** is the sole mutable owner of active scene state and
   delegates only actual animation operations to AnimationEngine.

`CommandExecutor` becomes a command-to-controller adapter. `main.ts` becomes
terminal/CLI wiring and observes controller change events to update UI. Neither
component retains a second pattern array or independent pattern/theme indices.

This is preferable to adding more callbacks to `main.ts` and preferable to a
monolithic controller that also owns terminal rendering, toasts, transitions,
configuration persistence, and command parsing.

---

## Current-State Inventory

The current runtime has multiple independent owners for the same facts.

| State                | Current writers                                                     | Current readers                                   | Failure mode                                                   |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Pattern array        | Initial build, photo/watch append, theme callback, quality callback | main shortcuts/mouse/debug/share, CommandExecutor | Executor retains old array after rebuild                       |
| Active pattern index | main switch closure, CommandExecutor                                | navigation, mouse, status, debug, share, commands | Command switch does not update main                            |
| Active preset        | main direct cycling, play bootstrap, CommandExecutor                | status, share, favorites                          | Command preset does not update main                            |
| Theme index/theme    | main cycle, CommandExecutor callback                                | rebuild, status, debug, share                     | Callback can rebuild the wrong active pattern                  |
| Per-slot seed        | each pattern build                                                  | Shift+S                                           | Rebuild replaces seeds without one atomic owner                |
| Quality/FPS          | main quality keys, direct FPS keys, engine                          | status, save command, debug                       | Quality rebuild is unnecessary and state is split              |
| Pattern metadata     | `patternNames`, display-name map, constructor names, static presets | pattern buffer, commands, favorites, UI           | Parallel registries drift; optional slots complicate alignment |

### Current Mutation Paths

The controller must replace all of these paths:

- numeric shortcuts and `o` shortcut;
- next/previous pattern;
- pattern input mode by number, exact name, partial name, or `pattern.preset`;
- next/previous preset;
- theme cycle;
- quality and direct FPS controls;
- command pattern/theme/preset operations;
- random preset, random theme, randomize, and random all;
- shuffle timer callbacks;
- favorite load;
- play-code initial preset;
- theme rebuild and optional photo/layered/workspace slot rebuild;
- share-code snapshot creation;
- save-config snapshot creation;
- mouse and debug current-pattern lookup.

---

## Options Considered

### Option A — Add callbacks from CommandExecutor into main

CommandExecutor would call `onPatternChange`, `onPresetChange`, and the existing
`onThemeChange`, while main keeps all state.

**Advantages**:

- Smallest immediate diff.
- Few new types.

**Rejected because**:

- Keeps 1599-line `main.ts` as the untestable business-state owner.
- Callback ordering becomes the new source of atomicity bugs.
- Shuffle and combinations can expose intermediate state.
- Parallel pattern/name/seed arrays remain.
- It fixes symptoms without creating an import-safe integration boundary.

### Option B — Put everything in one application controller

A single class would own patterns, engine, renderer, transitions, command
parsing, config persistence, UI, and terminal listeners.

**Advantages**:

- One obvious top-level object.

**Rejected because**:

- Recreates `main.ts` as a large class rather than separating concerns.
- Couples state tests to terminal and UI mocks.
- Conflicts with the later snapshot-transition and clock work.
- Makes photo/workspace async lifecycle harder to isolate.

### Option C — PatternCatalog plus focused RuntimeController

PatternCatalog owns construction metadata; RuntimeController owns mutable scene
selection and delegates rendering to a narrow engine interface.

**Selected because**:

- Removes parallel arrays by construction.
- Creates an import-safe state boundary for tests.
- Lets commands and direct shortcuts share identical operations.
- Supports atomic rebuilds and multi-field scene selection.
- Preserves independent ownership for terminal UI, persistence, transitions,
  and future clock work.
- Can be implemented in slices without redesigning rendering in the same change.

---

## Component Boundaries

### PatternCatalog Responsibilities

- Define stable procedural pattern keys and display names.
- Centralize pattern construction and config mapping currently in `main.ts`.
- Supply preset metadata without constructor-name reflection.
- Build independent pattern instances for every slot.
- Append optional photo, layered, and workspace slots.
- Preserve or allocate seeds by stable slot key.
- Mark shareability explicitly.
- Provide legacy constructor-name aliases for favorite compatibility.

PatternCatalog does **not**:

- select the active pattern;
- call AnimationEngine;
- update status/toasts;
- persist config;
- load photo files or workspace fixtures;
- manage transitions.

### RuntimeController Responsibilities

- Own the current slot collection.
- Own active slot index/key, preset ID, theme index, quality, and FPS view.
- Provide the active Pattern to mouse/debug/render callers.
- Validate and apply pattern, preset, theme, quality, and FPS operations.
- Rebuild slots atomically on theme changes.
- Preserve stable seeds across rebuilds.
- Apply pattern+theme+preset scene selections as one transaction.
- Emit one typed event after each successful state mutation.
- Expose immutable snapshots and read-only catalog views.

RuntimeController does **not**:

- parse commands or format command messages;
- own shuffle timers;
- call ConfigLoader save/load methods;
- render status/toast/help UI;
- implement transition blending;
- change wall-clock semantics;
- encode/decode share codes;
- load photo/workspace sources.

### CommandExecutor Responsibilities After Migration

- Parse already-structured `ParsedCommand` intent into controller calls.
- Format user-facing success/error/list/search messages.
- Manage favorite persistence through ConfigLoader.
- Manage shuffle timers.
- Keep UX random selection on `Math.random()` as required by v0.5 tests.

CommandExecutor will no longer own:

- AnimationEngine;
- pattern arrays;
- theme arrays;
- current pattern/theme indices;
- a theme-change callback;
- an `updateState()` synchronization method.

### main.ts Responsibilities After Migration

- Parse CLI and perform no-TTY/error handling.
- Load config, photo, and workspace fixture/model.
- Construct PatternCatalog, initial slots, engine, controller, and UI.
- Wire terminal key/mouse events to controller methods.
- Observe controller events and synchronize status/toasts.
- Provide the temporary pre-switch transition hook until REM-031.
- Build share codes from controller snapshots.
- Perform cleanup.

---

## Data Model

### Preset Metadata

```typescript
export interface PatternPresetInfo {
  id: number;
  name: string;
  description?: string;
}
```

This summary becomes the common metadata shape. Pattern-local preset config
types remain local; the catalog maps their public `id`, `name`, and optional
description fields.

### Pattern Slot

```typescript
export type PatternSlotKind = 'procedural' | 'photo' | 'layered' | 'workspace';

export interface PatternSlot {
  readonly key: string;
  readonly displayName: string;
  readonly kind: PatternSlotKind;
  readonly pattern: Pattern;
  readonly seed: number | null;
  readonly shareable: boolean;
  readonly presets: readonly PatternPresetInfo[];
  readonly legacyNames: readonly string[];
}
```

**Decisions**:

- `key` is the stable runtime identity (`waves`, `photo`, `layered`, etc.).
- `seed: null` means no meaningful seeded state. Seed zero remains valid and is
  not overloaded as a non-shareable sentinel.
- `shareable` is explicit; it is not inferred from seed or array position.
- Presets travel with the slot, so Photo can expose 18, workspace 3, layered the
  overlay's count, and procedural patterns 6.
- `legacyNames` supports existing favorites containing constructor names.

### Pattern Build Request

```typescript
export interface PatternBuildRequest {
  config: ConfigSchema;
  theme: Theme;
  priorSeeds?: ReadonlyMap<string, number>;
  seedOverride?: ReadonlyMap<string, number>;
  photoPattern?: PhotoPattern;
  layeredOverlayKey?: string;
  workspaceModel?: WorkspaceModel;
  seedFactory?: () => number;
}
```

Seed precedence is:

1. explicit override (share-code play);
2. prior seed for rebuild;
3. newly generated seed.

### Runtime Snapshot

```typescript
export interface RuntimeSnapshot {
  readonly patternIndex: number;
  readonly patternKey: string;
  readonly patternDisplayName: string;
  readonly patternKind: PatternSlotKind;
  readonly presetId: number;
  readonly presetApplied: boolean;
  readonly presetCount: number;
  readonly themeIndex: number;
  readonly themeName: string;
  readonly themeDisplayName: string;
  readonly quality: QualityPreset;
  readonly fps: number;
  readonly seed: number | null;
  readonly shareable: boolean;
  readonly patternCount: number;
}
```

The snapshot contains values only, never mutable Pattern or Theme objects.
`getCurrentPattern()` and read-only catalog access are separate queries.

`presetApplied` distinguishes the constructor/config baseline (currently shown
as preset 1 for compatibility) from an explicit application of preset 1. This
prevents a theme rebuild from replacing config-derived state with preset-1
settings. The v1 wire format cannot encode this distinction; share-code policy
for an explicitly applied preset 1 remains deferred to REM-040/REM-041. REM-020
must not silently change v1 share semantics.

### Runtime Results and Events

```typescript
export type RuntimeErrorCode =
  | 'pattern-not-found'
  | 'preset-not-found'
  | 'theme-not-found'
  | 'presets-unsupported'
  | 'no-change';

export interface RuntimeActionResult {
  readonly success: boolean;
  readonly changed: boolean;
  readonly error?: RuntimeErrorCode;
  readonly snapshot: RuntimeSnapshot;
}

export type RuntimeChangeKind =
  'pattern' | 'preset' | 'theme' | 'quality' | 'fps' | 'reset' | 'scene';

export interface RuntimeChangeEvent {
  readonly kind: RuntimeChangeKind;
  readonly previous: RuntimeSnapshot;
  readonly current: RuntimeSnapshot;
}
```

Controller results are machine-readable and contain no user-facing prose.
CommandExecutor and main UI remain responsible for messages.

---

## Proposed RuntimeController API

```typescript
export interface RuntimeEngine {
  getPattern(): Pattern;
  setPattern(pattern: Pattern): void;
  getFps(): number;
  setFps(fps: number): void;
}

export interface RuntimeControllerOptions {
  engine: RuntimeEngine;
  themes: readonly Theme[];
  initialSlots: readonly PatternSlot[];
  initialPatternIndex: number;
  initialThemeIndex: number;
  initialPresetId?: number;
  initialPresetApplied?: boolean;
  initialQuality: QualityPreset;
  rebuildSlots: (theme: Theme, priorSeeds: ReadonlyMap<string, number>) => readonly PatternSlot[];
  beforePatternSwitch?: (from: PatternSlot, to: PatternSlot) => void;
}

export class RuntimeController {
  getSnapshot(): RuntimeSnapshot;
  getCurrentPattern(): Pattern;
  getCurrentSlot(): PatternSlot;
  getSlots(): readonly PatternSlot[];
  getThemes(): readonly Theme[];

  findPattern(query: number | string): number;
  findTheme(query: number | string): number;

  switchPattern(index: number, presetId?: number): RuntimeActionResult;
  applyPreset(presetId: number): RuntimeActionResult;
  cyclePreset(direction: 1 | -1): RuntimeActionResult;
  changeTheme(index: number): RuntimeActionResult;
  cycleTheme(): RuntimeActionResult;
  applyScene(selection: {
    patternIndex: number;
    themeIndex?: number;
    presetId?: number;
  }): RuntimeActionResult;
  setQuality(quality: QualityPreset): RuntimeActionResult;
  setFps(fps: number): RuntimeActionResult;
  resetCurrentPattern(): RuntimeActionResult;

  subscribe(listener: (event: RuntimeChangeEvent) => void): () => void;
}
```

The final signatures may be tightened during implementation, but these
responsibility boundaries are locked.

---

## State-Transition Semantics

### Pattern Switch

1. Validate target slot and optional preset metadata before mutation.
2. Capture previous snapshot.
3. Invoke `beforePatternSwitch` only when the stable key changes.
4. Call `engine.setPattern()` exactly once.
5. Set active slot and reset tracked preset to compatibility ID 1 with
   `presetApplied=false` unless an explicit valid preset was supplied.
6. Apply explicit preset after `setPattern()` because engine activation resets
   the new pattern, then set `presetApplied=true`.
7. Emit one event.

Selecting the already-active pattern without a preset is a no-op. Explicit
reset uses `resetCurrentPattern()`.

### Theme Change

1. Validate theme before mutation.
2. Capture active pattern key, preset ID/applied state, and all slot seeds.
3. Build replacement slots into a local collection using prior seeds.
4. Resolve the same active key in the replacement collection.
5. Call `engine.setPattern()` once with the replacement instance.
6. Reapply the tracked preset only when `presetApplied=true`; otherwise retain
   the replacement pattern's config-derived constructor baseline.
7. Atomically replace slots/theme/index and emit one theme event.

Theme change does not invoke a pattern transition when the stable key is
unchanged. It preserves seeds and selected preset instead of generating a new
random scene.

### Atomic Random/Favorite Scene Selection

CommandExecutor selects random indices/preset using `Math.random()`, then calls
`applyScene()` once. `applyScene()` validates the whole target, rebuilds for the
new theme if required, resolves the target by stable key after rebuild, switches
the engine once, applies the preset, and emits one event.

No intermediate "new pattern with old theme" or "new theme with stale pattern"
state is observable.

### Preset Cycling

Cycling uses slot metadata rather than hard-coded 1-6 arithmetic:

- procedural: 6 presets;
- Photo: 18 presets;
- workspace: 3 presets;
- layered: overlay preset list.

### Quality and FPS

- `setQuality()` updates quality and the corresponding 15/30/60 FPS.
- Quality changes do **not** rebuild patterns; current pattern config is not
  quality-dependent.
- Direct FPS adjustment updates FPS without changing the quality label.
- Engine remains the timing executor; controller snapshot mirrors its FPS.

---

## PatternCatalog Shape

### Procedural Definitions

The 23 construction sites currently embedded in `main.ts` move into a frozen
ordered definition registry. Share-code wire order continues to be verified
against `PROCEDURAL_PATTERN_IDS`.

```typescript
interface ProceduralPatternDefinition {
  readonly key: string;
  readonly displayName: string;
  readonly legacyNames: readonly string[];
  readonly presets: () => readonly PatternPresetInfo[];
  readonly create: (context: {
    config: ConfigSchema;
    theme: Theme;
    random: Random;
    transparentBackground?: boolean;
  }) => Pattern;
}
```

The catalog must assert at startup/test time that definition keys exactly match
`PROCEDURAL_PATTERN_IDS` in order. This keeps runtime slots and the share wire
registry aligned without maintaining two unchecked lists.

### Optional Slots

- **Photo**: reuse the already-loaded PhotoPattern; presets come from
  `PhotoPattern.getPresets()`; seed is null; not shareable.
- **Layered**: construct an independent overlay instance from its procedural
  definition. Do not reuse the standalone slot's Pattern object. Preserve the
  transparent-background override for Wave and Plasma. Presets mirror the
  overlay definition; not shareable.
- **Workspace**: create a disposable WorkspaceVizPattern over the persistent
  model; allocate/preserve a workspace-view seed; not shareable.

The independent layered overlay fixes the current sparse-overlay state sharing
where standalone and layered slots can reference the same Pattern instance.

---

## UI and Event Wiring

`main.ts` subscribes once:

```typescript
const unsubscribeRuntime = runtime.subscribe(event => {
  const state = event.current;
  statusBar.update({
    patternName: state.patternDisplayName,
    presetNumber: state.presetId,
    themeName: state.themeDisplayName,
    fps: state.fps,
  });

  if (event.kind === 'pattern' || event.kind === 'scene') {
    toastManager.info(`Pattern: ${state.patternDisplayName}`, 2000);
  }
});
```

Shuffle timer actions also pass through the controller, so this subscription
updates status even when no key handler is active.

Mouse and debug paths call `runtime.getCurrentPattern()`. Navigation and share
paths use `runtime.getSnapshot()`. They never index a local patterns array.

Cleanup unsubscribes the listener before renderer shutdown.

---

## CommandExecutor Migration

### Constructor

```typescript
constructor(runtime: RuntimeController, configLoader?: ConfigLoader)
```

Prefer a narrow `SceneRuntime` interface in `CommandExecutor.ts` so unit tests
can supply a fake without constructing AnimationEngine.

### Method Mapping

| Current method       | New dependency                                  |
| -------------------- | ----------------------------------------------- |
| `executePreset`      | `runtime.applyPreset()`                         |
| `executePattern`     | `runtime.findPattern()` + `switchPattern()`     |
| `executeTheme`       | `runtime.findTheme()` + `changeTheme()`         |
| favorite load        | `runtime.applyScene()`                          |
| favorite save        | `runtime.getSnapshot()`                         |
| list/search/catalog  | read-only slots/themes metadata                 |
| random preset        | slot preset metadata + `runtime.applyPreset()`  |
| random all/randomize | choose values, then `runtime.applyScene()`      |
| reset                | `runtime.resetCurrentPattern()`                 |
| save config          | `runtime.getSnapshot()`                         |
| shuffle              | unchanged timer, actions routed through runtime |

`updateState()` and `setThemeChangeCallback()` are deleted after migration.

### Favorite Compatibility

REM-020 reads both stable keys and legacy constructor names through slot aliases.
To keep this refactor bounded, changing the persisted favorite format and saving
the active preset remain in REM-021.

---

## Test Plan

### PatternCatalog Tests

1. Procedural keys exactly match share registry order.
2. Every slot has unique stable key and correct preset metadata.
3. Pattern/seed/metadata cannot become length-misaligned.
4. Explicit seed override reaches the requested pattern.
5. Prior seeds survive a theme rebuild.
6. Optional slot order is procedural, photo, layered, workspace.
7. Layered overlay is not the standalone pattern instance.
8. Wave/Plasma layered overlays receive transparent background behavior.
9. Photo exposes 18 presets and workspace exposes 3.
10. Non-shareable slot metadata is explicit.

### RuntimeController Unit Tests

1. Initial snapshot matches engine active pattern.
2. Pattern switch updates snapshot and engine once.
3. Same-pattern selection is a no-op.
4. Invalid target cannot partially mutate state.
5. Explicit preset is applied after engine reset.
6. Preset tracking changes only on success.
7. Config baseline and explicitly applied preset 1 remain distinguishable.
8. Dynamic preset cycling wraps for 3, 6, and 18 presets.
9. Theme rebuild preserves stable key, seed, and preset-applied state.
10. Theme rebuild swaps every slot atomically.
11. Theme builder failure leaves controller state unchanged.
12. `applyScene()` emits one event and no intermediate event.
13. Random/favorite target remains selected after theme rebuild.
14. Quality updates FPS without calling the slot builder.
15. Direct FPS update preserves quality.
16. Subscribers receive immutable before/after snapshots.
17. Unsubscribe prevents later notifications.
18. Transition hook runs only for stable-key changes.
19. Current-pattern query always matches engine pattern.
20. Seed zero remains valid and distinct from null.
21. Optional non-shareable slots can be selected but are marked correctly.

### CommandExecutor Tests

Rewrite existing tests against a fake SceneRuntime and preserve command-parser
coverage. Add assertions that:

- no engine or pattern arrays are passed to CommandExecutor;
- commands call runtime once with expected intent;
- random all calls one atomic scene operation;
- shuffle timer uses current runtime metadata on every tick;
- list/search messages use stable display metadata;
- legacy favorites resolve through aliases;
- save config uses snapshot key/theme/FPS.

### Integration Tests

1. Command pattern switch changes mouse target and direct preset target.
2. Direct switch followed by command preset acts on the same pattern.
3. Command switch followed by `n` starts from the command-selected index.
4. Theme command keeps selected pattern and preset.
5. Direct theme cycle followed by command uses rebuilt instances.
6. Random all retains selected key after its theme rebuild.
7. Shuffle events update controller/status state.
8. Shift+S snapshot key/seed equals engine active pattern.
9. Photo/layered/workspace optional slots stay aligned after theme changes.
10. Pattern input uses dynamic preset ranges rather than hard-coded six.

### Expected Test Volume

- PatternCatalog: approximately 12-18 tests.
- RuntimeController: approximately 35-45 tests.
- New runtime integration: approximately 15-20 tests.
- Existing CommandExecutor tests remain near their current 96 cases but use a
  fake runtime boundary.

---

## Implementation Slices

### Slice 1 — Pattern metadata and catalog extraction

**Status**: ✅ Complete — July 10, 2026

**Files**:

- new `src/patterns/PatternCatalog.ts`;
- shared metadata types in `src/types/index.ts` or catalog-local exports;
- new catalog tests;
- `src/main.ts` construction code replaced with catalog calls.

**Exit condition**: Existing behavior remains green; all pattern construction
and optional-slot metadata have one source of truth.

**Suggested commit**: `refactor(patterns): centralize runtime pattern catalog`

**Completion evidence**:

- Added `PatternCatalog` with the frozen 23-pattern procedural definition
  registry and self-describing `PatternSlot` output.
- Registry order is asserted against `PROCEDURAL_PATTERN_IDS` at module load and
  in tests.
- Moved all procedural config-to-constructor wiring and display/preset metadata
  out of `main.ts`.
- Added stable seed override/prior-seed precedence and explicit shareability.
- Optional photo/layered/workspace slots now come from the same builder.
- Layered overlays receive independent Pattern instances; Wave and Plasma retain
  transparent-background composition.
- `main.ts` now derives its temporary legacy arrays from slots pending the
  RuntimeController wiring slices.
- Added 10 PatternCatalog tests; targeted catalog and related photo/layer/share
  suites pass.
- Full result: 2331/2331 tests passed; build, typecheck, lint, and changed-file
  formatting checks passed.

### Slice 2 — RuntimeController in isolation

**Status**: ✅ Complete — July 10, 2026

**Files**:

- new `src/engine/RuntimeController.ts`;
- new controller unit tests;
- narrow `RuntimeEngine` and event/result types.

**Exit condition**: Controller tests cover transitions listed above; production
main may still use legacy state until Slice 3.

**Suggested commit**: `feat(engine): add authoritative runtime scene controller`

**Completion evidence**:

- Added an import-safe RuntimeController over a narrow RuntimeEngine interface.
- Added immutable runtime snapshots with pattern/preset/theme/quality/FPS/seed
  state and explicit `presetApplied` compatibility tracking.
- Added validated pattern/preset/theme lookup and dynamic 3/6/18-preset cycling.
- Theme rebuilds resolve by stable key, preserve seeds, and only reapply an
  explicitly selected preset.
- Added atomic pattern+theme+preset scene selection with one engine switch and
  one typed state event.
- Quality changes update FPS without rebuilding patterns; direct FPS changes
  preserve the quality label.
- Added listener isolation, idempotent unsubscribe, transition pre-switch hook,
  and reset events.
- Added 36 RuntimeController tests covering construction invariants, lookup,
  actions, rebuild failure safety, atomic scenes, quality/FPS, and events.
- Full result: 2367/2367 tests passed; build, typecheck, lint, and changed-file
  formatting checks passed.

### Slice 3 — CommandExecutor adapter migration

**Status**: ✅ Complete — July 10, 2026

**Files**:

- `src/engine/CommandExecutor.ts`;
- CommandExecutor unit/integration tests;
- shared fake runtime test helper.

**Exit condition**: CommandExecutor contains no engine, patterns, themes, or
current scene indices; `Math.random()` carve-out remains.

This slice and Slice 4 may need to land in one commit to keep production
construction compiling.

**Suggested commit**: `refactor(commands): delegate scene mutations to runtime controller`

**Completion evidence**:

- CommandExecutor now depends only on a narrow `SceneRuntime` plus optional
  ConfigLoader; engine, pattern/theme arrays, indices, callbacks, and
  `updateState()` were removed.
- Pattern, preset, theme, favorite, random, shuffle, reset, list/search, and save
  commands all read or mutate the shared runtime.
- Random-all/favorite loads use one atomic `applyScene()` operation.
- Constructor reflection for preset metadata was replaced by PatternSlot data.
- Existing CommandExecutor and command integration harnesses now construct a
  real RuntimeController.
- The UX-random `Math.random()` carve-out remains covered by the determinism
  suite.

### Slice 4 — main.ts wiring and direct-input migration

**Status**: ✅ Complete — July 10, 2026

**Files**:

- `src/main.ts`;
- new runtime integration tests;
- status/share/mouse/pattern-buffer wiring.

**Exit condition**: No mutable pattern/index/theme/preset/seed duplicate remains
in main; all paths read controller state.

**Suggested commit**: `refactor(main): route interactive state through runtime controller`

**Completion evidence**:

- `main.ts` constructs one RuntimeController and has no mutable pattern array,
  seed array, active pattern/theme/preset index, or duplicate quality state.
- Direct pattern navigation, dynamic preset cycling, theme/quality/FPS controls,
  pattern input, mouse dispatch, debug, status, save/share, and command execution
  all use runtime queries/actions.
- Runtime events keep status synchronized for command and shuffle timer changes.
- Transition setup is centralized in the controller's pre-switch hook.
- Theme rebuilds use PatternCatalog with prior seeds and retain optional
  photo/layered/workspace slots by stable key.
- Added integration coverage for command-to-direct navigation,
  direct-to-command preset targeting, and theme preservation of
  pattern/preset/seed.

### Slice 5 — Cleanup and full verification

**Status**: ✅ Complete — July 10, 2026

- Remove dead callbacks, maps, interfaces, and comments.
- Confirm `main.ts` no longer contains parallel scene-state arrays.
- Run full build, tests, coverage, lint, changed-file formatting, package smoke,
  and manual TTY checks.
- Update REM-020 completion evidence.

**Suggested commit**: `test(integration): lock unified runtime scene behavior`

**Completion evidence**:

- Removed stale state-sync methods, callback wiring, parallel-array comments,
  and constructor-name preset reflection.
- Restored the default interactive root action for Commander; bare `splash` no
  longer prints help and exits before runtime startup.
- Targeted runtime/catalog/command/determinism result: 200/200 tests passed.
- Full result: 2370/2370 tests passed with no open-handle warning.
- Build, typecheck, lint, changed-file Prettier checks, and `git diff --check`
  passed.
- CLI `--help` and `share` smoke checks passed.
- Pseudo-TTY startup, direct pattern/preset/theme/quality input, and clean `q`
  shutdown completed without an exception or hang.

---

## Scope Estimate

| Area                                  | Expected change                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| New production modules                | 2 (`PatternCatalog`, `RuntimeController`)                                       |
| Major modified production files       | `main.ts`, `CommandExecutor.ts`, types                                          |
| New test suites                       | 2-3                                                                             |
| Existing suites substantially updated | CommandExecutor unit + command integration                                      |
| Expected new tests                    | 60-80                                                                           |
| Complexity                            | Large, but separable into catalog/state/adapter/wiring slices                   |
| Primary risk                          | Preserving optional slots, seed identity, and command behavior during migration |

This is intentionally larger than a callback patch because it removes the
structural cause and creates the test seam needed by REM-031, REM-040, and
REM-073.

---

## Non-Goals for REM-020

The following remain separate work items:

- snapshot-based transition rendering and resize behavior (REM-031);
- relative/pause-aware animation clocks (REM-040);
- share-code semantic validation or wire changes (REM-041/REM-042);
- photo render caching or async resize handling (REM-050/REM-051);
- persisted config schema validation (REM-062);
- favorite format migration and full preset persistence (REM-021);
- CLI/terminal bootstrap extraction beyond what controller integration requires
  (REM-073).

REM-020 may expose these issues more clearly but must not absorb their full
implementation.

---

## Risks and Mitigations

### Risk — PRNG sequence changes

Moving construction can accidentally change seed allocation order.

**Mitigation**: Seed by stable key, test explicit reference seeds, and preserve
share registry order. Do not rely on array-side effects for seed identity.

### Risk — Theme rebuild resets more state than before

Rebuilding pattern instances already resets simulation. Reapplying preset can
also consume RNG differently.

**Mitigation**: Preserve current externally visible semantics first, lock seed
and preset behavior with tests, and defer true live theme continuity to a
separate enhancement if required.

### Risk — Optional slot identity drift

Photo/layered/workspace are conditionally appended.

**Mitigation**: Resolve active patterns by stable key after every rebuild, never
by old numeric index alone.

### Risk — Transition hook conflicts with REM-031

Current TransitionManager takes live patterns.

**Mitigation**: Keep a narrow optional `beforePatternSwitch` hook. REM-031 can
replace its implementation without changing controller state semantics.

### Risk — 96 CommandExecutor tests become expensive to rewrite

Tests currently assert direct engine/pattern calls.

**Mitigation**: Build one reusable fake SceneRuntime preserving observable
metadata and change assertions from direct internals to runtime intents.

### Risk — User-visible command text changes

Stable display names differ from constructor-derived names.

**Mitigation**: Snapshot expected messages before migration and intentionally
approve only clearer display-name changes.

---

## Definition of Done

REM-020 is complete when:

- RuntimeController is the only mutable owner of active pattern, preset, theme,
  quality, FPS view, slots, and seeds.
- PatternCatalog is the only source of runtime pattern construction and slot
  metadata.
- `main.ts` and CommandExecutor contain no duplicate scene indices or pattern
  arrays.
- Commands and direct shortcuts call the same controller methods.
- Theme rebuild preserves active stable key, seed, and preset and swaps slots
  atomically.
- Random/favorite scene changes emit one state event and cannot be overwritten
  by a rebuild callback.
- Mouse, debug, status, pattern input, save, favorites, shuffle, and share read
  controller state.
- Preset cycling uses slot metadata for 3/6/18-preset patterns.
- Layered overlays no longer share mutable Pattern instances with standalone
  slots.
- All existing tests plus the new catalog/controller/integration suites pass
  without open handles.
- Build, typecheck, lint, and changed-file formatting checks pass.
- Manual TTY checks cover direct commands, command mode, theme/quality changes,
  photo/layered mode when available, and clean exit.

## Version History

- **2026-07-22T05:10:54Z** Archived — REM-020 complete July 10; RuntimeController + PatternCatalog shipped in v0.6.0
