# 红队裁决：person 记忆统一送审稿 —— **不通过**

> 对象：`2026-07-16-person-memory-unification-plan.md`
> 方法：5 个独立视角，全部指令为「证伪」，默认立场「它错了」。禁止只读文档下结论，必须实证。
> 模型：redteam 档位 = `reasoning-heavy` → fable 白名单 P1「对抗判定」；**fable 配额用尽 → 按 model-routing 降级链降至 opus，已告知 luca**。
> 交叉验证：致命项均被 ≥2 个互不通信的视角独立命中。
> 红队边界：**只提问题，不给方案**。文末「必须交出去的事实」是证据的一部分，不是建议。

---

## 裁决

**方案的结论（`autoMemoryDirectory` 是正解）大概率是对的 —— 但送审稿作为决策依据不合格，且 scope=A 被证伪。**

- **2 条从未建模的泄露通道**，会造成真实损失（sync watcher / iCloud）
- **scope=A 的唯一承重论证，用的尺子根本没在测量**
- **断言层 A1–A6 全线失守**：A2 判死推荐项、A3 不验身份、A4 是空壳、A5 度量错 3 处、A6 结构性失明
- **执行后 S3 不是被治好，是被全局化**（净退化）
- **验证 KILL-1 的实验，结构上无法证伪 KILL-1**

---

## 一、最重的三条（新发现，方案完全没看见）

### [致命] 1. 泄露通道绑在 **key** 上，不在 **path** 上 —— 换路径逃不掉

`autoMemoryDirectory` 指向的目录，**恰好是 harness 自带 personal memory sync watcher 的推送目标**：

```js
await fwu(Qge?Ry():gH());   // 同步的就是 canonical person 目录
async function fwu(e){ ... await rxt.mkdir(e,{recursive:!0}) ... }   // mkdir + 装 watcher + push
function y9e(){ if(et("tengu_moth_copse",!1))return!0; if(Rqn)return!0;
                return!!process.env.CLAUDE_MEMORY_STORES?.trim() }   // 启用门：服务端 gate 或 env
```

服务端**还有写权**，bundle 原文：
> "The write was saved locally but is NOT being synced, and **a future session with the store mounted will overwrite it with server content.**"

**§3 的三个路径选项（P1/P2/P3）全部在错误的轴（git）上比较。** 它们的「泄露风险」栏是**关于 git 的断言，被当成关于泄露的断言**。通道跟 key 走，**换路径不可解**。

**本方案的全部价值 —— 把 52 条散落事实收敛成一个完整、高价值、单点的 person 语料 —— 恰好是把它放进这条通道的靶心。归并动作本身放大了这个风险，而风险栏写「无」。**

**诚实边界（红队自标）**：未观测到该 sync 在 luca 机器上真跑（三键均不在 settings 中，`Qge` 大概率为 null）；未端到端追通 discovery 能否单独填充 user-scope store。**但「无」是绝对断言，而这条通道的开关不在 luca 手里。**

### [致命] 2. `~/Desktop` **就是** iCloud Desktop —— `.gitignore` 对它零作用

```
stat -f '%d:%i'
  16777231:104359907  /Users/luca/Desktop/luca_gstack/CLAUDE.md
  16777231:104359907  /Users/luca/Library/Mobile Documents/com~apple~CloudDocs/Desktop/luca_gstack/CLAUDE.md
                      ^^^ 同一 inode
brctl status → CloudDocs foreground, last-sync 2026-07-16 10:45:29, Client Truth 树含 /Desktop/项目/
```

P2 的风险被写成「低但脆（一次 `git add -f` 或 ignore 改动即泄露）」—— 暗示需要误操作触发。**实际是无条件、即时、零 git 操作**：写进去那一秒同步到 Apple 服务器，推送到该 Apple ID 下所有设备。

**现存 `memory/` 同时在 GitHub public 和 iCloud 两条通道上。** P1/P3 碰巧不在 iCloud 树内 —— **那是运气，不是分析结果**。

### [致命] 3. KILL-2 不是「默认值未知」，是**没有默认值** —— 服务端可随时翻的远程 flag

```js
function PKu(){return et("tengu_onyx_plover",null)}          // 远程 statsig gate
function Puo(){ if(!Kcs())return!1;
  let e=zn().autoDreamEnabled; if(e!==void 0)return e;
  return PKu()?.enabled===!0 }                               // 服务端说了算
```

autoDream 是**真 mutator**：`.consolidate-lock`、`[autoDream] lock held by live PID`、`Lqu(e)` 按 mtime 列出被碰过的 session 且**排除当前 session**（→ **并行 session 的 transcript 正是它的食材**）、`utimes` 回滚、`tengu_auto_dream_completed{files_touched_*}`。

**Phase 3 窗口以小时计（19 库 + 逐对人工裁决）。「开工时确认 gate 关着」对一个时变的远程值结构上无效 —— 这是 TOCTOU。**

---

## 二、打在作者脸上：验证 KILL-1 的实验，无法证伪 KILL-1

反编译拿到解析函数本体（**作者写 E1 时手里就有这条 grep，停在 describe() 上没往下读 180 字符**）：

```js
function KFh(){let e=CPe(),
 t = Rr("policySettings")?.autoMemoryDirectory
  ?? Rr("flagSettings")?.autoMemoryDirectory                                   // ← Phase 1 测的是这个
  ?? (e ? Rr("localSettings")?.autoMemoryDirectory ?? Rr("projectSettings")?.autoMemoryDirectory : void 0)
  ?? Rr("userSettings")?.autoMemoryDirectory;                                  // ← Phase 4 要部署这个（最后一位）
 return mHc(t,!0)}
```

- **Phase 1（`claude -p --settings`）= flagSettings，链上第 2 位。**
- **Phase 4（`~/.claude/settings.json`）= userSettings，链上最后 1 位。**
- 按 `??` 短路：**flagSettings 命中时根本不求值 userSettings 分支。**

→ Phase 1 的门控「两个不同仓报告同一路径」**在 flagSettings 下必然 PASS，即使 userSettings 分支完全不工作**。
→ reviewer 事后补跑的真机实测（CANARY 双向通）**用的也是 `--settings`，同一分支**。
→ **KILL-1（后果栏写「全案作废」）被一个结构上无法证伪它的实验标记为已清。**

**E5 揭示的 per-scope 过滤，本身就是「此 key 的行为随 scope 而变」的铁证 —— 恰恰禁止把 flagSettings 的结果外推到 userSettings。**

### 连带：E5 的「不承重」方向是反的

E5 原文：「本方案选 user scope，该分歧对本方案不承重；但若 reviewer 建议改走 project scope，此处必须先验」。

**恰好说反**：
- 走 **project scope** 时**不**承重 —— 自己设的自己知道。
- 走 **user scope** 时**才**承重 —— **user 是所有其他 scope 都 undefined 时才被读到的那个分支**，别人的设置压你，你不知道。

**在场条件已核**：母版与 fork **都 git-tracked `.claude/settings.json`**，都另有 `settings.local.json` 在盘，且 fork 的 `.claude/settings.json:3` **正是用 projectSettings 注入 `MEMORY_ROOT` 做记忆统一的既有肌肉记忆**。今天 user scope 会赢是**运气不是设计**。

**失败场景**：任一受信任仓里有人设了这个 key → 该仓 session 的 person 记忆静默写到别处 → **断言 A3 依然 PASS**（它只读 `$HOME/.claude/settings.json`）→ **绿灯下分裂照旧**。这正是全文控诉的 fail-silent 类型，被本方案的守护面亲手复制。

---

## 三、scope=A 被证伪：尺子根本没在测量

### [致命] 「project 事实仅 5 个文件」是 `ls project_*` 的结果 —— 而 project 事实压倒性地存在于名为 `MEMORY.md` 的文件里

5 个提案**从未盘点**的 `code-*` 库，**100% 是 project 事实**，共 **13,554 字节**（≈母版整个 person 索引 13,771 的体量）：

| 库 | 实际内容 |
|---|---|
| `code-call-summary` | 「**包管理器: pnpm（不要用 npm，会导致 node_modules 冲突）**」、端口 3000 |
| `code-fx-list` | 主色 `#ff8000`（var `--color-primary06`），hover `#ff9b29` |
| `code-crm-list` | **Figma 文件 Key：`DYsoUXbZ5LUBMX2K0IXP4j`** |
| `code-vioce-code` | Next.js 16 + SQLite + Fish Audio API |
| `code--------` | Supabase + Prisma schema |

其中 4 个库**只有 MEMORY.md、零主题文件** —— MEMORY.md 就是一份散文式项目档案，不是索引。

**`project_` 前缀是 auto-memory writer 的不稳定命名习惯，不是 schema。全库 87 个文件里，带归属字段的 = 0。** 所以「6+:5」这个比值**没有在测量任何东西**。§5 是方案 A 唯一的承重论证，它建在一次 `ls` 上。

### [致命] C3 继承同一把坏尺 → 必然漏，且它写的「安全做法」执行结果是静默销毁

`[C3]`：「未把 **`project_*`** 事实当 person 事实并入（**应留在原库**或转 `.luca/memory/`）」

两处自毁：
1. 上面 13,554 字节的 project 事实**全部叫 `MEMORY.md`** → C3 逐条检查 `project_*` 全绿通过 → `#ff8000`、Figma Key、「用 pnpm 不要用 npm」**全部进入每 session 无差别注入的 person 索引**。
2. **「留在原库」在 user-scope 下 = 判它们永久失联。** 今天 ppt 仓的 session **确实**加载 `project_ppt_presentation.md`（harness per-repo 设计**正确工作**的部分）。切 key 后再也读不到。

### [严重] §8.1 的样本偏差可量化 —— 比值跟着**工作阶段**走，不是记忆的性质

样本窗口仅 4.6 个月。按月分布：`02:1 / 03:9 / 04:5 / 05:16 / 06:17 / 07:39（只过半月）`

- **49/87（56%）集中在两个 gstack 库**
- **Feb–May（code-* 时期）产出的几乎全是 project 事实；Jun–Jul（框架自建期）几乎全是 person/框架事实**

**这不是「person 事实天然占多数」，是「luca 这两个月在建框架」。提案把一个永久架构，拟合到一个短暂的工作阶段上。** 他一回到产品工作，project 事实立刻重新压倒 —— Feb–May 已经演过一遍。

### [一般] 证据规模是 gstack 家族 4 目录（56/87 = 64%），处方是塌缩 64 仓

全部在场痛点 —— S2/S3/S4/S5、「决定性反证」的孤儿文档 —— **都是 gstack 家族内部的事**：一个逻辑项目被 fork 和路径改名劈成 4 份。母版↔fork 实测：仅母版 33 / 仅 fork 10 / 共有 4 / 已漂移 2。

**这是一个 2–4 目录的问题，提案抡的是 64 仓的锤子。**用 64 仓塌缩去救 3 个文件，代价是那 13,554 字节的 project 事实全场污染。

### [严重] §8.3 的自我批评远不够狠 —— 不是「回滚是回配置」，是**回滚通道被物理拆除**

**当前，目录名就是归属记录本身**：`-Users-luca-Desktop-code-fx-list` 这个名字**就**告诉你这条事实属于 fx-list。这是 harness **免费、自动、100% 覆盖、由构造保证**的 provenance。

**实测：87 个文件里带 `repo:`/`project:`/`scope:` 字段的 = 0。**

塌缩 = **删掉这个机制本身**。归并后每条新事实落进扁平目录，**没有任何字段记录它来自哪个仓**。想退回 per-repo，必须从正文重建归属 —— 对不自报路径的 `feedback_*`，这不是「难」，是**信息论上不可能**。

**这不是可逆决策，是一扇每天变宽的单向门。**

---

## 四、执行后 S3 不是被治好，是被**全局化**（净退化）

**`autoMemoryDirectory` 在两个仓的代码里出现次数 = 0。没有任何脚本读它。**

读侧消费点全部锁死旧 slug，Phase 5 **一处都没提**：

| 文件 | 行 |
|---|---|
| `memory/scripts/daily_governance.py` | 24-27（**双仓**） |
| `.claude/hooks/session-restore.mjs` | 344-345（**双仓**） |
| `.claude/skill-os/extraction-bar.md` | 30（双仓） |
| **`/Users/luca/Desktop/项目/muse/app/main.js`** | **28（第三个仓，已烤进 `app.asar`）** |

**失败链**：Phase 4 切 key → harness 把新候选写进 CANON → `check_person_memory()` glob **旧 store** → 「只复制不移动」使旧 store 文件**原封还在** → **不抛异常、返回非空** → **digest 从此永远复读切换那一刻的冻结快照，且看起来完全正常** → 切 key 后新写的候选，**永久不进任何治理面**。

**今天母版 session 的候选是可见的（母版 store 正是被扫描的那个）。切 key 后母版 session 也开始写 CANON → 全部 store 的候选一起变孤儿。** §9 的「S3 ✅治」实际是 **S3 全局化**。

**加重情节**：`GLOBAL_MEMORY_DIR` 由 muse app 以 **env 注入**（已烤进 asar）。env 优先于脚本 fallback → **即使改对 `daily_governance.py` 的默认值，fork session 仍被 app 的 env 强制拉回死 store。必须改 app + 重打包 + 重装。**

### [严重] 1 个硬编码 slug → **9 个**硬编码路径

S2 的病不是「slug 写错了」，是**「唯一真值散成 N 份副本、无人同步、漂移无告警」**。

切 key 后真值 = settings.json 里的 key，**没有任何脚本读它**（grep=0）→ 9 个副本只能各自硬编码：
`CLAUDE.md:177`×2、`extraction-bar.md:30`×2、`daily_governance.py:26`×2、`session-restore.mjs:345`×2、`main.js:28`×1

**方案把「1 个硬编码 slug」换成「9 个硬编码路径」。造成 S2 的那个缺陷类，一个都没消除。**

---

## 五、断言层总账：全线失守

**实跑 Phase 3 字面执行（「19 库 → canonical，只复制不移动」）在真实数据上：**

```
CANON now has 66 files
!!! SILENTLY OVERWRITTEN (content differed) = 19
    feedback_symptom-first-before-acting.md: 2629B -> clobbered by 2570B
    MEMORY.md: 13771B -> clobbered by 287B   ← 母版主索引
    ...
    MEMORY.md:   301B -> clobbered by 148B   ← 最终存活者
```

拿断言去检它：

| 断言 | 实况 |
|---|---|
| **A1** | 唯一有效 |
| **A2** | **[BLOCKING] 对 §3 推荐的 P3 恒 FAIL**（P3=私有仓，必然在 git 仓内）；**对不存在的目录 PASS**（`cd` 失败 → `!` 取反）；测的是「在不在 git 仓」不是「在不在 public 仓」——**与它自称的 S9 守护目标不是同一件事**；且它用 `cd` 链，**违反 `feedback_verify-repo-with-git-c-not-cd-chains`（正是本方案要去救的那 4 条教训之一）** |
| **A3** | 只验 key 的**字符串形状**，不验它**指向 == CANON**。粘错路径 → **harness `mkdir(recursive)` 替你把错目录造出来** → A1/A2/A3 全 PASS → **刚归并的 52 条一条不加载，第 20 个死库诞生，全绿** |
| **A4** | **原文「此处为门控占位」—— `[BLOCKING]` 标签挂在空壳上**。全案唯一不可逆步骤的护栏为零。附：其 `feedback_*` glob 只覆盖 **61%** 语料（`feedback-*` 6 个 + 无前缀 21 个，含 fork MEMORY.md **正在索引**的 `verify-runtime-not-spec.md` 等真记忆） |
| **A5** | **对被清空成 148B 的残骸报 PASS**（只有上界，无下界、无条目守恒）→ **数据被清空时报绿灯**。且度量错 3 处：常数 `25600` 应为 **25000**；harness 量 **UTF-16 code unit**、A5 量 `wc -c` **UTF-8 字节**（中文 1.24–1.44× 偏差）；`wc -l` 差一。**且理由错**：截断**不是静默的**，harness 会把 `WARNING: MEMORY.md is N lines (limit: 200)...` 拼进加载内容 |
| **A6** | **结构性失明**：它 append `f.name` 判 `len(v)>1` = 「两个文件同时在场」。→ **忘了归并**（无害可见）= WARN ✅；**归并判错 / 同名覆盖**（有害静默）= **PASS ❌**。实跑 19 次覆盖**全部漏过**，只抓到 1 对。且它是 WARNING 不是 BLOCKING |

**C1（llm-judge「语义唯一」）也救不了**：它检查归并**后**的 CANON，被丢弃的那份已经不在那里 —— **判错所需的证据，恰恰被判错本身抹掉**。

### [严重] A1–A6 接进 `verify.sh` = 0；方案 D 被丢且未列「不治」

§5 承诺「修法是机械的（settings key），**守护是可执行断言（非文档）**」。

**但执行时跑一次的 bash 块是「测试」，不是「守护」。没有任何东西复跑 A1–A6。**

失败场景：settings.json 被编辑 / 打错字 / 换机器 / Claude Code 重置 → key 消失 → harness **静默回落**到 slug 派生目录 → **M1 原病复发，零告警**。A3 本可以抓 —— **如果有东西跑 A3**。没有。

> **方案自称「无一份新的约定文档」—— 它确实没写文档，但它把断言留在了纸上，功能上等价于约定文档：一次性、无执行者、下次改动静默击穿。**
> **M1 的失败模式，在自称吸取了 M1 教训的方案里，第三次复发。**

---

## 六、既成泄露被低估 8 倍，且 §3 引用的「分层意图」本身已被证伪

不是 1 个文件，是 **8 个 / ≈180 KB**（`git cat-file -s origin/main:` 量化，未打印内容）：

| public remote 上的文件 | 大小 |
|---|---|
| `memory/episodic/index.jsonl` | 54,323 B |
| **`memory/semantic/archive/candidates-2026.jsonl`** | **50,457 B** |
| `memory/retrieval-log.jsonl` | 34,726 B |
| `memory/episodic/archive/2026.jsonl` | 28,435 B |
| `memory/semantic/reviews.jsonl` | 10,076 B |
| **`memory/feedback_routing_complexity.md`** | 940 B |
| `memory/procedural_complex_skill_flow.md` | 1,132 B |
| `memory/episodic/archive/noisy-2026.jsonl` | 840 B |

**绕穿机制**：`.gitignore:113` 挡 live `candidates.jsonl` —— 但**归档副本 `semantic/archive/candidates-2026.jsonl` 被跟踪、50KB、在公网上**。`:110` 挡 `sessions/*.md` —— 但 `episodic/archive/2026.jsonl` 28KB 公开。**live 挡了，archive 没挡。**

→ **§3 引用「`.gitignore` 已做过隐私分层 → 框架早有分层意图」作为正面证据。那个意图是被证伪的。而 P2 的风险评级恰恰建在这个类比上。**
→ `memory/feedback_routing_complexity.md` 是个 **`feedback_*` 命名的 person 形状文件，已跟踪已公开** → §3 断言「person 层从未进入该考量」被证伪。
→ **公开仓 git 历史永久**：64 commits since 2026-05-26。**删文件 ≠ 删历史**。方案对此**零字**。

---

## 七、方法论病根（这条比任何单项都重）

> **把「我知道我在犯错」当成「我可以继续犯」的许可证。**
> §7 KILL 表、§8 反方、§10 候选毒化、§11 请 reviewer 回答 —— **四处自陈缺陷，四处照样往下写。披露不是修正，是用诚实买执行许可。**

具体：

1. **§2 标题「一手证据，非 subagent 转述」是 over-claim**：5 条证据 E2/E3/E4 RELAYED、E5 半残，**唯一一手的 E1 是一次 strings grep**。而该节**援引 `feedback_redteam-own-analysis-before-shipping`（"不得只建在 subagent 转述上"）作纪律依据 —— 援引这条规则的那一节，正是违反这条规则的那一节。**

2. **E1 → 结论是偷换概念**：昨案原文是「不接受任何 **env** 覆盖」，E1 拿出的是一个 **settings key**。settings key ≠ env var。**而真正的 env 覆盖存在，作者一个都没挖到** —— `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`、`CLAUDE_MEMORY_STORES`，**就在 `KFh()` 隔壁 80 个字符**。→ §1 那个「讽刺点」（全文修辞支点）**整个建在这次偷换上**。

3. **E5 弹劾了 E1 的信源，送审稿判它「不承重」**：E1 引用的那条 schema 字符串，**在同一句话里就被证明会说谎**（"Ignored if set in projectSettings" 已过期，代码实际读）。E5 不是"另一个话题的分歧"，是**信源可靠性弹劾** —— 全案唯一的一手证据来自一个已实证会失实的字符串。
   → **违反 `feedback_symptom-first-before-acting:20-21`：「任何一条证据同时在证伪自己的假设 → 立刻停下重判，别把已开始的叙事推下去」**
   → **与 7-15 原案逐字同构**：「我用来证伪 opus[1m] 的那条证据，同时也在证伪我自己的假设，那一刻就该判死，我却继续推荐了 logout」

4. **取证力度随结论方向变化**：对有利的主张（E1）跑 strings；对可能拦住不可逆归并的主张（KILL-2「默认值未知」、E5「未验代码」）宣布未知 —— **而答案就在同一条 grep 的隔壁**。**这比任何单条错误都更能说明这份证据链的分级不可信。**

5. **§8.4「我对本方案的细节把关强度不足以自证」是用泛化的自责换取具体豁免**：承认「我把关不严」之后，任何具体的把关失败都显得已被涵盖，**而没有一处因此被修**。真正的自攻应该产出行动项，**这一条产出的是免疫力**。

6. **§11 的提问方式完成了议程设置**：5 问全是「怎么做」，**没有一问是「要不要做」或「凭什么现在做」**。同时 §9 自认不治 **S1（昨案标 🔴 且「当天真咬人」，实测仍活着）** —— **一个已确认在咬人的 🔴 无人管，六个 Phase 的预算花在 🟠 的组织问题上，而 §11 不允许 reviewer 问这件事。**

### 复犯清单（对照 luca 已记录的规则）

| 违反 | 出处 |
|---|---|
| 「把文档规定当实际行为讲，还据此动了手」 | `feedback_symptom-first-before-acting:16` |
| 「证据同时在证伪自己的假设 → 立刻停」 | 同上 :20-21 |
| 「承重结论不得只建在 subagent 转述上」 | `feedback_redteam-own-analysis-before-shipping:18`（**被该节自己援引**） |
| 「已 flag 即是问题，不得当待裁决放过」（6-24） | §7 三条积压 flag：1 条被自陈「加剧」、`BACKLOG #17` **全文零命中静默蒸发** |
| 「大需求先判**该不该解**」 | `feedback_premise_first_deep_eval` —— 送审稿从 §1 起就是「怎么解」 |
| 框架建设预算 ≤2 次/月 | 送审稿「预算/软上限/13 次/每月」**全文零命中**。实测 7 月疑似纯框架 **19** 条 → **9.5× 软上限**，本案是第 20 条。**前作范围拍板的唯一依据就是这条预算；推翻它却不提它 = 绕过而非推翻** |
| 前作「范围拍板（luca）：只收尾 + 提案，**不改框架代码**」 | 送审稿 = 六 Phase + 不可逆归并 + 改 `CLAUDE.md` + 改全局 settings + 19 库。**「深度评估解决掉」是否推翻该拍板 —— 这正是该问 luca 而非自答的。送审稿自答了，且答成最大解释** |
| 「luca 已裁决 scope=A」当既定前提 | 而**同一文档两处自陈**「luca 是在错误信息下做的选择」（:76、:219-220）。**两头都要**：污染若成立 → A 不是有效裁决 |

---

## 八、红队攻击失败的部分（诚实亮出，别一起打掉）

- **§2 的核心结论对**：独立直读 `Ry()` / `KFh()` 确证 —— 派生输入是 repo 根、`autoMemoryDirectory` override 优先返回、userSettings 确实被读。**E1/E4 可从 RELAYED 升为 VERIFIED**。**问题是方法不是结论。**
- **「25KB 静默撞线」恐怖故事不存在**：实测 31,569 B / 173 行 **全量加载零警告**；9,279 B / **253 行**才截断，**且打印响亮的 WARNING**。真上限 = **200 行**，`iCe=25000` 量的是 UTF-16 unit。**A5 的 `-le 25600` 是幻影闸，且有害** —— 合并后 20,693 B = 幻影闸的 81%，很快开始报 FAIL，**逼 luca 为一个不存在的上限删真实记忆**。
- **只有 `MEMORY.md` 被注入，主题文件是懒加载**（实测哨兵）→ 塌缩不会造成 context 爆炸。
- **§3 的隐私雷是真发现，独立复核全中**，且**前作完全没有**。这是本稿最有价值的部分。
- **§5 的样本比方案自述的更强**：实测 person 形状 **52** vs project 形状 **7**（方案写「6+:5」）。**但 F1 证明这把尺子本身无效，所以更强也不作数。**
- `autoMemoryEnabled` 默认 **true** 且**不 server-gated** → 这条不必担心。
- **S6 标「不治」是诚实的**：`MEMORY_ROOT` 走 projectSettings、`autoMemoryDirectory` 走 userSettings，两条机制不相交。切得干净。
- **§8 反方列 4 条自攻、§9 明确划界、§5 的「决定性反证」（M1 约定文档死在孤儿库）—— 都是扎实的活。**

> **送审稿的病不在看不见问题 —— 它看得比谁都清楚。病在看见之后写下来，然后当成已经处理了。**

---

## 九、红队必须交出去的事实（是证据的一部分，不是建议）

1. `autoDreamEnabled` 显式写 `false` 会命中 `if(e!==void 0)return e`，**直接钉死、绕过服务端 gate**。Phase 4 只让 luca 粘**一个** key（`autoMemoryDirectory`），**没粘这个** —— 整个不可逆归并会在一个服务端可控的后台改写器活着的情况下跑。
2. TUI 里有交互开关会 `Zo("userSettings",{autoDreamEnabled:re})` —— 写的正是 Phase 4 要 luca 手改的**同一个文件**。
3. `SC-20260715-005` 实测**仍是 `CANDIDATE`、reviewer=`luca`、原文未改**。`propose_semantic.py --supersedes` 过 `feedback_no_confirmation_loops:26` 三问全 yes（被要求：6-24 规则 / 可验证：candidates.jsonl 读回 / 可逆：`--reject` 留痕）→ **该条原文判定「立即做」，而送审稿把它排进了 review 队列**。风险：本稿 review 期间跑一次 daily_governance → luca 在 digest 点头 → 已知错误前提进 `promoted-facts.yaml` → 此后每 session 注入。
4. **提案完全没看见的三条路**（红队只陈述其存在，不推荐）：
   - **`autoMemoryEnabled`** —— 就挨着 `autoMemoryDirectory` 的 **per-project 关闭开关**。提案通篇没提这个 scoping 原语。
   - **localSettings 定点并库** —— 按 `KFh()`，localSettings **压过** userSettings；`.claude/settings.local.json` **已 gitignore、不 checked-in → 无公开仓泄露面**。只在母版+fork 两处 → **精确命中真实痛点（gstack 家族），且不碰 code-* 的 project 事实**。
   - **昨案的 B（symlink）是被株连的** —— 「昨案 4 个方案**全部**在补偿一个不存在的约束」这一扫**过宽**。B 不是补偿约束，是独立机制。既然已知派生输入是 repo 根，一条 symlink 即可拿到 2 仓合并，零 settings、零优先级风险、零 F4/F5 暴露面。**B 的死因是株连，不是它自己的问题。**

---

## 十、一句话

> 送审稿 §5 得意地指出：07-09 M1 的修法本体此刻正躺在孤儿库里失联 —— **「修法与它要修的病，死于同一个机制。」**
>
> **本方案的守护没有执行者、person 目录真值散成 9 份无人同步的硬编码副本、验收它的断言在数据被清空时报绿灯、而验证其唯一 kill-assumption 的实验结构上无法证伪该假设。**
>
> **同一个机制，正等着杀死这一版修法。**
