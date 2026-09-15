# AGENTS.md

This repository is designed for autonomous issue-by-issue implementation.

## Authority order

For any implementation task, read and reconcile in this order:

1. the current GitHub issue and its acceptance criteria;
2. this file;
3. `docs/RAG.md`;
4. `docs/ARCHITECTURE.md`;
5. `docs/PRODUCT.md`;
6. `docs/VERIFY.md`;
7. current `main`, tests, and package/tool configuration.

If sources disagree, do not silently choose a convenient interpretation. Reconcile the contradiction in the smallest repository-native place and document any material decision.

## Required working method

- Start from current `main`; inspect open/closed issues and merged PRs relevant to the task before changing code.
- Respect issue dependencies and ownership boundaries. Do not implement future issues merely because a hook is visible.
- Keep simulation semantics, scheduler semantics, trace data, and rendering/UI separate as specified by the architecture.
- Preserve deterministic behavior. Rendering cadence, wall-clock time, browser refresh rate, or UI animation must never become implicit simulation inputs.
- Prefer small pure modules and explicit contracts over framework-coupled state.
- Do not fake optimization visuals. A visual overlay must be derived from actual model/trace state, even when the model is intentionally simplified for teaching.
- Any simplification relative to real CyberSand must be documented and visually labelled where it could otherwise mislead.
- Do not remove extensibility hooks for time control, stepping, parameter mutation, trace adapters, scenarios, or future C++/WASM integration.

## Issue execution contract

Unless an issue explicitly states otherwise, an autonomous agent is expected to complete the whole issue lifecycle:

1. inspect current repository and authoritative docs;
2. implement the issue completely;
3. add/update tests and fixtures;
4. reconcile documentation and examples;
5. run all relevant local automated checks available in the environment;
6. create a focused branch and pull request;
7. inspect CI and repair failures attributable to the change;
8. when all required automated checks pass and no unresolved blocking review exists, merge the PR using an allowed repository merge method;
9. verify the merge actually landed on `main`;
10. close the issue only when its acceptance criteria are genuinely satisfied.

Do not claim completion from a passing unit test alone when the issue requires browser behavior, determinism evidence, accessibility, or integration behavior.

## Pull request evidence

PR descriptions should include:

- issue(s) addressed;
- concise implementation summary;
- architectural decisions or deviations;
- exact verification commands and results;
- screenshots/recordings only when they add useful visual evidence;
- residual limitations or follow-up work.

## Stopping conditions

Stop and leave the issue open rather than forcing a merge if:

- an unresolved contradiction changes the required semantics materially;
- a prerequisite issue is not actually satisfied;
- required checks cannot be made trustworthy;
- the implementation would require inventing CyberSand behavior not represented by the teaching model or available evidence;
- a change would violate deterministic replay or the architecture's model/trace/render separation.

Record the blocker precisely in the issue or PR so another agent can resume from repository state without chat history.
