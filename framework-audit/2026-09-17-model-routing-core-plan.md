# 通用模型路由：当前计划与历史实施记录

> **置顶 · 2026-09-20 · 当前入口：文末 Replan R-2 + 其继承的 R-1 共同规则。** 专家首轮指出迁移顺序、native责任及旧消费面遗漏，R-2已补偏差处置、分阶段顺序、启停恢复和验收修订；与R-1冲突时以R-2为准。目标仍是两端共享anchor/peak/light、主会话不切、subagent/工作流独立调用动态适配。
> 当前状态：CODEX H2 PASS / CLAUDE DEFERRED BY USER。终验 fresh root=`01a0bd80-6956-7e52-bb2f-4a9269cd26ae` 保持 anchor `gpt-5.6-sol`；`quality-gate` child=`01a0bd82-37bf-7c30-ac4e-119728d26160` 实际采用 peak `gpt-6-astra`，父子身份、agent role、root turn 与完成事件一致。受信 state 中 invocation=`b3e81075-52fd-472e-966c-24135eba4c34` 为 `accepted`，`critical_failure=false`；SessionEnd 后 activation 正常 `paused`。这同时闭合了 MultiAgent v2 实测别名 `collaborationspawn_agent` 与 `SubagentStop` 早于 `task_complete` 的两项真实偏差。组合终版SHA仍为 `22bd9f935c19ef7775e27b4a1960031a8f0793978b229f062d67fc1a219e8272`（R-1标题到EOF）。
> 用户批准的私有绑定保持 Codex `gpt-5.6-luna < gpt-5.6-sol < gpt-6-astra`，mode0600、SHA=`83a3bea76c24a0dc65b995ccc06425cc1fdbb780d3d47df3b50cce384e6afdfb`；Claude 绑定仅记录、不启用。累计模型调用12次，均处于逐批获批额度：原8次、首次修复活体2次、最终 acceptance 活体2次。最终离线证据为 native hook 22项、完整 `check:hooks` PASS、wiring static 21 PASS/0 FAIL；此前 policy 24组、host 31项、runner 18项、runner runtime 32项与 agent-context 60/60 mutation 保持通过。兄弟 session 备份与 `stash@{0}` 继续保留；本案未暂存、提交或推送。

## 历史：Codex 集中解析核心实施计划

状态：DONE_WITH_CONCERNS；本阶段 gate_result=PASS（Standards 7/7、Spec 5/5），仅获批三文件解析核心完成；自动派发与 H2 未完成。NO_PIN，原计划基线 `45eff207a585757907f323c6952f969ac76a14b2`；proposal v1.3 SHA `0912e306a9b30538863755493112f87e9fb0713930e7170f24f612c538dfa5de`。
Source：用户“我的整体动态模型，动态的是模型”“你只做codex模型相关的”；v1.3 §3 Interface、§4 MR 场景、§5 DecisionGate。

## 前提与边界

应做：模型角色与失败检查需要集中真值，不能在各调用点写死版本。更小替代：手动参数已实测成功，但不提供自动场景解析，因此只作证据，不作完整交付。
风险假设：集中核心不等于接线，必须独立验收解析行为；若输入的有效模型/能力来源无法确认，返回 NEEDS_CONTEXT，不虚造支持。默认输出为纯解析模块，测试以模型错配/伪造能力必拒绝的相反立场验证，未拆除防护。
现有 app-server Sol/Astra 显式选择+成功已证明。原生宿主/exec-profile完整消费未证，因此本阶段**不自动派发、不改runner、不换adapter**；后续接线仍需对应证据与另批 exact plan。不是将全量改造缩成三文件后宣布DONE。

## 模式与任务

Sequential，Lightweight；model_tier=core-execution；effort继承，不选/改/比较。无产品设计场景，PRD/tech-spec前置门不适用。已完成本机协议/官方文档与真实调用调查；不再额外联网研究或模型ping。

| U-ID | Approach / Source | Exact Files | Verification |
|---|---|---|---|
| U-MR-01 | 为MR-001…007添加Codex anchor/peak语义与拒绝策略；不写模型名；保留既有effort数值与model_field继承规则，标明此为解析核心、非原生覆盖启用 | `.claude/skill-os/model-routing.yaml` | YAML合法；新角色/场景映射完整；旧effort/Claude数据未变 |
| U-MR-02 | 实现v1.3 resolve公开入口及JSON命令入口、manifest/validateDecision纯校验；依赖可信输入注入，零写入零网络；requested与adopted证据分层 | `scripts/model-route.mjs` | node --check；未知scene/能力来源/缺peak/冲突拒绝；任务/输入/模型/代次绑定，effort不入摘要 |
| U-MR-03 | 先写行为测试，再实现U-MR-02；用正例/反例/变异验证MR映射、默认模型变化、anchor=peak、失败及旧票拒收 | `scripts/test-model-route.mjs` | 全行为测试通过；故意错配/伪造/过期转红，恢复通过；无真实模型调用 |

Read List：冻结proposal §3–8，model-routing.yaml；只读核对runner/wiring现状以保持接口兼容，不修改它们。现有用户脏文件与并发domain-modeling暂存修改不可覆盖/暂存/提交。

## 命令断言

```sh
# [BLOCKING] CORE-001 — 模块语法
node --check scripts/model-route.mjs
# [BLOCKING] CORE-002 — 行为测试与拒收负例
node scripts/test-model-route.mjs
# [BLOCKING] CORE-003 — 现有路由配置合法性
npm run check:routing-map
# [BLOCKING] CORE-004 — 现有根合同不破坏
npm run check:coding-discipline
npm run check:quality-gates
npm run check:self-model
```

关键准则：C1各MR场景可操作且unknown拒绝；C2核心零网络/写入且READY不是调用成功；C3effort完全不参与路由/票据且旧配置不变；C4原生/runner未接线如实标未完成；C5旧票/模型不一致/伪造能力不能得到有效授权。
本阶段完成不抵销A-002/003/006/009的实际接线义务，不直接取得H2。未达到可验证核心行为就停止，关键失败不进下一阶段；后续变更必须独立review并绑定实际冻结diff。

## 人类确认范围

批准仅含上述三个源码文件，以及本主题审计checkpoint；不含当前默认/peak私有配置创建、不改effort、不改Claude或DeepSeek、不改`.codex/`、不运行真实模型、不提交/推送Git。
后续完整自动派发另列计划：按已验证宿主能力决定原生/CLI支持，不将app-server暗换为runner的exec通道；该阶段仍不享有本次授权。

## 实施 checkpoint — core R1

实施 HEAD=`fad49e05cd1f59943b5d6e11c6da5369b877b3cc`。与原计划基线相比，三个目标内仅 YAML 的 domain-modeling 登记已被另项工作提交；原样保留。其他工作树修改不纳入本次 diff、不回退或暂存。
preflight-agent：PASS；采用 TDD 逐 seam 先红后绿，code-hygiene 模式 A 完成前验证，不做脏树清理。

公开接口：

```js
resolve(request, {verifyCapability})
createRouteManifest(route, {route_id, invocation_id, task_id, input_sha, generation})
validateDecision(manifest, decision, {request, route_id, invocation_id, task_id,
  input_sha, generation, critical_failure}, {verifyCapability, verifyModelEvidence})
```

`request.role_config` 是 YAML 的 `codex.model_routing` 子树；harness 为 `codex-native` / `codex-cli`；有效配置注入 anchor/peak 的 model/source 及既有 security/provider 边界。MR-007 还要明确 `delegate_scene` 和 payload/overhead/reserve/available 四项容量。
两个同步纯 verifier 必须由可信宿主提供，核验真实采集的配置/能力与同调用采用+成功证据，不能来自 JSON 或 child 自报；未提供严格返回 NEEDS_CONTEXT。`validateDecision` 重解析父级当前 request，拒绝缺票/旧票/关键失败/非关键路由/失败 verdict；ACCEPT 仅代表本模型票校验有效，**不授予 external effects**，也不实现宿主持久 latch 或受保护入口。
命令入口 `node scripts/model-route.mjs resolve --input <request.json>` 强制读取仓库政策，忽略请求内政策覆盖；本阶段无可信采集接线，因此有效输入仍返回模型选择+NEEDS_CONTEXT（exit 2），REFUSE 为 exit 3。没有通过 JSON 自造支持的 exit 0 路径。

新鲜证据：模块 node --check 通过；15 个行为测试组通过；临时副本 10/10 mutation 被对应断言杀死，恢复副本再通过；四项既有 check 全通过。PyYAML 全文解析并移除新子树后与 HEAD 深比较相等，证明 Claude、effort 及其余存量数据未变。测试没有真实模型请求。
mutation 分区：peak→anchor、伪造覆盖能力、删除安全边界、pin 冲突、容量、错采用模型、忽略代次、忽略配置摘要、删除失败 latch 消费、无可信模型证据。

冻结 FILE_SET（按下列顺序将 path+NUL+bytes+NUL 串接后 SHA-256）：

| 文件 | SHA-256 |
|---|---|
| `.claude/skill-os/model-routing.yaml` | `65e0a60e8e7b9e87291fb5497b8f9a13602c21106e6e150bdecc6a3a93e5e59b` |
| `scripts/model-route.mjs` | `75b8db405bda5c1b769664452f4ec2acbdd68c0018b184be139c213bf2fadd96` |
| `scripts/test-model-route.mjs` | `fe72ccf950a8b4204bb13ef3f614ccb7903cb4d438e210a796b2a124924083e9` |

subject_sha=`38bfe7d115006994c54017b161030bfee48b9fdb28ab130143fb2aa5a6f2c147`。
独立复核：Standards / Spec 两轴冷启动 default-REFUTE，均须回算同 SHA、实际运行本地核心测试；结论记入既有 review/handshake，不拿 H1 方案票充实现票。
恢复顺序：核对三文件 SHA/HEAD/dirty → 回收两轴票 → 存活重大项停止核心结案，修订需新 freeze 与终版确认。runner/native/config loader/真实通道接线尚未完成；H2 不因此获得 PASS。

## 实施 checkpoint — core R2（当前）

R1 独立复核：Standards CONDITIONAL_PASS 6/7（1 Minor）；Spec FAIL 4/5（1 Important）；不合并两轴 findings，不以生产者测试全绿外推验收。
Standards Minor：数组 scene/delegate_scene 会被 JS 属性键强转识别，manifest 保留数组导致 JSON 读回后严格关联失败。Spec Important：明确 `fallback='conservative-default'` 在父级 latch=false 时仍 ACCEPT。生产者已独立复现两项，各先补失败测试，再修复。
最小修复：scene/delegate_scene 与 manifest 关联字段强制标量类型；关键 decision 必须明确 `fallback:false`，缺失/未知/declared fallback 均 REFUSE，独立于 latch。可信 `verifyModelEvidence` 还必须核验同调用成功与非兜底来源，不仅核验模型标签；本模块不能证明未接线宿主状态。
新增证据：17 个行为测试组 PASS；13/13 mutation 杀死+恢复 PASS（新增两项选择器类型防护及 fallback 防护 mutation）；语法与四项既有合同检查再次 PASS。有效票 JSON roundtrip 正例通过。范围仍只有获批三源码文件，YAML R2 未改。

| R2 文件 | SHA-256 |
|---|---|
| `.claude/skill-os/model-routing.yaml` | `65e0a60e8e7b9e87291fb5497b8f9a13602c21106e6e150bdecc6a3a93e5e59b` |
| `scripts/model-route.mjs` | `b86cca7778b9f07682a4d2095fd76b1339ef1963b1a5695f062042b8e15fb389` |
| `scripts/test-model-route.mjs` | `9320c11f979deda050b87eef57e505ee9b66c8c27a110942e10c93f903d8c752` |

新 subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`；算法与 FILE_SET 顺序不变。R1 票不搬用，两轴对 R2 终版闭合 PENDING。默认两轮上限，R2 若仍有 Important/Critical 停止结案交用户；不自行加无界评审。H2 保持 NOT_DONE。

## 核心最终闭合（当前权威）

R2 两轴分别回算前后相同 subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`。
Standards：PASS 7/7，R1 Minor CLOSED，无新增/存活 findings；Spec：PASS C1–C5 5/5，R1 Important CLOSED，无新增/存活 findings。两份报告分列见 review；不复用旧票，不外推实际 adapter。
两位各自重新实际运行语法/本地行为与变异验证；Spec 另有 61 项独立攻击检查及 I/O instrumentation，Standards 另测 JSON roundtrip、非字符串选择器与 clear-latch fallback。生产者再次独立复查纯 API 禁用文件/子进程 I/O 后正常运行、明确 fallback 拒绝和旧 YAML 数据不变。
正式 envelope 已由父级独立 recorder 校验、落既有 eval-log，读取记录确认 Standards 7/7、Spec 5/5。代码三文件保持 R2 SHA，未触碰私有配置、effort、Claude/DeepSeek、runner、`.codex/`、共享项目别名或 Git 发布。

本阶段 DONE：模型角色解析、JSON 只读预览、manifest、父级当前裁决校验及能咬住对应错误的测试。
尚未 DONE：可信宿主/配置采集 owner，实际 native/runner adapter，CLI 完整快照消费，持久 critical-failure 状态和受保护阶段入口。当前父级 JSON 不能取得 READY；这里不是可直接启用的自动模型路由。
下一批准边界：另列接线 exact files/tasks/effects，逐通道补齐证据并接入口，之后才允许全量 H2；不重复已通过 app-server 探针，不将其暗换为既定 exec/原生接口，不运行额外模型/发布。
恢复最小包：本文最终闭合 + review core R2 最终票 + handshake 当前核心结论，先复算源码 subject_sha，再准备下一阶段计划。

## 接线准备 checkpoint — 只读核查完成，通道选择待用户确认

Source：用户“完成了？没完成继续”。本轮继续准备剩余改造，不将此前三文件批准扩展为 runner、私有配置或额外真实模型调用批准。
HEAD 仍为 `fad49e05cd1f59943b5d6e11c6da5369b877b3cc`；preflight 复算三文件 subject_sha 与 core R2 相同。新鲜核心回归 `node scripts/test-model-route.mjs` exit=0，17 组 PASS。并发 domain-modeling、observability 与 retrieval-log 修改保留，不暂存或回退。

执行的 skill：codebase-design 快速诊断；其 preflight 仅对 READ_ONLY planning PASS。OpenAI Docs 在本地协议核查后按更高优先级工具规则进行官方文档 fallback，并实际读取 [App Server 官方文档](https://learn.chatgpt.com/docs/app-server)。web-access 的 CDP 前置脚本会启动浏览器代理，超出公开文档只读范围；未启动该脚本/浏览器，使用其静态搜索与页面读取路径。官方文档不替代本机行为证据。
两个独立 explorer 分别负责 runner seam 与已有本地协议，均只读，无测试临时文件、模型调用或源码改动；此为事实调查，不是 H2 实现评审票。

### 核查结论

| 通道/边界 | 当前证据与结论 |
|---|---|
| 现有 runner `codex exec` | `.codex/workflow-runner.mjs:189` 的 runCodex 不传 model/profile；`:218` 丢弃 stdout，只从 `-o` 业务 JSON 读回。现路径没有采集 adopted-model 证据。exec JSONL 是否另有可用采用字段仍 UNKNOWN，不宣称 CLI 永远不支持。 |
| 已测 app-server | 原 G0 的 thread/start 顶层 model/provider + 同 thread/turn 成功完成，支持用户批准的“运行时采用+同次成功”标准。仅适用于那两个调用；不能转借给后来 exec/native 派发。 |
| 原生公开 collaboration | 现有协议 collabAgentToolCall.model 明确是 requested；完成状态无同次 adopted-model/provider 回执。当前原生自动 peak 接线 UNKNOWN/NEEDS_CONTEXT，不由主 agent 自造 verifier。 |
| 配置消费 | config/read 返回磁盘有效分层配置、origins/layer version，但没有回绑 thread/turn 的 immutable snapshot ID。active config A→B→A、项目/managed/provider 层与执行消费同一性仍 UNKNOWN。现有 G0 不能放行自动接线。 |
| 回收与失败 | runCodex 失败返回 null；业务 schema 没有可信 model/route envelope。现有业务 verdict 不能直接当 core 的 `verdict:PASS`。可信 sidecar 必须由 parent 构造，不能要求 child 自证。 |
| 可真正保护的入口 | runner 自己的后续 child spawn、当前关键结果接纳、最终可信输出；同 generation 的单调 critical-failure latch 尚未实现。不能阻止任意 workflow JS/native/Git/独立簿记的副作用，也没有跨进程持久存储合同。 |

本地协议核查基准 `/private/tmp/model-routing-g0.aX6M54/schema/`：ThreadStartResponse 顶层 model/provider/cwd/approval/sandbox；TurnCompletedNotification 的 thread/turn/status/error；ConfigReadResponse 的 config/layers/origins。Thread.model 明示不是 per-turn telemetry；settings 更新 ACK 不保证某次 inference 采用；activePermissionProfile 仅 id/extends，legacy sandbox 信息不等于完整机械权限证明。
原 G0 结果没有完整 config/read/origins 与原始事件；Sol 的 warning 文本未保存，不能解释为无一切 fallback。明确 reroute/error 必拒绝，通知缺席不证明服务商内部从未改路；本案不认证后端内部身份。

当前两份 workflow 均 propose-only：`external-skill-scout.js` 的 Verify null 被丢弃；`framework-evolution-scout.js` 部分路径虽标 INCOMPLETE 仍返回业务 results。终端拒收必须由 runner 自己执行，不能依靠这些业务 fallback；不新增 effect executor，不改写两份 workflow。
原生/runner 外未接入的 effects 标 UNSUPPORTED。路由票永不授予用户尚未批准的操作权。

只读 TOML 核对当前选择点：CODEX_HOME=`/Users/luca/.codex`，配置 model=`gpt-5.6-sol`、provider=`openai`；`/Users/luca/.codex/peak.config.toml` 不存在。这不是 native 主会话有效模型或完整 CLI 配置消费证明。本轮未创建/修改任何私有配置，未输出或处理 effort 为路由输入。

### codebase-design 采用结论

Module：可信 Codex 委派 adapter；caller：runner 的 `agent(prompt, opts)`，不是业务 workflow 自己。
Interface：保留业务 schema/结果和普通 null API，parent 另持 invocation-bound sidecar 与失败状态；顺序为可信采集→resolve→manifest→dispatch→同次回收→validateDecision→受保护入口消费。模型不可证、配置消费不可证或关键失败时不得接纳可信成功。
Implementation 隐藏配置采集、RPC 回收、关联与失败分类；model-only policy 仍由唯一 YAML/core 解析，不让 caller 手算角色。
Seam：现有 agent→runCodex 的实际委派边界和 runner 最终出口。app-server 是候选 production Adapter；fake transport 是测试替身，不是第二条已验证生产通道。
Tests 通过与 caller 相同 Interface 驱动真实子进程/伪协议；不用 child 正文补可信采用字段。Deletion test：删除 adapter 会让采集/回收/校验散回调用者；仅加 `-m` 或仅包装旧 JSON 命令仍无法藏住这些复杂度，拒绝作为完整修复。

### 下一批准载荷：通道调整 + G0 配置消费补证（P4a）

**P4a 已批准：用户在本轮精确问题后回复“同意”。** 已选择 app-server-backed Codex CLI 委派，并批准下列零 inference 配置消费验证。原生公开工具继续 UNKNOWN 并明确拒绝无证 peak；不把 CLI 委派称原生子 agent，也不因此宣布原 A-002 通过。后续源码与私有配置实施仍按本载荷末尾独立 gate。
用户若坚持保留原生/exec，先获取对应可信宿主/事件 owner；没有证据不编码自动派发。

P4a 模式 Sequential；先做配置消费补证，关键门不通过不进入 runner 编码。只限 Codex model，不选择/调整/比较/度量 effort，不修改旧 effort 映射；不碰 Claude、DeepSeek、项目 aliases、framework/ 或 Git 发布。

Exact files/effects（批准后才建立临时探针）：

- `mktemp -d /private/tmp/model-routing-snapshot.XXXXXX` 创建父级私有 scratch；返回确切路径后记录，再以 apply_patch 写 `<scratch>/snapshot-probe.mjs`。不覆盖原 G0 文件。
- 探针生成自己拥有的 `<scratch>/fixture-home/config.toml`、`<scratch>/fixture-home/peak.config.toml`、`<scratch>/workspace/.codex/config.toml` 与白名单 `<scratch>/snapshot-report.json`。只修改这些测试配置，不写 `/Users/luca/.codex/config.toml` 或真实 peak 文件，不复制 auth/credential/秘密配置值。
- 原用户配置只经真实 Codex 正常加载和 config/read 作来源调查；报告只留 model/provider/权限字段及对应 origins/layer version，完整配置/凭据不落盘或打印。完整正常配置若不能封闭消费，报告 UNKNOWN/REFUSE，不用缩减 fixture 配置冒充生产快照。
- 使用已安装 `/Users/luca/.local/bin/codex app-server --listen stdio://`；测试 CWD 为自己的 workspace，readOnly、approvalPolicy=never、ephemeral，沿用已验证的关闭 hooks/apps/MCP/web/shell-tool 方式。模型值仅既有 Codex Sol/Astra；不创建自定义外部 provider，不打开监听端口/daemon/GUI。
- 允许 RPC 仅 initialize/initialized、config/read、thread/start 及关闭连接；**禁止 turn/start、resume/fork/模型委派与配置写入 RPC**。最多两个 app-server 会话，每个 60 秒，无应用层重试；逻辑 inference turn 预算 0。初始化可能产生目录/日志/缓存写入或配置元数据联网，不能将“0 inference”夸成“零网络/零运行时写入”。需要新权限/登录/凭据迁移时停止。
- `<scratch>/snapshot-probe.mjs` 的拟执行入口为 `node <scratch>/snapshot-probe.mjs --codex /Users/luca/.local/bin/codex --workspace <scratch>/workspace --report <scratch>/snapshot-report.json`。scratch 不自动删除，故无递归清理或用户数据删除。
- 回收记录仍写本主题现有 core-plan/G0 preflight/handshake checkpoint，不新建 tracker、不修改被冻结 proposal 或三源码。

P4a 断言（全部 BLOCKING；UNKNOWN 不算 PASS）：

| ID | Given / When / Then |
|---|---|
| SNAP-001 | 同进程/连接/cwd 的已核验配置及 origins；创建 thread；运行时返回所选 model/provider、适用权限边界与关联 IDs，来源可追踪，不能只用请求值。 |
| SNAP-002 | 已核验消费快照；检查后改变自己拥有的 active model/权限配置，含 A→B→A；待消费执行入口只能加载已核验值且不能扩权。若协议/隔离只支持观察差异而不能证明同一消费，UNKNOWN/REFUSE。 |
| SNAP-003 | 项目/managed/provider/auth/hooks/MCP 等外部依赖；无法封闭或证明其消费/权限上限；通道拒绝启用，不以复制两份 TOML 或 legacy sandbox 标签作完整隔离证明。 |
| SNAP-004 | 不一致、缺证、warning/reroute/error/settings drift、超时或解析损失；结构化拒收并保留脱敏原因，不改模型重试、不借历史 G0 PASS。warning 未解释时不宣称全量失败/fallback provenance 已闭合。 |
| SNAP-005 | 整个 P4a；无 inference turn、无私有配置/effort/Claude/DeepSeek/Git/aliases 写入；冻结核心 SHA 保持相同。 |

P4a 若 PASS，再按实际证据编译 runner 接线 **新的 exact implementation payload**；不能用本探针批准自动改源码。已经定位的最小 runner ownership 为 `.codex/workflow-runner.mjs`、`scripts/test-workflow-runner-runtime.mjs`、`scripts/verify-codex-wiring.mjs`；独立 collector/core policy/root/governance 的实际增改列表届时明确，不预造可用能力。`scripts/test-workflow-runner.mjs`、`scripts/verify.sh` 与两份 workflow 目前无事实要求必须编辑。
已有 runner suites 会写并删除 `.claude/workflows/__probe_tmp.js` / `__rt_probe.js`，`verify-codex-wiring --static` 仍运行它们；因此本只读阶段没有执行这些 suite。未来精确实现载荷必须明列这些 fixture effects。

Remaining：用户确认通道/P4a载荷→配置消费门→精确源码/私有模型选择点实施批准→TDD接线及可信回收/latch→离线行为/mutations与获批真实调用→冻结 diff 的独立两轴 review→逐通道 H2。峰值文件创建、额外真实模型预算、原生覆盖与发布均未获本轮授权。
当前结论：接线准备 DONE；整体模型路由仍 NOT_DONE，H2=NOT_DONE。真人通道/P4a确认已取得，preflight 仅对 P4a PASS；下一动作实现并执行批准的零 inference 临时探针，不重复核心实现或原 G0 模型探针。冻结核心与 HEAD 无漂移，脏文件仍保留。

### P4a pre-effect checkpoint（临时探针制作中）

批准 scratch 已创建为 `/private/tmp/model-routing-snapshot.Lr0X5P`；临时 worker 只拥有其 `snapshot-probe.mjs`，离线 TDD/语法检查不消费 app-server 会话。实际运行预算仍为最多两会话、每会话含关闭在内 60 秒、零 inference；截至本 checkpoint 实际会话数 0。正常配置来源 session 仅 metadata，fixture 是独立负例，不能替正常配置证明生产可用性。
新鲜复算 HEAD=`fad49e05cd1f59943b5d6e11c6da5369b877b3cc`，三源码 subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`，proposal SHA=`0912e306a9b30538863755493112f87e9fb0713930e7170f24f612c538dfa5de`，均未漂移。未改 runner、私有配置、effort、其他 harness 或 Git。

冷上下文机制专家只读结论：原合同要求的是“只消费已核验快照且不扩权”，并未规定必须通过完整序列化 API 证明。现协议缺少完整回读不足以推出所有等强构造机制都不可能；本次证据不足应标 UNKNOWN，而不是全局 UNSUPPORTED。parent-owned executor、原生配置 lease/封闭读取视图及独立机械上限只是有条件候选，没有现成 lease 能力或 H2 票，不编码假能力。
本地手册显示 sandbox-exec 是 deprecated 的候选上限原语；子进程继承限制也不封闭预先打开的 writable FD。APFS snapshot/global namespace mount 不能自动解决原路径、managed/keychain/跨卷引用，且超出当前授权；未运行 sandbox/mount 或建立卷快照。

本机来源定位：Codex wrapper `@openai/codex` 与原生 manifest 版本均 `0.154.0`，target=`aarch64-apple-darwin`；原生二进制 SHA-256=`4f85982624b3898c8991cb80c0981b2aa71070e3537046c9a95950318a95afcc`。安装包仅 binaries/manifests，没有 bundled Rust source 或可核验的 Codex build commit/checksum 映射；包管理器的 pnpm SHA 不是 Codex 产物认证。不把版本标签当作源码与本机实现对应证明。
[官方 App Server 说明](https://learn.chatgpt.com/docs/app-server) 将 config/read 描述为磁盘分层后的有效配置，并说明 thread/start 为新建会话及其覆盖输入；该页不建立不可变消费 lease。[官方 Open Source 索引](https://learn.chatgpt.com/docs/open-source) 指出 app-server 源码 authority 为 openai/codex；本轮只读官方页面与本机安装元数据，尚未读取/下载仓库源码、构建/替换 binary 或追加权限探针。
下一动作仍为最终探针全读、独立离线检查、批准预算内实际运行及冷上下文质量门；full snapshot 未证不得进入接线。若结果不通过，先列版本对应原生 loader/host-cap 的只读可行性核查范围，而不是缩窄字段合同宣布 DONE。

### P4a 实际结果（当前权威；gate 未通过）

临时探针实现 DONE，SHA=`7858fafca6b58c84ba14ce6b81eccbfee98a4b2f746a06f30c228129e454efbf`。worker 按 11 组 vertical TDD 逐步实现，明确模型错配 corruption 被自测杀死，恢复后同 SHA；父级全读最终脚本并独立执行 syntax、11 组 self-test，再核 SHA 一致。
真实入口只执行一次，使用已批准的 exact argv；正常 Codex 日志/cache 写入由权限面板另确认，配置与模型调用范围未增加。两个 app-server 会话已消耗全部 P4a 预算，无 retry；模型 turn=0。`snapshot-report.json` mode=0600、SHA=`e535a1cbf7133ddd4dcf7e30735c2e236ae3e38806a2fd2d4eabb004f80f1f09`，位于批准 scratch，旧 G0 证据未覆盖。

| session | 实际发送 | 拒收原因 | 关闭/耗时 |
|---|---|---|---|
| normal-home metadata；pid 90631 | initialize | RUNTIME_STDERR_ERROR | exit=0、81.43ms |
| own fixture；pid 90633 | initialize | WARNING_UNEXPLAINED；configWarning | exit=0、108.29ms |

两者均在初始化阶段停止，captures/observations 为空；没有 config/read、thread/start、B/A-restored runtime 消费或任何 inference turn。离线 checked-A/drift/恢复用例是 fake-transport 行为，不冒充真实 A→B→A 已测。报告只保留脱敏类别/方法，没有启动错误或 warning 的完整原因正文；其根因及是否为无害配置警告仍 UNKNOWN，不猜测，不抑制警告凑 PASS。按这次拒收也不能推出所有等强封闭机制不可能。
父级复算核心 subject_sha 与 proposal SHA 未变，已知两个进程 ps 查无存活；源码、runner、私有选择文件、effort、其他 harness、项目 aliases 和 Git 发布没有本任务改动。实际 CLI 缓存/log 与既有 eval 簿记是已列正常 effects。

冷上下文 quality-gate 独立前后回算 probe/report/core SHA，syntax/self-test 新鲜通过，逐断言结论：SNAP-004 PASS、SNAP-005 PASS；SNAP-001 BLOCKING UNKNOWN，随后停命令；SNAP-002/003 UNKNOWN（未执行/未证明）。总票 FAIL 2/5，不是 H2 票。
eval_run_id=`model-routing-snapshot-20260917-quality-1789639680340`；父级复制 exact envelope 到 scratch，由既有 recorder 独立校验落账并读回 `/Users/luca/Desktop/luca_gstack/memory/evals/eval-log.jsonl:62`，status=FAIL、passed=2、total=5、verdict SHA=`0414af15f24cb0873c19c57d71a99068278388494a87e4d305365b2eedbaea7d`。判官未写记录或执行真实调用。

当前状态 NEEDS_CONTEXT：本次补证运行与质量判定已完成，但完整配置消费 gate 未通过；自动接线/私有 peak 创建/额外模型调用/最终 H2/提交推送均未启动。原纯解析核心三文件仍 DONE，不能以其 PASS 替本 gate。

### 下一精确载荷 P4b：启动诊断 + 原生消费机制可行性（尚未批准）

模式 Sequential，仍 NO_PIN、model-only。此为调查/反证，不是 runner 实现、合同缩窄或 runtime 修改批准。先留住能判断启动原因的脱敏证据，再验证版本对应的原生 loader 与机械上限是否存在等强消费路径；失败停自动接线。

BLOCKING 断言先固定：

- DIAG-001：真实启动路径的 error/configWarning 来源、关联与脱敏原因可判；无法解释则 UNKNOWN，禁止忽略或统一抑制 warning。复跑闭环必须命中原初始化症状，fake warning replay 不能证明真实根因。
- VER-001：权威源码 revision/release 与本机 0.154.0、target、产物指纹建立可核验关系；仅标签相同 UNKNOWN，不套用 main/其他版本实现。
- LEASE-001：原生正常 loader 的已核验配置对象/等价封闭读取视图贯穿真实消费，不重新加载活动选择点，能够排除 A→B→A；schema 开放 config 对象或参数 pin 本身不算完整机制。
- DEP-001：项目/managed/provider/hooks/MCP/auth 依赖及启动前 whole-process 机械上限有明确合同；无秘密迁移、无 effort 路由/比较/票据失效。未封闭项 UNKNOWN。
- SCOPE-001：额外会话最多二、每个 60 秒、零 inference；无 source/config/runtime binary/Git/aliases 修改；旧 probe/report 和冻结核心保持不变。可行性 PASS 也不直接授予接线或 sandbox/mount 探针。

拟 exact files/effects：

- apply_patch 新建 `/private/tmp/model-routing-snapshot.Lr0X5P/snapshot-diagnostic-probe.mjs`；生成唯一的 `snapshot-diagnostic-report.json`（0600、exclusive create）。不编辑/覆盖已冻结旧 probe/report，不写任何 fixture 或用户 config。
- 使用相同 Codex 入口和现有 task-owned workspace/home，仅追加最多 **两个** app-server 初始化/配置 metadata 会话、各 60 秒，无 retry；允许 initialize/initialized/config/read，**不允许 thread/start、turn/start、配置写入或 command/process/fs RPC**。仅白名单保留脱敏启动原因/关联；未知文本不能作为成功证明。需要新权限/登录/凭据迁移仍停。
- 只读网络限定官方 OpenAI 文档及其明确索引的 `openai/codex` 公共仓库：先核 release/source 与 0.154.0 的对应，再按 tree 定位 exact loader/thread-start/config-dependency/auth/Seatbelt owner。候选 `rust-v0.154.0` 只是查找选择器，不作为存在事实；未对齐版本不外推本机。
- 最多两次定向 source-discovery 查询、十二个公开 metadata/source 页面；不 clone/下载 archive 或 binary，不登录、不跑远端脚本、不构建/安装/替换 runtime，不启动 sandbox/mount/daemon/GUI。页面内容只读入上下文，源码页面的动态发现范围仅上述具名 owner；无关历史/其他项目不读。
- 结果与 exact source owner 列表只回收本文、G0 preflight、handshake 既有 checkpoint；判定由冷上下文独立 gate，父级 recorder 正常簿记。若 runtime 缺机制，列具体欠缺和新 authority，不擅自改 Codex runtime 或降低原合同。

P4b 需真人确认以上新增会话/外部源码读取载荷和必要权限面板后才执行。之后仍顺序为消费机制证实→精确源码/私有选择点实施批准→TDD接线/可信回收/latch→行为/变异及获批真实调用→冻结 diff 独立会审→H2→整体无问题后按用户终局要求普通提交推送。不得只发布三文件核心充整体完成。

## Replan R-1（2026-09-20）：双端统一规则与执行衔接

### 0. 决策入口、来源与授权

本节是本主题新的规划真值；以上历史完整保留。消费者：后续 Plan/执行者/终审者。
Source S1：用户「通用的模型路由逻辑在codex和claude上面共用一个规则，默认是我默认的模型，然后根据场景来做上下的动态适配」。
Source S2：用户「计划有变化。你审查逻辑，置顶计划。给我一个终审方案」及「现在执行情况的一个解决方案」。
Source S3：旧已确认边界「effort不在计划中」「动态的是模型」继续有效；旧“只做Codex、不动Claude”范围由 S1 明确替代。
本轮获授权：只读审查、方案编写、既有核心回归与独立文档复核。没有批准新增实现、账户配置、真实模型探针或发布。历史整体发布意向不等于对本轮扩大后的精确实施载荷批准。

前提：诉求成立，现状的 Claude 固定 alias、Codex tier→effort、Codex-only parser 是不同的决策逻辑，放在同一 YAML 不等于共用规则。
更小替代：保留现有 YAML/解析器/票据校验，提取中立政策并添加 light、两个 adapter；不另建路由服务或两套算法。仅同步两份文案不能消除分叉，故不推荐。
默认形态偏差：倾向复用现有核心，可能高估其可复用性；独立审查须反证 scope/harness 硬编码及旧票迁移，不能以节省返工判通过。
KILL-R1：任一端无受支持的派发或可信采用证据，该端不可启用；共同 policy 可继续验证，但“双端交付”不能结案。
KILL-R2：若用户要求的是正在运行的主会话每一轮自动换模，而非任务级委派，本方案覆盖不足，须补主会话宿主控制合同；不能把子任务能力冒称主会话能力。

模式：本轮 Sequential 文档规划；后续建议 Sequential + Supervisor，Standard。未进入实施编排。无产品 PRD/DEV/TEST 卡，反向覆盖以 S1–S3、旧 A-001…010 和下方 UR 断言为准。已有方法成熟，研究限官方说明与当前源码；当前版本通道未知转 U-MR-05 定向取证，不开广域 deepresearch。

### 1. 一套规则，三种角色，两端适配

Module：通用模型路由。唯一 policy owner 仍为 `.claude/skill-os/model-routing.yaml`，拟将 `codex.model_routing` 提升为中立 `model_routing`；不得同时保留两份可独立编辑的场景表。
Interface：调用者只给场景/风险/任务身份/根会话基准；公共 resolver 产出角色及理由，adapter 采集有效配置、解析模型、派发并回收证据；父级公共校验器决定是否接纳。普通 JSON 不能自证宿主能力。
Seam：实际派发之前与结果接纳之前。Claude/Codex 是两个真实 Adapter，不是两套 policy。
Implementation 隐藏各端配置优先级、别名展开、pin/强制覆盖、权限边界和回执关联。adapter 不得自行重判场景或降级策略。
Deletion test：删公共 Module 会把场景/失败/票据规则重新散回两端，因此复用具有价值；仅用薄 wrapper 转发两个旧路由不合格。

| 角色 | 共同语义 | 选择与失败规则 |
|---|---|---|
| anchor | 当前运行环境中，用户为根会话明确选择并实际生效的基准模型；无会话覆盖才用有效默认配置 | 普通任务使用；不硬编码为 Opus/Sol，不从临时子 agent 的模型反推默认 |
| peak | 用户批准用于高判断力任务的模型角色 | 关键场景使用；没有有效选择/证据则停止关键裁决，不套旧自动降级链 |
| light | 用户批准用于低风险、易核验任务的轻量模型角色 | 符合降档条件才用；缺配置或不能证明不高于 anchor 时留 anchor，并标明未降档 |

两个 adapter 各有账户模型绑定（真实名称必然不同），但角色语义、场景表、失败规则及验收标准只有一份。peak/light 的账户绑定拟在用户级单一角色配置中按 harness 命名空间保存；准确路径/现有配置迁移须 U-MR-05 核实后批准，不能在多个文件各维护一次。anchor 不复制到角色文件，每次从根会话/有效默认来源获得。
不同模型名、catalog priority、上下文长度都不证明能力强弱。上下关系采用用户批准的同端角色关系/偏序，禁止跨厂商统一打分。新模型可提示，不自动提升为 peak 或 light。
peak 不得比 anchor 更低；anchor 等于 peak（或已在批准关系中高于旧 peak）时维持 anchor，标 `NO_MODEL_UPGRADE`，仍需独立判官。关系未知则关键选择 NEEDS_CONTEXT。light 等于 anchor 或默认已在最低档时维持 anchor，标 `NO_MODEL_DOWNGRADE`；不得为了“降档”反而升档。
每次委派继承不可变的 root-anchor 引用，而不是父子链中临时模型；嵌套 peak→普通执行须回到 root anchor。用户主动换基准模型时新 generation 重解析，旧关键票失效；在途任务不强杀、不改写证据，只不再授权新阶段。

### 2. 共同场景表与优先级

| 场景 | 共同选择 | 边界 |
|---|---|---|
| 普通对话、常规实现、整场交互、一般事实收集 | anchor | 常规检索不因为名字叫 Explore 就必降档；整场 skill 不固定一个高阶模型 |
| 正式规划、重大架构取舍、红队/Oracle、具名专家裁决、语义终审 | peak | 已进入该任务阶段才升档，不因文本出现“规划”二字触发 |
| 获授权的不可逆操作前独立复审 | peak | 只换审查模型，不授予操作权限 |
| 格式整理、存在性检查、计数、受限提取等低风险机械子任务 | light | 可独立切出、有确定验收、无重大判断或外部副作用；能直接由脚本完成时不额外调用模型 |
| 长上下文任务 | 先按上述场景选角色，再验容量 | 容量不足不得悄悄改角色/模型；停止或另批拆分 |
| 未知场景 | 普通、无副作用任务保持 anchor；关键性不能判明则 NEEDS_CONTEXT | 未注册场景不得伪造低风险以避开 peak |

稳定 ID：MR-001…007 不重编；MR-001 原机械部分在 v2 中拆到新增 MR-008（低风险机械），其余含义保留。旧 manifest v1 不接受为 v2 票据；旧 U-MR-01…03 历史状态保留。
优先级：权限/组织限制 → 用户本任务显式模型锁定 → 共同场景政策 → adapter 可达性验证。锁定值不被静默覆盖；若与关键角色要求冲突，说明冲突并暂停，用户明确选择替代后新 invocation。手动换普通默认模型不等于把所有场景锁死。
失败规则：peak 错配/改路/不可用/超时 → 不接纳关键结果，不自动 peak→anchor；light 缺配留 anchor 是选择前回退，不是伪装降档成功。light 调用失败后的 anchor 重跑建议只有一次、限无副作用任务、新 invocation，须随本方案明确批准；有副作用/失败原因不明则停。anchor 失败沿普通任务处理，不自动无限升档重试。

### 3. 主会话与 effort 的界限

建议交付范围是“主会话保留用户默认模型，按阶段点状委派 peak/light 子任务，结果回到主会话”；不改全局默认、不热切已经运行的主会话、不自动做 compaction 跨模型迁移。用户本轮追问「档位其实都是跟subagent相关的，对不对」，此处明确：升降档发生在 subagent／工作流独立调用的派发边界；主会话并没有先升档再切回。此项作为本次方案确认点，不隐含替用户决定支持正在运行的子会话中途热切。
通用政策不读取/选择/比较 effort，不把它写入角色摘要、票据有效性或能力排序；不保证上游运行时在换模型时内部采用的默认 effort 永远相同。
现有 `.codex/workflow-runner.mjs` 的 `effortFor(phaseName)` 会按场景注入 effort；仅说“不管effort”而继续它不成立。因此单列 U-MR-08：停止框架的场景化 effort 注入，不替用户设新值，不改私有 effort、不额外做 effort 能力评测。存量 agent 的固定 effort 设定与模型路由分离，未经另批不批量改值；框架不再把其相对序当“模型升降档已完成”。

### 4. 当前实况与旧任务处置

| 对象 | 本轮证据 | 衔接处理 |
|---|---|---|
| U-MR-01…03 纯解析核心 | `e9210ba` 已入当前历史；17 组测试新鲜通过；三 SHA 与 core R2 一致 | 保留历史 DONE；复用函数/负例，但 Codex-only harness、anchor/peak 枚举、政策路径要增量改造 |
| 旧 H1 v1.3 / core 两轴票 | 仅证明旧范围；旧 proposal 冻结文件保持不改 | 作为历史，不能充新双端 H1/H2；新方案重新评审 |
| Codex G0 真实调用成功 | 旧 0.154.0 / app-server / 两个指定模型调用 | 保留，不重述成当前 native/runner 支持；本机已 0.155.1，需版本绑定重验 |
| P4a 配置消费 gate FAIL 2/5 | 初始化 error/warning，未到消费测试；原因正文未留存 | 仍阻断 Codex adapter 启用；不阻断中立 policy/Claude 调查；不删除原 SNAP 安全义务 |
| P4b 尚未批准 | 原载荷绑定旧版本及追加会话 | 不直接续跑；并入 U-MR-05 的当前版本定向诊断后重列预算 |
| Claude 固定 alias / pin / 自动 fable→opus | YAML、agent frontmatter 仍有实际消费路径 | 要迁移到共同角色及失败规则，不只是补一段 Codex 文案 |
| Codex runner | 仍 `exec`、effort 注入、失败返回 null、无公共 route 采集 | Codex接线/latch/关键出口待实现；普通 null API 可兼容，关键失败不得成功出门 |
| 发布状态 | 当前 HEAD 与本地 tracking 含核心 commit；审计 MD 仍未跟踪 | 不回滚已提交核心、不复提交旧成果；本轮无 fetch/push，完整功能未发布验证 |

配置安全门原样保留：实际消费核验后的模型/权限/provider 边界、禁止检查后漂移与扩权、同 invocation 成功。完整运行时内部对象回读不是唯一证明方式，但任何等强替代必须独立论证，不能用“只多传 model”或发现漂移后拒收冒充事前权限封闭。若原门被建议缩减，另列合同变更与独立反证并交用户批准；本 R-1 不撤防护。

### 5. 增量实施计划（全部 PLANNED，不是本轮执行授权）

各 U-ID Source 均为 S1–S3；U-MR-05/06/09 同时继承旧 A/SNAP 义务。阶段编排为 Sequential，WA 为实现者、EA 为独立验证者；同一人不提供独立终票。新 route 角色在计划中声明，实际派发仍服从当时宿主限制；不自行写入模型名或 effort。

| U-ID / Wave | 目标与候选精确文件 | 依赖、门及产出 |
|---|---|---|
| U-MR-04 / W1 | 共同 policy/resolver/light；`.claude/skill-os/model-routing.yaml`、`scripts/model-route.mjs`、`scripts/test-model-route.mjs` | 新方案确认；保留旧ID、policy v2；同场景两端同角色，UR-01…06/10通过；role=anchor（语义终审peak） |
| U-MR-05 / W1 | 当前版本证据与真实消费入口清单；只更新本计划与既有 G0-preflight | 新调查载荷批准；Codex 0.155.1、Claude 2.1.276逐端核验；新model binding实际路径/adapter文件清单须在这里冻结后再批；role=anchor（机制裁决peak） |
| U-MR-06 / W2 | Codex可信派发/回收/latch：`.codex/workflow-runner.mjs`、`scripts/test-workflow-runner-runtime.mjs`；新的adapter文件若需要须先由05列名 | 04+05 Codex门PASS及exact范围批准；保留已选app-server方向，不暗换为native；UR-07…09通过；role=anchor |
| U-MR-07 / W2 | Claude角色接线、消除固定模型覆盖：`.claude/agents/quality-gate.md`、`muse-proto-judge.md`、`preflight-agent.md`；native/Workflow实际调用owner由05列名 | 04+05 Claude门PASS及exact范围批准；同一公共resolver；所有列入完成范围入口须验；role=anchor |
| U-MR-08 / W2 | 移除框架场景→effort控制出口、对账：`.codex/workflow-runner.mjs`、`scripts/verify-codex-wiring.mjs`、对应runner tests | 单独批准该语义变化；与06同文件串行合并，不双worker抢写；不改用户/agent现有effort值；UR-04通过；role=anchor |
| U-MR-09 / W3 | 统一消费合同、检查与治理；`.claude/agents/orchestrator.md`、`plan-agent.md`、`.claude/skill-os/runtime/cross-harness.md`、`scripts/check-model-table.mjs`、`scripts/check-agent-contracts.mjs`、`memory/scripts/daily_governance.py`；涉及生成root时改owner再生成 | 04–08完成、完整文件集重新批准；移除双规则执行源而非删除检查；UR-01…12逐条证据、冻结diff独立两轴、逐端H2；role=peak审查/anchor修复 |

表中候选文件是影响分析，不是任意增改许可；05不能确定的owner明确留在调查门，不假装已达到可直接实施的exact合同。本次只确认总体方案不会自动批量改这张表。
Read List：04读本节1–3+现有resolver/tests；05读本节4+旧P4a/P4b/G0证据+当前官方接口；06/07读05冻结清单、共同policy、各端调用owner和对应tests；08读本节3及实际注入点；09读最终冻结diff、S1–S3、UR矩阵和逐端证据。
存量 recommended-model tier 可作为兼容输入，通过单一映射变成共同角色（reasoning-heavy→peak；core/guided→anchor；mechanical→light），具体子任务场景与关键性优先；不得留 Claude resolves_to 与 Codex tier_to_effort 为另一条模型决策路径。新场景只登记一次，所有投影与治理从同一owner派生。

### 6. 验收与终审合同

| ID | BLOCKING 行为断言与失败反例 |
|---|---|
| UR-01 | 相同场景在两端只得到同一role/critical/failure policy；改共同表一处两端一起变，篡改任一adapter场景分支测试转红 |
| UR-02 | 改用户有效默认后anchor跟随；peak/light不污染root anchor；peak子任务再派普通任务仍用root anchor；换基准旧票拒收 |
| UR-03 | 实测任务派发序列 anchor→peak→anchor、anchor→light→anchor（不是主会话热切）；默认最高/最低、相等/不可比、缺角色、锁定冲突均覆盖；不能只做升档 |
| UR-04 | effort值变化不改变role/票据；框架不按场景输出effort覆盖；用户配置未写，存量固定值不偷偷改 |
| UR-05 | 无升降档触发默认anchor；高风险混合任务禁止light；未知关键性拒绝，机械任务可脚本完成不额外派模型 |
| UR-06 | 旧manifest/旧policy版本拒收；能力JSON/正文自报不能造可信回执；显式override冲突不静默改 |
| UR-07 | 每个声称支持的端/入口有当前版本、采用模型、同invocation成功证据；别名解析/pin/环境强制/允许列表替换实测 |
| UR-08 | peak失败/改路/null/保守默认不能授权后续；light重跑仅获准边界新invocation；不存在自动故障降级拿关键PASS |
| UR-09 | 配置实际消费和权限不扩张通过；沿用SNAP-001…005与A→B→A防线，旧P4a不能改标PASS |
| UR-10 | 主会话模型/全局默认未被修改，未支持入口明确列缺口；不把CLI称native，不把委派称主会话热切 |
| UR-11 | 双端真实调用与失败路径分别测；mutation至少破坏场景、root anchor、错模型、旧票、失败出口、effort隔离、权限检查后转红且恢复通过 |
| UR-12 | 治理只读报漂移/缺配/未升降档，不改私有配置、不擅自调用探针；旧检查迁移后仍能捕获冲突 |

旧验收覆盖：A-001→UR02；A002/003/009→UR07/11（native缺口仍是缺口）；A004→UR08；A005→UR03/04；A006→UR09；A007继续OUT；A008→UR11；A010→UR12。任何对旧native覆盖目标的变更必须用户明示接受，不能以runner通过抹掉。
执行期命令基线（本轮仅实际运行了首项；现有脚本须随相应U-ID增补行为）：

```sh
# [BLOCKING] UR-CORE — 共享解析行为（升级后必须覆盖UR-01…06/10）
node scripts/test-model-route.mjs
# [BLOCKING] UR-MUTATION — 每个关键防护被破坏须转红，恢复通过
node scripts/test-model-route.mjs --mutation
# [BLOCKING] UR-CONTRACT — 映射/agent/root投影一致，不能代替真实行为
node scripts/check-model-table.mjs
npm run check:agent-contracts
npm run check:agent-context
# [BLOCKING] UR-RUNNER — 真实测试子进程与失败出口；会写/删除任务fixture，执行前列明
node scripts/test-workflow-runner-runtime.mjs
```

两端真实调用命令、模型清单与额度预算在05后单独冻结批准，未跑就是UNKNOWN，不能拿上面的本地PASS替代。
文档终审 criteria：C1 一个场景政策且无双重决策；C2 默认主权与上下两方向/退化明确；C3 effort无暗管；C4 旧成果/失败/版本证据忠实；C5 调用/权限边界不靠文字伪造；C6 exact实施授权与最终用户选择不混同。每项PASS/FAIL/UNKNOWN附段落证据。

### 7. 握手顺序与当前下一步

H1-R1：独立终审同一冻结R-1方案，零存活BLOCKER/MAJOR，然后用户确认方案边界；不是沿用旧三票。方案票只证明逻辑完整，05运行时UNKNOWN仍为实施前门。
实施准入：冻结每Wave exact files/commands/effects/model预算，用户批准后执行；失败只阻断依赖它的阶段，不无界追加探针。
H2：共同policy行为通过 + 两端各自通过当前版本调用/回收/权限/失败路径 + 冻结diff独立两轴通过。未接入声明范围的入口不得标完成。
发布：整体验收通过后再核最新HEAD/dirty/远端变化，列精确提交文件、普通提交推送授权；不force、不夹带其他工作、不重发已提交核心。
当前停止点：新方案待用户确认；不恢复旧session，不执行P4b。需要确认的方案选择集中为：接受任务级动态委派范围、共同三角色及失败规则、单列停止框架effort注入。具体peak/light模型选择留在05精确配置载荷，不由本轮猜测。

## Replan R-2（2026-09-20）：专家会审后的偏差收敛与迁移合同

### 0. 适用关系与本轮权限

Source S4：用户「对方案做一下专家会审。没问题以后，要和现在的执行节点做一个解决方案……如何解决偏差，往你最终方案走，也要有解决方案」。
本节替代R-1的迁移顺序、U-ID责任划分和受影响验收措辞；其余共同角色/模型主权/失败语义继续沿用R-1。不是第二份计划、不是另开tracker。旧U-MR-01…03及历史票保持原样。
本轮仅方案会审与审计文档修订；不授权源码、配置、模型探针或Git。专家使用继承宿主的独立冷上下文，未指定新模型/effort，其票不证明新路由已经生效。
完整目标固定为四个入口：**Codex native subagent、Codex workflow runner、Claude native subagent、Claude Workflow独立调用**。不得把“只声明支持runner”当作完成全部需求；任何必交入口无法支持，整体停在NEEDS_CONTEXT，是否缩范围由用户决定。

### 1. 首轮问题与精确修订

| ID / 严重性 | 反例与偏差 | R-2处理 |
|---|---|---|
| PA-1 MINOR | 根会话锁A，全局默认B→C；错误把anchor改成C | UR-02细化为：有显式根会话覆盖则保持A；没有覆盖才随核验后的有效默认变化。用户改变根会话基准才生成新root generation |
| PA-2 MINOR | 默认A已高于peak P，终审选A后被当普通anchor任务 | 请求角色与实际模型分离：`requested_role=peak, effective_model=A, critical=true, adaptation=NO_MODEL_UPGRADE`；仍用关键失败与独立裁决规则。这是选择前决策，不是运行时fallback |
| MB-1 MAJOR | U06只有runner，native调查通过后没有实施责任人 | U05建立四入口矩阵；U06拆06-a native/06-b runner，U07拆07-a native/07-b Workflow；native缺口不得永久挂账后结案 |
| MB-2 MAJOR | A/B验证器、启动指针、代理注释仍硬编码旧tier模型/effort逻辑 | 补入09-a启用前影响面与测试，所有主动消费者读同一政策；不以“治理工具”名义保留第二张模型表 |
| MB-3 消费补项 | caller只传phase而adapter被禁止猜场景，且Claude Workflow有豁免 | 共同YAML维护 `(workflow_id,phase_id)→scene_id`；显式映射两个现有workflow真实caller，撤销新路径的workflow豁免；无映射不默认为低风险 |
| MC-1 MAJOR | 04–08先改/启用，09最后才同步合同/checker，半新半旧 | 04仅离线候选；06/07/08/09-a组成**不可提前启用的迁移批**，09-b验收后统一切换 |
| MC-2 MAJOR | 同policy停用重启、残留进程仍可接纳旧票 | 下节定义release与activation生命周期，切换窗口暂停受控派发和关键结果接纳；重启新activation，失败停用而非自动退旧 |
| MC-3 MINOR | 新实现必须改Claude/源码并真实调用，却沿用旧SNAP005零turn/禁写 | 仅继承SNAP001–004安全性质；SNAP005是历史探针范围票。每个新载荷独立批准effects/turn预算，不改旧票、不静默豁免 |

角色绑定允许两端实际模型名相同或不同，不能用“名字不同”证明分档；R-1中的“真实名称必然不同”改为“绑定按各端有效环境解析”。light缺配或不满足降档关系时保持root anchor且如实标未降档；关键角色缺配仍停止，以上修订不改变失败政策。

### 2. 从现在到目标：偏差处置矩阵

基线：本轮HEAD仍`77a99dde974508b9026d57055510c309ab6c99d6`，核心commit `e9210ba`；核心三SHA与R2历史一致。本轮17行为组、旧model-table检查、52/52 agent-contracts均通过。后两者约束的是旧语义，不能作为新版验收。版本重读：Codex0.155.1、Claude2.1.276。与模板/设计流相关的并发dirty完全不纳入本案。

| 偏差 | 保留/修改/补验/停止沿用 | 实施owner | 放行证据 |
|---|---|---|---|
| 现parser仅Codex、v1、anchor/peak、CLI读旧子树 | 保留已有函数/防护/commit，修改为中立v2+light+根anchor；v1票只作历史 | U04 | UR01–06/10，非Codex路径和light真测试，旧票拒收 |
| Claude固定模型，Codex用effort解释档位 | 修改共同policy的唯一模型决策源；旧tier只作兼容输入，不再能独立解析账户模型 | U04+09-a | 同场景四入口选择语义一致；破坏任一映射测试红 |
| peak子agent的默认后代可能继承临时peak | 修改为父级携带不可变root anchor引用；不从临时parent模型猜 | U06-a/07-a | 嵌套peak→普通子任务用root anchor；改全局默认不覆盖明确会话选择 |
| 旧原生字段只证明requested，缺adopted证据 | 补验当前版本宿主元数据与安全入口，不编造verifier，不用CLI代替native | U05+06-a/07-a | 精确API/字段/来源/同调用成功；不能做到则必交native阻断 |
| Codex runner仍exec、忽略stdout、null降级 | 保留已选app-server方向，修改可信回收/sidecar/latch和最终出口；普通null可兼容但不可授权 | U06-b | 成功、错模型、失败null、保守默认、后续派发/关键出口行为 |
| Claude Workflow豁免共享派发规则 | 停止新路径豁免，修改真实agent()调用消费同一映射；不假称普通Node runner等于Claude原生Workflow | U07-b+09-a | 实际Workflow入口运行与同次采用证据；无受支持消费机制则阻断 |
| workflow只传Load/Discover/Intake/Verify/Redteam/AdoptionReview | 修改唯一(workflow,phase)注册，不依名称模糊推断；按实际任务语义判Verify是否关键 | U04+06-b/07-b | 覆盖两现有workflow所有agent()点，关键失败不能被业务fallback吞掉 |
| 框架runner按场景注入effort | 停止该控制出口，不调值、不写私有配置、不批量改agent固定effort | U08，与06-b串行同owner | argv/RPC不再包含框架场景化effort覆盖；effort值不改变role/票 |
| checks/governance/启动指针仍保护旧逻辑 | 修改检查对象为共同角色/证据/兼容输入，保留无关安全检查；禁止删检查凑绿 | U09-a | 同policy正例通过、夹带旧alias/effort决策反例失败 |
| P4a FAIL、P4b旧版本未批准 | 保留失败，停止沿用旧命令；重新限定当前版本初始化诊断/消费证明载荷 | U05 | error/warning有可解释脱敏依据；SNAP001–004性质满足，不借旧成功 |
| 旧H1/core PASS与新版目标范围不同 | 保留历史，新增共同政策及四入口票；不把已提交核心算整体验收 | U09-b | UR01–15+当前版本四入口证据+独立冻结diff票 |
| 中间态、旧进程、同policy重启会复用旧票 | 修改启停准入/票据生命周期；失败只停用，不自动退旧模型政策 | U05定义，06/07实现，09-b验证 | 下节切换/恢复及UR13–15反例通过 |

### 3. 精确消费面清单：在启用前完成，不放到事后补文档

这是已确认的影响面；最终每个文件是否需编辑由05的调用/生成关系证明，并在实施批准中固定。未触发的无关内容保持原样，不借此修改skill工作流规则。

- 核心：`.claude/skill-os/model-routing.yaml`、`scripts/model-route.mjs`、`scripts/test-model-route.mjs`。
- Codex执行：`.codex/workflow-runner.mjs`、`scripts/test-workflow-runner-runtime.mjs`、`scripts/verify-codex-wiring.mjs`；native宿主适配实现文件由05核实，不能从runner推断已覆盖。
- Claude声明与调度：`.claude/agents/quality-gate.md`、`muse-proto-judge.md`、`preflight-agent.md`、`plan-agent.md`、`orchestrator.md`；真正native/Workflow派发与回收owner必须由05绑定，不靠改三份frontmatter结案。
- 真实workflow caller：`.claude/workflows/external-skill-scout.js`、`framework-evolution-scout.js`，二者即使无需源码改动也必须进实际路径测试清单；共同policy中的`dispatch_rules.workflow_tool`旧豁免不得成为v2旁路。
- 规则指针/投影：`.claude/skill-os/runtime/cross-harness.md`、`.claude/skill-os/agent-context-manifest.json`；`.codex/agents/quality-gate.toml`、`muse-proto-judge.toml`、`preflight-agent.toml`的模型继承/effort作为档位的注释需同步，固定effort数值保留。生成根文件从owner生成，不手改派生物；不修改Static Fallback。
- 检查与治理：`scripts/check-model-table.mjs`、`scripts/check-agent-contracts.mjs`、`scripts/check-agent-context.mjs`、`scripts/test-agent-context.mjs`、`memory/scripts/daily_governance.py`、`memory/scripts/behavioral_ab.py`、`scripts/fusion-preflight.py`。其中behavioral_ab.py的`TIER_MODELS`必须改为共同政策/当次模型证据校验，不另养Claude alias集合；fusion只改模型路由指导，不顺带改变其干净工作树或其他门。
- 兼容输入：保留skill的recommended-model字段作为统一映射输入；05用定向搜索列出实际仍在命令中硬写alias/故障降级的skill/agent消费位置，纳入exact清单后才能启用。不得将历史说明文字一概批量删除，也不得只改frontmatter却漏正文实际派发。

U05输出的四入口表每行必须有：入口ID、caller、受支持tool/API、模型选择owner、root-anchor来源、权限上限、采用/同次结果字段、暂停/重载办法、文件/宿主改动范围、测试命令及预算、SUPPORTED/UNKNOWN/UNSUPPORTED。UNKNOWN不允许自动进入对应接线任务。

### 4. 替代R-1 §5的执行顺序与启动条件

全部新任务保持PLANNED，源为S1–S4。旧U06/U07/U09保留为父容器，不再独立派发；子ID不复用旧编号。

| Wave | 任务/分工 | 依赖与完成门 |
|---|---|---|
| W0 核准起点 | U05先做当前版本/四入口/全部消费owner与可暂停机制调查；主agent编译exact载荷，独立EA核对 | 当前可进入的是调查计划准备，不是旧P4b；新增进程/外部读取/模型调用各列权限预算。freeze根anchor与角色绑定的准确来源，没选模型不代选 |
| W1 离线候选 | U04公共v2与测试；U09-a共同指针/兼容映射/checker/治理迁移 | 05影响面清楚且exact批准；候选仅测试，不成为生产policy，不覆盖活跃会话已加载合同；候选载体/目录在载荷中明确，不新建常驻服务 |
| W2 配套迁移批 | U06-a Codex native、U06-b Codex runner；U07-a Claude native、U07-b Claude Workflow；U08停场景effort注入；完成09-a余项 | 04通过、各入口05能力门通过、exact实现批准。06-b/08同文件串行由同owner处理。四入口+checker+合同全部到齐前不得逐个生产启用 |
| W3 最终验证与切换 | U09-b冻结整个迁移批diff，离线行为/变异、获批当前版本四入口真实调用、独立两轴审查；再执行受控启用 | 不以部分PASS代整体；切换前用户批准窗口、exact files和运行效果；按§5启停合同验收。四入口中任何必交项不通过，整体不进入H2 |
| W4 发布 | U09-b附属收尾，不另起项目状态 | 全部断言/H2/独立终票通过，核最新HEAD/dirty/远端变化及精确发布许可，普通提交推送；不回滚e9210ba、不夹带并发工作 |

U09-a不是关闭旧安全防护：替换的是旧模型政策消费及一致性检查对象；权限、fail-open约束、静态兜底与无关旧回归仍受保护。U09-b按双端真实行为而非“注册齐全/测试数量”判DONE。

### 5. 切换、失败和恢复：不出现半新半旧执行

不新增独立daemon或第二planning状态。复用各端受信任父级的route/manifest生命周期，以下是必须实现的准入合同，不宣称当前已有：

1. **候选隔离**：离线v2产物与活跃入口隔开；05载荷先固定候选承载与测试目录，不能一边修改活跃政策一边允许旧进程继续派受控任务。
2. **切换窗口**：用户批准后，暂停四入口清单内的新路由派发及关键结果接纳；在途子任务不强杀，结果可留审计但不能授权新阶段。若宿主不能暂停、核验或重载其入口，保持该入口停用并阻断整包启用，不用prose承诺替代控制。
3. **一致版本**：四入口确认同一`release_digest`（共同policy+适配合同/接口版本的冻结组合）；两个端可以有不同模型和不同进程，但不能一端吃v1一端吃v2。
4. **两层生命周期**：`activation_id`由每个受信任根父级在每次启用/重启时生成全新唯一值并持有；子调用不能自报或改写。它不是两个端必须相同的全局整数；两端共同的是release_digest。`root_generation`仍表示该activation内用户基准变化，不能被拿来代替启停身份。所有票绑定`release_digest + activation_id + root_session_id + root_generation + invocation_id`及现有task/input/模型证据。
5. **owner与恢复**：runner的准入、activation和critical-failure由父runner进程拥有；native/Claude Workflow必须在05指明受支持的宿主父级owner及可信传递/接纳入口，缺失则能力门不通过。activation不从child输出/旧票恢复；父级重启或会话恢复必须生成新activation并重新取得当前关键票，旧文件只审计。可用既有run manifest存审计，不依赖新增全局可复用票库。
6. **失败停用**：任一切换校验失败，整包v2保持停用，新旧在途票均不用于推进新阶段；不得自动回到旧alias/effort/fallback。普通非路由手动工作不是该票授权的恢复路径，不冒充双端已启用。
7. **重新启用**：复核冻结文件、当前CLI版本、配置来源及权限上限，修复后新activation、新invocation重验；源码/配置回退若必要，另列精确范围与授权，不git reset、不清脏树、不自动改私有配置。旧core保留。

critical-failure至少在同一activation/task generation内单调保持。若进程中断丢失内存，下一进程不继承旧authorization，而是重新核验与取票；不能通过重启清latch后拿旧成功票继续。此机制先经05证实宿主能承载，不能靠agent“记得带ID”宣称强制隔离。

### 6. 新版验收修订与追加

UR-01…12稳定ID不变，下述替代其冲突文字；旧A映射仍保留，不复用旧票：

- UR-02：有显式根会话覆盖时全局默认变化不改root anchor；无覆盖才跟随有效默认；嵌套调用基准不漂移。
- UR-03/08：默认已高于peak时`requested_role=peak/critical=true`不变，实际模型可为root anchor；错配/失败照关键路径停止，不能用普通失败规则放行。
- UR-07/11：四个必交入口分别验证，不再允许用“只声明支持的入口”删除native义务。预期模型与权限证据由可信宿主给出，不靠自报。
- UR-09：保留SNAP001–004的配置消费/权限不扩张/缺证拒收性质及A→B→A反例；SNAP005只保留历史P4a范围票。新版每个exact载荷增加独立的文件/权限/turn-budget断言，允许的实现改动与模型调用必须另批，不能套旧零turn也不能自行免验。
- UR-12：治理/A-B checker也消费同一policy与当次可信证据；合法Codex或新anchor不能因为不在旧Claude别名集合被拒绝，错模型不能因属于某旧alias而被接纳。
- **UR-13 [BLOCKING]**：离线候选不能被生产半消费；混合release、未重载入口、未知/残留进程不能恢复受控派发或关键接纳。对应mutation移除版本/入口准入检查须转红。
- **UR-14 [BLOCKING]**：同policy停用→重启、新activation但相同root_generation、恢复会话、重放旧票、试图重启清失败状态，全部不能获得旧授权；新activation+新成功票正例通过。
- **UR-15 [BLOCKING]**：真实两个workflow的所有phase映射有注册，关键Verify/Redteam/AdoptionReview的语义经核对；漏映射/错误标低风险、吞null、保守默认、绕过后续派发/可信出口，测试必须转红。具体Verify若只是事实采集也须明确注册，不按字符串一刀切。

行为命令仍沿用R-1清单，须由对应U-ID将UR13–15补进公共/runner/实际入口测试；新adapter测试脚本在05精确清单命名并批准，不能声称当前旧脚本已经覆盖。两端真实调用逐入口预算另批。
最终DONE：共同规则唯一，四入口一致消费并分别验真，低/默认/高角色与失败路径齐备，effort场景注入退出，切换/重启/旧票反例通过，独立冻结diff终票通过且用户批准启用。任一缺失则报告具体缺口，不能发布成完整模型路由。

### 7. 下一执行节点与会审闭合

**不回旧P4b续跑。下一节点改为U05的当前版本四入口调查及精确载荷编译。** 调查输出先解决三个可证问题：native真正在哪里选择/核验模型；Workflow真正在哪里消费共同映射；四入口能否执行同版本准入与停启。确定后再给出W1/W2文件、命令、effects与预算批准单。
本轮专家终票对象是从R-1标题到本文件EOF的完整组合；R-2优先规则明确，三个分区必须回算同SHA并核对自己问题关闭。旧R-1单文档PASS和首轮A票不可搬用。默认两轮；第二轮仍有存活BLOCKER/MAJOR则停在未决方案并交用户，不自动实施或无限增审。
归档位置继续用本计划、既有review、既有handshake。源码不改，用户配置不写，旧失败不抹除，未启动模型探针；可批准的是终版方案及下一精确调查范围，不是空白实施授权。
