# 月度演进 digest — 2026-07

> 模式: **propose-only**（零自动编辑 luca_gstack；不走 consolidate_memory 晋升门）
> 运行: framework-evolution-scout 两段跑（首跑 2026-07-02 撞 session limit 13 agent 阵亡 → 2026-07-02 晚 resume 补齐，29/29 全完成，缓存重放发现层）
> 红线: 热度≠适配——star 只是发现先验，录取要 fit-to-gap + 跨源收敛 + 过硬门

## ⚠️ 中途版结论被终版反转（方法论教训，先读这条）

首跑残缺版（红队未跑）曾给出 **2 APPROVED（rulesync w90 / sem w83）**；resume 补齐红队后**两者均被击杀**，最终 **APPROVED 归零**。教训实证：verify 过硬门 + 高分 ≠ 采纳——**红队 steelman-the-incumbent 这一层砍掉了全部幸存者**。跳过红队直接采纳会引入两个真实坏决策。

## 终版统计（29/29 agent，核验层完整）

发现 40 → 去重 19 → **核验 19/19** → APPROVED **0** / CONDITIONAL **1** / rejected 18（含红队击杀 4）/ opportunities 6。
四源产出全部归零录取：S1 14→0、S2 8→0、S3 10→0、S4 8→0；五个 open gap 本月零外部覆盖。

## ❌ 红队击杀 4（理由已抽查核实——引用的仓内事实均真实存在）

| 候选 | gap | 击杀理由（steelman 现有能力） |
|---|---|---|
| **rulesync**（曾 w90 APPROVED） | routing-frag | 现有 check-routing-map（ADR-0005 SSOT 门）+ build-self-model --check + daily_governance 已原生覆盖该模式；唯一新增件"生成 CLAUDE/AGENTS 路由表"是伪 fit——表内含 yaml 推不出的语义散文，且 CLAUDE↔AGENTS 字面镜像**本仓已明确否决**（check-routing-map.mjs #14 注释，实查存在） |
| **Style Dictionary 模式** | routing-frag | 自动写入 CLAUDE.md/AGENTS.md = 给每-session context 面装自动 writer，且**反转既有真值方向**（parseHiddenSkills 以 CLAUDE.md 散文为真值源，实查 74-93 行属实）；w90 严重超分 |
| **sem**（曾 w83 APPROVED） | fusion-impact | 本仓代码图谱切片**实测为空**（~7.9K LOC：1 个 Python 跨导入、0 个 mjs 本地导入；真实耦合全是 subprocess 字符串 + md/yaml 值，tree-sitter 看不见）；且 2026-06 已有同 gap 裁决先例（CodeGraph=下游可选），sem 换名重复 |
| **CoDD** | fusion-impact | 拟建的每条边都已是自动跑的失败断言（SSOT-1..9 + daily_governance + build-self-model --check）；真正开放的"未知耦合发现"它不解决，还新增第三份可腐化的耦合真值副本 |

## ✅ 本周期唯一落地采纳：langgraph 拒绝理由的副产品（已完成，非提案）

langgraph 本体被拒（编译期校验被本仓原生更强覆盖 + 与"路由刻意 LLM 语义化"架构冲突），但其红队调研实证了真缺口：**`optional-workflow-graph.yaml` 与 observability `rules.yaml` 零 checker 覆盖**。已落地 **SSOT-8/9**（check-routing-map.mjs）：
- 真 YAML 解析（python3+PyYAML 桥，CI 同 job 已装）——初版正则形态 lint 被本地红队打出 **7 条 CONFIRMED**（假阳：quoted 标量/块列表重排；漏报：块式路径/块式 scope.skills）后全量重写
- 合法名集 = project ∪ hidden ∪ **builtin（web-access/tdd/lark-\*）** ∪ external（从 `invoke 含 :` 推导，删硬编码）∪ office
- SSOT-9 附 flow-style 钉死（get_rules.py 手写 parser 误读块列表为 apply-to-all——runtime 真值语义对齐）
- 契约显式注释：graph 的 degrade_target/tool_choice/gate id 是概念标识**不校验**（文档化局限）
- 验证：**10 用例变异矩阵全对**（4 假阳转 PASS、2 漏报转 FAIL、4 回归保持）+ verify.sh 全绿

## ⚠️ CONDITIONAL 1（记录待裁决，无行动）

**feishu-whiteboard-pro**（GAP-design-methodology-review，adapt-idea，w70→红队 downgraded）：「生成型 skill 内嵌独立批判 gate」样本。红队：3 个自称新颖机制里 2 个已存在于 ux-audit/quality-gate/handoff-review；仓龄 16 天 50★ 无维护记录；剩余真 delta 很薄（对抗式最弱轴批判 + 显式停止条件）。**建议：不采纳，留档下周期看其存活度。**

## 💡 opportunities 6（无 gap 映射，仅记录）

Medusa（AI-first 安全扫描，含 .claude/ 供应链检测）· obsidian-skills（kepano）· ECC（star 曲线异常已标记）· oh-my-claudecode · OpenViking · Hindsight

## 渠道备注（薄面如实）

- S2：MCP spec 2026-07-28-RC（05-29 发布）未逐条评估，**下周期跟进**其对 figma/lark MCP 面的影响。
- S1/S4：design critique / heuristic evaluation 两脉极薄；GAP-design-methodology-review 本月外部零覆盖（feishu-whiteboard-pro 是唯一薄命中）。
- 供应链好 catch：vitali87/code-graph-rag 自曝账号 suspended（S3 主动丢弃）。
- skills.sh leaderboard 未走（web 工具未加载，gh 覆盖判定足够）。

## 裁决状态

1. ~~rulesync 立项~~ → **红队击杀，不采纳**（理由已核实）
2. ~~sem 安装~~ → **红队击杀，不采纳**（理由已核实）
3. ~~check-routing-map 扩展~~ → **已落地 SSOT-8/9**（含红队 v2 重写 + 10 用例变异矩阵）
4. ~~11 个候选补验~~ → **已 resume 补齐**（19/19 verified）
5. feishu-whiteboard-pro → 建议不采纳留档，**待 luca 确认**
