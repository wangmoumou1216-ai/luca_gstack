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
| ⑥ | 行为 A/B（prose 改动必做） | `behavioral_ab.py extract` → 在**被改 skill 的档**（reasoning-heavy=fable→opus / guided-execution=sonnet / mechanical=haiku）跑 baseline/candidate（**baseline arm 禁文件读**，否则读到工作树 live 编辑污染）→ `judge --skill-tier <档>` | verdict=PASS（no-op / 回归 / 档位不符 → BLOCK） |
| ⑦ | 对抗审查 | `preflight-agent`（入口）+ `quality-gate` agent（Sonnet，断言）+ `redteam` skill（Fable，diff） | PASS / 无 BLOCKING |
| ⑧ | 回滚就绪落地 | `git tag pre-fuse-<id> <主HEAD>` → 从 worktree squash-merge 单提交（`Fuses: <id> @ <sha>`） | 单提交落地 |
| ⑨ | 反馈记录 + **可达性验收** | append `.claude/skill-os/evolution/adoption-log.jsonl` `{...}` + 过 FM-11 可达性门 + **install/refresh 类须更新 `external-skills/installed-pins.yaml` 对应行（watch_sha/pinned_sha/pinned_at）**——漏更 = 上游漂移 watcher 永久假告警直至烂掉 | 行已写 + 场景可调到 + pins 已同步 |

> 步③ 实施涉及写/改 skill prose → 先读 `.claude/skill-os/skill-authoring.md`（手艺）+ `skill-invariants.md`（保护区）。
> 步⑧ squash-merge 遇冲突 → 用已装 `resolving-merge-conflicts` skill（按意图溯源解决，先读 commit/PR 原意；harness 层 git 纪律优先）。

## 落地陷阱 + 采纳验收（FM-10 / FM-11，硬规则）

**FM-10 落地陷阱（deletion-type WIP，源 SC-20260621-002）：** 步 ⑧ 抽离前先看目标文件的分支 WIP 性质。
若 WIP 为**删除/精简型**（有成块删除行），**勿 `git checkout HEAD -- <file>` + reapply**——它会丢弃整段 delta、
**复活已删行（反噬）**。此时 fusion 编辑**留 live 随 WIP 一起提交**，或用 `git add -p` / `git stash -p` **逐 hunk 抽离**。
**仅纯新增型 WIP** 可整文件抽离单独提交。

**FM-11 采纳后可达性验收（步 ⑨ 强制，源 SC-20260621-004）：** 「记录采纳 ≠ 能力可达」。每个采纳能力落地后，
必须在 luca 顶层验证**对应场景能否实际路由/调用到**：
- skill → `grep <name> .claude/skill-os/skill-routing-map.yaml` 有 `invoke` 行 + route-guard 在 active project 下能 surface（实测，如 `echo '{"prompt":"<触发词>"}' | ROUTE_GUARD_CURRENT_PROJECT=<proj> node .claude/hooks/route-guard.mjs`）；
- MCP/tool → 确认 session-connect + 某 skill body 引用 `mcp__*`；
- 否则标 **orphan，采纳 NOT-DONE**。by-design 不可达（如 CodeGraph 下游级）须**显式标注豁免理由**。

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
