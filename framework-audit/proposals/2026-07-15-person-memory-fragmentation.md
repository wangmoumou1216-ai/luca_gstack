# person 记忆层分裂 —— 07-09 M1(P0) 复发分析与提案

> 状态：**提议即止**（`correction-attribution.md:26`）。本文不自动写 `gaps-register.yaml` / `BACKLOG.md` / 不改任何框架代码。
> 缘起：2026-07-15 一个认证排障 session 中途翻车，luca 要求自查并判断该模块是否需要治理。3 个 Explore sub 并行核查产出。
> 对应候选：`SC-20260715-005`（分裂）、`SC-20260715-006`（注入污染），均在 `awaiting_approval` 待裁决。
> 范围拍板（luca）：**只收尾 + 提案，不改框架代码**。依据：本月纯框架 session 已 13 次 / 软上限 2 次（6.5×，才过半月），且 07-15 当天已跑过记忆层评审（14 修复）+ 治理全裁决。

---

## 1. 一句话

**07-09 的 M1（P0「person 层割裂修复」）已复发，且当时被明确排除的第二个危害方向今天有了实证。** 复发根因：M1 的修法是「写一份约定文档」，而 fork 目录一改名，slug 变了，约定文档自己失联在旧目录里 —— **用约定修结构问题，且无任何机制检测约定失效。**

---

## 2. 复发实证

### 2.1 M1 的两条验收当前均为 FALSE

`framework-audit/proposals/2026-07-09-memory-eval-final-plan.md:41`：
> **验收**：fork 直跑 session 的 Stop 裁决新写入落母版目录；`daily_governance.py` digest 能列出其候选。

- ❌ 07-15 本 session 的 Stop 裁决**写入了 fork 目录**（harness 注入面就是它）
- ❌ fork 现存 2 条 `candidate_feedback_*`，`daily_governance.py` digest **恒列不出**

### 2.2 约定文档失联的机制

M1 动作 2 要求在 fork auto-memory 目录建 `reference_person-memory-canonical-dir.md`。它确实建了 —— 落在 `~/.claude/projects/-Users-luca-Desktop----muse-gstack/memory/`（对应旧路径 `/Users/luca/Desktop/项目/muse/gstack`）。

fork 此后改名为 `/Users/luca/Desktop/项目/muse/lucagstack` → harness 按新 cwd 派生出全新空目录 `----muse-lucagstack` → **约定文档留在旧目录，当前 fork session 永远读不到**。整个失效过程**零告警**。

### 2.3 危害方向补证（M1 当时明确排除的那条）

`2026-07-09-memory-eval-final-plan.md:32` 原文：
> **危害方向（注意，别写反）**：fork 新生的真人格教训上浮不了治理面……**不是「fork 缺母版记忆而犯错」（无此证据）**。

**今天补上了这份证据。** 母版独有、fork 缺失且与 session 隔离直接相关的 4 条：
`feedback_never-switch-parallel-session-projects.md` / `parallel-lucagstack-fork-merge-care.md` /
`feedback_verify-repo-with-git-c-not-cd-chains.md` / `feedback_commit-muban-if-changed.md`

**四条讲「fork↔母版、并行 session 卫生」的教训，全部只存在于母版 —— 而 fork 正是它们唯一适用的现场。**

07-15 本 session（cwd=fork）收到裸词「git」后，扫了 `~/Desktop/项目/muse` 全部子仓、把并行 session 在途的左栏代码拽进上下文、就他人改动向 luca 发起决策。luca 当场纠正「你不能让别的 session 进入你的上下文」。新写的 `feedback_stay_in_session_scope.md` 自己打的标签就是「与 `[[feedback_never-switch-parallel-session-projects]]` 同族」。

**两个危害方向现已双向成立。**

---

## 3. 裂缝清单

| # | 严重度 | 裂缝 | 证据 |
|---|---|---|---|
| **S1** | 🔴 | `--summary` 注入**全硬盘最后一个结束的 session** 的 next_risk，零归属过滤 | `memory/scripts/get_memory.py:154-166` 取 `ep[-1]`；`--project` 过滤仅存在于 `:171` 的 `--layer episodic` 分支。`MEMORY_ROOT` 把所有仓所有项目汇入母版单一 `index.jsonl` |
| **S2** | 🔴 | `CLAUDE.md:177` 硬编码母版 slug 且**两仓逐字相同** → fork 里两条写入路径都只有一半 session 可见 | `feedback_autocommit-*` 双存**且内容已实质漂移**：母版版含 `[[feedback_commit-muban-if-changed]]` 交叉引用，fork 版没有（因为 fork 根本看不到那条） |
| **S3** | 🟠 | fork 的 `candidate_feedback_*` 是永久孤儿，静默失效 | `daily_governance.py:237` + `session-restore.mjs:344` 只扫母版 → 恒为 0 → 从不进 digest，**无告警**（`daily_governance.py:230` 注释明写「对全局目录只读、fail-open」） |
| **S4** | 🟠 | 4 条 session 隔离教训母版独有，恰在唯一适用现场缺失 | 见 §2.3，已有复发实证 |
| **S5** | 🟡 | **零弥合机制** | 两目录均为真实目录非 symlink；`scripts/sync.sh` 不碰 `~/.claude/projects/`；全仓 grep `ln -s.*\.claude/projects\|sync.*global.*memory\|mirror.*memory` → 仅命中 test-hooks.mjs 的 mkdir |
| **S6** | 🟡 | fork 仓内 `memory/` 是 7-09 死数据，fail-silent 方向反了 | fork `episodic/index.jsonl` 停在 Jul 9；`semantic/candidates.jsonl` **文件不存在**。`session-restore.mjs:16-17` **只在 redirect 生效时告警**；`MEMORY_ROOT` 一旦缺失 → 静默回落旧数据，无提示 |
| **S7** | ⚪ | 目录卫生 | 母版目录有 `MEMORY.md.bak` 与 `MEMORY.md.bak-       1`（文件名含空格） |

### 规模修正

**不是 2 个目录，是 19 个** `~/.claude/projects/*/memory/`。与 luca_gstack 相关的至少 4 个：

| 目录 | 文件 | 治理可见 |
|---|---|---|
| `-Users-luca-Desktop-luca-gstack/memory/` | 34（30 条 feedback） | ✅ 唯一扫描对象 |
| `-Users-luca-Desktop----muse-lucagstack/memory/` | 13（含 2 条 candidate） | ❌ |
| `-Users-luca-Desktop----muse-gstack/memory/` | 4（**含 M1 的约定文档**） | ❌ |
| `-Users-luca-Desktop----luca-gstack/memory/` | 3 | ❌ |

后两个是改名残留 —— 教训还散落在第 3、第 4 个地方。

---

## 4. 根因归属

| 归属 | 裂缝 | 说明 |
|---|---|---|
| **harness 限制**（不可修，只能补偿） | S4 的一半 | **唯一真·外部约束**：目录名由 cwd 派生、不接受任何 env 覆盖 |
| **框架设计缺陷**（主体） | S1 S2 S3 S5 S6 | 「每 session 无差别注入」（`CLAUDE.md:182`、`extraction-bar.md:16`）是**未经验证的假设**，整个 person 层建在其上；`--summary` 无归属过滤；硬编码单一 slug；fail-silent 方向反了；parity 概念没覆盖记忆层 |
| **执行疏漏** | S2 的一半、S7 | 同规则两边各写一次、文件名 `_`/`-` 不一致、.bak 残留 |
| **文档 over-claim** | — | `muse-loop/ARCHITECTURE.md:9` 与 `app/main.js:24-25` 声称「全局个人记忆与母版一套，不分叉」——**与实测直接相反** |

**要害：`GLOBAL_MEMORY_DIR` 是个 no-op。** 它只被 2 处读取（`daily_governance.py:24`、`session-restore.mjs:344`），且 **env 值 == fallback 值**；harness auto-memory 完全不读它。框架用一个只作用于读侧的空操作，说服了自己「已经统一了」。

对照：`MEMORY_ROOT` 是**唯一真正生效**的统一（4 个脚本全部 `os.environ.get("MEMORY_ROOT", ...)`，fork settings.json 注入）→ semantic/episodic 层确实单一权威 store。**框架给自己那层解决了，没给 person 层解决。**

---

## 5. parity 盲区

`scripts/check-capability-parity.mjs` 守护 memory **脚本代码**（8 文件 22 锚点，fork/母版 `daily_governance.py` 实测 byte-identical ✅）。
memory **数据**按 `AUTHORITATIVE_MEMORY_ROOT` 单一权威 store 设计，不在范围（by design ✅）。
**person 层在两个仓之外 → parity 触碰不到，零守护。** 这正是 S2/S3 能长期存在而无人察觉的结构原因。

---

## 6. 方案选项（提议即止，待 luca 裁决）

| 方案 | 做法 | 代价 | 备注 |
|---|---|---|---|
| **A. 治理 glob 全目录** | `daily_governance.py` / `session-restore.mjs` 把单一 slug 改为 glob `~/.claude/projects/*/memory/`，聚合所有 `candidate_feedback_*` | 小（2 处改动）；改名残留自动被收编 | 治好 S3；**不治 S2/S4**（注入面仍分裂，fork 仍看不到母版教训） |
| **B. symlink 收敛** | 把 fork slug 目录 symlink 到母版目录 → 真正单一 store | 中；需验证 harness 对 symlink 的读写行为（**未验证，别当已知**）；改名后需重建 link | 一次性治好 S2/S3/S4；但**改名仍会静默击穿**，除非配 slug 漂移检测 |
| **C. 承认分裂 + 把文档改诚实** | 删掉 `CLAUDE.md:182`「无差别注入」的失实表述与 ARCHITECTURE/main.js 的 over-claim；`CLAUDE.md:177` 改为「写当前 session 的注入面」；接受 person 层按 cwd 分区 | 最小；零代码 | 不治任何裂缝，只停止说谎。可与 A 组合 |
| **D. slug 漂移检测** | 任一方案都该配：检测 `~/.claude/projects/` 出现新 slug 或旧 slug 失活时告警 | 小 | **这是 M1 复发的直接教训** —— 无检测则任何约定/link 都会被下一次改名静默击穿 |

**建议组合（供参考，非决定）：C + A + D。** C 先停止 over-claim（零成本、立刻消除误导）；A 治 S3 且顺带收编 4 个残留目录；D 防止再次静默失效。B 的 symlink 行为未经验证，不宜先上。

**明确不建议**：再用「写一份约定文档」修这类结构问题 —— M1 已经证明这条路会被一次改名击穿。

---

## 7. 已 flag 未处理（旁证：治理面本身在积压）

| 条目 | 首次 flag | 现状 |
|---|---|---|
| person 层 MEMORY.md >20 条 | 2026-07-05（21 条） | **连续 11 天每份 digest 复读，从未处理**；是 07-15 digest「待你裁决」里唯一一条 |
| `SC-20260630-001`（MEMORY.md 索引按每条价值剪、不为凑 >N 数字剪） | 2026-07-15（15 天，刚过 stale 门槛） | 当前唯一 stale 候选。**其内容恰是上一条 flag 的解药 —— 两者互等了 11 天** |
| `BACKLOG #17`（记忆治理积压低频提醒） | 2026-06-01 | 延后。理由含「session-restore 已发 5 个启动 stdout 块，第 6 个会饱和提醒通道」 |

luca 的记忆里有一条：**「系统已 flag 的信号不得当『待裁决』放过 —— 已 flag 即是问题」**（6-24）。上表三条都在违反它。

---

## 8. 本 session 已做 / 未做

**已做（收尾自己的烂摊子，非框架改动）：**
1. 改写 `candidate_feedback_ant_profile_shadows_max.md` —— 原内容（ant profile 盖过 Max）**已被 telemetry 实证推翻**，留着会毒害后续 session；改写为「证伪记录 + 方法论教训（没见过症状不许动手）」
2. `SC-20260715-003/004` 因 `reviewer=""` 处于**静默死循环**（进不了任何队列，07-30 才以 stale 浮出且届时仍无法晋升）→ 带完整元数据重提为 `005/006`（`reviewer=luca`、`stable_requested=true`），旧两条 `--reject` 并留痕。实测 `awaiting_approval` 0 → 2
3. 本文件

**已知临时手段（登记，不假装不存在。待分裂定案后一并收敛，勿漏）：**

| 文件 | 双写理由 |
|---|---|
| `feedback_stay_in_session_scope.md` | 是全局行为规则，只存 fork 则母版 session 永远看不到 |
| `candidate_feedback_ant_profile_shadows_max.md` | 只存 fork 会**烂在孤儿目录**（S3：治理恒列不出 fork 候选）→ 镜像到母版才进得了 `check_person_memory()` 扫描面 |

两份均为 byte-identical、同文件名 —— **是镜像不是漂移**（对照 `feedback_autocommit-*` 那对：文件名不一致 + 内容已实质漂移，那才是分裂的真实代价）。在分裂定案前，双写是唯一能让两侧 session 都看见的办法。

**仍是孤儿（未处理，非本 session 产物）：** fork 的 `candidate_feedback_grep-cjk-silent-false-negative.md`（7-11）—— 治理至今看不见它。未镜像，因为不是我的活且属「不动残留」出界项；一并列入待裁决。

**未做（明确出界）：**
- 不改 `get_memory.py` / `session-restore.mjs` / `daily_governance.py` 任何一行 —— S1 虽当天真咬人，但 luca 选了 proposal-only
- 不合并 19 个目录、不动改名残留、不清 `.bak`
- 不碰 `MEMORY.md >20` 那条 flag（属治理裁决非代码）
- 认证问题未解决 —— 症状已知（「启动时状态默认 api」），待带 `/status` 原文或 `claude --debug` 输出复查

---

## 9. 附：认证排障的方法论教训（本文缘起）

本 session 的原始任务是查「Claude Code 启动默认走 api」。我**从未问过症状长什么样**，就据文档推出「ant profile 盖过 Max」并执行了 `ant auth logout`。

sub 用一手运行时证据推翻：Claude Code `sx()` 有排除分支（profile-implicit + `user_oauth` + 存在 claude.ai 登录 → **跳过 profile**），且 `~/.claude/telemetry/` 有 6 条真实发出的 `tengu_wif_implicit_profile_skipped_stored_login`（6-16/18/23/25）。**我删掉的是本来就不参与认证的东西。**

最该记的一条：**我用来证伪 `opus[1m]` 的那条证据（无 API key 却跑在 `[1m]` 上 → 说明在走 Max），同时也在证伪我自己的 ant 理论 —— 那一刻就该判死，我却继续推荐了 logout。** 详见 `candidate_feedback_ant_profile_shadows_max.md`（已改写）。
