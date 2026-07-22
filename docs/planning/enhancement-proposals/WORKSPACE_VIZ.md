# Workspace Visualization — `splash watch`

**Created**: July 2, 2026
**Updated**: July 11, 2026 (Phase A implementation and automated coverage complete)
**Status**: **In progress — Phase A visual gate**. The model, radial layout,
camera, static view, fixture parser, CLI fixture mode, and comprehensive
unit/lifecycle suites are complete. The remaining Phase A decision is the 80×24
beauty pass (the kill/pivot gate); Phase B live filesystem work has not started.

---

## Overview

`splash watch [path]` renders a live, ambient visualization of a working
directory _as it is being coded_. Files are nodes in an animated scene; edits,
creations, deletions, commits, branch switches, and test runs become visual
events — pulses, particle bursts, fireworks, weather. Human and AI-agent
actors appear as glyphs that fly to the files they touch.

Think **Gource, but live, in the terminal, and agent-aware**.

### Why now

- **The agentic-coding moment.** People sit next to coding agents that touch
  dozens of files in minutes, and there is no good way to _watch_ it happen.
  A split pane — agent on the left, `splash watch` on the right — is the
  screenshot that markets this feature and the whole project.
- **Gource proved the demand** (the most-shared dev visualization ever made)
  but it is OpenGL, offline, and commit-history-driven. A live terminal
  equivalent does not exist.
- **Splash already has the right core boundaries.** The `Pattern`/`Cell[][]`
  render contract, `TransitionManager`, persistent workspace model, and v0.5.0
  injected `Random` support deterministic views and replay. The removed
  SceneGraph/SpriteManager/ParticleSystem/EventBus experiments were never
  production foundations for this feature.

### Non-goals

- Not a file manager, code navigator, or diff viewer. No filenames-as-UI
  beyond ambient labels. It is judged as _art that happens to be true_, not
  as a tool.
- Not a git history renderer in v1 (though the event-log design makes a
  `git log`-fed history mode a cheap follow-up — see [Future Work](#future-work)).
- No network calls, no telemetry. Everything is local.

---

## Prior Art

| Project                                               | What it does                                | What we take                                           |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| [Gource](https://github.com/acaudwell/Gource)         | OpenGL animated radial tree of repo history | Radial layout, author avatars, camera-follows-activity |
| [code_swarm](https://github.com/rictic/code_swarm)    | Organic history visualization               | File "heat" decay, activity clustering                 |
| [Logstalgia](https://github.com/acaudwell/Logstalgia) | Log events as pong game                     | Event-stream-as-animation framing                      |
| asciiquarium (local ref)                              | Entity/callback animation model             | Actor entities with movement callbacks                 |
| ttysvr (local ref)                                    | Idle-activated terminal screensaver         | Pairs with `--init` idle activation                    |

---

## Architecture

### The prime directive: the pattern stays pure

CLAUDE.md's "No External Side Effects" rule (patterns do no file I/O, no
subprocess spawning) is **preserved, not amended**. All I/O lives in
engine-level _services_ owned by `main.ts`. The pattern consumes a plain
event stream and renders. This buys three things:

1. **Determinism / replay** — the pattern is a pure function of
   (event stream, seed, time). Record the stream, replay the session.
   This rides directly on v0.5.0's injected-`Random` work.
2. **Testability** — tests feed synthetic event fixtures; no real
   filesystem, no timing flakiness. Same strategy as the current test suite.
3. **The git-history mode for free** — anything that can produce the event
   schema (a `git log` converter, a CI webhook bridge) drives the same
   renderer.

### Lifecycle: persistent model, disposable views

Three engine facts (verified against `main.ts` / `AnimationEngine.ts`) shape
this design — a naive "stateful pattern" would break on all three:

1. `buildPatterns()` reconstructs **every pattern instance** on theme or
   quality change (four call sites in `main.ts`).
2. `AnimationEngine.setPattern()` calls `reset()` on both the outgoing and
   incoming pattern — switching away and back must not lose the session.
3. `Pattern.render()` receives engine time; the pattern must never read
   `Date.now()` (same rule that banned `Math.random()` in patterns in v0.5.0).

Therefore **all session state — tree, heat, camera, actors, attribution
windows — lives in a `WorkspaceModel`** created once by the watch bootstrap
in `main.ts` and owned there, alongside the services.
`WorkspaceVizPattern` is a **disposable view** over that model:

- Constructed with `(model, theme, random)`. `buildPatterns()` rebuilds it
  freely — a theme change makes a fresh view over the same model, following
  the exact `photoPattern` re-attach precedent (`main.ts:620`;
  `seeds.push(0)` — the slot is not share-code encodable).
- `reset()` clears only view transients (particles, easing offsets) — never
  the model. Cycling `n`/`b` away and back resumes the live scene intact.
- The model absorbs events as they arrive regardless of which pattern is on
  screen, and heat decay is computed **lazily from event timestamps** at
  read time — no per-frame ticking, no dependence on being rendered.
- The slot is appended exactly like the photo slot: absent in plain
  `splash` (zero cost, no watcher code loaded), present and initially
  active in `splash watch`.

### Component map

```
                          main.ts (owns all I/O)
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ WorkspaceWatcher │  │    GitMonitor    │  │    AgentFeed     │
  │  (chokidar +     │  │ (.git watching + │  │  (JSONL file     │
  │   ignore rules)  │  │  debounced git)  │  │   tail)          │
  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
           │  normalize, coalesce, rate-limit          │
           └───────────────┬─────────────┬─────────────┘
                           ▼             ▼
                    ┌────────────┐  ┌───────────┐
                    │ EventSink  │  │ EventLog  │ (JSONL, for replay)
                    └─────┬──────┘  └───────────┘
                          ▼
              ┌───────────────────────┐
              │    WorkspaceModel     │  (persistent, owned by main.ts:
              │  tree · heat · camera │   survives theme rebuilds and
              │  actors · attribution │   pattern switches)
              └──────────┬────────────┘
                         ▼ read-only view
              ┌───────────────────────┐
              │  WorkspaceVizPattern  │  (pure, disposable view: no I/O)
              │  ├─ RadialLayout      │
              │  ├─ ActorManager      │
              │  └─ direct Cell render│
              └───────────────────────┘
```

### Event schema

One schema for all sources. Phase B should feed a small workspace-specific
`WorkspaceEventSink` owned by the watch bootstrap and append the same events as
JSON Lines to the session log. It should not introduce a global event bus
without a measured fan-out requirement.

```typescript
interface WorkspaceEvent {
  t: number; // ms since session start (monotonic)
  kind:
    | 'file:add'
    | 'file:change'
    | 'file:unlink'
    | 'file:rename'
    | 'dir:add'
    | 'dir:unlink'
    | 'git:commit'
    | 'git:branch'
    | 'git:stage'
    | 'git:unstage'
    | 'run:start'
    | 'run:pass'
    | 'run:fail' // test/build runs (producer lands Phase F)
    | 'actor:touch' // agent/human attribution
    | 'session:resize'; // terminal size change (replay fidelity)
  path?: string; // repo-relative, POSIX separators
  actor?: string; // 'human' | 'claude' | 'claude:2' | ...
  meta?: {
    ext?: string; // '.ts' — precomputed for color mapping
    bytes?: number; // file size after event
    bytesDelta?: number; // size change vs cached stat — sizes save bursts (no subprocess)
    lines?: number; // lines changed — COMMITS ONLY, from git diff-tree --numstat
    from?: string; // previous path, for file:rename
    branch?: string; // for git:branch (7-char short SHA when HEAD is detached)
    message?: string; // first line, for git:commit
    files?: number; // files in commit, for git:commit
    cols?: number; // for session:resize
    rows?: number; // for session:resize
  };
}
```

Design notes:

- `t` is relative to session start, not wall-clock — replay doesn't care
  what day it was, and it keeps `Date.now()` out of the pattern.
- `actor:touch` is _attribution_, decoupled from the FS event. The watcher
  says "src/foo.ts changed"; the AgentFeed says "claude touched src/foo.ts".
  The pattern correlates by path within a short window (default 2 s). Missing
  attribution degrades gracefully to an anonymous pulse — the feature works
  with zero agent integration.

### WorkspaceWatcher

- **Library**: `chokidar` v4 (pure JS — keeps splash's no-native-deps
  posture aside from `sharp`; fine for repos under ~100k files). Lazy-loaded
  only when `splash watch` runs, same as `sharp` for `--photo`.
  `@parcel/watcher` is the upgrade path if profiling ever demands it
  (half-day spike budgeted in Phase B to confirm the choice).
- **Ignore rules**: `.gitignore` + `.git/**` internals + a built-in denylist
  (`node_modules`, `dist`, `coverage`, `.DS_Store`, editor swap/temp files,
  lockfile churn). User-extensible via config
  (`patterns.workspaceViz.ignore`).
- **Normalization** (the fiddly, load-bearing part):
  - _Atomic saves_ (editor writes `foo.ts.tmp` → renames over `foo.ts`)
    arrive as unlink+add or rename on the **same final path** — normalize to
    a single `file:change`.
  - _Real renames_ (`git mv`, editor rename): an unlink+add pair across
    **different paths** within 100 ms whose basename or (size, mtime) match
    is emitted as one `file:rename` with `meta.from` — the node glides to
    its new home keeping heat and identity. Unpaired falls back to
    unlink + add (crumble + grow).
  - _Burst sizing_: the watcher caches last-known size per file (seeded by
    the startup scan) so every `file:change` carries `bytesDelta` with zero
    subprocesses. Line-level deltas (`meta.lines`) exist only on commit
    events, where one numstat call covers the whole commit.
  - _Coalescing_: multiple raw events on one path within a 50 ms window
    collapse to one event.
  - _Rate limiting_: global cap (default 60 events/s) with overflow
    summarized as a single synthetic "storm" event rather than dropped
    silently — a 3 000-file `git checkout` should look like a dramatic
    weather front, not freeze the renderer.
- **Startup scan**: one initial tree walk to build the model (capped depth /
  file count, see LOD). Emits no events; the scene fades in via
  TransitionManager.

### GitMonitor

- **Startup resolution**: one `git rev-parse --git-dir --show-toplevel`
  call resolves the real layout. This handles **worktrees and submodules**
  (where `.git` is a pointer _file_, not a directory — naively watching
  `.git/HEAD` would silently no-op in exactly the parallel-agent worktree
  setup this feature is marketed for) and **watching a subdirectory** of a
  repo (git root found above the watch path; git events filtered to the
  watched subtree).
- Watches the resolved `<gitdir>/HEAD` (branch switch, commit via ref
  change) and `<gitdir>/index` mtime (stage/unstage) — no polling loop in
  the common case. Detached HEAD displays as a 7-char short SHA.
- **Checkout coalescing**: a HEAD change opens a ~2 s window (extended
  while events keep arriving) during which per-file visuals and index-churn
  events are suppressed — the model silently absorbs membership and size
  changes, but the only thing on screen is the branch transition. Without
  this, a checkout fires a branch transition, a stage/unstage flurry, and a
  3 000-file storm simultaneously.
- On commit detection, one `git diff-tree --numstat` subprocess resolves the
  file list + line deltas for the commit firework. Subprocesses are
  debounced and never run more than 1/s.
- Degrades to FS-only mode outside a git repo (everything still works;
  commits/branches just never fire).

### AgentFeed

- v1 transport: an **append-only JSONL file** at
  `$XDG_STATE_HOME/splash/agent-events.jsonl`, tailed by the same watcher
  infrastructure; accepts `actor:touch` events. (Unix socket deferred — see
  [Scoping](#descoped-from-v1-explicit); file-tail latency is more than
  adequate at human/agent timescales.)
- **Multi-session scoping**: feed entries carry **absolute paths**. Each
  watch session filters to paths under its own root and relativizes — so
  concurrent sessions in different repos share one feed with no cross-talk,
  and `splash-notify` never needs to know which sessions exist or where
  they're rooted.
- **Hygiene**: file created mode `0600`; sessions tail from their start
  offset (no re-reading history). `splash-notify` rotates the feed (rename
  to `.1`) past 4 MB; tailers detect the rename and reopen. Packaging: this
  is a second `bin` entry in `package.json` alongside `splash`.
- **Claude Code integration** is one PostToolUse hook the user adds:

  ```json
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Edit|Write|NotebookEdit",
          "hooks": [
            {
              "type": "command",
              "command": "splash-notify --actor claude --file \"$CLAUDE_FILE_PATH\""
            }
          ]
        }
      ]
    }
  }
  ```

  `splash-notify` is a tiny bundled CLI (append one JSON line to the feed
  file and exit) so the hook adds no measurable latency.

- Multiple agents get distinct actor IDs → distinct firefly colors.

---

## The Pattern

`WorkspaceVizPattern` implements the standard `Pattern` interface (render /
reset / presets / metrics) and composes existing engine pieces:

### WorkspaceModel + level-of-detail

The hard design problem: a 5 000-file repo does not fit in 80×24.

- Every node carries **heat**: bumped by events, exponential decay
  (half-life ≈ 30 s, configurable). Heat drives glow, size, and LOD.
- **LOD rule**: a directory renders _expanded_ (children visible) only if
  its subtree heat exceeds a threshold or it is within N hops of the camera
  focus; otherwise it renders _collapsed_ as a single node sized by subtree
  file count. Budget-driven: expand hottest-first until the visible-node
  budget (default `min(150, cells/12)`) is spent.
- Cold repos settle into a calm top-level constellation of a dozen directory
  nodes — the "sleeping garden" idle state. Activity blooms detail exactly
  where it is happening.

### RadialLayout + Camera

- Gource-style radial tree: root at center, directories as angular sectors
  sized by subtree weight (log-scaled file count), files as leaves. Angular
  sectors are stable across relayouts (children keep their order) so nodes
  don't teleport when siblings appear.
- Nodes ease toward layout targets (spring or exponential smoothing) —
  relayout is a glide, not a jump.
- **Camera** = pan/zoom transform over the layout. Follows the heat
  centroid with heavy damping; slow auto-drift when idle. Mouse click
  focuses a region (`onMouseClick` is already in the Pattern interface);
  mouse move gently repels fireflies (ambient playfulness, matches existing
  patterns' mouse behavior).
- Edges drawn cell-quantized in v1. When the braille/pixel canvas from the
  "one pixel pipeline" bet lands, edges and node glyphs upgrade to
  sub-cell resolution with zero model changes — the layout is already in
  continuous coordinates.

### Event → visual vocabulary

| Event                       | Visual                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `file:change`               | Pulse at node + particle burst sized by `meta.bytesDelta` (log-scaled), colored by extension; heat bump                                        |
| `file:add`                  | Node grows in from parent with a spark trail                                                                                                   |
| `file:unlink`               | Node desaturates, crumbles into falling particles, fades                                                                                       |
| `file:rename`               | Node glides to its new home, keeping heat and identity                                                                                         |
| `git:stage`                 | Node ring brightens (staged = charged)                                                                                                         |
| `git:commit`                | Firework sweep over all staged nodes (cannibalize FireworksPattern's multi-stage bursts); commit message as a transient toast via ToastManager |
| `git:branch`                | Full-scene transition (TransitionManager) + branch name toast; concurrent file storm suppressed (checkout coalescing)                          |
| `run:start` _(Phase F)_     | Rain layer fades in over the scene                                                                                                             |
| `run:fail` _(Phase F)_      | Lightning strike (LightningPattern bolt) at the epicenter of recent heat                                                                       |
| `run:pass` _(Phase F)_      | Rain clears, brief golden glow                                                                                                                 |
| `actor:touch`               | Firefly glyph flies from its perch to the node, leaving a fading trail                                                                         |
| storm (rate-limit overflow) | Screen-wide weather front instead of per-file effects                                                                                          |

_(`run:_` rows ship with Phase F's producer — the vocabulary is reserved in
the schema from day one but inert in the MVP.)\*

Extension→color mapping ships with sensible defaults (per-language hues) and
is theme-aware: the theme provides the palette, the extension picks the
position in it, so `splash watch` looks right in all 5 themes.

### Actors

- Firefly entities managed by a workspace-specific `ActorManager`: position,
  target node, easing flight, and a bounded local trail representation.
- Idle actors orbit their last-touched region; long-idle actors dim and
  perch. Actor label (single glyph + color) is stable per actor ID.

### Presets (6, per house convention)

Numbered so v1's three are **contiguous IDs 1–3** — `.`/`,` cycling never
lands on a hole; Phase F appends 4–6:

1. **radial** — the Gource homage (default)
2. **focus** — camera hard-locked to activity, aggressive LOD; for the agent-watching split pane
3. **minimal-mono** — no particles, monochrome, low CPU; for battery/SSH
4. **radial-dense** _(Phase F)_ — higher node budget, smaller glyphs, for big terminals
5. **garden** _(Phase F)_ — beds/plants skin: dirs as beds, files as plants that bloom on edit, wilt when cold
6. **constellation** _(Phase F)_ — files as stars, edits as twinkles, actors as shooting stars; lowest legibility, maximum ambience

### Watch-mode semantics

- **Pause (`SPACE`)** freezes rendering only. Services keep running and the
  model keeps absorbing events (they're timestamped; decay is lazy), so
  resume shows the true current state. Transient effects for events older
  than ~2 s are skipped on resume — no backlog of stale bursts replaying.
  `--record` keeps logging through a pause (the log records reality).
- **Resize** relayouts (the node budget is size-derived) and appends a
  `session:resize` event to the record log so replay can account for it.
- **Pattern cycling** (`n`/`b`/number keys) away and back is allowed and
  lossless — see [Lifecycle](#lifecycle-persistent-model-disposable-views).
- **Debug overlay (`d`)**: the services expose `getMetrics()`; the watch
  bootstrap merges them into the overlay alongside `pattern.getMetrics()`
  (events/s, dropped, node count, save→pulse latency). The pure pattern
  can't see the services, so this plumbing lives in `main.ts`.

---

## CLI & Config

```bash
splash watch                    # visualize cwd
splash watch ~/proj/foo         # explicit path
splash watch --preset garden
splash watch --record session.jsonl    # also log events for replay
splash replay session.jsonl --speed 30x
splash replay session.jsonl --speed 30x --export out.cast   # once asciinema export lands
splash-notify --actor claude --file src/foo.ts              # agent hook helper
```

Config (`~/.splashrc.json`) — JSON-persistable, so per house convention it
lives in `src/types/index.ts` and wires into `ConfigSchema.patterns`:

```jsonc
{
  "patterns": {
    "workspaceViz": {
      "heatHalfLifeMs": 30000,
      "nodeBudget": 150,
      "eventRateCap": 60,
      "attributionWindowMs": 2000,
      "showLabels": "hot", // "none" | "hot" | "all"
      "extColors": { ".ts": "auto" },
      "ignore": ["*.log"],
    },
  },
}
```

Note: the _watch path_ is runtime-only (CLI arg), never persisted — same
reasoning as `PhotoPatternConfig.source`.

In-app keys follow existing conventions: `.`/`,` cycle presets (contiguous
IDs — see Presets), `t` cycles themes, `SPACE` pauses, `d` toggles the debug
overlay (see [Watch-mode semantics](#watch-mode-semantics) for how service
metrics reach it).

---

## Replay & Determinism

- `--record` writes the raw normalized event stream (JSONL, one
  `WorkspaceEvent` per line). The **header line records**: schema version,
  splash version, seed, initial terminal size, and a hash of the watch-root
  path (not the path itself).
- **One virtual clock rules everything.** Replay drives event delivery
  _and_ the pattern's `render(time)` argument from a single virtual clock
  advanced at `speed ×` real rate. Heat decay (computed from event
  timestamps) and event timing therefore read the same clock and can never
  drift apart; `--speed 30x` scales the whole world uniformly. This only
  works because `Date.now()` is banned in the pattern (see
  [Lifecycle](#lifecycle-persistent-model-disposable-views)) — the naive
  alternative (events at log-time, decay at wall-time) silently breaks
  determinism.
- **Determinism contract**: same log + same seed **at the recorded terminal
  size** ⇒ byte-identical frames, canary-tested like the share-code suite.
  Replay at a different size is supported but best-effort visually, not
  byte-stable. `session:resize` events in the log replay as relayouts.
- **Privacy note**: record logs and the agent feed contain repo-relative
  paths, branch names, and commit first-lines — inherent to what they are.
  User docs must say so plainly before any "share your replay" messaging,
  and both files are created mode `0600`.
- Replay + the planned asciinema/GIF export = the shareable artifact:
  _"my agent's afternoon, in 30 seconds."_ Export stays out of scope here;
  replay is designed so export can consume it unchanged.

---

## Performance Budget

Same targets as the rest of splash: **< 5 % CPU, ~40–50 MB RAM**, plus a
**latency target: save → visible pulse ≤ 150 ms p95** (surfaced in the
debug overlay so it's measurable, not aspirational).

- chokidar delivers raw events; the normalizer coalesces before anything
  touches the render path.
- Layout is incremental: only subtrees whose LOD state or membership changed
  relayout; a full relayout is O(visible nodes), not O(repo).
- Effect caps enforced by workspace-owned bounded arrays with explicit limits.
- Hard caps: 100 k indexed files (beyond that, deepest directories collapse
  permanently and a one-time toast says so — no silent truncation),
  60 events/s rendered.
- Idle cost ≈ any other scene pattern; the watcher itself is
  event-driven (no polling) so an idle repo costs ~0 extra.

---

## Phased Plan

Each phase ships green tests and is independently demoable.

### Phase A — Model + static render (foundation)

WorkspaceModel (persistent, pattern-external), RadialLayout, LOD, Camera,
`WorkspaceVizPattern` as a disposable view rendering a static tree from a
synthetic snapshot. No I/O at all — pure model + fixtures. This is where
the layout/LOD design risk gets retired.
_Demo: `splash watch --fixture tests/fixtures/tree-medium.json` renders a
pretty tree of a fake repo._

### Phase B — Live filesystem events

WorkspaceWatcher service on chokidar (half-day spike confirms the choice vs
`@parcel/watcher`), normalization pipeline, ignore rules,
`EngineEvent.WORKSPACE`, heat + pulse/burst/grow/crumble visuals,
rate-limit storm.
_Demo: edit files in a repo, watch it ripple._

### Phase C — Git awareness

GitMonitor, stage/commit/branch events, commit fireworks, branch
transitions, delta sizing via `--numstat`.
_Demo: a commit sets off fireworks._

### Phase D — Actors + agent hooks

AgentFeed (JSONL tail + rotation), `splash-notify` (second `bin` entry),
ActorManager fireflies, attribution correlation, documented Claude Code
hook recipe in README.
_Demo: the split-pane screenshot — Claude coding on the left, its firefly
darting around the repo on the right._

### Phase E — Record & replay

`--record`, `splash replay --speed`, determinism canaries (fixed log + seed
⇒ frame-hash match), session log rotation.
_Demo: a day of work replayed in 30 seconds._

### Phase F — Skins + polish

Garden and constellation presets, weather (test-run) events, idle "sleeping"
state tuning, docs, README GIFs (via the VISUAL_MEDIA.md pipeline).

Suggested release shape: **A–B–C as the headline of one release** (`splash
watch` is real and delightful), D–E–F as the fast-follow.

---

## Scoping

### Calibration baseline (what comparable work cost in this codebase)

| Existing component                               | LOC          | Notes                                   |
| ------------------------------------------------ | ------------ | --------------------------------------- |
| Scene patterns (Aquarium / NightSky / Fireworks) | 578–704 each | Closest analog to `WorkspaceVizPattern` |
| WorkspaceModel / RadialLayout / Camera           | 70–450 each  | Closest analog to Phase A services      |
| PhotoPattern + HalfBlockRenderer (v0.4 Phase 1)  | ~720         | Landed in ~1 week, +43 tests            |
| BrailleRenderer + dither + edges (v0.4 Phase 2)  | ~500+        | ~1 week, +57 tests                      |
| shareCode + clipboard + CLI wiring (v0.5 7d–7e)  | ~450         | +CLI subcommands in `main.ts`           |
| determinism.test.ts (v0.5 7f)                    | 234          | Template for the replay canaries        |

v0.4 phases averaged **~1 week and +20–60 tests each**. Estimates below use
that yardstick. `main.ts` is already 1,509 lines; service wiring should go in
a new `src/services/` directory rather than inline (small structural cost,
counted in Phase B).

### Per-phase estimates

| Phase                       | New source                                                                                                                                                                                   | Est. LOC   | Est. tests | Time          | Risk                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------------- | ------------------------------------------- |
| **A** Model + static render | `WorkspaceModel.ts` (~280, persistent — owned outside the pattern), `RadialLayout.ts` (~200), `Camera.ts` (~100), `WorkspaceVizPattern.ts` (~420, disposable view), fixtures + loader (~100) | **~1,100** | ~55        | **1.5–2 wks** | High (design risk lives here, deliberately) |
| **B** Live FS events        | normalizer incl. rename pairing (~230, pure), `WorkspaceWatcher.ts` (~150), `services/` scaffolding + `watch` subcommand + model/slot wiring (~170), event visuals in pattern (~200)         | **~750**   | ~55        | **1–1.5 wks** | Medium (watcher edge cases)                 |
| **C** Git awareness         | `GitMonitor.ts` incl. rev-parse layout resolution + checkout coalescing (~220), commit/branch/stage visuals (~150, reuses Fireworks burst logic + TransitionManager)                         | **~370**   | ~28        | **1 wk**      | Low                                         |
| **D** Actors + agent feed   | `AgentFeed.ts` incl. rotation + prefix filtering (~140), `splash-notify` bin + package.json `bin` entry (~40), `ActorManager.ts` (~200), attribution (~50)                                   | **~430**   | ~30        | **1 wk**      | Low–medium                                  |
| **E** Record & replay       | EventLog writer/reader + replay driver + `replay` subcommand (~220), determinism canaries (test-side)                                                                                        | **~220**   | ~20        | **0.5–1 wk**  | Low (architecture front-loads this)         |
| **F** Skins + polish        | garden + constellation skins (~350), weather/`run:*` visuals (~100), mouse interaction, docs, GIFs                                                                                           | **~450**   | ~20        | **1 wk**      | Low                                         |
| **Total**                   |                                                                                                                                                                                              | **~3,300** | **~210**   | **6–7.5 wks** |                                             |

For scale: comparable to v0.4 Phases 1–4 combined (~5 weeks, +147 tests).
This is a **major-version-sized feature**, not a point release.

### MVP cut line

**A + B + C ≈ 4–5 weeks, ~130 tests** ships a real, delightful
`splash watch`: live tree, edit ripples, commit fireworks, branch
transitions. That is the headline release. D–F are each independently
shippable fast-follows in priority order (D is the marketing moment,
E is the shareable artifact, F is breadth).

### Descoped from v1 (explicit)

- **AgentFeed transport**: v1 is an **append-only JSONL file** tailed by the
  existing watcher infrastructure — no unix socket. `splash-notify` just
  appends one line. Kills the cross-platform socket risk in Phase D for
  free; socket transport becomes a future upgrade if file-tail latency ever
  matters (it won't at human/agent timescales).
- **Presets**: v1 ships IDs 1–3 (radial, focus, minimal-mono — contiguous,
  so `.`/`,` cycling has no holes); Phase F appends 4–6 (radial-dense,
  garden, constellation) to complete the house-standard 6.
- **Mouse interaction** (click-to-focus, firefly repel): Phase F.
- **`showLabels: "all"`**: v1 is `"none" | "hot"` only.
- **`run:*` events have no producer until Phase F** — nothing in A–E detects
  test runs. Phase F adds the producer (`splash-notify --event run:fail`
  documented for CI/test hooks); until then the weather vocabulary is
  reserved but dormant.
- **Windows**: best-effort. Watcher + git work; the JSONL agent feed works;
  document as untested tier-2 (consistent with the project's terminal
  support posture).

### Decisions to lock before Phase A starts

1. **Watcher library** — recommendation: **chokidar v4** (pure JS, zero
   native-dep install pain, fine for repos under ~100k files), not
   `@parcel/watcher`. Splash is currently pure-JS + `sharp`; a second native
   dep for a marginal perf win at this scale is the wrong trade. Revisit
   only if profiling demands it. Timebox: half-day spike in Phase B, not A.
2. **Gitignore parsing** — use the `ignore` npm package (zero deps,
   battle-tested, exact git semantics). Do not hand-roll.
3. **Fixture format** — the Phase A `--fixture` flag is permanent test/demo
   infrastructure, not scaffolding to delete; schema-version it from day one.
4. **Where LOC lands** — new top-level dirs: `src/services/` (watcher, git,
   agent feed, event log) and `src/patterns/workspace/` (model, layout,
   camera, actors) to keep the pattern file itself near the ~500-LOC house
   norm.

---

## Testing Strategy

- **No real FS in unit tests.** Watcher normalization is tested by feeding
  raw synthetic watcher events into the normalizer (pure function) and
  asserting the emitted `WorkspaceEvent` stream — covers atomic saves,
  coalescing, rate limiting, ignore rules.
- **Pattern tests** use fixture event streams + injected `Random` + fake
  clock, asserting buffer contents — identical methodology to existing
  pattern tests. Lifecycle tests explicitly cover: theme rebuild preserves
  the model; `reset()` clears view transients only; pause + resume skips
  stale transients.
- **Normalizer edge cases get their own suite**: atomic saves, rename
  pairing (paired and unpaired), coalescing, checkout-coalescing windows,
  rate-limit storms.
- **Layout property tests**: node budget never exceeded; sibling order
  stable across insertions; every hot node visible; no NaN positions after
  pathological trees (depth 50, single-child chains, 10 k siblings).
- **Determinism canaries** (Phase E): fixed log ⇒ byte-for-byte frame
  hashes, same as the v0.5.0 share-code suite.
- **One integration smoke test** (opt-in, not in the default `npm test`
  run): real temp dir, real watcher, touch files, assert events arrive —
  and it runs inside a **git worktree**, so the `.git`-as-file layout is
  exercised on every run. Guards against watcher platform regressions.

---

## Risks & Mitigations

| Risk                                                                                                | Mitigation                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout/LOD looks bad in small terminals — the make-or-break risk                                    | Phase A is _only_ this, on fixtures, before any I/O is written; kill/pivot cheaply if the radial tree can't be made beautiful at 80×24                              |
| Watcher edge cases (atomic saves, renames, case-insensitive FS, symlinks, network drives)           | Normalizer is a pure, heavily-tested function with a dedicated edge-case suite; symlinks not followed in v1; known-weird FS documented as unsupported               |
| Git layouts where `.git` is a file (worktrees, submodules) or the watch path is a repo subdirectory | Resolved once at startup via `git rev-parse --git-dir --show-toplevel`; the integration smoke test runs inside a worktree                                           |
| Replay clock drift (events vs decay reading different clocks)                                       | Single virtual clock drives both event delivery and `render(time)`; `Date.now()` banned in the pattern; byte-hash canaries pin it                                   |
| Watcher perf on very large repos (chokidar is pure JS)                                              | 100k-file hard cap + built-in denylist keep watch sets sane; `@parcel/watcher` is a drop-in upgrade behind the `WorkspaceWatcher` interface if profiling demands it |
| Event floods (checkout, branch switch, `npm install` in a non-ignored dir)                          | Rate cap + storm visual; built-in denylist; coalescing window                                                                                                       |
| "Is it a tool or art?" identity drift (feature requests for filenames, diffs, click-to-open)        | Non-goals section is the contract: ambient first; `showLabels: "hot"` is the only concession                                                                        |
| Hook friction — nobody configures the agent hook                                                    | Feature is fully functional without attribution (anonymous pulses); hooks are a documented enhancement, not a requirement                                           |

---

## Success Criteria

(house style per v0.4.0-ROADMAP §Success Criteria — done when all are true)

- [ ] `splash watch` on this repo is beautiful at 80×24 and stays legible at
      200×60 — subjective gate, signed off on real terminals (iTerm2,
      Kitty, Terminal.app)
- [ ] CPU < 5 % during an active agent coding burst; RAM within the
      existing 40–50 MB envelope
- [ ] Save → visible pulse ≤ 150 ms p95 (readable in the debug overlay)
- [ ] Theme cycling (`t`), quality changes, and pattern cycling (`n`/`b`)
      never lose session state
- [ ] Works in a git worktree, a submodule, and a watched subdirectory of a
      larger repo
- [ ] A 3 000-file `git checkout` renders as one branch transition — not a
      simultaneous transition + stage flurry + file storm
- [ ] Replay canary: fixed log + seed at recorded size ⇒ byte-identical
      frame hashes
- [x] Zero regression: all 2514 tests at the Phase A remediation checkpoint
      stay
      green
- [ ] Zero cost when unused: plain `splash` loads no watcher code and shows
      no extra pattern slot

---

## Open Questions

1. **Pin or cycle?** Watch mode currently allows full pattern cycling
   (lossless, per the lifecycle design). Should v1 instead pin the
   workspace pattern and let keys cycle only presets/themes? Pinning is a
   one-line simplification if cycling confuses in practice.
2. **Skin art direction** — garden and constellation need visual
   prototyping in Phase F; either may not survive contact with 80×24.
3. **`run:*` producer shape** — hook-only (`splash-notify --event
run:fail`) or a first-party wrapper (`splash run -- npm test`)? Deferred
   until Phase F ships and there's usage signal.
4. **Naming** — `splash watch` reads naturally but collides conceptually
   with chafa's `--watch` (re-render a file on change). Alternatives:
   `splash repo`, `splash live`. Low stakes; decide at Phase B when the
   subcommand lands.

---

## Future Work

(explicitly out of scope for this proposal)

- **History mode**: `git log --numstat` → event-log converter → the same
  renderer animates repo history (terminal Gource proper).
- **Braille/pixel-canvas edges** once the unified pixel pipeline exists.
- **Idle activation** (`splash --init`, ttysvr TMOUT technique) turning
  `watch` into the default screensaver for a project directory.
- **Multi-repo mosaic**: one scene per repo, tiled.
- **CI bridge**: webhook → `WorkspaceEvent` converter (`run:*` events from
  GitHub Actions instead of local runs).
- **Share codes for viz presets**: skin + camera + palette encoded in the
  existing v0.5.0 share-code mechanism.

---

## References

- Gource — https://github.com/acaudwell/Gource (radial layout, avatars, camera)
- code_swarm — https://github.com/rictic/code_swarm (heat/decay aesthetics)
- chokidar (v1 watcher) — https://github.com/paulmillr/chokidar
- `@parcel/watcher` (perf upgrade path) — https://github.com/parcel-bundler/watcher
- `ignore` (gitignore semantics) — https://github.com/kaelzhang/node-ignore
- Claude Code hooks — https://docs.anthropic.com/en/docs/claude-code/hooks
- Local reference packages: `~/development/packages/asciiquarium` (entity
  model), `~/development/packages/ttysvr` (idle activation)
- Engine pieces this builds on: `src/renderer/TransitionManager.ts`,
  `src/engine/AnimationEngine.ts`, `src/engine/AnimationClock.ts`,
  `src/patterns/workspace/WorkspaceModel.ts`, and `src/utils/random.ts`
