# 处置汇总 + 红队对抗 · REX → MPC2 → Cycle 2 Recovery Handoff 评审

> 第二轮产物。第一轮（`REVIEW.md`）是单向评审、无对抗；本轮对**我自己的 10 条发现**逐条设攻击点，
> 能证伪的当场证伪。结果：**2 条被打下去（F2 降级、F7 降级）、1 条被加强（F3）、
> 1 条被重新归因（F10 的责任方不是他们）、1 条我没能自证（非负条款）。**

---

## 一、红队对抗结果（攻我自己）

### R-A1 攻 F2「owner matrix 基线错 → 会静默回滚安全洞」→ **成立但必须降级**

**攻击**：照原样执行，第一步 verifier 就 exit 1 停住，**根本走不到第 5 步的 matrix**。
所以「照原样执行会回滚安全洞」这句话是假的——照原样执行什么都不会发生。
且 `RECOVERY-COMMIT-LEDGER.json` 自己写着
`Every overlapping file and hunk requires a **freshly reconstructed** owner matrix`，
「freshly reconstructed」本身就要求重新测量。

**裁决：攻击成立。** F2 从 BLOCKER 降为 **MAJOR（条件式）**。真实成立条件只有一种：
**有人绕过或手改门禁让它通过、然后沿用冻结数字建矩阵**——而这条路两份文档都明令禁止。

**F2 的价值因此改变**：它不是一个活的缺陷，是一根**绊线**。
所以它的处置也应该改——不再是「我断言这条会发生」，而是「把它变成执行方必须自证的一格」。

> **`REVIEW.md` §0 的那句「照原样执行会静默回滚两个安全洞」是错的，本文更正。**
> 正确说法：照原样执行会停在门禁；回滚风险只在「门禁被绕过」这条被禁止的路径上成立。

### R-A2 攻 F7「第三个工作流在飞、正在动同一套机器」→ **成立但降级**

**攻击**：去读它自己的 census——`PAYLOAD-CENSUS.md` 第 5 行白纸黑字
`Production hooks changed: **no**`，它还在普查/设计阶段，没动生产 hook。

**核对它的执行计划实际点名的文件**（出现次数 top）：

```
5 scripts/plan-transfer.mjs      4 scripts/route-receipt.mjs
4 scripts/project.sh             4 scripts/project-pin.mjs
4 scripts/plan-execution.mjs     4 scripts/check-project-links.mjs
3 .claude/hooks/session-sync.mjs 3 .claude/hooks/session-restore.mjs
```

**`project-scope-guard.mjs` 不在其中。**

**裁决：攻击成立。** 我说的「三方在改同一个文件」是错的——它改的是 **pin 事务侧**
（`project-pin.mjs` / `project.sh` / session hooks），我改的是**作用域判定侧**
（`project-scope-guard.mjs`）。二者同属一套机器但不是同一个文件。
F7 从 MAJOR 降为 **MINOR**：是**相邻面**的并发改动，需要通报，不构成文件级冲突。

### R-A3 攻 F3「第 12 步已是空操作」→ **攻击失败，F3 反而加强**

**攻击**：`upstream/main == HEAD` 只是因为**你自己 push 了**，是你造成的漂移，不是他们的错。

**核对**：manifest 冻结值 `upstream_main = ad9903df… = canonical.head`。
**在他们写下这份 handoff 的那一刻，两者就已经相等了。**

**裁决：攻击失败。** 这个空操作**从成稿时就存在**，与我的 push 无关。
F3 由「漂移后果」改判为「**设计期就有的错误**」——他们把一份已经躺在本地 HEAD 里的
declaration 当成「留到最后才读的未来」。**两轮红队都没抓到这条**
（B-R4-P1-001 谈的是 upstream **URL** 不在 live gate 里，是另一件事）。

### R-A4 攻 F4「stale checkout 永远只读与 CLAUDE.md 冲突」→ **部分被他们先手，收窄**

**攻击**：红队 B 的 **P0-003** 已经提过同一族冲突——
「stale checkout 绝不写入」与 6 条已授信 lifecycle hook 内联的
`MEMORY_ROOT=/Users/luca/Desktop/luca_gstack` 直接冲突，且 SessionStart 早于主 agent 读文档。

**裁决：攻击部分成立。** 他们不但发现了，**整个 neutral-bootstrap 设计就是它的解**
（在仓外启动，让 hook 发现边界晚于零写入证明）。
但他们解的是「**别不小心写它**」，**没有解**「**它是记忆权威检出、不能被永久冻结**」。
更关键：P0-003 的证据里**明确引用了** `session-restore.mjs` 的合同——
episodic/semantic 读写与 daily governance 都落在这个 `MEMORY_ROOT`。
**他们知道它是记忆根，仍然把它归类为 hazard。** 这不是疏忽，是**分类判断**，而这个判断是错的。
F4 收窄为：**分类错误 + 永久性越界**，保留 MAJOR。

### R-A5 攻 F10「记忆隔离静默关掉 person/project 两层」→ **成立，但责任方要改**

**攻击**：`get_memory.py` 对 person 层**根本没有实现**（四个关键词 grep 全空），
所以 person 从来就不在 `--summary` 覆盖面里；而 `search_memory` 的 person 覆盖 08-15 才有。
那么他们的 bootstrap 并不比**任何**从非母版检出启动的 session 更差——凭什么算他们的缺陷？

**裁决：攻击成立，但把问题变大了不是变小了。** F10 的责任方从「他们的 bootstrap」
改判为「**框架级缺陷，他们只是继承了它并把它固化**」：

- 框架侧：`search_memory` 的 person/project 两层**只在母版检出上生效**
  （闸 = `MEMORY_ROOT == /Users/luca/Desktop/luca_gstack`）。任何其它检出恒返回 0，**且不告警**。
  实测：一次性 clone → 0；muse 检出 → 0；母版 → 83。
- 他们侧：把**唯一有效的那个根**判为 hazard 并禁止，等于把这个盲区**焊死**在整个 recovery 期间。

**这条现在是本次评审里最有价值的发现，而且溢出了 handoff 的范围**——
它同样命中我自己此刻的 session，以及每一个从 muse 检出启动的 session。
CLAUDE.md 把「具体任务优先跑 `search_memory`」定为设计路径，而这条路径对这两层恒空。

### R-A6 攻我自己的「非负条款」→ **我没能自证，责任转移**

我试图用变异测试证明「88/88 能挡住回退」，三次都失败：

1. 整体换成 forensic 守卫 → `PASS=56 FAIL=32`，看着转红；
2. 外科变异（`realTargetOf(s)` → `resolve(s)`，其余 583 行不动）→ **同样 56/32**；
3. **阳性对照**（字节完全相同的现行守卫，md5 `515b8da2…`）→ **还是 56/32**。

**装置是死的**，三次「转红」全是夹具在陌生 cwd 下自崩（`Cannot read properties of undefined`）。
改用差分夹具（同一输入喂两个版本比判决）也没救活——连「跨项目绝对路径应 DENY」这个
阳性对照都返回 `PASSTHROUGH`，说明是我的夹具没把 pin 喂进去，不是守卫的问题。

**诚实状态：那条非负条款有效性未经证明。** 它在真仓里确实是 88/88（已跑），
但我**没有独立证据**说明它会在外科式回退下转红。

**处置（这是唯一正确的出口，不是把缺陷写进"已知风险"然后照样往下走）**：
把举证责任转给执行方——他们在真仓里有权限做 in-place 变异。
握手稿的非负条款因此升级为**两段式**：
① 应用 hunk 后跑出 88/88 + `verify.sh` 75/0；
② **并且**必须先做一次故意回退（把 `realTargetOf` 退回词法解析），
   证明套件**会转红**，再还原。**②不做，①的绿不算数。**

---

## 二、十条发现的最终处置汇总

| # | 发现 | 红队后等级 | 责任方 | 处置 |
|---|---|---|---|---|
| F1 | 门禁 exit 1，pass 条件在正常运行下不可达 | **BLOCKER** | 双方（我推了提交；机制冻结面过宽） | 门禁降为诊断 + 新增 `G-REFREEZE` 人类门 + 必须交付生成器 |
| F2 | matrix 基线钉死在 `ad9903d` | MAJOR（条件式，**已降级**） | 他们 | 基线取当场 `git rev-parse HEAD`；作绊线保留 |
| F3 | 第 12 步 fetch 是空操作 | MAJOR（**已加强**：设计期错误，非漂移） | 他们 | 当场从 HEAD 读 declaration；fetch 仅作 remote 未前进的确认 |
| F4 | 「永远只读」+ 把记忆权威检出判为 hazard | MAJOR（**收窄**：分类错误） | 他们 | 限本次窗口；身份改回记忆权威检出 |
| F5 | SC ID 跨检出撞号 | MAJOR | 框架（我也踩了） | 提新候选前先定 ID 分配方案，已撞的两对重编号 |
| F6 | checker 引文需重新取样 | MINOR | 我 | §4 引文重取，不得当新失败 |
| F7 | 第三工作流并发 | MINOR（**已降级**：相邻面非同文件） | — | 通报即可，不列文件级 BLOCKED |
| F8 | bundle 自封，第三方无法修回 | 结构 | 他们 | 决定了「另起握手稿而非改其字节」 |
| F9 | 我的守卫误伤 heredoc 正文（本轮**复发 2 次**） | MINOR | 我 | 记录，下一轮改 |
| F10 | person/project 两层只在母版检出生效 | **BLOCKER** | **框架**（他们继承并焊死） | 握手稿须显式 opt-in 或声明盲区；框架侧另开工单 |

**代际结论（luca 的核心担心）**：宪法文本**未漂移**——`CLAUDE.md`/`AGENTS.md` 最后一次改
`a864d54`(08-11 18:03) 实测在 common base 之内，两侧同源。
自计划冻结以来 main 共 26 个提交（forensic 分叉后独有 23 个），按天 08-11 六 / **08-15 八** /
08-19 三 / 08-20 九。**漂移集中在 08-15 那批记忆层提交**，而他们的 bootstrap 恰好整个
建立在记忆隔离上——F10 就长在这个接缝里。
两轮共 87KB 红队里，`person` 一词出现 **0** 次：他们审的是一个 08-11 的框架世代。

---

## 三、还没做的（诚实列出，不冒充完成）

- **红队只跑了一轮，且是我自己攻自己。** 我是被评审方也是执行者，这个位置上自审系统性偏软。
  本轮已证明这一点：一轮就打掉了自己两条、加强一条、重归因一条。**第二轮独立视角仍有价值。**
- **红队 A/B 的 87KB 只读了结构与四处定点**，没有逐条通读。已定点核对的是 A-R2/A-R3 标题、
  B P0-003、B-R4-P1-001 三处。
- **`FINAL-SESSION-HANDOFF.md` 九节读了四节**（§3/§4/§8/§9），§1/§2/§5/§6/§7 仍未读，
  其中 §7 `Honest execution ledger` 最可能改变判断。
- **非负条款有效性未证明**（见 R-A6），已转为执行方义务。

<!-- FILE_END: DISPOSITION-AND-REDTEAM.md -->
