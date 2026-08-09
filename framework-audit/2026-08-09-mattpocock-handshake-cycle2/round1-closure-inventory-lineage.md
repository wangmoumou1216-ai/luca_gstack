# Cycle 2 Round 1 closure — Inventory / Lineage / Decision 红队

- Frozen Plan SHA: `fe76562742f05f776aa3fd1b434fe358bf3307dbd78346496437bcfb8a5a724a`
- Bound R6 architecture SHA: `b7f875823fb261fd449df68c97832ff41411204598980f252a9fd3c428dcb80a`
- Reviewer receipt: `R1-CLOSURE-INV-LINEAGE-24EB3028-2514-4A5C-AF56-4D67F277158B`
- Review scope: 只读复核原 `IL-001` 的关闭状态，并扫描此次 R/A/B/C 修订是否引入同域新 `BLOCKER/MAJOR`；未来实施尚未发生不计 Plan finding。

## 原 finding 关闭复核

| Original finding | Original severity | Closure | 精确证据 |
|---|---|---|---|
| `IL-001` — review/proposed/installed/verified 真值在候选期、B、VERIFIED 后发生冲突，pin/adoption/registry 无唯一写入与补偿时序 | BLOCKER | **CLOSED** | **R 独立且只写 review truth：** Plan L91、L156-L162 把 benchmark/vetting/gaps/decision history 限定为 exact review-only commit R，明确 `ed37663... → 84fdef...` 仅表示 `reviewed`，不写 route/skill/pin/adoption/global；R6 L514-L518 同样规定 R 不是 A/B/C，零 runtime surface。**候选期不写 live truth：** Plan L214、L279-L280、L355 把能力包限制为 candidate/`implementation/deltas` 或 proposed manifests，pins/adoption/ADOPTED/CHANGELOG 仅由 WP-12 提议、WP-13 freeze、WP-15 broker 应用。**B/C 语义唯一：** Plan L313-L318 与逐文件表 L359-L366 规定 B 只含 route、global swap 后的真实 installed pin 和 `pending_live_verification`，其状态明确不等于 verified adoption；C 只含 final ADOPTED/adoption/CHANGELOG，且不再改 pin/route/target/executable。R6 L442-L454、L501-L512 给出 CLOSED gate → observed B → OPEN → fresh dual verify → observed C=`GOVERNANCE_COMMITTED` → `VERIFIED` 的唯一顺序，禁止 VERIFIED 后 repo/global/governance 写。**补偿唯一：** Plan L318、L368 与 R6 L523-L537、L665-L672 均规定先 close gate，再按 observed C/B/global/A 反向补偿；partial B/C 保留第三态而不猜修。原先的提前采纳、VERIFIED 后二次 pin 更新及 terminal seal 外治理写冲突已经消失。 |

## 同域新增发现

| ID | Severity | Status | 精确证据 | Required fix |
|---|---|---|---|---|
| `IL-C-001` — commit B / route-set 身份自引用，exact B 无法按当前合同冻结 | **BLOCKER** | **OPEN** | Plan L292-L294 要求冻结 exact commit A/B/C bytes 并以 R6 为实现合同，L313-L319 又要求 H4b binding 引用 exact A/B/C hashes。与此同时，R6 L431-L440 要求 **B 引入的每一条 route、installed-pin、pending-activation row 都携带 exact commit-B hash 与 route-set hash**，并要求 observed route-set bytes 的 hash 等于该值。Git commit B 的 OID 取决于包含这些行的 tree；把该 OID 写回 B 自身内容会再次改变 tree 和 OID。route-set hash 若覆盖这里所称的 exact route-set bytes，也同样把自己的值包含在被哈希字节中。Plan/R6 没有定义排除这些 attestation 字段的 canonical projection，也没有把 B OID 完全外置，因此这不是尚未实施，而是冻结合同无法构造确定的 B、无法满足 H4b exact-hash/CAS 的计划级循环。 | 把身份拆成非自引用合同：例如 exact Git `commit_b_oid` 只由 H4b descriptor/gate/journal 外置绑定，不写入 B tree；B 行只携带 transaction ID 与一个有明确 canonical bytes、字段排除规则和算法的 `route_payload_digest`（或也完全外置）。随后同步改写 Plan 的 B manifest/binding 和 R6 L431-L440，并增加 verifier 负例，证明篡改 B OID、payload 或投影规则都会失败。 |

除 `IL-C-001` 外，本次同域扫描未发现其他新增 `BLOCKER/MAJOR`。原 `IL-001` 可以保持 CLOSED；该结论不把未来 WP-13/WP-15 尚未执行当作缺陷。

## 终局

**REFUTE**

原 registry/pin/adoption 时序缺陷已由 R/A/B/C + `GOVERNANCE_COMMITTED` 状态机完整关闭；但修订版在 commit B 身份字段上引入了新的自引用 BLOCKER。修正并重新冻结 Plan/R6 前，不能把本版作为无歧义、可构造的执行指导。
