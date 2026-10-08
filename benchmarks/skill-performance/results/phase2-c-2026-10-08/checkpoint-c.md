# CHECKPOINT C — Canonical contracts complete

Date: 2026-10-08  
Branch: `main-bf`  
Phase 2 base: `09494bdb3959b84a87c762ba6b29405f32ed3e09`  
Final Phase 2 candidate: `ceea9c308050d388b1d5958ef8b2819060243de0`

## Decision

Phase 2 completed as four independently preregistered treatments. All deterministic guardrails passed, but host Token/timing and independent paired-judge evidence remained unavailable. Every treatment is therefore retained only as `neutral_refactor`; no performance claim is made.

The combined 14 source `SKILL.md` entrypoints fell from 300,631 to 236,844 UTF-8 bytes (−63,787 bytes, −21.22%). The complete independently installed `rainbond-*` bundles grew from 1,947,405 to 1,972,542 bytes (+25,137 bytes, +1.29%) because each bundle now carries its required generated references. This is an intentional progressive-disclosure tradeoff: entrypoint context is smaller, while standalone packages remain self-contained.

Phase 3–6 remain unapproved at this checkpoint.

## Independent treatments

| Treatment | Editable blocks/bytes before | After | Source entrypoint bytes | Generated references | Candidate | Decision |
|---|---:|---:|---:|---:|---|---|
| Runtime Gate | 8 / 49,939 | 0 / 0 | 300,631 → 250,075 | 79,515 bytes | `31011c5` | neutral_refactor |
| Runtime Routing | 12 / 12,489 | 0 / 0 | 250,075 → 243,584 | 12,471 bytes | `d398af2` | neutral_refactor |
| Community Card | 11 / 11,781 | 0 / 0 | 243,584 → 237,192 | 13,376 bytes | `37c7009` | neutral_refactor |
| Default user result | 2 / 3,642 | 0 / 0 | 237,192 → 236,844 | 12,936 bytes | `ceea9c3` | neutral_refactor |

Each row has its own record under `benchmarks/skill-performance/experiments/phase2-*.yaml`, including base/candidate SHA, fixed prompt and fixture hashes, primary metric, minimum effect, guardrails, measurements, and rollback boundary.

## Unique authority locations

| Contract | Editable authority | Per-Skill generated output |
|---|---|---|
| CLI Runtime Gate | `contracts/runtime/cli-base.md` + `contracts/runtime/skills/*.yaml` | `references/generated/runtime-gate.md` |
| Embedded Runtime Gate | `contracts/runtime/embedded-base.md` + the same overlay | `references/generated/runtime-gate.md` in embedded artifacts |
| Runtime overlay schema | `contracts/runtime/overlay.schema.json` | validated during rendering |
| Runtime Routing | `contracts/runtime/routing-modes.yaml` + overlay `missing_runtime_mode` / `resume_target` | `references/generated/runtime-routing.md` |
| Community Card | `contracts/shared/community-card.md` | `references/generated/community-card.md` |
| Default user-result policy | `contracts/shared/user-result.md` | `references/generated/user-result.md` |

`scripts/sync-runtime-contracts.mjs` renders Runtime Gate and Runtime Routing. `scripts/sync-shared-contracts.mjs` renders Community Card and default user-result policy. Both support write and `--check` modes; all generated files bind a SHA-256 source digest.

## Removed duplicate definitions

- Complete Runtime Gate marker blocks in source entrypoints: 8 → 0.
- Editable Runtime Routing marker blocks across entrypoints and legacy references: 12 → 0.
- Editable Community Card marker blocks: 11 → 0.
- Editable default user-result marker blocks: 2 → 0; delivery and troubleshooting retain only their Skill-specific templates and schemas.
- Four legacy editable `references/runtime-gate.md` files and four legacy editable `references/runtime-routing.md` files were removed.
- Embedded profile construction now renders from the same overlays instead of regex-rewriting CLI Runtime Gate text.

## Drift and negative tests

- Unknown overlay keys, missing/invalid modes, incompatible command sets, unsupported profiles, and stale generated content fail closed.
- CLI command sets remain Skill-bound; platform query retains only `query`, delivery retains `delivery_probe`, and bootstrap retains `package_upload`.
- Generated reference changes alter the complete Skill bundle digest.
- Embedded artifacts reject CLI launchers, `rainskills-tools.js`, Device Flow, protected-state paths, client menus, and local package behavior.
- Existing-resource modes cannot offer local/server platform installation; new-application mode retains exactly the four flattened choices.
- Editable duplicate marker blocks cause the shared-contract check to fail.
- Markdown links are verified in source, packed npm content, and embedded artifacts.
- Release and prepack workflows now check runtime and shared generated contracts before packaging.

## Correctness Track closure evidence

| Item | Closure commit | Canonical/negative evidence |
|---|---|---|
| CT-1 Platform Query | `379f2c4` | Fixed `query <tool> --input - --skill-id rainbond-platform-query`; mutation-shaped and unbound query tools fail before network access. |
| CT-2 Project Init | `f18216a` | Canonical binding path, integer/null `app_id`, closed `next_action`, and template handoff covered by `test:project-init-contract`. |
| CT-3 Bootstrap | `37b69b1` | Single proxy policy plus persistence, dependency direction, provider contract, and ordering-negative fixtures in `test:bootstrap-contract`. |
| CT-4 Troubleshooter | `8c5ad35` | Schema-owned result contract and ConfigMap save/restart/fresh-verification negative fixture in `test:troubleshooter-contract`. |
| CT-5 Env Sync | `783b0b4` | Conflict gate precedence, stable producer ID, and source-dependent `DB_NAME` fixtures in `test:env-sync-contract`. |
| CT-6 Delivery Verifier | `8cb9de3` | Bounded probe schemas and negative coverage for unsafe URLs, DNS, redirects, timeout, oversized bodies, and unavailable adapters in `test:delivery-probe`. |

No source `SKILL.md` copies a complete ProjectInit or Troubleshoot result schema, and the generated Runtime command contracts preserve the Correctness Track command and field boundaries.

## Final validation

- `npm test`: passed on the final Phase 2 candidate.
- Runtime contract generation: 8/8 passed.
- Shared contract generation: 4/4 passed.
- Routing: 37/37 fixtures and 57/57 marker checks passed.
- Effect corpus: 28/28 hash-valid.
- Platform installer: 246/246 passed.
- AI Engine policy evals: 74 passed.
- Bootstrap fixtures: 18 passed.
- `check:runtime-version`, `check:runtime-contracts`, `check:shared-contracts`, `check:marketplace`, and `check:ai-engine-contract`: passed.
- npm packaging, installer TTY, signal cleanup, and npx PTY suites: passed.

## Unavailable evidence

- Host Token change: `unavailable` because `codex exec` rejected the stored API credential with HTTP 401.
- Host timing change: `unavailable` for the same reason.
- Paired judge: `unavailable` because the user required no subagent delegation and the independent host runner was unavailable.

These gaps prevent strict Performance Track `keep` decisions. Human approval is required before any Phase 3 work.
