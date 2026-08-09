# Cycle 2 Round-1 红队 C Closure — Scope / Plan-first / Execution

- **Candidate SHA:** `fe76562742f05f776aa3fd1b434fe358bf3307dbd78346496437bcfb8a5a724a`
- **Reviewer receipt:** `C2-R1-C-CLOSURE-SCOPE-20260809T051238Z-fe765627`
- **Review mode:** 只读 closure review；未修改 Plan / architecture / matrix。
- **Finding boundary:** 未来 implementation/broker/scripts 尚未建成本身不计 finding；只判定 Plan 的生产者、依赖、授权、命令与回执合同是否可单义实施。
- **Freeze boundary:** 本报告只对开始复核时已校验的 `fe765627…` Candidate 有效。收尾时同路径已被其它会话修订；后续 SHA 必须全新复核，不得继承本 receipt。

## 冻结与静态证据核验

- Candidate SHA 精确命中冻结值。
- `architecture-decisions.md` SHA 精确为 `b7f875823fb261fd449df68c97832ff41411204598980f252a9fd3c428dcb80a`。
- `harness-matrix.yaml` SHA 精确为 `c0ddd7da94389ab20e50461abe8bcc8fd79c8164fef1cf71f6b17fe22dd548cc`。
- `build-manifest.mjs validate` 实际 PASS：321 decisions / 197 manifest atoms。
- `build-harness-matrix.mjs --negative-bite` 实际 PASS：321 atoms / 2,568 cells；8 类 mutation 全部按预期被拒绝。

## R1C-01..09 Closure

| ID | Status | Evidence | Closure judgment / required action |
|---|---|---|---|
| R1C-01 | **CLOSED** | Plan lines 96–112 现在唯一序列为 `WP-13-BUILD → H4a → WP-13-NATIVE → WP-14 → H4b → WP-15`；WP-13 Dependencies 和 WP-14 Dependencies（lines 297, 308）同步。A-015 已改为 H4a R6 descriptor，不再要求 H4b descriptor。 | H4a/WP-13/WP-14 硬环已消失；BUILD 与 NATIVE 的 PASS 语义分离。 |
| R1C-02 | **CLOSED** | Plan line 293 的两条 H4a native entry 与 ADR-ACT-001 R6 「WP-13 / H4 command and receipt contract」字面一致：`evolution-activate.mjs --mode spike` + `verify-activation-r6.mjs`，descriptor/fault matrix/receipt dir/success token 均一致；Plan 绑定的 ADR SHA 也与实际文件一致。 | 原“两套 R5 future contract”已收敛为一套 R6 exact contract。新的 envelope 冲突另见 NS-02，不把“未实施”当失败。 |
| R1C-03 | **CLOSED** | WP-00 明定当前 main/orchestrator 为 `bootstrap-main`，现有 quality-gate 独立复核（lines 143–150）；WP-05 也由 bootstrap-main 建 dormant roles，并明禁在 PASS 前使用新 role（lines 202–209）。DAG 将 WP-05 放在 WP-01 及其它 role-owned WP 前。 | logical role 不再生产自己；bootstrap DEV/TEST 也已进 §6 独立任务卡。 |
| R1C-04 | **CLOSED** | WP-00B 在 capability WP 之前产出 immutable `execution-envelope.json`、transaction checkout/HOME/quarantine 和 5 个 candidate roots（lines 78–82, 97–105, 143–150）。WP-06/07/08/09/11 命令现在只用枚举 `--candidate-key`，不再留 `<transaction-global-candidate>` 自由占位符。 | 原 producer-after-consumer 环已解除。H0 之前的 bootstrap 时序是独立问题，见 R1C-07。 |
| R1C-05 | **CLOSED** | DAG 现为 WP-02→WP-03→WP-04（lines 100–105）；§7.1 对 `route-guard` / `project-scope-guard` / route map / FUSION / candidate trees / governance files 给出顺序 writer epoch 与 pre/post-hash 交接（lines 346–355）。WP-12 为 registration 唯一 integration owner。 | 原并发同文件所有权冲突已关闭。 |
| R1C-06 | **CLOSED** | DAG line 104 明写 `WP-06 + WP-07 + WP-08 + WP-09 + WP-10 → WP-11`；WP-11 Dependencies line 275 完全一致，WP-12 再等 WP-11。 | 126 adopted inputs 不再只藏在 prose，WP-11 不会抢跑。 |
| R1C-07 | **OPEN — BLOCKER** | Plan 已将 A/B 分段并修正 Plan path，但当前已知必须走 H0。DAG 定义 `WP-00A(read-only) → H0 → WP-00B`（lines 97–99）；WP-00 又规定 A 段零写（line 149）。然而 H0 命令依赖未经更早节点生产/独立验收的 `WP-00/bootstrap/prepare-cycle2.mjs`，A 的 Expected 还要“生成 H0 卡”，Files/Receipt 还包含 `read-only-preflight.json` 和 `H0/approval-binding.json`（lines 143–149）。这些都是写，却没有一个 H0 之前的授权生产/测试节点；WP-00B 又在 H0 之后。 | 必须增加 `WP-00-H0-PREP` 或把 align executor 预先冻结在 Plan 证据面：产出 executor + read-only evidence + proposed H0 binding，由现有 quality-gate 在 Luca 批 H0 前核 hash/参数域/负例。同时把“A 段零写”改为“零 repo/runtime/global 写，只允许原子发布该审批证据”，或真正保持零写并由人工卡外部携证。 |
| R1C-08 | **CLOSED** | §7.2 已定义逐文件 `REVIEWED/R → A → B(LEDGER_COMMITTED) → C(GOVERNANCE_COMMITTED) → VERIFIED` 状态机（lines 357–368）。WP-01 只产 reviewed commit R；B 只写 route/installed pin/pending row；C 只写 final ADOPTED/adoption/CHANGELOG；VERIFIED 后零写。WP-15 的 forward/reverse 顺序与 ADR R6 一致。 | 原 registry/adoption 时序冲突已关闭；reviewed truth 不再冒充 installed/verified。 |
| R1C-09 | **CLOSED** | A-004 和 WP-02 Expected/Rollback（lines 121, 173–175）现在区分“首 edge 未开始”与“已开始”：后者只能 roll-forward 到两端 stub/absent，明禁恢复危险真身。P1 停机语义也同步。 | 原“一边禁恢复、一边恢复前态”矛盾已关闭。H1 门前 artifact 顺序是下述新 finding。 |

## 同域新 BLOCKER / MAJOR

| ID | Severity | Evidence | Status | Required Plan fix |
|---|---|---|---|---|
| NS-01 | **BLOCKER** | DAG 是 `WP-05 → H1 → WP-02`（line 100），WP-02 Dependencies 也要求 Luca H1 先到（line 176）；但 WP-02 Owner/DEV 任务才负责准备 containment descriptor 和 frozen stub（lines 169–170, 329）。H1 是 approval binding，却在它需要绑定的 descriptor/stub SHA 产生前发生；现有 WP-00 executor 只能证明执行器冻结，不能替代未冻结 payload。 | **OPEN** | 拆成 `WP-02-PREP(no live mutation) → independent TEST/freeze → H1(binding exact old/stub/descriptor/executor hashes) → WP-02-EXEC → WP-02-VERIFY`。H1 不能先批一个之后才生成的变更 payload。 |
| NS-02 | **MAJOR** | Plan 硬规则说所有 runtime-generated path 只从 envelope 解析（line 14），§2 更说后续命令只传 `--execution-envelope`/`--candidate-key`（line 82）。但 R6 exact native 两条命令只传独立 descriptor 和另一个 `--receipt-dir .../receipts/wp13-r6`，不传 envelope（line 293，ADR exact contract 同样）。Plan 没有声明这是唯一例外，也没把 descriptor 必须绑定 envelope SHA/key map/receipt-root 写成 schema 与 verifier 断言。 | **OPEN** | 二选一且 Plan/ADR 同步：给 exact native commands 增 `--execution-envelope`；或显式将 H4a descriptor 列为唯一例外，并强制 descriptor 含 envelope SHA/transaction ID/枚举 path-key map/receipt-root，strict verifier 对其做不可替换绑定。 |
| NS-03 | **MAJOR** | WP-13 BUILD 命令调用 `scripts/evolution/verify-activation-build.mjs`（line 293），但 WP-13 Files（line 291）和 ADR Owned implementation surfaces（ADR lines 568–585）只列 strict native `verify-activation-r6.mjs`，没有 BUILD verifier。这里的 finding 不是“现在文件不存在”，而是没有任何 WP 拥有/产出命令所需的未来文件，且 §6 的 TEST-WP-13-STATIC 没有指定该 verifier 的独立变异验证。 | **OPEN** | 把 `verify-activation-build.mjs` 加入 WP-13 BUILD Files/ADR owned surface，由 DEV-WP-13-BUILD 产出；TEST-WP-13-STATIC 必须对 A/B/C manifest omission/reorder/hash drift/descriptor-envelope substitution 做负例，且不使用生产者自签结果。 |

## 终局

**REFUTE**

R1C-01–06、08–09 已关闭，修订对 DAG、R6 native contract、bootstrap roles、envelope producer、sequential ownership、WP-11 dependencies、R/A/B/C governance 与 H1 fail-safe 都是实质修复。但 R1C-07 仍使当前必经的 H0 无法从「A 段零写」到「执行已冻结 align executor」单义过渡；NS-01 对 H1 复制了同样的 gate-before-payload 问题，NS-02/03 使 R6 命令与全局 envelope/Files 合同不自洽。修复并重冻结前，不应输出 `PLAN_HANDSHAKE_READY`。
