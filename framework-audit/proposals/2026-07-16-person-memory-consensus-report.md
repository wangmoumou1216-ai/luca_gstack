# person 记忆层 —— 共识循环收敛报告（3 轮触顶，未收敛）

> 循环：作者重写 → 5 视角红队证伪 → 再重写。停止条件 = 零致命零严重；硬上限 3 轮（触顶即停，不假装共识——本报告即履约）。
> 版本链：送审稿（判死）→ v1 → v2 → **v3**（`2026-07-16-person-memory-plan-v3.md`，当前最佳）。
> 规模：18 agent / 277 万 tokens / 600 次工具调用 / 2.6 小时。

---

## 1. 结论

**未收敛，但残余的性质变了。** 三轮阻塞数 20 → 14 → 14（其中全新发现 16 / 9 / 12）——数字是平台期，
但**机制与方案形状在三轮里零翻案**；R3 打的已经不是「方案会不会造成损失」，而是
「文档主张是否可证」与「执行细节是否闭合」。其中**两条致命源于编排 session 污染了实验基底**
（见 §4-A），这是循环自身的结构缺陷，只有编排者能修——已修（见 §6）。

**剔除噪声后 R3 真实阻塞 = 13**（第 5 个视角 agent 退化输出字面 `a/b/c` 占位符，已剔除并记为基建缺陷）。

---

## 2. 三轮零翻案的共识核（这部分已经是共识，不因未收敛而作废）

1. **机制事实**：`autoMemoryDirectory` 解析链 `policy > flag > (信任门内 local > project) > user`（`??` 短路）；
   slug 派生自 **git 仓库根**（非 cwd）；改名即孤儿、无迁移；中文路径 slug 会碰撞（≤200 字符无 hash）。
2. **验证纪律**：验证必须在**部署 scope** 做——flagSettings 探针对 user/local scope **零证明力**。
3. **scope=A（全机塌缩）死**：`ls project_*` 的尺子无效（project 事实压倒性存在于各库 `MEMORY.md` 名下）；
   目录名即 provenance，塌缩后不可重建 → 不可逆；`code-*` 等 per-repo 库是 harness 设计**正确工作**的部分。
4. **读写分裂是纯框架缺陷**（harness 早提供了 key）；治理读侧消费点横跨**三个仓**
   （双仓 `daily_governance.py` / `session-restore.mjs` / muse app `main.js:28` 已烤进 asar）。
5. **方案形状**：v3 的三级阶梯——**M3-0**（1 条命令把孤儿候选带进治理面）/ **M3-a**（无损并库：
   `cp -n` + append-only，fork store 冻结为回滚点）/ **M3-b**（fork `settings.local.json` 一个 key，
   gitignored、失败=no-op 退回现状）。每级独立可裁，只用结构上无法丢数据的算子。
6. **泄露三通道成立**：sync watcher 绑 key（真门 `tengu_haze_glass`，本地 kill switch =
   `CLAUDE_CODE_DISABLE_ORG_MEMORY`）；`~/Desktop` 即 iCloud Desktop（inode 实证）；
   公开仓 archive 绕穿 gitignore + git 历史永久。canonical store 与 M3 动作**均不在** git 仓 / iCloud 树内（已验）。
7. **七个人类卡点成立且不可由 agent 自答**（v3 §5 原文为准）。

---

## 3. R3 残余 13 条的解剖

### A 类 · 编排污染（致命 ×2 + 严重 ×2）——根源在编排 session，非 v3 作者

| 判决 | 事实修正 |
|---|---|
| 「V0『本 session 零写入』是用 13:00 截断制造的」——**成立** | 07-16 当日写入两个真 store 的 **10 个文件全部是编排 session（72da83e0）所写**（红队归给 522aa1b3 系误归）。台账见 §5 |
| 「ant_profile 从两库同时蒸发 = canonical 单点丢失实证」——**红队对了一半**：v3 的「蒸发」确是自造证据，但真相不是丢失 | 实为 luca 裁决后的**候选晋升重命名**（→ `feedback_symptom-first-before-acting.md`），数据零丢失；digest 只比重命名晚 3 分钟。→ **v3 §4/§6 引它撑「无告警丢失风险」的那一格作废，卡点 2 的在场证据需重找** |
| 「V2 台账 4/6 共有是当日镜像非 found state」——**成立** | 自然精确同名重叠 = **2**。V2 的收益台账（+15/先丢 8）方向不变，基数需以此修正 |
| 「镜像法(e) 当日已执行 3 次未登记」——**成立** | 已补登记进前作 §8（2026-07-16 追加块） |

### B 类 · v3 待修四点（严重 ×4）——不推翻方案形状，逐条有明确修法

1. **A3 条件② 是恒真式**（对枚举出的文件做 `exists()` 永不 FAIL）→ 改为：M3-a **step 0 先对 fork store
   做保 mtime 备份**，A3 ② 改为对**备份 manifest（路径+sha256+mtime）**断言，冻结面从「愿望」变「快照」。
2. **算子错位**：`cp -n` / `cp -R` 抹 mtime，而 mtime 是 `daily_governance.py:252` 算候选 age 的唯一输入
   ——M3-0 会把 5 天的孤儿洗成 0 天，销毁它存在的目的本身；V6 实测用的 `shutil.copy2` 恰是保 mtime 语义
   → **全部算子改 `cp -n -p`（备份 `cp -Rp`），修复即与 V6 实证对齐**。
3. **M3-a → M3-b 窗口未定价**（分开花时窗口内 fork 新写永久漏掉且四门全绿）→ 要么**同一坐 session 连跑**，
   要么 M3-b 前**重扫 fork store 增量**（`find -newer <M3-a marker>`）补拷。
4. **autoDream TOCTOU 从 v3 蒸发**（R2 遗留未修）→ 补回处置：M3-a/b 操作窗口内
   `autoDreamEnabled: false` 显式钉死（`if(e!==void 0)return e` 绕过服务端 gate），或明列「不治」+ 理由。

### C 类 · 循环基建（不影响方案本身）

- R3 一个视角 agent 退化输出占位符（`lens="test"`, findings=`a/b/c`），verdict 不足采信，已剔除。
- R1 作者的上下文是「路径指针」非内联（transcript 实证它读全了三份 + 自主跑 57 条核验——但那是听话不是结构保证）。
  **若跑 R4：R3 findings + §5 台账必须内联进作者 prompt。**

---

## 4. 为什么没收敛（诊断）

清洁上下文作者（防叙事污染）× 被编排者带外写入污染的证据基底 = 作者结构性失明：
它把「编排者当天造的状态」当「found state」立论，红队用 mtime/transcript 取证击杀——**每一轮都在为
编排者的带外行为买单**。修法不是更多轮次，而是把编排者的写入台账作为一等输入喂给作者（已备好，§5）。
次因：每版新增的「主张」（V0 审计、V2 台账、A3 保证）本身成为新靶——**主张面越大，靶面越大**；
v3 已在收窄（「维持现状是合法结论」「我没验成就写没验成」），残余 B 类四点均有确定修法，
**再一轮收敛概率高——但 3 轮硬上限是向 luca 承诺过的承重不变量，延长与否只能由 luca 决定。**

---

## 5. 编排 session 07-16 写入台账（修正 found state 的唯一一手源）

| # | 文件 | store | 时间 | 动作 |
|---|---|---|---|---|
| 1-2 | `feedback_symptom-first-before-acting.md` | 母版 + fork | 09:45–09:46 | ant_profile 候选经 luca 裁决晋升；两侧「同族」链有意不同（各链本 store 真实邻居） |
| 3-4 | `MEMORY.md` 索引行 | 母版 + fork | 09:46–09:47 | 各 +1 行指向上项 |
| 5-6 | `candidate_feedback_verify-params-before-offering-choices.md` | 双写 | 10:27–10:28 | byte-identical |
| 7-8 | `candidate_feedback_verify-in-the-deploy-scope.md` | 双写 | 11:12–11:13 | byte-identical |
| 9-10 | `candidate_feedback_disclosure-is-not-remediation.md` | 双写 | 11:13 | byte-identical |

另：`candidate_feedback_ant_profile_shadows_max.md` 两侧删除（晋升即消费）。以上已补登记进前作 §8。

---

## 6. 本报告随附的已完成处置（均为可逆、审计留痕的提案面动作）

1. 前作 §8 追加登记块（修 A 类第 4 条）。
2. `SC-20260716-001` 已入队：`--supersedes SC-20260715-005` 的修正版候选（cwd→repo 根、env 覆盖存在、
   scope=A 证伪、v3 阶梯为现行候选）。**005 的 reject 归 luca**——`--reject` 强制 reviewer 人工签名
   （v3 卡点 6 实测：digest 里 005 仍带可粘贴 `--set-stable`，勿直接点头）。
3. 本报告 + REDTEAM 报告落盘；**未执行 M3 任何一级、未改任何框架代码、未动任何 settings**。

---

## 7. 交 luca 的决定（对应本次问询；v3 §5 七卡点全文另见原文）

1. **下一步**：R4 终审一轮（内联台账 + B 类四修法，1 轮上限）？还是直接以 v3+修正附录定稿？还是搁置？
2. **范围拍板**：前作「只收尾+提案不改框架代码」是否解除、解除到 M3 哪一级。
3. **SC-005**：你亲手 reject（digest 有现成命令）/ 授权 agent 签（有 003/004 先例但 v3 判其伪造人工审计）/ 先放。
4. （若解除到 M3-a）卡点 3 索引策展先后 + 卡点 5 双胞胎去重——届时再问，不在本轮。

---

## 8. R4 终审结果（2026-07-16，luca 授权的最后一轮——终局）

> 首跑 `rt:exec` 撞 session 限额缺票，luca 纠正「缺票轮不算完成轮」→ 限额重置后
> `resumeFromRunId` 缓存回放补跑（5 agent 零重跑，只真跑缺票）。5 票齐后判定如下。

**未收敛：eng / exec / scope / risk 不通过，meta 通过。上限用尽，不再迭代。**

**A 类污染修法实证有效**：台账内联 + 在飞冻结后，R3 的 4 条 A 类事实缺陷经 5/5 视角逐条
真机核验「真修」（`find -newermt` 实测 10 文件与台账逐一对齐）；「执行了 0 步」仍真
（真库 16:00 后零写入、无 backup 目录/marker/canary 落真库、fork settings.local.json 无 key）。

**残余 = 2 个新缺陷，均为 B 类修法执行时引入/暴露**（机制事实、M3 阶梯形状、七卡点、
三通道建模四轮零翻案——§2 共识核不受影响）：

1. **canonical 改前备份被 B1 修法静默删除**（4/5 视角独立命中，最重）。v3 step 0 备份的是
   canonical（被改写的库）；v4 照 R3 B1 字面改成「备份 fork 做 manifest」，唯一被破坏性
   改写的 canonical/MEMORY.md 反而全程无新鲜回滚源——实测 canonical 无 git 仓、无 TimeMachine
   目标、不在 iCloud 树，唯一 `.bak` 停 2026-06-24（7095B vs live 13771B），损坏即丢 3 周索引。
   而 v4 三处 prose（:13/:145/:316）仍宣称 canonical 备份「在场/已采纳/缺一不可」——假闭合。
   「修一个洞开另一个洞」：修法显然（step 0 对 canonical 和 fork 各做一份 `cp -Rp`），但按约不出 v5。
2. **A3 manifest 装错监视对象**（补跑的 exec 视角沙箱实跑发现）。manifest 快照的是私有
   backup 副本，不是 live fork store：并发修改「已拷入 canonical 的 live fork 文件」→ 四门
   全绿而漏（scenario 3a 实证：A3 全 PASS、canonical 持旧 sha）；新增文件能抓住（3b）。
   v4 §7-item6「这是抓得住的不是盲区」为假。修法同样明确（manifest 对 live fork 建、或双建）。

**交 luca 的裁决项**：① v4 + 上述 2 条 blocking 照修后定稿（不再全轮红队，只验这两点）；
② 以「v3+v4+blocking 附录」状态搁置，执行时机另定；③ 其他。
两条缺陷都在「执行细节层」，不影响「要不要修分裂」的方向判断。

规模：R4 两跑合计 6 agent（含 1 缓存回放链）/ 约 134 万 tokens；全程零改真库。

---

## 9. 终局执行（2026-07-16，Fable 复审 → luca 解除拍板）

Fable 主循环复审 R4 裁决：认可「未收敛」判决（两条 blocking 亲验实锤），补第三处缺陷
（rescan `cp -n` 对已拷入文件静默空转），裁决「定向修复→靶向 drill→分级执行」。luca：「那你按照这个执行」。
执行记录全文见 `2026-07-16-person-memory-plan-v5-exec.md` §6：drill A/B/C 全 PASS 后，
M3-0 / M3-a（四门全绿，copied 9 / 索引 27→36）/ M3-b（key 合入 + canary）当日执行完毕，
fork store 冻结为回滚点。卡点 3 = 先并后剪、卡点 5 = 保留两份（luca 拍板）。
**待验**：A5 canary（luca 下次 fork 交互 session）；**待办**：luca 亲手 reject SC-20260715-005（§7.3）。
