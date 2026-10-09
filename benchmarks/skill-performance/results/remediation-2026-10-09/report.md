# Performance and token remediation result

Date: 2026-10-09

Model: `gpt-5.6-sol`, reasoning `high`

Codex CLI: `0.147.0`

Provider: `OpenAI` / `responses`

Stable base: `10a1016f901944e68927c7563a6591c61e72208c`

Current starting point: `91c08aad35d339b00cd4fd4f728b641298a64d88`

All host runs used fresh sessions, independent clean worktrees, isolated `HOME` and `CODEX_HOME`, disabled user plugins, the same Community Card policy, and raw JSONL artifacts. The final parser SHA-256 was `b2484c720244f38d81c68bb2365987a9ca1eb6b7d8a97b79e8a51a23c6e7e7ea`.

## Decisions

| Treatment | Decision | Threshold result |
|---|---|---|
| Minimal host observation | **keep** | All correctness and non-regression guards passed; this is measurement infrastructure, not a performance claim. |
| Bounded default output | **keep** | Three successful Chinese fixtures were 76.78%–80.43% shorter; pilot output tokens improved in 4/5 pairs and wall-clock did not regress. |
| Exclusive snapshot/poll Skill path | **revert / stop** | Pilot output tokens regressed 11.92%; calls stayed 0→0 in the fixture and could not demonstrate the required 10% reduction. |
| Current HandoffContext | **stop** | Two-pair smoke wall-clock regressed 25.62% and output tokens 3.66%; no five-pair pilot was run. Schema and implementation remain unchanged because the fixture did not execute handoff and live testing was blocked. |
| Controlled Rainbond live canary | **blocked, not run** | Existing harness gives the Codex child both `danger-full-access` and a Rainbond JWT, permits inherited insecure HTTP policy, and defaults to mutable `nginx:alpine`; the document's live safety gate was not met. |

The release primary was not met: no safe matching-success live chain or formal 20-pair AB/BA was run, so there is no basis to claim a 20% end-to-end wall-clock reduction.

## 1. Minimal host observation

Base `91c08aa`; candidate `35ff695`. Prompt, fixture, and installed bundle were identical. Pilot raw result:

`/Users/guox/Desktop/Rainskills-remediation-artifacts-2026-10-09/01-host-observation/pilot/result.json`

Scheduled/eligible pairs: `5/5` (`100%`). Runs: `10 success`, `0 failure`, `0 timeout`, `0 cleanup failure`.

| Metric | Base p50 | Candidate p50 | Pairwise median | Direction |
|---|---:|---:|---:|---:|
| Wall-clock | 23,002 ms | 22,001 ms | -2.42% | 3/5 improved |
| First visible progress | 16,444 ms | 17,148 ms | +10.47% | 1/4 improved; one unavailable |
| Input tokens | 14,542 | 14,564 | +0.15% | 2/5 improved |
| Cached input tokens | 9,216 | 9,216 | 0.00% | 3 ties; cache presence varied in 2 pairs |
| Uncached input tokens | 5,370 | 5,348 | -0.41% | 3/5 improved |
| Output tokens | 885 | 859 | -3.79% | 3/5 improved |
| Reasoning output tokens | 703 | 668 | -4.12% | 3/5 improved |
| Total tokens | 15,449 | 15,445 | -0.37% | 3/5 improved |
| Final answer characters | 257 | 269 | +3.86% | 2/5 improved |
| Visible progress characters | 75 | 82 | +7.25% | 1/5 improved |
| Host turns | 1 | 1 | 0.00% | 5 ties |

Tool calls, reference reads, repeated reads, and reference bytes were all `0` in this tool-free fixture; tool category maps were empty. The runner now records `host_turns`, keeps true model roundtrips and per-message tokens `unavailable`, records final/progress characters, exact direct `sed`/`cat` reference bytes, tool categories, and outcome eligibility. It also supports the required odd five-pair pilot.

Hashes: prompt `8100a366317574c095a38d19bc3b836f64e56195638ea03bd694468ea2a57903`; fixture `5119c7d7f804f01508a4634bd2a472042c9b4bf2d7743ebcda02c23eff660645`; both bundles `b62cb2ae588a8e6046facaadaec029d6f42e4601717a69deb2d6e820ed108ee7`.

## 2. Bounded default output

Isolated base `10a1016`; isolated candidate `c95bd7b` contains only output changes. Pilot raw result:

`/Users/guox/Desktop/Rainskills-remediation-artifacts-2026-10-09/02-bounded-output/pilot/result.json`

Scheduled/eligible pairs: `5/5` (`100%`). Runs: `10 success`, `0 failure`, `0 timeout`, `0 cleanup failure`.

| Metric | Base p50 | Candidate p50 | Pairwise median | Direction |
|---|---:|---:|---:|---:|
| Wall-clock | 29,306 ms | 27,055 ms | -30.54% | 3/5 improved |
| First visible progress | 16,067 ms | 13,819 ms | -10.24% | 3/4 improved; one unavailable |
| Input tokens | 14,483 | 14,501 | +0.12% | 2/5 improved |
| Cached input tokens | 9,216 | 9,216 | 0.00% | 5 ties |
| Uncached input tokens | 5,289 | 5,285 | +0.34% | 2/5 improved |
| Output tokens | 886 | 709 | -19.98% | **4/5 improved** |
| Reasoning output tokens | 702 | 513 | -26.92% | 4/5 improved |
| Total tokens | 15,369 | 15,210 | -1.03% | 4/5 improved |
| Final answer characters in routing fixture | 223 | 218 | -2.24% | 3/5 improved |
| Visible progress characters | 87 | 84 | -3.45% | 3/5 improved |
| Host turns | 1 | 1 | 0.00% | 5 ties |

The routing fixture does not ask for a successful deployment report, so its final-character metric is not the success-template diagnostic. The three matched successful Chinese fixtures changed as follows:

| Scenario | Before | After | Change |
|---|---:|---:|---:|
| Delivered app | 374 chars | 81 chars | -78.34% |
| Delivered app with proxy history | 470 chars | 92 chars | -80.43% |
| Delivered, browser confirmation remains | 379 chars | 88 chars | -76.78% |

All three now contain one result, application, status, and address field. The validator rejects duplicate fields and fixed four-item next-action blocks. Community Card policy was unchanged on both sides. Tool and reference metrics were zero in the fixture.

Hashes: base bundle `ccadd74d9801e8544b92d0c29734f9ed36326f7c7d2c0b43b0ca6822879650f5`; candidate bundle `91bd3666ec807fdec2d0959defefc476285f0574b4e7ff7c32428d4aca61b434`; prompt and fixture hashes match section 1.

## 3. Exclusive snapshot/poll path

Isolated base `10a1016`; isolated candidate `b427fe6` contained snapshot/poll CLI capability plus the exclusive Skill rules, with no Handoff or output files in the tree diff. Pilot raw result:

`/Users/guox/Desktop/Rainskills-remediation-artifacts-2026-10-09/03-exclusive-snapshot-poll/pilot/result.json`

Scheduled/eligible pairs: `5/5` (`100%`). Runs: `10 success`, `0 failure`, `0 timeout`, `0 cleanup failure`.

| Metric | Base p50 | Candidate p50 | Pairwise median | Direction |
|---|---:|---:|---:|---:|
| Wall-clock | 20,980 ms | 17,495 ms | **+4.10%** | 2/5 improved |
| First visible progress | 14,871 ms | 10,958 ms | -1.65% | 3/5 improved |
| Input tokens | 14,505 | 14,483 | -0.15% | 3/5 improved |
| Cached input tokens | 9,216 | 9,216 | 0.00% | 4 ties; cache presence varied in one pair |
| Uncached input tokens | 5,289 | 5,311 | -0.15% | 3/5 improved |
| Output tokens | 675 | 640 | **+11.92%** | 2/5 improved |
| Reasoning output tokens | 507 | 444 | **+21.10%** | 2/5 improved |
| Total tokens | 15,180 | 15,109 | +0.71% | 2/5 improved |
| Final answer characters | 245 | 217 | -1.81% | 3/5 improved |
| Visible progress characters | 77 | 79 | +2.60% | 1/5 improved |
| Host turns | 1 | 1 | 0.00% | 5 ties |

Tool calls and reference reads were `0→0` in all five fixture pairs, so the required complete-chain call reduction was unobservable and no tool categories were exercised. Deterministic tests for duplicate read, duplicate poll scope, and query-after-budget exhaustion passed, but the pilot exceeded the output-token guard. Commit `f609d61` was therefore reverted by `e4f3af4`; no further pairs were run.

Hashes: candidate bundle `b8bcf7eb1fee9db1e5c6bafe87d2e7da4cdef88d9818cdbf9990c1f4a9218115`; base, prompt, and fixture hashes match section 2.

## 4. Current HandoffContext

The unchanged current implementation was tested independently against Phase 3. Full detail is in `handoff-smoke.md`; raw result:

`/Users/guox/Desktop/Rainskills-remediation-artifacts-2026-10-09/04-handoff-current/smoke/result.json`

Scheduled/eligible pairs: `2/2` (`100%`). Runs: `4 success`, `0 failure`, `0 timeout`, `0 cleanup failure`.

| Metric | Base p50 | Candidate p50 | Pairwise median |
|---|---:|---:|---:|
| Wall-clock | 20,955 ms | 23,841 ms | +25.62% |
| First visible progress | 15,518 ms | 19,132 ms | +45.10% |
| Input / cached / uncached tokens | 14,494 / 9,216 / 5,278 | 14,575 / 9,216 / 5,359 | +0.56% / 0.00% / +1.53% |
| Output / reasoning / total tokens | 905.5 / 702.5 / 15,399.5 | 924.5 / 720.5 / 15,499.5 | +3.66% / +5.64% / +0.66% |
| Final / progress characters | 259 / 103 | 254 / 80 | -2.02% / -22.24% |
| Host turns | 1 | 1 | 0.00% |

Tool and reference metrics were zero; no handoff was actually exercised. The candidate did not advance to five pairs. No Schema or implementation change was made.

Hashes: candidate bundle `f4ef1e72bafac04cbdc95667745ea92eb444b7e42dddc671ef53c4d2898b11ee`; base, prompt, and fixture hashes match section 2.

## Live canary blocker and safety outcome

No Rainbond write test was run and no Rainbond resource was created, changed, or deleted. The current controlled-live path is unsafe for this plan because:

- the Codex child is started with `danger-full-access`;
- the same child receives `RAINBOND_JWT` from the connected runtime;
- the harness does not prove that credential is short-lived and restricted to one disposable team;
- insecure HTTP may be inherited from the runtime;
- the default image is mutable `nginx:alpine`, not an immutable digest.

Therefore cleanup/exact-name absence assertions for a live canary are not applicable. Fixture cleanup was `success` for every scheduled run and performed no external deletion. No non-`rsb-*` resource was touched.

## Verification and release boundary

- Relevant tests were run test-first for each code treatment.
- Full `npm test` passed after each retained code change, after the isolated candidates, and after reverting the failed snapshot/poll treatment.
- No npm publish, tag, CDN/TOS update, vendor sync, main push, or release action was performed.
- Raw artifacts contain 0600 redacted stdout/stderr and `events.timed.jsonl`; prompt, fixture, bundle, parser, source commit, and run-order hashes are recorded in each result.

## Unmet items and smallest next step

Unmet: safe live canary, actual snapshot/poll and handoff tool execution, five-pair Handoff pilot, tool-call reduction, 20-pair formal AB/BA, and the release-primary 20% matching-success live wall-clock improvement.

Smallest next step: provide a short-lived credential technically scoped to one disposable team, use HTTPS and an immutable pre-pulled image digest, and remove `danger-full-access` from the credential-bearing Codex child. Then rerun only the current Handoff treatment as two live smoke pairs; do not restart the reverted snapshot/poll Skill path unless a tool-exercising fixture or safe live trace can measure complete-chain calls.
