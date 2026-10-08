# Rainskills Skill Token Baseline — before-2026-10-08

- Recorded at: 2026-10-08T08:01:06.639Z
- Git commit: `40ecfa7ac458d0f295397ab5437c680d936d1c26`
- Codex: `codex-cli 0.147.0`
- Model: `gpt-5.6-sol`
- Reasoning effort: `high`
- Repetitions: 1
- Config SHA-256: `0ba5fed7bf09dff80cc9978f609083f7ed7640726aa7bd28e6027509efde1c9c`

This is a fresh-session, read-only entrypoint measurement. It measures the real Codex input usage after explicitly selecting each installed Skill. It does not measure a full Rainbond deployment workflow.

| Skill | SKILL.md bytes | Input tokens | Δ vs control | Output tokens | Cached input | End-to-end ms | First item ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| control | - | 18803 | 0 | 5 | 0 | 7283 | 4200 |
| rainskills | 8958 | 20994 | 2191 | 5 | 0 | 11622 | 8847 |
| rainbond-ai-assistant | 5986 | 20278 | 1475 | 5 | 0 | 6955 | 3468 |
| rainbond-app-assistant | 6962 | 20497 | 1694 | 5 | 0 | 6012 | 3160 |
| rainbond-app-version-assistant | 24044 | 24528 | 5725 | 5 | 0 | 7302 | 4984 |
| rainbond-delivery-verifier | 26082 | 24788 | 5985 | 5 | 18560 | 5702 | 3180 |
| rainbond-env-sync | 23640 | 24543 | 5740 | 5 | 18560 | 5741 | 4335 |
| rainbond-fullstack-bootstrap | 43684 | 28714 | 9911 | 5 | 0 | 7897 | 3777 |
| rainbond-fullstack-troubleshooter | 65275 | 33187 | 14384 | 5 | 0 | 11272 | 6147 |
| rainbond-opensource-app-deploy | 6102 | 20321 | 1518 | 46 | 18560 | 6915 | 4630 |
| rainbond-platform-installer | 14703 | 22382 | 3579 | 38 | 16384 | 6986 | 5854 |
| rainbond-platform-plugin-manager | 3351 | 19682 | 879 | 5 | 18560 | 5486 | 3624 |
| rainbond-platform-query | 11004 | 21510 | 2707 | 5 | 16384 | 6807 | 4832 |
| rainbond-project-init | 57978 | 31808 | 13005 | 5 | 16384 | 5201 | 3932 |
| rainbond-template-installer | 23275 | 24399 | 5596 | 5 | 18560 | 6466 | 4266 |

## Interpretation boundary

- Cached input is already included in input tokens; reasoning output is already included in output tokens.
- The control includes the global Codex instructions, tool schemas, conversation scaffold, and all discovered Skill metadata.
- The per-Skill delta estimates the additional input caused by activating that Skill entrypoint for this fixed prompt.
- One repetition is a baseline snapshot, not a statistically stable latency benchmark. Use paired AB/BA repetitions for performance claims.
- No raw Codex JSONL or stderr is stored in the repository.
