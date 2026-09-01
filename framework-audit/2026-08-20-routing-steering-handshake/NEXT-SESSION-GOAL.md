/goal 接管 luca_gstack routing-steering 握手计划：先补齐 framework-evolution 对齐债，再跑审查轮直到三方对同一 SHA 全过，然后向 luca 提交 exact-SHA 握手。

## 唯一终态

`FINAL-EXECUTION-PLAN.md` 的**同一个未变字节的 SHA-256** 依次拿到三份收据：
1. 独立 Plan Agent Gate → `READY_FOR_REDTEAM`，0 BLOCKER / 0 MAJOR
2. 独立路由红队 → `PASS`，0 BLOCKER / 0 MAJOR
3. 独立事务红队 → `PASS`，0 BLOCKER / 0 MAJOR

三份必须绑同一个 plan SHA **且**同一组全程未动的 refs。拿到后向 luca 提交六样东西：计划核心结论、exact plan SHA、三份收据的路径与 SHA、并**明确请他批准这个 exact SHA**。

**握手判据**：只有 luca 点名当前 exact SHA 说批准才算。「继续」「可以」「go」、对旧 SHA 的批准、没点名 SHA 的同意，**都不算**。

## 当前状态（接手时先自己核一遍，别信这里的转述）

```
工作目录   /Users/luca/Desktop/项目/muse/lucagstack
计划       framework-audit/2026-08-20-routing-steering-handshake/FINAL-EXECUTION-PLAN.md
plan SHA   2e93dbcefbe6baf61378c88906eb2f025bac25d0e874942f4f6e7f3e3b632a32
行数       5770
BASELINE   HEAD = upstream = b438c92b1d1dbb28f5252396181f1cb9ab806900
tree       ffc658ee1f6770751d2024377c318404dbe5580b
downstream 69f1a947ca8113af8b6b54b8e8353c31bc4d4f8a（本机 project-scope-guard 拦截，历轮均记为 UNVERIFIABLE_FROM_THIS_SESSION，不要绕）
```

核验命令（`git` 的 pathspec 相对 cwd 解析，**一律用 `git -C <仓库根>`**，否则会静默缩小量程给出假阴性）：

```bash
cd /Users/luca/Desktop/项目/muse/lucagstack/framework-audit/2026-08-20-routing-steering-handshake
shasum -a 256 FINAL-EXECUTION-PLAN.md && wc -l < FINAL-EXECUTION-PLAN.md
git -C /Users/luca/Desktop/项目/muse/lucagstack rev-parse HEAD @{u}
```

## 权威读序（按此顺序，别跳）

1. `FINAL-EXECUTION-PLAN.md` §17.0 —— **门禁范围**。只有 §4–§16 的可执行契约进 BLOCKER/MAJOR 判定；§0.3 的字面哈希值、§2.15–2.17 历史行、§12.3 轮号清单是会话记账，**不阻塞**。KILL-02/KILL-03 两条闸永远在范围内。
2. §0.3 KILL 条件 —— 尤其 KILL-01（计划一改，三份审查全废）与 KILL-02（refs 一动，该轮判 stale）。
3. §2.17 最上面两行 —— **你的第一件事就写在那里**（见下「首个任务」）。
4. §4.2 / §5.1 / §5.2 / §8.1 —— 上一轮架构改动的落点。
5. `PLAN-AGENT-REVIEW-R27.md`、`REDTEAM-ROUND-27-ROUTING.md`、`REDTEAM-ROUND-27-TRANSACTION.md` —— 最后一组完整的三份收据（R28 判 stale，见下）。

## 首个任务：framework-evolution 对齐债（必须先做完，否则任何 PASS 都不作数）

2026-08-28 提交 `b438c92 fix(routing): add framework evolution flow` 是 **luca 刚落地的新能力**，不是污染。它动了五个本计划 §12.1/§12.2 envelope 成员，其中 **`.claude/hooks/route-guard.mjs`（+59 行）正是本计划的核心改造对象**。基线已重冻结、五个 blob 已钉好，但**内容对齐还没做**：

- **(a)** `CLAUDE.md`/`AGENTS.md` 新增了 `FRAMEWORK FLOW` 路由层（位于 Plan Agent 层与 Multi-Skill 层之间）。§8.1 分类器与所有路由优先级论述，必须说明 `alias_resolution` 与 `semanticRouteAxis` 相对这一层的位置。
- **(b)** §3 的 preflight 普查、§12.1 的 byte-parity 快照、§14 中一切描述 route-guard 现有行为的断言，都是对 `b438c92` **之前**的文件写的，必须按落地后的字节重新推导。
- **(c)** `scripts/test-route-guard.mjs` 与 `skill-routing-map.yaml` 同步变了，§16 的命令并集要对新测试重核。

**先读 `git -C <root> diff c146cb7 b438c92 -- .claude/hooks/route-guard.mjs CLAUDE.md` 的实际内容再动手**——哈希比对只回答"新不新"，diff 内容才回答"撞不撞"。

## 首个 verifier

对齐做完、算出新 plan SHA 后，**先跑一次机械自审再派 agent**（这套自审在历轮抓出过多个本会被审查者判 BLOCKER 的缺陷）：

```bash
P=FINAL-EXECUTION-PLAN.md
# 1. 磁盘上已有的收据不得被列为 required-new
for n in $(ls PLAN-AGENT-REVIEW-R*.md | grep -o '[0-9]*' | sort -n); do
  grep -q "all R${n} names\|two Round-${n} PASS" $P && echo "*** R$n 已落盘却仍被列为待产出 ***"; done
# 2. 基线字面值只许出现在 §0.3 tuple 与其祖先链内
awk 'NR<73||NR>95' $P | grep -c 'BASELINE_HEAD=[0-9a-f]\|BASELINE_TREE=[0-9a-f]'   # 必须为 0
# 3. 悬空引用按语义搜，不按被删符号名搜
grep -n 'same .* as §4\.2\|negation spans\|authorizes aliases\|clause-terminal\|per .NEG. member' $P
# 4. KILL-03
git -C /Users/luca/Desktop/项目/muse/lucagstack status --porcelain=v1 | grep -v '^??'
```

## Phase / 派发纪律

**Phase 1 · 对齐** → **Phase 2 · Gate** → **Phase 3 · 双红队（并行）** → **Phase 4 · 握手**

- 每轮**必须先过 Plan Agent Gate**；只有 `READY_FOR_REDTEAM` 才能派两个红队。
- 两个红队**并行**派，绑同一个 SHA；Gate 不能和红队同时跑。
- 任一审查出 BLOCKER/MAJOR：修计划 → 轮次 +1 → **重新从 Gate 开始**。轮次现已用到 R28，下一轮从 **R29** 起（`PLAN-AGENT-REVIEW-R29.md` / `REDTEAM-ROUND-29-ROUTING.md` / `REDTEAM-ROUND-29-TRANSACTION.md`）。
- 派发指令里必须写死：expected plan SHA + 行数 + expected HEAD/upstream/tree，并要求 agent 在**开审前、写报告前、写报告后**三次自查；任一处不符即自判 stale、不得发 PASS。
- 给 agent 的预算纪律（历轮教训）：大块读（600–800 行）、每块最多一行评注、不长引用、**攻完立刻动笔写报告**；快耗尽就先落盘并如实交代没读到哪。

## 硬纪律（违反即返工）

- **审查在飞期间绝不改计划字节。** 一改，在飞的全部判 stale。手上有确定要修的缺陷也攒着，等整批回来一次性改。
- **agent 报 `failed` ≠ 死了。** 撞限额/断网都是**挂起**，恢复后会自己续跑。先只读核验（plan SHA / refs / 收据是否已落盘），没变就 `SendMessage` 唤醒续跑，**不要重派**——重派等于扔掉它已读完的几千行。基建故障不是红队结论。
- **既有收据一律不可修改**：`PLAN-AGENT-REVIEW-*.md`、`REDTEAM-ROUND-*.md` 全部只增不改不改名。
- **改完必须做语义消费者普查**：删/改一套机制后，按它承担的**语义**和导入式措辞（`same … as §`、`per §`、`defined in §`）全文搜，不要只 grep 被删符号的名字——上一轮正是这样漏了三处，其中一处在没编辑过的 §8.1。

## Git 纪律

- 本阶段**只改** `FINAL-EXECUTION-PLAN.md` 和新建审查收据。
- **禁止**：修改 runtime/hook/test/Luca App/downstream alias、push、reset、stash、clean、处理无关工作。
- 保留全部既有 worktree 改动，不 stash 不 clean。
- **第一个 commit（§13 的 `A0`）必须先拿到 luca 对 exact SHA 的点名批准**，在那之前不做任何 git 写操作。

## BLOCKED —— 出现以下情况停下来问 luca，不要自行决定

- 又有并行提交动了 §12.1/§12.2 的 envelope 成员，且改动内容与本计划要做的事**语义冲突**（不只是哈希变了）。
- 审查连续多轮只在"计划描述自己"处报缺陷、机制层干净 —— 说明门禁自指，该重划范围而不是再转一轮。
- 需要降级任何 KILL 条件才能推进。
- 三份 PASS 齐了 —— 停下来提交握手，**不要自行进入实现**。

## 背景（一句话）

这份计划要修三条真实故障：`进入luca app项目` 没能把产品别名解析成 canonical `muse`；设置页交互结构请求 route score 为 0 被当成"不需要 skill/flow"而反复停下；Codex steering 多条真实用户消息共用一个 `turn_id`，旧 anti-replay 把传输层 parent 当事件身份，导致后续纠正与「继续」被拒。luca 要求先修框架，顺序是需求 → 方案 review → 计划 → 红队对抗 → 握手，握手前不得实现。
