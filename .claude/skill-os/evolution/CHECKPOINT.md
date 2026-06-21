# 月度自进化子系统 — Checkpoint（2026-06-21b，代码层采纳轮完成）

> 性质:Meta/框架任务,产物落 luca_gstack 仓内;不创建下游项目。
> 接续读本文件 + `ADOPTED.md` / `adoption-log.jsonl` / `digests/2026-06-evolution.md`(v4) / `gaps-register.yaml`。

## 本轮完成（2026-06-21b，全门禁绿 + 红队裁决）

**code-hygiene skill（GAP-code-layer-constraint → addressed）✅**
- 新建 `.claude/skills/office/code-hygiene/SKILL.md`（routed 工程 skill）+ command + routing-map + input-modes + CLAUDE.md 行
- port agent-starter cleanup-* 8 算子 + superpowers verification Iron Law + by-property luca 护栏
- 门禁全过(verify.sh 45/0 · check:routing-map · coding-discipline · self-model 已 regen=26) + **可达性实测**(route-guard active-project surface + M3 框架自维护豁免)
- 红队 **FIX_THEN_STANDS**：4 fix 已落(.gitignore / tool-probe / by-property guards / route-guard M3)

**红队批量裁决（6 项 · 2 轮 · 主 agent 裁决）✅**
- SC-001 **REJECT**（与 behavioral_ab.py Sonnet-pin 硬冲突 → 改进留 `GAP-behavioral-ab-tier`）
- SC-002/003/004 **REFINE→PROMOTE**（已过 promotion_ready 门 → promoted-facts.yaml；SC-002 入 CLAUDE.md SF，003/004 亦自动镜像入 SF）
- SC-005（by-property guards）新候选 pending_review
- SC-003 衍生：external-skill-scout.js sibling reuse_mode 分支已补（闭环）
- FUSION-RUNBOOK 硬化 FM-10（WIP 落地陷阱）+ FM-11（可达性验收门）

**OpenSpec 评估（user 追加）✅** → NARROW_BORROW/下游级；`GAP-no-living-capability-truth`(proposed)；ADOPTED.md 已记
**DGM** → 显式不追（样本太小，重访条件 adoption-log ≥5）

## ⚠️ 仍 live-未提交（有意，随用户 skill-refactor WIP 一起提交）
- OST→ux-brainstorm · GOMS→ux-audit · **code-hygiene 全套接线**（routing-map/input-modes/CLAUDE.md 已含用户 WIP，**勿单独抽离**=SC-20260621-002 反噬）
- 回滚 tag：`pre-fuse-code-hygiene`、`pre-fuse-ost-uxb`

## 留给 luca 的开放项（非阻塞）
- `GAP-no-living-capability-truth`(proposed) 是否 open + 可选 docs/specs/ 活真值终端节点
- `GAP-behavioral-ab-tier`：behavioral_ab.py 泛化用 skill 档（内部代码 TODO，须走 fusion preflight+selftest）
- 无关本任务的旧治理积压候选（SC-20260517/0527/0601/0605 系列，stale 20-35d）待 luca 单独裁决
- 两 skill-body fusion + code-hygiene 接线的最终 git 提交（待用户 skill-refactor 落地）

## 月度回路状态
已闭环：下月首个 session，session-restore 自动提示「🧬 月度演进扫描到期」→ 跑 `Workflow({name:'framework-evolution-scout'})`。
<!-- FILE_END: CHECKPOINT -->
