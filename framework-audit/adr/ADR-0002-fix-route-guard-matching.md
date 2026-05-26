# ADR-0002: 修复 route-guard 子串误匹配

状态: 提议 (P0 最小 stopgap) — 经辩论修订

> ⚠️ 辩论修订：`\b` 对 CJK 完全失效（探针：`/\b调研\b/` 连真阳性都打掉；英文 `research-proof` 也没修好）。降级为仅"长词优先"≈5 行 stopgap + 负例测试（负例并入 ADR-0005 harness）。Score↓≈6，与 ADR-0005 部分重叠。详见 `../DEBATE-CONCLUSION.md`。

## 背景
- A1+A3: `route-guard.mjs:227` 用 `text.includes(normalize(trigger))` 做关键词匹配，无词边界、无意图判断。
- A3 实证：`"我需要做一些市场调研背景的整理"` 与英文 `"please research-proof this sentence"` 都会触发 `PLAN_CHECK /deepresearch`（触发词 `调研`/`research` 嵌入正常词内）。**这正是本次 session 启动那条 `PLAN CHECK /deepresearch` 误报的根因**——它把"了解工程文件"误判为深度研究。
- A3: 17 处跨 skill 子串包含冲突（如 `调研`⊂`设计调研`、`网页`⊂`访问网页`）。
- A3: `test-route-guard.mjs` 13 条全是正例、0 负例，结构上抓不到这类误报。

## 决策
做，作为**有界快修**（彻底解法是 ADR-0005 的 description 自选路由）：
1. 短/英文触发词加词边界匹配（正则 `\b` 或对 CJK 用更长唯一短语），消除子串嵌入。
2. 对已知包含对（`调研`/`设计调研` 等）建立"更长匹配优先"规则，长词命中时不再叠加短词候选。
3. 给 `test-route-guard.mjs` 补**负例**（A3 复现的两条直接入库），让回归能抓住误报。

## 理由
ROI：影响=4（消除每日误报 + 修复本 session 同类问题），可行=4，成本=2。Score 8。高频痛点、改一个文件 + 测试。

## 后果
- 影响文件：`.claude/hooks/route-guard.mjs`、`scripts/test-route-guard.mjs`。
- 风险：中。改匹配逻辑可能影响现有正例命中——靠补齐的正负例测试守住。
- 验证：`node scripts/test-route-guard.mjs` 正负例全过；手测 A3 的两条误报输入不再触发 PLAN_CHECK；本 ADR 与 ADR-0005 不冲突（快修是过渡，迁移后此逻辑大幅简化或退役）。
