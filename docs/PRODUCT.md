# Product Contract

## Purpose

Sandimations is an interactive web application for explaining selected CyberSand performance strategies through deterministic, inspectable simulation.

The objective is not to reproduce the entire CyberSand engine. The objective is to make optimization behavior legible without making false claims about what the real engine does.

## Primary teaching stories

### Chunk sleep / wake

A settled world should visibly retain its material state while computational activity contracts to only the disturbed region. The viewer should be able to inspect:

- chunk boundaries;
- sleeping, active, newly-woken, and pending-sleep states;
- the disturbance that caused a wake;
- propagation to neighboring chunks when required;
- work avoided relative to a baseline full scan;
- return to sleep after stability.

### Phased sampling

An active world should remain visually coherent while evaluation work is intentionally distributed over phases. The viewer should be able to distinguish:

- evaluated in the current phase;
- active but scheduled for another phase;
- sleeping / inactive;
- cells rejected or blocked by simulation rules;
- phase number and frame number;
- combined coverage over multiple phases;
- macroscopic simulation behavior at normal speed versus scheduler behavior in slow motion.

The central educational point is temporal amortization: not every active cell needs the same expensive attention on every presentation frame for the useful large-scale evolution to remain understandable.

### Baseline versus optimized

Where meaningful, identical seeded initial states and input events should drive a baseline runner and an optimized runner. The application should expose both physical behavior and computational-work metrics. Any divergence metric must be defined precisely and must not imply semantic equivalence that has not been established.

## Interaction contract

Time manipulation is foundational, even when a particular release exposes only a subset of controls.

The application architecture must support:

- pause / play;
- realtime playback;
- slow motion;
- fast-forward;
- advance one scheduler phase;
- advance one logical simulation frame;
- advance N frames;
- deterministic reset;
- deterministic replay from scenario seed and inputs;
- later checkpoint/rewind support without redesigning the simulation boundary.

Rendering does not advance physics implicitly. Simulation progression is owned by an explicit simulation clock/runner.

## Parameter contract

Illustrative settings are registered as typed parameters rather than hard-coded directly into controls.

Each parameter declares, at minimum:

- stable identifier;
- label and explanatory text;
- data type;
- valid range/options;
- default value;
- mutation semantics: `live`, `next-step`, or `reset-required`;
- serialization behavior.

This should allow future controls for chunk size, sleep delay, activity threshold, wake neighborhood, phase count, phase pattern, sampling density, spawn rate, gravity, material properties, overlay opacity, and other useful explanatory variables without rewriting the app's state model.

## Scenario contract

A scenario should be reproducible from data. It may define:

- seed;
- world dimensions and initial material distribution;
- simulation parameters;
- scheduler parameters;
- visualization configuration;
- camera/view state;
- scripted deterministic input events;
- default playback speed;
- explanatory annotations.

Initial scenarios should include at least:

- settling sand;
- localized disturbance / wake propagation;
- phased sampler in slow motion;
- baseline versus phased sampling.

Shareable scenario/state URLs are a planned capability.

## Visual semantics

The physical material view and computational-work overlay must remain distinguishable.

A consistent legend should support at least:

- evaluated now;
- active but not selected this phase;
- sleeping;
- newly woken;
- blocked/rejected update.

Do not encode critical distinctions solely by color. Pattern, border, glyph, brightness, or other redundant cues must be available for accessibility.

## Instrumentation

The explanatory UI should consume structured trace/counter data such as:

- phase started/completed;
- cell examined;
- cell moved;
- cell skipped;
- update blocked;
- chunk activated;
- chunk slept;
- chunk woken;
- active/evaluated cell counts;
- active/sleeping chunk counts.

Future heatmaps, graphs, timelines, or trace inspectors should be addable from the same instrumentation layer.

## Fidelity and honesty

The first implementation may use an intentionally simplified deterministic cellular-material model. It must not describe a simplified algorithm as the exact current CyberSand implementation unless verified from authoritative CyberSand source/docs.

The UI and documentation should distinguish:

- conceptual teaching model;
- measured behavior from that model;
- real CyberSand behavior when later connected through traces or C++/WASM.

## Initial technical direction

Use a browser-first TypeScript application with a lightweight build system, deterministic pure-core modules, and a rendering layer that can start with Canvas 2D while leaving room for WebGL/WebGPU if profiling or richer visualization justifies it. Avoid introducing a heavy rendering framework before the explanatory requirements demonstrate a need.
