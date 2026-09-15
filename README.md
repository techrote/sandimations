# sandimations

Interactive, deterministic visual explanations of CyberSand performance techniques.

The project is intended to make spatial/temporal optimization strategies intuitive by letting a viewer slow, pause, step, inspect, perturb, and compare simulations rather than merely watching prerecorded animation.

## Current implementation status

SD-006 and SD-007 now provide two real optimization teaching schedulers on top of the SD-005 evidence-driven shell.

**Chunk sleep / wake** uses deterministic chunk lifecycle state to make settled regions computationally dormant, wake only the configured neighborhood around a local disturbance, and return quiet regions toward sleep. Sleeping chunks genuinely perform no cell evaluation; this is not a renderer mask over a hidden full scan. Chunk lifecycle state (`active`, `pending-sleep`, `sleeping`, `newly-woken`), transition causes, and awake/sleeping/woken counters all come from scheduler state and SD-004 trace/metrics evidence.

**Phased sampling** uses a deterministic spatial partition whose selected coordinate bucket is passed directly to the material model each scheduler phase. The default four-phase diagonal lattice therefore performs genuinely sparse per-phase evaluation rather than a hidden full scan with selective highlighting. The UI distinguishes evaluated-now cells from active cells assigned to another phase, preserves blocked/rejected facts as an orthogonal overlay, and shows scheduler-derived temporal coverage trails. Repeated `Step phase` operations advance the real selected bucket exactly once.

The default route is the SD-007 slow phased-sampling scenario. `?scenario=phased-normal` shows the same deterministic scheduler at `1×`, while `?scenario=chunk-sleep-wake` retains the SD-006 demonstration. Both are explicitly labelled teaching models rather than claims of exact current CyberSand C++ behavior.

The existing SD-002/005 time controls and registry-driven parameter controls remain the only interaction path. Playback-rate changes affect browser scheduling only; fixed-step simulation semantics remain deterministic.

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

The deterministic core never reads browser time, schedules animation frames, or changes its physics according to playback rate. A browser-only playback driver decides when to request another fixed scheduler phase from the runner during continuous playback.

Runner semantics:

- `tick` counts scheduler phase advances;
- `phase` identifies the next phase in the current logical frame;
- completing the configured phase cycle increments `frame`;
- non-phased strategies perform their frame-level material work at the defined frame boundary;
- `phased-sampling-v1` evaluates only the selected sparse coordinate bucket on every phase, so a complete logical frame composes the full partition cycle;
- `stepPhase()`, `stepFrame()`, and `stepFrames(n)` pause continuous playback before advancing exactly the requested logical work;
- play/pause and playback-rate changes are excluded from deterministic state hashes because they do not alter simulation state;
- parameter values, pending deterministic mutations, chunk scheduler state, and phased scheduler state contribute to deterministic state when they can alter or describe present/future deterministic execution.

The speed slider is deliberately non-linear. Half of its travel is devoted to `1/32×` through `1×`, while the upper half reaches `16×`, so useful slow-motion values are not compressed into a few pixels. Continuous phased playback runs at phase cadence scaled by the configured phase count so `1×` preserves the target logical-frame rate while deep slow motion exposes individual scheduler selections.

## Parameters and scenarios

The registered parameters currently include:

- `simulation.sand.enabled` — boolean, applied live;
- `simulation.sand.tie-break` — enum, applied at the next scheduler step;
- `simulation.seed-variant` — integer, applied on the next explicit reset;
- `scheduler.chunk.size` — integer chunk dimension, applied on explicit reset;
- `scheduler.chunk.sleep-delay` — quiet-frame delay, applied at the next scheduler step;
- `scheduler.chunk.activity-threshold` — move threshold defining a quiet frame, applied at the next scheduler step;
- `scheduler.chunk.wake-radius` — chunk-radius for local/cross-chunk wake propagation, applied at the next scheduler step;
- phased-sampling phase count — integer `2..8`, applied on explicit reset;
- phased-sampling partition pattern — diagonal lattice, vertical stripes, or seeded hash, applied on explicit reset.

Scenario schema version `1` records the model/world, scheduler configuration, parameter values, deterministic scripted events, and separate non-authoritative presentation defaults. Supported scenario JSON is validated strictly and serialized canonically.

See [`docs/SCENARIO_SCHEMA.md`](docs/SCENARIO_SCHEMA.md) for the field contract, event ordering rules, mutation timing, compatibility policy, and prepared fixture descriptions.

## Structured evidence, traces, and metrics

Trace protocol version `1` gives every retained event a monotonic sequence plus the logical frame, phase, and tick that produced it. The current teaching backend emits:

- `phase-started` / `phase-completed`;
- `phase-selection` for real phased-scheduler selection summaries;
- `cell-examined`;
- `cell-moved`;
- `cell-skipped`;
- `cell-blocked`;
- `chunk-activated`, `chunk-slept`, and `chunk-woken` for the chunk scheduler.

Wake events can include structured cause-cell or cause-chunk evidence, so presentation can explain why a region woke without re-running scheduler logic. Phased evidence includes scheduler-owned per-cell phase assignment and selection history so presentation can show evaluated-now, deferred-active, and temporal coverage without recomputing the partition.

Trace and metrics snapshots carry backend/strategy/scenario provenance. Deterministic metrics count cell work, actual chunk transitions/state, and phase progress. These counters are explanatory algorithmic-work evidence; they are deliberately separate from wall-clock CPU/GPU/browser profiling.

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

SD-006 drives this shell with real chunk lifecycle evidence. SD-007 drives the same shell with real sparse phase selection, explicit active-deferred state, phase-selection counters, and scheduler-derived coverage history. Renderer code remains presentation-only in both cases.

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
src/core/            deterministic model/runner/parameters/scenarios/traces/metrics/schedulers
    ↓
src/adapters/        replaceable evidence-backend contracts and live teaching adapter
    ↓
src/presentation/    browser-independent view-model/evidence adaptation and speed mapping
    ↓
src/ui/              DOM/canvas rendering and wall-clock playback scheduling
    ↓
src/main.ts          composition entry point
```

Both current scheduler implementations obey this path: scheduler/model state emits evidence and presentation consumes it. Comparison orchestration, scenario/timeline tooling, and external/WASM evidence backends remain governed by `docs/ARCHITECTURE.md` and their own issues.

The `npm run lint` boundary check rejects DOM access, animation-frame scheduling, hidden randomness, wall-clock reads, and timer scheduling from `src/core/`.

## Authoritative planning documents

- [`docs/RAG.md`](docs/RAG.md) — programme plan, dependency graph, current RAG status, issue map, risks, and execution ledger.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architectural boundaries and contracts.
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — educational goals, visual semantics, interaction model, and scope.
- [`docs/VERIFY.md`](docs/VERIFY.md) — required tests and evidence.
- [`docs/SCENARIO_SCHEMA.md`](docs/SCENARIO_SCHEMA.md) — scenario/parameter serialization and compatibility contract.
- [`docs/TRACE_PROTOCOL.md`](docs/TRACE_PROTOCOL.md) — trace, metrics, provenance, retention, and evidence-adapter contract.
- [`docs/CHUNK_SLEEP_WAKE.md`](docs/CHUNK_SLEEP_WAKE.md) — SD-006 teaching scheduler rules, parameters, wake causes, visualization contract, and fidelity caveats.
- [`docs/PHASED_SAMPLING.md`](docs/PHASED_SAMPLING.md) — SD-007 sparse phase scheduler, partition strategies, timing, visualization contract, and fidelity caveats.
- [`AGENTS.md`](AGENTS.md) — autonomous implementation and PR/merge workflow.

Repository state, these documents, and the relevant GitHub issue are authoritative over chat history.
