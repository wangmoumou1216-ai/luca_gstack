#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'plan-identity-'));
const plan = join(dir, 'plan.md');
const identityPath = join(dir, 'identity.json');
const planLink = join(dir, 'plan-link.md');
const planId = 'plan-test-identity-001';
const scope = 'NO_PIN framework-audit only';
const sourceIdentity = 'source:framework-audit-plan-v1';
writeFileSync(plan, '# Exact plan\n\nplan_id: plan-test-identity-001\n');
const sha = () => createHash('sha256').update(readFileSync(plan)).digest('hex');
const valid = () => ({ plan_id: planId, plan_path: plan, plan_sha256: sha(), scope, source_identity: sourceIdentity });
function run(payload) { writeFileSync(identityPath, JSON.stringify(payload)); return spawnSync(process.execPath, ['scripts/check-plan-identity.mjs', '--plan', plan, '--identity', identityPath, '--plan-id', planId, '--scope', scope, '--source-identity', sourceIdentity], { cwd: root, encoding: 'utf8' }); }
function pass(payload) { const result = run(payload); assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /\"status\":\"PASS\"/); }
function fail(payload, pattern) { const result = run(payload); assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, pattern); }
try {
  pass(valid());
  fail({ ...valid(), plan_sha256: '0'.repeat(64) }, /plan_sha256/);
  fail({ ...valid(), plan_path: join(dir, 'other-plan.md') }, /ENOENT|plan_path/);
  fail({ ...valid(), source_identity: 'source:other' }, /source_identity/);
  fail({ ...valid(), scope: 'other scope' }, /scope/);
  symlinkSync(plan, planLink);
  const linked = spawnSync(process.execPath, ['scripts/check-plan-identity.mjs', '--plan', planLink, '--identity', identityPath, '--plan-id', planId, '--scope', scope, '--source-identity', sourceIdentity], { cwd: root, encoding: 'utf8' });
  assert.equal(linked.status, 1);
  assert.match(linked.stderr, /canonical regular file/);
  console.log('PASS plan identity: exact path, SHA, scope and source identity recovery guards');
} finally { rmSync(dir, { recursive: true, force: true }); }
