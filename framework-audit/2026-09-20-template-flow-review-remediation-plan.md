# 模板驱动 OD 链路：审查整改执行计划

状态：IN_PROGRESS（原件一比一复制纠偏）— 用户否决了简化影子页，明确要求原始模板逐字节复制，并回复“继续”。此前基于影子页的匹配、生成和验收不得作为用户需求通过证据；已暂停 OD 生成。既有机械安全修复保留，但模板基线必须重建。无 Git 发布授权。

## 范围与前提

- 来源：用户要求修复全链路审查发现的问题，使需求→模板匹配→位置绑定→生成→恢复→验收形成可靠闭环。
- 基线：77a99dde974508b9026d57055510c309ab6c99d6。
- 身份：框架维护 NO_PIN；不读写下游项目、共享 docs/workflow-state/current-topic 别名。
- 该解的问题：已复现 4 项 Standards 与 5 项 Spec Important；仅改文字或增加置信分数不能修复运行时反例。
- 更小方案：保留现有框架与 helper，在原 owner 修合同和验证器，不建立第二套路由或 workflow。
- 非目标：重设计原模板视觉、支持新生成工具、删除旧页、修改 framework/、建立未经校准的概率分数。
- KILL-1：语义判断不能被 hash/锚点存在性替代；若无法可靠绑定，必须澄清或明确 reference_only，不伪称高置信。
- KILL-2：静态影子无法忠实表达某原状态时，标记该状态不支持并阻止相关 carrier 采用，不编造内容补齐。
- 保留既有 dirty：memory/retrieval-log.jsonl，以及当前全部未跟踪的 2026-09-17-model-routing-* 和三个 2026-09-18 计划文件。不得覆盖或暂存。

## 编排

Sequential 外层；实现结束后 Standards / Spec 独立 Parallel Fan-out。
任务规模 Standard；执行采用 core-execution；独立终验采用 reasoning-heavy（P0/P2）。
使用 code-hygiene 验证纪律；修改 agent 指令时使用 writing-for-agents；终验使用 code-review。
所有阶段为 task_execution；不启动产品 workflow。

## Phase 1：需求与匹配合同（U-01 / U-02）

U-01 — 冻结可信需求索引与 TAC 投影。
- Source：Spec S1/S2。
- Files：scripts/design-flow-handoff.mjs；scripts/test-design-flow-handoff.mjs；.claude/skills/office/design-brief/SCHEMA.md；.claude/skills/office/design-brief/references/output-templates.md；.claude/skills/office/design-brief/SKILL.md。
- Approach：明确冻结 Packet 的权威条目/片段定位合同；从实际内容验证 ID、片段与完整适用范围。TAC Markdown 由同一 JSON 与真实片段确定性生成，不接受独立编写的矛盾正文。
- Assertions：虚构 ID/片段、漏需求/状态、伪 scope 依据、矛盾 Markdown 均被确切拒绝；合法输入通过；不得用调用方同时填写分母与覆盖表证明完整性。

U-02 — 补齐候选、置信依据、模块消歧和降级的唯一操作合同。
- Source：用户全链路要求；Spec S4。
- Dependencies：U-01 的需求索引合同。
- Files：.claude/skill-os/runtime/page-context.md；scripts/page-context.mjs；.claude/skill-os/page-library/schema.json；.claude/skills/office/open-design/SKILL.md；scripts/test-page-context.mjs。
- Approach：词面线索不裁决语义；最终采用需逐项需求→候选用途/状态→module/slot→动作证据。区分无参考、需求未清、位置有歧义、采用待确认、源失效。模板合适但位置不明确时不得扩大修改范围或猜一个 slot。
- Assertions：无模板仍传完整需求；未对齐需求不能借 no-match 越门；多位置歧义等待澄清；用户拒绝/版本漂移不静默换页；不存在无依据精确概率。

## Phase 2：真实结构与安全恢复（U-03 / U-04）

U-03 — 修复不可变合同、DOM 与双份读回证据校验。
- Source：Standards 1/2/3；Spec S3。
- Dependencies：U-01。
- Files：scripts/design-flow-handoff.mjs；scripts/carrier-asset-profile.mjs；scripts/test-design-flow-handoff.mjs；scripts/test-carrier-asset-profile.mjs。
- Approach：验证使用的合同从已绑定 immutable 内容恢复/核对；以真实结构解析而非全文属性正则校验输出；检查作用区实际变化、add 落点、remove 与 preserve、未授权区域变化；将输出字节与 post-inventory 路径/hash/大小交叉核验。
- Assertions：删内存 preserve、注释假 DOM、仅加空白/注释、错位 add、越界修改、缺失/矛盾 inventory 全拒绝；明确分开结构证据与需求语义验收，不声称机械验证理解全部业务。

U-04 — 修正四页状态/模块证据与测试可移植性。
- Source：Spec S5；Standards 4。
- Files：.claude/skill-os/page-library/catalog.json；source-manifest.json；sources/settings-lead-pool.html；sources/customer-list-detail.html；sources/crm-workbench-home.html；sources/sales-record-list-detail.html（以上均位于同 page-library 目录）；scripts/test-page-context.mjs；scripts/test-page-context-preview.mjs；scripts/test-carrier-asset-profile.mjs。
- Read List：四份用户原始 /Users/luca/Desktop/模版/后台设置.html、客户列表到详情页.html、工作台首页.html、销售记录列表到详情页单.html，只读。
- Approach：逐状态检查 raw→shadow；保留可验证结构，记录支持/缺失边界。未获完整证据不宣称 materialized。常规测试只依赖仓库 fixture；原始桌面来源核验作为显式的来源审计，不以静默跳过冒充通过。
- Assertions：各宣称支持的状态都有结构与定位证据；不支持的目标不能以高置信进入 carrier；原始字节不改；旧五页保留；没有桌面文件的隔离环境也能跑常规测试。

## Phase 3：行为与回归证据（U-05 / U-06）

U-05 — 验证不预填答案的需求链。
- Dependencies：U-01 至 U-04。
- Files：scripts/agent-context-branch-fixtures.mjs；scripts/test-agent-context-branch-fixtures.mjs；scripts/test-agent-context.mjs；scripts/check-agent-context.mjs（仅相关合同断言）；必要时新增 scripts/test-template-flow.mjs。
- Approach：覆盖同义描述、否定条件、多个相近模板、无匹配、明确指定、跨状态、模糊位置，以及 add/modify/remove/preserve。输入不提前指定正确 page/slot，不把题目中给定的高置信标签当判断结果。
- Assertions：Claude/Codex 各自验证发现/执行/降级；记录真实轨迹和明确人工门。运行时不可用时写 UNKNOWN/BLOCKED，不用静态 fixture 冒充真实模型行为。

U-06 — 合并验证与证据更新。
- Dependencies：U-05。
- Files：package.json、scripts/verify.sh、.github/workflows/ci.yml（仅新门禁接线）；framework-audit/2026-09-18-four-template-semantic-manifest.md；framework-audit/2026-09-18-od-v2-live-validation.md；CHANGELOG.md；本计划。
- Commands：node scripts/test-page-context.mjs；node scripts/test-design-flow-handoff.mjs --mutation；node scripts/test-carrier-asset-profile.mjs；node scripts/test-page-context-preview.mjs；新增行为测试；bash scripts/verify.sh。
- Assertions：审查反例先复现、修后拒绝、合法对照通过；全仓门零失败；浏览器检查真实 DOM 和状态，不只查字符串；旧 live 证据保留历史、不升级为新实现已验证。
- External effects：本计划不启动新 OD 写入或 headless 生成；若终验需要真实新一轮 OD，先展示准确项目、新 namespace、bundle/prompt hash 与 stage/run/recover 清单，取得所需确认。

## Phase 4：独立终验（U-07）

- Dependencies：U-06。
- Ownership：两名冷启动 reviewer 分别审 Standards / Spec；不共享报告，不给予实现过程。
- Inputs：冻结最终 diff、用户要求、上述断言、证据路径。
- Gate：任何 Important/Critical 未闭环不得放行；修订后的最终 diff 必须回审，默认最多两轮，未闭合项交用户裁决。
- 输出：分轴报告、验证命令和结果、未验证项、精确变更清单；不自动 stage/commit/push。

## 完成判据

1. 原始需求、状态和约束完整进入冻结 Packet，适用集不能自行缩小。
2. 模板/位置选择有可核对依据；缺依据能正确澄清、拒绝或降级。
3. 用户看到的 TAC 与机器消费内容一致，确认绑定真实版本。
4. 错误位置、假锚点、越界改动与矛盾读回被拒绝。
5. 结构验收、语义验收、真实外部证据各自诚实，不以测试数量或 hash 代替。
6. 两个独立审查轴关闭阻断项，原始模板/无关工作未变。

任一关键 gate 失败停止依赖阶段。不能保证“永不出错”，但不确定与失败必须被显式处理，不能包装成成功。

## Checkpoint 0 — 执行前核验

- preflight：PASS；HEAD 与基线一致，目标与 protected dirty 无重叠。
- U-01/U-03 代码：handoff_fix，独占 design-flow-handoff 及其测试；U-02/U-04 代码与目录：binding_fix。
- 主线：契约文档、整合、行为验证与最终审查编排；不修改两个 worker 正在持有的文件。
- 恢复：读本文、git status --short、git rev-parse HEAD，再检查 live agent 状态；不能重新执行已完成的外部旧 live probe。

## Replan R-1 — 新增模板短指南（用户追加，2026-09-20）

- Source：用户要求未来增加模板时，agent 可快速按指导执行，不必重新梳理逻辑。
- U-08（主线，依赖 U-02/U-04）：新增 `.claude/skill-os/page-library/README.md`，在 `runtime/page-context.md` 增补页面入口挂载。
- 内容：只读审计源→新 stable ID→真实状态及模块/slot→source/module hash→预览和负例→入库验收；schema/scripts 为字段与算法真值，不复制大段合同。
- 验收：冷启动 agent 仅凭入口和该指南，能在临时库增加第五个 carrier、通过校验，并正确拒绝伪状态/重复锚点；不改 route 词表，不复用旧 ID，不改 framework/。
- 无新增 Git、网络、OD 写入权限，不影响 protected dirty；此项用户已直接要求，展示增量后执行。

## Checkpoint 1 — 实现与定向验证

- U-01/U-03 新增 `scripts/carrier-packet.mjs` 与 `scripts/carrier-dom.mjs` 两个小型 helper：分别拥有封闭 Packet/确定性 TAC 投影与受限静态 DOM 验证；无新依赖。这是已批准 Approach 的模块拆分，不新建 skill/流程。
- U-01～U-04 实现完成；handoff 回归与 14 项 guard mutation 全通过，page/context/assets 原始来源审计通过，四页浏览器状态锚点检查通过。
- U-08 冷启动前向测试 PASS：临时 approval-queue 合法登记/binding 通过；重复锚点、虚构/unsupported 状态、非法删除均拒绝。证据 `/private/tmp/guide-forward.LSYNyE/test.mjs`。指南按反馈补充 source_ref 根路径与唯一 required root。
- 常规测试在桌面路径强制 ENOENT 时通过；原始审计显式 opt-in，缺源不报通过。
- 当前进行：全仓 verify、双 harness 自然语言决策探针、独立双轴终验。决策探针不等于原生 skill 完整执行或 OD E2E；新 OD live 仍未授权。

## Checkpoint 2 — 行为与终审补验

- 全仓首轮：97 PASS / 1 FAIL（design-brief 入口超过 45KiB）；细节移至本来必读的 output-templates 结构化冻结节，只保留执行短指针，现入口 46020 bytes，不删既有逻辑，等待最终全仓复跑。
- Codex 真实只读文本决策：9/9，通过自然需求的 add/modify/remove、无匹配、未澄清、拒绝模板及不支持状态分流。证据 `/private/tmp/template-flow-live-kAy7MP/answer.json`、`stdout.txt`、`rescore.json`。
- 该 probe 原 runner 把原生传输回退/skill 描述压缩诊断误判成工具执行；核验同一 native turn 成功完成、无工具操作后仅离线复评，保留原 BLOCKED result，不重新生成答案。结论仅限所供完整合同/目录下的9个决策样例，不宣称匹配准确率或原生 skill 全链通过。
- Claude 真实探针未获得模型回答：沙箱内及外均报 `Failed to authenticate: OAuth session expired and could not be refreshed`；证据 `/private/tmp/template-flow-live-kgpDSS/stdout.txt`。需要用户恢复登录后补票，不能用 Codex 通过替代。
- 独立终审发现并正在闭合：TAC 未知字段、assessment→TAC fact/action 错配、Packet scope 与 action 双向冲突、HTML p 自动闭合逃逸、page-context mutation 依赖 fixture。最后一项主线已修且3项guard mutation通过；其余由 handoff_fix 窄修后回审。
- 新观察到其他 session 的未跟踪 `framework-audit/2026-09-20-muse-loop-retirement-plan.md`，本轮不读不改不暂存。

## Checkpoint 3 — 本地整改终验通过，发布保持阻断

- Standards：PASS，最终无存活 Critical/Important/Minor；Spec：PASS（本地整改范围），最终无存活 Critical/Important。两轴冷启动隔离，各自复现反例并验证修后拒绝与合法保持正例，不以另一轴通过抵消失败。
- 主线最终 `node scripts/test-design-flow-handoff.mjs --mutation` exit 0：21 项真实破坏/确切失败/恢复通过。`node scripts/test-page-context.mjs --mutation` exit 0：3 项 guard mutation；另覆盖数据负例。
- `node scripts/test-page-context.mjs --audit-originals`、`node scripts/test-carrier-asset-profile.mjs --audit-originals` 通过，四原始模板 hash 未变。`node scripts/test-page-context-preview.mjs` 真实浏览器通过，四 carrier 状态/锚点及九页预览有效；主线额外查看工作台输出截图。
- `node scripts/test-template-flow.mjs` 为机械门与评分器自测，真实 Codex 9/9 决策探针证据见 Checkpoint 2；不可把自测当模型活体。
- 已修新增终审问题：TAC 全层封闭字段；scope/coverage/projection/assessment 双向配对；合法 KEEP→preserve 真实来源；段落自动闭合逃逸拒绝；prepare 前置验证严格静态源；mutation 依赖夹具完整。
- 冻结 SHA-256：
  - scripts/design-flow-handoff.mjs = 8cfa94655e2821e34b395129327531d4a4b5f5297c99fdda9ecdebdb23b3f7b0
  - scripts/test-design-flow-handoff.mjs = 15efb0934a9638e029189332a3fd89e047c10606433cafcf0f76aade1889af9e
  - scripts/carrier-packet.mjs = 6085e6b7bfe84e4509b6775a1bf3df635536c16eccc51b49c0a95631e9688e37
  - scripts/carrier-dom.mjs = 4f8881a5bf68d1a970c6c85021d5e113d38f63b0216d60835747b780d06f00f9
- 新增模板短指南已落 `.claude/skill-os/page-library/README.md`，runtime §5可达；冷启动入库试验及拒绝性测试通过，不需要为新模板改路由词表。
- 第二轮全仓 verify 期间其他会话开始退休 muse-loop/proto-gen 并简化自成长，目录投影短时不一致导致 C9/C10 失败；不回退、不修改、不收进本任务。当前运行中的全仓结果不可当稳定快照验收；需并行工作结束后重新跑。
- 全局 skill-creator quick_validate 不认识本仓受保护 frontmatter 扩展（version/context-cost/preamble-tier 等），未据此删字段；使用本仓 `bash scripts/validate-skills.sh` 通过实际合同检查。
- 第二轮全仓结束：95 PASS / 3 FAIL / 0 WARN（C9、C10、S41）。C9 已在并行投影完成后单独重跑 PASS（catalog=43）；C10 单独重跑 49/49 mutations PASS。S41 单独定位到其他会话修改 `.codex/hooks.json` 后的 `registered Codex hooks trust bytes drifted`，不是模板代码失败；本轮不修改 hook 配置或全局授信来绕过该门。三个分项的后续复核不能冒充一次稳定快照全仓通过。
- `claude auth status` 实测 `loggedIn=false, authMethod=none`，确认外部认证缺票；没有代登录、改凭证或弱化测试。

### 剩余顺序（不重新实施已完成修复）

1. 用户恢复 Claude 登录后，在同一最终合同/目录上补决策与原生入口行为验证；不改变账户设置或凭证。
2. 等并行改动稳定，检查上述冻结文件及本任务 CI 接线仍在，再跑 `bash scripts/verify.sh`；新失败按 ownership 分类，不修他人未完成变更。
3. 新 OD 测试前出准确项目/new handoff/bundle/prompt hash 与独立 stage/run/recover 授权 payload，得到对应确认后实测；独立验收真实 UI 的全部需求/状态，不复用旧 run 作为新实现证明。
4. 任一关键票据未闭合不发布；Git stage/commit/push 另等明确授权，保护并行修改与原始模板。

## Replan R-2 — 用户要求处理待补、跳过 Claude 登录

- 用户最新原话：“待补的解决，claude登陆问题不管”。停止登录诊断/重试，保留未验证说明，不把豁免变成双 harness PASS。
- 本轮读取发现 hook 测试的冻结字节记录已由并行会话更新；主线没有修改 hook 或全局信任配置，正在重新跑完整 verify。
- open-design preflight PASS 仅适用于本地准备。四个当前版本测试包已由真实 Packet/binding/TAC helper 生成，状态 PREPARED_NOT_AUTHORIZED；没有伪造真人 adoption 或调用 stage/run/recover。
- 本地生成入口：`node /private/tmp/prepare-od-remediation-acceptance.mjs`。
- 精确授权清单：`/private/tmp/od-remediation-acceptance-20260920-v1/approval-payload.json`（含全部32个输入文件、逐文件hash、Packet、binding/TAC/carrier/bundle/prompt hashes与验收原文）。
- 准确 OD project：`fux-66-permission-matrix-e2e-20260914`；runtime=codex；profile=structural_carrier+single。每轮仅新建下列 namespace 的 immutable input/control 与 output/index.html，不删除或覆盖任何旧文件：

| page_id / handoff suffix | 操作 | handoff_bundle_hash | prompt_sha256 |
|---|---|---|---|
| settings-lead-pool | 修改表格公海回收规则30→21天；保持导航 | 0f4fe717ade9f056d9372ebd1d92e7dac38c6be67ed3839745676c7f74237067 | 868c10ab93fb3edc808777075051efbba438968634c68e1f7f868453145df2f6 |
| customer-list-detail | 工具区增加原生负责人选择控件；保持导航 | 83b5c0c0238de2825d2ada701e5c30d7f7341111a165b2f2f23fc1590bb4235e | a05c3a13fc7dd22f7abd15dabe9f25194618c11d41830b90e32648f2540cd8fd |
| crm-workbench-home | 扩展位增加静态回款提醒卡；保持导航 | e0d76655bb248a32398e2e7af59f19bfd4aeb6bb44846d5d3edfd1ffc55a7d09 | 183b3ab4dfd4cb960e4e5aa79ecb8558b6e1e0d83f3d98a81f83e06f58e3be07 |
| sales-record-list-detail | 移除记录表格；工具栏/详情/导航不变 | 417c3a785e8913c347625cc6ea9d299d6aeed12f2180e5dac4498df476863f20 | 6c3d124c20e1a0950503f8299f833dccf81312403e2544c8c7792744d915699f |

- handoff_id 格式（上述四个精确 suffix）：`luca-remediation-<page_id>-20260920-v1`；namespace=`handoffs/<handoff_id>`。
- 请求的确认分别为：四份冻结 Packet/binding/TAC 的采用、上述准确 namespace/file/hash 的 stage、绑定相应 prompt hash 的 Codex headless run、同 namespace/output 的 recover。确认前不执行外部效果；旧会话笼统授权不代签本轮精确 hash。
- 最终 `bash scripts/verify.sh` 本轮 exit 0：**PASS=98 / FAIL=0 / WARN=0**。原 C9/C10/S41 全部通过；未修改并行会话的 hook/信任配置。旧失败记录保留为历史，不再作为当前全仓阻断。

## Checkpoint 4 — 精确授权后的两份 live 验收

- 用户原话：“同意测试，但是四分测试稿变为两分去测试”。前一确认明确涵盖所示清单的方案采用、隔离目录写入、Codex headless 生成及读回；本轮仅缩量，不换 bundle/prompt。
- 执行选项：customer-list-detail（add 原生负责人选择）与 settings-lead-pool（modify 30→21天），保持导航及其他区域；bundle/prompt hashes 仍为 Replan R-2 对应两行。另两份不 stage/run。
- 最新本机 OD：pid 69008，127.0.0.1:65013，health ok，version 0.22.2，Codex available/authStatus=ok。不处理 Claude 登录。
- runner：`/private/tmp/run-od-remediation-acceptance.mjs`，代码硬限制仅这两个已授权 bundle hash；执行前逐字节核对已确认32文件清单中的对应16文件、当前catalog和binding/TAC；namespace 非新则拒绝重写。
- 串行执行以保证全项目 inventory 边界。stage/run/recover 分别调用独立授权 helper；本地分别保存 authorization、stage-receipt、run-authorization、run-start、events、recovery-receipt，避免中断后重复生成。
- 不创建其他测试稿、不覆盖旧文件、不操作 framework 或 Git；回收后独立检查真实 UI，不以机械 PASS 代替语义验收。
- 客户列表首次 run `56f82202-7477-4862-9816-0c893e267cd5` 因 OD 默认恢复旧 Codex thread 遇到 active writer 冲突；无输出。仅取消本次失败 run 并保留 events，不触碰旧 thread、进程或锁。
- 只读核验 OD 0.22.2 本机实现后，使用公开 `POST /api/projects/:id/conversations` 新建本次执行对话；在确认输出不存在、8份已stage输入hash未变后，对同一客户包/同一prompt做一次重试。新 conversation=`961917dc-63f6-488d-a2eb-b771c30caee1`，run=`1980c176-4ae5-4b5e-a0a9-a28d59a83fc6`。未新建第三份稿或换项目/Agent。

## Replan R-3 — 原始模板逐字节复制（用户纠正后继续）

- Source：用户明确“给到的是复制出来的模版。一比一复制的。不能是简化重写的”，并在纠正说明后回复“继续”。该最新要求取代原静态影子载体方案，不能靠 unsupported 标签保留错误基线。
- 原因：错误在源入库阶段，4MB 级原件被另写成约6KB摘要页面，OD只是在错误输入上正确修改。增加局部验证不能弥补原件丢失。
- 顺序：U-09原件复制及hash/bytes/Buffer.equals验证 → U-10停用影子采用、保留原件的外置定位与安全传输 → U-11原件对照验收。本轮不重新生成OD稿，不回写原件，不处理Claude登录，不发布Git。
- U-09文件：page-library/sources/originals/四个新HTML、source-manifest.json、scripts/template-copy.mjs及对应测试；新副本使用exclusive copy，已有不同字节不覆盖。HTML/CSS/script/template/data URL不裁剪、不加锚点、不注入说明、不格式化。
- U-10文件：catalog/schema/page-context/preview/handoff及其相关测试、runtime/page-context.md和README；模块定位只放旁车。不能被现有静态验证器解释时明确阻断该执行分支，不改原件来迁就验证器，不把纯存储证明冒充可执行派生能力。
- U-11断言：原件=仓库副本=交接输入的逐字节一致性；真实原件和副本同视口对照；原脚本/状态/资源保留；用户明确修改区外保持原样。旧影子不能再次进入最终采用。原件未完成可验证适配前，整体不能DONE。
- 当前编辑边界：其他会话的Loop退役、model-route、全局hooks、observability修改全部保护。只修本任务模板链，旧OD错误产物保留作为证据，不自动删除。

## Checkpoint 5 — 用户批准的备份、同步与恢复

- 用户明确同意完整备份未提交改动后同步、恢复；未授权分支提交或推送。
- 文件备份：`/private/tmp/luca-template-sync-OpJh8e`，119个状态对象，约11MB；另保留 stash `f0fef171218e51fbd432b71001b74142e8e138b1`，未drop。
- 从 `4122ac07969412588c6221c7809df8106e7dd99f` 快进到 `df776ec0bb0c12a24d4c0189b7e0739927207491`，与 upstream/main 一致。
- stash 恢复的三个冲突经逐差异核对：本地新增模型hook、9个新增mutation及模板CHANGELOG均保留，远端Loop退役内容也保留；不是采用某一边覆盖另一意图。
- 最新stash的89条tracked变更路径和31条untracked路径逐项核验；104个存续文件/链接全部与stash一致，删除状态全部一致；0不一致、0unmerged、暂存区为空。
- 首次文件备份与最终状态有2处差异（hooks和verify-codex-wiring），均是在文件快照后、stash前由并行工作加入；最终与较新的stash逐字节一致，两个版本均保留，不回退较新工作。
- 四原件copy审计再次PASS；后续仍保护并行模型路由等改动，不提交/推送。

## Checkpoint 6 — 原件外置定位索引（不改HTML）

- 新增 `scripts/original-template-index.mjs`、对应回归及 `page-library/original-index/` 四份旁车；使用真实 Chromium DOMParser 惰性解析副本，不把源码挂入活页面，不执行原脚本，拦截网络。
- 原有位置数：后台358、客户212、工作台108、销售记录162。后台有32个不唯一位置，明确标歧义，不能假设可直接编辑。
- 找到后台8个隐藏template状态、客户14个隐藏template状态；工作台/销售记录的状态是脚本控制，不因无template元素就宣称没有状态。
- 全部脚本和样式仍在原HTML中；旁车只是定位索引，source_sha256/bytes绑定原件，脚本指纹明确是DOM规范化文本指纹，不冒充原始字节hash。
- `locateOriginalNode` 从真实字节重算索引，拒绝源版本漂移、缺失/歧义位置，不信可被编辑的旁车自报unique，也不授予编辑或执行权限。
- 局部回归：副本不变、隐藏state作用域、重复ID、SVG跨命名空间冲突、重复非首选属性、过期定位拒绝；原件字节比较仍PASS。
- U-10尚未完成：索引仍未成为可安全执行的最终carrier绑定/回收适配，不将当前旁车等同于已可生成。

## Checkpoint 7 — 原件适配器完成，进入终版闭合

- U-10 已补 `original-template-edits.mjs`、`original-copy-handoff.mjs` 与共享 scoped transport：交接输入是正式原件完整字节；动作只能绑定从原件重算的唯一节点；输出必须等于原字节加声明的局部 add/modify/remove，preserve 不产生编辑。未授权区域、原 script/style、隐藏 template 内容及完整 inventory 均需保持。
- 独立 Spec 首轮发现 4 项 Important：外置资产静默漏包、注释型 no-op 被误判为改动、隐藏 template 越界未比较、旧 STAGED 收据可接受 canceled run。四项均已加入反例并修复；仍须由独立 reviewer 对修后冻结版本出终版 verdict，主线自测不能代签。
- 新增 `original-template-resources.mjs`：v1 只支持自包含原件。原 CSP 未阻断的外置 CSS/JS/图片/字体或无法可靠解析的静态依赖一律 `ORIGINAL_ASSETS_REQUIRED`，不抓取、不重写、不静默漏包；源 CSP 已阻断的原 URL 仍逐字节保留。该审计不执行源脚本，也不证明交互完整。
- 严格 fragment grammar 已接到原件编辑入口；浏览器容错出来的畸形属性分隔、脚本/事件/外链、解析逃逸、纯注释/空白变化均拒绝。DOM 对比显式递归 `template.content`，不再依赖 `isEqualNode` 的盲区。
- `npm run test:original-adapter` 新鲜结果 exit 0：索引、编辑、交接与四份真实原件全通过；四份交接输入分别保持 4,061,244 / 4,485,792 / 219,396 / 283,609 bytes。
- 本轮全仓 `verify.sh` 为 97 PASS / 1 FAIL；唯一 S41 进一步展开为并行维护的 `.codex/hooks.json` 信任字节漂移，失败发生在 controlled-change adapter fixture，与模板文件无重叠。本任务不修改或弱化该全局信任门；最终报告须把它列为外部工作树阻断，不能写成全仓通过。
- 新增模板指南已补 v1 资产边界：多文件模板先保留完整资产并停在待适配，不得只运 HTML、改写 URL 或标 `adapter-available`。
- U-11 还差两张以正式原件为输入的新 OD 测试稿及浏览器语义验收；旧影子稿永久无效。新轮必须重新生成 bundle/TAC/prompt hashes，并重新经过准确 adoption、stage、run、recover 人类门，旧授权不复用。

## Checkpoint 8 — 48 文件冻结初审与 Important 整改（2026-09-21）

- 基线 `b92beba0462d5c4750cb322c0df95f5bd6187c2c`；模板任务初审严格冻结 48 个文件，聚合 SHA-256=`7cdc2c4c0d282e638450c9ed7f2c63a720c2e2b92ba310b2d0570887c0eda94c`。model-routing、governance、observability、旧计划及 memory 日志继续排除并保护。
- Standards 初审：FAIL，2 项 Important——SVG `feImage` 外置资源漏审；后置 meta CSP 被错误追溯用于前置资源。
- Spec 初审：FAIL，4 项 Important、0 Critical——旧裸 `STAGED` 可在省略 run 证据时绕过 canceled/failed run；SVG `feImage`/script/presentation URL 漏审；inline/data module graph 漏审；CSP 顺序错误。两个轴的重合问题不互相抵消。
- 修复：资源审计按真实文档顺序累积 head meta CSP；覆盖 SVG href/presentation URL、srcset/picture、module/import-map、CSS escaped url/import 与 `image-set`；无法闭合的图 fail-closed。四份原件中的 `image-set(url(...))` 逐 URL 检查，只有被前置源 CSP 实际阻断的 URL 可保留。
- 修复：original_copy recover 仅接受精确 `OD_RUN_AUTHORIZED` 或 `USER_GENERATION_REPORTED` 收据。桌面端必须先 `reportOriginalGeneration`；headless 必须带同 prompt hash 的 succeeded run。旧裸 `STAGED`、省略 run、canceled/failed run 及桌面/headless 证据混用均拒绝。
- 新鲜定向证据：`npm run test:original-adapter`、`node scripts/test-template-copy.mjs --audit-originals`、`node scripts/test-page-context.mjs --mutation --audit-originals`、`node scripts/test-design-flow-handoff.mjs --mutation`、`node scripts/test-page-context-preview.mjs`、`node scripts/test-template-flow.mjs` 均 exit 0；四原件 bytes/hash 未改。该结果仍不是双轴终版票，也不是 OD 语义验收。
- 稳定快照整仓 `bash scripts/verify.sh` exit 0：**PASS=98 / FAIL=0 / WARN=0**，包含 S14f/S14g 原件闭包/回收与 S41 controlled-change；未修改 model-routing、全局 hook 信任或 governance 文件来取得通过。
- 下一门：稳定快照全仓 verify → 重冻 48 文件逐文件 hash → 两名隔离冷启动 reviewer 分别做 Standards/Spec 修后终审。任一 Important/Critical 存活则继续修复并回审；双轴 PASS 前不准备 OD 包。

## Checkpoint 9 — final14 终审与单份原件 OD 验收（2026-09-21）

- 模板任务冻结 49 文件，聚合 SHA-256=`9746467c0ed7d57789357666f6bdaf376a05cd8194306bd5ebb2a10b80119b2d`，另有 102 份支持文件独立哈希；证据 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/lucagstack-rereview14.2GOVMS`。Standards 与 Spec 隔离终审各 PASS，Critical=0、Important=0；四项原 Important 和新增外置资源审计复核闭合。原件适配定向测试及稳定快照 `verify.sh` PASS=98/FAIL=0/WARN=0；review 后仅两份任务脚本的最终修复获双轴回审。
- 用户取消第二份 settings 测试；只保留客户原件测试。新 OD 项目 `luca-original-customer-20260921-final14`，handoff `original-customer-list-20260921-final14-a1`，namespace=`handoffs/original-customer-list-20260921-final14-a1`。原件 SHA=`05921e7ad5340df93c28637118b1599eaefb4a4827a1b8d351afa7868808e58b`，Packet SHA=`646d868bb5f1dba1bfa85b847c9e57a718d70a2a4231a88467dae1f96aa67094`，TAC SHA=`08aef0f36174b06e0efbd029e2aaec0164e1d207ca809970588852172aefc6d2`，bundle hash=`8e5fe284f8cf5d3ce34203f823f27ce8946b7088a3f92c64bcad2d0459fff429`，prompt SHA=`b43c9f2d6972a050da5988eeb6c59767e93e89e6835975d9471146ac9191d734`。
- 新 adoption、五文件 stage、唯一 Codex headless run、两份 output recover 均各自获用户授权。run `cd0d7bfa-0603-4930-80e7-80edd36ce4a6` succeeded/exit 0；recover 输出 `output/index.html` SHA=`27cca078964ad20d9930b9e902946c4389ef9026343b95bfc89d29fa6f99b490`，4,486,023 bytes，机械校验 PASS（原件外目标字节及 script/style 不变）。收据和本地回收文件在 `/private/tmp/luca-od-customer-final14.QhCcvJ/`；没有写共享 docs/workflow-state。
- 浏览器语义检查：主工具栏可见负责人控件、三个选项与默认值，原生选择值可切换；原件与回收页的客户详情打开/关闭和 URL hash 转换一致，两条客户数据/计数保留。用户明确接受本轮测试设定并确认验证通过；这条具体负责人需求只是测试 Packet，不是框架默认或未来用户需求。键盘方向键在同浏览器的纯原生 select 对照中也未切换，自动化键盘项标 UNKNOWN，不假称通过。细证据见 `/private/tmp/luca-od-customer-final14.QhCcvJ/browser-acceptance.md`。
- 最终状态 `DONE_WITH_CONCERNS`：单份约定测试闭合，键盘自动化环境限制如上；第二份按用户指令取消。无 Claude 登录处理、无 Git 提交或推送、无无关工作区改动。
