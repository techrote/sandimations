# Architecture

## Design principle

The visualization must observe algorithm/model state, not contain the algorithm itself.

Sandimations is split into replaceable layers so the first simplified teaching model can later be replaced by recorded CyberSand traces or a C++/WASM implementation without rewriting the presentation layer.

## Layer model

```text
Scenario / Input events
        |
        v
+----------------------+      +----------------------+
| deterministic runner |<---->| typed parameter store|
+----------------------+      +----------------------+
        |
        +--> simulation model
        +--> scheduler model
        +--> trace/event stream
        +--> metrics snapshots
        |
        v
+----------------------+
| presentation adapter |
+----------------------+
        |
        +--> renderer
        +--> timeline / inspector
        +--> charts / counters
        +--> controls
```

## Required boundaries

### Simulation state

Owns material/cell state and deterministic physical rules. It must not depend on DOM state, animation frames, wall-clock time, or renderer objects.

### Scheduler state

Owns optimization-specific scheduling facts: chunks, sleep/wake state, phase selection, pending work, and scheduler counters. The scheduler may influence which simulation work executes, but its state remains inspectable independently from the rendered material state.

### Runner / simulation clock

Owns progression. It converts explicit commands into deterministic simulation advancement.

Minimum command vocabulary:

- `play(rate)` / `pause()`;
- `stepPhase()`;
- `stepFrame()`;
- `stepFrames(n)`;
- `reset()`;
- load/reload scenario;
- apply deterministic input event;
- apply parameter mutation according to its declared semantics.

A renderer call must never advance the model implicitly.

### Parameter registry

Parameters are schema-driven. UI controls are generated from or bound to parameter definitions rather than owning settings themselves.

Suggested mutation modes:

- `live`: takes effect immediately without invalidating deterministic state;
- `next-step`: queued and applied at the next deterministic step boundary;
- `reset-required`: changes scenario/configuration state and requires an explicit reset/rebuild.

### Trace protocol

Simulation and scheduler code emit structured events and metrics. Renderers subscribe to them; they do not reverse-engineer scheduler behavior from pixels.

Trace records should carry stable fields sufficient for deterministic tests and future adapters: logical frame, phase, event type, affected identity/coordinate/chunk, and reason/cause where relevant.

The protocol should be versioned before external trace import is supported.

### Presentation adapter

Transforms core state and trace data into renderer-friendly view models. It is the seam for future C++/WASM or recorded-trace backends.

### Renderer/UI

Responsible for drawing, interaction, explanation, accessibility, and responsive layout. It may interpolate visually between fixed simulation states, but interpolation must never mutate or masquerade as simulation state.

## Determinism contract

For the same:

- scenario definition;
- seed;
- ordered input events;
- ordered parameter mutations;
- runner commands;

…the core must produce the same logical states, trace events, and metrics regardless of browser refresh rate or render cadence.

Use an explicit model-owned PRNG. No hidden `Math.random()` calls are allowed in deterministic core code.

## Baseline / optimized comparison

Comparison mode should instantiate independent runners from the same canonical scenario seed/input stream. Baseline and optimized implementations may use different scheduler strategies but must share comparable model contracts.

Metrics must distinguish implementation work counters from wall-clock performance. Browser timing is useful for profiling but is not a deterministic teaching metric.

## Snapshot and replay direction

Initial releases need deterministic reset/replay, not arbitrary reverse execution. The runner API and state serialization should nevertheless permit later checkpoint rings or snapshot-backed rewind without reworking the simulation core.

## Suggested source layout

```text
src/
  core/
    model/
    scheduler/
    runner/
    random/
    parameters/
    trace/
    scenario/
  adapters/
    teaching-model/
    comparison/
    future-trace/
    future-wasm/
  presentation/
    view-models/
    overlays/
    timeline/
  ui/
    controls/
    inspectors/
    app/
  render/
    canvas/
  scenarios/
tests/
  unit/
  determinism/
  integration/
  e2e/
```

The exact directory names may evolve, but the boundaries must remain recognizable.

## Initial technology baseline

Recommended starting point:

- TypeScript with strict type checking;
- Vite for development/build;
- Canvas 2D renderer initially;
- Vitest for pure-core/unit/determinism tests;
- Playwright for browser-level interaction and visual smoke coverage;
- ESLint or an equivalent lightweight static check;
- GitHub Actions for install/typecheck/lint/test/build and selected browser smoke tests.

Dependencies should be justified by capability, not convenience. Keep the core framework-independent.
