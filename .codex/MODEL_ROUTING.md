# Codex 模型绑定

自动模型路由由 `.claude/skill-os/model-routing.yaml` 定义角色，当前账户模型名与顺序保存在
`/Users/luca/.luca/model-routing-bindings.json`，权限为 `0600`。native hook 与 workflow runner
读取同一个私有文件；仓库中的测试模型名是回归夹具，不会配置你的账户。

本仓库提供 [6 系列绑定示例](model-routing-bindings.example.json)：轻任务为 `gpt-6-luna`，
常规执行为 `gpt-6-sol`，关键验收为 `gpt-6-astra`。该示例按本次用户授权更新，作为可版本化
的配置起点，不被 hook/runner 自动读取。应用到其他账户前确认这三个模型确实可调用并获得
用户批准，再合并到私有文件；已有 Claude 或旧模型配置不应被整文件覆盖。

私有文件的结构如下（占位符必须替换为用户明确批准、账户可调用的模型）：

```json
{
  "schema_version": 1,
  "harnesses": {
    "codex": {
      "peak_model": "APPROVED_REVIEW_MODEL",
      "light_model": "APPROVED_LIGHT_MODEL",
      "approved_order": [
        "APPROVED_LIGHT_MODEL",
        "APPROVED_EXECUTION_MODEL",
        "APPROVED_REVIEW_MODEL"
      ]
    }
  }
}
```

`approved_order` 是用户批准的路由顺序，从低到高，不是系统根据模型名称猜测的排行榜。
根会话当前实际模型是 `anchor`，也必须在此顺序中。普通执行继承 anchor；轻任务在有明确
较低且已批准的 light 时切换；关键验收在有明确较高且已批准的 peak 时切换。anchor 已在
peak 档或更高时保留 anchor。用户的 reasoning effort 不参与模型档位比较。

新增一个系列时，应核对该系列所有可调用的轻任务、执行、验收模型，更新 light/peak 和
完整顺序，保留仍需兼容的旧会话模型。不要只替换 peak 后遗漏当前 anchor。保留其他
harness 的配置；修改后保持 `0600`，不将真实私有文件提交到 Git。

可选 `inherit_prefixes` 是用户批准的供应商前缀列表（每项为不含空白、`/` 前至少一个字符并以
`/` 结尾的字符串，例如经网关接入的另一账户 `"<provider-id>/"`）。根会话模型以其中某个前缀
开头时，peak 与 light 场景都保留该根模型（`INHERIT_PREFIX_ANCHOR`），即计划与评审以同档模型
执行、轻任务也不改写成不带前缀的绑定名，避免请求被送往另一个供应商。该规则优先于
`approved_order` 排名：即使同前缀的更高模型也在顺序中，列出前缀后仍保持同档。未列出的前缀、
仅在路径中间出现的前缀与不在顺序中的模型仍按 `UNKNOWN_MODEL_RELATION` 拒绝关键验收；格式
无效时所有场景返回 `INVALID_INHERIT_PREFIXES`。设置该字段后它进入路由配置摘要（缺省时摘要不变），
hook 与 runner 均原样传入。关键派发一旦因上述原因被拒，本会话的失败闩锁保持生效；修正绑定后
需在新会话中重试。

遇到 `UNKNOWN_MODEL_RELATION` 时，hook/runner 会指出顺序中缺失的模型名，或指出顺序
格式无效。先核对本次会话实际模型和私有绑定，经用户授权补齐关系，再重试；未知关系
仍然拒绝关键验收，不自动补顺序或绕过门禁。改变模型系列本身不需要改公共路由政策。

本地回归：

```bash
node scripts/test-model-route.mjs
node scripts/test-codex-model-route-hook.mjs
node scripts/test-model-route-host.mjs
```

这几组测试覆盖角色选择、缺失顺序拒绝、显式补齐后恢复、effort 保持和采用证据检查。
真实打通还需分别调用 light、anchor、peak，并在对应 SubagentStop 后检查同一次调用的
可信模型采用证据。只有测试通过不能证明某账户上的模型可实际调用。

## 关键审查中断后的补审

状态 schema v2 把可信中断记为 `interrupted`，保留未完成的审查义务。中断不等于
`accepted`，重启、压缩、根模型代次变化或版本升级也不会自动清掉义务。普通原生派发和
workflow runner 共用准入判断；存在未闭合义务时保持拒绝。

同 SID 的 pause/resume 保留 activation 和已接受调用的历史；暂停期间项目子会话关联不可用，
恢复后仍按原关联校验。显式撤销的关联继续被永久撤销记录拒绝。根代次变化会使尚未消费的
reservation 失效并重新打开原义务，旧 child 的退休记录仍保留。

只读查看当前状态：

```bash
node scripts/codex-review-recovery.mjs inspect --session <当前根会话ID>
```

恢复只适用于能在规范原生父子记录中核验的中断：同一 spawn、opaque 输入摘要、子会话
身份、实际模型和归属明确的 `turn_aborted`。缺回调由下一次原生钩子对账；没有回调不是
中断证明。模型、身份、证据等硬失败继续拒绝。只有完整审计的 v2 协调失败可以建立保留
历史与未完成义务的恢复专用 successor。锁存或未完成的 v1 返回
`LEGACY_RECOVERY_NEEDS_CONTEXT`；没有清锁、强制恢复或手工改 accepted 的入口。

先按真实用户授权冻结本次补审范围。descriptor 使用规范绝对文件路径与字节 SHA256，
包含完整判据，固定只读、`quality-gate`、`fork_turns: none`：

```json
{
  "schema_version": 1,
  "read_only": true,
  "agent_type": "quality-gate",
  "fork_turns": "none",
  "authorization_ref": "真实用户消息引用",
  "files": [{"path": "/absolute/frozen-input.md", "sha256": "文件字节SHA256"}],
  "criteria": [{"id": "R1", "text": "完整验收要求，不能省略条件与分母"}]
}
```

另存授权绑定记录，字段为 `approved: true`、`descriptor_sha`（descriptor 文件的字节
SHA256）、`user_source_ref`（与 descriptor 引用相同）和
`effect: independent-readonly-review`。主控必须从真实用户消息核对授权；JSON、哈希和
原生事件本身都不创造用户批准。冻结范围不能从旧的加密 prompt 猜测。

在当前原生会话通过单条 Bash 工具调用申请一次 reservation：

```bash
node scripts/codex-review-recovery.mjs reserve --descriptor /absolute/descriptor.json --expected-state-sha <inspect返回的SHA256> --authorization /absolute/authorization.json
```

此命令由 Bash PreToolUse 验证当前真实原生调用并执行事务，再改写为只读 receipt 查看。
仅精确的 node 恢复入口加 reserve 动词进入此事务；普通读取、搜索、测试和 inspect 不被接管。
脱离原生边界直接运行 CLI 的 `reserve` 会拒绝。`functions.exec` 只支持单个字面调用
`text(await tools.exec_command({...}));`；不支持变量、循环、组合命令或多工具包装。
钩子核验受信任且启用的跟进围栏。若刚完成缺回调对账导致状态 SHA 改变，重新 inspect
核对实际变化，再使用新 SHA；不要删除状态或盲目重试。

收到 receipt 后，用其中 `task_name` 正常派发一个新的冷启动 `quality-gate`，在新 prompt
中提供 descriptor 的路径、SHA 和完整判据。模型继续由路由适配器选择，消息由正常原生
工具传输；钩子不会把明文塞进加密消息字段。旧 child 被退休，跟进或消息在效果发生前
被拒绝。并发请求、旧 receipt、变化的冻结文件与不完整原生证据均不能产生第二个替代者。

普通消息按原生父子关系解析同一 task tree 的父、兄弟与后代；不把当前 caller 的直属
调用清单误当整个消息范围。相对任务路径以 caller 已证明的 canonical task path 解析，
不按全树 basename 猜测同名目标。钩子把已证明的 canonical target 同步传给原生工具，
保留其余输入及不透明消息，避免原生工具拒绝 `.` / `..` 后留下未结清 intent。
子任务目标的 intent 写入其实际派发者的账本，并绑定发信
caller 的原生记录，因此跨 caller 消息仍受同一个退休/恢复锁围栏保护。顶层 root 的
消息只排队，不启动 root 回合。已空闲 child 的成功排队可由原有终止回合和无更新活动
证据结清；运行中消息仍须等待实际终止，followup 必须有新的终止回合。这里的 intent
完成不表示 child 执行了排队消息，也不表示新审查通过。工具成功只识别已观测的空输出，
未知或失败结果保留阻塞。已完成续接的重复 Stop 仅按同一 invocation 和已记录的终止 turn
识别，不能用该记录接受新的未跟踪活动。

补审报告必须包含以下完整负载（每个冻结 criterion 恰好一次）：

```text
REVIEW_RECOVERY_REPORT_JSON
{"descriptor_sha":"descriptor文件的SHA256","criteria":[{"id":"R1","status":"PASS|FAIL|UNKNOWN","evidence":"实际检查证据与必要限制"}]}
```

`quality-gate` 的独立 `EVAL_ENVELOPE_JSON` 可以随后输出；恢复入口分别解析两份负载，
仅用补审报告核对冻结范围。评估 envelope 的记录与质量判定仍由原有门禁负责。

完整报告与同次原生完成证据匹配后，义务为 `COMPLETED`。报告可以 FAIL 或 UNKNOWN；
路由接受只证明审查执行完整，既有质量与发布门仍须按报告裁决。再次可信中断会重新打开
同一义务并保留 attempt。硬失败、未知提交状态或无法证明未恢复的旧 child 保持阻断。

普通 followup/send 的意图在效果前持久化；只有可归属的原生提前拒绝，或工具结果与子回合
终止证据都已核实，才结清。followup 的空工具结果是已验证的成功格式，但它本身不能结清意图。
同一完成回调重复到达不重复消费；没有已登记继续执行意图的新 child 活动会被记录并阻断。

扩展验证（原生测试使用独立 HOME、代码副本和 loopback provider）：

```bash
node --test scripts/test-codex-review-recovery.mjs
node scripts/test-model-route-host.mjs --mutation
node scripts/test-codex-native-lifecycle.mjs --critical-recovery --require-native
node scripts/test-codex-native-lifecycle.mjs --recovery-direct --require-native
node scripts/test-codex-native-lifecycle.mjs --continuation --require-native
```

隔离原生测试证明钩子和生命周期；真实模型能读取冻结文件并返回报告，仍需单独取得同次
`completed` 与 `accepted` 证据。缺少 CLI 或依赖时 `--require-native` 必须失败，不能把 SKIP
记为通过。修改 hook matcher 后还须核验实际注册与信任状态，源码文件存在不代表已启用。

已完成关键审查的后续 `followup_task` 若可信中断，原回合的 accepted 仅保留为历史，
不能覆盖新回合。账本为该原生 continuation 建立独立 turn-bound 义务，重启与 runner
同样阻断；通过同一冻结 descriptor / reservation / cold replacement 协议补审。
补审退休旧 child 时保留首次 accepted 与中断回合身份；迟到回调不能把中断当作完成。

原生测试在专用 HOME 禁用 plugins、remote_plugin、plugin_sharing 和 recommended_plugins，
并用专用 PATH 中的 Git transport fence 验证外部插件同步未发生；这不是通用 OS 网络沙箱。
新增 `--recovery-continuation --require-native` 覆盖真实 CLI 的首次完成、跟进中断、
重启前后阻断、冷补审、退休围栏与历史保留。模型回答仍全部来自 loopback provider。
