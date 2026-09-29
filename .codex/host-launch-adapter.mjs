#!/usr/bin/env node
// Restricted host launches have a fail-closed adapter. The registered legacy adapter stays unchanged.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = new Set(['session-restore.mjs', 'route-guard.mjs', 'project-scope-guard.mjs']
  .map(name => join(root, '.claude', 'hooks', name)));
const deny = reason => {
  process.stderr.write(`[host-launch-adapter] ${reason}\n`);
  process.exitCode = 2;
};
const run = (target, data, env) => {
  const result = spawnSync(process.execPath, [target], {
    input: JSON.stringify(data), env, cwd: root, encoding: 'utf8',
    timeout: 30000, maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || ![0, 2].includes(result.status)) {
    throw new Error(`INNER_HOOK_FAILED:${target}:${result.error?.code || result.status}`);
  }
  return result;
};
const adapt = (raw, event) => {
  const out = String(raw || '').trim();
  if (!out) return null;
  let payload;
  try { payload = JSON.parse(out); } catch { payload = null; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { hookSpecificOutput: { hookEventName: event, additionalContext: out } };
  }
  const hso = payload.hookSpecificOutput;
  if (hso?.updatedInput) return { ...payload, hookSpecificOutput: {
    ...hso, hookEventName: hso.hookEventName || 'PreToolUse',
    permissionDecision: hso.permissionDecision || 'allow',
  } };
  return payload;
};

try {
  const target = process.argv[2];
  if (!targets.has(target)) throw new Error('LEGACY_TARGET_DENIED');
  const data = JSON.parse(readFileSync(0, 'utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('NATIVE_INPUT_INVALID');
  if (realpathSync(data.cwd) !== realpathSync(root)) throw new Error('CWD_MISMATCH');
  const event = data.hook_event_name;
  const expected = target.endsWith('/session-restore.mjs') ? 'SessionStart'
    : target.endsWith('/route-guard.mjs') ? 'UserPromptSubmit' : 'PreToolUse';
  if (event !== expected) throw new Error('EVENT_MISMATCH');
  const originalTool = data.tool_name;
  if (event === 'SessionStart') {
    data.native_start_source = data.source;
    data.source = 'codex-start';
  }
  if (event === 'PreToolUse' && ['shell', 'local_shell', 'apply_patch'].includes(originalTool)) {
    data.tool_name = 'Bash';
  }
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root,
    LUCA_ACTUAL_HARNESS: 'codex', LUCA_HARNESS_ADAPTED: '1' };
  const inner = run(target, data, env);
  const innerOutput = adapt(inner.stdout, event);
  if (event === 'PreToolUse' && inner.status === 0
      && innerOutput?.hookSpecificOutput?.permissionDecision !== 'deny') {
    const controlled = run(join(root, '.claude', 'hooks', 'controlled-change-guard.mjs'), {
      ...data, tool_name: originalTool || data.tool_name,
      tool_input: innerOutput?.hookSpecificOutput?.updatedInput || data.tool_input,
    }, env);
    const controlledOutput = adapt(controlled.stdout, event);
    if (controlledOutput) process.stdout.write(JSON.stringify(controlledOutput) + '\n');
    if (controlled.status === 2 || controlledOutput) { process.exitCode = 2; }
    else if (innerOutput) process.stdout.write(JSON.stringify(innerOutput) + '\n');
  } else {
    if (innerOutput) process.stdout.write(JSON.stringify(innerOutput) + '\n');
    process.exitCode = inner.status;
  }
} catch (error) {
  deny(error?.message || String(error));
}
