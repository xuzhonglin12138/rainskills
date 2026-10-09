# Phase 1–5 cumulative Codex host AB/BA report

Date: 2026-10-09  
Base: `e7fca2f9cafe2fcad64422e3411bc03c5925c57b`  
Candidate: `812b2999241da0833de7d475b2d85f4a73b196f8`  
Model: `gpt-5.6-sol`, reasoning `high`  
Codex build: `codex-cli 0.147.0`  
Run-order seed: `rainskills-phase1-5-abba-2026-10-09-v1`

## Decision

The cumulative candidate does **not** meet the host Token or latency targets in this fixture-only experiment. The primary scenario's pairwise median input Token change is **+3.34%** rather than the preregistered reduction of at least 40%, and its process-exit change is **+33.77%** rather than the secondary reduction target of at least 20%. The direction is consistent in both AB and BA blocks.

The Phase 1–5 changes therefore remain `neutral_refactor` on host-performance evidence. This result does not invalidate the deterministic byte and model-visible-call reductions, but those reductions must not be presented as measured Token or end-to-end latency gains.

## Protocol

- Frozen clean detached worktrees were used for both SHAs.
- The current provider-aware harness was used for both bundles.
- Every run used `codex exec --json --ephemeral`, a new temporary workspace, the same model/reasoning pair, the same prompt and fixture for a scenario, and the same non-sensitive custom provider configuration.
- The primary `deploy-current-project` scenario ran 20 paired blocks: 10 `A→B` and 10 `B→A`, deterministically shuffled before execution.
- The other seven scenarios ran one exploratory pair each.
- Total: 27 pairs and 54 fresh Codex sessions.
- Failures/timeouts/cleanup failures: 0/0/0.
- One candidate response was classified `blocked` because its correct fixture answer described a safety blocking condition; the process exited successfully and its usage was retained.
- One candidate run retried once and took about 100 seconds; it was retained as preregistered.

This remains `uncontrolled_fixture_only`: no external tools or Rainbond writes were permitted, and no disposable Rainbond reset/cleanup contract was available.

## Primary paired result

| Metric | Base p50 | Candidate p50 | Pairwise median change | Improved / tied / worsened | AB median | BA median |
|---|---:|---:|---:|---:|---:|---:|
| Input Token | 16,353.5 | 16,901 | **+3.34%** | 0 / 0 / 20 | +3.39% | +3.31% |
| Uncached input Token | 7,139 | 7,693 | **+7.58%** | 4 / 0 / 16 | +7.63% | +7.58% |
| Output Token | 969 | 1,210 | **+31.29%** | 3 / 0 / 17 | +37.97% | +28.43% |
| Total Token | 17,324 | 18,105 | **+4.76%** | 0 / 0 / 20 | +5.00% | +4.67% |
| Process exit | 27,599 ms | 36,058 ms | **+33.77%** | 4 / 0 / 16 | +36.45% | +28.43% |
| Turn completed | 23,432 ms | 33,032 ms | **+39.05%** | 4 / 0 / 16 | +44.78% | +34.90% |

Cached input had a 9,216-token p50 for both treatments among pairs with a non-zero base, so cache reuse did not reverse the primary result. The candidate's median reasoning output was 1,036 tokens versus 792 for the base, and its median final message was 220.5 characters versus 198. The increased model reasoning/output is the clearest measured contributor to the latency regression, although the host trace does not expose a causal explanation.

## Exploratory scenario results

These seven rows have only one pair each. They are directional diagnostics, not stable performance estimates.

| Scenario | Input Token change | Output Token change | Process-exit change |
|---|---:|---:|---:|
| `deploy-bare-git` | −1.61% | −32.64% | +6.47% |
| `create-three-component-topology` | +3.46% | −7.14% | −15.24% |
| `diagnose-missing-dependency` | +3.59% | +40.78% | −11.09% |
| `verify-same-host-api-failure` | +3.79% | 0.00% | +10.18% |
| `initialize-monorepo` | −1.51% | +43.81% | +35.69% |
| `install-plugin-and-resume-ai` | +3.56% | −0.73% | +22.67% |
| `reject-unsupported-multimodal-bypass` | +3.77% | +43.24% | +44.73% |

Across all 27 heterogeneous pairs, the pairwise medians were +3.37% input Token, +4.65% total Token, and +30.17% process-exit time. These pooled figures are descriptive only; the primary 20-pair scenario is the decision metric.

## Integrity checks

- Planned/complete pairs: 27/27; planned/observed runs: 54/54.
- Base bundle digest was stable across all runs: `d1e98e96e0bf4b5f66b513c01cca93d25211b6e7a8e3530a30e78e973320e5f7`.
- Candidate bundle digest was stable across all runs: `b62cb2ae588a8e6046facaadaec029d6f42e4601717a69deb2d6e820ed108ee7`.
- Each scenario had exactly one prompt digest and one fixture digest across both treatments.
- All 54 runs reported observed Codex usage and exit code 0.
- All cleanup results were `success`.
- Raw JSONL, stderr, and monotonic event timings are preserved under `host-artifacts/`.

## Interpretation boundary

This fixture asks the model to explain ownership, handoff, safety stop, and expected outcome without calling tools. Consequently, every run had zero tool calls, zero poll calls, and no observable reference-file reads. It does not exercise the Phase 4 HandoffContext reuse or Phase 5 snapshot/poll implementations, and it cannot measure their deterministic 71–80% model-visible-call reductions in a live deployment chain.

The experiment does establish that the current static fixture path does not convert the large entrypoint byte reduction into lower Codex usage. A valid end-to-end deployment claim still requires a disposable Rainbond environment with reset and cleanup, actual protected tool calls, and a live workflow benchmark. Production must not be used as the substitute canary.

Normalized paired data: `codex-host-abba.json`.
