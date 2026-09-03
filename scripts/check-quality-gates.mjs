#!/usr/bin/env node
import assert from 'assert/strict';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

const root = process.cwd();
const GATE_RE = /^gate_result:[ \t]*(PASS|FAIL|CONDITIONAL_PASS)(?:[ \t]+\([^\r\n)]+\))?[ \t]*$/m;
const CRITERIA_RE = /^criteria:[ \t]*$/m;
const CRITERIA_BLOCK_RE = /^criteria:[ \t]*\r?\n((?:[ \t]+-[^\r\n]*(?:\r?\n|$))+)/m;
const CRITERION_LINE_RE = /^[ \t]*-[ \t]*["']?\[(C\d+)\].*?(PASS|FAIL|UNKNOWN).*$/gm;

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const qualityGate = read('.claude/agents/quality-gate.md');
const preflight = read('.claude/agents/preflight-agent.md');
// workflow-state.yaml is a symlink to the active project's .luca/ dir; on a
// clean CI checkout it is DANGLING. Guard so a missing/dangling target degrades
// to '' (the DONE-node scan below then no-ops) instead of throwing ENOENT.
const workflowState = existsSync(join(root, '.claude/workflow-state.yaml'))
  ? read('.claude/workflow-state.yaml')
  : '';

assert.doesNotMatch(
  preflight,
  /\[ -s \.claude\/current-topic\.txt \]/,
  'preflight must not require deprecated .claude/current-topic.txt'
);
assert.match(preflight, /workflow-state\.yaml/, 'preflight should use workflow-state as state source');
assert.match(preflight, /standalone 模式允许 topic 为空/, 'preflight must allow empty topic in standalone mode');

for (const heading of ['## 产出路径', '## 产出位置', '## PRD 位置', '## 核心决策', '## 下游约束', '## 核心约束', '## 执行约束']) {
  assert.match(qualityGate, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `quality-gate should accept ${heading}`);
}
assert.match(qualityGate, /精确定位 `skill_name` 节点/, 'workflow-state check must be skill-specific');
assert.match(qualityGate, /禁止用历史 DONE 节点误判/, 'quality-gate must guard stale DONE matches');

const handoffFlag = process.argv.indexOf('--handoff');
if (handoffFlag !== -1) {
  const requested = process.argv[handoffFlag + 1];
  assert.ok(requested, '--handoff requires a file path');
  const handoffPath = isAbsolute(requested) ? resolve(requested) : resolve(root, requested);
  assert.match(handoffPath, /-handoff\.md$/, 'handoff validator only accepts *-handoff.md');
  assert.equal(existsSync(handoffPath), true, `handoff file not found: ${requested}`);
  const content = readFileSync(handoffPath, 'utf8');
  assert.match(content, GATE_RE, `${requested} missing gate_result`);
  assert.match(content, CRITERIA_RE, `${requested} missing criteria block`);
  const criteriaBlock = content.match(CRITERIA_BLOCK_RE);
  assert.ok(criteriaBlock, `${requested} criteria block must contain bullet lines`);
  const bullets = criteriaBlock[1].split(/\r?\n/).filter((line) => line.trim());
  const criteria = [...criteriaBlock[1].matchAll(CRITERION_LINE_RE)];
  assert.equal(criteria.length, bullets.length,
    `${requested} every criteria bullet must contain [C#] and PASS|FAIL|UNKNOWN`);
  assert.ok(criteria.length >= 3 && criteria.length <= 7,
    `${requested} must contain 3-7 [C#] PASS|FAIL|UNKNOWN criteria (found ${criteria.length})`);
  assert.equal(new Set(criteria.map((match) => match[1])).size, criteria.length,
    `${requested} criteria labels must be unique`);
  for (const criterion of criteria) {
    const evidence = criterion[2] === 'UNKNOWN'
      ? /(证据|原因|evidence|reason)\s*[:：]/i
      : /(证据|evidence)\s*[:：]/i;
    assert.match(criterion[0], evidence,
      `${requested} ${criterion[2]} criterion missing evidence/reason: ${criterion[0].trim()}`);
  }
  assert.match(content, /^## .*?(决策|Decisions?|Key Findings|Executive Summary)/mi, `${requested} missing decision heading`);
  assert.match(content, /^## .*?(约束|Constraints?)/mi, `${requested} missing constraint heading`);
  assert.match(content, /^## .*?(风险|Risks?)/mi, `${requested} missing risk heading`);
  assert.match(content, /^## .*?(路径|位置|Outputs?)/mi, `${requested} missing output/path heading`);
  console.log(`PASS handoff artifact contract: ${requested}`);
  process.exit(0);
}

const handoffDir = join(root, 'docs', 'handoff');
if (existsSync(handoffDir)) {
  const pendingPath = join(handoffDir, 'pending-extraction.md');
  assert.equal(existsSync(pendingPath), false, 'pending-extraction must not live under docs/handoff');

  // E1/E2（2026-07-09 final-plan）：新 handoff 须带 criteria 逐条判定块（评估主绑定点，
  // 格式见 handoff-protocol.md v3.2，方法论见 skill-os/eval-methodology.md）。
  // WARN 起步（fail-open），稳定运行 ≥5 份新 handoff 后再升 assert；存量按文件名日期豁免。
  const CRITERIA_SINCE = '2026-07-09';
  const handoffs = readdirSync(handoffDir)
    .filter(name => /-handoff\.md$/.test(name))
    .slice(0, 20);
  for (const name of handoffs) {
    const content = readFileSync(join(handoffDir, name), 'utf8');
    const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})-/);
    // gate_result：新 handoff（>=CRITERIA_SINCE 或无日期前缀）硬断言；存量按文件名日期豁免为 WARN，
    // 与下方 criteria 块同一"存量按日期豁免"口径对齐。docs/ 是共享软链，pre-commit 时可能指向任一活跃
    // 项目，原无条件硬断言会因某跨链项目（如 todo-capsule）的存量 handoff 缺字段而非确定性硬崩
    // （flaky，2026-07-09 定位：muse 自身 8 份 handoff 全合规，崩的是软链临时指到的别的项目）。
    if (!dateMatch || dateMatch[1] >= CRITERIA_SINCE) {
      assert.match(content, GATE_RE, `${name} missing gate_result`);
    } else if (!GATE_RE.test(content)) {
      console.warn(`WARN ${name}: legacy handoff missing gate_result (pre-${CRITERIA_SINCE}, grandfathered)`);
    }
    if (dateMatch && dateMatch[1] >= CRITERIA_SINCE) {
      const hasCriteriaBlock = CRITERIA_RE.test(content);
      const hasCriterionLine = [...content.matchAll(CRITERION_LINE_RE)].length > 0;
      if (!hasCriteriaBlock || !hasCriterionLine) {
        console.warn(`WARN ${name}: new handoff (>=${CRITERIA_SINCE}) missing criteria block (handoff-protocol v3.2)`);
      }
    }
    if (!/^## .*?(路径|位置|Output)/m.test(content)) {
      console.warn(`WARN ${name}: legacy handoff missing explicit output/path heading`);
    }
    if (!/^## .*?(决策|约束|风险|Key Findings|Executive Summary)/m.test(content)) {
      console.warn(`WARN ${name}: legacy handoff missing decision/constraint/risk heading`);
    }
  }
}

const doneNodeBlocks = [...workflowState.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:|\nlast_updated:|\z)/gm)];
for (const [, skillName, block] of doneNodeBlocks) {
  if (!/status:\s*DONE/.test(block)) continue;
  for (const field of ['output', 'handoff_path']) {
    const match = block.match(new RegExp(`${field}:\\s*"([^"]+)"`));
    if (match?.[1] && !existsSync(join(root, match[1]))) {
      console.warn(`WARN workflow-state ${skillName}.${field} points to missing path: ${match[1]}`);
    }
  }
}

console.log('PASS quality gate contracts');
