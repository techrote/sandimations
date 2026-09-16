# Deterministic baseline-versus-optimized comparison

SD-008 adds a comparison harness for the two scheduler teaching stories that already exist in Sandimations. It compares deterministic work and physical state; it does **not** claim measured browser speedup or semantic equivalence with CyberSand.

## Comparison roles

Each comparison starts from one normalized optimized scenario. The optimized side uses that scenario unchanged (`chunk-sleep-wake-v1` or `phased-sampling-v1`). The baseline side is reconstructed from the same seed, world contents, parameter values, and ordered scenario events, but replaces the scheduler with the existing `phase-clock-v1` full-scan reference.

The two `SimulationRunner` instances are independent. Each runner reconstructs its own `LogicalWorld`, PRNG, parameter store, scheduler state, trace sink, and metrics collector. No mutable world or scheduler state is shared between sides.

The scheduler is deliberately the compared variable, so scheduler configuration is not required to be identical. All non-scheduler scenario data remains canonical and equivalent. Both sides receive the same direct inputs and parameter mutation requests through `DeterministicComparison`.

## Shared comparison clock

The comparison synchronizes by deterministic scheduler **tick**, not by each runner's native `frame` counter.

For every optimized scheduler phase/tick:

- the optimized runner executes exactly one of its real scheduler phases;
- the baseline runner executes exactly one complete `phase-clock-v1` frame, which performs one full evaluable-world scan;
- both therefore advance one tick and encounter scripted events scheduled for that tick in the same order.

This matters for phased sampling. A four-phase optimized logical frame is compared with four baseline full scans, one at each corresponding scheduler opportunity. That is the intended work reference for the temporal-amortization story. The baseline runner's native frame counter therefore advances once per comparison tick; it is a **baseline scan-cycle counter**, not an assertion that baseline and optimized native frame meanings are identical.

`stepPhase()` advances one comparison tick. `stepFrame()` and `stepFrames(n)` advance until the optimized side has completed the requested logical frame count while the baseline performs one full scan per intervening optimized phase. Playback uses the same rule. Pause, playback rate, reset, direct inputs, and parameter mutation requests are mirrored to both runners.

## Work metrics and ratio

Both sides retain the existing trace-derived metrics schema and their normal evidence provenance:

- backend ID and backend kind;
- scheduler strategy ID;
- scenario ID;
- cells examined, moved, skipped, and blocked;
- chunk active/sleeping/activated/slept/woken counters where applicable;
- phase start/completion counters;
- deterministic work units.

The current work-unit definition remains the SD-004 definition:

`work units = cell evaluations + scheduler transitions`

The comparison reports:

`optimizedToBaseline = optimized work units / baseline work units`

and, when baseline work is non-zero:

`reductionFraction = (baseline - optimized) / baseline`

A positive reduction fraction means fewer deterministic work units. A negative value means the optimized teaching strategy has accumulated more work units at that point. The UI must describe the sign accurately; it must never turn this ratio into a wall-clock, CPU, GPU, frame-time, or percentage-speedup claim.

The ratio is `null` before the baseline has accumulated any work, avoiding an undefined division-by-zero interpretation.

## Physical-state divergence

Comparison schema version 1 defines one explicit physical divergence metric:

`cell-material-hamming-v1`

For equal-sized worlds, every coordinate is compared by material value. The metric reports:

- `mismatchedCells`: count of coordinates whose material differs;
- `totalCells`: total world cells, including fixed boundaries;
- `normalized = mismatchedCells / totalCells`.

The normalized range is `[0, 1]`:

- `0` means the two world snapshots contain exactly the same material at every coordinate;
- `1` means every coordinate contains a different material.

This is a deterministic state-distance measure, not a correctness score. It does not measure displacement distance, perceptual similarity, conservation error, future convergence, or semantic equivalence. Fixed boundary/unchanged cells are included in the denominator, so they can dilute the normalized ratio. The mismatch count is always shown alongside the normalized value for context.

The divergence result carries both sides' evidence provenance. Presentation consumes this defined metric rather than estimating divergence from canvas pixels.

## Why divergence is expected

The teaching optimizations are not specified as bit-for-bit equivalent schedulers.

- Chunk sleep/wake changes evaluation ordering and can avoid work while chunks are dormant.
- Phased sampling evaluates only one assigned subset per scheduler tick while the full-scan reference evaluates the whole interior at the same comparison tick.

Both strategies may therefore diverge physically from the reference. The comparison exists partly to make that trade-off visible rather than conceal it.

## Comparison scenarios

The browser exposes two SD-008 comparison routes:

- `?scenario=compare-sleep-wake` — full-scan reference versus the SD-006 chunk sleep/wake scenario;
- `?scenario=compare-phased` — full-scan reference versus the SD-007 phased-sampling scenario.

Each route provides synchronized play/pause, phase step, logical-frame step, N-frame step, reset, playback-rate control, split view, and overlay view. Side-by-side metrics identify baseline and optimized provenance. The explanatory copy explicitly distinguishes deterministic operation counts from wall-clock performance.

The split and overlay views reuse the same SD-005 evidence adapter, `buildAppPresentationViewModel()`, and Canvas renderer used by the single-runner demos. They do not duplicate scheduler rules in presentation code.

## Verification contract

SD-008 tests must prove at least:

- deterministic replay produces identical comparison snapshots and runner hashes;
- the runners own independent state;
- ordered scripted inputs/parameter events are observed at the same comparison tick;
- work ratios are deterministic and a phased fixture has a stable, auditable reference ratio;
- chunk sleep produces genuine baseline-relative work avoidance;
- `cell-material-hamming-v1` has the documented range and mismatch semantics;
- reset-required phase-count changes preserve comparison-tick synchronization;
- browser controls keep the comparison synchronized through stepping and reset;
- both comparison routes expose provenance, work metrics, divergence, and non-speedup caveats.

Wall-clock benchmarking remains outside the deterministic comparison contract.