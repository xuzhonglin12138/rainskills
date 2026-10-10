<!-- generated-by: scripts/sync-runtime-contracts.mjs -->
<!-- source-sha256: 67bfe901017b287b52171b3e2a1e08ef5460f0b46e4a837ade8c4bdca6b12318 -->
<!-- profile: cli -->
<!-- rainskills-runtime-routing:start -->
# 缺少运行环境时（生成文件）

- `skill_id`: `rainbond-env-sync`
- `missing_runtime_mode`: `linked_project`
- `resume_target`: `environment-sync`

只让用户选择 `Rainbond Cloud` 或 `已有私有 Rainbond`。已有私有 Rainbond 使用固定 launcher 的 `runtime message --id private-console-origin` 获取 Console origin；不得安装新平台，也不得用新平台代替目标资源。

连接和 live probe 成功后恢复到 `environment-sync`；不得提前询问无关业务字段，也不得保存环境 ID、operation ID 或 intent JSON。

<!-- rainskills-runtime-routing:end -->
