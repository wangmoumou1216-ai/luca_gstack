# Codex anchor/peak 模型路由改造方案

版本：v1.3（用户确认运行时采用证据标准；待新 SHA 定向复核）；作用域：lucagstack 框架，NO_PIN。
仓库基线：45eff207a585757907f323c6952f969ac76a14b2。
授权：2026-09-17 用户确认方案冻结 → 三位独立专家会审 → 终版握手；不含实现、私有配置写入、Git 发布。
原始需求源：用户「给出方案，然后组织专家会审方案。方案明确到握手放哪」及「可以」。

## 1. 前提与范围

真实问题：现有 Codex 模型继承路径不能表达用户要求的跨模型规划/裁决升档；本次只解决模型角色解析与派发。
更小替代：仅创建 CLI profile 可满足手动调用，不能覆盖原生 agent/runner 自动派发，因此不作为完整修复。
只提议缩小“模型必须继承”规则的适用域，原规则在实现批准前继续有效。effort 相关存量运行配置不修改；其相对序不作为本模型路由方案的成立证明或裁决闸门。
KILL-1：若原生模型覆盖与可验证的 CLI 委派均不可用，则不宣称自动模型路由已实现。
KILL-2：若不能验证运行时接受并采用指定模型及同一调用成功，则相关路径不能获得实现握手 PASS；不要求证明服务商内部实际模型身份。
本轮不引入外部技能、不跑外部仓库 scout/benchmark；采用已批准的框架定向审查流程，未到 fusion 实现阶段。

MUST：用户默认模型主权；规划/红队/专家会审/关键裁决 peak；执行/事实收集 anchor；effort 完全排除在动态路由与验收之外，由用户自行调整；无模型静默降档；两 harness 独立验证。
用户终局裁决（2026-09-17 原话）：「effort不在计划中。我的整体动态模型，动态的是模型。effort不用管。我自己认为调整」。优先于本案 v1.1 的 effort 同模型阻断条件及专家要求；不是机器自行撤防护。
OUT：自动切换已有主会话、自动 compaction 模型迁移、跨家族能力评分、发布、F1-F9 整批治理。

## 2. 证据基底与真实性

FACT（2026-09-17 本地只读核对）：codex-cli 0.154.0；用户 config 顶层 model=gpt-5.6-sol、effort=medium；peak.config.toml 尚不存在。
FACT：本地 catalog 有 gpt-6-astra（priority=0、context_window=1050000）；此处是本地配置事实，不证明账户可调用或能力胜出。
FACT：`.codex/workflow-runner.mjs:74-76` 复制 TIER_TO_EFFORT/PHASE_TIER；runCodex 当前不传 profile/model。
FACT：`.codex/agents/*.toml` 省略 model；quality-gate/muse-proto-judge 的 effort=high，preflight=low。
FACT：`scripts/verify-codex-wiring.mjs` S8b 拒绝 agent TOML model 行，S8c 检查禁用 effort，不对账 runner 全映射。
FACT：当前本会话 collaboration.spawn_agent 支持 model，无 profile；显式模型覆盖须冷启动（fork_turns=none 或有限历史）。
FACT：官方配置文档允许独立 profile 文件；官方 agent 文档说明自定义 agent 文件的 model 可覆盖已解析的显式 spawn 值。
来源：[配置](https://learn.chatgpt.com/docs/config-file/config-reference)、[子 agent](https://learn.chatgpt.com/docs/agent-configuration/subagents)。官方文档不是本机实测替代。
INFERENCE：两种实际调用路径需要不同 adapter，而非把 --profile 塞入原生 spawn。
CLAIM（待专家审查与未来实测）：集中解析可降低分散模型名维护成本，并保持 peak 场景可追踪。
当前支持状态：原生与 CLI 均为 UNPROVEN。工具接受本次专家 model 参数只证明请求已派发，不证明服务端身份，不能拿此次会审当 A-002/003 已通过。

### 编码前 G0：证据可达性与配置消费闸门

H1 可以闭合有明确拒绝分支的条件方案，不能宣布 UNPROVEN 路径已经可实现。任何通道自动接线编码之前必须独立批准 G0 探针（exact commands/files/effects/预算），本轮不跑真实模型探针。
G0 每通道输出：runtime/CLI 版本、接口、字段名、原始脱敏事件样本、请求/响应关联 ID、配置消费方式、权限上限、结论 SUPPORTED/UNSUPPORTED/UNKNOWN。
模型采用证据必须来自受信任运行时的已解析/采用模型信息并关联同一 invocation 的成功结果，不采用正文、自报、banner、仅请求参数。它证明运行时采用指定模型，不宣称证明服务商内部实际模型身份。
当前不臆造字段名：原生先调查宿主可提供的 invocation/session 元数据；CLI 先调查公开 JSONL/宿主返回的可信元数据（--json 只保证 events，不保证模型字段）。runner 当前丢弃 stdout，若 G0 证明需读取事件流，接线前加入 exact parser/回收测试范围。
若只有请求参数/未消费配置、无法确认运行时采用或无法建立配置消费同一性：该通道 UNSUPPORTED（信息不足 UNKNOWN）；立即停止自动接线。可信运行时确认采用指定模型且同一调用成功，可满足本案模型证据要求；后端身份不可见本身不再触发拒绝。明确报错或改路通知必须停止并拒收裁决，不能默默改标准，不能等 H2 才发现。
两通道都不支持则 KILL-1 触发；单通道支持也不自动替代另一通道。G0 未 PASS 时只允许调查/计划，不进入全量实现。

## 3. Module、Interface 与配置真值

Module：模型角色解析器；调用者：主 agent 派发方、workflow-runner、只读 governance 对账。
Seam：派发之前的角色解析结果；原生和 CLI 是两个真实 adapter。
拟新增 `scripts/model-route.mjs`，公开 Interface：

```text
resolve({scene, harness, runtime_capabilities, effective_config, role_config})
→ {role, requested_model, model_source, policy_source, disposition,
   evidence_requirements, reason}
disposition = READY | REFUSE | NEEDS_CONTEXT
```

resolve 为无写入、无网络的确定性解析；依赖输入注入，返回可观察结果。是否服务端可调用在 dispatch/probe 阶段验证，不能由 resolve 伪造 READY=可调用。
Interface 隐藏配置校验、场景映射、覆盖冲突与错误分类；两个 adapter 共享其结果，不各自推断。
Deletion test：删掉解析器会使场景映射与校验重新散落到调用者；这不是只转发命令的薄包装。

真值拆分（各字段只有一个 owner）：
- `.claude/skill-os/model-routing.yaml`：角色语义、场景映射、失败策略；无账户敏感模型名。
- 用户 `config.toml`：默认 anchor 主权。派发还须核对实际主会话模型及 CLI/profile/项目覆盖；存在有意覆盖时记录有效 anchor 与来源，无法确认则 NEEDS_CONTEXT。
- 用户 `peak.config.toml`：经用户确认的 peak 模型选择。集中解析 TOML，不用正则匹配第一行；读取实际 CODEX_HOME，不假定固定目录。
- catalog：候选发现及上下文元数据；不决定能力、不以 priority gap 判型。

本次候选 peak=gpt-6-astra，必须通过专家审查及用户对最终方案的确认，实施前另验账户可用性。
默认模型/顶部换代：anchor 自动随已验证的有效配置解析；peak 检出新候选只提醒，用户确认后更新唯一选择点。
peak profile 是受支持设置的配置层，不是能力分数。框架物化的最小选择配置只写 `model`；用户自己已有的 effort 设置不读取作路由、不检查、不比较、不改写、不因其存在拒绝。
profile 中权限/provider/hooks 等非本案授权的扩张仍受原有安全边界约束；这不是 effort 管理。CLI base/项目/managed config 按受信任配置与权限上限处理，模型路由不擅自拓宽它们。

## 4. 场景合同

| Stable ID | 可操作触发 | Codex 角色 | Claude |
|---|---|---|---|
| MR-001 | 常规实现/交互执行/机械任务 | anchor | 现有 tier 规则不变 |
| MR-002 | 已进入 Plan 的规划任务、否决后的具名重规划 | peak | P2 原有白名单 |
| MR-003 | 红队/refute/judge/oracle、具名专家会审 | peak | 按 P1；非判定专家不得冒充白名单 |
| MR-004 | 结果语义 review、关键终验/终裁 | peak | P0/P1/P2 已授权场景；常规 checklist 仍原档 |
| MR-005 | 已有不可逆操作授权下，独立前置复审 | peak | P0；模型路由不授予操作权 |
| MR-006 | 深度研究事实收集主体、一般检索 | anchor | 原 tier 不变 |
| MR-007 | 显式重规划/长上下文委派 | 按具体规划/裁决或执行场景；先验 payload 容量 | 不新增主会话自动切换 |

纯格式、存在性、脚本退出码验证不等于“语义终裁”，不自动触发 MR-004。
compact 前自动摘要与已经溢出的上下文不保证可切换；委派前验证输入容量（含系统/工具开销、安全余量），不足 REFUSE，不把 catalog 窗口当完整可用预算。
anchor=peak：记录 NO_MODEL_UPGRADE，不称高模不对称；独立验证仍有效。模型角色相等不证明实际能力等价或更强；本案不收集/比较 effort，也不因 effort 高低、未知或不可比而拒绝关键裁决。
peak 是经用户确认的模型角色政策，不是能力支配证明。未来 YAML/投影应明确“存量 effort 设置继续按其既有配置生效，但不参与本模型路由判断/验收”，不得借旧判官相对序说明偷偷恢复 effort 闸门。治理只提示模型退化，不管理 effort。

## 5. Adapter 与配置优先级

### 原生 adapter

原生 caller 为主 agent 派发方，调用公开命令 `node scripts/model-route.mjs resolve --input <父级拥有的 request.json>` 获取 JSON，再验证结果后才 spawn；CLI runner 直接 import 同一解析函数，不手算角色。
输入采集 owner：CLI 由 runner config loader 读取真实 CODEX_HOME/配置覆盖；原生由宿主 adapter 采集实际会话模型、公开 tool schema、role pin 与 metadata 能力。不能把未经核验的普通 JSON 布尔值当成支持证明。
若宿主无受信任采集通道，原生状态 UNKNOWN/NEEDS_CONTEXT，不由主 agent 自造“支持”；G0 必须明确可用 owner/API/数据来源。解析命令本身不能读取注入工具 schema，不能声称完成采集。
返回 route_manifest 包含 route_id、invocation_id、scene、任务/输入摘要、policy/路由相关配置摘要、requested_model、capability evidence 引用、generation；派发与回收均验证未过期/同任务/同摘要，未知模型覆盖能力禁止 READY。
路由相关配置摘要仅绑定模型选择、角色政策及既有安全边界/provider；effort 不入路由摘要、不触发角色变更或票据失效。CLI 配置消费快照仍保留用户正常配置，由 Codex 原生加载，不改变其生效语义。
该命令接线与不绕过 manifest 是调用合同，不是对任意 agent shell 行为的机械 sandbox；未接入调用点不被算覆盖。负例须测未调用解析器、伪造能力来源、过期结果与 pin 冲突。
通过公开工具 schema 支持的显式模型参数派发，模型值来自 resolve，不是调用点常量；peak 判定任务冷启动，不带生产过程。
agent 文件 model pin 可能覆盖请求值：须在派发前检查，派发后核对实际模型；只有可验证的 role 配置路径才可用。
不支持显式覆盖、存在不明 pin、模型证据不可见：REFUSE/NEEDS_CONTEXT；不随意启动外部 CLI 冒充原生子 agent。
原生任务生命周期/结果回收走原有 collaboration 接口；不增加 agent 数量或复制历史来“证明”路由。

### CLI adapter

CLI 选择入口为 model-only peak 文件，但运行必须消费 G0 验证过的配置快照，不能重新读取活动 `--profile peak` 选择点。role_config 来自集中配置。
profile 缺失/与冻结 model 不一致/夹带权限变化：拒绝启动，不自动覆盖私有文件。
候选配置消费机制：父级私有 scratch 中物化 base/profile 的最小有效配置与必要受信任引用，隔离 CODEX_HOME 后以 `--profile peak` 启动该 scratch 内快照；源配置不写。不能完整封闭的项目/managed config/provider/auth/hooks 等外部依赖必须列入 G0，不假定复制两个文件就解决。
快照方式只有在 G0 证明子进程实际只消费已核验配置及宿主权限上限后才可 SUPPORTED；若 CLI 无支持的完整隔离方式，则此 adapter REFUSE。鉴权引用不复制秘密进报告、不擅自迁移凭证；额外权限/网络/GUI探针另批。
“不可变”是消费同一性要求，不是 chmod/父子继承权限即可提供的安全承诺；审查子进程只读合同不等于机械防篡改。必须验证不受检查后修改活动配置（含 A→B→A）影响、且无法读入更宽权限，不能事后发现才称防护成功。
CLI 委派仅在已批准工作流范围内启用；明确 scratch/CWD、read-only 审查边界、输入包、输出 schema、超时/退出码及 cleanup；不得自动启用 --dangerously-* 或网络。
runner 保留自身权限、网络、超时、schema/null 返回 API；任何权限扩大须单独人类 gate。null 不承担关键裁决授权，以下独立阻断状态不可被普通 fallback 替代。
runner 的阶段→scene 采用显式映射；未知阶段返回 NEEDS_CONTEXT，不以 phaseName 模糊匹配裁决场景。
摘要用于绑定/审计，不防 TOCTOU；同一消费快照才是防线。实际模型不一致时结果不得用于终裁。

### 关键裁决状态与受保护阶段消费门

父级主 agent/runner 持有 DecisionGate，子 agent 只返回候选证据，不能授予后续执行权。票据必须绑定 task_id、input_sha、routing_config_sha（排除 effort）、policy_sha、invocation_id、generation 与有效模型证据。
runner runCodex 的关键 scene 失败立即置该运行 generation 的 critical_failure latch；普通 null API 保留。workflow 即使给保守默认/忽略 null，runner 最终出口也必须丢弃“成功授权”并以结构化 BLOCKED/非零状态返回；不产生有效裁决票。
主派发方的受保护 Phase/不可逆 action 入口必须消费父级验证过的当前票；无票、旧票、配置/默认模型变化、generation 漂移均拒绝进入。模型路由票不替代用户原有操作授权，二者缺一不可。
最小文件 owner：runner 内负责 latch/最终出口，`scripts/model-route.mjs` 的 validateDecision 公共入口负责摘要/代次核对，orchestrator 合同负责接入受保护阶段；新增 exact 受保护 action executor 若需要，必须在实施影响分析中列出并再批准。
不宣称此 latch 能阻止任意 workflow JS 在退出前自行做副作用；任何可能绕过消费门的 effects 必须禁止进入自动路径或接入宿主实际执行边界。G0/实施前影响分析须列出受保护入口，未接入项标 UNSUPPORTED，不用 prose 假装全局强制。
重试必须新 invocation；关键失败 generation 不被 fallback 清除，用户授权重新验证后生成新代次。仅同一 task 的信息收集 fallback 可以继续，但不能据此推进受保护阶段。

### effort 与遗留债的范围隔离

不读取 effort 作路由，不选择、不调整、不比较、不度量，不新增 effort 验收门；存量 YAML/TOML/runner 配置不因本案改变。
用户自己调整 effort；正常调用若失败仍按通用调用失败处理，不自动修 effort，不构建 effort 兼容矩阵。
F2 原 tier→effort 对账修复、S8c 支持集治理等全部移出本次实现清单，保留为独立遗留债，不能捎带实施。
本次只新增阶段→model scene/role 映射及其行为验证；不把 S8c 当新 peak 模型身份/可用性的证明。

## 6. 错误、探针与治理

错误分类：配置缺失/损坏、unknown scene/model、无覆盖能力、pin 冲突、容量不足、权限变化、模型不支持、调用失败、超时、实际模型不可证/不一致。
关键 peak 失败 → 不接纳裁决、不执行受其保护的后续动作；用户确认替代后重派，不复用旧票。anchor 普通执行失败沿用其任务错误处理。
上下文/账户 catalog 不能证明能力；runbook 不取“首个可调用模型”自动做判官，替代选择需用户确认。
静态检查：配置/TOML/schema/映射，零模型请求；真实探针：成功响应+退出状态+运行模型证据，消耗用量，按独立授权执行。
banner 仅表示配置解析出的请求模型，不是后端可用性或真实模型身份证明。能力可用证据由支持的结构化元数据取得；无可信证据时 UNKNOWN，不能让模型自报充证据。
governance 只读检查配置/路由漂移、候选变更、NO_MODEL_UPGRADE，输出 digest；不发模型 ping、不修配置、不自动创建 launchd。
检测频率如实称“按实际治理运行周期”，不能没有运行证据就承诺 24h。

## 7. 拟实现文件与旧规则握手

下列为后续候选范围，不是本轮修改授权：
- `.claude/skill-os/model-routing.yaml`：Codex 角色/scene，缩小“model 一律继承”到默认路径；Claude 白名单维持。
- `scripts/model-route.mjs`、`scripts/test-model-route.mjs`：解析模块与公共 Interface 测试。
- `.codex/workflow-runner.mjs`：CLI adapter 与 phase→scene；相关 runner runtime tests。
- `scripts/verify-codex-wiring.mjs`：新模型角色合规、配置优先级测试；S8b/S8c 存量不删除，不新增 effort 对账/调档。
- `AGENTS.md`、`.claude/agents/orchestrator.md`、`.claude/skill-os/runtime/cross-harness.md`：一致更新适用边界；若为生成投影，改 owner 后生成，不手改生成物。
- governance 真值 owner：实施影响分析后确定 exact path 与测试，再申请实现批准。

旧新规则握手表：
1. 模型名禁止散落 → 账户模型集中在用户选择点，policy 仍不写模型名。
2. TOML 默认继承 → 原样保留；peak 例外只经已批准且可验证的 adapter。
3. effort 原配置 → 原样生效但完全不参与本案动态模型路由、比较或验收；用户裁决明确覆盖 v1.1 effort 阻断条件。
4. Claude fable 白名单 → 原样保留；Codex 显式峰值场景不是自动新增 Claude 白名单授权。
5. framework/ 只读 → 原样保留；“框架 owned 配置可按批准改造”不等于修改 framework/ 模板。
6. F1 dispatch 别名校验 → 不宣称足以证明语义白名单；单独治理，不捎带实现。

## 8. 验收合同（未来实现，非本轮已通过）

| Assert ID | 行为级场景与结果 |
|---|---|
| A-001 | 默认模型更换：anchor 随有效配置变；peak 选择点不变；冲突来源可追踪 |
| A-002 | MR-002/003/004/005 原生覆盖：请求/有效模型一致；被 pin 覆盖时明确拒绝 |
| A-003 | CLI peak/anchor 真实调用：成功、退出码、结构化模型证据三者齐备 |
| A-004 | peak 缺失/不可用/证据缺失/不一致：裁决拒收，后续受保护动作不发生 |
| A-005 | anchor=peak：明确无模型升档，但独立复审仍可运行；effort 高低/未知/不可比均不影响模型路由结果或票据接纳 |
| A-006 | 检查后修改活动 model/权限/provider（含 A→B→A）：进程只消费已核验快照且不扩权，否则 adapter 不启用；未知 phase/容量不足拒绝 |
| A-007 | OUT_OF_SCOPE（原 effort 验收已由用户排除；保留稳定 ID 不复用，不作为 H1/H2 义务） |
| A-008 | mutation：改错模型 scene/role 映射、peak 路由 anchor、删除权限检查、删除 latch/忽略 null、放行旧票、伪造模型覆盖能力输入，各对应测试必须转红 |
| A-009 | Claude 发现/派发/降级分别真测；Codex 两 adapter 分别真测，无 prose 代替行为 |
| A-010 | 治理只读：无配置修复、无网络探针、无项目 aliases 写入 |

票据负例：peak 失败后 workflow 生成保守默认/忽略 null，受保护入口仍不发生；成功旧票在更换默认模型或配置后失效；请求、模型证据、任务摘要不能跨 invocation 混用。
H2 逐 Assert 输出机器可读 PASS/FAIL/UNKNOWN/BLOCKED 及证据；UNKNOWN/BLOCKED 不计通过。fake-codex runtime tests 只证实 argv/回收/失败控制，不证明真实模型或沙箱；`verify-codex-wiring.mjs` exit=0 不能替代其活体子项 PASS。

## 9. 本轮执行计划与握手位置

模式：Sequential 外层 + P2 Parallel Fan-out；Tier=Standard；task_execution，不调用技能 workflow、不写共享状态。
P1 主 agent 冻结本文；断言：文件存在、证据/双 adapter/错误/验收/握手完整；quality-gate 独立验产物。
P2 三位独立专家（冷启动、只读、默认 REFUTE）：A 机制与优先级；B 真值/规则/双 harness；C 权限与失败/测试。
P3 主 agent 修订 → 同三位专家核对同一终版 SHA；默认最多两轮，重大未决交用户。两轮后用户已裁决 effort 出界，追加一次只核对该裁决与受影响文档的定向闭合，不扩大评审范围。
各 Phase model_tier：P1 core-execution（方案编写，不自动切主模型）；P2/P3 判定 reasoning-heavy（P1 对抗判定），本次按用户批准的 peak 候选请求 gpt-6-astra、effort 继承，不设新档。

冻结与复核：专家须回算本文 SHA-256，并在报告中附 subject_sha；只审与其分区匹配的 owner，不读生产过程。
本轮产物只有以下 3 个，checkpoint 集成 review/handshake，不另创 tracker：
- `framework-audit/2026-09-17-model-routing-proposal.md`
- `framework-audit/2026-09-17-model-routing-review.md`
- `framework-audit/2026-09-17-model-routing-handshake.md`

方案握手 H1：P3 终版会审之后、任何实现之前；三票有效、同一 SHA、零存活 BLOCKER/MAJOR；G0 未证实的机制具有立即拒绝的出口，不宣称可用。
H1 PASS 仅表示条件方案可进入独立批准的 G0 验证与精确计划准备；G0 未 PASS 不能自动接线编码，仍须用户批准 exact files/tasks/effects，不能解锁代码写入。此关口若专家认为核心机制不可收敛，保留 UNKNOWN/FAIL 交用户，不把 G0 当藏问题的 defer。
实现握手 H2：未来实现行为/真实模型/变异测试全过后，冷启动独立评审冻结 diff，再由用户决定发布；与 H1 不混用。
握手后改动：旧 SHA 票失效，发回受影响分区复核；未受影响票也须明确确认新 SHA。

## 10. 本轮 criteria 与停止条件

C1：每个 MUST 有明确场景、错误与验收；失败模式=遗漏用户要求。
C2：原生/CLI 配置优先级与证据等级明确；失败模式=把请求参数冒充运行时采用证据、把采用证据夸大为后端身份。
C3：零实现/私有配置/发布/共享项目状态修改；失败模式=审批被扩权。
C4：会审与握手逐票绑定同一 SHA；失败模式=修订后用旧票结案。
C5：无存活 BLOCKER/MAJOR；未知项不冒充 PASS，实施闸门写清；失败模式=剧场式闭合。

BLOCKING FAIL 停当前 Phase；同问题三次失败 BLOCKED；两轮仍有重大争议交用户，不自行增加无界循环。
本轮不声称实现正确/服务端可用；A-007 已排除，其他 A-001…010 在 H2 前是待验证义务。用户 effort 裁决后的定向闭合不授权任何实现/真实探针。

## Replan R-1：用户批准证据边界（2026-09-17）

Source：用户听取 anchor 执行、peak 评估/终验的真实使用例子及两层证据说明后答「可以」。
该不该解：应解模型角色自动派发，而不以不可观测的服务商内部身份阻断路由。更小替代：保留可信运行时采用+成功验收，不引入服务商身份认证系统。
本版全文中“实际模型”“有效模型”“运行模型证据”“可信模型字段”均指运行时解析并采用的模型，不指后端内部服务模型；原始字段只有 requested 含义时仍不能升级为 adopted。原生与 CLI 仍分别 UNPROVEN，不因本次裁决直接 PASS。
A-002/003 验运行时采用一致和调用成功；A-004 的证据缺失指采用证据缺失；明确模型改路即失败。其余配置消费、安全边界、DecisionGate、无静默降级、effort 出界合同不变。
阶段：R-1a 修订冻结及原三分区定向确认新 SHA；R-1b 准备并展示 exact G0 探针命令/文件/权限/次数预算；R-1c 获批准后真实探针；R-1d 只为通过的通道准备精确实现计划。代码及私有配置写入、发布仍未获授权。
断言：新 SHA 三票齐备，采用与请求证据明确区分，后端身份不再作门禁，报错/改路仍拒收，effort 不参与。任一关键断言不通过即停止下一阶段。
本次修订受人类裁决授权，但旧 v1.2 票不能冒充 v1.3 票；握手记录须先标待复核。
