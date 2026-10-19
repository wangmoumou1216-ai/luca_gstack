# Focused research — explicit experiment

Shared by deepresearch and ux-research only when the user or an approved dispatch explicitly
selects `research_depth=focused`. Read through EOF before planning or dispatching this branch.
It replaces their legacy fixed-angle/count/voting procedure in Phases 0–4, while preserving
native dispatch, independent examination, human decisions, source honesty, output paths and
completion/handoff gates. `deep` remains the legacy default; `moderate` is unchanged.

## Phase 0 — Bind the decision questions

Bind the original task's exact source/version and confirmed choices. Select 1–3 unanswered
questions whose answers could change or support a consequential decision. For each, name the
decision owner, current understanding, evidence needed and what would falsify it. Reuse relevant
readable evidence; no fixed dimensions, source count or findings minimum. If nothing needs
research, use the zero-question completion branch below; do not manufacture questions or claim
design improvement. Unavailable evidence, exhausted budget or an unanswered critical question
is not a zero-question case.

Initial budget: 8 search/read items total. A search query is one item; a source full-text read is
one item, including supplied/local evidence newly read for this research. A batch of N queries
or N sources costs N, not one. Log failed attempts and retries as items too. Already-read evidence
may be reused with its actual read provenance and costs no new item. User-specified budget wins;
record it before work. Reviewers reading the returned evidence are separate review cost, not
additional research permission; any new retrieval they request consumes the remaining research
budget. No repeated 8-item allocation per question, agent, retry or phase.

For ux-research, present these questions, source strategy and budget at its existing Phase 0
research-plan Human Gate; retain actual approval. In headless execution the main session must
have supplied the real depth/plan choices; missing decisions return NEEDS_CONTEXT. Existing valid
choices are inherited, not asked again. Non-AI questions do not activate AI/trend research.

### Zero-question completion — applicability only

This is the sole focused exception to the owners' complete-report rule (deepresearch Rule 5 /
ux-research Rule 6). It completes an applicability assessment, not an empirical research claim:

1. In the existing report's Methodology, identify the original source/version, confirmed choices,
   candidate decision questions and why each is already answered or irrelevant to this scope.
   Record actual input reads and costs. A missing source or unresolved consequential question
   blocks this branch; use the normal focused question set or NEEDS_CONTEXT instead.
2. Phase 1 research dispatch/retrieval and Phase 2 finding cross-validation are **N/A** with that
   reason; researcher count is zero, findings empty, confidence **N/A**, research contribution
   **ABSENT**. Do not fill findings, verified paradigms, rejected directions or source counts
   with the original user's requirements. Phases 0, 3 and 4 still execute.
3. Retain one real independent Phase 3 examiner. Give it the exact original sources, assessment,
   actual read log and the owner's Socratic prompt. Its existing assumption/blind-spot/gap fields
   assess whether a consequential evidence question was missed; finding/confidence-revision
   lists are empty. Do not claim cross-validation of findings. A discovered question returns to
   Phase 0; missing review or unresolved critical gaps means BLOCKED, never an automatic PASS.
   Keep all applicable UX Human Gates, inheriting actual choices and recording an empty dispute
   set only when no human decision remains.
4. Write the compact assessment at the owner's existing research report path and the normal
   handoff path, using existing report headings and marking inapplicable sections once. The
   handoff's Decisions and Constraints must both state **applicability only; no new research**,
   retain exact source/report/review references, and forbid downstream empirical confidence or
   design-benefit claims from this disposition. Use the existing 3–7 criteria, covering at least
   source/choice fidelity, no consequential evidence gap after independent examination, and
   truthful no-research handoff with original inputs available. Only actual evidence for every
   required criterion permits `gate_result: PASS`; absent review yields UNKNOWN/FAIL criteria
   and no completion. Do not use `gate_result: NOT_RUN` or a new gate enum.
5. Run the owner's existing handoff validator; for a PASS completion also run it with
   `--require-gate PASS`. Normal completion ownership still applies. Report **DONE — applicability
   assessment; no research performed** only after these gates; managed node submission remains
   with Orchestrator. No experimental routing sidecar or fabricated research finding is needed.
   Downstream reads this report/handoff plus the original input as its existing no-new-research
   input; it retains its own decisions, Oracle and quality gates. No additional research value
   or task/visual improvement is established by this PASS.

## Phase 1 — One researcher

For a nonempty question set, dispatch exactly one real native researcher for the complete approved question set. Use the
current harness and approved model role; no author-as-agent fiction. The independent examiner
in Phase 3 is a separate role, not a second researcher. Do not load the legacy angle dispatch
template. Give the researcher the original task, confirmed choices, questions, evidence and
remaining item budget, and require the existing `<research_findings>` shape:

Only for ux-research with an approved competitor page/flow/state question, give the actual
researcher `.claude/skills/office/ux-research/references/competitor-analysis.md` and require a full
read before research. Reuse its observation/provenance rules within this same total item budget.
Do not load it for deepresearch or a non-competitor UX question; it adds no researcher or report.

- Use the existing root attributes: deepresearch `agent="1"`, UX `dimension="focused"`, and
  `angle` naming the actual question set (not fictitious D1–D6 coverage). Each `<finding id>`
  keeps `<claim>`, `<detail>`, `<source>`, `<source_type>`, `<confidence>`,
  `<evidence_strength>` (STRONG/MODERATE/WEAK) and `<evidence_basis>`. Deepresearch also keeps
  `<evidence>`; UX keeps `<b2b_relevance>` (actual scenario or N/A) and `<design_signal>`.
  Source types remain deepresearch's official_docs/academic/news/blog/code/forum/government/other
  or UX's academic/industry/expert/user_feedback/case_study/product_blog, as applicable.
- `<search_log>` lists each actual query/read/failed attempt and item totals; no artificial rounds.
  Keep existing `<totals>` / `<total_websearches>` / `<total_webfetches>` counters, counting
  individual queries/reads rather than batches; identify local reads and total budget use in
  the same log text. Source references use real URLs or supplied paths with exact provenance.
- Each finding retains claim, source, HIGH/MEDIUM/LOW confidence, evidence strength and basis.
  Use existing `detail` / UX `design_signal` to connect the original task to evidence, its
  applicability/limits and the decision it informs. A research signal does not choose a feature,
  component or user's tradeoff. Record counterevidence sought and found (or explicitly not found).
- `<contradictions>`, `<gaps>` and `<depth_check>` retain both sides, unresolved critical unknowns,
  actual budget use and whether the evidence supports the question's decision. Zero usable
  findings is valid; invented findings to fill a quota are not.

Read supporting sources in full relevant context; snippets are leads. Trace common datasets,
authors, reports and syndicated copies to their original evidence, rather than counting URLs.
Attempt counterevidence for every critical assumption. Keep failed tools and missing evidence
visible; use bounded alternatives within budget, and stop the affected claim if unresolved.

At the limit, finish if evidence is sufficient. Otherwise name the unresolved question, the next
specific evidence needed and its expected decision value. Continue only within an already valid
explicit extension or obtain the required user decision; no automatic full/deep upgrade or budget
reset. Critical first-party behaviour unknowns require real collection (research-kit then actual
data), not competitor pages substituted for users. Keep all critical risks even beyond three;
stop the dependent ready/handoff claim until resolved.

## Phase 2 — Evidence assessment, not agent voting

Use the existing consensus/cross-validation matrix, replacing agent/dimension columns with
supporting source IDs, counterevidence and applicability rationale. Keep the existing status and
confidence enums; label the method `focused evidence assessment` so legacy votes are not implied.

| Status | Evidence condition in focused mode | Confidence |
|---|---|---|
| CONSENSUS | Independent primary methods/observations converge on this bounded claim, suitable for this population/task, with no material unresolved counterevidence | HIGH only when quality and transfer are justified |
| STRONG | Direct authoritative evidence establishes a bounded specification, or robust primary evidence supports the claim with stated transfer limits | HIGH or MEDIUM with reason |
| DISPUTED | Credible conflicting evidence remains unresolved | MEDIUM or LOW; independent review |
| CONTRADICTED | Better applicable evidence defeats the claim | LOW for the original claim; retain refutation |
| UNVERIFIED | Missing, indirect, uncorroborated behavioural evidence or unsupported transfer | LOW |

No raw source count earns a status. An official source can establish its own versioned spec as
STRONG; it cannot establish user behaviour or product effectiveness by itself. Multiple agents,
URLs or papers using the same underlying data are not independent evidence. Keep limitations
and unknowns attached to each conclusion, not only in a report footer.

## Phase 3 — Independent examination

Retain the owner's independent native Socratic examiner and actual completion evidence. Supply
the owner's `references/socratic-prompt.md` (read fully now) for its existing response format and
the original task, evidence matrix, question set, all critical risks and item log. Examine every
decision-relevant single-source, unknown, conflicting or risk claim; for the conditional UX
competitor method, also supply its method owner to the same examiner. Examine the relevance and
transfer rationale even when evidence supports keeping the original design. Preserve existing
review output fields and HIGH/MEDIUM/LOW enum. No fixed paragraph/question-category minimum;
do not manufacture an AI assessment for non-AI work. Missing independent capability is BLOCKED.

ux-research retains Phase 3 human adjudication for every `flag_for_human=YES`; when none exist,
record no applicable dispute instead of asking an empty approval. A preference decision cannot
raise empirical confidence. Unresolved critical evidence remains a blocker for dependent design.

## Phase 4 — Existing report and handoff

Read the owner's `references/report-template.md` through EOF now and apply its focused
instructions. Findings may change a decision,
support the current decision/eliminate a risk, or add no usable information; state which without
claiming a UI benefit. Expand only 0–3 significant decision implications in existing findings and
summary; retain all critical risks and link full evidence. Do not create a second ledger/schema.
Record original source/version and confirmed choices in existing methodology/handoff fields.

Retain the owner's Phase 4.1 output-language choice, output path, source appendix, honest gaps,
post-generation actions and completion checks. ux-research
still presents its Phase 4 handoff choice. A completed bounded report may expose an unresolved
question, but its dependent readiness is blocked; never turn a complete report into a false PASS.
Focused is an opt-in experiment, not a new default or proof of time/token savings.

<!-- FILE_END: deepresearch/references/focused-research.md -->
