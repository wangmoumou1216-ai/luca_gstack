#!/usr/bin/env bash
# 单真值源 behind tripwire（2026-07-16 B2）：本检出落后其 tracking 分支 → exit 1（verify 以 warn 呈现）。
# 有网时 fetch 刷新（离线静默容错）；无 tracking 分支（脱离态/新分支）→ 跳过不报。
u=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || exit 0
git fetch -q --no-tags "${u%%/*}" 2>/dev/null || true
behind=$(git rev-list --count "HEAD..$u" 2>/dev/null || echo 0)
if [ "$behind" -gt 0 ]; then
  echo "本检出落后 $u $behind 条，请 git pull（单真值源纪律）"
  exit 1
fi
exit 0
