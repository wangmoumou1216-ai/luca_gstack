#!/bin/bash
# Project mutations are identity transactions. switch/new require the exact
# tx + expected epoch minted for this session's SWITCH_ONLY turn.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="${LUCA_GSTACK_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PIN="$SCRIPT_DIR/project-pin.mjs"
cmd="${1:-}"

case "$cmd" in
  switch|new)
    name="${2:-}"
    shift 2 || true
    session_id=""
    tx=""
    expected_epoch=""
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --session-id) session_id="${2:-}"; shift 2 ;;
        --tx) tx="${2:-}"; shift 2 ;;
        --expected-epoch) expected_epoch="${2:-}"; shift 2 ;;
        *) echo "❌ 未知参数: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$name" ] || [ -z "$session_id" ] || [ -z "$tx" ] || [ -z "$expected_epoch" ]; then
      echo "❌ $cmd 必须携带 --session-id、--tx、--expected-epoch（先由 UserPromptSubmit/ project-pin prepare 创建 SWITCH_ONLY）" >&2
      exit 1
    fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" "$cmd" --target "$name" --session-id "$session_id" --tx "$tx" --expected-epoch "$expected_epoch"
    ;;
  list)
    projects_root="${LUCA_PROJECTS_ROOT:-$HOME/Desktop/项目}"
    echo "项目列表（${projects_root}）："
    find "$projects_root" -mindepth 1 -maxdepth 1 -type d ! -name '.*' -exec basename {} \; | sort | sed 's/^/  ○ /'
    ;;
  status)
    session_id="${2:-${LUCA_SESSION_ID:-}}"
    if [ -z "$session_id" ]; then echo "❌ status 需要 session id" >&2; exit 1; fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" status --session "$session_id"
    ;;
  deactivate)
    session_id="${2:-${LUCA_SESSION_ID:-}}"
    if [ -z "$session_id" ]; then echo "❌ deactivate 需要 session id" >&2; exit 1; fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" deactivate --session "$session_id"
    ;;
  *)
    echo "用法:"
    echo "  project.sh <switch|new> <name> --session-id <sid> --tx <tx> --expected-epoch <epoch>"
    echo "  project.sh list"
    echo "  project.sh status <session-id>"
    echo "  project.sh deactivate <session-id>"
    ;;
esac
