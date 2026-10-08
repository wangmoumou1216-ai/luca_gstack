# Repository hygiene and documentation alignment — 2026-10-08

Baseline: `9ad66003f6f30da9be004dabbf3bf17de2929524`. Scope: NO_PIN framework maintenance.
The user requested expert and adversarial assessment, repair, verification, publication and pullback.

## Disposition

| Finding | Decision and evidence |
|---|---|
| README omitted `prototype-notes` | Confirmed. The visible catalog has 39 entries; the revised index covers all 39. CHANGELOG now records the capability and why it exists. |
| Agent delegation and rule loading descriptions drifted | Confirmed. README distinguishes task/implement restrictions from bounded skill delegation and describes `get_rules.py` as an active-rule reader. |
| Contributor handoff/state instructions were unconditional | Confirmed. CONTRIBUTING and the PR checklist now condition workflow-state on a selected workflow and verified project. Heavy standalone handoff obligations and the lightweight terminal exception remain explicit. |
| Installation/version guidance was incomplete | Confirmed. Minimum Node matches package/lock `>=20.19.0`; full-check preparation names Node 22, Python/PyYAML, shell tools and Playwright browsers. Package description is product-neutral. |
| CI explanation still referred to removed S16/shared-alias checks | Confirmed by `verify.sh`. CI comments corrected; parsed YAML and non-comment content unchanged. |
| 274 numbered audit copies | Confirmed exact duplicates: baseline Git blob/mode and present bytes matched, totaling 6,626,958 bytes. Only these copies removed. |
| `ci-repair-progress 2.json` | Retained: distinct intermediate state. Every suffixless original and other historical audit entry remains unchanged. |
| `.workbuddy/` and seven apparently unreferenced tests | Retained. Historical decision provenance and distinct test responsibilities exist; replacement coverage was not established. |

## Provenance and independent review

Documentation and provenance specialists assessed the candidates independently. Red-team v1 rejected two proposed statements: an over-broad standalone handoff exemption and an incorrect claim that full verify scanned shared project aliases. Both were corrected; cold v2 passed 7/7. Original FAIL and PASS verdicts remain append-only in `memory/evals/eval-log.jsonl` under `rh-20261008-*` run IDs.

The complete recovery mapping is [2026-10-08-repository-hygiene-dedup.json](2026-10-08-repository-hygiene-dedup.json). Each deletion maps to its retained original, baseline blob, Git mode, SHA-256 and size, with the distinct exception retained. A removed path can also be recovered from the recorded baseline with `git show <baseline>:<removed_path>`.

No exact candidate basename appeared in the 3,631 ordinary files tracked at the original baseline. This is a bounded repository observation, not proof that external or all dynamic consumers do not exist. Original inventory reports remain evidence about their original baselines. Removing current-tree duplicates does not erase Git history or promise smaller historical clone storage.

## Verification

- `bash scripts/verify.sh`: exit 0, PASS=121, FAIL=0, WARN=0, DELEGATED=1. The delegated group reused this run's C11/S30 coverage; static/fixture checks are not native business-flow acceptance. Retained full log SHA-256: `20a78663c561a8b0316b21f9accfef6e5a9bcf8e176a29ea632cc5e1008be782`.
- Generated-context freshness, registration sync and routing/SSOT checks: PASS.
- CI-equivalent Markdown lint and exact inventory/link/engine/CI-semantics assertions: PASS.
- Independent final Standards review: PASS 6/6 (`rh-20261008-final-standards-01`), same native invocation completed and accepted.

The exact deletion set is 274/274; all retained originals and other files in the historical audit directory match the baseline. All seven test candidates and 21 `.workbuddy/` files remain unchanged. Current docs match the accepted v2 candidate, plus the separately reviewed PR checklist correction. CI semantics are unchanged; 39 visible skills and 17 local links/anchors pass.

No production Hook, runtime script, read-only framework asset, project alias or account setting changed. The user explicitly chose ordinary editing/Git after the disabled repository preparation entry refused a native claim; the exception is recorded in the [execution plan](plans/2026-10-08-repository-hygiene.md). No native preparation success is asserted.

## Publication boundary

This report records the reviewed implementation and pre-publication checks. The final Spec review is recorded separately by its original verdict; publication and primary pullback require actual remote SHA and CI evidence, not this report's existence. The primary checkout's unrelated dirty files are protected and must survive any fast-forward pull. Full native business-flow parity and external duplicate consumers were not tested by this documentation cleanup.
