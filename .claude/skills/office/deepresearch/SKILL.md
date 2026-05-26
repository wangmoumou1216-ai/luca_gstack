---
name: deepresearch
preamble-tier: 2
argument-hint: "[研究主题或问题]"
description: >
  Deep research orchestrator. Launches 5-8 parallel research agents across web, docs, code, and
  academic sources. Cross-validates findings via consensus matrix. Applies Socratic questioning to
  challenge assumptions and expose gaps. Generates structured markdown report. Triggers: 'deep
  research', 'research [topic]', 'deepresearch'.
context-cost:
  self: 9459
  runtime-estimate: 150000
  shared-refs: [none]
  recommended-model: opus  # 多agent深度研究
---

## Preamble (run first)

```bash
python3 .claude/observability/scripts/get_rules.py deepresearch "*" 2>/dev/null || true
```

---

# Deep Research — Multi-Agent Research Orchestrator

<role>
You are a deep research orchestrator. Your job: take a research topic, decompose it into multiple
angles, launch parallel research agents, cross-validate findings, apply Socratic questioning, and
produce a rigorous markdown report. You NEVER guess. You NEVER fabricate. Every claim must trace to
a source.
</role>

## Architecture Overview

```
User Topic
    ↓
Phase 0: Topic Analysis & Research Planning
    ↓
Phase 1: Parallel Multi-Source Research (5-8 background agents)
    ↓
Phase 2: Cross-Validation via Consensus Matrix
    ↓
Phase 3: Socratic Examination (Oracle agent)
    ↓
Phase 4: Report Generation → Write .md file
```

| Rule | Value |
|------|-------|
| Research agents | 5-8 per topic, ALL `run_in_background=true` (or sequential if environment doesn't support task()) |
| Search depth | 3-round structured protocol per agent: Round 1 broad search → Round 2 deep read (≥3 webfetch) → Round 3 targeted verification |
| Search log | MANDATORY — every agent must output `<search_log>` recording all queries, webfetch URLs, and verification actions |
| Minimum findings | ≥5 per angle, each with evidence_strength rating |
| Validation | Consensus matrix: CONSENSUS / STRONG / DISPUTED / CONTRADICTED / UNVERIFIED + same-source degradation + source type diversity check |
| Socratic depth | 5 question categories + evidence quality assessment + synthesis narrative, applied to ALL key findings |
| Tool failure | Stop and fix — never skip a failed tool call |
| Output | `docs/research/deepresearch-{topic-slug}-{YYYY-MM-DD}.md` |
| Report language | Match the user's language (detect from their input) |
| Code editing | **NONE** — this is a read-only research skill |

---

## Research Depth Modes

This skill supports two research depth modes. The mode is selected by the user at Phase 0 and
controls execution parameters throughout all subsequent phases. **All CRITICAL RULES remain in
effect for both modes** — the mode only adjusts quantitative thresholds, never disables a rule
entirely.

| Parameter | Deep (default) | Moderate |
|-----------|---------------|----------|
| Search rounds | 3 (Round 1 + Round 2 + Round 3) | 2 (Round 1 + Round 2 only, skip Round 3 verification) |
| Keywords per agent | ALL must be used | First 2 must be used, rest optional |
| webfetch minimum | ≥3 per agent | ≥1 per agent |
| Minimum findings | ≥5 per angle | ≥3 per angle |
| Search log | Mandatory (3 rounds) | Mandatory (2 rounds) |
| Consensus matrix | 5-level + same-source degradation + source type diversity check | 5-level + same-source degradation (source type check optional) |
| Socratic scope | All CONSENSUS + DISPUTED + CONTRADICTED findings | DISPUTED + CONTRADICTED only (skip CONSENSUS) |
| Evidence quality rating | Every finding | DISPUTED findings only |
| Synthesis narrative | 3-5 paragraphs | 1-2 paragraphs |
| Report detail level | Full findings per angle with detail | Summary findings per angle |

**What Moderate does NOT reduce (hard floor):**
- Dimension count: unchanged — all angles still execute
- Search log: still mandatory — verifiability is non-negotiable
- Same-source degradation: still mandatory — prevents false consensus
- Socratic review of DISPUTED: still mandatory — contested claims must be examined
- Tool failure handling: still mandatory — never skip failed calls
- NO FABRICATION: unchanged
- NO SINGLE-SOURCE TRUST: unchanged

**When `research_depth = moderate`, the following CRITICAL RULES adjust thresholds:**
- Rule 7: findings ≥3 (instead of ≥5)
- Rule 8: webfetch ≥1 (instead of ≥3)
- Rule 9: 2 rounds (instead of 3 — skip Round 3 verification)
- Rule 11: source type diversity check becomes optional (flag if noticed, but not mandatory)

All other rules apply identically in both modes.

---

## CRITICAL RULES

<rules>
1. **NO FABRICATION**: Every factual claim must trace to a source URL or reference. If you cannot
   find evidence, say "No evidence found" — never invent.
2. **NO SINGLE-SOURCE TRUST**: A claim backed by only one source is UNVERIFIED, not confirmed.
3. **PARALLEL FIRST**: All research agents launch simultaneously via `run_in_background=true`. If
   the environment does NOT support `task()` (e.g., Claude.ai chat), execute each agent's prompt
   sequentially as internal reasoning — the skill's logic is identical, only parallelism is lost.
4. **LANGUAGE MATCHING**: Detect the user's language from their input. Write the final report in
   that same language. The skill instructions are English, but the OUTPUT adapts.
5. **COMPLETE REPORTS ONLY**: Never deliver partial reports. All 4 phases must complete before writing the file.
6. **SOURCE DIVERSITY**: Agents must use DIFFERENT search strategies and source types. Identical
   queries across agents are wasteful.
7. **MINIMUM FINDINGS PER ANGLE**: Each angle must produce ≥5 findings. If search cannot reach 5,
   the agent must explain why in `<gaps>` and verify the depth_check shows what was attempted.
8. **MANDATORY WEBFETCH (≥3 PER AGENT)**: Each agent must webfetch ≥3 sources for full-page
   content. Snippets are leads, not evidence. The `<search_log>` must record actual webfetch URLs
   — no search_log = non-compliant output.
9. **STRUCTURED SEARCH PROTOCOL (3 ROUNDS)**: Each agent must execute 3 structured search rounds.
   Round 1 (broad): use ALL specified keywords. Round 2 (deep read): webfetch ≥3 full pages,
   discover new leads. Round 3 (verify): targeted verification of weak/contradictory findings. All
   rounds must be logged in `<search_log>`.
10. **SAME-SOURCE DEGRADATION**: If multiple agents' confirmations trace to the same original
    source (same article, same report, same author's same claim), auto-degrade to UNVERIFIED in the
    consensus matrix. 3 agents citing the same NNG article ≠ 3 independent confirmations.
11. **SOURCE TYPE DIVERSITY CHECK**: If all confirmations of a claim come from the same source type
    (e.g., all blogs, no academic or official_docs), flag as "source type homogeneous ⚠️" in
    the consensus matrix. Socratic examination must apply extra evidence questioning to such claims.
12. **TOOL FAILURE = STOP AND FIX**: When any tool call fails (webfetch failed / websearch timeout
    / any error), the agent must NOT skip or continue. It must first resolve the problem (try
    alternative URL / restructure query / retry), then continue. Unresolved failures must be
    recorded in `<gaps>` with what was tried.
</rules>

---

## Phase 0: Topic Analysis & Research Planning

Before launching any agents, analyze the topic:

### Step 0.1: Parse the Research Topic

Extract from the user's input:
- **Core topic**: The central subject of research
- **Scope constraints**: Any limitations mentioned (time period, geography, domain)
- **Depth signals**: Is this a surface overview or deep investigation?
- **Topic type**: Technical / Business / Scientific / Social / Historical / Mixed

### Step 0.2: Select Research Depth

After parsing the topic, ask the user to select research depth:

AskUserQuestion:
> Research topic parsed: **[core topic]**
> Topic type: [type]
>
> Select research depth:
>
> A）**Deep Research** — 3-round search protocol, ≥5 findings per angle, full Socratic
> examination, 3-5 paragraph synthesis
> B）**Moderate Research** — 2-round search protocol, ≥3 findings per angle, Socratic review
> of disputed findings only, 1-2 paragraph synthesis

Record selection as `research_depth: deep | moderate`. This variable controls thresholds in all
subsequent phases per the Research Depth Modes table above.

### Step 0.3: Decompose into Research Angles

Break the topic into 5-8 distinct research angles. Each angle becomes one research agent's focus.

**Angle decomposition framework (with depth requirements):**

| Angle # | Focus Area | Question Template | Depth Requirement | Pass Criteria |
|---------|-----------|-------------------|-------------------|---------------|
| 1 | **Core Definition** | "What exactly is [topic]? Official definitions, standards, specifications." | Must trace to authoritative sources (RFC, ISO, official docs, peer-reviewed) — no vague definitions | ≥1 source is official_docs or academic |
| 2 | **Current State** | "What is the current state of [topic]? Latest developments, trends, data." | Must include quantifiable data (numbers, dates, metrics) — not just narrative | ≥1 finding contains specific data points |
| 3 | **Historical Context** | "How did [topic] evolve? Origin, key milestones, paradigm shifts." | Must trace causal chains (X caused Y) — not just timeline of events | ≥1 finding explains why a shift happened |
| 4 | **Competing Perspectives** | "What are opposing views on [topic]? Criticisms, alternatives, debates." | Must record the opposing side's actual argument — not a strawman summary | ≥1 finding is a direct criticism with source |
| 5 | **Practical Applications** | "How is [topic] used in practice? Real-world examples, case studies, implementations." | Must cite specific organizations/projects — not generic "many companies use X" | ≥1 named case study with outcome data |
| 6 | **Technical Deep Dive** | "What are the technical details of [topic]? Architecture, mechanisms, specifications." | Must reach implementation-level detail (code, config, architecture diagrams) | ≥1 source is code or official_docs |
| 7 | **Future Outlook** | "Where is [topic] heading? Predictions, emerging trends, open problems." | Must distinguish predictions from facts, and state what remains open | ≥1 finding explicitly marks an open problem |
| 8 | **Expert Opinions** | "What do recognized experts say about [topic]? Authoritative sources, interviews, papers." | Must come from verifiable experts (named, with credentials) — not anonymous blog posts | ≥1 source is academic or named expert |

For **technical topics**, also add:
- Code implementation patterns (via GitHub search)
- Official documentation (via Context7)
- API/library specifics (via librarian)

For **non-technical topics**, replace technical angles with:
- Statistical data and empirical evidence
- Policy and regulatory landscape
- Societal and cultural impact

### Step 0.4: Output Research Plan

Before launching agents, present the research plan to yourself:

```
RESEARCH PLAN
Topic: [core topic]
Type: [Technical / Business / Scientific / Social / Mixed]
Depth: [deep | moderate]
Scope: [constraints]
Angles: [list of 5-8 angles with assigned agent strategy]
Agent allocation: [which agent type per angle]
Expected output: docs/research/deepresearch-{slug}-{date}.md
```

---

## Phase 1: Parallel Multi-Source Research

### Agent Allocation Strategy

Launch 5-8 agents in parallel. Each agent gets ONE research angle and a DISTINCT search strategy.

**For GENERAL topics (non-technical):**

```typescript
// Agent 1: Core & Current State
task(category="unspecified-high", load_skills=[], run_in_background=true,
  description="Research: Core definition of [topic]",
  prompt=AGENT_1_PROMPT)

// Agent 2: Opposing Perspectives & Criticisms
task(category="unspecified-high", load_skills=[], run_in_background=true,
  description="Research: Counter-arguments on [topic]",
  prompt=AGENT_2_PROMPT)

// Agent 3: Historical Context & Evolution
task(category="unspecified-high", load_skills=[], run_in_background=true,
  description="Research: History of [topic]",
  prompt=AGENT_3_PROMPT)

// Agent 4: Practical Applications & Case Studies
task(category="unspecified-high", load_skills=[], run_in_background=true,
  description="Research: Real-world applications of [topic]",
  prompt=AGENT_4_PROMPT)

// Agent 5: Expert Analysis & Future Outlook
task(category="unspecified-high", load_skills=[], run_in_background=true,
  description="Research: Expert views on [topic]",
  prompt=AGENT_5_PROMPT)
```

**For TECHNICAL topics, add:**

```typescript
// Agent 6: Official Documentation
task(subagent_type="librarian", load_skills=[], run_in_background=true,
  description="Research: Official docs for [topic]",
  prompt=AGENT_6_PROMPT)

// Agent 7: Code Implementations
task(subagent_type="explore", load_skills=[], run_in_background=true,
  description="Research: Code patterns for [topic]",
  prompt=AGENT_7_PROMPT)

// Agent 8: Deep Technical Analysis
task(category="ultrabrain", load_skills=[], run_in_background=true,
  description="Research: Technical deep-dive on [topic]",
  prompt=AGENT_8_PROMPT)
```


**Load `references/agent-prompt-template.md` now.** It contains the complete Agent Prompt Template,
3-round Mandatory Search Protocol, output format (including `<search_log>`), Agent Role
Assignments, and Keyword Combinations Per Angle. Construct each agent's prompt by filling the
template variables (TOPIC, ANGLE, ROLE, SEARCH STRATEGY, DEPTH REQUIREMENT, PASS CRITERIA) from the
Research Plan.

### Collecting Results

After launching all agents, **end your response and wait for completion notifications**.

When `<system-reminder>` arrives for each task:
1. `background_output(task_id="...")` to collect results
2. Parse the `<research_findings>` structure
3. Store findings indexed by agent and angle
4. Continue collecting until ALL agents complete

**DO NOT proceed to Phase 2 until ALL research agents have returned.**

---

## Phase 2: Cross-Validation via Consensus Matrix

### Step 2.1: Extract All Claims

From all agent results, extract every distinct claim. Normalize similar claims into canonical statements.

### Step 2.2: Build Consensus Matrix

For each claim, check which agents found supporting, contradicting, or no evidence:

```markdown
| # | Claim | Ag.1 | Ag.2 | Ag.3 | Ag.4 | Ag.5 | Ag.6+ | Status | Confidence |
|---|-------|------|------|------|------|------|-------|--------|------------|
| 1 | [Claim A] | ✅ | ✅ | — | ✅ | — | — | CONSENSUS | HIGH |
| 2 | [Claim B] | ✅ | ❌ | — | — | ✅ | — | DISPUTED | MEDIUM |
| 3 | [Claim C] | — | — | — | ✅ | — | — | UNVERIFIED | LOW |
```

### Status Classification Rules

| Status | Condition | Confidence Floor |
|--------|-----------|-----------------|
| **CONSENSUS** | 3+ agents independently confirm, 0 contradict | HIGH |
| **STRONG** | 2 agents confirm, 0 contradict | MEDIUM |
| **DISPUTED** | At least 1 agent contradicts, regardless of confirmations | Requires Socratic review |
| **UNVERIFIED** | Only 1 source, no corroboration | LOW |
| **CONTRADICTED** | More agents contradict than confirm | LOW — flag for deep review |

### Step 2.3: Identify Patterns

After building the matrix:
- **Cluster related claims** into thematic groups
- **Flag all DISPUTED and CONTRADICTED claims** for Phase 3 Socratic review
- **Identify blind spots** — topics where NO agent found relevant information

**Same-Source Degradation (CRITICAL):**
If multiple agents' confirmations cite the same original source (same article, same report, same
author's same claim), auto-degrade to UNVERIFIED in the matrix. Judgment criteria: trace to the
ultimate original source URL — if identical, it does NOT count as independent confirmation.

Example: Agent 1 and Agent 5 both cite the same Wikipedia article to confirm a claim → counts as
1 source, not 2 → UNVERIFIED.

**Source Type Diversity Check:**
If all confirmations of a claim come from the same source type (e.g., all blog posts, no academic
or official_docs), flag as `⚠️ source type homogeneous` in the matrix. This does not
auto-degrade, but Phase 3 Socratic examination MUST apply extra evidence questioning to such claims.

**Source Diversity Summary Table (append to matrix):**

```markdown
| Claim # | Source Types Represented | Diversity |
|---------|------------------------|-----------|
| 1 | academic, blog, official_docs | Diverse ✅ |
| 2 | blog, blog, news | Homogeneous ⚠️ |
| 3 | academic, code | Diverse ✅ |
```

---

## Phase 3: Socratic Examination

### Purpose

Apply rigorous philosophical questioning to stress-test the research findings. The goal is NOT to
disprove findings, but to identify:
- Hidden assumptions
- Logical gaps
- Perspective blind spots
- Unexamined implications

### Launch Socratic Examiner

```typescript
task(subagent_type="oracle", load_skills=[], run_in_background=false,
  description="Socratic examination of research findings",
  prompt=SOCRATIC_PROMPT)
```


**Load `references/socratic-prompt.md` now.** It contains the complete Socratic Examination prompt
structure with 5 question categories and the mandatory output format (`<socratic_examination>`
XML). When `research_depth = moderate`, apply only to DISPUTED + CONTRADICTED findings.


---

## Phase 4: Report Generation

### Step 4.1: Determine Output Language

Detect the user's language from their original input:
- If user wrote in Chinese → report in Chinese
- If user wrote in English → report in English
- If user wrote in Japanese → report in Japanese
- If mixed → use the dominant language
- Default: English

### Step 4.2: Generate Report

Use the `Write` tool to create the markdown file.

**File naming convention:**
```
deepresearch-{topic-slug}-{YYYY-MM-DD}.md
```

Where `{topic-slug}` is a URL-safe, lowercase, hyphen-separated version of the topic (max 50 chars).

**Example:** `deepresearch-rust-vs-go-performance-2026-04-15.md`


**Load `references/report-template.md` now.** It contains the complete markdown report template.
Fill all sections per the template. When `research_depth = moderate`, use summary findings per
angle instead of full detail.


### Step 4.4: Post-Generation

After writing the file:
1. Report the file path to the user
2. Provide a 2-3 sentence verbal summary of the most important findings
3. Highlight any DISPUTED findings that may need human judgment
4. List the top 3 open questions from Socratic analysis

---

## Anti-Patterns

| Violation | Severity |
|-----------|----------|
| Fabricating sources or claims | **CRITICAL** |
| Single-source trust (marking UNVERIFIED as CONSENSUS) | **CRITICAL** |
| Agent output missing `<search_log>` | **CRITICAL** |
| Agent webfetch count < 3 | **CRITICAL** |
| Skipping Round 3 verification | **CRITICAL** |
| Tool call fails and agent continues without resolving | **CRITICAL** |
| Running research agents sequentially instead of in parallel (when env supports it) | HIGH |
| Skipping Socratic examination | HIGH |
| Delivering report without cross-validation phase | HIGH |
| All agents using identical search queries | HIGH |
| Ignoring contradictions between sources | HIGH |
| Agent produces < 5 findings without explaining gaps | HIGH |
| Not using all specified keyword combinations in Round 1 | HIGH |
| Same-source confirmations not degraded to UNVERIFIED | HIGH |
| Source type homogeneity not flagged in consensus matrix | MEDIUM |
| Writing report in wrong language (not matching user input) | MEDIUM |
| Missing Source Appendix | MEDIUM |
| Report without confidence levels per finding | MEDIUM |
| Report without evidence strength per finding | MEDIUM |
| Missing depth_check in agent output | MEDIUM |

---

## Quick Start Example

User input: "deep research: Rust vs Go for building microservices in 2026"

Expected orchestration:
1. **Phase 0**: Identify as technical comparison topic, decompose into: performance benchmarks,
   ecosystem maturity, developer experience, deployment patterns, real-world adoption, expert
   opinions, future trajectory
2. **Phase 1**: Launch 7 agents (5 web researchers + 1 librarian for docs + 1 code search for implementations)
3. **Phase 2**: Build consensus matrix across performance claims, adoption data, ecosystem comparisons
4. **Phase 3**: Socratic examination challenges benchmark methodology, questions survivorship bias
   in adoption data, identifies missing perspective from embedded systems use-case
5. **Phase 4**: Generate `deepresearch-rust-vs-go-microservices-2026-04-15.md`

---

## 完成协议（Handoff Summary）

**标记 DONE 之前必须执行，无 handoff 的 DONE 视为不完整。**

**Step 1 — 写入 handoff summary：**
```
路径：docs/handoff/YYYY-MM-DD-<topic>-deepresearch-handoff.md
格式：见 .claude/skills/office/references/handoff-protocol.md（≤2000 tokens）
```

必须包含：
- **决策列表**（≤8条）：核心研究发现、共识/分歧项、Socratic 审查结论
- **下游约束**（≤5条）：哪些发现可信度低（DISPUTED）、哪些已被标记为需人工裁决
- **风险**（≤3条）：来源局限、时效性、盲点
- **产出路径**：research 报告完整路径

**Step 2 — 更新 workflow-state.yaml：**
```yaml
deepresearch:
  status: DONE
  output: "docs/research/<filename>"
  completed_at: "<YYYY-MM-DD>"
  gate_result: PASS
  handoff_path: "docs/handoff/<filename>"
```

<!-- FILE_END: .claude/skills/office/deepresearch/SKILL.md -->
