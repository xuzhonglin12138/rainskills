# Rainskills Skill Quality Audit

Date: 2026-10-08

## Outcome

- Scope: 15 physical `SKILL.md` files representing 14 logical Skills. The marketplace `rainskills` copy was treated as generated packaging output rather than a separate Skill.
- Weighted Darwin baseline: **79.8 / 100**.
- Automated verification: `npm test` completed successfully with exit code 0. Windows-only host checks included two expected skips.
- Runtime neutrality: no confirmed gate failure. Regex hits for `Codex 中` are explicit host-specific execution branches. One real minor drift remains in `rainbond-env-sync`, whose example writes `"synced_by": "Claude Code"`.
- Effect comparison: 28 prompts were executed as paired agent simulations against a fresh generic-agent baseline. Rainskills was clearly better in 22, roughly tied in 4, and weaker or less deterministic in 2.
- No existing `SKILL.md` was modified.

The absolute scores are triage values, not deterministic measurements and not keep/revert criteria.

## Ranking

| Rank | Skill | Score | Primary constraint |
|---:|---|---:|---|
| 1 | rainbond-platform-installer | 90.3 | duplicated fixed-message authority and generic/cluster preflight overlap |
| 2 | rainbond-ai-assistant | 88.0 | important gates lack visible checkpoints; risk rules are distributed |
| 3 | rainbond-platform-plugin-manager | 86.2 | polling budget and cross-Skill resume contract are underspecified |
| 4 | rainbond-opensource-app-deploy | 85.8 | no end-to-end behavior fixture; unstable “latest stable” prompt |
| 5 | rainbond-delivery-verifier | 81.7 | external URL safety policy and delivery fixture coverage are incomplete |
| 6 | rainbond-fullstack-bootstrap | 81.1 | proxy rules conflict and persistence is not asserted by the happy-path eval |
| 7 | rainbond-fullstack-troubleshooter | 79.9 | duplicated schema text has drifted; main file is excessively large |
| 8 | rainbond-app-assistant | 78.7 | GitHub proxy and output-contract rules conflict |
| 9 | rainbond-env-sync | 76.5 | conflict gate contradicts drift overwrite rule |
| 10 | rainskills | 75.8 | update/repair refresh step and installer failure recovery are incomplete |
| 11 | rainbond-template-installer | 75.4 | model/version ambiguity and unknown write-result recovery are incomplete |
| 12 | rainbond-project-init | 73.1 | duplicated schemas and capability rules materially disagree |
| 13 | rainbond-app-version-assistant | 73.0 | snapshot disambiguation and destructive-operation checkpoints are incomplete |
| 14 | rainbond-platform-query | 72.1 | read-only contract exposes mutation commands and omits the documented query argv |

## Highest-priority findings

### P0 — Contract contradictions

1. **Platform query cannot execute its own stated fixed contract deterministically.** The runtime contract lists `read`, `call`, and `call_confirm`, including mutation-capable commands, while the read-only workflow later requires a `query <tool> --input -` command that is absent from the JSON contract. Evidence: `rainbond-platform-query/SKILL.md:107-134` and `:154-173`.

2. **Project init contains multiple canonical-schema conflicts.** The main Skill uses `mcp.server_name`, while its reference uses `platform.server_name`; the output contract disagrees on `app_id` type and next-action vocabulary; template execution is both supported and described as reserved/unimplemented. Evidence: `rainbond-project-init/SKILL.md:746-760`, `:876-884`, `:1164-1176`, `rainbond-project-init/references/manifest-rules.md:466`, and `rainbond-project-init/references/output-contract.md:35`.

3. **Bootstrap proxy policy has opposite instructions in root and modules.** The root automatically applies known GitHub/Docker Hub proxies, while modules ask first and provide mappings the root declares invalid. Evidence: `rainbond-fullstack-bootstrap/SKILL.md:323-333`, `modules/30-creation-rules.md:264-270`, and `modules/40-source-and-package-rules.md:49-59`.

4. **Troubleshooter's embedded result schema has already drifted from the real schema.** It says `mcp backend issue`, omits `config_file_configmap_missing`, and disagrees with the authoritative schema's `platform backend issue`. Evidence: `rainbond-fullstack-troubleshooter/SKILL.md:815-824` and `schemas/troubleshoot-result.schema.yaml:40-54`.

5. **Environment synchronization has an unsafe priority ambiguity.** Its conflict gate says stop without writing, but the later drift section says to trust remote state and update the file. It also marks `DB_NAME` as runtime metadata while a shared reference example persists it. Evidence: `rainbond-env-sync/SKILL.md:316-324`, `:366-368`, `:423-428`, and `rainbond-app-assistant/references/product-object-model.md:939`.

### P0 — Verification gaps

6. **Bootstrap can pass without proving database persistence.** The happy-path fixture validates dependencies but does not assert the MySQL storage rule that the Skill treats as mandatory before deploy. Evidence: `rainbond-fullstack-bootstrap/modules/30-creation-rules.md:118-166` and `evals/07-provider-connection-contract.*`.

7. **Troubleshooter's ConfigMap fixture can pass without the required restart.** The Skill requires one restart after a low-risk content re-save, but neither the response fixture nor oracle asserts that action. Evidence: `rainbond-fullstack-troubleshooter/references/root-cause-rules.md:201-206` and `evals/10-config-file-configmap-missing.*`.

8. **Delivery success is under-tested.** The delivered fixture proves the root URL but does not prove persistence or the static-frontend checks required by the Skill. The URL verifier also lacks executable restrictions for schemes, loopback/private addresses, redirects, and response-size limits. Evidence: `rainbond-delivery-verifier/SKILL.md:311-331`, `:392-400`, and `evals/01-delivered-verified.*`.

### P1 — Architecture and failure recovery

9. **Several large Skills duplicate generated/runtime contracts inside their main files.** `rainbond-project-init` is 1,188 lines and `rainbond-fullstack-troubleshooter` is 1,074 lines. Duplication has already produced schema and enum drift. Canonical schemas should be referenced or generated, not manually repeated.

10. **The root installer Skill does not define a fixed update command or recovery from malformed/missing completion markers.** Its update flow says to refresh the marketplace Skill first but gives no executable contract. Evidence: `SKILL.md:13-27`.

11. **Version and template flows lack deterministic ambiguity handling.** App version has no rule for natural-language snapshot references such as “yesterday's snapshot”; template selection has no model ambiguity rule and no executable definition of “latest stable-looking version.” Evidence: `rainbond-app-version-assistant/SKILL.md:323-341` and `rainbond-template-installer/SKILL.md:303-320`.

12. **Important write gates are semantically present but visually weak.** AI deployment, plugin installation, bootstrap and troubleshooting contain confirmations, yet often lack the explicit `CHECKPOINT` / `STOP` markers required by the Darwin rubric. This is lower risk than contract contradictions because executable approval rules do exist.

## Effect comparison

The Skill-guided runs most clearly outperformed the generic baseline in these cases:

- rejecting `extra_argv` as a workaround for missing multimodal API capability;
- refusing to guess a team during project initialization;
- stopping a component query when a required positive integer `app_id` is absent;
- preserving source-vs-open-source-suite routing for a repository named `harbor-fork`;
- using protected host-cluster credential collection rather than requesting secrets in chat;
- preserving original AI deployment intent through plugin installation;
- enforcing bounded topology and troubleshooting writes with read-back verification.

The generic baseline was stronger in two cases:

- it explicitly disambiguated “yesterday's snapshot,” which the version Skill does not encode;
- it gave the local-wins conflict instruction higher priority during preview environment sync, whereas the Skill's later drift section can override the earlier conflict gate.

## Verification executed

- Full repository suite: `npm test` — PASS, exit 0.
- Marketplace entry and package generation checks — PASS.
- AI Engine tests and 74 policy evals — PASS.
- Runtime routing: 37 routing fixtures and 57 marker checks — PASS.
- Platform installer: 246 tests — PASS.
- App assistant response fixtures: 17/17 — PASS.
- Bootstrap fixtures: 18/18 — PASS.
- Troubleshooter fixtures: 10/10 — PASS.
- Delivery verifier fixtures: 6/6 — PASS.
- Project-init gate tests: 5/5 — PASS.
- Markdown link integrity and user-facing output contracts — PASS in the full suite.

## Recommended optimization order

1. `rainbond-platform-query`: make the read-only query argv canonical and remove mutation contracts.
2. `rainbond-project-init`: select one authoritative local binding/output schema and delete duplicated drifted text.
3. `rainbond-fullstack-troubleshooter`: generate or reference the authoritative schema; add the missing restart assertion.
4. `rainbond-fullstack-bootstrap`: unify proxy policy and assert mandatory persistence.
5. `rainbond-env-sync`: make conflict-stop outrank drift reconciliation and remove runtime-specific metadata.
6. `rainbond-delivery-verifier`: encode URL safety and strengthen delivered-path fixtures.
7. `rainbond-app-version-assistant` and `rainbond-template-installer`: add deterministic ambiguity and unknown-result recovery rules.
8. Remaining Skills: add explicit visual checkpoints and consolidated risk blacklists only where they improve execution without increasing duplication.

## Audit artifacts

- One `test-prompts.json` per logical Skill, 28 prompts total.
- Root `results.tsv` with the 14 baseline scores.
- This report.
