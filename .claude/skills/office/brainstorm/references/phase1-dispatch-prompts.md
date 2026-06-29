# Phase 1 Dispatch Prompt Templates — loaded on demand in Phase 1; contains the verbatim dispatch prompts for Agents A/B/C (do not paraphrase when firing tasks).

```
Subagent dispatch: 3 parallel background agents
Each agent receives the full research content (or cold-start idea) and produces structured XML output.

# If environment supports task(): use the prompts below with task(run_in_background=true)
# If environment does NOT support task(): execute each prompt sequentially as internal reasoning

--- Agent A: Extract stated requirements ---
task(
  category="unspecified-high",
  load_skills=[],
  run_in_background=true,
  description="Extract stated requirements from research",
  prompt=`I am the brainstorm skill's Phase 1 extractor (Agent A).

INPUT: <research>
{paste full content of research.md, OR user's cold-start idea}
</research>

GOAL: List every explicit requirement, capability, or user-facing behavior the research states or strongly implies. Do NOT add requirements not supported by the text.

OUTPUT FORMAT (XML):
<stated_requirements>
  <requirement id="S1">
    <text>{requirement in active voice}</text>
    <source_quote>{direct quote from research}</source_quote>
    <confidence>{explicit | strongly_implied}</confidence>
  </requirement>
</stated_requirements>

RULES:
- Do not infer requirements — only extract.
- Preserve the user's terminology.
- Mark confidence honestly.`
)

task(
  category="unspecified-high",
  load_skills=[],
  run_in_background=true,
  description="Surface implicit assumptions in research",
  prompt=`I am the brainstorm skill's Phase 1 assumption-surfacer (Agent B).

INPUT: <research>
{same content}
</research>

GOAL: Identify assumptions the research makes that are NOT explicitly stated. These are candidates for premises in the PRD or for Phase 3 interrogation.

OUTPUT FORMAT (XML):
<implicit_assumptions>
  <assumption id="A1">
    <statement>{what the research assumes to be true}</statement>
    <evidence>{what in the research implies this assumption}</evidence>
    <risk_if_wrong>{what breaks if this assumption fails}</risk_if_wrong>
  </assumption>
</implicit_assumptions>

RULES:
- Surface, do not validate. It's fine to flag assumptions that ARE true.
- Focus on assumptions about users, market, technical feasibility, or adoption.
- 3-10 assumptions is typical. More than 10 means you're pattern-matching on noise.`
)

task(
  category="unspecified-high",
  load_skills=[],
  run_in_background=true,
  description="Identify PRD-readiness gaps",
  prompt=`I am the brainstorm skill's Phase 1 gap-finder (Agent C).

INPUT: <research>
{same content}
</research>

GOAL: Identify what is MISSING from the research relative to a standard PRD checklist. Your output shapes which questions Phase 3 must ask the user.

PRD CHECKLIST:
- Problem frame (is the problem itself clearly stated?)
- Demand evidence (is there behavioral evidence someone wants this?)
- Status quo / current workarounds
- Target user specificity (a named role, not a segment)
- Narrowest wedge (smallest marketable slice)
- Constraints (technical, business, legal, user-experience)
- Success criteria (measurable outcomes)
- Scope boundaries (in/out lists)
- Distribution plan (how users discover/adopt)

OUTPUT FORMAT (XML):
<gaps>
  <gap id="G1">
    <checklist_item>{item from list above}</checklist_item>
    <status>{missing | partially_covered | thin}</status>
    <what_exists>{what the research does say, if anything}</what_exists>
    <what_is_missing>{specific gap}</what_is_missing>
    <suggested_question>{question to ask user in Phase 3}</suggested_question>
  </gap>
</gaps>

RULES:
- Only flag genuine gaps — not stylistic preferences.
- Suggested questions must follow the one-at-a-time, single-select format (see Phase 3 rules).`
)
```

<!-- FILE_END: phase1-dispatch-prompts.md -->
