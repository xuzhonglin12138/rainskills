# Rainskills corrected phase and live-chain comparison

Date: 2026-10-09  
Model: `gpt-5.6-sol`, reasoning `high`  
Codex: `codex-cli 0.147.0`

## Corrected decision

The earlier cumulative fixture report was contaminated by user-scoped Rainskills Skills and plugins. The host runner used a fresh workspace but did not isolate `HOME` and `CODEX_HOME`; therefore the old repository bundle and the installed current bundle could both participate in discovery. The corrected runner now:

- creates an isolated `HOME` and `CODEX_HOME` for every session;
- copies only the Codex authentication file with mode `0600`;
- disables local and remote plugins;
- installs exactly one repository-scoped bundle under `.codex/skills`;
- fingerprints the active bundle, prompt, fixture, runner, base SHA, and candidate SHA;
- uses clean, detached repositories at `/Users/guox/Desktop/Project/rainskills-before` and `/Users/guox/Desktop/Project/rainskills-after`.

This follows the documented Skill loading model: metadata is loaded for discovery, the selected `SKILL.md` is loaded on activation, and references are read only when needed.

## Phase-level fixture AB/BA

Phase 1, Phase 2, and the Phase 3 primary scenario each used 20 paired blocks: 10 `A→B` and 10 `B→A`. Every run used a fresh Codex session, identical prompt/fixture hashes, isolated repository Skills, and the same provider/model settings. Phase 3 also ran one exploratory pair for every other existing scenario.

| Phase | Treatment | Input Token | Uncached input | Output Token | Total Token | Process exit | Direction |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | 14 discovery descriptions | **−2.85%** | **−7.49%** | +5.97% | **−2.32%** | −0.66% | input improved in 19/20 pairs |
| 2 | generated shared contracts | +0.41% | +1.13% | −14.36% | −0.25% | −8.70% | input worsened in 20/20; total effectively flat |
| 3 | minimal `project-init` entrypoint | **−33.94%** | **−59.34%** | −10.00% | **−33.04%** | −5.82% | input and total improved in 20/20 pairs |

Phase 1 establishes a small real discovery-input saving, not a 28.69% Token saving. Phase 2 remains a maintenance refactor. Phase 3 establishes the clearest real Token improvement, but the 33.94% input reduction is still below the plan's 40% target and does not establish a stable process-exit improvement.

### Phase 3 exploratory entrypoints

Each row below is one pair only and is directional, not statistically stable.

| Scenario | Directly affected entrypoint | Input Token change | Total Token change | Process-exit change |
|---|---|---:|---:|---:|
| `initialize-monorepo` | `project-init` | **−33.94%** (20-pair primary) | **−33.04%** | −5.82% |
| `create-three-component-topology` | `bootstrap` | **−28.98%** | **−28.12%** | −15.27% |
| `diagnose-missing-dependency` | `troubleshooter` | **−37.92%** | **−33.68%** | +65.09% |
| `verify-same-host-api-failure` | `delivery-verifier` | **−17.93%** | **−14.84%** | +22.79% |
| `deploy-current-project` | app assistant, not slimmed in Phase 3 | +0.19% | +0.67% | +35.58% |
| `deploy-bare-git` | app assistant, not slimmed in Phase 3 | −0.12% | +1.24% | +18.58% |
| `install-plugin-and-resume-ai` | plugin manager, not slimmed in Phase 3 | −0.12% | −1.28% | +22.18% |
| `reject-unsupported-multimodal-bypass` | AI assistant, not slimmed in Phase 3 | −0.12% | −0.55% | −21.29% |

The existing host corpus does not contain direct scenarios for the other four Phase 3 entrypoints (`env-sync`, `template-installer`, `app-version-assistant`, and `platform-query`), so their 66–71% byte reductions are not converted into host Token claims here.

## Controlled Rainbond live-chain evidence

The live-chain runner used the connected private Rainbond at `http://14.103.232.255:7070`, the otherwise empty `demo` team, unique `rsb-*` app names, `nginx:alpine`, container port 80, and the same required milestones:

1. project initialization and local binding;
2. app/component bootstrap;
3. deployment and bounded convergence;
4. external port setup;
5. delivery verification;
6. harness-owned exact-name cleanup.

Every recorded live run had cleanup result `success`. A final platform query confirmed zero remaining `rsb-*` or `rs-bench-*` applications.

### Phase 4 — HandoffContext, one matched non-delivered pair

Both runs reached the same `undeploy/HTTP 404` bounded-stop result.

| Metric | Phase 3 base | Phase 4 candidate | Change |
|---|---:|---:|---:|
| Model-visible tool calls | 83 | 85 | +2.41% |
| Input Token | 9,237,156 | 6,981,936 | **−24.41%** |
| Uncached input Token | 161,188 | 159,280 | −1.18% |
| Output Token | 21,041 | 21,546 | +2.40% |
| Total Token | 9,258,197 | 7,003,482 | **−24.35%** |
| Process exit | 881.2 s | 582.3 s | **−33.92%** |
| Observed command wall time | 292.2 s | 66.6 s | **−77.22%** |

The candidate executed one protected handoff. It did not reduce the total command count in this pair, but it materially reduced accumulated context and elapsed time. This is promising single-pair evidence, not a formal 20-pair claim.

### Phase 5 — snapshot and poll, one matched non-delivered pair

Both runs reached the same bounded `undeploy` result. The candidate actually used one `snapshot` and three protected `poll` commands.

| Metric | Phase 4 base | Phase 5 candidate | Change |
|---|---:|---:|---:|
| Model-visible tool calls | 69 | 73 | +5.80% |
| Ordinary read commands | 23 | 20 | −13.04% |
| Input Token | 6,065,876 | 6,256,072 | +3.14% |
| Uncached input Token | 148,820 | 143,304 | −3.71% |
| Output Token | 17,644 | 19,582 | +10.98% |
| Total Token | 6,083,520 | 6,275,654 | +3.16% |
| Process exit | 596.6 s | 653.4 s | +9.52% |

Phase 5 reduced ordinary reads, but extra write/confirmation work and reference loading outweighed that saving. The deterministic 7→2 focused-call fixture is valid for its local operation, but this live pair shows no end-to-end net benefit.

### Frozen before versus final after, one matched successful pair

Both repositories completed deployment, reached `running`, returned HTTP 200, and were cleaned successfully.

| Metric | Frozen before | Final after | Change |
|---|---:|---:|---:|
| Model-visible tool calls | 51 | 44 | **−13.73%** |
| Ordinary read commands | 7 | 6 | −14.29% |
| Input Token | 4,255,246 | 3,003,587 | **−29.41%** |
| Uncached input Token | 109,582 | 95,683 | **−12.68%** |
| Output Token | 12,168 | 17,107 | **+40.59%** |
| Total Token | 4,267,414 | 3,020,694 | **−29.21%** |
| Process exit | 431.4 s | 716.5 s | **+66.08%** |
| Observed command wall time | 65.1 s | 4.2 s | −93.48% |

The corrected live result therefore supports a **Token and tool-call improvement**, but not a speed improvement. The final candidate uses about 29% fewer total Token and 14% fewer model-visible tools on this successful pair, while producing 41% more output Token and taking 66% longer end to end. Most of the extra elapsed time is outside observed command execution and is consistent with model/provider orchestration time, but the available trace cannot assign a definitive cause.

## Relationship to structural metrics

| Structural metric | Repository change | What real host data supports |
|---|---:|---|
| 14 descriptions | −28.69% bytes | Phase 1 input Token **−2.85%** |
| 8 entrypoints | −77.70% bytes | directly covered entrypoints input Token about **−17.93% to −37.92%** |
| Scenario Markdown | −40.69% bytes | successful cumulative live input Token **−29.41%** (one pair) |
| Five-stage runtime queries | 5→1 deterministic | Phase 4 live input Token **−24.41%** and time **−33.92%** (one pair), tool count not reduced |
| Snapshot/poll focused calls | 7→2 deterministic | Phase 5 live ordinary reads −13.04%, but total calls +5.80% and total Token +3.16% (one pair) |

Byte and deterministic-call reductions are real engineering results. Their measured user-path effect is smaller and mixed: Phase 3 and the cumulative successful chain reduce Token materially, while Phase 2 and Phase 5 do not provide net Token gains, and the final candidate is not faster in the matched successful pair.

## Status

- Token optimization: **partially achieved**. The strongest controlled fixture result is Phase 3 input −33.94%; the matched successful live pair is input −29.41% and total −29.21%.
- Tool-call optimization: **partially achieved**. The matched successful live pair is −13.73%, below the 25% target.
- Latency optimization: **not achieved**. The matched successful live pair is +66.08% slower.
- Phase 5 end-to-end optimization: **not achieved in the observed live pair**.
- Safety and cleanup: all recorded runs cleaned their exact disposable apps; no benchmark apps remain.

Normalized fixture data and raw artifacts are under `phase-abba-isolated-2026-10-09/`. Controlled live normalized data and JSONL traces are under `phase-live-controlled-2026-10-09/`.
