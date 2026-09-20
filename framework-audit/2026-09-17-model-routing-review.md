# 模型路由专家会审记录

> **当前结论 · 2026-09-20：通用方案R-1+R-2三分区专家终审PASS。** 政策、双端机制、执行迁移三位冷上下文专家均独立回算组合SHA `22bd9f935c19ef7775e27b4a1960031a8f0793978b229f062d67fc1a219e8272`，首轮发现全部关闭。权威方案为core-plan文末R-2及其继承的R-1；下面旧方案票仅历史，不转借。当前运行时四入口能力仍待U05实证，未获实现/H2通过。

状态：DONE_WITH_CONCERNS（条件方案会审完成，A/C用户授权降级）；范围：方案会审，非实现验收；项目：NO_PIN。
P1 冻结稿：`framework-audit/2026-09-17-model-routing-proposal.md` v1.0。
R1 subject SHA-256：`7ddc7e1a1bc0b82b27634e2163e4fa663442392b1e6c9509a31d45f5722b8f83`。
仓库基线：`45eff207a585757907f323c6952f969ac76a14b2`。

## 授权与带外写入台账

用户已确认 P1 → P2 → P3；只写方案、会审、握手记录。无实现/私有配置/Git effect 授权。
起始已有 dirty：`.claude/observability/observations.jsonl`、`.claude/observability/rules.yaml`、`memory/retrieval-log.jsonl`；不覆盖、不暂存。
质量门如产生 eval envelope，由父级 recorder 按既有合同写评估日志；专家只读且不调用 recorder。
原始打开页签文件在 `/Users/luca/Desktop/luca_gstack/.workbuddy/memory/`，只作用户指定输入，不修改，也不把本 checkout 的会审宣称为另一 checkout 已改造。

## P1 checkpoint

已完成：方案落盘与 SHA 冻结；明确 dual adapter、scene、错误、优先级、未来验收、H1/H2。
P1 独立质量门 `/root/proposal_gate`：PASS 5/5（F1 存在、F2 SHA、C1 合同、C2 握手边界、C3 真实性），不证明实现正确。
当前：P2 A/B/C 冷启动会审。
剩余：P2 A/B/C 会审 → P3 修订及终版 SHA 逐票握手。
恢复：核对仓库 HEAD/dirty，回算方案 SHA；先读取本文及方案，续第一个未完成 Phase。

## 专家分区

| 专家 | 责任 | 模型策略 | 票据 |
|---|---|---|---|
| A | 原生与 CLI 机制、配置优先级、TOCTOU/模型证据 | 请求 peak 候选 gpt-6-astra，effort 继承 | `/root/expert_mechanism` 已派发 |
| B | 真值/投影、存量规则、Claude/Codex 授权边界 | 同上 | `/root/expert_consistency` 已派发 |
| C | 权限、失败恢复、行为/变异测试、握手可操作性 | 同上 | `/root/expert_verification` 已派发 |

每票必须带 subject_sha、verdict、严重性、证据位置；不给会话历史或生产过程，默认 REFUTE。
本记录区分请求模型与实际模型；工具接受参数不被当作服务端模型证明。

## R1

P1 gate PASS 后三个分区并行派发，fork_turns=none、model=gpt-6-astra，未显式调整 reasoning_effort；审稿者只读、不联网、不启动额外模型请求。
P1 eval：recorder 成功，落到运行时权威 memory store `/Users/luca/Desktop/luca_gstack/memory/evals/eval-log.jsonl`；run_id=`model-routing-20260917-p1-7ddc7e1a`，envelope digest=`c2416bab86a29514c069df75e5d2c3d932cb87f5c3a6d18aa907cbf0addb5564`。不是 sibling checkout 的实现改造。
三票已齐，全部回算同一 R1 SHA，结论均 FAIL；本轮不是通过票。三位均注明服务端实际模型 UNKNOWN，不采用自报身份。

### R1 原始发现摘要（严重性不由生产者降级）

| ID | 专家定级 | 专家结论与原文证据 | v1.1 响应 |
|---|---|---|---|
| A-1 | MAJOR | 原稿 L87–92 命名 profile + 固化摘要不能防配置检查/消费竞态；事后模型一致也不能排除权限变化 | 配置快照实际消费必须 G0 证明，不能完整封闭则拒绝；A→B→A 注入验收 |
| A-2 | MAJOR | 原稿 L14/81/105–106 未指定真实模型元数据；runner 丢弃 stdout，模型正文不能证明身份 | 编码前 G0 各通道记录可信字段/样本/关联 ID；仅请求证据则 UNSUPPORTED，用户决定缩范围/停 |
| A-3 | MAJOR | 原稿 L35–47/80 只有 JS 函数，原生主 agent 无命令入口/采集 owner | 公开 resolve JSON 命令；宿主能力采集 owner；manifest 绑定，来源不明不能 READY |
| A-4 | MAJOR | 原稿 L90 null 降级与 L103 关键失败关闭冲突，runner 将 null 交 workflow fallback | critical_failure latch + 最终出口 + 父级 DecisionGate；普通 fallback 不产生票 |
| B-1 | MAJOR | 原稿 L74 无条件声称模型相等即判官≥执行者；执行 xhigh/max 与 high pin 构成反例，YAML 原语义仍 effort 序 | 保持同模型序守护：低于执行者/不可比即关键裁决拒绝，绝不自动改 effort/撤防护；不同模型不冒充能力等价 |
| B-2 | MINOR | peak 没有 model-only 静态字段合同，effort 等额外设置策略模糊 | 选择点只允许 model；任何额外字段 REFUSE |
| B-3 | MINOR | S8c 只查禁用值，不证明新模型完整接受集 | S8c 历史防回归与 A-007 真实探针分离 |
| C-1 | MAJOR | 原稿 L87/L92 摘要不约束子进程配置消费，事后拒收不能撤销权限 | 同 A-1，加实际权限上限与外部配置依赖，不把 chmod 当隔离 |
| C-2 | MAJOR | 原稿 L90/L103 的阻断消费门欠定义，失败/保守默认/旧票可混用 | 同 A-4，加 task/input/config/policy/invocation/generation 绑定与旧票失效 |
| C-3 | MINOR | fake codex 不是模型/沙箱证据；wiring 活体 BLOCKED 时总 exit 仍可为0 | H2 每 Assert 独立机器状态，UNKNOWN/BLOCKED 不通过，加入错路由/权限/latch/旧票 mutation |

独立通过项（不是整体放行）：A 确认 effort 存量兼容/拒绝策略与原生 pin 冲突已覆盖；B 确认真值职责、Claude 白名单、S8b 默认继承与显式 adapter 可共存、H1 授权边界；C 确认 H1/H2 位置、终版 SHA、缺票/轮数、容量开销边界。

## P2 checkpoint / R2 冻结

已完成：R1 三票有效 FAIL；生产者只修改 proposal，未修改实现/私有配置。
v1.1 SHA：`75cf94123b4678bc8cd6bb66407f29af36ce973e811055cb4c56fa9e54b493db`。
R2 三票已齐。R1 原行号指 v1.0，不与修订后行号混用。
当前：R2 仍有 B-1 MAJOR，H1 不闭合；两轮上限已到，交用户，不自行进入 R3。
剩余：用户裁决拒绝策略及是否批准一次定向终版闭合；本轮不修改已投票的 v1.1。
新增 G0 是编码前人类批准的调查门，不是本轮真实探针授权；两 adapter 当前 UNPROVEN。

## R2 最终票据

三票 subject_sha 均为 `75cf94123b4678bc8cd6bb66407f29af36ce973e811055cb4c56fa9e54b493db`，各自回算一致；实际服务端模型均 UNKNOWN。

| 专家 | verdict | 原发现复核结果 | 证据（v1.1 行号） |
|---|---|---|---|
| A | PASS（仅 H1 条件调查方案） | A-1/2/3/4 CLOSED，无新增重大项 | L34–41 G0、L93–97 原生入口、L105–109/113 快照、L117–122 消费门；已否定无元数据编码/摘要隔离/自报能力/null放行旁路 |
| B | FAIL | B-1 部分 CLOSED 但仍 MAJOR；B-2/3 CLOSED | L85–87、A-005 L167 对“effort 不明/不可比”只写不声称成立，未 REFUSE；L68 model-only、L129/175 证据层已闭合 |
| C | PASS（仅 H1 条件调查方案） | C-1/2/3 CLOSED，无新增重大项 | L105–109/168 快照竞态、L117–122/170/174 latch/旧票、L175 每断言证据层；G0仅可支撑另批调查，非编码 |

B-1 未决原文（专家）：冻结正文对“实际 effort 不明或不可比较”只要求“不声称不变量成立”，没有要求拒绝关键裁决；A-005重复弱条件。派发复核说明要求拒绝，不等于文件已经写明。不能以生产者 prompt 修补冻结方案。

### 交用户的最小修订提案（尚未应用）

将同模型规则及 A-005 同步改为：**同模型实际判官 effort 低于执行者、不明或不可比较时，关键裁决 REFUSE 并交用户，不生成有效票。**
该修订不自动改 effort，不废止旧防护；确会使无法取得 effort 元数据的同模型关键裁决停止，属于要明确接受的可用性取舍。
若用户批准修订与额外一轮定向闭合：产生新 SHA，B核本项，A/C也须明确确认新SHA未引入其分区问题；旧PASS票不得直接搬用。
以上为 R2 时待裁决提案，用户随后明确否决 effort 入本案；保留历史记录，不采用该提案。

## 收尾 checkpoint

已完成：P1 PASS 5/5；P2/P3 两轮三分区意见回收、方案 v1.1 与逐项响应落盘。
未完成：H1 因 1 MAJOR 不闭合；G0/H2均未执行；代码/私有配置/Git publication未发生。
精确恢复读取：proposal v1.1 + 本文 R2 + handshake，核对SHA；先取得用户对上条取舍及额外定向闭合的授权。
不得把 R2 的 2 PASS + 1 FAIL 解释成多数通过。

## 用户裁决与 v1.2 定向闭合

用户原话：「effort不在计划中。我的整体动态模型，动态的是模型。effort不用管。我自己认为调整」。
处置：本次动态路由/验收只管模型，effort不读作路由、不比、不改、不因值/未知拒绝；原配置照常生效。F2 effort债出本案，A-007编号保留标OUT_OF_SCOPE，route digest不含effort。
纠正归因 L1：生产者在新方案中误把存量 effort 相对序追加为门禁，是本次方案范围偏差；修方案与受影响审查记录，不改 framework 指令/长期记忆。
这是两轮后用户对未决项的明确裁决，追加一次只核此 scope 和新SHA的闭合，原因已向用户说明；不是自行无界增加会审。
v1.2 SHA：`3e31f17dc2ab2d4ca7edea84e9442837d4f810affea58fc0c7c3000966ea1bbb`。
三位只接收人类scope裁决与冻结稿，分别回算SHA；旧票不直接搬用。
B最终票：PASS（条件H1），B-1原要求不再适用、B-2/B-3按新scope关闭，无存活重大项。证据：v1.2 L17–18/86–87/97/118/127–130/148/155/168/170。
A/C新SHA复核均返回基础设施错误：请求的 gpt-6-astra 用量限制，未形成有效终票；错误提示 try again at 2:36 PM（仅保留服务提示，不自行推断时区/恢复已发生）。B票有效；此刻不宣称H1通过。
旧P3质量门已因用户新输入停止，未输出旧SHA envelope，不用旧记录门覆盖新scope。

### 补票 checkpoint

用户随后要求「继续」。已核对 live agent 状态：B completed/PASS，A/C errored（usage limit）。
这不是方案 FAIL，也不是有效完成轮；未改 frozen v1.2，没有拿v1.1旧票支持新SHA，没有自行降模型。
当前需要用户选择替代补票模型，或在同模型用量恢复后重派同资产；缺票期间H1仍PENDING，实施未授权。
精确补票目标：v1.2 SHA `3e31f17dc2ab2d4ca7edea84e9442837d4f810affea58fc0c7c3000966ea1bbb`；A机制/C验证仅核effort出scope是否破坏原已闭合模型机制，不重启广域会审。

用户随后回复「可以」，明确允许改用gpt-5.6-sol补齐两份终版复核，并标注降级。已冷启动派发 `/root/mechanism_fallback` 与 `/root/verification_fallback`，请求model=gpt-5.6-sol，未设置新effort。冻结稿与SHA未改；没有用原生峰值失败票冒充有效票。

## v1.2 最终有效票与握手结论

共同 subject_sha=`3e31f17dc2ab2d4ca7edea84e9442837d4f810affea58fc0c7c3000966ea1bbb`，三位分别回算一致。

| 分区 | 最终有效专家 | 请求模型 | verdict | 证据 |
|---|---|---|---|---|
| A 机制 | `/root/mechanism_fallback` | gpt-5.6-sol（用户批准降级） | PASS（H1条件方案） | L37–42可信模型元数据G0；L93–102原生入口/采集/manifest；L106–114快照；L118–123关键失败消费门；L192–195握手界限；交叉核对runner193–222/340–349现状 |
| B 一致性 | `/root/expert_consistency` | gpt-6-astra | PASS（用户裁决后H1） | L17–18/86–87 effort出界；L97/118摘要排除；L127–130/148/155/168/170旧债和验收排除；旧B-1不再适用 |
| C 验证 | `/root/verification_fallback` | gpt-5.6-sol（用户批准降级） | PASS（H1条件方案） | L106–114 TOCTOU；L118–123 latch/旧票；L127–130/155/168–170 effort排除；L171/175–176 mutation与真假证据层；L37–42/192–195 H1/G0/H2 |

三票均无存活BLOCKER/MAJOR。A/C没有重开effort比较/验收；这是独立冷启动新SHA补票，不是旧PASS转贴。
服务端实际模型身份：三位均UNKNOWN，未以自报证明；请求模型与用户批准降级事实明确记录。此会审不能作为真实模型路由探针。
H1：PASS（条件方案），只允许另批G0与精确实施计划准备，不支持自动接线可用性声明。
Concerns：A/C为降级会审；两adapter的可信元数据/隔离/实际调用均UNPROVEN；G0/H2未执行。
任务产物只有proposal/review/handshake三份MD；代码、用户配置、发布未修改。
下一步：独立拟定并由用户批准G0 exact commands/files/effects/预算，逐通道验证；失败则停止/缩范围交用户，不进入全量编码。
# v1.3 定向复核（当前权威）

用户批准运行时采用指定模型+同调用成功，不要求证明服务商内部身份。冻结 subject_sha=`0912e306a9b30538863755493112f87e9fb0713930e7170f24f612c538dfa5de`。

| 分区 | reviewer | 新 SHA 回算 | verdict | 存活重大项 |
|---|---|---|---|---|
| A 机制 | mechanism_fallback | 一致 | PASS 条件 H1 | 无 |
| B 一致性 | consistency_v13（冷启动） | 一致 | PASS 条件 H1 | 无 |
| C 验证 | verification_fallback | 一致 | PASS 条件 H1 | 无 |

A：G0 区分 requested/运行时 adopted；解析 READY 不是调用成功；R-1 统一旧术语；报错/改路拒收，G0 未 PASS 不编码。
B：正文与 R-1 标准一致，两通道仍 UNPROVEN；effort 完全不参与；H1 不解锁代码或用户配置写入。
C：A-002/003/004 改用采用一致和成功验收；安全、快照消费、A→B→A、latch/旧票拒收未放宽；无实测不 PASS。

H1 PASS 仅为条件方案。两通道、真实调用及 H2 仍待验证；不以本次专家请求证明采用模型或后端身份。旧版本历史记录保留在下方，不充新版本票据。

## 集中解析核心实施复核 — core R1

范围：仅 core-plan 获批的三文件 FILE_SET；无 runner/native/config loader 接线、无私有配置/effort/Claude/DeepSeek 改动或真实模型请求。
subject_sha=`38bfe7d115006994c54017b161030bfee48b9fdb28ab130143fb2aa5a6f2c147`，算法与逐文件 SHA 见 core-plan checkpoint。
生产者验证：15 个行为测试组 PASS，10/10 临时副本 mutation 杀死+恢复 PASS，四项既有 contract check PASS；旧 YAML 数据与 HEAD 深比较不变。
独立评审门：PENDING。Standards / Spec 各自冷启动、无生产历史、default-REFUTE；两轴 findings 分列，不合并/重排。源码冻结后不再改动，若修订重新绑定 SHA。
这不是 H2，也不将核心单元测试或此前 app-server 实测外推为自动路由交付。

### core R1 独立结果（历史；不作 R2 票）

共同 subject_sha=`38bfe7d115006994c54017b161030bfee48b9fdb28ab130143fb2aa5a6f2c147`，两位前后回算一致，冷启动无生产历史，源码未被判官改动。
Standards：`core_standards`，CONDITIONAL_PASS 6/7。ST-CORE-HASH/SYNTAX/MUTATION/PURITY/TRUST/CLEANUP PASS；ST-CORE-ERRORS WARNING/Minor：数组场景 ID 强转识别且保留数组，JSON roundtrip 会因对象身份比较拒收。无 Critical/Important。
Spec：`core_spec`，FAIL 4/5。C1/C2/C3/C4 PASS，C5 FAIL/Important：latch=false 且 decision 明确 conservative-default 时仍 ACCEPT。完成 148 个独立本地攻击检查、API I/O instrumentation、现有行为与 mutation 真跑；不把排除的持久 runner latch 当缺陷。
Recorder（判官不落账）：Standards run_id=`model-routing-core-20260917-standards-38bfe7d1`，verdict_digest=`ea3b016544b76b7136d807ea78fa765b76fca18d29824785ba70ab7be5f55ff7`；Spec run_id=`model-routing-core-20260917-spec-38bfe7d1`，digest=`c1dbc9d92b8e35085518b888d6e6d342ce1b2fddaec9a7769d0ef972afd68b01`。既有受信任 MEMORY_ROOT 的 eval-log 正常簿记，不写新语义记忆。

### core R2 最小修订与终版复核（当前）

两轴各自问题均已复现并 TDD 修复：标量场景/manifest 关联字段；强制非兜底 decision (`fallback:false`) 并由 trusted host 核验非兜底来源。17 个行为测试组、13/13 mutation+恢复、四项既有合同检查 PASS；实际接口及哈希见 core-plan R2。
新 subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`。Standards 与 Spec 终版同 SHA 确认 PENDING，保持两个报告分区，不复用 R1 票；H2 NOT_DONE。

### core R2 最终有效票（当前权威）

同一终版 subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`；两位独立回算源码前后不变，逐文件 SHA 匹配 core-plan。审查由原冷启动独立上下文进行 R2 终版闭合，不包含主会话生产历史；宿主模型继承，未选/改 effort。会审调用不作动态派发通道证明。

Standards 轴（`core_standards`）：PASS 7/7。ST-CORE-HASH/SYNTAX/MUTATION/PURITY/TRUST/CLEANUP/ERRORS 全 PASS；字符串选择器与标量 manifest 字段修复 R1 Minor，JSON roundtrip 有效，fallback 与 host 拒绝/异常正确失败；八项工程判断及 Fowler baseline 无可操作问题。源码不改，独立实际跑 17 个行为组、13/13 mutation+恢复；无存活 Critical/Important/Minor。

Spec 轴（`core_spec`）：PASS 5/5。C1 七场景/容量/来源/能力/pin 合同；C2 纯 API instrumentation 零文件/进程/网络调用、READY 非调用成功；C3 effort 不影响路由与票且旧配置不变；C4 parser-only/未接线边界真实；C5 旧绑定/错采用/缺可信证据/失败及 fallback 拒绝。R1 Important 在 `model-route.mjs:151` CLOSED：latch=false 的 conservative-default 在证据回调前 REFUSE，false 正例读回 ACCEPT。独立 61 项攻击检查、全部 CORE 命令和 mutation 真跑，无存活 Critical/Important/Minor。

Recorder 结果（已独立读回）：Standards run_id=`model-routing-core-20260917-standards-e281e29d`，PASS 7/7，verdict_digest=`62452b32c2e06cd31b05c53c253e17ba8094d93cf75af2dd6a9289fb011baa98`；Spec run_id=`model-routing-core-20260917-spec-e281e29d`，PASS 5/5，digest=`32bca4bd1e928088e486b260140bca770bc5cf446b3141d0fd6e481c6d3be78b`。
核心 gate_result=PASS，整体状态 DONE_WITH_CONCERNS：接线与真实通道 H2 未完成，两个轴均不授予自动派发/外部 effects/发布权限。R1 票作为历史保留，不用于本终版。

## 2026-09-20 通用模型路由专家会审（当前）

用户授权：对方案组织专家会审，并给出现执行节点到最终方案的偏差解决方案；不含源码实现、私有配置、追加模型探针或发布。当前框架NO_PIN；非模型路由并发dirty保持未触碰。
对象：`2026-09-17-model-routing-core-plan.md`的R-1及追加R-2。三专家均fork_turns=none，继承宿主模型，不显式更改model/effort；不把评审调用当作新模型路由真实验证。
分区：`panel_policy`审共同政策，`panel_mechanism`审实际消费面与四入口责任，`panel_migration`审旧节点到新方案的依赖/切换/失败恢复。主agent负责修订，专家只读，角色分离。

### 首轮：存在重大偏差，不能直接实施

共同SHA=`1d43795d73be6c6b11c1c174ba5eea04c792cd0bd495fc3176fb77140b8620a6`，三位分别回算一致。

| 分区 | Verdict | Finding与专家定级 |
|---|---|---|
| A 政策 | PASS（有2 MINOR） | PA-1 显式根会话覆盖与默认跟随断言要区分；PA-2 不实际升档的peak任务仍要保持关键角色 |
| B 机制 | FAIL | MB-1 MAJOR：native无负责实施的U-ID；MB-2 MAJOR：behavioral_ab/fusion/启动manifest/Codex代理等旧政策消费者遗漏；MB-3消费补项：workflow phase到scene共同映射与旧豁免未落实 |
| C 迁移 | FAIL | MC-1 MAJOR：09后置导致半新半旧；MC-2 MAJOR：启停/残留进程/同policy重启票据无生命周期；MC-3 MINOR：把历史SNAP005零turn禁写整体继承给新版会自相矛盾 |

生产者处置：不改R-1历史正文，追加R-2覆盖有冲突的迁移/验收文字。原R-1在新文档中按R-2标题之前的片段回算仍保持原SHA；不是悄悄覆盖历史。
补齐内容：四入口必交、06/07细分native/workflow；12行偏差矩阵；09-a提前作为不可启用迁移批成员、09-b最终切换；完整消费owner；共同(workflow,phase)映射；release/activation/root-generation分离；失败停用/新票恢复；SNAP005历史边界；UR13–15新增中间态、重启及真实workflow负例。

### 第二轮：同版三票最终闭合

冻结对象为R-1标题到EOF的完整组合，R-2冲突优先；共同SHA=`22bd9f935c19ef7775e27b4a1960031a8f0793978b229f062d67fc1a219e8272`。三个专家均完整读R-2并独立回算一致。

| 分区 | Verdict | 闭合与终版结论 |
|---|---|---|
| A 政策 | PASS | PA-1/PA-2 CLOSED；显式根覆盖优先、请求角色与实际模型分离；共同政策/主模型主权/effort边界未被迁移条款破坏，无存活MINOR/MAJOR/BLOCKER |
| B 机制 | PASS | MB-1/MB-2/MB-3 CLOSED；四入口实施责任、遗漏owner、共用workflow映射与失败出口覆盖；能力未知明确留在05门，不虚报支持 |
| C 迁移 | PASS | MC-1/MC-2/MC-3 CLOSED；候选隔离、配套迁移、切换暂停及重启拒旧票、旧SNAP范围分离；12行矩阵和W0–W4可进入精确载荷编译，无新增重大项 |

三票不是多数投票：此处三票全部PASS才闭合；没有沿用首轮A票或上轮单份文档6/6。轮数2，无额外第三轮。
结论：**方案与迁移合同会审通过；实施未开始、H2未完成。** 下一节点是U05当前版本四入口调查/精确载荷编译，不续旧P4b，不只做runner即结案。任何必交入口宿主无法支持，完整交付停在NEEDS_CONTEXT并交用户决定，不靠文字遵守补票。
本轮新鲜本地回归：17组core行为PASS；旧model-table PASS；旧agent-contracts52/52 PASS；三源码SHA与历史core R2一致。后两项仅说明旧合同基线仍一致，不作新UR实现证据。未写全局eval recorder，终票保存在本主题审计记录，不声称额外落账。
