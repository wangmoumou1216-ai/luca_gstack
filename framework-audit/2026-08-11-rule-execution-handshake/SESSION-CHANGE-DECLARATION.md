# Session Change Declaration — luca_gstack rule-execution repair

> 给并行修改 `luca_gstack` 的另一个 session。请先读完本文，再处理 rebase、merge 或冲突。

## 1. 最短结论

- 本 session 的修复已经通过 PR [#8](https://github.com/wangmoumou1216-ai/luca_gstack/pull/8)
  合并到远端 `upstream/main`。
- 合并提交：`0b5202e5051fb0a81c80095e7b2ec15be3ac1dfa`。
- 修复分支最终提交：`df63d4e1390d6da4a689c1be84121e84b55b6003`。
- 如果你的分支起点早于 `0b5202e`，请先 rebase/merge 最新 `upstream/main`；不要把下列文件整文件覆盖。
- 真正的冲突高风险区是项目识别、路由、session pin、项目作用域拦截、切换事务与相关测试。
- `framework/` HTML 母版没有被本 session 修改。

先执行：

```bash
git fetch upstream main
git merge-base --is-ancestor 0b5202e5051fb0a81c80095e7b2ec15be3ac1dfa HEAD \
  || echo "当前分支尚未包含本 session 的 main 合并结果"
```

## 2. 提交边界与归属

| Commit | 归属 | 内容 |
|---|---|---|
| `789b1b8` | 本 session 开始前已在本地 `main` | corrected mattpocock cycle2 审计包；PR #8 将它随历史一并带到远端 `main`，但它不是本 session 新写的修复 |
| `4ef6bd6` | 本 session | 冻结 rule-execution 修复计划、红队与执行握手材料 |
| `47929a7` | 本 session | 区分 framework/meta 与下游 project scope，修复 route-guard 路由 |
| `a864d54` | 本 session | schema-v2 项目状态、事务化切换、锁/lease、作用域防护、Claude/Codex 接线与回归测试 |
| `df63d4e` | 本 session | 修复远端 Markdown CI：`CHANGELOG.md` 的行首 `+` 被误判为列表符 |
| `0b5202e` | GitHub merge commit | PR #8 合并到 `main` 的最终边界 |

本 session 相对起点 `789b1b8` 的净变更是 **43 个路径**。核对真值请使用：

```bash
git diff --name-status \
  789b1b800649de47a79096c72f40c03a54529303..df63d4e1390d6da4a689c1be84121e84b55b6003
```

## 3. 高风险重叠文件：不要整文件覆盖

### 3.1 项目身份、事务与锁

- `.claude/hooks/lib/project-substrate.mjs`
- `.claude/hooks/lib/git-env.mjs`（新增）
- `scripts/project-lease.mjs`（新增）
- `scripts/project-pin.mjs`（新增）
- `scripts/project.sh`
- `scripts/check-project-links.mjs`

这些文件共同定义同一套不可拆开的行为：

1. session 项目状态使用 schema v2；状态包括 `NO_PIN`、`SWITCH_ONLY`、`BOUND`、
   `TURN_ACTIVE`、`TURN_CLOSED`。
2. 项目身份绑定 canonical `realpath/dev/ino/epoch`，不从共享 symlink 推导 identity。
3. `switch/new` 必须使用 route-guard 为当前 `UserPromptSubmit` 生成的完整事务参数：
   `--session-id`、`--tx`、`--expected-epoch`。
4. 禁止手写裸 `project.sh switch/new`；旧 tx、旧 epoch、重放 turn id 均 fail-closed。
5. legacy 文本 pin 的读取是纯读取；迁移与隔离只能显式调用
   `migrate-legacy-pin` / `quarantine-legacy-pin`。
6. state lock 与 project lease 不按年龄偷锁；恢复必须使用 inspect 返回的精确 handle。
7. rename 是发布/删除/释放的 commit point；commit 后清理失败只能返回 success-with-warning，
   不能诱导调用方重试已提交事务。
8. 新项目采用 no-replace 发布，不能覆盖并发竞争者已经创建的目录。
9. 从 Git hook 内启动、且目标是另一个 cwd 的 `git init/status` 必须清除 Git 的 15 个
   repository-local 环境变量；不能继承外层 `GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE`。

### 3.2 路由与项目作用域

- `.claude/hooks/route-guard.mjs`
- `.claude/hooks/project-scope-guard.mjs`
- `memory/evals/routing/fixtures.jsonl`

必须保留的行为：

1. framework/meta 审查或修复不等于下游产品项目工作，不能因为 cwd 在 muse/lucagstack 就误走
   product Project Gate。
2. 明确命名的新项目能到达 stateful `operation:new`；未命名、歧义或撞已有 identity 的情况仍保留
   human gate。
3. 无 pin 时，任何 `docs/`、workflow state、项目根直达、环境变量别名、APFS 大小写别名、
   `../..` 相对逃逸都拒绝。
4. 动态 `cd`（如 `cd "$(pwd)/../.."`、反引号、`dirname "$PWD"`）无法静态证明安全时 fail-closed。
5. 已绑定 session 只能访问自身 canonical project；跨项目路径拒绝。
6. 在 `luca_gstack` 内部的合法 round trip 不应被误伤。

### 3.3 Session 生命周期

- `.claude/hooks/session-restore.mjs`
- `.claude/hooks/session-sync.mjs`
- `.claude/hooks/session-end.mjs`

必须保留的行为：

1. NO_PIN 启动/停止链不读取共享 `docs/` 或 workflow state。
2. 只有 `TURN_ACTIVE` 的 identity + epoch snapshot 能作为项目上下文。
3. blocked Stop 不关闭 turn；真正放行的 Stop 才关闭 snapshot。
4. startup clear 与 switch 共用 lease；commit 后 release 失败保持成功语义并输出精确恢复句柄。
5. session-sync 的记忆脏状态检查不能继承外层 Git hook 的 repository-local 环境。

### 3.4 合同、接线和入口

- `AGENTS.md`
- `CLAUDE.md`
- `.claude/skill-os/claude-md-appendix.md`
- `README.md`
- `.gitignore`
- `package.json`
- `scripts/verify.sh`

合同层已经同步为：Claude 与 Codex 使用同一语义协议；仅调用语法与 harness adapter 不同。
文档里不得重新出现可直接执行的裸 `project.sh switch/new` 指示。`CLAUDE.md` 当前为
45,082B，距离 B1 上限 45,098B 只剩 16B；不要向正文继续追加规则，优先放 appendix/skill-os。

### 3.5 回归测试

- `scripts/test-route-guard.mjs`
- `scripts/test-project-scope-guard.mjs`
- `scripts/test-project-transaction.mjs`（新增）
- `scripts/test-project-identity-wiring.mjs`
- `scripts/test-hooks.mjs`
- `scripts/test-codex-adapter.mjs`

冲突解决时必须合并测试集合，不能通过删除既有断言来“解决冲突”。当前基线：

- route guard：112/112
- project scope guard：70/70
- project transaction：28/28
- Codex adapter：23/23
- repository verify：74 PASS / 0 FAIL / 1 non-blocking WARN
- GitHub CI：Markdown、YAML、Skill Definitions、Framework Logic、HTML Prototypes 全部通过

## 4. 审计与握手材料

Commit `4ef6bd6` 修改或新增以下 17 个路径。它们不是运行时代码，但记录了本次计划、红队、授权和
可追溯性；如你的 session 也写同一审计目录，请按语义合并，不要覆盖整个目录。

- `framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-EXECUTION-PLAN.md`
- `framework-audit/2026-08-09-mattpocock-handshake-cycle2/FINAL-HANDOFF.md`
- `framework-audit/2026-08-11-rule-execution-handshake/FINAL-EXECUTION-PLAN.md`
- `framework-audit/2026-08-11-rule-execution-handshake/FINAL-JUDGE-R1.md`
- `framework-audit/2026-08-11-rule-execution-handshake/FINAL-JUDGE.md`
- `framework-audit/2026-08-11-rule-execution-handshake/HANDSHAKE.md`
- `framework-audit/2026-08-11-rule-execution-handshake/REDTEAM-HANDOFF.md`
- `framework-audit/2026-08-11-rule-execution-handshake/ROUND-1-REDTEAM.md`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/G-PACKAGE-DESCRIPTOR.json`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/G-PLAN-RESULT.json`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/U-001-BASELINE.json`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/cycle2-overlap.patch`
- `framework-audit/2026-08-11-rule-execution-handshake/final-plan-manifest.json`
- `framework-audit/2026-08-11-rule-execution-handshake/g-plan-proposal.json`
- `framework-audit/2026-08-11-rule-execution-handshake/obligation-source-manifest.json`
- `framework-audit/2026-08-11-rule-execution-handshake/tools/verify-final-plan.mjs`
- `framework-audit/2026-08-11-rule-execution-handshake/tools/verify-u001-package.mjs`

## 5. CI-only 改动

`df63d4e` 只改了 `CHANGELOG.md` 一处：把续行行首 `+` 改成中文“以及”，避免 markdownlint
将其解释为另一种 unordered-list marker。语义不变。

## 6. 没有进入 main 的本 session 工作区残留

以下内容未被 commit，也未进入 PR #8 或 `main`。不要把它们误认为正式合同：

- `memory/evals/eval-log.jsonl`
- `memory/retrieval-log.jsonl`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/G-PACKAGE-RESULT.json`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/G-PLAN-DELEGATION.json`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/u002/`
- `framework-audit/2026-08-11-rule-execution-handshake/execution/u003/`
- `framework-audit/2026-08-11-rule-execution-handshake/tools/verify-u002-containment.mjs`

这些残留只存在于本 session 的隔离 worktree；本 session 没有复制、清理或覆盖另一个 session 的
canonical worktree WIP。

## 7. 给另一个 session 的合并协议

1. **先对齐基线**：fetch `upstream/main`，确认包含 `0b5202e`。
2. **先列重叠再合并**：

   ```bash
   git diff --name-only 0b5202e5051fb0a81c80095e7b2ec15be3ac1dfa...HEAD
   ```

   将输出与本文第 3 节比较。
3. **禁止 ours/theirs 整包覆盖高风险文件**：对 route、substrate、scope、session hooks、project scripts
   逐块 three-way merge。
4. **测试取并集**：对同一行为若双方有测试，保留双方断言；若设计冲突，先说明不变量再裁决实现。
5. **不要重新引入旧路径**：不得恢复裸 switch/new、共享 symlink identity、读时隐式迁移、按年龄偷锁、
   post-commit 假失败或 no-pin 共享项目读取。
6. **最小验收**：

   ```bash
   node scripts/test-route-guard.mjs
   node scripts/test-project-scope-guard.mjs
   node scripts/test-project-transaction.mjs
   npm run check:hooks
   node scripts/test-codex-adapter.mjs
   npm run verify
   ```

7. **提交前核对**：`git diff --check`、精确暂存、pre-commit，不要把并行 session 的 memory/audit WIP
   混入提交。

## 8. 冲突裁决优先级

发生重叠时按以下顺序判断，不按“谁最后写”判断：

1. 用户最新明确意图与安全约束。
2. `0b5202e` 中已经通过的项目隔离、事务原子性与 replay/lock 不变量。
3. 双方新增需求的价值与第一性原理判断。
4. 能同时满足时做兼容合并；不能同时满足时保留失败测试并显式升级裁决，禁止静默覆盖。

本文只声明本 session 已进入 `main` 的事实与合并边界，不声明另一个 session 的改动无效。
