# Repository hygiene and documentation alignment — execution plan

Plan ID: RH-20261008
Scope: NO_PIN framework maintenance in `/Users/luca/.codex/worktrees/747f/luca_gstack`.
Source identity: user goal, 2026-10-08: “发现问题，通过专家会审和红队对抗明确真问题。然后解决问题。并验证，提交推送并拉回”.
Baseline: `9ad66003f6f30da9be004dabbf3bf17de2929524`; primary checkout `/Users/luca/Desktop/luca_gstack` initially shares this clean baseline.

## Premise and authority

Documentation drift and byte-identical historical copies are evidence-backed candidates, not yet blanket deletion permission. Reviewers must distinguish maintenance defects from deliberately retained provenance. The smaller complete solution is precise documentation correction plus only independently justified duplicate removal; no runtime redesign, new cleanup framework, history rewrite, or mass archive move.

Default output is a disposition for every finding, including retained/non-issues. An independent red team must challenge both the claimed problem and the proposed removal. KILL-1: if a duplicate has unique bytes, metadata required by a consumer, an active reference, or an unresolved preservation requirement, exclude it from removal. KILL-2: if the baseline or main checkout changes, re-evaluate integration without overwriting other work.

The latest user goal explicitly authorizes expert/red-team work, fixes, validation, commit, push, and pullback. These permissions persist; this plan does not create authority. Any additional runtime approval/controlled-change gate must be honored without fabricated receipts. New product choices or destructive operations beyond recoverable tracked duplicate removal remain outside scope.

Mode: Sequential outer chain with independent Supervisor reviews; Deep because publication and multiple independent reviewers are required. All critical reviews run serially, native quality-gate/MR-004/peak, cold context. Implementation stays with the main agent/anchor. Model names and user reasoning effort are not changed.

## Frozen units and waves

### U-001 — Expert assessment and adversarial disposition

- Source: the exact user goal above; prior read-only report `.claude/cleanup-reports/cleanup-unused-2026-10-08.md`.
- Dependencies: none. Wave 1. Type: task_execution.
- Owners: documentation expert, repository/provenance expert, then a separate red-team reviewer; each read-only and serial. Main owns recording.
- Read scope: README.md, CONTRIBUTING.md, package.json/lock, CHANGELOG.md, current framework contracts/registries/checkers, `.workbuddy/` and framework-audit candidates/references; no project aliases or downstream projects.
- Output: per-finding confirmed/refuted/unknown dispositions, exact cleanup candidate inventory and preserved exceptions; plan review.
- Gate: every prior finding is accounted for; no required UNKNOWN is treated as permission; preservation evidence is explicit.

### U-002 — Apply the smallest confirmed repair

- Source: user goal and U-001 accepted findings.
- Dependencies: U-001. Wave 2. Type: task_execution. Owner: main/anchor.
- Candidate files: README.md, CONTRIBUTING.md, package.json (package-lock.json only if metadata requires it), CHANGELOG.md; this plan and `framework-audit/2026-10-08-repository-hygiene.md`; a compact dedup manifest if removal is accepted.
- Removal candidate scope: only exact byte-and-mode-identical numbered copies below `framework-audit/2026-10-06-design-workflow-publication-pr26/`, paired with retained originals and a fixed baseline manifest. Preserve `ci-repair-progress 2.json` and any other exception discovered.
- No changes to `.workbuddy/` history, runtime hooks, skill authorities, framework assets, project data, private configuration, or the seven unproven unused tests unless U-001 proves a concrete in-scope defect and a recorded delta is necessary.
- Gate: read back every edited target; verify removal equals the reviewed manifest; all retained originals preserve their hashes/modes; documentation is traceable to current owners.

### U-003 — Verification and independent final closure

- Source: user goal. Dependencies: U-002. Wave 3. Type: task_execution.
- Owner: main runs repository checks; cold quality-gate reviewers independently assess Standards and Spec in separate contexts and exact final diffs.
- Evidence: scoped content/link/inventory checks, generated-context/registration/routing gates, relevant repository full verification, hash-bound independent reports, explicit cross-harness documentation/source checks. No source-only result is called native runtime parity.
- Gate: required checks and reviews pass; unexpected regressions are diagnosed, not bypassed. Known unrelated failures retain their exact scope and do not silently redefine this task.

### U-004 — Publish and pull back

- Source: user explicitly requests “提交推送并拉回”. Dependencies: U-003. Wave 4. Type: task_execution. Owner: main.
- Effects: create `codex/repository-hygiene-20261008` branch in this existing checkout; stage exact reviewed paths; normal commit and push to verified existing GitHub remote. Use the repository's ordinary PR/merge path if required, then fast-forward pull the primary checkout's actual upstream. Never force push, rewrite history, reset user edits, or delete another worktree.
- Before publication: verify actual upstream and full fetch/push URLs, final diff identity, clean primary checkout, remote freshness and independent closure. A new upstream tip requires integration/revalidation.
- Gate: published commit reachable from remote main; remote main, primary main and delivered local state agree; primary worktree clean; CI checked when publication creates it. Merely pushing a topic branch does not satisfy pullback.

## Assertions and quality criteria

Each assertion command runs independently and preserves nonzero status. Evidence is retained under ignored cleanup-reports for raw logs; the compact final report references identities and outcomes.

```bash
# [BLOCKING] RH-A1 — no whitespace errors
git diff --check
```

```bash
# [BLOCKING] RH-A2 — generated agent views are current
python3 scripts/build-agent-context.py check
```

```bash
# [BLOCKING] RH-A3 — entry registrations remain coherent
node scripts/check-registration-sync.mjs
```

```bash
# [BLOCKING] RH-A4 — routing source consistency
node scripts/check-routing-map.mjs
```

```bash
# [BLOCKING] RH-A5 — repository verification (complete fresh output and exit required)
bash scripts/verify.sh
```

RH-A6: deterministic exact inventory check compares baseline Git blobs/modes to the reviewed duplicate manifest and the complete final deletion set. Every removed copy has a byte-and-mode-identical retained original; all non-candidate audit entries remain unchanged; the distinct progress snapshot remains intact. Failure is blocking.

RH-A7: parse the visible skill catalog and ensure README covers each current entry; resolve every changed Markdown local link; verify package engine/install prerequisites against actual package/CI requirements. Failure is blocking.

RH-A8: post-publication compare exact remote main, primary HEAD and delivered commit ancestry, primary Git status and CI result. Failure is blocking; no guessed remote or synthetic evidence.

- C1: Every original finding has a supported confirmed/refuted/unknown disposition; unknown removal candidates are retained.
- C2: README/CONTRIBUTING accurately distinguish standalone/workflow, Claude/Codex, discovery/authority, and production/acceptance; no altered runtime promise.
- C3: Cleanup removes only redundant copies and preserves distinct, failed and intermediate evidence plus recovery provenance.
- C4: Final reviewed bytes match committed bytes; later edits receive fresh review.
- C5: Commit, remote publication and primary pullback are separately proven from actual Git state.

## Failure and resume

Critical/Important findings block their dependent action. At most two ordinary review-repair rounds; unresolved findings remain visible, extra rounds require a stated reason. Do not override protection because a previous check passed. Update this plan only by appended delta; keep U-IDs stable.

Required units initially PLANNED. Resume by reading this exact plan, the final maintenance report if present, current Git HEAD/status and retained review/check outputs. The active goal remains incomplete until U-004 is proven.

## Approved execution delta — 2026-10-08

- U-001 completed: documentation and provenance expert reviews, then cold red-team v1 and v2. The first red team rejected two inaccurate candidate statements; v2 corrected standalone handoff obligations and NO_PIN verification scope and passed all seven criteria. All 274 pairs were independently rechecked. Preserve distinct snapshots, originals, ancestry, `.workbuddy/`, and all seven test candidates.
- Add `.github/workflows/ci.yml` to U-002 for a comment-only correction: its old S16/shared-alias explanation contradicted the current verifier. Parsed YAML and non-comment lines must remain unchanged.
- Add `.github/PULL_REQUEST_TEMPLATE.md` to the same documentation repair: its new-skill checklist repeated the unconditional workflow-state requirement rejected in CONTRIBUTING. Replace only that item with applicable registration/input checks and the verified, explicitly selected workflow condition.
- User explicitly requested proceeding around the disabled project Hook after being told the exact preparation failure and impact: “那你能绕开这个来完成 目标吗”. For this task, use ordinary file edits and Git operations instead of the repository's native preparation procedure. Leave Hook/account configuration intact. No native preparation success or owner-claim receipt is asserted; repository checks, independent review, exact scope and ordinary Git protections remain required.
- The primary checkout now has unrelated uncommitted changes in `.claude/hooks/session-restore.mjs`, `.claude/observability/observations.jsonl`, and `scripts/test-host-launch.mjs`. Protect them. Amend C5's clean-primary condition to: the delivered branch is clean, primary is fast-forwarded to the published main, and unrelated pre-pull changes are preserved byte-for-byte. If a concurrent change intersects this delivery, stop integration and reconcile without reset or automatic stash.
- Verdict envelopes are recorded through the existing recorder in this checkout's memory store; `memory/evals/eval-log.jsonl` is therefore an expected append-only evidence path. Final review receipts may append after their frozen implementation review; verify exact additions and never mutate earlier votes.
