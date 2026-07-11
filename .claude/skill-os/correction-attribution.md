# Correction Attribution — 纠正归因阶梯（唯一真值源）

> 本文件是「用户打断纠正 → 根因归因」协议的**唯一全文真值源**。
> CLAUDE.md 写入协议只放速记指针，orchestrator.md §2c-obs 只放补漏一行，勿在别处复制全文。
> 背景：2026-07-11 luca——下游项目跑动中被纠正时只改产出物治标不治本；每次项目运行
> 都是框架的真实场景测试，skill/框架层缺陷必须借纠正时机接入现有治理轨道，否则自成长断链。

## 触发

用户在执行中途打断并纠正某个产出物或执行行为（= extraction-bar 信号①的中途形态）。
修完产出物之后、继续任务之前，必须过一次归因阶梯并给出披露块。

## 判定问题（先问这一句，10 秒内答完）

> **「同样输入，把这个环节重跑一遍，这个问题还会复现吗？」**

不会复现（一次性内容偏差）→ L1/L2（内容层，只修内容）；会复现（指令/模板/结构使然）→ L3/L4（框架层，接治理轨道）。

## 阶梯与处置

| 层 | 判据 | 处置 |
|---|---|---|
| L1 产出物层 | 本次产出的一次性内容缺陷（措辞/事实/漏项），重跑大概率不犯 | 只修产出物；披露一行带过 |
| L2 上游产物层 | 根因在上游 artifact（PRD/handoff/brief 的**内容**错），下游忠实继承 | 修上游 + 受影响下游，披露标注上游节点；上游是历史产物→先提请用户再改。仍属内容层不进治理轨道；同类第二次出现即信号②，按 extraction-bar 升级 |
| L3 skill 层 | SKILL.md 指令/模板/门禁/示例缺陷，任何人重跑同 skill 都会犯 | 快车道：`python3 .claude/observability/scripts/write_observation.py --skill <s> --message "<用户原话>" --rule "<s>: <蒸馏规则>" --applies-to <s> --severity medium`（立即 active，下次同 skill Preamble 注入即验证）。规则小而明确且用户在场→可提议当场修 SKILL.md（响应式改进，豁免框架建设预算；遵守 skill-invariants.md 保护区，保护区内→只落 rule 并提请 luca）。reusable 拿不准→降级 `propose_semantic.py --domain skill-rule` 候选 |
| L4 框架层 | 路由/编排协议/hook/记忆协议等结构缺陷，跨 skill 复现 | `python3 memory/scripts/propose_semantic.py --domain skill-rule --fact "<规则>" --confidence high --stable --evidence "<本次纠正+复现推理>" --scope "<范围>" --reviewer luca`（进 digest「待你裁决」）；重大结构问题→额外**提议**写 framework-audit/proposals/（提议即止，不自动写 gaps-register.yaml / BACKLOG.md——那是人工裁决面） |

## 处置默认（2026-07-11 luca 拍板：记录为主 + 条件当场修）

L3/L4 默认只做治理写入（一条命令），项目继续跑不中断；仅当缺陷会立刻再坑本次项目的
后续节点时，才提议当场修框架（仍须用户点头）。

## 披露格式（修复回复末尾，≤3 行，每次纠正都披露）

归因: L<n> <层名> ｜ 依据: <重跑会/不会复现 + 为什么，一句> ｜ 处置: <已跑命令的 O-/R-/候选 id ／ 修改文件 ／ 无>

- L1 允许压缩为修复说明后的一行括注：「（归因 L1：一次性表述偏差，无治理动作）」。
- 同 session 同根因被多次纠正→只归因一次，后续引用首次结论（防仪式化）。

## 与现有机制的边界（归因 ≠ 提取）

- 存不存经验仍由 extraction-bar 四信号 + CLAUDE.md 三分表裁决；本协议只回答「治理动作发往哪条轨道」。
  两个还原问题各管一段：三分表问「换项目还成立吗」（归属），本协议问「重跑还复现吗」（根因层级）。
- L3 rule 即写 = observability 快车道既有授权（README：explicit and reusable 可立即使用）；
  L3/L4 semantic 候选 = §2c-obs 同款宽进严出，不受四信号中途时机限制（extraction-bar【时机】既有豁免）。
- 拿不准层级时降级到更便宜的层（L3/L4 灰区→L3；L2/L3 灰区→L2），与 extraction-bar「拿不准就降级」同构。
- 处置当场执行（都是一条命令）；确因心流不宜中断，可先在 PROGRESS/TODO 记一行，
  本 Phase 结束前补跑（workflow 模式由 orchestrator §2c-obs 补漏回验兜底）。

## 维护规则

- 改动层级定义或判定问题措辞，须同步 CLAUDE.md「写入协议」速记段，并跑 `node scripts/check-capability-parity.mjs`。
- 本协议不新增 hook/脚本/日志文件；治理写入自带的 O-id/R-id/候选 id 即审计痕迹。

<!-- FILE_END: skill-os/correction-attribution.md -->
