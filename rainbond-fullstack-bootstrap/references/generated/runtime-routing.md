<!-- generated-by: scripts/sync-runtime-contracts.mjs -->
<!-- source-sha256: a2fe9e24d3bb8343a9d78632e2b23596224cf0d188137b8889b59362f6ca3fbc -->
<!-- profile: cli -->
<!-- rainskills-runtime-routing:start -->
# 缺少运行环境时（生成文件）

- `skill_id`: `rainbond-fullstack-bootstrap`
- `missing_runtime_mode`: `new_application`
- `resume_target`: `component-topology`

意图不明确时，只问用户是在部署新应用还是管理已有应用；确认前不连接运行环境，也不展示选项。

新应用请求执行固定 launcher 的 `runtime message --id new-application-environment`，只原样转发消息 marker 之间的正文。然后只显示：

1) 独立服务器（推荐）——适合长期运行，在你的 Linux 服务器上安装开源 Rainbond
2) 云端环境——最快体验，不需要准备服务器
3) 本机环境——适合本地验证，在当前电脑上准备运行环境
4) 已有 Rainbond——连接现有 Rainbond 环境并继续部署

选择独立服务器时使用 `--install-private --location server`；选择云端环境时连接 Rainbond Cloud；选择本机环境时使用 `--install-private --location local`；选择已有 Rainbond 时先执行 `runtime message --id private-console-origin`，再连接用户给出的 Console origin。不得增加私有环境子菜单。

连接和 live probe 成功后恢复到 `component-topology`；不得提前询问无关业务字段，也不得保存环境 ID、operation ID 或 intent JSON。

<!-- rainskills-runtime-routing:end -->
