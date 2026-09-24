# 双端根合同单源化：与上下文轻量化 v3.2 的终版握手计划

状态：**PLAN_ONLY / 专家与红队终审见同主题评审记录**。本文件只确定决策、插槽、实施闭集、断言和停止条件；没有授权更改根合同、运行付费模型、修改另一 session 的计划或发布。范围 `NO_PIN`。这里的“单源”是**一次维护共享语义，构建时生成两个各自完整的原生入口**，不是磁盘只剩一个 MD，也不是两个 harness 的运行时合一。

## 先给结论与第一性原理

1. 目标函数不是减少 Markdown 文件个数，而是以最低总拥有成本维持两端**相同的安全/路由语义**和**真实的端别能力**。成本包含维护返工、启动/全任务上下文、生成器与验证、兼容和故障风险。一个会话通常只读本端约 10.5–11.1 KB 根；把两份根相加再宣称 token 减半是错误分母。
2. Claude Code ≥2.1.277 在特定条件下可以直接读 `AGENTS.md`，但有 `CLAUDE.md`/本地覆盖时默认优先后者；`@AGENTS.md` 是官方支持的导入，但其生效仍取决于 Claude 环境。Codex 以 `AGENTS.md` 为入口。**本仓没有发生“Claude 已自动把 CLAUDE.md 变成 AGENTS.md”的迁移。**现状是共享 Skill OS 正文、两个很薄的根入口、42 个技能别名及不可互换的原生 hook/slash/`$skill`/workflow 适配，不是两套完整业务框架。[Claude 官方说明](https://code.claude.com/docs/en/memory)；[Codex 官方说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
3. 最终技术选择：**单一作者源 `.claude/skill-os/agent-root-source.md` → 确定性生成独立、自含的 `AGENTS.md` 和 `CLAUDE.md`**。共有 K1–K10/六条 Static Fallback 仍在每个运行态根内联；端别句只在源中的有界 overlay 分开。首次迁移要求两份生成根与轻量化 B 冻结树的根**逐字节相同**。不采用 `CLAUDE.md @AGENTS.md` 薄 shim（会打破当前双根内联/禁止跨根读取的安全与评分假设，且 Claude 无额度不能证明导入失效态）；不删除 `CLAUDE.md`；不改技能正文或本端适配。
4. **价值判决目前是 UNKNOWN，因此实施上 NO-GO**。近 90 天主线非 merge 根改动 74 次，其中 28 次同提交双改；可查两例旧式漏改返工（Scene D、Codex 五个一级 skill），但 9 月 6 日根已大幅重构，此后只见一次 AGENTS 专属改动。提交次数不是节省工时，缺少可归因工时和新制频率，尚不能保守证明 12 个月净收益为正。保持双根、先完成正在执行的轻量化，是当前推荐的**实际动作**；下面给的是一份不再留架构空白的、可条件启用的 U5，不预设必做。

## 唯一插槽与给另一执行 session 的指令

当前 v3.2 主线的 P1 已结束，但 G1 仍是 `CONDITIONAL_PASS 8/9`：C3 动态越界反例 `UNKNOWN`，所以 **P2 尚未获准开始**。v3.2 计划 SHA-256 `2ca0cd4d696ae86a72bdabb9e7fc29960b1df42b57fead7605d4390888d4ba0a`；以其 P1 baseline 最新 checkpoint 判当前状态，不以旧标题推定 G1 PASS。主线 A/B 隔离基线是 `05aa78a...`，当前混合主工作区 HEAD `c07330d...` 不可替代它。

**请用户把以下握手作为一个条件插槽交给执行 session：`G4（U1–U4 的 B 工程冻结）之后、G5（原 A→B 最终裁决）之前，命名 G4.5 / U5-option。`** 它不是 P1→P2 的写入节点，不修改 U1–U4 的文件/断言/评分器，也不接管 G5。现在 P1 停点只传达本计划和 D0 价值票；执行 session 可回去补 G1 的 C3，真 PASS 后继续 P2→P5，不等待 U5。

可直接转交的插槽文本：

> 在原计划 G4 PASS 且 B 的精确 tree、两根字节、评分器/测试版本冻结后，进入 `G4.5 / U5-option`。先查看《2026-09-21-cross-harness-root-handshake-final.md》的价值票：目前 UNKNOWN=NO-GO，默认 `SKIP_U5`，B 原样进入 G5。仅当下述 V 门得到 `GO_EVIDENCE` 或用户另作 `GO_VALUE_OVERRIDE`，且用户明确批准五文件闭集的隔离 C 实施时，从 B 派生 C=B+U5；C 不得改 B、不取代 A→B 票。C 静态门过后仍由 B 独立完成 G5；C 发布另有 G6/用户授权。任何 BLOCKING 失败或缺端证据保留 FAIL/UNKNOWN，不反向放行 G1/G5。

这份插槽可以**现在加入主计划**，但本轮 D0 已判 NO-GO；插入一个可跳过的门不代表可以开始 U5。若用户不愿给主计划增加一个条件门，也可在 G4 交接时再引用本文件；**绝不在 U1/U2/U3 顺手改根**。

## V 门：何时值得做

- 对照“维持现状 + 已有双根 parity/checker”与五文件单源生成方案，不把磁盘字节或单端 token 虚减算为收益。量化 12 个月内同一共享规则双端维护的可证人时下界、返工风险成本，与迁移/新增生成器测试及维护上界。保守净收益严格为正才给 `GO_EVIDENCE`。
- 或有**新 B 制度下**可重现的共享规则漏改/高严重度漂移，且拟议生成检查能抓住同一 mutation；此风险目标及有界成本须由用户明确确认。旧制两例只证明问题曾发生，不能单独跨制度推断未来频率。
- 两路证据都不足：财务价值仍为 `UNKNOWN`，默认 `SKIP_U5`；不为了“只有一份 MD”的观感自动批准实验。第三条仅人类可选通道 `GO_VALUE_OVERRIDE`：用户在知悉“12 个月净收益未证、一次性及后续验证成本/风险、五个实施文件、C 的 G6 不保证无活体即可发布”后，明确表示仍愿意为**一个确定性维护权威**支付该成本，并对绑定 B 的精确实施 payload 单独授权。此票只改变是否可试做 C，不把 `UNKNOWN` 改写成 `GO_EVIDENCE`，不免 G5/G6/发布门；缺上述回执仍 SKIP。B 失败、G1/G4 未过、SHA 漂移或文件重叠用户 WIP 都是停止条件。

## U5 精确实施合同（仅在 V 门和用户实施批准后）

`phase_type=task_execution`，串行 U5a→U5b→U5c，独立质量检查与红队；隔离 C 从**冻结 B 精确 tree**生成，不在正在执行的 A/B 或混合主工作区直接试验。批准范围恰好如下最大闭集；五项不代表每项都必须发生语义修改：

| 唯一可写实现路径（证据产物另列） | 作用 |
|---|---|
| `.claude/skill-os/agent-root-source.md`（新） | 唯一手写根正文；COMMON 与 Claude/Codex 有界差异 |
| `scripts/build-agent-context.py` | 在原 catalog/index/fallback 投影器上加双根渲染、`check` 全字节比对、`sync` 逐文件原子替换/同步错误回滚 |
| `AGENTS.md`、`CLAUDE.md` | 由 source 与受治理的 Static Fallback 生成，第一次输出必须分别等于 B 原字节 |
| `scripts/test-agent-context.mjs` | 源和双根加入 temp fixture，增加生成、漂移、失效注入与回滚负例 |

不写 `framework/`、`.claude/skills/`、项目状态、`agent-root-kernel.json`、`agent-context-state.json`、`check-agent-context.mjs`、AB 评分器、CI/verify/package、`.githooks`；后者已按两完整运行根校验，应**只读回归**。若 B 版扫描发现新增硬编码消费者，或五文件无法闭合要求，停止并向用户提交精确 delta，绝不擅扩名单或降测试。只读消费者清单包括 parity/routing/coding/model/registration/appendix/write-for-agents 检查器、AB evaluator、CI/verify、commit-msg、相关 hooks 和 fixture；B 冻结后先按 `rg` 重扫，再判断闭集仍成立。U5 的审查报告和 C release manifest 是**证据产物而非实施代码**，分别只写 `framework-audit/2026-09-21-cross-harness-u5-evidence.md` 和隔离 C 的 `framework-audit/2026-09-21-cross-harness-u5-release-manifest.json`；未获 U5 实施批准时均不创建，产物不得混入 B。

U5a（候选隔离/契约提取）：记录 B tree SHA、两根 SHA-256、生成器与每项检查器 SHA；复制 B 的每一段完整正文到单一 source，共有文本只写一次。源采用**有序、带唯一递增 ID 的片段**：`<!-- ROOT_SEGMENT 001 COMMON START -->…<!-- ROOT_SEGMENT 001 COMMON END -->`、`CLAUDE_ONLY`、`CODEX_ONLY` 三种类型；生成器顺序拼接 COMMON 和对应端的 ONLY，且只在 COMMON 中允许**恰好一个** `{{STATIC_FALLBACK}}` 占位。源的首尾不能有未归属文本，标记不嵌套；拒绝未知类型、ID 重复/逆序、开闭不匹配、未知/重复占位、递归或越界引用。它可无损覆盖 B 两根的**全部**差异（含标题后的多行序言及未来 B 新差异），但共享规则不得在两个 ONLY 各抄一份；独立审查源与 B 双根 diff，确保共同 K1–K10 正文只写一次。生成器还须逐根校验唯一、完整的 K1–K10/六条 Static Fallback/正确 `FILE_END` 与端别句；不能把 source 或另一根变成运行时 `@` import。Static Fallback 仍从 allowlist/promoted facts 生成并内联，不从旧根拷贝成第二权威。先通过“B 根逐字节重现”断言；若要改行为/根内容，本 U5 不包含，须另立变更。

U5b（生成/失败原子性）：扩 `expected_files()` 使 `check` 同时验证双根与其他生成物；必须**移除/替换现有 `sync_projections()` 从旧双根原文读取、只替换 fallback、再覆盖 `planned[path]` 的循环**，使根的唯一生成链是 source 片段 + 受治理的 Static Fallback。否则新渲染会被旧根覆盖，`check`/`sync` 自相矛盾。`sync` 先在隔离 C 计算/验证全量投影，沿用**逐文件原子替换、同步错误时恢复全部 preimage** 机制；不声称跨文件进程崩溃原子性。手改任一生成根即 stale FAIL；单独源或内存投影变化未 sync 也 FAIL。还必须正向证明改 COMMON 一处后 `sync` 同时改变两根且 `check` PASS，再撤回测试改动恢复 B 字节。把注入构建失败前后的**所有**投影 hash 对账；进程崩溃后下次 `check` 必须拒绝半成品，不把“半数已写”当成功。提交门 `.githooks/commit-msg` 的 staged snapshot 已调用 `build check` 和 `check-agent-context`，因此新增 source 必须随候选提交入索引，但本计划不授权提交。

U5c（断言先行、独立验收）：测试和 B/C hash 对账如下。B 根字节保持同一是初迁移最高优先级，[BLOCKING]；它让运行时 Claude/Codex 仍各只读自己的根，旧 K1–K10、六条 fallback、NO_PIN/HITL/Plan/STOP、端别入口及 AB forbidden-root 门都不变。`check`/`sync` 在隔离 C 的临时 fixture 先验证，**不得在当前有用户 WIP 的主树运行 sync**。

```sh
# [BLOCKING] 生成来源/现有 K1-K10、Static Fallback、目录与端别合同
npm run check:agent-context --silent
npm run check:agents-parity --silent
npm run check:routing-map --silent
npm run check:coding-discipline --silent
# [BLOCKING] temp fixture：COMMON 改动→两根同变+check绿，以及手改单根、源失配、片段无效、错端、缺 K8、注入替换失败全量回滚
npm run test:agent-context --silent
# [BLOCKING] 双端 evaluator 只读自测，不能当作付费活体票
npm run test:agent-context-ab-evaluator --silent
# [BLOCKING] C 生成后的 AGENTS/CLAUDE 分别逐字节等于冻结 B；B tree 与用户 WIP 未动
# 在隔离候选中对账两根的 SHA-256、git diff --check、完整 scripts/verify.sh 回执
```

测试新增负例必须证明检查器真的检出源漂移与原两根门：至少单根手改、COMMON 漏一条 K、Claude ONLY 错写 Codex 动作、Static Fallback 少一条、片段缺失/重复/未知/逆序、source 缺失、`sync` 第 N 个替换失败后所有 preimage 恢复。若未增加有效检出就只得到绿灯，不能 PASS。`verify.sh` 在隔离 C 运行前先检查其其他状态写入边界；只读扫描和临时测试可先做，不以 `--self-test` 冒充 CLI 行为。B 的 tree SHA 经只读验证并绑定为 `B_TREE_SHA` 后，在 C 工作树执行以下真实阻断对账；任何失败停止：

```sh
git show "${B_TREE_SHA}:AGENTS.md" | cmp - AGENTS.md
git show "${B_TREE_SHA}:CLAUDE.md" | cmp - CLAUDE.md
# B_ROOT 和 C_ROOT 为 G4 冻结记录中核实的两个绝对路径；--describe 不调模型
node scripts/run-agent-context-ab.mjs --root "$B_ROOT" --arm candidate --harness codex --fixture all --trials 1 --concurrency 1 --describe
node scripts/run-agent-context-ab.mjs --root "$C_ROOT" --arm candidate --harness codex --fixture all --trials 1 --concurrency 1 --describe
# C_MANIFEST 是隔离 C 中由上一条 C describe 摘要构造、独立复核的精确 JSON 文件
node scripts/run-agent-context-ab.mjs --root "$C_ROOT" --arm candidate --harness codex --fixture all --trials 1 --concurrency 1 --describe --release-manifest "$C_MANIFEST"
```

## G5/G6、费用与回退

- A=原发布基线，B=原 v3.2 轻量化，C=B+U5；原 56 会话是 **A→B G5** 的单独付费批准范围，不用 C 票替代 B，也不把 U5 贡献塞进 30% 上下文收益。两根逐字节相同**只能**转移 B 已通过的根加载/根语义证据，不能自动转移全任务成本、release identity 或未取得的 Claude 票。现有 evaluator 的 `contextIdentity()` 递归哈希整个 `.claude/skill-os`；新增 source 后 C 的 `context_sha256` 与 B **必然不同**，旧 B `--release-manifest` 不得拿来在 C 上执行或冒称 C 票。G6 必须用现有 evaluator 的非付费 `--describe` 分别记录 B/C 的 `context_sha256`、`context_file_count`、fixture/scorer identity；隔离 C 的新 release manifest 用 C 摘要、原评分身份与六条受治理 fallback ID 单独绑定，保留 B manifest/原始票及差分，不修改原评分器，不用 `--rescore` 跨 hash 搬票。
- G6 的证据转移须由独立验收逐个 T1–T7 证明：冻结指令、own root、`CONTEXT.md`、索引/manifest/owner、实际可达读取图、fixture 输入、工具配置与评分器一致；**完整列出 C 相对 B 的全部可观察差分**，包括新增 source、修改的 builder/test、两份审计产物及文件清单、Git 工作树状态/差异和可能变化的命令输出，逐 fixture 证明其工具读取/列目录/状态检查/执行路径都不能接触这些差分，也不会受其结果影响。只证明“没有读 source 正文”不够。若任务允许 `rg --files`/宽泛仓库扫描、`git status`/diff、调用 builder/test、读取审计文件，或任何可观察差异无法排除，则 B 的该项全任务/成本票**不得**转移，C 该项记 `UNKNOWN` 并不发布；要补 C 活体必须另拟带费用上限的 delta 并获用户批准。即便逐项可转移，也明示其为等价性推理而非 C 新活体，把 B/C 不同 digest 和新 manifest 保留在审计链中。
- 若任一根字节不同，U5 初迁移直接 FAIL 并停，不在本批准内改为 shim 或顺带优化文本；另案需重定范围和两端 B→C 活体预算。作为成本上界提示：原 T1–T7×两端×两次的单臂是 28 个新会话；若 B 配置/版本/树不可比，B+C 重跑是 56 个新会话。**本五文件字节等同方案付费新增上限为零**，不授权 28/56。Claude 当前无额度时不能做新 Claude 活体；B 的 G5 如缺端则 UNKNOWN，C 不发布。
- `G6 PASS` 还要求 V 门 `GO_EVIDENCE` 或 `GO_VALUE_OVERRIDE`、B G5 PASS、C 全部 [BLOCKING] PASS、根 hash 等同、C 新 context/manifest 与逐 fixture **全部可观察差分**不可达证明、独立专家/红队无重大未决、最终差异与费用记录；任何 FAIL/UNKNOWN → `SKIP_OR_HOLD_C`，B 可独立继续，但 C 不发布。Git commit/push/正式根切换另需用户明确授权。
- C 失败只丢弃或逆补丁撤回隔离候选，B 与混合主工作区 WIP 原样保留。不得 reset、强制覆盖或把 C 的 checker 改动回灌到 A/B。发布后的 source/roots 属于一个不可分提交单元；未来改共享语义先改 source→sync→双端门，不能人工只改一个生成根。`framework/` 始终只读。

## 审查与计划完成标准

本计划的审查判据：专家验证架构/消费者闭集和实际 ROI；独立红队攻击错误的前提、G1/G4/G5 绕门、字节等同证据转移、失效回滚/付费外溢。必须评同一文件 SHA；修订后重评，不以旧版的票冒充终版。最终用户只需把上面的 G4.5 插槽交接给另一 session：**先继续补 G1；到 G4 默认跳过 U5，除非新价值证据和用户实施批准共同改变判决**。计划经过会审不是实施 PASS，更不是“Claude 已验证”。

<!-- FILE_END: framework-audit/2026-09-21-cross-harness-root-handshake-final.md -->
