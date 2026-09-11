# pre-commit 里的 verify.sh 污染「按路径提交」的临时索引（GIT_INDEX_FILE 泄漏）

- **发现**：2026-09-11，lucagstack-63（月度演进扫描收尾）。发现时未修复（按主 session 规定只记录）；已由主 session 修复，见文末「处置」。

## 症状

用 `git commit -- <路径>`（--only）提交且不设 `FAST_COMMIT` 时，pre-commit 跑完 `scripts/verify.sh`（94/0 全绿）后提交仍然失败：

```
error: invalid object 100644 886f0189738fc4a7735add83151e0af5396c250f for 'AGENTS.md'
error: Error building trees
```

真实 `.git/index`、HEAD、工作区里的 `AGENTS.md` 都是 `51869ce…`；对象 `886f018…` 在仓库对象库里不存在；没有残留的锁文件或 next-index 文件。

## 根因（已复现）

1. git 执行 pre-commit 时，通过 `GIT_INDEX_FILE` 把本次提交用的临时索引（绝对路径）传给 hook，verify.sh 及其子进程都会继承。
2. `scripts/test-agent-context.mjs:369-393`「commit gate validates staged index」用例在临时 fixture 目录里 `git init`，随后用 `spawnSync('git', ['add', '-A'], { cwd: dir })`（:374）和 `spawnSync('git', ['add', 'AGENTS.md'], { cwd: dir })`（:383）暂存文件，**没有清掉继承来的 `GIT_*` 环境变量**。
3. 结果：索引条目写进了外层提交的临时索引，blob 却写进了 fixture 自己的对象库。:380 改写后的 `AGENTS.md` 内容在主仓对象库里不存在，建树时就报 invalid object。其余 fixture 文件内容与主仓相同，对象恰好存在，所以只有 `AGENTS.md` 报错。

## 对照复现

```bash
cp .git/index <scratch>/index-copy
GIT_INDEX_FILE=<scratch>/index-copy bash scripts/verify.sh   # 结果 94/0
GIT_INDEX_FILE=<scratch>/index-copy git ls-files -s AGENTS.md
```

副本里 `AGENTS.md` 的条目从 `51869ce…` 变为 `886f018…`，与报错是同一个对象；真实索引的内容和 mtime 都没变。

## 影响

- **已证实**：只要按路径提交（`git commit -- <paths>`，这正是共享检出规定的提交方式）并走完整 pre-commit 门，提交就会失败。目前只能靠 `FAST_COMMIT=1` 跳过，于是在规定的提交方式下，提交门实际上是空转的。
- **未证实**：普通 `git commit`（不带路径）时 git 注入的 `GIT_INDEX_FILE` 是什么形态。`scripts/test-controlled-change.mjs:41` 的注释说普通仓注入的是相对路径（那样会落在 fixture 自己的索引上，无害）；如果实际是绝对路径，则会污染共享的真实 `.git/index`。本次没有验证。

## 同类先例

`scripts/controlled-change.mjs:92-97` 与 `scripts/test-controlled-change.mjs:41-46` 已经显式清除 `GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE / GIT_OBJECT_DIRECTORY`；`test-agent-context.mjs` 这段用例没有照做。

## 建议修法（未实施）

- 该用例里每个 `spawnSync('git', …)`，以及它调用 `.githooks/commit-msg` 的三次（:381、:385、:390），都传入去掉 `GIT_*` 的 env，复用 controlled-change.mjs 的清单。
- 加一条会咬的回归：在设置了绝对路径 `GIT_INDEX_FILE` 的环境下跑 `npm run test:agent-context`，断言外层索引不变。先在未修复代码上确认它转红。

## 本次处置

`2026-09-evolution.md` 发布状态更正的那次提交用了 `FAST_COMMIT=1`。理由：同一棵树上 verify.sh 已三次 94/0（单独运行、pre-commit 内运行、索引副本对照），被跳过的只是正在触发本缺陷的那一步，不是跳过检查本身。

## 处置（2026-09-11，主 session）

- **"未证实"项已实测**：在临时仓里给 pre-commit 装探针记录环境。主检出普通提交 `GIT_INDEX_FILE=.git/index`（相对，fixture 里解析到它自己的索引，无害）；`commit -- <路径>` 为绝对路径 `.git/next-index-<pid>.lock`；`commit -a` 为绝对路径 `.git/index.lock`；链接 worktree 的普通提交与按路径提交都带绝对路径的 `GIT_DIR` 和索引。暴露面比本报告写的大：`commit -a` 与所有 worktree 提交同样中招。
- **根因复现**：在隔离克隆里给索引副本设绝对 `GIT_INDEX_FILE`，单跑 `scripts/test-agent-context.mjs`：副本从 1217 条变成 fixture 的 176 条，`AGENTS.md` 变为 `886f0189…`，该对象不在克隆对象库——与报错是同一个对象。
- **修法（没有照建议逐点补）**：`.githooks/pre-commit` 在密钥扫描之后、`exec bash scripts/verify.sh` 之前剥离位置类 `GIT_*`。扫描要读本次提交的索引，放在剥离之前；verify 查的是工作树与已跟踪文件，用不到这些变量。站点式剥离此前已补过多处（`test-controlled-change.mjs`、`test-sync-real.mjs`），再补一处只堵这一个站点，边界一行覆盖现有和以后的测试。
- **回归**：`scripts/test-pre-commit-env.mjs`（verify `G5c`）。四个场景各带对照组，先证明泄漏在这台机器的 git 上真实发生；未修代码 4 红，修后 9/0；变异 M2（保留 `GIT_DIR`）两项 worktree 场景红，M3（剥离挪到扫描之前）4 红，M5（去掉 verify）4 红，均与预测一致。
- **验证边界**：隔离克隆里跑完整门禁时，G5c 在真实钩子环境里通过，但门禁因 S34/S12 失败——Codex 按仓库路径登记 hook 授信，克隆路径没有登记，要通过需写全局 `~/.codex/config.toml`，没有做。按路径提交用的临时索引在提交失败后即删除，所以"失败后查真实索引没被写坏"不构成证据；真正的端到端证据是本修复自身在活体检出以按路径提交、完整门禁（不设 `FAST_COMMIT`）落地成功。
