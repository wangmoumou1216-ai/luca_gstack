#!/usr/bin/env bash
# sync-upstream.sh · 把母版 luca_gstack 的升级合并进 muse fork
#   在 fork 根运行：./sync-upstream.sh [母版分支]
#   母版 = upstream 远程(GitHub wangmoumou1216-ai/luca_gstack，2026-07-06 从本地路径切到云端)；muse 改动在 muse 分支。
#   继承机制：git merge upstream/<分支>。母版没改过的文件干净合入(=直接引用)，
#   只有 muse 改过的文件才可能冲突（在 fork 内解决，绝不回污母版）。
set -uo pipefail
cd "$(dirname "$0")"

BRANCH="${1:-feat/memory-3way-taxonomy}"        # 默认=GitHub 默认分支(upstream/HEAD)；注意它落后 main ~24 条，要全量升级请显式传 main
export GIT_LFS_SKIP_SMUDGE=1                     # 母版配了 lfs 但无实际文件 → 跳过防挂

CUR="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CUR" != "muse" ]; then
  echo "⚠ 当前不在 muse 分支（在 $CUR）。先 git checkout muse 再同步。"; exit 1
fi

echo "▶ fetch upstream（母版）…"
git fetch upstream || { echo "✗ fetch 失败（检查 upstream 远程指向母版）"; exit 1; }

BEFORE="$(git rev-parse --short HEAD)"
echo "▶ merge upstream/$BRANCH → muse…"
if git merge --no-edit "upstream/$BRANCH"; then
  AFTER="$(git rev-parse --short HEAD)"
  if [ "$BEFORE" = "$AFTER" ]; then echo "✅ 已是最新，母版无新升级。"; else echo "✅ 已继承母版升级（无冲突）：$BEFORE → $AFTER"; fi
else
  echo "⚠ 有冲突，需手动解决以下文件（解决后 git add + git commit；或放弃 git merge --abort）："
  git diff --name-only --diff-filter=U | sed 's/^/    /'
  exit 2
fi
