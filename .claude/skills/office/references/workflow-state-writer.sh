#!/bin/bash
# 用法：source workflow-state-writer.sh && write_state NODE STATUS OUTPUT
# 示例：write_state "brainstorm" "DONE" "docs/brainstorm/2025-01-01-foo-brainstorm.md"

write_state() {
  local NODE=$1
  local STATUS=$2
  local OUTPUT=$3
  local STATE_FILE=".claude/workflow-state.yaml"
  
  if [ ! -f "$STATE_FILE" ]; then
    echo "workflow-state.yaml 不存在，跳过写入"
    return
  fi
  
  python3 - << PYEOF 2>/dev/null || echo "workflow-state 写入跳过（python3 不可用）"
import yaml, datetime, sys

try:
    with open("$STATE_FILE", "r") as f:
        state = yaml.safe_load(f) or {}
except:
    state = {}

state.setdefault("nodes", {}).setdefault("$NODE", {})
state["nodes"]["$NODE"]["status"] = "$STATUS"
state["nodes"]["$NODE"]["output"] = "$OUTPUT"
state["nodes"]["$NODE"]["completed_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
state["last_updated"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

with open("$STATE_FILE", "w") as f:
    yaml.dump(state, f, allow_unicode=True, default_flow_style=False)
print("workflow-state 已更新: $NODE → $STATUS")
PYEOF
}

set_topic() {
  local TOPIC=$1
  local SCENE=$2
  local STATE_FILE=".claude/workflow-state.yaml"
  
  # 同时写 current-topic.txt
  echo "$TOPIC" > .claude/current-topic.txt
  
  python3 - << PYEOF 2>/dev/null || true
import yaml, datetime

try:
    with open("$STATE_FILE", "r") as f:
        state = yaml.safe_load(f) or {}
except:
    state = {}

state["topic"] = "$TOPIC"
state["scene"] = "$SCENE"
state["last_updated"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

with open("$STATE_FILE", "w") as f:
    yaml.dump(state, f, allow_unicode=True, default_flow_style=False)
PYEOF
}
