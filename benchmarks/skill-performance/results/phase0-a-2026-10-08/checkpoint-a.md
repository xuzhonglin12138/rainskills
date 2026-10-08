# CHECKPOINT A — Phase 0 baseline

Status: **approved for maintenance-only Phase 1 on 2026-10-08**

Human owner: user

Frozen base SHA: `e7fca2f9cafe2fcad64422e3411bc03c5925c57b`

Candidate SHA: `null`

## Correctness Track

All six approved corrections were implemented as independent commits and passed deterministic negative tests. The treatment, base/candidate SHA, tests, and safety guardrails are recorded in `correctness-track.yaml`.

| Treatment | Commit | Result |
|---|---|---|
| CT-1 Platform Query | `379f2c4` | passed |
| CT-2 Project Init | `f18216a` | passed |
| CT-3 Bootstrap | `37b69b1` | passed |
| CT-4 Troubleshooter | `8c5ad35` | passed |
| CT-5 Env Sync | `783b0b4` | passed |
| CT-6 Delivery Verifier | `8cb9de3` | passed |

## Phase 0A — repository layer

Data source: `static_bundle_and_mock_trace`.

- 14 logical Skills and 28 hash-pinned effect cases validated.
- 8 deterministic benchmark scenarios completed.
- Total scenario Markdown bytes: `445919` UTF-8 bytes.
- Mock-visible CLI calls: `8`.
- Mock backend requests: `13`.
- Mock poll calls: `4`.
- Mock transport bytes: `12534`.
- Model Token and model timing: `unavailable` by design for this layer.
- Behavior status is `not_executed`; repository fixtures validate policy, routing, hashes, packaging, and safety invariants rather than claiming a real model run.

Full normalized data: `repository.json`.

## Phase 0B — Codex host layer

Runner controls and fingerprints:

- async `codex exec --json --ephemeral` with stdin disabled;
- fresh isolated workspace and candidate `.agents/skills` bundle;
- fixed model `gpt-5.6-sol`, reasoning `high`, Codex CLI `0.147.0`;
- actual bundle, manifest, prompt, fixture, and validator digests;
- monotonic event-arrival timestamps and overlap-aware tool span union;
- 0600 stdout/stderr/timed-event artifacts with credential-shaped text redacted.

Observed limitations:

- No controlled Rainbond test environment, fixture reset, or cleanup contract is available. All write scenarios are `unavailable`; production was not used as a substitute.
- The read-only same-host API scenario attempted one fresh Codex run. `codex exec` retried nine times and failed authentication with HTTP 401 before `turn.completed`; no Skill behavior, Token usage, or valid model latency was observed.
- Primary scenario A-only repetitions: `unavailable` because it is a write scenario and the controlled environment is absent.
- Input, cached input, output, reasoning, total Token, cache ratio, compaction, tool attribution, and external platform wait: `unavailable`.
- Raw redacted artifacts are local under `/tmp/rainskills-phase0-a-artifacts`; they are intentionally not committed.

Full normalized data: `codex-host.json`.

## Current structure diagnostics

- Main `SKILL.md` total: `302073` bytes across 14 Skills.
- Discovery descriptions total: `5026` bytes.
- Largest entrypoints: troubleshooter `55016`, project-init `47231`, bootstrap `43684`, delivery-verifier `28783` bytes.
- `rainbond-app-assistant` description: `1110` bytes, above the proposed Phase 1 budget.
- Darwin runtime-neutrality scan hits only explicitly runtime-specific Codex sandbox/session instructions; these are documented exceptions, so `runtime_scan=false_positive`.

These are diagnostics, not performance results. Correctness-driven deletions are not counted as Token or latency gains.

## Test evidence

- `npm test`: passed.
- Effect corpus: 28/28 validated.
- Repository benchmark: 8/8 generated.
- Correctness-specific negative tests: passed.
- Package tests: confirm no `test-prompts.json`, root `results.tsv`, or effect-eval source is published.

## Decision gate

The current evidence does **not** prove discovery metadata is a material user-perceived bottleneck because valid host Token/timing telemetry is unavailable. The user explicitly approved continuing with maintenance-only Phase 1. Each treatment remains ineligible for a performance claim and is classified `neutral_refactor` unless later controlled evidence reaches a preregistered user-perceived minimum effect. Phase 2–6 remain unapproved.

Approval conditions:

1. host Token/timing remains `unavailable` until Codex CLI authentication is repaired;
2. the newly connected Rainbond environment is not used for write benchmarks until reset and cleanup are defined;
3. no description treatment may claim performance improvement from byte reduction alone;
4. deterministic routing and safety guardrails plus the required human checkpoint replace unavailable independent judges; this is a user-directed exception to the Darwin workflow, not equivalent evidence.
