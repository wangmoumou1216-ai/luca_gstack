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

## 显式入口：decision-questionnaire

只有用户显式选择 `entry_mode=decision-questionnaire` 才进入本分支：把发送者无法独自解决的
决策或事实缺口，变成交给知情收件人填写的 Markdown discovery questionnaire。它沿用
research-kit 同一入口，不新增 skill 或 Workflow。未选择此模式时，下方原四种研究工具及其
定标、质量门、outputpath 与 insight-synthesis 下游保持原合同。

- **正路由**：要从特定收件人取得自己欠缺的知识，以支持原来的决策；可异步填写或一起开会填写。
- **反路由**：量化群体分布仍走原问卷模式；准备真实访谈/测试/卡片分类仍走原工具；已有一手
  定性资料并请求解读才另行选择 insight-synthesis。普通待审计划的设计树澄清归 grilling。
- 不把单个专家、审批人或客户当统计样本，不套用 Likert/NPS/SUS、样本量或置信度来包装此分支。

### 输入、权限与流程

1. **先问 send，不问 subject**：向发送者一次确认收件人的 role、expertise、relationship，
   以及对方知道而发送者不知道的具体知识范围；已有真实回答直接复用。再一次确认要带回的
   need-back 清单：哪些具体 decisions/facts 未决、每项答案要让谁能够做什么决定或动作。
   不要求用户先回答这些只能由收件人提供的领域事实，不用推荐、沉默或模拟回答补齐输入。
2. **绑定回流与精确路径**：确认 from/to、原决策 owner、背景与答案用途；内部调用继承原
   U-ID、scope、resume_target、authority_record 及权限交集，standalone 则确认这些回流信息。
   输出沿用 `docs/research/research-kit-<topic>-<YYYY-MM-DD>.md`，同日重跑加 `-001` 序号不覆盖；
   必须确认命名约定下真实根中的精确已授权 `output_path`，不得从 cwd、共享 docs/ 或 symlink
   别名推定项目或写权。recipient、need-back 或已授权精确路径缺任一，真实追问后等待，
   保持 NEEDS_CONTEXT 且不写问卷。发送目的尚未定的独立决策，先完整读取 `../grilling/SKILL.md` 到 FILE_END 再按其合同澄清，
   只澄清 send 并返回同一 owner，不新开研究闭环或扩大权限。
3. **Load `references/decision-questionnaire.md` now — 起草前完整读取**。
   将 need-back 项逐一编号并映射到实际决策/动作，再生成主题和问题；每题一个 idea，标明
   decision/need-back ID 与期待的回答类型，题下留空 answer stub，不编答复。按重要性优先，
   含 purpose、from/to/use、简短 context、how-to-answer（deadline/effort、允许 partial/unknown）、
   themes、必要的 why-it-matters，以及 anything-else 收尾题；未知截止日期不能写成已承诺。
4. **问卷专属质量门**：每个 need-back item 都有对应题，每题都服务真实决策且能由已确认
   收件人回答；复合题拆开，预设答案或行话重写。核对重要性顺序、主题、回答类型与空 stub，
   回流用途能让未参加前述讨论的收件人理解。四种研究工具的统计/编码门不套到本分支；
   文档只是待回答工具，不能把问题、例子或空 stub 宣称为发现、洞察或收集完成。
5. **落盘与返回原 owner**：写前实际重读目标及批准 scope，核验 preimage/CAS，保存用户编辑；
   只写这份已授权问卷，报告真实路径和未答项。答案由人采回；用户之后提供真实回复时，
   原文、来源、未知项和 decision 映射回到原决策 owner 与原 scope/resume_target，不能自动
   交给 insight-synthesis、产生新研究结论或替 owner 做决定。不自动发送、发布、追催或调用
   外部系统；准备文件不授予发送/采集权限，任何另行要求的外部动作仍过其真实授权门。

本分支的共享 handoff 记录 mode、真实 questionnaire 路径与 SHA、收件人/need-back 及逐题覆盖、
原 owner/scope/resume_target、已解决的 send 决策、未答项与下一真实动作。决定是否免写 handoff 前，完整读取
`.claude/skills/office/references/handoff-protocol.md` 到 FILE_END，再按实际 context-cost、终端/恢复条件判断；
不能因 research-kit 的旧轻量用途默认豁免。需要写时沿用下方 handoff 命名约定，先有该精确
路径的权限；不写 workflow-state，不自动写 memory。内容生成不等于已收答或完成原决策。

## 原四研究模式流程（单 agent 内联五步）

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

## Handoff（原四研究模式：按共享豁免条件判断）

与 decision-questionnaire 相同，决定豁免前完整读取共享 handoff-protocol.md 到 FILE_END，
按实际 context-cost、runtime-estimate、终端/恢复条件判断，不因 standalone 或文档数量默认轻量。
本 skill 当前 runtime-estimate=12000，不满足轻量阈值，standalone 终端交付也必须写 handoff。
workflow 模式（编排链中、insight-synthesis 为既定下游）同样必写：

```bash
mkdir -p docs/handoff
```

按 `.claude/skills/office/references/handoff-protocol.md` 写
`docs/handoff/YYYY-MM-DD-<topic>-research-kit-handoff.md`，**必含**：研究问题清单、
工具类型与文件路径、目标对象与建议样本量、下游（insight-synthesis）定标输入指引。
**不写 workflow-state**（原则，非仅循先例）：本 skill 是可选研究工具节点、单文档工具交付，
无"中断后从此节点续跑"的语义可落——属「不占固定流程节点，故不写 workflow-state」这一类。
重型多阶段的固定节点（deepresearch/ux-research/design-brief 等）才写。节点状态由编排层维护。

## 末尾约束

1. **三不产是硬边界**：产出里出现"发现/结论/洞察"字样的断言 → 删除或改写为待验证问题。
2. **非引导性守则是硬门**：一个引导性问题都不放行——数据质量在问题出口处决定。
3. **诚实的工具**：样本量/时长/方法的局限如实写进工具文档，不许诺工具达不到的置信度。

<!-- FILE_END: research-kit/SKILL.md -->
