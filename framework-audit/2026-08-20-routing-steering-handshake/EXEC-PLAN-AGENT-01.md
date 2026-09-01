# Plan Agent 计划 — routing/steering E1/E2/E3 执行

> 执行者：`lucagstack-9d`　|　依据：`EXECUTION-PLAN-CORE.md` §11 执行顺序 + `EXEC-AUDIT-DRIFT-01.md` 漂移修正
> 工作面：worktree `.claude/worktrees/routing-steering-exec`，分支 `fix/routing-steering-e1e2e3` @ `fc6eeb5`

---

## 块 0 — 前提门

**1. 该不该解？** 该解。三个都是 luca 亲历的真实故障，且各有可复现证据：E1 有冻结 fixture、
E2 有原始复现串 `帮我优化下设置页面，功能堆砌太严重了很难找`、E3 有 rollout 60/63 行的两条
`msg_*` 挂同一 parent。不是推测出来的问题。

**2. 更小的替代？** 逐个判，结论是三个都没有可接受的更薄方案：
- E1：更薄方案 = 在 `CLAUDE.md` 写死一条 `luca app → muse`。被 §3.1「框架内零字面量」否决——
  框架仓不该知道下游产品名，且不可扩展到第二个项目。下游 manifest 是唯一形态。
- E2：更薄方案 = 维持现状（只靠模型侧软提醒）。**现状就是 E2 本身**，实测失效。
- E3：无更薄方案，是确定性 bug（`consumed.includes(requested)` 对同 `turn_id` 的第二条消息必拒）。

**3. 默认产出形态的偏差（本块适用，必答）：**
本案默认产出是「按 `EXECUTION-PLAN-CORE.md` 实现三个修复」。这个声明把秤压向**「计划仍然有效」**
一侧——我作为执行者有把已投入四轮评审的计划判为可执行的系统性动机。
**反向立场复核者**：已派出冷启动独立会审专家（无本 session 上下文，被明确告知
`NEEDS_ARCHITECTURE_REVIEW` 与 `BLOCKED` 是可接受结论，并被要求专攻本 session 自己写的审计）。
本计划 Phase 1 是硬门：会审未判可执行前，Phase 2 起一律不动。

### KILL 假设

| ID | 假设 | 不成立时 |
|---|---|---|
| `KILL-A` | 计划 `K2` 已触发（基线从 `72bd1f2` 漂到 `fc6eeb5`，`6aaa1c6` 触及 §8 两个目标文件 + ~78 个非 audit 路径）。假设「机械重锚 + 补齐新分支」足以恢复本轮评审效力 | 整份计划回架构评审，本计划作废 |
| `KILL-B` | （计划 `K4`）惰性认证前置成立：首个 PreToolUse/Stop 时持久记录已落盘、可绑定 | 停止实现，回架构评审 |
| `KILL-C` | （计划 `K6`）无锚点 rollout 走旁路、不撤销写授权，且探测**按内容**非 `cli_version` | 停止实现 |
| `KILL-D` | **（本次审计新增，D2）** E3 的真实修复点是 `.claude/hooks/lib/project-substrate.mjs:457`，而计划 §8 写的是 `.codex/codex-hook-adapter.mjs`（实测 `turn_id` 出现 0 次）。假设这是**位置更正**而非架构变更——即 §5.1/§5.2 的 revoke-and-queue + 惰性认证能落在 project-substrate 的真实结构里 | 回架构评审，E3 需重新设计 |

`KILL-A` 与 `KILL-D` 均由 Phase 1 的会审裁决，**不由我自判**。

---

## 块 1 — 复杂度判断

```
复杂度模式: Sequential Chain（外层）+ Supervisor（每 Phase 配对验证）
理由: 阶段强依赖（.gitignore 必须先于义务落盘代码；携带模式必须先于任何早返后的消费者），
      且含不可逆操作（git 提交/推送）；每 Phase 需回归验证故配 Supervisor。
模式可组合: Sequential 外层 + 每 Phase 末尾 Supervisor 验证（EA = 既有测试套 + 变异体）
需要用户确认: 否 —— luca 2026-08-31 明确指示「自主做决策…这个逻辑直到 goal 为止」，
              Supervisor 多 Phase 的默认确认点由该指示豁免（豁免依据在此备案）
任务规模 Tier: Deep（U-block > 8；含不可逆 git 操作；§8 五文件 + 新建测试）
```

**subagent 纪律**：一律串行派发，冷启动（不 fork，会继承结论）。

---

## 块 1.5 / 1.6 — 反向覆盖检查

无 `task-plan.md` 输入，两块的原始形态不适用。**等价物**：以计划 §7.1 断言表与 §7.2 变异体表
做反向覆盖，判定规则同构（遗漏即 CRITICAL，计划不得输出）。

```
断言覆盖检查（反向）：
  §7.1 断言: 7 条
  映射: A-ALIAS→P3 / A-SIGNAL→P5 / A-OBLIG-VISIBLE→P5 / A-OBLIG-LIFECYCLE→P5
        A-IDENTITY→P6 / A-SCOPE-NULL→P4 / A-GATE-SUPPRESS→P3+P4
  遗漏: 无

变异体覆盖检查（反向）：
  §7.2 变异体: 19 条（编号 1–19）
  映射: 1,2,3,4→P3 / 5→P4 / 6,7,11,14,15,17,18→P5 / 8,9,10,16,19→P6 / 12,13→P3+P5（携带模式）
  遗漏: 无
  ⚠ 新增待定: 第 20 条（`explicitEngineeringDeliverySelection → FRAMEWORK_FLOW` 早返下
     信号/RESOLVE/注入是否静默失效）—— 由 Phase 1 会审确认是否必须补，见 D1
```

---

## 块 2 — Phase 分解

| Phase | 内容 | 类型 | model_tier | Status |
|---|---|---|---|---|
| **P0** | 隔离工作面 + 基线实测 + 漂移审计 | infra | core-execution | `DONE` |
| **P1** | **[GATE]** 冷启动会审裁决 `KILL-A`/`KILL-D`，产出重锚最小清单 | review | core-execution | `IN_PROGRESS` |
| **P2** | `.gitignore` 义务状态文件条目（**必须先于任何义务落盘代码**） | infra | core-execution | `PLANNED` |
| **P3** | E1 `RESOLVE` + 下游 `muse/.luca/project.json` + 携带模式穿过**全部**早返 | feat | core-execution | `PLANNED` |
| **P4** | `projectGate` 臂序 `REQ-SCOPE-NULL-FIRST` | fix | core-execution | `PLANNED` |
| **P5** | E2 信号 + 义务载体 + 每轮注入（不拦 Stop、不拒 scope） | feat | core-execution | `PLANNED` |
| **P6** | E3 `msg_*` 身份 + `K6` 按内容探测旁路（落点依 P1 裁决） | fix | core-execution | `PLANNED` |
| **P7** | 19（+1）条变异体逐条跑红 + 冷启动独立深审 | review | core-execution | `PLANNED` |
| **P8** | 合并回 main / 推送 + 交付报告（含「没做什么」） | infra | core-execution | `PLANNED` |

**阶段依赖（硬）**：P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8。
P2 先于 P5 的理由是隐私：义务状态文件含完整 prompt 原文，先 ignore 再落盘，顺序不可颠倒。
每 Phase 先加断言、后改实现（TDD 红→绿）。

---

## 块 3 — 断言列表

```bash
# [BLOCKING] AS-01 — 隔离工作面存在且基于 upstream/main
git -C /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec rev-parse --abbrev-ref HEAD | grep -q '^fix/routing-steering-e1e2e3$' && echo "PASS AS-01" || echo "FAIL AS-01"

# [BLOCKING] AS-02 — luca 主检出零触碰（HEAD 未动）
[ "$(git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse --short HEAD)" = "72bd1f2" ] && echo "PASS AS-02" || echo "FAIL AS-02"

# [BLOCKING] AS-03 — luca 主检出在途文件数未减少（未被我清理）
[ "$(git -C /Users/luca/Desktop/项目/muse/lucagstack status --porcelain | wc -l | tr -d ' ')" -ge 95 ] && echo "PASS AS-03" || echo "FAIL AS-03"

# [BLOCKING] AS-04 — 义务状态文件被 .gitignore 覆盖（P2 产出；变异体 18 守护）
git -C /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec check-ignore -q ".claude/.session-obligation-abc123" && echo "PASS AS-04" || echo "FAIL AS-04"

# [BLOCKING] AS-05 — 既有回归底线：route-guard 不低于 139/0
node /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec/scripts/test-route-guard.mjs 2>&1 | grep -qE 'PASS=(1[3-9][0-9]|[2-9][0-9]{2}) FAIL=0' && echo "PASS AS-05" || echo "FAIL AS-05"

# [BLOCKING] AS-06 — 既有回归底线：project-scope-guard 97/0 不变
node /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec/scripts/test-project-scope-guard.mjs 2>&1 | grep -q 'PASS=97 FAIL=0' && echo "PASS AS-06" || echo "FAIL AS-06"

# [BLOCKING] AS-07 — 既有回归底线：codex-adapter 23/0 不变
node /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec/scripts/test-codex-adapter.mjs 2>&1 | grep -q 'PASS=23 FAIL=0' && echo "PASS AS-07" || echo "FAIL AS-07"

# [BLOCKING] AS-08 — 既有回归底线：test-hooks 全绿
node /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec/scripts/test-hooks.mjs 2>&1 | grep -q 'ALL HOOK/MEMORY REGRESSION TESTS PASSED' && echo "PASS AS-08" || echo "FAIL AS-08"

# [BLOCKING] AS-09 — verify.sh 无 FAIL
bash /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec/scripts/verify.sh 2>&1 | grep -qE 'FAIL=0' && echo "PASS AS-09" || echo "FAIL AS-09"

# [BLOCKING] AS-10 — E1 直接回归：`进入 luca app 项目` 产出恰好一条 muse 候选且零 projectAction（P3 产出）
# [BLOCKING] AS-11 — E2 直接回归：`帮我优化下设置页面，功能堆砌太严重了很难找` 产出信号（P5 产出）
# [BLOCKING] AS-12 — E3 直接回归：同一 turn_id 下两条 msg_* 各自被消费（P6 产出）
# AS-10/11/12 的具体命令在其 Phase 建立测试用例后填入，不得以「已有测试覆盖」代替

# [BLOCKING] AS-13 — 计划字节未被我改动（K1）
# PLAN_SHA_BASELINE 实测钉死于 2026-08-31：
[ "$(shasum -a 256 /Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-20-routing-steering-handshake/EXECUTION-PLAN-CORE.md | cut -d' ' -f1)" = "5fa53d4f30d4f6c8c274eeca8bf19d2047e9d53445ecb4b187d3557d3631823d" ] && echo "PASS AS-13" || echo "FAIL AS-13"

# [BLOCKING] AS-14 — 未触碰 §8 之外的 runtime 文件
# ⚠ 首版用 `git diff --name-only fc6eeb5` 写，实测**对新增的未跟踪文件恒真**（untracked 不进 diff）——
#   已改用 `status --porcelain`，tracked 改动与 untracked 新增一并进入量程。变异自证：
#   `touch <worktree>/scripts/xxx.mjs` 后本断言必须转 FAIL。
git -C /Users/luca/Desktop/项目/muse/lucagstack/.claude/worktrees/routing-steering-exec status --porcelain | awk '{print $NF}' | grep -v '^framework-audit/' | grep -vE '^(\.gitignore|\.claude/hooks/route-guard\.mjs|\.claude/hooks/lib/project-substrate\.mjs|\.codex/codex-hook-adapter\.mjs|scripts/test-route-guard\.mjs|scripts/test-prompt-attestation\.mjs)$' | grep -q . && echo "FAIL AS-14" || echo "PASS AS-14"
```

### 产出质量 criteria（完成后逐条判定，写入交付报告）

```yaml
criteria:
  - "[C1] E1/E2/E3 各有一条直接复现原始故障的回归用例，且有改前红/改后绿的实测输出（不是自称）"
  - "[C2] §7.2 全部变异体逐条跑过并留下转红证据；任何一条恒绿的，先修断言不修变异体"
  - "[C3] 无一条断言是恒真的——每条新断言都做过一次变异自证（含变异本身是否生效）"
  - "[C4] hook 只记录不裁决：新增代码中无任何「读否定词决定授权/拒绝/择一候选」的逻辑（授权轴）"
  - "[C5] 义务在任何状态下都不拦截 Stop、不拒 scope（session-sync.mjs 与 project-scope-guard.mjs 行为零变化，且有断言证明）"
  - "[C6] 未静默缩减既有逻辑：改动只增不减，任何删减都单独列出并说明"
  - "[C7] 交付报告明写「没做什么」（plan-execution 状态机 / bridge / activation 均不在范围）"
```

---

## 块 4 — 失败策略 + Completion Status

- `BLOCKING` 断言 FAIL → 当前 Phase 立即停止，修复后重跑，不带伤进下一 Phase。
- `WARNING` FAIL → 记入 notes，继续。
- 任一 `KILL-A`~`KILL-D` 触发 → 停止实现，按 4 段 Escalation Format 上报，**不自行降级 KILL 条件**。
- 深审出 BLOCKER 且修法需改架构 → 同上，停。

---

## 块 5 — 出门自检

- [x] 块 0 前提门已答（该不该做 / 更小替代 / 默认形态偏差 + 反向立场复核者 / 4 条 KILL）
- [x] 每个 Phase 有 Source 溯源（P2–P6 来自计划 §11 步骤 2；P0/P1/P7/P8 来自 §11 步骤 1/3/4 与审计 D1–D3）
- [x] 不可逆操作（P8 的合并/推送）配 `AS-02`/`AS-03`/`AS-14` [BLOCKING] 断言
- [x] 复杂且新颖 → 研究阶段以「四轮已完成评审 + 本次冷启动会审」替代，非静默省略
- [x] 每个 Phase 的 model_tier 已填（全部 core-execution，无 fable 白名单引用）
- [ ] 设计产出 Phase — 不适用（无设计产出）

<!-- FILE_END: EXEC-PLAN-AGENT-01.md -->
