# CHECKPOINT B — Context slimming

Date: 2026-10-08  
Branch: `main-bf`  
Frozen Phase 1 base: `072a6897300a7fb3ba750930e0140fbd4447d342`  
Final description candidate: `fd6aaf80ca3085358665c5a441d51784ae99f81b`

## Decision

All 14 discovery descriptions were treated independently and kept as `neutral_refactor`. The structural discovery payload fell from 5,026 to 3,584 UTF-8 bytes (−28.69%), while routing and the complete repository test suite remained green. This does not establish a Token or timing improvement: Codex host usage remained unavailable because `codex exec` authentication failed, and user-directed no-subagent execution made paired judging unavailable.

Phase 1 meets its maintenance budgets and routing guardrails. No performance claim is made, and Phase 2–6 remain unapproved at this checkpoint.

## Description treatments

The primary metric for every treatment is `description_utf8_bytes`. The preregistered minimum effect is at most 320 bytes for specialist Skills, at most 450 bytes for the top-level app assistant, and at most 260 bytes for the root installer.

| Skill | Before | After | Change | Budget | Candidate | Decision |
|---|---:|---:|---:|---:|---|---|
| `rainbond-app-assistant` | 1,110 | 438 | −60.54% | 450 | `e9471ea` | neutral_refactor |
| `rainbond-opensource-app-deploy` | 476 | 300 | −36.97% | 320 | `8f35947` | neutral_refactor |
| `rainbond-fullstack-troubleshooter` | 378 | 273 | −27.78% | 320 | `1053e93` | neutral_refactor |
| `rainbond-delivery-verifier` | 353 | 288 | −18.41% | 320 | `c31245a` | neutral_refactor |
| `rainbond-fullstack-bootstrap` | 341 | 276 | −19.06% | 320 | `dc1966a` | neutral_refactor |
| `rainbond-project-init` | 349 | 295 | −15.47% | 320 | `282d0a1` | neutral_refactor |
| `rainbond-template-installer` | 329 | 277 | −15.81% | 320 | `70e059b` | neutral_refactor |
| `rainbond-app-version-assistant` | 305 | 274 | −10.16% | 320 | `b5ddd2c` | neutral_refactor |
| `rainbond-ai-assistant` | 301 | 228 | −24.25% | 320 | `f7e8e1a` | neutral_refactor |
| `rainbond-env-sync` | 274 | 230 | −16.06% | 320 | `f0ccd69` | neutral_refactor |
| `rainbond-platform-plugin-manager` | 253 | 188 | −25.69% | 320 | `19a4045` | neutral_refactor |
| `rainbond-platform-query` | 210 | 190 | −9.52% | 320 | `d564479` | neutral_refactor |
| `rainbond-platform-installer` | 181 | 163 | −9.94% | 320 | `1c2e7e1` | neutral_refactor |
| `rainskills` | 166 | 164 | −1.20% | 260 | `fd6aaf8` | neutral_refactor |
| **Total** | **5,026** | **3,584** | **−28.69%** | — | — | **neutral_refactor** |

Each row has a separate preregistered experiment record in `benchmarks/skill-performance/experiments/phase1-*-description.yaml`, including the base/candidate SHA, prompt and fixture digests, guardrails, measurement, validation, and rollback boundary.

## Main-file footprint

Across the 14 source `SKILL.md` entry files, the combined size changed from 302,073 to 300,631 UTF-8 bytes (−1,442 bytes, −0.48%). Only discovery metadata changed in each treatment; the root marketplace copy was regenerated mechanically after its source description changed.

## Routing and correctness

- Skill routing fixtures: 37/37 passed, with all 57 marker checks passing.
- Effect corpus: 28/28 cases remained hash-valid.
- Adjacent routing boundaries remained green, including bare Git Harbor forks, named Harbor suites, market templates, ordinary image apps, AI plugin versus model deployment, and generic deployment versus bounded bootstrap/troubleshoot/delivery.
- Every treatment passed its description budget and semantic-boundary assertions.

## Runtime and installation validation

- `npm test`: passed after every description candidate, including the final 14-Skill state.
- AI Engine and plugin progressive-loading/policy suites: passed.
- Platform installer suite: 246/246 passed.
- Runtime onboarding, marketplace generation, single-runtime, installer TTY, signal cleanup, and npx PTY suites: passed.
- Root marketplace package was regenerated and its committed-output check passed.

## Unavailable evidence

- Host Token change: `unavailable` (`codex exec` rejected the stored API credential with HTTP 401).
- Host timing change: `unavailable` for the same reason.
- Paired judge: `unavailable` because the user explicitly required the remaining modifications to be performed without subagent delegation, and the independent host runner was unavailable.

These gaps prevent a `keep` performance decision. The accepted result for every treatment is therefore `neutral_refactor`, based only on independently useful maintenance value and passing guardrails.
