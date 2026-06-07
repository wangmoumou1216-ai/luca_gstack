# 外部 Skill 推荐报告 — 2026-06-07

> 机制：`.claude/workflows/external-skill-scout.js`（run `wf_643ca739`）｜门禁：7 维（硬门禁 安全/兼容/非冗余 + 软分 fit30/quality30/adoption20/maintenance20）｜机器可读清单：`vetting-registry.yaml`
> 范围：SKILL.md skill + Claude Code subagent｜重点 GAP：Claude Code 元能力·代码工程·设计系统/前端·验证红队
> 漏斗：**75 发现 → 55 去重 → 32 实测 → 6 推荐 / 25 拒**（每条星标/提交/license 均 gh 实测）

---

## TL;DR — 一个反直觉但重要的结论

**你的 4 个目标 GAP 里，只有「设计知识 / 设计系统」是真正可补的；元能力和验证/红队这两块，货架上没有任何东西打得过你已有的。**

- **claude-code-meta = 0 通过**、**verification-redteam = 0 通过**。不是没找到，是全被「非冗余」硬门禁拒了——你的 plan-agent / orchestrator / 三层记忆 / route-guard 比任何现成 meta skill 更贴更深；redteam / evals / verify / careful + 你的 auto-memory 已经把"验证后再 done"固化成红线。门禁甚至发现 **superpowers（v5.1.0）和 skill-creator 你本地已经装了**。
- **design-frontend = 4 通过**（真正的机会）、**code-engineering = 2 通过**（仅工程尾段，fit 2/3）。
- 真正的空白：你的设计技能擅长**生成 + 评审**，但缺一个**可查询的设计知识 / 设计 token 架构层**。下面 1–4 全冲这个缺口。

**先验证再上报（值得记一笔）**：扫描 agent 一度报告 gh 星标是"合成/虚高"（superpowers ~22 万、anthropics/skills ~14.7 万）。我用**独立网络路径**（`api.github.com`，绕开 gh CLI）复核 3 个最高值 + 一个对照（facebook/react），全部吻合到"实时计数漂移"级别 → **星标是真的**。是 2026 年 Claude skill 生态真的爆了，scout 的训练先验过期了。教训：sub-agent 说"数据是假的"时，先独立交叉验证，别直接信，也别直接驳。

---

## 推荐清单（6 条）

> 评分卡读法：`fit/quality/adoption/maintenance`（各 0–3）｜硬门禁全 PASS 才入选｜星标=仓库级（monorepo 不等于单 skill 热度）｜**均为人工安装，本报告不替你装**。

### A. 真正补缺口：设计知识 / 设计系统（4 条）

#### 1. ⭐ UI-UX-Pro-Max — `nextlevelbuilder/ui-ux-pro-max-skill`  〔100/100〕
- **是什么**：可查询的设计知识库——161 套配色、57 组字体搭配、67 种风格、99 条 a11y/UX 规则（4.5:1 对比、focus ring、ARIA、触控尺寸）、25 种图表类型，带 shadcn/ui + Tailwind 推理。
- **为什么对你**：你的 open-design / magicpath / html-prototype 是"生成器"，缺一个"该用什么配色/字号/a11y 规则"的**查表层**。CRM 后台/仪表盘可按需取 WCAG 级规则给设计/评审兜底。
- **证据**：⭐88,275 ｜ MIT ｜ 最近提交 2026-04-03 ｜ npm `uipro-cli` 上月 10.3 万次下载（独立佐证热度真实）。安全扫描干净（仅 `npx shadcn add` 参数数组 + 本地 token 生成，无 shell 注入/外传/密钥读取）。
- **装**：`npx uipro-cli init --ai claude -g`（或 git clone 后拷 `.claude/skills/ui-ux-pro-max` 到 `~/.claude/skills/`，注意解析 data/scripts 软链）。
- **集成**：装**全局、不进路由表**——它的触发词极宽（build/create/design/review/fix），进 skill-routing-map 会和你的 office 设计管线撞车。当成"知识查询源"用：`python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system`。

#### 2. impeccable（仅用确定性检测器）— `pbakaus/impeccable`  〔90/100〕
- **是什么**：模型无关的前端**反模式/a11y 确定性检测器**（27 条 CLI 规则，跑 HTML/CSS/JSX/Vue/Svelte：对比度、a11y、"AI-slop"信号，**无需 API key**）+ 一套设计精修词汇（critique/audit/polish/typeset/harden）。
- **为什么对你**：给 FxUI 页面一个**客观、快速的工艺/a11y 闸**（生成前后都能跑），补 ux-audit（CRM 专属、截图驱动）之外的"机器可判"那一半。
- **证据**：⭐35,252 ｜ Apache-2.0 ｜ 最近提交 2026-06-06。
- **⚠️ 只取一半**：它的 init/palette **品牌创世流程**会写 PRODUCT.md/DESIGN.md，和你 FxUI 品牌锁（SF-001/SF-002，#FF8000 唯一权威）冲突——**只用 `npx impeccable detect src/` 检测器 + 精修词汇，别用品牌创世**。包较重（~120MB）。
- **装**：`npx impeccable skills install`（裸检测器：`npx impeccable detect src/ --json`，可进 CI）。
- **集成**：作为 open-design/magicpath/html-prototype **生成后的审查节点**，与 ux-audit 并列；明确排除品牌创世路径。

#### 3. design-system-architect（cherry-pick）— `wshobson/agents` → plugins/ui-design  〔90/100〕
- **是什么**：设计 **token 架构** subagent（primitive/semantic/component 三层、多品牌/暗色、Style Dictionary 管线）+ 两个 skill（visual-design-foundations、design-system-patterns）。
- **为什么对你**：把静态的 `brand-tokens.md` 升级成**工程化 token 基础设施**，让下游 FxUI/OD/shadcn 生成消费一致的语义 token。
- **证据**：⭐36,457（仓库级）｜ MIT ｜ 最近提交 2026-06-05。
- **⚠️ 必须挑着装**：整插件里捆了一个 `design-review` 命令，和你已有的 `design-review` **硬撞名**；还有 mobile-ios/android 等离题 skill。**只拷 `design-system-architect.md` + 两个 design-system skill，排除 design-review**。token 示例用通用蓝(#2563eb)，落到 FxUI 必须守 #FF8000。
- **装**：`git clone https://github.com/wshobson/agents /tmp/wa && cp /tmp/wa/plugins/ui-design/agents/design-system-architect.md ~/.claude/agents/ && cp -r /tmp/wa/plugins/ui-design/skills/visual-design-foundations /tmp/wa/plugins/ui-design/skills/design-system-patterns ~/.claude/skills/`
- **集成**：subagent 进 `~/.claude/agents/`（描述自动触发，无需路由表）；两个 skill 进全局，若要进 office 管线再窄化触发词。

#### 4. extract-design-system — `arvindrk/extract-design-system`  〔77/100〕
- **是什么**：把**实时竞品/参考站**抽成 W3C `tokens.json` + `tokens.css`（色/字/间距/圆角/阴影），附 `audit` 命令（扫源码里硬编码值 vs token）。
- **为什么对你**：你的 竞品分析 / agent-browser 只**截图**，没有"截图→token"。这条独一份，能把参考站变成可用 token 草稿，也能帮你查 brand-tokens.md 一致性。
- **证据**：⭐50（低，但 fit 高）｜ MIT ｜ 最近提交 2026-05-25。
- **⚠️**：依赖外部 npm `dembrandt` + `npx playwright install chromium`（~150MB 下载）；输出是通用 CSS 变量，**必须人工对齐 brand-tokens.md（#FF8000），别覆盖 framework/**。作者自陈 v1、非像素级。
- **装**：`npx skills add arvindrk/extract-design-system`（先 `npx playwright install chromium`）。
- **集成**：全局 helper，在 /ux-research 或 竞品分析 里按需调；不进 office 一级命令。

### B. 工程尾段·跨项目（2 条，fit 2/3——非设计核心，但补你"链路止于 task-plan"的执行肌肉）

#### 5. systematic-debugging — `obra/superpowers`  〔90/100〕
- **是什么**：根因优先的 4 阶段调试闸（"没有根因调查前，不准改"）。
- **为什么对你**：管住链路的**代码尾段**（tech-spec/task-plan 落地、改 hook/脚本），**正面对冲你自己反复踩的"打地鼠/没跑测试就说 done/验证假绿"**——和你的 auto-memory 同频。
- **证据**：⭐219,948（仓库级，非单 skill）｜ MIT ｜ 最近提交 2026-05-29。fit 2/3：纯代码调试，设计任务用不上。
- **装**：`npx skills add obra/superpowers@systematic-debugging -g -y`（全局，不进 office）。

#### 6. tdd — `mattpocock/skills`  〔90/100〕
- **是什么**：red-green-refactor 纪律（通过公共接口测行为、垂直 tracer-bullet）。
- **为什么对你**：你碰代码时（route-guard.mjs、memory 脚本、UI 背后逻辑）补 `verify`（跑 app）之外的"测试先行"。fit 2/3，设计流用不上。
- **证据**：⭐119,761（仓库级）｜ MIT ｜ 最近提交 2026-06-06。
- **装**：`npx skills add mattpocock/skills@tdd -g -y`（全局，不进 office）。

---

## 我们**特意没推**的（25 条拒，门禁在干活）

按拒因分组（完整原因见 `vetting-registry.yaml`）：

- **你已经装了 / 已内置（非冗余 FAIL）**：`superpowers` 整包（本地 v5.1.0 已装）、`anthropics/skills@skill-creator`（已装、描述逐字相同）、`mattpocock@handoff`（撞 handoff-review）、`mattpocock@git-guardrails`（update-config 能生成）、`obra@verification-before-completion`（你 verify + 三条 auto-memory 更强）、`wshobson@code-review-excellence`（你 code-review 可跑可改可评论，它只是文章）。
- **重复你已有的设计/评审（非冗余 FAIL）**：`vercel-labs@web-design-guidelines`、`leonxlnx/taste-skill`、`anthropics@frontend-design`、`VoltAgent@design-bridge`、`wshobson@ui-visual-validator`、impeccable 的 critique/audit 那一半——都撞 ux-audit/design-review/taste-review，且不少**违反你的品牌锁**（要求"别看着模板化/突破默认"，与 framework/ 母版 + 只叠品牌色冲突）。
- **重复你的 meta 层（非冗余 FAIL）**：`addyosmani/agent-skills`、`muratcankoylan/Agent-Skills-for-Context-Engineering`、`NeoLabHQ/context-engineering-kit`——和 plan-agent/orchestrator/三层记忆/evals 1:1 重叠。
- **License 硬门禁 FAIL（企业流程不能合法用）**：`emilkowalski/skill`（无 license）、`jakubkrehel/make-interfaces-feel-better`（README 说 MIT 但无 LICENSE 文件→API null）、`vercel-labs/agent-skills`（无 license）、`darcyegb/ClaudeCodeAgents`（无 license）、`NeoLabHQ/context-engineering-kit`（GPL-3.0 copyleft 传染风险）。**这是"星标高≠能用"的最好证明**——含多个万星仓库。
- **挂错类目 / 离题**：`mattpocock@grill-me`（其实是 brainstorm 类的苏格拉底，被标成 verification）、`anthropics@webapp-testing`（功能测试≠红队，重复 verify/run）。

---

## 覆盖与缺口（诚实记录，非静默截断）

- **5 通道**：C1 gh 搜索、C5 已知 hub 深挖最稳；**C2 skills.sh** 设计类最富（impeccable/taste-skill/anthropics 设计系/shadcn/gsap），但站点是客户端渲染、无公开 JSON API，靠扒首页内嵌 JSON 拿到 600 条真实 installs。**C3** 最有用的清单是 `helloianneo/awesome-claude-code-skills`（场景化、每行带真 repo）；`hesreallyhim/awesome-claude-code` 的目录还是 TODO，没抽到。
- **本次为控成本砍了 23 条**（dropped_for_cap，verify 上限 32）；按 fit 自评排序后砍尾，**低 fit 居多但不保证零漏**。
- **verification-redteam 作为独立类目最稀薄**：货架上几乎没有真正的"eval 框架/对抗式代码红队"，多是设计评审被挂错类目；你这块本就靠 redteam/evals + auto-memory 自给，结论是**别在这投**。
- **未深读**：travisvn / rohitg00/toolkit / ComposioHQ 全量——下一轮可定向。

## 怎么再跑这台机器

```
# 全量重扫（4 个领域）——会对本 registry 去重，只报新东西：
Workflow({ name: 'external-skill-scout',
           args: { focus:['claude-code-meta','code-engineering','design-frontend','verification-redteam'],
                   date:'<today>' } })
# 单领域定向：
Workflow({ name:'external-skill-scout', args:'design systems' })
```
机制已硬化：args 对象被 JSON 串化也能恢复；同一 skill 被两通道用不同名报出会按归一化名合并。
