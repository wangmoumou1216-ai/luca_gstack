#!/usr/bin/env bash
# scripts/sync.sh — read-only memory/evolution readiness inspection.
# Remote publication is governed elsewhere and is intentionally unavailable here.
set -euo pipefail

if [ "$#" -ne 0 ]; then
  echo "ERROR: sync is inspection-only and accepts no path/remote arguments" >&2
  exit 2
fi
if [ "${FAST_COMMIT:-0}" = "1" ]; then
  echo "ERROR: FAST_COMMIT is forbidden for memory sync inspection" >&2
  exit 2
fi
if [ -n "${SYNC_REMOTE:-}" ] || [ -n "${SYNC_REFSPEC:-}" ] || [ -n "${SYNC_PUSH:-}" ]; then
  echo "ERROR: remote/refspec/push inputs are not accepted by sync inspection" >&2
  exit 2
fi

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
export PYTHONDONTWRITEBYTECODE=1

index_before=$(git diff --cached --binary --full-index --no-ext-diff | shasum -a 256 | awk '{print $1}')
worktree_before=$(git status --porcelain=v1 -z | shasum -a 256 | awk '{print $1}')

python3 memory/scripts/promotion_provenance.py --worktree
python3 memory/scripts/check_memory_health.py

index_after=$(git diff --cached --binary --full-index --no-ext-diff | shasum -a 256 | awk '{print $1}')
worktree_after=$(git status --porcelain=v1 -z | shasum -a 256 | awk '{print $1}')
if [ "$index_before" != "$index_after" ] || [ "$worktree_before" != "$worktree_after" ]; then
  echo "ERROR: repository state changed during read-only sync inspection" >&2
  exit 1
fi

git status --short
echo "MEMORY_SYNC_INSPECTION_PASS"
