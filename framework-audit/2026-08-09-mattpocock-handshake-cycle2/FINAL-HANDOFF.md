# FINAL HANDOFF — mattpocock/skills Cycle 2

## Metadata

- status: `READY_FOR_EXECUTION_SESSION`
- overlap_status: `BLOCKED_BY_REX_DELTA`
- execution_baseline: `../2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md`
- shared_owner_block: project transaction、patch parser、native agents、human gate、activation journal
- unblock_condition: `RULE_EXECUTION_VERIFIED` 后生成 Cycle 2 delta、新 package SHA 与新的 G-PACKAGE；
  当前 Cycle 2 不得直接执行 shared-owner task
- type: `framework/meta self-evolution`
- canonical repo: `/Users/luca/Desktop/项目/muse/lucagstack`
- final authority: `FINAL-EXECUTION-PLAN.md`
- machine manifest: `final-execution-manifest.json`
- DEFER truth: `defer-promotion-register.json`
- first terminal: `PACKAGE_VERIFIED`; live terminal: `EVOLUTION_VERIFIED`

## Goal

在不整包安装、不破坏 Luca 原生 Skill-first / Graph-optional 架构的前提下，把 mattpocock/skills 窗口的 10 个适配行为与必要的双 harness 基座安全落到 luca_gstack；同时把 19 个 DEFER 做成有优先级、有消费者、仍需人裁的重访队列。

## Final decisions（8）

1. 74 HEAD atoms 保持 `ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27 / QUARANTINE 0`；总分母 321、验收格 2,568。
2. 19 个 DEFER 当前晋升 0 个；P1 questionnaire(8)、P2 logic-prototype(10)、P3 TDD pointer(1)。高价值不替代证据门。
3. DEFER 只补强现有 `gaps-register → scout → FUSION`：MET 输出 `READY_FOR_HUMAN_ADJUDICATION`，永不自动改 status、建 skill、开 route。
4. 更新 shared `systematic-debugging` 与 `tdd`；把 `codebase-design`、安全 resolver 统一到 `~/.agents/skills/*` 真身，Claude 用软链，Codex/Claude 同 tree。
5. `teach` 保持 Claude 个人显式调用，写根为 `$LUCA_TEACH_ROOT`；不进 Codex/project route。
6. 不新增 workflow 节点。debug/TDD/codebase/conflict 通过既有语义 route 或内部引用命中；questionnaire/logic/TDD pointer 仍 zero surface。
7. 先修运行基座（pin transaction、patch parser、native agents），再改能力，再做 registration/FUSION/321 验收。
8. 用户要求不再开新红队/judge；final-package checker 是 Plan 终局门。实施中的独立 TST、quality/safety gate、人类危险动作门不取消。

## Constraints（5）

1. 不写 `framework/`、产品 `/Users/luca/Desktop/项目/X/docs/`、muse 7 tools、unrelated dirty/untracked。
2. `/Users/luca/Desktop/luca_gstack` 是 stale read-only reference；不得自动对齐。
3. 禁止 `git reset --hard`、`git clean`、`git add .`、自动 stash/push；Git 纠正用 exact revert/new commit。
4. 全局 target 写必须在 G-CONTAIN/G-ACTIVATE 的 exact descriptor 下做 CAS + backup + atomic rename + read-back。
5. 任一 blocking gate fail 即停；同一问题三次失败报告 `BLOCKED`。

## Risks（3）

1. 当前 cycle2 audit package 未跟踪；若不先过 G-PACKAGE exact allowlist commit，新 worktree 会缺输入/fixture。
2. 当前 resolver 合同明确要求 never abort 并自动 stage/commit/continue；在安全 candidate 之前必须先 containment。
3. global shared skills 跨项目生效；错误激活会影响 Claude/Codex 所有项目，因此 live swap 必须最后执行并 fresh-session 复验。

## Required read order

1. repo `AGENTS.md`、`CLAUDE.md` 与 mandatory startup context。
2. `NEXT-SESSION-PROMPT.md`。
3. 本 handoff。
4. `FINAL-EXECUTION-PLAN.md`。
5. `final-execution-manifest.json`、`defer-promotion-register.json`。
6. `decision-map.json`、`head-decision-map.json`、`harness-matrix.yaml`、`architecture-decisions.md`。
7. `quick-research-framework-routing-defer-2026-08-09.md`。

不要把 `candidate-handshake-plan.md` 当执行权威；它只解释审计来路，且其中“新红队/judge、对齐 stale checkout、重型 TCB/root broker”已被最终方案覆盖或收敛。

## Start protocol

在 canonical repo 运行：

```bash
node framework-audit/2026-08-09-mattpocock-handshake-cycle2/tools/verify-final-handoff.mjs
git status --short
git rev-parse HEAD
git -C /Users/luca/Desktop/luca_gstack status --short
git -C /Users/luca/Desktop/luca_gstack rev-parse HEAD
```

只有出现 `FINAL_HANDOFF_GATE_PASS` 才进入 DEV-001。然后按 Plan 的 E0→E7 与 DEV/TST 配对执行，不跨阶段。G-PACKAGE 前只读；G-CONTAIN/G-ACTIVATE 前展示 exact payload 并停下。

## Expected outputs

- E0：package-only commit、隔离 worktree、`PACKAGE_VERIFIED`。
- E1：resolver containment journal、`RESOLVER_CONTAINED`。
- E2：project/patch/native-agent receipts、`HARNESS_FOUNDATION_PASS`。
- E3–E4：capability candidates、DEFER consumer、integration map、`ROUTING_CLOSED_PASS`。
- E5–E6：activation rehearsal、321/2,568 acceptance、G-ACTIVATE descriptor。
- E7：live read-back、pins/adoption/benchmark records、`EVOLUTION_VERIFIED`。

## Acceptance criteria

1. `verify-final-handoff.mjs` 零退出并只输出一个 `FINAL_HANDOFF_GATE_PASS` 终局 token。
2. HEAD 74 决策与 19 DEFER exact set 不漂移；当前 promotion 必须仍为 0。
3. 每个 DEV-001..012 都有独立 TST-001..012 PASS；18 条 ASSERT 全部有证据。
4. Claude/Codex 共享能力同 tree 可达；teach/DEFER 的刻意不对称与 zero-surface 有负面证明。
5. 321/321、2,568/2,568，stale checkout 和 protected paths 前后不变。
6. live 后 fresh Claude/Codex session 复验通过，唯一完成状态为 `EVOLUTION_VERIFIED`。

## Output paths

- Plan：`framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md`
- Prompt：`framework-audit/2026-08-09-mattpocock-handshake-cycle2/NEXT-SESSION-PROMPT.md`
- Manifest：`framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-execution-manifest.json`
- DEFER：`framework-audit/2026-08-09-mattpocock-handshake-cycle2/defer-promotion-register.json`
- Integrity：`framework-audit/2026-08-09-mattpocock-handshake-cycle2/final-source-bundle.sha256`

<!-- FILE_END: FINAL-HANDOFF.md -->
