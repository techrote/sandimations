from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected documentation target missing in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "README.md",
    """SD-005 builds the first reusable explanatory application shell on the completed deterministic/evidence substrate. The browser now combines the Canvas world with trace-backed overlays, deterministic work metrics and provenance, state inspectors, registry-generated parameter controls, recent evidence, and the refined time-control strip.

The existing runner semantics are preserved: play/pause, the nonlinear `1/32×` through `16×` speed slider, an obvious `1×` return, single-phase stepping, single-frame stepping, configurable N-frame stepping, and deterministic reset all use the original SD-002 controller/runner path. Keyboard shortcuts provide the same operations without creating a second timing model.

Parameter widgets are generated from the SD-003 registry and visibly distinguish `live`, `next-step`, and `reset-required` behavior, including current versus queued values. Canvas overlays are built only from SD-004 evidence. The generic visual vocabulary already covers evaluated-now, active-other-phase, sleeping/inactive, newly-woken, and blocked/rejected with redundant non-color cues; the current full-scan teaching backend truthfully renders only states it actually emits rather than fabricating future scheduler facts.

Chunk sleep/wake scheduling and real phased-sampling selection are deliberately not implemented yet. The default scenario still has one phase per frame; the phased fixture uses a four-phase clock but explicitly does not select sparse cell subsets until SD-007.
""",
    """SD-006 adds the first real optimization scheduler on top of the SD-005 evidence-driven shell: a deterministic chunk sleep/wake teaching model. The live demo visibly settles fixed chunks into computational dormancy, wakes only the configured neighborhood around a scripted local disturbance, and allows quiet regions to return toward sleep.

Sleeping chunks genuinely perform no cell evaluation; this is not a renderer mask over a hidden full scan. Chunk lifecycle state (`active`, `pending-sleep`, `sleeping`, `newly-woken`), transition causes, and awake/sleeping/woken counters all come from scheduler state and SD-004 trace/metrics evidence. The Canvas only renders those facts.

The existing SD-002/005 time controls and registry-driven parameter controls remain the only interaction path. SD-006 adds registered chunk size, sleep delay, activity threshold, and wake-neighborhood controls with explicit reset/next-step timing. The live metrics inspector now includes awake, sleeping, and cumulatively woken chunk counts.

Real phased-sampling selection is still deliberately deferred to SD-007. Its four-phase fixture remains a clock-only precursor until the genuine sparse scheduler lands.
""",
)

replace_once(
    "README.md",
    """- `simulation.seed-variant` — integer, applied on the next explicit reset.
""",
    """- `simulation.seed-variant` — integer, applied on the next explicit reset;
- `scheduler.chunk.size` — integer chunk dimension, applied on explicit reset;
- `scheduler.chunk.sleep-delay` — quiet-frame delay, applied at the next scheduler step;
- `scheduler.chunk.activity-threshold` — move threshold defining a quiet frame, applied at the next scheduler step;
- `scheduler.chunk.wake-radius` — chunk-radius for local/cross-chunk wake propagation, applied at the next scheduler step.
""",
)

replace_once(
    "README.md",
    """The protocol also reserves explicit `chunk-activated`, `chunk-slept`, and `chunk-woken` evidence for SD-006 rather than making future UI infer chunk state from appearance.

Trace and metrics snapshots carry backend/strategy/scenario provenance. Deterministic metrics count cell work, future chunk transitions/state, and phase progress. These counters are explanatory algorithmic-work evidence; they are deliberately separate from wall-clock CPU/GPU/browser profiling.
""",
    """SD-006 now emits explicit `chunk-activated`, `chunk-slept`, and `chunk-woken` evidence from the real teaching scheduler. Wake events can include structured cause-cell or cause-chunk evidence, so presentation can explain why a region woke without re-running scheduler logic.

Trace and metrics snapshots carry backend/strategy/scenario provenance. Deterministic metrics count cell work, actual chunk transitions/state, and phase progress. These counters are explanatory algorithmic-work evidence; they are deliberately separate from wall-clock CPU/GPU/browser profiling.
""",
)

replace_once(
    "README.md",
    "SD-006 and SD-007 can now add chunk sleep/wake and genuine phased sampling through the existing evidence/view-model path instead of introducing scheduler logic into the UI.",
    "SD-006 now drives this shell with real chunk sleep/wake evidence. SD-007 is the next primary visualization milestone and will add genuine sparse phased sampling through the same evidence/view-model path.",
)

replace_once(
    "README.md",
    "- [`docs/TRACE_PROTOCOL.md`](docs/TRACE_PROTOCOL.md) — trace, metrics, provenance, retention, and evidence-adapter contract.\n",
    "- [`docs/TRACE_PROTOCOL.md`](docs/TRACE_PROTOCOL.md) — trace, metrics, provenance, retention, and evidence-adapter contract.\n- [`docs/CHUNK_SLEEP_WAKE.md`](docs/CHUNK_SLEEP_WAKE.md) — SD-006 teaching scheduler rules, parameters, wake causes, visualization contract, and fidelity caveats.\n",
)

replace_once(
    "docs/RAG.md",
    """SD-005 completed the generic evidence-driven application shell: responsive Canvas presentation, polished time controls, registry-derived parameter controls, deterministic work/provenance inspectors, recent evidence, and a non-color-only overlay vocabulary. SD-006 and SD-007 are now both ready to add the chunk sleep/wake and phased-sampling schedulers/demos through those landed presentation/evidence contracts.
""",
    """SD-005 completed the generic evidence-driven application shell. SD-006 adds the first real optimization demo: deterministic chunk sleep/wake state, actual avoided cell evaluation while regions sleep, local/cross-chunk wake causes, registered scheduler parameters, chunk metrics, and trace-backed visualization. SD-007 is now the next primary target: the signature phased-sampling scheduler and phase-by-phase visual explanation.
""",
)

replace_once(
    "docs/RAG.md",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | Chunk sleep/wake scheduler teaching model + demo | SD-002, SD-004; integrates with SD-003/005 | ready; may overlap SD-007 |",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | Chunk sleep/wake scheduler teaching model + demo | SD-002, SD-004; integrates with SD-003/005 | complete |",
)
replace_once(
    "docs/RAG.md",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | Phased-sampling teaching model + **primary visual/phase-step explanation** | SD-002, SD-004; integrates with SD-003/005 | ready; may overlap SD-006 |",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | Phased-sampling teaching model + **primary visual/phase-step explanation** | SD-002, SD-004; integrates with SD-003/005 | next |",
)

replace_once(
    "docs/RAG.md",
    """- SD-006 and SD-007 are now the main safe parallel pair. Both should extend the common evidence/overlay vocabulary instead of introducing a competing state or stepping path.
- SD-005 must **adopt/refine the already-working SD-002 controls**, not replace their simulation semantics or defer their functionality.
- SD-006 must emit chunk activate/sleep/wake facts through the SD-004 event vocabulary rather than inventing a parallel evidence channel.
""",
    """- SD-006 is complete and demonstrates the pattern later schedulers must follow: scheduler-owned state, real work avoidance, SD-004 evidence, and generic SD-005 presentation.
- SD-007 is the next primary issue and should extend the common evidence/overlay vocabulary instead of introducing a competing state or stepping path.
- SD-005 must **adopt/refine the already-working SD-002 controls**, not replace their simulation semantics or defer their functionality.
- SD-006 emits chunk activate/sleep/wake facts through the SD-004 event vocabulary; later work must preserve this common evidence channel.
""",
)

marker = "## Initial UX target\n"
rag = Path("docs/RAG.md")
text = rag.read_text()
section = """## SD-006 chunk sleep/wake scheduler

SD-006 introduces strategy `chunk-sleep-wake-v1` as an explicitly labelled teaching model. A fixed chunk partition owns `active`, `pending-sleep`, `sleeping`, and `newly-woken` lifecycle states. Quiet-frame delay, activity threshold, wake radius, and reset-required chunk size are registered SD-003 parameters.

Sleeping chunks are excluded from cell evaluation entirely, so reduced `cells.examined` is genuine deterministic work avoidance. Local deterministic inputs wake a bounded neighborhood and cross-chunk material motion can propagate wake state. `chunk-woken` records carry optional cause-cell/cause-chunk evidence. Scheduler state is included in the deterministic hash and is reproduced by reset/replay tests.

The live scenario `sd-006-chunk-sleep-wake` settles chunks, applies a scripted disturbance at tick 18 / cell `(24,3)`, exposes awake/sleeping/woken counters, then demonstrates regions returning toward sleep. Canvas chunk boundaries and cell overlays come from backend/presentation state; the renderer does not decide lifecycle state.

Chunk-scoped evaluation changes update ordering relative to the baseline global scan, so physical identity is **not** claimed. SD-008 will measure divergence explicitly. See `docs/CHUNK_SLEEP_WAKE.md` for the full teaching-model contract and fidelity caveat.

"""
if marker not in text:
    raise SystemExit("RAG insertion marker missing")
rag.write_text(text.replace(marker, section + marker, 1))

replace_once(
    "docs/RAG.md",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | ready | Sleep/wake scheduler/demo over landed SD-004/005 evidence + overlay contracts |",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | completed | PR #17; real chunk dormancy/wake teaching scheduler, parameters, trace causes, metrics and visualization |",
)
replace_once(
    "docs/RAG.md",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | ready | Phased sampling scheduler/demo; primary visual explanation over landed SD-004/005 contracts |",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | ready / next | Phased sampling scheduler/demo; primary visual explanation over landed SD-004/005/006 contracts |",
)

replace_once(
    "docs/TRACE_PROTOCOL.md",
    """| `chunk-woken` | stable chunk identity/coordinate and wake reason |

The chunk vocabulary is defined before SD-006 so later sleep/wake work can emit facts through the same presentation-facing contract. The current SD-004 teaching runner has no chunk scheduler and therefore does not fabricate chunk events.
""",
    """| `chunk-woken` | stable chunk identity/coordinate, wake reason, and optional structured cause chunk/cell |

SD-006 now emits the chunk vocabulary from the live `chunk-sleep-wake-v1` teaching scheduler. `chunk-woken` may add `causeCell` for an explicit local disturbance or `causeChunk` for cross-chunk material activity. These fields are additive optional protocol-v1 evidence; presentation must not infer a missing cause.
""",
)

replace_once(
    "docs/TRACE_PROTOCOL.md",
    """The SD-004 teaching model emits phase boundaries around the real runner phase. On the phase that completes a logical frame, the existing full sand scan emits observations directly from the model loop:
""",
    """The teaching backend emits phase boundaries around the real runner phase. Baseline `phase-clock-v1` uses the existing full sand scan. SD-006 `chunk-sleep-wake-v1` invokes the same cell model only for chunks that are not sleeping. In both strategies, the work that actually runs emits observations directly from the model loop:
""",
)

replace_once(
    "docs/TRACE_PROTOCOL.md",
    """This instrumentation is observational: it must not add model randomness, alter scan order, or change the physical result. Existing SD-002 deterministic state-hash fixtures remain authoritative regression checks.

The prepared four-phase SD-003 fixture still performs sand physics only when its phase cycle completes.
""",
    """Trace instrumentation itself is observational: it must not add model randomness or make scheduler decisions. SD-006 deliberately changes which regions execute and uses deterministic chunk-scoped ordering; this can change physical evolution relative to the baseline global scan and is documented as a teaching-model tradeoff rather than hidden.

The prepared four-phase SD-003 fixture still performs sand physics only when its phase cycle completes.
""",
)

replace_once(
    "docs/ARCHITECTURE.md",
    """Chunk event types are defined before SD-006, but the current teaching runner does not fabricate chunk events before a chunk scheduler exists.

See `docs/TRACE_PROTOCOL.md` for the protocol, ordering, provenance, compatibility, and work-unit definitions.
""",
    """SD-006 now supplies real chunk transition events from `ChunkSleepWakeScheduler`. Wake events may carry structured cause cell/chunk evidence; renderer code remains a consumer rather than a lifecycle decision-maker.

See `docs/TRACE_PROTOCOL.md` for the protocol, ordering, provenance, compatibility, and work-unit definitions.
""",
)

replace_once(
    "docs/ARCHITECTURE.md",
    """## Determinism contract
""",
    """### Chunk sleep/wake scheduler

`ChunkSleepWakeScheduler` lives in deterministic core state. It owns fixed chunk bounds, lifecycle state, quiet-frame counters, activity accumulation, and wake-neighborhood decisions. `SimulationRunner` asks it which chunks are evaluable, and `LogicalWorld.stepSandRegion()` performs cell work only for those regions.

Chunk state is included in the deterministic runner hash. The evidence backend exposes chunk bounds/state to presentation; `buildAppPresentationViewModel()` maps explicit sleeping/newly-woken facts into the generic SD-005 overlay vocabulary. Canvas draws chunk boundaries and overlays but contains no sleep/wake thresholds or propagation rules.

The SD-006 implementation uses deterministic bottom-row-to-top-row chunk ordering. Because that groups cell updates differently from the baseline global scan, exact physical equivalence is not an architecture invariant for this teaching strategy. Comparison mode must measure rather than assume divergence.

## Determinism contract
""",
)

replace_once(
    "docs/VERIFY.md",
    """- chunk activated/slept/woken vocabulary and metrics even before the live chunk scheduler exists;
""",
    """- chunk activated/slept/woken vocabulary, live scheduler transitions, structured wake causes, and current/cumulative chunk metrics;
""",
)

replace_once(
    "docs/VERIFY.md",
    """SD-005 browser coverage additionally verifies preserved speed/phase/frame/N-frame/reset semantics, registry-driven live/next-step/reset-required controls, keyboard operation, no horizontal overflow at a representative narrow viewport, visible generic overlay controls, and reduced-motion suppression of nonessential overlay animation. Unit coverage verifies that app overlays and pending parameter states come from evidence/registry contracts and that the live presentation adapter prefers the bounded recent-evidence path when available.
""",
    """SD-005 browser coverage additionally verifies preserved speed/phase/frame/N-frame/reset semantics, registry-driven live/next-step/reset-required controls, keyboard operation, no horizontal overflow at a representative narrow viewport, visible generic overlay controls, and reduced-motion suppression of nonessential overlay animation. Unit coverage verifies that app overlays and pending parameter states come from evidence/registry contracts and that the live presentation adapter prefers the bounded recent-evidence path when available.

SD-006 verification must additionally prove deterministic active → pending-sleep → sleeping transitions, true absence of cell evaluation while every chunk is sleeping, bounded local wake behavior, cross-chunk wake causes, reset/replay identity for scheduler state/trace/metrics/hash, and browser-visible sleeping → newly-woken → returning-to-sleep state using the generic SD-005 overlays and chunk counters.
""",
)
