# Current HandoffContext independent smoke

- Base: `10a1016f901944e68927c7563a6591c61e72208c` (Phase 3)
- Candidate: `d52a844d749ea9e86fa082c02a67d6679a97fee4`
- Model: `gpt-5.6-sol`, reasoning `high`, Codex CLI `0.147.0`
- Provider: `OpenAI` / `responses`
- Parser SHA-256: `b2484c720244f38d81c68bb2365987a9ca1eb6b7d8a97b79e8a51a23c6e7e7ea`
- Prompt SHA-256: `8100a366317574c095a38d19bc3b836f64e56195638ea03bd694468ea2a57903`
- Fixture SHA-256: `5119c7d7f804f01508a4634bd2a472042c9b4bf2d7743ebcda02c23eff660645`
- Base bundle SHA-256: `ccadd74d9801e8544b92d0c29734f9ed36326f7c7d2c0b43b0ca6822879650f5`
- Candidate bundle SHA-256: `f4ef1e72bafac04cbdc95667745ea92eb444b7e42dddc671ef53c4d2898b11ee`
- Raw result: `/Users/guox/Desktop/Rainskills-remediation-artifacts-2026-10-09/04-handoff-current/smoke/result.json`

## Result

Scheduled/eligible pairs: `2/2` (`100%`). Runs: `4 success`, `0 failure`, `0 timeout`, `0 cleanup failure`.

| Metric | Base p50 | Candidate p50 | Pairwise median change |
|---|---:|---:|---:|
| Wall-clock | 20,955 ms | 23,841 ms | +25.62% |
| First visible progress | 15,518 ms | 19,132 ms | +45.10% |
| Input tokens | 14,494 | 14,575 | +0.56% |
| Cached input tokens | 9,216 | 9,216 | 0.00% |
| Uncached input tokens | 5,278 | 5,359 | +1.53% |
| Output tokens | 905.5 | 924.5 | +3.66% |
| Reasoning output tokens | 702.5 | 720.5 | +5.64% |
| Total tokens | 15,399.5 | 15,499.5 | +0.66% |
| Final answer characters | 259 | 254 | -2.02% |
| Visible progress characters | 103 | 80 | -22.24% |
| Host turns | 1 | 1 | 0.00% |

Fixture tool calls and reference reads were `0` on both sides, so tool categories were empty and the smoke did not exercise an actual handoff. AB/BA wall-clock directions disagreed (`+66.60%` versus `-15.36%`).

Decision: **stop**. The smoke exceeded the `+10%` wall-clock and `+3%` output-token guards, so it did not advance to a five-pair pilot. This is not a schema revert: fixture evidence did not exercise handoff, while safe live canary was blocked by the existing high-privilege credential/sandbox design.
