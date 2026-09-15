# sandimations

Interactive, deterministic visual explanations of CyberSand performance techniques.

The project is intended to make spatial/temporal optimization strategies intuitive by letting a viewer slow, pause, step, inspect, perturb, and compare simulations rather than merely watching prerecorded animation.

## Current implementation status

SD-005 builds the first reusable explanatory application shell on the completed deterministic/evidence substrate. The browser now combines the Canvas world with trace-backed overlays, deterministic work metrics and provenance, state inspectors, registry-generated parameter controls, recent evidence, and the refined time-control strip.

The existing runner semantics are preserved: play/pause, the nonlinear `1/32×` through `16×` speed slider, an obvious `1×` return, single-phase stepping, single-frame stepping, configurable N-frame stepping, and deterministic reset all use the original SD-002 controller/runner path. Keyboard shortcuts provide the same operations without creating a second timing model.

Parameter widgets are generated from the SD-003 registry and visibly distinguish `live`, `next-step`, and `reset-required` behavior, including current versus queued values. Canvas overlays are built only from SD-004 evidence. The generic visual vocabulary already covers evaluated-now, active-other-phase, sleeping/inactive, newly-woken, and blocked/rejected with redundant non-color cues; the current full-scan teaching backend truthfully renders only states it actually emits rather than fabricating future scheduler facts.

Chunk sleep/wake scheduling and real phased-sampling selection are deliberately not implemented yet. The default scenario still has one phase per frame; the phased fixture uses a four-phase clock but explicitly does not select sparse cell subsets until SD-007.

## Initial visualization targets

1. **Chunk sleep / wake scheduling** — show settled regions becoming computationally dormant and disturbances waking only the necessary neighborhood.
2. **Phased sampling** — show active work distributed over spatial subsets and time while the macroscopic simulation remains continuous.
3. **Naive vs optimized comparison** — run identical seeded scenarios side by side and expose work avoided, active chunks, evaluated cells, divergence, and trace events.

## Core product requirements

- deterministic fixed-step simulation independent of rendering;
- pause, realtime, slow motion, fast-forward, single-phase stepping, single-frame stepping, and multi-frame stepping;
- typed live parameter registry with live / next-step / reset-required mutation semantics;
- inspectable simulation, scheduler, and visualization state kept separate;
- structured trace/instrumentation events rather than visualization-owned algorithm logic;
- scenario/preset system with reproducible seeds and eventually shareable URLs;
- architecture that can later consume captured CyberSand traces or a real C++/WASM core without replacing the explanatory UI;
- accessibility, responsive presentation, and automated verification from the outset.

## Deterministic teaching model and time semantics

The current material model is intentionally small: `empty`, `wall`, and `sand`. Sand falls vertically when possible and otherwise chooses an available down-diagonal direction. The tie-break mode is a registered parameter: seeded-random by default, with deterministic left-first/right-first alternatives available through the core API. This is an explanatory model, not a claim that these are the exact current CyberSand material rules.

The deterministic core never reads browser time, schedules animation frames, or changes its physics according to playback rate. A browser-only playback driver decides when to request another fixed logical frame from the runner.

Runner semantics:

- `tick` counts scheduler phase advances;
- `phase` identifies the next phase in the current logical frame;
- completing the configured phase cycle advances the sand model once and increments `frame`;
- the default scenario uses one phase per frame;
- `stepPhase()`, `stepFrame()`, and `stepFrames(n)` pause continuous playback before advancing exactly the requested logical work;
- play/pause and playback-rate changes are excluded from deterministic state hashes because they do not alter simulation state;
- parameter values and pending deterministic mutations do contribute to deterministic state when they can alter present/future simulation behavior.

The speed slider is deliberately non-linear. Half of its travel is devoted to `1/32×` through `1×`, while the upper half reaches `16×`, so useful slow-motion values are not compressed into a few pixels.

## Parameters and scenarios

The initial registered parameters are:

- `simulation.sand.enabled` — boolean, applied live;
- `simulation.sand.tie-break` — enum, applied at the next scheduler step;
- `simulation.seed-variant` — integer, applied on the next explicit reset.

Scenario schema version `1` records the model/world, scheduler clock configuration, parameter values, deterministic scripted events, and separate non-authoritative presentation defaults. Supported scenario JSON is validated strictly and serialized canonically.

See [`docs/SCENARIO_SCHEMA.md`](docs/SCENARIO_SCHEMA.md) for the field contract, event ordering rules, mutation timing, compatibility policy, and prepared fixture descriptions.

## Structured evidence, traces, and metrics

Trace protocol version `1` gives every retained event a monotonic sequence plus the logical frame, phase, and tick that produced it. The current teaching backend emits:

- `phase-started` / `phase-completed`;
- `cell-examined`;
- `cell-moved`;
- `cell-skipped`;
- `cell-blocked`.

The protocol also reserves explicit `chunk-activated`, `chunk-slept`, and `chunk-woken` evidence for SD-006 rather than making future UI infer chunk state from appearance.

Trace and metrics snapshots carry backend/strategy/scenario provenance. Deterministic metrics count cell work, future chunk transitions/state, and phase progress. These counters are explanatory algorithmic-work evidence; they are deliberately separate from wall-clock CPU/GPU/browser profiling.

Live trace retention uses a bounded `16,384`-record ring. Snapshots report `firstSequence`, `nextSequence`, and `droppedRecords`, so future timeline UI can distinguish a complete retained window from an intentionally truncated one. Metrics continue accumulating across trace eviction until deterministic reset.

`EvidenceBackendV1` is the replaceable seam between evidence production and presentation. The live TypeScript runner is currently exposed through `TeachingModelEvidenceBackendV1`; later recorded CyberSand traces or a C++/WASM backend can provide the same contract. `PresentationEvidenceAdapterV1` consumes that interface without DOM or backend-specific scheduler logic.

See [`docs/TRACE_PROTOCOL.md`](docs/TRACE_PROTOCOL.md) for event semantics, work-unit definitions, retention, provenance, compatibility/versioning, and the backend/presentation contract.

## Evidence-driven presentation shell

The live presentation path requests a bounded recent evidence slice (512 records by default) rather than cloning the full retained 16,384-record trace on every visual refresh. The canonical full trace snapshot remains available for explicit inspection/export paths, and cumulative deterministic metrics remain independent of retention.

The shell exposes:

- responsive desktop and narrow layouts;
- Canvas material state plus trace-backed explanatory overlays;
- overlay visibility and grid presentation toggles that never alter simulation state;
- frame/phase/tick/hash inspectors;
- deterministic work counters and backend/strategy/scenario provenance;
- recent structured evidence summaries;
- registry-generated parameter controls with mutation timing badges and pending-value status;
- keyboard operation and reduced-motion handling.

SD-006 and SD-007 can now add chunk sleep/wake and genuine phased sampling through the existing evidence/view-model path instead of introducing scheduler logic into the UI.

## Quick start on Windows

The repository includes double-clickable command wrappers. They are thin wrappers around the canonical npm commands.

First-time setup:

```text
Setup.cmd
```

This checks for Node/npm and runs the exact lockfile install (`npm ci`).

Normal launch:

```text
Run.cmd
```

`Run.cmd` automatically invokes setup when dependencies are missing, then starts Vite and opens the app in the default browser.

Repository verification:

```text
Verify.cmd
```

The command files are forced to CRLF line endings through `.gitattributes` for reliable Windows checkout behavior.

## Development

Use Node.js 24 for the repository and CI. The package declares a minimum Node version of 22.12.0.

The canonical cross-platform commands remain:

```bash
npm ci
npm run dev
```

The main verification commands are:

```bash
npm run format:check   # Prettier consistency
npm run lint           # deterministic-core boundary/static check
npm run typecheck      # strict TypeScript check
npm test               # Vitest Node-side unit/determinism tests
npm run build          # production Vite build
npm run test:e2e       # build + Playwright Chromium interaction/smoke tests
npm run verify         # formatting + boundary check + typecheck + unit tests + build
```

Before running browser tests locally for the first time, install the Chromium runtime:

```bash
npm run test:e2e:install
```

CI performs a clean `npm ci` install from `package-lock.json`, runs formatting/static/type/unit/build checks, installs Chromium, then runs the Playwright production-build browser tests.

## Source boundaries

The current implementation follows this dependency direction:

```text
src/core/            deterministic model/runner/parameters/scenarios/traces/metrics
    ↓
src/adapters/        replaceable evidence-backend contracts and live teaching adapter
    ↓
src/presentation/    browser-independent view-model/evidence adaptation and speed mapping
    ↓
src/ui/              DOM/canvas rendering and wall-clock playback scheduling
    ↓
src/main.ts          composition entry point
```

Scheduler implementations, comparison orchestration, scenario/timeline tooling, and external/WASM evidence backends remain governed by `docs/ARCHITECTURE.md` and their own issues. SD-005's generic controls/overlays are the presentation substrate for those later features.

The `npm run lint` boundary check rejects DOM access, animation-frame scheduling, hidden randomness, wall-clock reads, and timer scheduling from `src/core/`.

## Authoritative planning documents

- [`docs/RAG.md`](docs/RAG.md) — programme plan, dependency graph, current RAG status, issue map, risks, and execution ledger.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architectural boundaries and contracts.
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — educational goals, visual semantics, interaction model, and scope.
- [`docs/VERIFY.md`](docs/VERIFY.md) — required tests and evidence.
- [`docs/SCENARIO_SCHEMA.md`](docs/SCENARIO_SCHEMA.md) — scenario/parameter serialization and compatibility contract.
- [`docs/TRACE_PROTOCOL.md`](docs/TRACE_PROTOCOL.md) — trace, metrics, provenance, retention, and evidence-adapter contract.
- [`AGENTS.md`](AGENTS.md) — autonomous implementation and PR/merge workflow.

Repository state, these documents, and the relevant GitHub issue are authoritative over chat history.
