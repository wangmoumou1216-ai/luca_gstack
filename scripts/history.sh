#!/usr/bin/env bash
# history.sh — 列出某 skill 的历史产出版本
# 用法: bash scripts/history.sh <skill-name>
set -euo pipefail

SKILL="${1:-}"
if [ -z "$SKILL" ]; then
  echo "用法: bash scripts/history.sh <skill-name>"
  echo "示例: bash scripts/history.sh brainstorm"
  echo ""
  echo "支持的 skill: brainstorm, deepresearch, ux-research, ux-brainstorm,"
  echo "              design-brief, html-prototype, tech-spec, task-plan,"
  echo "              ux-audit, figma-demo, figma-layer, magicpath"
  exit 1
fi

echo "════════════════════════════════════════"
echo "  历史版本: $SKILL"
echo "════════════════════════════════════════"
echo ""

# 1. Handoff 文件（所有 skill 通用）
HANDOFFS=$(ls -t docs/handoff/*-"${SKILL}"-handoff.md 2>/dev/null || true)
if [ -n "$HANDOFFS" ]; then
  echo "── Handoff 文件 ────────────────────────"
  while IFS= read -r f; do
    DATE=$(basename "$f" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
    GATE=$(grep -oE "gate_result[^[:space:]]*[[:space:]]*[^[:space:]]+" "$f" 2>/dev/null | head -1 || echo "gate:?")
    LINES=$(wc -l < "$f")
    echo "  $DATE  $(basename "$f")  [$GATE]  (${LINES}行)"
  done <<< "$HANDOFFS"
  echo ""
fi

# 2. Skill 主产出文件
case "$SKILL" in
  brainstorm|prd)
    FILES=$(ls -t docs/prd/*.md 2>/dev/null || true)
    LABEL="PRD 文件"
    ;;
  deepresearch)
    FILES=$(ls -t docs/research/deepresearch-*.md 2>/dev/null || true)
    LABEL="研究报告"
    ;;
  ux-research)
    FILES=$(ls -t docs/research/*ux-research*.md 2>/dev/null || true)
    LABEL="UX 研究报告"
    ;;
  ux-brainstorm)
    FILES=$(ls -t docs/decisions/*ux-brainstorm*.md 2>/dev/null || true)
    LABEL="UX 方案文档"
    ;;
  design-brief)
    FILES=$(ls -t docs/decisions/*design-brief*.md 2>/dev/null || true)
    LABEL="设计文档"
    ;;
  html-prototype)
    FILES=$(find docs/prototype -name "index.html" 2>/dev/null | sort -r || true)
    LABEL="HTML 原型"
    ;;
  tech-spec)
    FILES=$(ls -t docs/engineering/*tech-spec*.md 2>/dev/null || true)
    LABEL="技术规格"
    ;;
  task-plan)
    FILES=$(ls -t docs/engineering/*task-plan*.md 2>/dev/null || true)
    LABEL="任务计划"
    ;;
  ux-audit)
    FILES=$(ls -t docs/evaluation/*ux-audit*.md 2>/dev/null || true)
    LABEL="UX 评审报告"
    ;;
  *)
    FILES=""
    LABEL="产出文件"
    ;;
esac

if [ -n "$FILES" ]; then
  echo "── $LABEL ──────────────────────────────"
  while IFS= read -r f; do
    LINES=$(wc -l < "$f" 2>/dev/null || echo "?")
    MTIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$f" 2>/dev/null || stat -c "%y" "$f" 2>/dev/null | cut -c1-16 || echo "?")
    echo "  [$MTIME]  $f  (${LINES}行)"
  done <<< "$FILES"
  echo ""
fi

# 3. Eval 记录（如果有）
EVAL_LOG="memory/evals/eval-log.jsonl"
if [ -f "$EVAL_LOG" ]; then
  EVAL_COUNT=$(grep -c "\"skill_name\": \"${SKILL}\"" "$EVAL_LOG" 2>/dev/null || echo 0)
  if [ "$EVAL_COUNT" -gt 0 ]; then
    echo "── Eval 记录（最近5条，共${EVAL_COUNT}条）────────"
    grep "\"skill_name\": \"${SKILL}\"" "$EVAL_LOG" | tail -5 | python3 -c "
import sys, json
for line in sys.stdin:
    r = json.loads(line.strip())
    score = r.get('quality_gate_score')
    score_str = f'{score}/10' if score is not None else '?/10'
    adopted = r.get('user_adopted', 'unknown')
    print(f\"  {r['session_date']}  {r['quality_gate_status']:<18} score:{score_str}  adopted:{adopted}  topic:{r['topic']}\")
"
    echo ""
  fi
fi

if [ -z "$HANDOFFS" ] && [ -z "$FILES" ]; then
  echo "  (未找到 $SKILL 的任何历史产出)"
fi

echo "════════════════════════════════════════"
