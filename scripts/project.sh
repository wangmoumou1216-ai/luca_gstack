#!/bin/bash
# Project mutations are identity transactions. Agents call the public
# switch/new form; PreToolUse authenticates the native event and injects the
# internal session/tx/epoch tuple before this script executes.
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
      echo "❌ $cmd 必须携带 --session-id、--tx、--expected-epoch（由 UserPromptSubmit 排队、PreToolUse 原生事件认证后创建 SWITCH_ONLY）" >&2
      exit 1
    fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" "$cmd" --target "$name" --session-id "$session_id" --tx "$tx" --expected-epoch "$expected_epoch"
    ;;
  list)
    if [ "${2:-}" = "--view" ] && [ "${3:-}" = "host" ]; then
      LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" list --view host
      exit $?
    fi
    if [ "$#" -ne 1 ]; then echo "❌ list 仅接受 --view host" >&2; exit 1; fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" list
    ;;
  status)
    shift
    session_id="${LUCA_SESSION_ID:-}"
    view=""
    operation=""
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --session-id|--session) session_id="${2:-}"; shift 2 ;;
        --view) view="${2:-}"; shift 2 ;;
        --operation) operation="${2:-}"; shift 2 ;;
        *) if [ -z "$session_id" ]; then session_id="$1"; shift; else echo "❌ 未知参数: $1" >&2; exit 1; fi ;;
      esac
    done
    if [ -z "$session_id" ]; then echo "❌ status 需要 session id" >&2; exit 1; fi
    args=(status --session-id "$session_id")
    if [ -n "$view" ]; then args+=(--view "$view"); fi
    if [ -n "$operation" ]; then args+=(--operation "$operation"); fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" "${args[@]}"
    ;;
  deactivate|recover-session)
    session_id="${2:-${LUCA_SESSION_ID:-}}"
    if [ -z "$session_id" ]; then echo "❌ $cmd 需要 session id" >&2; exit 1; fi
    LUCA_GSTACK_ROOT="$PROJECT_ROOT" node "$PIN" "$cmd" --session "$session_id"
    ;;
  *)
    echo "用法:"
    echo "  project.sh <switch|new> <name>  # public form; hook injects internal identity arguments"
    echo "  project.sh list [--view host]"
    echo "  project.sh status <session-id> | status --view host --session-id <sid> [--operation <id>]"
    echo "  project.sh deactivate <session-id>"
    echo "  project.sh recover-session <session-id>  # 仅撤销已被原生新用户轮次取代的旧权限"
    echo "  活跃本会话解绑：用户单独发送『解除本会话项目绑定，恢复 NO_PIN』；仅由原生事件 hook 认证并落账"
    exit 1
    ;;
esac
