# 月度演进 digest — 2026-07

> 模式: **propose-only**（零自动编辑 luca_gstack；不走 consolidate_memory 晋升门）
> 运行: framework-evolution-scout（26 agents / 282 tool-uses / ~15min；2026-07-02）
> 红线: 热度≠适配——star 只是发现先验，录取要 fit-to-gap + 跨源收敛 + 过硬门

## ⚠️ 本轮核验层残缺（诚实声明，先读这条）

26 agent 中 **13 个因 Claude session limit 阵亡**（resets 19:40 Asia/Shanghai）：11 个 verify（HyperAgents/codd-dev/mcp-accessibility-scanner/wilwaldon-toolkit/feishu-whiteboard-pro/claude-cookbooks/NVIDIA-Guardrails/tokens-studio/prd-writer/stylelint-strict-value/style-dictionary）+ **2 个 redteam（恰好打在两个 APPROVED 上）**。
后果：① 2 个 APPROVED 的 `redteam_verdict: stands` 是 **agent 返回 null 后的默认值，不是对抗裁决**——采纳前必须补跑红队；② 11 个候选未验证即出局，本轮 rejected/dropped 数字对它们不公平。
补跑（发现层已缓存，resume 便宜）：
`Workflow({scriptPath:'<session>/workflows/scripts/framework-evolution-scout-wf_f85699ff-52e.js', resumeFromRunId:'wf_f85699ff-52e', args:{date:'2026-07'}})`

## 统计

发现 40 → 去重 19 → 核验 8（11 个未跑成）→ **APPROVED 2 / CONDITIONAL 0 / rejected 6 / opportunities 6**；红队击杀 0（红队未跑）。
源产出：S1-github-stars 14→2；S2-anthropic-platform 8→0；S3-agent-frameworks 10→0；S4-design-craft 8→0。

## ✅ APPROVED 2（verify 完整 + 供应链扫过；**红队未跑，待裁决前补**）

| 候选 | gap | 复用 | 一句话 | 关键 caveat |
|---|---|---|---|---|
| **rulesync** dyoshikawa/rulesync（1206★/MIT/07-01 活跃，w90） | routing-fragmentation | **port-pattern（勿装 CLI）** | 单源声明→构建期生成多目标配置：skill-routing-map.yaml 当唯一真值源，marker-block 生成 CLAUDE.md/AGENTS.md 路由节 + git-diff CI 门 | 只解决 5 文件的同步税半边（文件数不减）；要写 ~100-200 行自家 generator；动宪法级文件须 propose-first。供应链干净（port 零代码引入） |
| **sem** Ataraxy-Labs/sem（3029★/Apache-2.0/当天活跃，w83） | fusion-impact-automation | install（brew，pin rev 7d96a5b） | git 之上实体级 diff/impact/blame（tree-sitter 31 语言，零索引），fusion preflight 可 shell 出 `sem impact --json` 拿改动爆炸半径 | 只覆盖代码层切片；FM-6 清单里 4 个 md/yaml 值耦合它看不见，手写检查必须保留。egress 已标记（cloud 全 opt-in，勿 `sem login`；二进制名与 GNU Parallel 撞名；仓龄仅 5 个月） |

## 💡 opportunities 6（无 gap 映射，仅记录）

Medusa（AI-first 安全扫描，含 .claude/ hooks/skills 供应链检测）· obsidian-skills（kepano 官方 Obsidian skills）· ECC（agent harness operator，224k★ 但 star 曲线异常已标记）· oh-my-claudecode（teams-first 多 agent 编排）· OpenViking（自进化 context DB）· Hindsight（学习型 agent memory）

## ❌ rejected 6（代表性）

- **langgraph**（routing gap，w80）：编译期校验被本仓 check-routing-map.mjs（240 行）**原生更强**覆盖；声明式 StateGraph 与"路由刻意 LLM 语义化"（feedback_semantic-not-hardcoded-keywords）架构冲突。**副产品发现（可行动）：`optional-workflow-graph.yaml` 与 observability `rules.yaml` 不在现有 checker 覆盖内（grep 实证），~20 行扩展可关掉——这是真 gap，与 langgraph 无关。**
- 其余：promptfoo/deepeval/letta/swarm 等——重叠既有 eval-infra/记忆/编排，或错层。
- 供应链好 catch：vitali87/code-graph-rag 自曝账号 suspended（S3 主动丢弃）。

## 渠道备注（薄面如实）

- S2：MCP spec 2026-07-28-RC（05-29 发布）未逐条评估，**下周期跟进**其对 figma/lark MCP 面的影响。
- S1/S4：design critique / heuristic evaluation 两脉极薄（最佳命中仅 6★）；GAP-design-methodology-review 本轮 0 覆盖。
- skills.sh leaderboard 未走（web 工具未加载，gh 覆盖判定足够）。

## 待 luca 裁决

1. rulesync port-pattern 要不要立项（先补红队）——生成器 ~150 行 + CI 门，动 CLAUDE.md/AGENTS.md。
2. sem 要不要装（先补红队）——brew pin rev，只接 fusion-preflight，不进 route-guard/office。
3. langgraph 副产品：check-routing-map 扩展覆盖 optional-workflow-graph.yaml + rules.yaml（~20 行，无外部依赖，可独立做）。
4. 11 个未验证候选要不要 resume 补验（19:40 后）。
