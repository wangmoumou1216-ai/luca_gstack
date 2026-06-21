---
name: code-hygiene
preamble-tier: 1
version: 1.0.0
description: |
  代码层工程约束 skill：对工程代码（luca_gstack 自身 .mjs/.py/.js 神经系统 + 下游实现）
  做「清理 + 完成前验证」的工程体检。两半：
  ① 完成前验证铁律（Iron Law）——任何「修好了/通过了/done」的声明前必须有当场跑出的证据，否则=撒谎；
  ② 8 个清理算子（死代码/循环依赖/去重/类型整合/弱类型/防御性/遗留/slop），各自工具检测 + 只自动应用 HIGH 置信 + 逐步验证。
  来源：agent-starter cleanup-* 套件（port-pattern）+ superpowers verification-before-completion（adapt-idea）。
  **luca 专属护栏**：hook 的 fail-open、Static Fallback、兼容语义、framework/ 只读、WHY 注释 一律保护，绝不当死代码清掉。(luca_gstack)
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - Grep
  - Glob
  - Agent
context-cost:
  self: 4200
  runtime-estimate: 15000
  shared-refs: [none]
  recommended-model: guided-execution  # 框架指导的执行+审查；判断密度中等
---

## 定位（先读）

这是**工程域代码约束 skill**，不是设计 skill。约束对象=**工程代码**：
- luca_gstack 自身的 `.claude/hooks/*.mjs`、`memory/scripts/*.py`、`.claude/workflows/*.js`、`scripts/*.{mjs,sh}`
- 下游项目的实现代码（Electron/TS/Python 等）

与既有能力的边界（**不重复**）：
- `careful`=危险命令拦截（rm -rf/force-push），与本 skill 正交。
- 全局 `tdd`=测试先行；`systematic-debugging`=根因排查。本 skill 的「验证铁律」是**完成前**跑验证，不是写测试方法论。
- `redteam`/`quality-gate` agent=对**产出**做对抗审查；本 skill 的代码审查环节**复用**它们，不另造。
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
>
> 范围默认=当前改动涉及的文件；可指定路径。框架自维护时范围=被改的 hooks/scripts/memory。

**硬前置**：模式 B/C 要求工作树**干净**（每算子需干净 baseline 做逐项回退）。脏树 → 先让用户 stash/commit，或缩到「只对已暂存改动」。模式 A（纯验证）不要求干净树。

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

## 代码审查环节（复用既有，不另造）

需要对一段改动做代码审查时，**派 `quality-gate` agent（Sonnet）跑断言** 或 **`redteam` skill（Fable）对 diff 做对抗**，
而不是新建 reviewer。给 reviewer 精确上下文（BASE_SHA/HEAD_SHA + 需求），**不给会话历史**：

```bash
BASE_SHA=$(git rev-parse HEAD~1); HEAD_SHA=$(git rev-parse HEAD)
```

派发时附：DESCRIPTION（建了什么）/ PLAN_OR_REQUIREMENTS（应满足什么）/ BASE_SHA / HEAD_SHA。
反馈处理：Critical 立即修 → Important 继续前修 → Minor 记下 → reviewer 错了带理由反推。

---

## ⚠️ 末尾核心约束

1. **Iron Law 不可跳**：声明 done/通过/修好前，必须有本条消息内跑出的证据。
2. **只自动应用 HIGH 置信**清理；MEDIUM/LOW 一律交人。
3. **luca 护栏优先于算子，且按属性非按文件名**：fail-open catch / 有意 fallback / 兼容语义 / framework/ 只读 / WHY 注释 一律保护——算子说"删"，护栏说"留"时**听护栏**。**未具名但同属性者（如 `memory/scripts/*.py` 的 fail-open `except`）同等保护**，不因不在示例名单里就放行。
4. **模式 B/C 要求干净工作树**；脏树先 stash/commit 或缩范围。
5. **每个清理算子改完跑 verify**，失败逐项回退，不让级联坏下去。
6. **代码审查复用 quality-gate/redteam**，不新建 reviewer。
7. **本 skill 自身的改动也受 Iron Law 约束**——别在没跑 `verify.sh`/`check:*` 前说"接好了"。

<!-- FILE_END: code-hygiene/SKILL.md -->
