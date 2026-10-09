#!/usr/bin/env node
// Binding validation only. A caller-authored record is not evidence of consent.
// The controlling agent must verify actual user approval under Plan's human gate.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const args = process.argv.slice(2);
const values = new Map();
const effects = [];
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (flag === '--effect') {
    const value = args[++i];
    assert.ok(value && !value.startsWith('--'), '--effect requires a non-empty value');
    effects.push(value);
  } else if (['--plan', '--approval', '--plan-id', '--scope'].includes(flag)) {
    assert.ok(!values.has(flag), `duplicate ${flag}`);
    const value = args[++i];
    assert.ok(value && !value.startsWith('--'), `${flag} requires a value`);
    values.set(flag, value);
  } else {
    throw new Error(`unknown argument: ${flag}`);
  }
}
for (const flag of ['--plan', '--approval', '--plan-id', '--scope']) assert.ok(values.has(flag), `${flag} is required`);
assert.ok(effects.length > 0, '--effect is required at least once');
const rawPlanPath = values.get('--plan');
const rawApprovalPath = values.get('--approval');
assert.ok(isAbsolute(rawPlanPath) && isAbsolute(rawApprovalPath), 'plan and approval paths must be absolute');
const planPath = resolve(rawPlanPath);
const approvalPath = resolve(rawApprovalPath);
assert.ok(existsSync(planPath), `plan not found: ${planPath}`);
assert.ok(existsSync(approvalPath), `approval not found: ${approvalPath}`);
assert.ok(lstatSync(planPath).isFile() && !lstatSync(planPath).isSymbolicLink(), 'plan must be a canonical regular file');
assert.ok(lstatSync(approvalPath).isFile() && !lstatSync(approvalPath).isSymbolicLink(), 'approval must be a canonical regular file');
const planRealpath = realpathSync(planPath);
const approval = JSON.parse(readFileSync(approvalPath, 'utf8'));
assert.ok(approval && typeof approval === 'object' && !Array.isArray(approval), 'approval must be a JSON object');
assert.equal(approval.approved, true, 'approval.approved must be true');
assert.equal(approval.plan_id, values.get('--plan-id'), 'approval plan_id does not match the requested plan');
assert.ok(typeof approval.plan_path === 'string' && isAbsolute(approval.plan_path), 'approval plan_path must be absolute');
assert.equal(resolve(approval.plan_path), planPath, 'approval plan_path does not match the exact plan path');
const sha = createHash('sha256').update(readFileSync(planPath)).digest('hex');
assert.equal(approval.plan_sha256, sha, 'approval plan_sha256 does not match plan bytes');
assert.equal(approval.scope, values.get('--scope'), 'approval scope does not match the requested scope');
assert.ok(Array.isArray(approval.effects) && approval.effects.length > 0, 'approval.effects must be non-empty');
assert.equal(new Set(approval.effects).size, approval.effects.length, 'approval.effects must not contain duplicates');
for (const effect of effects) assert.ok(approval.effects.includes(effect), `approval does not cover effect: ${effect}`);
assert.ok(approval.effects.every(effect => typeof effect === 'string' && effect.trim()), 'approval.effects must contain non-empty strings');
const confirmedAt = Date.parse(approval.confirmed_at);
assert.ok(typeof approval.confirmed_at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(approval.confirmed_at)
  && Number.isFinite(confirmedAt) && new Date(confirmedAt).toISOString() === approval.confirmed_at.replace(/(?<=:\d{2})Z$/, '.000Z'), 'approval.confirmed_at must be a valid UTC ISO timestamp');
assert.ok(confirmedAt <= Date.now(), 'approval.confirmed_at must not be in the future');
assert.equal(approval.confirmed_by, 'user', 'approval.confirmed_by must declare user; this label does not authenticate a user');
console.log(JSON.stringify({
  status: 'BINDING_VALID',
  authorization: 'NOT_VERIFIED',
  required_evidence: 'actual scope-matched user confirmation, verified by the controlling agent; unattended dispatch requires a trusted approval adapter',
  plan_id: approval.plan_id,
  plan_path: planRealpath,
  plan_sha256: sha,
  scope: approval.scope,
  effects: [...approval.effects],
  confirmed_at: approval.confirmed_at,
}));
