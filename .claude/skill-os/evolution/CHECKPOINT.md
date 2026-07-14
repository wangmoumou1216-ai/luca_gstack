# 月度自进化子系统 — Checkpoint（2026-07-14，评审加固轮完成）

> 性质:Meta/框架任务,产物落 luca_gstack 仓内;不创建下游项目。
> 接续读本文件 + `ADOPTED.md` / `adoption-log.jsonl` / `digests/2026-07-evolution.md` / `gaps-register.yaml`。

## 2026-07-14 — 评审加固轮（用户令「真问题全部修正」，九项全落地双仓）✅

- **修正**：硬门 default-deny+schema enum / redteam null→保守 downgraded / 权重按 reuse_mode 分档 /
  candidate-log 分级拉黑(REJECTED 183d TTL·opportunities 免疫) / gaps addressed_at+90 天复核窗 /
  AdoptionReview phase+digest 首节三件套强制 / 簿记脚本 evolution-bookkeep.mjs(幂等+zero_yield_streak
  N=3 告警) / external-skill-scout 读 self-model 活真值 / 演进面 parity 锚点登记（顺带治愈母版
  gaps-register 缺 GAP-brownfield 漂移）
- **新文件**：BENCHMARK-RUNBOOK.md（对标深评=演进模式 2，unknown-unknown 通道）+ scripts/evolution-bookkeep.mjs
- **验证**：双仓 verify 全绿（fork 56/0、母版 55/0）；bookkeep fixture 8 断言（含幂等守卫真 bug 修复：
  JSON.stringify 无空格格式匹配）；workflow 按 harness 语义（async 包裹）过 node --check
- **下轮注意**：scout 返回值新增 `adoption_review` / `prior_opportunities_to_adjudicate` /
  `addressed_recheck` 三字段=digest 首节强制裁决项；落盘改跑 `node scripts/evolution-bookkeep.mjs
  <返回json>`，**勿再手工追加 candidate-log**；GAP-issue-tracker-integration 仍 open 待下轮 fit-to-gap

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
