# Checkpoint — 能力可达性治理（2026-08-03）

> 框架/meta session，无绑定项目 → 按 redteam 框架治理场景同一条 fallback 落 `framework-audit/`
> （未绑定 session 写 `docs/` 会被 project-scope-guard deny，见本轮 R4 改动）。
> 计划全文：`~/.claude/plans/abundant-shimmying-thunder.md`

## 已完成 ✅

### 前序（已交付、已推送）
- **R4 评审请求分流**落地：`routing-chain-check` 增 R4（资产索引+证据标准，非决策树）、
  route-guard 评审轴提示钉（挂 STOP/SINGLE_SKILL/PROJECT_STOP/PROJECT_SWITCH 四支）、
  Project Gate 豁免补评审动词 + `!named` 守卫（修红线 SC-20260523-002）、
  撤 ux_audit 四个零对象泛词、code_hygiene 收对象绑定词、code-hygiene 模式 D、
  redteam target/产出场景适配。
- 三轮独立红队（fable R1 / opus R2 / fable R3）1 BLOCKER + 11 MAJOR + 22 MINOR **全解**，
  R3 终裁 **CONFIRM-HANDSHAKE**。test-route-guard 61→68 全过变异测试，verify.sh 70 PASS。
- commit `152259e` `fae3e5e` `2c6e2d4` `76f3252` `2e5eb2e` `89c80e9` 已推 upstream/main，双检出同步。
- muse pty 两相退出修复已交付 `/Applications/luca.app`（旧版留 `.bak`，需重启生效）。

### 本轮调查（数据已取证，结论已成形）
- 全 11 项目产出文件扫描：生成类全在跑，评审评估复盘类 **七个全零产出**。
- 下游消费者统计：`prd/` 14→13 份、`design-brief` 11→8；`redteam/`/`evals/`/`retro/` 消费者
  只有自己 → 产出 0。**相关性近乎完美**。
- reference 引用统计：`handoff-protocol` 21、`ai-native-taste-anchors` 5（含 design-brief）。
- 硬门禁全量取证（6 个 skill + input-modes + invariants），逐条 blame 出「有无事故出处」。
- AND 门槛实测：handoff-review 三件套 1/11、task-plan 双 handoff 2/11。

## 关键决策（本轮形成，勿重推）

1. **「没用到 = 没接进流程」被证伪**——ux-audit 入口最全（一级+斜杠+graph 起点）产出照样 0。
2. **真判据是「挂在什么上」**：挂必然动作→活；挂自己触发词等召唤→死。
3. **luca 补的认知一致点**：触发后限制模型能力的 skill 该改或砍（2×2 判据表）。
4. **同一 skill 内两部分性质相反**：知识内核=增强（全活，靠被引用）、流程外壳=限制（全死）。
5. **救零使用 skill 不是加触发词**——那会把限制性外壳一并接进流程、用可达性名义扩散枷锁。
6. **门禁的决定性分野=有无事故出处**：有出处的是红线（保留），无出处的全部 blame 到
   `^7295ec2 2026-05-26 baseline snapshot`（可改可砍）。
7. **ux-audit 截图门是「模型变强后约束反成负担」的活样本**：skill 级拦死、无出处、
   而 input-modes 登记的本就是 `screenshot_or_page_reference`（执行面单方面收紧）。

## 待执行（按 luca 指定序列）

- [ ] **红队深度 review 本 plan**（下一步）——重点攻击面已在 plan 末尾标出
- [ ] 红队↔plan 握手至无存活 BLOCKER/MAJOR（上限 2 轮）
- [ ] 执行批 1（砍限制性门禁：ux-audit 截图门→材料门 + Phase0 顺序锁、task-plan 双 handoff 降级）
- [ ] 执行批 2（三个零使用 skill：内核留下、外壳存档）
- [ ] 执行批 3（持续保证：§6 必答项作提示、使用即留任换数据源）
- [ ] 实现后独立评审（不知情 agent，只给改动清单+验收标准）

## 恢复指令

```bash
cd /Users/luca/Desktop/项目/muse/lucagstack
git log --oneline -6          # 确认前序已推
cat ~/.claude/plans/abundant-shimmying-thunder.md   # 计划全文（含判据与批次）
bash scripts/verify.sh        # 基线应为 70 PASS 0 FAIL 1 WARN
node scripts/test-route-guard.mjs   # 基线应为 68/68
```

**风险提示**：批 1.1 要动 `skill-invariants.md:163`（ux-audit 截图门列在"不可进化"清单）——
这是**动保护区**，须 luca 明确批准，红队已被指定重点攻这条。
