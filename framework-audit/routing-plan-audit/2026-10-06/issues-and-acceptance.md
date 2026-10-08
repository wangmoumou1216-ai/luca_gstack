# Frozen issue and acceptance map

Authority: final approved plan. Scope NO_PIN. Baseline source hashes: baseline-manifest.json.

| ID | Evidence | Required repair proof |
|---|---|---|
| R1 | baseline manifest review-only junction pointer vs junction R1/R2/R3/R5 | source/index proper predecision loading; missing/stale recovery; native reads |
| R2 | baseline-probes.json faithful transcript MULTI; production forced selection sentence | candidate-only hints; semantic known intent resolves without redundant choice |
| R3 | workflow-mode preselection read ban vs junction graph predicates/recommendation | scoped graph read allowed; activation still needs choice |
| R4 | baseline-probes.json quoted/negated PLAN_MODE | actual semantic Plan conditions assessed before mandatory plan |
| P1 | Plan approval header vs mode table single Supervisor exception | all Supervisor/Hierarchical nested modes require scope-matched real approval |
| P2 | Plan path resolver uses docs existence and latest | verified scope, exact plan identity and hash; stale/wrong-task resumes refused |
| P3 | baseline-handoff-false-positives.json | real unique PASS field, caller path/hash binding, content criteria preserved |
| P4 | cycle-counterexample.json | topology fails on retained cycle; split does not create ready authority |
| E1 | eval_routing judge_question includes expected and asks preferred label | label audit separately named; actual blinded native actor/trace scored |
| E2 | activity fixture sem-flow-full vs retired-unavailable catalog | all 23 active labels/context calibrated; history retained |
| E3 | baseline-empty-denominator.json real exit0 0/0 PASS | empty denominator and invalid fixtures fail nonzero |

Contract conflicts and isolated false-positive checks do not prove historical production misexecution.
Native RP/PO behavior remains required and pending.

## U3 admission follow-up risks — not yet expert-certified

The following findings came from controlled local counterexamples after the original 11-item matrix was frozen. They are tracked separately because the independent review threads could not complete: the Codex model service returned 503. They must not be counted as closed findings or used to claim production exploitability.

| ID | Checker-level evidence | Current status | Required expert/runtime proof |
|---|---|---|---|
| A1 | A manually authored approval JSON with approved:true, matching plan SHA/path/scope/effect, timestamp and confirmed_by:user returns PASS; no native event/session/prompt hash is bound | CONFIRMED checker provenance gap; production effect UNKNOWN | Bind a protected native user-event receipt and prove an ordinary writable file cannot mint one |
| A2 | The same approval JSON can be submitted repeatedly; no nonce claim or one-use receipt exists | CONFIRMED design gap; production replay impact UNKNOWN | Atomic one-time claim at first dispatch/effect and replay mutation returning REPLAY |
| A3 | check-plan-graph.mjs accepts a graph symlink, and composite admission rereads graph after child checks | CONFIRMED path/snapshot gap; TOCTOU exploitability UNKNOWN | Canonical regular-file checks, immutable admission envelope, hash revalidation immediately before effect |

These risks are adjacent to P1/P2/P4 but are not duplicates: P1 covers when approval is required, P2 covers plan identity recovery, and P4 covers graph topology. A1–A3 cover proof of approval origin, receipt consumption, and input snapshot trust.
