# person 记忆层 —— v5-exec（执行版 runbook）

> **授权**：luca 2026-07-16「那你按照这个执行」——解除范围拍板，批准 Fable 复审裁决的完整序列：
> 定向修复 → 靶向 drill 验证 → M3-0 → M3-a + M3-b 同坐连跑。
> **本文性质**：v4（R4 评审过的最后一稿，原文不动、保持评审时状态）+ R4 两条 blocking 的定向修复
> + Fable 复审补的第三处（rescan `cp -n` 空转）。**不是共识循环新一轮**——只修 R4 点名的执行细节，
> 修复经沙箱 drill 实证后才执行。执行者 = 编排 session 72da83e0 主循环，全程当场断言。
> 路径缩写：`CANON` = `/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory`，
> `FORK` = `/Users/luca/.claude/projects/-Users-luca-Desktop----muse-lucagstack/memory`，
> `BK` = `~/.claude/person-store-merge-2026-07-16/`（备份+manifest+marker 全放这，已验不在 git/iCloud 树）。

---

## 1. 三处定向修复（相对 v4）

| # | R4 判决 | 修复 |
|---|---|---|
| **F1** | M3-a step 0 只备份 fork，被改写的 canonical 反而无新鲜回滚源（B1 修法把 v3:210 的 canonical 备份静默替换掉了） | step 0 改为**双备份**：`cp -Rp "$CANON"/. $BK/canonical-backup/` **和** `cp -Rp "$FORK"/. $BK/fork-backup/`；新增前置断言 **A0**：两组 `diff -r` 均为空才许进 step 1 |
| **F2** | manifest 建在 backup 副本上，监视不到 live fork store 的并发改写（scenario 3a 四门全绿而漏） | manifest 改对 **live fork** 建（path+sha256+mtime，python3 hashlib/os.stat 直算）；A3 条件②改为「live fork 现状 vs manifest 逐条比对」——窗口内任何删除/改内容/碰 mtime → **FAIL 停机** |
| **F2b**（Fable 复审补） | M3-b 前 rescan 的补拷用 `cp -n -p`，对「已拷入后又被并发修改」的文件**静默空转**（`-n` 遇同名跳过） | rescan 命中分流：目标不存在 → `cp -n -p` 补拷；**同名但 sha≠canonical → HALT，列冲突清单交人裁，绝不自动覆盖**（双胞胎有意不同，自动覆盖会制造新损坏） |
| **F3**（结构，防复发） | v4 三处 prose（:13/:145/:316）声称 canonical 备份「不变/缺一不可/已采信」而脚本里实际缺席——安全声明与脚本可静默漂移，这是 B1 回归的病根 | 安全声明收进下面的**锚表**：每层安全主张必须有具体命令 + 对应断言门，无锚不得声称。v4 那三处以本表为准更正 |

## 2. 安全锚表（F3：声明 → 命令 → 断言门）

| 安全层 | 实现命令（本文节号） | 断言门 |
|---|---|---|
| canonical 改前可恢复 | `cp -Rp "$CANON"/. $BK/canonical-backup/`（§4 step 0） | **A0**（diff -r 空）+ 损坏时恢复源；drill A 实证过恢复 |
| fork 冻结面可捞回 | `cp -Rp "$FORK"/. $BK/fork-backup/`（§4 step 0） | A0 + A3 兜底捞回面 |
| 窗口内并发改写可见 | live-fork manifest（§4 step 0）+ 同坐连跑 + autoDream pin（§4 step P） | **A3-live**：任何 live fork 变化 → FAIL 停机；drill B 实证 |
| 算子无损 | 仅 `cp -n -p` / append（V6-A/B、TEST1/2 已实证） | A1（canonical 文件不变不少）+ A2（索引行只增不减） |
| 增量不漏不覆 | rescan `find "$FORK" -newer $BK/m3a.marker`（§4 step 5） | F2b 分流：新文件补拷 / sha 冲突 HALT 人裁 |
| M3-b 失败无害 | key 写 fork `settings.local.json`（gitignored，§4 step 6） | **A5** canary：luca 下次 fork 交互 session 亲验；失败 = no-op 退回现状 |

## 3. 执行前提（已满足项打 ✓）

- ✓ 拍板解除（luca 口头授权本序列）；卡点 1（预算）随之视为已答。
- ✓ 卡点 4：窗口内 `~/.claude/settings.json` 钉 `autoDreamEnabled: false`（改前读原值、事后还原）；sync 真门今日实测关（`tengu_haze_glass=false`）。
- ▢ 卡点 3（索引先剪还是先并）与卡点 5（alias 双胞胎处置）——AskUserQuestion 当场问，答案记 §6。
- ▢ 靶向 drill A/B/C 全绿（§5）。
- **数字现场重算**：v4 的 10 copied / 9 appended / 26→35 基于 R4 评审时快照；此后编排 session 又双写 3 文件（前作 §8 第二登记块）。执行时以现场 `ls`/diff 计数为准，四门只认差分不认预言数字。

## 4. 执行步骤

**M3-0（先行，独立于 drill——算子语义 V6-A 已真机实证）**
```
前验：$CANON 无 candidate_feedback_grep-cjk-silent-false-negative.md；$FORK 侧 mtime=2026-07-11
cp -n -p "$FORK/candidate_feedback_grep-cjk-silent-false-negative.md" "$CANON/"
后验：存在 / sha256 两侧相等 / mtime 仍 2026-07-11（age≈5d 保住）
回滚：rm 该文件（fork 原件不动）
```

**M3-a（drill 全绿 + 卡点 3/5 有答案后）**
```
P. 读 ~/.claude/settings.json 记录原值 → 写 autoDreamEnabled:false（窗口 pin，step 7 还原）
0. mkdir $BK；touch $BK/m3a.marker
   cp -Rp "$CANON"/. $BK/canonical-backup/   ← F1
   cp -Rp "$FORK"/. $BK/fork-backup/
   python3 建 live-fork manifest（path+sha256+mtime）→ $BK/fork-live-manifest.tsv   ← F2
   A0：diff -r "$CANON" $BK/canonical-backup → 空；diff -r "$FORK" $BK/fork-backup → 空
1. cp -n -p "$FORK"/*.md "$CANON"/           ← fork-only 文件入库；同名一律跳过（含双胞胎）
2. fork MEMORY.md 中【target 文件名不在 canonical MEMORY.md 任何行】的索引行 → append 到 canonical/MEMORY.md
   （python3 逐行处理，先在 scratch 生成待 append 行清单，人眼过目后 append）
3. fork store 原地冻结不动（回滚点）
4. 四门当场跑：A1/A2/A3-live/A4（定义见 v4 §4，A3 条件②按 F2 新形态）——任一 FAIL → 停，从备份恢复
```

**M3-b（紧接 M3-a，同坐；窗口 ≈ 分钟级）**
```
5. rescan：find "$FORK" -type f -name '*.md' -newer $BK/m3a.marker
   命中分流（F2b）：canonical 无同名 → cp -n -p 补拷；同名 sha≠ → HALT 列清单人裁
6. 读 fork 仓 .claude/settings.local.json（验 gitignore 仍挡）→ python3 json 合并写入：
   "autoMemoryDirectory": "/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory"
   canonical MEMORY.md 末尾 append A5 canary 行（含日期 +「fork session 能看到这行 = key 生效」）
7. 还原 autoDreamEnabled 原值；再跑一次 A3-live 确认窗口内 fork 零变化
后验（A5，luca 本人）：下次在 fork 仓开交互 session，问「MEMORY.md 里有没有 A5-canary」
   看得见 = key 生效（S4 治愈）；看不见 = 删那行 key = 退回现状，零数据后果
```

**执行后登记**：本文 §6 填答案与实跑数字；前作 §8 追加执行登记块；consensus-report 追加执行记录；episode 落盘。
**执行期纪律**：M3-a step 0 起至 step 7 止，本 session 不做任何其他 person store 写入。

## 5. 靶向 drill（沙箱=真库只读副本；执行前必须全绿；agent=opus）

| Drill | 场景 | PASS 标准 |
|---|---|---|
| **A** | step 0 双备份 + A0 → 毁沙箱 canonical/MEMORY.md（截断） → 从 canonical-backup 恢复 | 恢复后 sha = 毁前 sha（F1 修复真提供恢复力） |
| **B** | 完整 M3-a 后，模拟并发：改一个「已拷入」的沙箱 live-fork 文件 | A3-live 必须 FAIL（抓 CONTENT/MTIME）；rescan 命中该文件且因 sha≠ 走 HALT 分流而非静默跳过（F2/F2b） |
| **C** | 当前真实数据（含 07-16 全部 15 个当日文件）跑 happy path | 四门全绿；报出现场 copied/appended/索引行数，供真跑对照 |

## 6. 卡点答案与执行记录（执行时填）

- 卡点 3（索引先剪还是先并）：**先并后剪**（luca 拍板 2026-07-16）——M3-a 现在跑，索引策展剪枝另日作为治理动作单独做。
- 卡点 5（alias 双胞胎）：**保留两份**（luca 拍板 2026-07-16）——不删除，治理时再裁。
- M3-0：**已执行** ✓（前验目标不存在 → cp -n -p → 后验 sha 相等 + mtime 保 2026-07-11 12:44:51）。
- drill 结果：**A/B/C 三项全 PASS**（opus agent 沙箱实跑）——A：毁 MEMORY.md 后从 canonical-backup 恢复 sha 一致（47104ff6）；B：并发改 live fork 文件 → A3-live FAIL(CONTENT+MTIME+UNRECOVERABLE)、rescan 走 HALT 分流不静默不覆盖；C：happy path 四门全绿，copied=9 / appended=9 / 索引 27→36。真库经验证未被 drill 触碰。
- 实跑数字与四门结果（2026-07-16 真库执行）：
  - M3-a：A0 双 PASS → copied 9（与 drill C 文件集 assert 相等）→ appended 9 行、索引 27→36 → **A1/A2/A3-live/A4 全 PASS**。
  - M3-b：rescan 命中 0 → gitignore 验挡 → `autoMemoryDirectory` 合入 fork `settings.local.json`（JSON 复验有效）→ A5 canary 已放 canonical MEMORY.md 末行 → `~/.claude/settings.json` 还原为 pin 前字节（比对 True）→ 终检 A3-live PASS（窗口内 fork 零变化）。
  - 备份面：`~/.claude/person-store-merge-2026-07-16/`（canonical-backup / fork-backup / fork-live-manifest.tsv / m3a.marker / 两份 settings 原件）。
  - **待验（luca）**：A5——下次在 muse fork 仓开交互 session，看注入的 MEMORY.md 是否含 `A5-canary-2026-07-16` 行：看得见 = key 生效（S4 治愈）；看不见 = 删 settings.local.json 里那一行 key = 无害退回现状。
  - 本 session 剩余时间对 person 记忆的写入一律直接写 canonical（本 session 的 harness 解析已 memoize 到 fork store，不受新 key 影响）。

<!-- FILE_END: 2026-07-16-person-memory-plan-v5-exec -->
