# SD-010 release-hardening evidence

This document records the reproducible release-hardening evidence for SD-010. Wall-clock numbers here are browser diagnostics from GitHub-hosted runners; they are not deterministic simulation metrics or evidence that one scheduler performs less algorithmic work.

## Accessibility and responsive audit

Release Playwright coverage verifies:

- scenario selection and timeline inspection can be focused and activated from the keyboard;
- core time controls retain their existing keyboard path and visible focus treatment;
- scenario/share/presentation controls have meaningful accessible names;
- timeline entries expose pressed state and evidence detail;
- all five critical scheduler states have text plus shape/pattern/border cues rather than hue alone;
- the existing `prefers-reduced-motion` rule suppresses nonessential animation;
- single-world and comparison layouts remain usable at 360, 768, and 1440 pixels, in addition to the pre-existing 390-pixel narrow coverage;
- document-level horizontal overflow is rejected by the responsive tests; intentionally wide metric tables use local scrolling instead.

The comparison stylesheet also received a contrast/containment correction for muted text, Canvas frames, summary values, narrow controls, and the metrics table.

## Resource bounds

Long-session and input growth are bounded at multiple layers:

- core trace retention: 16,384 records with explicit dropped-record metadata;
- live evidence reads: bounded recent windows;
- timeline display/history choices: bounded recent windows and at most 16 rendered timeline entries;
- presentation timing diagnostics: 120 samples per timing category;
- scenario world axis: maximum 512 cells;
- scenario total cells: maximum 65,536;
- scripted scenario events: maximum 10,000;
- share-state replay: retains the existing explicit replay-tick ceiling.

Oversized scenario input fails validation rather than being silently truncated.

## Performance instrumentation

`window.__sandimationsPerformance` is installed by the browser composition root. It records bounded wall-clock presentation samples only for:

- `world-canvas`: one Canvas render pass;
- `playback-ui`: one post-step presentation refresh.

The diagnostics report last, mean, p95, maximum, sample count, and presentation work-item metadata. None of these values are read by `src/core/`, serialized into scenarios/share state, included in hashes, or exposed as deterministic work metrics.

`tests/e2e/performance.spec.ts` profiles `phased-normal` and `compare-phased`; CI logs each capture with the `[performance-profile]` prefix.

## Measured renderer experiment and revert

A first profile on CI run `35048465290` measured the existing per-cell Canvas grid path after instrumentation was added:

| Scenario | Category | Samples | Mean | p95 | Max |
| --- | --- | ---: | ---: | ---: | ---: |
| `phased-normal` | world-canvas | 19 | 1.016 ms | 1.600 ms | 1.600 ms |
| `phased-normal` | playback-ui | 19 | 2.332 ms | 3.500 ms | 3.500 ms |
| `compare-phased` | world-canvas | 20 | 0.690 ms | 1.200 ms | 1.500 ms |
| `compare-phased` | playback-ui | 10 | 3.110 ms | 4.700 ms | 4.700 ms |

Because Canvas rendering was a material portion of the presentation refresh, an experiment batched all grid rectangles into one Canvas path/stroke while preserving the same rectangle geometry. CI run `35048662499` produced:

| Scenario | Category | Samples | Mean | p95 | Max |
| --- | --- | ---: | ---: | ---: | ---: |
| `phased-normal` | world-canvas | 8 | 1.738 ms | 2.300 ms | 2.300 ms |
| `phased-normal` | playback-ui | 8 | 4.275 ms | 6.300 ms | 6.300 ms |
| `compare-phased` | world-canvas | 20 | 0.910 ms | 1.500 ms | 1.700 ms |
| `compare-phased` | playback-ui | 10 | 4.130 ms | 5.600 ms | 5.600 ms |

Hosted-runner timing is noisy and the two runs are not a controlled microbenchmark, so these figures must not be over-interpreted. They nevertheless provided no evidence that the batching change improved either representative scenario; all four mean timing series moved in the wrong direction. The speculative optimization was therefore reverted. SD-010 keeps the small, bounded instrumentation and the simpler renderer rather than claiming an unproven speedup.

Deterministic verification remained green during the experiment: 82 unit/determinism tests passed on run `35048662499`. The final branch must rerun the same suite after the revert.

## Dependency and production-build review

The application has no runtime package dependencies. The package manifest contains five development-tool dependencies: Playwright, Prettier, TypeScript, Vite, and Vitest. CI performs a clean lockfile install followed by `npm audit --audit-level=high`.

Run `35048662499` installed/audited 44 packages and reported `0 vulnerabilities`. Its normal Vite production build emitted approximately 95.08 kB JavaScript (26.59 kB gzip), 12.86 kB CSS (3.53 kB gzip), and a 0.54 kB HTML entry document.

## Static build and deployment path

GitHub Pages is the selected zero-server host. Production Pages assets are built with Vite base `/sandimations/`. A dedicated Playwright configuration serves the built output at that same subpath and verifies the application, scenario query, Canvas, asset requests, and HTTP responses.

On CI run `35048662499`:

- normal production build: passed;
- 27 regular Chromium browser tests: passed;
- Pages production build: passed;
- `/sandimations/` deployment-base smoke: 1/1 passed.

`.github/workflows/pages.yml` repeats the Pages build and smoke before artifact upload/deployment so a broken base path cannot silently publish.

### External deployment blocker

The repository does not currently have a GitHub Pages site enabled. `actions/configure-pages@v5` first returned `404 Not Found`; adding its supported `enablement: true` option then failed with `403 Resource not accessible by integration` while attempting `POST /repos/techrote/sandimations/pages`. The workflow token has `pages: write`, but GitHub does not grant that token repository-administration permission to create the Pages site.

Consequently the production artifact and real base-path behavior are verified locally in CI, but the public deployment is **not** verified. Per SD-010's explicit stop condition, PR #22 must remain unmerged and issue #10 must remain open until repository Pages is enabled by an administrator and the deployment workflow succeeds against the real public site.

After Pages is enabled with GitHub Actions as its build/deployment source, rerun the failed Pages workflow (or push a no-op/docs commit), verify `https://techrote.github.io/sandimations/` loads the released scenario experience, then complete the PR/issue only if the final CI and deployment checks are green.
