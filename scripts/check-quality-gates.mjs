#!/usr/bin/env node
import assert from 'assert/strict';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

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

const handoffDir = join(root, 'docs', 'handoff');
if (existsSync(handoffDir)) {
  const pendingPath = join(handoffDir, 'pending-extraction.md');
  assert.equal(existsSync(pendingPath), false, 'pending-extraction must not live under docs/handoff');

  const handoffs = readdirSync(handoffDir)
    .filter(name => /-handoff\.md$/.test(name))
    .slice(0, 20);
  for (const name of handoffs) {
    const content = readFileSync(join(handoffDir, name), 'utf8');
    assert.match(content, /gate_result:\s*(PASS|FAIL|CONDITIONAL_PASS)/, `${name} missing gate_result`);
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
