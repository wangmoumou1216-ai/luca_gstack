# B3 — Claude Code Skill / Prompt 生态 调研

> 源码级调研，目标：找出成熟社区框架如何组织 skill、做触发路由、接 hook、维护单一真相源，
> 供 luca_gstack 借鉴。所有 clone 自 GitHub `--depth 1`，引用均带 file:line。
> 调研日期 2026-05-26。

## 深挖项目（名称 + 星数 + 仓库链接 + 读了哪几个核心文件:行）

> 星数来自 `gh api repos/<r> --jq .stargazers_count`（2026-05-26）。注：obra/superpowers
> 与 anthropics/skills 返回值异常高（20w / 14w），疑似 gh 缓存或镜像聚合，**仅供量级参考**；
> 三者均为生态公认头部项目，结论不依赖精确星数。

### 1. anthropics/skills（官方 example skills，~141k*）
- 仓库：https://github.com/anthropics/skills
- 读的文件：
  - `spec/agent-skills-spec.md:1-4`（spec 正文已迁移到 agentskills.io/specification，仓内只留指针）
  - `template/SKILL.md:1-7`（官方最小模板：只有 `name` + `description` 两个必填 frontmatter 字段）
  - `skills/*/SKILL.md` 全量 frontmatter（pdf:3 / docx:3 / xlsx:3 / pptx:3 / claude-api:3 /
    skill-creator:3 等 —— description 字段是触发核心）
  - `.claude-plugin/marketplace.json:1-55`（plugin 聚合三个 bundle，每个列 skill 子目录路径）

### 2. obra/Superpowers（社区头部 skill 库，~207k*）
- 仓库：https://github.com/obra/superpowers
- 读的文件：
  - `.claude-plugin/plugin.json:1-19`（plugin manifest，无 commands 字段，纯 skills + hooks）
  - `hooks/hooks.json:1-15`（**唯一的 hook：SessionStart**，matcher `startup|clear|compact`）
  - `hooks/session-start:1-70`（SessionStart 把 `using-superpowers/SKILL.md` 全文注入上下文）
  - `skills/using-superpowers/SKILL.md:1-118`（"dispatcher" skill：强制模型用 Skill 工具自选）
  - `skills/writing-skills/SKILL.md`（全文 ~400 行：description 写法 / CSO / 命名 / token 预算 ——
    本次最有价值的单文件）
  - `tests/skill-triggering/run-test.sh:1-89` + `run-all.sh` + `prompts/*.txt`（行为级触发测试harness）

### 3. SuperClaude_Framework（~23k，结构化开发平台）
- 仓库：https://github.com/SuperClaude-Org/SuperClaude_Framework
- 读的文件：
  - `plugins/superclaude/.claude-plugin/plugin.json:1-30`（manifest：commands/agents/skills/hooks/mcp 五个目录指针）
  - `plugins/superclaude/hooks/hooks.json:1-36`（**SessionStart + Stop + PostToolUse**，
    后两者是 `type:"prompt"` 的 LLM 驱动 hook，不是关键词匹配）
  - `plugins/superclaude/commands/brainstorm.md:1-35`（command = frontmatter + "Triggers" + "Behavioral Flow"）
  - `plugins/superclaude/commands/sc.md:1-60`（`/sc:` 命名空间 dispatcher）
  - `plugins/superclaude/skills/brainstorm/SKILL.md:1-8`（command 与 skill 同名共存）

### 4. hesreallyhim/awesome-claude-code（生态普查，~45k*）
- 仓库：https://github.com/hesreallyhim/awesome-claude-code
- 读的文件：`THE_RESOURCES_TABLE.csv`（226 行，单一真相源 CSV，README 由它生成）
- 226 条资源分类计数：Slash-Commands 59 / Tooling 51 / Workflows&Guides 37 /
  CLAUDE.md 28 / **Agent Skills 19** / **Hooks 13** / Status Lines 7 / Output Styles 4。

---

## 关键实现拆解

### A. Skill 定义方式（三家完全一致）
一个 skill = 一个目录 + 一个 `SKILL.md`，YAML frontmatter **只有两个必填字段**：`name` + `description`
（anthropics/skills `template/SKILL.md:1-7`；superpowers `writing-skills/SKILL.md` "SKILL.md Structure" 节；
spec 见 agentskills.io/specification）。约束：frontmatter ≤ 1024 字符，name 只用字母数字连字符。
重型内容（API 参考、脚本）拆到同目录子文件，**SKILL.md 保持瘦身**（pdf 把细节放 REFERENCE.md/FORMS.md，
见 `skills/pdf/SKILL.md:11`）。

### B. 触发机制 —— 核心结论：**全部靠模型读 description 自选，零 substring hook**
- **anthropics 官方模型**：description 不只是介绍，而是"触发合同"。写法是富文本 + 正负向触发：
  - 正向：`docx/SKILL.md:3` 列出 "Word doc / .docx / report / memo / letter" 等具体触发词；
  - 负向：`docx` 末尾 `Do NOT use for PDFs, spreadsheets, Google Docs...`；
    `claude-api/SKILL.md:3` 显式 `TRIGGER when: ...` / `SKIP: file imports openai...`。
  - 这正是 luca_gstack 缺的：用 description 内的**反例**消歧，而不是 hook 里 includes()。
- **Superpowers 模型**：SessionStart hook（`hooks/session-start:1-70`）把 dispatcher skill
  `using-superpowers` 全文注入；该 skill（`SKILL.md:10-16`）用极强指令逼模型"哪怕 1% 相关也必须
  先调 Skill 工具"。触发判断完全交给模型 + Skill 工具，hook 不做任何关键词匹配。
- **SuperClaude 模型**：command frontmatter 的 description + 正文 "## Triggers" 段
  （`commands/brainstorm.md:11-15`）描述触发场景，靠 `/sc:` 显式命名空间 + 模型理解，
  hooks.json 里**没有 UserPromptSubmit**。
- **三家无一使用 `text.includes(keyword)` 风格的 UserPromptSubmit 路由 hook。**

### C. 单一真相源（single source of truth）
- **anthropics**：skill 列表的唯一登记处是 `marketplace.json` 的 `skills` 数组
  （`.claude-plugin/marketplace.json:17-22,29-42`），其余全部从 SKILL.md frontmatter 派生；
  没有独立的 routing-map / input-modes / workflow-graph 副本。
- **superpowers**：`plugin.json` 只指 `skills/` 目录，连显式列表都不维护 —— Claude Code 扫目录自动发现，
  description 即路由。**零路由配置文件**。
- **SuperClaude**：`plugin.json:24-29` 用目录指针 `"commands":"./commands/","skills":"./skills/"`，
  靠约定扫描；无手维护的命令清单（`/sc:help` 由 help.md 单点维护，但那是文档不是路由源）。
- **awesome-claude-code**：典范——`THE_RESOURCES_TABLE.csv` 是唯一数据源，README/分类页全部由脚本生成
  （`acc-config.yaml` + `scripts/`），杜绝多面漂移。

### D. Hook 模式（真实用法）
- Superpowers 唯一 hook 是 **SessionStart 注入 dispatcher**（`hooks/hooks.json:3-12`），
  且 `run-hook.cmd` 是跨平台 polyglot wrapper（同一文件 Windows cmd + Unix bash），
  扩展名故意省略以避开 CC 的 `.sh` 自动 bash 前缀（`run-hook.cmd` 注释）。
- SuperClaude 用 **`type:"prompt"` 的 LLM 驱动 hook**：Stop hook 提醒检查未提交改动；
  PostToolUse matcher `Write|Edit` 让模型复查刚改的文件（`hooks/hooks.json:14-34`）——
  hook 负责"质量闸"，不负责"路由"。
- 共同 pitfall 规避：SessionStart hook 注入 context 时必须按平台输出不同 JSON 字段
  （`hookSpecificOutput.additionalContext` vs `additional_context`，见 `session-start:48-66`）；
  bash 5.3+ heredoc 会 hang，改用 printf（同文件注释 + issue #571）。

---

## 与 luca_gstack 的差异

| 维度 | 成熟框架做法 | luca_gstack 现状 |
|------|------------|-----------------|
| 真相源 | 1 处：SKILL.md frontmatter / 一张 CSV，列表由目录扫描或脚本派生 | **5 面手维护**（routing-map.yaml + input-modes.yaml + workflow-graph.yaml + command 文件 + CLAUDE.md 表格），已漂移 |
| 触发 | 模型读 description 自选 + Skill 工具；description 含正/负触发词消歧 | UserPromptSubmit hook 做 `text.includes(keyword)` 子串匹配，假阳性（"调研"⊂"设计调研"） |
| 触发验证 | 行为级测试 harness：跑 `claude -p` 真验命中（superpowers `tests/skill-triggering/`） | 无触发回归测试 |
| 指令面 | dispatcher skill 仅 ~118 行且懒加载；普通 skill <500 词 | ~5.8K token always-on，规则重复 |
| Hook 职责 | SessionStart 注入 + 质量闸（Stop/PostToolUse）；不做路由 | hook 既注入又做关键词路由，职责混在一起 |
| 消歧手段 | description 内显式 `Do NOT use for...` / `SKIP:` | 无负向触发，靠 hook 黑名单补丁 |

---

## 可借鉴清单

1. **[直接可用][痛点:5面手维护] description 即唯一路由源**
   删掉 routing-map / input-modes / workflow-graph 三份手维护副本，让每个 SKILL.md 的 description
   成为唯一触发登记处；skill 列表改为扫 `.claude/skills/office/*/SKILL.md` 目录派生（参照
   superpowers `plugin.json` 零列表 + anthropics `marketplace.json` 单数组）。

2. **[直接可用][痛点:substring 假阳性] description 富文本 + 正负向触发词**
   每条 description 写成 anthropics 风格：`Use when... / Triggers include: ...` + 明确
   `Do NOT use for...` / `SKIP:`（见 `docx/SKILL.md:3`、`claude-api/SKILL.md:3`）。
   用反例消歧替代 hook 黑名单。

3. **[需改造][痛点:substring 假阳性] 从 hook 关键词路由 → 模型 + Skill 工具自选**
   保留一个 SessionStart hook 注入"dispatcher"（参照 superpowers `using-superpowers`），
   让模型读 description 自选，UserPromptSubmit 不再做 includes 匹配。
   改造成本：luca_gstack 现有中文触发词表可平移进各 skill description 的 "Triggers" 段；
   但项目门禁/复杂度评分这类"硬闸"仍需保留为程序化 hook（不是路由）。

4. **[需改造][痛点:触发精度无回归] 行为级触发测试 harness**
   照搬 superpowers `tests/skill-triggering/run-test.sh`：每个 skill 一个自然语言 prompt，
   跑 `claude -p --output-format stream-json` 后 grep `"name":"Skill"` 验是否命中预期 skill。
   可直接验证"调研 vs 设计调研"这类消歧是否生效。

5. **[需改造][痛点:5面手维护] CSV/单文件 + 脚本生成派生视图**
   若仍需 input-modes / workflow-graph，改为从单一登记表（CSV 或各 SKILL.md frontmatter）
   脚本生成，禁止手改派生文件（参照 awesome-claude-code `THE_RESOURCES_TABLE.csv` → README）。

6. **[仅理念][痛点:指令面臃肿] 懒加载 dispatcher + skill 瘦身 + token 预算**
   superpowers `writing-skills` 规定常驻 skill <200 词、其余 <500 词，重型内容拆子文件按需读，
   `description` 只写"何时用"不写"怎么做"（避免模型走捷径只读 description 而跳过正文，
   `writing-skills` CSO 节有实测案例）。luca_gstack 可据此压缩 5.8K always-on 指令面。

7. **[仅理念] skill 创作走 TDD（先写失败的触发/压力测试再写 skill）**
   superpowers `writing-skills` 的 Iron Law：`NO SKILL WITHOUT A FAILING TEST FIRST`；
   anthropics `skill-creator` 配 description-improver 脚本专门优化触发精度。

### 可直接安装的现成能力（替代自维护）
- **obra/Superpowers**（plugin）：brainstorming / TDD / systematic-debugging /
  writing-skills 等过程类 skill —— luca_gstack 的 `/brainstorm`、隐藏 `careful`/`retro` 可考虑对标或直接装。
- **anthropics/skills**：pdf / docx / xlsx / pptx / mcp-builder / **skill-creator** /
  frontend-design —— 其中 office 文档 skill 与 luca_gstack 已加载的同名能力重合，可直接用官方版替换自维护。
- **TDD Guard**（github.com/nizos/tdd-guard，awesome-cc Hooks 类）：PostToolUse 质量闸 hook 范例。
- **Context Engineering Kit / Compound Engineering Plugin**（awesome-cc Agent Skills 类）：上下文工程模式参考。
- awesome-claude-code Hooks 类还有 cchooks / claude-hooks（johnlindquist）等 hook SDK，
  可替代手写 route-guard 的脚手架。

---

## 风险 / 不适配点

- **纯模型自选触发的代价**：放弃 substring hook 后，触发正确性依赖模型 + description 质量，
  无确定性保证；luca_gstack 的"项目门禁/复杂度≥6 进 Plan Agent/红线"等**硬约束不能交给模型自选**，
  必须保留为程序化 hook（这部分 hook 不是路由，是闸门，应与触发解耦）。
- **中文触发**：anthropics/superpowers 的 description 全英文；luca_gstack 大量中文触发词
  （"做个原型""竞品分析"）需验证模型对中文 description 的自选命中率 —— 这正是借鉴点 4
  （触发测试 harness）要先回归的对象。
- **dispatcher 注入成本**：superpowers SessionStart 注入 ~118 行 dispatcher 到每个会话，
  与 luca_gstack "压缩 always-on 指令面" 目标部分冲突；需权衡注入 dispatcher vs 现有 5.8K 指令，
  净收益取决于能否同时砍掉重复规则。
- **行为测试依赖 `claude -p` CLI**：harness 需要无头跑 Claude，有 API 配额/耗时成本，
  适合做 CI 周期性回归而非每次改动同步跑。
- **星数存疑**：superpowers/anthropics 的 gh 星数返回异常高，已在上文标注，结论不依赖该数值。
- **未能验证项**：agent-skills spec 正文已迁移到外部站点 agentskills.io/specification（仓内只剩指针，
  `spec/agent-skills-spec.md:1-4`），本次未抓取该 URL；frontmatter 字段集（≤1024 字符、name/description
  必填）来自 superpowers `writing-skills` 与 anthropics 模板的交叉印证，spec 全字段表未直接核对。

<!-- FILE_END: B3-claude-code-ecosystem -->
