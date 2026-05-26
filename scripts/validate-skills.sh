#!/bin/bash
# validate-skills.sh — 检查所有 skill 目录是否有 SKILL.md

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.claude/skills/office"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "⚠️  skills/office 目录不存在，跳过检查。"
  exit 0
fi

FAIL=0

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  [ "$skill_name" = "references" ] && continue
  skill_file="$skill_dir/SKILL.md"

  if [ ! -f "$skill_file" ]; then
    echo "✗ $skill_name: 缺少 SKILL.md"
    FAIL=$((FAIL + 1))
  elif [ ! -s "$skill_file" ]; then
    echo "⚠ $skill_name: SKILL.md 为空"
    FAIL=$((FAIL + 1))
  else
    size=$(wc -c < "$skill_file")
    if [ "$size" -lt 100 ]; then
      echo "⚠ $skill_name: SKILL.md 过短 (${size} bytes)"
    else
      # 检查 FILE_END 标记
      if ! grep -q '<!-- FILE_END' "$skill_file"; then
        echo "  ⚠ $skill_name: 缺少 <!-- FILE_END --> 标记"
      fi

      # 检查 handoff 协议声明
      if ! grep -qi 'handoff' "$skill_file"; then
        echo "  ⚠ $skill_name: SKILL.md 未声明 handoff 协议"
      fi

      # 检查最小 Phase 结构（至少有一个 ## 标题）
      phase_count=$(grep -c '^## ' "$skill_file" 2>/dev/null | tr -d '[:space:]' || echo 0)
      if [ "$phase_count" -lt 1 ]; then
        echo "  ✗ $skill_name: SKILL.md 无 ## Phase 结构（疑似 stub）"
        FAIL=$((FAIL + 1))
      fi

      echo "✓ $skill_name: OK"
    fi
  fi
done

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "❌ $FAIL 个 skill 检查失败。"
  exit 1
else
  echo ""
  echo "✅ 所有 skill 检查通过。"
  exit 0
fi
