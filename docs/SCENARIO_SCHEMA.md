# Scenario and Parameter Contract

Sandimations uses a data-first, deterministic scenario format. Scenario data describes model input, scheduler configuration, deterministic events, and non-authoritative presentation defaults; it never serializes DOM/component state.

## Schema version

The current schema version is `1`.

A normalized scenario contains:

- `version` — currently exactly `1`;
- `id` and human-readable `title`;
- unsigned 32-bit `seed`;
- `simulation.model` — currently `falling-sand-v1`;
- `scheduler.strategy` and `phaseCount`;
- fixed logical `world` dimensions/cells;
- registered parameter values;
- ordered deterministic scripted events;
- presentation defaults such as suggested playback rate and grid visibility.

Presentation defaults are intentionally non-authoritative: changing them must not change deterministic physics unless the same change is also represented through a simulation/scheduler parameter or input event.

## Resource bounds

Scenario validation rejects obviously excessive input before expensive normalization work. Version 1 currently permits:

- world width and height up to `512` cells each;
- at most `65,536` logical cells in one scenario;
- at most `10,000` scripted events.

These are release-safety limits, not simulation semantics. Supported scenarios below the limits retain the same deterministic interpretation. A future change that alters deterministic field meaning still requires the compatibility treatment described below.

## Canonical serialization

`serializeScenario()` validates and normalizes the scenario, sorts object keys recursively, and emits compact canonical JSON. `deserializeScenario()` parses JSON and passes it through the same validator.

Canonicalization guarantees that semantically equivalent supported input data produces the same serialized representation after normalization. Scripted events are sorted by `(tick, order)` and duplicate schedule positions are rejected.

No wall-clock timestamps, generated UUIDs, random IDs, browser locale ordering, or browser state are introduced during normalization or serialization. Parameter definitions are ordered with a locale-independent code-point comparator.

## Parameter registry

Parameter definitions are code-owned metadata. A definition supplies:

- stable `id`;
- label and help text;
- kind (`boolean`, `number`, `integer`, or `enum`);
- default value;
- numeric bounds/step or enum options where applicable;
- mutation timing (`live`, `next-step`, or `reset-required`);
- serialization policy (`always` or `omit-default`).

The current registry covers sand enable/tie-break behavior, deterministic seed variants, chunk size/sleep/activity/wake controls, and phased-sampling phase-count/pattern controls. Unknown IDs and invalid values are rejected. UI controls consume the registry rather than duplicating ranges/options or mutation rules.

## Mutation semantics

### `live`

The validated value becomes current immediately for the running simulation.

### `next-step`

The mutation is queued in request order and becomes current at the next scheduler phase boundary, before that phase executes.

### `reset-required`

The mutation is queued until the runner receives an explicit reset. At reset, queued reset-required values are folded into the runner's current reset configuration in deterministic request order. The parameter store is then reconstructed from the scenario's initial parameter values plus those reset-required overrides before world/PRNG/counters are rebuilt.

Live and next-step mutations are runtime experiments and are cleared by reset, while already-applied reset-required configuration persists across later resets until a new scenario is loaded. Pending deterministic mutations contribute to state hashing.

## Scripted events

Version 1 supports two event kinds:

- `parameter` — apply a registered live or next-step parameter mutation;
- `input` — apply a deterministic runner input such as `set-cell`.

Every event has a non-negative `tick` and `order`. The runner applies all events at the current tick in ascending order before the phase executes.

Reset-required parameters are deliberately forbidden in scripted mutation events in version 1. Their desired initial value belongs in the scenario `parameters` object instead; this avoids an implicit reset hidden inside event playback.

## Compatibility policy

- Readers reject unsupported schema versions rather than guessing semantics.
- Additive metadata that does not change deterministic meaning should be introduced only with explicit validation/default behavior.
- Any incompatible field meaning, event timing change, material encoding change, parameter default/ordering change that affects deterministic behavior, or other deterministic interpretation change requires a new schema version.
- Old-version migration, when introduced, should be an explicit pure conversion into the current normalized representation before execution.
- Unknown parameter IDs are rejected in version 1 to prevent silent typos from changing scenario meaning.
- Resource-limit failures are explicit validation failures; oversized input is never silently truncated.

## Prepared scenarios

The built-in library includes deterministic demonstrations for settling sand, localized chunk sleep/wake, phased sampling at slow and normal playback rates, and baseline-versus-optimized comparison. The scenario experience adds bounded trace-backed timeline inspection and a versioned share-state URL that replays the same scenario/tick/parameter configuration rather than serializing mutable presentation internals.
