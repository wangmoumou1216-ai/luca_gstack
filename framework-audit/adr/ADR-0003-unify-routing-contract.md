# ADR-0003: 统一路由契约（AGENTS.md ↔ CLAUDE.md）

状态: 提议 (P0)

## 背景
- A5: CLAUDE.md:546 声称 AGENTS.md 与之"同一套路由语义"，实测已漂移：
  - CLAUDE.md:10/12 强制"即使高置信命中 skill 仍须检查 Plan Agent 4 条件"；AGENTS.md:19/21 只说"复杂需求→Plan Agent"+"高置信才调 skill"，丢了这条核心约束。
  - AGENTS.md:433 缺 CLAUDE.md:299 的 `PLAN CHECK`（重型 skill）与"已知满足某条件"触发。
- 后果：Codex 与 Claude 对同一请求会做不同路由决策。
- B1 印证方向：成熟框架靠**单一 state/contract 源**，不靠两份手抄。

## 决策
做：抽出一份 `routing-contract.md` 作为单一真相源（路由层级、Plan Agent 4 条件、Project Gate、PLAN CHECK 触发），CLAUDE.md 与 AGENTS.md 都改为**引用**它而非各自复述。过渡期若不抽离，至少把 AGENTS.md 的路由节同步回 CLAUDE.md 当前语义。

## 理由
ROI：影响=3（消除 Codex/Claude 分叉），可行=5，成本=1。Score 15。低成本、消除真实不一致。

## 后果
- 影响文件：新增 `routing-contract.md`；改 CLAUDE.md「Routing Contract」+ AGENTS.md 路由节。
- 风险：低。
- 验证：diff 两文件路由语义无矛盾；构造一个"高置信命中 skill 但满足 Plan Agent 条件"的样例，确认两套指令给出相同决策（都先 Plan）。
- 关联：与 ADR-0005 的单一真相源同源思想，可合并推进。
