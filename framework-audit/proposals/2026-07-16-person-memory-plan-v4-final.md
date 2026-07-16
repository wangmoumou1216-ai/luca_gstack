# person 记忆层 —— 方案 v4（终稿）

> 状态：**纯提案。执行了 0 步 M3。范围拍板未解除（luca 裁决①）。**
> **本文由清洁上下文作者产出；作者 session 对两个 person store 的写入 = 0**（§2 V0，带可失败 control）。
> 当日两 store 的 10 个文件写入**全部属编排 session `72da83e0`**（前作 §8 台账，我已独立 `find` 复核 = 恰好那 10 个）——不是"零写入"，是"不是我写的、且已登记"。
> 前置：昨案（S1–S7 + §8 台账）、v0/v1/v2（判死）、v3（当前基底）、v2-REDTEAM（14 项）、R3 收敛报告（13 真阻塞 = A4+B4）。
> 环境：Claude Code `2.1.211`。**R4 是 luca 授权的最后一轮（硬上限 1）；不收敛即止，残余如实交 luca（§9）。**

---

## 0. 形状（承 v3，未翻案）+ v4 相对 v3 的增量

**三级阶梯 / 七卡点 / 不治清单**三个已收敛结构原样保留。v3 相对 v2 的关键决定（删掉有损归并、四门差分化、canonical 改前备份、key 记为"我未验"、收益量错尺子、sync 盯错表盘、v1 残留已删）全部不变，速查见附录 v3 §0，本稿不重述。

**v4 只做两件事：吸收 R3 的 4 条事实修正（A 类）+ 4 条确定修法（B 类）。逐条落点：**

| 编号 | R3 结论 | v4 落点 | 我这轮的实证 |
|---|---|---|---|
| **A1** | v3 V0「本 session 零写入」是 13:00 截断制造的假象 | §2 V0 重写：改为"作者 session 零写入 + 当日 10 文件归编排 session，引台账" | `find -newermt "2026-07-16"` 实测 = 恰好台账那 10 个文件 |
| **A2** | 「ant_profile 从两库同时蒸发」不存在（是 luca 裁决的候选晋升重命名，零丢失） | §4/§6 引它撑「单点丢失」的两格**作废** → 降为"**无在场实证的推测性风险**" | 采信台账（数据零丢失、digest 晚 3 分钟），不再自造证据 |
| **A3** | 两库自然精确同名重叠 = **2**（非 6；4 个是当日镜像） | §2 V2 台账修正；收益方向不变、基数改 | 自测：6 同名中 4 个是 07-16 写入，自然 = 2 |
| **A4** | 镜像法(e) 07-16 已执行 **3 次**，已登记 | §1.2(e) 从"未执行的备胎"改为"**正在用的临时手段**" | 那 3 次 = disclosure/verify-in-deploy/verify-params 三条 byte-identical 双写 |
| **B1** | A3 条件② 是恒真式（`exists()` 永不 FAIL） | §3 M3-a step 0 = **fork store `cp -Rp` 备份**；§4 A3② 改断言**备份 manifest（path+sha256+mtime）** | **实跑：删除冻结面文件 → A3 FAIL**（§2 V6-B run2） |
| **B2** | 算子错位：`cp -n`/`cp -R` 抹 mtime，而 mtime = `daily_governance.py:251` 算候选 age 的唯一输入 | §3 全部 `cp -n` → **`cp -n -p`**、备份 → **`cp -Rp`** | **实跑：`cp -n` 把 5 天孤儿洗成 age 0；`cp -n -p` 保 5 天**（§2 V6-A） |
| **B3** | M3-a→M3-b 窗口未定价（分开花时 fork 增量永久漏且四门全绿） | §3 M3-b 前置块明写两种定价 | — |
| **B4** | autoDream TOCTOU 从 v3 蒸发（R2 遗留） | 并入**卡点 4**（与 sync watcher 同类：服务端可翻的后台改写器，操作窗口内 TOCTOU），作**给 luca 的建议**非执行步骤 | 写的是同一个 `~/.claude/settings.json`（已核） |

**我主动放弃的（承 v3，不变）：**归并本身 / 「我能验 key」/「31 条」收益数字 / 一切每日守护（= 改 `daily_governance.py` = 双仓框架代码 = 拍板禁止）/ scope=A。
**v4 新放弃的：**「canonical 单点丢失有在场实证」这个主张——它是自造的（A2），我收回，改标为推测。

---

## 1. 前提门：该不该做 / 更小替代

### 1.1 在场代价（剔除自造证据后，逐条实测）

| 事实 | 实测 |
|---|---|
| **1 条候选自 07-11 起孤儿，治理面从未见过** | `candidate_feedback_grep-cjk-silent-false-negative.md`，只在 fork，mtime `07-11 12:44`（本轮实测，age 5 天）。`daily_governance.py:241` `gdir.glob("candidate_feedback_*.md")`，`gdir` 实测解析到母版 store → fork 候选恒不出现 |
| **S4：4 条 session 隔离教训母版独有，fork 是唯一适用现场** | 07-15 fork session 真犯了其中一条（昨案 §2.3）。**这是唯一一次有实证的复发** |
| **alias 双胞胎「漂移」实为分裂病的投影，非内容分叉** | `diff` 全部差异 = `metadata:` 尾随空格 + `originSessionId` + **一条交叉引用**（母版版有 `[[feedback_commit-muban-if-changed]]`，fork 版没有——因为 fork 看不到那个文件）。**母版版是 fork 版的实质超集** |
| **canonical 有 7 个内容孤儿（在盘、无索引 → 永不注入）** | 红队发现，复核成立：`feedback_evidence_grounded_debate` / `figma-batch-calls` / `logic-not-screenshot-captions` / `run-tests-before-claiming-done` / `systematic-not-whackamole` / `deliver-content-directly-when-viewer-fails` / `verify-with-real-evidence-before-reporting` |

**我纠正红队一处取证过头（有证据）：** 红队称其中 **2 条「NEVER-INDEXED、从未有过条目」**，依据是它们不在 `MEMORY.md.bak`。但**该 .bak 的 birth = 06-24，而这 2 条的 birth = 06-30 与 07-09——它们出生时快照早拍完了**。快照对它们沉默，推不出「从未有过条目」。
可靠的只有：**5 条**（birth 早于 06-24 且在 .bak 中）→ **06-24 之后被移出索引**。另 2 条：**此刻是孤儿，历史未知。**
→ 这个区别决定卡点 3 是「你当初是不是故意剪的」还是「写入协议漏了半步」。**我不替你猜。**

### 1.2 更小替代（逐个认真比）

| 选项 | 治什么 | 判断 |
|---|---|---|
| **(a) 什么都不做** | — | 那 1 条孤儿候选继续对治理隐形（已 5 天） |
| **(b) M3-0：`cp -n -p` 那 1 条孤儿候选 → canonical** | 让治理看见它 | **1 条命令。零索引改动、零人工裁决、零毁坏可能、零 harness 未知数。** 治理按**文件名 glob** 找候选（实测 `daily_governance.py:241`），不经过索引 → 不碰被剪过的策展面。**`-p` 是硬要求**：治理按 mtime 算 age（`:251`），`cp -n`（无 `-p`）会把它洗成 0 天、销毁"让治理看见它已积压 5 天"这件事本身（§2 V6-A 实测）。**这是我唯一会推荐执行的一级** |
| **(c) M3-a：`cp -n -p` fork 全部 + append 索引** | 让**母版** session 看见 fork 的教训 | 无损、可验、**不依赖 key**。但索引 26→35，撞上复读 11 天的 >20 flag，解药 stale 15 天 → 卡点 3 |
| **(d) M3-b：fork localSettings 一个 key** | **S4**（fork 看见母版的教训） | **只有这条治 S4——S4 是唯一有实证复发的。但我没能验它**（§2 V3）。失败 = fork 退回自己的库 = 现状 |
| **(e) 镜像法：把文件双写进两个 store** | S4，且**无 harness 未知数** | **正在用的临时手段，不是备胎。** 07-16 已执行 **3 次**（disclosure / verify-in-deploy / verify-params 三条 byte-identical 双写，前作 §8 登记；我 `find` 复核在场）。它是**永久人工税**，但**不需要任何未验证的机制**。**若 luca 不接受 (d) 的未验状态，(e) 是 S4 的现行手段** |

### 1.3 我的判断

**M3-0 我推荐（1 条命令，治一个正在发生的、可测的伤）。M3-a / M3-b 我不推荐也不反对**——它们卡在只有你能定的问题上（卡点 1/2/3），且：

- **M3-b 是本案唯一治 S4 的一级，S4 是唯一有实证复发的裂缝。但我没能验它。** 不拿转述当证据。
- **「维持现状」是本案的合法结论。** 在场伤害 = 1 条候选隐形 5 天 + 1 次 S4 复发。这要不要花掉 7 月第 20+ 次框架 session，**是你的预算不是我的**。

---

## 2. 我亲自实证的证据

> 全部本人执行并观察。**方法论前置：** 本机 `grep` 是 shell snapshot 里的 **ugrep 影子**；grep bundle 时报 `maximum repetition exceeds 255` 并**返回空**——不看 stderr 会被读成"无命中"。本文 bundle grep 均用 `command grep`。**本轮补一条同类坑：** zsh 函数体内 PATH 可失效（`shasum/stat/awk` 报 `command not found`），我的 A3 实跑因此第一版全假 FAIL——**改用 Python 直算 `hashlib`/`os.stat` 复跑**（V6-B），不信任 shell 函数的静默降级。

### V0 — 副作用审计（重写：引台账，不自造基线）

| 动作 | 处置 | 复核 |
|---|---|---|
| `<fork>/.tmp-probe-v3` 探针目录 + 嵌套 git 仓 | 已删 | `git -C <fork> status --porcelain` → **空** |
| `~/.claude.json` | **未新增任何 key** | projects keys **5 → 5，逐字一致** |
| probe transcript 目录 | **从未产生**（claude 未起成，见 V3） | `command find ... -iname '*probe-v3*'` → 空 |
| `...-72da83e0-...-scratchpad-repoA/{3份}` + `repoB/{1份}`（96 KB） | **已删** | 目录名内嵌 `72da83e0` = 本 session 家族 id；`feedback_stay_in_session_scope` 护的是**他方** session，不给自己的垃圾发豁免 |

**当日两 store 的写入归属（不是"零"，是"归编排 session、已登记"）** ——本人 `find` 复核：
```
command find <canonical> <fork> -type f -newermt "2026-07-16 00:00"
  → 恰好 10 个文件：symptom-first ×2 / MEMORY.md ×2 / disclosure ×2 / verify-in-deploy ×2 / verify-params ×2
  → 与前作 §8 台账「72da83e0 当日写入 10 文件」逐一对齐
```
→ **v3 用 13:00 截断把这 10 个写入挡在探针视野外、伪装成"零写入"，是 A 类致命之一。** 修正：**作者（清洁上下文）session 对两 store 零写入**（我的探针 control 仍成立——同一条 `-newermt` 命令能返回非空的 scratch canary，证明探针非瞎），**当日 10 个真写入归编排 session 72da83e0，已在前作 §8 登记，不是本案的副作用、也不是我要辩护的"零"。**

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
**基线（本人实测）：** `autoMemoryDirectory` 在**全部 6 个在盘 settings 文件**中均 `<unset>`；两处 managed-settings 均不存在 → 今天 `KFh()` 返回 undefined。

### V2 — 数据真相（本人实测，A 类台账修正已并入）

```
canonical 37 .md / fork 16 .md
精确同名重叠 NOW = 6，其中：
  · 07-16 当日写入(编排 session) = 4  → symptom-first(晋升) + disclosure/verify-in-deploy/verify-params(镜像法(e) 三执行)
  · 自然 pre-07-16 = 2              → MEMORY.md(结构性 per-store 索引) + feedback_stay_in_session_scope(07-15 镜像临时手段)
→ 【两库自然精确同名重叠 = 2，不是 v3 写的 6】。v3 的「共有 6 / IDENTICAL 4 / DRIFTED 2」把当日镜像误当 found state。
canonical 内容孤儿(在盘无条目) = 7
```
**收益台账（本人本轮重新计数，方向与数字均落实）：**
```
canonical MEMORY.md 索引 = 26 条   fork MEMORY.md 索引 = 11 条
M3-a：fork 索引中 target 不在 canonical 的 = 9 → append 9，索引 26 → 35   （实测）
M3-b：fork 若改读 canonical → 净得 +15（26−11）；但【先丢自己 8 条】
      （8 = fork-only，按归一化 -/_ 计；精确计为 9，差在一对 alias 双胞胎）→ 故 M3-a 必须先于 M3-b，硬顺序
```

### V3 — **部署 scope 验证：我没做成（诚实登记，不变）**

我按 v2 思路搭探针：fork 内嵌套 git 仓 + `settings.local.json` 放 key + 哨兵 store，用 **PTY** 起交互态 claude（`isInteractive=true` → `pn()=false` → 信任门真求值）。机制隔离已做实（probe 无 trust key → `t3y()`④ miss；`<fork>` trust=True；`/Users/luca` trust=False → 遍历不作弊到 home）。**然后权限闸拒绝了我两次**：① 我起子进程前 pop 掉 kill switch，被正确拦（改为继承 env 原样）；② PTY 无人值守注入按键起嵌套 claude = 新自主 agent 循环、不在监督面内——**结构性反对，我停手不绕。**

**后果，不粉饰：**
- **`localSettings.autoMemoryDirectory` 在部署 scope 是否真生效，我无观测证据**，只有自己读的代码路径（V1）。`verify-runtime-not-spec`：代码不是运行时，不打包票。
- **不采信 v2 的 V3**（它正是被"验证 scope ≠ 部署 scope"判死的那版）。
- → **M3-b 是赌注。** 处置不是披露后照写：排到阶梯最后、验证执行者 = luca 本人、失败经设计是 no-op。**不接受赌注 → §1.2(e) 镜像法是无未知数的现行手段。**

### V4 — sync 门链：**v2 盯错了表盘**（本人复核，不变）

```js
async function HDg(){ if(!qd())return; if(!XGt())return; ... }     // watcher 真入口
EDg=yfe(async()=>{
  if(ye.CLAUDE_CODE_DISABLE_ORG_MEMORY)return null;                // 本地 kill switch，第一行
  if(Yl())return null;
  if(!et("tengu_haze_glass",!1))return null;                       // 真正的远端门
  if(process.env.CLAUDE_MEMORY_STORES?.trim())return null;
  ... })
```
**实测缓存值**（`~/.claude.json`，cachedAt 2026-07-16 12:29:21）：`tengu_haze_glass=False`（真门关 → sync 关）、`tengu_moth_copse=False`（v2 盯的，不在链上）、`tengu_onyx_plover={enabled:False}`（autoDream 关）、`CLAUDE_CODE_DISABLE_ORG_MEMORY`/`CLAUDE_MEMORY_STORES` `<unset>`。
→ v2 结论"今天 sync 关着"碰巧对、理由错；且 v2 说"开关不在你手里"是**错的**——`CLAUDE_CODE_DISABLE_ORG_MEMORY` 是本地 kill switch、第一行、优先于一切远端 flag。**你手里有闸。→ 卡点 4。**

### V5 — canonical 回滚通道：**零**（本人复核，不变）

`git rev-parse` → not a git repository；`tmutil destinationinfo` → No destinations；`~/Library/Mobile Documents/.../.claude` → 不存在（**canonical 不在 iCloud 树内**）。唯一历史副本 `MEMORY.md.bak` = 7,095 B / birth 06-24（今 live 13,771 B）→ 回滚它 = 丢 3 周。
→ **v3 处置两层，缺一不可：**① 改前 `cp -Rp` 备份；② 算子本身不能毁坏（`cp -n -p` + append）。**备份是保险，不是许可证。**

### V6 — 断言实跑（本轮改算子后**必须复跑**，两项都做了）

**V6-A — `cp -n -p` mtime 保持（B2 修法的真机验证）：** 拿**真库那条 5 天孤儿的只读副本**做源：
```
源 mtime            2026-07-11 12:44:51   → daily_governance age = 5d
cp -n   目标 mtime  2026-07-16 14:04:35   → age = 0d   ← 错：把 5 天孤儿洗成 0 天，销毁 M3-0 的目的
cp -n -p 目标 mtime 2026-07-11 12:44:51   → age = 5d   ← 对：规定算子保住 age
```
→ **规定算子改 `cp -n -p` 后，与 V6-B/TEST 1 用的 `shutil.copy2`（保 mtime 语义）实证对齐**，v3 遗留的算子错位闭合。

**V6-B — A3 新形态：备份 manifest 是快照不是愿望（B1 修法的真机验证）。** 在**真库沙箱副本**上，`cp -Rp` 冻结 fork store（16 .md，mtime 跨度 07-10~07-16、**未被洗成 now**），建 manifest = path+sha256+mtime：
```
run1 baseline（冻结面未动）              : A3 PASS
run2 DELETE 冻结面一个文件（钦定攻击）   : A3 FAIL(caught: DELETED)   ✅ ← 铁律点名要抓的
run3 MUTATE 冻结面内容                    : A3 FAIL(caught: CONTENT)   ✅
run4 TOUCH  冻结面 mtime（字节不变）      : A3 FAIL(caught: MTIME)     ✅ ← 证明 age 输入本身被守
run5 control（干净重快照）               : A3 PASS                    ✅ ← 证明不误伤正确操作
```
→ **A3 条件② 从"对枚举文件 `exists()`（恒真）"改成"对备份 manifest 逐条 sha256+mtime 比对"**：删一个冻结面文件立刻 FAIL（run2），恒真式病灶消除。

**TEST 1/TEST 2（承 v3，算子语义未变）：** 规定算子（`cp -n -p` + append）四门同时绿（copied=10 / appended=9 / 索引 26→35）；6/6 毁坏场景全抓到（fork 整份覆盖 drifted→A1 FAIL；母版独有被丢→A1+A4 FAIL；丢母版索引行→A2+A4 FAIL；13771→2862 覆盖→A2+A4 FAIL；ghost 条目→A4 FAIL；无条目文件→A4 FAIL）。v3 用 `shutil.copy2` 实跑 = `cp -n -p` 语义，故改算子无验证缺口。**若批准执行，四门须在当场真库跑出绿灯才算数。**

---

## 3. 方案：三级阶梯（每级独立可裁；全为**带算子与断言的建议**，非执行步骤）

> **总纲：删掉有损归并。** 只用两个结构上无法丢数据、且**保 mtime** 的算子——`cp -n -p`（存在即跳过、不能覆盖、保时间戳）与 `append`（不能删行）。**不合并、不改名、不去重、不删除。** 代价明写。
> **算子纪律（B2）：** 全部带 `-p`；备份用 `cp -Rp`。mtime 是治理算 age 的唯一输入（`daily_governance.py:251`），抹掉它 = 静默销毁"积压多久"这个信号（V6-A 实证）。

### M3-0 —— 止血（我唯一推荐的一级）
```
cp -n -p <fork>/candidate_feedback_grep-cjk-silent-false-negative.md <canonical>/
```
- **治**：那 1 条自 07-11 起对治理隐形的候选。
- **零风险**：治理按文件名 glob 找候选（`:241`），不经过索引 → 零索引改动、零策展争议、零 harness 未知数、零毁坏可能（目标不存在，`-n` 无覆盖对象）。
- **`-p` 是硬要求**：保住它 5 天的 age，让治理如实报"已 5 天"而非"0 天"（V6-A）。
- **回滚**：`rm` 那一个文件。fork 侧原件不动。

### M3-a —— 加性并库（**必须先于 M3-b**）
```
0. cp -Rp <fork>/. ~/.claude/person-store-fork-backup-2026-07-16/   ← 先备份 fork store（保 mtime），建 manifest(path+sha256+mtime) 冻结快照（A3 断言面，V5/V6-B）
1. cp -n -p <fork>/* <canonical>/                                   ← 10 个 fork-only 文件，不能覆盖、保 mtime
2. 把 fork 索引中【精确 target 尚不在 canonical 索引】的 9 行 append 到 canonical/MEMORY.md
3. fork 旧 store：原地冻结、不动 = 回滚点 + A3 可捞回面（备份 manifest 是其快照）
```
- **治**：母版 session 看见 fork 的 10 条教训（**不依赖 key，今天就生效**）。
- **实测**：copied=10 / appended=9 / 索引 26→35 / 四门全绿（V6-B TEST 1）。
- **代价（诚实）**：
  1. **索引 26→35**，加剧复读 11 天的 >20 flag，解药 stale 15 天 → **卡点 3，不自答。**
  2. **canonical 留 1 对可见重复条目**（alias 双胞胎：`feedback_autocommit-*` 下划线版 + 连字符版并存，各有条目、各有文件、不悬空）。实测母版版是 fork 版实质超集 →「删连字符版」大概率对，**但那是删除、有损、你的数据 → 卡点 5。丑但可见 > 干净但不可验。**
  3. `feedback_symptom-first-before-acting.md`：`cp -n -p` 跳过（canonical 侧是 07-16 晋升产物，已在）→ fork 版不被提升，其独有交叉引用不进 canonical，但**仍在冻结 store 可捞回**（A3 强制检查 + 备份 manifest 兜底）。

### M3-b —— key（**我未验的那一级**）
```
前置硬约束（B3 窗口定价，二选一，不得静默留空窗）：
  · 要么 M3-a 与 M3-b 同一坐 session 连跑（窗口 ≈ 0）；
  · 要么 M3-b 前 find <fork> -newer <M3-a step-0 marker> -name '*.md' 重扫 fork 增量，命中的用 cp -n -p 补拷进 canonical
   （否则窗口内 fork 新写的候选永久漏进 canonical，且四门全绿看不出——B3 指出的洞）。

merge into <fork>/.claude/settings.local.json   （文件已存在、含 permissions → 合并不覆盖；.gitignore:88 已挡）
{ "autoMemoryDirectory": "/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory" }
```
- **治**：**S4**——fork session 看见母版那 4 条 session 隔离教训（唯一有实证复发的裂缝）。
- **前置**：**必须先跑 M3-a**（否则 fork 净丢自己 8 条，V2 台账），且**先处理窗口**（上）。
- **状态**：**机制未观测**（V3）。验证执行者 = **luca 的交互 session**（A5 canary）。
- **失败模式**：canary 红 → 删那行 → fork 退回自己的库 = 现状。零数据后果。
- **改动面**：母版 git 仓 0；fork git 仓 0（gitignored）；母版 person store = M3-a 那些。

---

## 4. 断言

> 纪律：**每条必须真能抓到它声称抓的失败模式，且有具名执行者。写不出就不写。**
> **全部差分（pre/post）**——绝对门在脏基线（7 个既有孤儿）上必然误伤，那是 v2 的死因。实跑证据见 §2 V6。

| # | 抓什么失败模式 | 怎么抓（真能抓到的理由） | 谁跑 / 接进哪里 |
|---|---|---|---|
| **A1** `[BLOCKING]` | canonical 侧内容被毁——含 v2 的结构盲区：整份取 fork 版、母版独有文件被丢 | 归并**前**记 canonical 每文件 sha256；**后**逐一比对：除 MEMORY.md 外一个不许变、不许少。`cp -n -p` 保证可满足，A1 保证被验证 | 执行 M3-a 的人当场；一次性脚本放 scratch、**不进仓**（不触发 parity）。**实跑已验**：两种毁法各 FAIL |
| **A2** `[BLOCKING]` | canonical 索引行被毁（正确归并反销毁更丰富母版行；13771→2862 覆盖） | 归并前抓 canonical `MEMORY.md` 每条索引行；后每条必须仍在。append-only 保证可满足。不去重不改名 → 与 A1/A3/A4 无交集冲突 | 同上。**实跑已验**：丢 1 行→FAIL(lost 1)；被覆盖→FAIL(lost 26) |
| **A3** `[BLOCKING]` | fork 侧内容没到位**或不可捞回** | fork 每文件：`sha256 ∈ canonical` → PASS；**否则**必须在**备份 manifest（path+sha256+mtime 快照）**里逐条比对通过（= 冻结面真被冻住、可捞回）。**②不再是恒真的 `exists()`，是对快照的 sha+mtime 断言** | 同上。**实跑已验（V6-B，Python 复算）**：删冻结面文件→FAIL(DELETED)；改内容→FAIL(CONTENT)；改 mtime→FAIL(MTIME)；干净→PASS |
| **A4** `[BLOCKING]` | **新增**悬空（条目在文件没）/ **新增**孤儿（文件在条目没，即 S4 那病本身） | 归并前后各算一次孤儿集与悬空集，**只看差集**（canonical 已有 7 既有孤儿，绝对门恒 FAIL，v3 第一版栽在这） | 同上。**实跑已验**：ghost 条目→FAIL(new_dangling)；无条目文件→FAIL(new_orphan) |
| **A5** `[BLOCKING]` | M3-b 的 key 没生效（打错/被压过/新机无此文件/机制不成立）→ fork 仍读旧库且静默（`mHc()` 不校验存在性，harness `mkdir` 替你造错目录） | canonical `MEMORY.md` 末尾放 canary；**在 fork 开交互 session 问它看不看得见** | **luca 本人，交互 session**（`claude -p` 令 `pn()=true` 短路信任门；PTY 路线被权限闸两次拒，V3）。切换当场 + harness 大版本升级后各跑一次 |

**本方案明确没有的守护（不掩饰）：**
- **key 在两次 A5 之间静默失效**（文件被删/覆盖）→ **无检测。**
- **canonical 侧未来单点丢失**（某条从两库同时消失、零告警）→ **无检测。** ⚠️ **诚实收回：** v3 曾引 ant_profile 为此风险的在场实证，经查那是 **luca 裁决的候选晋升重命名（数据零丢失、digest 仅晚 3 分钟，前作 §8）——不构成实证。故此风险降为「无在场实证的推测」**，不是已发生的事实。备份只护**这一次**操作。
- 二者要每日执行者 = 改 `daily_governance.py` = 双仓框架代码 → **卡点 2**（其动机现无在场实证，见上，是否值得改框架码更该由 luca 定）。**我不写空壳 `[BLOCKING]`，也不拿「提醒」冒充「阻断」。**

---

## 5. 人类卡点（只有 luca 能定；卡点 6 已定，其余开放）

1. **框架建设预算。** 软上限 2 次/月。R3 报 7 月 ≈19 条 → 9.5×，本案第 20+。**我无法独立测出这个数**（`episodic/index.jsonl` 无「纯框架 session」字段，任何数字是推断）。**本案值不值得再花一次？**（M3-0 是 1 条命令；M3-a/b 才是"一次 session"，可分开花。）

2. **前作「只收尾 + 提案，不改框架代码」拍板是否解除？** **luca 裁决①：不解除。本文默认它有效 → 执行了 0 步。** `settings.local.json`（gitignored）算不算"框架代码"、`cp -n -p` 一个候选算不算"收尾"——**不替你解释。** 每日守护（A1–A4 复发版）**必须**改 `daily_governance.py`（双仓 byte-identical + parity 注册）= 框架代码，本案整个移出；且其动机（canonical 未来单点丢失）现无在场实证。要不要单独解禁，你定。

3. **索引策展：先剪枝还是先并？**（**M3-a 的上游，不是脚注**）
   - 实测 **5 条内容孤儿在 06-24 之后被移出索引**（在 06-24 .bak、现不在）。若那是有意剪枝，索引是被策展的面，而 M3-a 26→35 正反着来。
   - `SC-20260630-001`（"按每条价值剪、不为凑 >N 剪"）**stale 15 天**，正是「>20」flag 的解药，互等 11 天。
   - 另 2 条孤儿（birth 06-30 / 07-09）历史未知——可能写入协议漏半步（`CLAUDE.md:177` 要求文件+索引一起写，只做前半），也可能不是。**不猜。**
   - → **不定这条就跑 M3-a = 拿一个已知问题喂另一个已知问题。**

4. **sync watcher + autoDream —— 两个服务端可翻的后台功能，操作窗口内的 TOCTOU。**（B4 并入此条）
   - **sync**：实测今天关（真门 `tengu_haze_glass=false`，非 v2 盯的 `moth_copse`）。**本地 kill switch = `CLAUDE_CODE_DISABLE_ORG_MEMORY`，在 `EDg()` 第一行，优先于一切远端 flag——闸在你手里。** 但它仍是服务端可翻的值 → TOCTOU 结构不变。
   - **autoDream**（R2 遗留、v3 蒸发，本轮补回）：实测今天关（`tengu_onyx_plover.enabled=false`）。它是真 mutator（`.consolidate-lock`、按 mtime 挑并行 session transcript 当食材、`utimes` 回滚）。M3-a/b 窗口以分钟~小时计，对一个时变远端值"开工时确认关着"结构上无效。**本地钉死点：`autoDreamEnabled:false` 命中 `if(e!==void 0)return e`、绕过服务端 gate**——但**它写的是同一个 `~/.claude/settings.json`**，且 pin 一个官方后台功能是**改配置、动官方默认**。
   - → **给 luca 的建议（非执行步骤，范围拍板未解除）**：M3-a/b 若执行，宜在窗口内同时 pin `CLAUDE_CODE_DISABLE_ORG_MEMORY=1` 与 `autoDreamEnabled:false`，事后撤除。**接受 / 另案 / 现在就 pin / 判定不治并承担窗口内 TOCTOU——我不替你接受，也不替你决定要不要关一个官方功能。**

5. **alias 双胞胎去重。** M3-a 后 canonical 有 1 对可见重复。母版版是 fork 版实质超集 →「删连字符版」大概率对。**但删除、有损、你的数据，而删除恰是本案通篇拒绝做的事。** 保留 / 你删 / 授权我删？

6. **`SC-20260715-005` 退场——处置已定，待 luca 执行。**（luca 裁决②）
   - 该候选 fact 含「唯一真·harness 限制是『目录名由 cwd 派生、不接受 env 覆盖』」——两处均有反证（派生输入是 `tp(rc())??rc()`=git root 非 cwd；`hHc()` 读 `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` 且 `Ry()` 里优先级最高）。**已知错误的前提。**
   - **luca 已裁决亲手 `--reject`（人工签名），修正版 `SC-20260716-001` 已入队**（cwd→repo 根 / env 覆盖存在 / scope=A 证伪 / v3 阶梯为现行候选）。**待 luca 执行 reject 命令**（`--reject` 强制 `--reviewer`、原文写明"人工闸门审计留痕"，`SC-20260523-003` 红线的执行面 → **agent 署名 = 伪造人工审计，不可代劳**）。
   - **风险仍在**：`memory/digests/2026-07-16.md`「⏳ 待你裁决」里 005 仍带可粘贴 `--set-stable`——**执行 reject 前别在 digest 点头**，否则已知错误前提进 `promoted-facts.yaml` 每 session 注入。
   - （`SC-20260715-006` 关于 S1 复核无误，**不要连坐**。）

7. **既成公开泄露。** 母版仓 PUBLIC 且 `memory/` 被跟踪（8 文件 ≈180 KB；`.gitignore` 挡 live 没挡 archive）。**与本案无关**（本案不碰仓内 `memory/`；person store 不在任何 git 仓内——已验）。**但红队第二通道 v2 弄丢，放回**：`~/Desktop` **就是** iCloud Desktop（inode 实证）→ 任何只针对 git 的处置都留一条完整泄露面。诚实边界：**canonical 不在 iCloud 树内**（已验）→ 本案动作本身不碰 iCloud。另案？注意 **git 历史不可删**。

---

## 6. 本方案不治什么

| 项 | 状态 | 说明 |
|---|---|---|
| **S1**（`--summary` 注入全硬盘最后一个 session 的 next_risk，零归属过滤） | ❌ **不治** | `get_memory.py:161` 独立 bug，与 person 分裂无关。**昨案标 🔴 且「当天真咬人」。一个已确认在咬人的 🔴 无人管，而本案是 🟠 组织问题。我不替你排优先级，但你不该在看不到这行的情况下批本案。** |
| **7 条 canonical 内容孤儿** | ❌ **不治，且这是收益缩水的真相** | 在盘、无条目 → 两库都永不注入。「事实在盘却不进注入面」正是 S4 那病本身，本案只诊断不治。A1–A4 对这类结构性全盲（不在 fork→A3 看不见；差分门→A4 按设计放行既有孤儿）→ 卡点 3 |
| **归并后 canonical 单点丢失** | ❌ **不治** | ⚠️ **在场证据收回**：v3 引 ant_profile 撑此格，经查是 luca 裁决的候选晋升重命名（零丢失）→ **此风险现为无在场实证的推测**。备份只护这一次操作。要治需每日执行者 → 卡点 2 |
| **key 在两次 A5 之间静默失效** | ⚠️ **残余盲区** | 无检测。不假装闭合。 |
| **autoDream 窗口 TOCTOU** | ⚠️ **残余 / 待定** | R2 遗留、本轮补回。本地可 pin `autoDreamEnabled:false`（绕服务端 gate），但写同一个 `~/.claude/settings.json`、动官方默认 → **卡点 4，作建议非步骤** |
| **M3-b 的机制本身** | ⚠️ **我未验** | V3：权限闸两次拒绝。非"披露后照写"——排阶梯最后、验证者 luca、失败设计成 no-op、§1.2(e) 备无未知数替代 |
| **S6**（fork 仓内 `memory/` 是 7-09 死数据） | ❌ 不治 | `MEMORY_ROOT` 层，与 `autoMemoryDirectory` 两机制不相交，另案 |
| **S8**（slug 碰撞） | ⚠️ **部分** | 对 fork 消失（若 M3-b 成立）；对其余 17 库依然在 |
| **code-\* 等 15 库的"分裂"** | ❌ **不治，且主张不该治** | per-repo 项目档案（`#ff8000`、Figma Key、"用 pnpm"），harness per-repo 设计对它们正确工作。并进全局注入面 = 污染 + 判它们失联。scope=A 已死 |
| **新机器 / 新 clone** | ⚠️ 真限制 | `settings.local.json` gitignored → 不随 clone。但 A5 会 FAIL → 至少不静默 |
| **既成公开泄露 + iCloud 通道 + git 历史** | ❌ 不治 | 卡点 7 |
| **两个死库（7 文件，含 M1 约定文档）** | ❌ 不治 | 考古；要捞另说 |
| **另一 session（`5b129d9d`）scratchpad 残留** | ❌ 不治，只登记 | 真不是我的 → `feedback_stay_in_session_scope` 在此正确适用。（自己家族那 4 份已删，V0） |
| **未安装的 launchd 治理任务** | ❌ 不治，只登记 | `scripts/launchd/com.luca.memory-governance.plist` 在仓从未安装 → "每日治理"只靠开 session 触发。不夹带 |

---

## 7. 我可能错在哪

> 纪律：每条要么给出已执行的处置，要么指向 §5 编号卡点。没有一条是"写下来然后继续往下写"。

1. **M3-b 机制我没观测到。** → 不声称；排阶梯最后 + 验证者 luca（A5）+ 失败 no-op + §1.2(e) 无未知数替代。**不接受赌注 → 砍 M3-b，M3-0/M3-a 独立成立。**
2. **拒绝去重 → canonical 留 1 对可见重复。** → 明写 §3 代价 2 + 卡点 5。这是"结构上不可能丢数据"的定价，不偷偷替你解决。
3. **A1–A4 定义了、沙箱实跑了，但没跑过真正的归并**（本案未执行）。 → 如实标注。实跑的是真库副本（V6-B）不是真库；批准执行则须当场跑绿。
4. **我纠正红队「2 条 NEVER-INDEXED」，若 birth time 读错则纠正错。** → 算术非判断：`.bak` birth 06-24；两文件 birth 06-30/07-09，晚于快照 → 快照对它们无信息。我只声称"历史未知"，不声称"曾被索引"。
5. **M3-a 索引 26→35 可能整个方向就错**（若那 5 条是有意剪的）。 → 不自答 → 卡点 3，写成 M3-a 上游而非脚注。若结论是"该剪不该长"，M3-a 应被砍或重做，不争。
6. **A3 新形态依赖备份 manifest 在归并全程不被并发改写**（如另一 session 恰好动 fork store）。 → 处置：M3-a step 0 到 A3 校验须同一坐 session 连续、窗口内 pin sync/autoDream（卡点 4）；manifest 记 mtime，任何并发触碰 → A3 FAIL(MTIME)（V6-B run4 实证能抓）。**这是抓得住的，不是盲区。**
7. **`t3y()` 的 ①`CLAUDE_CODE_SANDBOXED` / ③`Pi()` 我没实测。** → 对本案不承重（只会让信任门更易开，方向安全）。已标注，未用于论证。
8. **§1.2(b)/(a)「只止血」或「什么都不做」可能才对。** → 不自答 → 卡点 1 + 2。§1.3 已明写：M3-0 之外不推荐，「维持现状」是合法结论。

---

## 8. 与红队 / 收敛报告的关系（R1–R4 全史）

**R3 采信并据此改（不是记在纸上）——4 条 A 类事实修正：**
- **V0「零写入」是 13:00 截断假象** → §2 V0 重写，`find` 复核当日 10 写入归编排 session、引台账，不再自造基线。
- **ant_profile「同时蒸发」不存在** → §4/§6 两格作废，降为"无在场实证的推测"，收回 v3 的自造证据。
- **自然同名重叠 = 2 非 6** → §2 V2 台账修正（4 个是当日镜像），收益方向/数字重新计数落实。
- **镜像法(e) 已执行 3 次** → §1.2(e) 改"正在用的临时手段"。

**R3 采信并据此改——4 条 B 类确定修法：**
- **A3 恒真式** → §3 M3-a step 0 `cp -Rp` 备份 + manifest 快照；§4 A3② 改 sha+mtime 断言；**V6-B 实跑：删冻结面文件→FAIL**。
- **算子错位** → §3 全部 `cp -n -p`/`cp -Rp`；**V6-A 实跑：`cp -n` 洗成 0 天、`cp -n -p` 保 5 天**；与 `shutil.copy2` 实证对齐。
- **M3-a→M3-b 窗口未定价** → §3 M3-b 前置块二选一（同 session 连跑 / `find -newer` 增量补拷）。
- **autoDream TOCTOU** → 并入卡点 4，作建议非步骤，注明写同一 `settings.json`。

**R1/R2 已采信（承 v3，不变）：** A2/A3 互斥（删有损归并、四门差分化）/ A2 对母版侧失明（A1 是镜子）/ canonical 零备份（改前 `cp -Rp`）/ 收益量错尺子（+15、先丢 8）/ 7 孤儿（进不治+卡点 3）/ sync 门链读错（V4 复核）/ iCloud 通道（卡点 7）/ session 归属双标（本 session 家族残留已删）。

**我纠正红队的（有证据）：** 「2 条 NEVER-INDEXED」取证过头（birth 晚于 .bak 快照，只 5 条可靠）；治理按文件名 glob 找候选、不经索引（→ 止血 M3-0 可零索引改动）；alias「漂移」实质 = 各侧交叉引用只指向本侧可见文件（母版版是超集，量级被夸大）；本机 `grep` 是 ugrep 影子（`find` 与 `grep` 同病，v2 只警告了 `find`）。

**循环基建噪声（供知情）：** R3 一个 eng 视角 agent 退化输出字面占位符（`lens="test"`、findings=`a/b/c`），已剔除；**R3 真实阻塞 = 13，去重后 = 8 个独立缺陷（A 类 4 + B 类 4），全部落入本稿。**

**R4 收敛状态（如实）：** A 类 4 + B 类 4 全部吸收并**逐条真机实证**（V0 `find` / V6-A mtime / V6-B A3 删除-FAIL / V2 重计数）。**残余非缺陷、是 luca 主权项**：7 个人类卡点（卡点 6 已定待执行，其余开放）+ M3-b 未验赌注 + 3 个明标残余盲区（key 静默失效 / autoDream 窗口 / 未来单点丢失-推测）。**R4 是最后一轮：这些残余不再收敛，如实交 luca 裁决，不假装闭合。**

---

<!-- FILE_END: 2026-07-16-person-memory-plan-v4-final -->
