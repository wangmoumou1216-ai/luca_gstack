# ADR-0005: 单一真相源 + description 自选路由

状态: 提议 (P1) — 经辩论修订

> ⚠️ 辩论修订：cost 4→5，Score≈3.0。拆为 (a) 安全的 SSOT 派生脚本【做】+ (b) description 路由迁移【迁移前必须先过中文命中率测试；因 ADR-0004 一致性检查已使 5-文件现状可接受，(b) 降优先】。中文 description 自选路由属未验证假设，不得在测试通过前迁移。详见 `../DEBATE-CONCLUSION.md`。

## 背景
- A1/A5: skill 列表手维护在 **5 个配置面**（skill-routing-map.yaml / input-modes.yaml / optional-workflow-graph.yaml / commands/*.md / CLAUDE.md 表），无单一真相源。已分叉：compare 缺 input-modes、superpowers 3 命名、Plan Agent 4 条件在 3 处。
- A1/A3: 路由靠 substring hook，结构性误判（见 ADR-0002）。
- B3 源码级结论（anthropics/skills、obra/Superpowers、SuperClaude 三家）：
  - **三家都只有 1 处真相源**：skill = 一个目录 + 一个 `SKILL.md`，frontmatter 仅 `name`+`description`；列表扫目录自动派生或单数组登记。**没有一家有 luca_gstack 那样的多份副本。**
  - **三家零 substring hook**：全靠模型读 `description` 自选 Skill 工具。anthropics 风格 description 同时写**正例 + 反例**（`Triggers include:...` / `Do NOT use for.../SKIP:`，见 docx/claude-api SKILL.md:3）——这正是消"调研 ⊂ 设计调研"歧义的正解：用反例消歧，而非 hook 黑名单。

## 决策
做，分步迁移：
1. **真相源归一**：以每个 `SKILL.md` frontmatter（name + 带正/反例的 description + modes）为唯一源；routing-map / input-modes / workflow-graph / CLAUDE.md 表改为**从 SKILL.md 派生**（脚本生成或运行时扫目录），不再手抄。
2. **触发改为 description 自选**：把"软路由"（选哪个设计 skill）交给模型读 description；route-guard 只保留**硬闸**（Project Gate、复杂度/Plan Agent 门禁），与触发解耦。
3. **保留 ADR-0002 快修**作为迁移前过渡。

## 理由
ROI：影响=5（A1/A3/A5 多缺口同一根因），可行=3（需改生成脚本 + 重写 description），成本=4。Score 3.75，P1 第一优先。这是回报最大的结构性投资。

## 后果
- 影响文件：全部 SKILL.md 的 frontmatter description（加正/反例）；新增派生脚本；route-guard 瘦身；4 个配置面降级为生成产物。
- 风险：中。中文 description 命中率不确定——**必须先建测试 harness 回归**（见 ADR-0007 引用的 superpowers `tests/skill-triggering/run-test.sh`，跑 `claude -p` grep Skill 调用）。硬约束必须留程序化 hook，纯模型自选无确定性保证。
- 验证：派生脚本输出与现有 4 配置面 diff 收敛为 0 手维护点；触发测试 harness 对中文触发词命中率达标后再切；`check:routing-map` 改为校验"派生一致性"。
