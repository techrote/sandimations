from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected documentation target not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "README.md",
    """SD-004 completes the deterministic explanatory substrate beneath the future visualization shell. The project now has a deterministic sand teaching model and runner, early time controls, schema-driven parameters, versioned/canonical scenarios, **trace protocol v1**, **deterministic metrics v1**, explicit evidence provenance, and a replaceable backend/presentation evidence boundary.

The teaching model now emits structured evidence from the work it actually performs: phase boundaries plus cell examined/moved/skipped/blocked records from the real sand scan. Deterministic metrics are derived from those same records rather than reconstructed from rendered pixels. Live trace retention is bounded and reports explicit truncation metadata while cumulative metrics remain exact.

The current browser controls remain the SD-002 vertical slice: play/pause, a speed slider from `1/32×` through `16×`, a direct `1×` button, one-phase/tick stepping, one-frame stepping, `+10` frame stepping, reset, and visible frame/phase/tick/hash counters. SD-005 is the next issue and will build the reusable explanatory UI/inspectors over the evidence contracts that now exist.
""",
    """SD-005 builds the first reusable explanatory application shell on the completed deterministic/evidence substrate. The browser now combines the Canvas world with trace-backed overlays, deterministic work metrics and provenance, state inspectors, registry-generated parameter controls, recent evidence, and the refined time-control strip.

The existing runner semantics are preserved: play/pause, the nonlinear `1/32×` through `16×` speed slider, an obvious `1×` return, single-phase stepping, single-frame stepping, configurable N-frame stepping, and deterministic reset all use the original SD-002 controller/runner path. Keyboard shortcuts provide the same operations without creating a second timing model.

Parameter widgets are generated from the SD-003 registry and visibly distinguish `live`, `next-step`, and `reset-required` behavior, including current versus queued values. Canvas overlays are built only from SD-004 evidence. The generic visual vocabulary already covers evaluated-now, active-other-phase, sleeping/inactive, newly-woken, and blocked/rejected with redundant non-color cues; the current full-scan teaching backend truthfully renders only states it actually emits rather than fabricating future scheduler facts.
""",
)

replace_once(
    "README.md",
    "## Quick start on Windows\n",
    """## Evidence-driven presentation shell

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

SD-006 and SD-007 can now add chunk sleep/wake and genuine phased sampling through the existing evidence/view-model path instead of introducing scheduler logic into the UI.

## Quick start on Windows
""",
)

replace_once(
    "README.md",
    "Future scheduler implementations, mature parameter-control UI, comparison orchestration, and external/WASM evidence backends remain governed by `docs/ARCHITECTURE.md` and their own issues.",
    "Scheduler implementations, comparison orchestration, scenario/timeline tooling, and external/WASM evidence backends remain governed by `docs/ARCHITECTURE.md` and their own issues. SD-005's generic controls/overlays are the presentation substrate for those later features.",
)

replace_once(
    "docs/RAG.md",
    """### M2 — First explanatory app — next

SD-005 is the next execution target: responsive UI shell, Canvas presentation, polished controls/legend/inspectors, and generic evidence-driven presentation infrastructure. SD-006 and SD-007 then add the chunk sleep/wake and phased-sampling teaching schedulers/demos, using the landed trace/evidence contracts rather than inventing visual state.
""",
    """### M2 — First explanatory app — in progress

SD-005 completed the generic evidence-driven application shell: responsive Canvas presentation, polished time controls, registry-derived parameter controls, deterministic work/provenance inspectors, recent evidence, and a non-color-only overlay vocabulary. SD-006 and SD-007 are now both ready to add the chunk sleep/wake and phased-sampling schedulers/demos through those landed presentation/evidence contracts.
""",
)

replace_once(
    "docs/RAG.md",
    "| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | UI shell, Canvas renderer, legend, inspectors, **refinement of SD-002 time controls** | SD-002, SD-003, SD-004 | next / presentation track |",
    "| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | UI shell, Canvas renderer, legend, inspectors, **refinement of SD-002 time controls** | SD-002, SD-003, SD-004 | complete |",
)
replace_once(
    "docs/RAG.md",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | Chunk sleep/wake scheduler teaching model + demo | SD-002, SD-004; integrates with SD-003/005 | can overlap SD-007 after presentation contracts stabilize |",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | Chunk sleep/wake scheduler teaching model + demo | SD-002, SD-004; integrates with SD-003/005 | ready; may overlap SD-007 |",
)
replace_once(
    "docs/RAG.md",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | Phased-sampling teaching model + **primary visual/phase-step explanation** | SD-002, SD-004; integrates with SD-003/005 | can overlap SD-006 after presentation contracts stabilize |",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | Phased-sampling teaching model + **primary visual/phase-step explanation** | SD-002, SD-004; integrates with SD-003/005 | ready; may overlap SD-006 |",
)

replace_once(
    "docs/RAG.md",
    """- SD-001 through SD-004 are complete substrate work.
- SD-005 is the next primary issue. It must consume `EvidenceBackendV1` / `PresentationEvidenceAdapterV1` rather than reconstructing model/scheduler facts in UI code.
- SD-006 and SD-007 are the main safe parallel pair once SD-005's generic overlay/control/inspector contracts stabilize.
""",
    """- SD-001 through SD-005 are complete substrate/presentation-foundation work.
- SD-005's generic app/view-model contract is now the presentation path: later scheduler work must supply structured evidence rather than add algorithm logic to Canvas/DOM code.
- SD-006 and SD-007 are now the main safe parallel pair. Both should extend the common evidence/overlay vocabulary instead of introducing a competing state or stepping path.
""",
)

marker = "## Initial UX target\n"
section = """## SD-005 presentation shell

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

"""
rag = Path("docs/RAG.md")
rag_text = rag.read_text()
if marker not in rag_text:
    raise SystemExit("RAG SD-005 insertion marker missing")
rag.write_text(rag_text.replace(marker, section + marker, 1))

replace_once(
    "docs/RAG.md",
    "Mitigation: correctness tests prove reads are side-effect free. SD-005 should avoid copying/processing the full retained trace unnecessarily every animation frame and may introduce cursor/incremental presentation consumption while preserving the evidence protocol.",
    "Mitigation: correctness tests prove reads are side-effect free. SD-005 added a bounded recent-evidence presentation read (512 records by default) so live refresh does not clone/process the full retained ring; the canonical full trace contract remains available for explicit history/export use.",
)

replace_once(
    "docs/RAG.md",
    "| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | ready | Next issue: generic evidence-driven UI/presentation shell and control refinement |",
    "| SD-005 | [#5](https://github.com/techrote/sandimations/issues/5) | completed | PR #16; evidence-driven responsive shell, registry controls, overlays/inspectors, refined time controls |",
)
replace_once(
    "docs/RAG.md",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | planned | Sleep/wake scheduler/demo over SD-004 evidence vocabulary |",
    "| SD-006 | [#6](https://github.com/techrote/sandimations/issues/6) | ready | Sleep/wake scheduler/demo over landed SD-004/005 evidence + overlay contracts |",
)
replace_once(
    "docs/RAG.md",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | planned | Phased sampling scheduler/demo; primary visual explanation |",
    "| SD-007 | [#7](https://github.com/techrote/sandimations/issues/7) | ready | Phased sampling scheduler/demo; primary visual explanation over landed SD-004/005 contracts |",
)

replace_once(
    "docs/ARCHITECTURE.md",
    """### Presentation adapter

`PresentationEvidenceAdapterV1` consumes `EvidenceBackendV1` and exposes renderer/inspector-friendly structured evidence without DOM dependencies. It does not infer scheduler decisions.

Reading backend or presentation snapshots is side-effect free and cannot advance physics, alter trace ordering, or change metrics.

### Renderer/UI

Responsible for drawing, interaction, explanation, accessibility, and responsive layout. It may interpolate visually between fixed simulation states, but interpolation must never mutate or masquerade as simulation state.
""",
    """### Presentation adapter

`PresentationEvidenceAdapterV1` consumes `EvidenceBackendV1` and exposes renderer/inspector-friendly structured evidence without DOM dependencies. It does not infer scheduler decisions.

SD-005 adds an additive lightweight live-read path: a backend may provide a bounded recent trace slice, and the presentation adapter defaults to the newest 512 records. Backends without that optimization remain compatible through the canonical full evidence snapshot. This changes presentation-copy cost only; it does not change trace ordering, retention, metrics, or deterministic state.

`buildAppPresentationViewModel()` combines simulation view state, structured evidence, and the parameter registry into generic renderer/control facts. It maps overlay markers only from explicit trace evidence. Unsupported future states remain absent rather than being inferred.

Reading backend or presentation snapshots is side-effect free and cannot advance physics, alter trace ordering, or change metrics.

### Renderer/UI

Responsible for drawing, interaction, explanation, accessibility, responsive layout, and presentation-only choices such as grid/overlay visibility. It may interpolate or exaggerate visually between fixed simulation/evidence facts, but presentation state must never mutate or masquerade as simulation/scheduler state.

SD-005 Canvas rendering consumes `WorldPresentationViewModel`; it does not inspect scheduler algorithms. Parameter inputs are generated from registry definitions and route mutations back through `SimulationController`, showing queued values explicitly rather than treating reset-required/next-step changes as already applied. Keyboard controls call the same controller operations as visible buttons. Reduced-motion affects nonessential presentation animation only.
""",
)

replace_once(
    "docs/ARCHITECTURE.md",
    "`TeachingModelEvidenceBackendV1` adapts the live TypeScript runner. Future recorded-trace and C++/WASM backends should implement the same contract rather than requiring presentation-specific scheduler logic.",
    "`TeachingModelEvidenceBackendV1` adapts the live TypeScript runner. It also offers the optional bounded recent-evidence read used by SD-005 live presentation, while `readEvidence()` remains the canonical full snapshot. Future recorded-trace and C++/WASM backends should implement the same contract rather than requiring presentation-specific scheduler logic.",
)

replace_once(
    "docs/VERIFY.md",
    "Use screenshot/visual regression tests selectively for stable explanatory layouts, not as a substitute for state assertions.",
    """Use screenshot/visual regression tests selectively for stable explanatory layouts, not as a substitute for state assertions.

SD-005 browser coverage additionally verifies preserved speed/phase/frame/N-frame/reset semantics, registry-driven live/next-step/reset-required controls, keyboard operation, no horizontal overflow at a representative narrow viewport, visible generic overlay controls, and reduced-motion suppression of nonessential overlay animation. Unit coverage verifies that app overlays and pending parameter states come from evidence/registry contracts and that the live presentation adapter prefers the bounded recent-evidence path when available.""",
)
