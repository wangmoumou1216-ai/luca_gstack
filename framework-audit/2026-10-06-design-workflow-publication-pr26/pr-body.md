## Summary

Fix framework workflow data preservation and conflicting review/execution/source contracts.

```text
verified state caller
  → validate topic/arguments
  → lock + read + patch + atomic state replacement
  → refresh topic projection when applicable
  → propagate failure or continue
```

- Independent `DESIGN_DRAFT` review preserves the full criterion denominator and actual tier requirements.
- Interactive auto stages execute in the main session; engineering source MUSTs remain traceable through tech-spec/task-plan.
- Original-copy capability and run authorization are checked before external staging; ordinary carrier/reference desktop recovery remains.
- Core contracts and state behavior are blocking in verify and CI.

## Evidence

- **Before:** corrupt/concurrent writer and real caller baseline failures reproduced; rejected corrupt-state/lock/caller failure-propagation mutations are retained locally.
  **After:** real state/caller guard **128/128 PASS**, including mutation red→restored-green evidence.
- **Before:** original draft/flow contracts fail the new checks; omitted CI commands fail the blocking checker.
  **After:** static design contract **221/221**, engineering **8/8 groups**, agent-context **107/107 mutations**, CI proof-it-bites **14/14**, original-copy adapter fixtures PASS.
- Real native DESIGN_DRAFT reviewers were admitted and genuine unmet criteria blocked delivery, including zero-high-severity required failures. These are interface/blocking evidence, not final-PRD approval.
- Native CONV/HITL branch expansion, live OD and Claude native runs were excluded by the user's core-verification scope; no PASS claimed for them.

- Final independent Standards review **6/6 PASS** and Spec review **9/9 PASS**; no blockers.
- Actual commit `c8471dc637041aaa06367eb21bd96381dff73e6e`: mandatory full precommit **121 PASS / 0 FAIL / 0 WARN**; all 77 committed blobs match the reviewed source manifest.
- Clean isolated checkout of that actual commit: state, design, engineering, original-copy, generated context, agent contracts, CI mutation and historical manifest checks PASS; tracked source unchanged.

- Actual remote CI exposed persisted checkout credentials rejected by the existing diagnostic safety gate. Fixed only framework-logic checkout `persist-credentials: false`; reproduced credential present FAIL → absent PASS with unchanged security checks.
- CI delta independently reviewed: Standards **5/5 PASS**, Spec **5/5 PASS**, zero findings; new commit mandatory full precommit **121 PASS / 0 FAIL / 0 WARN**.

## Merge Danger

**Door:** Two-way for framework source via a reviewed revert; reverting the writer restores its previous corrupt/concurrent-state risks. Projection failure intentionally retains committed authoritative state and reports stale projection; no two-file atomicity or power-loss guarantee.

**Blast Radius:** Nine state callers, design draft review and auto/engineering/original-copy contracts, derived input metadata and blocking CI. No `framework/` changes, real project-state migration, or unrelated logs are included.
