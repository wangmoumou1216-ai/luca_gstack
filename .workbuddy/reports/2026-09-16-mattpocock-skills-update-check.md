# Matt Pocock Skills 溯源识别与上游更新核查报告

> 日期：2026-09-16（**v4 自审版**，13:00）
> 核查对象：`mattpocock/skills`（GitHub，MIT）
> 上游 HEAD：`959a8e9`（2026-09-15，"Merge pull request #1083 …retro/deterministic-checks"）
> 核查方式：本地识别 + 上游仓库全量 clone + 2 名并行审查 subagent + 1 名监督 subagent（v1）→ 补查 4 个安装位（v2）→ 终审审查员全量复核 + 终审监督员抽查 + misc 目录补撞（v3）→ **对结论本身做全链自审：teach 判定复核、103 条未合并分支扫描（v4）**
> 本报告落位：`.workbuddy/reports/`（WorkBuddy 层产物，未触碰框架目录）
>
> **v4 自审记录（对 v3 结论的再检验，两处补强）**：
> ① teach"仅机械性"判定复核成立——aa024cb..HEAD 的 SKILL.md 全部 5 处 -/+ 成对变更逐一核对，4 处为 em-dash 标点替换、1 处为 `— anything…` → `, and anything else…` 的措辞展开，无语义变化。
> ② **v1–v3 存在一个共同的严谨性盲区：全部核查只看了 `origin/main`，未扫描 103 条未合并分支。** v4 已补扫：9 个 engineering 跟踪面 + 3 个 productivity 跟踪面（grilling/handoff/teach）× 103 分支全量对撞。结果：**跟踪面相关的新增工作仅存在于 3 条分支**（详见第六节），全部是未合并的实验/重构方向，其中 `wayfinder/research-inline`（7-13）的 research-inline 模式与本地 quick-research 的设计**已经合流**，对 Luca 无同步必要。执行简报的目标 SHA 不变。

---

## 一、识别结果：luca_gstack 中源自 mattpocock/skills 的 skill 对应表

依据三重证据交叉确认：① 各 skill 的 LICENSE（Copyright Matt Pocock，MIT）；② SKILL.md / PROVENANCE.md 中的上游锚点声明；③ `framework-audit/2026-08-30-mattpocock-six-skills-integration/SOURCE-MANIFEST.tsv` 冻结清单。

| # | 本地 skill（.claude/skills/office/） | 上游对应 | 上游锚点 | 采纳方式 |
|---|---|---|---|---|
| 1 | `code-review` | `skills/engineering/code-review` | `6654f6b`（2026-08-24） | Luca 适配（facade，复用 code-hygiene Mode D + R4） |
| 2 | `codebase-design` | `skills/engineering/codebase-design` | `6654f6b` | Luca 适配（保留 Module/Interface/Depth/Seam 词汇体系） |
| 3 | `diagnosing-bugs` | `skills/engineering/diagnosing-bugs` | `6654f6b` | Luca 适配 + 合并 legacy `systematic-debugging`，含 PROVENANCE.md |
| 4 | `implement` | `skills/engineering/implement` | `6654f6b` | Luca 适配（thin facade → Plan Agent / Orchestrator） |
| 5 | `resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` | `6654f6b` | 安全化改编（剥离上游自动冲突完成等行为） |
| 6 | `to-spec` | `skills/engineering/to-spec` | `6654f6b` | Luca 适配（facade → tech-spec synthesis mode） |
| 7 | `wayfinder` | `skills/engineering/wayfinder` | `6654f6b` | Luca 适配（facade → Plan Agent wayfinder mode） |
| 8 | `grilling` | `skills/productivity/grilling` | `6654f6b` | Luca 适配（一次一问决策树） |
| 9 | `handoff` | `skills/productivity/handoff` | `6654f6b` | Luca 适配（会话交接 → 系统临时目录） |
| 10 | `quick-research` | `skills/engineering/research` | `391a2701`（2026-07-10） | 对标反向红队复活采纳（primary 纯度 + 单后台 agent + 单文件落盘） |
| 11 | `code-hygiene`（铁律内核） | 出处标注为 "mattpocock/skills prove-it-bites" | —（2026-07-12 标注） | 仅借鉴「完成前验证」内核思想 |
| 12 | `references/handoff-protocol.md` | mattpocock handoff（脱敏条款） | —（2026-07-12 增） | 条目级借鉴（GATE-2 例外批准） |

### v2 新增对应（#13–#17，用户质询后补查发现）

识别依据：与上游文件字节级比对（无 LICENSE/锚点标注的用户级安装，靠内容 match 定位安装版本）。

| # | 本地位置 | 上游对应 | 安装锚点（字节 match 实测） | 存在形态 |
|---|---|---|---|---|
| 13 | `~/.agents/skills/tdd` + `~/.claude/skills/tdd`（软链） | `skills/engineering/tdd` | `bd453a6`（2026-07-03） | **原样安装**（SKILL.md/tests.md/mocking.md 三文件，无本地改编） |
| 14 | `~/.claude/skills/teach` | `skills/productivity/teach` | `aa024cb`（2026-06-17） | **原样安装**（5 个 FORMAT/SKILL 文件） |
| 15 | muse 项目 `.claude/skills/office/to-tickets` | `skills/engineering/to-tickets` | `3216582`（2026-08-19，SKILL.md 自标注） | Luca 适配 |
| 16 | muse 项目 `.claude/skills/office/wait-what` | `skills/productivity/wait-what` | `5c89081`（2026-08-19，SKILL.md 自标注） | Luca 中文适配 |
| 17 | muse 项目 `.claude/skills/office/writing-for-agents` | `skills/productivity/writing-for-agents` | `3216582`（2026-08-19，SKILL.md 自标注） | Luca 适配（thin entry over skill-authoring.md） |

排除项说明：
- muse 的 `retro` 与上游 `skills/in-progress/retro` **同名异源**（本地是"五问设计复盘"，上游是 coding session retrospective），不构成对应。
- `~/.claude/skills/resolving-merge-conflicts`、`~/.claude/skills/systematic-debugging`、`~/.agents/skills/systematic-debugging` 是**兼容适配器**（compatibility adapter，内容为"委托到 luca_gstack 正典"），已由主仓库对应 #5/#3 覆盖，不重复计数。
- v1 已知的 11 项 office 溯源在 muse 项目中同样存在，其中 **10 项两仓库完全相同**；`implement` 为 **muse 侧本地分叉**（SKILL.md 61-62 行多出 to-tickets 投影条款，muse commit `a16d47b`，2026-09-02 本地演进，与上游无关）。此分叉不影响上游更新判定（两副本锚点相同）。
- `~/.codex/skills/` 实有 5 个目录（codex-primary-runtime、magicpath 等），grep 确认**无任何 mattpocock 内容**。
- `~/.agents/.skill-lock.json`（37 条记录）中 mattpocock 安装记录仅 **tdd 1 条**（pluginName `mattpocock-skills`，installedAt 2026-06-07，skillPath `skills/engineering/tdd/SKILL.md`）；teach 无锁记录，属手工拷贝安装（依据：文件与上游 `aa024cb` 的 `skills/productivity/teach/SKILL.md` SHA256 完全一致 `6d2dbe5e…c2259` 且无其他来源）。

**补查方法（v3 终版口径）**：上游共 **37 个 skill**（engineering 18 + productivity 7 + misc 4 + in-progress 8；v2 的"33"漏计了 misc 4 项、多计 productivity 1 项，v3 已更正）。37 名逐一与 9 个本地位置对撞（`~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`、luca_gstack、muse、"ai 宠物提示"两处、sharedev项目、`~/.config/agents/skills` 不存在）；**misc 4 项（git-guardrails-claude-code、migrate-to-shoehorn、scaffold-exercises、setup-pre-commit）经 v3 补撞全部 0 命中**。命中 15 名，剔除同名异源（retro）与 3 个适配器后，最终对应 **17 项**。

说明：本地另有 `tech-spec`、`task-plan`、Plan Agent 等「增强面」在 2026-08-11 变更令中吸收了上游 `to-spec`/`wayfinder` 的理念，但它们不是 mattpocock skill 的直接改编，未列入对应表。

## 二、上游更新核查结论（逐 skill）

核查命令模板：`git log --format="%h %ci %s" <锚>..HEAD -- <路径>` + `git diff <锚>..HEAD -- <路径>`，在 clone 仓库内实跑。

### 总判定（v2 修订）：**17 项对应中，13 项零更新、3 项仅机械性更新、1 项（tdd）有实质性上游更新值得跟进。**

### ⚠️ v2 新发现：tdd 存在实质性更新（唯一需要跟进的项）

`~/.agents/skills/tdd`（2026-07-12 安装，字节 match 锚定 `bd453a6`，2026-07-03）落后上游 5 个 commit，其中 2 个是实质性内容更新：

| commit | 日期 | 性质 | 内容 |
|---|---|---|---|
| `8a475c4` | 2026-08-05 | **实质新增** | Seams 一节新增 codebase-design 交叉引用段落：当 interface 形状本身存疑时（module 深度、seam 位置、interface 暴露面），引导调用 codebase-design skill 获取 Module/Interface/Depth/Seam/Adapter/Leverage/Locality 词汇 |
| `d28dfdc`/`fcf0071` | 2026-08-15 | 半实质（措辞标准化） | 跨 skill 调用措辞统一为 "call the Skill tool with 'name'" |
| `697d4ce` | 2026-07-13 | 机械 | 新增 agents/openai.yaml Codex 元数据 |
| `3216582` | 2026-08-19 | 机械 | 全仓 em-dash 清理（`—` → `:`/`(...)`，SKILL.md 约 8 处标点） |

附带说明：`tests.md` 与 `mocking.md` 与上游 HEAD 字节一致，无需动；只有 SKILL.md 落后。**建议动作**：把 `8a475c4` 新增段落与措辞标准化同步进本地 tdd SKILL.md（用户级目录，非框架只读范围，但按惯例先报告由 luca 决定）。

### v2 新发现：其余 4 个新对应均无需跟进

| skill | 锚点后 commit | 结论 | 证据 |
|---|---|---|---|
| teach（#14） | 2 | 仅机械性 | `697d4ce`（metadata）+ `3216582`（em-dash，6 文件 28 行内全为标点替换），语义零变化 |
| to-tickets（#15） | 0 | 无更新 | 最后改动即锚点 `3216582` |
| wait-what（#16） | 0 | 无更新 | 最后改动 `5c89081`（08-19 YAML 引号修复）即本地锚点，`5c89081..HEAD` 计 0 |
| writing-for-agents（#17） | 0 | 无更新 | 最后改动即锚点 `3216582` |

### v1 原核查表（12 项，结论全部维持）

锚点后上游共 5 个 commit（`6654f6b..959a8e9`），`git diff --stat` 证实只触及 4 个文件：`.changeset/`、`CLAUDE.md`、`scripts/link-skills.sh`、`skills/in-progress/retro/`——全部与本仓库跟踪的 skill 无关。

| skill | 锚点后 commit | 结论 | 证据要点 |
|---|---|---|---|
| code-review | **0** | 无更新 | 5c89081（08-19 YAML 引号修复）经 `merge-base --is-ancestor` 验证已含于锚点 |
| codebase-design | **0** | 无更新 | 3216582（08-19 em-dash）在锚点前 |
| diagnosing-bugs | **0** | 无更新 | 同上 |
| implement | **0** | 无更新 | 最后改动 697d4ce（07-13 metadata）远早于锚点 |
| resolving-merge-conflicts | **0** | 无更新 | 同 codebase-design |
| to-spec | **0** | 无更新 | 5c89081 已含于锚点 |
| wayfinder | **0** | 无更新 | 3216582 在锚点前 |
| grilling | **0** | 无更新 | 85f83d3（08-20 HR 分隔）、84fdeff（08-06 grill-me-align）均为锚点祖先 |
| handoff | **0** | 无更新 | d28dfdc（08-15）为锚点祖先 |
| quick-research | **2** | **仅机械性更新** | ① `697d4ce`（07-13）新增 `agents/openai.yaml` 3 行 Codex 元数据；② `3216582`（08-19）SKILL.md 一处 em-dash 改括号。逐行 diff 核对，语义零变化，无需跟进 |
| code-hygiene 铁律内核 | — | **出处不可核实** | 见下文专项说明 |

### 专项说明 1：quick-research 的两个「更新」

```
697d4ce 2026-07-13 feat: add Codex agents/openai.yaml metadata to every skill
3216582 2026-08-19 Remove all em-dashes from the repo
```

diff 仅两处：新增 3 行界面元数据 YAML + SKILL.md 一行标点调整（`—` → `(...)`）。属于仓库级机械清理，方法语义零变化。**判定：不需要同步。**

### 专项说明 2：prove-it-bites 出处疑点（本地修正建议）

`code-hygiene/SKILL.md:136` 标注「源：mattpocock/skills prove-it-bites 内核（MIT，对标采纳 2026-07-12）」。核查结果：

- `git log --all -- "*prove-it*"` → 0 条
- `git log --all -S "prove-it" --oneline`（pickaxe 全内容搜索）→ 0 条
- 上游当前目录（engineering 18 项 + productivity 7 项）无此 skill
- GitHub commit 搜索 0 结果

**结论：prove-it-bites 在 mattpocock/skills 全部 git 历史中从未存在过。** 该引用可能来自其他来源或记忆偏差。按框架规则（发现问题只报告、不动手改），建议 luca 裁定是否将此出处标注修正为可追溯来源。

## 三、监督复核记录

监督员独立重跑全部关键验证（per-skill rev-list 计数、ancestor 亲测退出码、research diff 逐行核对、pickaxe 搜索），结果：

- 两名审查员全部 git 断言与独立复跑**一致**，无事实错误
- 覆盖核对：12 项清单（含 references/handoff-protocol.md）**无遗漏**
- 认真度：审查员 A **认真**（ls-tree 对比锚点/HEAD 目录排除 rename 漏检、ancestor 用 `--is-ancestor` 而非日期推断）；审查员 B **认真**（pickaxe + 路径通配双法查证、diff 逐行核对、GitHub 侧核验并区分分词误匹配）
- 一处观察（非错误）：监督员 grep 到的本地 mattpocock 字面引用为 7 个文件，少于清单 12 处——因部分 skill 的溯源标注在上游锚声明里而非字面 "mattpocock" 字样，属本地溯源标注风格不统一，不影响上游核查结论
- **总体判定：报告可信**

## 四、附：上游现况快照（2026-09-15，v3 修正计数口径）

- `skills/engineering/`（18）：ask-matt, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-with-docs, implement, improve-codebase-architecture, prototype, research, resolving-merge-conflicts, setup-matt-pocock-skills, tdd, to-spec, to-tickets, triage, wayfinder, wizard
- `skills/productivity/`（7）：grill-me, grilling, handoff, teach, to-questionnaire, wait-what, writing-for-agents
- `skills/misc/`（4，v2 快照漏列，v3 补）：git-guardrails-claude-code, migrate-to-shoehorn, scaffold-exercises, setup-pre-commit
- `skills/in-progress/`（8）：claude-handoff, loop-me, retro, writing-beats, writing-fragments, writing-shape, implement-spec, setup-ts-deep-modules
- 近期上游活跃方向：retro（确定性检查）、changeset 工作流、link-skills 脚本——均未触及本仓库跟踪的 skill

## 五、给 luca 的行动建议

1. **一项需跟进（v2 新发现，v3 终审维持，v4 自审维持）**：`~/.agents/skills/tdd` 落后上游一个实质性 commit（`8a475c4`，codebase-design 交叉引用段，终审审查员亲验 diff 确认实质性成立），建议同步 SKILL.md。执行细节见 `.workbuddy/reports/2026-09-16-tdd-sync-execution-brief.md`。注意：未合并分支 `rename-context-to-glossary` 对 tdd 另有 1 处 CONTEXT.md→GLOSSARY.md 更名（未合并，不纳入本次同步）。
2. **其余无需同步**：16 项对应零更新或仅机械差异。
3. **一项待裁定**：`code-hygiene/SKILL.md:136` 的 prove-it-bites 出处在上游从未存在（终审 pickaxe 复验 0 命中），建议修正为可追溯来源（框架只读，未动）。
4. **审查盲区教训（v1→v4）**：v1 只扫主仓库；v2 补了用户级与 muse 但漏了 misc 目录、误写了 implement 跨仓一致性；v3 终审链抓出这两处；**v4 自审发现 v1–v3 的共同盲区——只看 origin/main 未扫 103 条未合并分支**，补扫后确认 3 条含跟踪面变更但均未合并、对 Luca 无即时影响。方法论沉淀为两条：**「上游全名单对撞法（37 skill 名 × 9 本地位置）」+「未合并分支扫描（origin/main..每分支 × 跟踪路径）」**，两者都是下次核查的必做闭环。
5. **下次复查时机**：上游 8-24 锚点后 main 仅 5 commit 且全部无关；下次复查除重跑 per-skill `git log <锚>..HEAD` 外，**必须同时扫未合并分支**（重点盯 flatten-skills-tree 的 Agent Plugins 1.0 目录重构——若合并，所有本地 skill 的上游路径将全体失效，对应表需重建）。

## 六、v4 新增：未合并分支扫描结果（origin/main 之外的上游动态）

扫描方法：`git rev-list --count origin/main..<分支> -- <跟踪路径>`，12 个跟踪面 × 103 条远程分支全量对撞。含跟踪面变更的分支仅 3 条：

| 分支 | 最后提交 | 涉及跟踪面 | 性质 | 对 Luca 的影响 |
|---|---|---|---|---|
| `flatten-skills-tree` | 2026-08-07 | 全部 engineering + productivity（纯路径迁移 `skills/engineering/* → skills/*`，Agent Plugins 1.0 结构） | 未合并的大重构 | **若合并，本报告对应表的"上游对应"路径全部失效**，需重建对应表（内容预计基本不变，纯 rename） |
| `rename-context-to-glossary` | 2026-08-16 | tdd/codebase-design/diagnosing-bugs/wait-what 等（CONTEXT.md → GLOSSARY.md 约定更名，每 skill 约 1-2 行） | 未合并的约定改名 | 合并后属机械跟进；注意本地 luca_gstack 也有自己的 CONTEXT.md 约定，**若采纳需避免词汇冲突** |
| `wayfinder/research-inline` | 2026-07-13 | wayfinder（-21/+21 行：取消 research ticket 类型，research 改为 session 内 inline subagent） | 未合并的方法论演进 | **本地 quick-research 的设计（单后台 agent、primary 纯度）与该方向已合流，无需跟进**；仅当本地升级 wayfinder 本体时参考 |

其余 100 条分支对跟踪面零变更。此扫描结果为快照（2026-09-16），下次复查需重扫。

---

*核查证据：/tmp/mattpocock-update-check.wPRCqX/repo（上游 clone，含完整历史与 103 条远程分支）；v1 审查草稿 /tmp/mp_eng_review.md、/tmp/mp_prod_review.md；v1 监督 /tmp/mp_supervision.md；v3 终审 /tmp/mp_final_audit.md；v3 终审监督 /tmp/mp_final_supervision.md；v4 自审（teach 成对 diff 复核 + 全分支扫描）inline 于本报告第六节。*
