#!/bin/bash
# verify.sh — luca_gstack 框架健康检查（NO_PIN，不扫描共享项目别名）
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
echo "  luca_gstack 框架健康检查（NO_PIN）"
echo "═══════════════════════════════════════"
echo ""

echo "[ Git 基础设施 ]"
check G1 "Git 仓库已初始化" "git rev-parse --is-inside-work-tree >/dev/null 2>&1"
check G2 "hooks 路径配置正确" "git config --get core.hooksPath | grep -q '\.githooks'"
check G3 ".gitignore 覆盖 .DS_Store" "grep -q '\.DS_Store' .gitignore"
check G4 ".gitignore 覆盖 .env" "grep -q '\.env' .gitignore"
check G5 "pre-commit 存在且可执行" "[ -x .githooks/pre-commit ]"
check G5b "commit-msg 验值 hook 存在且可执行（claude5-unhobble C6）" "[ -x .githooks/commit-msg ]"
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
check C9 "双 root K1-K10 / pointer / Static Fallback / discovery 门" "npm run check:agent-context --silent"
check C10 "agent-context mutation proof-it-bites" "npm run test:agent-context --silent"
check C10b "A/B evaluator counterexamples / successful read / EOF" "npm run test:agent-context-ab-evaluator --silent"
check C11 "Claude hooks 运行时副作用测试通过" "npm run check:hooks --silent"
check C12 "settings.json 有 PreToolUse hook（会话级项目隔离）" "grep -q 'PreToolUse' .claude/settings.json"
check C13 "project-scope-guard.mjs 语法合法" "node --check .claude/hooks/project-scope-guard.mjs"
check C14 "会话级项目隔离回归通过（重定向/deny/跨session/fail-open）" "npm run test:project-scope --silent"
check C15 "session-end.mjs 语法合法"   "node --check .claude/hooks/session-end.mjs"
check C16 "self-model 与磁盘一致（audit F4-05）" "npm run check:self-model --silent"
check C17 "workflow-state 写入块坏 yaml 时拒写（不擦除既有状态）" "python3 scripts/test-workflow-state-guard.py"
check C18 "redteam 判据挂载表完整且引用路径全部存在" "python3 scripts/test-redteam-mount-table.py"
check C19 "场景覆盖表结构自洽（SSOT对账+豁免声明双确认+三不规则形态）" "python3 scripts/check-skill-scene-coverage.py --selftest"
check C20 "项目绑定事务回归通过（CAS/lease/replay/new/legacy migration）" "npm run test:project-transaction --silent"
echo ""

echo "[ Skill 体系 ]"
check S1 "CLAUDE.md 存在且非空"                    "[ -s CLAUDE.md ]"
# 项目状态/别名健康须在已验证会话范围单独检查；框架 verify 不推断激活项目。
check S3 "skill-os 目录存在"                       "[ -d .claude/skill-os ]"
warn  S4 "office skill 目录存在"                   "[ -d .claude/skills/office ]"
check S5 "validate-skills.sh 通过"                 "bash scripts/validate-skills.sh"
check S6 "auto/SKILL.md 存在且含 FILE_END 标记"    "grep -q 'FILE_END' .claude/skills/office/auto/SKILL.md"
# S7 删除：原为 grep 'replace.*\s' 同义反复（只证源里有正则形子串，非真测归一化）。
# 真正的归一化行为覆盖在 S9（npm run test:routes 的 golden tests）。
check S8 "work-agent-template 含 DONE_CRITERIA 守卫" "grep -q '前置守卫' .claude/agents/work-agent-template.md"
check S9 "route golden tests 通过"                 "npm run test:routes --silent"
check S20 "甲类路由命中率 keyword 层回归门（明细: python3 memory/scripts/eval_routing.py --keyword-only）" "python3 memory/scripts/eval_routing.py --keyword-only"
check S10 "routing map 覆盖 + skill 单一真相源一致性检查通过" "npm run check:routing-map --silent"
check S19 "治理轨道登记面同步（REG-1/2/3）"        "npm run check:registration --silent"
check S11 "project routing dry-run 通过"           "npm run check:project-routing --silent"
check S12 "memory 精细检索/写入门禁测试通过"       "npm run test:memory --silent"
check S13 "memory stable facts 健康检查通过"       "npm run check:memory-health --silent"
check S14 "quality gate 框架合同检查通过（NO_PIN）" "node scripts/check-quality-gates.mjs --framework"
check S14b "quality gate 作用域隔离/精确 handoff/已验证项目扫描会咬" "node scripts/test-quality-gates-scope.mjs"
check S14c "退休设计入口拒绝且通用路径保留（真实 guard mutation）" "npm run test:design-tool-retirement --silent"
check S14d "设计交接导入/授权/读回回归与真实 guard mutation" "npm run test:design-flow-handoff --silent"
check S14e "退役设计约束不从活动规则/记忆回流（含恢复旧数据反证）" "npm run test:design-context-retirement --silent"
check S15 "coding discipline 合同检查通过"        "npm run check:coding-discipline --silent"
check S17 "muse-loop 共享面锚点一致（模式/防slop/DECISION/shared-ref）" "npm run check:muse-loop-sync --silent"
check S18 "能力锚点自检（capability anchors，防误删关键小节）"  "node scripts/check-capability-parity.mjs"
check S40 "跨 harness 语义 projection proof-it-bites（delegation/obligation/order）" "npm run test:semantic-parity --silent"
check S41 "controlled-change schema/controller/guard 全量回归" "npm run test:controlled-change --silent"
check S42 "六项集成冻结 source manifest tuple 可复现" "node scripts/validate-skill-integration-receipt.mjs --source-manifest"
check S43 "engineering-delivery 七项 owner/trigger/loader/flow 回归" "npm run test:engineering-delivery --silent"
check S44 "六项集成终态 receipt 与三路同 SHA 评审闭合" "npm run check:skill-integration-receipt --silent"
check S46 "wait-what 中文化/显式调用/零副作用契约" "npm run test:wait-what --silent"
check S47 "handoff 生成时 gate_result/criteria/标题契约会咬" "npm run test:handoff-validator --silent"
check S48 "writing-for-agents 来源/边界/路由/双 harness 契约" "npm run test:writing-for-agents --silent"
check S49 "双 harness 条件加载 canary（相关命中、无关不加载）" "npm run test:agent-context-resolution --silent"
# S45 对**发布提交的不可变 blob** 求证，而不是工作树：CANDIDATE-MANIFEST 是发布记录，
# 断言工作树等于它会把这 81 个 runtime 文件（含 route-guard.mjs / codex-hook-adapter.mjs /
# verify.sh / CLAUDE.md）永久冻结——任何一次合法修改都让本检查变红，且无被支持的变更路径。
# 新口径下：manifest 篡改、denominator 漂移、锚点填错仍各自转红（四条变异实测），
# 而发布之后的合法修改只以 INFO 行报告，不再误判。
check S45 "六项集成 runtime candidate manifest denominator/blob 闭合（对发布提交求证）" "node scripts/candidate-manifest.mjs --verify-at framework-audit/2026-08-30-mattpocock-six-skills-integration/CANDIDATE-MANIFEST.tsv"
check S31 "旧 mega-appendix 已退出 runtime context" "node scripts/check-appendix-pointers.mjs"
check S32 "CONTEXT.md 红线门（节内 ≥6 条+三 id+D1/D2 内容断言，C2；locale 无关定界）" "awk '/^## 红线/{f=1;next} /^## /{f=0} f' CONTEXT.md | { c=\$(cat); echo \"\$c\" | grep -c '^[0-9]\.' | grep -qE '^[6-9]|^[0-9]{2}' && echo \"\$c\" | grep -q 'SF-002' && echo \"\$c\" | grep -q 'SC-20260523-002' && echo \"\$c\" | grep -q 'SC-20260523-003' && echo \"\$c\" | grep -q 'Surgical' && ! echo \"\$c\" | grep -q '见上「激活条件」'; }"
check S33 "model-routing 单真值源 + 双 root 薄指针" "node scripts/check-model-table.mjs"
# VERIFY_CODEX_CLAUDE_REGRESSION_COVERED=1：S34 内部的「S10 Claude 路径零回归」会再 spawn 一遍
# test-harness + test-hooks，而本文件的 C11/S30 已各跑一次——同一轮内纯重复，实测约 5.5 秒。
# 单独跑 verify-codex-wiring.mjs 时不设该变量，覆盖面照旧。
check S34 "Codex 接线静态自检（--static 跳过活体探针；此前为孤儿脚本无人调用）" "VERIFY_CODEX_CLAUDE_REGRESSION_COVERED=1 node scripts/verify-codex-wiring.mjs --static"
check S35 "observability 写入并发与崩溃恢复回归" "npm run test:observability --silent"
check S36 "quality-gate verdict 与 recorder 权限分离回归" "npm run test:gate-verdict --silent"
check S37 "CI 阻断覆盖与稳定 gatherer 合同" "npm run check:ci-contract --silent"
check S38 "CI 合同 proof-it-bites（缺关键门必须失败）" "npm run test:ci-contract --silent"
check S39 "Framework HTML 历史债务基线 proof-it-bites" "npm run test:framework-html-baseline --silent"
check S21 "演进裁决核心回归（default-deny/权重分档/redteam兜底）" "npm run check:evolution-adjudication --silent"
check S22 "Agent 编排契约回归（OD-first/状态枚举/双重身份/路径映射）" "npm run check:agent-contracts --silent"
# S24：lint:yaml 的能力早已写好（package.json 覆盖 7 个 skill-os yaml），但从无自动调用者——
# model-routing / self-model / gaps-register / sources-registry 四个真值源因此零 YAML 语法门
# （CI 的 validate-yaml 只覆盖其中 2 个）。2026-06-28 体检 HC-21/HC-25 已两次点名，此处接线。
check S24 "skill-os YAML 语法合法（含外部技能 pin/vetting registry）" "npm run lint:yaml --silent"
check S25 "luca-open --url shim 回归（协议守卫/唯一路径/文件模式不回归）" "npm run check:luca-open --silent"
check S26 "记忆根解析跨语言 parity + 裂脑判别器（JS↔py 同 {path,mode}；FAIL-SAFE）" "npm run check:memroot --silent"
check S30 "harness 检测 + Codex 存活性 registry（强制动词安全默认 + 全 skill 定档自洽）" "npm run check:harness --silent"
check S29 "独立 root parity（K1-K10/预算/指针/harness 差异）" "npm run check:agents-parity --silent"
check S28 "项目身份单一裁决（4 marker 站点 canonical 一致 + JS↔py parity；嵌套/override）" "npm run check:substrate --silent"
# S27（深审 R1）：standalone opt-in 绝不能进版本控制——写进 committed settings.json 会让每个
# checkout（含 master 改名/fork 配错）把 auth-absent 从 ANOMALY 静默降 NOTE，defeats FAIL-SAFE。
# marker 侧已由 .gitignore 覆盖；此门把"勿写 committed settings.json"的注释护栏升级为确定性 CI 门。
check S27 "MEMORY_STANDALONE 未泄漏进 tracked settings.json（opt-in 防泄漏门）" "! git ls-files -z '.claude/settings*.json' | xargs -0 -r grep -l MEMORY_STANDALONE | grep -q ."
warn  S23 "单真值源同步（不落后 tracking 分支）" "bash scripts/check-behind-upstream.sh"
echo ""

echo "[ CI/CD 基础设施 ]"
check I1 "CI workflow 存在" "[ -f .github/workflows/ci.yml ]"
check I2 "PR 模板存在" "[ -f .github/PULL_REQUEST_TEMPLATE.md ]"
check I3 "bug_report 模板存在" "[ -f .github/ISSUE_TEMPLATE/bug_report.md ]"
echo ""

echo "[ Framework HTML 只读参考资产 ]"
check F1 "list-page.html 存在" "[ -f framework/list-page.html ]"
check F2 "detail-page-2col.html 存在" "[ -f framework/detail-page-2col.html ]"
check F3 "home-page.html 存在" "[ -f framework/home-page.html ]"
check F4 "detail-page-3col.html 存在" "[ -f framework/detail-page-3col.html ]"
check F5 "form-page.html 存在" "[ -f framework/form-page.html ]"
check F6 "shared-head.html 历史共享资产保留" "[ -f framework/shared-head.html ]"
check B1 "CLAUDE.md 与 AGENTS.md 各 ≤ 11KiB" "[ \$(wc -c < CLAUDE.md) -le 11264 ] && [ \$(wc -c < AGENTS.md) -le 11264 ]"
check B2 "无 office SKILL.md 超 45KB（context-budget 回归守护）" "! find .claude/skills/office -name SKILL.md -size +45k | grep -q ."
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
