# 全局可追溯矩阵——格式定义（v1.0，2026-07-02 落地填充）

> 本文件（fork 根，git 追踪）只定义**格式**，不存真实数据——跟 `muse-loop/schema.md` 是同类文件（结构定义 vs. REQ 实例数据分离，理由同 REQ 数据的物理落点决定）。**真实、随每个 REQ 增长的矩阵实例，落在 `docs/loop/traceability.md`**（经 muse 项目 `docs/` 软链），不进 fork 自身 git 追踪树——这是本文件之前的疏漏（曾经自己也被 git 追踪在 fork 根，跟"产出走 docs/软链"的决定正好相反），2026-07-02 已对齐。

## 为什么需要它

原始报告设想的核心收益：任何一个 UI 元素都能问"它为什么存在"，一路回溯到某次会议的某句话。没有这张矩阵，`muse-loop/schema.md` 里每条 REQ 各自的 `source_trace` 字段虽然记了单条需求的来源，但看不到**跨 REQ 的全局视图**（比如"这个 D-003 决策，是从哪几条 REQ、哪几次会议汇总出来的"）。

## 谁负责维护

`muse-loop-orchestrate`——每个 REQ 走完 Phase 1（triage）、Phase 2（design-map）、Phase 3（proto-judge verified）时，各自追加一行到 `docs/loop/traceability.md`（若文件不存在则先创建，写入表头）。这是 orchestrator 自己的职责，不是另一个独立 skill。

## 格式（表格，一行一个 REQ 的完整链路）

```markdown
| REQ ID | 语料来源 | 需求陈述 | 设计决策(D-系列) | 组件映射 | 原型文件 | 验收状态 |
|--------|---------|---------|-----------------|---------|---------|---------|
| REQ-速记-008 | 妙记obcnhby93v6426u4y3za998v#L100 | 速记首页三大核心入口定案 | D-012,D-013 | FxTabBar,FxIconButton | docs/loop/specs/REQ-速记-008/prototype.html | verified(3/3 AC pass) |
```

字段说明：
- **REQ ID**：对应 `docs/loop/specs/REQ-*/` 目录名。
- **语料来源**：`requirement.md` 的 `source_trace` 字段原样带过来，不重新表述。
- **需求陈述**：`requirement.md` 的 `title`。
- **设计决策(D-系列)**：`design.md`（`/design-brief` 完整跑一遍的产出）里这条 REQ 对应的 D-系列 ID 列表。
- **组件映射**：对照 `muse-loop/references/component-mapping-taxonomy.md` 词汇表选中的组件。
- **原型文件**：`prototype.html` 的实际路径。
- **验收状态**：`muse-proto-judge` 最终评分卡的状态（`verified`/`Reviewer Concerns` 等），带 AC 通过数。

## 更新时机（写入 `muse-loop-orchestrate` 的 Phase 3 收尾步骤）

一条 REQ 到达 `verified`（或达到轮数上限记为 `Reviewer Concerns`）时，才追加一行——不在中间状态（`triaged`/`designed`）重复写、避免同一 REQ 出现多行造成矩阵膨胀失真。若某条 REQ 后续被撤销/作废，追加一行状态标记为 `REVOKED`，不删除历史行（矩阵的价值就在于可审计、不被静默改写）。
