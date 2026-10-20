# Plan: soft-retire html-prototype and magicpath (方案 B)

- plan_id: PLAN-20261020-RET-HTML-MP
- path: framework-audit/plans/2026-10-20-retire-html-prototype-magicpath-plan.md
- plan_sha256: recorded in the retirement commit message and the report §9 (a file cannot hold its own hash)
- scope: NO_PIN framework work in this checkout; no project is read or written; `framework/` untouched
- source identity: user messages "html-prototype / magicpath 这两个，不要了" and "批准B，四点都同意，开始执行"
- orchestration: Sequential, Supervisor (each commit gated by independent review before push)
- tier: Deep (>8 U-blocks, ~117 live files, irreversible push)

## Approval record (K3)

The user saw the soft-retirement plan (draft v2 incl. two cold reviews) and replied "批准B，四点都同意，开始执行"; later "你把要处理的和计划执行的，做一个checklist，然后执行" and "继续执行，别丢了清单". Approved four points:
1. soft retirement: skill directories are not deleted;
2. the pure-model direct-HTML exit is dropped; only open-design / claude-design remain; if both are unavailable the user gets an actionable NEEDS_CONTEXT, no automatic tool switch;
3. findings newly reported in a re-test count toward the two-round repair cap;
4. push only explicit files, fetch first, confirm origin/main has not advanced, no force, do not touch other sessions' content.

Effects authorized: edit/move/delete the listed live files in this repo; `git add` explicit files; commit; fast-forward push to origin/main; pull back. Not authorized: editing `~/.codex/**`, `framework/`, `framework-audit/**` historical snapshots, `stash@{0}`, other worktrees.

## Block 0 — premise gate

1. Should this be solved: yes — user decision; the two skills are off the core flow (原始需求 → design-brief → OD/CD → browser acceptance → fix ≤2 rounds).
2. Smaller alternative: tombstone-only (no asset moves) was rejected by review seat 1: open-design reads `html-prototype/SCHEMA.md`, the acceptance script lives under html-prototype; tombstone alone leaves the core flow dependent on a retired skill.
3. Default-form bias: the default product is "retire", which tilts toward deletion. Counter-weight: directories are kept (soft), and an independent cold reviewer defaults to REFUTED, specifically asking whether the change only makes the work look tidier.
- KILL-1: if open-design or claude-design cannot take over the shared assets (SCHEMA, acceptance script) without behavior change, stop and return to the user.
- KILL-2: if the full verify cannot be made green without weakening an assertion that protects the OD/CD path, stop.

## Phases

Phase 1 (task_execution) — **Step 0 + push**: commit guidance/README/pin fix; push 3 local commits + it. Gate: origin/main == local main.
Phase 2 (task_execution) — **Commit 1, shared-asset migration** (atomic, assertions first):
- U-001 move `html-prototype/SCHEMA.md` → `.claude/skills/office/references/prototype-spec-schema.md`; update `open-design/SKILL.md:311`, `figma-demo/SKILL.md:90,104,847`, `skill-invariants.md`, `muse-proto-judge.md`, and any other live reader (grep-driven).
- U-002 move `verify-prototype.mjs` and `test-verify-prototype.mjs` to `.claude/skills/office/design-output/scripts/`; update `skill-invariants.md`, figma-demo, muse-proto-judge, verify.sh/test runners.
- U-003 `design-output/SKILL.md`: reference the acceptance script; delete the "本地 HTML / MagicPath" inheritance line; add the actionable NEEDS_CONTEXT message when both exits are unavailable.
- keep `references/html-prototype-tokens.md` in place (shared).
Phase 3 (task_execution) — **Commit 2, entry retirement** (atomic with assertion rewrites; generated files via `build-agent-context.py sync`, never hand-edited):
- U-004 `skill-visibility.json` tombstones RET-20261020-001 (html-prototype) / -002 (magicpath), replacement open-design/claude-design, boundary text; remove magicpath from `hidden`.
- U-005 discovery surfaces: delete `.agents/skills/html-prototype` symlink, `.agents/skills/magicpath` dir, `.claude/commands/html-prototype.md`, magicpath entry in `skills-lock.json`; add the same retired boundary to both SKILL.md heads so a direct read says "retired".
- U-006 routing map, input-modes.yaml, codex-viability.yaml, `scripts/design-output-selection.mjs` whitelist, graph (`paths`, `fallback_paths`, gates `design_brief_to_html` / `design_brief_to_magicpath`, `design_output.fallback` empty).
- U-007 agents: orchestrator, preflight, quality-gate, work-agent-template, plan-agent (incl. skills_needed example), plan-design-guidance (+ hash pin), `templates/workflow-state.yaml`, `observability/rules.yaml`.
- U-008 docs: design-brief (`output-templates.md`), brainstorm, ux-brainstorm, ux-writing, evals, office-wizard, auto, dev-handoff, README.
- U-009 scripts/tests: rewrite assertions that pinned "keep both" (`test-design-tool-retirement`, `test-design-tool-routing`, `test-design-execution-defaults`, `test-semantic-parity`, `test-route-guard`, `test-verification-exit-contract`, `check-agent-contracts` regex, `check-routing-map`, `check-skill-scene-coverage`, `history.sh`, fixtures).
- U-010 new `scripts/test-design-output-retirement.mjs` modeled on `test-muse-loop-retirement.mjs` (excludes `framework-audit/**`).
- U-011 CHANGELOG and U-REGISTER entries.
Phase 4 (task_execution) — **memory residue** (separate commit): `memory/MEMORY.md` index, `memory/procedural_complex_skill_flow.md`; extraction-bar read first (K8); `eval-schema.yaml` / README examples only if they act as live guidance.
Phase 5 (task_execution) — **evidence**: add sanitized hfix01 re-test report to `framework-audit/design-workflow-frontlight/u003-claude-batch/`; update report §9.
Phase 6 (Supervisor review) — cold contract review, then cold runtime review (serial, default REFUTE); fix; full verify; push; pull back; compare local == remote.

Historical/untouched: `framework-audit/**`, `docs/**`, `memory/episodic/**`, `framework/`, `~/.codex/skills/magicpath` (user-level; reported, not modified), `memory/evals/routing/fixtures.jsonl` `sem-ux-novel` label (owner-calibrated; reported).

## Assertions

```bash
# [BLOCKING] A1 — shared assets exist at neutral paths
if ( set -o pipefail; [ -f .claude/skills/office/references/prototype-spec-schema.md ] && [ -f .claude/skills/office/design-output/scripts/verify-prototype.mjs ] ); then echo "PASS A1"; else check_rc=$?; echo "FAIL A1"; exit "${check_rc:-1}"; fi

# [BLOCKING] A2 — no live file reads the old SCHEMA or script location
if ( set -o pipefail; ! git grep -nE 'html-prototype/(SCHEMA\.md|scripts/verify-prototype)' -- . ':!framework-audit' ':!docs' ':!memory/episodic' ':!CHANGELOG.md' ':!U-REGISTER.md' ':!scripts/test-design-output-retirement.mjs' ); then echo "PASS A2"; else check_rc=$?; echo "FAIL A2"; exit "${check_rc:-1}"; fi

# [BLOCKING] A3 — design-output references the acceptance script and has the both-exits-down message
if ( set -o pipefail; grep -q 'verify-prototype' .claude/skills/office/design-output/SKILL.md && grep -q 'NEEDS_CONTEXT' .claude/skills/office/design-output/SKILL.md ); then echo "PASS A3"; else check_rc=$?; echo "FAIL A3"; exit "${check_rc:-1}"; fi

# [BLOCKING] A4 — discovery surfaces removed
if ( set -o pipefail; [ ! -e .agents/skills/html-prototype ] && [ ! -e .agents/skills/magicpath ] && [ ! -e .claude/commands/html-prototype.md ] && ! grep -q magicpath skills-lock.json ); then echo "PASS A4"; else check_rc=$?; echo "FAIL A4"; exit "${check_rc:-1}"; fi

# [BLOCKING] A5 — skill directories still present (soft retirement)
if ( set -o pipefail; [ -f .claude/skills/office/html-prototype/SKILL.md ] && [ -f .claude/skills/office/magicpath/SKILL.md ] ); then echo "PASS A5"; else check_rc=$?; echo "FAIL A5"; exit "${check_rc:-1}"; fi

# [BLOCKING] A6 — generated context is in sync and contracts pass
if ( set -o pipefail; python3 scripts/build-agent-context.py check && node scripts/check-agent-context.mjs && node scripts/check-agent-contracts.mjs ); then echo "PASS A6"; else check_rc=$?; echo "FAIL A6"; exit "${check_rc:-1}"; fi

# [BLOCKING] A7 — retirement test and full verify
if ( set -o pipefail; node scripts/test-design-output-retirement.mjs && bash scripts/verify.sh ); then echo "PASS A7"; else check_rc=$?; echo "FAIL A7"; exit "${check_rc:-1}"; fi

# [BLOCKING] A8 — push landed: local main equals origin/main
if ( set -o pipefail; git fetch origin && [ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] ); then echo "PASS A8"; else check_rc=$?; echo "FAIL A8"; exit "${check_rc:-1}"; fi
```

criteria (judged by cold reviewers, binary, evidence required):
- [C1] The OD and CD paths in design-output/open-design/claude-design are behaviorally unchanged except the removal of the two fallbacks.
- [C2] Calling `/html-prototype` or `/magicpath` is refused with `retired_skill` and never dispatched (runtime evidence).
- [C3] No file outside the plan's scope changed; other sessions' dirty files and `stash@{0}` are untouched.
- [C4] No assertion protecting the OD/CD path was weakened to make verify green.
- [C5] No live (non-historical) text still presents the two skills as selectable.

## Failure policy

BLOCKING failure stops the phase; three repeats of the same failure → BLOCKED with evidence. A reviewer BLOCKER surviving one repair round → stop and report to the user.

## Replan R-1（2026-10-20，触发：框架检查器拒绝“已登记墓碑 + 保留目录”）

- 事实：`scripts/check-agent-context.mjs` / `build-agent-context.py` 要求墓碑条目对应的 skill 不能再有目录（`retired skill remains active`），因此“不删目录”与“墓碑拒绝调用”不能同时成立。
- 用户裁决：选择“删目录，完整退役”（原提问：退役方式；选项一为推荐项）。回滚点：本地 tag `pre-retire-html-prototype-magicpath`。
- 随之扩大的范围（原计划 P3 前移，均为这两个 skill 的专属物）：删除 `.claude/skills/office/html-prototype/`、`.claude/skills/office/magicpath/`、`scripts/sync-magicpath-projection.mjs`、`scripts/test-magicpath-projection-sync.mjs`、`design_brief_to_magicpath` 与 `design_brief_to_html` 两个 graph 门；route-guard 增加两个硬编码退役名（与既有 figma-layer / muse-loop 先例一致）；`/html-prototype` 类措辞（做个原型 / HTML原型 / 快速原型 / 原型界面）改路由到 `/design-brief`。
- 新增验收：`scripts/test-design-output-retirement.mjs`（含 mutation，verify S14h）、`test-design-tool-routing.mjs` 接入 verify（S14i）、验收脚本自测接入 verify（S14j）。
- 评审结果见评估报告 §9.2。
