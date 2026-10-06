# Standards — independent cold review

Status: FAIL; passed 3/6. eval_run_id: hook-release-standards-20260930-01.
Frozen 42 files and candidate.patch before/after SHA match. 37 JS, two JSON, shell and Python syntax checks passed. In-memory changed source digest rejected, restored source accepted.

- Important — activate-reviewed.py:53 (also52–71,114–128): integrity, symlink, concurrency, readback gates use Python assert. Reviewer extracted guard rejected mismatched SHA normally but optimize=1 removed all14assertions and accepted. K6/ModeD safety. Use explicit exceptions, verify under -O/PYTHONOPTIMIZE.
- Important — candidate scripts/codex-hook-health.mjs:96: prefix/digest/marker validation accepts completecommand syntax error. Appending `; (` in-memory kept ok:true, while /bin/sh -n exited2. ModeD/R4 runtime gate. Reject malformed complete registrations and add negative regression.
- UNKNOWN — fixture suites write, prohibited for quality-gate §4b; production install/trust/activation/cross-harness/live-session closure not executed. Source-only11PASS is not release closure.

Reviewer: /root/release_standards, quality-gate; no writes, parent persisted direct report. Severity is reviewer judgment. Recommendation: fix then independent closure; no production release.
