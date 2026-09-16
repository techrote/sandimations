# Architecture

## Design principle

The visualization observes deterministic model/scheduler evidence; it does not contain the simulation or optimization algorithm. Sandimations is layered so the current TypeScript teaching model can later be replaced by recorded CyberSand traces or a C++/WASM backend without replacing the explanatory UI.

```text
scenario / ordered input + parameter events
              ↓
      deterministic runner
        ↙      ↓       ↘
 simulation  scheduler  trace + deterministic metrics
              ↓
       evidence backend
              ↓
     presentation adapters
        ↙       ↓        ↘
   Canvas/UI  timeline  comparison/share tools
```

## Deterministic core

`src/core/` owns the logical world, seeded PRNG, fixed-step runner, typed parameter state, scenario normalization, schedulers, trace records, metrics, and deterministic comparison orchestration. It must not depend on DOM APIs, animation frames, browser timers, wall-clock time, locale-sensitive ordering, or `Math.random()`.

For identical scenario/seed, ordered deterministic inputs, parameter mutations, and runner commands, core state, trace sequence, and deterministic metrics must be identical regardless of rendering cadence or browser observation.

### Runner clock

The runner owns progression. Rendering never advances physics implicitly.

- `tick` counts executed scheduler phases;
- `phase` is the zero-based next phase in the current logical frame;
- completing the configured phase cycle increments `frame`;
- `stepPhase()`, `stepFrame()`, and `stepFrames(n)` pause playback before doing exactly the requested work;
- `reset()` reconstructs deterministic world/PRNG/event/parameter/scheduler/trace/metric state;
- playback rate and play/pause state are browser scheduling controls and are excluded from deterministic state hashes.

### Parameters

Definitions declare stable ID, label/help, kind, bounds/options/default, mutation timing, and serialization behavior. Mutation modes are:

- `live` — current immediately;
- `next-step` — queued and applied at the next scheduler boundary;
- `reset-required` — queued until explicit reset, then incorporated into persistent reset configuration.

Current/pending deterministic parameter state contributes to hashing whenever it can affect current or future deterministic execution.

### Scenario contract

Scenario schema version `1` is data-first, validated, and canonically serializable. It separates simulation/world data, scheduler configuration, parameter values, ordered deterministic events, and non-authoritative presentation defaults. Unsupported versions, unknown parameters, ambiguous event ordering, and invalid values fail closed.

Release hardening adds explicit input/resource ceilings before expensive normalization: 512 cells per axis, 65,536 total world cells, and 10,000 scripted events. These limits reject unsupported input without changing deterministic interpretation of accepted scenarios. See `docs/SCENARIO_SCHEMA.md`.

## Scheduler teaching models

### Chunk sleep/wake

`ChunkSleepWakeScheduler` owns fixed chunk bounds, lifecycle state, quiet counters, activity accumulation, and deterministic wake decisions. Sleeping chunks are excluded from cell evaluation, so reduced examined-cell counts represent real work avoidance. Wake trace events can carry cause-cell/cause-chunk evidence. Because chunk-scoped scan ordering differs from the full-scan reference, physical identity is not assumed; comparison mode measures divergence.

### Phased sampling

The phased scheduler deterministically assigns coordinates to phase buckets and evaluates only the current bucket each phase. Selection/coverage state is scheduler-owned and emitted through trace/evidence contracts. The renderer never manufactures a sampling mask. Evaluated-now overlays are derived from actual trace examination records, including the material-disabled case.

## Trace and deterministic metrics

Trace protocol version `1` provides deterministic sequence/frame/phase/tick context plus backend/strategy/scenario provenance. It covers phase boundaries, phase selections, examined/moved/skipped/blocked cell facts, and chunk lifecycle transitions/wake causes.

Metrics schema version `1` is deterministic evidence derived from the same execution path and includes cell work, chunk state/transitions, phase progress, and comparable teaching work units. Metrics are not wall-clock time and do not claim that every work unit has equal CPU cost.

Live trace retention is a bounded 16,384-record ring with `firstSequence`, `nextSequence`, and `droppedRecords`. Cumulative metrics remain independent of trace eviction.

## Evidence backend and presentation adapter

`EvidenceBackendV1` is the replaceable read seam between execution and presentation. `TeachingModelEvidenceBackendV1` adapts the live TypeScript runner and also offers an optional bounded recent-evidence read. `PresentationEvidenceAdapterV1` converts backend evidence into presentation-friendly structures without scheduler inference.

Live UI refresh defaults to a bounded recent trace slice rather than cloning the full ring. Reads are side-effect free and cannot advance simulation, alter trace ordering, or change deterministic metrics/state.

A future recorded-trace or C++/WASM backend should implement the same evidence contract instead of introducing renderer-specific algorithm knowledge.

## Presentation and UI

`src/presentation/` owns browser-independent view models, speed mapping, comparison controllers, timeline summarization, share-state encoding, demo-script command translation, and browser-diagnostic data structures. `src/ui/` owns DOM/Canvas rendering and wall-clock playback scheduling. `src/main.ts` is the browser composition root.

The UI may amplify facts visually with trails, pulses, patterns, brightness, or spatial emphasis, but every factual scheduler/material claim must originate in evidence. Critical states use redundant non-color cues. Nonessential animation respects reduced motion. Narrow layouts must avoid document-level blocking overflow.

### Scenario experience and sharing

SD-009 composes the built-in scenario library, single/comparison runtimes, bounded trace-backed timeline, presentation/demo mode, and versioned shareable URL state. Share state identifies canonical scenario/parameters and deterministic replay position; it does not serialize mutable DOM state. Replay work has an explicit ceiling and unsupported/truncated state fails visibly.

Timeline inspection is read-only. Selecting an entry never rewinds or mutates the simulation; it inspects retained trace evidence.

### Comparison

`DeterministicComparison` owns independent baseline and optimized runners created from equivalent canonical non-scheduler scenario data. Runners do not share mutable world, PRNG, parameter, scheduler, trace, or metric state. Comparison metrics preserve provenance and use the defined `cell-material-hamming-v1` divergence metric rather than assuming physical equivalence.

Split/overlay UI reuses normal view-model/Canvas contracts.

## Browser-only performance diagnostics

SD-010 adds a deliberately separate presentation timing channel. `performance.now()` is used only outside `src/core/` to measure Canvas render passes and post-step UI refreshes. Per-category sample history is bounded to 120 records and exposed through `window.__sandimationsPerformance` for profiling/testing.

These measurements are nondeterministic diagnostics. They are never deterministic inputs and never enter scenarios, share state, state hashes, scheduler decisions, trace records, or deterministic work metrics. See `docs/RELEASE_HARDENING.md` and `docs/VERIFY.md`.

## Static deployment

The production target is GitHub Pages under repository base `/sandimations/`. Vite receives that base explicitly for the Pages build. A dedicated Playwright config serves built assets from the same subpath before deployment. `.github/workflows/pages.yml` smoke-tests the built artifact before upload/deploy so deployment/base-path failures remain visible.

Public deployment verification is a release gate, not implied by a successful local/static-server smoke.

## Source dependency direction

```text
src/core/
    ↓
src/adapters/
    ↓
src/presentation/
    ↓
src/ui/
    ↓
src/main.ts
```

The static boundary check enforces the most important invariant: deterministic core cannot reach upward into browser/presentation concerns.

## Technology baseline

- strict TypeScript;
- Vite development/build;
- Canvas 2D presentation;
- Vitest deterministic/unit coverage;
- Playwright Chromium browser and production-base-path smoke coverage;
- GitHub Actions CI and Pages workflow.

Dependencies are justified by capability rather than framework convenience. The first release has no runtime package dependencies.
