#!/bin/bash
# verify.sh — luca_gstack 项目健康检查
# 用法: bash scripts/verify.sh
# 退出码: 0 = 全部通过, 1 = 有 FAIL

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0
WARN=0

check() {
  local id="$1"
  local desc="$2"
  shift 2
  if eval "$@" > /dev/null 2>&1; then
    echo "  ✓ $id: $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $id: $desc"
    FAIL=$((FAIL + 1))
  fi
}

warn() {
  local id="$1"
  local desc="$2"
  shift 2
  if eval "$@" > /dev/null 2>&1; then
    echo "  ✓ $id: $desc"
    PASS=$((PASS + 1))
  else
    echo "  ⚠ $id: $desc (non-blocking)"
    WARN=$((WARN + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════"
echo "  luca_gstack 项目健康检查"
echo "═══════════════════════════════════════"
echo ""

echo "[ Git 基础设施 ]"
check G1 "Git 仓库已初始化" "git rev-parse --is-inside-work-tree >/dev/null 2>&1"
check G2 "hooks 路径配置正确" "git config --get core.hooksPath | grep -q '\.githooks'"
check G3 ".gitignore 覆盖 .DS_Store" "grep -q '\.DS_Store' .gitignore"
check G4 ".gitignore 覆盖 .env" "grep -q '\.env' .gitignore"
check G5 "pre-commit 存在且可执行" "[ -x .githooks/pre-commit ]"
echo ""

echo "[ 标准文档 ]"
check D1 "README.md 存在" "[ -f README.md ]"
check D2 "CHANGELOG.md 存在" "[ -f CHANGELOG.md ]"
check D3 "SECURITY.md 存在" "[ -f SECURITY.md ]"
check D4 "CONTRIBUTING.md 存在" "[ -f CONTRIBUTING.md ]"
check D5 "LICENSE 存在" "[ -f LICENSE ]"
echo ""

echo "[ Claude Code 配置 ]"
check C1 "settings.json 有 SessionStart hook"      "grep -q 'SessionStart'    .claude/settings.json"
check C2 "settings.json 有 UserPromptSubmit hook"  "grep -q 'UserPromptSubmit' .claude/settings.json"
check C3 "settings.json 有 PostToolUse hook"       "grep -q 'PostToolUse'     .claude/settings.json"
check C4 "settings.json 有 Stop hook"              "grep -q '\"Stop\"'        .claude/settings.json"
check C5 "session-restore.mjs 语法合法"  "node --check .claude/hooks/session-restore.mjs"
check C6 "route-guard.mjs 语法合法"      "node --check .claude/hooks/route-guard.mjs"
check C7 "post-edit.mjs 语法合法"        "node --check .claude/hooks/post-edit.mjs"
check C8 "session-sync.mjs 语法合法"     "node --check .claude/hooks/session-sync.mjs"
check C9 "CLAUDE.md 含 Skill 调用规则"  "grep -q 'Skill 调用规则' CLAUDE.md"
check C10 "CLAUDE.md 含 /auto 入口"     "grep -q '/auto' CLAUDE.md"
check C11 "Claude hooks 运行时副作用测试通过" "npm run check:hooks --silent"
echo ""

echo "[ Skill 体系 ]"
check S1 "CLAUDE.md 存在且非空"                    "[ -s CLAUDE.md ]"
check S2 "workflow-state.yaml 存在或处于已取消激活态"  "[ -f .claude/workflow-state.yaml ] || { [ ! -L .claude/workflow-state.yaml ] && [ ! -e docs ] && [ ! -L docs ] && [ ! -e .claude/current-topic.txt ] && [ ! -L .claude/current-topic.txt ]; }"
check S3 "skill-os 目录存在"                       "[ -d .claude/skill-os ]"
warn  S4 "office skill 目录存在"                   "[ -d .claude/skills/office ]"
check S5 "validate-skills.sh 通过"                 "bash scripts/validate-skills.sh"
check S6 "auto/SKILL.md 存在且含 FILE_END 标记"    "grep -q 'FILE_END' .claude/skills/office/auto/SKILL.md"
check S7 "route-guard.mjs 含空格归一化逻辑"        "grep -q 'replace.*\\\\s' .claude/hooks/route-guard.mjs"
check S8 "work-agent-template 含 DONE_CRITERIA 守卫" "grep -q '前置守卫' .claude/agents/work-agent-template.md"
check S9 "route golden tests 通过"                 "npm run test:routes --silent"
check S10 "routing map 覆盖 + skill 单一真相源一致性检查通过" "npm run check:routing-map --silent"
check S11 "project routing dry-run 通过"           "npm run check:project-routing --silent"
check S12 "memory 精细检索/写入门禁测试通过"       "npm run test:memory --silent"
check S13 "memory stable facts 健康检查通过"       "npm run check:memory-health --silent"
check S14 "quality gate 合同检查通过"             "npm run check:quality-gates --silent"
check S15 "coding discipline 合同检查通过"        "npm run check:coding-discipline --silent"
check S16 "项目 docs/state symlink 一致"          "npm run check:project-links --silent"
echo ""

echo "[ CI/CD 基础设施 ]"
check I1 "CI workflow 存在" "[ -f .github/workflows/ci.yml ]"
check I2 "PR 模板存在" "[ -f .github/PULL_REQUEST_TEMPLATE.md ]"
check I3 "bug_report 模板存在" "[ -f .github/ISSUE_TEMPLATE/bug_report.md ]"
warn  I4 "ADR 目录有记录" "ls docs/adr/*.md 2>/dev/null | head -1 | grep -q '.'"
echo ""

echo "[ Framework HTML 母版 ]"
check F1 "list-page.html 存在" "[ -f framework/list-page.html ]"
check F2 "detail-page-2col.html 存在" "[ -f framework/detail-page-2col.html ]"
check F3 "home-page.html 存在" "[ -f framework/home-page.html ]"
check F4 "detail-page-3col.html 存在" "[ -f framework/detail-page-3col.html ]"
check F5 "form-page.html 存在" "[ -f framework/form-page.html ]"
echo ""

echo "═══════════════════════════════════════"
echo "  结果: PASS=$PASS  FAIL=$FAIL  WARN=$WARN"
echo "═══════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "❌ 检查未通过，请修复上述 ✗ 项目。"
  exit 1
else
  echo "✅ 所有关键检查通过。"
  exit 0
fi
