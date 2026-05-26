# 缺口 × 解法 交叉表 + ROI 排序

> 综合 Phase 1 内部诊断（A1-A5）与 Phase 2 源码级调研（B1-B3）。
> 评分：影响/可行性/成本 各 1-5，`Score = 影响 × 可行性 / 成本`，三维平权。
> 本次只评估不实施，所有 ADR 状态为「提议」。

## 元判断（先于单项）

框架的**机制复杂度已显著超过实际使用强度**：单用户、5 个 episode、2 条自成长产出、
22-30% 的 agent 规格 paper-only、记忆 12 脚本 read-thin。Phase 2 的三家成熟框架给出的
一致信号是 **「减法优先 + 单一真相源 + 让模型自选而非硬编码路由」**。因此排序里
P0 几乎全是减法/对齐，P1 是两处真正值得的结构性投资，重型编排扩张归入 P2 观望。

## 交叉表

| 内部缺口（诊断） | 外部解法（调研） | 影响 | 可行 | 成本 | Score | 档位 | ADR |
|---|---|---|---|---|---|---|---|
| A4: active SKILL.md 引用已删 hermes 脚本(FileNotFound)；orphan py 脚本 | 减法，无需外部 | 3 | 5 | 1 | 15 | **P0** | 0001 |
| A1/A3: route-guard `text.includes` substring 误判（本 session 实证） | B3: 短词加边界；正解是 description 消歧 | 4 | 4 | 2 | 8 | **P0** | 0002 |
| A5: AGENTS.md↔CLAUDE.md 路由语义漂移（Codex/Claude 分叉） | B1: 单一 state/contract 源 | 3 | 5 | 1 | 15 | **P0** | 0003 |
| A1/A4/A5: compare 缺 input-modes、superpowers 3 命名、品牌色不一致、docs/evals 路径矛盾 | 减法/对齐 | 2 | 5 | 1 | 10 | **P0** | 0004 |
| A1/A5: skill 列表手维护在 5 个配置面，已分叉 | B3: 1 个 SKILL.md frontmatter 派生，description 自选路由 | 5 | 3 | 4 | 3.75 | **P1** | 0005 |
| A4: 学习闭环两端手动（hook 只 print，晋升靠人工） | B2: Mem0 `add(infer=True)` hook 内直接抽取写库；LLM 驱动 ADD/UPDATE/DELETE | 5 | 3 | 4 | 3.75 | **P1** | 0006 |
| A2: 编排 22-30% paper-only；turn-count 代理 token；hierarchical 空转 | B1: delegation=tool call(=Task 工具)、真实 usage、reducer 单状态 | 4 | 2 | 5 | 1.6 | **P2** | 0007 |
| 从记忆延续：GEPA 需 eval 数据，eval 系统空(0字节) | — | 4 | 2 | 5 | 1.6 | **P2** | 0007 |
| B3: 官方 anthropics skills(pdf/docx/xlsx/pptx) 可替换自维护同名 | B3: 直接安装 | 2 | 4 | 2 | 4 | **P2** | 0007 |

## 档位说明
- **P0 立即做**：纯减法或一致性对齐，低成本高确定性，先把"会出错/会分叉/会误导"的东西清掉。
- **P1 值得做**：两处结构性投资——单一真相源 与 自转记忆闭环——根因级，回报最大但需设计。
- **P2 观望**：重型编排扩张、真实 token 计量、GEPA。理念正确但当前 ROI 不足或可行性存疑，
  设触发条件后重评。

## ADR 索引
- `adr/ADR-0001-remove-dead-code.md` [P0]
- `adr/ADR-0002-fix-route-guard-matching.md` [P0]
- `adr/ADR-0003-unify-routing-contract.md` [P0]
- `adr/ADR-0004-consistency-cleanup.md` [P0]
- `adr/ADR-0005-single-source-of-truth-skills.md` [P1]
- `adr/ADR-0006-self-turning-memory.md` [P1]
- `adr/ADR-0007-watchlist.md` [P2]
