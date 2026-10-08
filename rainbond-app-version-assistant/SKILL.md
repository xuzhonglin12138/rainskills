---
name: rainbond-app-version-assistant
description: "Perform explicit version operations for an existing Rainbond app: create or inspect snapshots, publish to a local library or cloud market, or preview/apply rollback. Use for ‘创建快照’, ‘发布到本地组件库’, ‘回滚到快照’, or ‘create snapshot’."
---

# Rainbond App Version Assistant

## 用户可见结果协议（最高优先级）

普通用户回复默认使用简洁中文，只说明应用、版本操作、实际结果、重要风险和唯一下一步。快照、发布或回滚的内部状态对象仍可用于校验和续接，但不直接展示。

- 成功时说明实际创建、发布或回滚的版本，以及用户接下来能做什么。
- 未完成时说明直接原因；只有确有安全可执行方案时才补充解决办法。
- 默认不得展示内部对象、状态枚举、team/region/app ID、发布记录 ID、Skill/工具名、YAML、JSON 或英文编排标题。
- 只有用户明确要求 YAML、JSON、调试详情，或自动化/评测明确要求结构化契约时，才使用后文的结构化输出格式。


<!-- rainskills-community-card:start -->
## 交流群结束卡片

本规则只适用于负责用户原始请求的顶层任务的最终回复。

- 执行过程、中间错误、重试、等待或下层 Skill 的阶段结果不得展示本卡片；下层 Skill 只返回结果并由顶层调用者决定。
- 顶层任务最终失败或未完成时，必须在用户可见结果末尾追加一次本卡片。用户取消、等待用户输入或已成功但仅待人工访问确认不算失败。
- 顶层任务成功且产生用户可感知结果时，当前对话内最多展示一次；纯查询、过程检查和无人值守执行不展示。
- 结构化、自动化或评测模式不追加本卡片，避免破坏机器可读契约。
- 需要展示时，以下内容必须是整条用户可见回复的最后内容，且不得改写、增加其他链接或继续追加文字：

```markdown
欢迎扫码加入交流群，一起交流使用经验。

![交流群二维码](https://www.rainbond.com/wechat/rainbond-xzs.png)
```
<!-- rainskills-community-card:end -->

## Runtime Gate

首次需要 Rainbond 时读取 [generated Runtime Gate](references/generated/runtime-gate.md)，本会话只读取一次。仅当 Node.js/Rainskills 版本、profile、endpoint、唯一运行环境、workspace/app 绑定或授权状态变化时失效并重新读取。

没有可用运行环境时，按 Gate 声明的 mode 读取 [generated Runtime Routing](references/generated/runtime-routing.md)；不得从其他 Skill 复制或改写环境选项。

不可弱化的不变量：

- 只使用 Gate 声明的 transport、command set、scope 与缺环境策略；不得切换到替代通道。
- 401 只允许按 Gate 恢复一次只读调用；写调用结果未知时先查询真实状态，禁止自动重放。403 立即停止。
- 可变调用必须先取得 confirmation ID，再以完全相同输入确认执行一次。
- JWT、凭据与密钥不得回显、写入报告或用于绕过保护。



## Overview

Use this skill for the real app version center workflow behind the `/version` route.

This skill is for:
- snapshot timeline inspection
- snapshot creation
- publish draft creation and editing
- publish event execution
- publish completion or give-up
- snapshot rollback and rollback record tracking

This skill is **not** the market-app upgrade flow under `/upgrade`.

## Canonical Model Reference

Use [product object model](../rainbond-app-assistant/references/product-object-model.md) as the repository-level source of truth for:

- `Release`, `Snapshot`, and `Rollback` object boundaries
- the distinction between delivery acceptance and version-center operations
- orchestrator-level handoff expectations from delivery flow into version flow

This skill should model version-center operations themselves. It should not redefine the broader product lifecycle independently.

## When to Use

Use when:
- the user wants to inspect the app version center
- the user wants to create a snapshot from current runtime state
- the user wants to publish a snapshot to the local component library
- the user wants to publish a snapshot to the cloud app market
- the user needs to continue an unfinished publish draft
- the user needs to inspect publish events or publish records
- the user wants to rollback current runtime to a historical snapshot
- the user wants to inspect snapshot rollback records

Do not use when:
- the task is market app upgrade under `/upgrade`
- the task is first-time bootstrap or template install
- the task is runtime troubleshooting after publish/rollback is already complete
- the task is component image rollback or build-history rollback

## Route Reality

Important:
- `/publish` now redirects to `/version`
- snapshot creation and publish both start from `/version`
- `/share/:shareId/one` is the draft configuration step
- `/share/:shareId/two` is the event execution step
- `/share/:shareId/three` is the finish page

So this skill should model the `/version` center, not the old standalone publish page.

## Preferred MCP Tools

### Version Center
- `rainbond_get_app_version_overview`
- `rainbond_list_app_version_snapshots`
- `rainbond_get_app_version_snapshot_detail`
- `rainbond_list_app_version_rollback_records`
- `rainbond_get_app_version_rollback_record_detail`

### Snapshot Actions
- `rainbond_create_app_version_snapshot`
- `rainbond_delete_app_version_snapshot`
- `rainbond_rollback_app_version_snapshot`
- `rainbond_delete_app_version_rollback_record`
- `rainbond_create_app_from_snapshot_version`

### Publish Draft and Events
- `rainbond_get_app_publish_candidates`
- `rainbond_create_app_share_record`
- `rainbond_list_app_share_records`
- `rainbond_get_app_share_record`
- `rainbond_delete_app_share_record`
- `rainbond_get_app_share_info`
- `rainbond_submit_app_share_info`
- `rainbond_list_app_share_events`
- `rainbond_start_app_share_event`
- `rainbond_get_app_share_event`
- `rainbond_complete_app_share`
- `rainbond_giveup_app_share`

## Input Resolution

Resolve in this order:
1. user explicit input
2. `.rainbond/local.json`
3. `rainbond.app.json`

Required context:
- `team_name`
- `region_name`
- `app_id` (at every Rainbond MCP tool boundary, normalize a decimal session string to a positive integer; reject non-numeric IDs)

Common optional context:
- `version_id`
- `record_id`
- `share_id`
- publish `scope`
- `market_name`

## Workflow

Follow this order.

### 1. Inspect version center first
- call `rainbond_get_app_version_overview`
- call `rainbond_list_app_version_snapshots`
- if the user is asking about rollback history, also call `rainbond_list_app_version_rollback_records`

Use this to answer:
- whether a hidden snapshot template exists
- what the current baseline version is
- whether there are unsaved runtime changes
- how many snapshots exist
- whether rollback history already exists

### 2. Creating a snapshot

There are two safe paths.

#### Path A: direct snapshot creation
Use `rainbond_create_app_version_snapshot` when:
- the user already knows version, alias, and note
- there is no need to mimic the draft page step-by-step
- you already know the exact share payload or can omit it safely

#### Path B: UI-parity draft path
Use this when the user wants parity with `/share/:shareId/one?mode=snapshot`:
1. `rainbond_create_app_share_record` with `snapshot_mode=true`
2. `rainbond_get_app_share_info`
3. adjust payload as needed
4. `rainbond_create_app_version_snapshot`
5. `rainbond_giveup_app_share`

Important:
- the draft share record is only a temporary container for the snapshot step-one page
- snapshot creation is not finished until `rainbond_create_app_version_snapshot` succeeds
- after success, give up the temporary draft record

### 2.1 Creating a new app directly from a snapshot

Snapshot creation already produces a hidden local template.

That means you do **not** need to publish the snapshot to the local library first when the real goal is:
- pick one snapshot
- create a brand-new app in the same team
- install that snapshot template immediately

Prefer this direct path:
1. `rainbond_get_app_version_overview`
2. `rainbond_list_app_version_snapshots`
3. `rainbond_get_app_version_snapshot_detail`
4. `rainbond_create_app_from_snapshot_version`

Use `rainbond_create_app_from_snapshot_version` when:
- the source app and target app stay in the same team
- publish visibility is not required
- the user wants a new app from a chosen snapshot, not a library artifact

Inputs:
- `source_app_id`
- `version_id`
- `target_app_name`
- optional `target_app_note`
- optional `k8s_app`
- optional `is_deploy`

Do not route this through the publish flow unless the user explicitly wants:
- a visible local library publish record
- a cloud market publish
- the share draft and event steps themselves

### 3. Publishing a snapshot

The publish flow should mirror `/version -> /share/:shareId/one -> /two`.

1. choose target publish scope
   - local library: use `scope=local`
   - cloud market: use `scope=goodrain`

2. fetch candidate app models
   - call `rainbond_get_app_publish_candidates`
   - for cloud publish, include `market_name`

3. create draft share record
   - call `rainbond_create_app_share_record`
   - for local publish, keep `scope=""`
   - for cloud publish, use `scope="goodrain"` and `target.store_id`
   - pass `snapshot_app_id` and `snapshot_version`

4. inspect draft content
   - call `rainbond_get_app_share_info`
   - if `publish_mode=snapshot`, the content is already frozen from the selected snapshot
   - if `publish_mode=runtime`, you are looking at live component data

5. submit draft metadata
   - call `rainbond_submit_app_share_info`
   - `app_version_info` is required
   - include `share_service_list`, `share_plugin_list`, `share_k8s_resources` when needed

6. execute publish events
   - call `rainbond_list_app_share_events`
   - for each event:
     - `rainbond_start_app_share_event`
     - `rainbond_get_app_share_event`
   - component media sync uses `event_type=service`
   - plugin sync uses `event_type=plugin`

7. finish publish
   - when all events are successful, call `rainbond_complete_app_share`

### 4. Continuing or abandoning publish

If the user wants to continue an unfinished publish:
- call `rainbond_list_app_share_records`
- locate the record with `status=0`
- inspect it with `rainbond_get_app_share_record`
- continue with `rainbond_get_app_share_info`

If the user wants to abandon a draft:
- call `rainbond_giveup_app_share`

If the user wants to delete a finished publish record from the drawer:
- call `rainbond_delete_app_share_record`

## Rollback Rules

Snapshot rollback is the `/version` route rollback, not upgrade-record rollback.

Use:
1. `rainbond_get_app_version_snapshot_detail`
2. `rainbond_rollback_app_version_snapshot`
3. `rainbond_list_app_version_rollback_records`
4. `rainbond_get_app_version_rollback_record_detail`

Behavior:
- rollback creates a rollback record
- the rollback record should be polled until terminal
- finished rollback records may be deleted with `rainbond_delete_app_version_rollback_record`

Do not confuse this with:
- `rainbond_rollback_app_upgrade_record`

That one belongs to the `/upgrade` market-app upgrade flow.

## Decision Rules

### Snapshot creation
- if overview says there are no new changes and a current baseline already exists, do not force-create another snapshot
- if no baseline snapshot exists yet, creating the first snapshot is valid even without a previous version

### Publish scope
- use `local` candidate discovery for local library publishing
- use `goodrain` candidate discovery only when the user explicitly wants cloud market publishing

### Event execution
- never call `rainbond_complete_app_share` before all events are successful
- if any event remains non-success, keep the workflow in “event execution” state

### Rollback
- before rollback, inspect the target snapshot detail
- after rollback starts, shift focus to rollback record tracking rather than snapshot list refresh alone

### Direct snapshot reuse
- if the user wants a new app from a snapshot and does not need a published library record, prefer `rainbond_create_app_from_snapshot_version`
- do not create a publish draft just to obtain a reusable template from a snapshot

## Output Format

Target structured output（仅在用户或自动化/评测明确要求结构化结果时使用）：

- this skill should eventually be able to emit `VersionCenterSession`
- minimum target fields:
  - `flow_type`
  - `release`
  - `snapshot`
  - `rollback`
  - `state_snapshot`
  - `action_plan`
  - `next_step`
- the human-readable sections below should be treated as the narrative view over that target object
- in explicit structured contract mode, append a final `### Structured Output` section after the human-readable report and render `VersionCenterSession` in fenced `yaml`

Proposed schema:

```yaml
VersionCenterSession:
  flow_type: snapshot | publish | rollback
  context:
    team_name: string
    region_name: string
    app_id: positive integer
  state_snapshot:
    baseline_version: string | null
    unsaved_runtime_changes: boolean
    unfinished_records: string[]
  release: map | null
  snapshot: map | null
  rollback: map | null
  action_plan: string[]
  next_step: stop | create_snapshot | create_new_app_from_snapshot | submit_publish_draft | run_publish_events | complete_publish | track_rollback_record | give_up_draft
```

Example object:

```yaml
VersionCenterSession:
  flow_type: publish
  context:
    team_name: rainbond-demo
    region_name: singapore
    app_id: 42
  state_snapshot:
    baseline_version: v12
    unsaved_runtime_changes: false
    unfinished_records:
      - share-102
  release:
    share_record_id: share-102
    status: draft
  snapshot:
    version_id: version-12
  rollback: null
  action_plan:
    - rainbond_get_app_version_overview
    - rainbond_create_app_share_record
    - rainbond_submit_app_share_info
  next_step: submit_publish_draft
```

Example final reply:

````markdown
### Context
App `rainbond-demo`, flow type `publish`.

### Current State
Current baseline version is `v12`, unsaved runtime changes do not exist, and there is one unfinished publish record: `share-102`.

### Action Plan
Next MCP tools: `rainbond_get_app_version_overview`, `rainbond_create_app_share_record`, `rainbond_submit_app_share_info`. The flow is draft-based.

### Result
Prepared the publish session, reused snapshot `version-12`, and confirmed the draft share record `share-102` remains the active publish target.

### Next Step
submit publish draft

### Structured Output
```yaml
VersionCenterSession:
  flow_type: publish
  context:
    team_name: rainbond-demo
    region_name: singapore
    app_id: 42
  state_snapshot:
    baseline_version: v12
    unsaved_runtime_changes: false
    unfinished_records:
      - share-102
  release:
    share_record_id: share-102
    status: draft
  snapshot:
    version_id: version-12
  rollback: null
  action_plan:
    - rainbond_get_app_version_overview
    - rainbond_create_app_share_record
    - rainbond_submit_app_share_info
  next_step: submit_publish_draft
```
````

Only in explicit structured contract mode, respond using exactly these sections:

### Context
- state `app_name` (from `.rainbond/local.json`) and flow type
- whether the task is snapshot, publish, or rollback
- do not include `team_name`, `region_name`, or `app_id` in prose; those are available in `### Structured Output` only

### Current State
- overview summary
- current baseline version
- whether unsaved runtime changes exist
- whether there is an unfinished publish or rollback record

### Action Plan
- exact MCP tools to call next
- whether the flow is direct or draft-based

### Result
- what changed
- created snapshot / created share record / started event / completed publish / started rollback

### Next Step
- one of:
  - `stop, version center is up to date`
  - `create snapshot`
  - `create new app from snapshot`
  - `submit publish draft`
  - `run publish events`
  - `complete publish`
  - `track rollback record`
  - `give up draft`

### Structured Output
- append a fenced `yaml` block
- render `VersionCenterSession`
- keep enum values and field names aligned with the schema above
- include only operation state the skill can actually observe in the current run

## Common Mistakes

- using `/upgrade` tools when the user is actually in `/version`
- treating `/publish` as a separate workflow even though it redirects to `/version`
- forgetting that snapshot creation via UI uses a temporary share draft
- routing snapshot reuse through publish when direct hidden-template install is enough
- calling `complete publish` before events finish
- mixing snapshot rollback with market-app upgrade rollback
