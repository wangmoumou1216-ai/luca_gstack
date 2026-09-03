#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const scratch = mkdtempSync(join(tmpdir(), 'luca-handoff-validator-'));
const run = (file) => spawnSync('node', ['scripts/check-quality-gates.mjs', '--handoff', file], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

try {
  const valid = join(scratch, '2026-09-03-valid-deepresearch-handoff.md');
  writeFileSync(valid, `# Handoff\ngate_result: CONDITIONAL_PASS\ncriteria:\n  - "[C1] 报告存在 → PASS（证据: report.md）"\n  - "[C2] 来源已交叉验证 → PASS（证据: sources.md）"\n  - "[C3] 待复测项已显式保留 → UNKNOWN（原因: 等待外部环境）"\n\n## 核心决策\n- 保留待复测项\n\n## 核心约束\n- 无\n\n## 风险\n- 外部环境尚不可用\n\n## 产出路径\n- report.md\n`);
  assert.equal(run(valid).status, 0, 'valid handoff must pass');

  const missingGate = join(scratch, '2026-09-03-missing-gate-deepresearch-handoff.md');
  writeFileSync(missingGate, `# Handoff\ncriteria:\n  - "[C1] 报告存在 → PASS（证据: report.md）"\n  - "[C2] 来源存在 → PASS（证据: sources.md）"\n  - "[C3] 风险已记录 → PASS（证据: 风险章节）"\n\n## 核心决策\n- 无\n\n## 核心约束\n- 无\n\n## 风险\n- 无\n\n## 产出路径\n- report.md\n`);
  const gateResult = run(missingGate);
  assert.notEqual(gateResult.status, 0, 'missing gate_result must fail');
  assert.match(gateResult.stderr, /missing gate_result/);

  const missingCriteria = join(scratch, '2026-09-03-missing-criteria-deepresearch-handoff.md');
  writeFileSync(missingCriteria, `# Handoff\ngate_result: PASS\n\n## 核心约束\n- 无\n\n## 产出路径\n- report.md\n`);
  const criteriaResult = run(missingCriteria);
  assert.notEqual(criteriaResult.status, 0, 'missing criteria must fail');
  assert.match(criteriaResult.stderr, /missing criteria block/);

  const tooFew = join(scratch, '2026-09-03-too-few-deepresearch-handoff.md');
  writeFileSync(tooFew, `# Handoff\ngate_result: PASS\ncriteria:\n  - "[C1] 报告存在 → PASS（证据: report.md）"\n\n## 核心决策\n- 无\n\n## 核心约束\n- 无\n\n## 风险\n- 无\n\n## 产出路径\n- report.md\n`);
  const tooFewResult = run(tooFew);
  assert.notEqual(tooFewResult.status, 0, 'fewer than three criteria must fail');
  assert.match(tooFewResult.stderr, /must contain 3-7/);

  const missingEvidence = join(scratch, '2026-09-03-missing-evidence-deepresearch-handoff.md');
  writeFileSync(missingEvidence, `# Handoff\ngate_result: PASS\ncriteria:\n  - "[C1] 报告存在 → PASS（证据: report.md）"\n  - "[C2] 来源存在 → PASS"\n  - "[C3] 风险已记录 → PASS（证据: 风险章节）"\n\n## 核心决策\n- 无\n\n## 核心约束\n- 无\n\n## 风险\n- 无\n\n## 产出路径\n- report.md\n`);
  const evidenceResult = run(missingEvidence);
  assert.notEqual(evidenceResult.status, 0, 'criterion without evidence or reason must fail');
  assert.match(evidenceResult.stderr, /criterion missing evidence\/reason/);

  const missingOutput = join(scratch, '2026-09-03-missing-output-deepresearch-handoff.md');
  writeFileSync(missingOutput, `# Handoff\ngate_result: PASS\ncriteria:\n  - "[C1] 报告存在 → PASS（证据: report.md）"\n  - "[C2] 来源存在 → PASS（证据: sources.md）"\n  - "[C3] 风险已记录 → PASS（证据: 风险章节）"\n\n## 核心决策\n- 无\n\n## 核心约束\n- 无\n\n## 风险\n- 无\n`);
  const outputResult = run(missingOutput);
  assert.notEqual(outputResult.status, 0, 'missing output/path heading must fail');
  assert.match(outputResult.stderr, /missing output\/path heading/);

  const missingDecision = join(scratch, '2026-09-03-missing-decision-deepresearch-handoff.md');
  writeFileSync(missingDecision, `# Handoff\ngate_result: PASS\ncriteria:\n  - "[C1] 报告存在 → PASS（证据: report.md）"\n  - "[C2] 来源存在 → PASS（证据: sources.md）"\n  - "[C3] 风险已记录 → PASS（证据: 风险章节）"\n\n## 核心约束\n- 无\n\n## 风险\n- 无\n\n## 产出路径\n- report.md\n`);
  const decisionResult = run(missingDecision);
  assert.notEqual(decisionResult.status, 0, 'missing decision heading must fail');
  assert.match(decisionResult.stderr, /missing decision heading/);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log('PASS handoff validator positive and negative fixtures');
