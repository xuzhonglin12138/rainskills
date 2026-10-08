# CHECKPOINT D — Execution-speed optimization complete

Date: 2026-10-08  
Branch: `main-bf`  
Phase 3 base: `ce965f66a178825499d6f4e3c8f415df2b58c27f`  
Final Phase 5 candidate: `812b2999241da0833de7d475b2d85f4a73b196f8`

## Decision

Phase 3, Phase 4, and Phase 5 are complete under the user's preapproval. All deterministic tests and safety guardrails passed. Host Token/timing and paired-judge evidence remain unavailable, so every treatment is retained as `neutral_refactor`; this report does not claim that the overall performance Definition of Done has been met.

## Phase 3 — Minimal entrypoint routers

| Skill | Before bytes | Candidate bytes | Change | Budget | Candidate |
|---|---:|---:|---:|---:|---|
| `rainbond-project-init` | 39,028 | 6,104 | −84.36% | 14 KiB | `0e025bc` |
| `rainbond-fullstack-bootstrap` | 33,846 | 7,176 | −78.80% | 14 KiB | `2062af1` |
| `rainbond-fullstack-troubleshooter` | 46,353 | 5,849 | −87.38% | 16 KiB | `2ded53d` |
| `rainbond-delivery-verifier` | 19,705 | 5,519 | −71.99% | 12 KiB | `e4735d3` |
| `rainbond-env-sync` | 17,222 | 4,978 | −71.10% | 12 KiB | `f092ad3` |
| `rainbond-template-installer` | 14,558 | 4,903 | −66.32% | 12 KiB | `5fdf9bf` |
| `rainbond-app-version-assistant` | 16,306 | 4,950 | −69.64% | 12 KiB | `adcbbbb` |
| `rainbond-platform-query` | 4,095 | 3,141 | −23.30% | 8 KiB | `10a1016` |
| **Total** | **191,113** | **42,620** | **−77.70%** | — | — |

All eight entrypoints now use the common Purpose/Fast path/Conditional reading/Workflow/Hard stops/Safety/Output/Anti-pattern structure. Conditional rows load at most two supporting documents; every supporting Markdown document is at most 16 KiB. Detailed rules were moved, not copied, and all links are validated in source, packed npm content, and embedded artifacts.

## Phase 4 — HandoffContext

Candidate: `d52a844`

- Added transport-neutral `rainskills.handoff-context.v1` with generated per-bundle schemas.
- Protected CLI creates deterministic runtime and identity SHA-256 fingerprints; the model cannot provide them directly.
- Five-stage deterministic chain: runtime status 5 → 1, context resolve 5 → 1.
- Mutable runtime/delivery state is bounded to 30 seconds unless a revision proves freshness.
- reconnect, 401/403, profile/endpoint/workspace/app/source changes, not-found, and revision conflict invalidate reuse.
- Context excludes JWT/token/password/secret, confirmation IDs, raw logs, and raw tool output.
- Validation: 7/7 HandoffContext tests passed.

## Phase 5 — Tool round trips and polling

### Read snapshot

Candidate: `8d107e8`

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Model-visible read calls | 2 | 1 | −50% |
| Backend requests for the same evidence | 2 | 2 | 0% |

The protected `snapshot` command accepts one to eight known read-only requests through stdin, runs them concurrently, preserves unavailable evidence, removes sensitive fields, bounds output to 96 KiB, and requires cursor/time/tail bounds for log or event reads. It never exposes mutation confirmation and writes no artifact.

### Protected polling

Candidate: `812b299`

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Model-visible poll calls | 5 | 1 | −80% |
| Backend read requests | 5 | 5 | 0% |
| Repeated unchanged states emitted | 4 | 0 | −100% |

The protected `poll` command accepts only read-classified tools and explicit status path, terminal/failure values, interval, attempt, and timeout budgets. It returns state transitions, final state, blocker, retryability, attempts, omitted-unchanged count, and elapsed time. Read failure is not retried automatically; cancellation and budget exhaustion return bounded non-success results.

Across the two deterministic Phase 5 fixtures, model-visible calls changed from 7 to 2 (−71.43%) while backend evidence requests remained 7. This is repository-level evidence only, not a host performance claim.

## Repository benchmark diagnostics

The final deterministic repository artifact is `repository.json`:

- scenarios: 8
- markdown bytes read: 264,495
- model-visible tool calls in the existing scenario traces: 8
- backend requests: 13
- poll calls in the existing scenario traces: 4
- transport bytes: 12,534
- Token metrics: unavailable
- model timing: unavailable

The scenario trace counters predate the two focused Phase 5 fixtures and are retained as diagnostics; the preregistered snapshot/poll measurements above are the treatment-specific primary metrics.

## Host timing, Token, and paired results

A final fixture-only `codex exec --json --ephemeral` attempt was started with the frozen model and reasoning effort. It produced no events and did not exit within 120 seconds, so it was interrupted. Earlier Phase 0 attempts recorded HTTP 401 for the stored API credential.

Therefore all required host statistics are unavailable:

- paired-result p50: unavailable
- observational p95: unavailable
- raw JSONL: unavailable; no events were produced
- normalized usage and input/output/cached Token counts: unavailable
- `turn_completed_ms`, `process_exit_ms`, first event/tool/progress: unavailable
- tool span union and external-wait attribution: unavailable
- cache write/read and miss reason: unavailable

No byte count or deterministic call count is presented as a Token or latency substitute.

## Safety gates

- `npm test`: passed on every treatment and the final Phase 5 candidate.
- Routing: 37/37 fixtures and 57/57 marker checks passed.
- Effect corpus: 28/28 hash-valid.
- Runtime Gate/Runtime Routing generation: 8/8 passed.
- Shared contract generation: 4/4 passed.
- HandoffContext: 7/7 passed.
- Read snapshot: 5/5 passed.
- Protected poll: 5/5 passed.
- Platform installer: 246/246 passed.
- AI Engine policy evals: 74 passed.
- Bootstrap fixtures: 18 passed.
- Write confirmation, 401/403, Device Flow, bounded delivery probe, package upload, installer TTY, signal cleanup, and npm packaging remained green.

Snapshot and poll commands are read-only and cannot reduce or bypass mutation confirmations. HandoffContext adds no persistent operation journal and stores no credentials.

## Rollback boundaries

- Each Phase 3 Skill has its own `refactor: slim ... entrypoint` commit.
- HandoffContext is isolated in `d52a844`.
- Read aggregation is isolated in `8d107e8`.
- Polling is isolated in `812b299`.

Phase 6 and Phase 7 were not authorized by the user's request to execute through Phase 5 and remain unexecuted.
