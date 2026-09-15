# sandimations

Interactive, deterministic visual explanations of CyberSand performance techniques.

The project is intended to make spatial/temporal optimization strategies intuitive by letting a viewer slow, pause, step, inspect, perturb, and compare simulations rather than merely watching prerecorded animation.

## Current implementation status

SD-001 establishes the webapp substrate only. The current page is a deliberately small architecture smoke test proving that deterministic core code, presentation adapters, and browser UI are separate modules. Sand physics, sleep/wake scheduling, phased sampling, and the early time-control strip arrive in later issues.

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
npm test               # Vitest Node-side unit tests
npm run build          # production Vite build
npm run test:e2e       # Playwright Chromium smoke test against the production preview
npm run verify         # formatting + boundary check + typecheck + unit tests + build
```

Before running browser tests locally for the first time, install the Chromium runtime:

```bash
npm run test:e2e:install
```

CI performs a clean `npm ci` install from `package-lock.json`, runs formatting/static/type/unit/build checks, installs Chromium, then runs the Playwright production-build smoke test.

## Source boundaries

The implemented SD-001 vertical slice follows this dependency direction:

```text
src/core/            deterministic/browser-independent facts
    ↓
src/presentation/    browser-independent view-model adaptation
    ↓
src/ui/              DOM/browser rendering
    ↓
src/main.ts          composition entry point
```

Future scheduler, runner, trace, scenario, and backend-adapter modules remain governed by `docs/ARCHITECTURE.md`; SD-001 does not invent those contracts early.

The `npm run lint` boundary check currently rejects DOM access, animation-frame scheduling, hidden randomness, wall-clock reads, and timer scheduling from `src/core/`.

## Authoritative planning documents

- [`docs/RAG.md`](docs/RAG.md) — programme plan, dependency graph, current RAG status, issue map, risks, and execution ledger.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architectural boundaries and contracts.
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — educational goals, visual semantics, interaction model, and scope.
- [`docs/VERIFY.md`](docs/VERIFY.md) — required tests and evidence.
- [`AGENTS.md`](AGENTS.md) — autonomous implementation and PR/merge workflow.

Repository state, these documents, and the relevant GitHub issue are authoritative over chat history.
