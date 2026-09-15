# Chunk Sleep / Wake Teaching Model

SD-006 implements Sandimations' first optimization scheduler: a deterministic, inspectable chunk sleep/wake teaching model. It is designed to explain why spatial dormancy can avoid work and how local activity wakes only the required neighborhood.

This document describes the Sandimations teaching algorithm. It is **not a claim that the current CyberSand C++ scheduler uses these exact chunk sizes, thresholds, transition rules, or update ordering**. The structured evidence and presentation contracts are intentionally replaceable so later verified CyberSand traces or a WASM backend can drive the same UI.

## Core idea

The logical world is divided into fixed square chunks. Each chunk owns an explicit lifecycle state:

- `active` — awake and eligible for cell evaluation;
- `pending-sleep` — currently awake but accumulating quiet frames toward sleep;
- `sleeping` — computationally dormant; its cells are not passed to the sand evaluator;
- `newly-woken` — woke during the just-completed logical frame and remains visually distinct until the next frame begins.

`pending-sleep` is still computationally active. It must not be confused with sleeping.

## Deterministic transition rules

At the beginning of a logical frame:

- per-frame activity counters are cleared;
- `newly-woken` chunks become ordinary `active` chunks.

During the frame:

- successful material moves count as activity for their source chunk;
- a move crossing a chunk boundary also counts as activity in the destination chunk and can wake a sleeping destination neighborhood;
- an explicit deterministic `set-cell` input wakes the configured neighborhood around the affected cell.

At frame completion, every non-sleeping chunk is classified using the registered activity threshold and sleep delay:

| Prior state | Frame condition | Result |
| --- | --- | --- |
| `active` / `pending-sleep` | activity > threshold | `active`, quiet count reset to 0 |
| `active` / `pending-sleep` | activity <= threshold and quiet count < delay | `pending-sleep`, quiet count increments |
| `active` / `pending-sleep` | activity <= threshold and quiet count reaches delay | `sleeping` |
| `sleeping` | no wake cause | remains `sleeping` |
| `sleeping` | local disturbance or cross-chunk activity reaches it | `newly-woken`, quiet count reset to 0 |
| `newly-woken` | same frame completion | remains `newly-woken` for presentation |
| `newly-woken` | next frame begins | `active` |

All transitions derive from deterministic simulation state, registered parameters, and ordered inputs. Browser timing and rendering do not participate.

## Registered parameters

SD-006 adds four schema-driven parameters:

- `scheduler.chunk.size` — integer, default `8`, **reset-required**. Rebuilds the fixed chunk partition on Reset.
- `scheduler.chunk.sleep-delay` — integer, default `3`, **next-step**. Number of consecutive quiet frames required before sleeping.
- `scheduler.chunk.activity-threshold` — integer, default `0`, **next-step**. A frame with more moves than this threshold is considered active.
- `scheduler.chunk.wake-radius` — integer chunk radius, default `1`, **next-step**. Controls the neighborhood woken by local or cross-chunk activity.

The existing SD-005 registry-generated parameter UI exposes the same mutation timing rather than creating scheduler-specific control state.

## Work avoidance

The optimization is real within the teaching model: `sleeping` chunks are omitted from `LogicalWorld.stepSandRegion()` entirely. No hidden full-cell scan is performed behind the visualization.

Consequently:

- the deterministic `cells.examined` counter stops increasing for fully sleeping regions;
- sleeping chunk counts come from scheduler state;
- `chunk-slept` and `chunk-woken` metrics come from the transition events that actually occurred.

Unit coverage explicitly settles every chunk, records the cell-examination count, advances additional frames, and verifies that the count does not change while all chunks remain asleep.

## Wake causes and trace evidence

SD-006 uses the SD-004 trace protocol rather than a strategy-specific presentation channel.

The scheduler emits:

- `chunk-activated` when the deterministic chunk partition is initialized;
- `chunk-slept` when a quiet chunk reaches its sleep delay;
- `chunk-woken` when a sleeping chunk wakes.

`chunk-woken` may carry additive structured cause evidence:

- `causeCell` for an explicit local disturbance;
- `causeChunk` for cross-chunk material activity.

The event `reason` distinguishes the teaching causes `input-disturbance` and `cross-chunk-activity`.

## Demonstration scenario

The live SD-006 scenario is `sd-006-chunk-sleep-wake` using strategy `chunk-sleep-wake-v1`.

With the defaults it creates a `32×20` world split into `8×8` chunks. The initial material configuration settles, allowing chunks to enter `pending-sleep` and then `sleeping`. At scheduler tick `18`, a deterministic scripted input places sand at cell `(24, 3)`. With wake radius `1`, only the bounded neighboring chunk region wakes.

The intended visible sequence is:

1. awake chunk boundaries are visible while initial work settles;
2. quiet chunks move through pending sleep into the sleeping cross-hatched state;
3. cell-examination work stops for sleeping chunks;
4. the local scripted disturbance wakes only its configured neighborhood;
5. newly-woken chunks receive the existing SD-005 wake visual treatment and deterministic counters change;
6. after local work settles again, those regions return toward sleep.

## Presentation contract

Chunk state is passed through `TeachingModelEvidenceBackendV1` into the generic SD-005 presentation view model. Canvas rendering receives only prepared chunk bounds/lifecycle facts plus trace-backed cell overlays.

The renderer does not calculate whether a chunk should sleep or wake.

Current presentation cues include:

- active chunk — solid low-emphasis boundary;
- pending-sleep — dashed countdown-style boundary;
- sleeping — dashed boundary plus sleeping cell cross-hatch overlay;
- newly-woken — emphasized boundary plus double-frame wake overlay.

The metrics inspector exposes awake, sleeping, and cumulatively woken chunk counts alongside cell-work metrics.

## Ordering and fidelity caveat

The teaching scheduler evaluates awake chunks in deterministic bottom-row-to-top-row, left-to-right chunk order; each chunk performs its normal bottom-up cell scan internally. This is deliberately simple and inspectable, but it is not guaranteed to produce identical physical evolution to the baseline global full scan because chunk grouping changes update order at chunk boundaries.

That divergence is acceptable for this teaching strategy and will be measured explicitly in SD-008 comparison work rather than hidden. Sandimations must not describe the chunk scheduler as physically identical to baseline unless a later strategy specifically guarantees that property.

## Verification expectations

SD-006 is expected to preserve these properties:

- same scenario/seed/parameters/commands reproduce the same chunk states, traces, metrics, and deterministic state hash;
- sleeping chunks perform no cell evaluation;
- wake radius affects only the documented bounded neighborhood;
- wake traces record structured causes;
- reset reproduces the original transition history;
- visual sleeping/newly-woken state comes from scheduler evidence rather than renderer inference;
- playback rate and render cadence cannot affect scheduler transitions.
