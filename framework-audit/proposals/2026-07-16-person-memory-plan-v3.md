# person 记忆层 —— 方案 v3

> 状态：**提案。本 session 对两个 person store 的写入 = 0**（§2 V0，带可失败 control）。
> 前置：昨案（S1–S7 继承）、v0/v1/v2（均判死）、v2-REDTEAM（14 项）。
> 环境：Claude Code `2.1.211`。

---

## 0. 相对 v2，我改了什么关键决定

| | v2（判死） | **v3（本案）** |
|---|---|---|
| **归并动作** | 「合并两侧内容 + 统一命名 + 索引人工合并 → 34」——3 处人工裁决 | **整个删除。** 只剩两个**结构上无法丢数据**的算子：`cp -n`（不能覆盖）+ `append`（不能删行）。**不合并、不改名、不去重、不删除** |
| **防丢失的手段** | 用断言去**验**一次有损人工归并 | **换成算子本身。** 有损归并验不了（红队用 6 条独立发现证明了这点）；**唯一的出路是不做有损归并** |
| **断言形态** | **绝对**门（`条目数 == 归一化并集`、`fork 每行必须在 T 中`）→ 两门互斥、无交集解 | **全部改成差分门**（pre/post）。**互斥的根因是绝对门 + 脏基线**：canonical 本来就有 7 个孤儿，任何绝对门都会因既有欠债在一次正确操作上 FAIL |
| **canonical 备份** | **零**（红队 2 条严重项）。而唯一被实质改写的就是 canonical | **改 canonical 前先 `cp -R` 到时间戳目录**。1 条命令。v2 全文 `备份/backup` 0 命中 |
| **key 的部署 scope 验证** | 「V3 已在部署 scope 实测通过」 | **我没能验成。**权限闸两次拒绝我起嵌套 claude（§2 V3）。**我不接受 v2 的转述，所以本案把 key 记为「我未验」** → 它是个赌注 → 执行者是 luca → 失败是 no-op |
| **收益** | 「31 条母版教训 fork 看不见」 | **量错了尺子（红队对）。实测：key 单独上，fork 净得 +15，且会先丢自己 8 条。**「31」量的是文件数，投递面是索引条目 |
| **方案粒度** | 一个单体（key + 归并捆死） | **拆成 M3-0 / M3-a / M3-b 三级阶梯**，每级独立可裁、独立有价值、有硬性顺序约束 |
| **sync 门链** | 盯 `y9e()`/`moth_copse`，并告诉 luca「开关不在你手里」 | **v2 盯错了表盘（红队对，我亲自复核）。**真门是 `tengu_haze_glass`，且**本地 kill switch `CLAUDE_CODE_DISABLE_ORG_MEMORY` 就在同一函数第一行**（§2 V4） |
| **v1 残留** | 「不是我的 session，我只报告不删」 | **是本 session 家族的（红队对）。目录名内嵌本 session 的 scratchpad id。已删**（§2 V0）。规则护的是**别人**的 session，不是我自己的垃圾 |

**我主动放弃的：**
1. **归并本身**（v2 的核心动作 3）。**不是改进它，是删掉它。** 有损人工归并无法被断言保护——这是红队 6 条发现的共同结论，我采信。代价：canonical 会留下 **1 对可见的重复条目**（alias 双胞胎），我不替 luca 静默解决它。
2. **「我能验 key」**。两次被拒后我不再声称。**读代码 ≠ 观测运行时**（`verify-runtime-not-spec`）。
3. **「31 条」这个收益数字**，以及一切 v2 用它推出的倾向。
4. **一切每日守护**（同 v2：必须改 `daily_governance.py` = 双仓框架代码 = 拍板禁止）。**我不写空壳 `[BLOCKING]`。**
5. **scope=A**（已死，不 re-litigate）。

---

## 1. 前提门：该不该做 / 更小替代

### 1.1 在场代价（我逐条实测，剔除自造证据后）

| 事实 | 实测 |
|---|---|
| **1 条候选自 07-11 起孤儿，治理面从未见过** | `candidate_feedback_grep-cjk-silent-false-negative.md`，只在 fork。`daily_governance.py:241` `gdir.glob("candidate_feedback_*.md")`，`gdir` 实测解析到母版 store |
| **S4：4 条 session 隔离教训母版独有，fork 是唯一适用现场** | 07-15 fork session 真犯了其中一条（昨案 §2.3）。**这是唯一一次有实证的复发** |
| **alias 双胞胎「漂移」** | **我实测后要给它降级**：`diff` 出来的全部差异 = `metadata:` 尾随空格 + `originSessionId` + **一条交叉引用**。母版版有 `[[feedback_commit-muban-if-changed]]`，fork 版没有——**因为 fork 根本看不到那个文件**。这不是内容分叉，是**分裂病在内容里的投影**，且**母版版是 fork 版的实质超集** |
| **canonical 有 7 个内容孤儿（在盘、无索引条目 → 永不注入）** | 红队新发现，我复核**成立**：`feedback_evidence_grounded_debate` / `figma-batch-calls` / `logic-not-screenshot-captions` / `run-tests-before-claiming-done` / `systematic-not-whackamole` / `deliver-content-directly-when-viewer-fails` / `verify-with-real-evidence-before-reporting` |

**我在此纠正红队一处取证过头（有证据，非嘴硬）：** 红队称其中 **2 条「NEVER-INDEXED、从未有过条目」**，依据是它们不在 `MEMORY.md.bak`。但**该 .bak 的 birth = 06-24，而这 2 条的 birth = 06-30 与 07-09 —— 它们出生时快照早就拍完了**。快照对它们**沉默**，推不出「从未有过条目」。
可靠的只有：**5 条**（birth 均早于 06-24 且在 .bak 中）→ **06-24 之后被移出索引**，这是实测。另 2 条：**此刻是孤儿，历史未知。**
→ 这个区别不是学术的：**它决定了卡点 3 是「你当初是不是故意剪的」还是「写入协议漏了半步」。我不替你猜。**

### 1.2 更小替代（逐个认真比）

| 选项 | 治什么 | 判断 |
|---|---|---|
| **(a) 什么都不做** | — | 那 1 条孤儿候选继续对治理隐形（已 5 天） |
| **(b) M3-0：`cp -n` 那 1 条孤儿候选 → canonical** | 让治理看见它 | **1 条命令。零索引改动、零人工裁决、零毁坏可能、零 harness 未知数。** 治理按**文件名 glob**找候选（实测 `daily_governance.py:241`），**根本不经过索引** → 这条不碰那个有争议的、被剪过的策展面。**这是我唯一会推荐执行的一级** |
| **(c) M3-a：`cp -n` 10 文件 + append 9 索引行** | 让**母版** session 看见 fork 的 10 条教训 | 无损、可验、**不依赖 key**。但索引 26→35，**撞上那条已复读 11 天的 >20 flag，而它的解药 stale 15 天** → 卡点 3 |
| **(d) M3-b：fork localSettings 一个 key** | **S4**（fork 看见母版的教训） | **只有这条治 S4——而 S4 是唯一有实证复发的。但我没能验它**（§2 V3）。失败 = fork 退回自己的库 = 现状 |
| **(e) 镜像法：把母版文件复制进 fork store** | S4，且**无 harness 未知数** | 诚实登记：v2 说「双写已被证伪」，但**我实测那次 5 天「漂移」只是元数据 + 一条交叉引用**。它是**永久人工税**，但它**不需要任何未验证的机制**。**若 luca 不接受 (d) 的未验状态，(e) 是 S4 的备胎** |

### 1.3 我的判断

**M3-0 我推荐（1 条命令，治一个正在发生的、可测的伤）。M3-a / M3-b 我不推荐也不反对——它们卡在三个只有你能定的问题上（§5 卡点 1/2/3），而且我把话说白：**

- **M3-b 是本案唯一治 S4 的一级，而 S4 是唯一有实证复发的裂缝。但我没能验它。** 我不会拿 v2 的转述当自己的证据。
- **「维持现状」是本案的合法结论。** 在场伤害是：1 条候选隐形 5 天 + 1 次 S4 复发。这要不要花掉 7 月第 20+ 次框架 session，**是你的预算不是我的**。

---

## 2. 我亲自实证的证据

> 全部本人执行并观察。**方法论前置（v2 踩过、我今天也差点踩）：** 本机 `grep` 是 shell snapshot 里的 **ugrep 影子**（`type grep` → `shell function from .../shell-snapshots/...`）。我第一次 grep bundle 时它报 `maximum repetition exceeds 255` 并**返回空** —— 若不看 stderr 就会被读成「无命中」。**本文所有 bundle grep 均用 `command grep`。**

### V0 — 副作用审计（带可失败 control）

| 动作 | 处置 | 复核 |
|---|---|---|
| `<fork>/.tmp-probe-v3` 探针目录 + 嵌套 git 仓 | 已删 | `git -C <fork> status --porcelain` → **空** |
| `~/.claude.json` | **未新增任何 key** | projects keys **5 → 5，逐 key 与实验前逐字一致** |
| probe transcript 目录 | **从未产生**（claude 未起成，见 V3） | `command find ... -iname '*probe-v3*'` → 空 |

**两个真 person store 零写入** —— 探针带 control：
```
command find <母版store> <fork store> <scratch> -newermt "2026-07-16 13:00" -type f
  → 只列出 <SCRATCH>/... 6 个文件（含我故意 touch 的 .canary-control）
  → 两个真 store 一个文件都没有；同一条命令能返回非空 = 探针非瞎
```

**已清理（v2 拒绝清的）：** `...-72da83e0-...-scratchpad-repoA/{3 份}` + `repoB/{1 份}`，96 KB。**目录名内嵌 `72da83e0-fa7a-4ab2-b756-ee92592ae820` = 本 session 的 scratchpad id** → 是本 session 家族造的。v2 援引 `feedback_stay_in_session_scope` 免于清理——**那条规则护的是并行的他方 session，不给自己的垃圾发豁免**（红队对）。
**未动（真不是我的）：** `...-5b129d9d-...-scratchpad` —— 另一个 session id，规则在此**正确适用**。

### V1 — 解析链（`command grep`，本人读）

```js
function KFh(){let e=CPe(),
 t = Rr("policySettings")?.autoMemoryDirectory
  ?? Rr("flagSettings")?.autoMemoryDirectory
  ?? (e ? Rr("localSettings")?.autoMemoryDirectory ?? Rr("projectSettings")?.autoMemoryDirectory : void 0)
  ?? Rr("userSettings")?.autoMemoryDirectory;
 return mHc(t,!0)}
```
→ **localSettings 在信任门 `e` 分支内，压过 projectSettings，早于 userSettings。** 这是本案要部署的分支。
**基线（本人实测）：** `autoMemoryDirectory` 在**全部 6 个在盘 settings 文件**中均 `<unset>`；两处 managed-settings **均不存在** → 今天 `KFh()` 返回 undefined。

### V2 — 数据真相（本人实测）

```
母版 39 文件 / fork 16 / 共有 6（精确同名）/ 仅 fork 10 / 仅母版 33
共有 6 中：IDENTICAL ×4，DRIFTED ×2 → MEMORY.md(13771 vs 2862)、symptom-first(2570 vs 2629)
索引：母版 26 条 / fork 11 条；精确同名重叠 2；归一化(-/_)重叠 3
canonical 内容孤儿（在盘无条目）：7   ← 红队新发现，复核成立
两侧悬空条目：母版 0 / fork 0
```
**收益台账（红队对，v2 的「31」是错的）：**
```
v2 的尺子（仅母版文件数）        : 33
fork 今天的索引                  : 11
canonical 今天的索引             : 26   ← key 单独上时 fork 实际会看到的
  → key 单独上：fork 净得 +15，且【先丢自己 8 条】(它自己索引里、canon 索引没有的)
  → 故 M3-a 必须先于 M3-b。这是硬顺序约束，不是偏好。
```

### V3 — **部署 scope 验证：我没做成（诚实登记）**

我按 v2 的思路搭了探针：fork 内嵌套 git 仓（→ 自己的 projectRoot/slug）+ `settings.local.json` 放 key + 哨兵 store，用 **PTY** 起交互态 claude（`isInteractive=true` → `pn()=false` → 信任门真求值）。**机制隔离已做实**：
```
probe 自己的 trust key : 不存在        → t3y() ④ 必然 miss
<fork> 的 trust key    : True          → 只能由 ⑤ 祖先遍历给出信任
/Users/luca 的         : False         → 遍历不能一路作弊到 home
```
**然后权限闸拒绝了我两次**：① 第一次因我在起子进程前 pop 掉了 `CLAUDE_CODE_DISABLE_ORG_MEMORY`/`CLAUDE_MEMORY_STORES`（我的本意是清基线，但**剥离 kill switch 该被拦**——我改成继承 env 原样，不再剥离）；② 第二次因「PTY 注入按键、无人值守地起一个嵌套 claude = 新的自主 agent 循环，不在任何监督面内」。**第二条是结构性反对，不是措辞问题 → 我停手，不绕。**

**后果，我不粉饰：**
- **`localSettings.autoMemoryDirectory` 在部署 scope 是否真生效，我没有观测证据。** 我只有**自己读的代码路径**（V1）。按 `verify-runtime-not-spec`，**代码不是运行时，我不打包票。**
- **我不采信 v2 的 V3。** 铁律说不接受转述；v2 恰恰是被「验证 scope ≠ 部署 scope」判死的那一版，我不能反手拿它的实验当我的证据。
- → **M3-b 是一个赌注。** 处置**不是**披露后照写：**它在阶梯里被排到最后、它的验证执行者写成 luca 本人、它的失败模式经设计是 no-op（fork 退回自己的库）。**若你不接受赌注，§1.2(e) 镜像法是 S4 的无未知数备胎。**

### V4 — sync 门链：**v2 盯错了表盘**（红队对，我亲自复核）

```js
async function HDg(){ if(!qd())return; if(!XGt())return; ... }     // ← watcher 真入口。y9e()/moth_copse 不在链上
EDg=yfe(async()=>{
  if(ye.CLAUDE_CODE_DISABLE_ORG_MEMORY)return null;                // ← 本地 kill switch，第一行
  if(Yl())return null;
  if(!et("tengu_haze_glass",!1))return null;                       // ← 真正的远端门
  if(process.env.CLAUDE_MEMORY_STORES?.trim())return null;
  ... })
```
**实测缓存值**（`~/.claude.json`，411 个 flag，cachedAt 2026-07-16 12:29:21）：
```
tengu_haze_glass  : False     ← 真门关着 → discovery 不跑 → 今天 sync 是关的
tengu_moth_copse  : False     ← v2 盯的这个，不在 watcher 链上
tengu_onyx_plover : {enabled: False, ...}   → autoDream 今天关着
CLAUDE_CODE_DISABLE_ORG_MEMORY / CLAUDE_MEMORY_STORES : <unset>
```
→ **v2 的结论「今天 sync 是关的」碰巧对，理由是错的**（正是它给 v1 定的罪）。
→ **且 v2 告诉你「开关不在你手里」是错的：`CLAUDE_CODE_DISABLE_ORG_MEMORY` 就是本地 kill switch，在同一函数第一行、优先于一切远端 flag。** 你手里有闸。→ 卡点 4。

### V5 — canonical 的回滚通道：**零**（红队对，本人复核）

```
git -C <canonical> rev-parse --show-toplevel → fatal: not a git repository
tmutil destinationinfo                       → No destinations configured   ← TM 根本没配
ls ~/Library/Mobile Documents/com~apple~CloudDocs/.claude → No such file    ← 不在 iCloud 树
唯一历史副本：MEMORY.md.bak = 7,095 B / birth 06-24（今日 live = 13,771 B）→ 回滚它 = 丢 3 周
```
→ **v2 对 canonical 做破坏性原地改写，却零备份、零 VCS、零回滚，还写「回滚真便宜」。**
→ **v3 的处置有两层，缺一不可：**① **改前 `cp -R` 备份**（1 条命令）；② **算子本身不能毁坏**（`cp -n` + append）。**备份是保险，不是许可证。**

### V6 — 断言实跑：**co-satisfiable + 能抓**（红队 6 条致命的正面回应）

红队用 6 条独立发现证明 v2 的 A2/A3 **在真实数据上无交集解**。我在**真实两库的沙箱副本**上实跑（真库零写入，V0 已证）：

**TEST 1 — 规定算子（`cp -n` + append），四门必须同时绿：**
```
copied=10  appended=9  index 26 -> 35
A1 canonical-preserved    : PASS
A2 index-preserved        : PASS
A3 fork-arrived/recover   : PASS
A4 no-NEW dangling/orphan : PASS
>>> ALL GREEN: True        ← v2 结构上做不到的那个性质
```
**TEST 2 — 全绿的断言集一文不值，必须还能抓到红队找到的每一种毁坏：**
```
取 fork 版整份覆盖 drifted 文件（杀死 v2 A2 的那招）→ A1 FAIL (OVERWRITTEN)      ✅
母版独有文件被丢掉（v2 的 A2 结构性失明 → PASS）    → A1 FAIL (DELETED) + A4 FAIL ✅
「统一命名」丢掉一条母版索引行（杀死 v2 A2/A3）     → A2 FAIL (lost 1) + A4 FAIL  ✅
母版索引被 fork 的覆盖（13771→2862 那场灾难）       → A2 FAIL (lost 26) + A4 FAIL ✅
加一条指向不存在文件的索引条目                      → A4 FAIL (new_dangling)      ✅
塞一个没有索引条目的内容文件（静默隐形）            → A4 FAIL (new_orphan)        ✅
6/6 抓到
```
**我第一版 A3/A4 在 TEST 1 上 FAIL 了，我没有改数据去迁就它——我诊断了它：**
> **A3/A4 当时是绝对门，而基线本来就脏**（7 个既有孤儿）。绝对门会因**既有欠债**在一次**正确操作**上 FAIL —— **这正是 v2 全部互斥的根因，跟常数 36/34 无关。**
> **改法：四门全部差分化（pre/post）。** A4 从「无孤儿」改成「**无新增**孤儿」；A3 从「fork 每行必须在 T 中」改成「sha 到达 **或** 在共有清单上且**在冻结 fork store 里仍可捞回**」。→ TEST 1 全绿，TEST 2 仍 6/6。

---

## 3. 方案：三级阶梯（每级独立可裁）

> **总纲：删掉有损归并。** 只用两个**结构上无法丢数据**的算子——`cp -n`（存在即跳过，**不能覆盖**）与 `append`（**不能删行**）。
> **不合并内容、不统一命名、不去重、不删除任何东西。** 代价明写在下面。

### M3-0 —— 止血（我唯一推荐的一级）
```
cp -n <fork>/candidate_feedback_grep-cjk-silent-false-negative.md <canonical>/
```
- **治**：那 1 条自 07-11 起对治理隐形的候选。
- **为什么零风险**：治理按**文件名 glob** 找候选（`daily_governance.py:241`，实测），**不经过索引** → **零索引改动、零策展争议、零 harness 未知数、零毁坏可能**（目标文件不存在，`-n` 无覆盖对象）。
- **回滚**：`rm` 那一个文件。fork 侧原件不动。

### M3-a —— 加性并库（**必须先于 M3-b**）
```
0. cp -R <canonical> ~/.claude/person-store-backup-2026-07-16/     ← 先备份，V5
1. cp -n <fork>/* <canonical>/                                     ← 10 个文件，不能覆盖
2. 把 fork 索引中【精确 target 尚不在 canonical 索引】的 9 行 append 到 canonical/MEMORY.md
3. fork 旧 store：原地冻结，不动 = 回滚点 + 可捞回面
```
- **治**：母版 session 看见 fork 的 10 条教训（**不依赖 key，今天就生效**）。
- **实测结果**：copied=10 / appended=9 / 索引 **26 → 35** / 四门全绿。
- **代价（诚实，不藏）**：
  1. **索引 26 → 35**，加剧那条复读 11 天的 >20 flag，解药 stale 15 天 → **卡点 3，我不自答。**
  2. **canonical 会留下 1 对可见的重复条目**（alias 双胞胎：`feedback_autocommit-*` 的下划线版与连字符版并存，各有条目、各有文件、不悬空）。**这是我拒绝做有损去重的直接代价。** 我实测过母版版是 fork 版的**实质超集**（fork 版只多 `originSessionId`），所以「删连字符版」大概率是对的——**但那是删除，是有损的，是你的数据。→ 卡点 5。我把它留成可见的丑，不静默替你解决。**
  3. `feedback_symptom-first-before-acting.md`：`cp -n` 跳过 → 母版版留存，fork 版**不被提升**（其独有的 `[[verify-runtime-not-spec]]` 交叉引用不进 canonical）。**fork 版仍在冻结 store 里可捞回**（A3 强制检查这一点）。

### M3-b —— key（**我未验的那一级**）
```
merge into <fork>/.claude/settings.local.json   （文件已存在、含 permissions → 合并不覆盖；.gitignore:88 已挡）
{ "autoMemoryDirectory": "/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory" }
```
- **治**：**S4** —— fork session 看见母版那 4 条 session 隔离教训（唯一有实证复发的裂缝）。
- **前置硬约束**：**必须先跑 M3-a**，否则 fork 净丢自己 8 条（V2 台账）。
- **状态**：**机制我未观测**（V3）。验证执行者 = **luca 的交互 session**（A5 canary）。
- **失败模式**：canary 红 → 删掉那行 → fork 退回自己的库 = **现状**。零数据后果。
- **改动面**：母版 git 仓 **零**；fork git 仓 **零**（gitignored，两仓 `git ls-files` 均 0）；母版 person store = M3-a 那些。

---

## 4. 断言

> 纪律：**每条必须真能抓到它声称抓的失败模式，且有具名执行者。写不出就不写。**
> **全部差分（pre/post）** —— 绝对门在脏基线上必然误伤，那是 v2 的死因。
> 实跑证据见 §2 V6：规定算子四门**同时绿**；6/6 毁坏场景**全部抓到**。

| # | 抓什么失败模式 | 怎么抓（真能抓到的理由） | 谁跑 / 接进哪里 |
|---|---|---|---|
| **A1** `[BLOCKING]` | **canonical 侧内容被毁**——含 v2 的结构性盲区：整份取 fork 版、母版独有文件被丢。**v2 的 A2 只遍历 fork 文件，对这一侧完全失明，两种毁法都报 PASS** | 归并**前**记下 canonical 每个文件的 sha256；归并**后**逐一比对：**除 MEMORY.md 外，一个都不许变、一个都不许少**。`cp -n` 保证它可满足，A1 保证它被验证 | **执行 M3-a 的人当场。**一次性脚本放 scratch，**不进仓**（→ 不触发 parity/双仓）。**实跑已验**：两种毁法各自 FAIL |
| **A2** `[BLOCKING]` | **canonical 索引行被毁**（红队致命 #1：正确归并反而销毁 3 条更丰富的母版索引行；以及 13771→2862 覆盖） | 归并前抓下 canonical `MEMORY.md` **每一条索引行**；归并后**每一条都必须仍在**。append-only 保证可满足。**与 A1/A3/A4 无交集冲突——因为本案不去重、不改名，v2 的互斥源头被删掉了** | 同上。**实跑已验**：丢 1 行 → FAIL(lost 1)；被覆盖 → FAIL(lost 26) |
| **A3** `[BLOCKING]` | **fork 侧内容没到位或不可捞回** | fork 每个文件：`sha256 ∈ canonical` → PASS；**否则**必须①在共有清单（6 个精确同名，canonical 版按设计保留）**且**②**在冻结 fork store 里仍在**（= 可捞回）。**②是真保证**：不是"不检查"，是"证明它没消失，只是没被提升" | 同上。**实跑已验**：规定算子 PASS |
| **A4** `[BLOCKING]` | **新增**悬空（条目在文件没 → 静默丢召回）/ **新增**孤儿（文件在条目没 → 静默不注入，即 S4 那个病本身） | 归并前后各算一次孤儿集与悬空集，**只看差集**。**必须是差集**：canonical 已有 7 个既有孤儿，绝对门会在正确操作上恒 FAIL（我第一版就栽在这，见 V6） | 同上。**实跑已验**：塞 ghost 条目 → FAIL(new_dangling)；塞无条目文件 → FAIL(new_orphan) |
| **A5** `[BLOCKING]` | **M3-b 的 key 没生效**（打错/被压过/新机器无此文件/机制根本不成立）→ **fork 仍读旧库且静默**（`mHc()` 不校验存在性；harness 会 `mkdir` 替你把错目录造出来 → 光看配置文件永远发现不了） | canonical `MEMORY.md` 末尾放一条 canary 条目；**在 fork 里开一个交互 session 问它看不看得见** | **luca 本人，交互 session。**←**这条我不能自动化，且我已被证明不能**：`claude -p` 令 `pn()=true` → `CPe()` 短路 → 结构上验不到信任门；而 PTY 路线**被权限闸两次拒绝**（V3）。**部署 scope 只有他的 session 是。**切换当场 + harness 大版本升级后各跑一次 |

**本方案明确没有的守护（不掩饰）：**
- **key 在两次 A5 之间静默失效**（文件被删/覆盖）→ **无检测**。
- **canonical 侧丢失**（ant_profile 那种：从两库同时蒸发、零告警）→ **无检测，且 M3-a/b 之后 canonical 更接近唯一活跃副本 → 风险变大**。备份只护**这一次**操作，不护未来。
- 二者都要每日执行者 = 改 `daily_governance.py` = 双仓框架代码 → **卡点 2**。**我不写空壳，也不拿「提醒」冒充「阻断」。**

---

## 5. 人类卡点（只有 luca 能定，我不自答）

1. **框架建设预算。** 软上限 2 次/月。红队报 7 月 ≈19 条 → **9.5×**，本案是第 20+ 条。**我无法独立测出这个数**：`episodic/index.jsonl` 里没有「是否纯框架 session」这个字段，任何数字都是推断不是测量。**本案值不值得再花一次？**（**注意**：M3-0 是 1 条命令；M3-a/b 才是"一次 session"。这三级可以分开花。）

2. **前作「只收尾 + 提案，不改框架代码」的拍板是否解除？** **本文默认它仍然有效 → 所以本案执行了 0 步。** `settings.local.json`（gitignored）算不算"框架代码"、`cp -n` 一个候选算不算"收尾"——**我不替你解释。** 另：每日守护（A1–A4 的复发版）**必须**改 `daily_governance.py`（双仓 byte-identical + parity 注册）——那明确是框架代码，本案已整个移出；要不要单独解禁，你定。

3. **索引策展：先剪枝还是先并？** 这条是 **M3-a 的上游，不是它的脚注。**
   - 实测：**5 条内容孤儿在 06-24 之后被移出索引**（在 06-24 的 .bak 里，现在不在）。**若那是你有意的剪枝，则索引是一个被策展的面，而 M3-a 把它 26→35 正是反着来。**
   - `SC-20260630-001`（"按每条价值剪、不为凑 >N 数字剪"）**stale 15 天**，正是「>20 条」那条 flag 的解药，两者互等了 11 天。
   - 另 2 条孤儿（birth 06-30 / 07-09）**历史未知**——可能是写入协议漏了半步（`CLAUDE.md:177` 要求文件+索引一起写，只做了前半），也可能不是。**我不猜。**
   - → **不定这条就跑 M3-a = 拿一个已知问题喂另一个已知问题。**

4. **sync watcher。** 实测**今天是关的**，但**理由和 v2 说的不是一回事**：真门是 `tengu_haze_glass=false`（远端），不是 v2 盯的 `moth_copse`。**且 v2 说"开关不在你手里"是错的——`CLAUDE_CODE_DISABLE_ORG_MEMORY` 是本地 kill switch，在 `EDg()` 第一行，优先于一切远端 flag。** 它仍是服务端可翻的值 → TOCTOU 结构不变。**接受 / 另案 / 还是现在就 pin 那个 kill switch？我不替你接受，也不替你决定要不要关掉一个官方功能。**

5. **alias 双胞胎的去重。** M3-a 之后 canonical 会有 1 对可见重复（下划线版 + 连字符版）。我实测母版版是 fork 版的**实质超集**（fork 版只多一个 `originSessionId`）→「删连字符版」大概率对。**但那是删除、是有损、是你的数据，而删除恰恰是本案通篇拒绝做的那件事。** 保留 / 你来删 / 授权我删？

6. **`SC-20260715-005` 仍是 `CANDIDATE`、reviewer=luca、`stable_requested=True`、原文未改**（我实测），其 fact 含「唯一真·harness 限制是『目录名由 cwd 派生、不接受 env 覆盖』」——**两处我都读到了反证**：派生输入是 `tp(rc())??rc()`（git root of projectRoot，非 cwd）；`hHc()` 读 `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` 且在 `Ry()` 里优先级最高。**险情是现在时**：`memory/digests/2026-07-16.md` 「⏳ 待你裁决」里就是它 + 可直接粘贴的 `--set-stable`。点一次头 → 已知错误的事实进 `promoted-facts.yaml`，此后每 session 注入。
   **为什么只能你做**（v2 实测过，我复核其判断成立）：`--supersedes` 只写一个字段、无退场逻辑；真正的仪器 `--reject` **强制 `--reviewer` 且原文写明"人工闸门审计留痕"**（`SC-20260523-003` 红线的执行面）→ **agent 署名 = 伪造人工审计。**
   （`SC-20260715-006` 关于 S1 我复核**无误**，**不要连坐**。）

7. **既成公开泄露。** 母版仓 PUBLIC 且 `memory/` 被跟踪（红队量化 8 文件 ≈180 KB；`.gitignore` 挡了 live 没挡 archive）。**与本案无关**（本案不碰仓内 `memory/`；person store 不在任何 git 仓内——我已验）。**但红队指出的第二条通道 v2 整个弄丢了，我替它放回来**：`~/Desktop` **就是** iCloud Desktop（红队 inode 实证）→ **任何只针对 git 的处置都会留一条完整未处理的泄露面**。诚实边界：**canonical 不在 iCloud 树内**（我已验：`~/Library/Mobile Documents/com~apple~CloudDocs/.claude` 不存在）→ **本案的动作本身不碰 iCloud**。另案？注意 **git 历史不可删**。

---

## 6. 本方案不治什么

| 项 | 状态 | 说明 |
|---|---|---|
| **S1**（`--summary` 注入全硬盘最后一个 session 的 next_risk，零归属过滤） | ❌ **不治** | `get_memory.py:161` 的独立 bug，与 person 层分裂无关。**昨案标 🔴 且「当天真咬人」。我必须把这个对比摆在你面前：一个已确认在咬人的 🔴 无人管，而本案是 🟠 的组织问题。我不替你排优先级，但你不该在看不到这行的情况下批本案。** |
| **7 条 canonical 内容孤儿** | ❌ **不治，且这是本案收益缩水的真相** | 它们在盘、无索引条目 → **在两个库里都永不注入**。**「事实在盘却不进注入面」正是 S4 那个病本身** —— 本案对它**只诊断不治疗**。红队对：A1–A4 **对这一类结构性全盲**（不在 fork → A3 看不见；差分门 → A4 按设计放行既有孤儿）。→ 卡点 3 |
| **归并后 canonical 单点丢失** | ❌ **不治，且本案让它变重** | ant_profile 已实证：从两库同时消失、从未进 digest、零告警。备份只护**这一次操作**，**不护未来**。要治需每日执行者 → 卡点 2 |
| **key 在两次 A5 之间静默失效** | ⚠️ **残余盲区** | 无检测。**我不假装这里闭合了。** |
| **M3-b 的机制本身** | ⚠️ **我未验** | V3：权限闸两次拒绝。**这不是"披露后照写"** —— 它被排到阶梯最后、验证者写成 luca、失败设计成 no-op、且 §1.2(e) 备了一条无未知数的替代 |
| **S6**（fork 仓内 `memory/` 是 7-09 死数据） | ❌ 不治 | `MEMORY_ROOT` 层，与 `autoMemoryDirectory` 两条机制不相交，另案 |
| **S8**（slug 碰撞） | ⚠️ **部分** | 对 fork 消失（若 M3-b 成立）；对其余 17 个库依然在 |
| **code-\* 等 15 个库的"分裂"** | ❌ **不治，且主张不该治** | 它们是 per-repo 项目档案（`#ff8000`、Figma Key、"用 pnpm 不要用 npm"），harness 的 per-repo 设计对它们**正确工作**。并进全局注入面 = 污染 + 判它们失联。**scope=A 已死** |
| **新机器 / 新 clone** | ⚠️ 真限制 | `settings.local.json` gitignored → 不随 clone。**但 A5 会 FAIL → 至少不静默** |
| **既成公开泄露 + iCloud 通道 + git 历史** | ❌ 不治 | 卡点 7 |
| **两个死库（7 文件，含 M1 约定文档）** | ❌ 不治 | 考古；要捞另说 |
| **另一个 session（`5b129d9d`）的 scratchpad 残留** | ❌ 不治，只登记 | **真不是我的** → `feedback_stay_in_session_scope` 在此正确适用。（**我自己家族那 4 份已删**，V0） |
| **未安装的 launchd 治理任务** | ❌ 不治，只登记 | `scripts/launchd/com.luca.memory-governance.plist` 在仓里但从未安装 → "每日治理"实际只靠开 session 触发。不夹带 |

---

## 7. 我可能错在哪

> **纪律：每条要么给出已执行的处置，要么指向 §5 的编号卡点。没有一条是"写下来然后继续往下写"。**

1. **M3-b 的机制我没观测到。**
   → **处置**：**不声称**。排到阶梯最后 + 验证者 = luca（A5）+ 失败 = no-op + 备了 §1.2(e) 无未知数替代。**若你不接受赌注，砍掉 M3-b，M3-0/M3-a 独立成立。**

2. **我拒绝去重，于是 canonical 会留 1 对可见重复条目。**
   → **处置**：**明写在 §3 代价 2 + 卡点 5。** 这是"结构上不可能丢数据"的**定价**，我把它标出来而不是偷偷替你解决。**丑但可见 > 干净但不可验。**

3. **A1–A4 我定义了、在沙箱实跑了，但没跑过真正的归并**（本案未执行）。
   → **处置**：**如实标注。** 我实跑的是**真实两库的副本**（TEST 1 全绿 + TEST 2 6/6），不是真库。若批准执行，A1–A4 必须在当场跑出绿灯才算数。

4. **我纠正了红队的「2 条 NEVER-INDEXED」。若我 birth time 读错，该纠正就错。**
   → **处置**：**这是算术不是判断**：`.bak` birth = 06-24；两文件 birth = 06-30 / 07-09。**晚于快照的文件不可能出现在快照里**，所以快照对它们无信息。**我只声称"历史未知"，不声称"它们曾被索引过"** —— 我纠正的是红队的**过度断言**，不是替换成我自己的过度断言。

5. **M3-a 的索引 26→35 可能整个方向就是错的**（若那 5 条是你有意剪的，索引就是策展面）。
   → **处置**：**不自答 → 卡点 3，且我把它写成 M3-a 的上游而不是脚注。** 若结论是"索引该剪不该长"，**M3-a 应当被砍掉或重做**，我不会争。

6. **`t3y()` 的 ①`CLAUDE_CODE_SANDBOXED` / ③`Pi()` 我没实测。**
   → **处置**：对本案**不承重** —— 它们只会让信任门**更容易开**，方向是安全的。已标注，未用于任何论证。

7. **§1.2(b)/(a)「只止血」或「什么都不做」可能才是对的答案。**
   → **处置**：**不自答 → 卡点 1 + 2。** 且我在 §1.3 明确写了：**M3-0 之外我不推荐，「维持现状」是合法结论。**

---

## 8. 与 v2-REDTEAM 的关系

**我采信并据此改了方案（不是记在纸上）：**
- **A2/A3 互斥（4 条致命 + 2 条严重，同一病灶）** → **删掉有损归并本身**，四门全部差分化。**根因我给了新诊断：绝对门 + 脏基线**（§2 V6，我自己第一版也栽了）
- **A2 单向、对母版侧失明（致命 + 严重各 1）** → **A1 就是那面镜子**，实跑抓到两种毁法
- **canonical 零备份 / 零 VCS（2 条严重）** → **改前 `cp -R`；且算子本身不能毁坏**
- **收益「31」量错尺子（严重）** → **§2 V2 台账重算：+15，且 key 单独上先丢 8。硬顺序约束由此而来**
- **7 条 canonical 孤儿（严重）** → **复核成立，进 §6「不治」+ 卡点 3**（不是脚注：它是 M3-a 的上游）
- **sync 门链读错（严重）** → **§2 V4 亲自复核，全采信，并补上 v2 说反的那句"开关不在你手里"**
- **iCloud 通道在 v2 蒸发（严重）** → **放回卡点 7**（含诚实边界：canonical 不在 iCloud 树内）
- **session 归属双标（严重）** → **实测目录名内嵌本 session id → 已删**（V0）

**我纠正红队的（有证据，不是嘴硬）：**
- **「2 条 NEVER-INDEXED、从未有过条目」——取证过头。** 依据是不在 06-24 的 .bak，但这 2 条 birth = 06-30 / 07-09，**晚于快照**。快照对它们沉默。**可靠的只有 5 条被移出索引。** 这个区别决定卡点 3 的问法。

**红队没看见的（本案新增）：**
- **治理按文件名 glob 找候选（`daily_governance.py:241`），完全不经过索引** → **止血可以零索引改动完成**（M3-0）。红队和 v2 都把"让治理看见候选"和"索引策展"捆在一起了，**它们不是一回事**
- **alias 双胞胎的「漂移」实质 = 各侧交叉引用只指向本侧看得见的文件**（母版版含 `[[feedback_commit-muban-if-changed]]`，fork 版没有）→ **不是内容分叉，是分裂病在内容里的投影，且母版版是 fork 版的实质超集**。v2 拿它当"双写不可持续"的铁证，量级被夸大了
- **本机 `grep` 是 ugrep 影子**：grep bundle 时报 `maximum repetition exceeds 255` 并**返回空** → 不看 stderr 就会被读成"无命中"。**v2 只警告了 `find`，`grep` 同病**

---

<!-- FILE_END: 2026-07-16-person-memory-plan-v3 -->
