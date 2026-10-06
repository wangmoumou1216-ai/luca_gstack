# Prototype notes release handoff

Date: 2026-10-06. Framework scope: NO_PIN. Frozen authorities: [plan](../2026-10-04-prototype-notes-plan.md), [execution](../2026-10-04-prototype-notes-execution.md), [decision](../2026-10-04-prototype-notes-decision.md).

## Current deliverable

[Annotated interactive HTML](u008/ui-final-compact-04/artifact/current-department-notes.html), SHA-256 `d79346d7ef104a5e757f03cd7d3459e293e29955dc71952155e42435878e738e`. [Usage guide](u008/ui-final-compact-04/usage-guide.md). [Machine-readable release identity](release.json).

13 notes: 11 generated within `project-management`, 2 manual; revision 6. Business-source SHA-256: `ca2748d4bd3f36788940067134b49fa707696b5aefd49d84bb94c977990ce7f3`. Open the HTML, use the notes sidebar to locate/edit annotations, then download HTML to save and deliver a complete copy. “待确认 · 原型未演示” appears only on the relevant note. A downloaded revision has its own identity; this manifest is not an engineering acceptance certificate.

## Correction to PR #24

PR #24 merged the current shared runtime but selected compact-02 HTML. The source session's last completed report selected compact-03. Compact-02 fails reimport through the published processor with `UNKNOWN_VERSION`; the earlier handoff's final-HTML claim identified the wrong version.

The session review also reproduced a cancellation defect: reselecting an existing note's region committed immediately even if editing was cancelled. Compact-04 preserves compact-03 business source and notes exactly, with the runtime repaired so region selection stays in the draft until save. Earlier HTML files remain historical evidence. Findings are in the [session review](../2026-10-06-prototype-notes-session-review/REVIEW.md).

## Verification

`npm run test:prototype-notes-release` checks this exact artifact's hash, production reimport, source/notes identity and RELEASE link, and rejects a self-consistent package with stale runtime. Chromium and Firefox exercise note/status display, rebind cancellation, invalid edit plus Escape, explicit save, download/reopen, unchanged other notes and closed-panel business navigation. The cancellation test failed against compact-03 before repair and passes against compact-04. Existing dual-browser draft/context regression also passes.

The test is required in verify.sh and CI; CI-contract negative tests reject its omission. Prior PR #24 CI and core results remain historical. Current version results and independent findings are reported separately in the session review.

## Plan status and evidence limits

Sequence: U001 → U002 → U003 → U004 → U005 → U006 → U009 → U007 → U008. U001–U007 and U009 have accepted historical implementation records. Later changes require their affected regressions; historical votes are not new-version acceptance. U008's original full acceptance remains incomplete. The user stated product work was complete for them and authorized publication; this is product acceptance/release authority, not proof of unperformed tests or an exact-SHA native acceptance receipt.

Still unverified: real frontend recipient five-task recount; native OS Chinese IME/browser-native zoom; three genuine Codex lifecycle receipts; the original complete four-role cold acceptance for current HTML. Claude runtime was excluded by the user. Neither this release nor the session audit declares the frozen plan DONE.

Detailed original evidence remains at `/Users/luca/.codex/worktrees/ec43/luca_gstack/framework-audit/2026-10-04-prototype-notes-implementation/`; new detailed evidence is in sibling `2026-10-06-prototype-notes-session-review/`. Generated browser/native/conversation evidence stays local. Portable release includes HTML, manifest, usage guide and review summary.
