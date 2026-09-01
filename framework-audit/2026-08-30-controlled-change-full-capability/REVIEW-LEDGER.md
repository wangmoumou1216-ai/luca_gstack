# LucaGStack controlled-change 全量方案审查账本

> 任务：plan-only；不授权 implementation  
> 计划文件：`FINAL-MASTER-PLAN.md`  
> 当前 ledger 状态：`OPEN`  
> 最终停点：`Gate P — WAITING_FOR_EXPLICIT_USER_APPROVAL`

## 1. 输入与范围

- Handoff SHA-256：`51618e033c1ef5ec221a7a455fb743df07d103fde65c715d207f783cae8a221f`，已复算一致。
- Handoff 质量审查：`PASS 9/9`，`eval_run_id=controlled-change-full-plan-handoff-qg-20260830-152811`。
- 本 Session 唯一写入：本目录的 `FINAL-MASTER-PLAN.md` 与本账本。
- 未做：runtime/skill/hook/personal 文件修改；pull/merge/stage/commit/push；真实 external/network/GUI/publication effect。
- 当前 checkout 有其他 session WIP，`main` 相对 `upstream/main` ahead 1 / behind 2；本轮只读比较，未清理或覆盖。

## 2. 历史候选审查

### Round 0 — pre-MVP-reconciliation candidate

- Plan SHA-256：`36c56709a0f32dd881ab33ec4b946b25501a9fd45c1e701f12522960e47594da`
- Architecture / maintainability：`FAIL`
- Blocking findings：
  1. “同时一个 active manifest”与“disjoint operation 并行”相互矛盾，guard authority selection 未定义；
  2. repo bytes 同时被 hardcoded repo stage 与 effect host 声称拥有；
  3. inactive/pre-witness 直接 runtime mutation 可绕过自动 entry；
  4. 没有从已经安装的六 Skill MVP 迁移的 owner/contract；
  5. U-003 `Files` 含模糊的 `plus exact ... destinations`，不满足 exact Files。
- Safety / parity：用户告知 MVP 正在开发后中止，未形成该 SHA 的 binding verdict；不得记作 PASS/FAIL。
- 处理：等待真实 MVP 完成后做 read-only recon；没有按旧候选继续审查或实施。

## 3. Installed v1 read-only reconciliation（2026-09-01）

### 3.1 Provenance / state

- Published commit：`6aaa1c6511af6845042e9dc541524934ed57bfe9`
- Published tree：`c1f7b2f43a1c048852415475eb43be26c377d942`
- Plan SHA：`1db326ae078ddefe95f594b9c6f3ce2c68eae6b70bc25205645973843c76c0f9`
- Local post-publish receipt SHA：`d2969ad74c47977e29102db1d043d4f035ea1f290163ce9ad14ee8eed9ad5aea`
- Read-only `controlled-change.mjs inspect`：`inactive`；两组 state directory 均为 valid terminal；无 `active-context.json`。
- 关键 v1 runtime working bytes 与 `upstream/main` 逐文件相同；本地 `IMPLEMENTATION-RECEIPT.md` 因 post-publish 补充而与 committed pre-publish receipt 不同。

### 3.2 Commands actually run

| Command | Result | Interpretation |
|---|---|---|
| `npm run test:controlled-change --silent` | `PASS 11/11` | v1 exact binding/bootstrap/crash/dual-harness/required-bypass regression 成立 |
| `npm run check:hooks --silent` | `PASS` | existing hook/memory regression 未被 v1 接线破坏 |
| `node scripts/verify-codex-wiring.mjs` | static assertions through S13 `PASS`; live subscription phase未形成终态 | registration/trust 静态事实成立；fresh controlled-mode parity仍需未来 Gate F |
| `node scripts/validate-skill-integration-receipt.mjs --source-manifest` | `PASS`, 27 rows | source freeze 可复算 |
| `npm run test:engineering-delivery --silent` | `PASS 7/7` | 六项skill owner/loader/trigger/flow regression 成立 |
| `npm run check:skill-integration-receipt --silent` | `FAIL` | validator只接受`VERIFIED`，而local supplemental receipt为`PUBLISHED`；是已知schema/lineage gap，不被掩盖 |

### 3.3 Independent recon verdicts（不是最终 plan verdict）

| Axis | Verdict | Key consequence incorporated into plan |
|---|---|---|
| Architecture recon | `VERIFIED v1 baseline / BLOCKED immediate Standard` | v1 single-flight；v2 one-manifest-per-operation；effect host单一repo writer；DRAIN_V1 compatibility |
| Safety recon（default REFUTED） | `REFUTED immediate migration` | pre/post-publish evidence分离；personal只读census；legacy backup/raw state不可接管；public/private audit分层 |
| Flow/harness parity recon | `VERIFIED v1 wiring / BLOCKED Standard parity` | 保留Codex trusted-entry piggyback；补pre-witness admission、exact argv、direct-writer deny、fresh semantic corpus |

这些 verdict 只证明 recon 结论，不是对后续修改后的 `FINAL-MASTER-PLAN.md` 的 binding PASS。

## 4. Candidate review rounds

最终审查必须在下表绑定完全相同的 plan SHA。任何 plan byte 变化都使先前 binding verdict 失效。

| Round | Plan SHA-256 | Architecture / maintainability | Safety（starts REFUTED） | Flow / harness parity | Plan Agent contract | Quality gate | Disposition |
|---|---|---|---|---|---|---|---|
| R1 | `3d9d5975d098a2b2ec5ccbcd726ea6002b8f5893b8ec7fcc38b7dc359f59fb9f` | `PENDING` | `REFUTED` | `PENDING` | `PENDING` | `PENDING` | frozen candidate under independent review |
| FINAL | `PENDING` | `PENDING` | `REFUTED` | `PENDING` | `PENDING` | `PENDING` | must stop at Gate P |

## 5. Final acceptance checklist

- [ ] Plan status is `READY_FOR_APPROVAL` and implementation authority remains `NONE`.
- [ ] Same final plan SHA has PASS from architecture, safety, parity, Plan Agent, and quality gate.
- [ ] 16/16 domains, three tiers, v1 migration, exact U-block/Wave/Files/Read List/Verification/Gates/rollback are present.
- [ ] Every U-block has exactly nine required fields; U-ID dependency graph is acyclic.
- [ ] No ambiguous `plus exact ...` or undeclared future file remains.
- [ ] Ledger records all failed/superseded rounds without rewriting history.
- [ ] `NOT_RECORDED_BY_SCOPE`: no memory/eval runtime write was made for this plan-only Session.
- [ ] No implementation started.

<!-- FILE_END: REVIEW-LEDGER.md -->
