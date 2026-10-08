# Skill Token Baseline

This benchmark records the real Codex token usage for the installed Rainskills entrypoints without calling Rainbond or modifying files.

## Before measurement

```bash
node benchmarks/skill-performance/measure-skill-tokens.mjs \
  --label before-YYYY-MM-DD \
  --model gpt-5.6-sol \
  --reasoning-effort high \
  --repetitions 1
```

## After measurement

After installing the modified Skill bundles, rerun the identical command with a new label:

```bash
node benchmarks/skill-performance/measure-skill-tokens.mjs \
  --label after-YYYY-MM-DD \
  --model gpt-5.6-sol \
  --reasoning-effort high \
  --repetitions 1
```

The two measurements are comparable only when the Codex version, model, reasoning effort, config digest, prompts, and installed Skill bundle digests are recorded and reviewed.

## Interpretation

- `input_tokens` includes `cached_input_tokens`.
- `output_tokens` includes `reasoning_output_tokens`.
- Do not add cached input to input tokens or reasoning output to output tokens.
- The control includes global Codex instructions, tool definitions, conversation scaffolding, and all discovered Skill metadata.
- Each Skill delta estimates the additional input caused by explicitly activating that entrypoint for the fixed prompt.
- A single repetition is a before/after context snapshot, not a stable latency benchmark.
- Performance claims require a preregistered paired AB/BA experiment with repeated runs.
- The runner stores only sanitized metrics and digests. Raw JSONL and stderr are not persisted.

## Files

Each result directory contains:

- `summary.json`: machine-readable environment, bundle digests, run metrics, and aggregates.
- `report.md`: human-readable table and interpretation boundary.

The baseline created on 2026-10-08 is in `results/before-2026-10-08/`.
