# Sandimations RAG / Agent Context & Execution Plan

This is the repository-native retrieval/context pack and execution ledger for the project. It is intended to let an implementation agent resume from repository state without relying on chat history.

## Mission

Build an interactive web application that makes CyberSand performance ideas intuitive through deterministic, inspectable simulations. The first high-value stories are chunk sleep/wake scheduling and phased sampling, with baseline-vs-optimized comparison, direct time manipulation, live parameter mutation, and trace-driven explanatory overlays.

## Plan review outcome

The initial concept was improved before publication in four material ways:

1. **Trace/model separation is mandatory.** The renderer must visualize structured model/scheduler facts rather than duplicate optimization logic.
2. **Time is an explicit subsystem.** Pause, variable rate, one-phase stepping, one-frame stepping, and N-frame stepping are runner commands, not renderer tricks.
3. **Parameters are schema-driven.** Controls are generated/bound from typed definitions carrying mutation semantics, so later illustrative controls do not require state-model rewrites.
4. **Backend replacement is designed in.** The first deterministic teaching model is an adapter, not the application core, leaving a clean path to captured CyberSand traces or C++/WASM.

Two execution clarifications were added before implementation began:

- **Early time controls are required.** SD-002 must deliver a minimal but genuinely functional speed slider and phase/frame stepping controls as soon as the deterministic runner exists; SD-005 later refines those same controls rather than delaying them.
- **Visual expressiveness is encouraged.** Trace-backed truthfulness constrains the scheduler facts being represented, not the aesthetics. The visualization may exaggerate, trail, pulse, separate, magnify, regroup, or otherwise transform those facts to make phased sampling intuitive.

These are architecture/product requirements, not optional refinements.

## Release shape

### M0 — Repository substrate — complete

SD-001 established the toolchain, strict TypeScript structure, deterministic-core boundaries, CI, browser smoke harness, and documentation conventions.

### M1 — Deterministic explanatory substrate + early interactive controls — complete

SD-002 established the seeded teaching model, explicit runner/clock, phase and frame stepping, deterministic hashes/reset/replay, and **working browser speed slider and stepping controls**. SD-003 added the typed parameter registry, deterministic mutation timing, versioned/canonical scenario serialization, scripted event replay, and fixture scenarios. SD-004 completed the substrate with versioned structured traces, deterministic trace-derived metrics, provenance, bounded evidence retention, and replaceable backend/presentation evidence contracts.

### M2 — First explanatory app — in progress

SD-005 completed the generic evidence-driven application shell: responsive Canvas presentation, polished time controls, registry-derived parameter controls, deterministic work/provenance inspectors, recent evidence, and a non-color-only overlay vocabulary. SD-006 and SD-007 are now both ready to add the chunk sleep/wake and phased-sampling schedulers/demos through those landed presentation/evidence contracts.

### M3 — Comparative and presentation tooling

Baseline-vs-optimized mode, divergence/work metrics, timeline/phase inspector, shareable scenario state, presentation mode, accessibility hardening, and deployable static build.

### M4 — Fidelity bridge

Versioned external trace ingestion and/or C++/WASM adapter proof so the explanatory UI can be driven by real CyberSand evidence later without architectural replacement.

## Work graph

Stable work IDs and their GitHub issues form the execution graph.

| Work ID | Issue | Scope | Depends on | Parallelism |
|---|---:|---|---|---|
| SD-001 | [#1](https://github.com/techrote/sandimations/issues/1) | Bootstrap TypeScript/Vite/test/CI substrate | none | complete |
| SD-002 | [#2](https://github.com/techrote/sandimations/issues/2) | Deterministic world, runner, **early functional speed/step control vertical slice** | SD-001 | complete |
| SD-003 | [#3](https://github.com/techrote/sandimations/issues/3) | Typed parameter registry, scenario schema, serialization | SD-001 | complete |
| SD-004 | [#4](https://github.com/techrote/sandimations/issues/4) | Trace protocol, metrics, backend/presentation adapter contracts | SD-001; consumes SD-002/003 | complete |
| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | UI shell, Canvas renderer, legend, inspectors, **refinement of SD-002 time controls** | SD-002, SD-003, SD-004 | complete |
| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | Chunk sleep/wake scheduler teaching model + demo | SD-002, SD-004; integrates with SD-003/005 | ready; may overlap SD-007 |
| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | Phased-sampling teaching model + **primary visual/phase-step explanation** | SD-002, SD-004; integrates with SD-003/005 | ready; may overlap SD-006 |
| SD-008 | [#8](https://github.com/techrote/sandimations/issues/8) | Baseline-vs-optimized comparison and divergence/work instrumentation | SD-006, SD-007 | after both demos expose stable metrics |
| SD-009 | [#9](https://github.com/techrote/sandimations/issues/9) | Scenario presets, timeline, shareable URL state, presentation mode | SD-003, SD-005, SD-006, SD-007; comparison scenarios may use SD-008 | after stable scenario/UI contracts |
| SD-010 | [#10](https://github.com/techrote/sandimations/issues/10) | Accessibility, performance, browser hardening, static deployment | SD-005 through SD-009 | final release hardening |
| SD-011 | [#11](https://github.com/techrote/sandimations/issues/11) | External trace / future C++-WASM fidelity bridge proof | SD-004, SD-008 | may follow first public release |

## Concurrency rules

- SD-001 through SD-005 are complete substrate/presentation-foundation work.
- SD-005's generic app/view-model contract is now the presentation path: later scheduler work must supply structured evidence rather than add algorithm logic to Canvas/DOM code.
- SD-006 and SD-007 are now the main safe parallel pair. Both should extend the common evidence/overlay vocabulary instead of introducing a competing state or stepping path.
- SD-005 must **adopt/refine the already-working SD-002 controls**, not replace their simulation semantics or defer their functionality.
- SD-006 must emit chunk activate/sleep/wake facts through the SD-004 event vocabulary rather than inventing a parallel evidence channel.
- SD-007 must make the existing phase/tick control visually meaningful by exposing real per-phase scheduler selections through the SD-004 evidence path; it must not create a competing stepping path or visual-only fake sampling mask.
- SD-008 requires both scheduler stories to expose stable metrics/provenance through the common evidence contract.
- SD-009 must not become a second state-management system; URL/preset state serializes canonical scenario/parameter/view models. Its timeline must respect explicit bounded trace retention rather than assuming an infinite live event log.
- SD-010 is hardening, not a feature bucket; material new features discovered there should become explicit follow-ups.

## Global acceptance invariants

Every implementation must preserve:

- deterministic core independent of render cadence and wall time;
- explicit seeded PRNG and no hidden core randomness;
- physical simulation state distinct from scheduler state;
- scheduler/model facts distinct from rendering logic;
- phase distinct from logical frame;
- baseline/optimized provenance on comparison metrics;
- typed parameter mutation semantics (`live`, `next-step`, `reset-required`);
- reproducible scenario reset/replay;
- versioned, validated, canonical scenario serialization with locale-independent deterministic ordering;
- versioned trace/metrics contracts with backend/strategy/scenario provenance;
- trace/metrics/backend/presentation reads are observational and cannot perturb deterministic execution;
- deterministic work counters remain distinct from wall-clock performance profiling;
- live trace retention is explicitly bounded/self-describing rather than an accidental unbounded log;
- honest labeling of simplified teaching behavior versus verified real CyberSand behavior;
- **visual transformations may amplify real scheduler facts but may not invent scheduler decisions**;
- keyboard-usable controls and non-color-only critical state distinctions;
- automated checks that grow with capability and are not silently weakened.

## Earliest interactive vertical slice

SD-002 delivers a human-usable early vertical slice before the mature presentation shell exists. A viewer can:

- see a simple running sand/world view;
- pause/play it;
- move a working speed slider from deep slow motion through fast-forward;
- easily identify/return to `1×`;
- advance one scheduler phase/tick;
- advance one logical frame;
- advance ten frames;
- see frame/phase/tick counters and the deterministic state hash change;
- reset deterministically.

The implemented slider is deliberately non-linear: half of its travel covers `1/32×` through `1×`, while the upper half reaches `16×`. The runner receives explicit playback-rate values and fixed-step physics remain unchanged.

The default scenario intentionally uses one phase per frame. SD-003 also provides a four-phase clock fixture, but it explicitly does **not** select sparse cell subsets. This establishes the real phase-step/scenario contracts without pretending phased sampling is already implemented; SD-007 later supplies meaningful per-phase selection through the same controls.

## SD-003 configuration substrate

SD-003 establishes three concrete parameter timings without pre-implementing later optimization features:

- live sand-motion enable/disable;
- next-step diagonal tie-break selection;
- reset-required deterministic seed variation.

Scenario schema version `1` separates simulation/world data, scheduler clock configuration, parameter values, ordered deterministic input/parameter events, and non-authoritative presentation defaults. Serialization is validated and canonical. Reset reconstructs runtime live/next-step state from the scenario baseline while retaining explicitly applied reset-required configuration, so scripted event histories reproduce from a stable starting state.

Prepared fixtures include a localized disturbance for later sleep/wake work and a four-phase clock scene for later phased-sampling work.

Windows convenience entry points are also available: `Setup.cmd`, `Run.cmd`, and `Verify.cmd`. They remain thin wrappers over the canonical npm workflow. A one-off Windows Server 2025 / Node 24 CI smoke during SD-003 verified setup and repository verification under `cmd.exe`, plus the `Run.cmd` canonical launch path. Repository text is normalized to LF except `.cmd`, which is forced to CRLF.

## SD-004 structured evidence substrate

SD-004 establishes the factual channel that later visualizations must consume.

Trace protocol version `1` records deterministic `sequence`, `frame`, `phase`, and `tick` context plus backend/strategy/scenario provenance. The current teaching model emits phase boundaries and exact cell examined/moved/skipped/blocked facts directly from the real sand scan. Chunk activated/slept/woken events are already part of the protocol so SD-006 can add chunk semantics without changing the presentation contract; no chunk facts are fabricated before that scheduler exists.

Metrics schema version `1` is derived from those trace records. It exposes cell-work counters, chunk current-state/transition counters, phase progress, and deterministic explanatory work totals. These are explicitly not wall-clock timing or claims that all work units cost the same CPU time.

The evidence boundary is:

```text
model / scheduler / runner
        ↓
versioned trace + deterministic metrics + provenance
        ↓
EvidenceBackendV1
        ↓
PresentationEvidenceAdapterV1
        ↓
future renderer / inspector / timeline
```

The live TypeScript implementation uses `TeachingModelEvidenceBackendV1`. Tests prove the same presentation adapter can consume a mock immutable backend snapshot, preserving the path for recorded CyberSand traces and C++/WASM later.

Live in-memory trace history is a `16,384`-record ring buffer. Snapshots expose `firstSequence`, `nextSequence`, and `droppedRecords`; cumulative deterministic metrics continue across trace eviction. This bounds long-running memory use while making any retained-history gap explicit.

Human-auditable golden fixtures verify event ordering and movement evidence. Additional tests verify provenance, metrics consistency, chunk vocabulary, deterministic reset/replay, and identical state/trace/metrics despite heavy extra presentation/backend reads between simulation steps.

See `docs/TRACE_PROTOCOL.md` for the complete evidence/versioning/retention contract.

## SD-005 presentation shell

SD-005 turns the earlier functional control slice into a reusable evidence-driven UI while preserving runner semantics.

The shell includes:

- the existing nonlinear deep-slow-to-fast playback control with direct `1×` return;
- pause/play, exact phase step, exact frame step, configurable N-frame step, and deterministic reset;
- keyboard equivalents (`Space`, `.`, `F`, `R`) that call the same controller methods;
- state/hash, deterministic work, trace-retention, and provenance inspectors;
- parameter controls generated from registry metadata, including explicit current/pending display for `next-step` and `reset-required` values;
- a five-state overlay/legend vocabulary with redundant shape/pattern cues: evaluated-now, active-other-phase, sleeping/inactive, newly-woken, and blocked/rejected;
- recent evidence summaries and presentation-only grid/overlay toggles;
- responsive narrow/desktop layouts and `prefers-reduced-motion` handling.

The current full-scan backend emits evaluated and blocked cell facts, so those are the states currently visible on the world. The other overlay categories are deliberately dormant until SD-006/007 emit corresponding evidence. UI code may not synthesize those states from geometry, color, or expected algorithm behavior.

For live refresh, `TeachingModelEvidenceBackendV1` exposes an additive bounded recent-trace read and the presentation adapter defaults to the newest 512 records. This resolves R10 without changing the canonical full trace/export contract or cumulative metrics.

## Initial UX target

The mature default app should make the following flow possible without reading documentation:

1. load a visible moving sand scenario;
2. pause it;
3. slow it substantially;
4. advance one scheduler phase at a time;
5. see which cells were evaluated now, active-but-not-selected, sleeping, newly woken, or blocked;
6. advance a complete frame and understand how phases compose;
7. switch to chunk sleep/wake and disturb a settled area;
8. see wake propagation and work counters respond;
9. adjust an illustrative parameter and see its declared application semantics;
10. compare a baseline full-scan runner against an optimized runner from the same seed/input stream.

For phased sampling specifically, the intended experience is **show first, explain second**: animation/highlighting/direct stepping should carry most of the explanation, while labels, prose, counters, and mathematics verify or deepen what the viewer can already see.

## Measurement strategy

Primary explanatory metrics are deterministic work counters, not noisy browser timing:

- cells examined / moved / skipped / blocked;
- chunks active / sleeping / activated / slept / woken;
- phase start/completion progress;
- deterministic work units and later work ratio relative to baseline;
- deterministic state divergence where defined.

The current v1 work total is deliberately simple: cell evaluations plus scheduler transitions. It is a reproducible teaching metric, not a CPU-cycle model. Browser CPU/frame timings may be added as secondary profiling information with environment caveats and must remain separate from deterministic metrics.

## Technical baseline

Preferred first implementation unless an issue substantiates a better choice:

- TypeScript, strict mode;
- Vite;
- framework-light UI or a small UI library only if it materially reduces state/interaction complexity;
- Canvas 2D first;
- Vitest;
- Playwright;
- GitHub Actions;
- static-host-friendly production output.

Do not introduce WebGL/WebGPU or a large rendering framework merely for visual novelty. Upgrade only when profiling or explanatory needs justify it.

## Risk register

### R1 — Teaching model drifts from CyberSand

Mitigation: label conceptual behavior clearly; structure adapters so real traces/core can replace the model; document algorithm provenance.

### R2 — UI becomes the simulation engine

Mitigation: core tests run without DOM; runner owns advancement; presentation consumes versioned evidence; renderer only consumes snapshots/view models/events.

### R3 — Variable playback changes physics semantics

Mitigation: playback rate changes scheduling of fixed logical steps, not the fixed-step rules themselves. SD-002 includes direct tests that different playback rates yield the same fixed-step state sequence.

### R4 — Phase visualization conflates `not sampled` with `asleep`

Mitigation: distinct future scheduler state, explicit event vocabulary, legend/tests, and redundant visual encoding. SD-004 gives presentation a structured evidence channel so it need not guess from pixels.

### R5 — Parameter experimentation breaks replay

Mitigation: definitions declare mutation timing; pending mutations are deterministic state; canonical scenario events are ordered; reset clears runtime live/next-step mutations back to scenario baseline while retaining explicit reset-required configuration; reset/replay is directly test-covered.

### R6 — Comparison makes unsupported equivalence claims

Mitigation: define each divergence/work metric, preserve provenance, and avoid asserting identical physical output unless guaranteed. SD-004 metrics explicitly distinguish deterministic work evidence from wall-clock speed.

### R7 — Feature creep into a full sand engine

Mitigation: keep material physics deliberately sufficient for explanation; prioritize scheduler visibility and interaction over realism.

### R8 — “Trace-backed” is misread as “visually literal”

Mitigation: product/issue contracts explicitly encourage aesthetic exaggeration while requiring the underlying sampled/sleeping/blocked classifications to come from real model/scheduler state.

### R9 — Cell-level tracing becomes an accidental unbounded event database

Mitigation: SD-004 uses bounded ring retention with explicit sequence/truncation metadata while metrics remain cumulative. SD-009 timeline/history work must choose deliberate retention/replay/checkpoint behavior rather than assuming infinite live history.

### R10 — Frequent evidence reads become presentation overhead

Mitigation: correctness tests prove reads are side-effect free. SD-005 added a bounded recent-evidence presentation read (512 records by default) so live refresh does not clone/process the full retained ring; the canonical full trace contract remains available for explicit history/export use.

## Agent execution protocol

Each implementation issue contains an executable prompt. Agents must also read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, and `docs/VERIFY.md` as applicable.

For every issue: implement completely, test, reconcile docs, open a focused PR, repair attributable CI failures, merge only after required automated checks pass, verify the merge on `main`, and close the issue only when acceptance criteria are truly met.

## Execution ledger

| Work ID | GitHub issue | State | Notes |
|---|---:|---|---|
| SD-001 | [#1](https://github.com/techrote/sandimations/issues/1) | completed | Merged via PR #12; strict webapp/test/CI substrate |
| SD-002 | [#2](https://github.com/techrote/sandimations/issues/2) | completed | PR #13; deterministic world/runner + early functional time controls |
| SD-003 | [#3](https://github.com/techrote/sandimations/issues/3) | completed | PR #14; typed parameters, canonical scenarios/events, Windows shortcuts |
| SD-004 | [#4](https://github.com/techrote/sandimations/issues/4) | completed | PR #15; versioned traces/metrics/provenance + bounded evidence backend seam |
| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | completed | PR #16; evidence-driven responsive shell, registry controls, overlays/inspectors, refined time controls |
| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | ready | Sleep/wake scheduler/demo over landed SD-004/005 evidence + overlay contracts |
| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | ready | Phased sampling scheduler/demo; primary visual explanation over landed SD-004/005 contracts |
| SD-008 | [#8](https://github.com/techrote/sandimations/issues/8) | planned | Comparison mode |
| SD-009 | [#9](https://github.com/techrote/sandimations/issues/9) | planned | Presets/timeline/share |
| SD-010 | [#10](https://github.com/techrote/sandimations/issues/10) | planned | Hardening/deploy |
| SD-011 | [#11](https://github.com/techrote/sandimations/issues/11) | planned | Fidelity bridge |

Update this ledger when material dependency/status changes. Do not use it as a substitute for issue-specific acceptance criteria.
