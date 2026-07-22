---
type: report
status: complete
---

# Repository Audit — July 9, 2026

**Project**: ascii-splash v0.5.0 plus workspace-viz Phase A  
**Audit date**: July 9, 2026  
**Result**: ✅ All findings resolved through M0-M8 on July 11, 2026  
**Remediation plan**: [Repository Remediation Plan](../../archived/2026-07-09-repository-remediation-plan.md)

---

## Executive Summary

The repository has a strong TypeScript foundation, broad unit coverage, clean
compilation, and generally defensive pattern rendering. No critical
first-party security vulnerability or command-injection path was found.

The current tree is not release-ready, however. The audit found five
high-priority issues:

1. Interactive commands and `main.ts` maintain separate runtime state, causing
   pattern, preset, theme, status, mouse, transition, and share-code behavior to
   diverge.
2. Configuration loading shallow-copies defaults and then mutates nested
   default objects, undermining config isolation and share-code fingerprints.
3. Share-code replay uses absolute wall-clock timestamps, so two real sessions
   do not reproduce the same initial frame sequence.
4. Static photos rerun the full preprocessing and symbol-matching pipeline on
   every frame, substantially exceeding the stated CPU target.
5. The test suite currently has eight failures caused by incorrect fake-timer
   teardown ordering.

There are also renderer dirty-tracking defects, a transition resize crash,
transition lifecycle problems, missing runtime config validation, unhandled
photo resize rejections, unsupported share-code values, a workspace focus bug,
CI coverage gaps, formatting drift, and two vulnerable runtime transitive
dependencies.

### Severity Summary

| Severity | Count | Meaning                                                            |
| -------- | ----: | ------------------------------------------------------------------ |
| Critical |     0 | No immediate remote compromise or data-loss issue found            |
| High     |     5 | Release blocker or core advertised behavior is incorrect           |
| Medium   |     9 | User-visible correctness, resilience, or engineering-control issue |
| Low      |     3 | Documentation, maintainability, or polish debt                     |

---

## Scope and Method

The audit covered:

- CLI bootstrap and runtime orchestration in `src/main.ts`
- Engine, command, event, transition, and buffer lifecycles
- Configuration loading and share-code encoding/replay
- Procedural, photo, layered, and workspace-viz patterns
- Terminal overlays, resize behavior, cleanup, and clipboard integration
- Jest configuration, unit/integration/performance tests, and coverage
- CI/release workflows and npm package contents
- Runtime dependency advisories
- Project status and architecture documentation

The audit used source inspection, repository searches, full build/test tooling,
coverage, dependency inspection, and focused runtime reproductions. Existing
uncommitted files under `docs/` and `.opencode/` were treated as user work and
were not modified during the audit.

---

## Verification Snapshot

| Check                                  | Result | Notes                                               |
| -------------------------------------- | ------ | --------------------------------------------------- |
| `npm run build`                        | Pass   | TypeScript emitted `dist/` successfully             |
| `npm run typecheck`                    | Pass   | Strict type check succeeded                         |
| `npm run lint`                         | Pass   | No ESLint errors                                    |
| `npm test -- --runInBand`              | Fail   | 8 failed, 2309 passed, 2317 total                   |
| Targeted CommandExecutor suite         | Fail   | Same 8 timer-cleanup failures                       |
| `npm run test:coverage -- --runInBand` | Fail   | Same 8 failures; coverage produced                  |
| `npm run format:check`                 | Fail   | 12 files require formatting                         |
| `npm audit --omit=dev`                 | Fail   | 1 high and 1 moderate runtime advisory              |
| `npm pack --dry-run`                   | Pass   | 269 files, 328.5 kB packed, expected whitelist only |

### Measured Coverage

| Metric     | Measured |
| ---------- | -------: |
| Statements |   86.81% |
| Branches   |   78.84% |
| Functions  |   85.15% |
| Lines      |   87.38% |

The new `src/patterns/workspace/` directory measured 0% across all metrics.

### Post-Remediation Verification — July 11, 2026

The table above preserves the audited baseline. After REM-001 through REM-073,
the release-quality ladder is green:

| Check                                  | Result | Notes                                                     |
| -------------------------------------- | ------ | --------------------------------------------------------- |
| `npm run build`                        | Pass   | TypeScript emitted `dist/`                                |
| `npm run typecheck`                    | Pass   | Strict no-emit check succeeded                            |
| `npm run lint`                         | Pass   | Updated ESLint baseline is clean                          |
| `npm test -- --runInBand`              | Pass   | 74 suites, 2514/2514 tests                                |
| `npm run test:coverage -- --runInBand` | Pass   | All global thresholds passed; `lcov.info` generated       |
| `npm run format:check`                 | Pass   | Prettier 3.9.5 baseline is clean                          |
| `npm audit`                            | Pass   | Zero vulnerabilities across the installed tree            |
| `npm audit --omit=dev`                 | Pass   | Zero runtime vulnerabilities                              |
| `npm pack --dry-run`                   | Pass   | 293 files, 348.5 kB; expected package whitelist only      |
| Interactive pseudo-TTY smoke           | Pass   | Controls, resize, exit, and terminal restoration verified |

| Coverage metric | Remediated |
| --------------- | ---------: |
| Statements      |     94.61% |
| Branches        |     87.19% |
| Functions       |     94.67% |
| Lines           |     95.24% |

Workspace-viz now measures 94.52% statements, 84.11% branches, 96.15%
functions, and 97.77% lines. `src/main.ts` remains a thin excluded executable;
its pure boundaries and child-process behavior are automated.
`TerminalRenderer.ts` remains intentionally excluded because terminal-kit
requires a real TTY and is covered by the pseudo-TTY smoke.

---

## High-Priority Findings

### AUD-001 — Runtime state splits between `main.ts` and CommandExecutor

**Severity**: High  
**Area**: Core interaction and command system  
**Remediation status**: ✅ Resolved July 10, 2026 (REM-020, REM-021)

`main.ts` owns `patterns`, `patternSeeds`, `currentPatternIndex`,
`currentPresetIndex`, and `currentThemeIndex` (`src/main.ts:707-899`).
`CommandExecutor` independently stores its own patterns array and current
indices (`src/engine/CommandExecutor.ts:29-68`).

Command-driven pattern changes call `engine.setPattern()` and update only the
executor's index (`CommandExecutor.ts:292-295`). The corresponding `main.ts`
index is unchanged. After that command:

- mouse events are sent to the pattern at the stale main index
  (`main.ts:1495-1508`);
- direct preset cycling applies to the stale pattern (`main.ts:1381-1408`);
- transitions use the wrong old pattern (`main.ts:901-914`);
- status and debug overlays identify the wrong pattern;
- Shift+S can encode the wrong pattern, preset, and seed
  (`main.ts:1452-1467`);
- `n` and `b` navigate from the stale index.

Theme and quality rebuilds make the problem worse. `main.ts` replaces its local
patterns array (`main.ts:869-875`, `932-958`), while `CommandExecutor` retains
the array passed to its constructor (`main.ts:853-866`). Later commands can
therefore reactivate old-theme instances. Random and shuffle commands first
select an executor-owned pattern and then invoke a theme callback that can
replace it using main's stale index (`CommandExecutor.ts:525-540`, `660-688`).

**Impact**: Core keyboard commands can produce a scene different from the one
reported or shared. The behavior becomes increasingly inconsistent after a
theme or quality change.

**Required direction**: Introduce one authoritative runtime controller/state
owner. Command execution and direct shortcuts must route through the same
pattern/theme/preset operations; pattern rebuilds must update that authority
atomically.

---

### AUD-002 — ConfigLoader mutates exported default configuration

**Severity**: High  
**Area**: Configuration and share-code compatibility  
**Remediation status**: ✅ Resolved July 9, 2026 (REM-010)

`ConfigLoader.load()` starts with a shallow object spread
(`src/config/ConfigLoader.ts:35`). Nested `patterns` objects still reference
`defaultConfig`. `deepMerge()` then mutates nested targets in place
(`ConfigLoader.ts:133-149`).

A focused reproduction confirmed that changing the loaded
`patterns.waves.frequency` also changed
`defaultConfig.patterns.waves.frequency`. Applying the actual `deepMerge()` to
an override of `0.777` resulted in both the loaded config and exported default
holding `0.777`.

This directly undermines share-code config fingerprints. `computeConfigHash()`
compares live config against `defaultConfig` (`src/main.ts:290-296`); after the
mutation, an override compares equal to the newly mutated default and hashes as
if it were not an override.

Tests do not reveal the defect because their expectations read the same
mutated `defaultConfig` object.

**Impact**: Config behavior depends on load order and process history. Share
codes can silently omit meaningful non-default settings and accept incompatible
local configuration.

**Required direction**: Deep-clone defaults before merging and recursively
freeze the exported default object in development/tests. Add explicit
non-mutation and fingerprint regression tests.

---

### AUD-003 — Share-code replay depends on wall-clock start time

**Severity**: High  
**Area**: v0.5.0 advertised determinism  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-040)

The pattern contract documents an absolute `Date.now()` timestamp
(`src/types/index.ts:38-54`), and `AnimationEngine` passes one
(`src/engine/AnimationEngine.ts:62-94`). Many patterns use this absolute value
for phase calculations, including Wave (`WavePattern.ts:181-236`), DNA,
Starfield, Plasma, Tunnel, scene patterns, and workspace twinkle.

The determinism suite renders two instances with identical artificial
timestamps starting at zero (`tests/unit/determinism.test.ts:92-100`). It proves
that equal seeds plus equal input times produce equal output, but it does not
model two real `splash play` sessions starting at different wall-clock times.

A focused reproduction rendered two fresh Wave instances at first timestamps
of 1000ms and 2000ms. Their first frames differed in 82 cells.

Absolute time also causes phase jumps after pause because no frames are
rendered while the wall clock continues.

**Impact**: The documented byte-for-byte replay guarantee is false across real
process starts for time-phased patterns.

**Required direction**: Define and implement a scene-relative animation clock
that excludes paused duration. Add cross-session tests that use different wall
clock origins but identical relative frame schedules.

---

### AUD-004 — Static photo pipeline reruns every frame

**Severity**: High  
**Area**: Performance  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-050)

`PhotoPattern.render()` copies the resized source, reruns edge/dither
preprocessing, and reruns half-block, braille, or symbol rendering on every
frame (`src/patterns/PhotoPattern.ts:345-393`). The source image and selected
preset are static between invalidations.

A local benchmark using symbol preset 13 at 80x24 measured **15.72ms per warm
frame**. At 30 FPS that consumes about 472ms of CPU time per second, roughly 47%
of one CPU core before terminal and engine overhead. This contradicts the
project's <5% CPU target.

Dirty-cell output avoids terminal writes after the first frame, but it does not
avoid the expensive image computation.

**Impact**: Photo symbol mode can dominate a CPU core while displaying a static
image; layered transitions can be even more expensive.

**Required direction**: Cache rendered cells keyed by resized image generation,
preset, and mode. Warm frames should only blit cached cells into the frame
buffer. Add sustained photo benchmarks, not only permissive one-shot sanity
limits.

---

### AUD-005 — Test suite is red due to fake-timer teardown order

**Severity**: High (release gate)  
**Area**: Test infrastructure  
**Remediation status**: ✅ Resolved July 9, 2026 (REM-001)

`tests/unit/engine/CommandExecutor.test.ts:136-139` calls
`jest.useRealTimers()` before `executor.cleanup()`. If shuffle is active,
cleanup calls `clearInterval()` (`src/engine/CommandExecutor.ts:841-845`) after
Jest has removed the fake timer globals in this ESM setup.

Eight shuffle tests fail with `ReferenceError: clearInterval is not defined`,
and Jest reports an open handle because timers remain active.

**Impact**: CI, prepublish, and release version hooks fail despite production
code compiling.

**Required direction**: Cleanup the executor while fake timers are still
installed, then restore real timers. Keep a regression assertion that no timer
remains pending.

---

## Medium-Priority Findings

### AUD-006 — Buffer dirty tracking misses foreground and overlay changes

**Severity**: Medium  
**Area**: Renderer correctness  
**Remediation status**: ✅ Resolved July 10, 2026 (REM-030)

Foreground comparison maps both missing foreground and explicit black to
`0,0,0` (`src/renderer/Buffer.ts:76-81`, `121-126`). A cell whose character is
unchanged but foreground changes from black to terminal default produces no
dirty cell. Background correctly uses a `-1` undefined sentinel, but foreground
does not.

Overlay composition has a second defect. `getChanges()` emits composited cells,
but `swap()` stores only the base animation buffer (`Buffer.ts:155-160`). When a
static overlay is cleared and its underlying base cell has not changed, no
change is emitted to restore that underlying cell.

Focused reproductions produced:

```text
black-to-default changes = 0
overlay first = ["O"]
overlay clear = []
```

**Impact**: Stale colors or overlay characters can remain visible indefinitely.

**Required direction**: Preserve defined/undefined foreground identity and
track the last composited terminal frame rather than only the base buffer.

---

### AUD-007 — Resize during transition can use stale buffers and crash

**Severity**: Medium  
**Area**: Transition and resize handling  
**Remediation status**: ✅ Resolved July 10, 2026 (REM-031)

`TransitionManager.render()` destructures `fromBuffer` and `toBuffer`
(`src/renderer/TransitionManager.ts:116-117`). If size changed, it replaces the
buffers on `activeTransition` (`TransitionManager.ts:122-129`) but continues to
clear, render, and blend using the stale destructured arrays
(`TransitionManager.ts:131-138`).

A focused 2x2 to 3x3 reproduction failed with:

```text
Cannot set properties of undefined (setting '2')
```

The existing transition resize test uses patterns that do not expose the stale
dimensions.

**Impact**: Resizing during the 300ms transition window can terminate the app.

**Required direction**: Prefer snapshot-based transitions; at minimum, rebind
the local buffers after resize and test patterns that write the new boundary
cell.

---

### AUD-008 — Transition lifecycle resets history and advances patterns twice

**Severity**: Medium  
**Area**: Transition correctness and performance  
**Remediation status**: ✅ Resolved July 10, 2026 (REM-031)

`main.ts` starts a transition with old and new live pattern instances
(`src/main.ts:909-914`), then `AnimationEngine.setPattern()` resets the old and
new patterns (`src/engine/AnimationEngine.ts:174-184`). During each transition
frame, the engine renders the new pattern once and `TransitionManager` renders
both old and new patterns again (`TransitionManager.ts:131-138`).

Consequences:

- the old visual state is discarded before the transition uses it;
- the target animation advances twice per display frame;
- stochastic patterns consume extra PRNG values during transition;
- expensive patterns, especially Photo/Layered, do duplicate work;
- crossfade creates a foreground color but drops `Cell.bg`
  (`TransitionManager.ts:188-199`);
- transition patterns receive full terminal height while normal patterns have
  the status row removed.

**Impact**: Transitions are not visually continuous, alter deterministic
sequences, and add avoidable CPU cost.

**Required direction**: Capture the already-rendered source frame and blend it
against the engine's current target frame. Transitions should not invoke
pattern render methods.

---

### AUD-009 — Workspace Focus preset chooses the root as focus

**Severity**: Medium  
**Area**: workspace-viz Phase A  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-060, REM-061)

Workspace focus selection compares subtree heat for every visible node
(`src/patterns/workspace/WorkspaceVizPattern.ts:250-261`). Root subtree heat is
the aggregate of the entire tree and is therefore at least as large as any
descendant. The root is visited first, so `focusPath` remains `''` in normal
cases.

The next LOD pass consequently gives focus ancestry priority only to the root,
which already receives a dominant root bonus in
`WorkspaceModel.computeVisibleTree()` (`WorkspaceModel.ts:292-316`).

**Impact**: Preset 2's promise to resolve and follow the active region is not
fulfilled.

**Required direction**: Select a non-root file or deepest hot node using own
heat or normalized subtree heat. Add a constrained-budget fixture test proving
that a hot leaf's ancestors expand.

---

### AUD-010 — Async photo resize failures become unhandled rejections

**Severity**: Medium  
**Area**: Error handling  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-051)

Render and resize hooks fire `prepareForSize()` without awaiting or catching
(`src/patterns/PhotoPattern.ts:355-358`, `396-399`). Decode errors are stored in
`loadError`, but asynchronous resize errors are not. The global unhandled
rejection handler exits the process (`src/main.ts:1590-1595`).

**Impact**: A sharp resize failure, including memory pressure or malformed raw
metadata, terminates the whole application instead of retaining the previous
photo frame and displaying an error.

**Required direction**: Centralize resize scheduling, catch every background
promise, store the error, and keep the last valid cache.

---

### AUD-011 — Config file values are not runtime-validated

**Severity**: Medium  
**Area**: Configuration resilience  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-062)

TypeScript interfaces do not validate JSON loaded at runtime. `ConfigLoader`
passes file values through without a schema, and only a subset of patterns use
the validation utilities. For example, Tunnel accepts raw ring, particle, and
speed-line counts (`src/patterns/TunnelPattern.ts:164-182`) and loops directly
over them (`TunnelPattern.ts:185-215`). Similar unbounded count paths exist in
Starfield, scene patterns, Maze cell sizing, and workspace settings.

The terminal is placed into fullscreen mode before all pattern construction is
complete (`src/main.ts:451-495`), so a constructor failure or huge allocation
can leave terminal cleanup dependent on top-level rejection behavior.

**Impact**: A typo, `NaN`-like decoded value, zero divisor, or very large count
in a user-edited config can freeze, crash, or corrupt startup.

**Required direction**: Add schema validation at the configuration boundary and
retain pattern-level clamps as defense in depth. Validate globals, all count and
interval fields, enums, characters, and workspace settings.

---

### AUD-012 — Share decoder accepts unsupported preset and theme values

**Severity**: Medium  
**Area**: Share-code input validation  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-041)

The bit layout structurally allows preset values 1-8 and theme IDs 0-7
(`src/utils/shareCode.ts:228-249`). Encoding rejects preset 7-8 but accepts all
three-bit theme IDs (`shareCode.ts:170-179`). `main.ts` validates unknown pattern
IDs but not unsupported preset or theme IDs (`src/main.ts:393-414`).

For preset 7 or 8, `main.ts` ignores `applyPreset()` failure and records the
invalid preset in UI state (`main.ts:895-899`). Pressing Shift+S can then call
the stricter encoder and throw a `RangeError`.

**Impact**: A structurally valid but unsupported code can produce misleading
state or terminate the app during resharing.

**Required direction**: Separate bit-level decode from application-level
validation and reject unsupported registry values with a typed, user-facing
error before terminal setup.

---

### AUD-013 — Coverage and critical integration paths are not enforced in CI

**Severity**: Medium  
**Area**: Test strategy and CI  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-060, REM-071, REM-073)

Jest excludes both `src/main.ts` and `TerminalRenderer.ts` from coverage
(`jest.config.mjs:43-48`). The 1599-line main bootstrap has no direct
integration harness, which allowed AUD-001 to escape otherwise extensive
CommandExecutor tests.

CI runs `npm test`, not `npm run test:coverage`, and then tries to upload
`coverage/lcov.info` (`.github/workflows/ci.yml:34-45`). That file is not
generated by the preceding command; upload failure is explicitly non-fatal.
Coverage thresholds therefore do not run in CI.

The new workspace-viz Phase A source has no test files and measured 0% coverage,
despite the repository-wide headline still claiming 92%+.

CI also omits `npm run lint` and `npm run format:check`.

**Impact**: Coverage regression, formatting drift, and main-level orchestration
defects can merge directly to `main` without a gate.

**Required direction**: Extract testable runtime orchestration from `main.ts`,
add workspace suites, run coverage/lint/format in CI, and upload the coverage
artifact generated by that same job.

**Resolution**: Workspace Phase A now has comprehensive model, layout, camera,
fixture, view, and lifecycle coverage. CI's Node 20 job runs audit, build,
typecheck, lint, format, and coverage and uploads the `lcov.info` produced by
that coverage run; Node 22 runs compatibility build/tests. Import-safe CLI and
terminal-resource boundaries, child-process smoke tests, exactly-once cleanup
tests, and a successful pseudo-TTY smoke cover the intentionally excluded
executable/TTY boundary.

---

### AUD-014 — Runtime dependency advisories are not gated

**Severity**: Medium  
**Area**: Supply chain  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-070, REM-071)

`npm audit --omit=dev` reports:

- high severity advisories in `fast-uri@3.1.0` involving path traversal and
  host confusion;
- a moderate `ajv@8.17.1` ReDoS advisory involving `$data`.

Both are in the runtime tree through `conf@15.0.2`. npm reports an available
fix. The current dependency-review workflow runs only for pull requests, while
the repository's mandatory workflow is direct-to-main. CI and release do not
run a production dependency audit.

The vulnerable URI/schema features do not appear directly exposed by
ascii-splash, reducing exploitability, but the shipped runtime tree remains
flagged.

**Impact**: Known advisories can ship unnoticed, and the configured dependency
review control is bypassed by the project's normal workflow.

**Required direction**: Update the runtime chain, verify `npm audit --omit=dev`
is clean, and add a push/scheduled audit control compatible with direct-to-main
development.

**Resolution**: `conf` is 15.1.0, with `ajv` 8.20.0 and `fast-uri` 3.1.3.
Compatible dependency maintenance also cleared the development advisories;
full and runtime-only audits now report zero vulnerabilities. CI and release
both gate on the runtime audit, real-Conf integration behavior is covered, and
Dependabot performs weekly npm and Actions checks.

---

## Low-Priority Findings

### AUD-015 — Formatting baseline is not clean

**Severity**: Low  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-072)

`npm run format:check` reports 12 files, including source, renderer tests,
engine tests, and utility tests. Lint passes, so this is style drift rather than
a correctness issue.

**Required direction**: Apply Prettier in an isolated formatting commit after
functional fixes are characterized, then enforce it in CI.

**Resolution**: The formatting baseline was normalized and rechecked after the
Prettier 3.9.5 update. `npm run format:check` passes and is a required Node 20 CI
gate.

---

### AUD-016 — Project status documentation is materially stale

**Severity**: Low  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-080)

`docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/planning/README.md` still
describe v0.3/v0.4 branches and 2197-2244 tests, while `package.json` is v0.5.0
and the current tree contains workspace-viz Phase A and 2317 tests. The claimed
92%+ coverage also differs from the measured 86.81% statement coverage.

**Required direction**: Refresh status/index documents after remediation so
they report the verified baseline rather than another transient count.

**Resolution**: Active status, testing, release, planning, and roadmap documents
now agree on v0.5.0, workspace Phase A, 2514 tests across 74 suites, and the
final coverage metrics. Stale branch/review language was removed, while the
generated `docs/docs.md` file was intentionally left untouched.

---

### AUD-017 — Several architecture components have no production callers

**Severity**: Low  
**Area**: Maintainability  
**Remediation status**: ✅ Resolved July 11, 2026 (REM-081)

`SceneGraph`, `SpriteManager`, and `ParticleSystem` are heavily tested and
documented as production architecture, but repository searches found no
production construction of those classes. EventBus production usage is limited
to engine emission, with no production subscribers. Buffer's persistent
overlay API also has no active production caller.

This is not itself a runtime bug, but it creates maintenance and coverage cost
while documentation overstates integration.

**Required direction**: After correctness work, explicitly classify these APIs
as supported library primitives, integrate them, or deprecate/remove them. Do
not combine that cleanup with the state-controller or transition refactors.

**Resolution**: All five facilities were classified as legacy experimental
abstractions for later deprecation/removal. Active documentation now reflects
the direct-rendering architecture. The separate architecture triage records
per-component evidence and requires package-surface review before removal; no
integration or deletion was mixed into this audit remediation.

---

## Areas Reviewed Without Material Findings

- Clipboard commands use fixed executable/argument arrays without a shell;
  share-code text is written to stdin, so no shell-injection path was found.
- The npm tarball whitelist behaved as intended; no source, tests, fixtures, or
  internal docs leaked in the dry-run package.
- TypeScript strict compilation and ESLint both pass.
- Half-block, braille, and symbol renderers consistently check destination
  bounds and validate source-buffer length.
- Pattern implementations contain no direct `Math.random()` calls; injected
  PRNG use is consistent with the v0.5 migration.
- All pattern classes implement `reset()`. No external I/O was found inside
  procedural pattern render methods.
- Terminal-kit 1-based coordinates are converted to 0-based for mouse input in
  `main.ts`.
- Signal and global rejection handlers attempt terminal cleanup after main has
  completed initialization.

---

## Release Recommendation

**Remediation update — July 11, 2026**: The eight original release blockers
below are complete. All high- and medium-severity findings are resolved, the
local release-quality ladder and pseudo-TTY smoke pass, and CI/release contain
the required quality and runtime-audit gates. AUD-016 and AUD-017 were
subsequently resolved by the M8 documentation refresh and architecture triage.

**Original July 9 recommendation (historical baseline)**:

Do not publish another release from this baseline. At minimum, complete the
following before release:

1. Restore a green test suite.
2. Fix config default mutation and add regression coverage.
3. Unify runtime state used by direct shortcuts and CommandExecutor.
4. Fix buffer dirty tracking and transition resize/lifecycle behavior.
5. Define and enforce the real cross-session share-code clock contract.
6. Cache static photo rendering and verify sustained CPU cost.
7. Add workspace-viz Phase A tests.
8. Clear runtime dependency advisories and enable CI quality gates.

The linked remediation plan converts these requirements into ordered work
items with dependencies, target files, tests, and acceptance criteria.
