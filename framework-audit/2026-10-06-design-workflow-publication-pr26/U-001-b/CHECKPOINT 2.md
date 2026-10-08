# U-001-b bounded implementation checkpoint

Work root: `/Users/luca/.codex/worktrees/design-workflow-fixes/luca_gstack`; framework `NO_PIN`.
U-001-a was accepted before this unit. Its writer remains exactly
`dcfe5a38ec9d06f0847e1235f302602d947bc2fe4772e4fe7626291a93eacf06`.
No Git/network operations, subagents, real-project access or shared-alias access occurred. Alias probes use owned temporary fixtures only.

## Changed production files

Nine `.claude/skills/office/<name>/SKILL.md` bodies: `idea`, `challenge`, `retro`, `figma-demo`, `evals`, `open-design`, `html-prototype`, `redteam`, `ux-audit`; plus `scripts/test-workflow-state-guard.py`.

- State blocks require the already verified canonical absolute `_PROJECT_ROOT`; their topic/state inputs and filename fallbacks resolve under that root. The checks do not grant project authority.
- Eight existing central invocations now preserve writer stderr and nonzero exit, retain artifacts and stop dependency completion. OD's composite branch receives the same explicit failure rule. Relative output conventions, node names/status and figma-demo blueprint metadata remain intact.
- Idea's direct shared-topic write is removed. Topic and node commit together only with an actual known A/B/C/D scene; otherwise it updates the node alone.
- UX uses the accepted central writer with `_EXTRA_JSON.baseline_score`. A read-only admission step preserves the existing project pin/node/report/complete integer-score prerequisites, refuses decimals/UNKNOWN/incomplete/ambiguous/out-of-range scores, and skips state entirely when no UX workflow node exists. Scoring weights, reports and handoff structure were preserved.
- The guard extracts actual Bash state blocks from all nine current SKILL sources. The retired inline UX partition is replaced by central caller coverage. It retains source hashes before/after, actual shell/CLI inputs and output, Python process identities, timestamps, artifacts and cleanup/readback.

## Required gates completed

| Evidence | Actual result |
|---|---|
| `baseline-caller-red.log` / `.json` | Before caller changes: exit 1, **1/56 PASS**, 55 failures. Existing blocks swallow errors, follow shared aliases and bypass UX admission. |
| `green-source-bound.log` / `.json` | Current writer and callers: exit 0, **128/128 PASS**. |
| `mutation-propagation-red.log` / `.json` | Failure handling removed in all nine exclusive temporary SKILL copies: exit 1, **0/9 PASS**. Every caller exits 0 and incorrectly reaches the dependent-phase sentinel, which the guard detects. |
| `mutation-propagation-restored.log` / `.json` | Exact original sources restored in temporary copies: exit 0, **9/9 PASS**. |
| `final-restored-green.log` / `.json` | Fresh full guard: exit 0, **128/128 PASS**; 128 owned fixtures, 139 launched processes; unchanged writer/guard/caller hashes and explicit fixture removal/readback. |
| `project-selection.log` / `.json` | Unmodified `node scripts/test-project-selection-v34.mjs`: exit 0. |
| `project-gate-mutations.log` / `.json` | Unmodified `node scripts/test-project-gate-v34-mutations.mjs`: exit 0; isolated A01/A04/A05/A09 mutations killed, restored baselines pass. |

Reproduce the caller proof with:
`python3 framework-audit/2026-10-06-design-workflow-implementation/U-001-b/run-proof.py`.
`proof-summary.json` binds all ten production before/after hashes, the unchanged accepted writer, nine mutation hashes and temporary-copy removal. The final guard hash is
`2b0bb60fa9a7f31a1d5b1ac43a7c8546a9b20a189157170cc977984b60c22127`.

## Remaining gate / interpretation

Parent fresh acceptance is pending; this worker does not claim independent acceptance. These real extracted-shell/CLI probes establish executable caller behavior on owned fixtures. They do not attest actual user project pin provenance or native Claude/Codex skill orchestration. The current UX decimal refusal is preserved deliberately; no scoring or handoff redesign was introduced.

No live worker remains on these files after this handoff. Parent should read this checkpoint, `proof-summary.json`, `final-restored-green.json`, and the two A2 receipts, perform its fresh gate, then freeze shared-file preimages for U-002. No further optional verification is planned.
