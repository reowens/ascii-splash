---
type: prompt
status: archived
created: 2026-07-03T08:55:09Z
updated: 2026-07-22T05:10:51Z
dotmd_version: 0.68.0
context: 'Resume Workspace Viz Phase A Tests'
related_plans:
---

# Resume — workspace-viz Phase A: test suites + 80×24 beauty pass

Phase A **source is landed on main** (src/patterns/workspace/: WorkspaceModel,
RadialLayout, Camera, WorkspaceVizPattern, fixture.ts; `splash watch --fixture`
wired in main.ts; fixtures tests/fixtures/tree-{small,medium}.json). Typecheck,
lint, and all 2317 existing tests green. Read
`docs/planning/enhancement-proposals/WORKSPACE_VIZ.md` §Testing Strategy.

Next concrete work: the Phase A test suites (~55) under
tests/unit/patterns/workspace/: model (lazy heat decay + decayed-counter
subtree aggregates, add/touch/remove/rename, LOD budget-never-exceeded
property), layout (stable sibling order, NaN-free on depth-50 chains / 10k
siblings), camera (round-trip, fitZoom, frame-rate-independent easing),
fixture parser rejects, pattern lifecycle (theme rebuild preserves model;
reset() clears view transients ONLY; two same-seed models ⇒ byte-identical
buffers). Copy conventions from tests/unit/patterns/nightsky.test.ts.

Then the kill/pivot gate: run `splash watch --fixture
tests/fixtures/tree-medium.json` in a real 80×24 terminal and tune — known
issues from the headless render: edge dots '·' are indistinguishable from
cold-file glyphs, heat-centroid pull drifts the tree off-center (bottom rows
empty), label overlap near hot clusters.

Gotchas: model epoch is set by first modelTime() call — never call it with
0 before real render time in tests you care about; pattern config spread
means explicitly-undefined keys override presets (main.ts filters, tests
should too). Git: commit directly to main, NEVER create/suggest PRs.
