#!/usr/bin/env bash
# 单真值源 behind tripwire（2026-07-16 B2）：本检出落后其本地 tracking ref → exit 1（verify 以 warn 呈现）。
# 此检查零网络、零写；刷新必须由调用者按 git-closeout-policy 显式 fetch remote+ref。
u=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || exit 0
behind=$(git rev-list --count "HEAD..$u" 2>/dev/null || echo 0)
if [ "$behind" -gt 0 ]; then
  echo "本检出落后本地 tracking ref $u $behind 条；如需刷新先显式只读 fetch remote+ref，整合前按 git-closeout-policy 通过人门"
  exit 1
fi
exit 0
