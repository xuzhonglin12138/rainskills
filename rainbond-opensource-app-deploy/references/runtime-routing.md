<!-- rainskills-runtime-routing:start -->
## 缺少运行环境时

先说：“可以，我会帮你部署未收录到应用市场的开源应用。不过目前还没有可用的应用运行环境。你刚安装的 Rainskills 是 AI 部署助手，它负责分析项目并执行部署；应用实际会运行在 Rainbond 上。Rainbond 是一套应用运行和管理平台，负责容器运行、域名访问、日志和存储等工作，你不需要了解 Kubernetes。”

#### 选择运行环境

请提示“请选择应用要运行的环境：”，并只显示：

1) 云端环境（免费体验）
2) 本机环境
3) 独立服务器
4) 已有 Rainbond

选择 1 时执行 `saas` route；选择 2 时执行 `install-private` 并使用 `["--location", "local"]`；选择 3 时执行 `install-private` 并使用 `["--location", "server"]`；选择 4 时执行本地 launcher + `["runtime", "message", "--id", "private-console-origin"]` 后执行 `private-existing`。不得显示“私有环境”或部署位置中间层，不得在运行环境准备完成前继续读取或修改部署描述文件。
<!-- rainskills-runtime-routing:end -->
