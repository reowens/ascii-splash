---
type: prompt
status: archived
created: 2026-07-03T08:34:04Z
updated: 2026-07-03T08:35:33Z
dotmd_version: 0.68.0
context: 'Resume Workspace Viz Phase A'
related_plans:
---

# Resume — workspace-viz: kick off Phase A (model + static render)

Read `docs/planning/enhancement-proposals/WORKSPACE_VIZ.md` first — it is
scoped + gap-checked and already merged to main (06ea6f8). Phase A is pure
model/layout work on fixtures, **zero I/O**: `WorkspaceModel.ts` (~280),
`RadialLayout.ts` (~200), `Camera.ts` (~100), `WorkspaceVizPattern.ts`
(~420) under `src/patterns/workspace/`, plus a schema-versioned fixture
loader (`splash watch --fixture tests/fixtures/tree-medium.json`).

Next concrete decision: WorkspaceModel data structures (node map, heat
timestamps, LOD expansion set) — design for the doc's §Lifecycle contract
before writing the pattern.

Gotchas pinned by the gap review (do not rediscover):

- Model is persistent + pattern-external; pattern is a disposable view
  (photoPattern re-attach precedent, `main.ts:620`; `seeds.push(0)`).
  `reset()` clears view transients ONLY.
- Heat decay is lazy-from-timestamps; `Date.now()`/`Math.random()` banned
  in the pattern (injected `Random`, engine `render(time)` only).
- Node budget `min(150, cells/12)`; presets ship contiguous IDs 1–3.
- Phase A is the kill/pivot gate: radial tree must be beautiful at 80×24.
- Git: commit directly to main, NEVER create/suggest PRs (CLAUDE.md mandate).
