# sandimations

Interactive, deterministic visual explanations of CyberSand performance techniques.

The project is intended to make spatial/temporal optimization strategies intuitive by letting a viewer slow, pause, step, inspect, perturb, and compare simulations rather than merely watching prerecorded animation.

## Current implementation status

SD-002 provides the first functional simulation vertical slice: a small deterministic sand teaching world, a model-owned seeded PRNG, explicit runner phase/frame semantics, deterministic state hashes/reset/replay, and immediately usable browser time controls.

The current controls include play/pause, a speed slider from `1/32×` through `16×`, a direct `1×` button, one-phase/tick stepping, one-frame stepping, `+10` frame stepping, reset, and visible frame/phase/tick/hash counters.

Chunk sleep/wake scheduling and real phased-sampling selection are deliberately not implemented yet. The current scenario has one phase per frame; the existing tick/phase control exercises the real generic runner contract that SD-007 will later make visually meaningful.

## Initial visualization targets

1. **Chunk sleep / wake scheduling** — show settled regions becoming computationally dormant and disturbances waking only the necessary neighborhood.
2. **Phased sampling** — show active work distributed over spatial subsets and time while the macroscopic simulation remains continuous.
3. **Naive vs optimized comparison** — run identical seeded scenarios side by side and expose work avoided, active chunks, evaluated cells, divergence, and trace events.

## Core product requirements

- deterministic fixed-step simulation independent of rendering;
- pause, realtime, slow motion, fast-forward, single-phase stepping, single-frame stepping, and multi-frame stepping;
- typed live parameter registry with live-safe / next-step / reset-required mutation semantics;
- inspectable simulation, scheduler, and visualization state kept separate;
- structured trace/instrumentation events rather than visualization-owned algorithm logic;
- scenario/preset system with reproducible seeds and eventually shareable URLs;
- architecture that can later consume captured CyberSand traces or a real C++/WASM core without replacing the explanatory UI;
- accessibility, responsive presentation, and automated verification from the outset.

## SD-002 teaching model and time semantics

The current material model is intentionally small: `empty`, `wall`, and `sand`. Sand falls vertically when possible and otherwise chooses an available down-diagonal direction; when both diagonals are available, the tie is decided by the explicit seeded PRNG. This is an explanatory model, not a claim that these are the exact current CyberSand material rules.

The deterministic core never reads browser time, schedules animation frames, or changes its physics according to playback rate. A browser-only playback driver decides when to request another fixed logical frame from the runner.

Runner semantics:

- `tick` counts scheduler phase advances;
- `phase` identifies the next phase in the current logical frame;
- completing the configured phase cycle advances the sand model once and increments `frame`;
- the SD-002 default scenario uses one phase per frame;
- `stepPhase()`, `stepFrame()`, and `stepFrames(n)` pause continuous playback before advancing exactly the requested logical work;
- `reset()` restores the seeded world/PRNG/frame/phase/tick state and pauses playback while preserving the chosen playback rate;
- play/pause and playback-rate changes are deliberately excluded from the deterministic state hash because they do not alter simulation state.

The speed slider is deliberately non-linear. Half of its travel is devoted to `1/32×` through `1×`, while the upper half reaches `16×`, so useful slow-motion values are not compressed into a few pixels.

SD-003 will formalize versioned scenario/parameter serialization. The SD-002 `CoreScenario` contract is intentionally minimal and internal.

## Development

Use Node.js 24 for the repository and CI. The package declares a minimum Node version of 22.12.0.

```bash
npm ci
npm run dev
```

The main verification commands are:

```bash
npm run format:check   # Prettier consistency
npm run lint           # deterministic-core boundary/static check
npm run typecheck      # strict TypeScript check
npm test               # Vitest Node-side unit/determinism tests
npm run build          # production Vite build
npm run test:e2e       # build + Playwright Chromium interaction/smoke tests
npm run verify         # formatting + boundary check + typecheck + unit tests + build
```

Before running browser tests locally for the first time, install the Chromium runtime:

```bash
npm run test:e2e:install
```

CI performs a clean `npm ci` install from `package-lock.json`, runs formatting/static/type/unit/build checks, installs Chromium, then runs the Playwright production-build browser tests.

## Source boundaries

The current implementation follows this dependency direction:

```text
src/core/            deterministic world, PRNG, scenario input and runner
    ↓
src/presentation/    browser-independent controller/view-model and speed mapping
    ↓
src/ui/              DOM/canvas rendering and wall-clock playback scheduling
    ↓
src/main.ts          composition entry point
```

Future scheduler, trace, parameter, serialized-scenario, and backend-adapter modules remain governed by `docs/ARCHITECTURE.md` and their own issues.

The `npm run lint` boundary check rejects DOM access, animation-frame scheduling, hidden randomness, wall-clock reads, and timer scheduling from `src/core/`.

## Authoritative planning documents

- [`docs/RAG.md`](docs/RAG.md) — programme plan, dependency graph, current RAG status, issue map, risks, and execution ledger.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architectural boundaries and contracts.
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — educational goals, visual semantics, interaction model, and scope.
- [`docs/VERIFY.md`](docs/VERIFY.md) — required tests and evidence.
- [`AGENTS.md`](AGENTS.md) — autonomous implementation and PR/merge workflow.

Repository state, these documents, and the relevant GitHub issue are authoritative over chat history.
