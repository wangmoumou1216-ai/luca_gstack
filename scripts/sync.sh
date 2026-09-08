#!/usr/bin/env bash
# scripts/sync.sh — luca_gstack 记忆/演进状态：本地 → GitHub（单机模型）
#
# 正常使用会写这些 git-tracked 的状态文件，与 GitHub 逐渐漂移。这条命令把它们
# 一次性同步回 GitHub。只暂存自变更的状态文件，不碰手写文档（CLAUDE/CONTEXT/CHANGELOG），
# 避免把半成品扫进去。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# A preexisting index is the user's transaction, including partially staged state files.
# Refuse before pull/build/add rather than absorbing or resetting those bytes.
if ! git diff --cached --quiet; then
  echo "❌ 已有暂存改动；请先完成该提交，再同步记忆。现有 index 保持不变。" >&2
  exit 2
fi

tracking_ref="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)" || {
  echo "❌ 当前分支没有 tracking upstream；请先显式设置 upstream，再重跑同步。" >&2
  exit 2
}
if [[ "$tracking_ref" != */* ]]; then
  echo "❌ 无法从 tracking upstream 解析 remote/branch：$tracking_ref" >&2
  exit 2
fi
tracking_remote="${tracking_ref%%/*}"
tracking_branch="${tracking_ref#*/}"

git pull --rebase --autostash "$tracking_remote" "$tracking_branch"
[ -f scripts/build-self-model.mjs ] && node scripts/build-self-model.mjs || true

# 逐条暂存：git add 对多路径是原子的——只要有一条路径不存在(如新克隆缺 eval-log)，
# 整条命令 exit 128 且「一个都不暂存」，配合 || true 会伪装成「无变化」而漏同步。
# 分路径 add，缺失的只跳过自己，不连累其它脏文件。
for p in \
  memory/episodic/index.jsonl \
  memory/episodic/archive \
  memory/semantic/promoted-facts.yaml \
  memory/semantic/reviews.jsonl \
  memory/semantic/archive \
  memory/evals/eval-log.jsonl \
  memory/retrieval-log.jsonl \
  .claude/skill-os/evolution \
  .claude/observability/observations.jsonl; do
  [ -e "$p" ] && git add -- "$p" 2>/dev/null || true
done

if git diff --cached --quiet; then
  echo "记忆/演进状态无新改动；继续同步已有提交（含上次失败的推送）。"
else
  FAST_COMMIT=1 git commit -m "chore(memory): sync $(date +%F) 记忆/演进状态"
fi

git push "$tracking_remote" "HEAD:refs/heads/$tracking_branch"
echo "✅ 已同步到 GitHub。"
