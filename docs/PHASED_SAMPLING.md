# SD-007 Phased Sampling Teaching Model

SD-007 implements `phased-sampling-v1`, an explicit Sandimations teaching scheduler for temporal amortization. It is designed to make sparse, phase-distributed work directly visible and inspectable. It is **not** a claim that the current CyberSand C++ engine uses these exact phase formulas, phase counts, update ordering, or thresholds.

## Core rule

Every evaluable interior cell belongs to exactly one scheduler phase. At a given phase, the model receives only that phase's precomputed coordinate bucket.

There is no hidden full-world scan followed by a visual mask. `PhasedSamplingScheduler.beginPhase()` returns the selected coordinates and `LogicalWorld.stepSandCells()` evaluates only those coordinates. The resulting `cell-examined`, move, skip, and blocked trace records therefore describe work that actually ran.

For this teaching model, an **active cell** means an evaluable scheduler candidate: an interior coordinate that the baseline full-scan model would consider. It does not mean that the coordinate currently contains moving sand. Empty, wall, and sand candidates all participate in the partition because the comparison is about scan work, not only material occupancy.

## Partition patterns

The default phase count is `4`; the registered range is `2..8`. Phase count and pattern are `reset-required` parameters so a logical frame cannot change partition topology halfway through its phase cycle.

### Diagonal lattice

Default pattern:

```text
phase(x, y) = (x + y) mod phaseCount
```

For four phases this creates a visibly interleaved diagonal lattice. Consecutive `Step phase` operations move the bright evaluated subset across the lattice while all other scheduler candidates remain explicitly classified as active-but-deferred.

### Vertical stripes

```text
phase(x, y) = (x - 1) mod phaseCount
```

This deliberately simple alternative makes spatial grouping especially obvious and is useful for comparing how presentation changes while the same phase contract remains intact.

### Seeded hash

A deterministic 32-bit spatial hash of `(x, y, seed)` assigns each candidate to one phase. The same seed/configuration reproduces the same partition. Different seeds may produce different partitions. The regular lattice/stripe patterns do not depend on seed.

## Ordering within a phase

Each phase bucket is precomputed and sorted deterministically bottom row to top row, then left to right within a row. The bucket is passed directly to the model.

This differs from the baseline global scan ordering. A grain moved into a coordinate belonging to a later phase may therefore be considered again later in the same logical frame. Sandimations does not claim physical identity with the baseline model. SD-008 comparison work must measure divergence rather than assume equivalence.

## Time semantics

- `tick` advances once per scheduler phase.
- `stepPhase()` pauses playback and executes exactly one selected bucket.
- `stepFrame()` executes enough phases to complete exactly one logical frame.
- With four phases, one frame is phases `0,1,2,3` and therefore four ticks.
- Changing phase count requires Reset; the new count becomes the number of phase steps in subsequent logical frames.

Continuous browser playback also advances at phase cadence. The driver scales phase frequency by the configured phase count, so `1×` retains the same target logical-frame rate regardless of whether a frame has two, four, or eight phases. Deep slow motion therefore exposes individual phase transitions instead of collapsing a whole cycle into one render update.

Browser cadence remains presentation-only: it asks the deterministic runner to advance phases but is not an input to scheduler decisions.

## Evidence and metrics

Each executed phase emits:

1. `phase-started`;
2. `phase-selection` with pattern, phase count, selected-candidate count, and total active-candidate count;
3. exact cell-level work evidence from the selected coordinate list;
4. `phase-completed`.

The exact evaluated set is the set of `cell-examined` records at that tick. A test requires the examined-record count to equal the scheduler's selected count.

Cumulative deterministic work metrics continue to use actual `cell-examined` records. They do not convert the selection ratio into a claimed wall-clock speedup.

## Visualization contract

The evidence backend exposes scheduler-owned phase assignments and each cell's `lastSelectedTick`. Presentation uses those facts to construct:

- **Evaluated now** — cells actually examined on the latest executed phase; bright inset frame + center dot.
- **Active, another phase** — scheduler candidates assigned to another phase; faint diagonal slash.
- **Temporal coverage trail** — trace-backed fading fill based on when each cell was last selected during the current/recent phase cycle.
- **Phase-position cue** — a small per-cell marker derived from the scheduler-assigned phase.
- **Selected now / Active deferred / Cycle coverage / Sampling pattern** counters.

The renderer may exaggerate brightness, persistence, spacing, or pulse duration, but it does not recompute the phase assignment or invent an evaluated cell.

`Sleeping` remains a structurally distinct scheduler category. The standalone phased teaching scenario does not infer sleep from “not selected this phase”; active-but-deferred and sleeping are different states and different legend entries.

## Scenarios

### `sd-007-phased-sampling-slow`

Default route. Uses four-phase diagonal-lattice sampling with a default playback rate of `0.25×`. It is intended for watching the sparse evaluated set move, pausing, and stepping phase by phase.

### `sd-007-phased-sampling-normal`

Available through `?scenario=phased-normal`. Uses the same deterministic world, seed, scheduler, and partition but defaults to `1×`, demonstrating that macroscopic sand motion remains visually coherent while work is distributed across phase subsets.

The retained SD-006 demonstration is available through `?scenario=chunk-sleep-wake` until the later scenario-library work provides a proper selector.

## Determinism requirements

For the same scenario, seed, phase count, pattern, ordered inputs, parameter mutations, and runner commands, Sandimations must reproduce:

- phase assignment for every candidate;
- selected coordinate sequence;
- world state;
- trace sequence;
- deterministic metrics;
- scheduler snapshot and state hash behavior.

Presentation/backend reads and browser render cadence cannot alter these results.

## Fidelity boundary

The scheduler is intentionally simple enough to explain visually and test exhaustively. Until authoritative CyberSand instrumentation or C++/WASM evidence is connected, label it as **Phased Sampling — Teaching Model**. Later real traces should drive the same presentation vocabulary through the evidence adapter rather than requiring a renderer rewrite.
