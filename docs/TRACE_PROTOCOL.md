# Trace, Metrics, and Evidence Adapter Contract

SD-004 establishes the structured evidence boundary used to explain what a simulation or scheduler actually did. Presentation code consumes these facts; it must not reconstruct scheduler/model decisions from rendered pixels.

## Versioned trace envelope

The current trace protocol version is `1` (`TRACE_PROTOCOL_VERSION`). An in-memory trace snapshot contains:

- `version` — trace protocol version;
- `provenance` — backend, strategy, and scenario identity;
- `firstSequence` — sequence number of the oldest retained record;
- `nextSequence` — sequence number that will be assigned to the next event;
- `droppedRecords` — number of older records intentionally evicted by bounded retention;
- `records` — the retained ordered trace records.

Every record carries:

- monotonic `sequence` beginning at zero after reset/scenario load;
- logical `frame` being executed;
- scheduler `phase` being executed;
- monotonic scheduler `tick` being executed;
- event-specific fields.

The frame/phase/tick on an event describe the work that produced that event. They do not mean “the next state shown by the UI.” For example, all records generated while executing frame `0`, phase `0`, tick `0` retain that context even though the runner advances to frame `1` after the phase completes.

## Bounded in-memory retention

The live in-memory sink is deliberately bounded. The default capacity is `16,384` records and the sink uses a ring buffer rather than allowing a long-running visualization to retain every cell-level event forever.

Retention does **not** reset event sequence numbers and does not reduce cumulative deterministic metrics. When old records are evicted:

- `firstSequence` advances;
- `nextSequence` remains the monotonic total sequence position;
- `droppedRecords` increases;
- metrics continue to include all consumed events since the last deterministic reset.

This makes truncation explicit to future timeline/inspector UI. SD-009 may add configurable/broader history, but it must not assume that the live trace snapshot is an unbounded event database.

## Event vocabulary

Protocol v1 defines these event types:

| Event | Required evidence |
| --- | --- |
| `phase-started` | phase boundary and configured phase count |
| `phase-completed` | phase boundary and configured phase count |
| `cell-examined` | cell coordinate and material actually considered by the model |
| `cell-moved` | source/destination, material, and reason |
| `cell-skipped` | cell/material and reason the model did not perform material work |
| `cell-blocked` | cell/material and reason movement could not proceed |
| `chunk-activated` | stable chunk identity/coordinate and activation reason |
| `chunk-slept` | stable chunk identity/coordinate and sleep reason |
| `chunk-woken` | stable chunk identity/coordinate and wake reason |

The chunk vocabulary is defined before SD-006 so later sleep/wake work can emit facts through the same presentation-facing contract. The current SD-004 teaching runner has no chunk scheduler and therefore does not fabricate chunk events.

Reason strings are stable explanatory codes supplied by the producing backend. Adding a new reason string is additive; changing the meaning of an existing reason is not.

## Current teaching-model emission

The SD-004 teaching model emits phase boundaries around the real runner phase. On the phase that completes a logical frame, the existing full sand scan emits observations directly from the model loop:

- every interior scan candidate emits `cell-examined`;
- non-sand candidates additionally emit `cell-skipped` with `material-not-sand`;
- a successful move emits `cell-moved` with a deterministic movement reason;
- a sand cell with no open downward target emits `cell-blocked`.

This instrumentation is observational: it must not add model randomness, alter scan order, or change the physical result. Existing SD-002 deterministic state-hash fixtures remain authoritative regression checks.

The prepared four-phase SD-003 fixture still performs sand physics only when its phase cycle completes. Earlier phases currently emit only phase boundaries. SD-007 will add genuine sparse phase selection; SD-004 deliberately does not fake those cell selections.

## Provenance

Trace and metrics snapshots both carry protocol-v1 provenance:

- `backendId` — stable implementation/source identity;
- `backendKind` — `teaching-model`, `recorded-trace`, or `wasm`;
- `strategyId` — scheduler/optimization strategy identity;
- `scenarioId` — canonical scenario identity.

The current live backend uses `sandimations-teaching-model-v1` and the scenario's scheduler strategy. Provenance is reset/rebound when a scenario is loaded so counters and traces cannot silently retain a previous scenario identity.

## Deterministic metrics schema

The current metrics schema version is `1` (`METRICS_SCHEMA_VERSION`). Metrics are derived from the same trace records that drive explanation.

### Cell counters

- `examined`;
- `moved`;
- `skipped`;
- `blocked`.

### Chunk counters/state

- current `active` and `sleeping` chunk counts derived from stable chunk IDs;
- cumulative `activated`, `slept`, and `woken` transitions.

### Phase progress

- phase starts;
- phase completions;
- context of the last completed phase.

### Comparable work units

Protocol v1 defines:

- `cellEvaluations = cells.examined`;
- `schedulerTransitions = chunks.activated + chunks.slept + chunks.woken`;
- `total = cellEvaluations + schedulerTransitions`.

These are deterministic explanatory work units, not CPU cycles and not a claim that every unit has identical real cost. Later comparison views may use the same definition when comparing strategies, while also showing the component counters.

## Wall-clock profiling is separate

No trace record or deterministic metrics field contains `performance.now()`, `Date`, frame duration, CPU time, or browser timing. Wall-clock profiling may be added later as a separately labelled diagnostic channel. It must not be mixed into deterministic work counters or scenario replay evidence.

## Backend/presentation boundary

`EvidenceBackendV1` exposes one atomic presentation-facing evidence snapshot containing:

- provenance;
- canonical simulation state and state hash;
- scheduler state (current frame/tick, next phase, phase count, and future chunk-state slots);
- versioned trace snapshot;
- deterministic metrics snapshot.

`TeachingModelEvidenceBackendV1` adapts the live `SimulationRunner` to that contract. `PresentationEvidenceAdapterV1` consumes only the backend interface and has no DOM dependency. Tests prove that an immutable mock snapshot can satisfy the same adapter.

This seam is intentionally compatible with later backends:

- a recorded CyberSand trace reader can implement `EvidenceBackendV1`;
- a C++/WASM core can implement `EvidenceBackendV1`;
- presentation code should not need backend-specific scheduling logic.

## Reset and replay

Runner reset/scenario load clears trace sequence and deterministic metrics along with deterministic simulation reconstruction. Replaying the same scenario, seed, ordered events, parameter changes, and runner commands must reproduce the same trace records and metrics.

Reading snapshots, metrics, traces, backend evidence, or presentation evidence is side-effect free and must not affect simulation state or future trace ordering.

## Compatibility policy

- Trace envelope version and metrics schema version are explicit integers.
- Existing required fields and event meanings must not change within a version.
- New optional metadata may be additive only when old readers can safely ignore it.
- New reason strings are additive; existing reason meanings are stable.
- A new required event field, changed coordinate/identity semantics, changed ordering semantics, or incompatible event meaning requires a new trace protocol version.
- A changed deterministic work-unit definition requires a new metrics schema version.
- Imported future traces must validate protocol/provenance before being exposed to presentation code.
- Unknown future protocol versions must fail closed until an explicit compatibility/migration layer exists.

SD-011 owns the external trace importer/fidelity bridge; SD-004 defines the contract it will eventually consume.
