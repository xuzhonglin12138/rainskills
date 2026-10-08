<!-- rainskills-runtime-routing:start -->
  ## 缺少运行环境时

  先确认 intent 属于 new scope 还是 existing scope；确认前不展示环境选项。

  ### 意图不明确

  用户请求没有明确指向新应用或已有应用时，只问：“这是要部署新应用还是管理已有应用？”确认前不连接运行环境，也不展示任何环境选项。

  ### 新应用

  用户明确要部署新应用后，先执行本地 launcher + `["runtime", "message", "--id", "new-application-environment"]`。收到 `[RAINSKILLS_USER_MESSAGE_BEGIN:<id>]` 与对应 END marker 后，只原样输出两者之间的正文，不输出 marker，不得总结、改写、调整项目符号或追加其它说明。下方文案仅用于核对，不得由 agent 自行生成：

  > 可以，我会帮你完成应用识别、构建、部署和访问验证。
  >
  > 不过目前还没有可用的应用运行环境。
  >
  > 你刚安装的 Rainskills 是负责“部署”的 AI 助手，它会分析项目并执行部署流程；Rainbond 负责为应用提供稳定运行环境。
  >
  此时只保存用户已经明确提供的 intent 字段。`deploy`/`create` 可以只保存 `type`；不得为了构造 runtime intent 提前补参数，平台安装完成前不得询问应用来源，包括本地项目路径、Git 仓库 URL、镜像地址或安装包路径。运行环境连接并通过验收后，恢复到 `project-analysis`，再识别当前项目或询问缺失的应用来源。

  #### 选择运行环境

  请提示“请选择应用要运行的环境：”，并只显示：

  1) 云端环境（免费体验）
  2) 本机环境
  3) 独立服务器
  4) 已有 Rainbond

  选择 1 时执行 `saas` route；选择 2 时执行 `install-private` route，并在完整 argv 中使用 `["--location", "local"]`；选择 3 时执行 `install-private` route，并使用 `["--location", "server"]`；选择 4 时执行本地 launcher + `["runtime", "message", "--id", "private-console-origin"]`，收到地址后执行 `private-existing`。不得显示“私有环境”或部署位置中间层，不得在平台安装器中重复询问部署位置，也不得在环境准备完成前询问应用来源。

  ### 已有应用

  用户明确要查询、排障、修改或验证已有应用时，使用与动作匹配的第一句话，只提供 `Rainbond Cloud` 或承载目标应用的`已有私有 Rainbond`。选择已有私有 Rainbond 时执行本地 launcher + `["runtime", "message", "--id", "private-console-origin"]` 并原样输出。已有应用不得安装新平台，也不得进入 install-private。
  <!-- rainskills-runtime-routing:end -->
