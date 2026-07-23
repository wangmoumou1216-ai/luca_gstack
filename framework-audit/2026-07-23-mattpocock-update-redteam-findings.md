# mattpocock 更新对标 — 红队回票全文 + 编排者回应（2026-07-23）

> 靶子：`framework-audit/2026-07-23-mattpocock-update-review.md`
> 本文件供 fable 判官收口。§1-4 为 R1-R4 回票原文（未删改），§5 为编排者回应（承认/对质），§6 为判官待裁清单。

## §1 R1 回票（分类完整性）

VERDICT：清单穷尽性 **REFUTED**；noise 归类 **STANDS**。

- 独立核实：72 文件 = 41 openai.yaml + 31 non-openai；HEAD=ed37663c 一致；先加后删/重命名扫描全空（31 文件宇宙真完整）；in-progress README 确认净新增恰 2 skill、无新 deprecation。
- **F1**：靶子枚举漏列 5 个 `docs/` 镜像文件（wayfinder/improve-codebase-architecture/grill-with-docs/grill-me/grilling 的 aihero.dev 文档镜像）。直读判性质：全是已分析 SKILL 改动的复述，noise 归类正确，但「全部 patch 已直读」主张对 docs/ 子树不成立。
- **F2**：changeset 计 6 实为 7（漏 codex-skill-metadata）。**F3**：bucket README 计 4 实为 3（顶层 README 被重复计入）。F2(−1)+F3(+1) 恰好相抵，把 F1 的 5 文件漏列在总数核对里掩盖——总数对得上 ≠ 枚举穷尽。
- **F4（透镜盲点）**：窗口内 `implement` skill 从 in-progress **转正进稳定桶**（d3275456，README/plugin.json wiring），靶子 P2 只追踪「净新增 SKILL.md」，对既有 skill 的转正信号盲视。implement 与我方 code-hygiene/tech-spec/task-plan 重叠，本轮无采纳损失，但流程盲点应记入共识。
- **F5**：发行/接线面其余文件逐条直读，noise 全部成立（AGENTS.md 实为 symlink to CLAUDE.md）。
- 对采纳裁决影响：**零**；但靶子 §1 须修正（补 5 docs 显式入 noise 清单、修两处计数）。

## §2 R2 回票（血统 no-op）

- **§3.1 wayfinder→plan-agent：OVERTURNED。**
  - 证据 1：我方毕业判准（`plan-agent.md:322-327`）把 fog 毕业硬编码「升任务/U-block」，而 U-block 被定义为**执行专用**（`:315` task_execution 专用，`:331-343` 强制 Verification/Test scenarios）——我方系统不存在「决策型」毕业落点。上游 changeset 原文：「People kept reading a wayfinder ticket as an ordinary implementation ticket…when wayfinder uses them as decision tickets: questions whose resolution is a decision」。我方吸收时丢掉 ticket 类型学、只留三词，再把毕业指向执行单元 = 比上游更易犯上游正名要堵的误读。括号守卫只防时机不防类型。
  - 证据 2：编排者的「HITL 卡点兜底」是**计划审批海拔**非逐项类型闸（`:20`/`:675` 确认在整份计划后；`:166` 非 Supervisor/Hierarchical 模式**不等确认**；kill-assumption/盲区推荐都不校验卡的类型）。被洗成 U-block 的决策过门后由 Work Agent 自主执行 = agent 替人做决策，命中上游 HITL 破坏判据。
  - 最小增量（R2 拟）：毕业判准处加一道类型闸（一句，零新机器）——fog 可精确陈述后先判解属**决策还是执行**（判据复用 brainstorm Rule 3：取决于用户偏好/取舍→决策；可检索/可执行验证→执行）；决策型毕业为抛给用户的 HITL 问题（或回灌 brainstorm/grilling 节点），永不毕业成自主执行 U-block；仅执行型升 U-block/DEV 卡。附注：可顺带记一句「决策所依赖的事实缺口→就地 fan-out research 子 agent、不阻塞规划」。
- **§3.2 grilling→brainstorm：WEAKENED。** 我方事实源「代码库/文档/已有研究」是**静态制品闭枚举**，严格窄于上游 `environment (filesystem, tools)`；「只能靠运行工具确立的事实」（测试是否绿/端点延迟/依赖存在性/线上配置）落在覆盖外，会被误抛给用户或读旧文档。部分覆盖存在（判据可宽读+Phase 1 子 agent），故 WEAKENED 非 OVERTURNED。最小增量：`:134` 事实源补「以及跑命令/调工具/web 检索可确立的事实」一行。
- **§3.3 to-tickets→task-plan：STANDS。** 上游唯一改动=删一行串行指引；我方吸收更厚且刻意反向（可并行起）；被删句无从 sync。

## §3 R3 回票（候选⑤）

总裁决建议：**KILL**（MODIFY 为下位兜底）。取证锚点：

- **Phase 3 硬顶 2-6 问**：`brainstorm/SKILL.md:92`「Ask 2-6 forcing questions」+ `references/pressure-test.md:13`「The Six Forcing Questions」——没有第 7 问的设计空间。
- **「10 轮串行问答」在其取证语料查无实据**：episodic archive EP-20260612-031 原文=「Oracle 三轮」（Phase 5 对抗轮非 Phase 3 提问轮）；eval-log 无提问轮数字段。（编排者对质见 §5）
- **既有逃生阀**：pressure-test.md Part 6「First signal of impatience → narrow to 2 highest-leverage questions」——降 HITL 延迟机制已存在。
- **事实 subagent 非阻塞已内建**：`:88` Phase 1 三并行 agent + `:294` librarian + Rule 3 自查条款。
- 逐项：A 独立性前提 REFUTED（六问是同一前提的六面三角测量，语义强耦合；Phase 2 sharpening 机制以串行为承重件——`:300-329` 产出 sharpened_questions/routed_question_set；批问=冻死 sharpening 输入面）。B 痛点 REFUTED（量级虚构+偏好语境迁移方向相反——skill 明文「Friction is the service」`:41`）。C 收益 REFUTED（分母错+压缩率建立在已破的独立性上；真实延迟痛点 Part 6 已交付）。D 有界版自洽 REFUTED（推荐答案×批轮=rubber-stamp 放大器；违反 Rule 5 防锚定立法意图 `:149`；「高杠杆」判据无法操作化；让步：结构化 UI 确实消解 bewildering 机械失败，但消解不了 `:405`「premature synthesis」独立理由）。E 上游信号 STANDS 强（作者同 repo 内 A/B 后把逐题转正、批版禁模型调用+保留 bewildering 教义）。F 替代拆解（安全子集=事实预取已内建零增量；有增量部分全是风险——收益与风险不可分离）。
- MODIFY 最小存活版：**不动 Rule 3 默认教义**；只把 Part 6 逃生阀升档——用户发出第一次不耐烦信号（既有触发点=用户主动 consent）且剩余强制问中有 ≥2 个前提已定、语义弱耦合的，允许单次 AskUserQuestion 多问（≤4）替代「narrow to 2」；**默认不预填推荐答案**；高杠杆问题强制排除在批外仍单抛。

## §4 R4 回票（候选⑥ / ④撤回 / P3）

- **T1 候选⑥：OVERTURNED**（采→记 gap 不动手）。①需求零实证：episodic index 全量 grep 问卷/访谈/stakeholder/recipient=零命中，research-kit 自身零使用；②**收件人前提反证缺失**：to-questionnaire 承重前提是「一个持有缺失知识的具名人类收件人」，其取证范围内 luca 语料皆单人+Claude（编排者对质见 §5）；③落法三选一正解=记 gap：判据②的前置「知识确实被流程消费」不成立，正文和 references 都是为未发生用例付成本；延迟成本≈0（上游全文随取、触发条件明确可观测：第一次真实出现「brainstorm 撞到 luca 答不了且有具名人类持有答案」）；④稀释 research-kit 三不产定位：决策问卷是「从具名协作者抠决策」的沟通制品，不是「武装 luca 采集用户数据」的研究 instrument。
- **T2 ④撤回：WEAKENED**（结论存活、论据修正）。强腿成立：code-recon Phase 0 必问意图+范围，上游 branch(b)「无方向 fallback」被结构性预置掉。废腿删除：「episodic 2 次使用=无需求」是无效推断（n=2 不可证伪；撞 luca `feedback_dont-overgeneralize-failure-lessons`——把证据缺失当缺失证据）。过度矫正处：churn 作为**有方向时**的富化信号（待扩展面高频 churn→调高 INFERRED 风险标注/提示活跃区）仍存活，`git log` 一条命令近零成本。建议：维持不采 branch(b)，修撤回理由，可选救回 churn 一行注记。
- **T3 P3：渠道 STANDS / 「无取物」WEAKENED**。ADR 0002 证实 plugin=订阅自动更新模型，正是 watcher 防的对象，不切成立。但漏做碎片扫描：版本号驱动更新=反可借；promoted-bucket-as-manifest=边际；**`claude plugin validate --strict` 式 roster 一致性校验**（skill 名册↔routing-map↔/office 三方 strict 校验、CI 门）是唯一值得跟进的碎片——luca_gstack 对应物散在三处非受验 SSOT（UNVERIFIED：未穷尽检查是否已有此类 checker）。建议记 gap 与 daily_governance 漂移看护合并考虑。

## §5 编排者回应

**承认（无对抗）：**
- R1 全部：靶子 §1 穷尽性主张降级，5 docs 补入 noise 清单，修 F2/F3 计数；F4 透镜盲点（promotion 追踪）记入共识与流程改进。
- R2 §3.1 OVERTURNED：认。我未直读 HITL 机制的海拔即声称「兜底」，R2 直读证据链完整；其最小类型闸增量方向正确。§3.2 WEAKENED：认，一行同步合理。§3.3 STANDS。
- R3 A/D/E/F：认。尤其 F 的拆解（安全子集零增量、收益即风险）成立。D 的让步条款（结构化 UI 消解 bewildering 机械失败）与我原论证一致但不足以救整案。
- R4 T1 的①③④、T2、T3：认。

**对质（两处事实争点，请判官裁）：**
- **对质 1（R3-B「10 轮虚构」）**：「10 轮问答」非我凭空造——研究情报官项目 `docs/PROGRESS.md`（本 session 启动注入原文）Phase 2 实录明写「**10 轮问答 + Oracle 3 轮对抗** 35 findings 全修复」。R3 grep 的是 episodic/eval 语料，未扫项目侧 PROGRESS.md。但 R3 的结构性事实同样成立：**当前版** SKILL.md 硬顶 2-6 问。两者可并存的解释：06-12 实跑时 skill 为旧版（6-21 有 60aba9a「skill 层精简重构」），或「10 轮」口径含澄清性追问非仅 forcing questions。**判官需裁的不是谁造假，而是：在当前版 2-6 问上限下，痛点量级是否仍支撑改教义**——我承认按当前版口径，B 的核心结论（痛点量级不支撑）大概率仍成立，KILL 或 Part-6 升档二选一由判官定。
- **对质 2（R4-T1②「收件人不存在」）**：此腿过强。luca 是产品设计师，有真实产品线协作语境的证据：CRM（纷享销客）profile 与 mobile-list CRM 调研（EP-20260722-098）、insight-synthesis skill 专门消费「用户提供的访谈/工单/回访」（有人在做访谈=存在同事/用户关系）。「solo 语境无收件人」不成立。**但 T1 的①③④腿独立成立**（场景零实证+落法判据前置不满足+定位稀释），故我接受「记 gap 不动手」的结论，仅要求共识稿修正理由：不是「收件人不存在」，是「场景未发生过一次」。

**编排者自认（本轮红队暴露的我方调研缺陷，入共识稿）：** ①穷尽性声明先于逐文件直读（R1）；②「10 轮」引用未溯源到当前版 skill 上限交叉验证（R3）；③「HITL 兜底」未直读机制海拔即背书（R2）；④「收件人」争点两侧都未系统取证（R4 与我各偏一侧）。

## §6 判官待裁清单（逐项出 verdict + 落地指令）

- **D1 候选⑤**：KILL vs Part-6 逃生阀升档（R3 最小版）。若升档：确认其四条护栏（默认教义不动/用户 consent 触发/不预填推荐/高杠杆强制单抛）。
- **D2 §3.1 类型闸**：是否按 R2 最小增量落地 plan-agent.md 毕业判准（含/不含 research fan-out 附注）。
- **D3 §3.2 事实源一行**：是否落地 brainstorm Rule 3 事实源补「跑命令/调工具/web 检索」。
- **D4 候选⑥**：确认「记 gap 不动手」+ gap 触发条件措辞 + 理由修正（对质 2）。
- **D5 ④**：确认「不采 branch(b) + 修撤回理由 + churn 富化一行注记（采/不采）」。
- **D6 P3**：渠道不切维持 + 是否新开 gap「roster 三方一致性 strict 校验器」（先核 UNVERIFIED：现有 checker 是否已覆盖）。
- **D7 流程项**：ack 推进至 ed37663c 的口径（哪些算「已裁决」）；靶子 §1 修正；透镜盲点（promotion 追踪）写入哪个真值源（external-skill-scout 协议 or FUSION-RUNBOOK or watcher 注记）。

<!-- FILE_END: 2026-07-23-mattpocock-update-redteam-findings.md -->
