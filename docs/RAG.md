# Sandimations RAG / Agent Context & Execution Plan

Repository-native continuation context for autonomous implementation. The relevant GitHub issue, `AGENTS.md`, this file, architecture/product/verification contracts, and current repository state are authoritative over chat history.

## Mission

Build an interactive browser application that makes selected CyberSand performance ideas intuitive through deterministic, inspectable teaching simulations. Primary stories are chunk sleep/wake and phased sampling, with direct time manipulation, trace-driven overlays, baseline comparison, scenario/timeline tooling, and a replaceable evidence backend.

## Non-negotiable architecture

- **Trace/model separation:** presentation consumes structured model/scheduler facts; it does not reproduce scheduler algorithms.
- **Explicit time:** pause, playback rate, phase step, frame step, and N-frame step are runner/controller operations, never renderer tricks.
- **Schema-driven parameters:** typed definitions own defaults, bounds/options, serialization, and mutation timing.
- **Replaceable evidence backend:** the TypeScript teaching runner is not the permanent presentation dependency; future recorded CyberSand traces or C++/WASM must fit the evidence boundary.
- **Visual expressiveness with factual provenance:** highlights, trails, and pulses may exaggerate true evidence, but may not invent scheduler decisions.
- **Wall-clock isolation:** browser profiling remains separate from deterministic work counters, state, and replay.

## Release milestones

### M0 — repository substrate — complete

SD-001 established TypeScript/Vite, tests, CI, deterministic-core boundary checks, browser smoke coverage, and repository documentation conventions.

### M1 — deterministic substrate and early controls — complete

SD-002 added the seeded model, explicit runner/clock, deterministic reset/replay, and functional speed/phase/frame controls. SD-003 added typed parameter/scenario contracts and deterministic scripted events. SD-004 added versioned trace/metrics/provenance, bounded evidence retention, and replaceable backend/presentation evidence interfaces.

### M2 — explanatory schedulers — complete

SD-005 built the generic evidence-driven presentation shell. SD-006 added real chunk sleep/wake work avoidance and lifecycle evidence. SD-007 added real sparse phased sampling, scheduler-owned selection/coverage evidence, and a final repair keeping `evaluated-now` overlays exclusively trace-backed.

### M3 — comparison and presentation tooling — complete through SD-009

SD-008 added independent baseline/optimized runners, deterministic work comparison, explicit material divergence, and split/overlay views. SD-009 added the scenario library, bounded trace-backed timeline, versioned shareable URL state, and presentation/demo mode.

### M3 release hardening — SD-010 in progress, externally blocked

SD-010 has implemented accessibility/responsive hardening, bounded scenario input, browser-only presentation profiling, security-audit gating, GitHub Pages base-path build/smoke checks, documentation reconciliation, and a Pages deployment workflow. A measured Canvas batching experiment failed to demonstrate an improvement and was reverted.

The remaining release gate is external repository configuration: GitHub Pages is not enabled. `actions/configure-pages` cannot create the Pages site with the workflow token; `enablement: true` fails with `403 Resource not accessible by integration`. Per SD-010's explicit stop condition, issue #10 and PR #22 remain open until a repository administrator enables Pages with GitHub Actions as the source and the public `/sandimations/` deployment is verified. See `docs/RELEASE_HARDENING.md`.

### M4 — fidelity bridge

SD-011 proves external trace ingestion and/or a C++/WASM adapter can drive the existing evidence/presentation contract without architectural replacement. It begins only after SD-010 is genuinely complete.

## Work graph

| Work ID | Issue | Scope | Depends on | Status |
| --- | ---: | --- | --- | --- |
| SD-001 | #1 | Bootstrap TypeScript/Vite/test/CI substrate | none | complete |
| SD-002 | #2 | Deterministic world, runner, early speed/step controls | SD-001 | complete |
| SD-003 | #3 | Typed parameter registry and scenario schema | SD-001 | complete |
| SD-004 | #4 | Trace protocol, metrics, backend/presentation evidence | SD-001 + SD-002/003 | complete |
| SD-005 | #5 | Evidence-driven UI shell, Canvas, controls, inspectors | SD-002/003/004 | complete |
| SD-006 | #6 | Chunk sleep/wake teaching scheduler | SD-002/004 + UI integration | complete |
| SD-007 | #7 | Sparse phased-sampling teaching scheduler | SD-002/004 + UI integration | complete |
| SD-008 | #8 | Baseline/optimized comparison and divergence | SD-006/007 | complete |
| SD-009 | #9 | Scenario library, timeline, share state, presentation mode | SD-003/005/006/007/008 | complete |
| SD-010 | #10 | Accessibility, performance, browser, static-deployment hardening | SD-005 through SD-009 | in progress; Pages enablement blocker |
| SD-011 | #11 | External trace / C++-WASM fidelity bridge proof | SD-004/008 + release foundation | queued after SD-010 |

## Global acceptance invariants

Every implementation must preserve:

- deterministic core independent of render cadence and wall time;
- explicit seeded PRNG and no hidden core randomness;
- physical simulation state distinct from scheduler state;
- scheduler/model facts distinct from presentation logic;
- scheduler phase distinct from logical frame;
- typed `live`, `next-step`, and `reset-required` parameter semantics;
- reproducible scenario reset/replay and canonical serialization;
- versioned trace/metrics/provenance contracts;
- observation/backend reads cannot perturb future execution;
- baseline/optimized runners remain independent and provenance-bound;
- deterministic work counters remain distinct from wall-clock profiling;
- retained histories and release inputs are explicitly bounded;
- simplified teaching behavior is never mislabeled as exact CyberSand C++ behavior;
- critical scheduler distinctions are keyboard-accessible and not color-only;
- automated verification grows with capability and is not silently weakened.

## Current released behavior through SD-009

### Time and controls

The nonlinear speed slider devotes half its travel to `1/32×` through `1×` and reaches `16×` above that. Core controls expose pause/play, exact phase step, exact frame step, configurable N-frame step, and deterministic reset. Playback rate affects browser scheduling, never fixed-step physics.

### Parameters and scenarios

The registry covers sand enable/tie-break/seed variation, chunk size/sleep/activity/wake settings, and phased-sampling phase count/pattern. Scenario schema version `1` validates and canonicalizes model/world, scheduler configuration, parameter values, ordered deterministic events, and separate presentation defaults.

SD-010 adds release resource ceilings: 512 cells per axis, 65,536 total cells, and 10,000 scripted events. Oversized input fails closed.

### Structured evidence

Trace protocol version `1` records deterministic sequence, frame, phase, tick, provenance, cell-work facts, phase selections, and chunk lifecycle/wake facts. Metrics schema version `1` exposes deterministic teaching work/state from the same execution path. Live trace retention is a bounded 16,384-record ring with explicit truncation metadata; presentation prefers bounded recent-evidence reads.

### Chunk sleep/wake

`chunk-sleep-wake-v1` owns explicit active, pending-sleep, sleeping, and newly-woken chunk state. Sleeping chunks perform no cell evaluation. Local/cross-chunk wake causes are structured evidence. Scan ordering differs from baseline, so physical identity is measured rather than assumed.

### Phased sampling

`phased-sampling-v1` assigns coordinates deterministically to phase buckets and evaluates only the selected bucket each scheduler tick. Selection and coverage presentation derive from scheduler/trace evidence, not geometry reconstruction in Canvas.

### Comparison

SD-008 creates independent full-scan reference and optimized runners from equivalent canonical non-scheduler scenario data. Deterministic work ratios use the SD-004 work-unit definition. Physical difference uses `cell-material-hamming-v1`; zero divergence at one instant is never treated as proof of semantic equivalence.

### Scenario experience

SD-009 composes scenario selection, single/comparison runtimes, bounded trace-backed timeline inspection, versioned shareable URL state, and presentation/demo scripting. Timeline selection is observational and never rewinds physics. Share state replays canonical scenario/parameters/tick rather than serializing arbitrary DOM/runtime state.

## SD-010 hardening state

Implemented on PR #22:

- representative responsive checks at 360, 390, 768, and 1440 pixels;
- keyboard/focus/accessible-name coverage for scenario, timeline, and core controls;
- redundant non-color scheduler-state cues and reduced-motion verification;
- comparison contrast and narrow-layout containment corrections;
- bounded 120-sample `world-canvas`/`playback-ui` diagnostic channel;
- representative logged browser performance profiles;
- scenario dimension/cell/event ceilings;
- clean dependency audit gate with `npm audit --audit-level=high`;
- GitHub Pages production base `/sandimations/` build plus dedicated Playwright smoke;
- Pages deployment workflow with failures surfaced;
- README, architecture, product, scenario, verification, and release-evidence reconciliation.

Performance evidence is in `docs/RELEASE_HARDENING.md`. Batching Canvas grid rectangles into one path regressed the representative hosted-runner profiles, so the experiment was reverted rather than retained as speculative optimization.

## Remaining blocker procedure

A repository administrator must enable GitHub Pages for `techrote/sandimations` and select **GitHub Actions** as the build/deployment source. Then:

1. rerun the Pages workflow on PR #22, or trigger it with a branch commit;
2. require its build/base-path smoke, configure/upload, and deploy jobs to pass;
3. verify `https://techrote.github.io/sandimations/` loads the released scenario experience;
4. confirm final PR CI is green;
5. remove the temporary feature-branch Pages trigger before merge so routine deployment follows `main`;
6. make PR #22 ready and merge only with every required check green;
7. verify the merge and post-merge CI/Pages deployment on `main`, then close #10;
8. only then advance to SD-011.

## Key risks

- **R1 — presentation drift:** mitigate with evidence-only overlay/timeline contracts and tests.
- **R2 — timing conflation:** wall-clock diagnostics remain outside deterministic metrics/state.
- **R3 — unbounded sessions:** trace, timeline, diagnostic, replay, and scenario-input bounds are explicit.
- **R4 — repository-subpath deployment:** build and smoke under exact `/sandimations/` base plus mandatory public verification.
- **R5 — future backend rewrite pressure:** preserve `EvidenceBackendV1` and the presentation-adapter seam.

## Resume rule

If SD-010 is still open, inspect #10, PR #22, current CI, and Pages configuration first. Do not work around the public-deployment stop condition by merging unverified code. Once #10 is genuinely complete, SD-011 becomes the highest-priority dependency-ready issue.
