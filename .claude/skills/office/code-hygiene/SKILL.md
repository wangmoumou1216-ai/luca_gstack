---
name: code-hygiene
preamble-tier: 1
version: 1.1.1
description: |
  代码层工程约束 skill：对工程代码（luca_gstack 自身 .mjs/.py/.js 神经系统 + 下游实现）
  做「清理 + 完成前验证」的工程体检。两半：
  ① 完成前验证铁律（Iron Law）——任何「修好了/通过了/done」的声明前必须有当场跑出的证据，否则=撒谎；
  ② 8 个清理算子（死代码/循环依赖/去重/类型整合/弱类型/防御性/遗留/slop），各自工具检测 + 只自动应用 HIGH 置信 + 逐步验证。
  来源：agent-starter cleanup-* 套件（port-pattern）+ superpowers verification-before-completion（adapt-idea）。
  同 key 的 environment-retro 只提工程环境改进；pre-commit-setup 是按需配方；改动审查唯一执行体为模式 D。
  **luca 专属护栏**：hook 的 fail-open、Static Fallback、兼容语义、framework/ 只读、WHY 注释 一律保护，绝不当死代码清掉。(luca_gstack)
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
context-cost:
  self: 4200
  runtime-estimate: 15000
  shared-refs: [none]
  recommended-model: core-execution  # 2026-07-10 承重执行档：代码清理+完成前验证
---

## 定位（先读）

这是**工程域代码约束 skill**，不是设计 skill。约束对象=**工程代码**：
- luca_gstack 自身的 `.claude/hooks/*.mjs`、`memory/scripts/*.py`、`.claude/workflows/*.js`、`scripts/*.{mjs,sh}`
- 下游项目的实现代码（Electron/TS/Python 等）

与既有能力的边界（**不重复**）：
- `careful`=危险命令拦截（rm -rf/force-push），与本 skill 正交。
- 全局 `tdd`=测试先行；`systematic-debugging`=根因排查。本 skill 的「验证铁律」是**完成前**跑验证，不是写测试方法论。
- `redteam`/`quality-gate` agent=对**产出**做对抗审查；本 skill 的代码审查环节优先**复用**它们，不另造常驻 reviewer（对不上被审对象时按 R4 自建场景化编排仍合法）。
- `code-review`=用户可见的代码审查入口（固定范围 + Standards/Spec 两轴隔离）；它委托本 skill 的模式 D 作为唯一执行合同，不复制第二套审查规则。
- CLAUDE.md「Coding Discipline」=always-on 的轻量原则（Surgical Changes 等）；本 skill 是**按需深度体检** + 可路由调用，两者互补不冲突（Coding Discipline 仍不进 routing-map）。

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
# 工作树必须干净——每个清理算子的 verify 步需要干净 baseline 才能逐项回退
git status --porcelain | head -5
echo "DIRTY_LINES: $(git status --porcelain | wc -l | tr -d ' ')"
python3 .claude/observability/scripts/get_rules.py code-hygiene "*" 2>/dev/null || true
```

---

## Phase 0：确认模式与范围（必问一次）

AskUserQuestion（或在 agent 自调用时按上下文确定）：

> 这次代码体检要做哪部分？
>
> A）**完成前验证**（Iron Law）——只跑「声明 done 前的证据门」，不改代码
> B）**定向清理**——指定 1-2 个算子（如「去重」「删死代码」）+ 范围（路径/glob）
> C）**全量体检**（cleanup-all 顺序）——8 算子按序跑，每步 verify，首个失败即停
> D）**改动评审**——对一批改动做审查（下方「代码审查环节」），只出 findings 不改代码
>
已有明确模式和批准范围时沿用，不重复索取同一决定。默认 A–D 不变；用户明确要求工程会话环境复盘时
使用同 key 的 `entry_mode=environment-retro`，在读日志/提出建议前完整读取
[references/environment-retro.md](references/environment-retro.md)。产品设计复盘仍归 `retro`。
用户明确要求提交前接线时，先完整读取 [references/pre-commit-setup.md](references/pre-commit-setup.md)；
这是配方而非新增执行器，不能因为读配方就安装依赖、改 Hook 或提交。

> 范围默认=当前改动涉及的文件；可指定路径。框架自维护时范围=被改的 hooks/scripts/memory。
> 先按 project-session 验证 canonical 目标和有限 scope；框架审计保持 NO_PIN，cwd 不授予目标权限。

**硬前置**：模式 B/C 要求工作树**干净**（每算子需干净 baseline 做逐项回退）。脏树 → 先让用户 stash/commit，或缩到「只对已暂存改动」。模式 A（纯验证）与模式 D（评审不改文件，无需回退 baseline）不要求干净树——**"刚改完还没提交"正是评审的主场景**。

---

## 第一半 — 完成前验证铁律（Iron Law）

> 来源：superpowers verification-before-completion。这是本 skill 的**核心**，也是 luca 既有
> 多条教训（「改完先跑测试再说done」「验证你的验证」）第一次被固化成可路由仪式。

### 铁律

```
没有当场跑出的新鲜证据，就不准声明「完成 / 修好 / 通过 / 应该可以了」。
```

**违反字面 = 违反精神。** 如果你在本条消息里没有亲自跑过验证命令，你就不能声称它通过。

### 门函数（声明任何状态前执行）

1. **IDENTIFY**：哪条命令能证明这个声明？
2. **RUN**：跑**完整**命令（新鲜、完整，不是上一次的残留输出）
3. **READ**：读全部输出、查 exit code、数失败条数
4. **VERIFY**：输出是否确证声明？否 → 如实报实际状态（带证据）；是 → 带证据下结论
5. **才能**下结论

跳过任一步 = 撒谎，不是验证。

### luca 的验证命令真值（不要泛泛说"跑测试"，跑这些）

| 声明 | 必须跑的命令 | 不充分 |
|---|---|---|
| 框架结构没坏 | `bash scripts/verify.sh`（看 PASS/FAIL 计数）| 「应该没动到」 |
| 路由/contract 没漂移 | `npm run check:routing-map`、`check:coding-discipline`、`check:quality-gates`、`check:self-model` | 局部看一眼 |
| hooks 没坏 | `npm run check:hooks` / `node scripts/test-hooks.mjs` | 「只改了一行」 |
| 记忆系统没坏 | `python3 memory/tests/test_memory_system.py` | 脚本能 import |
| 路由金标没变 | `node scripts/test-route-guard.mjs` | 「逻辑等价」 |
| 下游测试通过 | 项目自己的 `bats`/`swift test`/`pytest`/`npm test` 全跑 | 临时合成的最小复现 |
| prose 改 skill 真改了行为 | `behavioral_ab.py`（被改 skill 的档位上跑）verdict=PASS | 静态测试全绿（SC-20260601-002：绿≠改了行为）|

### 红旗——出现即停，先跑验证

- 用「应该 / 大概 / 看起来 / probably / seems」
- 验证前就表达满意（「搞定！/ Perfect / 完美 / done」）
- 要 commit/push/PR 却没跑验证
- 信 subagent 的「success」自报（必须独立查 VCS diff）
- 只做了部分验证就外推全部
- 「就这一次」「我累了」——例外即破窗

### 合理化拦截

| 借口 | 现实 |
|---|---|
| 「现在应该好了」| 去**跑**验证 |
| 「我有信心」| 信心 ≠ 证据 |
| 「lint 过了」| lint ≠ 编译/测试 |
| 「subagent 说成功了」| 独立查 diff 验证 |
| 「换了说法所以不适用」| 精神高于字面 |

### 护栏/检查类改动：证明会咬（prove it bites）

凡新增/修改 **hook、checker、lint 规则、拦截脚本、断言**，Iron Law 的完成判据升级为三段证据：
1. 先观察 **pass**（干净输入通过）；
2. **故意制造一次违规**，观察它以**期望的确切方式**失败（确切 exit code / 报错样式——
   如 careful 的 exit 2、checker 的 FAIL 行），"跑起来不报错"不算；
3. 还原后再 **pass**。
三段证据俱在才可声明 done——**不会在违规上失败的检查一文不值**。
⚠️ fail-open 兼容（护栏第 3 条的延伸）：对 fail-open hook，"证明会咬"= 证明其在**预期触发
路径**上拒掉违规（如 careful 对危险命令 exit 2），**不得**解读为要求 fail-open hook 在自身
异常时也阻塞（那是逼 fail-open 变 fail-closed，违反承重不变量）。
> 源：mattpocock/skills prove-it-bites 内核（MIT，对标采纳 2026-07-12）；本审计自身实践在先
> （check-coverage.py 上线前先用捏造引文验证会 FAIL）。

> 与 luca 记忆呼应：`feedback_run-tests-before-claiming-done`、`feedback_verify-your-verification`、
> `feedback_redteam-own-analysis-before-shipping`。本铁律是它们的执行版。

---

## 第二半 — 8 个清理算子

> 来源：agent-starter cleanup-* 套件。**通用协议**：每算子 = 检测（专用工具）→ 写评估报告
> （HIGH/MEDIUM/LOW 置信）→ **只自动应用 HIGH，MEDIUM/LOW 留给人**→ 每次改动后跑该算子的 verify，
> 失败即逐项回退。报告写 `.claude/cleanup-reports/cleanup-<算子>-<YYYY-MM-DD>.md`（该目录已入 .gitignore）。
> **工具按需探测（不静默降级）：** 每算子检测工具（knip/vulture/jscpd/madge/staticcheck/tsc）先 `command -v` 探测；缺失则降级到 `grep` 启发式并在报告头标注 `TOOL=grep-fallback`，**不自动装依赖、不假装跑了专用工具**。

### 算子表（含工具 + luca 专属护栏）

| # | 算子 | 检测什么 | 工具 | luca 专属护栏（**违反即误删**）|
|---|---|---|---|---|
| 1 | `unused` | 死代码/未用 export/文件/依赖 | knip(JS/TS)·vulture(py)·`grep`·staticcheck | hooks/skills/workflows 是**按路径/约定动态加载**的（route-guard 读 yaml、skill 被 Skill tool 名字调）→ 静态分析判「未引用」**不可信**，一律降 MEDIUM 交人。`memory/scripts/*` 被 CLAUDE.md/hook 以字符串路径调用同理 |
| 2 | `cycles` | 循环依赖 | madge(JS/TS)·`grep import` | 先看图层级；luca 仓循环少。破环只在**真循环**且抽叶子节点安全时 |
| 3 | `dedupe` | 复制粘贴块 | jscpd（`--min-tokens 70 --min-lines 30`）| 只自动抽 **token 完全相同 ≥30 行** 的块；过滤 test/migration/generated。**小重复或发散重复别 DRY**——过早抽象比 3 行相似更糟 |
| 4 | `types` | 类型重复定义 | `grep` interface/type | luca 自身仓 .mjs/.py 基本无类型 → 本算子主要对**下游 TS**生效 |
| 5 | `weak-types` | `any`/`unknown`/`interface{}`/无注解 | `tsc --noImplicitAny`·mypy | 逐项 typecheck，失败即单条回退；公共 API 保守。luca 自身仓低产出（无 tsconfig），价值在下游 TS |
| 6 | `defensive` | 无意义 try/catch、吞错的兜底 | `grep -A5 "try {"` | **重护栏（按属性非按文件名）**：边界处 catch 保留（HTTP handler / CLI 入口 / 队列消费者 / 测试）。判据 = **任何 catch 体仅 `exit(0)`/`return`/静默放行，或函数/邻近注释含 `fail-open\|绝不卡住\|fail open\|safety contract\|SESSION_SYNC_BLOCK`** → 强制降 MEDIUM 交人。具名实例：luca hooks（session-sync/session-restore/route-guard/post-edit）；**但护栏按属性匹配——`memory/scripts/*.py` 治理脚本（daily_governance/consolidate 等）里的 fail-open `except`（auto-grow「任何异常 fail-open」）同属此类、同等保护，非仅那 4 个具名 hook** |
| 7 | `legacy` | deprecated/legacy/v1/fallback 死分支 | `grep @deprecated\|TODO remove`·LSP caller | **重护栏（按属性非按文件名）**：判据 = **任何含 `Static Fallback\|兼容语义\|fallback\|档位回退\|@deprecated 但有真实 caller` 的分支**都是**有意保留的兜底**，不是死分支。具名实例：CLAUDE.md Static Fallback 节、兼容语义（「写 PRD」→ /brainstorm）、model-routing 档位回退（fable→opus）；**未具名但同属性者一视同仁保护**。删前必 grep+确认零真实 caller 且非有意 fallback |
| 8 | `slop` | AI slop：复述代码的注释、过程旁白、平庸套话、stub 标记 | `grep` + 启发式（**只改注释，不动逻辑**）| 与 luca **最小注释原则**完全同向：保留「解释 WHY」的注释（workaround/不变量/反直觉行为/引用），删「复述 WHAT」的噪声。若「改注释」需要动代码 → 上报，不自己动 |

### cleanup-all 顺序（模式 C）

破坏性→建设性→装饰性，每步缩小下一步的扫描面，**首个 verify 失败即停**：
`unused → cycles → dedupe → types → weak-types → defensive → legacy → slop`

每步：①打印 `▶ cleanup-X (step Y/8)…` ②跑该算子 ③verify ④失败→HALT 打印失败报告路径 ⑤通过→把 findings 数 + LOC delta 追加进 master 报告，继续。master 报告 `.claude/cleanup-reports/cleanup-all-<date>.md`，含 baseline（LOC/文件数/依赖数/cycles/弱类型数）与逐步 before/after。

---

## 代码审查环节（模式 D 的执行体；`code-review` facade 的唯一权威）

模式 D 直接调用与 code-review facade 消费同一冻结输入、同一方法。facade 只固定范围并委托；
不复制 smell、评判或报告真值。只读取证、只出 findings，不改文件、index、refs、配置或票据。
**独立性、REFUTE、运行时分区、缺票补票、终版闭合、mutation 和复犯检查的唯一权威仍是
`.claude/skill-os/routing-chain-check.md` R4**；实际进入这些门前完整读取，不在此重建副本。

### 1. 冻结实际评审输入

调度方先按 project-session 验证目标，框架审计保持 NO_PIN。冻结规范化绝对 `WORK_ROOT`、
`FILE_SET`、DESCRIPTION、需求与标准指针及 SHA、baseline、diff 命令、实际 commits。
不用 reviewer 的 cwd、共享 docs/current-topic 别名、父 SID 或自行切项目推定权限。
冷 reviewer 保留自己的原生身份；项目子会话核验自身 CHILD_ASSOCIATED / binding_validation:
VERIFIED 与冻结根一致；关联或实际读取缺失记 UNKNOWN，不能 PASS。

三种范围共用下列前置门：
- **WORKTREE_DIFF（默认）**：固定 `git -C '<规范化绝对根>' diff HEAD`，确认 HEAD 可解析，
  合并 index/worktree 的实际范围；显式新增未跟踪文件需要单独已批准的 FILE_SET，不能静默遗漏。
- **BASE_SHA/HEAD_SHA**：先实际 `rev-parse` 两端及 merge-base，把用户的 branch/tag/ref 解析成
  不再漂移的 SHA，冻结 `git -C '<规范化绝对根>' diff <BASE_SHA>...<HEAD_SHA>` 与
  `git -C '<规范化绝对根>' log <BASE_SHA>..<HEAD_SHA> --oneline`。
- **FILE_SET**：展开有限绝对文件清单，绑定真实 preimage/比较来源与实际 diff；不是免除基线门。

坏 ref、不可读输入、空 diff 在派发前停止；不能让判官猜范围。两轴运行前后复核 diff/input SHA
一致；中途漂移则票失效，返回 owner 冻结新输入，不能拼接不同字节的意见。

### 2. 定位 Spec 来源

在已授权读取范围内按顺序查：实际 commit messages 的 issue 引用及既有 tracker 读取合同；
用户传入的 spec；已批准 docs/specs/scratch 中与主题相符的文档。未经许可不网络抓取票据，
tracker 缺失不自动 setup。需求源必须绑定真实正文及行号，不把实现摘要当 spec。
通常改动审查没有书面 spec：Spec 显示 **NOT_RUN — no spec available**，继续 Standards，
不写 Spec PASS。用户明确要求需求核验却缺需求时，真实询问缺的具体来源并等待；只有用户
明确表示无 spec 才跳过该轴。缺来源或不可核查的运行证据保留 UNKNOWN，而不是无发现。

### 3. 定位 Standards 与十二种 Fowler smell

读取目标仓库真实 CODING_STANDARDS/CONTRIBUTING/适用约束及既有 checker 接线。
**仓库标准和 luca 护栏优先**：仓库允许的模式压过 baseline；工具已执行并覆盖的机械规则
不重复报成手工 finding。8 清理算子仅作只读透镜，模式 D 不调用其自动修复流程。
smell 总是带证据的 judgement call（如 possible Feature Envy），不是硬违规；无标准文档时
也可使用以下固定 baseline。必须同时传入 what→fix，不只给十二个名字：

| Smell | What：在实际 diff 中判断 | Fix：建议方向，非自动动作 |
|---|---|---|
| Mysterious Name | 函数、变量或类型名不透露用途 | 改为诚实名称；找不到诚实名称则追问设计 |
| Duplicated Code | 多个 hunk/file 出现同一逻辑形状 | 抽取真实共享形状并由两处调用，避免伪相似过早 DRY |
| Feature Envy | 方法取别的对象数据比自己的更多 | 把方法移到它依赖的数据一侧 |
| Data Clumps | 同几项字段/参数总是一起出现 | 归为一个领域 type 再传递 |
| Primitive Obsession | primitive/string 承担值得命名的领域概念 | 给概念一个小 type |
| Repeated Switches | 对同一 type 重复 switch/if 链 | 使用多态，或两处共用一张 map |
| Shotgun Surgery | 一个逻辑变动迫使许多文件分散改动 | 把一起变化的行为收进同一 module |
| Divergent Change | 一个 module 为几个无关原因一起变 | 按变化原因拆开 module |
| Speculative Generality | 添加 spec 未需要的抽象、参数或 hook | 删除猜测性扩展，回到现有实际需求 |
| Message Chains | caller 依赖冗长 a.b().c().d() 导航 | 把导航藏在首个对象的方法后 |
| Middle Man | class/function 几乎只转发调用 | 删除浅委托，由 caller 调真实目标，保护承重 adapter |
| Refused Bequest | 子类/实现者忽略或覆盖大半继承合同 | 去除不合适继承，使用组合 |

### 4. 冷判官严格串行、双轴输入隔离

派发前读取当前 model-routing，使用已登记原生 `quality-gate` / **MR-004 peak**，
`fork_turns=none`；不硬编码账户模型名、不修改私有 binding、不用 producer 补完成证据。
`max_active_subagents=1`，先 Standards 真实 completed 并读回**同 invocation accepted**，
核验输入 SHA/原生身份与票据证据，再派 Spec。角色失败或 UNKNOWN 停在门前，不降档假审。

Standards 冷输入仅含固定 diff 命令/commit 清单、DESCRIPTION、标准文件及规则、上表完整
what→fix 和保护约束，不含作者历史或 Spec 判官意见。要求按文件/hunk 分别报：(a) 实际标准
违规，引用标准文件+规则；(b) possible smell，引用 hunk，明确硬违规和判断建议，报告宜 <400 字。

Spec 使用另一独立冷上下文：同一 diff/commit 清单、真实 spec 路径/内容/行号、DESCRIPTION，
**不读取 Standards 报告或其评判**。逐项引用 spec 原句，报告 missing / partial / scope creep /
wrong implementation，宜 <400 字。没有 spec 时不派该判官，如实 NOT_RUN。
代码上下文如需补读，只取原 FILE_SET/许可交集，不偷用历史或扩大范围。

### 5. 分轴聚合与闭合

分别呈现 `Standards` 和 `Spec` 原票，可轻清表达，不合并、不跨轴 rerank、不选单一赢家。
末行各自列 finding count 与本轴 worst（Critical / Important / Minor 或真实空）；NOT_RUN /
UNKNOWN 原样保留，不能计成 0 findings 的 PASS。标准符合但做错需求与需求符合但违反标准
是不同结论。附实际 native ID、invocation、输入 SHA、起止、completed/accepted 证据。
调用方决定修复：Critical/Important 在对应门前处理、Minor 记录，REFUTE 带理由；修后按 R4
闭合终版证据。模式 D 不自动修复、commit、push、PR 或关闭票据。
来源：source02 §§1–5，Matt Pocock，MIT，pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。

---

## ⚠️ 末尾核心约束

1. **Iron Law 不可跳**：声明 done/通过/修好前，必须有本条消息内跑出的证据。
2. **只自动应用 HIGH 置信**清理；MEDIUM/LOW 一律交人。
3. **luca 护栏优先于算子，且按属性非按文件名**：fail-open catch / 有意 fallback / 兼容语义 / framework/ 只读 / WHY 注释 一律保护——算子说"删"，护栏说"留"时**听护栏**。**未具名但同属性者（如 `memory/scripts/*.py` 的 fail-open `except`）同等保护**，不因不在示例名单里就放行。
4. **模式 B/C 要求干净工作树**；脏树先 stash/commit 或缩范围。
5. **每个清理算子改完跑 verify**，失败逐项回退，不让级联坏下去。
6. **模式 D 是唯一审查方法所有者**：Standards→Spec 用当前 quality-gate/MR-004 peak 冷上下文串行；
   前票真实 completed/同次 accepted 后再派，max_active_subagents=1，分轴、只读；R4 管闭合。
7. **本 skill 自身的改动也受 Iron Law 约束**——别在没跑 `verify.sh`/`check:*` 前说"接好了"。

<!-- FILE_END: code-hygiene/SKILL.md -->
