#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const args = process.argv.slice(2);
const values = new Map();
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (!['--plan', '--identity', '--plan-id', '--scope', '--source-identity'].includes(flag)) throw new Error(`unknown argument: ${flag}`);
  assert.ok(!values.has(flag), `duplicate ${flag}`);
  const value = args[++i];
  assert.ok(value && !value.startsWith('--'), `${flag} requires a value`);
  values.set(flag, value);
}
for (const flag of ['--plan', '--identity', '--plan-id', '--scope', '--source-identity']) assert.ok(values.has(flag), `${flag} is required`);
const rawPlanPath = values.get('--plan');
const rawIdentityPath = values.get('--identity');
assert.ok(isAbsolute(rawPlanPath) && isAbsolute(rawIdentityPath), 'plan and identity paths must be absolute');
const planPath = resolve(rawPlanPath);
const identityPath = resolve(rawIdentityPath);
assert.ok(existsSync(planPath), `plan not found: ${planPath}`);
assert.ok(existsSync(identityPath), `identity not found: ${identityPath}`);
assert.ok(lstatSync(planPath).isFile() && !lstatSync(planPath).isSymbolicLink(), 'plan must be a canonical regular file');
assert.ok(lstatSync(identityPath).isFile() && !lstatSync(identityPath).isSymbolicLink(), 'identity must be a canonical regular file');
const planRealpath = realpathSync(planPath);
const identity = JSON.parse(readFileSync(identityPath, 'utf8'));
assert.ok(identity && typeof identity === 'object' && !Array.isArray(identity), 'identity must be a JSON object');
assert.equal(identity.plan_id, values.get('--plan-id'), 'identity plan_id does not match the requested plan');
assert.ok(typeof identity.plan_path === 'string' && isAbsolute(identity.plan_path), 'identity plan_path must be absolute');
assert.equal(resolve(identity.plan_path), planPath, 'identity plan_path does not match the exact plan path');
const sha = createHash('sha256').update(readFileSync(planPath)).digest('hex');
assert.equal(identity.plan_sha256, sha, 'identity plan_sha256 does not match plan bytes');
assert.equal(identity.scope, values.get('--scope'), 'identity scope does not match the requested scope');
assert.equal(identity.source_identity, values.get('--source-identity'), 'identity source_identity does not match the requested source');
console.log(JSON.stringify({ status: 'PASS', plan_id: identity.plan_id, plan_path: planRealpath, plan_sha256: sha, scope: identity.scope, source_identity: identity.source_identity }));
