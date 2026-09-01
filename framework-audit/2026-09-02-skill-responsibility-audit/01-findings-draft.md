# Skill 职责归位审计 — 发现草案（待红队复审）

日期 2026-09-02 · 对象 luca_gstack 40 个 office skill / 33 条 project_skills 路由条目
装置：`evidence/probe.mjs` 喂 `ROUTE_GUARD_DRY_RUN=1`，语料 `evidence/corpus.tsv`（133 条），原始输出 `evidence/probe-out.json`

## 装置自证（Phase 0）
- 阳性对照 3/3（写PRD→/brainstorm、做个竞品分析→/ux-research、会议纪要→/idea）
- 阴性对照 2/2（今天天气怎么样 / 解释这个函数 → STOP）
- 变异对照：fixture 删掉 brainstorm 词表 → 仅 P1 翻转，其余不动 ⇒ 装置能区分
- 夹具已知缺陷：fixture root 必须软链 `.claude/commands`，否则 slashless alias 静默失效（首次实测 R-03 假 NONE，已修正后重跑）
- golden 基线：`node scripts/test-route-guard.mjs` = PASS 200 / FAIL 0

## 发现

### F1 拉丁裸词跨词命中（过度命中｜高）
`auto`(w10) / `figma`,`Figma`(w5) / `research`(w6) 是纯拉丁裸串；`normalize()` 去空格后按 `text.includes()` 子串匹配，**无词边界**。
实测（活体 vs fixture 去裸词对照，`evidence/mut.tsv`）：
| prompt | 活体 | 去裸词后 |
|---|---|---|
| 帮我看下 autoload 配置对不对 | SINGLE `/auto` | STOP |
| 这个 CI 的 auto-merge 开关在哪 | SINGLE `/auto` | STOP |
| figma MCP 的 token 怎么配 | SINGLE `/figma-layer` | STOP |
| research 这个词中文怎么翻更好 | SINGLE `/deepresearch` | STOP |
`/auto` 是全系统最高权重（10），误命中直接盖过一切候选。route-guard 源码注释自己承认这一限制（"English substring-in-word is NOT fixed here … deferred to ADR-0005"）。
去裸词的召回代价实测：`auto` 仅损失"帮我 auto 一下"（裸 `auto` 首 token 仍走 slashless alias，R-03 实测保留）；`figma` 损失"把设计稿同步到 Figma"（但该句按 SC-20260610-001 本就**不该**进 figma-layer）。

### F2 CJK 泛词命中（过度命中｜中，不建议直接删）
`调研`→"帮我调研下今天午饭吃什么"=SINGLE `/deepresearch`；同类：`一个功能`(brainstorm)、`PRD`、`技术文档`(tech-spec)、`任务计划`(task-plan)、`代码质量`(code-hygiene)、`落地方案`(design-brief)、`设计方案`(ux-brainstorm)。
**反对删除的实测证据**：fixture 删 `调研` 后，"调研一下这个方案的先例"/"帮我调研竞品的做法" 双双跌为 STOP（`evidence/recall.tsv` R-01/R-02）。误命中代价 < 召回代价 ⇒ 留词，靠语义兜底。

### F3 等权重导致 shadow 规则失效（家族相撞｜中）
`调研`(deepresearch w6) ⊂ `快速调研`(quick_research w6)。shadow 规则要求"更长触发词来自**严格更高**权重的 route"才遮蔽，等权 ⇒ 两者都活 ⇒ MULTI。
实测："快速调研一下就行" → `MULTI_SKILL /deepresearch|/quick-research`。
候选修法实测：quick_research weight 6→7 ⇒ 转 `SINGLE /quick-research`（fixture 验证通过）。
同类记忆在案：SC-20260811-001（用户显式点名 quick-research 仍被粗网带偏）。

### F4 邻接漏字（欠命中｜中）
句中插入「一下 / 这个」即丢命中：
- "评审一下这个页面" → STOP（词表有 `评审这个页面`）
- "帮我读懂这个代码库" → STOP（词表有 `读懂代码库`/`读一下这个代码库`）
- "帮我审查一下当前改动的代码" → STOP（词表要求 `代码审查` 连写）
- "merge 冲突了，帮我处理" → STOP（词表要求 `当前merge冲突`）
- "一次只问一个问题，逐个盘问我" → STOP（词表是 `一次一个问题盘问`）
缓解现状：评审类有 `reviewAxisHint` 钉接住（STOP 分支仍出 R4 指针）；代码/冲突类无钉。

### F5 `刚才/上面/前面` 让路由整体静默（欠命中｜结构性）
`isContinuation()` 含 `CONTEXTUAL_FOLLOWUP_RE`（刚才|上一轮|上面|前面|…）；命中且无关键词命中时 `skillDecision` 返回 **NONE** —— 不是 STOP，**连提示钉都没有**。
实测对照：
- "刚才的工程讨论整理一下" → NONE
- "工程讨论整理一下"（仅删「刚才」） → STOP
`/to-spec` 的招牌语境正是"把**刚才**定下的讨论整理成 spec"，正面落进静默区。

### F6 wayfinder 只有一个英文触发词（欠命中｜中）
triggers = `[wayfinder]`。中文自然表达 "这个工程要跨好几个会话做，路径也不清楚" → STOP。
兜底 `wayfinderAutoPredicate` 需三条同时成立：complexityScore≥6 **且** 多会话正则 **且** fog 正则；实测该句 score=0，且 `跨\s*会话` 不匹配"跨好几个会话"、`路径不清` 不匹配"路径也不清楚" ⇒ 三条全失，兜底永不触发。

### F7 slashless alias 按首个拉丁 token 直呼（设计取舍｜低）
`visibleSlashlessAlias` 只看首 token 是否等于某个 `commands/*.md` 名 ⇒ "grilling 是什么意思"、"implement 这个接口的最佳实践" 直接 SINGLE 到对应 skill。属既定设计（裸首 token 直呼），但对"问这个词是什么"的元问题会误路由。

### F8 code-recon 在编排图中缺席（编排位置｜中）
`optional-workflow-graph.yaml` 全部 scenes（A/B/C/D 的 recommended/engineering/fallback paths）**零次**出现 code-recon ⇒ workflow 模式下永不被推荐。
**注意：早先"下游 architecture_brief 契约悬空"的假设已被证伪** —— input-modes.yaml:108/118/167 确实为 ux-brainstorm/design-brief/tech-spec 接了 `architecture_brief` optional。缺的只是编排推荐面。

### F9 muse-proto-gen 双 harness 登记不对等（低）
CLAUDE.md 零提及，AGENTS.md:750 有登记。实际可达性不受影响：`muse-loop-orchestrate/SKILL.md:171` 以 Agent 冷启动方式 dispatch。属文档不对等，非可达性缺陷。

## 查过且健康（反向记录，防只报坏消息）
- 登记面：`check-routing-map.mjs` SSOT-1..10 PASS、`check-registration-sync.mjs` 30 skill REG-1/2 全绿 0 warn
- 声明四面一致性：需求/研究/代码/规格/界面 5 个高风险家族逐个比对 SKILL.md ↔ CLAUDE.md 表行 ↔ input-modes notes，**未发现职责矛盾**（code-review「委托 code-hygiene Mode D」↔ code-hygiene「Mode D 是 review 权威」等互指自洽）
- 日常对话对照组 10/10 正确落 NONE/STOP，无一误命中
- 正向召回 A 组 90 条中 78 条命中预期 skill
- `muse-x-digest` 非孤儿：frontmatter 自声明"仅由 muse app 注入调用，不进 /office、不进路由"
- `codebase-design` 不在编排图属**自我声明的设计**（"standalone/internal，非节点"），非缺陷
- golden 路由回归 200/200 绿
