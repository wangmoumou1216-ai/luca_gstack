# 竞品与设计参考分析（Mobbin 节点）— 必问一次，用户要才做

在设计链里发出这次询问时，或用户已说“要分析 / 看看竞品 / 参考别人怎么做”时完整读取；其余时候不加载。
这不是 skill、模式或审批；它产出一份**设计参考包**，由用户挑要采纳的条目，采纳的部分才进入 Brief 和附件。
范围只有 UI 和交互两个角度；动效不在本节点，归 `motion-polish`。

## 1. 何时问（必问，只问一次）

任务进入设计链时必须问一次，不要求先写出“某个具体决定”。谁最先到谁问：brainstorm 在其 Optional additional research
块里（gap-finder 之后），否则 design-brief 在 Phase 0。只有下面几种情况不再问：

- 用户已说“不用研究 / 直接做 / 不看竞品”：终局，本任务不再问。
- 本任务已问过（同意或拒绝已记入来源索引，下游继承，不重问）。
- 用户已经给了成形的截图 / 录屏 / 分析：只摄取，记为“用户已给材料”，视为已回答。
- 没有已锁定项目（NO_PIN）：照问；同意则只在对话里交付，不写项目文件，也不下载图片。

用户在任何时候说“要分析 / 看看竞品 / 参考别人怎么做”，视为同意，直接进入第 3 节，不再问。

## 2. 怎么问（一句话、开放、纯文本）

用本轮已有的入口句，问一次：

> 要不要做竞品和设计参考分析？我会用 Mobbin 查同类产品在界面和交互上的做法，给你一份带图的设计参考包，你挑要采纳的。要，还是不用？想指定对标哪几个产品也可以直接说。

不出选项菜单，不问预算、深度、维度。“要”或“你定”＝同意；“不用”＝终局。用户点名的产品必含；没点名就按需求搜同类，不编造产品。

## 3. 怎么做（用户同意后）

**执行体：** 主 agent 直接调用已授权的 Mobbin 工具，不交给后台子 agent，因为必须看图。`search_flows` 看交互（一步步怎么走），
`search_screens` 看界面，`search_sections` 只在对象是网站营销区块时用。

**不可用时：** 没授权、额度被拒、工具不在，一律返回 NEEDS_CONTEXT 并说明下一步（授权 Mobbin MCP / 检查套餐额度）。
不自动改用别的办法；只有用户明确选择“只看文档层先例”时，才改用 `quick-research`（≤3 个对象，整次 ≤6 次读取，
证据只到文档层，视觉和交互行为记 UNVERIFIED）。

**先定设计点：** 从需求里列出至多 4 个要参考的设计点（例如“新建联系人的流程”“客户列表页”），每个设计点一条查询。

**查询规则：**
- 一条查询只写一个目标，约束至多三个；平台用参数（`web` 或 `ios`，Android 查 `ios` 并注明）而不写进查询。
- 不写品牌、文案、“现代 / 简洁”之类形容词，也不写否定；一条查询里不并列多个界面或区块。
- 查询含多个部分用 `deep`，只在某个已点名产品内查找用 `standard`；结果弱时换查询，不是加 `limit`。
- 同一任务里 `task_intent`、`output_destination`（取 `doc`）、`output_tool` 必须保持一致。
- `search_screens` 返回 `ai_usage_notice` 时，原文展示，不改写。
- 预算：整次至多 6 次搜索调用，每条查询至多再追加一次；超出须用户同意。

**证据：** 先看图再下结论；flow 里没有预览的步骤，要打开它的 `image_url` 才能引用；核对 `app_name` 与 `platform`，
点名的产品没出现就如实写没找到，不凭记忆描述它，也不拿别家的图顶替。只写看到的；“采用不等于有效”；证据类型、出处、
日期、版本和反证沿用 [competitor-analysis.md](../ux-research/references/competitor-analysis.md) 的「观察与证据」，这里不复述。
对象本身是 AI/Agent 功能时，观察面按 [ai-native-design-framework.md](ai-native-design-framework.md) 的 Layer C（信任）与
Layer D（代理）记录，同样只写已见事实。

## 4. 设计参考包（要能指导设计，不是例子清单）

位置：已锁定项目的 `docs/research/mobbin-reference-<YYYY-MM-DD>-<slug>/`，内含 `reference-pack.md` 与 `images/`。
`reference-pack.md` 的形状：

```text
scope: <页面或流程目标>
decision_changed: pending

## 设计点 P1：<名称>
- 设计指导：<在本需求里怎么做、为什么；什么情况下不适用。写到区域、步骤、控件，不写视觉风格取值>
- 对应图：![](images/<slug>-01.png) · [Mobbin](<mobbin_url>) — 看图中<区域或第几步>：它说明什么
- 迁移判断：适合 / 不适合 / 需适配（一句理由）
- 可采纳条目（可直接进 Brief）：D：…；STATE：…；AC：Given/When/Then …
- 未知：…

## 设计点 P2 …

## 小结：3–5 句设计思路
```

规则：每条设计指导必须指向一张实际看过的图，没有图支撑的不写；每条都带可直接采纳的 Brief 条目；没有增量就如实写，不强造差异。
图片从 `image_url` 下载（链接 30 天过期，所以必须落盘），并转成**干净的 8 位 RGB PNG**，因为交接校验只接收 PNG：

```text
python3 -I -c "from PIL import Image; Image.open(SRC).convert('RGB').save(DST, format='PNG', optimize=True)"
```

存为 `images/<slug>-NN.png`，每包至多 8 张。图片仅作设计参考，不进入产品交付；文中引用只用 `mobbin_url`，不用过期的图片链接。

## 5. 交给 CD / OD

- 用户在 Brief 里采纳哪几条，才把它写成 D / STATE / AC（沿用 design-brief 现有规则，含稳定 ID）；参考包路径记进来源索引。
- 被采纳条目所依据的图，作为附件随冻结 Packet 一起交给 CD / OD：走交接现有的“原型证据”通道（`scripts/design-flow-handoff.mjs`），
  媒体类型 `image/png`，用途固定为 `interaction-reference`（设计参考），`source_ids` 取该条目在 Packet 里的 D / STATE / AC ID，
  路径 `mobbin/<slug>-NN.png`。不使用 `visual-reference`；没采纳的图不带。
  交给 CD 时走 `scripts/claude-design-handoff.mjs` 的 `attachments`，规则相同（`sourceIds` 同样取 Packet 里的 ID）。
- 这些附件只是参考：不新增 Packet / TAC 字段，不自动升 MUST，不覆盖用户的描述、设计规范和设计系统；
  CD / OD 的生成仍以 Packet 的 D / STATE / AC 为准。附件只在用户采纳后才交付，所以未采纳的内容不影响 CD / OD 的产出。

## 6. 记录与检验

同意、拒绝和参考包路径记进既有来源索引（design-brief Phase 0 登记的“来源 / 确认状态 / 未决项”，brainstorm 的 Source Research），
不新增字段；Source Research 没有路径可写时（例如拒绝），用一行 `competitor-scan: declined` 备注，不改字段定义。
每次询问结束，把“日期 / 问了 / 要或不用 / decision_changed”追加一行到所在项目的 `docs/research/competitor-scan-log.md`，
由用户在需要时核对。`decision_changed` 由用户当场的回答，或 Brief 中某条 D 的 rationale 引用本参考包并写明采用或调整来判定，
不由 agent 自评。预先登记的复核条件：执行满 5 次分析后，若 `decision_changed=yes` 的不到三分之一，
由用户裁决这个节点是否值得它的成本。

## 7. 边界

动效 → `motion-polish`，不在本节点。系统性、多维度的 UX 研究 → ux-research：由主 agent 先跑本节点，把参考包交给它，
它不自己调用 Mobbin。市场规模、定价、定位这类事实 → deepresearch / quick-research 本体。本节点不新建 skill、模式或审批。

<!-- FILE_END: competitor-scan.md -->
