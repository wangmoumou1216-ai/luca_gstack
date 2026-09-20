# 模型路由方案握手 H1

> **2026-09-20 当前入口：** `2026-09-17-model-routing-core-plan.md`置顶摘要及R-2（继承R-1共同规则）。新方案三分区专家第二轮全部PASS；方案会审闭合不等于实现准入，U05能力证明和精确载荷批准仍在前面。H2未完成，未恢复旧P4b/接线/私有配置/发布。

## H1-R2 通用方案与执行迁移会审（当前）

终版对象：core-plan从R-1标题到EOF的组合，R-2冲突优先；SHA=`22bd9f935c19ef7775e27b4a1960031a8f0793978b229f062d67fc1a219e8272`。
三份独立终票：panel_policy PASS、panel_mechanism PASS、panel_migration PASS；各自回算同SHA。PA-1/2、MB-1/2/3、MC-1/2/3全部CLOSED，无存活BLOCKER/MAJOR。完整首轮定级/修订/终版票见review的“2026-09-20 通用模型路由专家会审”。
判定范围：共同场景政策、四入口责任、偏差矩阵、不可提前启用迁移批、启停/恢复和验收合同。实际native采用证据/暂停重载能力仍待U05，不借文档票认定已可用。
当前接续：U05调查与精确载荷编译→U04/09-a离线候选→U06-a/b、U07-a/b、U08配套迁移→U09-b整包验证/受控启用→最终获准发布。旧U01–03成果保留，旧P4a失败保留，旧P4b不续跑。
以下H1-R1单份文档6/6及更早票据只保留历史，不替代三分区同版会审；本次方案通过不自动批量授权上述源码/运行时变更。

## H1-R1 新方案独立终审（2026-09-20）

对象：core-plan 中从 `## Replan R-1（2026-09-20）` 到 EOF 的 UTF-8 正文。
终版 SHA：`1d43795d73be6c6b11c1c174ba5eea04c792cd0bd495fc3176fb77140b8620a6`。
独立 quality-gate 冷上下文 default-REFUTE，eval_run_id=`model-routing-unified-plan-20260920-r1-final`。
结论：PASS 6/6，无存活 BLOCKER/MAJOR；C1 唯一政策、C2 默认及上下界限、C3 effort隔离、C4 历史证据忠实、C5 安全与能力门、C6 授权分离均PASS。
首票 SHA `58f9a0a7b511a250813727621a3dabc416ccd0db975af885af9378913c998394` 因用户追问subagent后两句澄清失效；同一独立审查者回算新SHA、定向复核后发上述终票。没有用旧票宣布新版通过。
这是文档逻辑票，未认证两端实际接线、账户角色绑定或当前运行时配置消费。用户尚未批准新精确实施载荷。核心17组测试是旧模块回归证据，不是UR全量验收。此次未调用eval recorder；终票直接保存在本审计记录，不宣称全局eval落账。

## 以下为旧范围历史记录

状态：NEEDS_CONTEXT；H1=PASS（v1.3 条件方案），三文件核心验收=PASS（core R2），P4a 配置消费补证 gate=FAIL（2/5），全量实现 H2=NOT_DONE。历史 PASS 不作为新版本/新通道票据。
方案目标：`framework-audit/2026-09-17-model-routing-proposal.md`；当前 v1.3 SHA=`0912e306a9b30538863755493112f87e9fb0713930e7170f24f612c538dfa5de`。R1 SHA 与旧票仅留作历史。
审查记录：`framework-audit/2026-09-17-model-routing-review.md`。

## 握手放置

用户批准会审 → P1 方案冻结 → P2 三分区 default-REFUTE → P3 修订、终版 SHA 逐票确认 → **H1** → 用户批准精确实施计划 → 行为/真实调用/变异测试及独立 diff review → **H2** → 发布另批。
H1 只能放行“实施前探针与精确实现计划准备”，不得自动修改代码、私有配置或 Git。

## 闭合条件

- A/B/C 同一终版 SHA 的有效票齐备。
- 无存活 BLOCKER/MAJOR；UNKNOWN 必须明确阻断实施或交用户裁决，不冒充 PASS。
- 方案 criteria C1–C5 逐条带证据。
- 请求模型与服务端实际模型证据分开记录；不让模型自报充证明。
- 未来 A-001…010 仍是实现 H2 义务，不计为本轮测试通过。

## Checkpoint

已完成：P1 独立门 PASS 5/5 并 recorder 落账；P2 三专家已冷启动派发。
R1 三票均 FAIL，发现 7 个 MAJOR、3 个 MINOR（A/C 两组问题重叠，不冒充十个独立根因）。
当前：v1.1 已冻结，R2 SHA=`75cf94123b4678bc8cd6bb66407f29af36ce973e811055cb4c56fa9e54b493db`；三票已回算，A PASS/B FAIL/C PASS。
剩余：用户裁决 B-1 及额外定向闭合；重大未决，不能自加 R3。
恢复：核对 repo HEAD、dirty 与 proposal SHA，读取 review；缺票先补票，不直接宣称完成。

## 最终票据

| 分区 | verdict | SHA |
|---|---|---|
| A 机制 | PASS（条件方案） | 75cf94123b4678bc8cd6bb66407f29af36ce973e811055cb4c56fa9e54b493db |
| B 一致性 | FAIL（1 MAJOR） | 75cf94123b4678bc8cd6bb66407f29af36ce973e811055cb4c56fa9e54b493db |
| C 验证 | PASS（条件方案） | 75cf94123b4678bc8cd6bb66407f29af36ce973e811055cb4c56fa9e54b493db |

R2历史结论：**H1 FAIL，未握手。** 两票PASS不是多数授权。
存活 B-1：同模型 effort 不明/不可比，冻结稿未明确拒绝裁决；只“不声称成立”可能让未知票仍被接纳。
待用户确认的最小修订：上述情况与低于执行者一样 REFUSE、交用户、不生成有效票，并同步 A-005。
即使获准修订也须新 SHA 定向闭合，不能在旧票基础上宣布 PASS。
G0 原生/CLI 证据与配置消费仍 UNPROVEN；H2 所有真实调用/行为义务未跑，不计已实测。

## Criteria（当前判定）

| ID | 判定 | 证据 |
|---|---|---|
| C1 MUST 的场景/错误/验收 | PASS（方案覆盖） | proposal MR-001…007、A-001…010；不是实现正确性 |
| C2 优先级/证据分层 | PASS（条件调查合同） | A/C R2，G0 门、未知通道拒绝、快照消费 |
| C3 未扩权实施 | PASS（任务产物范围） | 只有3份任务MD；原始dirty保留；eval recorder为既有运行簿记，未改实现/用户配置 |
| C4 同SHA逐票 | PASS（票据身份完整） | 三票各自回算相同R2 SHA，不意味着三票结论PASS |
| C5 零存活重大项 | FAIL | B-1 MAJOR未关闭 |

以上criteria为v1.1历史判定，不以它们作为v1.2票。

## 用户裁决后闭合（当前）

用户已明确：动态只管模型，effort由他自己调整，不纳入本计划。
scope修订：删除effort相对序/未知门禁，排除effort比较/改写/额外字段拒绝/路由摘要失效，F2 effort债和A-007出本案；其余G0/权限/模型证据/票据闸门不变。
v1.2 SHA=`3e31f17dc2ab2d4ca7edea84e9442837d4f810affea58fc0c7c3000966ea1bbb`。
B定向终票PASS，无存活重大项；A/C新SHA复核均因 gpt-6-astra 用量限制失败，没有有效票，因此当前仍PENDING（不是方案被两位专家否决）。
定向闭合只核用户裁决与新SHA，不扩大机制审查；H1即便通过也只是另批G0/精确实施计划准备，不是代码写授权。
用户要求继续后已核对agent状态，未擅自切换模型/使用旧票；待用户选择补票替代模型或同模型额度恢复。
补票授权已取得：用户明确同意gpt-5.6-sol降级复核；A/C新冷启动专家已派发，仍待有效终票。B同SHA票保持有效。

## H1 最终闭合（当前权威结论）

target_sha=`3e31f17dc2ab2d4ca7edea84e9442837d4f810affea58fc0c7c3000966ea1bbb`。
三票均独立回算该SHA；A/C新冷启动补票已返回，覆盖用户effort裁决后的同一终版。

| 分区 | verdict | 请求模型 | 是否降级 |
|---|---|---|---|
| A 机制（mechanism_fallback） | PASS（条件H1） | gpt-5.6-sol | 是，用户明确授权 |
| B 一致性（expert_consistency） | PASS（条件H1） | gpt-6-astra | 否 |
| C 验证（verification_fallback） | PASS（条件H1） | gpt-5.6-sol | 是，用户明确授权 |

存活BLOCKER/MAJOR：0。原B-1由用户明确排除effort而不再适用，不是偷偷降低严重性。
最终criteria：C1 PASS（MR场景/错误/剩余行为验收覆盖）；C2 PASS（G0与两adapter证据层/拒绝分支）；C3 PASS（无实现/私有配置/Git授权扩张）；C4 PASS（同终版SHA有效三票）；C5 PASS（零重大未决）。详见review终票证据。
请求模型与实际服务端身份不同层：三票实际身份仍UNKNOWN；降级会审不冒充峰值真实模型探针。

H1 PASS只证明有限条件方案可进入**另批G0/精确实施计划准备**。G0/H2均未跑，原生/CLI仍UNPROVEN，不能宣称改造完成或启动全量编码。
Concern：A/C为用户授权降级会审；配置消费隔离/可信模型字段/受保护入口接线仍须G0验证。
下一步批准入口：G0 exact commands/files/effects/预算，不是代码修改或发布。

## v1.3 用户裁决与当前 checkpoint

用户在真实使用例子说明后答「可以」，批准运行时采用指定模型+同调用成功为验收标准，不要求证明服务商内部身份；明确改路/报错仍停止。effort 边界不变。
新 proposal SHA=`0912e306a9b30538863755493112f87e9fb0713930e7170f24f612c538dfa5de`。v1.2 历史票不能用于本 SHA。
A mechanism_fallback、B consistency_v13、C verification_fallback 均已独立回算新 SHA 并 PASS（条件 H1），存活 BLOCKER/MAJOR 均为零。A/C 为原已批准替代专家的定向复核；B 新冷启动、继承宿主模型设置，未另选模型或 effort。专家调用本身不作为通道采用证据。
本轮只修订审计产物；原有 observations/rules/retrieval-log 脏文件保留。两 adapter 仍 UNPROVEN，尚未真实调用或修改实现/用户配置。
恢复：核对 git status 与 proposal SHA，读取本节及三票，缺票不宣称 H1 PASS。随后准备 exact G0 探针与预算供用户确认；未批准真实探针前只做只读调查/计划。

### G0 实测 checkpoint（H1 PASS 不等于 G0 PASS）

初批两个逻辑turn已执行：Sol/Astra的运行时采用一致且隔离设置已确认，但均90秒TIMEOUT。Astra记录连接错误/底层重试。G0成功调用义务未通过，H2仍未执行，自动接线/实现代码不可开始。
无认证连接诊断证实直连沙箱外亦超时、系统已有本机7877代理路径返回405；405不证明模型/账户可用。代理测试仅待用户批准追加各模型一次，载荷见 `2026-09-17-model-routing-g0-plan.md` Delta G0-P。
临时客户端与两JSON证据位于 `/private/tmp/model-routing-g0.aX6M54/`；未改实现或用户配置，未额外模型调用。并发出现的domain-modeling审计文件改动属其他工作，不覆盖或回退。

### G0 代理复验完成（当前checkpoint）

用户另批 Delta G0-P 的 Sol/Astra 各一次代理调用，现均已PASS：可信 thread/start 返回指定模型，config/read隔离确认，同 threadId/turnId completed，exit=0，未观察改路。累计四个逻辑turn，仅两轮均有明确授权。
SUPPORTED仅限本机app-server显式模型接口与本次临时隔离。runner的exec/profile快照消费、原生宿主采用信息、自动派发接线仍未证明，不计全量G0/H2 PASS，不静默改用app-server替代既定adapter。
已做实现文件只读影响分析；尚无实现或私有配置写入授权。恢复先看preflight“代理复验”及scratch两PASS JSON，再准备exact实现计划，不重跑已通过探针，不触碰并发domain-modeling暂存改动。
纠正归因L1：本次误将effort纳入动态方案，已修proposal及受影响记录；无长期记忆/框架指令修改。

### 集中解析核心 — 当前实施 checkpoint

用户已另批 `2026-09-17-model-routing-core-plan.md` 的三文件核心实施。源码与本地行为/变异检查已完成，独立冻结代码复核 PENDING。
core subject_sha=`38bfe7d115006994c54017b161030bfee48b9fdb28ab130143fb2aa5a6f2c147`；15 个行为测试组 PASS，10/10 mutation 被杀死且恢复 PASS，既有四项 contract check PASS。
这份票只覆盖纯解析/manifest/父级裁决校验。可信宿主 verifier、配置采集/快照、持久 failure latch、受保护入口、runner/native 自动派发均未接线；JSON 命令不接受未经采集的支持宣称。
**H2：NOT_DONE**。核心独立复核通过也不取得全量实现握手；后续接线仍须 exact plan 与用户另批，不启动额外真实模型请求或发布。

### core R2 终版复核（当前）

core R1 Standards 6/7 有 1 Minor，Spec 4/5 有 1 Important，故核心未握手；R1 findings 分别保留在 review。
两项均已最小修复并新增直接负例与 mutation：非字符串选择器拒绝；关键票必须明确非兜底，latch=false 也不得接纳保守默认。
新 core subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`；17 个行为测试组 PASS、13/13 mutation 杀死+恢复 PASS，合同检查再次 PASS。两轴终版确认 PENDING。
仅核心产物复核，不取得全量 H2。旧 proposal/H1/G0 票不被拿来当本实现票；源码再改则本 SHA 作废。

### 核心验收闭合（当前权威；非 H2）

core R2 subject_sha=`e281e29d924a1c021d58661f72c7f600f1fbfc330aa7902c1cdf902896ec5982`，源码三文件顺序/哈希与 core-plan 一致。
Standards 独立终票 PASS 7/7；Spec 独立终票 PASS 5/5；均前后回算新 SHA，R1 两项分别 CLOSED，零存活 Critical/Important/Minor。正式票和 recorder 读回证据见 review 两轴分区。
行为验收：17 个测试组 PASS，13/13 对应 mutation 杀死、恢复 PASS；语法及四项既有合同检查 PASS。无新真实模型请求，私有配置/effort/Claude/DeepSeek/runner/`.codex/` 未改，未暂存/提交/推送。
本阶段只完成**模型怎么选、当前裁决是否可接纳**的集中核心。命令不拥有可信宿主采集，正常返回 NEEDS_CONTEXT；还没有自动派发。
**H2 仍 NOT_DONE**：配置消费与双通道实际接线、持久失败状态、受保护入口真实行为及全量验收需下一精确计划/用户批准。不得把核心 PASS 当成自动路由启用或发布握手。
恢复：复算本核心 SHA，读 core-plan 最终闭合及 review 两轴票；下一步准备接线计划，不擅自换 adapter 或新增模型调用。

### P4a 当前关口（当前权威；未握手 H2）

用户已明确同意 app-server-backed Codex CLI 通道与 P4a 零 inference 补证。父级实际执行批准 scratch 的入口一次，最多两会话均已使用；都在初始化阶段拒收（normal RUNTIME_STDERR_ERROR，fixture WARNING_UNEXPLAINED/configWarning），未到 config/read/thread/start，新增模型 turn=0，无 retry。不得将离线 checked-A/drift 用例称真实配置消费或 A→B→A 已验证。
冷 quality-gate 独立前后核 probe/report/core SHA，syntax/11 组 self-test PASS；正式 gate FAIL 2/5。SNAP004拒收、SNAP005零turn/范围通过，SNAP001缺运行时完整证据 BLOCKING UNKNOWN，随后停，SNAP002/003 UNKNOWN。父级已独立 recorder 校验落账及读回：run=`model-routing-snapshot-20260917-quality-1789639680340`、verdict SHA=`0414af15f24cb0873c19c57d71a99068278388494a87e4d305365b2eedbaea7d`。
完整消费机制 UNKNOWN，不是全局 UNSUPPORTED：无 full 回读 API 不等于没有等强构造证明；原生正常配置 lease/依赖封闭/whole-process 上限仍需版本对应权威依据。启动 error/warning 原因正文未留存，也不得猜测根因或抑制 warning 换 PASS。
证据 exact paths/hashes、两进程关闭/timing、core/proposal 不变及下一 P4b 载荷见 core-plan；P4b 尚需新增会话/官方源码只读 authority。旧 probe/report 保留，不覆盖。未改 runner/私有 peak/effort/Claude/DeepSeek/aliases，未 Git 提交推送。
**H2=NOT_DONE**。当前需要先补真实启动原因和原生消费能力证据；failed gate 禁止进入自动接线。用户整体完成且验证/测试/会审无问题后提交推送的终局要求仍保留，不以仅发布三文件核心代替。
