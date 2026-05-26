#!/usr/bin/env bash
set -euo pipefail

# Claude hook compatibility is intentionally conservative: read whatever the
# runtime sends on stdin and block obvious destructive command patterns.
payload="$(cat 2>/dev/null || true)"

if printf '%s' "$payload" | grep -Eiq '(rm[[:space:]]+-rf|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+push[^[:cntrl:]]*--force|DROP[[:space:]]+TABLE|kubectl[[:space:]]+delete)'; then
  cat >&2 <<'EOF'
Careful blocked a potentially destructive command.
Confirm the exact target and rerun only if this operation is intentional.
EOF
  exit 2
fi

exit 0
