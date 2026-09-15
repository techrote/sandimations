# Verification Contract

Verification must demonstrate both software correctness and explanatory honesty.

## Required automated checks

The mature project should gate merges on, at minimum:

- clean dependency install from lockfile;
- TypeScript typecheck;
- static/lint checks;
- unit tests;
- deterministic replay tests;
- integration tests for runner/parameter/trace boundaries;
- production build;
- selected browser end-to-end smoke tests.

Issues may introduce these incrementally, but no issue may remove or silently weaken checks already present.

## Determinism tests

Fixtures should prove that identical seed + scenario + ordered inputs + parameter mutations + runner commands produce identical:

- canonical state hashes/snapshots;
- trace event sequence;
- deterministic metrics.

Tests should explicitly vary render cadence or call presentation code between core steps to demonstrate that rendering does not change simulation results.

No deterministic core module may call `Math.random()`.

## Time-control tests

Verify the semantics of:

- pause;
- one-phase stepping;
- one-frame stepping;
- N-frame stepping;
- slow/realtime/fast playback command translation;
- reset;
- mutation application at `live`, `next-step`, and `reset-required` boundaries.

Tests should distinguish scheduler phases from logical frames.

## Visualization tests

A renderer need not be pixel-identical across all platforms. Prefer semantic/browser assertions for critical state:

- current frame/phase labels;
- legend and overlay toggles;
- sleeping vs active vs selected-state distinctions;
- controls enabled/disabled appropriately;
- scenario reset and deterministic replay;
- accessible names and keyboard operation.

Use screenshot/visual regression tests selectively for stable explanatory layouts, not as a substitute for state assertions.

## Comparison-mode tests

Baseline and optimized runners must receive identical canonical scenario/input streams. Test that metrics identify their provenance and that divergence is defined/tested rather than inferred from screenshots.

Do not assert that optimized and baseline physical states are identical unless the relevant algorithm contract actually guarantees it.

## Performance evidence

Optimization demonstrations teach *algorithmic work avoidance*. Deterministic counters (cells examined, chunks active, etc.) are primary evidence.

Wall-clock browser benchmarks are secondary and must state environment/noise limitations. Do not use a single timing number as proof of a scheduling optimization.

## Accessibility checks

Critical scheduler states may not be distinguishable solely by hue. Verification should cover:

- keyboard-accessible time controls and parameter inputs;
- visible focus;
- text alternatives/labels for controls and counters;
- sufficient semantic distinction for overlays;
- `prefers-reduced-motion` behavior for nonessential presentation animation;
- responsive layout at representative narrow and desktop widths.

## Per-issue completion evidence

Every implementation PR should record:

1. exact commands run;
2. results;
3. added/changed deterministic fixtures;
4. browser verification where applicable;
5. any known limitations or deliberately deferred acceptance items.

If a required verification cannot be executed, the PR must say why and the issue must remain open unless repository policy explicitly allows an alternative proof.
