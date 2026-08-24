# mattpocock/skills 更新对标 — 红队审查靶子（2026-08-07）

> 本文是 W⑥ 红队攻击对象，不是最终结论。窗口、枚举、谱系、need-first 与双 harness
> 预审已完成；所有判断按 **[FACT] / [INFERENCE] / [CLAIM]** 标注。红队必须独立回源，
> 不得把本文转述当证据。

## 0. 带外写入台账（provenance ledger）

- [FACT] 上游只读副本位于 `/private/tmp/mattpocock-skills.Pu2IUz/repo`；未修改上游 repo。
- [FACT] 在本靶子落盘前，未修改 luca_gstack 的 skill、hook、agent、workflow、registry、pin 或运行时行为文件。
- [FACT] 本 session 因 luca 明确纠正产生：原始观察 `O-20260807-001`、框架级 semantic candidate
  `SC-20260807-001`；错误创建的 `office` 局部 active rule 已撤回，未留在 `rules.yaml`。
  Stop hook 另写入 meta episode `EP-20260807-124`。
- [FACT] 会话开始前已有未跟踪的 `.claude/.kit-relay-shown-2026-08-04` 至 `-08-07` 与
  `app.js`，均不属于本轮、未触碰。Stop hook 另创建本 session 的 `.episode-written-*` marker。
- [FACT] 自本文落盘起，编排者冻结证据基底；后续只允许新增红队票与终审共识稿，不得边审边改被审行为。

## 1. 源头定义与窗口完整性

### 1.1 基线与 HEAD

- [FACT] registry 唯一起点：`.claude/skill-os/evolution/benchmark-registry.yaml` 的
  `last_review.reviewed_commit = ed37663cc5fbef691ddfecd080dff42f7e7e350d`，证据指向
  `framework-audit/2026-07-23-mattpocock-update-consensus.md`，可达。
- [FACT] 上游 HEAD：`84fdeffd12f2ee307994d1eb6feb48173b6e0502`，提交时间 2026-08-06，
  MIT license；窗口严格为 `ed37663c..84fdeffd`。
- [FACT] base 是 HEAD ancestor；窗口 `106` commits，first-parent `28`。release 分支合并造成重复
  patch commits，能力不得按 commit 数重复计数。
- [FACT] 净文件宇宙：**99 unique files = M54 + A12 + D28 + R5**；二进制 0、未读 0。
- [FACT] direct-read coverage：**99/99**。所有 A/D/R 均读新旧 blob；所有存活 SKILL、reference、
  script、root contract 均读 patch；docs/changeset/release 读后才归类。

### 1.2 W② 五桶穷尽清单（20 + 26 + 4 + 31 + 18 = 99）

#### A. 根契约、安装、发行与 changeset（20）

`M .agents/adr/0002-ship-as-a-claude-code-plugin.md`  
`A .agents/install-block.md`  
`M .agents/writing-docs.md`  
`D .changeset/ask-matt-wayfinder-guidance.md`  
`D .changeset/codex-skill-metadata.md`  
`D .changeset/friendlier-setup-and-local-tickets.md`  
`D .changeset/grilling-general-use.md`  
`D .changeset/prototype-primary-source.md`  
`D .changeset/ship-as-claude-plugin.md`  
`D .changeset/wayfinder-decision-tickets.md`  
`D .changeset/wayfinder-research-subagents.md`  
`D .changeset/yagni-scope-improve-architecture.md`  
`M .claude-plugin/plugin.json`  
`M .github/workflows/release.yml`  
`M CHANGELOG.md`  
`M CLAUDE.md`  
`M CONTEXT.md`  
`M README.md`  
`M package.json`  
`A scripts/sync-plugin-version.mjs`

#### B. 人类 docs pages（26）

`M docs/engineering/ask-matt.md`  
`M docs/engineering/code-review.md`  
`M docs/engineering/codebase-design.md`  
`M docs/engineering/diagnosing-bugs.md`  
`M docs/engineering/domain-modeling.md`  
`M docs/engineering/grill-with-docs.md`  
`M docs/engineering/implement.md`  
`M docs/engineering/improve-codebase-architecture.md`  
`M docs/engineering/prototype.md`  
`M docs/engineering/research.md`  
`M docs/engineering/resolving-merge-conflicts.md`  
`M docs/engineering/setup-matt-pocock-skills.md`  
`M docs/engineering/tdd.md`  
`M docs/engineering/to-spec.md`  
`M docs/engineering/to-tickets.md`  
`M docs/engineering/triage.md`  
`M docs/engineering/wayfinder.md`  
`A docs/engineering/wizard.md`  
`M docs/productivity/grill-me.md`  
`M docs/productivity/grilling.md`  
`M docs/productivity/handoff.md`  
`M docs/productivity/teach.md`  
`A docs/productivity/to-questionnaire.md`  
`A docs/productivity/wait-what.md`  
`A docs/productivity/writing-for-agents.md`  
`D docs/productivity/writing-great-skills.md`

#### C. Bucket 索引（4）

`M skills/deprecated/README.md`  
`M skills/engineering/README.md`  
`M skills/in-progress/README.md`  
`M skills/productivity/README.md`

#### D. 存活能力、reference、script、promotion/rename（31）

`A skills/engineering/ask-matt/PHASE-BOUNDARIES.md`  
`M skills/engineering/ask-matt/SKILL.md`  
`M skills/engineering/code-review/SKILL.md`  
`M skills/engineering/codebase-design/DESIGN-IT-TWICE.md`  
`M skills/engineering/diagnosing-bugs/SKILL.md`  
`M skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh`  
`M skills/engineering/improve-codebase-architecture/SKILL.md`  
`M skills/engineering/prototype/LOGIC.md`  
`M skills/engineering/prototype/SKILL.md`  
`M skills/engineering/setup-matt-pocock-skills/SKILL.md`  
`M skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md`  
`M skills/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md`  
`M skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md`  
`M skills/engineering/tdd/SKILL.md`  
`M skills/engineering/to-spec/SKILL.md`  
`M skills/engineering/triage/SKILL.md`  
`M skills/engineering/wayfinder/SKILL.md`  
`R078 skills/in-progress/wizard/SKILL.md → skills/engineering/wizard/SKILL.md`  
`R069 skills/in-progress/wizard/agents/openai.yaml → skills/engineering/wizard/agents/openai.yaml`  
`R091 skills/in-progress/wizard/template.sh → skills/engineering/wizard/template.sh`  
`M skills/in-progress/claude-handoff/SKILL.md`  
`M skills/in-progress/loop-me/SKILL.md`  
`M skills/productivity/grilling/SKILL.md`  
`M skills/productivity/grilling/agents/openai.yaml`  
`R100 skills/in-progress/to-questionnaire/SKILL.md → skills/productivity/to-questionnaire/SKILL.md`  
`R100 skills/in-progress/to-questionnaire/agents/openai.yaml → skills/productivity/to-questionnaire/agents/openai.yaml`  
`A skills/productivity/wait-what/SKILL.md`  
`A skills/productivity/wait-what/agents/openai.yaml`  
`A skills/productivity/writing-for-agents/SKILL-MECHANICS.md`  
`A skills/productivity/writing-for-agents/SKILL.md`  
`A skills/productivity/writing-for-agents/agents/openai.yaml`

#### E. 删除/被吸收能力资产（18）

`D skills/deprecated/design-an-interface/SKILL.md`  
`D skills/deprecated/design-an-interface/agents/openai.yaml`  
`D skills/deprecated/qa/SKILL.md`  
`D skills/deprecated/qa/agents/openai.yaml`  
`D skills/deprecated/request-refactor-plan/SKILL.md`  
`D skills/deprecated/request-refactor-plan/agents/openai.yaml`  
`D skills/deprecated/ubiquitous-language/SKILL.md`  
`D skills/deprecated/ubiquitous-language/agents/openai.yaml`  
`D skills/in-progress/batch-grill-me/SKILL.md`  
`D skills/in-progress/batch-grill-me/agents/openai.yaml`  
`D skills/personal/README.md`  
`D skills/personal/edit-article/SKILL.md`  
`D skills/personal/edit-article/agents/openai.yaml`  
`D skills/personal/obsidian-vault/SKILL.md`  
`D skills/personal/obsidian-vault/agents/openai.yaml`  
`D skills/productivity/writing-great-skills/GLOSSARY.md`  
`D skills/productivity/writing-great-skills/SKILL.md`  
`D skills/productivity/writing-great-skills/agents/openai.yaml`

### 1.3 生命周期与真值源质量

- [FACT] promoted SKILL 数 `22 → 25`，plugin manifest `22 → 25`，二者在 HEAD 完全一致；全仓
  SKILL 数 `41 → 35`。
- [FACT] `wizard` 从 in-progress 升 engineering，之后解除 model-invocation 禁令；
  `to-questionnaire` 以 R100 升 productivity、body 0 diff、仍 user-invoked；`wait-what` 窗口内新增
  后升 productivity、仍 user-invoked；`writing-great-skills` 被 breaking replace 为
  `writing-for-agents`，无 alias；`batch-grill-me` 删除且行为并入 promoted `grilling`。
- [FACT] 四个 deprecated 与两个 personal skill 被删；commit body 给出的吸收关系是
  `ubiquitous-language→domain-modeling`、`design-an-interface→codebase-design/DESIGN-IT-TWICE`、
  `qa→triage+to-tickets`、`request-refactor-plan→to-spec+improve-codebase-architecture`。
- [FACT] 上游 HEAD 存在三处 docs↔能力真身冲突：diagnosing 页面仍称 redaction 未实现；
  codebase-design 页面仍称写死 Agent tool；wizard 页面仍称显示 time remaining，而对应 SKILL/reference/
  template 已相反。
- [INFERENCE] 本轮能力事实必须以 SKILL/reference/script 为准，不能以页面或 CHANGELOG 单独定案。

## 2. 问题定义

- **P1 血统：** 上游变化是否推翻或要求同步 07-12/07-23 的 install、merge、reject、gap？
- **P2 需求：** 新增/转正能力是否解决 luca_gstack 已出现的问题，还是供应侧成熟度冒充本地需求？
- **P3 双端：** 每个拟采项在 Claude Code 与 Codex 的触发、执行、降级、验证是否分别闭合？
- **P4 安全：** secret、外部写、项目路径、自动触发是否引入不可逆或越权风险？
- **P5 出口：** 哪些进入握手 Plan，哪些只留 trigger，哪些应永久/no-op 静音？

## 3. 编排者初裁（红队靶子）

### C1. `tdd → codebase-design`：**BLOCK 直接 refresh；建议成对适配后再采**

- [FACT] 上游 tdd 新增条件指针：当 interface shape/module depth/seam placement 自身未定时，咨询
  `codebase-design`；本地 `~/.agents/skills/tdd` 无该行。
- [FACT] 本地 tdd 位于 `~/.agents/skills`，Claude 由 `~/.claude/skills/tdd` 软链共享，Codex catalog
  可见；但 codebase-design 只存在于 `~/.claude/skills/codebase-design`，Codex catalog 不可见。
- [FACT] 上游文字使用 `/codebase-design`；Codex 不执行 Claude slash。窗口内 codebase-design 只把
  “using the Agent tool” 改为 harness-neutral “Spawn 3+ sub-agents”，不等于实现 Codex dispatch。
- [INFERENCE] 单独 refresh tdd 会制造 Claude 可达、Codex dangling 的依赖，违反
  `SC-20260807-001`。最小可行顺序是：先把 codebase-design 迁到共享 `.agents/skills` 并保留 Claude
  软链，再同步 harness-neutral reference，最后把 tdd 的 slash 指针改为共享 skill/reference 语义。
- [CLAIM] seam 未定时自动加载 vocabulary 会改善测试边界质量；本地尚无失败样本，必须靠双端活体
  fixture 验证，不能以 catalog 可见代替。

### C2. `diagnosing-bugs` secret redaction：**RECOMMEND 窄移植到既有 systematic-debugging**

- [FACT] 上游新增执行前置 Redact：命令、输出、capture artifact 先脱敏；credential 留 env；只引用
  HAR/auth headers 中携带诊断信号的行；不足时明确询问。
- [FACT] 本地 `~/.agents/skills/systematic-debugging/SKILL.md` 无通用 redaction 契约，却包含
  `env | grep IDENTITY` 等可能把值打印到 transcript 的诊断例；Claude 软链与 Codex 均消费该共享 skill。
- [FACT] installed-pins 将该单元标为 local_mods，refresh 必须 merge、不得覆盖；本地 handoff 的脱敏
  仅覆盖持久文档，不能保护 raw tool output/commentary。
- [INFERENCE] 这是本轮最强的安全增量；只移植原则与 canary 验收，不新建第二个 debug skill，不照搬
  会原样 capture 的 HITL 脚本。
- [CLAIM] 单加 prose 即可阻止泄漏是不可接受的声明；必须在 Claude/Codex 各跑一次伪 secret canary。

### C3. `writing-for-agents`：**RECOMMEND 两条窄 merge，不安装整 skill**

- [FACT] 本地 `.claude/skill-os/skill-authoring.md` 已覆盖 context/cognitive load、leading words、
  hierarchy、completion、negation/no-op/sprawl、pruning；上游大部分是 no-op。
- [FACT] 真正新差值是：适用对象从 skill 扩为所有 agent-consumed docs；environment 是 SSOT，文档
  复述只是有维护成本的 cache，只缓存 agent 无法便宜重获的事实。
- [FACT] 本仓已有跨文件漂移实证：magicpath 路由展示漏同步、registration checker 首战捕获
  code-recon 漏登记；本轮上游自身亦出现三处文档漂移。
- [INFERENCE] 将这两条写回既有 authoring doctrine 比安装新 skill 更薄，且直接强化已有 pointer-first
  架构；上游 invocation/frontmatter 机制不得原搬。
- [CLAIM] 两条规则会减少后续漂移，仍需用 authoring A/B 与现有 checker 验证，不以文档存在判完成。

### C4. logic HTML prototype：**DEFER；只提 gap trigger，不并入重型 UI 原型默认路由**

- [FACT] 上游把 terminal TUI 改为单文件 HTML/CSS/JS：纯逻辑模块与 DOM 隔离、free-play buttons、
  guided scenario tabs、happy/edge/illegal actions，可双击分享。
- [FACT] 本地 html-prototype 已有单文件 HTML、状态切换与 QA，但定位是产品/UI 设计交付，固定
  `docs/prototype/`、framework 母版与 traceability；没有“只验证业务状态机、不要视觉”的轻分支。
- [INFERENCE] 这是独立 capability sliver，但直接 graft 会把 throwaway/skip-polish 语境带进本地精修链。
  只有出现真实“先验证状态机/业务规则、非视觉”任务时，才重审独立 logic-demo reference/模式。
- [CLAIM] 现在新增模式会被复用，无本地实发证据；最多形成 gap 提案，不能动手。

### C5. `grilling` whole-frontier rounds：**REJECT，07-23 KILL 继续成立**

- [FACT] 上游已把旧 batch-grill-me 行为并入 stable grilling；因此 07-23 裁决中“作者选择逐题版”这条
  供应侧反证失效，必须诚实重开血统检查。
- [FACT] 本地重启条件是 ≥2 次真实 Phase-3 用户不耐烦且 Part-6 narrow-to-2 未解痛；本轮没有新增
  一次，更未达两次。本地逐题、sharpening、防 premature synthesis 与 escape hatch 仍承重。
- [INFERENCE] 上游转正不改变本地需求分母；批轮在 Codex 结构化提问上还受 1–3 短题 schema 约束。
- [CLAIM] rounds 可显著降延迟仍无本地 A/B；维持 KILL，保留原重启触发器。

### C6. `to-questionnaire` graduation：**DEFER；程序重开、采纳 gate 仍关**

- [FACT] 上游 R100 升为 stable productivity、body 0 diff；成熟度不确定性下降。
- [FACT] 本地 `GAP-decision-questionnaire` 的明确触发是第一次真实出现“luca 要把待决递给具名知识
  持有者”；目前只有近似实例，没有真实递出。
- [INFERENCE] graduation 足以重开复审，不足以替代本地消费证据；触发后它应是独立沟通制品，不能
  稀释 research-kit 的“三不产”。
- [CLAIM] 现在新增入口会被使用，无证据，故继续 defer。

### C7. `wizard`：**REJECT 当前版；设重启条件，不因转正自动安装**

- [FACT] wizard 已升 engineering 并解除 model-invocation 禁令；会生成 Bash，打开 URL，写 `.env`、
  GitHub secret/variable。template `bash -n` 通过，但无逐写确认、备份/回滚、gitignore preflight，raw
  newline 可破坏 env；`shellcheck` 本机不可用。
- [INFERENCE] credential/cutover 自动触发与本地人类门、危险操作门冲突。只有 ≥2 次真实重复手工配置
  需求后才重审，且本地版本必须 user-invoked、逐写确认、mock 外部系统、取消零变更。
- [CLAIM] upstream 所称 delightful/idempotent 不构成安全证明。

### C8. `ask-matt` phase-boundary tree：**REJECT 直接移植；局部原则 no-op**

- [FACT] 上游树硬编码 Continue→`/clear`→`/handoff`→Subagent→`/compact`、约 150k smart zone，并把
  handoff 收窄为 portability。
- [FACT] 本地 Claude 契约明确原生 auto-summary、不再建议 `/compact`；workflow handoff 是 durable
  mandatory artifact。Codex 不执行这些 Claude slash，且自动 compaction 由 harness 管理。
- [INFERENCE] “只在 phase boundary 选择；下一阶段需要 primary source 就继续”是可跨端的不变量，
  但本地 checkpoint/handoff 纪律已覆盖；整树移植会退化。

### C9. `wait-what`：**REJECT 独立 skill**

- [FACT] 最终 body 只有要求重述上一消息、补上下文、用 ASD-STE100、复用 CONTEXT vocabulary；仍
  user-invoked。
- [FACT] 本地 office voice 已要求 direct/concrete/no fluff；用户说“没懂/说人话”本身就是充分触发，
  无需新注册面。
- [INFERENCE] 新入口增加 cognitive/routing load；ASD-STE100 也不能直接等同中文可理解性。

### C10. 其余窗口：**NO-OP / NO ACTION**

- [FACT] harness-neutral subagent 措辞是好方向，但除 C1 的已装 codebase-design 外，不自动证明任意
  skill body 已有 Codex dispatch；按候选需要逐一适配。
- [FACT] 删除的四个 deprecated、两个 personal 无本地 installed/adopted counterpart；无需本地删除。
- [FACT] setup/to-spec/claude-handoff 的 PRD→spec 清理、wayfinder 格式、页面四段式、plugin/version/
  release automation 均无本轮独立行为增量。
- [FACT] plugin 自动更新渠道仍与本地 pin+watcher+FUSION 控制层冲突，维持不切渠道。

## 4. 双 harness 阻断矩阵（每个拟议面必须分别闭合）

| 候选 | Claude Code：触发 / 执行 / 降级 / 验证 | Codex：触发 / 执行 / 降级 / 验证 |
|---|---|---|
| C1 tdd↔codebase | seam/interface 未定时触发；加载共享 reference、不启动无关 slash session；缺 reference 则停该分支；真 Claude TDD fixture 证明已读 vocabulary | `$tdd` 同语义触发；先让 codebase-design 进入 `.agents/skills` 并用中性指针；当前缺失则 BLOCK；catalog + nested-load + subagent 行为活测 |
| C2 redaction | 每次 debug 取证前触发；源头过滤、env 传 credential；信息不足则申请更窄观测；伪 AWS/GitHub/Bearer/cookie canary，查 raw output/transcript/artifact | 自然调试或 `$systematic-debugging` 即触发；命令构造与 commentary 前清洗；沙箱不够则索取已脱敏产物；同一 canary 跑真实 Codex tool path |
| C3 authoring | 改 agent-consumed docs 时触发；沿本地 authoring/registration 链执行；hook 不可用则依 CLAUDE 明文；A/B + routing/registration checker | AGENTS 语义与 `$skill` 触发；读同一 doctrine，不套 Claude frontmatter；链接缺失则 NEEDS_CONTEXT；Codex A/B + link/route fixture |
| C4 logic demo | 仅真实“验证逻辑非视觉”触发；独立模式、纯模型+free-play/scenario；无 browser 则标未交互；状态转移 oracle+DOM 隔离+用户判定 | 同语义触发、不得把 `/prototype` 当入口；apply_patch 到 pinned 项目并浏览器走查；无 pin 拒写；Codex 浏览器活测+非法转移用例 |
| C5 rounds | 仅旧重启门满足且用户同意；AskUserQuestion frontier；Agent 缺失则主线程查；两次真实 A/B | 同门槛；request_user_input 受 1–3 短题限制并重算 frontier；无 widget 则逐题纯文本；Codex transcript 审计，S7 不算行为证据 |
| C6 questionnaire | 用户明确递给具名 X 且要拿回 Y；两个人类门后写受保护项目路径；无 widget 纯文本停等；coverage/schema/routing 行为样例 | 自然语义或未来 `$to-questionnaire`，不可宣称 slash；request_user_input/apply_patch 绝对 pin 路径；无 pin 拒写；S7+route fixture+真实路径探针 |
| C7 wizard | 只许用户明确要求重复向导；用户在自身终端运行，逐外部写确认；无 GUI/gh/TTY 改手工；bash-n/shellcheck/mock/rollback | 自然语义或未来 `$wizard`，永不自动 credential trigger；只生成脚本不代跑真实账户；无授权只产计划；同一 mock + escaping/path/rollback 测试 |
| C8 phase tree | phase boundary 才评估；需要原文则继续，压缩先 checkpoint；slash 不可用则新 session/handoff；新会话恢复演练 | 不以 slash 为入口；继续或文件 handoff，compaction 交 harness；无 pin 则文本报告；新 Codex session 恢复目标/决策/风险/下一步 |
| C9 wait-what | 普通“没懂”反馈直接重述；沿项目词汇；无 CONTEXT 用用户原词；用户能复述下一步即验收 | 同样直接改写，不建 `$wait-what`；摘要丢失则只问一个阻塞问题；以用户理解而非 discoverability 验收 |

[FACT] `.codex/hooks.json`、named TOML agents、workflow-runner 只能证明各自接线，不证明上述任何
semantic behavior。`verify-codex-wiring` 的发现/档位/runner 断言也不能替代候选活体测试；其所谓静态段
会短暂创建/删除 probe 与 session 文件，本轮 strict read-only 阶段未运行。

## 5. 红队分工

- **R1 — census/lifecycle/source quality：** 独立重建 99 文件宇宙，攻击 99/99、五桶、promotion、
  capability/noise 边界与三处页面漂移；寻找漏掉的实质能力或把 base 前变化误算进窗口的地方。
- **R2 — lineage/need-first：** 逐项 refute C1/C3/C4/C5/C6/C8/C9；必须直读本地落点、07-23 裁决与
  gap trigger，重点攻击“sync-needed 是否等于有需求”“gap 是否值得开”“no-op 是否遗漏增量”。
- **R3 — dual-harness/security：** 逐项 refute C1/C2/C7 及 §4；分别核 Claude/Codex trigger、execute、
  degrade、verify，攻击任何用发现性代替行为验证、用 prose 代替防泄漏、用 mock 代替真实外部风险的声明。

终审必须在 R1-R3 全部回票后串行进行，亲裁编排者与红队对质点，允许 NEW FINDINGS。终审输出只形成
握手 Plan；未经 luca 确认，不执行融合、不更新 registry/pins/ADOPTED/adoption-log/CHANGELOG。

<!-- FILE_END: 2026-08-07-mattpocock-update-review.md -->
