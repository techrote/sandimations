# Verification Contract

Verification must demonstrate both software correctness and explanatory honesty.

## Required automated checks

Every release/implementation PR is expected to preserve the accumulated verification surface:

- clean `npm ci` install from `package-lock.json`;
- `npm run audit` (`npm audit --audit-level=high`);
- `npm run format:check`;
- `npm run lint` deterministic-core boundary/static check;
- `npm run typecheck`;
- `npm test`;
- `npm run build`;
- `npm run test:e2e`;
- `npm run build:pages`;
- `npm run test:e2e:pages` against the real `/sandimations/` repository base path.

`npm run verify` is the fast cross-platform formatting/boundary/type/unit/build bundle; browser and Pages smoke remain separate commands because they require Chromium.

No issue may remove or silently weaken an existing check.

## Determinism tests

Identical seed + scenario + ordered inputs + parameter mutations + runner commands must produce identical canonical state/hash, trace sequence, and deterministic metrics. Tests deliberately vary presentation/backend reads to prove observation does not perturb future execution. No deterministic core module may use browser time, timers, animation frames, DOM APIs, or `Math.random()`.

Performance/presentation changes must rerun the deterministic suite even when they appear UI-only.

## Trace and metrics tests

Verification covers protocol/schema versions, monotonic sequence, frame/phase/tick context, provenance, human-auditable golden traces, distinct examined/moved/skipped/blocked semantics, chunk lifecycle/wake causes, phased-selection evidence, reset/replay identity, and bounded trace retention. Metrics derived from trace records are reconciled with those records.

Deterministic work counters are never wall-clock timing.

## Time and comparison tests

Verify pause/play, phase stepping, frame stepping, N-frame stepping, slow/realtime/fast rate translation, reset, and live/next-step/reset-required parameter timing. Phase and logical frame are distinct.

Comparison tests require independent baseline/optimized runners fed equivalent canonical scenario/input streams, provenance-bound metrics, and an explicitly defined divergence metric. Physical identity is never inferred from screenshots or zero divergence at one instant.

## Browser and accessibility checks

Playwright semantic tests are preferred over platform-fragile pixel equality. Current release coverage includes:

- keyboard-operable core controls, scenario selection, and timeline entries;
- visible/semantic control labels and pressed states;
- non-color legend cues for all critical scheduler states;
- `prefers-reduced-motion` suppression of nonessential animation;
- representative `360`, `390`, `768`, and `1440` pixel viewport checks;
- single-world and comparison layouts without document-level blocking horizontal overflow;
- scenario reset/replay, timeline evidence, sharing, presentation mode, and comparison behavior.

Stable screenshot tests may be added where they provide evidence not already covered by semantic assertions.

## Resource-safety checks

Long-lived evidence is explicitly bounded: the core trace ring retains at most 16,384 records and the live presentation/timeline request bounded recent windows. Scenario validation additionally rejects dimensions above 512 cells per axis, total worlds above 65,536 cells, and event streams above 10,000 entries before expensive normalization. Oversized input fails visibly rather than being truncated.

## Performance evidence

`window.__sandimationsPerformance` exposes a bounded 120-sample browser-only diagnostic window for `world-canvas` and `playback-ui` timings. `read()` returns last/mean/p95/max timings and a presentation work-item count; `reset()` clears only this diagnostic history.

These values are deliberately nondeterministic wall-clock diagnostics. They must not enter runner state, state hashes, scheduler decisions, traces, deterministic metrics, share state, or claims about algorithmic work avoidance.

`tests/e2e/performance.spec.ts` profiles representative phased-sampling and comparison scenarios and writes reproducible `[performance-profile]` records to the Playwright/CI log. Any renderer/UI optimization must cite before/after runs. If a proposed change fails to show an improvement, prefer reverting it over retaining speculative complexity.

## Static deployment checks

`npm run build:pages` builds with Vite base `/sandimations/`. `playwright.pages.config.mjs` then serves that exact production output beneath `/sandimations/`, while `tests/e2e/deployment.spec.ts` asserts the scenario route, canvas, assets, and HTTP responses work from that path.

`.github/workflows/pages.yml` repeats the production build and base-path smoke before uploading/deploying the Pages artifact. Deployment failure is a required visible failure; a local base-path smoke is not a substitute for verifying the public Pages deployment.

## Per-issue completion evidence

Every implementation PR records exact commands/checks, results, deterministic fixture changes, browser/deployment evidence where applicable, measured performance evidence for optimization changes, and known limitations or deferred acceptance items. If required verification cannot be executed, the PR must say why and the issue remains open unless repository policy explicitly permits an equivalent proof.
