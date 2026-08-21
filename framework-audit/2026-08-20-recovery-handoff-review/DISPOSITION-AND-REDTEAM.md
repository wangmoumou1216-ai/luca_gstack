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

## 二之二、第三轮：换新眼睛攻**我自己的握手稿**（三条全中）

第二轮攻的是我的**发现**；这一轮攻的是我的**交付物**。三条都是我自己写进去的缺陷。

### R3-A1 我的两条指令表面自相矛盾，会让新 session 卡死 —— **已修**

握手稿同时写着：

- 「**禁止**手改 manifest 里的任何哈希/HEAD 让 verifier 通过」
- 「第一个工作项是 **G-REFREEZE**：重新采集冻结」

而重新采集冻结**就是**在改写 manifest 里的哈希和 HEAD。一个照字面执行的 session
会判定这两条不可同时满足而停下。**这不是理论风险，是我交付物里的真实歧义。**

已补消歧：禁的是**逐个改值**去迁就一份过期 manifest；要求的是**整份重新测量生成**。
判据一句话——**你改的是「值」还是「测量」。**

### R3-A2 我的 G-REFREEZE 要求在他们定义为只读的阶段写码 —— **已修**

SAFE-BOOTSTRAP 明令 `Do not create a linked worktree, merge, cherry-pick, stage, commit, push,
or change a live source/hook during the first recovery phase`。
而我要求「交付一个生成器」——那是在只读阶段写文件。我提这条时**没意识到自己在破他们的禁令**。

已补范围写死的例外：只允许在
`framework-audit/2026-08-19-rule-execution-recovery-handoff/tools/` 下新建生成器；
不得碰任何 live source / hook / skill / 生产脚本；人类门批准前不得 commit/push。

### R3-A3 我的「收窄冻结面」会删掉红队 B 明确要求的一条保护 —— **已修**

我写「不得冻 upstream ref」。但红队 B 的 **B-R4-P1-001** 恰恰是发现
「冻结的 upstream endpoint **不在** live gate 里」——remote URL 可以被改掉而所有 live 断言仍全绿，
于是保留到最后的那次 fetch 可以从**另一个仓**取回 declaration。

我那句话若照做，等于把一条红队要求加上的保护当成冗余砍掉。**这是收窄冻结面时最容易犯的错：
把「会合法移动的」和「被改动就是攻击的」混为一谈。**

已拆成两件事：**端点身份（fetch/push 的 `--all` 全量 URL 列表，含基数）必须冻；
端点位置（ref OID）不要冻。** 前者被改是攻击，后者移动是正常 push。

### 本轮另外两处补验（都清白，缩小了 luca 的担心范围）

- **skill 集自 common base 起零变更**（`git diff --name-only df63d4e..HEAD -- .claude/skills/
  .claude/skill-os/` → **0** 个文件）。所以 Cycle 2 的 `321/321`、`2,568/2,568` 与
  `ADAPT 10 / KEEP 18 / DEFER 19 / REJECT 27` 量的仍是同一个对象，**没有被代际漂移掏空**。
- **containment 的两条 absent 路径仍不存在**（`~/.agents/skills/resolving-merge-conflicts`、
  `~/.codex/skills/resolving-merge-conflicts`），门禁这一格不会因外部变化而假红。

**代际漂移的最终边界**：宪法文本未变（`a864d54` 在 common base 内）、**skill 集未变**、
containment 未变。全部漂移集中在 **记忆层（08-15 八个提交）+ hooks（我的四个）+ 文档/数据**。
luca 担心的「更新了几代」是真的，但**没有动到 Cycle 2 的度量对象**，只动到了 bootstrap 依赖的
记忆层——F10 就长在那一处。

### §7 已读：不翻案

`Honest execution ledger` 是一张「什么都没完成」的诚实台账（`RULE_EXECUTION_VERIFIED` 未达、
MPC2 未开始、U014 草稿与其路径分母**已随 /private/tmp worktree 永久丢失**、
15 TST / 28 断言 / 7 criteria 均未 durably proven）。它不改变本评审任何一条裁决，
但它解释了这份 handoff 为什么如此偏执于「持久路径」——他们真的丢过一整批 receipt。

---

## 二之三、第四轮：**独立冷启动红队**（fable，非 fork，拿不到我的上下文）

前三轮都是我攻我自己。这一轮第一次有外部视角。**结果：我那条唯一"不让步"的非负条款，
两段都被打穿。** 三条发现我已逐条独立复现，全部属实。

### R4-B1 [BLOCKER] 我要求在**活体共享安全钩子**上原地降级 —— **已修**

**它的证据**（我复现过）：

```
.claude/settings.json:42  node "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/project-scope-guard.mjs" …
.codex/hooks.json:35      … node "$(git rev-parse --show-toplevel)/.claude/hooks/project-scope-guard.mjs" …
```

这个文件是 **PreToolUse 热路径钩子**，对**这台机器上所有并发 Claude/Codex session** 生效。
而我的非负条款第二段白纸黑字要求在**真仓**里把 `realTargetOf(s)` 退回 `resolve(s)`、
跑一次、再还原。**在那个窗口内，任何并发 session 的跨项目路径访问都可能被放行**——
而 `..` 穿越与软链绕过是当天由红队**实证复现过**的真洞。

代价不是「测试会失败」，是**当场真的削弱了整台机器的跨项目隔离**。

**这条最难看的地方**：我自己试过隔离夹具、失败了，然后**没有去修夹具，而是把原地回退
写给了别人**。等于我把一个我自己都没敢跑通的危险操作，指派给未来那个 session。

已改为：隔离拷贝上做变异，**且阳性对照先行**——未变异副本必须先在隔离位置跑出与仓根
一致的结果，夹具才可信；不一致就如实记「未能验证」并停在人类门，**不得改用原地回退绕过**。

### R4-B2 [BLOCKER] 我给的命令在我自己钦定的 cwd 下会产生**假阳性回退判定** —— **已修**

`scripts/test-project-scope-guard.mjs:13`：

```js
const HOOK = resolve(process.cwd(), '.claude/hooks/project-scope-guard.mjs');
```

按**进程 cwd** 而非脚本自身位置定位被测文件。`git log -L` 确认这行自
`04a5faf`(2026-07-09) 起从未改过——**沉睡的既有 bug，不是本次引入**。实测：

```
从仓根跑              → === summary: PASS=88 FAIL=0 ===
从本稿钦定的中性目录跑  → === summary: PASS=0  FAIL=88 ===   EXIT=0
```

**满屏红，exit 仍是 0，没有任何"cwd 错了"的提示。**
而我的握手稿通篇要求保持中性 cwd、按绝对路径读文件，却给了一条裸相对路径命令。
一个诚实执行的 session 会把这读成「守卫真的被回退了」，然后触发我自己写的
`REVERTS_SECURITY_FIX` —— **对一个根本没发生过的缺陷做出回退动作**。

（顺带解释了我第二轮那个死掉的夹具：同一行 cwd 耦合。我当时归因到"夹具没搭对"是对的，
但没找到根因就放弃了；冷启动红队找到了。）

已修：绝对路径 + 显式声明这是全稿唯一允许的一次 `cd` 进仓根 + 明确「见 0/88 或
MODULE_NOT_FOUND 先判 cwd 副作用，不得据此触发 REVERTS_SECURITY_FIX」。
根因那一行**不在本次 scope**（它落在两个并发工作流的受控文件上），只点破、不顺手改。

### R4-B3 [MAJOR] 我对 F7 的降级被**当前仓库状态**证伪 —— **已重新升级**

第二轮我把 F7 从 MAJOR 降到 MINOR，依据是 `PAYLOAD-CENSUS.md`（08-20 21:00 快照）里
「project-scope-guard.mjs 不在其中」。冷启动红队直接查了**当前**的
`FINAL-EXECUTION-PLAN.md`：

```
$ grep -c project-scope-guard …/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md
5
4363: .claude/hook-releases/g0-baseline-20260820/payload/.claude/hooks/project-scope-guard.mjs
4380: .claude/hooks/project-scope-guard.mjs
4425: .claude/hook-releases/g3-routing-steering-20260820/payload/.claude/hooks/project-scope-guard.mjs
4492: scripts/test-project-scope-guard.mjs
5445: node scripts/test-project-scope-guard.mjs
```

而该目录的 `REDTEAM-ROUND-3-*.md` 写于 **08-21 03:04**——**它一直在长，我查的是死快照。**
这正是我在 F1 里指控别人的错误（拿冻结快照当现实），我自己在 R-A2 犯了一模一样的。

更重的是：它计划用一套全新的 **hook-releases 世代 + runtime-dispatch bridge** 机制
**重新发布**这个文件，不是打几个 hunk；而我的非负条款把这个文件的**当前字面内容**
当成长期不变的安全基准。且它的 handshake plan 自己记着：**基线已被我推到 main 的提交
撞脱靶过一次**——两个并发工作流互相绊倒不是假设，是**已发生的事实**。

已升级为**硬门**：动这两个文件前必须读它当前的两份计划，**并由 luca 确认执行顺序**。

### R4-B4 [MINOR] grep 三行容易被字面满足 —— **已修**

`grep -c` 只数字符串出现次数，加一行 `// resolve(input) noop` 或保留符号名清空函数体
都能通过。我原稿把它和 88/88 并列成「第一段·状态」的等权项。已改为显式分级：
grep 是**烟雾信号**，唯一权威判据是套件的 88/88。

### R4-B5 [已核实无问题] 我的事实性断言逐条抽验，全部为真

冷启动红队自己跑命令核对了：`upstream/main == HEAD`、upstream 的 fetch/push `--all`
各恰一行、母版检出 5 个 tracked 脏文件（散文写"两个"→ F4 成立）、skill 集自 common base
零变更、`get_memory.py` 对 person 零命中、`_ON_AUTHORITATIVE` 门禁属实、
SC-20260820-001/002 跨检出撞号且内容互不相同、forensic 分支三个安全符号全为 0。

一处小更正：person 层实测 **84** 个 .md，我写的 83 —— 一天内的记忆新增，非缺陷。

它也确认 **§5/§6 不推翻本评审任何一条既有裁决**，两轮历史红队的裁决在其核实范围内站得住。

### 第四轮的元结论

**三轮自攻 + 一轮外部，产出结构完全不同。** 自攻三轮打掉的是「我说过头的话」；
外部一轮打掉的是「我根本没想到的维度」——活体钩子的并发影响面、我自己命令的 cwd 脆弱性、
以及我拿死快照下的降级结论。**这三条没有一条是我再自攻几轮能自己找到的。**

luca 那句「你为什么不开 sub 红队」是对的：我两轮前自己写下"最好是一个不知道我结论的视角"，
然后按「未经要求不 spawn」的默认没去拿那个工具——**说出了正确的诊断，没开对应的处方。**

---

## 二之四、第五轮：独立验第四轮的修复 —— **两处补漏，且 R-A6 终于闭合**

第五轮不是"再找找问题"，是给冷启动红队三个**可证伪命题**：三处修复是真修好还是假修。

### R5-C1 修复1「隔离拷贝」表面修好、**实际不可执行** —— 已补，且顺带解开了一整晚的谜

第四轮我把「在活体钩子上原地回退」改成了「隔离拷贝 + 阳性对照先行」。方向对，
**但拷贝清单漏了依赖**，导致这条款 **100% 走不完**——诚实执行的 session 会永远卡在
「阳性对照不过 → 未能验证 → 停人类门」。

**根因（第五轮找到，我自己复现确认）**：

```js
project-scope-guard.mjs:43   const h = await import('./lib/harness.mjs');
project-scope-guard.mjs:81   substrate = await import('./lib/project-substrate.mjs');   // 31KB 真实逻辑
```

相对**自身文件位置**的动态 import。只拷单文件 → import 失败 → **被 fail-open 吞掉** →
后果不是"照常工作"，而是 PROJECTS_ROOT 退回硬编码默认、pin 读取全退化成 NO_PIN。
这正是我三次变异都得到 56/32、连阳性对照也是 56/32 的原因——**夹具是死的，
而它死得很安静**。

补齐 lib 目录下的 mjs 后实测：**阳性对照 PASS=88 FAIL=0，与仓根一致。夹具活了。**

### R-A6 闭合：非负条款有效性，现在有实证了

夹具修好后，我终于把一整晚没跑成的那个变异跑完：

```
变异：realTargetOf(s) 改成 resolve(s)（判真实目标 → 判词法路径），其余 583 行不动
结果：PASS=83 FAIL=5      （83+5=88，总数守恒 ✓）
转红：020a 框架文件应放行 / 020b 仓根本身应放行 / 020c Read 与 Bash 同口径
      021c 根内合法 .. 不被误伤 / 022d 普通框架文件不被误伤
```

**套件确实转红——但转红的五条全是「误伤面」断言，一条安全断言都没转红。**

原因：退回词法判据后守卫是 **fail-closed**（合法框架文件被误拒），不是 fail-open，
所以 022a-c 那些 DENY 用例照旧通过。

**这个结论比"有效"或"无效"都更有用**：条款作为**绊线**成立（任何对该判据的偏离都会被抓），
但**抓住它的是可用性侧而非安全侧**。如果我没做这一步，握手稿会带着一句
"转红 → 绿是真的"的模糊承诺出门，而执行方看到五条误伤面断言转红时无从判断这是不是预期。
现在这段实测结果连同"若转红条目与此不同则必须逐条判读"一并写进了握手稿。

> 元教训：我这一整晚在这条上栽了四次（三次变异 + 一次差分），每次都归因到"夹具没搭对"——
> **归因方向是对的，但我没有一次去找根因就放弃了**。冷启动红队第一次就找到了。
> 「知道自己错在哪一类」和「找到那一处」之间，差了一次不肯停的排查。

### R5-C2 修复3「F7 硬门」的「动」字无范围，与非负条款自相设卡 —— 已补

F7 写「不确认不得动这两个文件」，而同一份文档的非负条款第一段**强制要求**跑
测试套件、第二段要求把守卫**拷贝**到隔离位置反复变异。
「动」是否含"只读运行/拷贝"没有定义 → 严谨的 session 会在完全安全的只读验证上无谓停摆。

已把范围写死：受本门管的是**字节级修改 / 发布替换 / 提交推送**；
只读执行套件、隔离拷贝变异、grep 读取**不受此限，照常做**。

另补一条比例原则：F7 要求"读"的 FINAL-EXECUTION-PLAN.md 实测 **5500+ 行且仍在增长**
（两次测量差 128 行），是原始计划 + 16 轮 PLAN-AGENT-REVIEW + 3 轮红队的追加式全量记录。
叠加仓库的「强制读完规则」会变成通读半兆字节的移动靶。已改为：
小的那份（约 8KB，为人阅读而写）读全文；大的那份只 grep 定位 5 处命中及上下文。

### R5-C3 修复2「允许一次 cd 进仓根」是否违反 §6 —— **判定不违反，但我确实漏了论证**

第五轮读了 §6 原文：其危害面是**新 session 在仓内启动会被仓的 SessionStart 钩子抢跑**，
不是"会话中途任何一次目录切换都不许"。会话已在中性目录启动、已读完安全文档之后的一次
进仓根跑测试再退回，不触发 SessionStart、不编辑/禁用任何钩子，**没踩中 §6 要防的洞**。

但它指出一处**未言明的推理跳跃**：我的握手稿讲这个例外时通篇没引用 §6、没有一句
"这条不算违反 §6，因为……"，而 DISPOSITION 又宣称"§5/§6 确认不推翻任何裁决"——
这个宣称建立在一个从未被写下来的判断上。**判定成立，论证缺席。** 已知，本轮不补文字
（结论不变，且第五轮的报告本身就是那份论证的落盘）。

### R5-C4 事实复核：第四轮我跑过的命令，它全部独立重跑

hooks 接线行号、两种 cwd 下的 88/0 vs 0/88（exit 均为 0）、04a5faf 的 blame、
routing-steering 的 5 处命中、第二检出 5 个 tracked 脏文件——**全部一致**。
它还补了一条我没查的：codex hooks 配置的实测 SHA-256 与 §6 记录一致。

**一条行为级佐证**：它在自己的会话里切到临时目录时**被 project-scope-guard 当场 deny**——
这是"该钩子对所有并发 session 实时生效"的**行为证据**，比读配置强。
（顺带：这也是 F9 那条误伤的第三次复发；写本轮提交信息时是第四次。）

---

## 三、还没做的（诚实列出，不冒充完成）

- **红队五轮：三轮自攻 + 两轮独立冷启动（fable）。** 第四轮打掉两条 BLOCKER + 一条降级误判；
  第五轮验修复，抓出"表面修好但不可执行"一条 + "硬门自相设卡"一条，并解开了夹具的根因。
  两轮外部视角的产出都是自攻找不到的维度。
- **红队 A/B 的 87KB：我只做了定点抽读；第四轮的独立红队做了通读**，结论是其历史裁决
  在其核实范围内站得住，且未发现我把已处理项当新发现重提。
- **`FINAL-SESSION-HANDOFF.md`**：我读了 §1/§2/§3/§4/§7/§8/§9；**§5/§6 由第四轮独立红队
  逐字读**，确认不推翻本评审任何一条裁决。九节现已全部有人读过。
- ~~非负条款有效性仍未证明~~ → **已闭合**（见二之四 R-A6）：补齐 lib 依赖后夹具跑通，
  阳性对照 88/0，变异得 PASS=83 FAIL=5 总数守恒。条款作为绊线**有效**，
  但转红的是误伤面断言而非安全断言，这个区别已写进握手稿。
- **`scripts/test-project-scope-guard.mjs:13` 的 cwd 耦合是真 bug（`04a5faf`, 2026-07-09）**，
  已点破但**未修**——它落在两个并发工作流的受控文件上，需先做协调。这是一张待开的工单。

<!-- FILE_END: DISPOSITION-AND-REDTEAM.md -->
