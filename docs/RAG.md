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

### M1 — Deterministic explanatory substrate + early interactive controls — in progress

SD-002 established the seeded teaching model, explicit runner/clock, phase and frame stepping, deterministic hashes/reset/replay, and **working browser speed slider and stepping controls**. SD-003 added the typed parameter registry, deterministic mutation timing, versioned/canonical scenario serialization, scripted event replay, and fixture scenarios. SD-004 is the remaining M1 work: trace protocol, deterministic metrics, and backend/presentation adapter contracts.

### M2 — First explanatory app

Responsive UI shell, Canvas presentation, polished controls/legend/inspectors, chunk sleep/wake demo, phased-sampling demo, and stable scenario presets.

### M3 — Comparative and presentation tooling

Baseline-vs-optimized mode, divergence/work metrics, timeline/phase inspector, shareable scenario state, presentation mode, accessibility hardening, and deployable static build.

### M4 — Fidelity bridge

Versioned external trace ingestion and/or C++/WASM adapter proof so the explanatory UI can be driven by real CyberSand evidence later without architectural replacement.

## Work graph

Stable work IDs and their GitHub issues form the execution graph.

| Work ID | Issue | Scope | Depends on | Parallelism |
|---|---:|---|---|---|
| SD-001 | [#1](https://github.com/techrote/sandimations/issues/1) | Bootstrap TypeScript/Vite/test/CI substrate | none | first |
| SD-002 | [#2](https://github.com/techrote/sandimations/issues/2) | Deterministic world, runner, **early functional speed/step control vertical slice** | SD-001 | complete |
| SD-003 | [#3](https://github.com/techrote/sandimations/issues/3) | Typed parameter registry, scenario schema, serialization | SD-001 | complete |
| SD-004 | [#4](https://github.com/techrote/sandimations/issues/4) | Trace protocol, metrics, backend/presentation adapter contracts | SD-001; consume SD-002/003 contracts | ready |
| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | UI shell, Canvas renderer, legend, inspectors, **refinement of SD-002 time controls** | SD-002, SD-003, SD-004 | presentation track |
| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | Chunk sleep/wake scheduler teaching model + demo | SD-002, SD-004; integrates with SD-003/005 | can overlap SD-007 |
| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | Phased-sampling teaching model + **primary visual/phase-step explanation** | SD-002, SD-004; integrates with SD-003/005 | can overlap SD-006 |
| SD-008 | [#8](https://github.com/techrote/sandimations/issues/8) | Baseline-vs-optimized comparison and divergence/work instrumentation | SD-006, SD-007 | after both demos expose stable metrics |
| SD-009 | [#9](https://github.com/techrote/sandimations/issues/9) | Scenario presets, timeline, shareable URL state, presentation mode | SD-003, SD-005, SD-006, SD-007; comparison scenarios may use SD-008 | after stable scenario/UI contracts |
| SD-010 | [#10](https://github.com/techrote/sandimations/issues/10) | Accessibility, performance, browser hardening, static deployment | SD-005 through SD-009 | final release hardening |
| SD-011 | [#11](https://github.com/techrote/sandimations/issues/11) | External trace / future C++-WASM fidelity bridge proof | SD-004, SD-008 | may follow first public release |

## Concurrency rules

- SD-001, SD-002, and SD-003 are complete substrate work.
- SD-004 is now the next substrate issue and must consume the landed runner/parameter/scenario contracts rather than duplicate them.
- SD-006 and SD-007 are the main safe parallel pair once SD-004 and the generic presentation seams exist.
- SD-005 should establish the generic presentation shell and **adopt/refine the already-working SD-002 controls**, not replace their semantics or defer their functionality.
- SD-007 should make the existing phase/tick control visually meaningful by exposing real phased-scheduler selections; it should not create a competing stepping path.
- SD-008 requires both scheduler stories to expose stable metrics.
- SD-009 must not become a second state-management system; URL/preset state serializes canonical scenario/parameter/view models.
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
- chunks active / sleeping / woken;
- current phase and phase count;
- work ratio relative to baseline;
- deterministic state divergence where defined.

Browser CPU/frame timings may be added as secondary profiling information with environment caveats.

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

Mitigation: core tests run without DOM; runner owns advancement; renderer only consumes snapshots/view models/events.

### R3 — Variable playback changes physics semantics

Mitigation: playback rate changes scheduling of fixed logical steps, not the fixed-step rules themselves. SD-002 includes direct tests that different playback rates yield the same fixed-step state sequence.

### R4 — Phase visualization conflates `not sampled` with `asleep`

Mitigation: distinct state model, legend, tests, and redundant visual encoding.

### R5 — Parameter experimentation breaks replay

Mitigation: definitions declare mutation timing; pending mutations are deterministic state; canonical scenario events are ordered; reset clears runtime live/next-step mutations back to scenario baseline while retaining explicit reset-required configuration; reset/replay is directly test-covered.

### R6 — Comparison makes unsupported equivalence claims

Mitigation: define each divergence/work metric, preserve provenance, and avoid asserting identical physical output unless guaranteed.

### R7 — Feature creep into a full sand engine

Mitigation: keep material physics deliberately sufficient for explanation; prioritize scheduler visibility and interaction over realism.

### R8 — “Trace-backed” is misread as “visually literal”

Mitigation: product/issue contracts explicitly encourage aesthetic exaggeration while requiring the underlying sampled/sleeping/blocked classifications to come from real model/scheduler state.

## Agent execution protocol

Each implementation issue contains an executable prompt. Agents must also read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, and `docs/VERIFY.md` as applicable.

For every issue: implement completely, test, reconcile docs, open a focused PR, repair attributable CI failures, merge only after required automated checks pass, verify the merge on `main`, and close the issue only when acceptance criteria are truly met.

## Execution ledger

| Work ID | GitHub issue | State | Notes |
|---|---:|---|---|
| SD-001 | [#1](https://github.com/techrote/sandimations/issues/1) | completed | Merged via PR #12; strict webapp/test/CI substrate |
| SD-002 | [#2](https://github.com/techrote/sandimations/issues/2) | completed | PR #13; deterministic world/runner + early functional time controls |
| SD-003 | [#3](https://github.com/techrote/sandimations/issues/3) | completed | PR #14; typed parameters, canonical scenarios/events, Windows shortcuts |
| SD-004 | [#4](https://github.com/techrote/sandimations/issues/4) | ready | Next substrate issue: trace/metrics/adapters over landed SD-002/003 contracts |
| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | planned | UI/presentation shell; refine early controls |
| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | planned | Sleep/wake demo |
| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | planned | Phased sampling demo; primary visual explanation |
| SD-008 | [#8](https://github.com/techrote/sandimations/issues/8) | planned | Comparison mode |
| SD-009 | [#9](https://github.com/techrote/sandimations/issues/9) | planned | Presets/timeline/share |
| SD-010 | [#10](https://github.com/techrote/sandimations/issues/10) | planned | Hardening/deploy |
| SD-011 | [#11](https://github.com/techrote/sandimations/issues/11) | planned | Fidelity bridge |

Update this ledger when material dependency/status changes. Do not use it as a substitute for issue-specific acceptance criteria.
