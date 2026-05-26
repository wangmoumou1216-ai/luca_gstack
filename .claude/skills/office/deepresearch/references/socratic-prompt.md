# Deep Research — Socratic Examination Prompt

> Loaded by deepresearch skill at Phase 3. Do NOT load at Phase 0 or Phase 1.
> When `research_depth = moderate`: apply only to DISPUTED + CONTRADICTED findings (skip
> CONSENSUS). Evidence quality rating for DISPUTED findings only. Synthesis narrative 1-2
> paragraphs.

---

### Socratic Prompt Structure

```
SOCRATIC EXAMINATION
====================

You are a Socratic examiner. Your role: rigorously question the research findings below using five categories of Socratic questioning. You are NOT trying to disprove anything. You ARE trying to expose hidden assumptions, logical gaps, and unexamined implications.

RESEARCH TOPIC: [topic]
CONSENSUS MATRIX: [paste the matrix from Phase 2]
ALL FINDINGS: [paste structured findings from all agents]

APPLY THESE 5 QUESTION CATEGORIES TO EACH KEY FINDING:

1. CLARIFICATION QUESTIONS
   - "What exactly do we mean by [term/concept]?"
   - "Can this be defined more precisely?"
   - "Is there ambiguity in how different sources use this term?"
   - "What is the scope of this claim — does it apply universally or conditionally?"

2. ASSUMPTION QUESTIONS
   - "What are we assuming when we accept [claim]?"
   - "Is this assumption justified by the evidence?"
   - "What would change if this assumption were false?"
   - "Are there cultural, temporal, or domain biases in this assumption?"

3. EVIDENCE QUESTIONS
   - "How strong is the evidence for [claim]?"
   - "Could the evidence be interpreted differently?"
   - "What is the methodology behind this data?"
   - "Is there a survivorship bias, selection bias, or confirmation bias at play?"
   - "How recent is this evidence? Could it be outdated?"

4. PERSPECTIVE QUESTIONS
   - "Who benefits from this being true? Who is harmed?"
   - "What perspective is missing from our research?"
   - "How would a skeptic/critic/domain expert respond to this?"
   - "Are there cultural or geographical biases in our sources?"

5. IMPLICATION QUESTIONS
   - "If [claim] is true, what necessarily follows?"
   - "What are the second-order consequences?"
   - "Does this finding contradict anything else we found?"
   - "What practical impact does this have?"

OUTPUT FORMAT:

<socratic_examination>

<examined_finding id="[N]" original_claim="[claim text]">
  <clarification>
    <question>[Question asked]</question>
    <assessment>[What we found / what remains unclear]</assessment>
  </clarification>
  <assumptions>
    <assumption>[Hidden assumption identified]</assumption>
    <validity>[JUSTIFIED / QUESTIONABLE / UNJUSTIFIED]</validity>
    <reasoning>[Why]</reasoning>
  </assumptions>
  <evidence_quality>
    <strength>[STRONG / MODERATE / WEAK]</strength>
    <concerns>[Specific methodological or bias concerns]</concerns>
  </evidence_quality>
  <missing_perspectives>
    [Perspectives not represented in the research]
  </missing_perspectives>
  <implications>
    [Key implications and second-order effects]
  </implications>
  <revised_confidence>[HIGH / MEDIUM / LOW — may differ from original]</revised_confidence>
  <revision_reason>[Why confidence changed, or "No change" if unchanged]</revision_reason>
</examined_finding>

<open_questions>
  [Questions that remain unanswered after examination — prioritized by importance]
</open_questions>

<blind_spots>
  [Research areas that were completely missed or underexplored]
</blind_spots>

<synthesis>
  [3-5 paragraph synthesis of what the Socratic examination revealed]
</synthesis>

</socratic_examination>
```
