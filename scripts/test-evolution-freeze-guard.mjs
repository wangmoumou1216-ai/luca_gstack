#!/usr/bin/env node
// Direct behavior tests for Claude Code native Workflow PreToolUse guard.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GUARD = join(ROOT, '.claude/hooks/evolution-freeze-guard.mjs');
const root = mkdtempSync(join(tmpdir(), 'evolution-freeze-guard-'));
const ledgerDir = join(root, '.claude/skill-os/evolution');
mkdirSync(ledgerDir, { recursive: true });
const bytes = '{\"fused_candidate_id\":\"same/id\"}\n\n{\"fused_candidate_id\":\"other/id\"}\n';
writeFileSync(join(ledgerDir, 'adoption-log.jsonl'), bytes);
const snapshot = {
  version: 1,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  byte_length: Buffer.byteLength(bytes),
  entries: [{ line: 1, fused_candidate_id: 'same/id' }, { line: 3, fused_candidate_id: 'other/id' }],
};
const call = (tool_input) => spawnSync(process.execPath, [GUARD], {
  cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  input: JSON.stringify({ tool_name: 'Workflow', tool_input }), encoding: 'utf8', timeout: 10000,
});
const decision = (result) => result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput : null;
const allowed = decision(call({ name: 'framework-evolution-scout', args: { adoption_snapshot: snapshot } }));
assert.equal(allowed, null, 'correct sweep snapshot is allowed');
const forged = structuredClone(snapshot); forged.sha256 = 'f'.repeat(64);
const deniedHash = decision(call({ name: 'framework-evolution-scout', args: { adoption_snapshot: forged } }));
assert.equal(deniedHash.permissionDecision, 'deny');
assert.match(deniedHash.permissionDecisionReason, /does not match live ledger/);
const missing = decision(call({ name: 'framework-evolution-scout', args: {} }));
assert.equal(missing.permissionDecision, 'deny');
const mixed = decision(call({ name: 'framework-evolution-scout', args: { target_repos: ['owner/one'], adoption_snapshot: snapshot } }));
assert.equal(mixed.permissionDecision, 'deny');
const punctual = decision(call({ name: 'framework-evolution-scout', args: { target_repos: ['owner/one'] } }));
assert.equal(punctual, null, 'punctual target evaluation remains allowed without snapshot');
const other = decision(call({ name: 'external-skill-scout', args: { adoption_snapshot: { forged: true } } }));
assert.equal(other, null, 'other workflows are not intercepted');
const nonWorkflow = spawnSync(process.execPath, [GUARD], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, input: JSON.stringify({ tool_name: 'Bash', tool_input: {} }), encoding: 'utf8' });
assert.equal(nonWorkflow.stdout.trim(), '');
const settings = JSON.parse(readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'));
const entry = settings.hooks.PreToolUse.find((x) => x.matcher === '^Workflow$')?.hooks?.[0];
assert.equal(entry?.onFailure, 'block');
assert.match(entry?.command || '', /evolution-freeze-guard\.mjs/);
console.log('evolution-freeze-guard 7/7 PASS');
