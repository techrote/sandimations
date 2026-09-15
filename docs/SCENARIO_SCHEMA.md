# Scenario and Parameter Contract

SD-003 establishes the first externally serializable Sandimations scenario format. The format is data-first and deterministic; it does not serialize DOM/component state.

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

The initial concrete parameters are:

| ID | Kind | Timing | Meaning |
| --- | --- | --- | --- |
| `simulation.sand.enabled` | boolean | live | Freeze/unfreeze sand updates while the simulation clock can continue. |
| `simulation.sand.tie-break` | enum | next-step | Select seeded-random, left-first, or right-first diagonal tie-breaking. |
| `simulation.seed-variant` | integer | reset-required | XOR a deterministic variant into the scenario seed on explicit reset. |

Unknown IDs and invalid values are rejected. Later UI controls should consume this registry rather than duplicate ranges/options or mutation rules.

## Mutation semantics

### `live`

The validated value becomes current immediately for the running simulation.

### `next-step`

The mutation is queued in request order and becomes current at the next scheduler phase boundary, before that phase executes.

### `reset-required`

The mutation is queued until the runner receives an explicit reset. At reset, queued reset-required values are folded into the runner's current reset configuration in deterministic request order. The parameter store is then reconstructed from the scenario's initial parameter values plus those reset-required overrides before world/PRNG/counters are rebuilt.

This distinction is deliberate: live and next-step mutations are runtime experiments and are cleared by reset, while already-applied reset-required configuration persists across later resets until a new scenario is loaded. That guarantees that resetting a scenario with scripted live/next-step events starts from the same parameter baseline and reproduces the same event history.

Pending mutations are part of deterministic runner state and therefore contribute to state hashing.

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

## Prepared fixtures

SD-003 includes fixture factories for:

- the current falling-sand baseline;
- a localized-disturbance scene intended for later sleep/wake work;
- a four-phase clock scene intended for later phased-sampling work.

The phased fixture does **not** claim sparse sampling is implemented. It exercises only the generic multi-phase clock until SD-007 supplies real cell/region selection and trace-backed visualization.
