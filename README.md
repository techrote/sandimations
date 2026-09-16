# sandimations

Interactive, deterministic visual explanations of CyberSand performance techniques.

Sandimations is a browser-first teaching application: viewers can slow, pause, step, inspect, perturb, replay, and compare deterministic simulations while the renderer consumes structured scheduler/model evidence rather than inventing optimization behavior.

## Current release surface

The current implementation includes the full first teaching/presentation stack:

- deterministic falling-sand teaching model with explicit seeded PRNG;
- explicit scheduler tick/phase/logical-frame clock;
- deep-slow-motion through fast playback, pause/play, one-phase, one-frame, N-frame, and deterministic reset controls;
- typed parameter registry with `live`, `next-step`, and `reset-required` mutation semantics;
- versioned/canonical scenario schema and deterministic scripted events;
- versioned trace protocol, deterministic metrics, provenance, and bounded evidence retention;
- real chunk sleep/wake teaching scheduler with genuine avoided cell evaluation while chunks sleep;
- real phased-sampling teaching scheduler with genuinely sparse per-phase evaluation;
- independent baseline-versus-optimized comparison runners with deterministic work and explicit cell-material divergence metrics;
- built-in scenario library, trace-backed timeline inspector, versioned shareable URL state, and presentation/demo mode;
- responsive, keyboard-usable Canvas presentation with non-color-only scheduler-state cues and reduced-motion handling;
- bounded browser-only presentation timing diagnostics that remain separate from deterministic teaching metrics.

These are intentionally simplified teaching models, not claims that the algorithms exactly reproduce current CyberSand C++ internals. The evidence/backend seam is designed so recorded CyberSand traces or a future C++/WASM backend can drive the same presentation layer.

## Teaching scenarios

The scenario picker includes deterministic demonstrations for:

- settling sand;
- chunk sleep/wake and local disturbance propagation;
- phased sampling in slow motion;
- phased sampling at normal playback rate;
- baseline-versus-chunk comparison;
- baseline-versus-phased comparison.

The default experience favors phased sampling because direct slow/phase-step interaction makes temporal amortization visible. Chunk sleep/wake is available as a complementary spatial-work-avoidance demonstration.

## Truthfulness contract

Presentation may exaggerate real facts aesthetically, but it may not fabricate them. Evaluated cells, blocked updates, phase selections, chunk sleep/wake state, coverage history, work counters, and comparison provenance originate in deterministic runner/scheduler evidence. Canvas/DOM code remains presentation-only.

Deterministic work counters such as cells examined are algorithmic teaching evidence. Browser wall-clock timings are diagnostic only and are never included in state hashes, scheduler decisions, traces, deterministic metrics, or replay/share state.

## Time semantics

- `tick` counts executed scheduler phases.
- `phase` identifies the next phase in the current logical frame.
- a complete configured phase cycle increments `frame`.
- phased sampling evaluates only its selected sparse coordinate bucket per phase;
- non-phased schedulers perform their defined frame work at frame boundaries;
- manual step commands pause continuous playback before doing exactly the requested logical work;
- playback rate affects browser scheduling only, not fixed-step simulation semantics.

The speed slider is deliberately non-linear: half its travel covers `1/32×` through `1×`, while the upper half reaches `16×`.

## Evidence, history, and resource limits

Live trace history is a bounded 16,384-record ring with explicit `firstSequence`, `nextSequence`, and `droppedRecords` metadata. The live UI requests bounded recent evidence rather than cloning the full ring on every refresh, and timeline rendering is likewise bounded.

Release scenario validation also rejects obviously excessive data before expensive normalization: maximum axis length `512`, maximum world size `65,536` cells, and maximum `10,000` scripted events. Unsupported/oversized state fails visibly rather than being silently reinterpreted or truncated.

Browser presentation diagnostics retain at most 120 samples per timing category. Inspect them in development with:

```js
window.__sandimationsPerformance.read();
window.__sandimationsPerformance.reset();
```

Those values are nondeterministic diagnostics only.

## Quick start on Windows

The repository includes double-clickable wrappers around the canonical npm workflow:

```text
Setup.cmd
Run.cmd
Verify.cmd
```

`Setup.cmd` checks Node/npm and runs `npm ci`. `Run.cmd` installs when necessary, starts Vite, and opens the app. `Verify.cmd` runs the repository verification bundle. `.cmd` files are forced to CRLF through `.gitattributes`.

## Development and verification

Use Node.js 24 for the repository and CI. The package declares Node `>=22.12.0`.

```bash
npm ci
npm run dev

npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run audit
npm run build:pages
npm run test:e2e:pages
```

Install Playwright Chromium once on a new development machine with:

```bash
npm run test:e2e:install
```

`npm run verify` bundles formatting, deterministic-core boundary checks, TypeScript, unit/determinism tests, and the normal production build. Browser and Pages smoke tests remain separate because they require Chromium.

CI additionally audits dependencies, runs the regular browser suite, builds with the real GitHub Pages base `/sandimations/`, and smoke-tests that production output from the same subpath.

## Static deployment

`.github/workflows/pages.yml` is the production GitHub Pages workflow. It performs a clean install, builds with `/sandimations/`, runs the dedicated production/base-path smoke test, then uploads and deploys the Pages artifact. Deployment failure is visible and is not treated as equivalent to a local smoke pass.

See `docs/RELEASE_HARDENING.md` for the current SD-010 deployment status, performance evidence, accessibility/responsive audit, dependency review, and any release blocker.

## Source boundaries

```text
src/core/            deterministic world/runner/parameters/scenarios/traces/metrics/schedulers
    ↓
src/adapters/        replaceable evidence backend
    ↓
src/presentation/    browser-independent evidence/view-model/comparison/share/timeline helpers
    ↓
src/ui/              DOM/Canvas rendering and wall-clock playback scheduling
    ↓
src/main.ts          browser composition root
```

`npm run lint` rejects DOM access, animation-frame scheduling, timers, wall-clock reads, and hidden randomness from `src/core/`.

## Authoritative documentation

- [`AGENTS.md`](AGENTS.md) — autonomous implementation/verification/merge rules.
- [`docs/RAG.md`](docs/RAG.md) — programme plan, dependency graph, execution ledger, and risks.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — source boundaries and deterministic/evidence contracts.
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — educational, interaction, visual-truthfulness, and instrumentation contract.
- [`docs/VERIFY.md`](docs/VERIFY.md) — verification and release evidence requirements.
- [`docs/SCENARIO_SCHEMA.md`](docs/SCENARIO_SCHEMA.md) — scenario/parameter serialization, limits, and compatibility.
- [`docs/TRACE_PROTOCOL.md`](docs/TRACE_PROTOCOL.md) — trace, metrics, retention, provenance, and evidence backend contract.
- [`docs/CHUNK_SLEEP_WAKE.md`](docs/CHUNK_SLEEP_WAKE.md) — chunk scheduler teaching-model contract.
- [`docs/PHASED_SAMPLING.md`](docs/PHASED_SAMPLING.md) — sparse phased scheduler contract.
- [`docs/COMPARISON.md`](docs/COMPARISON.md) — baseline/optimized comparison semantics and caveats.
- [`docs/RELEASE_HARDENING.md`](docs/RELEASE_HARDENING.md) — SD-010 accessibility/performance/security/deployment evidence.

Repository state, the relevant GitHub issue, and these documents are authoritative over chat history.
