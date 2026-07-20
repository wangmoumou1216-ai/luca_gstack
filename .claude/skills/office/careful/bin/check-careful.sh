#!/usr/bin/env bash
set -euo pipefail

# Claude hook compatibility is intentionally conservative: read whatever the
# runtime sends on stdin and block obvious destructive command patterns.
payload="$(cat 2>/dev/null || true)"

if printf '%s' "$payload" | grep -Eiq '(rm[[:space:]]+-[a-zA-Z]*[rf][a-zA-Z]*[rf]|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+push[^[:cntrl:]]*(--force|[[:space:]]-f([^a-zA-Z-]|$))|DROP[[:space:]]+TABLE|kubectl[[:space:]]+delete)'; then
  # 兑现 SKILL.md「警告并等待确认、允许用户覆盖」承诺：不再硬 exit 2 死锁，改用原生 PreToolUse
  # permissionDecision:"ask" 弹确认框——用户可放行(覆盖)，也把字符串字面量误杀降为多点一次确认。
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Careful：命令匹配到潜在破坏性模式（rm -rf / git reset --hard / git push --force / DROP TABLE / kubectl delete）。确认目标无误后再放行。"}}
EOF
  exit 0
fi

exit 0
