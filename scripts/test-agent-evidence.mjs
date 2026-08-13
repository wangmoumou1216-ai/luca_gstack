#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  createHash, generateKeyPairSync, sign as signBytes,
} from 'node:crypto';
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, statSync, symlinkSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import {
  buildNativeLaunch, classifyClaudeModelProbe, nativeDispatchContract, parseRouting,
  targetTreeManifest, validatePacket as validateTcbPacket,
} from './evolution/agent-evidence-tcb.mjs';

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TCB = realpathSync(join(SOURCE_ROOT, 'scripts/evolution/agent-evidence-tcb.mjs'));
const VERIFIER = realpathSync(join(SOURCE_ROOT, 'scripts/evolution/verify-agent-evidence.mjs'));
const ROLES = Object.freeze(['plan-agent', 'work-agent', 'oracle', 'quality-gate']);
const HARNESSES = Object.freeze(['claude', 'codex']);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};
const codexApiSandbox = (mode) => mode === 'workspace-write'
  ? { type: 'workspaceWrite', writableRoots: [], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }
  : { type: 'readOnly', networkAccess: false };
const codexContext = (mode, root, effort) => {
  const entries = [{ path: { type: 'special', value: { kind: 'root' } }, access: 'read' }];
  if (mode === 'workspace-write') entries.push({ path: { type: 'path', path: root }, access: 'write' });
  const context = {
    cwd: root, workspace_roots: [root], approval_policy: 'never', effort,
    sandbox_policy: mode === 'workspace-write'
      ? { type: 'workspace-write', network_access: false, exclude_tmpdir_env_var: true, exclude_slash_tmp: true }
      : { type: 'read-only' },
    permission_profile: { type: 'managed', file_system: { type: 'restricted', entries }, network: 'restricted' },
    collaboration_mode: { settings: { reasoning_effort: effort } },
  };
  if (mode === 'workspace-write') context.file_system_sandbox_policy = { kind: 'restricted', entries };
  return context;
};
const jsonBytes = (value) => Buffer.from(`${stable(value)}\n`, 'utf8');
const jsonl = (events) => Buffer.from(`${events.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
const modelProbeArgs = (alias) => ['--safe-mode', '-p', '--model', alias, '--output-format', 'stream-json', '--verbose',
  '--no-session-persistence', '--tools', '', '--permission-mode', 'dontAsk',
  'Reply with exactly LUCA_CLAUDE_MODEL_PROBE_OK. Do not call tools.'];
const modelProbeSuccess = (alias, cwd, mutation = {}) => {
  const session = `probe-${alias}`;
  const events = [
    { type: 'system', subtype: 'init', session_id: session, cwd, permissionMode: 'dontAsk',
      model: `claude-${alias}-fixture-1`, tools: mutation.extraInitTool ? ['Bash'] : [] },
    { type: 'rate_limit_event', session_id: session,
      rate_limit_info: { status: mutation.unknownRate ? 'unknown' : 'allowed' } },
    { type: 'assistant', session_id: session, parent_tool_use_id: null,
      message: { model: `claude-${alias}-fixture-1`, content: mutation.tool
        ? [{ type: 'tool_use', id: 'forbidden', name: 'Bash', input: { command: 'true' } }]
        : [{ type: 'text', text: 'LUCA_CLAUDE_MODEL_PROBE_OK' }] } },
    { type: 'result', session_id: session, subtype: 'success', is_error: false,
      terminal_reason: 'completed', result: 'LUCA_CLAUDE_MODEL_PROBE_OK' },
  ];
  if (mutation.missingSession) delete events[1].session_id;
  if (mutation.reordered) [events[1], events[2]] = [events[2], events[1]];
  if (mutation.extraEvent) events.splice(3, 0, { type: 'progress', session_id: session });
  return jsonl(events);
};
const modelProbeCredits = (cwd, mutation = {}) => {
  const session = 'probe-fable';
  const message = 'Fable 5 requires usage credits.';
  return jsonl([
    { type: 'system', subtype: 'init', session_id: session, cwd, permissionMode: 'dontAsk',
      model: 'claude-fable-5', tools: [] },
    { type: 'rate_limit_event', session_id: session, rate_limit_info: { status: 'rejected',
      errorCode: mutation.generic ? 'rate_limited' : 'credits_required' } },
    { type: 'assistant', session_id: session, parent_tool_use_id: null,
      is_api_error_message: true, error: 'rate_limit',
      message: { model: mutation.realModel ? 'claude-fable-5' : '<synthetic>',
        content: [{ type: 'text', text: mutation.wrongText ? 'different error' : message }] } },
    { type: 'result', session_id: session, subtype: 'success', is_error: true, api_error_status: 429,
      terminal_reason: 'api_error', result: message },
  ]);
};
const mkdir700 = (path) => { mkdirSync(path, { recursive: true, mode: 0o700 }); chmodSync(path, 0o700); };
const write0600 = (path, bytes) => {
  mkdir700(dirname(path));
  writeFileSync(path, bytes, { mode: 0o600 });
  chmodSync(path, 0o600);
};
const signObject = (privateKey, value) => {
  const bytes = Buffer.from(stable(value), 'utf8');
  return { sha256: sha256(bytes), signature: signBytes(null, bytes, privateKey).toString('base64') };
};
const signedEvent = (privateKey, kind, sequence, previous, payload) => {
  const core = { schema_version: 'luca.agent-evidence-event.v2', kind, sequence, previous_sha256: previous, payload };
  const signed = signObject(privateKey, core);
  return { ...core, event_sha256: signed.sha256, signature_ed25519: signed.signature };
};

function git(cwd, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  env.GIT_NO_REPLACE_OBJECTS = '1';
  env.GIT_OPTIONAL_LOCKS = '0';
  Object.assign(env, {
    GIT_AUTHOR_NAME: 'agent-evidence-test', GIT_AUTHOR_EMAIL: 'agent-evidence-test@localhost',
    GIT_COMMITTER_NAME: 'agent-evidence-test', GIT_COMMITTER_EMAIL: 'agent-evidence-test@localhost',
  });
  const result = spawnSync('git', args, {
    cwd, encoding: 'utf8', input: '',
    env,
  });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function copyInto(sourceRoot, targetRoot, rel) {
  const target = join(targetRoot, rel);
  mkdir700(dirname(target));
  copyFileSync(join(sourceRoot, rel), target);
}

function sourceAttestation(path, kind) {
  if (!existsSync(path)) return { path, kind, present: false, sha256: null };
  const real = realpathSync(path);
  return { path: real, kind, present: true, sha256: sha256(readFileSync(real)) };
}

function waitForClose(child) {
  return new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('close', (code) => accept(code));
  });
}

async function startCounter({ name, base, repo, targetCommit, packetPath }) {
  const counterDir = join(base, `counter-${name}`);
  mkdir700(counterDir);
  const readyPath = join(counterDir, 'ready.json');
  const socketPath = join(counterDir, 'counter.sock');
  const child = spawn(process.execPath, [VERIFIER, 'counter-sign-server',
    '--ready', readyPath,
    '--socket', socketPath,
    '--tcb', TCB,
    '--repo-root', repo,
    '--target-commit', targetCommit,
    '--work-packet', packetPath,
    '--ttl-ms', '600000',
  ], { cwd: repo, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += String(chunk); });
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  await new Promise((accept, reject) => {
    const timeout = setTimeout(() => reject(new Error(`counter ready timeout: ${stderr}`)), 10_000);
    const poll = setInterval(() => {
      if (stdout.includes('COUNTER_SIGN_SERVER_READY')) {
        clearTimeout(timeout); clearInterval(poll); accept();
      } else if (child.exitCode !== null) {
        clearTimeout(timeout); clearInterval(poll); reject(new Error(`counter exited ${child.exitCode}: ${stderr}`));
      }
    }, 10);
  });
  const readyBytes = readFileSync(readyPath);
  return {
    child, readyPath: realpathSync(readyPath), readyBytes, ready: JSON.parse(readyBytes),
    readySha: sha256(readyBytes), socketPath, stderr: () => stderr,
  };
}

async function requestCounter(counter, baseCore) {
  const request = {
    schema_version: 'luca.agent-evidence-counter-request.v1',
    ready_id: counter.ready.ready_id,
    ready_sha256: counter.readySha,
    base_core_sha256: sha256(Buffer.from(stable(baseCore), 'utf8')),
    base_core: baseCore,
  };
  const responseText = await new Promise((accept, reject) => {
    const socket = createConnection({ path: counter.socketPath });
    let response = '';
    socket.setEncoding('utf8');
    socket.once('connect', () => socket.end(`${stable(request)}\n`));
    socket.on('data', (chunk) => { response += chunk; });
    socket.once('error', reject);
    socket.once('end', () => accept(response));
  });
  const code = await waitForClose(counter.child);
  assert.equal(code, 0, `counter signer failed: ${counter.stderr()} response=${responseText}`);
  const response = JSON.parse(responseText);
  assert.equal(response.schema_version, 'luca.agent-evidence-counter-signature.v1');
  assert.equal(response.ready_sha256, counter.readySha);
  assert.equal(response.base_core_sha256, request.base_core_sha256);
  return response;
}

function manualCounter({ name, base, repo, targetCommit, packet, packetPath, createdMs, expiryMs }) {
  const counterDir = join(base, `counter-${name}`);
  mkdir700(counterDir);
  const readyPath = join(counterDir, 'ready.json');
  const socketPath = join(counterDir, 'counter.sock');
  const pair = generateKeyPairSync('ed25519');
  const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const fingerprint = sha256(pair.publicKey.export({ type: 'spki', format: 'der' }));
  const ready = {
    schema_version: 'luca.agent-evidence-counter-ready.v1',
    ready_id: `counter-${sha256(Buffer.from(`${name}:${fingerprint}`)).slice(0, 24)}`,
    created_at: new Date(createdMs - 1_000).toISOString(),
    expires_at: new Date(Math.max(Date.now() + 300_000, expiryMs + 60_000)).toISOString(),
    socket_path: socketPath,
    counter_public_key_pem: publicPem,
    counter_fingerprint_sha256: fingerprint,
    commitments: {
      tcb_sha256: sha256(readFileSync(TCB)),
      verifier_sha256: sha256(readFileSync(VERIFIER)),
      repo_root: repo,
      target_commit: targetCommit,
      work_packet_sha256: packet.sha256,
      work_packet_source_sha256: packet.source_sha256,
    },
  };
  const readyBytes = jsonBytes(ready);
  write0600(readyPath, readyBytes);
  return {
    readyPath: realpathSync(readyPath), readyBytes, ready, readySha: sha256(readyBytes), socketPath, pair,
  };
}

function roleOutput(role, packet) {
  return role === 'work-agent'
    ? packet.expected_output
    : `LUCA_NATIVE_${role.replaceAll('-', '_').toUpperCase()}_RESULT`;
}

const fixtureUuid = (ordinal, lane) => `00000000-0000-4${String(lane).padStart(3, '0')}-8000-${String(ordinal + 1).padStart(12, '0')}`;

function claudeRaw(run, packet, mutation) {
  const parentId = `claude-parent-${run.role}-${run.ordinal}`;
  const childId = mutation.sameIdentity && run.role === 'plan-agent'
    ? parentId : `claude-child-${run.role}-${run.ordinal}`;
  const spawnId = `claude-spawn-${run.role}-${run.ordinal}`;
  const model = mutation.sameFamilyModelDrift && run.role === 'plan-agent'
    ? `claude-${run.launch.descriptor.projection}-fixture-2`
    : mutation.crossTierChildModel && run.role === 'work-agent'
      ? 'claude-fable-fixture-1'
      : mutation.wrongResolvedModel && run.role === 'plan-agent'
        ? 'claude-sonnet-fixture-1' : `claude-${run.launch.descriptor.projection}-fixture-1`;
  const expected = roleOutput(run.role, packet);
  const output = mutation.fakeLog && run.role === 'plan-agent' ? 'ALTERED_REHASHED_OUTPUT' : expected;
  const events = [
    { type: 'system', subtype: 'init', session_id: parentId, cwd: run.launch.descriptor.cwd,
      permissionMode: 'dontAsk',
      agents: mutation.initMissingDispatcher ? ['claude', run.role]
        : mutation.initMissingRole ? ['claude', 'u008-dispatcher']
          : mutation.initDuplicateAgent ? ['claude', 'u008-dispatcher', run.role, run.role]
            : ['claude', 'Explore', 'general-purpose', 'u008-dispatcher', run.role, 'statusline-setup'],
      tools: mutation.initExtraTool ? ['Task', 'Bash'] : ['Task'] },
    { type: 'assistant', session_id: parentId, message: { content: [{ type: 'tool_use', name: 'Agent', id: spawnId,
      input: { subagent_type: run.role, prompt: run.launch.input, run_in_background: false } }] } },
    { type: 'system', subtype: 'hook_started', session_id: parentId, hook_event: 'PreToolUse',
      hook_name: 'PreToolUse:Agent', hook_id: `pre-${spawnId}` },
    { type: 'system', subtype: 'hook_response', session_id: parentId, hook_event: 'PreToolUse',
      hook_name: 'PreToolUse:Agent', hook_id: `pre-${spawnId}`, exit_code: 0, outcome: 'success' },
    { type: 'system', subtype: 'task_started', session_id: parentId, task_id: childId,
      tool_use_id: spawnId, subagent_type: run.role, prompt: run.launch.input },
    { type: 'system', subtype: 'hook_started', session_id: parentId, hook_event: 'PostToolUse',
      hook_name: 'PostToolUse:Agent', hook_id: `post-${spawnId}` },
    { type: 'system', subtype: 'hook_response', session_id: parentId, hook_event: 'PostToolUse',
      hook_name: 'PostToolUse:Agent', hook_id: `post-${spawnId}`, exit_code: 0, outcome: 'success' },
    { type: 'user', session_id: parentId, tool_use_result: { status: 'async_launched', agentId: childId,
      prompt: run.launch.input, resolvedModel: model } },
  ];
  if (run.role === 'work-agent') {
    const bashId = `bash-${spawnId}`;
    const result = { type: 'tool_result', tool_use_id: bashId,
      content: mutation.claudeAdditionalOutput ? `${packet.verification_sentinel}\nEXTRA` : packet.verification_sentinel,
      is_error: mutation.claudeSentinelBeforeFailure ? true : false };
    if (mutation.claudeResultExtraField) result.extra = 'forbidden';
    const results = [result];
    if (mutation.claudeDuplicateResult) results.push({ ...result });
    events.push(
      { type: 'assistant', session_id: parentId, parent_tool_use_id: spawnId, subagent_type: run.role,
        message: { model, content: [{ type: 'tool_use', name: 'Bash', id: bashId,
          input: { command: packet.packet.verification[0].command } }] } },
      { type: 'user', session_id: parentId, parent_tool_use_id: spawnId, message: { content: results } },
    );
  } else if (mutation.extraTool && run.role === 'oracle') {
    events.push({ type: 'assistant', session_id: parentId, parent_tool_use_id: spawnId, subagent_type: run.role,
      message: { model, content: [{ type: 'tool_use', name: 'Bash', id: `extra-${spawnId}`, input: { command: 'true' } }] } });
  }
  events.push(
    { type: 'assistant', session_id: parentId, parent_tool_use_id: spawnId, subagent_type: run.role,
      message: { model, content: [{ type: 'text', text: output }] } },
    { type: 'system', subtype: 'task_notification', session_id: parentId, task_id: childId,
      tool_use_id: spawnId, status: 'completed' },
  );
  return { publicBytes: jsonl(events), parentId, childId, spawnId, output, observedProjection: model };
}

function codexRaw(run, packet, mutation) {
  const ownParent = fixtureUuid(run.ordinal, 1);
  const parentId = mutation.duplicateParent && run.ordinal === 5 ? fixtureUuid(4, 1)
    : (mutation.parentChildCollision && run.ordinal === 5 ? fixtureUuid(4, 2) : ownParent);
  const originalChild = fixtureUuid(run.ordinal, 2);
  const childId = mutation.duplicateChild && run.ordinal === 5 ? fixtureUuid(4, 2) : originalChild;
  const spawnId = `call_spawn_fixture_${String(run.ordinal).padStart(4, '0')}`;
  const waitId = `call_wait_fixture_${String(run.ordinal).padStart(4, '0')}`;
  const turnId = fixtureUuid(run.ordinal, 3);
  const childTurnId = fixtureUuid(run.ordinal, 4);
  const sandboxMode = run.launch.descriptor.sandbox_contract.type;
  const collab = (id, tool, status, prompt, receivers) => ({
    type: 'collabAgentToolCall', id, tool, status, senderThreadId: parentId,
    prompt, receiverThreadIds: receivers, model: null, reasoningEffort: null, agentsStates: {},
  });
  const agentPath = `/root/${run.launch.descriptor.native_task_name}`;
  const activity = {
    type: 'subAgentActivity', id: spawnId, kind: 'started',
    agentThreadId: childId, agentPath,
  };
  const thread = { id: parentId, sessionId: parentId, preview: '', ephemeral: false,
    modelProvider: 'openai', createdAt: 1000, updatedAt: 1000, status: { type: 'idle' },
    cwd: run.launch.descriptor.cwd, cliVersion: '0.146.1', source: 'vscode', turns: [] };
  const turn = (id, status) => ({ id, items: [], status });
  const publicEvents = [
    { jsonrpc: '2.0', id: 1, result: { userAgent: 'fixture/0.146.1', codexHome,
      platformFamily: 'unix', platformOs: 'macos' } },
    { jsonrpc: '2.0', id: 2, result: { thread, approvalPolicy: 'never', approvalsReviewer: 'user',
      model: 'fixture-model', modelProvider: 'openai', cwd: run.launch.descriptor.cwd, sandbox: codexApiSandbox(sandboxMode),
      runtimeWorkspaceRoots: [run.launch.descriptor.cwd], reasoningEffort: run.launch.descriptor.projection } },
    { jsonrpc: '2.0', method: 'thread/started', params: { thread } },
    { jsonrpc: '2.0', id: 3, result: { turn: turn(turnId, 'inProgress') } },
    { jsonrpc: '2.0', method: 'turn/started', params: { threadId: parentId, turn: turn(turnId, 'inProgress') } },
    { jsonrpc: '2.0', method: 'item/started', params: { item: activity, threadId: parentId, turnId, startedAtMs: 1000 } },
    { jsonrpc: '2.0', method: 'item/completed', params: { item: activity, threadId: parentId, turnId, completedAtMs: 1001 } },
    { jsonrpc: '2.0', method: 'item/started', params: { item: collab(waitId, 'wait', 'inProgress', null, []), threadId: parentId, turnId, startedAtMs: 1002 } },
    { jsonrpc: '2.0', method: 'turn/started', params: { threadId: childId, turn: turn(childTurnId, 'inProgress') } },
  ];
  if (run.role === 'work-agent') {
    const command = packet.packet.verification[0].command;
    const shellCommand = `/bin/zsh -lc "${command.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
    const commandId = `exec-${fixtureUuid(run.ordinal, 5)}`;
    const core = { type: 'commandExecution', id: commandId, pluginId: null, scriptPath: null,
      command: shellCommand, cwd: run.launch.descriptor.cwd, processId: String(41000 + run.ordinal),
      source: 'unifiedExecStartup', commandActions: [{ type: 'unknown', command }] };
    publicEvents.push(
      { jsonrpc: '2.0', method: 'item/started', params: { item: { ...core, status: 'inProgress', aggregatedOutput: null,
        exitCode: null, durationMs: null }, threadId: childId, turnId: childTurnId, startedAtMs: 1003 } },
      { jsonrpc: '2.0', method: 'item/completed', params: { item: { ...core, status: 'completed',
        aggregatedOutput: `${packet.verification_sentinel}\n`, exitCode: mutation.commandExitFailure ? 1 : 0, durationMs: 1 },
        threadId: childId, turnId: childTurnId, completedAtMs: 1004 } },
    );
  }
  publicEvents.push(
    { jsonrpc: '2.0', method: 'turn/completed', params: { threadId: childId, turn: turn(childTurnId, 'completed') } },
    { jsonrpc: '2.0', method: 'item/completed', params: { item: collab(waitId, 'wait', 'completed', null, []), threadId: parentId, turnId, completedAtMs: 1005 } },
    { jsonrpc: '2.0', method: 'turn/completed', params: { threadId: parentId, turn: turn(turnId, 'completed') } },
  );
  if (mutation.publicParentCompletesEarly && run.role === 'plan-agent') {
    const endIndex = publicEvents.findIndex((event) => event.method === 'turn/completed'
      && event.params.threadId === parentId);
    const [end] = publicEvents.splice(endIndex, 1);
    const childEndIndex = publicEvents.findIndex((event) => event.method === 'turn/completed'
      && event.params.threadId === childId);
    publicEvents.splice(childEndIndex, 0, end);
  }
  if (mutation.missingItemThread && run.role === 'plan-agent') delete publicEvents.find((event) => event.method === 'item/started').params.threadId;
  const publicBytes = jsonl(publicEvents);
  const ciphertext = `gAAAAfixture_${run.ordinal}_${run.role.replaceAll('-', '_')}=`;
  const parentEvents = [
    { type: 'event_msg', payload: { type: 'user_message', message: mutation.wrongPrompt && run.role === 'plan-agent'
      ? `${run.launch.dispatcherPrompt} altered` : run.launch.dispatcherPrompt } },
    { type: 'turn_context', payload: codexContext(sandboxMode,
      run.launch.descriptor.cwd, run.launch.descriptor.projection) },
    { type: 'response_item', payload: { type: 'function_call', name: 'spawn_agent', call_id: spawnId,
      arguments: JSON.stringify({ agent_type: run.role, fork_turns: 'none', message: ciphertext,
        task_name: run.launch.descriptor.native_task_name }) } },
    { type: 'response_item', payload: { type: 'function_call_output', call_id: spawnId,
      output: JSON.stringify({ agent_id: childId }) } },
    { type: 'event_msg', payload: { type: 'sub_agent_activity', kind: 'started', event_id: spawnId,
      agent_thread_id: childId } },
    { type: 'response_item', payload: { type: 'function_call', name: 'wait_agent', call_id: waitId,
      arguments: '{}' } },
    { type: 'response_item', payload: { type: 'function_call_output', call_id: waitId,
      output: JSON.stringify({ timed_out: false, message: 'completed' }) } },
  ];
  if (mutation.persistedWaitBeforeSpawnResult && run.role === 'plan-agent') {
    const waitIndex = parentEvents.findIndex((event) => event.payload?.name === 'wait_agent');
    const [wait] = parentEvents.splice(waitIndex, 1);
    const spawnOutputIndex = parentEvents.findIndex((event) => event.payload?.type === 'function_call_output'
      && event.payload.call_id === spawnId);
    parentEvents.splice(spawnOutputIndex, 0, wait);
  }
  if (mutation.persistedEdgeBeforeSpawnResult && run.role === 'plan-agent') {
    const edgeIndex = parentEvents.findIndex((event) => event.payload?.type === 'sub_agent_activity');
    const [edge] = parentEvents.splice(edgeIndex, 1);
    const spawnOutputIndex = parentEvents.findIndex((event) => event.payload?.type === 'function_call_output'
      && event.payload.call_id === spawnId);
    parentEvents.splice(spawnOutputIndex, 0, edge);
  }
  const parentBytes = jsonl(parentEvents);
  const expected = roleOutput(run.role, packet);
  const output = mutation.fakeLog && run.role === 'plan-agent' ? 'ALTERED_REHASHED_OUTPUT' : expected;
  const agentRole = mutation.unrelatedChild && run.role === 'plan-agent' ? 'oracle' : run.role;
  const childEvents = [
    { type: 'session_meta', payload: { id: childId, parent_thread_id: parentId, thread_source: 'subagent',
      agent_role: agentRole, agent_path: agentPath,
      source: { subagent: { thread_spawn: { parent_thread_id: parentId, agent_role: agentRole, agent_path: agentPath } } } } },
    { type: 'response_item', payload: { type: 'agent_message', content: [{ type: 'encrypted_content', encrypted_content: ciphertext }] } },
    { type: 'turn_context', payload: codexContext(sandboxMode,
      run.launch.descriptor.cwd, run.launch.descriptor.projection) },
    { type: 'event_msg', payload: { type: 'task_started', turn_id: childTurnId } },
  ];
  if (run.role === 'work-agent') {
    const callId = `codex-exec-${run.ordinal}`;
    const command = JSON.stringify(packet.packet.verification[0].command);
    const safeWrapper = `const r = await tools.exec_command({"cmd":${command},"workdir":${JSON.stringify(run.launch.descriptor.cwd)},"yield_time_ms":10000,"max_output_tokens":2000}); text(r.output);`;
    const wrapper = mutation.wrapperInjection ? `doSideEffect(); ${safeWrapper}` : safeWrapper;
    childEvents.push(
      { type: 'response_item', payload: { type: 'custom_tool_call', name: 'exec', call_id: callId, input: wrapper } },
      { type: 'response_item', payload: { type: 'custom_tool_call_output', call_id: callId,
        output: packet.verification_sentinel } },
    );
    if (mutation.persistedToolResultBeforeCall) {
      const result = childEvents.pop();
      const call = childEvents.pop();
      childEvents.push(result, call);
    }
  }
  childEvents.push(
    { type: 'event_msg', payload: { type: 'agent_message', message: output } },
    { type: 'event_msg', payload: { type: 'task_complete', turn_id: childTurnId } },
  );
  if (mutation.persistedTaskCompletesBeforeOutput && run.role === 'plan-agent') {
    const complete = childEvents.pop();
    const result = childEvents.pop();
    childEvents.push(complete, result);
  }
  return {
    publicBytes, parentBytes, childBytes: jsonl(childEvents), parentId, childId, spawnId,
    output, observedProjection: run.launch.descriptor.projection,
  };
}

const base = realpathSync(mkdtempSync('/private/tmp/ae2-'));
const repo = join(base, 'repo');
const codexHome = join(base, 'codex-home');
mkdir700(repo);
mkdir700(codexHome);
process.env.CODEX_HOME = codexHome;

try {
  for (const rel of [
    '.claude/agents/muse-proto-judge.md',
    '.claude/agents/oracle.md',
    '.claude/agents/orchestrator.md',
    '.claude/agents/plan-agent.md',
    '.claude/agents/preflight-agent.md',
    '.claude/agents/quality-gate.md',
    '.claude/agents/work-agent-template.md',
    '.claude/agents/work-agent.md',
    '.codex/agents/muse-proto-judge.toml',
    '.codex/agents/oracle.toml',
    '.codex/agents/plan-agent.toml',
    '.codex/agents/preflight-agent.toml',
    '.codex/agents/quality-gate.toml',
    '.codex/agents/work-agent.toml',
    '.claude/skill-os/model-routing.yaml',
    '.claude/skill-os/native-agent-activation.json',
    '.claude/skill-os/schemas/work-packet.schema.json',
    '.claude/skill-os/skill-routing-map.yaml',
    '.claude/skill-os/input-modes.yaml',
    '.claude/skill-os/optional-workflow-graph.yaml',
    '.claude/hooks/post-edit.mjs',
    '.claude/hooks/route-guard.mjs',
    '.claude/skills/office/brainstorm/SKILL.md',
    '.claude/skills/office/deepresearch/SKILL.md',
    '.claude/skills/office/ux-brainstorm/SKILL.md',
    '.claude/skills/office/ux-research/SKILL.md',
    '.claude/skills/office/code-hygiene/SKILL.md',
    '.codex/config.toml',
    '.codex/codex-hook-adapter.mjs',
    '.codex/workflow-runner.mjs',
    'AGENTS.md',
    'CLAUDE.md',
    'scripts/fixtures/agent-valid-work-packet.json',
    'scripts/agent-launcher.mjs',
    'scripts/check-agents-parity.mjs',
  ]) copyInto(SOURCE_ROOT, repo, rel);

  const claudeSettings = {
    hooks: { PostToolUse: [{ matcher: '^Agent$', hooks: [{ type: 'command', command: 'true' }] }] },
  };
  write0600(join(repo, '.claude/settings.json'), Buffer.from(`${JSON.stringify(claudeSettings, null, 2)}\n`));
  const hookCommand = 'node .codex/codex-hook-adapter.mjs fixture';
  const codexHooks = {
    description: 'hermetic native evidence fixture',
    hooks: { UserPromptSubmit: [{ matcher: '', hooks: [{ type: 'command', command: hookCommand }] }] },
  };
  write0600(join(repo, '.codex/hooks.json'), Buffer.from(`${JSON.stringify(codexHooks, null, 2)}\n`));
  const hooksPath = realpathSync(join(repo, '.codex/hooks.json'));
  const trustKey = `${hooksPath}:user_prompt_submit:0:0`;
  const trustedHash = `sha256:${'b'.repeat(64)}`;
  write0600(join(codexHome, 'config.toml'), Buffer.from(`[hooks.state."${trustKey}"]\ntrusted_hash = "${trustedHash}"\n`));

  git(repo, ['init', '-q']);
  const fixtureTracked = git(repo, ['ls-files', '--others']).split('\n').filter(Boolean);
  git(repo, ['add', '--', ...fixtureTracked]);
  git(repo, ['commit', '-q', '-m', 'hermetic v2 agent evidence fixture']);
  const targetCommit = git(repo, ['rev-parse', 'HEAD']);
  const packetPath = realpathSync(join(repo, 'scripts/fixtures/agent-valid-work-packet.json'));
  const packet = validateTcbPacket(packetPath);
  const routing = parseRouting(repo);
  const claudeSettingsPath = realpathSync(join(repo, '.claude/settings.json'));
  const runtime = {
    claude_settings_path: '.claude/settings.json',
    claude_settings_sha256: sha256(readFileSync(claudeSettingsPath)),
    claude_post_tool_use_agent_hooks: [{ matcher: '^Agent$', command_sha256: sha256(Buffer.from('true')) }],
    claude_settings_sources: [
      sourceAttestation(claudeSettingsPath, 'json'),
      sourceAttestation('/Library/Application Support/ClaudeCode/managed-settings.json', 'json'),
      sourceAttestation('/Library/Managed Preferences/com.anthropic.claudecode.plist', 'plist'),
    ],
    codex_hooks_path: '.codex/hooks.json',
    codex_hooks_sha256: sha256(readFileSync(hooksPath)),
    codex_config_path: realpathSync(join(codexHome, 'config.toml')),
    codex_config_sha256: sha256(readFileSync(join(codexHome, 'config.toml'))),
    codex_hook_runtime: [{
      key: trustKey, event_name: 'userPromptSubmit', current_hash: trustedHash, command: hookCommand,
      command_sha256: sha256(Buffer.from(hookCommand)), trust_status: 'trusted',
    }],
  };
  const classifierProbeCwd = join(base, 'classifier-transaction', 'child-scratch', 'model-resolution', 'fable');
  mkdir700(classifierProbeCwd);
  assert.deepEqual(classifyClaudeModelProbe({ status: 0,
    stdout: modelProbeSuccess('fable', realpathSync(classifierProbeCwd)), stderr: Buffer.alloc(0),
    expectedAlias: 'fable', expectedCwd: realpathSync(classifierProbeCwd) }),
  { outcome: 'available', resolved_model: 'claude-fable-fixture-1' });
  for (const [label, bytes] of [
    ['reordered', modelProbeSuccess('fable', realpathSync(classifierProbeCwd), { reordered: true })],
    ['extra', modelProbeSuccess('fable', realpathSync(classifierProbeCwd), { extraEvent: true })],
    ['missing-session', modelProbeSuccess('fable', realpathSync(classifierProbeCwd), { missingSession: true })],
    ['wrong-cwd', modelProbeSuccess('fable', realpathSync(repo))],
  ]) {
    assert.throws(() => classifyClaudeModelProbe({ status: 0, stdout: bytes, stderr: Buffer.alloc(0),
      expectedAlias: 'fable', expectedCwd: realpathSync(classifierProbeCwd) }), undefined,
    `TCB classifier accepted ${label} safe-mode probe transport`);
  }

  async function buildEvidence(name, mutation = {}, useServer = false) {
    const transactionRoot = join(base, `txn-${name}`);
    const evidenceRoot = join(transactionRoot, 'evidence');
    const rawRoot = join(evidenceRoot, 'raw');
    const receiptRoot = join(evidenceRoot, 'receipts');
    const scratchRoot = join(transactionRoot, 'child-scratch');
    mkdir700(rawRoot); mkdir700(receiptRoot); mkdir700(scratchRoot);
    let createdMs = mutation.expired ? Date.now() - 600_000 : Date.now();
    let expiryMs = mutation.expired ? Date.now() - 300_000 : createdMs + 300_000;
    const prepared = [];
    let ordinal = 0;
    for (const harness of HARNESSES) for (const role of ROLES) {
      const runId = `${harness}-${role}-${name}`;
      const scratch = join(scratchRoot, runId);
      mkdir700(scratch);
      const launch = buildNativeLaunch({
        root: repo, harness, role, packet: role === 'work-agent' ? packet : null,
        routing, dispatcherId: runId, runtime, scratch: realpathSync(scratch),
        projectionMode: mutation.fallbackResolution && harness === 'claude'
          && ['plan-agent', 'oracle'].includes(role) ? 'fallback' : 'primary',
      });
      if (mutation.wrongEffort && harness === 'codex' && role === 'plan-agent') {
        launch.descriptor.projection = 'low';
        launch.descriptor_sha256 = sha256(Buffer.from(stable(launch.descriptor), 'utf8'));
      }
      if (mutation.wrongDefinition && harness === 'claude' && role === 'plan-agent') {
        launch.descriptor.definition_path = '.claude/agents/oracle.md';
        launch.descriptor_sha256 = sha256(Buffer.from(stable(launch.descriptor), 'utf8'));
      }
      if (mutation.missingExperimentalCapability && harness === 'codex' && role === 'plan-agent') {
        launch.descriptor.sandbox_contract.app_server_capabilities = {};
        launch.descriptor_sha256 = sha256(Buffer.from(stable(launch.descriptor), 'utf8'));
      }
      const nonce = `nonce-${name}-${ordinal}`;
      prepared.push({ harness, role, run_id: runId, ordinal, nonce,
        nonce_commitment_sha256: sha256(Buffer.from(nonce)), launch });
      ordinal++;
    }
    const anchorRuns = prepared.map((run) => ({
      run_id: run.run_id, harness: run.harness, role: run.role,
      projection: run.launch.descriptor.projection,
      input_sha256: run.launch.descriptor.input_sha256,
      candidate_contract_sha256: nativeDispatchContract(run.launch.descriptor).contract_sha256,
      native_descriptor_sha256: run.launch.descriptor_sha256,
      write_roots: run.launch.descriptor.write_roots,
      sandbox_contract: run.launch.descriptor.sandbox_contract,
    }));
    const nonceCommitments = prepared.map((run) => ({
      run_id: run.run_id, commitment_sha256: run.nonce_commitment_sha256,
    }));
    const nonceSetSha = sha256(Buffer.from(stable(nonceCommitments), 'utf8'));
    const probeRoot = join(scratchRoot, 'model-resolution');
    mkdir700(probeRoot);
    const probeCwds = new Map(['fable', 'opus'].map((alias) => {
      const path = join(probeRoot, alias); mkdir700(path); return [alias, realpathSync(path)];
    }));
    const writeProbe = (alias, bytes, exitCode) => {
      const stdoutPath = join(rawRoot, `claude-model-${alias}.stdout.jsonl`);
      const stderrPath = join(rawRoot, `claude-model-${alias}.stderr`);
      write0600(stdoutPath, bytes); write0600(stderrPath, Buffer.alloc(0));
      const parsed = classifyClaudeModelProbe({ status: exitCode, stdout: bytes, stderr: Buffer.alloc(0),
        expectedAlias: alias, expectedCwd: probeCwds.get(alias) });
      return { projection: alias, outcome: parsed.outcome, resolved_model: parsed.resolved_model,
        exit_code: exitCode, argv_sha256: sha256(Buffer.from(stable(modelProbeArgs(alias)), 'utf8')),
        stdout_path: relative(evidenceRoot, stdoutPath), stdout_sha256: sha256(bytes),
        stderr_path: relative(evidenceRoot, stderrPath), stderr_sha256: sha256(Buffer.alloc(0)) };
    };
    const fableProbeCwd = mutation.probeWrongCwd ? realpathSync(repo) : probeCwds.get('fable');
    const fableBytes = mutation.fallbackResolution
      ? modelProbeCredits(fableProbeCwd, {
        generic: mutation.probeGenericRate, realModel: mutation.probeRealModel,
        wrongText: mutation.probeWrongText,
      })
      : modelProbeSuccess('fable', fableProbeCwd, {
        tool: mutation.probeTool, unknownRate: mutation.probeUnknownRate,
        extraInitTool: mutation.probeExtraInitTool,
        reordered: mutation.probeReordered, extraEvent: mutation.probeExtraEvent,
        missingSession: mutation.probeMissingSession,
      });
    let fableAttempt;
    try { fableAttempt = writeProbe('fable', fableBytes, mutation.fallbackResolution ? 1 : 0); } catch (error) {
      // Attack fixtures must remain constructible so the independent verifier,
      // rather than this helper, demonstrates rejection of malformed probe bytes.
      if (!mutation.probeGenericRate && !mutation.probeRealModel && !mutation.probeWrongText
        && !mutation.probeTool && !mutation.probeUnknownRate && !mutation.probeExtraInitTool
        && !mutation.probeReordered && !mutation.probeExtraEvent && !mutation.probeMissingSession
        && !mutation.probeWrongCwd) throw error;
      const stdoutPath = join(rawRoot, 'claude-model-fable.stdout.jsonl');
      const stderrPath = join(rawRoot, 'claude-model-fable.stderr');
      fableAttempt = { projection: 'fable', outcome: mutation.fallbackResolution ? 'credits_required' : 'available',
        resolved_model: mutation.fallbackResolution ? null : 'claude-fable-fixture-1',
        exit_code: mutation.fallbackResolution ? 1 : 0,
        argv_sha256: sha256(Buffer.from(stable(modelProbeArgs('fable')), 'utf8')),
        stdout_path: relative(evidenceRoot, stdoutPath), stdout_sha256: sha256(fableBytes),
        stderr_path: relative(evidenceRoot, stderrPath), stderr_sha256: sha256(Buffer.alloc(0)) };
    }
    const opusAttempt = writeProbe('opus', modelProbeSuccess('opus', probeCwds.get('opus')), 0);
    if (mutation.probeWrongExit) fableAttempt.exit_code = 1;
    if (mutation.probeWrongOutcome) fableAttempt.outcome = 'credits_required';
    if (mutation.probeWrongArgv) fableAttempt.argv_sha256 = '0'.repeat(64);
    if (mutation.probePathTraversal) fableAttempt.stdout_path = 'raw/../raw/claude-model-fable.stdout.jsonl';
    const modelResolutionRecords = [
      { schema_version: 'luca.agent-model-resolution.v1', harness: 'claude', tier: 'reasoning-heavy',
        primary_projection: 'fable', fallback_projection: 'opus',
        effective_projection: mutation.fallbackResolution ? 'opus' : 'fable',
        effective_model: mutation.fallbackResolution ? 'claude-opus-fixture-1' : 'claude-fable-fixture-1',
        reason: mutation.fallbackResolution ? 'credits_required' : 'primary_available',
        attempts: mutation.fallbackResolution ? [fableAttempt, opusAttempt] : [fableAttempt] },
      { schema_version: 'luca.agent-model-resolution.v1', harness: 'claude', tier: 'core-execution',
        primary_projection: 'opus', fallback_projection: null, effective_projection: 'opus',
        effective_model: 'claude-opus-fixture-1',
        reason: 'primary_available', attempts: [opusAttempt] },
    ];
    if (mutation.crossTierEffectiveModel) {
      modelResolutionRecords[0].effective_model = modelResolutionRecords[1].effective_model;
    }
    const modelResolutions = modelResolutionRecords.map((record, index) => {
      const path = join(rawRoot, `claude-${record.tier}-resolution.json`);
      const bytes = mutation.noncanonicalResolutionRecord && index === 0
        ? Buffer.from(`${JSON.stringify(record, null, 2)}\n`, 'utf8') : jsonBytes(record);
      write0600(path, bytes);
      return { harness: record.harness, tier: record.tier,
        primary_projection: record.primary_projection, fallback_projection: record.fallback_projection,
        effective_projection: record.effective_projection, effective_model: record.effective_model,
        reason: record.reason,
        path: relative(evidenceRoot, path), sha256: sha256(bytes) };
    });
    if (mutation.resolutionPathTraversal) {
      modelResolutions[0].path = 'raw/../raw/claude-reasoning-heavy-resolution.json';
    }
    if (mutation.wrongResolutionEffective) modelResolutions[0].effective_projection = 'opus';
    if (mutation.wrongResolutionHash) modelResolutions[0].sha256 = '0'.repeat(64);
    const counter = useServer
      ? await startCounter({ name, base, repo, targetCommit, packetPath })
      : manualCounter({ name, base, repo, targetCommit, packet, packetPath, createdMs, expiryMs });
    if (useServer) {
      createdMs = Date.now();
      expiryMs = Math.min(createdMs + 300_000, Date.parse(counter.ready.expires_at) - 1_000);
    }
    const createdAt = new Date(createdMs).toISOString();
    const expiresAt = new Date(expiryMs).toISOString();
    const evidenceKeys = generateKeyPairSync('ed25519');
    const evidencePublicPem = evidenceKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const evidenceFingerprint = sha256(evidenceKeys.publicKey.export({ type: 'spki', format: 'der' }));
    const consumePath = join(transactionRoot, 'verification-consumed.json');
    const anchorPath = join(transactionRoot, 'precommit-anchor.json');
    const baseCore = {
      schema_version: 'luca.agent-evidence-anchor.v2', transaction_id: `fixture-${name}`,
      created_at: createdAt, expires_at: expiresAt, repo_root: realpathSync(repo), evidence_root: realpathSync(evidenceRoot),
      consume_path: consumePath, target_commit: targetCommit,
      target_tree_manifest: targetTreeManifest(repo, targetCommit, packetPath),
      tcb: { path: TCB, sha256: sha256(readFileSync(TCB)) },
      verifier: { path: VERIFIER, sha256: sha256(readFileSync(VERIFIER)) },
      candidate_launcher: { path: realpathSync(join(repo, 'scripts/agent-launcher.mjs')),
        sha256: sha256(readFileSync(join(repo, 'scripts/agent-launcher.mjs'))), execution: 'describe-contract-only-before-evidence-key' },
      work_packet: { path: packetPath, sha256: packet.sha256, source_sha256: packet.source_sha256 },
      counter_ready: { path: counter.readyPath, sha256: counter.readySha, ready_id: counter.ready.ready_id,
        created_at: counter.ready.created_at, expires_at: counter.ready.expires_at, socket_path: counter.ready.socket_path },
      evidence_public_key_pem: evidencePublicPem, evidence_fingerprint_sha256: evidenceFingerprint,
      nonce_commitments: nonceCommitments, nonce_set_sha256: nonceSetSha,
      model_resolutions: modelResolutions, runs: anchorRuns,
    };
    if (mutation.wrongTreeManifest) baseCore.target_tree_manifest[0].sha256 = '0'.repeat(64);
    const counterSignature = useServer
      ? await requestCounter(counter, baseCore)
      : { counter_fingerprint_sha256: counter.ready.counter_fingerprint_sha256,
        signature_ed25519: signBytes(null, Buffer.from(stable(baseCore), 'utf8'), counter.pair.privateKey).toString('base64') };
    const evidenceBaseSignature = signObject(evidenceKeys.privateKey, baseCore);
    const anchor = {
      ...baseCore, base_core_sha256: evidenceBaseSignature.sha256,
      evidence_signature_ed25519: evidenceBaseSignature.signature,
      counter_public_key_pem: counter.ready.counter_public_key_pem,
      counter_fingerprint_sha256: counterSignature.counter_fingerprint_sha256,
      counter_signature_ed25519: counterSignature.signature_ed25519,
    };
    const anchorBytes = jsonBytes(anchor);
    write0600(anchorPath, anchorBytes);
    const anchorSha = sha256(anchorBytes);
    const envelopeRuns = prepared.map((run) => ({
      run_id: run.run_id, harness: run.harness, role: run.role,
      nonce_commitment_sha256: run.nonce_commitment_sha256,
      candidate_contract_sha256: nativeDispatchContract(run.launch.descriptor).contract_sha256,
      native_descriptor: run.launch.descriptor,
      native_descriptor_sha256: run.launch.descriptor_sha256,
    }));
    const runtimeAttestations = structuredClone(runtime);
    if (mutation.wrongMatcher) runtimeAttestations.claude_post_tool_use_agent_hooks[0].matcher = '^Bash$';
    if (mutation.untrustedHook) runtimeAttestations.codex_hook_runtime[0].trust_status = 'untrusted';
    const envelopeCore = {
      schema_version: 'luca.agent-evidence-envelope.v2', transaction_id: anchor.transaction_id,
      anchor_path: realpathSync(anchorPath), anchor_sha256: anchorSha, target_commit: targetCommit,
      repo_root: realpathSync(repo), created_at: createdAt, expires_at: expiresAt,
      public_key_fingerprint_sha256: evidenceFingerprint,
      tcb_sha256: baseCore.tcb.sha256, verifier_sha256: baseCore.verifier.sha256,
      launcher_sha256: baseCore.candidate_launcher.sha256,
      work_packet_sha256: packet.sha256, work_packet_source_sha256: packet.source_sha256,
      runtime_attestations: runtimeAttestations, runs: envelopeRuns,
    };
    const envelopeSigned = signObject(evidenceKeys.privateKey, envelopeCore);
    const envelope = { ...envelopeCore, envelope_core_sha256: envelopeSigned.sha256,
      signature_ed25519: envelopeSigned.signature };
    const envelopePath = join(evidenceRoot, 'execution-envelope.json');
    write0600(envelopePath, jsonBytes(envelope));
    const envelopeSha = sha256(readFileSync(envelopePath));
    const receipts = [];
    let firstNonce = null;
    for (const run of prepared) {
      const raw = run.harness === 'claude' ? claudeRaw(run, packet, mutation) : codexRaw(run, packet, mutation);
      const prefix = `${run.harness}-${run.role}`;
      const rawParts = [
        { kind: 'public', path: join(rawRoot, `${prefix}.stdout.jsonl`), bytes: raw.publicBytes },
        { kind: 'stderr', path: join(rawRoot, `${prefix}.stderr`), bytes: Buffer.alloc(0) },
      ];
      if (run.harness === 'codex') rawParts.push(
        { kind: 'parent_rollout', path: join(rawRoot, `${prefix}.parent-rollout.jsonl`), bytes: raw.parentBytes },
        { kind: 'child_rollout', path: join(rawRoot, `${prefix}.child-rollout.jsonl`), bytes: raw.childBytes },
      );
      for (const part of rawParts) write0600(part.path, part.bytes);
      const rawLogs = rawParts.map((part) => ({
        kind: part.kind, path: relative(evidenceRoot, part.path), size: part.bytes.length, sha256: sha256(part.bytes),
      }));
      const sourceHash = sha256(Buffer.concat(rawParts.flatMap((part) => [Buffer.from(`${part.kind}:${part.bytes.length}:`), part.bytes])));
      if (firstNonce === null) firstNonce = run.nonce;
      const launchNonce = mutation.replayNonce && run.ordinal === 1 ? firstNonce : run.nonce;
      const launchEvent = signedEvent(evidenceKeys.privateKey, 'launch', 1, null, {
        run_id: run.run_id, anchor_sha256: anchorSha, envelope_sha256: envelopeSha,
        nonce: launchNonce, nonce_commitment_sha256: run.nonce_commitment_sha256,
        harness: run.harness, role: run.role, native_descriptor_sha256: run.launch.descriptor_sha256,
        target_commit: targetCommit, launched_at: createdAt,
      });
      const sessionEvent = signedEvent(evidenceKeys.privateKey, 'session', 2, launchEvent.event_sha256, {
        run_id: run.run_id, parent_id: raw.parentId, child_id: raw.childId, spawn_id: raw.spawnId,
        native_identity_kind: run.harness === 'claude' ? 'dispatcher_session_to_child_agent_id' : 'parent_thread_to_child_thread',
        input_binding_kind: run.harness === 'claude'
          ? 'native_plaintext_prompt_sha256'
          : 'precommitted_dispatcher_plus_native_ciphertext_continuity',
        observed_input_sha256: sha256(Buffer.from(run.launch.input, 'utf8')),
        observed_projection: raw.observedProjection, source_log_sha256: sourceHash, raw_logs: rawLogs,
        stderr_sha256: sha256(Buffer.alloc(0)), observed_at: createdAt,
      });
      const resultEvent = signedEvent(evidenceKeys.privateKey, 'result', 3, sessionEvent.event_sha256, {
        run_id: run.run_id, output_sha256: sha256(Buffer.from(raw.output, 'utf8')),
        output_size: Buffer.byteLength(raw.output, 'utf8'), completed_at: createdAt, exit_code: 0,
      });
      const receiptCore = {
        schema_version: 'luca.agent-evidence-receipt.v2', transaction_id: anchor.transaction_id,
        run_id: run.run_id, anchor_sha256: anchorSha, envelope_sha256: envelopeSha,
        public_key_fingerprint_sha256: evidenceFingerprint, harness: run.harness, role: run.role,
        target_commit: targetCommit, native_descriptor_sha256: run.launch.descriptor_sha256,
        nonce_commitment_sha256: run.nonce_commitment_sha256,
        parent_id: raw.parentId, child_id: raw.childId, spawn_id: raw.spawnId,
        source_log_sha256: sourceHash, output_sha256: resultEvent.payload.output_sha256,
        events: [launchEvent, sessionEvent, resultEvent], created_at: createdAt,
        completed_at: createdAt, expires_at: expiresAt,
      };
      const receiptSigned = signObject(evidenceKeys.privateKey, receiptCore);
      const receipt = { ...receiptCore, receipt_core_sha256: receiptSigned.sha256,
        signature_ed25519: receiptSigned.signature };
      const receiptPath = join(receiptRoot, `${prefix}.json`);
      write0600(receiptPath, jsonBytes(receipt));
      receipts.push({ harness: run.harness, role: run.role, path: relative(evidenceRoot, receiptPath),
        sha256: sha256(readFileSync(receiptPath)), child_id: raw.childId });
    }
    if (mutation.missingRole) receipts.pop();
    const summaryCore = {
      schema_version: 'luca.agent-evidence-summary.v2', transaction_id: anchor.transaction_id,
      anchor_sha256: anchorSha, envelope_path: 'execution-envelope.json', envelope_sha256: envelopeSha,
      public_key_fingerprint_sha256: evidenceFingerprint, target_commit: targetCommit,
      harnesses: [...HARNESSES], roles: [...ROLES], receipts, completed_at: createdAt,
    };
    const summarySigned = signObject(evidenceKeys.privateKey, summaryCore);
    write0600(join(evidenceRoot, 'summary.json'), jsonBytes({ ...summaryCore,
      summary_core_sha256: summarySigned.sha256, signature_ed25519: summarySigned.signature }));
    return {
      evidenceRoot: realpathSync(evidenceRoot), anchorPath: realpathSync(anchorPath), anchorSha,
      envelopeSha, evidenceFingerprint, counterFingerprint: counter.ready.counter_fingerprint_sha256,
      nonceSetSha, targetCommit, tcbSha: baseCore.tcb.sha256, verifierSha: baseCore.verifier.sha256,
      consumePath, counterSocketPath: counter.socketPath,
    };
  }

  function verifyEvidence(evidence, overrides = {}) {
    return spawnSync(process.execPath, [VERIFIER,
      '--evidence-root', evidence.evidenceRoot,
      '--anchor', evidence.anchorPath,
      '--expected-anchor-sha', evidence.anchorSha,
      '--expected-envelope-sha', evidence.envelopeSha,
      '--expected-fingerprint', overrides.evidenceFingerprint || evidence.evidenceFingerprint,
      '--expected-counter-fingerprint', overrides.counterFingerprint || evidence.counterFingerprint,
      '--expected-nonce-set-sha', evidence.nonceSetSha,
      '--expected-target-commit', evidence.targetCommit,
      '--expected-tcb-sha', evidence.tcbSha,
      '--expected-verifier-sha', evidence.verifierSha,
    ], { cwd: repo, encoding: 'utf8', input: '', env: process.env, timeout: 30_000 });
  }

  const valid = await buildEvidence('valid', {}, true);
  const positive = verifyEvidence(valid);
  assert.equal(positive.status, 0, `positive evidence failed: ${positive.stderr}`);
  assert.match(positive.stdout, /AGENT_EVIDENCE_VERIFIED/);
  const fallbackValid = await buildEvidence('valid-fallback', { fallbackResolution: true });
  const fallbackPositive = verifyEvidence(fallbackValid);
  assert.equal(fallbackPositive.status, 0, `fallback evidence failed: ${fallbackPositive.stderr}`);
  assert.match(fallbackPositive.stdout, /AGENT_EVIDENCE_VERIFIED/);
  const replay = verifyEvidence(valid);
  assert.notEqual(replay.status, 0, 'consumed anchor replay unexpectedly verified');
  await assert.rejects(async () => await new Promise((accept, reject) => {
    const socket = createConnection({ path: valid.counterSocketPath });
    socket.once('connect', () => { socket.destroy(); accept(); });
    socket.once('error', reject);
  }), /ENOENT|ECONNREFUSED/);

  const attacks = [
    ['missing role receipt', { missingRole: true }],
    ['wrong definition binding', { wrongDefinition: true }],
    ['target-tree blob manifest substitution', { wrongTreeManifest: true }],
    ['wrong effort projection', { wrongEffort: true }],
    ['missing Codex experimental API capability', { missingExperimentalCapability: true }],
    ['replayed nonce', { replayNonce: true }],
    ['same dispatcher and child', { sameIdentity: true }],
    ['duplicate child across receipts', { duplicateChild: true }],
    ['duplicate parent across receipts', { duplicateParent: true }],
    ['parent collides with another child', { parentChildCollision: true }],
    ['altered and rehashed fake native log', { fakeLog: true }],
    ['untrusted Codex hook', { untrustedHook: true }],
    ['wrong Claude matcher', { wrongMatcher: true }],
    ['Claude init missing dispatcher', { initMissingDispatcher: true }],
    ['Claude init missing role', { initMissingRole: true }],
    ['Claude init duplicate role', { initDuplicateAgent: true }],
    ['Claude init broadens effective tool pool', { initExtraTool: true }],
    ['unrelated native child role', { unrelatedChild: true }],
    ['extra read-only child tool', { extraTool: true }],
    ['Codex wrapper side effect', { wrapperInjection: true }],
    ['Codex public command exits nonzero after sentinel', { commandExitFailure: true }],
    ['Claude sentinel precedes structured failure', { claudeSentinelBeforeFailure: true }],
    ['Claude Bash result contains additional output', { claudeAdditionalOutput: true }],
    ['Claude Bash result contains an extra field', { claudeResultExtraField: true }],
    ['Claude Bash result is duplicated', { claudeDuplicateResult: true }],
    ['Claude child resolved model differs from effective family', { wrongResolvedModel: true }],
    ['Claude child drifts within the effective alias family', { sameFamilyModelDrift: true }],
    ['Claude child uses the other tier concrete model', { crossTierChildModel: true }],
    ['reasoning tier records the core tier concrete model', { crossTierEffectiveModel: true }],
    ['signed model resolution effective projection is altered', { wrongResolutionEffective: true }],
    ['signed model resolution record hash is altered', { wrongResolutionHash: true }],
    ['model resolution record is noncanonical JSON', { noncanonicalResolutionRecord: true }],
    ['model resolution record path traverses and normalizes', { resolutionPathTraversal: true }],
    ['model probe raw path traverses and normalizes', { probePathTraversal: true }],
    ['safe-mode model probe invokes a tool', { probeTool: true }],
    ['safe-mode model probe has unknown rate status', { probeUnknownRate: true }],
    ['safe-mode model probe init has an extra tool', { probeExtraInitTool: true }],
    ['safe-mode model probe uses the repository cwd', { probeWrongCwd: true }],
    ['safe-mode model probe events are reordered', { probeReordered: true }],
    ['safe-mode model probe contains an extra event', { probeExtraEvent: true }],
    ['safe-mode model probe event lacks its session', { probeMissingSession: true }],
    ['safe-mode model probe exit code differs from its outcome', { probeWrongExit: true }],
    ['safe-mode model probe declared outcome differs from its bytes', { probeWrongOutcome: true }],
    ['safe-mode model probe argv commitment differs', { probeWrongArgv: true }],
    ['fallback probe has generic rate error', { fallbackResolution: true, probeGenericRate: true }],
    ['fallback probe synthetic error uses a real model', { fallbackResolution: true, probeRealModel: true }],
    ['fallback probe synthetic error text differs from result', { fallbackResolution: true, probeWrongText: true }],
    ['Codex item envelope lacks thread binding', { missingItemThread: true }],
    ['Codex plaintext prompt substitution', { wrongPrompt: true }],
    ['Codex public parent completes before child', { publicParentCompletesEarly: true }],
    ['Codex persisted wait precedes spawn result', { persistedWaitBeforeSpawnResult: true }],
    ['Codex persisted edge precedes spawn result', { persistedEdgeBeforeSpawnResult: true }],
    ['Codex persisted task completes before output', { persistedTaskCompletesBeforeOutput: true }],
    ['Codex persisted tool result precedes tool call', { persistedToolResultBeforeCall: true }],
    ['expired transaction', { expired: true }],
  ];
  for (const [label, mutation] of attacks) {
    const evidence = await buildEvidence(label.replaceAll(/[^a-z0-9]+/gi, '-').toLowerCase(), mutation);
    const result = verifyEvidence(evidence);
    assert.notEqual(result.status, 0, `${label} unexpectedly verified`);
  }
  const selfKey = await buildEvidence('self-key-substitution');
  const replacement = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' });
  assert.notEqual(verifyEvidence(selfKey, { counterFingerprint: sha256(replacement) }).status, 0,
    'self-generated replacement counter key unexpectedly verified');

  // Actual repository/filesystem substitution attacks.  Each mutation must be
  // rejected independently by the exported TCB path and by the standalone
  // verifier replaying an already signed, otherwise-valid matrix.
  const boundaryEvidence = await buildEvidence('git-filesystem-boundary');
  const assertBoundaryRejected = (label) => {
    assert.throws(() => targetTreeManifest(repo, targetCommit, packetPath), undefined,
      `${label}: TCB target boundary unexpectedly accepted`);
    const result = verifyEvidence(boundaryEvidence);
    assert.equal(result.status, 2, `${label}: independent verifier did not fail closed: ${result.stderr}`);
    assert.match(result.stderr, /AGENT_EVIDENCE_VERIFY_ERROR/,
      `${label}: independent verifier failure was not the governed target gate`);
  };
  const targetTree = git(repo, ['rev-parse', `${targetCommit}^{tree}`]);
  const emptyTree = git(repo, ['hash-object', '-w', '-t', 'tree', '--stdin']);
  const replacementCommit = git(repo, ['commit-tree', emptyTree, '-p', targetCommit, '-m', 'replacement-commit-mutant']);
  git(repo, ['replace', targetCommit, replacementCommit]);
  try { assertBoundaryRejected('replacement commit ref'); } finally { git(repo, ['replace', '-d', targetCommit]); }
  git(repo, ['replace', targetTree, emptyTree]);
  try { assertBoundaryRejected('replacement tree ref'); } finally { git(repo, ['replace', '-d', targetTree]); }

  const criticalRel = '.claude/agents/plan-agent.md';
  const criticalPath = join(repo, criticalRel);
  const criticalBytes = readFileSync(criticalPath);
  const criticalMode = statSync(criticalPath).mode & 0o777;
  const externalCritical = join(base, 'external-plan-agent.md');
  write0600(externalCritical, criticalBytes);
  unlinkSync(criticalPath);
  symlinkSync(externalCritical, criticalPath);
  try { assertBoundaryRejected('critical working-tree symlink'); } finally {
    unlinkSync(criticalPath);
    writeFileSync(criticalPath, criticalBytes, { mode: criticalMode });
    chmodSync(criticalPath, criticalMode);
  }

  const originalEntry = git(repo, ['ls-tree', targetCommit, '--', criticalRel])
    .match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/);
  assert.ok(originalEntry && originalEntry[3] === criticalRel, 'critical fixture tree entry missing');
  const restoreCriticalIndex = () => git(repo,
    ['update-index', '--add', '--cacheinfo', `${originalEntry[1]},${originalEntry[2]},${criticalRel}`]);
  git(repo, ['update-index', '--add', '--cacheinfo', `160000,${targetCommit},${criticalRel}`]);
  try { assertBoundaryRejected('critical index gitlink/submodule'); } finally { restoreCriticalIndex(); }
  git(repo, ['update-index', '--skip-worktree', '--', criticalRel]);
  try { assertBoundaryRejected('critical index skip-worktree'); } finally {
    git(repo, ['update-index', '--no-skip-worktree', '--', criticalRel]);
  }
  git(repo, ['update-index', '--assume-unchanged', '--', criticalRel]);
  try { assertBoundaryRejected('critical index assume-unchanged'); } finally {
    git(repo, ['update-index', '--no-assume-unchanged', '--', criticalRel]);
  }

  const excludePath = join(repo, '.git/info/exclude');
  const excludeBytes = readFileSync(excludePath);
  const ignoredRel = '.claude/agents/ignored-native-route.md';
  const ignoredPath = join(repo, ignoredRel);
  writeFileSync(excludePath, Buffer.concat([excludeBytes, Buffer.from(`\n/${ignoredRel}\n`, 'utf8')]));
  writeFileSync(ignoredPath, 'ignored but harness-discoverable native role\n', { mode: 0o600 });
  try {
    assert.equal(git(repo, ['check-ignore', ignoredRel]), ignoredRel, 'untracked mutant is not actually ignored');
    assertBoundaryRejected('ignored relevant untracked native role');
  } finally {
    unlinkSync(ignoredPath);
    writeFileSync(excludePath, excludeBytes);
  }

  const poisonedGit = {
    GIT_DIR: '/definitely/not/the/repository',
    GIT_NAMESPACE: 'attacker',
    GIT_CEILING_DIRECTORIES: repo,
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.repositoryformatversion',
    GIT_CONFIG_VALUE_0: '99',
  };
  const cleanBoundaryManifest = targetTreeManifest(repo, targetCommit, packetPath);
  const previousGitEnv = Object.fromEntries(Object.keys(poisonedGit).map((key) => [key, process.env[key]]));
  Object.assign(process.env, poisonedGit);
  let envPositive;
  try {
    assert.deepEqual(targetTreeManifest(repo, targetCommit, packetPath),
      cleanBoundaryManifest, 'TCB Git environment scrub did not preserve the clean manifest');
    envPositive = verifyEvidence(boundaryEvidence);
  } finally {
    for (const [key, value] of Object.entries(previousGitEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
  assert.equal(envPositive.status, 0, `standalone verifier failed despite GIT_* environment scrub: ${envPositive.stderr}`);
  assert.match(envPositive.stdout, /AGENT_EVIDENCE_VERIFIED/);

  const missingRoot = join(base, 'missing-role-root');
  mkdir700(join(missingRoot, '.claude/skill-os'));
  copyInto(SOURCE_ROOT, missingRoot, '.claude/skill-os/model-routing.yaml');
  assert.throws(() => buildNativeLaunch({ root: missingRoot, harness: 'claude', role: 'oracle', packet: null,
    routing: parseRouting(missingRoot), dispatcherId: 'missing-role', runtime,
    scratch: realpathSync(missingRoot) }), /ENOENT|no such file/i);
  assert.throws(() => buildNativeLaunch({ root: repo, harness: 'claude', role: 'renamed-oracle', packet: null,
    routing, dispatcherId: 'renamed-role', runtime, scratch: realpathSync(repo) }), /unknown native role/);
  const invalidFallbackRoot = join(base, 'invalid-fallback-root');
  mkdir700(join(invalidFallbackRoot, '.claude/skill-os'));
  const routingText = readFileSync(join(repo, '.claude/skill-os/model-routing.yaml'), 'utf8');
  write0600(join(invalidFallbackRoot, '.claude/skill-os/model-routing.yaml'),
    Buffer.from(routingText.replace('fallback: opus', 'fallback: sonnet')));
  assert.throws(() => parseRouting(invalidFallbackRoot), /invalid Claude fallback/,
    'TCB accepted a fallback that skips the immediately lower known_lineup alias');

  const invalidPacketPath = join(base, 'invalid-work-packet.json');
  const invalidPacket = JSON.parse(readFileSync(packetPath, 'utf8'));
  invalidPacket.files[0].path = 'undeclared-response';
  invalidPacket.ownership.push({ path: 'undeclared-response', owner: 'work-agent', access: 'create' });
  write0600(invalidPacketPath, Buffer.from(`${JSON.stringify(invalidPacket)}\n`));
  assert.throws(() => validateTcbPacket(invalidPacketPath), /packet output|declared/i);
  const failingSmokePath = join(base, 'failing-smoke-work-packet.json');
  const failingSmoke = JSON.parse(readFileSync(packetPath, 'utf8'));
  failingSmoke.verification[0].command = "printf 'LUCA_NATIVE_WORK_AGENT_VERIFY_WP_NATIVE_SMOKE_V1\\n'; false";
  write0600(failingSmokePath, Buffer.from(`${JSON.stringify(failingSmoke)}\n`));
  assert.throws(() => validateTcbPacket(failingSmokePath), /exact frozen zero-exit verification command/);
  const extraOutputPath = join(base, 'extra-output-work-packet.json');
  const extraOutput = JSON.parse(readFileSync(packetPath, 'utf8'));
  extraOutput.ownership.push({ path: 'extra', owner: 'work-agent', access: 'create' });
  extraOutput.files.push({ path: 'extra', purpose: 'forbidden second output', access: 'create' });
  extraOutput.done_criteria.push({ id: 'DONE-EXTRA', statement: 'A forbidden second output exists.' });
  extraOutput.outputs.push({ path: 'extra', description: 'forbidden second output', done_criterion_ids: ['DONE-EXTRA'] });
  write0600(extraOutputPath, Buffer.from(`${JSON.stringify(extraOutput)}\n`));
  assert.throws(() => validateTcbPacket(extraOutputPath), /sole exact @response output contract/);
  const invalidCounterDir = join(base, 'invalid-counter');
  mkdir700(invalidCounterDir);
  const invalidCounter = spawnSync(process.execPath, [VERIFIER, 'counter-sign-server',
    '--ready', join(invalidCounterDir, 'ready.json'), '--socket', join(invalidCounterDir, 'counter.sock'),
    '--tcb', TCB, '--repo-root', repo, '--target-commit', targetCommit,
    '--work-packet', invalidPacketPath, '--ttl-ms', '60000',
  ], { cwd: repo, encoding: 'utf8', input: '', env: process.env, timeout: 10_000 });
  assert.notEqual(invalidCounter.status, 0, 'independent verifier counter accepted invalid packet');

  const tcbSource = readFileSync(TCB, 'utf8');
  assert.doesNotMatch(tcbSource, /(?:import\s*\(|\bfrom\b|\bspawn(?:Sync)?\b|\bexec(?:File|Sync)?\b)[^\n]*agent-launcher\.mjs/);
  console.log(`AGENT_EVIDENCE_ATTACK_MATRIX_PASS ${attacks.length + 14}/${attacks.length + 14} + VALID_8_OF_8 + EXTERNAL_COUNTER_ONE_USE`);
} finally {
  const st = statSync(base);
  assert.ok(st.isDirectory() && realpathSync(base).startsWith('/private/tmp/ae2-'));
  rmSync(base, { recursive: true, force: false });
}
