# Workflow spec — a loop made explicit

Read this file through FILE_END before proposing a loop or drafting its spec. The entrypoint
owns invocation, exact paths, mutations and shared handoff. Grilling owns the stateful design
frontier. This file owns the loop lens, semantic workflow coverage and checkpoint brief.

## The loop lens: discovery before a procedure

A **loop** is a recurring pattern in the user's life, career, week, morning or a repeated
activity. Loops can contain other loops: a career goal may have a weekly review and a repeated
preparation activity. Use this lens to find predictable work worth specifying or delegating.
Delegation can be to a person; neither an AI nor automation is required.

Read the authorized world notes/context completely. Anchor discovery in actual tools,
channels, activities and the user's vocabulary. Separate a note's facts from an agent's
inference and from an unresolved preference. A thin world context calls for a real interview:
what comes in, through which channels/tools, what activity repeats, what outcome matters,
what takes effort, and what the user calls each thing. Ask only the actual gaps, wait for real
answers, and update the next question from them. Framework cwd and root CONTEXT are not
facts about this world. Empty NOTES is a gap, not a blank canvas for a fictional user.

For each candidate, state:

- The recurring activity and its scale: life/career/week/single activity as supported.
- The actual note location or user answer that supports its recurrence and vocabulary.
- Its intended result, current friction and why making the loop explicit would help.
- Any inference or missing fact that needs confirmation rather than being asserted.

Offer at least two grounded alternatives when the evidence supports them; never invent
one to reach a count. The real user selects the loop or provides another. A recommendation
is not that selection. If the user names a goal, use the same world check without making
them repeat facts already supplied. Carry the selected loop and evidence into the design tree.
A stock SOP with no world discovery, real choice or stateful frontier is incomplete even if
it includes a stop/recovery section.

A **workflow** is one loop's resolved spec; a run is its actual instantiation. The spec lives
at the exact approved `workflows/<slug>.md` and is the only workflow truth. Designing it
does not create a running loop. Current disk content wins over a cached draft.

## Coverage comes from decisions, not a mandatory form

Use the user's terms and the lightest readable structure that holds the contract. These are
semantic obligations to resolve through grilling, not a template to fill with guesses:

| Coverage | Questions the implementer must not need to ask |
|---|---|
| Goal and boundary | What loop did the user choose, what result matters, and what is outside it? |
| Inputs | Which real sources/tools/channels provide what, who supplies them, and how are missing, stale, invalid or sensitive inputs handled? |
| Steps and ownership | Who or what acts in what order, with which prerequisites, and what concrete result/state moves to the next step? Include branches that change execution. |
| Result and done | What artifact/outcome counts as a completed run, where is it available, and which observable criteria distinguish completion from a partial run? |
| Stop | When should a run halt, skip or be cancelled; what is retained; what must not happen afterward? |
| Failure | What relevant failure/timeout/partial-result conditions look like and what the safe response is? |
| Escalation | Which human/owner decides unresolved exceptions, how they are reached, and what evidence/decision they receive? |
| Recovery | What current state/evidence is read, from which last safe point work resumes, and how duplicate or uncertain effects are prevented? |
| Permissions and owners | Who owns operation and decisions; which exact local/external targets and effects need approval; which authority owner gates them; and what happens when permission is absent? |

When a coverage item has no applicable behavior, say why. For a purely manual workflow,
for example, an integration failure may be inapplicable while missing material and cancelled
work still need a response. Do not force retries, a database, agent roles or error machinery
that the actual loop does not need. A gate owner/rule can be fully specified while its future
execution approval remains ungranted; this distinction is resolved design, not permission.

Resolve every implementation-changing unknown: vague owners, undefined outputs, undecided
input source, missing failure branch or unspecified external gate cannot hide in a TODO,
"TBD", deferred section or optimistic default. The frontier may create new decisions as
answers arrive. Keep those unresolved and grill them in the next eligible round.

## Conditional vocabulary

Use these terms only when the selected workflow calls for them:

- **Trigger** says how a run starts: a manual action, an event or a schedule. Prefer an event
  over polling/scheduling when it serves the real goal efficiently, but let evidence and the
  user's choice decide. Manual initiation is valid. A future event trigger does not authorize
  subscribing to a service during design.
- **AI** belongs only when its role improves this loop and the user chooses it. Resolve its
  input/output, boundaries, failure handling and owner then. A pure human workflow is valid.
- **Schedule** is optional. If chosen, resolve relevant timing/timezone/missed-run behavior
  through the frontier. Describing it does not install or enable any scheduler.
- **Checkpoint** is a human verification or decision point. Include it only when the loop
  benefits from it or an authority gate requires it. Some workflows have no checkpoint;
  some have no AI at all. A human doing the manual activity is not automatically a separate
  review checkpoint.

Do not introduce trigger automation, AI, schedules or checkpoints merely to make a spec
look sophisticated. A manually initiated, pure manual workflow with no review checkpoint
can satisfy every required coverage item.

## Push right: prepare before asking for a decision

For each actual checkpoint, identify its decision, the work that can lawfully be completed
before it, and the earliest action that genuinely needs that decision or approval. Move the
checkpoint as far right as those facts permit. State why that position reduces the user's
review burden and which boundary prevents moving it farther.

Maximize preparation before asking the human: gather already authorized inputs, assemble
or compare options, check evidence and prepare the relevant asset. A checkpoint after that
preparation asks once with a decision-ready brief. Do not defer an unavoidable local Human
Gate, read/write grant, external approval or irreversible effect to get more work done.
If reading a channel is not yet authorized, that permission gate precedes that read; prepare
only from already authorized material. A later send/publish gate stays before the effect.
These gate positions belong in the step/ownership contract, not hidden implementation notes.

Design specifies preparation; loop-me does not perform the future workflow. Resolve which
step will produce each asset and how its availability is verified. Never mark future
preparation or a proposed asset as already completed.

## Brief: a compact decision package

A checkpoint **brief** lets the user decide quickly without reading raw output. Include:

1. **What** was actually prepared, with the relevant outcome or options.
2. **Why** it matters and the evidence/reason for the recommendation or tradeoff.
3. **Decision**: the exact choice/verification needed, who decides, and what follows it.
4. **Asset**: a usable link to the real prepared asset so the user can inspect detail.

Raw drafts, log dumps and unfiltered research are assets, not the brief. A real brief uses
an actual available asset link, verified within authorized access. Missing/unreadable assets
make the checkpoint unready; don't invent a successful write or link check. Designing a
brief can instead show an explicitly labeled **example brief — not executed**, together
with the proposed asset path contract and its producing step. Such an example never proves
that preparation occurred and never authorizes creating that extra file.

### Illustrative checkpoint example — not executed or saved

Assume the real user has chosen a recurring update review and has authorized the inputs.
This example must be replaced by their actual terms, paths and decisions during use.

- Preparation contract: the future operator gathers authorized material, checks factual
  support and prepares the update at the separately approved asset target.
- Placement: checkpoint after preparing that draft, before sending. Input access approval
  remains before gathering; explicit sending approval remains before the send. It cannot
  move past either permission boundary. This lets the reviewer consider a ready asset once.
- **Example brief — not executed:** What: the proposed draft and source checks will be
  ready before review. Why: the brief will surface changes and uncertainties that affect
  release. Decision: the named reviewer chooses approve, revise or stop; sending remains
  separately authorized. Asset contract: `<approved-asset-path>` will link the draft when
  that future producer actually writes and verifies it. No asset was produced by this example.

During a real run, replace the contract placeholder with the real linked asset and actual
preparation evidence. Keep the brief concise; don't attach a full raw draft in its place.

### Illustrative manual example — not a user workflow

A person manually chooses to review their already accessible notes, writes their own next
priority in an existing personal notebook, and stops when one specific priority is recorded.
Missing notes means pause and gather them; cancellation preserves existing notes; uncertainty
is resolved by that person; recovery starts from the notebook's current contents. No external
send/integration is involved. The person owns all steps and uses their existing access.
This has no AI, no schedule and no separate checkpoint. It is a valid possible contract,
not evidence about the current user's tools, permissions or completed work.

## Readiness before DONE

Read the real spec back and test this question against each coverage item: could an
implementer build this selected loop without another question? Require real loop evidence,
user selection, actual frontier rounds/answers, concrete coverage and user confirmation.
For every checkpoint require lawful preparation, the push-right reason/boundary and a
complete brief/asset contract. An applicable actual brief needs an actual link; a design
example must remain marked as such. Require no implementation-changing open question.

A request to stop the interview may end the session, but an unresolved design remains a
draft/NEEDS_CONTEXT. Grilling's ability to report deferred questions does not make this spec
DONE. A broad Human Gate phrase with no effect target or owner does not resolve permissions.
An execution approval may be pending if its exact future gate and owner are fully resolved.

The entrypoint then owns the exact create/revise/delete CAS check, readback and any required
shared handoff. On resume, consume the current NOTES/context, spec and actual shared handoff,
restore settled decisions, preserve actual edits and reopen only affected dependencies.
Do not ask solved questions again or turn a recovery note into another workflow truth.

Source: Matt Pocock `skills/in-progress/loop-me/SKILL.md` (MIT), source21,
pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`; local permission and completion adaptations
follow the frozen U005 contract and the existing shared owners.

<!-- FILE_END: loop-me/references/workflow-spec.md -->
