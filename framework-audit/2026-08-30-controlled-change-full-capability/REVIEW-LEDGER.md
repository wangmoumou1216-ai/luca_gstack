# LucaGStack controlled-change 全量方案审查账本

> 任务：plan-only；不授权 implementation  
> 计划文件：`FINAL-MASTER-PLAN.md`  
> 当前 ledger 状态：`REOPENED_BY_POST_SEAL_REVIEW`
> Canonical ledger SHA-256：`385d7de6b995944d45c3f161255ae01fe7d34248197fd8ec592dae8a117235d3`
> Canonicalization：仅把上一行64位值规范化为64个`0`，其余UTF-8/LF bytes保持原样后计算SHA-256；raw file SHA由handoff外部绑定。
> 当前停点：`POST_SEAL_REVIEW — GATE_P_SUSPENDED`

## 1. 输入与范围

- Handoff SHA-256：`51618e033c1ef5ec221a7a455fb743df07d103fde65c715d207f783cae8a221f`，已复算一致。
- Handoff 质量审查：`PASS 9/9`，`eval_run_id=controlled-change-full-plan-handoff-qg-20260830-152811`。
- 本 Session 唯一写入：本目录的 `FINAL-MASTER-PLAN.md` 与本账本。
- 未做：runtime/skill/hook/personal 文件修改；pull/merge/stage/commit/push；真实 external/network/GUI/publication effect。
- 收敛时最后观测到的 commit 为`c98f3b94ba99a2b9a73af5cce10a2f9bbff66704`；它相对`2059ee4`只改另一审查目录的一份`REPORT.md`。这是时间点观测，不是plan签名或未来implementation baseline。本Session未stage、commit或push。

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
- 81-row manifest 对发布 commit `6aaa1c6` 的历史 bytes 可复算；当前 `upstream/main` 已有 8/81 合法发布后漂移，不能再声称 live runtime 等于 `6aaa1c6`。本地 `IMPLEMENTATION-RECEIPT.md` 因 post-publish 补充而与 committed pre-publish receipt 不同。

### 3.2 Commands actually run

| Command | Result | Interpretation |
|---|---|---|
| `npm run test:controlled-change --silent` | `PASS 11/11` | 既有 selector 回归成立；R-011 mutant 证明它不覆盖 compound-Git 与 concurrent one-use，不能外推 effect 安全 |
| `node scripts/verify-codex-wiring.mjs --static` | static 19 `PASS`; live L1–L3 因 `--static` 明确 `BLOCKED` | registration/trust 静态事实成立；不声称 fresh/live parity |
| `node scripts/validate-skill-integration-receipt.mjs --source-manifest` | `PASS`, 27 rows | source freeze 可复算 |
| `npm run test:engineering-delivery --silent` | `PASS 7/7` | 六项skill owner/loader/trigger/flow regression 成立 |
| `npm run check:skill-integration-receipt --silent` | `PASS` | 旧“只接受 VERIFIED”问题已修；但伪40-hex OID/错parent仍可PASS，故只是shape/tuple admission |
| `node scripts/candidate-manifest.mjs --verify-at 6aaa1c6…` | `PASS`，另报告 live 8/81 drift | historical manifest有效；live drift不应被错误要求为零 |
| `bash scripts/verify.sh` | `PASS=86 FAIL=0 WARN=1`，约112s | 当前仅余约8s/120s agent预算；新suite不能继续串行堆叠 |

### 3.3 Independent recon verdicts（不是最终 plan verdict）

| Axis | Verdict | Key consequence incorporated into plan |
|---|---|---|
| Architecture recon | `VERIFIED v1 baseline / BLOCKED immediate Standard` | v1 single-flight；v2 one-manifest-per-operation；effect host单一repo writer；DRAIN_V1 compatibility |
| Safety recon（default REFUTED） | `REFUTED immediate migration` | pre/post-publish evidence分离；personal只读census；legacy backup/raw state不可接管；public/private audit分层 |
| Flow/harness parity recon | `VERIFIED v1 wiring / BLOCKED Standard parity` | 保留Codex trusted-entry piggyback；补pre-witness admission、exact argv、direct-writer deny、fresh semantic corpus |

这些 verdict 只证明 recon 结论，不是对后续修改后的 `FINAL-MASTER-PLAN.md` 的 binding PASS。

## 4. Recent-commit fixed-range audit（2026-09-02）

- Fixed range：`72bd1f25a8f969e56ab0133dc6ec5f11b3b1236c..0f8cf146e0d561686f820a0d49519d065520dece`，18 commits。
- Standards axis：`FAIL`，`eval_run_id=recent-commits-standards-20260902-72bd1f2-0f8cf14`。
- Spec axis：`FAIL`，`eval_run_id=recent-commits-spec-20260902-72bd1f2-0f8cf14`。
- 两轴相互独立；本账本不把同一 finding 在两个轴合并成“多数票”。

### 4.1 Standards findings

1. **Critical — compound Git effect bypass**（`6aaa1c6`）：guard 只分类复合 Bash 中第一个 Git verb；以完整 command SHA 取得 `git-stage` authority 后，`git add … && git push …` 的 push 不再经过 `git-push` gate。scratch fixture 返回 `PASS compound-git-effect-bypass-repro`。
2. **Important — one-use 非线性**（`6aaa1c6`）：`atomicWriteJson` 在 check-hash 后无 interprocess lock/atomic compare 即 rename；并发消费可重用 token 或丢更新。
3. **Important — read-only Git probe 执行程序面**（`6aaa1c6`）：conflict helper 保留 repo-local config，`git status` 在 applicability 判定前执行 `core.fsmonitor`；scratch NOT_APPLICABLE probe 实际创建了 fsmonitor side-effect marker。
4. **Important — PUBLISHED proof underbound**（`cac4b46`）：全 `a` published/remote OID 与全 `b` parent 仍通过 final validator；未证明 object existence、single parent/baseline 或 exact path-set。更强 verifier 当前错误依赖 live 8/81 bytes，未接入 S44。
5. **Important — recommendation 被当 dispatch**（`659a1ef`/`61d26cd`）：`recommendedSkills.length > 0` 即把 PENDING obligation 置 SATISFIED，但 producer 可只是 PLAN_MODE/wayfinder hint。

### 4.2 Spec findings

1. **Important — first task payload 被覆盖**（`659a1ef`/`61d26cd`）：SIGNAL_UNCONFIRMED→PENDING 时以第二事件 text 覆盖第一事件 `exact_task_text`，违反 inert record byte-preservation。
2. **Important — E1 identity 不可携带**（`caf52ac`/`61d26cd`）：delivery report 明确 alias resolution 依赖未 tracked 的下游 `.luca/project.json`；fresh clone/另一机器会重开 E1。本 NO_PIN session 遵守 project-scope guard，未越权读取下游文件。
3. **Minor — oversize 语义漂移**（`61d26cd`）：>262,144 bytes 会截断，但生产 hint/test 声称“完整字节”；上游原计划要求 durable deny。
4. `2571d53` 的 route responsibility 修复、其余 audit/memory/verify 提交与各自报告基本相符；这不抵消上述 blocker。

### 4.3 Disposition into the full plan

- v1 改判为 installed compatibility/recovery baseline；新 v1 Git effect 保持 disabled。
- Gate M0 + U-001 固化 compound/concurrent/false-publication/route-non-authority mutants；U-003 只允许 zero-shell/zero-Git-effect exact migration。
- U-004 在 scratch 先建 minimal repo-only effect host；U-003 安装；U-007 只能扩展已安装 host，修复旧 R1 self-host loop。
- U-006 不接受 obligation/recommendation 为 authority，Gate M 重做 E3 interface census，并覆盖 distance-2 event。
- U-009 要求 program-surface-safe Git plumbing。
- U-012/Gate V 守 120s 预算，禁止通过 FAST_COMMIT/hidden skip 伪装。
- 本轮只改 plan/ledger，未修任何 runtime finding；这些 finding 仍是未来 implementation blocker。

### 4.4 Incremental commit audit（`0f8cf14..83468c1`）

- Subject：单提交 `83468c1ee5902a58cfcf129432481caa2e17a87a`；只改 `.gitignore`、`memory/scripts/check_memory_integrity.py`、`memory/scripts/daily_governance.py`。
- Standards axis：`FAIL 3/6`，`eval_run_id=recent-commit-standards-20260902-83468c1`。
  1. **Important**：repo-local proposal scan 被 `GLOBAL_MEMORY_DIR` 是否存在错误门控；个人记忆目录缺失时 CLI/JSON/daily digest 三面静默失明，而 direct scan 仍能找到 12 份。
  2. **Important**：新增 git-time/mtime/fail-open/三消费面行为没有持久化回归；既有 `test:memory` 54/54 不能覆盖该 diff。
  3. **Minor**：30 日阈值在 scanner 常量与 digest 文本重复。
- Spec axis：`FAIL 5/7`，`eval_run_id=recent-commit-spec-20260902-83468c1`。
  1. **Blocking**：裸子串 `KILL` 会把 `SKILL.md` 误判成 kill signal；真实 `2026-07-10-loop-evidence-table.md` 与 31 日 fixture 均复现。
  2. **Blocking**：无测试能杀死 `KILL`→`SKILL` mutant，也未守 30 日边界、git/mtime、fail-open、三消费面与只读合同。
- 本 Session 复验：direct scanner 返回 12 份；`npm run test:memory --silent` 为 54/54，但测试树对 `stalled_proposals` 零引用。
- Relevance/disposition：该 commit 不改 controlled-change runtime/state，故不修改目标架构或 U-block；其 reminder 也不进入 authority/completion chain。由 memory/governance owner 另行修复，本规划只更新 HEAD 现场基线，并继续要求未来 Gate M 重新 census。

### 4.5 Incremental commit audit（`83468c1..91ba95a`）

- Subject：单提交 `91ba95a26f2cc9cf319b207c2fd168fbcde410f9`；改 route-guard、optional workflow graph、route test 与审计报告/evidence，不改 controlled-change state。
- Standards axis：`FAIL 1/6`，`eval_run_id=recent-commit-standards-20260902-91ba95a`。
  1. **Critical**：新 meta-question STOP 分支产 `{skill, why}`，production STOP renderer 仍调用 `c.tokens.join()`；非 dry-run 稳定 TypeError/exit 1，203/203 dry-run tests 漏检。
  2. **Major**：`请你?`、`麻烦`、`帮我` 等全局豁免使纯meta/file-location/translation问句继续高置信误派；framework-flow提及亦绕过抑制。
  3. **Major**：scene B 两条 code-recon path 未闭合 downstream workflow input contracts；SSOT 只证明名字存在，不证明链可执行。
  4. **Major**：测试只守两个dry-run点；committed corpus evidence继承未冻结环境，复跑出现两行漂移。
- Spec axis：`FAIL 5/7`，`eval_run_id=recent-commit-spec-20260902-91ba95a`。
  1. **Blocking**：独立复现 `请问这个 PRD 文件放哪个目录了`、`麻烦问一下…`、`帮我找一下…`→`/brainstorm`，`请问 research 这个词…`→`/deepresearch`。
  2. **Blocking**：133 corpus/adversarial/golden/verify/routing 分项虽可部分重跑，但98→106无持久化scorer且probe env未冻结，不能精确复算提交内结论。
- 本 Session 复验：`test-route-guard` 203/0、`check-routing-map` PASS、keyword routing 70/70；这些通过不抵消production renderer/语义/input-contract blocker。
- Relevance/disposition：route-guard与optional graph是U-006冻结anchor，故更新HEAD/source census，并让Gate M/U-006/CC-017–018/CC-029验证production shape、all-verdict non-authority、workflow input proof与证据复算；不把route bug纳入controlled-change Files，不替原owner修复。

### 4.6 Concurrent uncommitted diff audit（其他 Session WIP）

- Path：`.claude/skill-os/evolution/self-model.yaml`；snapshot SHA-256 `050b3cf8795b94628b7dc8c31cb9711b509d6dad8a404b5b54ee2490f94e61a9`；不是commit，本Session不取得ownership。
- Diff：`updated`改为2026-09-02并如实列出本轮局部复核；`surface.hooks.files`从6项补为7项，新增`controlled-change-guard.mjs`。
- Read-only validation：YAML parse PASS；该guard已tracked、已在`.claude/settings.json`注册，且`self-model.generated.yaml`已经列出；手工清单补录与live/generated inventory一致。
- Consumer census：该manual self-model被YAML lint、daily staleness reminder、framework-evolution scout与`fusion-preflight.py`读取；它不写controlled-change journal/state，不产生approval/authority，也不是runtime dispatch source。
- Relevance/disposition：与controlled-change有关但只属于治理surface inventory；不改变目标架构、Files或U-block source。计划把它登记为non-authority checkout evidence；未来实施必须用clean isolated baseline。若该diff后续commit或bytes再变，先做新的fixed-range审计，不沿用本snapshot。

### 4.7 Incremental commit audit（`91ba95a..a98d97a`）

- Subject：单提交`a98d97a650312ca3954d9f37551dd4086114d5ee`，只修改`.claude/skill-os/evolution/self-model.yaml`；即§4.6 WIP的提交态。
- Standards axis：`FAIL 4/6`，`eval_run_id=recent-commit-standards-20260902-a98d97a`。
  1. **Important**：文件明确声明already_have_static、gaps实质、sources新鲜度未复核，却把全局唯一`updated`改为2026-09-02；`daily_governance.check_self_model()`只读该日期，原本41天/阈值35天的整面提醒因此静默消失至少35天。
  2. **Important**：`check:self-model`只比较live scan与generated inventory，不读人工`surface.hooks.files`；错误manual-list mutant仍PASS，而`fusion-preflight.py`会把它当闭合扫描集，漏登可原样复发。
- Spec axis：`FAIL 5/7`，`eval_run_id=recent-commit-spec-20260902-a98d97a`；同样两项为blocking outcome gap。
- 复算通过：manual/live/generated均为7 hooks；6 agents、11 npm scripts、4 routing truth files、routing-map guard、YAML与model mirror均成立。失败不否定第7个hook补录本身。
- Relevance/disposition：只改治理inventory/fusion preflight，不改controlled-change hook bytes、registration、journal、state或authority。由evolution owner修复per-scope freshness与manual↔generated guard；本规划只更新HEAD/R-014，并明确self-model freshness不进入authority/completion/dependency。

### 4.8 Incremental commit audit（`a98d97a..516bf6b`）

- Subject：route修复commit`516bf6bb1ffc16fb9127c9840ff290633fe9115e`。
- Standards axis：`FAIL 1/6`，`eval_run_id=recent-commit-standards-20260902-516bf6b`。
- Spec axis：`FAIL 1/7`，`eval_run_id=recent-commit-spec-20260902-516bf6b`。
- Blocking facts：`PRD是啥`仅dry-run STOP，production renderer仍因soft candidate缺`tokens`退出1；`readme.docx.bak`仍误派docx，所谓`.docx`新增fixture实际输入pdf；礼貌meta与`然后 cleanup`仍未闭合。
- Relevance/disposition：不把206/206或commit message当完成证明；U-006只消费经Gate M验证的typed input，route verdict/soft candidate继续non-authority，原owner修复不进入controlled-change Files。

### 4.9 Incremental commit audit（`a98d97a..893d476` + merge `2059ee4`）

- Subject：memory batch`893d476dd19c65d639d432b8dae540f73a4f1574`及无额外controlled-change delta的merge`2059ee4a90b3dfeef1228f48773a8dd50500d7a1`。
- Standards axis：`FAIL 2/6`，`eval_run_id=recent-commit-standards-20260902-893d476`。
- Spec axis：`FAIL 2/7`，`eval_run_id=recent-commit-spec-20260902-893d476`。
- Passing facts：10 promoted + 1 rejected、health与谱系结构可解析。
- Blocking facts：直接人类授权为UNKNOWN；agent自报`luca-delegated`不能证明人门，promoted reviewer又把候选自填的`luca`呈现为最终reviewer；部分证据过期/失配且retrieval telemetry污染统计。
- Relevance/disposition：memory事实、reviewer与mattered记录一律不是controlled-change approval/effect authority；计划不接管或回滚该memory commit。

### 4.10 Docs-only report audit（`2059ee4..c98f3b9`）

- Subject：单提交`c98f3b94ba99a2b9a73af5cce10a2f9bbff66704`，只改`framework-audit/2026-09-02-skill-responsibility-audit/REPORT.md`；未改runtime、route、memory或controlled-change state。
- Standards axis：`FAIL 1/6`，`eval_run_id=recent-commit-standards-20260902-c98f3b9`。
- Spec axis：`FAIL 1/7`，`eval_run_id=recent-commit-spec-20260902-c98f3b9`。
- Blocking facts：报告宣称route三项与memory授权均闭合，但独立复现仍得到`.docx.bak`误派、`然后 cleanup` STOP、production renderer exit 1、人门真实性UNKNOWN；206/206没有覆盖这些mutant。
- Relevance/disposition：报告为non-authority，只作为R-017的反例证据；它不推翻目标架构，也不要求controlled-change接管另一审查的修复。

### 4.11 Convergence rule（停止追逐整个HEAD）

- Plan review冻结对象：`FINAL-MASTER-PLAN.md` SHA + R-001–R-017不可变commit/diff/eval。
- Implementation baseline：未来Session在Gate M重新选择clean isolated checkout并冻结exact preimage；不复用本Session现场快照。
- 只有相关路径delta明确推翻某条架构事实、接口合同或U-block可实施性时才修plan；无关commit、docs-only报告、其他owner WIP或HEAD单纯前进不再触发全量重签。
- 这条规则修正R7/R17/R21暴露的流程偏差，不改controlled-change目标架构、安全合同或任何U-ID。

## 5. Candidate review rounds

最终审查必须在下表绑定完全相同的 plan SHA。任何 plan byte 变化都使先前 binding verdict 失效。

| Round | Plan SHA-256 | Architecture / maintainability | Safety（starts REFUTED） | Flow / harness parity | Plan Agent contract | Quality gate | Disposition |
|---|---|---|---|---|---|---|---|
| R1 | `3d9d5975d098a2b2ec5ccbcd726ea6002b8f5893b8ec7fcc38b7dc359f59fb9f` | `NO VERDICT — interrupted` | `NO VERDICT — interrupted; default would start REFUTED` | `FAIL` | `NOT RUN` | `NOT RUN` | superseded after targeted correction + recent-commit audit |
| R2 | `516537a13431b39479203ed893e8a36f69c9d63df44cd04cf0784409528413aa` | `FAIL` | `FAIL (remained REFUTED)` | `FAIL` | `NOT RUN` | `NOT RUN` | superseded；只修对应bootstrap/need/Git blocks |
| R3 | `adb2ee0666e6fa143895be4ea0401006aee9377426ce156c0f3a7a55b4371cc6` | `FAIL 7/8` | `PASS 14/14` | `PASS 10/10` | `NOT RUN` | `NOT RUN` | superseded；只修Gate N/能力级建设边界 |
| R4 | `6aebdb72b1fc26d9c8fcc19e17aa97b06c733fb71b93410a3b6fbeee7228f32b` | `FAIL 8/10` | `FAIL 15/16` | `FAIL 9/10` | `NOT RUN` | `NOT RUN` | superseded；只修conditional ownership/composition/status blocks |
| R5 | `4671e5afd0c7c8f64e8f11dc85fd7e2c8d9184f90703b028ef27af136b40f4ad` | `FAIL 8/10` | `FAIL 12/13` | `PASS 11/11` | `NOT RUN` | `NOT RUN` | superseded；只修final composition/launcher gate顺序 |
| R6 | `04bec74763b39aeec5c48dc80b7c73f908f3a337d9c7a47294d776b7d153a1ec` | `FAIL 10/11` | `FAIL 14/15 (remained REFUTED)` | `FAIL 10/11` | `NOT RUN` | `NOT RUN` | superseded；三轴命中同一U-012 DAG漏边 |
| R7 | `2bd78bb6cfbec4925235d9f129a4a9862b770b55d5b783f155059d1921e20a35` | `PASS 11/11` | `PASS 15/15 (REFUTED overturned)` | `PASS 11/11` | `NOT RUN` | `NOT RUN` | superseded only because HEAD advanced during review |
| R8 | `8e254569fc8761d433bf375970625421a5a3faafe594a0c63c3dc0dae31c1711` | `PASS 11/11` | `PASS 16/16 (REFUTED overturned)` | `PASS 11/11` | `FAIL 6/13` | `NOT RUN` | superseded；只补Plan Agent合同块 |
| R9 | `7e042acf79e2e7dda8ac18626907776ed71bb4689d3040ee7d356305b9a1e358` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` | superseded before review：concurrent 91ba95a landed |
| R10 | `4c9d680b20ee909ad271aa87c5b9ae9ac1d5912488545a06cdbf4d913d0cd450` | `FAIL 9/10` | `PASS 16/16 (REFUTED overturned)` | `FAIL 10/11` | `NOT RUN` | `NOT RUN` | superseded；只统一 R-013 source census |
| R11 | `394a690f8f9e31d8278bca5fa4635ab58e3a1606dc91f5eada8af9051c47d748` | `PASS 10/10` | `FAIL 11/12 (remained REFUTED)` | `FAIL 10/11` | `NOT RUN` | `NOT RUN` | superseded；只修 Gate F/activation 顺序 |
| R12 | `d6ae271d76a6cddbb0f85d5e8f5d4a355dbe018dc05a2f7e776fb2a003041a83` | `PASS 10/10` | `PASS 12/12 (REFUTED overturned)` | `FAIL 9/10` | `NOT RUN` | `NOT RUN` | superseded；只补机械验收中的 Gate F 顺序 |
| R13 | `f1ce21abffd4131ecdd431dfb9a598880bc49faccceb81fc77a668a1879d3ec3` | `FAIL 9/10` | `FAIL 11/12 (remained REFUTED)` | `PASS 10/10` | `NOT RUN` | `NOT RUN` | superseded；只修全局 crash matrix 逆序状态 |
| R14 | `7a2aa57838c8f67e17a4b0f38fb6c8a2770e793a6c3126f5411b5ad448b521a2` | `PASS 10/10` | `FAIL 12/13 (remained REFUTED)` | `FAIL 9/10` | `NOT RUN` | `NOT RUN` | superseded；闭合recovery selector并登记并发WIP |
| R15 | `7001e6260f2b1006e77ccebf69ef21e27e2a37cef6f66d94156bfeeeea2aebda` | `FAIL 9/10` | `FAIL 12/13 (remained REFUTED)` | `FAIL 6/8` | `NOT RUN` | `NOT RUN` | superseded；统一recovery taxonomy/precedence与checkout尾句 |
| R16 | `4076bb3b2de44c0ca1e8605849f0b28b10ed0c055f7db4e5776004dd7b9e7938` | `PASS 10/10` | `PASS 15/15 (REFUTED overturned)` | `FAIL 7/8` | `NOT RUN` | `NOT RUN` | superseded；下沉approval-current precedence |
| R17 | `74453025a35f0bb054e226bc5b5e79c0359e48c4264dea96d8dbe918b4f3bc81` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` | superseded before review：concurrent a98d97a landed |
| R18 | `ec989f98339a2ca96eb6f20d1f0628ac261925cdc1abbd47b6d41df711edb07c` | `PASS 9/9` | `FAIL 15/16 (remained REFUTED)` | `FAIL 6/7` | `NOT RUN` | `NOT RUN` | superseded；补齐expired cross-product |
| R19 | `05b932ad4f68d0cd9ba5f059c4f0f05795af088b03ac84c9b81ae585df617e48` | `PASS 9/9` | `PASS 16/16` | `FAIL 7/8` | `NOT RUN` | `NOT RUN` | superseded；下沉六fixture双端真实adapter矩阵 |
| R20 | `ade7ff0184afe9489822b9a837350200c825da185865c51a5a6385720aebdecc` | `PASS 9/9` | `PASS 13/13` | `PASS 8/8` | `PASS 15/15` | `NOT RUN` | semantic/contract complete；状态晋级产生新SHA |
| R21 | `c17f806c28b4530beac9a7a67554e1adcb783dada10419a9325c853822683e4c` | `FAIL 8/9` | `PASS 12/12` | `FAIL 8/9` | `NOT RUN` | `NOT RUN` | superseded；发现全HEAD冻结策略错误耦合并发WIP |
| R22 | `555d304554d11102b6f21fd965da19c614cb86059066616c4d8971b3a32bf17f` | `PASS 9/9` | `PASS 13/13` | `PASS 12/12` | `PASS 17/17` | `NOT RUN` | 四类binding review全PASS；只允许状态晋级并对新SHA重签 |
| R23 FINAL | `08f2e33846f3c006fa9a35c617bc511905c41cd4c1a8754a8342411fc48943df` | `PASS 9/9` | `PASS 13/13` | `PASS 12/12` | `PASS 17/17` | `PASS 11/11` | READY_FOR_APPROVAL；全部审查PASS，停在Gate P |
| R23 SEALED（后被R24重开） | `08f2e33846f3c006fa9a35c617bc511905c41cd4c1a8754a8342411fc48943df` | `PASS 9/9` | `PASS 13/13` | `PASS 12/12` | `PASS 17/17` | `PASS 11/11` | 历史上CLOSED_AT_GATE_P；不再是当前verdict |
| R24 POST-SEAL | `df3c5c2173af336ae3eff61af0899fc422ca43f88d76006eff69c5e02af380d5` | `FAIL` | `FAIL` | `NOT RUN` | `NOT RUN` | `NOT RUN` | canonical SHA失配、相关路径delta未审、handoff bytes不可复算；Gate P暂停 |

R1 binding flow/parity blockers：

1. U-003 激活 v2，而 `effect-host.mjs` 到 U-007 才出现，导致 U-007 无法用“尚不存在的 host”自托管安装自己。
2. 未冻结 unchanged Claude/Codex wrappers 已依赖的 private `hook-failure-decision` ABI。

R1 的 architecture/safety reviewers 因用户暂停而中断，没有 binding verdict；不得把 safety 的默认 REFUTED 姿态误写成一次已经完成的 FAIL。

R2 binding reviews（同一 SHA `516537a1…13aa`）：

- Architecture / maintainability：`FAIL 6/8`，`eval_run_id=controlled-change-plan-r2-architecture-20260902-516537a1`。
  1. common-dir runtime capsule/launcher 没有声明 operational-write owner、授权桥与逐安装边界 crash test；
  2. 20 次真实需求证据发生在全部 Standard 构建之后，DAG 会先平台化再判断是否值得。
- Safety：`FAIL 9/13`，`eval_run_id=controlled-change-plan-r2-safety-20260902-516537a1`。
  1. 缺 dependency bundle→durable DRAIN→final live guard-last 顺序与逐文件 crash recovery；
  2. Git safe envelope 缺 replace/graft 与 partial-clone/promisor lazy-fetch 防护。
- Flow / harness parity：`FAIL 8/9`，`eval_run_id=controlled-change-plan-r2-parity-20260902-516537a1`。
  1. DRAIN 拒绝新prepare且legacy清零后，没有可由唯一public `advance`推进的operation；直接lifecycle activate会成为第四入口。
- Plan Agent / final quality gate：因三个语义轴已 FAIL，未运行，避免产生对已知失败 SHA 的无效签名。

R3 targeted disposition：

- U-001 新增 Gate C 的最小 Foundation live subset；Gate N 在 U-002/U-004 前以≥20次真实证据明确 STOP/ENTER。
- U-003 改为 dependency-first source install → public prepare 创建唯一 M → public advance 写 capsule → durable DRAIN → final guard-last → fresh proof → advance M activation；§15.1列出 common-dir operational targets、owner与完整 crash matrix。
- lifecycle activate 降为仅由kernel/advance调用的internal primitive，不存在第四入口。
- U-001/U-009 共用新增 `git-object-reader.mjs`，拒绝 replace/graft/promisor missing object，并设置 no-replace/no-lazy-fetch/network-denied tests。

R3 binding reviews（同一 SHA `adb2ee06…1cc6`）：

- Architecture / maintainability：`FAIL 7/8`，`eval_run_id=controlled-change-plan-r3-architecture-20260902-adb2ee06`。
  1. Gate N 前 U-001 仍生成 v2 schema/compat/policy scratch candidate；
  2. 任一单类需求会解锁全部后续能力，U-008/U-009 缺少独立建设需求门，dark stub 仍产生维护成本。
- Safety：`PASS 14/14`，`eval_run_id=controlled-change-plan-r3-safety-20260902-adb2ee06`。R2 migration crash chain 与 Git replace/graft/promisor blocker 已翻案。
- Flow / harness parity：`PASS 10/10`，`eval_run_id=controlled-change-plan-r3-parity-20260902-adb2ee06`。operation M/DRAIN/三入口、自托管与双 harness 闭合。
- Plan Agent / final quality gate：因 architecture 已 FAIL，未运行。

R4 targeted disposition：

- U-001 缩为七个 exact Foundation containment Files；Gate N 前禁止在 live 或 scratch 生成任何 v2 bytes。schema/policy/compat/contract/journal 首次构建整体移入 Gate N 后的 U-002。
- Gate N 改为 `N0 + N-C/N-D/N-E/N-G` capability vector；N0 不反向解锁子能力，external/Git BUILD 只蕴含 DAG。
- U-005/U-007/U-008/U-009 分别有独立 BUILD 依赖；SKIP 时对应 source 必须不存在。U-007 不再预建 external/Git deny stub；U-011/U-012 只等待并验证 vector 选中的条件分支。

R4 binding reviews（同一 SHA `6aebdb72…f32b`）：

- Architecture / maintainability：`FAIL 8/10`，`eval_run_id=controlled-change-plan-r4-architecture-20260902-6aebdb72`。
  1. U-008/U-009 声称注册静态 adapter，但 Files 没有注册表/policy owner；
  2. Wave 4 并行的 U-005/U-010 同时拥有 `state-store.mjs`。
- Safety：`FAIL 15/16`，`eval_run_id=controlled-change-plan-r4-safety-20260902-6aebdb72`。
  1. N-C/N-D/N-G optional U-block 与 base 分别共用 kernel/state-store、effect-host/tests、git-object-reader，单纯 source absence 无法发现 shared-base 内偷建未获证 capability。
- Flow / harness parity：`FAIL 9/10`，`eval_run_id=controlled-change-plan-r4-parity-20260902-6aebdb72`。
  1. `SKIPPED_BY_GATE` 与六值 completion status 冲突；U-006/U-011 未证明两端对 capability digest/条件依赖同义，skip 可能被计 PASS 或阻塞下游。
- Plan Agent / final quality gate：因三轴已 FAIL，未运行。

R5 targeted disposition：

- N-C/N-D/N-E/N-G 分别拆成独占 source modules；optional blocks 不再拥有 `kernel/state-store/effect-host/policy/git-object-reader` 等 base paths。Gate F 冻结 base digest + optional absence，U-012 用 capability-in-base mutant 验证 exact allowed delta chain。
- U-004 新增唯一 pure capsule composer；optional blocks只产scratch module，U-010 在它们之后以一个upgrade operation生成literal-import profile并激活，解决adapter注册owner与并行state-store冲突。
- `SKIP_DARK` 明确定义为Gate N annotation而非completion status：不实例化U-block、不计PASS/FAIL、不进入wait。U-006/U-011/U-012加入16种vector、Claude/Codex同digest同graph与skip-no-pass/no-wait矩阵。

R5 binding reviews（同一 SHA `4671e5af…f4ad`）：

- Architecture / maintainability：`FAIL 8/10`，`eval_run_id=controlled-change-plan-r5-architecture-20260902-4671e5af`。
  1. U-010 已唯一composition/activation，但其后 U-011 又修改capsule内runtime source，final active capsule未包含该delta；
  2. U-010允许修改stable launcher，却只依赖Gate F/G，违反launcher变更必须回Gate M+G。
- Safety：`FAIL 12/13`，`eval_run_id=controlled-change-plan-r5-safety-20260902-4671e5af`。同一blocking finding：U-011 postimage未重新组合、绑定、fresh-proof到immutable active capsule。
- Flow / harness parity：`PASS 11/11`，`eval_run_id=controlled-change-plan-r5-parity-20260902-4671e5af`。SKIP非completion、双harness vector、三入口/迁移/角色与lineage均闭合。
- Plan Agent / final quality gate：因architecture/safety已FAIL，未运行。

R6 targeted disposition：

- U-005/U-007/U-008/U-009 在scratch验收后只经base repo-files/public advance串行安装dormant source，active runtime继续读取fixed capsule；U-011同样在最终composition前安装其CLI/kernel/state/receipt postimage。
- Wave改为U-011先于U-010；U-010现在等待U-011与全部selected source，以一次upgrade operation包含所有最终postimage、fresh-proof并activate。U-012新增omit-U011/worktree-runtime-load mutants和active-capsule匹配断言。
- U-010从Files移除stable `launcher.mjs`，明确launcher byte-identical；普通capability composition只需Gate G，launcher若未来变化仍必须另回Gate M+G。

R6 binding reviews（同一 SHA `04bec747…a1ec`）：

- Architecture / maintainability：`FAIL 10/11`，`eval_run_id=controlled-change-plan-r6-architecture-20260902-04bec747`。
- Safety（默认 REFUTED）：`FAIL 14/15`，`eval_run_id=controlled-change-plan-r6-safety-20260902-04bec747`。
- Flow / harness parity：`FAIL 10/11`，`eval_run_id=controlled-change-plan-r6-parity-20260902-04bec747`。
- 三轴唯一且相同的 blocking finding：U-012 会读取并验证 U-010 final capsule/receipt，但正式 `Dependencies` 仍为 `U-011`；Wave 顺序文本不能替代机械 DAG 边，调度器可能在 U-010 完成前启动 U-012。
- Plan Agent / final quality gate：因三轴已 FAIL，未运行。

R7 targeted disposition：

- 只把 U-012 的 `Dependencies` 从 `U-011` 改为 `U-010`；U-010 已机械等待 U-011 与所有 selected optional postimages，因此该单边同时传递完整 final-composition 前置闭包。
- 未改任何架构、authority、Files、Verification、Wave 或 runtime 内容；R6 的其余审查结论均保持为历史证据，必须在 R7 SHA 上重新签署才可复用为当前 verdict。

R7 binding reviews（同一 SHA `2bd78bb6…20a35`）：

- Architecture / maintainability：`PASS 11/11`，`eval_run_id=controlled-change-plan-r7-architecture-20260902-2bd78bb6`。
- Safety（默认 REFUTED）：`PASS 15/15`，`eval_run_id=controlled-change-plan-r7-safety-20260902-2bd78bb6`；逐项证据完成翻案。
- Flow / harness parity：`PASS 11/11`，`eval_run_id=controlled-change-plan-r7-parity-20260902-2bd78bb6`。
- 三轴均无 blocking finding；但审查期间 `upstream/main` 新增 `83468c1`，使计划内 current-HEAD 事实过期，因此在进入 Plan Agent review 前先做增量提交审计并重基线，R7 不再作为最终 SHA。

R8 targeted disposition：

- 只更新 current HEAD/checkout 事实，登记 R-012 与 `83468c1` 两轴增量审计；明确该有缺陷的 governance scanner 不进入 controlled-change authority、completion 或 implementation dependency。
- 不改目标架构、能力边界、U-block、Wave、Files、Verification、Gate 或 rollback；R8 仍须在新 SHA 上重新取得三项语义 PASS，之后才能进入 Plan Agent 合同审查。

R8 binding semantic reviews（同一 SHA `8e254569…c1711`）：

- Architecture / maintainability：`PASS 11/11`，`eval_run_id=controlled-change-plan-r8-architecture-20260902-8e254569`。
- Safety（默认 REFUTED）：`PASS 16/16`，`eval_run_id=controlled-change-plan-r8-safety-20260902-8e254569`；R-012隔离与全部既有安全域逐项翻案。
- Flow / harness parity：`PASS 11/11`，`eval_run_id=controlled-change-plan-r8-parity-20260902-8e254569`。
- 三轴均无 blocking finding；Plan Agent contract review 对同一 SHA 单独执行，不能由语义 PASS 代替。
- Plan Agent contract：`FAIL 6/13`，`eval_run_id=controlled-change-plan-r8-plan-agent-20260902-8e254569`。Blocking gaps：缺默认形态反方；缺复杂度模式/组合/确认；Phase合同字段不全；selector表不是带级别头的可执行bash；criteria为8条且非`[C#]`二元格式；缺通用失败/四段escalation与出门自检。

R9 targeted disposition：

- 只补 Plan Agent 块 0–5 的机械消费合同：Standard 默认偏差与 Foundation/no-v2 反方、Hierarchical/组合/确认/Tier、块1.5/1.6 N/A、P1–P10完整Phase字段、CC-000–028/W01–W02 单断言CLI、7条二元criteria、BLOCKING/WARNING策略、四段escalation与出门自检。
- U-012 仅新增稳定 `--assert <CC-ID>` / `--list-assertions` verifier interface 要求，未新增Files或改变既有安全语义。
- 未修改13个U-ID、Dependencies、Files、Wave、authority、Gate、rollback或目标架构。机械检查：13 blocks、每块9字段、DAG无环、10 Phase、31个级别化命令、7条criteria、`git diff --check` PASS。
- R9尚未派发binding review时并发提交`91ba95a`落地；因current-HEAD与route/graph anchor现场事实变化，R9直接标记superseded，不制造无效review签名。

R10 targeted disposition：

- 登记R-013与`91ba95a` Standards/Spec FAIL；更新HEAD/checkout，不把203/203或报告分数外推成production正确。
- Gate M新增route non-dry-run renderer/schema、all-verdict non-authority与workflow downstream-input proof前置；原owner未修即保持v1 read-only，controlled-change不得修改route/graph。
- U-006新增R-013，只在消费端隔离STOP/SINGLE/MULTI/FRAMEWORK_FLOW/soft candidate，验证production shape、误派仍不授权、workflow recommendation无input proof不调度；四个route/graph anchors继续必须byte-identical。
- CC-017/018强化route非authority和workflow input proof；新增CC-029及对应单断言CLI，U-012冻结routing evidence的argv/env/input/output/scorer SHA。
- 目标架构、13个U-ID、Dependencies、Files、Wave、effect authority与rollback均不变。机械检查：13 blocks、每块9字段、DAG无环、10 Phase、32个级别化命令、7条criteria、`git diff --check` PASS。

R10 binding semantic reviews（同一 SHA `4c9d680b…cd450`）：

- Architecture / maintainability：`FAIL 9/10`，`eval_run_id=controlled-change-plan-r10-architecture-20260902-4c9d680b`。
- Safety（默认 REFUTED）：`PASS 16/16`，`eval_run_id=controlled-change-plan-r10-safety-20260902-4c9d680b`；R-013 隔离、Gate M 与全部既有安全域逐项翻案。
- Flow / harness parity：`FAIL 10/11`，`eval_run_id=controlled-change-plan-r10-parity-20260902-4c9d680b`。
- Architecture 与 parity 命中同一 blocking finding：§19.1 仍把 canonical U-block source range 写成 `R-001–R-012`，与 U-006 和出门自检的 `R-001–R-013` 冲突。
- Plan Agent / final quality gate：因两个语义轴已 FAIL，未运行。

R11 targeted disposition：

- 仅把 §19.1 的 source range 从 `R-001–R-012` 改为 `R-001–R-013`；未改架构、U-block、Dependencies、Files、Wave、authority、Gate、verification 或 rollback。
- 新冻结 SHA：`394a690f8f9e31d8278bca5fa4635ab58e3a1606dc91f5eada8af9051c47d748`；R10 的任何 PASS 均不跨 SHA 继承，必须重新运行 architecture、safety、parity 与后续合同审查。

R11 binding semantic reviews（同一 SHA `394a690f…7d748`）：

- Architecture / maintainability：`PASS 10/10`，`eval_run_id=controlled-change-plan-r11-architecture-20260902-394a690f`。
- Safety（默认 REFUTED）：`FAIL 11/12`，`eval_run_id=controlled-change-plan-r11-safety-20260902-394a690f`。
- Flow / harness parity：`FAIL 10/11`，`eval_run_id=controlled-change-plan-r11-parity-20260902-394a690f`。
- Safety 与 parity 命中同一 blocking finding：§15.1 与 Gate 表要求 fresh proof 后先过 Gate F 再 activation，但 P4 排成 `fresh→advance activation→Gate F`，Wave 又把完整 U-003 放在 Gate F 前，执行者可在人门前激活。
- Plan Agent / final quality gate：因两个语义轴已 FAIL，未运行。

R12 targeted disposition：

- 只同步 migration intro、Wave 3A/Gate F/3B、P4 顺序与门控，以及 U-003 Goal/Approach/Test/Verification/completion boundary；统一成 `fresh proof→Gate F→同一 M public advance activation`。
- Gate F 前 U-003 明确保持 `IN_PROGRESS`、pointer保持`DRAIN_V1`；Gate F PASS 与 activation receipt 验证后才`DONE`。新增拒绝 Gate F 前 activation 的 planned mutant；未改Files、owner、authority或其他U-block。
- 新冻结 SHA：`d6ae271d76a6cddbb0f85d5e8f5d4a355dbe018dc05a2f7e776fb2a003041a83`；R11 PASS 不跨 SHA 继承，三项语义审查必须全量重跑。

R12 binding semantic reviews（同一 SHA `d6ae271d…041a83`）：

- Architecture / maintainability：`PASS 10/10`，`eval_run_id=controlled-change-plan-r12-architecture-20260902-d6ae271d`。
- Safety（默认 REFUTED）：`PASS 12/12`，`eval_run_id=controlled-change-plan-r12-safety-20260902-d6ae271d`；Gate F前激活、迁移及全部既有安全域完成翻案。
- Flow / harness parity：`FAIL 9/10`，`eval_run_id=controlled-change-plan-r12-parity-20260902-d6ae271d`。
- 唯一 blocking finding：主流程、Wave、P4、U-003 已统一 Gate F 顺序，但 CC-015 与 Verification Lifecycle 层仍写成 fresh后直接activation，机械验收可在Gate F前错误通过。
- Plan Agent / final quality gate：因 parity 已 FAIL，未运行。

R13 targeted disposition：

- 只把 CC-015 与 Verification Lifecycle 顺序补为 `fresh→Gate F→advance M activation`，并显式要求 Gate F 前 activation deny；不改目标架构、Files、owner、DAG、authority或U-block内容。
- 新冻结 SHA：`f1ce21abffd4131ecdd431dfb9a598880bc49faccceb81fc77a668a1879d3ec3`；R12 PASS 不跨 SHA 继承，三项语义审查必须全量重跑。

R13 binding semantic reviews（同一 SHA `f1ce21ab…d3ec3`）：

- Architecture / maintainability：`FAIL 9/10`，`eval_run_id=controlled-change-plan-r13-architecture-20260902-f1ce21ab`。
- Safety（默认 REFUTED）：`FAIL 11/12`，`eval_run_id=controlled-change-plan-r13-safety-20260902-f1ce21ab`。
- Flow / harness parity：`PASS 10/10`，`eval_run_id=controlled-change-plan-r13-parity-20260902-f1ce21ab`。
- Architecture 与 safety 命中同一 blocking finding：§10.3 仍列“pointer CAS后、fresh proof前”为可达crash点，逆转Gate F主链并破坏唯一恢复顺序。
- Plan Agent / final quality gate：因两个语义轴已 FAIL，未运行。

R14 targeted disposition：

- 仅替换§10.3一条不可达的逆序crash状态为两个合法边界：fresh proof + Gate F durable后/activation CAS前，以及activation CAS后/receipt前；前者只允许same-M expected-generation advance，后者只允许owned-postimage下幂等补receipt，foreign/unknown停。
- 不改任何Files、U-ID、DAG、authority、Gate定义或能力边界。新冻结 SHA：`7a2aa57838c8f67e17a4b0f38fb6c8a2770e793a6c3126f5411b5ad448b521a2`；R13 PASS 不跨 SHA 继承。

R14 binding semantic reviews（同一 SHA `7a2aa578…b521a2`）：

- Architecture / maintainability：`PASS 10/10`，`eval_run_id=controlled-change-plan-r14-architecture-20260902-7a2aa578`。
- Safety（默认 REFUTED）：`FAIL 12/13`，`eval_run_id=controlled-change-plan-r14-safety-20260902-7a2aa578`。
- Flow / harness parity：`FAIL 9/10`，`eval_run_id=controlled-change-plan-r14-parity-20260902-7a2aa578`。
- Safety 与 parity 命中同一 blocking finding：§10.3标题承诺“唯一合法动作”，但`REQUIRED durable/active前`仍允许resume或abort，partial repo apply仍允许补写或reverse；没有互斥selector/approval-bound generation，CC-010不可机械证明。
- 同轮另发现其他Session未提交的`self-model.yaml` diff；它不改变R14 plan bytes，但使“仅plan/ledger dirty”的现场陈述过期，因此下一轮同时做checkout evidence rebaseline。
- Plan Agent / final quality gate：因两个语义轴已 FAIL，未运行。

R15 targeted disposition：

- Recovery：为每个durable snapshot写入唯一selector（`RESUME_EXACT | RECONCILE_READONLY | AWAIT_GATE_X`）；safe REQUIRED/partial apply只roll-forward，foreign/ambiguous只进入`RECOVERY_REQUIRED`。新增Gate X：fresh top-level approval先绑定exact snapshot/generation/owned-set并生成新generation的单一`RECOVERY_CHOICE`，旧generation绝不同时接受resume/abort/reverse。
- 同步修正§8.1 public advance、§10.1状态机、§10.3 crash matrix、§16.1 recovery table、CC-010、U-002 scenarios/verifier与§22 rollback，新增dual-recovery/approval-binding mutant；不改Files、U-ID、DAG、三public entry或effect owner。
- Checkout：登记并发`self-model.yaml` snapshot及消费者census，明确它只补治理inventory、非authority/非U-block source；本Session未触碰该文件。
- 新冻结 SHA：`7001e6260f2b1006e77ccebf69ef21e27e2a37cef6f66d94156bfeeeea2aebda`；R14 PASS 不跨 SHA 继承，三项语义审查必须全量重跑。

R15 binding semantic reviews（同一 SHA `7001e626…a2aebda`）：

- Architecture / maintainability：`FAIL 9/10`，`eval_run_id=controlled-change-plan-r15-architecture-20260902-7001e626`。
- Safety（默认 REFUTED）：`FAIL 12/13`，`eval_run_id=controlled-change-plan-r15-safety-20260902-7001e626`。
- Flow / harness parity：`FAIL 6/8`，`eval_run_id=controlled-change-plan-r15-parity-20260902-7001e626`。
- Architecture/safety blocker：canonical mode定义为`ABORT_OWNED`，crash matrix却使用未定义`REVERSE_OWNED`，Recovery table又把mode当selector。
- Parity额外blockers：old/preimage + expired approval可同时命中`RESUME_EXACT`与`AWAIT_GATE_X`，无优先级；§23.1仍残留“checkout只含plan/ledger”的旧句。
- Plan Agent / final quality gate：三轴均FAIL，未运行。

R16 targeted disposition：

- Canonical recovery taxonomy收敛为selectors=`RESUME_EXACT | AWAIT_GATE_X`、choice modes=`RESUME_EXACT | ABORT_OWNED`；`RECONCILE_READONLY`只作为`EFFECT_UNKNOWN`动作，拒绝未定义`REVERSE_OWNED`。
- 明确互斥优先级：unreadable→`EFFECT_UNKNOWN`；否则approval expired/foreign/semantic或ownership ambiguity→`AWAIT_GATE_X`；仅current approval + exact old/owned→`RESUME_EXACT`。U-002 verifier新增precedence与unknown-mode mutants。
- crash/recovery table统一使用`RECOVERY_CHOICE(mode=ABORT_OWNED)`；personal reverse拆成AWAIT_GATE_X→新generation choice→exact owned reverse。§23.1同步承认并发self-model WIP。
- 未改Files、U-ID、DAG、public entries、effect owner或能力边界。新冻结 SHA：`4076bb3b2de44c0ca1e8605849f0b28b10ed0c055f7db4e5776004dd7b9e7938`；R15任何结论不跨SHA继承。

R16 binding semantic reviews（同一 SHA `4076bb3b…9e7938`）：

- Architecture / maintainability：`PASS 10/10`，`eval_run_id=controlled-change-plan-r16-architecture-20260902-4076bb3b`。
- Safety（默认 REFUTED）：`PASS 15/15`，`eval_run_id=controlled-change-plan-r16-safety-20260902-4076bb3b`；taxonomy、Gate X与全部既有安全域完成翻案。
- Flow / harness parity：`FAIL 7/8`，`eval_run_id=controlled-change-plan-r16-parity-20260902-4076bb3b`。
- 唯一blocking finding：全局优先级规定approval expired先走AWAIT_GATE_X，但crash/recovery两表的partial-owned/old行未写approval-current前提，“partial + expired”仍可能被误读为RESUME_EXACT。
- Plan Agent / final quality gate：因 parity 已 FAIL，未运行。

R17 targeted disposition：

- §10.3先声明全表受selector优先级裁剪；所有会重建/补写/roll-forward的crash行显式要求approval current。§16.1 partial-owned/old与active-projection resume行同样下沉该前提；U-002覆盖partial-owned/old + expired mutant。
- 计划曾冻结为`74453025a35f0bb054e226bc5b5e79c0359e48c4264dea96d8dbe918b4f3bc81`；尚未派发binding review时，其他Session将self-model WIP提交为`a98d97a`，使current HEAD/source事实变化。R17直接superseded，不制造无效签名。

R18 targeted disposition：

- 完成`91ba95a..a98d97a`双轴审计并登记R-014；更新HEAD/current checkout、执行摘要、证据表、source range与§23.1。第7个hook补录事实保留，但global freshness与manual inventory guard均视为不可信、非authority/非dependency。
- 删除已过期的“并发未提交self-model WIP”当前态表述；§4.6在ledger中保留为历史过程，§4.7记录commit态与两个FAIL eval。
- 不改变R17 recovery修复、目标架构、Files、U-ID、DAG、public entries、effect owner或能力边界。新冻结 SHA：`ec989f98339a2ca96eb6f20d1f0628ac261925cdc1abbd47b6d41df711edb07c`；必须从头运行三项语义审查。

R18 binding semantic reviews（同一 SHA `ec989f98…edb07c`）：

- Architecture / maintainability：`PASS 9/9`，`eval_run_id=controlled-change-plan-r18-architecture-20260902-ec989f98`。
- Safety（默认 REFUTED）：`FAIL 15/16`，`eval_run_id=controlled-change-plan-r18-safety-20260902-ec989f98`。
- Flow / harness parity：`FAIL 6/7`，`eval_run_id=controlled-change-plan-r18-parity-20260902-ec989f98`。
- Parity blocker：§8.1摘要仍无条件称partial-owned/old roll-forward，Git-local recovery行也缺approval-current，与expired→Gate X优先级重叠。
- Safety blocker：U-002只列old/partial-owned+expired mutant，未精确覆盖required-missing-active+expired；实现仍可错误resume并通过已命名测试。
- Plan Agent / final quality gate：因两个语义轴已FAIL，未运行。

R19 targeted disposition：

- §8.1明确required-missing-active、partial-owned/old、Git-local三类resume均只在approval current成立；任一expired snapshot只进AWAIT_GATE_X。
- §16.1 Git-local行下沉approval-current并明确expired只匹配Gate X；U-002 edge/error/verifier加入三类exact expired cross-product与`--reject-expired-resume=required-missing-active,partial-owned,git-local`。
- 未改Files、U-ID、DAG、public entries、effect owner、R-014边界或目标架构。新冻结 SHA：`05b932ad4f68d0cd9ba5f059c4f0f05795af088b03ac84c9b81ae585df617e48`；R18 PASS不跨SHA继承。

R19 binding semantic reviews（同一 SHA `05b932ad…17e48`）：

- Architecture / maintainability：`PASS 9/9`，`eval_run_id=controlled-change-plan-r19-architecture-20260902-05b932ad`。
- Safety（默认 REFUTED）：`PASS 16/16`，`eval_run_id=controlled-change-plan-r19-safety-20260902-05b932ad`；approval current/expired交叉积及全部既有安全域完成翻案。
- Flow / harness parity：`FAIL 7/8`，`eval_run_id=controlled-change-plan-r19-parity-20260902-05b932ad`。
- 唯一 blocking finding：U-002虽对三类snapshot做了current/expired状态机交叉积，U-003双端命令却只要求通用`--semantic-conformance-both`，没有机械要求Claude与Codex真实adapter各自执行同一六fixture矩阵；共享evaluator单测不能替代端到端parity证明。
- Plan Agent / final quality gate：因 parity 已FAIL，未运行。

R20 targeted disposition：

- 仅把同一六fixture矩阵下沉到§14.1与U-003 harness合同：`required-missing-active | partial-owned | git-local` × `current | expired`必须复用完全相同fixture ID；current只接受`RESUME_EXACT`，expired只接受`AWAIT_GATE_X`。
- U-003 verifier新增`--approval-selector-cross-product=required-missing-active,partial-owned,git-local --approval-states=current,expired --require-identical-fixture-ids`；fresh Claude/Codex必须逐项运行和比较六fixture，省略任一fixture或任一端未执行均FAIL。
- 未改Files、U-ID、DAG、public entries、effect owner、核心selector语义或目标架构。新冻结 SHA：`ade7ff0184afe9489822b9a837350200c825da185865c51a5a6385720aebdecc`；R19 PASS不跨SHA继承，三项语义审查必须全量重跑。

R20 binding semantic reviews（同一 SHA `ade7ff01…decc`）：

- Architecture / maintainability：`PASS 9/9`，`eval_run_id=controlled-change-plan-r20-architecture-20260902-ade7ff01`。
- Safety 首次派发因审查者运行额度耗尽而中断；没有产生 verdict、没有被计为审查证据。随后用全新只读独立上下文从默认`REFUTED`重跑。
- Safety（默认 REFUTED）：`PASS 13/13`，`eval_run_id=controlled-change-plan-r20-safety-retry-20260902-ade7ff01`；六fixture双端门、authority、并发、crash、personal/Git/remote、rollback与停止线逐项翻案。
- Flow / harness parity：`PASS 8/8`，`eval_run_id=controlled-change-plan-r20-parity-20260902-ade7ff01`。
- 三轴均无blocking finding或unknown；Plan Agent contract继续绑定同一SHA单独执行，不能由语义PASS代替。
- Plan Agent contract：`PASS 15/15`，`eval_run_id=controlled-change-plan-r20-plan-agent-20260902-ade7ff01`；块0–5、10 Phase、13个九字段U-block、32条级别化单断言、7条二元criteria、failure/escalation/self-check全部闭合。
- R20四类binding review均PASS，因此只允许执行协议内状态晋级；该状态改动会产生新SHA，所有四类review必须在最终SHA上重新签署。

R21 final-candidate freeze：

- 仅把文件顶部与§25实际状态从`CANDIDATE_UNDER_REVIEW`晋级为`READY_FOR_APPROVAL`，并明确即使最终审查PASS仍是authority `NONE`、Gate P等待用户批准、不得启动U-001。
- 初次状态替换保留了该行既有Markdown尾随空格，`git diff --check`因此失败；在派发任何最终审查前只移除该空格并重新冻结，没有语义变化。
- 最终候选 plan SHA：`c17f806c28b4530beac9a7a67554e1adcb783dada10419a9325c853822683e4c`。冻结时`HEAD == main == upstream/main == a98d97a650312ca3954d9f37551dd4086114d5ee`、11 worktrees、dirty仅plan/ledger、`git diff --check` PASS。
- R20任何PASS不跨SHA继承；architecture、safety（默认REFUTED）、parity与Plan Agent必须对R21完整重签，之后才运行final quality gate。

R21 final binding reviews（同一 SHA `c17f806c…83e4c`）：

- Architecture / maintainability：`FAIL 8/9`，`eval_run_id=controlled-change-plan-final-architecture-20260902-c17f806c`。
- Safety（默认 REFUTED）：`PASS 12/12`，`eval_run_id=controlled-change-plan-final-safety-20260902-c17f806c`；但明确记录审查时新增route anchor WIP，不能把PASS解释为现场冻结通过。
- Flow / harness parity：`FAIL 8/9`，`eval_run_id=controlled-change-plan-final-parity-20260902-c17f806c`。
- Architecture/parity唯一共同blocker：审查期间另一Session开始修改`.claude/hooks/route-guard.mjs`与`scripts/test-route-guard.mjs`，与计划“dirty仅plan/ledger”及两文件byte-identical anchor陈述冲突；source/preimage census失效。
- 只读监测进一步确认该WIP仍在变化：同一HEAD下`route-guard.mjs`在短间隔采样中出现多个SHA并反复切换，故不能把中间态登记为稳定source，也不能替owner修改。Plan Agent / final quality gate未运行；R21作废，等待稳定commit或稳定owner handoff后做增量双轴审计并重基线。

R22 convergence disposition：

- 删除“整个checkout HEAD/dirty状态必须静止”的错误完成条件；plan签名改为本文件SHA与R-001–R-017不可变来源，live baseline明确下沉到未来Gate M。
- 登记`516bf6b`、`893d476`/`2059ee4`与`c98f3b9`的双轴审计；它们分别被约束为route/memory/report non-authority，不扩大controlled-change Files。
- 新增§23.4未来implementation Session平稳入口：Gate P显式授权→只读preflight→clean isolated baseline→U-001 RED first→Gate C→20次Foundation→Gate N stop/continue。
- 不改Standard目标架构、13个U-ID、Files、Dependencies、effect owner、recovery selector、Gate F顺序或High-assurance停止线。R22 candidate SHA：`555d304554d11102b6f21fd965da19c614cb86059066616c4d8971b3a32bf17f`；binding verdict必须逐项复算。

R22 binding semantic reviews（同一 SHA `555d3045…bf17f`）：

- Architecture / maintainability：`PASS 9/9`，`eval_run_id=controlled-change-plan-r22-architecture-20260902-555d3045`；边界、三档、模块深度、migration、U-block/DAG、Gate N、平稳入口与Gate P均闭合。
- Safety（默认 REFUTED）：`PASS 13/13`，`eval_run_id=controlled-change-plan-r22-safety-20260902-555d3045`；authority、并发、bootstrap、expired selector、unknown effect、Git/personal、source freeze、人门与停止线逐项翻案。
- Flow / harness parity：`PASS 12/12`，`eval_run_id=controlled-change-plan-r22-parity-20260902-555d3045`；共享内核、private ABI、fresh双端六fixture、三入口、SKIP、恢复UX与新Session入口闭合。
- 审查期间HEAD前进到`a7d5fe3`，但独立reviewer均确认新增governance/report内容未改变controlled-change接口、owner、Files或DAG；按§4.11不使plan失效。
- Plan Agent contract：`PASS 17/17`，`eval_run_id=controlled-change-plan-r22-plan-agent-20260902-555d3045`；117/117字段、Wave/DAG、10 Phase、32级别化断言、7条criteria、failure/escalation、rollback、人门与§23.4均闭合。
- 四类binding review无blocking finding/unknown；按§24只允许把状态晋级为`READY_FOR_APPROVAL`，新SHA必须重新取得四类签名。

R23 final-candidate freeze：

- 只把顶部与§25状态从`CANDIDATE_UNDER_REVIEW`晋级为`READY_FOR_APPROVAL`，并再次声明implementation authority仍为NONE、当前不能启动U-001；未改任何架构、U-block、Files、Gate、verification或rollback。
- Final-candidate plan SHA：`08f2e33846f3c006fa9a35c617bc511905c41cd4c1a8754a8342411fc48943df`；`git diff --check` PASS。
- R22任何PASS不跨SHA继承；architecture、safety（默认REFUTED）、parity与Plan Agent必须对R23完整复签，之后才允许final quality gate。

R23 final binding semantic reviews（同一 SHA `08f2e338…943df`）：

- Architecture / maintainability：`PASS 9/9`，`eval_run_id=controlled-change-plan-r23-final-architecture-20260902-08f2e338`。
- Safety（默认 REFUTED）：`PASS 13/13`，`eval_run_id=controlled-change-plan-r23-final-safety-20260902-08f2e338`；READY状态仍无implementation authority，全部既有安全域重新翻案。
- Flow / harness parity：`PASS 12/12`，`eval_run_id=controlled-change-plan-r23-final-parity-20260902-08f2e338`。
- Plan Agent contract：`PASS 17/17`，`eval_run_id=controlled-change-plan-r23-final-plan-agent-20260902-08f2e338`；117/117字段、10 Phase、32断言、7 criteria及Gate P重新闭合。
- 四类最终复签均无blocking finding/unknown；进入final quality gate。

Final quality gate（pre-seal input ledger SHA `33e073a98862e79f62fc0561d1e592b5369731324e36aa7e811743aa7da2d01b`）：

- `PASS 11/11`，`eval_run_id=controlled-change-full-plan-final-qg-preseal-20260902-08f2e338`。
- 复算plan/ledger输入SHA、同SHA四签、16域/三档/13×9字段/DAG/10 Phase/32断言/7 criteria、§23.4、scope与未实施边界均PASS。
- quality gate授权的唯一后续动作是父Session封账与生成OS临时handoff；不得启动U-001。

## 6. R23 historical acceptance checklist（已被 R24 重开）

- [x] Plan status is `READY_FOR_APPROVAL` and implementation authority remains `NONE`.
- [x] Same final plan SHA has PASS from architecture, safety, parity, Plan Agent, and quality gate.
- [x] 16/16 domains, three tiers, v1 migration, exact U-block/Wave/Files/Read List/Verification/Gates/rollback are present.
- [x] Every U-block has exactly nine required fields; U-ID dependency graph is acyclic.
- [x] No ambiguous `plus exact ...` or undeclared future file remains.
- [x] Ledger records all failed/superseded rounds without rewriting history.
- [x] `NOT_RECORDED_BY_SCOPE`: no memory/eval runtime write was made for this plan-only Session.
- [x] No implementation started.

R23 historical disposition：`READY_FOR_APPROVAL / WAITING_FOR_EXPLICIT_USER_APPROVAL / AUTHORIZED_EFFECTS=NONE`。该结论由下述 R24 post-seal review 重开，不再是当前 disposition。

## 7. R24 — 2026-09-03 post-seal review

冻结审查对象：`WORKTREE_DIFF = git diff HEAD`；审查时 `HEAD=62b6e4f32feb850ba4f8286a7cb9609202b88f6b`，未提交对象仅为本目录两份 Markdown 文档。R23 final-candidate plan 的历史 SHA `08f2e33846f3c006fa9a35c617bc511905c41cd4c1a8754a8342411fc48943df` 复算一致。

本轮只新增审查产物 `framework-audit/2026-09-03-controlled-change-full-capability-redteam.md` 并更新上述两份文档；未修改 runtime、skill、hook、memory/eval 状态，也未执行 network/GUI/publication effect。

Findings：

1. **Critical — ledger self-integrity mismatch**：按本文件第7行声明的 canonicalization 复算，原声明值 `56d86124fd5105c330a2cb68929e5725463badde1b74a43d702b790e042d782b` 不成立；故 R23 的“封账”不能继续作为当前完整性证明。
2. **Important — post-seal related delta lacks §24.10 disposition**：R23 后的 `a16d47b` 新增 `to-tickets` 并修改 `optional-workflow-graph.yaml` / `scripts/test-route-guard.mjs`；`62b6e4f` 修改 `project-scope-guard.mjs`、`route-guard.mjs`、`session-end.mjs`、`session-sync.mjs` 及 route/scope tests，并新增 `project-read-grants.mjs` 与 `project-read.mjs`。前四类中多项是 §19.2 read-only anchors 或 U-003/U-006 明示输入，但 R-001–R-017 没有覆盖这两个 commit。
3. **Important — transitive trust surface underbound**：`project-scope-guard.mjs` 现已依赖 `project-read-grants.mjs`，并允许精确 `project-read.mjs` broker 路径；当前只读锚点和 U-003 read/verification contract 只冻结父 guard，没有裁决新增库、broker 与 grant lifecycle 是否属于同一信任面。
4. **Important — scope decision is unresolved**：`to-tickets` 可写本地 ticket 或创建外部 tracker issue。它是否成为 controlled-change 的新 consumer/protected surface，会影响“六 Skill lineage”、external effect 与 U-006/U-013 边界；该项需要 owner/用户裁决，不能作为机械修复静默并入或排除。
5. **Important — handoff evidence is not repository-reproducible**：输入 handoff SHA `51618e033c1ef5ec221a7a455fb743df07d103fde65c715d207f783cae8a221f` 只出现在 plan/ledger 的声明中；当前仓库没有对应 bytes 可供新 Session 复算。R23 review IDs 同样没有写入 `memory/evals/eval-log.jsonl`，与 `NOT_RECORDED_BY_SCOPE` 一致，但其独立性只能由 ledger 自报，不能被误述为持久化 eval evidence。

机械处置：

- plan 状态退回 `CANDIDATE_UNDER_REVIEW`，Gate P 暂停，implementation authority 保持 `NONE`；
- 保留 R23 历史记录，不把旧 PASS 改写成当前 PASS；
- 本文件 canonical SHA 按声明算法重新计算；
- 新 plan SHA 记入 R24，但 architecture/safety/parity/Plan Agent/final quality gate 均不得沿用 R23 verdict。

当前 closure requirements：

1. 对固定范围 `a7d5fe3..a16d47b` 与 `a16d47b..62b6e4f` 做增量 Standards/Spec 审计；
2. 人工裁决 `to-tickets` 与 read-grant trust/lifecycle 的 controlled-change 边界；
3. 若裁决改变目标架构、只读锚点、Files、Read List、Verification 或 U-block 可实施性，更新 plan 并生成新 SHA；
4. 提供可复算的 handoff bytes，或明确把原 handoff 降级为不可复现 provenance 并证明 plan 自包含；
5. 对最终新 plan SHA 重跑 architecture、safety（默认 REFUTED）、flow/parity、Plan Agent 与 final quality gate。

Current disposition：`CANDIDATE_UNDER_REVIEW / GATE_P_SUSPENDED / AUTHORIZED_EFFECTS=NONE`。

<!-- FILE_END: REVIEW-LEDGER.md -->
