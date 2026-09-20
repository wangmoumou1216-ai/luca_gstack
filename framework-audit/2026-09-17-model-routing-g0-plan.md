# G0 精确探针与批准载荷

状态：DONE_WITH_CONCERNS；初批两次超时，用户追加批准的代理两次均PASS（app-server 显式模型入口）。框架 NO_PIN；不改 effort。原生/exec-profile/runner/快照消费不计已验证。

## 执行 checkpoint（2026-09-17，当前优先）

用户批准继续，并随后明确范围只做 Codex Sol/Astra，不验证 DeepSeek 或 Claude，不修改当前默认配置。两次真实调用额度已批准；不会因默认 model 改为第三方而扩大范围。
临时客户端已创建，node --check 和离线 pass→违规拒收→pass 检查通过。进程启动前通过参数禁用 hooks/apps/shell_tool/unified_exec/shell_snapshot、notify=[]、web_search=disabled，以及各既有 MCP server enabled=false；仅测试进程生效，安全隔离返回未确认则不发 turn。
首次三次启动在 turn 前失败，根因是客户端把 MCP key 加了引号，CLI 把引号视为字面 key，新增无 transport 的配置项；未写入用户文件。已定位并修复为经安全字符集验证的纯 key，并新增离线负例。不以盲目重试处理。
命令 model=Sol 正在运行；Astra 尚未启动。app-server 显式入口不是 exec/profile 或原生 collaboration 的替代证据。真实结果写回既有 G0 preflight/handshake，不扩张为实现授权。

更新：Sol/Astra 各一个 turn 已执行，两次均已接受指定模型并确认隔离，但90秒超时；Astra有连接错误重试。直连沙箱外亦不可达，现有系统代理路径无认证HEAD返回405。没有追加模型turn；当前等待用户决定是否追加以下两次代理验证。

## Delta G0-P：待批准的追加调用

执行结果更新：用户批准后，两条精确命令均成功，adopted_model 与 requested_model 一致，同 thread/turn completed、exit=0，无观察到改路。两条命令均只发一个逻辑turn；累计四个模型turn，不继续加预算。当前结果/ID见 preflight 的“代理复验”。本节下方原有“待批准”说明保留为授权载荷历史，不代表当前仍缺批准。

只为测试子进程提供系统已有代理，不更改系统或持久化配置；仍沿用现有认证，不调整 effort。精确命令：

```sh
env HTTP_PROXY=http://127.0.0.1:7877 HTTPS_PROXY=http://127.0.0.1:7877 node /private/tmp/model-routing-g0.aX6M54/probe.mjs --model gpt-5.6-sol --timeout-ms 90000
env HTTP_PROXY=http://127.0.0.1:7877 HTTPS_PROXY=http://127.0.0.1:7877 node /private/tmp/model-routing-g0.aX6M54/probe.mjs --model gpt-6-astra --timeout-ms 90000
```

额度：额外各一个逻辑turn，各90秒，无应用层重试。底层provider可能重试；费用/token不能硬封顶。其余隔离、凭据/正文脱敏、失败拒收、限定文件及非实现授权边界与初批相同。再次失败则按证据停止，不自动放宽验收。
来源：用户「继续」；方案 v1.3 SHA `0912e306a9b30538863755493112f87e9fb0713930e7170f24f612c538dfa5de`；基线 `45eff207a585757907f323c6952f969ac76a14b2`。

## 前提、规模与阶段

应验证运行时模型选择，而不是服务商内部身份。手动指定两次模型是最小预检，不冒充 runner/profile 自动接线。模式 Sequential，Lightweight；本轮 model_tier=core-execution，真实探针模型是用户指定角色候选，不另选 effort。

G0-1：本地协议/有效配置与权限核对，准备临时调用客户端及离线负例测试。
G0-2：获本批准载荷确认后，经同一客户端分别调用默认模型和 peak 候选，每模型一个逻辑 turn。
G0-3：记录证据及覆盖缺口，只为已证实机制准备实施计划，不直接修改路由实现。

## 精确命令与协议

客户端文件（后续准备，只是取证工具）：`/private/tmp/model-routing-g0.aX6M54/probe.mjs`。
本地验证命令：`node --check /private/tmp/model-routing-g0.aX6M54/probe.mjs`、`node /private/tmp/model-routing-g0.aX6M54/probe.mjs --self-test`；不得在离线测试中启动 codex 或联网。

批准后的真实命令：

```sh
node /private/tmp/model-routing-g0.aX6M54/probe.mjs --model gpt-5.6-sol --timeout-ms 90000
node /private/tmp/model-routing-g0.aX6M54/probe.mjs --model gpt-6-astra --timeout-ms 90000
```

客户端子进程固定为 `/Users/luca/.local/bin/codex app-server --listen stdio://`，CWD 为上述临时目录；不启动 daemon，不使用 proxy，不开放端口。沿用当前 CODEX_HOME 和既有认证，不复制/迁移凭据，不改配置文件。

RPC 流程：initialize(clientInfo.name=model-routing-g0,version=1；experimentalApi=true)，initialized；thread/start；核对返回 model 与安全设置后 turn/start；核对同 threadId/turnId 的 turn/completed；关闭子进程。

thread/start 参数：model=本次命令参数；cwd=临时目录；ephemeral=true；sandbox=read-only；approvalPolicy=never；allowProviderModelFallback=false。不传 effort、serviceTier、collaborationMode；不替换 base/developer instructions，不忽略规则。

turn/start 参数：仅 threadId 和 text 输入：`Model-routing connectivity test. Reply exactly ROUTE_OK. Do not use tools, access files, or delegate.` 不发送项目代码或本轮方案。

不得仅凭提示词宣称禁止了全部工具。客户端须先查明本地工具/扩展配置；无法排除未经批准的 MCP/动态工具/钩子外部副作用时，不启动 turn，报告 NEEDS_CONTEXT。遇审批请求一律拒绝；遇工具使用/委派或模型改路事件停止并拒收；客户端监测不能冒充宿主机械隔离。

## 副作用、预算与停机条件

- 最多两个逻辑模型 turn，各 90 秒，无应用层重试；底层 provider 可能重试，不能把“两次”宣称为严格两次 HTTP 请求。
- 输入为短连通性测试，但运行时仍可能附加系统/工具上下文；输出要求一个短词。没有可靠费用/总 token 硬上限，使用当前账户额度；不调整 effort 来压成本。
- 允许模型服务联网、既有认证正常使用以及 CLI 正常缓存/日志/临时运行状态写入。ephemeral 不代表 CODEX_HOME 零写入；不写用户配置，不写仓库实现，不发布 Git。
- 客户端只持久化脱敏白名单：CLI版本、requested_model、线程返回模型、权限字段、threadId/turnId、完成状态、是否改路、usage（若接口提供）、退出/超时结论。原始事件只在内存处理，不持久化完整配置、token、正文以外的用户数据或凭据。
- 输出：`/private/tmp/model-routing-g0.aX6M54/result-<model>.json`；审计结果写本仓库现有 G0 preflight/handshake 文档。临时文件不自动删除。
- 配置/模型不一致、权限不符、报错、超时、改路或采用证据缺失：停止，不自动换模型。

## 覆盖与断言

P1：默认与候选 peak 均有可信 thread/start 模型选择响应，加同 threadId/turnId 成功完成；requested 参数或 ROUTE_OK 正文单独不充证据。
P2：离线注入模型不一致、改路、错误完成、跨线程/跨turn事件与超时，必须拒收；正常样本通过，违规样本失败，再正常通过。
P3：无 effort 设置/比较；无模型降级或授权扩张；费用/ephemeral 边界如实记录。

该探针仅验证本机 app-server 显式模型入口。`codex exec --profile` 的配置快照消费、runner 入口、原生 collaboration 采集 owner、Claude 路径均仍独立未证；不借 app-server PASS 替它们过关，不偷偷更换既定 adapter。未证实通道不能自动接线。

## 人类确认范围

批准只覆盖 G0-1/2/3 中上述临时探针、两个逻辑 turn 及对应审计记录。实现文件与用户 peak 配置创建仍须后续精确实现计划批准；Git 提交/推送不在本载荷内。
