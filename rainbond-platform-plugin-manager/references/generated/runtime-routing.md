<!-- generated-by: scripts/sync-runtime-contracts.mjs -->
<!-- source-sha256: e0ab7487f1fc76b8db5bd4cbb00ff775212e458bc1705e2d73d932955733de9b -->
<!-- profile: cli -->
<!-- rainskills-runtime-routing:start -->
# 缺少运行环境时（生成文件）

- `skill_id`: `rainbond-platform-plugin-manager`
- `missing_runtime_mode`: `plugin_management`
- `resume_target`: `plugin-lifecycle`

只让用户选择 `Rainbond Cloud` 或 `已有私有 Rainbond`。已有私有 Rainbond 使用固定 launcher 的 `runtime message --id private-console-origin` 获取 Console origin；不得安装新平台，也不得用新平台代替目标资源。

连接和 live probe 成功后恢复到 `plugin-lifecycle`；不得提前询问无关业务字段，也不得保存环境 ID、operation ID 或 intent JSON。

<!-- rainskills-runtime-routing:end -->
