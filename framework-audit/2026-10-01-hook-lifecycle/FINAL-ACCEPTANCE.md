# Final Hook incident acceptance

Status: DONE for the reported incident and agreed acceptance scope.

Formal Luca acceptance completed on 2026-10-01 (Asia/Shanghai), after the user
accepted the native macOS DesktopFolder prompt. The final System-profile App
created session `01a0f7e9-1a0e-7042-8b08-039a9fcc1f3e`, executed pwd, closed the
owned test pane, and reopened the same SID from recent history. A second pwd
completed in the resumed session. Both commands were rewritten to `/bin/pwd`,
returned exit 0 with empty stderr, and completed as `LUCAFINALPASS` and
`LUCARESUMEPASS`. Neither GUI turn showed the previous false Hook code 2.

Independent Quality Gate `hook-formal-new-resume-final`: PASS 4/4.
Frozen result SHA: `9d3c292b751812b1905a040d330084e9a78421bab0ea011c0302d0d4973e15c7`.
The actual resume shell and Codex process each carried exactly 11 enabled
framework Hook keys. Desktop config SHA remained
`d01a7b6443ae26d2871e2b8782a400ca72c67ec503b29b8c4fe68c3389d5a981`, identical to
the verified Desktop-OFF baseline. The five foreign hooks and other settings
were unchanged in the official effective-config proof.

Published framework runtime: `595499e8a2146d2eedca7dad8958fcf3ab6c8bce`.
Published App source: `48e6e31f20def6817d12f1cecf42257b23666cba`.
Installed v6 ASAR: `9c55e83aec6c91e755954a801f499266d1ca1067d39cbf85d9fd5b5be640ade4`.
The standard local framework gate passed 107 checks with zero failures. The
isolated native concurrency, recovery and denial matrix remains the evidence
for parallel writes; no production business files were changed for acceptance.
All 304 preexisting dirty mother-checkout files were byte-preserved at adoption.

Evidence: `/tmp/luca-hook-incident-1001/final-app-live-result.json`,
`final-new-workspace.json`, `final-resume-workspace.json`,
`final-live-hook-policy.json`, and the SID rollout under Codex sessions/2026/10/01.
The prior pending-TCC/new-resume status in the chronological incident notes is
superseded by this acceptance record.

Framework runtime CI for `595499e8a2146d2eedca7dad8958fcf3ab6c8bce` completed successfully:
[GitHub Actions run 36877648839](https://github.com/wangmoumou1216-ai/luca_gstack/actions/runs/36877648839).
This final audit-only publication does not change the validated runtime.

Same-directory parallel sessions are supported for disjoint writes; conflicting
writes to the same canonical file remain serialized. The remaining Codex notice
about command-line overrides requiring embedded mode is informational; both
accepted turns executed successfully in that mode.
