#!/usr/bin/env node
// Claude Code PreToolUse guard for the native Workflow tool. The workflow
// script validates the payload again, but this boundary rejects forged or
// stale adoption freezes before Claude starts any subagent.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { adoptionSnapshot } from '../../scripts/evolution-adoption-snapshot.mjs';

const deny = (reason) => {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: '[evolution-freeze-guard] ' + reason,
  } }) + '\n');
  process.exit(0);
};
const allow = () => process.exit(0);

let data;
try { data = JSON.parse(readFileSync(0, 'utf8')); } catch { deny('hook 输入不是合法 JSON'); }
if (!data || typeof data !== 'object' || data.tool_name !== 'Workflow') allow();
const input = data.tool_input;
if (!input || typeof input !== 'object' || Array.isArray(input)) deny('Workflow 输入缺失');
const name = input.name ?? input.workflow ?? input.workflow_name;
if (name !== 'framework-evolution-scout') allow();

let args = input.args ?? input.arguments ?? input.params;
if (typeof args === 'string') {
  try { args = JSON.parse(args); } catch { deny('framework-evolution-scout args 不是合法 JSON'); }
}
if (!args || typeof args !== 'object' || Array.isArray(args)) deny('framework-evolution-scout 缺少结构化 args');
const hasTargets = Object.hasOwn(args, 'target_repos');
const hasSnapshot = Object.hasOwn(args, 'adoption_snapshot');
if (hasTargets && hasSnapshot) deny('target_repos 与 adoption_snapshot 不得混用');
if (hasTargets) allow();
const snap = args.adoption_snapshot;
if (!snap || typeof snap !== 'object' || snap.version !== 1 || typeof snap.sha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(snap.sha256) || !Number.isSafeInteger(snap.byte_length)
    || !Array.isArray(snap.entries)) deny('sweep 必须携带有效 caller adoption_snapshot');
try {
  const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const live = adoptionSnapshot(root);
  const same = snap.version === live.version && snap.sha256 === live.sha256
    && snap.byte_length === live.byte_length && snap.entries.length === live.entries.length
    && snap.entries.every((e, i) => e && e.line === live.entries[i].line
      && e.fused_candidate_id === live.entries[i].fused_candidate_id);
  if (!same) deny('caller snapshot does not match live ledger');
} catch (error) {
  deny('无法读取或核对 adoption ledger：' + error.message);
}
allow();
