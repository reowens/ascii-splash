---
type: report
status: complete
---

# Legacy Architecture Triage — July 11, 2026

## Decision

The following facilities are classified as **legacy experimental primitives**
with no active production consumer:

- `SceneGraph`;
- `SpriteManager`;
- `ParticleSystem`;
- EventBus subscriptions and engine event emission;
- Buffer/TerminalRenderer persistent-overlay APIs.

They are not supported package APIs and should be deprecated and removed in a
separate cleanup change after package-surface review. No production integration
should be added merely to justify retaining them.

## Evidence

### SceneGraph

- No production code constructs or imports `SceneGraph`.
- Scene-style procedural patterns render directly into `Cell[][]`.
- `LayeredPattern` deliberately uses sequential photo-then-overlay rendering.
- `SceneLayer` exists only to support this unused abstraction.

**Disposition:** deprecate and remove later.

### SpriteManager

- No production pattern constructs `SpriteManager`.
- Scene-style patterns use local typed arrays and direct rendering.
- Historical documentation claimed pooling and collision helpers that the
  implementation does not provide.
- The central `Sprite` type otherwise exists only for this manager.

**Disposition:** deprecate and remove later.

### ParticleSystem

- No production code constructs the central `ParticleSystem`.
- Particle-oriented patterns define state and behavior locally to preserve
  their specialized physics and seeded PRNG call order.
- The central particle/emitter types otherwise couple only to this class.
- Historical claims about force fields, pooling, and line/area emitters exceed
  the implemented API.

**Disposition:** deprecate and remove later.

### EventBus

- `AnimationEngine` emits lifecycle/frame events, but production has no
  subscribers and no caller of `getEventBus()`.
- Per-frame emission therefore creates envelopes, timestamps, and history with
  no observable production result.
- Most declared events are neither emitted nor consumed.

**Disposition:** remove engine emission, constructor injection, getter, global
singleton, and unused event declarations in a dedicated compatibility change.

### Persistent overlays

- No production caller uses `Buffer.setOverlay`, text-overlay setters, or the
  corresponding clear methods.
- `TerminalRenderer` only exposes unused delegates.
- Active status, toast, and help overlays write through the normal composited
  frame callback.
- Overlay lookup currently adds work to ordinary cell diff/swap paths despite
  having no production consumer.

**Disposition:** remove only the persistent-overlay facility; retain Buffer's
ordinary final-cell dirty tracking.

## Compatibility Review Required

`package.json` exports only the root executable module and `src/main.ts` does
not export these classes. This indicates low supported-API risk. The npm tarball
does include all compiled `dist/` modules, however, so removal must still check
for historical unsupported direct-path consumers and document the change.

EventBus removal also changes the `AnimationEngine` constructor and
`getEventBus()` surface. The cleanup should be isolated, release-noted, and
accompanied by removal or replacement of characterization tests.

## Current Architecture Wording

Current production documentation should state:

> Patterns render directly into `Cell[][]`; `LayeredPattern` composes
> sequentially; UI overlays render into the ordinary final frame. SceneGraph,
> SpriteManager, ParticleSystem, EventBus subscriptions, and persistent overlays
> are retained legacy experiments pending separate removal, not active
> production architecture or supported library APIs.

## Completion addendum — July 12, 2026

The recommended cleanup is complete. The four experimental engine modules,
their central-only types and characterization suites, EventBus emission from
`AnimationEngine`, and Buffer/TerminalRenderer persistent-overlay storage and
methods were removed. Ordinary final-cell dirty tracking, transitions, and all
active pattern-local particle implementations remain unchanged.

Clean verification passes 70 suites and 2390 tests with 94.56% statements,
87.24% branches, 94.56% functions, and 95.14% lines. The removal is recorded in
the changelog because unsupported direct imports of the formerly compiled
`dist/engine/*` modules no longer resolve.
