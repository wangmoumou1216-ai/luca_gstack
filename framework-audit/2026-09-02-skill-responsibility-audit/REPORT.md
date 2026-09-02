# luca_gstack Skill 职责归位审计

**日期** 2026-09-02 · **范围** 40 个 office skill 目录 / 33 条 `project_skills` + 21 条 `builtin_skills` 路由条目 / 31 个斜杠命令
**问题** 每个 skill 是否归位到它应有的职责：是否有 skill 与 skill 冲突、是否都被路由、是否都能命中、是否过度命中
**性质** 只读审计 + 已验证的低风险修复；判断题一律不自行拍板

---

## 一句话结论

**职责定义层是健康的**——五个高风险家族逐个比对四个声明面（SKILL.md / CLAUDE.md 表行 / routing hint / input-modes），
没有两个 skill 抢同一份活，也没有同一个 skill 在两处说不同的话。
**问题全部在路由层**：触发词与权重让「已声明好的归属」在实际路由里兑现不了，以及纯拉丁触发词按裸子串匹配
导致 `password`→docx 这类误伤。已修 8 项（全部经实测 + 全量回归）；原先留给裁决的 3 类里，2 类同日修掉，只剩 1 项**行为决策**（是否给 careful 接线）留 luca。

---

## 审计的九个维度

| ID | 维度 | 结论 |
|----|------|------|
| D1 | 职责重叠与冲突 | 定义层 **0 冲突**；路由层 **3 对**互吞（已修） |
| D2 | 可达性（有没有入口） | 30 个一级 skill 全部可达；隐藏 skill 中 `careful` 的 hook 逻辑已修好但**没接线**＝无 opt-in 入口（接不接是行为决策，见 C） |
| D3 | 过度命中 | 两类：**子串误伤**（已修·词边界）+ **意图误判**（已修·元问句抑制器，见 A） |
| D4 | 欠命中（召回） | 邻接漏字类**有软候选兜底**（我一度报错，见「我的错误」）；`NONE` 分支是真空洞 |
| D5 | 门禁层级交互 | 10/10 符合 CLAUDE.md 优先级表，健康 |
| D6 | 声明面语义一致 | 四面一致，无矛盾 |
| D7 | 编排位置 | `code-recon` 曾在编排图零出现 → **已补** scene B 两条路径（见 B） |
| D8 | 双 harness 对等 | 40 个 skill 逐个比对，仅 `muse-proto-gen` 不对等（低，不影响可达性） |
| D9 | 使用面证据 | 场景覆盖表照跑；分母为 0 的一律标 NOT-ADJUDICATED，不进处置建议 |

---

## 已修 · 第一批（6 项，全部实测 + 全量回归绿）

### 1. 纯拉丁触发词按词边界匹配 —— `route-guard.mjs` 匹配器
**根因**：`normalize()` 去空格后用 `text.includes()` 裸子串匹配，无词边界。实测 10/10 误命中：
`autoload 配置` / `auto-merge 开关` → `/auto`（**全系统最高权重 10**）、`password` / `keyword` → docx、
`5 minutes` → lark-minutes。这类假阳性是**高置信 SINGLE_SKILL**，而 CLAUDE.md 语义路由契约明写
「STOP/漏命中不豁免语义评估」——**反过来说 SINGLE 命中不受语义复核保护，没有下游兜底**。

**修法**：只给 ASCII 触发词加词边界，并改在**原始文本**（保留空格）上匹配，多词短语用 `\s*` 兼容
`code review` / `codereview` 两种写法。CJK 无词边界概念，逻辑原样不动。
源码原注释说「normalize 去空格导致 `\b` 不可靠，deferred to ADR-0005」——改在原始文本上匹配正是它的解法。

**效果**：`autoload`/`auto-merge`/`password`/`keyword` 类全部转 STOP；133 条语料**零副作用**；
10 条拉丁触发词的合法用法（`导出成 docx`/`用 tdd 写`/`code review 一下`/`推到figma`）全部保留。
`test-route-guard.mjs` 里那条**断言缺陷仍存在**的 characterization 用例（ADR-0005）已翻转为守护修复，
并补一条反向用例守护多词英文短语的召回。

### 2-4. 三对家族互吞（权重）
| 冲突 | 现象 | 修法 |
|---|---|---|
| `deepresearch` ⇄ `quick-research` | `调研` ⊂ `快速调研` 等权 ⇒ 遮蔽规则（要求严格更高权重）失效 ⇒ 恒 MULTI | quick-research 6→7 ⇒ SINGLE |
| `brainstorm` ⇄ `superpowers-brainstorming` | `prd`⊂`轻量prd`、`需求梳理`⊂`简单需求梳理` 等权 ⇒ 恒 MULTI，**CLAUDE.md 记载的「轻量PRD → superpowers」映射从未解析成功** | superpowers 6→7 ⇒ SINGLE |
| `web-access` ⇄ `agent-browser` | 反方向失效：具体词属低权条目 ⇒ agent-browser 的 `打开网页`/`访问网页` 是死信 | agent-browser 7→9 ⇒ MULTI（安全歧义，符合该文件既定原则） |

### 5. `figma-layer` 撤裸词
裸 `Figma`/`figma` 把一切 Figma 话题圈走（`figma MCP 怎么配` 也判 SINGLE），而该 skill 只适用
「已有 HTML 原型一比一还原」。依据既有语义记忆 SC-20260610-001（已记为结构性误命中风险）。
换成 CJK 复合词：推到/同步到/还原到 figma + figma保险层。

### 6. `/auto` 撤裸拉丁 `auto`
它是最高权重条目，误命中代价最大；裸首 token `auto` 仍由 slashless command alias 直呼（实测保留），召回零损失。

**第一批回归**：`verify.sh` 86/0（与改动前基线逐项一致）· `test-route-guard.mjs` 201/0 ·
`check-routing-map.mjs` SSOT-1..10 PASS · `eval_routing --keyword-only` 70/70 · 133 条语料 93→98、零回归。

---

## 原「留给裁决」的 3 类 — 后续处置（2026-09-02 同日）

### A. 意图误判 → **已修**（元问句抑制器）
撤掉子串误伤后仍有 11 条语义级误命中：句子只是**提到**某个词，却被判成要执行该 skill
（「这个 PRD 文件放哪个目录了」→ SINGLE `/brainstorm`）。已在 `route-guard.mjs` 的
`skillDecision` 加元问句抑制：命中「问它是什么/在哪/谁改的/聊聊」形态时，把 SINGLE 降级为
STOP + 软候选 —— **不静音**，候选仍在 STOP 提示里出现，只撤掉那份没有依据的确定性。

两道刹车都是实测定的，不是设计出来的：
- **请求词豁免**：出现祈使/委托标记（帮我/研究一下/评审…）时不抑制。无此豁免的 v1 在
  10 条对抗集上**误杀 6 条**合法请求（"深度研究一下 X 是什么"、"帮我查证…是什么意思"）。
- **「找位置」形态收窄**：v2 仍被既有 golden 抓到一条误伤——「seam 应该放在哪里」是
  **设计问题本身**而非找文件。改为要求 文件/目录/脚本/配置… 邻接才算元问句。

结果：133 条语料 98→106（8 条修好、零召回损失），10 条对抗集 10/10 保持原路由，
golden 201→203（新增正反两条守护）。两次变异各自钉红对应那一条，证明断言非恒真。

### B. code-recon 编排位置 → **已修**
`optional-workflow-graph.yaml` scene B（existing_feature_optimization，brownfield 主场）
补两条路径：`code-recon → ux-brainstorm → design-brief → open-design`（设计链）与
`code-recon → tech-spec → task-plan`（工程链）。SSOT-8 校验通过。
scene D 暂未加——agent 化改造是否也默认从代码起步，属产品判断，留给 luca。

### C. careful 陈账 → **查清，一半是我报错了**
上一版报告说 2026-07-20 的处置「至今未见落地」——**这句错了**。实测脚本已改成
`permissionDecision:"ask"` + exit 0，死锁那半早已修好：
- 危险命令（`rm -rf /tmp/x`）→ 吐 ask JSON、exit 0（弹确认框，可覆盖）
- 普通命令（`ls -la`）→ 静默 exit 0
- 已知假阳性（命令里只是**提到** `rm -rf`）→ 同样只是弹一次确认，不再永久卡死

真正剩下的只有一件：**它没接进 `.claude/settings.json` / `.codex/hooks.json`**，也没有斜杠命令、
路由词或场景钉，所以没有可 opt-in 的入口 = 常态不可达。接不接是**一行决定**，但那一行会给
本仓所有 session（含 agent）的 Bash 调用加一道模式匹配确认——**这是行为决策，留给 luca**，
不由审计单方面接线。

## 我在这次审计里犯的错（红队抓的）

1. **F4 报错了一条事实**。我写「评审类有提示钉、代码/冲突类无钉」——**假的**。
   `帮我审查一下当前改动的代码` 等 5 条 STOP 例句的 `softCandidates` 全部精确点名了正确 skill
   （`/code-review`、`/code-recon`、`/resolving-merge-conflicts`、`/grilling`、`/ux-audit`），
   STOP 分支会把它们渲染成「最可能的 skill」提示。**而这一列本来就在我自己的探针输出里**，我没用。
   F4 因此从「中」降为「低」：邻接漏字确实丢关键词命中，但不是裸奔。
2. **我的探针有结构性盲区**。`route-guard.mjs` 的 dry-run 在 `decisionToHints()` **之前** `process.exit(0)`，
   所以整套装置只能看到 `decision` JSON，**永远看不到实际注入的 hint 文本**。
   任何关于「有没有提示钉」的结论都必须单独读源码，不能算实测。第 1 条错误正是这个盲区造成的。
   → 已写进 `evidence/README-rig-limits.md`，供下次复用者避坑。
3. **数字口径不准**。草案写「A 组 90 条中 78 条命中」；实际 A 组 88 条，严格
   `SINGLE_SKILL && skill==expect` 是 73/88，把 PLAN_CHECK（muse-loop 两条，走确认门）算进去是 75/88。
4. **没把自己采到的证据用完**。C 组 20 条负向探针实际 19 条误命中，草案只写了 6 条，
   剩下 13 条（含拉丁裸词的第 4 个实例 `prototype`）躺在 `evidence/corpus.tsv` 里没被引用——
   过度命中的严重程度被我低估了一档。本报告已全量列出。
5. **两次夹具缺陷**（都在下结论前被自查抓出并修正）：fixture 缺 `.claude/commands` 使 slashless alias
   静默失效、产生假 NONE；fixture 缺项目状态使 Project Gate 行为改变、产生 4 条假「变坏」。

另外**自我证伪了两条**假设：`architecture_brief` 契约悬空（实为已接线）、
`muse自进化循环` 被 framework-evolution 劫持（`scope: framework_meta` 过滤器挡住了，静态包含关系 ≠ 实际劫持）。

---

## 查过且健康（反向记录）

- **登记面**：`check-routing-map.mjs` SSOT-1..10 PASS、`check-registration-sync.mjs` 30 skill REG-1/2 全绿 0 warn
- **声明四面一致性**：5 个高风险家族逐个比对，零矛盾
- **门禁层级**：复杂需求→PLAN_MODE、斜杠直呼→归还 SINGLE、老/新项目→PROJECT_STOP、
  框架 meta→不触发 Project Gate、preset 否定语境不被字面选中 —— 10/10 符合优先级表
- **日常对话对照组** 10/10 正确落 NONE/STOP，无一误命中
- **builtin 路由目标** 22 个在 `~/.claude/skills/` 与 superpowers 插件里**全部真实存在**（逐个核过磁盘）
- **可达性**：`muse-x-digest` 非孤儿（frontmatter 自声明仅 app 注入）；`codebase-design` 不在编排图
  是它自己声明的设计（「非节点」）；`muse-proto-gen` 经 `muse-loop-orchestrate/SKILL.md:171` 冷启动 dispatch

---

## 证据

| 文件 | 内容 |
|---|---|
| `evidence/probe.mjs` | 路由探针（`ROUTE_GUARD_DRY_RUN=1`，无副作用） |
| `evidence/corpus.tsv` | 133 条语料：88 正向召回 + 15 家族边界 + 20 泛词劫持 + 10 日常对照 |
| `evidence/probe-out.json` | 修法前原始决策输出（红队独立重跑，逐字节一致） |
| `evidence/after.json` | 修法后决策输出 |
| `evidence/latin.tsv` `keep.tsv` `shadow.tsv` `recall.tsv` | 拉丁子串 / 召回保持 / 遮蔽失效 / 召回代价四组专项 |
| `evidence/adver.tsv` | 元问句抑制器的 10 条对抗集（合法请求里含元问句形态） |
| `evidence/final.json` | 全部修法后的最终决策输出（133 条 → 106 符合预期） |
| `evidence/README-rig-limits.md` | **装置已知盲区**，复用前必读 |
| `01-findings-draft.md` | 红队复审前的原始草案（保留，便于对照我改了什么） |

**装置自证**：阳性对照 3/3、阴性对照 2/2、变异对照（删 brainstorm 词表 → 仅该条翻转）、
golden 基线 201/0 → 全部修法后 203/0（新增 2 条守护用例）。红队独立重跑 `probe.mjs` 对 `corpus.tsv`，与 `probe-out.json` 逐字节相同。

> **本报告的 F10/F11（agent-browser 死信、superpowers 恒 MULTI）产生于红队复审之后，未经外部复审**，
> 仅有我自己的实测与回归支撑。
