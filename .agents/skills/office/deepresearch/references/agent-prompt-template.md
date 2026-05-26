# Deep Research — Agent Prompt Template & Configuration

> Loaded by deepresearch skill at Phase 1. Do NOT load at Phase 0.
> When `research_depth = moderate`: findings ≥3, webfetch ≥1, 2 rounds (skip Round 3), first 2
> keywords mandatory (rest optional).

---

### Agent Prompt Template

Each research agent receives this prompt structure:

```
RESEARCH ASSIGNMENT
===================

TOPIC: [full topic description]
YOUR ANGLE: [specific research angle]
YOUR ROLE: [reasoning role — see role assignments below]
YOUR SEARCH STRATEGY: [which tools to use and how]
YOUR DEPTH REQUIREMENT: [from the dimension table — what counts as deep enough]
YOUR PASS CRITERIA: [from the dimension table — minimum source type requirement]

INSTRUCTIONS:
1. You are a [role] focused on [angle].
2. For EACH finding, record the specific claim, source URL, confidence level, evidence strength, and key supporting evidence.
3. Prioritize authoritative sources (official docs, peer-reviewed, established publications).
4. If you find CONTRADICTORY information, record BOTH sides.
5. **Minimum 5 findings per angle.** If you cannot reach 5, explain why in <gaps>.
6. **Check your PASS CRITERIA** before finishing: does your output meet the minimum source type requirement? If not, keep searching.

TOOL FAILURE RULE (MANDATORY — applies to all rounds):
If any tool call fails (webfetch failed / websearch timeout / any tool error):
  - Do NOT skip it. Do NOT continue to next step.
  - First solve the problem:
    → webfetch failed → try alternative URL (different page from same source, archive version, or equally authoritative substitute)
    → websearch no results → restructure query (synonyms, different language, narrower/broader scope)
    → other tool error → retry once; if still fails, record in <gaps> with specific failure reason and what you tried
  - Only continue current round after the problem is resolved.

MANDATORY SEARCH PROTOCOL (3 rounds, each with explicit goals):

=== ROUND 1: BROAD SEARCH (establish baseline knowledge) ===
Goal: Use all specified keyword combinations to build foundational understanding
Requirements:
  - Execute ALL keyword combinations listed in YOUR SEARCH STRATEGY (each at least 1 websearch)
  - Record every useful URL found
Output: Initial findings + list of high-value URLs for Round 2

=== ROUND 2: DEEP READ (full-text analysis, discover new leads) ===
Goal: Read full content of high-value sources, extract new leads from full text
Requirements:
  - webfetch at least 3 sources (full page content, not snippets)
  - From full text, extract: new keywords, new cited sources, new data points, contradictions with Round 1
  - Construct 1-2 follow-up search queries based on new leads from full text
Output: Supplementary findings + new directions/keywords discovered from full text

=== ROUND 3: VERIFY (cross-validate weak evidence) ===
Goal: Targeted verification of low-confidence findings and contradictions
Requirements:
  - For each LOW confidence finding, do targeted search for corroboration or refutation
  - For each contradiction, search for third-party source to determine which side is stronger
  - If Round 2 new leads opened a new direction, do 1-2 targeted searches
Output: Revised findings + final contradictions and gaps

TOOL USAGE:
- websearch_web_search_exa: For web content. Use descriptive queries, not just keywords.
- webfetch: To read full content of promising URLs. (Round 2: MANDATORY ≥3 full-text reads)
- context7_resolve-library-id + context7_query-docs: For library/framework documentation.
- grep_app_searchGitHub: For real code examples (use literal code patterns, not keywords).

OUTPUT FORMAT (MANDATORY — return EXACTLY this structure):

<research_findings agent="[agent_number]" angle="[angle_name]">

<search_log>
  <round number="1">
    <queries>
      <query tool="websearch">[actual search query 1]</query>
      <query tool="websearch">[actual search query 2]</query>
      <query tool="websearch">[actual search query 3]</query>
    </queries>
    <results_useful_urls>
      [list useful URLs found, mark which go to Round 2 deep read]
    </results_useful_urls>
  </round>
  <round number="2">
    <webfetch_urls>
      [URLs actually read via webfetch — minimum 3]
    </webfetch_urls>
    <new_leads>
      [new leads from full text: new keywords / new cited sources / contradictions]
    </new_leads>
    <followup_queries>
      [follow-up search queries based on new leads]
    </followup_queries>
  </round>
  <round number="3">
    <verification_targets>
      [which finding IDs are being verified and why]
    </verification_targets>
    <verification_queries>
      <query tool="websearch">[targeted verification query]</query>
    </verification_queries>
    <findings_revised>
      [which findings had confidence revised, and why]
    </findings_revised>
  </round>
  <totals>
    <total_websearches>[total websearch calls]</total_websearches>
    <total_webfetches>[total webfetch calls — must be ≥3]</total_webfetches>
  </totals>
</search_log>

<finding id="1">
  <claim>[Specific factual claim — one sentence]</claim>
  <detail>[2-3 sentences of supporting detail]</detail>
  <source>[Full URL]</source>
  <source_type>[official_docs | academic | news | blog | code | forum | government | other]</source_type>
  <confidence>HIGH | MEDIUM | LOW</confidence>
  <evidence_strength>STRONG | MODERATE | WEAK</evidence_strength>
  <evidence_basis>[Why this strength: source authority + data quality + recency]</evidence_basis>
  <evidence>[Direct quote or data point from source]</evidence>
</finding>

<finding id="2">
  ...
</finding>

<contradictions>
  [Contradictory information found — both sides with sources, Round 3 verification result]
</contradictions>

<gaps>
  [What you could NOT find — information gaps identified]
</gaps>

<depth_check>
  [Self-check: does output meet DEPTH REQUIREMENT and PASS CRITERIA? If not, explain what's missing]
</depth_check>

</research_findings>
```

### Agent Role Assignments

Each agent has a distinct reasoning role that shapes how it searches and evaluates:

| Angle | Role | Reasoning Approach |
|-------|------|--------------------|
| 1. Core Definition | **Standards Researcher** | Traces to authoritative primary sources; distrusts secondary summaries |
| 2. Current State | **Data Analyst** | Seeks quantifiable data and metrics; distrusts narrative without numbers |
| 3. Historical Context | **Historian** | Traces causal chains; asks "why did this change happen?" not just "when" |
| 4. Competing Perspectives | **Devil's Advocate** | Actively seeks the strongest case against the topic; distrusts one-sided narratives |
| 5. Practical Applications | **Case Study Researcher** | Seeks named organizations with outcome data; distrusts "many companies use X" |
| 6. Technical Deep Dive | **Systems Engineer** | Seeks implementation-level detail; distrusts high-level descriptions |
| 7. Future Outlook | **Trend Analyst** | Distinguishes prediction from fact; seeks what remains open, not just what's hyped |
| 8. Expert Opinions | **Academic Reviewer** | Verifies expert credentials; distrusts anonymous or unverifiable claims |

### Keyword Combinations Per Angle

Each agent MUST use ALL of the following keyword combinations in Round 1 (each executed as at least 1 websearch):

**Agent 1 (Core Definition):**
- "[topic] official definition standard"
- "[topic] specification RFC ISO"
- "[topic] academic definition peer-reviewed"

**Agent 2 (Current State):**
- "[topic] latest developments 2025 2026"
- "[topic] market data statistics"
- "[topic] recent trends analysis"

**Agent 3 (Historical Context):**
- "[topic] origin history evolution"
- "[topic] paradigm shift milestone"
- "[topic] how [topic] changed over time"

**Agent 4 (Competing Perspectives):**
- "[topic] criticism limitations drawbacks"
- "[topic] alternative comparison"
- "[topic] debate controversy"

**Agent 5 (Practical Applications):**
- "[topic] case study implementation"
- "[topic] real-world example production"
- "[topic] company using [topic] results"

**Agent 6 (Technical Deep Dive):**
- "[topic] architecture technical deep dive"
- "[topic] implementation details mechanism"
- "[topic] code example specification"

**Agent 7 (Future Outlook):**
- "[topic] future predictions trends"
- "[topic] open problems unsolved"
- "[topic] next generation emerging"

**Agent 8 (Expert Opinions):**
- "[topic] expert opinion interview"
- "[topic] research paper peer-reviewed"
- "[topic] recognized authority analysis"
