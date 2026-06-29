# Phase 1 Agent Prompts — ux-brainstorm

> 外移自 `SKILL.md` Phase 1「上下文扫描 & 查漏」。本文件是 Phase 1 三个并行后台
> agent（Agent A / B / C）的完整 `task()` 调度模板（含 prompt 与输出 XML schema）。
> 在 Phase 1 发射 subagent 前完整读取本文件，按模板逐字构造三个调度；
> 除 `{...}` 占位符外不得改写 prompt 内容。

```
Subagent调度：3个并行后台agent
每个agent接收完整的研究内容（或冷启动想法），产出结构化XML。

--- Agent A: 提取设计约束与信号 ---
task(
  category="unspecified-high",
  load_skills=[],
  run_in_background=true,
  description="Extract design constraints and signals from research",
  prompt=`I am the ux-brainstorm skill's Phase 1 extractor (Agent A).

INPUT: <research>
{paste full content of ux-research report, OR user's cold-start idea}
</research>

GOAL: List every design constraint, validated paradigm, user behavior finding, and design signal the research states or strongly implies. Focus on findings that directly constrain or inform design briefs.

ALIGNMENT CHECK (MANDATORY):
Compare the research report's design problem definition with the user's actual input/need description.
- Are they asking the same question?
- If there is a gap or drift between the two, flag it in a separate <alignment_check> block.
- Example of drift: research asks "Agent Native大入口的交互设计" but user's need is "AX和GUI如何协作共存" — overlapping but not identical.

OUTPUT FORMAT (XML):
<alignment_check>
  <research_question>{research report's design problem definition}</research_question>
  <user_need>{user's actual input/need as stated}</user_need>
  <aligned>{true | false | partial}</aligned>
  <drift_description>{if not fully aligned: what's the gap}</drift_description>
</alignment_check>

<design_signals>
  <signal id="S1">
    <text>{design constraint or signal in active voice}</text>
    <source>{which research dimension: D1-D6}</source>
    <source_finding>{finding ID from research report}</source_finding>
    <confidence>{consensus | strong | disputed | unverified}</confidence>
    <design_impact>{how this constrains or informs design direction}</design_impact>
  </signal>
</design_signals>

RULES:
- Do not infer signals — only extract from research.
- Preserve the research's terminology.
- Mark confidence honestly, matching the research report's consensus status.
- Focus on actionable design signals, not general observations.`)

--- Agent B: 识别隐性设计假设 ---
task(
  category="unspecified-high",
  load_skills=[],
  run_in_background=true,
  description="Surface implicit design assumptions in research",
  prompt=`I am the ux-brainstorm skill's Phase 1 assumption-surfacer (Agent B).

INPUT: <research>
{same content}
</research>

GOAL: Identify design assumptions the research makes that are NOT explicitly stated. These are candidates for Phase 3 interrogation.

OUTPUT FORMAT (XML):
<implicit_assumptions>
  <assumption id="A1">
    <statement>{what the research assumes about user behavior or interaction feasibility}</statement>
    <evidence>{what in the research implies this assumption}</evidence>
    <risk_if_wrong>{what design direction breaks if this assumption fails}</risk_if_wrong>
  </assumption>
</implicit_assumptions>

RULES:
- Surface, do not validate. It's fine to flag assumptions that ARE true.
- Focus on assumptions about: user mental models, interaction patterns, AI feasibility, trust, control.
- 3-10 assumptions is typical. More than 10 means you're pattern-matching on noise.`)

--- Agent C: 对照设计方案检查清单找缺口 ---
task(
  category="unspecified-high",
  load_skills=[],
  run_in_background=true,
  description="Identify design-proposal-readiness gaps",
  prompt=`I am the ux-brainstorm skill's Phase 1 gap-finder (Agent C).

INPUT: <research>
{same content}
</research>

GOAL: Identify what is MISSING from the research relative to a design proposal checklist. Your output shapes which questions Phase 3 must ask the designer.

DESIGN PROPOSAL CHECKLIST:
- Design problem definition (is the design problem clearly stated, separate from solutions?)
- User behavior evidence (do we have behavioral evidence of how users act in this scenario?)
- Current interaction pain points (what's the specific friction in current flow?)
- Target user specificity (a named role with context, not a segment)
- Cognitive load analysis (which step has highest cognitive burden?)
- Mental model clarity (what do users compare this to?)
- AI feasibility evidence (is AI intervention validated or assumed?)
- Trust mechanism (how does user trust get established?)
- Failure mode coverage (what happens when things go wrong?)
- Scope boundaries (explicit in/out lists)

OUTPUT FORMAT (XML):
<gaps>
  <gap id="G1">
    <checklist_item>{item from list above}</checklist_item>
    <status>{missing | partially_covered | thin}</status>
    <what_exists>{what the research does say, if anything}</what_exists>
    <what_is_missing>{specific gap}</what_is_missing>
    <suggested_question>{question to ask designer in Phase 3}</suggested_question>
  </gap>
</gaps>

RULES:
- Only flag genuine gaps — not stylistic preferences.
- Suggested questions must be answerable by a UX designer (not a PM or engineer).`)
```

<!-- FILE_END: phase1-agent-prompts.md -->
