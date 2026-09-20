# 模型路由 G0：接口级预检

日期：2026-09-17。范围：NO_PIN 框架；只检查模型，effort 不在范围内。

## 当前结论

CODEX_H2_PASS / CROSS_HARNESS_DEFERRED。最终 fresh root=`01a0bd80-6956-7e52-bb2f-4a9269cd26ae` 保持 anchor `gpt-5.6-sol`，`quality-gate` child=`01a0bd82-37bf-7c30-ac4e-119728d26160` 实际采用 peak `gpt-6-astra` 并同 root turn 完成。受信 state 将该 invocation 记为 `accepted`、`critical_failure=false`，证明模型改写与结果接纳均进入真实 production path。MultiAgent v2 别名遗漏和 `SubagentStop`/`task_complete` 时序错误均已闭合；Claude 仍按用户明确要求暂缓，不宣称双端完成。

累计12次模型调用均处于逐批批准额度：原8次、首次修复活体2次、最终 acceptance 活体2次。本轮没有编辑 Claude settings、Claude hook 或两份 Workflow，也未暂存、提交或推送 Git。别名与 stop 时序两项都经历真实失败复现、先红后绿；native hook 22项、完整 `check:hooks` 与 wiring static 21 PASS/0 FAIL。最终采用标准“可信运行时采用 + 同一 invocation 成功”已满足，E-CN 整体 PASS。

## U05 当前版本四入口调查与精确载荷（2026-09-20）

### 状态口径

- `SUPPORTED`：当前版本存在可落到受信父级的选择、权限上限、同调用关联与拒收机制；只表示可进入获批实现/探针，不表示 H2 已通过。
- `UNKNOWN`：公开接口或本机证据还不能证明一项阻断性质；不得用 prose、prompt 或另一个入口的 PASS 补齐。
- `UNSUPPORTED`：当前版本已证实没有满足合同的机制。U05 没有把任何入口判成这一档。
- `anchor` 始终是根会话实际生效的用户选择；全局配置只在根会话没有显式覆盖时参与。临时 peak/light 子调用不得反写 root anchor。

### 四入口矩阵

| 入口ID | caller / 受支持 tool 或 API | 模型选择 owner / root-anchor 来源 | 权限上限 | 采用与同次结果字段 | 暂停 / 重载 | 精确文件或宿主改动；测试与 discovery 预算 | 状态 |
|---|---|---|---|---|---|---|---|
| E-CN Codex native | `spawn_agent`；Codex Hooks 的 `PreToolUse(Agent)`、`SubagentStart`、`SubagentStop`、`PostToolUse(Agent)` | 根 Codex hook host；从根事件公共字段 `session_id + model` 建立 activation/root generation，显式会话选择优先；child 当前模型不得成为新 anchor | subagent 继承父会话 sandbox/approval；hook 只可收紧或重写本次工具输入，不扩权 | PreToolUse 的 `tool_use_id + invocation marker`；PostToolUse 的同一 `tool_use_id` 与返回 agent id；child transcript 中 assistant event 的实际 `message.model`、完成状态及 agent id。关键错配由 PostToolUse 在父级消费前拒收并置单调 latch | activation flag 先拒绝新 Agent；在途结果只留审计。`.codex/hooks.json` 变更须重算 hook trust，启动新根会话/activation 后才启用 | 新建 `.codex/model-route-hook.mjs`、`scripts/model-route-host.mjs`；编辑 `.codex/hooks.json`、必要时 `.codex/codex-hook-adapter.mjs`；新建 `scripts/test-codex-model-route-hook.mjs`。discovery 最多 2 次只读调用、每次 90 秒、零重试 | SUPPORTED；H2_PENDING |
| E-CR Codex runner | `.codex/workflow-runner.mjs`；`codex app-server` 的 `thread/start`、`turn/start`、`turn/completed` | runner 进程是 parent owner；根 Codex PreToolUse 仅对精确 runner argv 注入 session/release 引用，runner 从受信 state 读 root anchor，不从 child 或活动全局配置重算 | runner 保留现有 scratch/read-only/进程组边界；app-server 显式 model 不授予新工具/网络/写权限；任何警告、改路、缺字段或失败先拒收 | 新 thread 的 `ThreadStartResponse.model/modelProvider` + thread id；同一 thread/turn 的 `turn/completed`；runner sidecar 绑定 invocation/release/activation/root generation。旧 `codex exec` stdout 丢弃路径不再承担可信入口 | runner 在每次派发前及结果接纳前核 activation；暂停后不启新 child，旧结果不授权后续阶段；进程退出即失效，新进程新 activation | 编辑 `.codex/workflow-runner.mjs`、`scripts/test-workflow-runner-runtime.mjs`、`scripts/verify-codex-wiring.mjs`；与 E-CN 共用 host/state。discovery 最多 2 次只读 turn、每次 90 秒、零重试 | SUPPORTED；H2_PENDING |
| E-AN Claude native | `Agent`/兼容 `Task`；Claude Hooks 的 `PreToolUse`、`SubagentStop`、`PostToolUse`/`PostToolUseFailure`，并用 `SessionStart`、`PostModelSwitch` 跟踪根模型 | 根 Claude hook host；SessionStart 有 model 时记录，PostModelSwitch 更新根 generation；若当前版本/会话缺失可信根身份，普通 anchor 可省略 model 继承，但 peak 关系判断必须 NEEDS_CONTEXT | subagent 沿用 Claude 当前权限/工具上限；不设置 `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`，避免把动态每次选择变成全局强制；hook 不扩大 allowlist | PreToolUse 注入显式非-anchor model 与 marker；Agent tool result 的 agent id 关联 child transcript，assistant message 的 `message.model` 与完成状态作为 adopted/same-call 证据；PostToolUse 在父级消费前拒收关键错配 | state flag 先阻断新 Agent/Task；在途结果不授权。为避免 watcher 行为差异，hook 注册改动统一按“新 Claude 根会话/新 activation”生效 | 新建 `.claude/hooks/model-route-guard.mjs`、`scripts/test-claude-model-route-hook.mjs`；编辑 `.claude/settings.json`；共用 `scripts/model-route-host.mjs`。discovery 最多 2 次只读调用、每次 90 秒、零重试 | SUPPORTED；缺根身份的具体 session 必须 fail closed；H2_PENDING |
| E-AW Claude Dynamic Workflow | `Workflow` 工具运行 `.claude/workflows/*.js`，脚本内 `agent()` 可逐调用传 model；候选控制面是 Workflow PreToolUse 注入结构化 `args.__luca_model_route`，脚本按 `(workflow_id, phase_id)` 消费 | 预期 owner 是根 Claude hook host + Workflow runtime；root anchor 仍来自根 activation，workflow child 不能重定基准 | workflow 脚本本身不能 `import()`/任意 fs；agent 权限仍受 Claude runtime 控制。该限制不等价于“结果已被可信核验” | 文档确认 `agent()` 可传 model 且失败可返回 null，但未确认 Workflow 调用是否向 hooks 暴露可关联的每个 child adopted model，也未确认 wrong-model 能在返回值进入脚本前被机械改成失败。进度 UI 显示替换不构成程序门 | `/workflows` 可暂停/停止运行，源码用 `/reload-skills` 重载；但“暂停整包派发 + 拒收在途 critical result”的宿主闭环尚未证实 | 候选编辑 `.claude/workflows/external-skill-scout.js`、`framework-evolution-scout.js`，新建 `scripts/test-claude-workflow-model-route.mjs`；只有 probe 证明 hook event、args/script rewrite、child correlation 与 pre-consumption rejection 后才进入 W2。discovery 最多 1 次 workflow run、含 2 个只读 agent invocation、各 90 秒、零重试 | UNKNOWN；整包阻断 |

官方边界依据：Codex [Hooks](https://developers.openai.com/zh-Hans/docs/hooks)、[Subagents](https://developers.openai.com/codex/subagents)、[App Server](https://developers.openai.com/codex/app-server)；Claude [Hooks](https://code.claude.com/docs/en/hooks)、[Subagents](https://code.claude.com/docs/en/sub-agents)、[Dynamic Workflows](https://code.claude.com/docs/en/workflows)。本机历史 transcript 只用于证明 Claude native 的 agent id 与 child `message.model` 可关联，不替代当前版本 probe。

### 共同 host 与私有角色绑定

U05 冻结以下边界，当前尚未创建：

1. 唯一离线 v2 候选载体：`framework-audit/candidates/model-routing-v2.yaml`。W1 测试直接指定它，生产入口仍只读现有 `.claude/skill-os/model-routing.yaml`；整包 H2 之前禁止半切换。
2. 纯 policy/resolver：`scripts/model-route.mjs`；受信生命周期与 evidence host：新建 `scripts/model-route-host.mjs`。两端可有薄 adapter，但不得各自拥有场景表、fallback 或上下关系算法。
3. 用户私有绑定唯一候选路径：`/Users/luca/.luca/model-routing-bindings.json`，父目录 0700、文件 0600。结构只含 `schema_version` 与 `harnesses.codex|claude.{peak_model,light_model,approved_order}`；不存 anchor，不存 effort，不做跨厂商评分。具体模型值与关系必须由用户给出，框架不得从 catalog、价格、上下文长度或名字推断。
4. 受信运行态唯一候选根：`/Users/luca/.luca/state/model-routing/<harness>/<root_session_id>.json`，目录 0700、文件 0600、原子替换；记录 release digest、activation id、root generation、root anchor、invocation correlation 与 critical latch。它是 host state，不是 child 票库；新根会话生成新 activation，旧 state 仅审计。
5. 当前只读观察到用户级默认为 Codex `gpt-5.6-sol`、Claude `opus`；两者都不能冒充本根会话的 effective anchor，也不能被自动写入 peak/light。

### 两个现有 Workflow 的唯一 phase 映射候选

以下映射随 v2 候选冻结；adapter 不得按 `phase` 字符串猜测。`Load` 当前仍是模型调用，按低风险结构化提取落 MR-008；未来若改成确定性脚本，可直接省掉模型调用，但不改变其他 phase：

| workflow_id | phase_id | scene / role | critical | 理由 |
|---|---|---|---|---|
| external-skill-scout | Load | MR-008 / light | false | 受限真值文件提取，有固定 schema |
| external-skill-scout | Discover | MR-006 / anchor | false | 外部事实收集与候选发现 |
| external-skill-scout | Verify | MR-004 / peak | true | 安全/兼容/非冗余硬门及终局 verdict |
| framework-evolution-scout | Load | MR-008 / light | false | 受限真值文件提取，有固定 schema |
| framework-evolution-scout | Intake | MR-006 / anchor | false | 具名候选事实采集 |
| framework-evolution-scout | Discover | MR-006 / anchor | false | 多源事实收集与机会发现 |
| framework-evolution-scout | AdoptionReview | MR-004 / peak | true | keep/watch/revert 语义复审 |
| framework-evolution-scout | Verify | MR-004 / peak | true | 硬门与采纳结论 |
| framework-evolution-scout | Redteam | MR-003 / peak | true | 对抗裁决；null/错模不得被保守默认吞成成功 |

### 精确迁移载荷与当前偏差处理

W1 离线候选只允许触及：`framework-audit/candidates/model-routing-v2.yaml`、`scripts/model-route.mjs`、`scripts/test-model-route.mjs`、新建 `scripts/model-route-host.mjs` 与 `scripts/test-model-route-host.mjs`。它不得改活跃 YAML、hook 注册、runner、workflow 或私有绑定。

W2 在对应入口从 UNKNOWN 变为 SUPPORTED 且逐批获准后，精确适配面为：

- Codex：`.codex/hooks.json`、`.codex/codex-hook-adapter.mjs`、新建 `.codex/model-route-hook.mjs`、`.codex/workflow-runner.mjs`、`scripts/test-codex-model-route-hook.mjs`、`scripts/test-workflow-runner-runtime.mjs`、`scripts/verify-codex-wiring.mjs`。
- Claude：`.claude/settings.json`、新建 `.claude/hooks/model-route-guard.mjs`、`scripts/test-claude-model-route-hook.mjs`、两份现有 workflow 及新建 `scripts/test-claude-workflow-model-route.mjs`。
- 共同消费与 U09-a：`.claude/skill-os/model-routing.yaml`、`.claude/skill-os/runtime/cross-harness.md`、`.claude/skill-os/agent-context-manifest.json`、四份 Claude agent 声明、三份 Codex agent TOML、`scripts/check-model-table.mjs`、`scripts/check-agent-contracts.mjs`、`scripts/check-agent-context.mjs`、`scripts/test-agent-context.mjs`、`memory/scripts/daily_governance.py`、`memory/scripts/behavioral_ab.py`、`scripts/fusion-preflight.py`。固定 agent effort 数值保留；只删除 runner 的场景化 effort 注入与“effort=模型档位”解释。

当前 worktree 中 `.codex/hooks.json`、`.claude/settings.json`、`.claude/skill-os/model-routing.yaml`、部分 agent/checker 已有 Muse Loop 退役等并发修改。W1 用审计目录候选隔离；W2 不 reset、不覆盖，进入每批前重新冻结这些文件的现状 SHA 与相关 diff。若并发修改继续前进，暂停该批并重新编译 patch；不得拿早期 exact list 直接覆盖用户工作。

### 下一批准单：有界 H2 discovery probe

开始前必须同时满足：用户确认上述私有绑定路径，给出 Codex/Claude 各自 `peak_model`、`light_model` 及同端上下关系；并批准外部模型调用。建议预算是最多 8 个 model invocation：每入口 `anchor + 一个显式非-anchor` 各一次；Workflow 用一次 run 内两个 agent 计 2 次。每次 90 秒、零应用层重试；固定无业务数据提示词、只读权限、禁止网络/外部工具、输出仅写 mode 0600 的临时证据与运行时正常 transcript/cache。离线 mutation 负责错模/旧票/失败 latch，不额外消耗模型。

此 discovery 预算只回答“当前版本机制能否成立”，不代替 W3 的最终四入口 anchor/peak/light 与失败路径 H2。若 Workflow probe 仍不能证明 pre-consumption rejection，则 E-AW 变为 `UNSUPPORTED`，整体继续 NEEDS_CONTEXT；是否缩掉 Claude Workflow 必须由用户决定。

### U05 实际执行与范围裁决（2026-09-20）

用户先批准建议绑定与最多 8 次探针，随后在 Claude 认证前置失败后明确「claude先不管」。这构成当前里程碑的范围收窄，不删除 R-1/R-2 的双端目标，也不把未验证的 Claude 能力改写为 PASS。

| 入口 | 实际结果 | 可信证据 | 当前裁决 |
|---|---|---|---|
| Codex native | anchor=`gpt-5.6-sol`、peak=`gpt-6-astra` 各一次成功 | 两个 child transcript 的 `session_meta`、`turn_context.model`、turn id 与精确完成 marker；不是 child 自报 | PASS，可进入 U06-a |
| Codex runner | 0.155.1 app-server 的 Sol/Astra 各一次成功；adopted=model request，provider=openai，同 thread/turn completed，无 reroute | `ThreadStartResponse`＋`turn/completed`；两个结果文件均0600 | PASS，可进入 U06-b |
| Claude native | 一次启动在 inference 前返回 OAuth expired；`modelUsage={}`、spawned=0；`claude auth status` 为 loggedIn=false | 没有模型结果，不能产生 H2 票 | DEFERRED_BY_USER |
| Claude Workflow | 未启动，避免在同一认证 blocker 下重复消耗 | 无当前版本运行证据 | DEFERRED_BY_USER；原能力状态仍 UNKNOWN |

成功模型 invocation 共 4 次，未超过 8 次上限；Claude 失败发生在 inference 前，不计成功调用。Codex runner 的两次 sandbox 预检均在 turn 前因 SQLite 状态目录权限被拦，随后以完全相同的批准命令在沙箱外成功，不扩大模型/工具/写权限。证据报告：`/private/tmp/model-routing-u05.9AMC4B/report.json`，mode0600，SHA-256=`acb5323c890ef67d72e7d48826d4b06f353c0b066df1407b5c191d53f46cef98`。

私有绑定已创建：`/Users/luca/.luca/model-routing-bindings.json`，mode0600，SHA-256=`83a3bea76c24a0dc65b995ccc06425cc1fdbb780d3d47df3b50cce384e6afdfb`。当前只启用 Codex 实施授权；Claude 值保留为用户选择记录，不接生产入口。

下一步按收窄后的 W1/W2 执行：公共 policy/resolver 保持 harness-neutral，避免未来再造第二套 Claude 规则；生产接线仅实现 Codex native 与 runner。不得编辑 `.claude/settings.json`、Claude hook 或两份 Workflow，不得宣称双端 H2。

## 本地证据

### P4a 当前补证结果（当前权威）

用户已批准 app-server 通道与零 inference P4a；实际运行一次、两会话均在 initialize 后拒收，normal 原因为 RUNTIME_STDERR_ERROR（81.43ms），fixture 原因为 WARNING_UNEXPLAINED/configWarning（108.29ms）。退出均为 0 且已关闭，但退出成功不证明配置消费成功。实际没有 config/read、thread/start、B/A-restored 或模型 turn，新增逻辑 inference=0；两会话预算已耗尽，不重试。
scratch=`/private/tmp/model-routing-snapshot.Lr0X5P`，probe SHA=`7858fafca6b58c84ba14ce6b81eccbfee98a4b2f746a06f30c228129e454efbf`，report SHA=`e535a1cbf7133ddd4dcf7e30735c2e236ae3e38806a2fd2d4eabb004f80f1f09`、mode0600。父级与冷 quality-gate 独立全读/核 SHA、syntax/11 组 self-test PASS；worker 一项 guard corruption red/restored green。离线模型/checked-A/协议拒收证据不是实际 config consumption。
冷判定 FAIL 2/5：SNAP004/005 PASS；SNAP001 BLOCKING UNKNOWN（没有返回配置、采用模型、完整权限及 thread 关联），之后停止，SNAP002/003 UNKNOWN 未执行。正式 verdict 已由父级 recorder 验证并读回 governed eval-log，run=`model-routing-snapshot-20260917-quality-1789639680340`、digest=`0414af15f24cb0873c19c57d71a99068278388494a87e4d305365b2eedbaea7d`。
启动原因正文未保留，不能解释为无害 warning/模型 fallback，也不能从本次拒收或协议缺完整回读推出全部等强机制不可行。机制专家指出 parent-owned 原生配置 lease/封闭读取视图＋whole-process 机械上限可以是有条件候选，当前能力仍 UNKNOWN。
本机 native0.154.0 targetaarch64-apple-darwin，binary SHA=`4f85982624b3898c8991cb80c0981b2aa71070e3537046c9a95950318a95afcc`；package 无 bundled Rust source/build-commit 认证映射。没有运行 sandbox/mount、下载/构建/替换 runtime、改私有模型配置、追加模型调用或 Git 发布。冻结核心/proposal SHA 均未变。
下一新增 authority 为 core-plan 的 P4b：保留脱敏启动原因的最多两次零 inference metadata 会话＋官方版本对应 loader/host-cap 源码只读可行性核查；载荷尚未批准。full gate 未通过，先停自动接线，不把历史显式入口 PASS 借给本轮。

### 代理复验（当前终结论，取代下方历史 BLOCKED）

用户明确批准 Delta G0-P；精确 env HTTP_PROXY/HTTPS_PROXY=系统既有 `http://127.0.0.1:7877`，只在两个测试进程中生效。

| 模型 | adopted_model/provider | 隔离 | 同 invocation 完成 | 改路 | 结论 |
|---|---|---|---|---|---|
| gpt-5.6-sol | gpt-5.6-sol / openai | 确认 | completed，进程 exit=0 | 未观察到 | PASS：app-server 显式入口 |
| gpt-6-astra | gpt-6-astra / openai | 确认 | completed，进程 exit=0 | 未观察到 | PASS：app-server 显式入口 |

Sol threadId=`01a0ae82-4a75-7c43-8e0d-00a93fd92e01`，turnId=`01a0ae82-4ad8-7663-b4e2-4eb6f30df4b2`。
Astra threadId=`01a0ae81-5e33-73b1-8f12-13d623041a62`，turnId=`01a0ae81-5e97-7841-82d6-25ae912557a3`。
runtime userAgent=`model-routing-g0/0.154.0`。两者均恰好一个逻辑turn；出现 item/agentMessage/delta、thread/tokenUsage/updated、turn/completed，完成事件 thread/turn 与对应启动响应一致。不以正文或自报证明采用模型，也不宣称证明后端内部身份。
此追加轮无应用层重试。累计模型turn=4（直连2+代理2），没有追加未授权调用。正常CLI运行状态/缓存写入允许，不写默认配置、不选择/比较/改变effort、不改系统代理、不写实现代码、不做Git操作。

当前 scratch 的两个 result-*.json 保存的是追加代理 PASS 样本；初批 TIMEOUT 样本同名文件已被取证工具新输出覆盖，其已核对的摘要/ID保存在下方历史段及工具输出，不将当前 JSON 冒充初批原始样本。
实现影响分析只读核对了 model-routing.yaml、workflow-runner、wiring、runtime tests 与规则投影：runner 当前仍用 codex exec 并丢弃 stdout；本次 app-server 成功不能替它确认配置快照消费，不自动切换adapter。原生宿主采集owner也未由此得到证明。
下一步可以准备集中角色解析核心的精确文件计划；任何自动接线仍先解决对应通道证据并获 exact files/tasks/effects 批准。用户后续缩小范围只做 Codex，Claude/DeepSeek 动态模型改造和真实调用不在本案授权内。

### 两次真实测试与网络诊断（当前权威）

用户明确本轮只验证 Codex Sol/Astra，不验证 DeepSeek/Claude；测试入口是本机 app-server 显式模型参数，不冒充原生 collaboration 或 exec/profile 接线。

| 模型 | 运行时采用 | 模型 turn 数 | 隔离确认 | 完成结果 |
|---|---|---|---|---|
| gpt-5.6-sol | gpt-5.6-sol / openai | 1 | 是 | 90 秒 TIMEOUT，未收到成功完成 |
| gpt-6-astra | gpt-6-astra / openai | 1 | 是 | 90 秒 TIMEOUT，3 次底层连接错误重试 |

Sol threadId=`01a0ae7a-4331-7003-813d-465d1600ab00`，turnId=`01a0ae7a-4390-7d62-85f5-e62c20936f9f`。
Astra threadId=`01a0ae7c-0a36-7a72-82c6-acfdc1ecb9bf`，turnId=`01a0ae7c-0a95-7b43-ad1b-81ac7e55e882`。
脱敏证据：`/private/tmp/model-routing-g0.aX6M54/result-gpt-5.6-sol.json`、`result-gpt-6-astra.json`。客户端 `probe.mjs` 的 node --check 及正常→六类违规拒收→正常检查通过；MCP 参数纯 key 的安全字符集验证亦通过。未将自报或 requested 字段作为采用证据。

进程临时禁用 hooks/apps/shell_tool/unified_exec/shell_snapshot，各既有 MCP enabled=false、notify=[]、web_search=disabled；config/read 确认这些关键设置，thread/start 确认 readOnly、never 及 openai 模型。设置不写回用户配置，不传 effort。
先前三次 turn 前启动失败是客户端给 MCP key 加引号造成新字面 key，非用户配置故障；已找到根因、修正并增加离线检查，模型 turn 数仍仅为上述两次。

连接检查：对 `https://chatgpt.com/backend-api/codex/responses` 的无认证 HEAD，沙箱内及明确沙箱外直连均 15 秒超时（HTTP=000，TCP/TLS 未完成）。scutil --proxy 显示系统已有 HTTP/HTTPS/SOCKS 代理 `127.0.0.1:7877`；测试进程的 HTTP_PROXY/HTTPS_PROXY 均未设置。显式使用该系统现有代理的无认证 HEAD 返回 HTTP=405，TCP 0.000359 秒、TLS 0.564384 秒。
405 只证明该网络路径能取得 HTTP 响应，不证明账户权限或模型调用成功。直连失败/代理路径可达解释了当前连接阻断；完整因果与模型成功仍须走代理重新验证，不夸大为模型已经可用。

不自动增加模型预算、不改系统代理、不重新登录、不迁移凭据、不改默认配置。待用户追加批准各模型一次代理验证后继续；原生/exec-profile/runner/快照消费仍独立未证。

- 本机 `codex-cli 0.154.0`，可执行入口 `/Users/luca/.local/bin/codex`。
- 执行 `codex app-server generate-json-schema --out /private/tmp/model-routing-g0.aX6M54/schema --experimental`，成功导出本机协议，无模型调用。
- `v2/ThreadStartResponse.json` 返回 `model`、`modelProvider`，但字段没有后端实际服务模型的语义说明；启动响应本身也不证明一次模型调用已成功。
- 同文件 collab 调用记录的 `model` 明确说明为 `Model requested for the spawned agent, when applicable.`，只能作为请求证据。
- `v2/ModelReroutedNotification.json` 含 threadId、turnId、fromModel、toModel；其 reason 当前只有 highRiskCyberActivity。不能假设所有调用或所有改路都必然发此事件。
- `v2/ModelVerificationNotification.json` 当前只有 trustedAccessForCyber 验证枚举，不是实际模型身份验证。
- 当前可用 collaboration 工具没有返回可验证的服务模型身份字段。此前专家调用不得充当 G0 身份证据。

本地 schema 是版本限定的接口证据，不是对所有内部事件或未来版本的否定性证明。

## 配置边界

CLI help 提供 profile、ignore-user-config、ephemeral、JSON 输出等入口，但入口存在不证明配置隔离成功。官方配置文档说明项目配置优先于选定 profile，CLI override 更高；profile 单独存在不足以保证 peak 生效。

参考：
- https://learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/config-file/config-basic

## 待人类决策

### 真实探针启动前复核（当前）

用户批准继续后，只读复核 `/Users/luca/.codex/config.toml`，当前顶层 model 为 `deepseek-v4-pro`，已非计划基底的 `gpt-5.6-sol`。检测到启用的 context7/shadcn/node_repl/pencil MCP 及非空 hooks；未经安全隔离验证，不启动 app-server 或模型 turn。配置不写回、不替换、不复制凭据。
因此本次真实模型调用数为 0。既定“Sol 是当前默认”的前提失效，需用户确认是否按当前 DeepSeek 默认模型验证，或明确只验证 Sol/Astra 两个具名模型。启用扩展/钩子的外部副作用边界还须在临时客户端实施前明确；不能以提示词或 read-only 沙箱冒充全部外部副作用隔离。

建议把可验收边界明确为“可信运行时解析并采用指定模型 + 调用成功 + 发现改路即停止”，不宣称证明底层服务模型身份。该建议是对冻结方案证据标准的实质修改，必须先由用户确认，再修订方案并重做必要握手；不能静默采用。

若用户坚持后端实际身份，继续保留 UNKNOWN，不进入自动路由实现，等待可提供该证据的受信接口。

任何后续真实探针仍需先列明精确命令、文件、权限、次数/预算及副作用。不复制凭据、不改变认证、不发布 Git、不触碰下游项目。
