#!/usr/bin/env bash
# Read-only candidate enumerator adapted from the legacy systematic-debugging polluter finder.
# It deliberately does not run tests in the source worktree. Execute candidates one at a time only in an
# explicitly authorized task-owned scratch overlay, checking the named pollution path between runs.

set -euo pipefail

if [[ $# -ne 3 ]]; then
  printf 'Usage: %s <repo-realpath> <pollution-relative-path> <test-name-pattern>\n' "$0" >&2
  printf 'Example: %s /private/tmp/task-overlay .git "*.test.ts"\n' "$0" >&2
  exit 64
fi

repo="$1"
pollution="$2"
pattern="$3"

if [[ "$repo" != /* || ! -d "$repo" || -L "$repo" ]]; then
  printf 'find-polluter: repo must be an existing non-symlink absolute directory\n' >&2
  exit 64
fi

repo_real="$(cd "$repo" && pwd -P)"
if [[ "$repo_real" != /private/tmp/* && "$repo_real" != /tmp/* ]]; then
  printf 'find-polluter: refusing to enumerate against a non-temp worktree; create a task-owned scratch overlay first\n' >&2
  exit 64
fi

case "$pollution" in
  ''|/*|.|..|./*|../*|*/../*|*/./*)
    printf 'find-polluter: pollution path must be a normalized repo-relative path\n' >&2
    exit 64
    ;;
esac

if [[ -e "$repo_real/$pollution" || -L "$repo_real/$pollution" ]]; then
  printf 'find-polluter: pollution already exists before candidate execution: %s\n' "$pollution" >&2
  exit 3
fi

printf 'MODE\tREAD_ONLY_CANDIDATE_INVENTORY\n'
printf 'OVERLAY\t%s\n' "$repo_real"
printf 'POLLUTION\t%s\n' "$pollution"
find "$repo_real" -type f -name "$pattern" -print | LC_ALL=C sort | while IFS= read -r path; do
  printf 'CANDIDATE\t%s\n' "${path#"$repo_real"/}"
done
