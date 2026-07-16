# person 记忆层 —— 方案 v1

> 状态：**提案，未执行任何持久改动**。本 session 的全部实验跑在隔离 config dir + 临时 git 仓内，已实证零泄漏（§2 V0）并清理。
> 前置：`2026-07-15-person-memory-fragmentation.md`（昨案，裂缝 S1–S7 继承）、`2026-07-16-person-memory-unification-plan.md`（v0，红队判死）、`...-REDTEAM.md`（裁决）。
> 环境：Claude Code `2.1.211`。

---

## 0. 相对 v0，我改了什么关键决定

| | v0（判死） | v1（本案） |
|---|---|---|
| **scope** | A：全机器 19 库塌缩成 1 个 | **推翻 A**。只并 gstack 家族的 2 个活库；code-\* 等 15 库**不碰，且认为不该碰** |
| **canonical 路径** | 新建目录（P1/P2/P3 三选一） | **不新建。canonical = 现有母版 store**。路径问题整个消失 |
| **机制 scope** | userSettings（`~/.claude/settings.json`，全局） | **fork 的 localSettings**（1 个已 gitignore 的文件），母版零改动 |
| **数据移动** | 19 库 / 93 文件 / 逐对人工裁决 | **10 文件 / 16.8 KB / 1 对人工裁决** |
| **读侧 9 处硬编码** | 要改（v0 把 1 处硬编码换成 9 处） | **一处不改 —— 它们本来就指向 canonical，切换后从"陈旧"变成"正确"** |
| **KILL-1 验证** | 用 flagSettings 验，却要部署 userSettings（结构上无法证伪） | **在部署 scope 上验，且带可失败的 control**（§2 V3） |

**我主动放弃的**：v0 全部四个卖点 —— 「一个库装下所有 person 事实」「52 条收敛成单点语料」「S8 自动消失」「隐私路径三选一」。前三个是错的或 over-claim，第四个是 v0 自己造出来的问题（把 store 挪进 `~/Desktop`）。

---

## 1. 前提门：该不该做 / 更小替代

### 1.1 在场代价（实测，非推测）

| 事实 | 证据 |
|---|---|
| **1 条候选自 7-11 起孤儿，治理面从未见过它** | `candidate_feedback_grep-cjk-silent-false-negative.md`，mtime Jul 11，只在 fork store；`daily_governance.py` 只 glob 母版 store（V15） |
| **3 条候选靠人工双写续命** | 母版/fork 各一份、byte-identical。这是昨案登记的「临时手段」，即持续人工税 |
| **31 条母版教训 fork 看不见；10 条 fork 教训母版看不见** | V12 |
| **S4 已有复发实证** | 4 条 session 隔离教训**全部母版独有**，而 fork 正是唯一适用现场（V13）。07-15 fork session 真的犯了其中一条 |
| **分裂已造成内容漂移，不是理论风险** | `feedback_autocommit-push-high-confidence.md`(母版) vs `feedback-autocommit-push-high-confidence.md`(fork)：同一条教训，两个名字，**内容已实质不同**（V12） |

两个 store **今天都在被写**（mtime 均为 2026-07-16）→ 这是活问题，不是考古。

### 1.2 更小替代（逐个认真比，不是陪衬）

| 选项 | 做法 | 治什么 | 为什么不选 / 可选 |
|---|---|---|---|
| **(a) 什么都不做** | 继续人工双写 | — | 双写正是**已经失败**的东西：漂移已发生（V12），孤儿已存在 5 天。它不是"更小的方案"，是病因 |
| **(b) 最小止血** | 把那 1 条孤儿候选复制进母版 store | 让治理看见这 1 条 | **成本≈1 条命令，真的更小。** 但不阻止复发，双写税继续。**若 luca 只想止血，这条足够，且我建议就停在这** |
| **(c) 昨案 A：治理 glob 全目录** | `daily_governance`/`session-restore` 改 glob | S3（治理可见性） | 不治 S2/S4 —— **注入面仍分裂，fork 仍看不见那 4 条它最需要的教训**。且要改 2 仓 4 处代码 + app env，比 (d) 大 |
| **(d) 昨案 B：symlink** | fork slug 目录 → 软链到母版 | S2/S3/S4 | **严格劣于 (e)**：改名即静默击穿 —— 而**改名正是 M1 的真实死因**。红队说它"死于株连"是对的，但它自己也确实有这个洞 |
| **(e) 本案 M：fork localSettings 一个 key** | 见 §3 | S2/S3/S4/S5 | **改名不击穿**（配置文件跟着目录走）。1 个 gitignored 文件，母版零改动，读侧零改动 |

### 1.3 我的判断（但见 §5 卡点 2/3：范围是否解禁不是我能定的）

**(b) 与 (e) 都是诚实答案，取决于 luca 想止血还是想根治。**
(e) 只比 (b) 多一个配置文件 + 10 次文件复制，却把复发路径关掉 —— 我倾向 (e)。
**但如果 luca 认为本月框架预算已经透支（§5 卡点 1），(b) 是完全站得住的收场，我不会争。**

---

## 2. 我亲自实证的证据

> 全部为**本人执行并观察**。RELAYED 的一律不作承重使用。凡未验证的，标"未验"并进 §5，不进论证。

**V0 — 实验隔离性**（先证明我的实验不污染真数据）
```
find ~/.claude/projects -name "*.md" -newermt "-40 minutes"   → 空
```
所有 `claude -p` 跑在 `CLAUDE_CONFIG_DIR=<tmp>` + 临时 git 仓；写入落在 tmp config 内。已清理。

**V1 — 解析链本体**（`strings -a <bundle>`，本人 grep）
```js
function KFh(){let e=CPe(),
 t = Rr("policySettings")?.autoMemoryDirectory
  ?? Rr("flagSettings")?.autoMemoryDirectory
  ?? (e ? Rr("localSettings")?.autoMemoryDirectory ?? Rr("projectSettings")?.autoMemoryDirectory : void 0)
  ?? Rr("userSettings")?.autoMemoryDirectory;
 return mHc(t,!0)}
```
→ **userSettings 是最后一位**（红队对，v0 错）。**localSettings 压过 projectSettings，二者都压过 userSettings。**

**V2 — 找到与部署 scope 对齐的实验方法**（这是 v0 做不到的那一步）
```js
cn = Pr(()=>(QYa() ?? sri.join(ZYa.homedir(),".claude")).normalize("NFC"), QYa);
function QYa(){return process.env.CLAUDE_CONFIG_DIR}
function eDr(e,t){switch(e){case"userSettings":return N0.resolve(cn()); ...}}
function GJe(e,t){switch(e){case"userSettings":return N0.join(eDr(e,t), YFm(t)); ...}}   // = <cn()>/settings.json
```
→ `CLAUDE_CONFIG_DIR` 重定位的就是 **userSettings 本身**。同一个 `Rr("userSettings")` 分支、同一个 `??` 末位。**这使得"在部署 scope 上验"成为可能，且不碰 luca 的全局配置。**

**V3 — 部署 scope 实测（清 KILL-1）**
基线先核（本人跑）：policySettings 文件不存在；user/project/local 四个真实 settings 文件的 `autoMemoryDirectory` 全部 `<unset>` → 无干扰。
```
$CFG/settings.json = {"autoMemoryDirectory": "$E/canon"}      # userSettings，无 --settings 标志
$E/canon/MEMORY.md 含哨兵 ZORBLAX-7741-QUUX

repoA (git root A):  claude -p "…passphrase…"   → ZORBLAX-7741-QUUX
repoB (git root B):  claude -p "…passphrase…"   → ZORBLAX-7741-QUUX
control: 同 repoB，key 从 userSettings 移除      → NONE ("memory directory doesn't exist yet")
```
→ **userSettings 分支真的工作，且跨不同 repo 根收敛到同一库。control 证明该实验能失败却没失败。**
→ 顺带 VERIFIED：**只有 `MEMORY.md` 被注入，主题文件懒加载**（canon 里只有 MEMORY.md，模型仍读到索引；另一轮它主动指出 `sentinel.md` 不存在 → 说明它没自动加载主题文件）。

**V4 — localSettings 压过 userSettings（静默）**
```
userSettings → canon(ZORBLAX) ；repoB/.claude/settings.local.json → decoy
结果: HIJACKED-BY-LOCALSETTINGS      （无任何覆盖提示）
```

**V4b — 本方案自己的部署 scope 实测（最承重的一条）**
> 铁律「验证 scope 必须等于部署 scope」对本案指向 **localSettings** —— 因为 §3 部署的就是它。
```
$CFG2/settings.json = {}                                  # userSettings 无 key（= luca 真机现状，V3 基线）
repoA/.claude/settings.local.json → $E/canon              # localSettings
repoB/.claude/settings.local.json → $E/canon              # localSettings（不同 git 根）

repoA:  claude -p "…passphrase…"   → ZORBLAX-7741-QUUX
repoB:  claude -p "…passphrase…"   → ZORBLAX-7741-QUUX
```
→ **两个不同 repo 根，只靠各自的 `settings.local.json`，收敛到同一个库 —— 这正是 §3 要做的事，在它要用的 scope 上跑通。**
→ 可失败性由 V3 的 control 提供（同样的哨兵机制，去掉 key → `NONE`）。
→ **诚实边界**：本轮跑在 `-p`，`pn()` 使信任门自动打开（V6）；交互态由 V6 的信任数据 + A2 兜（§7.1）。

**V5 — schema 字符串是假的**（这条推翻 v0 唯一的一手证据的信源）
schema 原文：*"Ignored if set in projectSettings (checked-in .claude/settings.json) for security."*
```
userSettings → canon ；repoB/.claude/settings.json (= projectSettings) → decoy
结果: HIJACKED-BY-PROJECTSETTINGS
```
→ **没有被 ignore。** v0 的 E1 = 对这个 schema 字符串的一次 grep。**它在自己描述自己行为的那句话里就在说谎** → v0 全案唯一的一手证据来自一个已实证会失实的字符串。（红队的 E5 弹劾成立。）

**V6 — 信任门**
```js
function CPe(){if(pn())return!0;return qd()}
function pn(){return!Ot.isInteractive}                       // -p 模式 → 门无条件打开
function t3y(){…if(e.projects?.[t]?.hasTrustDialogAccepted)return!0;…}   // 交互 → 看信任
```
实测 `~/.claude.json`：母版与 fork **hasTrustDialogAccepted 均为 true** → 交互态下门同样打开 → localSettings 在 luca 真实 session 中会被采纳。
**诚实边界**：V4/V5 跑在 `-p`（门自动开）。交互态结论是「t3y() 代码 + 信任数据」推出的，**我没真跑一次交互 session**。→ 该残余由断言 A2 兜（§4），不是遗留未知。

**V7 — 主解析器全貌**
```js
Ry=Pr(()=>{ let e=hHc()??KFh(); if(e)return e;
  let t=pV.join(_9e(),"projects"), r=tp(rc())??rc();
  return (pV.join(t, D0(r), VFh)+pV.sep).normalize("NFC") }, ()=>`${rc()}|${CPe()}`)
function rc(){return VO()?.projectRoot??Ot.projectRoot}
```
→ 派生输入是 **projectRoot**（非裸 cwd）。昨案「由 cwd 派生」不准确。（`tp`/`D0` 内部我没追 —— 对本方案不承重，因为本方案**覆盖**这条派生。）

**V8 — 真正的 env 覆盖存在，但我不用它**
```js
function hHc(){return mHc(process.env.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE,!1)}   // 优先级高于 KFh() 全部
function Iqn(){return hHc()!==void 0}
// Iqn() 的下游：
//   if(!Iqn() && n.endsWith(".md") && V2r(n)) return {behavior:"allow", …}      ← 改写 .md 写入放行逻辑
//   let Ae = g!==void 0 && Iqn() ? await pFr(se) : null;  …注入 system prompt   ← 改变提示词
```
→ 它**不是干净的路径覆盖**，会把 session 翻进 cowork 模式、改动两处无关行为。**有证据地否决**，不因"优先级最高"就采纳。
→ 附带：这条直接证伪 `SC-20260715-005` 的「不接受任何 env 覆盖」—— env 覆盖存在（见 §5 卡点 9）。

**V9 / V10 — 泄露轴（把红队的尺子对准我自己的目标）**
```
stat -f '%d:%i'
 104359907  /Users/luca/Desktop/luca_gstack/CLAUDE.md
 104359907  /Users/luca/Library/Mobile Documents/…/Desktop/luca_gstack/CLAUDE.md   ← 同 inode：~/Desktop 确是 iCloud（红队复现成立）
 106140737  /Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory/MEMORY.md   ← 不同 inode
git -C <母版 store> rev-parse --show-toplevel  → fatal: not a git repository
```
→ **母版 store 既不在 iCloud 树内，也不在任何 git 仓内。它已经是这台机器上最干净的落点。**
→ v0 的 §3「P1/P2/P3 选路径」是它**自己造出来的问题**（提议把 store 挪进 `~/Desktop`）。不新建目录 → 这个问题不存在。

**V11 — scope=A 的尺子无效（我独立复核，结论与红队一致）**
19 库 / 93 文件 / 214,642 B。5 个 `code-*` 库中 4 个**只有 MEMORY.md**，其内容是散文式项目档案：
```
code-fx-list   : # fx_list 项目记忆 / ## 组件库：fx-ui / ## 样式系统 / ## 页面布局结构（Figma 658:20618）
code-crm-list  : # 项目记忆 / ## 工作目录 / ## fx-ui 组件库 / ## Figma MCP 工作流（已验证）
code-call-summary: # Call Summary Project — Memory / ## 关键文件 / ## 历史 BUG 记录
code-vioce-code: # Project Memory / ### 技术栈 / ### 启动方式 / # 访问 http://localhost:3000
code--------   : # 个人知识库项目 - Memory / ## 技术栈 / ## 部署 / ## 环境变量
```
→ **project 事实压倒性地叫 `MEMORY.md`，不叫 `project_*`。** v0 的「project 事实仅 5 个」是 `ls project_*` 的产物 —— **那把尺子没有在测量任何东西**。
→ scope=A 会把技术栈/端口/Figma Key/环境变量塞进**每 session 无差别注入**的 person 索引，并同时判这些库**永久失联**（它们今天工作正常）。**A 作废。**

**V12 — gstack 家族真实差集**
```
母版 39 文件 / fork 16 文件（均 mtime 2026-07-16）
母版∩fork=6   仅母版=33   仅fork=10(16,847 B)
共有中漂移: MEMORY.md、feedback_symptom-first-before-acting.md
aliased 双胞胎: 1 对（feedback_autocommit-* 的 _ vs - 版），内容已漂移
两个死库（改名残留）: ----muse-gstack(4，含 M1 约定文档)、----luca-gstack(3)，末次写入 07-09 / 05-17
```

**V13 — S4 核实**
```
母版✓ fork✗  feedback_never-switch-parallel-session-projects.md
母版✓ fork✗  parallel-lucagstack-fork-merge-care.md          ← 注意：无 feedback_ 前缀
母版✓ fork✗  feedback_verify-repo-with-git-c-not-cd-chains.md
母版✓ fork✗  feedback_commit-muban-if-changed.md
```
→ 昨案 S4 成立。**并且：第 2 条没有 `feedback_` 前缀 → 任何基于 `feedback_*` glob 的断言都会漏掉真记忆**（v0 的 A4 正是这么写的）。本案断言改用全文件枚举 + 内容哈希（§4 A5）。

**V14 — 注入上限（拆掉 v0 的幻影闸）**
```js
var z0="MEMORY.md", ite=200, iCe=25000;
// lineCount: Bu(t,"\n")+1 ; byteCount: t.length   ← JS .length = UTF-16 code unit，非 UTF-8 字节
// 超限时: content + "> WARNING: MEMORY.md is … Only part of it was loaded…"   ← 截断会打印响亮警告，不是静默
```
实测：母版 MEMORY.md 28 行 / 13,771 B / 26 条；fork 13 行 / 2,862 B / 11 条。**合并后 ≈41 行 / ≈16.6 K，离 200 行与 25000 都很远。**
→ v0 的 `-le 25600` 是**幻影闸且有害**（会逼 luca 为不存在的上限删真记忆）。**本案不写这条断言**（§4 说明为什么"写不出就不写"）。

**V15 — 读侧真值（这条决定了整个方案形状）**
```
memory/scripts/daily_governance.py:26      → ~/.claude/projects/-Users-luca-Desktop-luca-gstack/memory  （双仓）
.claude/hooks/session-restore.mjs:345      → 同上（双仓）
.claude/skill-os/extraction-bar.md:30      → 同上（双仓，文档）
项目/muse/app/main.js:28  GLOBAL_MEMORY_DIR → 同上（env 注入，已烤进 asar）
grep autoMemoryDirectory <三仓>            → 0 处
```
→ **9 处硬编码全部已经指向母版 store。** 只要 canonical **就是**母版 store，它们**无需改动即为正确** —— v0 那条「1 处硬编码变 9 处」的净退化在本案结构上不存在。

**V16 / V17 — 两条服务端通道（红队的致命 1 与 3）**
```js
function y9e(){ if(et("tengu_moth_copse",!1))return!0; if(Rqn)return!0;
                return!!process.env.CLAUDE_MEMORY_STORES?.trim() }
```
实测：`tengu_moth_copse` / `onyx_plover` **均不在本地 statsig 缓存**；`CLAUDE_MEMORY_STORES` 未设；telemetry 无 `tengu_auto_dream_completed`；全盘 `find ~/.claude/projects -name .consolidate-lock` **无任何 autoDream 锁残留 → 从未观测到它跑过**。
→ **红队的结构判断成立：开关在服务端，不在 luca 手里，可随时翻。** 但**本方案不新增靶点** —— 母版 store 今天就是 `Ry()` 的返回值、就是同步目标；本案只让它 +16.8 KB（+13%）。**这是现状风险，非本案引入。** 仍进 §5 卡点 5/6，我不替 luca 接受它。

**V18 — 仓与暴露面**
```
母版 wangmoumou1216-ai/luca_gstack        → PUBLIC
fork  wangmoumou1216-ai/luca-gstack-muse  → PRIVATE
.claude/settings.local.json → .gitignore:88 命中，两仓均未跟踪   ← 本案要改的就是它
.claude/settings.json       → 两仓均被跟踪                      ← 而 V5 证明它能覆盖 autoMemoryDirectory
```

---

## 3. 方案 M —— 最小收敛

**动作（全部内容）：**

1. **fork 的 `.claude/settings.local.json` 增加一个 key**（该文件已存在且含 permissions → **合并写入，不覆盖**）：
```json
{ "autoMemoryDirectory": "/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory" }
```
2. **母版：零改动**（它本来就派生到这个库）。
3. **数据**：fork store 的 10 个 fork-only 文件复制进 canonical（**只复制不移动**，旧 store 原地留作回滚）；其中 1 对 aliased 漂移双胞胎人工裁决并统一命名；`MEMORY.md` 索引人工合并（26 + 11 − 1 ≈ 36 条）。
4. **读侧脚本 / CLAUDE.md / app：零改动**（V15）。
5. **两个死库（7 文件）**：不动。若 luca 要，可另行捞回 M1 约定文档 —— 与本案无关。

**为什么是 localSettings 而不是 userSettings：**

| | userSettings（v0） | localSettings（本案） |
|---|---|---|
| 优先级 | `??` 链**末位** —— 任何仓的 project/local 设了就静默压过你（V1/V4/V5） | 仅次于 policy/flag（均无，V3 基线）。**压过 projectSettings** → 对母版公开仓的 V5 通道免疫 |
| 暴露面 | — | `.gitignore:88` 已挡，不进任何仓（V18） |
| 影响面 | 全机器所有仓（含 code-\*）→ 触发 V11 的污染 | **只有 fork** |
| 要不要动全局配置 | 要（`feedback_no-auto-edit-global-claude-config` → 必须 luca 手粘） | **不要** |
| 改名 | — | **不击穿**（配置随目录走）。symlink 会击穿，而改名正是 M1 的死因 |

**代价（诚实计价）：**

1. **索引 26 → ≈36 条**，直接加剧「person 层 MEMORY.md >20 条」那条已复读 11 天的 flag。其解药 `SC-20260630-001`（按价值剪）已 stale 15 天。→ **§5 卡点 4，不自答。**（注：这是治理/质量问题，**不是** harness 上限问题 —— V14 证明离闸很远。）
2. **fork 旧 store 冻结**为考古 + 回滚点。
3. **归属信息**：合并后无法再从目录名区分"这条学在母版还是 fork"。**但这正是设计意图** —— 按 CLAUDE.md 三分表，person 层 = 「跟项目无关、只关于 luca 怎么工作」，本就不该按仓分；muse 专属事实的正确落点是 `.luca/memory/`，不是 person 层。**code-\* 的归属完全不受影响**（不碰）。→ 这条我判断可自答（有框架既有规则依据），故不进卡点。
4. **回滚**：删 key → fork 退回自己的库。切换后新写的事实落在母版 store —— 而母版 store **本来就是**框架的 canonical，故不存在 v0 那种"新记忆无法分拣回各仓"的单向门。**回滚在本案是真便宜的**，因为目标是既存的、已被治理的库，不是新造的库。
5. **新机器 / 新 clone**：`settings.local.json` 是 gitignored → 不随 clone。新环境需重设。**这是真限制**（§6）。

---

## 4. 断言

> 纪律：**每条必须真能抓到它声称抓的失败模式，且有具名执行者。**
> **v0 的 A5（行数/字节上限闸）在本案被删除，不是被改进** —— V14 证明它测的上限不存在，留着只会逼 luca 为幻影删真记忆。**写不出就不写。**
> 设计原则：**不重导真值。** 断言只观察**症状**（谁被写了），不复制 `KFh()` 逻辑 —— 否则就是亲手制造 S2 那个"真值散成 N 份副本"的病。

| # | 抓什么失败模式 | 怎么抓（真能抓到的理由） | 谁跑 / 接进哪里 |
|---|---|---|---|
| **A1** `[BLOCKING]` 验收 | key 打错 / 未生效 / 被 policy·flag 压过 / harness 升级改行为 → **fork 仍读旧库，且静默**（`mHc()` 不校验存在性，harness 会 `mkdir` 替你把错目录造出来 → 光看配置文件永远发现不了） | 母版 `MEMORY.md` 末尾放一条稳定 canary 条目；**从 fork 仓根跑 `claude -p` 要回该串**。**这就是我本次用来清 KILL-1 的同一个实验，且 control 已证明它能失败**（V3） | **执行切换的人当场跑**（验收门）。新脚本 `scripts/check-person-memory-resolution.sh`（~15 行） |
| **A2** `[BLOCKING]` 每日 | 切换后 key 因**任何**原因失效（含 V6 那个残余：交互态信任丢失 → localSettings 被忽略）→ harness 静默回落 fork 自己的 slug 库 | **fork slug 库内不得出现 mtime > 切换日的文件。** 症状式：不管为什么坏，只要坏了，fork 就会重新往自己库里写 → 立刻可见。**这条正是 V6 残余的兜底** | `daily_governance.py` 的 `check_person_memory()` **+≈8 行 `issues.append`**。真执行者：每日首 session 后台跑（`.checked-<date>` 标记机制），且**它已经在读这个目录** |
| **A3** `[WARNING]` 每日 | fork 目录**再次改名** → 新 slug → 新库开始被写 → A2 盯的是旧 slug，抓不到（**这正是 M1 的死法**） | `~/.claude/projects/*/memory` 中出现 allowlist 外、slug 含 `gstack`/`muse`、且新近被写的库 → 告警 | 同 `daily_governance.py` |
| **A4** `[BLOCKING]` 触发式 | Claude Code 升级改变 `KFh()`/`Ry()` —— **本方案唯一的外部依赖** | `daily_governance` 记录上次见到的 CC 版本；版本变了就把「person-memory canary 待重跑」写进 digest | `daily_governance.py` 发提醒（真执行者）；luca 见 digest 跑 A1。**诚实：这是提醒不是阻断** —— governance 不该 spawn claude（会递归），我做不到自动阻断，也不假装能 |
| **A5** `[BLOCKING]` 验收 | 归并漏文件 / 同名覆盖 / alias 双胞胎判错（**v0 的 A6 对"归并判错"结构性失明，实跑 19 次静默覆盖只抓到 1 对**） | fork store **每个**文件的 sha256 必须在 canonical 中存在，**或**在「已人工合并」清单内（当前恰好 1 条：aliased 双胞胎）。**哈希天然抓覆盖**（内容不同 → 哈希不在 → FAIL）。**全文件枚举，不用 `feedback_*` 前缀** —— V13 证明前缀会漏掉真记忆 | 执行者当场；新脚本 `scripts/check-person-memory-merge.py` |
| **A6** `[BLOCKING]` 验收+每日 | `MEMORY.md` 索引行指向不存在的文件 → **静默丢召回**（索引在、文件没了，模型永远查不到） | 每条 `- [x](y.md)` 的 `y.md` 必须存在；且合并后条目数 == 母版原有 + fork 新增 − 已登记 alias 合并数（**条目守恒，堵住 v0"数据被清空却报绿灯"**） | 执行者当场 + `daily_governance.py` 每日复跑（悬空链接是长期风险，不止切换期） |

**为什么这次不是"纸上断言"**：A2/A3/A4/A6 接进 `daily_governance.py` —— 一个**已经每天真的在跑、且已经在读这个目录**的执行者。A1/A5 是验收门，由执行者当场跑。**没有一条 `[BLOCKING]` 挂在占位符上**（v0 的 A4 原文是「此处为门控占位」）。

**执行者的真实性质（实测，附一条顺带发现）：**
```
memory/digests/.checked-2026-07-16   mtime Jul 16 09:49      → 今天真的跑过
.claude/hooks/session-restore.mjs:267  spawn daily_governance.py  → 唯一真实触发点
scripts/launchd/com.luca.memory-governance.plist                  → 仓内存在
launchctl list | grep memory-governance                           → 空
ls ~/Library/LaunchAgents/com.luca.memory-governance.plist        → No such file
```
→ **执行者是 session 触发的，不是挂钟触发的**：不开 session 就不检查。对 A2/A3 够用（key 坏了必然是在开 session 时坏的，而 fork/母版 session 都会触发、共用母版的 `.checked-` 标记）。
→ **顺带发现（非本案引入，不夹带处理）**：仓里那个 launchd plist **从未被安装**。它给人一种"治理有定时任务在跑"的错觉，实际调度完全依赖开 session。**我只登记，不在本案顺手改**（§6）。

---

## 5. 人类卡点（只有 luca 能定，我不自答）

1. **框架建设预算。** 软上限 2 次/月。我**没能测出可信数字**：`episodic/index.jsonl` 里根本没有"是否纯框架 session"这个字段 —— 7 月共 34 条，其中 17 条无 `project` 字段（其余 muse 12 / todo-capsule 4 / mobile-list 1）。红队报 19 条 ≈9.5×。**任何数字都是推断而非测量，这正是它归你的原因。** 本案是否值得再花一次？
2. **前作「只收尾 + 提案，不改框架代码」的范围拍板是否解除？** 本案 = 1 个 gitignored 配置 + 10 次文件复制 + `daily_governance.py` ≈+20 行 + 2 个小脚本。**本文默认拍板仍然有效 → 因此本案是提案，我没有执行任何一步。** "深度评估解决掉了"不是我能替你宣布的。
3. **scope=A 的裁决效力。** 你是在 v0 那个"canonical 放公开仓"的错误路径信息下选的 A；而 V11 现已证明 A 唯一的承重论证（"project 事实仅 5 个"）用的尺子无效。**我在此推翻 A。** A 作废后是否采纳 M（只并 gstack 家族 2 库），还是回到 §1.2(b) 只止血 —— 你定。
4. **索引 26 → ≈36 条：先剪枝再并，还是同批做？** `SC-20260630-001`（按每条价值剪、不为凑数字剪）已 stale 15 天，是这条 flag 的解药，两者互等了 11 天。**不先定这条就归并 = 拿一个已知问题去喂另一个已知问题。**
5. **sync watcher（`tengu_moth_copse`）。** person 记忆可能因服务端翻一个 flag 而被同步，且 bundle 原文称服务端有写权（"a future session with the store mounted will overwrite it with server content"）。**开关不在你手里。** 这是**现状**风险（母版 store 今天就是同步目标），本案只让靶值 +13%。**诚实边界：我没端到端追通 discovery 能否单独填充某个 store —— 所以我不替你判"增量可忽略"。** 接受 / 另案 / 现在就做点什么？
6. **要不要 pin `autoDreamEnabled: false`？** `Puo()` 里 `zn().autoDreamEnabled !== undefined` 会钉死、绕过服务端 gate；可写进同一个 localSettings。**我的判断是不必**（归并是 10 次文件复制、秒级；V17 显示它从未跑过），但这是关掉一个官方功能、且是你的数据 → 你定。
7. **既成公开泄露。** 母版仓 PUBLIC 且 `memory/` 被跟踪（红队量化 8 文件 ≈180 KB，含 episodic index 与 semantic archive；`.gitignore` 挡了 live 却没挡 archive）。**与本案无关**（本案不碰仓内 `memory/`；person store 不在任何仓内，V9）。但既然掀开了：另案处理？注意 **git 历史 64 commits 不可删**，删文件 ≠ 删历史。
8. **母版侧的 projectSettings 覆盖通道。** V5 证明 schema 那句 "for security" 是假的，而母版 `.claude/settings.json` **被跟踪且在公开仓**。今天无人设该 key → **零在场危害**。本案对 fork 免疫（localSettings 压过 projectSettings），**母版不免疫**。要不要另案加防护？
9. **`SC-20260715-005` 仍是 `CANDIDATE`、reviewer=luca、原文未改**，其 fact 含「唯一真·harness限制是『目录名由cwd派生、不接受env覆盖』」——**两处均已被我实证推翻**（V7：派生自 projectRoot；V8：env 覆盖 `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` 确实存在且优先级最高）。**风险：本案 review 期间跑一次 daily_governance → 你在 digest 点头 → 一条已知错误的事实进 `promoted-facts.yaml`，此后每 session 注入。** 要不要现在 `--supersedes` 重提修正版？（`SC-20260715-006` 关于 S1 的内容我复核无误，不受影响。）

---

## 6. 本方案不治什么

| 项 | 状态 | 说明 |
|---|---|---|
| **S1**（`--summary` 注入全硬盘最后一个 session 的 next_risk，零归属过滤） | ❌ **不治** | `get_memory.py:154-166` 的独立 bug，与 person 层分裂无关。**昨案标 🔴 且「当天真咬人」，至今仍活。** —— **我必须把这个对比摆在你面前：一个已确认在咬人的 🔴 无人管，而本案是 🟠 的组织问题。我不替你排优先级，但你不该在看不到这行的情况下批本案。** |
| **S6**（fork 仓内 `memory/` 是 7-09 死数据） | ❌ 不治 | `MEMORY_ROOT` 层，与 `autoMemoryDirectory` 两条机制不相交，另案 |
| **S8**（slug 碰撞） | ⚠️ **部分** | 对 fork **消失**（不再走 slug 派生）；对其余 17 个库**依然在**。**v0 说"自动消失"是 over-claim** —— 它只对被覆盖的那个仓消失 |
| **code-\* 等 15 个库的"分裂"** | ❌ **不治，且主张不该治** | V11：它们是 per-repo 项目档案，harness 的 per-repo 设计对它们**正确工作**。并进全局注入面 = 污染 + 判它们失联 |
| **改名成不含 `gstack`/`muse` 的路径** | ⚠️ **残余盲区** | A3 靠 slug 关键词，抓不到。A1 重跑能抓，但 A1 非每日。**我不假装这里闭合了。** |
| **新机器 / 新 clone** | ⚠️ 真限制 | `settings.local.json` gitignored → 不随 clone，新环境需重设。**但 A1 会在新环境 FAIL → 至少不静默** |
| **既成公开泄露 + git 历史** | ❌ 不治 | §5 卡点 7 |
| **母版侧 projectSettings 覆盖通道** | ❌ 不治 | §5 卡点 8 |
| **两个死库（7 文件，含 M1 约定文档）** | ❌ 不治 | 考古；要捞另说 |
| **S7**（`.bak` 垃圾、含空格文件名） | ⚪ 顺手 | 母版 store 确有 `MEMORY.md.bak` 与 `MEMORY.md.bak-       1`。可清可不清 |
| **未安装的 launchd 治理任务** | ❌ 不治，只登记 | `scripts/launchd/com.luca.memory-governance.plist` 在仓里但从未安装（§4 实测）。治理实际只靠开 session 触发。**与本案无关，不夹带**；但它意味着"每日治理"比字面上更依赖 luca 开 session |

---

## 7. 我可能错在哪

> **纪律：本节每条要么给出已执行的处置，要么指向 §5 的编号卡点。没有一条是"写下来然后继续往下写"。**
> **v0 死于把"我知道我在犯错"当成"我可以继续犯"的许可证。如果 reviewer 在本节找到任何一条只是披露而无处置 —— 那条就是本版的死因，请直接判死。**

1. **V4/V5 跑在 `-p`，信任门被 `pn()` 自动打开**（V6）；luca 的交互 session 走 `qd()`。
   → **处置**：实测两仓 `hasTrustDialogAccepted=true`，`t3y()` 据此提前返回 true → 交互态门同样开。**残余**（我没真跑交互 session）**由 A2 兜死**：信任若丢失 → localSettings 被忽略 → fork 回落自己的库 → A2 每日抓到。**不是遗留未知。**

2. **我用"母版 store 已是 sync 靶心"论证增量风险小。** 若 discovery 只填充特定 store，或 team store（`gH()`）与 person store（`Ry()`）行为不同，"+13%"就不准。
   → **处置**：**我没端到端追通 discovery（红队也没有）→ 因此我不作这个判断，整条升级为 §5 卡点 5，不当既定前提往下写。**

3. **`code-*` 库我只看了标题结构，没逐字读全文**（避免把私密内容拉进本 session 与本文）。若某库混着 person 事实，"不该治"对那部分就是错的。
   → **处置**：不影响本方案（**本方案根本不碰 code-\***）。但我因此**不作**"person 事实全在 gstack 家族"这个强断言 —— 只作弱断言「code-\* 主体是项目档案、不应并入全局注入面」，V11 的标题结构证据足以支撑该弱断言。

4. **1.2(b)「只止血」可能才是对的答案。** 我倾向 (e)，但 (e) 比 (b) 多消耗一次框架预算，而预算已可能透支 9.5×。
   → **处置**：**不自答** → §5 卡点 1 + 3，且我在 §1.3 明确写了"若 luca 选 (b)，我不会争"。

5. **本案的价值全部押在"canonical = 母版 store"这一个判断上。** 若 luca 其实想要一个仓外的、可版本化的 person 库（v0 的 P3 动机），本案给不了。
   → **处置**：明确承认边界。但 P3 的动机（隐私+版本化）在 V9 下失去前提 —— 母版 store 已不在 iCloud/git 内，隐私目标**已经达成**；版本化是新需求，不是本案要解的问题。**若 luca 确实要版本化 → 那是另一个提案，本案不夹带。**

6. **`tp`/`D0`/`_9e` 内部我没追。**
   → **处置**：对本方案**不承重**（本方案覆盖派生路径，不依赖它）。已在 V7 就地标注，未用于任何论证。

---

## 8. 与昨案 / v0 / 候选的关系

- 昨案 **S1–S7 裂缝分析维持**（扎实，不重述）；其 §4「唯一真·harness 限制 = 不接受 env 覆盖」**作废**（V7/V8）；其 §6 方案表中 **B(symlink) 的死因需要更正** —— 它不是"补偿不存在的约束"（红队对，是株连），但它**自己确实有改名击穿的洞**，故本案仍不选它，理由是 §1.2(d) 而非株连。
- v0 **§3 的隐私发现是真发现且有价值**（它逼出了 V9/V10 这条轴），但它给出的三个选项全部在解决它自己制造的问题。
- 红队的**致命 1/2/3 与 F1/F5 我独立复核后全部采信**（V16/V10/V11）；其"送审稿核心结论对"我也复核成立（V1/V3）。
- 本案遵守昨案 §6「不再用约定文档修结构问题」：修法是一个 key（机械），守护是 A1–A6（**有具名执行者，接进每日真在跑的 `daily_governance.py`**）—— 而不是"把断言留在纸上"。

<!-- FILE_END: 2026-07-16-person-memory-plan-v1 -->
