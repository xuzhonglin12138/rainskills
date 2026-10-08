---
name: rainbond-platform-query
description: Answer explicit read-only Rainbond questions about the current user, enterprise, team, region, app, or component. Exclude deployment, mutation, publishing, troubleshooting, and installation.
---

# Rainbond Platform Query

## Runtime Gate

首次需要 Rainbond 时读取 [generated Runtime Gate](references/generated/runtime-gate.md)，本会话只读取一次。仅当 Node.js/Rainskills 版本、profile、endpoint、唯一运行环境、workspace/app 绑定或授权状态变化时失效并重新读取。

没有可用运行环境时，按 Gate 声明的 mode 读取 [generated Runtime Routing](references/generated/runtime-routing.md)；不得从其他 Skill 复制或改写环境选项。

不可弱化的不变量：

- 只使用 Gate 声明的 transport、command set、scope 与缺环境策略；不得切换到替代通道。
- 401 只允许按 Gate 恢复一次只读调用；写调用结果未知时先查询真实状态，禁止自动重放。403 立即停止。
- 可变调用必须先取得 confirmation ID，再以完全相同输入确认执行一次。
- JWT、凭据与密钥不得回显、写入报告或用于绕过保护。



## Scope and routing

This lightweight skill handles only explicit, read-only platform questions. Route deployment or project delivery to `rainbond-app-assistant`; creation to `rainbond-project-init` or `rainbond-fullstack-bootstrap`; repair to `rainbond-fullstack-troubleshooter`; final acceptance to `rainbond-delivery-verifier`; publishing to `rainbond-app-version-assistant`.

Do not expand a narrow question into related resource queries. Never change resources, credentials, access control, or configuration.

## Fixed query contract

1. Execute exactly one local `query` command for the requested resource. For enterprise-scoped Tools, omit `enterprise_id` when it is not already known; the CLI resolves it internally from `rainbond_get_current_user` without exposing the identity response.
2. For “current enterprise”, call `rainbond_query_enterprises` with `{}`. Do not then query teams or regions.
3. If enterprise or cluster-management Tools are not visible, state that the user can only view their current permission scope. Do not guess a Tool name or attempt discovery.
4. Pass only user-known context to the one-shot CLI query. The CLI fills the required enterprise context before invoking the Console-backed target Tool:
   - enterprises: `rainbond_query_enterprises({})`
   - teams: `rainbond_query_teams({})`
   - regions/clusters: `rainbond_query_regions({})`
   - all accessible apps: `rainbond_query_apps({})`
   - apps in one team/region: `rainbond_get_team_apps({team_name, region_name})`
   - components: `rainbond_query_components({app_id})`
5. `enterprise_id` is internal context resolved by the CLI and must not be requested from the user. `team_name` and `region_name` come from an earlier query result or explicit user context. `app_id` must be a positive integer; normalize a decimal string before the Tool call and reject values such as `app-123`. If a component query lacks a valid `app_id`, stop without querying teams, applications, clusters, or any substitute scope.
6. Use the one-shot contract `query <tool> --input -` when using the CLI. Keep stdout JSON separate from stderr; do not use `2>&1`, `grep`, or `head` to process its output.
7. Report only fields needed for the question. Avoid email addresses, internal IDs, connection addresses, and configuration unless explicitly requested.

## Examples

- “帮我查询当前企业的信息” → one `rainbond_query_enterprises({})` query; no team or region query.
- “我有哪些团队？” → one `rainbond_query_teams({})` query; the CLI resolves enterprise context internally.
- “这个应用有哪些组件？” → one `rainbond_query_components({app_id})` query; the CLI resolves enterprise context internally.

## Result

State the requested scope, the observed facts, and any permission boundary. When facts are unavailable, say which required context is missing instead of inferring it.
