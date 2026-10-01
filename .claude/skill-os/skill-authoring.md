# Skill Authoring — 写好 skill 的正面手艺

> 与 `skill-invariants.md` 互为表里：**那边守"哪些不能改"（保护区），这边教"怎么写好"（手艺）。**
> 写/改任何 SKILL.md 或框架文档前读本文件；创建新 skill 的流程走全局 `skill-creator`，质量标准查这里。
> 源：mattpocock/skills writing-great-skills 体系（MIT，pin 391a2701），经 2026-07 对标全评估
> 适配我方语境（评估链：framework-audit/mattpocock-benchmark-2026-07/）。

## 方法委托（唯一写作方法）

创建、修改或评审 agent-facing 文档前，完整读取
`.claude/skills/office/writing-for-agents/SKILL.md` 到 FILE_END；它是 predictability、context
pointer/branches、两种 load、steps/reference/disclosure、co-location、leading words、可查且
穷尽的 completion criteria、single source、environment lookup 与 pruning 的唯一方法权威。
目标是 skill 时再完整读取其 `SKILL-MECHANICS.md`，按当前 Claude/Codex loader 合同应用。
历史锚点“根德性：Predictability”“六个失败模式”“Leading word”“修剪纪律”也由上述
唯一 owner 的对应方法小节承载；先完成全文读取，再据实际目标应用，勿在本文件复制方法正文。
本文件保留技能结构与注册权限；保护字段和流程仍以 `skill-invariants.md` 为准。方法引用
不构成 skill preamble 执行、注册写入或效果授权，不能以篇幅变短宣称行为提升。

## 6. 与我方治理面的接线（写完之后）

写好只是一半；skill 要**可达**才存在：routing 词条（skill-routing-map.yaml）→ /office 登记
（如一级）→ input-modes → workflow-graph（如入流程）→ model-routing 三问 → parity 锚点
（双仓）→ FM-11 可达性实测。保护区红线查 `skill-invariants.md`（P1-P7）；行为改动过
FUSION 行为 A/B。编排层可达契约见 ORCHESTRATION-INTEGRATION（对标产物，模式可复用）。

**登记 ≠ 生效——还要接"消费面"（2026-07-21 补：登记齐全但决策逻辑没提它，等于没加）。**
上面是**曝光面**；曝光面登记完，再逐条问"**谁会读这条登记、它的真值逻辑提到这个 skill 了吗**"：
- **`.claude/agents/plan-agent.md` 块 2「研究方向编排」**——研究类 skill 必查。graph 的
  `research_default.tool_choice` 只是登记，Plan Agent 排研究 Phase 时是按块 2 的角度枚举做判断的；
  块 2 没写进去，它永远不会被推荐（实证：research-kit 曾登记齐全但块 2 漏列，靠用户提问才发现）。
- **`CLAUDE.md` 语义兜底段**——触发词覆盖不到的意图（词表是粗网），语义描述里要能读出该 skill。
- **相邻 skill 的正文指引**——上下游关系要在对方 SKILL.md 可改区落一句（如"还没数据？先跑 X"），
  否则跨 skill 转介只存在于图里、不存在于运行中。
自检一句：**"如果用户不说出触发词，这个 skill 会在什么判断路径上被想起来？"** 答不出=消费面没接。

<!-- FILE_END: skill-authoring.md -->
