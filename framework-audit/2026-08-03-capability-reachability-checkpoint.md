# Checkpoint — 能力可达性治理（2026-08-03，R2 轮进行中）

> 框架/meta session，无绑定项目 → 产出落 `framework-audit/`（未绑定 session 写 `docs/` 会被 project-scope-guard deny）。

## 三份权威文件

| 文件 | 作用 |
|---|---|
| `framework-audit/2026-08-03-capability-reachability-plan-v2.md` | **当前计划**（v1 已废） |
| `framework-audit/2026-08-03-capability-reachability-handshake-r1.md` | R1 四路红队裁决 + 我的驳回 + 名单修正 |
| `~/.claude/plans/abundant-shimmying-thunder.md` | **v1，已被证伪，仅作历史** |

## 已完成 ✅

### 前序（已交付、已推送）
R4 评审请求分流落地（`routing-chain-check` R4 资产索引 + route-guard 评审轴提示钉 + Project Gate 补 `!named` 守卫修红线 SC-20260523-002 + 撤 ux_audit 四个零对象泛词）；三轮独立红队全解，CONFIRM-HANDSHAKE；commit `152259e`→`89c80e9` 已推 upstream/main。muse pty 两相退出修复已交付 `/Applications/luca.app`（**需重启生效，luca 侧未做**）。

### 本轮 R1 握手（已闭合）
- 四路独立红队（保护区/壳存档/证据因果/运行时）**全判 BLOCKER-FOUND**
- 我逐条独立核验，三分类归档：接受为真缺陷的改 plan、**5 条举证驳回**（含 C 的 BLOCKER 定级过高、B 的 input-modes 零命中断言错误、C 的 redteam 产出断言需限定）
- luca 裁决二则：①范围＝**两件都做、价值裁决优先** ②保护区＝**批 `:163` 改措辞 + P6 顺序重排，P1 `allowed-tools` 不批**

### 本轮取证（3 路取证员，取证外包/判定自留）
11 个 skill + 对照组（design-brief / brainstorm）的硬门禁清单、知识内核、行数分布、创建背景、可达性面、能力依赖分类。

## 关键决策（本轮形成，**勿重推**）

1. **v1 核心判据被证伪**：「知识内核=增强=全活 / 流程外壳=限制=全死」——对照组 design-brief **41 条硬门禁**（最多）产出 **15 份**（最活），brainstorm 30 条产出 14 份。门禁数量与存活无关甚至正相关。
2. **v2 判据**：可达性是**必要**条件（0/5 可达的三个全死），**是下游 gate 的源**是**充分**条件（auto 5/5 可达、ux-audit 4/5 可达，但都不是任何 gate 的源，照样 0 产出）。
3. **名单 11 → 5**：加年龄维度后（「使用即留任」是 60 天窗口，对未满 60 天的 skill 不适用），只剩 **auto / ux-audit / taste-review / design-review / handoff-review**，全部是 `7295ec2`（2026-05-26 根提交）就存在的那批。**7 月新落地的 6 个 skill 全都跑过至少一次。**
4. **我连犯三次同类 glob 错误**才拿到准确产出数：task-plan 在 `engineering/` 非 `tasks/`；research-kit 是**前缀**非后缀；code-recon / muse-loop 的**产出不带 skill 名**。教训已写入 person 记忆（否定性断言要定向 grep）。
5. **`/auto` 是「修可达性无效」的决定性实证**：`plan-agent.md:46` 记着 2026-07-03 就诊断过它 50-session 零使用、两个成因当期都修了，修完至今一个月仍是 0。
6. **handoff-review 绝不能存档**：`iteration` 是全仓唯一由单 skill 独占写入且被 hook 消费的字段；`auto-revise-once` 被 `promoted-facts SC-20260615-002`（luca 亲审、stable）称为 luca_gstack「HARNESS 非 Loop」定位下的**唯一正向例外**。
7. **blame 判据是伪判据**：`7295ec2` 是根提交，85–96% 基准率零区分度。判「有无出处」须**五源穷尽检索**且两侧同法。

## 待执行

- [ ] **R2 红队三路进行中**（判据有效性 / 执行面完整性+真跑仿真 / 资产迁移安全性）
- [ ] R2 握手（**上限 2 轮，已用 1**）→ 无存活 BLOCKER/MAJOR 即执行
- [ ] 执行 A：auto 降级隐藏（6 处登记面 + 5 处 CI 消费者）
- [ ] 执行 B：ux-audit 三步（B1 计分函数 evidence-aware → B2 baseline_score 修缺陷 → B3 截图门材料化 + B4 P6 顺序重排）**顺序不可颠倒**
- [ ] 执行 C：taste-review 9+5 条独有内容迁进 anchors（壳保留不存档）
- [ ] 执行 D：design-review `:130-135` 迁走后壳存档（唯一可存档的）
- [ ] 执行 E：handoff-review 补可达性 + 补拉动力
- [ ] 实现后独立评审（不知情 agent）+ 变异测试

## 恢复指令

```bash
cd /Users/luca/Desktop/项目/muse/lucagstack
cat framework-audit/2026-08-03-capability-reachability-plan-v2.md        # 当前计划
cat framework-audit/2026-08-03-capability-reachability-handshake-r1.md   # R1 裁决与驳回
bash scripts/verify.sh              # 基线 70 PASS / 0 FAIL / 1 WARN
node scripts/test-route-guard.mjs   # 基线 68/68
```

**授权边界**：luca 已批 `skill-invariants.md:163` 改措辞（不删条目）+ `:106` P6 顺序重排；**P1 `allowed-tools` 未批** → ux-audit 材料门本轮只收 HTML 源码 / 本地路径，「我自己截图」通道不开。

<!-- FILE_END: 2026-08-03-capability-reachability-checkpoint.md -->
