# mattpocock/skills 更新对标 — 红队审查靶子（2026-07-23）

> 本文档是红队攻击对象：主线程（编排者）的全部调研结论、分类、裁决、计划与收益声明。
> 每条标注证据等级：**[FACT]**=一手实测（附指针）/ **[INFERENCE]**=有据推断 / **[CLAIM]**=未经实测的声明。
> 红队职责：独立取证 refute，不接受本文档任何未验证转述。

## 0. 带外写入台账（provenance ledger）

本 session 编排者对证据基底的写入：**零**（上游 repo 未动；我方 skill/框架文件未动）。
本 session 编排者产出的非基底文件：3 条记忆（`~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/feedback_premise_first_deep_eval.md` 追加段 / semantic 候选 SC-20260723-001 / episodic EP-20260723-100）+ 本靶子文档。红队在飞期间编排者冻结对证据基底的写入。

## 1. 源头定义

- **审查窗口**：`mattpocock/skills` commit `391a2701`（2026-07-10，上次全量对标 pin，51 单元）→ `ed37663c`（2026-07-21，当前 HEAD）。[FACT: gh api compare 实测，ahead 40+ commits]
- **我方吸收基线**（07-12 首批，GATE-2 批准）：[FACT: `.claude/skill-os/evolution/ADOPTED.md:51-57` + `framework-audit/mattpocock-benchmark-2026-07/ORCHESTRATION-INTEGRATION.md`]
  - install: codebase-design / resolving-merge-conflicts；refresh: tdd→391a2701；personal: teach
  - merge 吸收落点：wayfinder→`plan-agent.md`（fog 概念层）、grilling→`brainstorm/SKILL.md` Rule 3（facts/decisions）、to-tickets→`task-plan/SKILL.md`（竖切+expand-contract+frontier 注记）、improve-codebase-architecture→`code-recon/SKILL.md`（deletion-test 透镜）、to-spec→tech-spec（seam 前置步）、writing-great-skills→skill-authoring.md、domain-modeling→CLAUDE.md 术语 inline、诊断 port→systematic-debugging
- **已裁决静音**：07-15 路径级 ack=`697d4ce9`，**仅覆盖 4 已装单元路径**（tdd/codebase-design/resolving-merge-conflicts/teach，当时该窗口这些路径确实只有 Codex openai.yaml）。[FACT: `installed-pins.yaml:26,37,48,59`]
- **窗口内完整改动面**（排除 `agents/openai.yaml`×N 后 31 文件）：[FACT: gh compare 文件清单已全量拉取]
  - skill 实质改动：`wayfinder/SKILL.md`、`grilling/SKILL.md`、`to-tickets/SKILL.md`、`improve-codebase-architecture/SKILL.md`、`ask-matt/SKILL.md`
  - 新增 skill（均 in-progress bucket）：`batch-grill-me/SKILL.md`、`to-questionnaire/SKILL.md`
  - 发行/接线面：`.claude-plugin/{marketplace,plugin}.json`、`.agents/adr/0002-ship-as-a-claude-code-plugin.md`、`README.md` 安装节、`link-skills.sh`、`.agents/invocation.md`（Codex 双列教义）、`AGENTS.md`（新增，实为 symlink 指向 CLAUDE.md）、`CLAUDE.md`（plugin 同步义务）、`CONTEXT.md`（+Decision ticket 术语）、**7** 个 changeset、**3** 个 bucket README、**5 个 `docs/` 镜像文件**（wayfinder/improve-codebase-architecture/grill-with-docs/grill-me/grilling 的 aihero.dev 文档镜像，内容为已分析 SKILL 改动的复述）。[修正 2026-07-23 红队 R1：原版漏列 5 docs 镜像、changeset 计 6 实 7、bucket README 计 4 实 3（两错相抵曾被总数核对掩盖）；「全部 patch 已直读」降级为「31 文件经 R1 独立复核后全量核对」。另 R1 的 F4（implement 窗口内转正）经判官核验为错误实例——转正早于窗口，透镜盲点仅作一般流程改进记入 BENCHMARK-RUNBOOK 步①补注]

## 2. 问题定义

- **P1**：窗口内演进是否修正/推翻我方 07-12 吸收物？（血统级对标）
- **P2**：净新增单元（batch-grill-me / to-questionnaire）是否值得采？计划描述与收益声明是否成立？
- **P3**：发行渠道 plugin 化如何处置？
- **P4**：ack/SSOT 如何推进？

## 3. 编排者裁决（靶子主体）

### 3.1 血统① wayfinder→plan-agent：裁决 no-op
- [FACT] 我方吸收文本健在：`plan-agent.md:322-329`（destination/fog/frontier 三词+毕业判准「能否现在精确陈述问题」；当时刻意不引 tracker/单票上限/name-not-ID）
- [FACT] 上游三改动：decision-ticket 正名（changeset：用户总把决策票误读成执行票）/ research 票改 subagent 并行烧（charting session 直接 fan-out，单票纪律的唯一例外）/ ask-matt 增「wayfinder=最重流程勿滥用；收图交 to-spec 勿直奔 implement」
- [INFERENCE] research 并行=我方编排层原生已有；「收图交 spec」=我方 brainstorm→design-brief→tech-spec 链天生如此；均无增量
- [INFERENCE] 唯一有价值碎片：我方毕业判准把 fog 一律毕业成「任务/U-block」（执行单元），未分流「待裁决问题 vs 待执行任务」——上游正名针对的正是这个混淆。但我方有 HITL 卡点兜底，属锦上添花，暂不动

### 3.2 血统② grilling→brainstorm：裁决 no-op
- [FACT] 我方 Rule 3 现文：「能查到的事实（代码库/文档/已有研究可得）自己查」（`brainstorm/SKILL.md:133-141`）
- [FACT] 上游把事实源从 codebase 放宽到 environment(filesystem/tools)；scope 从 plan/design 放宽到 plan/decision/idea；design tree→decision tree 改词
- [INFERENCE] 我方事实源表述已较宽，新放宽无实质增量；scope 放宽不适用（brainstorm 固定 PRD 语境）；改词纯措辞

### 3.3 血统③ to-tickets→task-plan：裁决 no-op（我方更强）
- [FACT] 我方吸收文本健在：`task-plan/SKILL.md:213-228`（frontier 注记+竖切三判准+expand-contract 卡型）
- [FACT] 上游仅删一行冗余尾巴「Work the frontier one ticket at a time with /implement」
- [INFERENCE] 我方 frontier 注记本就写「可并行起」（当时刻意与其单票纪律反向），上游删行与我方无冲突

### 3.4 血统④ improve-codebase-architecture→code-recon：新增 YAGNI 热点定界，裁决**不采**（撤回首轮推荐）
- [FACT] 我方 deletion-test 透镜健在：`code-recon/SKILL.md:127-131`
- [FACT] 上游新增：用户未点名方向时走 `git log` 找热点区，注意力优先压最近在动的地方；理由「深化在还在变的地方才回本」
- [INFERENCE] 撤回理由：该理由属**维护语境**（improve-codebase-architecture=periodic maintenance）；我方 code-recon 是**设计侦察**语境（注意力跟设计意图走，Phase 0 已强制问范围+意图）；episodic 中 code-recon 仅 2 次使用、无一次「没给范围导致扫偏」的实证返工
- [CLAIM] 首轮推荐「成本低顺手采」是 over-claim（「成本低」冒充「有需求」）——红队可反攻本撤回是否过度矫正

### 3.5 候选⑤ batch-grill-me → brainstorm Rule 3 frontier 批轮：裁决**采（有界版）**
计划描述：仅改 `brainstorm/SKILL.md` Rule 3 一处——frontier 批轮：同轮仅收前提已定、相互独立的问题，≤4 题/次 AskUserQuestion，每题给推荐答案；有依赖的留后轮；高杠杆取舍（会锚定后续所有问题的）仍单抛；事实类问题派 subagent 查、不阻塞本轮。
- [FACT] 上游 batch-grill-me 全文已直读（frontier=前提已定的问题集；轮间重算；事实 subagent 不阻塞；in-progress bucket 未转正；其 promoted 的 grilling 仍逐题+「Asking multiple questions at once is bewildering」教义并存）
- [FACT] 我方 Rule 3「One question at a time…Never batch」自 2026-05-26 baseline 即存在（git -S 实测）——**原生教义非吸收物**，改它=改自家教义
- [FACT] AskUserQuestion 单次 ≤4 题、每题结构化选项+推荐值（工具 schema）
- [INFERENCE] 痛点实证：brainstorm 实跑一次=10 轮串行问答（研究情报官 PRD 实录，**样本 n=1**）；luca 有「例行决策直接跑、不过度请示」的反打断偏好记忆
- [CLAIM] 批轮可把 10 轮压至 3-4 轮、HITL 延迟砍 60%+——**未经实测的估算**
- [CLAIM] 结构化 UI 消解 bewildering——环境论证，无实测
- [已知反方] 批问或致每题思考变浅；上游自己未转正；luca 的反打断偏好源自**执行层请示**语境，迁移到他主动选择的**拷问 HITL** 语境可能不成立（红队重点）

### 3.6 候选⑥ to-questionnaire → research-kit 决策问卷卡型：裁决**采（卡型级）**
计划描述：`research-kit/SKILL.md` 加一个卡型段（几十行）：grill-the-send 手法（只问「发给谁/要拿回什么」）+ 异步单程模板（最重要排前/答案 stub/why-this-matters/收尾 catch-all）。不动路由、不动 /office。
- [FACT] 上游 to-questionnaire 全文已直读（in-progress bucket）
- [FACT] 我方 research-kit 问卷卡型仅覆盖定量用户研究（多少人/分布/Likert，`research-kit/SKILL.md:52-63`）；「单收件人决策问卷」无覆盖
- [FACT] research-kit 07-21 刚建，episodic 零使用记录
- [INFERENCE] 链位价值：brainstorm 逼问撞到「luca 也答不了、答案在他人脑中」时今天只能搁置或猜——**无一例实证，纯前瞻推演**（红队重点）
- [CLAIM] 收益=PRD 前提缺口第三出口（自查事实/问 luca 决策/问卷给知识持有者）；若场景不存在收益为零
- [待裁] 落法二选一未定：卡型进 SKILL.md 正文 vs 按 SC-20260721-002 判据②走 references 底料吸收

### 3.7 P3 plugin 化：裁决**不切渠道**
- [FACT] 上游自建单 plugin marketplace（README 明示两哲学：skills.sh copy-and-hack vs plugin 订阅只读自动更新）
- [INFERENCE] 我方 pin+watcher+FUSION 受控刷新正是为防插件静默自动升级建的（superpowers 5.1→6.1 无人察觉 37 天为立项实证）；切 plugin=拆控制层
- [FACT] 已装 4 单元路径在窗口内除 openai.yaml 零改动（无被动刷新风险）

### 3.8 P4 ack/SSOT 推进（待共识后随规划落）
- 4 已装单元 ack 从 `697d4ce9` 推进至 `ed37663c`（本轮已裁决版本静音）；采纳项走 FUSION 步⑨ 回写（vetting-registry append / ADOPTED.md / adoption-log；⑤⑥非 install 而是 merge 吸收，不动 installed-pins units）

## 4. 红队分工

- **R1 分类完整性**：独立拉 `391a2701...HEAD` compare，验证 §1 改动面清单穷尽性与 §1「发行/接线面=对我方 noise」归类；找编排者漏掉或误归类的实质改动
- **R2 血统 no-op**：refute §3.1-3.3 三条 no-op 裁决（直读我方落点文件+上游 diff，不信本文档转述）
- **R3 候选⑤**：refute §3.5 全部 [INFERENCE]/[CLAIM] 与计划描述（含：改原生教义的正当性、n=1 痛点、偏好记忆语境迁移、60% 收益声明、有界版设计是否自洽、与 Rule 4/5/6 及 Oracle 环节的相互作用）
- **R4 候选⑥+④撤回+P3**：refute §3.6（前瞻需求真伪、卡型 vs references 落法、对 research-kit 三不产边界的影响）、§3.4 撤回是否过度矫正、§3.7 不切渠道是否遗漏可取物

裁决收口：fable 判官综合 R1-R4 与编排者回应，逐项 verdict（stands/overturned/modified），形成共识稿。

<!-- FILE_END: 2026-07-23-mattpocock-update-review.md -->
