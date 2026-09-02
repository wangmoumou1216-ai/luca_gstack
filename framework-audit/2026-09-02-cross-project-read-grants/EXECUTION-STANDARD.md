# Execution Standard — Cross-project read grants

> Status: `DONE_WITH_CONCERNS`（任务内 gates 全绿；全仓 RG-08 被范围外 ShareDev handoff 阻塞）
> Source contract: [TECH-SPEC.md](./TECH-SPEC.md)
> Baseline: `a7d5fe35caa43a235e0f364ba1db1ad8517eaca8`
> Authority boundary: 只执行被批准的 U-ID、exact files、local tests 与一个聚焦 Git commit；不 push/部署/切换项目

## 0. Premise Gate

### 0.1 该不该解

应该解决。这是显式跨项目只读依赖缺少授权通道，不是现有隔离器故障。现有
`project-scope` 回归为 `97 PASS / 0 FAIL`，因此执行目标是增加能力，不是放松或替换守卫。

### 0.2 更小替代

- 复制文件：产生陈旧副本，破坏单一真值源。
- 切换项目：改变写入身份和 workflow 状态，风险大于读取本身。
- 放行“看起来只读”的 Bash：无法可靠排除管道、重定向、解释器和复合副作用。

以上方案均达不到安全效果的 80%，不采用。

### 0.3 默认形态偏差

默认产出“新增 sidecar + broker”会把秤压向新增机制。相反立场以 deletion test 复核：如果删除
sidecar/broker 后现有守卫原样恢复，且调用者复杂度不会散落，则新增 Module 合理；否则退回维持现状。

### 0.4 Kill assumptions

- `KILL-1`：UserPromptSubmit 必须提供稳定 turn id。当前 `route-guard.mjs` 已有 `hookTurnId`；若实现时
  该值在任一 harness 不可验证，本计划暂停，不得降级为无期限 session grant。
- `KILL-2`：现有 Codex Bash matcher 必须能够拦截 typed broker 调用。若 adapter 实测不能保留 exact
  argv 或控制动词，U-006 触发 delta replan，不得直接改成 raw Bash allowlist。
- `KILL-3`：本期只承诺 hook-visible 文本读取。若验收要求扩展到图片/PDF/MCP local-path 工具，必须
  新增 adapter/projection 设计后重新确认范围。

### 0.5 研究门

跳过外部研究。核心机制已有本仓 `project-substrate`、controlled capability 和双 harness adapter
先例；事实缺口全在本地代码合同，不属于“复杂且新颖”。若本地 seam 实证失败，再对具体 fact gap
做窄研究，不预先扩展范围。

## 1. Complexity and Orchestration

```text
复杂度模式: Sequential 外层 + Phase 内 Supervisor
理由: grant 状态、issuer、consumer、lifecycle 与双 harness 有严格先后依赖
需要用户确认: 是（runtime 执行前确认 exact U-ID 集）
任务规模 Tier: Standard（8 个 U-block，约 10-15 个文件）
```

执行角色：

- WA-N：按 U-block 修改其独占文件，不改其他 U-block owned files。
- EA-N：使用 quality-gate 对行为断言和 criteria 做独立判定；不静默修复。
- 主 Agent：持有集成文件 `project-scope-guard.mjs`、`route-guard.mjs` 和最终 rollout 决策。

研究、外部网络、Git push、发布和项目切换均不在本计划 authority 内。用户 2026-09-02 的
“做完提交”授权完成验证后创建一个仅含本任务文件的聚焦 Git commit。

## 2. Stable U-blocks

### Wave 1 — Contract-first tests

#### U-001 — 冻结 grant 行为合同并建立红灯测试

- Source: TECH-SPEC `CONV-001..012`；用户原话“执行，并产出技术方案和执行标准”。
- Dependencies: None。
- Files:
  - `scripts/test-project-read-grants.mjs`（新增）
- Approach: 先写允许/拒绝/生命周期/双 session fixture；确认新增正例在实现前 FAIL，现有 97 项仍 PASS。
- Read List:
  - `TECH-SPEC.md` §3-5
  - `.claude/hooks/project-scope-guard.mjs` 的 `classifyPath` 与 `main`
  - `.claude/hooks/route-guard.mjs` 的 turn begin/close 段
- Test scenarios:
  - happy: exact file turn grant、explicit directory session grant。
  - edge: NO_PIN meta grant、同 project 无需 grant、PROJECTS_ROOT 外行为不变。
  - error: sibling、parent traversal、root grant、symlink、malformed sidecar、wrong epoch。
- Verification: 新测试至少一个 grant 正例 FAIL，`npm run test:project-scope` 保持全绿。
- Status: `DONE`。

### Wave 2 — State Module

#### U-002 — 实现 ProjectReadGrants 深模块

- Source: TECH-SPEC `CONV-003..006, CONV-011`；`IF-001..003`。
- Dependencies: U-001。
- Files:
  - `.claude/hooks/lib/project-read-grants.mjs`（新增）
  - `.gitignore`
- Approach: 独立 sidecar、原子写、`0600`、canonical identity、generation 与 public `authorizeRead` seam；不改 project state schema。
- Read List:
  - `.claude/hooks/lib/project-substrate.mjs` 的 identity/state/CAS 设计
  - `.gitignore` session state 段
- Test scenarios:
  - happy: publish/read/revoke turn 与 session grants。
  - edge: binding null、同 session 多 generation、文件被正常替换但仍在 canonical parent。
  - error: tamper、wrong sid、wrong epoch、dangling/nested symlink、special file、deny latch 优先拒绝。
- Verification: `node scripts/test-project-read-grants.mjs --module`。
- Status: `DONE`。

### Wave 3 — Issuer and Lifecycle（可并行）

#### U-003 — 接入 UserPromptSubmit 唯一 issuer

- Source: TECH-SPEC `CONV-002..005, CONV-009`；`IF-001`。
- Dependencies: U-002。
- Files:
  - `.claude/hooks/route-guard.mjs`
  - `scripts/test-route-guard.mjs`
- Approach: 在 begin-turn 后解析严格的显式只读指令；签发 prompt-hash/turn-bound grant；切项目前失效全部 grants。
- Read List:
  - `route-guard.mjs` lines around top-level state close/begin/switch
  - TECH-SPEC §3.4
- Test scenarios:
  - happy: quoted exact path、directory marker、“本会话”marker。
  - edge: 中文/空格路径、NO_PIN meta turn。
  - error: 仅提及路径但无读取意图、模糊路径、不存在路径、agent-generated command。
- Verification: `node scripts/test-route-guard.mjs`。
- Status: `DONE`。

#### U-004 — 接入 Stop/SessionEnd 撤销

- Source: TECH-SPEC `CONV-004/005/011`；`IF-003`。
- Dependencies: U-002。
- Files:
  - `.claude/hooks/session-sync.mjs`
  - `.claude/hooks/session-end.mjs`
  - `scripts/test-hooks.mjs`
- Approach: 只在 non-blocking Stop 真正关闭 TURN_ACTIVE 后撤销 turn grants；blocked Stop 保留回合和
  grant；SessionEnd 撤销全部；清理失败由消费时 generation/lifecycle 校验兜底。
- Read List:
  - 两个 lifecycle hook 的现有幂等清理模式
  - TECH-SPEC §3.2 与 IF-003
- Test scenarios:
  - happy: turn revoke、session persist、SessionEnd all revoke。
  - edge: 重复 Stop/SessionEnd 幂等。
  - error: stale sidecar cleanup failure 后仍不可授权；witness close/publish failure 必须落 deny latch，
    旧 `open=true` witness + grant 即使共同残留也不可消费；在预置 latch 后模拟进程中止，consumer
    必须保持 deny，直到下一次完整事务成功清除 latch。
- Verification: `node scripts/test-hooks.mjs`。
- Status: `DONE`。

### Wave 4 — Enforcement Adapters

#### U-005 — Codex typed read broker

- Source: TECH-SPEC `CONV-007/008/011/012`；`IF-004`。
- Dependencies: U-003, U-004。
- Files:
  - `scripts/project-read.mjs`（新增）
  - `scripts/test-codex-adapter.mjs`
- Approach: exact argv broker 调用不携带 source absolute path；broker 通过 grant ID 调用 `authorizeRead`，
  用非 shell API 实现 bounded read/list/search，directory grant 的 read 支持安全 `--relative`。
- Read List:
  - `.codex/codex-hook-adapter.mjs` alias/adapt 逻辑
  - `.codex/hooks.json` Bash matcher
  - TECH-SPEC IF-004
- Test scenarios:
  - happy: read/list/search 与 Claude fixture verdict 一致。
  - edge: directory read relative descendant；pattern 作为数据含空格或 `docs/` 字样。
  - error: `|`, `>`, `&&`, `$()`, backticks、unknown args、cap replay、raw `cat/rg/find/cp`。
- Verification: `node scripts/test-codex-adapter.mjs` 与 `node scripts/verify-codex-wiring.mjs --static`。
- Status: `DONE`。

#### U-006 — Scope guard 集成 Claude native tools 与 exact broker

- Source: TECH-SPEC `CONV-001/006/007/008/011`；`IF-002/004/005`。
- Dependencies: U-003, U-004, U-005。
- Files:
  - `.claude/hooks/project-scope-guard.mjs`
  - `scripts/test-project-scope-guard.mjs`
- Approach: direct cross-project path 先走 binding，再走 `authorizeRead`；仅 Read/Grep/Glob 可消费；
  broker 只接受 IF-004 整条 exact grammar；写工具、raw Bash 和复合 broker 调用保持 deny。
- Read List:
  - `project-scope-guard.mjs` `classifyPath`、Bash direct path、file tool 分支
  - TECH-SPEC IF-002/004/005
- Test scenarios:
  - happy: Read exact file、directory descendant、Grep/search、Glob/list、exact broker。
  - edge: same-project redirect 与 PROJECTS_ROOT 外 pass-through 不变。
  - error: Write/Edit/apply_patch/raw Bash、wrong operation、broad Grep/Glob、broker shell composition。
- Verification: `npm run test:project-scope`。
- Status: `DONE`。

### Wave 5 — Integration and Rollback

#### U-007 — 接线、文档和双 harness 覆盖闭环

- Source: TECH-SPEC `CONV-007/009/010/012`。
- Dependencies: U-005, U-006。
- Files:
  - `package.json`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `README.md`
- Approach: 将新测试接入现有检查；文档只新增一条能力边界指针，不复制实现细节；明确文本 MVP 和非文本 DEFERRED。
- Read List:
  - package scripts 与 verify 入口
  - 三份文档现有 session isolation 段
- Test scenarios:
  - happy: Claude/Codex 同一 fixture 矩阵。
  - edge: `LUCA_READ_GRANTS_DISABLE=1` 恢复旧行为。
  - error: 文档宣称覆盖未接线工具时 parity check 失败。
- Verification: `npm run check:agents-parity`、`npm run check:hooks`、`npm run test:routes`。
- Status: `DONE`。

#### U-008 — 最终验收、kill-switch 和 rollback 演练

- Source: TECH-SPEC §6-8；用户要求“执行标准”。
- Dependencies: U-007。
- Files: 无新增 production file；仅验证和结果记录。
- Approach: 跑全套断言；先启用功能验证，再以 disable flag 验证旧行为；任何行为差异超出 spec 均停下。
- Read List:
  - 本文件 §3-5
  - TECH-SPEC §5-8
- Test scenarios:
  - happy: exact read allowed，写与宽搜拒绝。
  - edge: 并行 session 不共享 grants。
  - error: malformed grant、switch epoch change、broker failure 全 fail-closed。
- Verification: §3 全部 BLOCKING 断言 + criteria 全 PASS。
- Status: `DONE_WITH_CONCERNS`（RG-01..07 与 C1..C7 PASS；RG-08 唯一失败为范围外 ShareDev handoff 缺 `gate_result`）。

### Dependency graph

```text
U-001 → U-002 → ┬→ U-003 ─┬→ U-005 → U-006 → U-007 → U-008
                └→ U-004 ─┘
```

U-ID 一经批准永不重编；拆分使用 `U-NNN-a/b`，原 ID 留空。

## 3. Executable Assertions

```bash
# [BLOCKING] RG-01 — 新 Module 与 broker 语法合法
node --check .claude/hooks/lib/project-read-grants.mjs \
  && node --check scripts/project-read.mjs \
  && echo "PASS RG-01" || echo "FAIL RG-01"

# [BLOCKING] RG-02 — grant 状态、路径、生命周期和并发矩阵通过
node scripts/test-project-read-grants.mjs \
  && echo "PASS RG-02" || echo "FAIL RG-02"

# [BLOCKING] RG-03 — 原项目隔离零回归
npm run test:project-scope \
  && echo "PASS RG-03" || echo "FAIL RG-03"

# [BLOCKING] RG-04 — route issuer 与 project transaction 零回归
npm run test:routes && npm run test:project-transaction \
  && echo "PASS RG-04" || echo "FAIL RG-04"

# [BLOCKING] RG-05 — lifecycle hooks 与 Codex adapter 通过
npm run check:hooks && node scripts/test-codex-adapter.mjs \
  && echo "PASS RG-05" || echo "FAIL RG-05"

# [BLOCKING] RG-06 — Codex 静态接线与双文档契约一致
node scripts/verify-codex-wiring.mjs --static && npm run check:agents-parity \
  && echo "PASS RG-06" || echo "FAIL RG-06"

# [BLOCKING] RG-07 — kill-switch 恢复旧行为
LUCA_READ_GRANTS_DISABLE=1 npm run test:project-scope \
  && echo "PASS RG-07" || echo "FAIL RG-07"

# [BLOCKING] RG-08 — 全仓验证通过
bash scripts/verify.sh \
  && echo "PASS RG-08" || echo "FAIL RG-08"
```

## 4. Quality Criteria

```yaml
criteria:
  - "[C1] 任一 grant 都能追溯到同 session 的明确用户 prompt hash、turn generation 与精确 path。"
  - "[C2] grant 存在时，跨项目 Write/Edit/apply_patch/raw Bash 和 PROJECTS_ROOT 宽搜仍全部拒绝。"
  - "[C3] traversal、sibling、nested symlink、control-plane path、wrong sid/turn/epoch 均有行为级负例。"
  - "[C4] .session-project-* schema 与唯一写 binding 语义没有变化。"
  - "[C5] Claude native adapter 与 Codex broker 对共享 fixture 返回相同 allow/deny verdict。"
  - "[C6] sidecar/broker 缺失或 feature flag 关闭时，系统精确恢复实施前行为。"
  - "[C7] 文档没有把 DEFERRED 的图片/PDF/MCP local-path 入口宣称为已覆盖。"
```

EA 必须逐条输出 `PASS | FAIL | UNKNOWN + 证据`。任一 MUST criterion 为 FAIL/UNKNOWN，不得完成 rollout。

## 5. Failure and Rollback Standard

- 任一 BLOCKING 断言 FAIL：停止当前 Wave，不进入下游 U-block。
- 同一 BLOCKING 原因连续两次：追加 delta replan；三次仍失败：`BLOCKED`。
- sidecar/identity/parser/broker 异常：只拒绝 cross-project grant，当前项目读写继续走旧路径。
- broker 失败：禁止回退 raw Bash、复制文件或自动 switch。
- rollout 前必须证明 `LUCA_READ_GRANTS_DISABLE=1` 和“删除 sidecar”两条回滚路径。
- 不创建数据迁移；rollback 不得改写或删除 `.session-project-*`。
- 全仓验证若仅因预先存在的无关 dirty change 失败，返回 `NEEDS_CONTEXT` 并给出精确证据，不修改无关文件。

Escalation 格式：

```text
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: <具体失败的 U-ID、文件或接口>
ATTEMPTED: <已执行的断言与结果>
RECOMMENDATION: <delta replan、恢复 baseline 或请求新 authority>
```

## 6. Completion Standard

只有同时满足以下条件才可标记 `DONE`：

1. U-001..U-008 全部为 `DONE`；
2. RG-01..RG-08 全部 PASS；
3. C1..C7 全部 PASS；
4. relevant files 相对批准 baseline 无计划外改动；
5. 功能开启与 kill-switch 两种模式均有票据；
6. 只创建一个聚焦 commit，未执行 push、发布或其它未授权外部副作用。

当前完成状态：`DONE_WITH_CONCERNS`。runtime 已按以下 exact authority 执行；全仓唯一失败证据为
`docs/handoff/2026-09-02-sharedev-pwc-sales-workbench-deepresearch-handoff.md` 缺 `gate_result`，未越界修改：

```text
approved_u_ids = [U-001, U-002, U-003, U-004, U-005, U-006, U-007, U-008]
source = TECH-SPEC.md @ repository baseline a7d5fe35caa43a235e0f364ba1db1ad8517eaca8
effects = repository file edits + local tests + one focused git commit
excluded = git push, deployment, project switch, external writes
approval = 用户 2026-09-02 明确要求“做完提交”
```
