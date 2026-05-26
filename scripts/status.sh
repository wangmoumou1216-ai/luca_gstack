#!/usr/bin/env bash
# status.sh — Skill OS 当前工作流状态快照
# 用法: bash scripts/status.sh
set -euo pipefail

echo "════════════════════════════════════════"
echo "  Skill OS 状态快照  $(date '+%Y-%m-%d %H:%M')"
echo "════════════════════════════════════════"
echo ""

# 1. 当前项目链接
DOCS_TARGET=$(readlink docs 2>/dev/null || true)
STATE_TARGET=$(readlink .claude/workflow-state.yaml 2>/dev/null || true)
TOPIC_TARGET=$(readlink .claude/current-topic.txt 2>/dev/null || true)
if [ -n "$DOCS_TARGET" ]; then
  CURRENT_PROJECT=$(basename "$(dirname "$DOCS_TARGET")")
  echo "📁 Project: $CURRENT_PROJECT"
  echo "   docs -> $DOCS_TARGET"
  echo "   state -> ${STATE_TARGET:-(未设置)}"
else
  echo "📁 Project: (未设置)"
fi
echo ""

# 2. Workflow state
WF_STATE=".claude/workflow-state.yaml"
if [ -f "$WF_STATE" ]; then
  echo "── Workflow State ──────────────────────"
  python3 - "$WF_STATE" <<'PYEOF'
import sys, yaml

with open(sys.argv[1]) as f:
    state = yaml.safe_load(f)

scene = state.get("scene", "?")
topic = state.get("topic", "?")
print(f"  Scene: {scene or '(未设置)'}   Topic: {topic or '(未设置)'}")
print()

nodes = state.get("nodes", {})
if nodes:
    icons = {"DONE": "✅", "IN_PROGRESS": "🔄", "PENDING": "⏳", "BLOCKED": "🚫"}
    for name, info in nodes.items():
        status = info.get("status", "UNKNOWN")
        icon = icons.get(status, "❓")
        print(f"  {icon}  {name:<22} {status}")
else:
    print("  (无节点记录)")
PYEOF
  echo ""
else
  echo "── Workflow State: 无 (.claude/workflow-state.yaml 不存在) ──"
  echo ""
fi

# 3. PROGRESS.md 摘要
PROGRESS="docs/PROGRESS.md"
if [ -f "$PROGRESS" ]; then
  echo "── PROGRESS.md (前12行) ────────────────"
  head -12 "$PROGRESS" | sed 's/^/  /'
  echo ""
fi

# 4. 最新 handoff 文件（最近5个）
echo "── 最新 Handoff ────────────────────────"
HANDOFFS=$(ls -t docs/handoff/*.md 2>/dev/null | head -5 || true)
if [ -n "$HANDOFFS" ]; then
  while IFS= read -r f; do
    BASENAME=$(basename "$f")
    GATE=$(grep -oE "gate_result[^[:space:]]*[[:space:]]*[^[:space:]]+" "$f" 2>/dev/null | head -1 || echo "gate_result: ?")
    echo "  $BASENAME"
    echo "    └─ $GATE"
  done <<< "$HANDOFFS"
else
  echo "  (暂无 handoff 文件)"
fi
echo ""

# 5. 下一步推荐
echo "── 建议下一步 ──────────────────────────"
if [ -f "$WF_STATE" ]; then
  python3 - "$WF_STATE" <<'PYEOF'
import sys, yaml

with open(sys.argv[1]) as f:
    state = yaml.safe_load(f)

nodes = state.get("nodes", {})
in_prog = [n for n, i in nodes.items() if i.get("status") == "IN_PROGRESS"]
pending  = [n for n, i in nodes.items() if i.get("status") == "PENDING"]
blocked  = [n for n, i in nodes.items() if i.get("status") == "BLOCKED"]

if blocked:
    print(f"  🚫 有阻塞节点：{blocked[0]} — 需要先解除阻塞")
elif in_prog:
    print(f"  ▶  继续执行：/{in_prog[0]}")
elif pending:
    print(f"  ▶  下一步：/{pending[0]}")
else:
    print("  ✅ 所有节点已完成")
    print("  ▶  输入 /office 开始新任务")
PYEOF
else
  echo "  ▶  输入 /office 选择 skill 开始"
fi
echo ""
echo "════════════════════════════════════════"
