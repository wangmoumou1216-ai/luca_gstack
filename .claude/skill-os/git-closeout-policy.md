# Git Closeout Policy（唯一真值源）

本文件统一 luca_gstack 的本地提交、dirty/WIP 隔离与远端发布纪律。`CLAUDE.md`、`AGENTS.md`、
纠错协议和 sync 只保留指针，不复制另一套规则。机械 descriptor/receipt 由
`scripts/git-closeout.mjs` 生成和复验。

## 1. 授权边界

- 已获批准的计划内实现可以按该计划的 exact blob/hunk ownership 直接完成本地 commit；不为同一
  local closeout 再开一次 Plan 或请求重复授权。
- `git fetch <explicit-remote> <explicit-ref>` 与 `git ls-remote` 是只读刷新，可以自动执行。
- `pull`、`rebase`、冲突裁决、历史改写、stash、reset/clean 与任何 force 操作都不是例行 closeout；
  必须先冻结 exact target、影响面和 rollback，再由新的顶层用户门授权。不得把“继续”或旧批准解释为许可。
- push 永远由 `G-REMOTE` 保护。没有有效的 exact descriptor + fresh top-level approval 时，只能停在
  `VERIFIED_LOCAL_NOT_PUBLISHED`，不得把本地 PASS 冒充发布完成。

## 2. Dirty/WIP 与本地 exact commit

1. 先冻结 HEAD、index tree、worktree dirty tuple 和 owner evidence。路径相同不等于 hunk 归属相同。
2. 计划变更必须以 exact patch bytes 为载体；local descriptor 绑定 base commit/tree、patch SHA、
   expected index tree，以及每个 path 的 old/new blob。
3. 从 base tree 在隔离 index 计算 descriptor；不得用当前 worktree 整文件反推计划 patch。
4. 真实 index 只能应用已冻结 patch（例如 `git apply --cached <approved.patch>`），随后必须运行
   local checker。禁止 `git add .`、目录级 stage，亦不得对含未知 WIP 的文件使用整文件 `git add`。
5. checker 要求真实 index 与 descriptor 的 tree/path/blob/patch 全部 exact；额外 staged path、同文件
   未授权 hunk、base/patch drift 一律返回 `BLOCKED_DIRTY_OVERLAP`，且不得自动 stash、reset 或覆盖 WIP。
6. commit 后按 commit/tree/exact file set 读回。本地回滚只允许新 revert commit，不改写历史。

## 3. Exact remote descriptor

- remote name 与完整 refspec 都必须显式给出；不存在 `origin` 默认值，也不得从“唯一 remote”猜测。
- proposal 必须绑定 push URL、source ref、destination ref、live before SHA、local after SHA、
  `before..after` 的有序 exact commit range、`force=false`、生成时间与 expiry。
- before 必须是 after 的祖先。non-fast-forward、remote/ref/URL 漂移、commit range 漂移、过期或 replay
  都使 descriptor 失效；必须重新 fetch/read-back 并生成新 proposal。
- `G-REMOTE` 只授权其 exact descriptor。执行面只可使用 descriptor 的 remote/refspec，绝不 force。
- push 后从 remote 重新读取 destination ref；remote receipt 必须绑定 descriptor SHA、before/after、
  exact range、URL/refspec 与 read-back。checker 重新查询 live remote 后才可判 PASS。
- 远端补偿也必须形成新的 descriptor 和新的顶层批准；不得用 force 猜修。

## 4. 工具边界

- `scripts/git-closeout.mjs` 可以准备/验证 local descriptor，并准备/验证 remote descriptor 和 post-push
  read-back receipt；它本身不得执行 push、pull、rebase、stash、reset、clean 或 history rewrite。
- `.githooks/pre-push` 必须 fail-closed 验证 descriptor、push argv/stdin 与尚未过期的 `G-REMOTE`
  proposal/binding；缺失、漂移或 replay 均拒绝。hook 只决定放行，不替用户执行 push。
- `scripts/sync.sh` 只做 memory/evolution readiness inspection，不 stage、commit、pull 或 push。
- 人类门的 proposal/binding/result 继续使用现有 `human-gate-contract`；Git descriptor 是
  `G-REMOTE` payload，不替代 fresh top-level user authority。

<!-- FILE_END: skill-os/git-closeout-policy.md -->
