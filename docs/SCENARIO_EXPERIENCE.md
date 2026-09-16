# Scenario experience, timeline, and share-state contract

SD-009 turns the deterministic demonstrations into navigable teaching experiences without moving simulation semantics into the browser UI.

## Curated scenario library

The library in `src/scenarios/library.ts` is repository data backed by the canonical SD-003 scenario factories. It exposes stable experience IDs for:

- `falling-sand` — baseline settling sand;
- `chunk-sleep-wake` — localized wake propagation;
- `phased-slow` — phased sampling at the slow teaching default;
- `phased-normal` — the same phased model at normal presentation speed;
- `compare-sleep-wake` — full-scan baseline versus chunk sleep/wake;
- `compare-phased` — full-scan baseline versus phased sampling.

Choosing another scenario destroys the previous UI/runtime session and constructs a fresh runner or comparison pair from repository scenario data. Runtime trace history, pending mutations, playback state, and scheduler state therefore cannot leak from the previously selected scenario.

## Versioned share state

Share links use explicit query schema version `v=1`. The serializable surface is deliberately smaller than component state:

- `scenario` — stable scenario-library identity;
- `tick` — deterministic replay position, bounded to 512 scheduler/comparison ticks for direct links;
- `paused` — presentation playback state;
- `speed` — the presentation speed-slider position;
- `view` — `inspect` or `presentation`;
- `history` — one of the supported timeline read-window sizes;
- `p.<parameter-id>` — validated parameter values that become canonical initial scenario parameters.

The encoder emits a canonical key order and sorts parameter IDs. The decoder validates every value through the parameter registry. Unsupported schema versions fail closed to the default scenario and display a warning; invalid fields degrade independently rather than being interpreted heuristically.

A URL never serializes DOM nodes, component instances, timers, trace buffers, PRNG internals, scheduler internals, or opaque framework state. Legacy scenario-only links remain navigable, but their extra unversioned query fields are not treated as authoritative state.

A direct link is replay-backed: Sandimations creates a fresh canonical scenario and advances it through the normal public step commands until the requested tick. This is why direct-link replay has an explicit 512-tick bound. Long-running sessions remain usable, but the UI disables exact direct-link generation beyond that bound rather than producing a misleading link.

Parameter choices encoded in the URL are initial deterministic inputs and round-trip exactly. A parameter edited later during an already-progressed run is not silently rewritten into an initial value, because doing so could change the path taken to the current world. When such transient edits or pending mutations exist, the share UI says that the current link is not an exact replay of those edits. A future checkpoint/event-history format can extend this without weakening the v1 contract.

## Trace-backed timeline

The timeline is a projection of SD-004 trace records. It groups retained records by scheduler `tick` and preserves each record's explicit:

- logical `frame`;
- scheduler `phase` and reported `phaseCount`;
- trace sequence range;
- cell work counters;
- phased-selection counts where present;
- chunk transition count and event types.

Selecting a timeline entry is inspection only. It never mutates the runner, never fabricates historical world state, and never performs reverse physics. The current implementation is **not rewind**. To visit an earlier reachable state, use a share/replay link or reset and replay deterministically.

History is bounded at both layers. The core trace sink is a 16,384-record ring buffer, while the timeline reads a configurable recent window of 64, 128, or 256 records and displays at most the newest 16 tick groups. Cumulative deterministic metrics remain independent of ring-buffer eviction.

For comparison scenarios, the timeline reads the optimized runner's evidence; the comparison UI continues to expose both sides and their provenance/work/divergence evidence.

## Presentation mode

Presentation mode is presentation state only. It may hide secondary inspector regions and a deterministic demo script may issue commands, but scripts receive only a controller-shaped command interface (`pause`, step commands, and presentation speed) plus a view-mode callback. They cannot access model mutation APIs or advance from renderer timing.

The supplied demo beats intentionally call the same public commands as visible controls. There is no second simulation API and no animation-frame-driven physics path.

## Keyboard and accessibility behavior

Scenario and history selectors are native labelled controls, timeline entries are buttons, and the existing simulation/comparison controls retain their keyboard behavior. Presentation mode does not replace or disable the normal command surface. SD-010 performs the broader release accessibility audit.

## Verification

SD-009 coverage includes:

- canonical share-state encode/decode and unsupported-version behavior;
- deterministic scenario-library fixtures/replay;
- bounded trace-to-timeline projection;
- presentation command-seam tests;
- Playwright scenario switching, direct-link reload, timeline inspection, presentation beats, keyboard focus, and invalid-version fallback.

Run `npm run verify` for formatting/static/type/unit/build checks and `npm run test:e2e` for browser acceptance.
