#!/usr/bin/env bash
# scripts/sync.sh — luca_gstack 记忆/演进状态：本地 → GitHub（单机模型）
#
# 正常使用会写这些 git-tracked 的状态文件，与 GitHub 逐渐漂移。这条命令把它们
# 一次性同步回 GitHub。只暂存自变更的状态文件，不碰手写文档（CLAUDE/CONTEXT/CHANGELOG），
# 避免把半成品扫进去。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git pull --rebase --autostash origin main
[ -f scripts/build-self-model.mjs ] && node scripts/build-self-model.mjs || true

git add -- \
  memory/episodic/index.jsonl \
  memory/episodic/archive \
  memory/semantic/promoted-facts.yaml \
  memory/semantic/archive \
  memory/evals/eval-log.jsonl \
  .claude/skill-os/evolution \
  .claude/observability/observations.jsonl 2>/dev/null || true

if git diff --cached --quiet; then
  echo "✅ 记忆/演进状态无变化，无需同步。"
  exit 0
fi

FAST_COMMIT=1 git commit -m "chore(memory): sync $(date +%F) 记忆/演进状态"
git push origin main
echo "✅ 已同步到 GitHub。"
