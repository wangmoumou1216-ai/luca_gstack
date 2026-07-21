---
name: research-kit
preamble-tier: 1
version: 1.0.0
description: |
  一手研究工具设计：把 PRD 假设/研究问题变成**可执行的采集工具**——访谈提纲、问卷、
  可用性测试计划、卡片分类法方案。
  **Defining constraint：只产研究执行物，三不产——不产研究发现（ux-research 职责）、
  不产洞察解读（insight-synthesis 职责）、不采集数据（luca 亲自执行，工具武装他）。**
  与 ux-research 划界：desk research（外部证据）vs 一手采集工具（对内武装）；
  与 insight-synthesis 划界：上下游——kit 武装 luca 去采集，synthesis 消化采回来的数据，
  中间那一步永远是人。
  源：蒸馏自 Owl-Listener/designer-skills（MIT）design-research 集，适配 luca_gstack 语境。
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
context-cost:
  self: 5134  # 实测字节数 wc -c（G5 口径），2026-07-21
  runtime-estimate: 12000
  shared-refs: [none]
  recommended-model: guided-execution  # 三问：token 小（单文档产出 5-15k）× 判断杠杆中（问题质量决定数据质量，但有守则表可依）× 错判代价低（工具可重跑，采集前可预测试）→ guided-execution
---

## Preamble (run first)

```bash
python3 .claude/observability/scripts/get_rules.py research-kit "*" 2>/dev/null || true
cat .claude/current-topic.txt 2>/dev/null || true
```

## 定位（研究段上游缺失环：采集之前）

```
brainstorm(PRD 假设/Outstanding Questions) → /research-kit(假设→工具) → [luca 亲自采集] → /insight-synthesis(数据→洞察)
```

| 入口 | 管什么 | 不用它当 |
|---|---|---|
| ux-research / deepresearch | 外部证据（desk research，只产发现） | 一手采集的工具设计 |
| **research-kit（本 skill）** | **研究执行物**（提纲/问卷/测试计划/卡片分类） | 发现、解读、采集本身 |
| insight-synthesis | 采回来的一手数据 → 两层洞察 | 还没数据时的工具准备 |

场景：A（新功能验证假设）/ B（已有功能摸问题）/ D（Agent 化前摸用户心智）。
使用节奏天然低频（工具与洞察之间隔着 luca 亲自采集）——60 天零使用属预期，非降级信号。

## 流程（单 agent 内联五步）

1. **定标（缺任一先问清）**：要回答的研究问题/待验证假设（优先从最新 PRD 的 Outstanding
   Questions / 关键假设节取，`ls -t docs/prd/*.md` 探测；无 PRD 时请用户口述）；
   目标对象是谁；选哪种工具（用户没点名时按下表建议并 AskUserQuestion 确认）：
   - 想知道**为什么/怎么想** → 访谈提纲
   - 想知道**多少人/分布** → 问卷（前提：问题已知，只是量化；探索性问题回访谈）
   - 想验证**方案能不能用** → 可用性测试计划
   - 想定**信息结构/导航** → 卡片分类
2. **Load `references/instruments.md` now — 产出前必须完整读取**（对应工具节的结构、
   守则表、量表基准、分析计划要求）。
3. **产出工具**：按 instruments.md 对应节的结构生成，每个问题/任务都绑定它服务的研究问题
   （「本题回答 RQ-{n}」）——绑不上的删掉。
4. **质量门（产出前逐项过，FAIL 就地返工）**：
   - 访谈/测试：每个问题过**非引导性守则表**（含预设答案/情绪即重写；可 yes/no 的扩成开放式）
   - 问卷：每题答得出「这题回答什么决策」；Likert 有中点+两端标注；无双管/引导/行话
   - 测试计划：任务给情境不给操作指令；每任务有成功判据；附试运行清单
   - 通用：工具能被"不了解项目的第三方"直接执行——做不到=还不够具体
   - **工具级四查（在逐题检查之上；2026-07-21 首轮实战实证：逐题全过，整体仍可失效）**：
     ① **自洽**——把工具自己声明的纪律逐条与每道题对账：**有没有哪道题违反了本工具自己写的规则？**
        （实证：提纲写了"主持人全程不得先说出 X"，两道题里主持人自己说了 X，且污染其后全部题目）
     ② **对靶**——工具测的问题，和上游那句假设的**逐字含义**是同一件事吗？不是 → 必须在诚实边界
        写明"测的是什么 / 没测什么 / 要测得补哪个工具"，不许指望读者自己发现替换。
     ③ **可判**——主结果有**事前编码判据 + 判定阈值**吗？编码者是不是就是假设持有者（无盲）？
        无判据=采完各说各话；同人编码=确认偏误无护栏（至少要有一份worked 正/负/含混例）。
     ④ **样本不自证**——筛选条件排除了会**自动确认假设**的人群吗（内部人 / 已接触过被测概念 /
        被测词汇本就来自本团队）？不排除=拿自己的话回声当验证。
5. **落盘 + 交接提示**：写 `docs/research/research-kit-<topic>-<YYYY-MM-DD>.md`
   （同日重跑加 `-001` 序号不覆盖）。末尾附一句：「采集完成后，把原始数据投 /insight-synthesis
   产洞察；本文档的研究问题清单可直接作它的定标输入。」

## Handoff（分级：standalone 终端交付免写；workflow 模式必写）

standalone 模式下产出即终端交付（luca 拿工具去采集），按 lightweight 豁免 DONE 合法。
workflow 模式（编排链中、insight-synthesis 为既定下游）必写：

```bash
mkdir -p docs/handoff
```

按 `.claude/skills/office/references/handoff-protocol.md` 写
`docs/handoff/YYYY-MM-DD-<topic>-research-kit-handoff.md`，**必含**：研究问题清单、
工具类型与文件路径、目标对象与建议样本量、下游（insight-synthesis）定标输入指引。
workflow-state 由编排层更新（同 insight-synthesis 先例，本 skill 不自写）。

## 末尾约束

1. **三不产是硬边界**：产出里出现"发现/结论/洞察"字样的断言 → 删除或改写为待验证问题。
2. **非引导性守则是硬门**：一个引导性问题都不放行——数据质量在问题出口处决定。
3. **诚实的工具**：样本量/时长/方法的局限如实写进工具文档，不许诺工具达不到的置信度。

<!-- FILE_END: research-kit/SKILL.md -->
