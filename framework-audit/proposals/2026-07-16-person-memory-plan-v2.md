# person 记忆层 —— 方案 v2

> 状态：**提案。未执行任何持久改动到 person 记忆层、任何仓、或治理队列。**
> 本 session 的实验**确实产生了 3 处副作用**（2 个临时 trust key、1 个 transcript 目录、1 个探针目录），**已逐条审计并还原**，还原用的探针带**可失败 control**（§2 V0）。
> 前置：`2026-07-15-person-memory-fragmentation.md`（昨案，S1–S7 继承）、`2026-07-16-person-memory-unification-plan.md`（v0，判死）、`...-REDTEAM.md`（裁决）、`2026-07-16-person-memory-plan-v1.md`（v1，判死）。
> 环境：Claude Code `2.1.211`（`/Users/luca/.local/share/claude/versions/2.1.211`）。

---

## 0. 相对 v1，我改了什么关键决定

| | v1（判死） | v2（本案） |
|---|---|---|
| **部署 scope 验证** | 全部跑 `claude -p` → `pn()` 使信任门无条件打开，`qd()`/`t3y()` **一次都没执行过** | **用 PTY 跑真交互态**（`isInteractive=true`），信任由 `t3y()` 真实 ancestor walk 解析。**三格设计 + control**（§2 V3） |
| **「改名不击穿」** | 断言"配置文件跟着目录走"，**零证据**（红队判死） | **理由是错的，结论碰巧对。** 实测：改名 → **弹信任对话框（响亮、阻塞）** → 接受 → key 当场生效（§2 V4）。**不是静默击穿** |
| **「母版零改动」** | 头条这么写，卡点里又承认要改 `daily_governance.py`（红队：两个数打架） | **拆开写**：母版**仓**零改动 = 真；母版 **person store** +10 文件 = 方案目的；**要 daily 守护就必须改框架代码 → 移出本方案，进卡点** |
| **索引算式** | 写死 `26+11−1=36`（三处），正确归并实得 34 → BLOCKING 门在正确归并上恒 FAIL | **不写常数**。断言**从归并前两份索引现场派生**。实测真值 34（§2 V6） |
| **A5 豁免清单** | allowlist = 盲区：唯一要人工判断的文件恰好唯一不被检查 | **allowlist 改成加严不是豁免**：上榜文件必须过**行级包含**（§4 A2） |
| **autoDream「从未跑过」** | 建在两条无效推论上（锁被设计成 unlink、telemetry 是死信队列） | **推翻我方 v1。** 拿到**真实缓存值**：`tengu_onyx_plover.enabled=false`（§2 V5）。v1 说"statsig 缓存里没有"——**那个目录根本不存在** |
| **SC-005 处置** | 包装成第 9 个卡点丢回（红队：re-litigate） | **实测红队指定的仪器不成立**：`--supersedes` 是注释、`--reject` 强制人工署名 → 它**在设计上就是 luca 的** |

**我主动放弃的**：
1. **v1 的 §1.1 一半在场证据**——实测是 v1 自己那个 session 今天亲手造的（§2 V7）。我把它们从论证里**删掉**，不是脚注。
2. **一切"每日自动守护"**（v1 的 A2/A3/A4/A6）——它们必须改 `daily_governance.py`（双仓 byte-identical + parity 注册），那是框架代码改动 = 拍板禁止。**我不写它们，也不假装本方案闭合了复发检测**（§6）。
3. **"我能替你验部署 scope"**——交互态我能验（已验），但**新机器/新 clone/key 被删**这类残余，只有 luca 的 session 是部署 scope。A1 的执行者是**他本人**，不是脚本。

---

## 1. 前提门：该不该做 / 更小替代

### 1.1 在场代价（**剔除自造证据后**）

v1 的 §1.1 有两行是它自己今天造的。我先把它们摘出去，再谈剩下的。

**❌ 不算数（本 session 家族自造，§2 V7 实测 birth time）：**

| v1 的论据 | 实测 |
|---|---|
| 「3 条候选靠人工双写续命 = 持续人工税」 | 3 条**全部今天出生**（07-16 10:27 / 11:12 / 11:13），由 v1 那个 session 亲手双写。昨案登记的临时手段是**另外 2 个文件** |
| 「两个 store 今天都在被写 → 活问题」 | 两库今天**唯一**的写入者就是 v1 自己（10 个文件全落在 09:45–11:13 窗口） |
| 「共有中漂移 2 条」 | 其中 `feedback_symptom-first-before-acting.md` **两份都是今天 09:45/09:46 出生**，漂移也是今天造的 |

**✅ 算数（早于本 session，我逐条核过）：**

| 事实 | 证据（§2 V6/V7） |
|---|---|
| **1 条候选自 07-11 起孤儿，治理面从未见过它** | `candidate_feedback_grep-cjk-silent-false-negative.md`，birth 07-11 12:44，**只在 fork**；`daily_governance.py` 只 glob 母版 store |
| **真·内容漂移 1 对** | `feedback_autocommit-push-high-confidence.md`(母版) vs `feedback-autocommit-push-high-confidence.md`(fork)：**两份 birth 均为 07-11 11:35（同一分钟双写）**，今天 hash 已不同 → **双写在 5 天内就漂了**。这是"双写不可持续"的真实证据 |
| **31 条母版教训 fork 看不见；10 条 fork 教训母版看不见** | 母版 39 文件 / fork 16 文件 / 共有 6 / 仅 fork 10（16,847 B） |
| **S4 已有复发实证** | 4 条 session 隔离教训**全部母版独有**，fork 正是唯一适用现场；07-15 fork session 真的犯了其中一条（昨案 §2.3） |
| **fork store 是活的** | birth 直方图：07-10(2) / 07-11(5) / 07-12(2) / 07-14(1) / 07-15(1)。**不靠今天也成立** |
| **canonical 侧丢失零检测（新增，v1 没看见）** | 昨案 §8 登记的 `candidate_feedback_ant_profile_shadows_max.md` **已从两个库同时消失**，从未进过任何 digest，全程零告警（§2 V7） |

**结论：在场代价是真的，但比 v1 报的小。** 核心是 **S4 读侧**（有一次实证复发）+ **1 条孤儿** + **1 对 5 天就漂的双写**。

### 1.2 更小替代（逐个认真比）

| 选项 | 做法 | 治什么 | 判断 |
|---|---|---|---|
| **(a) 什么都不做** | 继续人工双写 | — | 双写**已被证伪**：alias 双胞胎 07-11 同分钟双写、5 天后 hash 已分叉。它是病因不是方案 |
| **(b) 最小止血** | `cp` 那 1 条孤儿候选 → 母版 store | 让治理看见这 1 条 | **≈1 条命令，真的更小，且不触碰任何拍板红线。若 luca 只想止血，这条足够** |
| **(c) 昨案 A：治理 glob 全目录** | 改 `daily_governance`/`session-restore` | S3 | 不治 S2/S4（**注入面仍分裂，fork 仍看不见那 4 条**）。且是框架代码改动（双仓+parity） |
| **(d) 昨案 B：symlink** | fork slug 目录 → 软链母版 | S2/S3/S4 | **红队对：v1 判它死于株连。** 但它**改名后永久静默失效**（新 slug = 真目录，无人重建链），而 (e) 改名会**弹对话框**并自愈（§2 V4）。**这条差异现在有实测支撑，不再是 v1 那句无证据的话** |
| **(e) M2：fork localSettings 一个 key** | 见 §3 | S2/S3/S4/S5 | **机制已在部署 scope 实测通过（§2 V3），带 control。** 母版**仓**零改动 |

### 1.3 我的判断

**(b) 与 (e) 都是诚实答案。**
(e) 的**机制**这一版已经不是赌注了——它在交互态跑通、control 证明能失败、改名场景实测响亮而非静默。**剩下的成本全在数据归并**（10 文件 + 34 条索引 + 3 处人工裁决），以及一条我不掩饰的残余：**归并后 canonical 成为唯一活跃副本，而 canonical 侧丢失当前零检测**（ant_profile 就是这么没的）。

**我倾向 (e)。但 §5 卡点 1/2/3 不是我能定的**：预算疑似 9.5× 透支、拍板仍是"只收尾+提案不改框架代码"、scope=A 的裁决效力。**若 luca 选 (b)，我不会争。**

---

## 2. 我亲自实证的证据

> 全部**本人执行并观察**。凡是我没观测到的，标"未验"并进 §5，**不进论证**。
> **方法论前置（这条是 v1 的死因）：** 本机 `find`/`grep` 是 shell snapshot 里的 **bfs/ugrep 影子**（`type find` → `shell function from .../shell-snapshots/...`）。v1 的 V0 跑 `find -newermt` → bfs 报 `Invalid timestamp` → stdout 0 字节 → **被读成"空 = 无泄漏"**。本文**全部改用 `command find` / python**，且**每个"空即通过"的探针都先证明它能返回非空**。

### V0 — 实验副作用审计（**带可失败 control**）

我的实验**确实**碰了真实 config dir（隔离 `CLAUDE_CONFIG_DIR` 下 `claude` 直接 `Not logged in`——这正是取证会退回真实 config 的机制性诱因，v1 未披露）。副作用逐条：

| 副作用 | 处置 | 复核 |
|---|---|---|
| `~/.claude.json` 新增 trust key `<fork>/.tmp-probe-v2`（`hasTrustDialogAccepted=False`） | 已删 | projects 6 → **5**，逐 key 打印与实验前逐字一致 |
| `~/.claude.json` 新增 trust key `.../probe-rename`（`=True`，我接受了对话框） | 已删 | 同上 |
| `~/.claude/projects/-Users-luca-Desktop----muse-lucagstack--tmp-probe-v2/`（transcript） | 已删 | `command find ... -iname '*probe*'` → 空 |
| `<fork>/.tmp-probe-v2/` 探针目录 | 已删 | `git -C <fork> status --porcelain` → **空** |

**两个真 person store 未被写入**——探针**带 control**：

```
1. touch <母版store>/.leak-canary-DELETEME.md
2. command find <母版store> <fork store> -type f -newermt "2026-07-16 12:00"
   → /Users/luca/.../memory/.leak-canary-DELETEME.md        ← 探针能返回非空（可失败性证明）
3. rm canary
4. 同一条命令 → 空                                            ← 才是「无泄漏」
```

**诚实登记（不是我的，我不动）：** v1 那个 session 的实验残留**此刻仍在盘**——
`...-scratchpad-repoA/{deec3a90,e3575c7e,fe5dab21}.jsonl` + `...-scratchpad-repoB/7861e448.jsonl`（4 份，≈86 KB，mtime 07-16 10:55–10:59）。**v1 文首「已实证零泄漏并清理」为假**（红队对）。按 `feedback_stay_in_session_scope`，别的 session 的产物我只报告不删。

### V1 — 解析链本体（`strings -a`，本人 grep，**并做了 minified 名字碰撞排查**）

```js
function KFh(){let e=CPe(),
 t = Rr("policySettings")?.autoMemoryDirectory
  ?? Rr("flagSettings")?.autoMemoryDirectory
  ?? (e ? Rr("localSettings")?.autoMemoryDirectory ?? Rr("projectSettings")?.autoMemoryDirectory : void 0)
  ?? Rr("userSettings")?.autoMemoryDirectory;
 return mHc(t,!0)}
Ry=Pr(()=>{let e=hHc()??KFh(); if(e)return e;
  let t=pV.join(_9e(),"projects"), r=tp(rc())??rc();
  return (pV.join(t,D0(r),VFh)+pV.sep).normalize("NFC")}, ()=>`${rc()}|${CPe()}`)
```

**碰撞排查（v1 与红队都没做，而 bundle 里真的有碰撞）**：`CPe`/`Ry`/`D0`/`tp`/`rc`/`pn`/`f0e` **各有 ≥2 个定义**（另一份来自 d3 等被打包的库：`function CPe(e){return function(){this.removeAttribute(e)}}`、`function Ry(e,t){...sum...}`）。我按**上下文邻接**逐一消歧：承重的 `CPe` 紧邻 `qd()`/`t3y()`；承重的 `Ry` 紧邻 `dHc=require("os")` 且调用 `KFh()`。**`f0e` 的两份定义差异最大**（一份是 `f0e=Pr(()=>{let e=dn(),t=tp(e);...})`，一份是数值插值 helper）——`t3y()` 用的是前者。

### V2 — 信任门全貌（**v1 与红队都只读了一半**）

```js
function CPe(){if(pn())return!0;return qd()}
function pn(){return!Ot.isInteractive}
function qd(){return cPd||=t3y()}
function t3y(){
  if(ut(process.env.CLAUDE_CODE_SANDBOXED))return!0;   // ← ①
  if(eEe())return!0;                                    // ← ② eEe(){return Ot.sessionTrustAccepted}
  if(Pi())return!0;                                     // ← ③ Pi(){return mQe()==="bg"}
  let e=St(),t=f0e();
  if(e.projects?.[t]?.hasTrustDialogAccepted)return!0;  // ← ④ 精确 key（git root of originalCwd）
  let n=Ise(xt());
  while(!0){ if(e.projects?.[n]?.hasTrustDialogAccepted)return!0;   // ← ⑤ 祖先遍历
             let i=Ise(ey.resolve(n,".."));if(i===n)break;n=i }
  return!1}
```

**红队只模拟了 ④⑤ 就下结论"改名 → False → 静默回落"。①②③ 它没读。** 其中 ② 是自愈路径，启动链上**无条件**触发：

```js
if(d=qd(),!d||wYt()){ u=!0; let{TrustDialog:f}=await …; await Y5(e,(m)=>OO.jsx(f,{commands:n,onDone:m})) }
if(eHe(!0),u) NH("post-trust: re-discover project @skills-dir plugins");   // eHe(e){Ot.sessionTrustAccepted=e}
```

→ **不信任不是一个"能跑起来的静默状态"，它是一个阻塞启动的模态对话框。** 对话框走完 → `eHe(!0)` → `t3y()` 走 ② 直接 true。且 `Ry` 的 memo key 就是 `${rc()}|${CPe()}` → CPe() 一翻，路径**当场重算**。

**`isInteractive` 的真值（决定了一切）：**
```js
let r=t.includes("--print"), n=t.includes("--init-only"), o=t.some((c)=>c.startsWith("--sdk-url")),
    i = r||n||o|| !process.stdout.isTTY;
wXo(!i)   // wXo(e){Ot.isInteractive=e}
```
→ **stdout 不是 TTY 就 `pn()=true`。** Bash 工具管道 stdout → **v1 的每一次 `claude` 调用（不管加不加 `-p`）信任门都被强制打开**。这就是"验证 scope ≠ 部署 scope"的机制根源。**破法：PTY。**

### V3 — **部署 scope 实测**（交互态 + 真信任门；三格 + control）

`t3y()` ⑤ 是祖先遍历 → **在已受信的 fork 里建一个嵌套 git 仓，就能拿到"交互 + 真信任 + 独立 localSettings"，且不弹对话框、不碰 luca 的全局配置**。

| 格 | cwd | isInteractive | 信任来源 | key | **观测结果** |
|---|---|---|---|---|---|
| **U（control-1）** | `/private/tmp/.../probe-untrusted` | **true**（PTY） | 无祖先受信 | — | **弹出 "Yes, I trust this folder" 对话框** → 证明 PTY 真的翻了 `isInteractive`，且 `qd()` 真被求值 |
| **T（treatment）** | `<fork>/.tmp-probe-v2` | **true**（PTY） | **仅 ⑤ 祖先遍历** | `settings.local.json` → canonprobe | **`ZORBAX-V2-8891-QUUX`** |
| **C（control-2）** | 同 T | true | 同 T | **key 删掉** | **`NONE`**（ZORBAX 计数 = 0） |

**T 格的决定性细节**：探针目录自己的 trust key 实测是 **`hasTrustDialogAccepted=False`**，且**没有弹对话框** → 信任**只可能**来自 ⑤（祖先 `/Users/luca/Desktop/项目/muse/lucagstack` = True）。**④ 阴性 + ⑤ 阳性 → 机制被隔离。**

→ **`localSettings.autoMemoryDirectory` 在真交互态、由真信任门放行的条件下被采纳。这是 §3 要部署的同一个分支、同一个 scope。C 格证明该实验能失败。**
→ 顺带 VERIFIED：**只有 `MEMORY.md` 被注入**（canonprobe 里只有 MEMORY.md，模型仍读到索引）。

**基线（本人核，无干扰）：** `autoMemoryDirectory` 在**全部 5 个在盘 settings 文件**中均 `<unset>`；两处 `managed-settings.json` **均不存在**（policySettings 缺席）。→ 今天 `KFh()` 返回 undefined，`Ry()` 走 slug 派生。

### V4 — **改名场景实测**（红队的头号严重项，我推翻它的结论）

模拟"fork 改名成一个没有受信祖先的路径"：`/private/tmp/.../probe-rename`（untrusted）+ key 在 localSettings。

```
PTY 起 claude → 弹出信任对话框（"trust this folder" 实测命中）
发 \r 接受        → 
问哨兵           → KRYPTO-R9-4417-VEX          ← key 当场生效
事后 ~/.claude.json 里该路径 hasTrustDialogAccepted=True   ← 接受被持久化（下次走 ④）
```

**裁决：**
- **v1 的结论（改名不击穿）对，理由（"配置文件跟着目录走"）错且无证据** —— 真正的原因是**信任对话框重新武装了 ④②**。
- **红队的结论（"改名 → 静默回落 → M1 死法原样复发"）错** —— 它模拟了 ④⑤ 却漏了 ①②③，也漏了"不信任 = 阻塞对话框而非可运行状态"。**失败不是静默的，是一个 luca 必须点的模态框。**
- **红队的窄断言仍然成立且我采信**：v1 用来判死 symlink 的那条离散依据（"改名不击穿"）当时**零证据**，不该承重。**现在它有证据了**（本节）。

### V5 — 服务端两闸的**真实缓存值**（推翻我方 v1，也补上红队没找到的东西）

**v1 说"两个 flag 均不在本地 statsig 缓存"——`/Users/luca/.claude/statsig/` 这个目录根本不存在**（`ls` → `No such file or directory`）。**又一次把"目录缺席"读成"值为假"。**

闸值**真的被缓存了，在 `~/.claude.json`**（我全盘扫 6002 个文件才挖到）：

```json
"cachedGrowthBookFeatures": {
    "tengu_onyx_plover": {"enabled": false, "minHours": 24, "minSessions": 3, "remoteEnabled": false},
    "tengu_moth_copse":  false },
"cachedGrowthBookFeaturesAt": 1784175712043    →  2026-07-16 12:21:52   ← 今天，我跑探针时刚刷新过
```

代入本人读到的原文：
```js
function PKu(){return et("tengu_onyx_plover",null)}
function Kcs(){let e=PKu();return e?.enabled===!0||e?.available===!0}     → false
function Puo(){if(!Kcs())return!1; let e=zn().autoDreamEnabled; if(e!==void 0)return e; return PKu()?.enabled===!0}
                                                                          → autoDream = OFF（!Kcs() 短路）
function y9e(){if(et("tengu_moth_copse",!1))return!0;if(Rqn)return!0;return!!process.env.CLAUDE_MEMORY_STORES?.trim()}
                                            moth_copse=false, CLAUDE_MEMORY_STORES=<unset>  → sync = OFF
```

**红队对 v1 的两条弹劾我复核成立、并采信：**
- 锁：`mlo(e){…if(e===0){await JJ.unlink(t);return} …utimes(t,r,r)…}` → **首跑后 unlink，否则把 mtime 回拨**。"find 不到锁"与"跑过并清理了"完全相容 → **推不出"从未跑过"**。
- 遥测：`~/.claude/telemetry/` **21 个文件 100% 是 `1p_failed_events`**（符号表含 `queueFailedEvents`/`retryFailedEvents`，常量 `Kkc="1p_failed_events."`）→ 是**上传失败死信队列**，成功事件不落这里。v1 把证据读反了。

→ **我的诚实结论**：**"从未跑过"不可知，我不主张。** 但"**此刻是关的**"现在有**真实缓存值**支撑（比 v1 强，也比红队的"无力排除"精确）。**它仍是服务端可翻的值 → TOCTOU 结构不变 → §5 卡点 6，我不替 luca 接受。**

### V6 — 数据真相（红队的算术全对，我复核并给出可派生的真值）

```
母版 39 文件 / fork 16 文件；共有 6 / 仅 fork 10（16,847 B）/ 仅母版 33
共有 6 中：IDENTICAL ×4，DRIFTED ×2 → MEMORY.md（2,862 vs 13,771）、feedback_symptom-first-before-acting.md（2,629 vs 2,570）
索引：母版 26 条 / fork 11 条
  精确同名重叠 = 2  → feedback_stay_in_session_scope.md、feedback_symptom-first-before-acting.md
  归一化(-/_)后重叠 = 3（多出 alias 双胞胎）
  → 正确归并 = |normalize(母版) ∪ normalize(fork)| = 34        ← v1 三处写死 36，over-count = 2
```
**v1 的 A6 会在一次完全正确的归并上 BLOCKING FAIL**，逼执行者补 2 条重复/悬空索引凑数——**亲手造出 A6 上半段要防的东西**。红队对。
→ **本案的修法不是"把 36 改成 34"**，而是 **§4 A3 现场从两份索引派生，不写常数**。

### V7 — 自造证据审计（birth time，`stat -f %SB`）

```
candidate_feedback_verify-params-before-offering-choices.md   母版 07-16 10:27 / fork 10:28    ← 今天
candidate_feedback_verify-in-the-deploy-scope.md              母版 07-16 11:12 / fork 11:13    ← 今天
candidate_feedback_disclosure-is-not-remediation.md           双库 07-16 11:13                 ← 今天
feedback_symptom-first-before-acting.md                       母版 07-16 09:46 / fork 09:45    ← 今天（且已漂移）
feedback_stay_in_session_scope.md                             母版 07-15 19:00 / fork 18:55    ← 昨案登记的双写，仍 IDENTICAL
feedback_autocommit-*（alias 双胞胎）                          双库 07-11 11:35（同分钟）        ← 真·5天漂移，算数
candidate_feedback_grep-cjk-silent-false-negative.md          fork  07-11 12:44                ← 真·孤儿，算数
```
**昨案 §8 登记的 `candidate_feedback_ant_profile_shadows_max.md`：`command find ~/.claude/projects -iname '*ant_profile*'` → 空**（对照：同一条 find 能列出 17 个 `MEMORY.md`，探针非瞎）。**它从两个库同时消失、从未进过任何 digest、零告警。** `daily_governance.py:228` 的 `check_person_memory()` 明写对全局目录**只读**、绝不自动写/改名/归档 → **删除者不可考，但"发生了 + 零检测"已证**。这条是**新增代价**，进 §6。

### V8 — SC-005 的**仪器实测**（红队开的药，我实测它不对症）

红队裁定："`--supersedes` 过三问全 yes → 立即做"。**我读了仪器本身：**

```
memory/scripts/propose_semantic.py:100      "supersedes": args.supersedes,      ← 只写一个字段
memory/scripts/consolidate_memory.py        全文 'supersed' 仅 1 处命中：
  L483  for key in ("evidence","reviewer","valid_until","supersedes"):          ← 只是把字段抄过去
```
→ **`--supersedes` 是注释，不是动作。** 跑它 **不会**让 SC-20260715-005 退场：它仍是 `CANDIDATE / awaiting_approval / stable_requested=True`，digest 里那条**可直接粘贴的 `--set-stable` 仍然上膛**，而我还额外塞进去一条**内容相反**的候选。

真正能让它退场的是 `--reject`，而：
```
consolidate_memory.py:750  --reviewer  "操作者署名：--set-stable/--reject 必填，写入 reviews.jsonl 审计记录"
consolidate_memory.py:754  "--set-stable/--reject 需要 --reviewer <你的名字>（人工闸门审计留痕）"
```
→ **`--reject` 在设计上就是人工闸门**（`SC-20260523-003` 红线的执行面）。**agent 署名 = 伪造人工审计留痕**，比不做更坏。

→ **裁决：这不是 re-litigate，是仪器不对症。** 红队自己那句"可客观验证：candidates.jsonl 读回"——**读回只能证明新记录落了盘，证明不了 005 被解除**。**那把尺子没在测量它要测的东西**，正是红队一路在杀的病。→ §5 卡点 7 给**原文命令**，不是重新问一遍"要不要修"。

### V9 — 母版改动面实测（"零改动"到底真不真）

```
shasum -a256 双仓 memory/scripts/daily_governance.py → 同为 376d862597b7f580…  ；cmp -s → IDENTICAL
capability-parity.json 注册：/files/memory/scripts/daily_governance.py
CLAUDE.md:29 双仓一致原则 → 单边改直接撞 verify 门
```
→ **任何挂进 `daily_governance.py` 的每日断言 = 双仓框架代码改动。** v1 头条写"母版零改动"、卡点里又承认要 +20 行——**红队对，两个数打架**。本案的处置见 §3/§4：**把每日守护整个移出方案**，而不是把它藏进卡点。

**基线（本案要改的那个文件）：**
```
<fork>/.claude/settings.local.json  存在（1,478 B），当前仅有 "permissions" 一个 top-level key
.gitignore:88 命中；两仓 git ls-files → 0（均未跟踪）
```

---

## 3. 方案 M2 —— 最小收敛

**动作（全部内容）：**

1. **fork 的 `.claude/settings.local.json` 合并写入一个 key**（该文件已存在且含 `permissions` → **合并，不覆盖**）：
```json
{ "autoMemoryDirectory": "/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory" }
```
2. **数据**：fork store 的 **10 个 fork-only 文件**复制进 canonical（**只复制不移动**，旧 store 原地留作回滚）。
3. **3 处人工裁决**（不是 v1 说的 1 处——红队对）：
   - `feedback_autocommit-*` alias 双胞胎（**真漂移**，07-11 双写 → 已分叉）→ 合并两侧内容，统一命名
   - `feedback_symptom-first-before-acting.md`（今天造的漂移，59 B 差）→ 合并两侧内容
   - `MEMORY.md` 索引人工合并 → **34 条**（V6 派生，不是常数）
4. **读侧脚本 / CLAUDE.md / app：零改动** —— 9 处硬编码**本来就指向母版 store**，切换后从"陈旧"变成"正确"。
5. **两个死库（7 文件）**：不动。

**改动面（精确计价，不含糊）：**

| 面 | 改动 |
|---|---|
| **母版 git 仓** | **零** |
| **fork git 仓** | **零**（`settings.local.json` 是 gitignored、两仓均未跟踪，V9） |
| **母版 person store**（不在任何 git 仓内） | **+10 文件 / +16,847 B；索引 26 → 34** ← **这是方案的目的，不是副作用** |
| **每日自动守护** | **本方案不含**（要含就必须改 `daily_governance.py` = 双仓框架代码 → §5 卡点 2） |

**为什么是 localSettings：**

| | userSettings | **localSettings（本案）** |
|---|---|---|
| 优先级 | `??` 链**末位**，任何仓的 project/local 设了就静默压过 | 仅次于 policy/flag（**两处 managed-settings.json 均不存在**，V3 基线）。**压过 projectSettings** |
| 信任门 | **不受 `e?` 门管**（在括号外） | **受门管** → 但门只在"未接受信任对话框"时关，而那是阻塞态非运行态（V2/V4） |
| 影响面 | **全机器所有仓**（含 code-\*）→ 触发 V11 的项目事实污染 | **只有 fork** |
| 暴露面 | — | `.gitignore:88` 已挡，不进任何仓 |
| 动全局配置 | 要（撞 `feedback_no-auto-edit-global-claude-config`） | **不要** |

**代价（诚实计价）：**

1. **索引 26 → 34**，加剧「person 层 MEMORY.md >20 条」那条已复读 11 天的 flag。解药 `SC-20260630-001` 已 stale 15 天。→ **§5 卡点 4，不自答。**（**不是** harness 上限问题：`ite=200` 行 / `iCe=25000`，34 条 ≈41 行 ≈16.6 K，离闸很远。）
2. **fork 旧 store 冻结**为考古 + 回滚点。
3. **归属信息**：合并后无法再从目录名区分"这条学在母版还是 fork"。按 CLAUDE.md 三分表，person 层本就不该按仓分；muse 专属事实的正确落点是 `.luca/memory/`。**这条我判断可自答**（有框架既有规则依据）。
4. **回滚**：删 key → fork 退回自己的库。目标是**既存的、已被治理的**库，不是新造的库 → 回滚真便宜。
5. **新机器 / 新 clone**：`settings.local.json` gitignored → 不随 clone。**真限制**（§6），A1 会 FAIL → 至少不静默。
6. **新增：canonical 成为唯一活跃副本，而 canonical 侧丢失零检测**（ant_profile 实证）。→ **§6，我不假装治了。**

---

## 4. 断言

> 纪律：**每条必须真能抓到它声称抓的失败模式，且有具名执行者。写不出就不写。**
> **v1 的 A2/A3/A4/A6（每日守护）在本案被整个删除，不是改进** —— 它们必须改 `daily_governance.py`（双仓 + parity，V9）= 框架代码改动 = 拍板禁止。**留着它们只会让本案头条的"母版零改动"变成第二次说谎。**
> 剩下的三条**全部是一次性验收门**——因为它们守的风险（归并事件、key 是否生效）**本来就是一次性的**。

| # | 抓什么失败模式 | 怎么抓（真能抓到的理由） | 谁跑 / 接进哪里 |
|---|---|---|---|
| **A1** `[BLOCKING]` 验收 | key 打错 / 未生效 / 被压过 / 新机器无此文件 → **fork 仍读旧库，且静默**（`mHc()` 不校验存在性，harness 会 `mkdir` 替你把错目录造出来 → 光看配置文件永远发现不了） | 母版 `MEMORY.md` 末尾放一条 canary 条目（`- [canary](canary.md) — PERSON-CANON-OK-2026-07-16`）；**在 fork 里开一个交互 session 问"你的记忆索引里有 PERSON-CANON-OK 吗"**。**可失败性已实证**：§2 V3 的 C 格（去掉 key）→ `NONE` | **luca 本人，交互 session。** ← **这条不能自动化，也不该假装能**：`claude -p` 令 `pn()=true` → `CPe()` 短路 → **结构上验不到信任门**（v1 的 A1 正是这么写的）。**只有他的 session 是部署 scope。** 切换当场 + harness 大版本升级后各跑一次 |
| **A2** `[BLOCKING]` 验收 | 归并**丢内容**——含 v1 的结构性盲区：「alias 双胞胎判错 = 整份丢弃 fork 版」 | fork store **每个**文件 f：`sha256(f)` ∈ canonical → PASS；**否则** f 必须在 merge-ledger 里指定 target T，**且 f 的每一非空行都必须出现在 T 中**（行级包含）。→ **整份丢弃 fork 版 = 行不包含 = FAIL**。**allowlist 从"豁免"变成"加严"** —— 上榜 = 要过更严的检查，不是不检查。全文件枚举，**不用 `feedback_*` 前缀**（实测 `parallel-lucagstack-fork-merge-care.md`、`verify-runtime-not-spec.md` 等真记忆**没有该前缀**） | 执行归并的人当场。**一次性脚本放 scratch，不进仓** → 不触发 parity/双仓。**诚实：我没跑过归并（本案未执行），但我实测了它的输入集**（V6：当前 fork 16 文件中 12 个 hash 不在 canonical；归并后应只剩 ledger 那 3 条走行级包含） |
| **A3** `[BLOCKING]` 验收 | 索引悬空（条目在、文件没了 → 静默丢召回）+ 条目被吞/被重复 | ① 每条 `- [x](y.md)` 的 `y.md` 必须存在于 canonical；② 归并后条目数 **== `|normalize(母版索引_pre) ∪ normalize(fork索引_pre)|`，从归并前那两份文件现场算**，canary 条目单独排除后再比。**不写常数** —— v1 写死 36、真值 34，BLOCKING 门在正确归并上恒 FAIL；**常数是算出来的，从来没量过**。派生式没有这个失败模式 | 执行者当场，同一次性脚本。**今日实跑基线**：母版 26 条 0 悬空 / fork 11 条 0 悬空 → 上半段今天是绿的，故这是纯派生问题不是数据问题 |

**本方案明确**没有**的守护（不掩饰）：**
- **key 在两次 A1 之间静默失效**（非改名场景：文件被删/被覆盖）→ **无检测**。改名场景由信任对话框兜（V4，响亮），**其余不闭合**。
- **canonical 侧丢失**（ant_profile 那种）→ **无检测**，且归并后 canonical 是唯一活跃副本 → **风险变大**。
- 二者都要每日执行者 = `daily_governance.py` = 框架改动 → **§5 卡点 2**。**我不写空壳，也不写"提醒"冒充"阻断"。**

---

## 5. 人类卡点（只有 luca 能定，我不自答）

1. **框架建设预算。** 软上限 2 次/月。**我没能测出可信数字**：`episodic/index.jsonl` 里根本没有"是否纯框架 session"这个字段。红队报 7 月 19 条 ≈ **9.5×**，本案是第 20+ 条。**任何数字都是推断而非测量，这正是它归你的原因。** 本案是否值得再花一次？
2. **前作「只收尾 + 提案，不改框架代码」的范围拍板是否解除？** 本案 M2 = 1 个 gitignored 配置 key + 10 次文件复制 + 索引人工合并。**`settings.local.json` 算不算"框架代码"，我不替你解释。** 本文默认拍板仍然有效 → **因此本案是提案，我没有执行任何一步。** 另：**每日守护（A2/A3 的复发版）必须改 `daily_governance.py`（双仓+parity，V9）——那明确是框架代码改动，本案已把它整个移出；要不要单独解禁它，也是你定。**
3. **scope=A 的裁决效力。** 你是在 v0 那个"canonical 放公开仓"的错误路径信息下选的 A；红队证明 A 唯一的承重论证（"project 事实仅 5 个"）用的尺子无效（`ls project_*`，而 project 事实压倒性地叫 `MEMORY.md`）。**我复核成立并在此推翻 A。** A 作废后是否采纳 M2，还是回到 §1.2(b) 只止血 —— **你定**。
4. **索引 26 → 34：先剪枝再并，还是同批做？** `SC-20260630-001`（按每条价值剪、不为凑数字剪）已 stale 15 天，是「>20 条」那条 flag 的解药，两者互等了 11 天。**不先定这条就归并 = 拿一个已知问题去喂另一个已知问题。**（数字这次是**量出来的 34**，不是 v1 那个没量过的 36。）
5. **sync watcher（`tengu_moth_copse`）。** 实测**当前缓存值 = `false`**（V5），且 `CLAUDE_MEMORY_STORES` 未设 → **今天是关的**。但它是**服务端可翻的缓存值**，开关不在你手里；bundle 原文称服务端有写权（"a future session with the store mounted will overwrite it with server content"）。**这是现状风险**（母版 store 今天就是 `Ry()` 的返回值、就是同步目标），本案只让靶值 +13%。**我没端到端追通 discovery 能否单独填充某个 store → 我不替你判"增量可忽略"。** 接受 / 另案 / 现在做点什么？
6. **要不要 pin `autoDreamEnabled: false`？** 实测**当前 `tengu_onyx_plover.enabled=false` → `Kcs()` false → `Puo()` 短路返回 false → autoDream 今天是关的**（缓存 12:21:52 刷新，V5）。`Puo()` 里 `zn().autoDreamEnabled !== undefined` 会钉死、绕过服务端 gate（`zn()` 读**合并后的有效 settings** → 可写进同一个 localSettings）。**我推翻 v1 的"它从未跑过"（证据无效），也不主张"必然安全"** —— 它是**服务端可随时翻的值**，而归并窗口虽只有秒级，TOCTOU 结构不变。**这是关掉一个官方功能、且是你的数据 → 你定，我不给推荐。**
7. **`SC-20260715-005` 仍是 `CANDIDATE`、reviewer=luca、stable_requested=True，原文未改**，其 fact 含「唯一真·harness限制是『目录名由cwd派生、不接受env覆盖』」——**两处均被我实证推翻**：
   - 「由 **cwd** 派生」→ 实为 `tp(rc()) ?? rc()`，即 **git root of `projectRoot`**（`rc(){return VO()?.projectRoot??Ot.projectRoot}`）。我的探针独立佐证：`<fork>/.tmp-probe-v2` 一 `git init` 就拿到**自己的 slug 库**（去掉 key 的 C 格返回 `NONE` 而非 fork 的库）。
   - 「不接受 **env** 覆盖」→ `hHc(){return mHc(process.env.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE,!1)}` 且 `Ry(){let e=hHc()??KFh();if(e)return e;…}` → **env 覆盖存在且优先级最高**；另有 `_9e()` 读 `CLAUDE_CODE_REMOTE_MEMORY_DIR`、`cn()` 读 `CLAUDE_CONFIG_DIR`。
   - **更根本**：它整句的前提「这是 harness 限制」本身就错 —— **`autoMemoryDirectory` 可覆盖，我已在部署 scope 实测**（V3）。

   **险情已上膛（不是将来时）：** `memory/digests/2026-07-16.md`（mtime **09:49**，早于本文）「⏳ 待你裁决」头条就是它，后面跟着可直接粘贴的 `--set-stable`。点一次头 → 已知错误的事实进 `promoted-facts.yaml`，此后每 session 注入。
   **为什么这条只能你做（我实测过，不是推诿）：** 红队开的药 `--supersedes` **是注释不是动作**（V8：`propose_semantic.py:100` 只写字段；`consolidate_memory.py` 零退场逻辑）→ 跑它**不会**解除 005，只会多一条相反的候选。真正的仪器 `--reject` **强制 `--reviewer` 且原文写明"人工闸门审计留痕"** → **agent 署名 = 伪造人工审计**。
   **原文命令（你粘，10 秒）：**
   ```
   python3 memory/scripts/consolidate_memory.py --reject SC-20260715-005 \
     --reason "fact 含两处已实证证伪：派生自 projectRoot 非 cwd；env 覆盖存在(CLAUDE_COWORK_MEMORY_PATH_OVERRIDE)且优先级最高；且『harness 限制』前提本身错——autoMemoryDirectory 可覆盖(2026-07-16 部署 scope 实测)" \
     --reviewer luca
   ```
   （`SC-20260715-006` 关于 S1 的内容我复核**无误**，且 **S1 至今仍活**：`get_memory.py:161` `last=ep[-1]`，零归属过滤；`--project` 过滤只存在于 `:171` 的 `--layer episodic` 分支。不受影响，不要连坐。）
8. **既成公开泄露。** 母版仓 PUBLIC 且 `memory/` 被跟踪（红队量化 8 文件 ≈180 KB，`.gitignore` 挡了 live 却没挡 archive）。**与本案无关**（本案不碰仓内 `memory/`；person store 不在任何 git 仓内）。但既然掀开了：另案？注意 **git 历史不可删**，删文件 ≠ 删历史。
9. **母版侧的 projectSettings 覆盖通道。** schema 那句 "Ignored if set in projectSettings … for security" 与代码实际行为**不符**（`KFh()` 明确读 `Rr("projectSettings")?.autoMemoryDirectory`），而母版 `.claude/settings.json` **被跟踪且在公开仓**。今天无人设该 key → **零在场危害**。本案对 fork 免疫（localSettings 压过 projectSettings），**母版不免疫**。要不要另案加防护？

---

## 6. 本方案不治什么

| 项 | 状态 | 说明 |
|---|---|---|
| **S1**（`--summary` 注入全硬盘最后一个 session 的 next_risk，零归属过滤） | ❌ **不治** | `get_memory.py:161` 的独立 bug，与 person 层分裂无关。**我今天复核它仍然活着。** 昨案标 🔴 且「当天真咬人」。—— **我必须把这个对比摆在你面前：一个已确认在咬人的 🔴 无人管，而本案是 🟠 的组织问题。我不替你排优先级，但你不该在看不到这行的情况下批本案。** |
| **归并后 canonical 单点丢失** | ❌ **不治，且本案让它变重** | ant_profile 已实证：**从两库同时消失、从未进 digest、零告警**（V7）。归并后 canonical 是唯一活跃副本 → 丢失 = 教训蒸发。**A1–A3 全部看不见它**（不在 fork → A2 看不见；候选不进索引 → A3 看不见）。**这是本案新增的代价，v1 完全没列。** 要治需要每日执行者 → 卡点 2 |
| **key 在两次 A1 之间静默失效**（文件被删/覆盖，非改名） | ⚠️ **残余盲区** | 改名场景由信任对话框兜（V4，响亮不静默）。其余无检测。**我不假装这里闭合了。** 要治 → 卡点 2 |
| **S6**（fork 仓内 `memory/` 是 7-09 死数据） | ❌ 不治 | `MEMORY_ROOT` 层，与 `autoMemoryDirectory` 两条机制不相交，另案 |
| **S8**（slug 碰撞） | ⚠️ **部分** | 对 fork **消失**；对其余 17 个库**依然在**。v0 说"自动消失"是 over-claim |
| **code-\* 等 15 个库的"分裂"** | ❌ **不治，且主张不该治** | 它们是 per-repo 项目档案（`#ff8000`、Figma Key、"用 pnpm 不要用 npm"），harness 的 per-repo 设计对它们**正确工作**。并进全局注入面 = 污染 + 判它们失联 |
| **新机器 / 新 clone** | ⚠️ 真限制 | `settings.local.json` gitignored → 不随 clone。**但 A1 会 FAIL → 至少不静默** |
| **既成公开泄露 + git 历史** | ❌ 不治 | 卡点 8 |
| **母版侧 projectSettings 通道** | ❌ 不治 | 卡点 9 |
| **两个死库（7 文件，含 M1 约定文档）** | ❌ 不治 | 考古；要捞另说 |
| **v1 session 的实验残留** | ❌ 不治，只登记 | 4 份 transcript ≈86 KB 仍在盘（V0）。**不是我的 session 的产物**，按 `feedback_stay_in_session_scope` 只报告不动 |
| **未安装的 launchd 治理任务** | ❌ 不治，只登记 | `scripts/launchd/com.luca.memory-governance.plist` 在仓里但从未安装 → 「每日治理」实际只靠开 session 触发。**与本案无关，不夹带** |

---

## 7. 我可能错在哪

> **纪律：每条要么给出已执行的处置，要么指向 §5 的编号卡点。没有一条是"写下来然后继续往下写"。**

1. **V3/V4 的 PTY 探针跑在"嵌套 git 仓 / 临时目录"，不是 fork 仓根本身。**
   → **处置**：探针刻意如此，**为的就是不碰 luca 的真配置**。它验的是**机制**（交互态 + 真信任门 + localSettings 分支），三格 + control 齐全。**残余**：我没在 fork 仓根真装过那个 key（那就是执行，而拍板禁止）→ **由 A1 兜，执行者是 luca 本人**（§4）。**这是有意的边界，不是遗漏。**

2. **`t3y()` 的 ①`CLAUDE_CODE_SANDBOXED` / ③`Pi()`（bg 模式）我没实测。**
   → **处置**：对本方案**不承重** —— 它们只会让门**更容易开**（返回 true），而本案需要的正是门开。**它们若失效，方向是安全的**。已就地标注，未用于任何论证。

3. **`D0()`（slug 消毒函数）我没消歧到位** —— bundle 里有 3 个同名定义。
   → **处置**：**不承重**（本方案**覆盖**派生路径，不依赖 slug 长什么样）。故我**不作**任何关于 slug 具体拼法的断言。V3 的 C 格（去掉 key → `NONE`）已从行为侧证明"每个 git root 一个库"，无需读懂 `D0()`。

4. **我用"母版 store 已是 sync 靶心"论证增量风险小。** 若 discovery 只填充特定 store，"+13%"就不准。
   → **处置**：**我没端到端追通 discovery（红队也没有）→ 因此我不作这个判断，整条升级为 §5 卡点 5，不当既定前提往下写。**

5. **autoDream「今天是关的」建在一个缓存值上。**
   → **处置**：我**只**主张"此刻缓存值为 false"（有实测，V5），**不主张**"从未跑过"（v1 的说法我已推翻）、**不主张**"归并期间必然安全"。pin 与否 → **§5 卡点 6，我明确不给推荐。**

6. **A2/A3 我定义了但没跑过**（因为归并本身没执行）。
   → **处置**：**如实标注**（§4 A2 栏内）。我实测的是它们的**输入集**（V6），不是它们的输出。**这是"未执行"的必然后果，不是掩盖** —— 若 luca 批准执行，A2/A3 必须在归并当场跑出绿灯才算数。

7. **1.2(b)「只止血」可能才是对的答案。**
   → **处置**：**不自答** → §5 卡点 1 + 3，且我在 §1.3 明确写了"若 luca 选 (b)，我不会争"。

8. **我推翻了红队的头号严重项（改名静默击穿）。若我对 `eHe(!0)` 在启动链上的位置读错，V4 的自愈结论就错。**
   → **处置**：**V4 不是读代码读出来的，是跑出来的** —— untrusted 目录 + key → 弹框 → 接受 → 哨兵返回。**这是行为观测，不依赖我对启动链的理解。** 代码只是解释，观测才是证据。

---

## 8. 与红队裁决的关系

**我采信并复核成立（全部据此改了方案，不是记在纸上）：**
- 索引算式 36 → **34**（V6）→ **§4 A3 改成派生式**
- §3 漏掉第二个漂移文件 → **§3 动作 3 现在是 3 处人工裁决**
- A5 allowlist = 盲区 → **§4 A2 改成"上榜=加严"+行级包含**
- 「母版零改动」两个数打架 → **§3 拆开精确计价；每日守护整个移出方案**
- v1 的 V0「已实证零泄漏并清理」为假 → **§2 V0 逐条审计+还原+可失败 control**；v1 的残留仍在盘，我登记
- §1.1 有自造证据 → **§1.1 直接删掉那几行**
- autoDream 的锁/telemetry 两条腿无效 → **推翻我方 v1，改用真实缓存值**
- scope=A 的尺子无效 → **复核成立，A 作废**

**我推翻红队的（有实测，不是嘴硬）：**
- **「改名 → t3y()=false → localSettings 被跳过 → M1 死法原样复发（静默）」——错。** 它模拟了 `t3y()` 的 ④⑤，漏了 ①②③，也漏了"不信任是阻塞对话框而非可运行状态"。**实测：弹框 → 接受 → key 当场生效**（V4）。红队的**窄断言**（v1 那句"改名不击穿"当时零证据、不该承重）**成立且我采信** —— 我给它补了证据。
- **「A1 跑 `-p` 固化盲区，该残余指派给 A2 兜底」——诊断对，处方我不采。** 我的处置不是"找个自动的兜底"，而是**承认部署 scope 只有 luca 能验，把 A1 的执行者写成他本人**。
- **「SC-005 三问全 yes → 立即做」——仪器不对症**（V8）：`--supersedes` 是注释不是动作，`--reject` 强制人工署名。**红队那句"可客观验证：candidates.jsonl 读回"验的是错的东西。**
- **「telemetry 无 auto_dream = 它跑过的样子」——方向对，但两边都没找到真值。** 真值在 `~/.claude.json` 的 `cachedGrowthBookFeatures`（V5），**v1 说的 statsig 目录根本不存在**。

**红队没看见的（本案新增）：**
- `isInteractive = !(--print || --init-only || --sdk-url || !stdout.isTTY)` → **管道 stdout 即 `pn()=true`**，这是"验证 scope ≠ 部署 scope"的**机制根源**，也是 PTY 破法的依据
- `t3y()` 的 ①②③ 三条早返回；`eHe(!0)` 的启动链位置
- 两个服务端闸的**真实缓存值**在 `~/.claude.json` 而非 statsig 目录
- bundle 存在**大量 minified 名字碰撞**（`CPe`/`Ry`/`D0`/`tp`/`f0e` 各 ≥2 个定义）→ 任何 `strings | grep` 结论必须先消歧
- `t9a()` 会枚举"哪些 settings 文件设了 `autoMemoryDirectory`"并喂给一个含 `hasAutoMemoryDirectory` 的披露对象（与 `hasDangerousEnvVars` 等并列）→ **harness 自带一个该 key 的可见性面**。**我没追到它在哪渲染，故不承重、不用于任何论证**（登记备查）

---

<!-- FILE_END: 2026-07-16-person-memory-plan-v2 -->
