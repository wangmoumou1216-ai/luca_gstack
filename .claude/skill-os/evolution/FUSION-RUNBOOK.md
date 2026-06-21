# 融合运行手册（FUSION RUNBOOK）— 人工触发，每候选

> 演进 digest 是 **propose-only**。融合是**另一条人工触发**的管线：用户从 digest 选定一个候选后，
> 按本手册逐步执行。**worktree 隔离，过完整门禁才落地，可回滚。**

## 红线
- 融合**只在 worktree 内**改动；主分支在所有门禁过之前零改动。
- 触碰 `framework/`、SKILL.md P1-P7 不变量、品牌锁的融合 → 标 `HIGH-INTEGRATION-RISK`，必过对抗审查。
- prose 改动**必过** Sonnet 行为 A/B（`behavioral_ab.py`），否则=机制即剧场。
- 品牌敏感外部技能走 `observability/rules.yaml` 注入 + blockquote，**绝不进 route-guard**。

## 九步管线

| # | 步骤 | 工具 | 通过条件 |
|---|---|---|---|
| ① | 地毯式影响分析 | `python3 scripts/fusion-preflight.py --dimension <dim> --candidate "<name>"` → `impact-report.md` | 列全受影响 surface 文件 + 隐式耦合清单；worktree 干净 |
| ② | worktree 隔离 | `git worktree add .claude/worktrees/fuse-<id> -b fuse-<id>` | 隔离分支建立 |
| ③ | 实施融合 | Edit/Write（仅 worktree 内） | reuse_mode=install→落点接线；port-pattern→把模式搬进指定文件 |
| ④ | 静态 + 契约门 | `bash scripts/verify.sh` + `npm run check:hooks/check:routing-map/check:quality-gates/check:coding-discipline/check:self-model` | 全绿 |
| ⑤ | 漂移门 | `npm run check:routing-map` + `daily_governance.check_model_routing()` | 路由 5 文件 / 4 路 model 一致 |
| ⑥ | 行为 A/B（prose 改动必做） | `behavioral_ab.py extract` → 在 **Sonnet** 上跑 baseline/candidate → `behavioral_ab.py judge` | verdict=PASS（no-op / 回归 → BLOCK） |
| ⑦ | 对抗审查 | `preflight-agent`（入口）+ `quality-gate` agent（Sonnet，断言）+ `redteam` skill（Fable，diff） | PASS / 无 BLOCKING |
| ⑧ | 回滚就绪落地 | `git tag pre-fuse-<id> <主HEAD>` → 从 worktree squash-merge 单提交（`Fuses: <id> @ <sha>`） | 单提交落地 |
| ⑨ | 反馈记录 | append `.claude/skill-os/evolution/adoption-log.jsonl` `{fused_candidate_id, helped, caused_issue, user_adopted}` | 行已写 |

## 回滚
- **首选 `git reset --hard pre-fuse-<id>`**（已 drill 验证）。worktree 提交会被 pre-commit 钩子写脏，`git revert` 在 dirty tree 上会失败（drill 实证）。
- 若已 merge 进主分支且历史不可重写 → `git revert <fuse-commit>`，但须先 `git stash`/确保工作树干净。
- 落地后若该 skill 的 quality_gate FAIL 率上升 → 下月 digest「采纳复盘」标 regression-candidate-for-revert。

## 隐式耦合清单（FM-6，每次必扫）
- 4 路 model 一致：SKILL.md `recommended-model` ↔ `model-routing.yaml` ↔ CLAUDE.md 快照 ↔ orchestrator.md 快照
- `observability/rules.yaml` 按 skill 名 scope 的规则（skill 改名 → 静默孤儿化）
- 路由 5 文件同步：skill-routing-map / input-modes / optional-workflow-graph / rules.yaml / CLAUDE.md+AGENTS.md
- 受保护区：`framework/` 只读、SKILL.md P1-P7、brand-tokens #FF8000
<!-- FILE_END: FUSION-RUNBOOK -->
