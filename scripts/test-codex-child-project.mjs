#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync,
  statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'codex-child-project-')));
const gstack = join(fixture, 'gstack');
const projects = join(fixture, 'projects');
const projectA = join(projects, 'projA');
const projectB = join(projects, 'projB');
const codexHome = join(fixture, 'codex-home');
const stateRoot = join(fixture, 'model-state');
const protectedStore = join(fixture, 'protected-codex-store');
const rootSid = `01${randomUUID().slice(2)}`;
const childSid = `01${randomUUID().slice(2)}`;
const turnId = `turn-${randomUUID()}`;
const toolUseId = `call_${randomUUID()}`;
const prompt = 'Continue the verified project task';
const agentType = 'quality-gate';
const taskName = 'review';
const rolloutDir = join(codexHome, 'sessions', '2026', '09', '28');
const rootRollout = join(rolloutDir, `rollout-2026-09-28T00-00-00-${rootSid}.jsonl`);
const childRollout = join(rolloutDir, `rollout-2026-09-28T00-00-01-${childSid}.jsonl`);

process.env.NODE_ENV = 'test';
process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
process.env.LUCA_MODEL_ROUTE_STATE_ROOT = stateRoot;
process.env.LUCA_PROJECTS_ROOT = projects;
process.env.LUCA_CHILD_PROJECT_STORE_ROOT = protectedStore;
process.env.LUCA_CHILD_PROJECT_TEST_CODEX_HOME = codexHome;

const {
  initializeProjectEventFence, queueProjectEventCandidate,
  readProjectState, closeAttestedProjectEvent,
} = await import('../.claude/hooks/lib/project-substrate.mjs');
const {
  prepareCodexChildProject, bindCodexChildProject, resolveCodexChildProject,
  revokeCodexChildProjectActivation,
} = await import('../.claude/hooks/lib/codex-child-project.mjs');
const {
  startActivation, pauseActivation, prepareInvocation, bindInvocationExternalIdentity,
  readActivation,
} = await import('./model-route-host.mjs');

const line = value => `${JSON.stringify(value)}\n`;
const receiptFolder = parent => join(protectedStore,
  createHash('sha256').update(gstack).digest('hex'), parent);
const writeRows = (path, rows) => writeFileSync(path, rows.map(line).join(''), { mode: 0o600 });
function binding(path, project) {
  const realpath = realpathSync(path);
  const stat = statSync(realpath);
  return { project, realpath, dev: Number(stat.dev), ino: Number(stat.ino), epoch: 1 };
}
function childRows(overrides = {}) {
  return [
    { type: 'session_meta', payload: {
      id: childSid, session_id: rootSid, cwd: gstack,
      parent_thread_id: rootSid, forked_from_id: rootSid, thread_source: 'subagent',
      source: { subagent: { thread_spawn: {
        parent_thread_id: rootSid, depth: 1, agent_role: agentType,
        agent_path: `/root/${taskName}`,
      } } },
      ...overrides,
    } },
    { type: 'event_msg', payload: { type: 'task_started', turn_id: `child-turn-${childSid}` } },
    { type: 'turn_context', payload: { turn_id: `child-turn-${childSid}` } },
  ];
}
function check(label, work) {
  work();
  process.stdout.write(`PASS ${label}\n`);
}

try {
  mkdirSync(join(gstack, '.claude'), { recursive: true });
  mkdirSync(join(projectA, 'docs'), { recursive: true });
  mkdirSync(join(projectB, 'docs'), { recursive: true });
  mkdirSync(rolloutDir, { recursive: true });
  const a = binding(projectA, 'projA');
  const b = binding(projectB, 'projB');
  writeFileSync(join(gstack, '.claude', `.session-project-${rootSid}`), line({
    schema_version: 2, state: 'BOUND', session_id: rootSid, binding: a,
    terminal: { tx: 'seed-switch', operation: 'switch', expected_epoch: 0,
      turn_id: 'seed-turn', committed_at: '2026-09-28T00:00:00Z' },
  }));
  initializeProjectEventFence({ gstackRoot: gstack, projectsRoot: projects,
    sessionId: rootSid, harness: 'codex', cwd: gstack, codexHome });
  const sourceId = `msg_${randomUUID()}`;
  const anchorId = randomUUID();
  const rootRows = [
    { type: 'session_meta', payload: { id: rootSid, session_id: rootSid, cwd: gstack,
      source: 'cli', thread_source: 'user', originator: 'codex-tui',
      parent_thread_id: null, forked_from_id: null } },
    { type: 'response_item', payload: { type: 'message', role: 'user', id: sourceId,
      content: [{ type: 'input_text', text: prompt }],
      internal_chat_message_metadata_passthrough: { turn_id: turnId } } },
    { type: 'turn_context', payload: { turn_id: turnId } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: rootSid,
      turn_id: turnId, item: { type: 'UserMessage', id: anchorId,
        content: [{ type: 'text', text: prompt }] } } },
    { type: 'response_item', payload: { type: 'function_call', name: 'functions.collaboration.spawn_agent',
      call_id: toolUseId, arguments: JSON.stringify({ agent_type: agentType, task_name: 'review' }),
      internal_chat_message_metadata_passthrough: { turn_id: turnId } } },
  ];
  writeRows(rootRollout, rootRows);
  queueProjectEventCandidate({ gstackRoot: gstack, projectsRoot: projects,
    sessionId: rootSid, boundaryId: turnId, cwd: gstack, harness: 'codex',
    prompt, intent: { kind: 'turn' } });
  startActivation({ harness: 'codex', root_session_id: rootSid,
    root_anchor: { model: 'fixture-model', source: 'fixture' },
    release_digest: 'a'.repeat(64), state_root: stateRoot });

  const prepared = prepareCodexChildProject({ gstackRoot: gstack, projectsRoot: projects,
    parentSessionId: rootSid, turnId, toolUseId, agentType, taskName, cwd: gstack, codexHome });
  check('prepare requires and freezes a native-attested parent turn', () => {
    assert.equal(readProjectState(gstack, rootSid).value.state, 'TURN_ACTIVE');
    assert.match(prepared.receiptDigest, /^[a-f0-9]{64}$/);
    assert.equal(existsSync(join(receiptFolder(rootSid),
      `${createHash('sha256').update(toolUseId).digest('hex')}.receipt.json`)), true);
    assert.equal(existsSync(join(gstack, '.claude', 'codex-child-project')), false);
    assert.equal(statSync(protectedStore).mode & 0o077, 0);
  });
  check('bind refuses a parent with no native spawn call', () => {
    writeRows(rootRollout, rootRows.slice(0, -1));
    assert.throws(() => bindCodexChildProject({ gstackRoot: gstack,
      parentSessionId: rootSid, turnId, agentId: childSid, agentType, toolUseId, codexHome }),
    { code: 'SPAWN_WITNESS' });
    writeRows(rootRollout, rootRows);
  });
  const bound = bindCodexChildProject({ gstackRoot: gstack,
    parentSessionId: rootSid, turnId, agentId: childSid, agentType, toolUseId, codexHome });
  writeRows(childRollout, childRows());
  check('native child ancestry resolves the frozen physical project', () => {
    const resolved = resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome });
    assert.equal(resolved.binding.realpath, a.realpath);
    assert.equal(resolved.origin, 'codex-child');
    assert.equal(resolved.parentSessionId, rootSid);
    assert.equal(resolved.receiptDigest, bound.receiptDigest);
  });
  check('large history preserves child association and duplicate source rejection', () => {
    const sessions = join(codexHome, 'sessions'), history = join(sessions, '2024', '01', '01');
    mkdirSync(history, { recursive: true });
    for (let i = 0; i < 8193; i++) writeFileSync(join(history, `rollout-history-${i}.jsonl`), '');
    for (let year = 4000; year < 6050; year++) mkdirSync(join(sessions, String(year)));
    const resolveChild = () => resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome });
    try {
      assert.equal(resolveChild().binding.realpath, a.realpath);
      const duplicate = join(history, `rollout-duplicate-${childSid}.jsonl`);
      writeFileSync(duplicate, readFileSync(childRollout));
      assert.throws(resolveChild, { code: 'SOURCE_NOT_UNIQUE' });
      rmSync(duplicate);
      assert.equal(resolveChild().binding.realpath, a.realpath);
    } finally {
      rmSync(join(sessions, '2024'), { recursive: true, force: true });
      for (let year = 4000; year < 6050; year++) rmSync(join(sessions, String(year)), { recursive: true });
    }
  });
  check('a writable provider Codex home cannot replace native rollout evidence', () => {
    const providerHome = join(fixture, 'provider-codex-home');
    const providerRollouts = join(providerHome, 'sessions', '2026', '09', '28');
    mkdirSync(providerRollouts, { recursive: true });
    writeRows(join(providerRollouts, `rollout-2026-09-28T00-00-01-${childSid}.jsonl`),
      childRows());
    const trusted = readFileSync(rootRollout);
    appendFileSync(rootRollout, line({ type: 'turn_aborted', payload: { turn_id: turnId } }));
    try {
      assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
        projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome }), null);
      assert.throws(() => resolveCodexChildProject({ gstackRoot: gstack,
        projectsRoot: projects, childSessionId: childSid, cwd: gstack,
        codexHome: providerHome }), { code: 'SOURCE_ROOT' });
    } finally { writeFileSync(rootRollout, trusted); }
  });
  check('child cannot borrow an active parent turn for project selection', () => {
    const stateFile = join(gstack, '.claude', `.session-project-${rootSid}`);
    const before = readFileSync(stateFile);
    const invoke = command => spawnSync(process.execPath,
      [join(REPO, '.claude/hooks/project-scope-guard.mjs')], {
        cwd: gstack, encoding: 'utf8',
        input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: rootSid,
          turn_id: `child-turn-${childSid}`, transcript_path: childRollout,
          cwd: gstack, tool_name: 'Bash', tool_input: { command } }),
        env: { ...process.env, CLAUDE_PROJECT_DIR: gstack, LUCA_ACTUAL_HARNESS: 'codex',
          CODEX_HOME: codexHome },
      });
    for (const command of [
      'bash scripts/project.sh switch projB',
      'bash scripts/project.sh new projB',
      `./scripts/project.sh switch projB --session-id ${rootSid} --tx tx-forged-0001 --expected-epoch 1`,
    ]) {
      const result = invoke(command);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout.trim()).hookSpecificOutput.permissionDecision,
        'deny', command);
      assert.deepEqual(readFileSync(stateFile), before, 'child must not mutate parent state');
    }
  });
  check('direct child may omit forked_from_id but must prove its task path', () => {
    const rows = childRows();
    delete rows[0].payload.forked_from_id;
    writeRows(childRollout, rows);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome }).binding.project,
    'projA');
    rows[0].payload.source.subagent.thread_spawn.agent_path = null;
    writeRows(childRollout, rows);
    assert.throws(() => resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome }),
    { code: 'CLAIM_MISMATCH' });
    writeRows(childRollout, childRows());
  });
  check('same-parent same-role exec child cannot borrow a direct child claim', () => {
    const impostorSid = `impostor-${randomUUID().slice(0, 8)}`;
    const impostorRollout = join(rolloutDir, `rollout-2026-09-28T00-00-04-${impostorSid}.jsonl`);
    const directDigest = createHash('sha256').update(toolUseId).digest('hex');
    const claimFile = join(receiptFolder(rootSid),
      `${directDigest}.receipt.json.claim`);
    const originalClaim = readFileSync(claimFile);
    writeFileSync(claimFile, line({ ...JSON.parse(originalClaim.toString('utf8')),
      childSessionId: impostorSid }));
    writeRows(impostorRollout, [
      { type: 'session_meta', payload: {
        id: impostorSid, session_id: rootSid, parent_thread_id: rootSid,
        thread_source: 'subagent', cwd: gstack,
        source: { subagent: { thread_spawn: { parent_thread_id: rootSid,
          depth: 1, agent_role: agentType, agent_path: null } } },
      } },
      { type: 'event_msg', payload: { type: 'task_started', turn_id: 'impostor-turn' } },
      { type: 'turn_context', payload: { turn_id: 'impostor-turn' } },
    ]);
    try {
      assert.throws(() => resolveCodexChildProject({ gstackRoot: gstack,
        projectsRoot: projects, childSessionId: impostorSid, cwd: gstack, codexHome }),
      { code: 'CLAIM_MISMATCH' });
    } finally {
      writeFileSync(claimFile, originalClaim);
    }
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome }).binding.project,
    'projA');
  });
  check('forged native parent and cwd fail closed', () => {
    writeRows(childRollout, childRows({ parent_thread_id: 'forged-parent' }));
    assert.throws(() => resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome }));
    writeRows(childRollout, childRows());
    writeRows(childRollout, childRows({ source: { subagent: { thread_spawn: {
      parent_thread_id: rootSid, depth: 1, agent_role: agentType, agent_path: '/root/other',
    } } } }));
    assert.throws(() => resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: gstack, codexHome }),
    { code: 'CLAIM_MISMATCH' });
    writeRows(childRollout, childRows());
    assert.throws(() => resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, cwd: projectB, codexHome }),
    { code: 'CWD_MISMATCH' });
  });
  check('exec child needs a protected PreToolUse receipt and native SubagentStart claim', () => {
    const execTool = `exec-${randomUUID()}`;
    const execChild = `exec-child-${randomUUID().slice(0, 8)}`;
    const execRollout = join(rolloutDir, `rollout-2026-09-28T00-00-03-${execChild}.jsonl`);
    // No response_item/function_call spawn for this tool ID. The native source
    // has only a custom_tool_call exec; its input text is never parsed here.
    appendFileSync(rootRollout, line({ type: 'response_item', payload: {
      type: 'custom_tool_call', name: 'exec', call_id: execTool,
      input: 'opaque orchestration program',
    } }));
    const route = {
      disposition: 'READY', requested_model: 'fixture-model', requested_role: 'anchor',
      harness: 'codex-native', critical: false,
      policy_sha: 'b'.repeat(64), routing_config_sha: 'c'.repeat(64),
      capability_evidence_sha: 'd'.repeat(64),
    };
    const invocation = prepareInvocation({ harness: 'codex', root_session_id: rootSid,
      release_digest: 'a'.repeat(64), route,
      task_id: `native:${turnId}:${execTool}`, input_sha: 'e'.repeat(64),
      state_root: stateRoot });
    assert.equal(invocation.disposition, 'READY');
    for (const [field, value] of [
      ['tool_use_id', execTool], ['agent_type', 'default'], ['agent_id', execChild],
    ]) {
      assert.equal(bindInvocationExternalIdentity({ harness: 'codex',
        root_session_id: rootSid, invocation_id: invocation.envelope.invocation_id,
        field, value, state_root: stateRoot }).disposition, 'BOUND');
    }
    const execRows = [
      { type: 'session_meta', payload: {
        id: execChild, session_id: rootSid, parent_thread_id: rootSid,
        thread_source: 'subagent', cwd: gstack,
        source: { subagent: { thread_spawn: { parent_thread_id: rootSid,
          depth: 1, agent_role: null, agent_path: null } } },
      } },
      { type: 'event_msg', payload: { type: 'task_started', turn_id: 'exec-child-turn' } },
      { type: 'turn_context', payload: { turn_id: 'exec-child-turn' } },
    ];
    writeRows(execRollout, execRows);
    // The model-route file is tool-writable. Its complete, accepted ticket
    // cannot create an association without a protected hook receipt.
    const stateFile = join(stateRoot, 'codex',
      `${createHash('sha256').update(rootSid).digest('hex')}.json`);
    const state = readActivation({ harness: 'codex', root_session_id: rootSid,
      state_root: stateRoot });
    state.invocations[invocation.envelope.invocation_id].status = 'accepted';
    writeFileSync(stateFile, `${JSON.stringify(state)}\n`);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: execChild, codexHome }), null);
    assert.equal(bindCodexChildProject({ gstackRoot: gstack,
      parentSessionId: rootSid, turnId, agentId: execChild,
      agentType: 'default', toolUseId: execTool, codexHome }), null);
    const preparedExec = prepareCodexChildProject({ gstackRoot: gstack, projectsRoot: projects,
      parentSessionId: rootSid, turnId, toolUseId: execTool,
      agentType: 'default', taskName: 'execchild', cwd: gstack, codexHome });
    const boundExec = bindCodexChildProject({ gstackRoot: gstack,
      parentSessionId: rootSid, turnId, agentId: execChild,
      agentType: 'default', toolUseId: execTool, codexHome });
    assert.equal(boundExec.receiptDigest, preparedExec.receiptDigest);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: execChild, cwd: gstack,
      codexHome }).binding.project, 'projA');
  });
  check('same-role exec siblings remain unbound when protected pending receipts are ambiguous', () => {
    const first = `exec-${randomUUID()}`;
    const second = `exec-${randomUUID()}`;
    for (const toolUseId of [first, second]) {
      prepareCodexChildProject({ gstackRoot: gstack, projectsRoot: projects,
        parentSessionId: rootSid, turnId, toolUseId, agentType: 'worker',
        taskName: `worker_${toolUseId.slice(-8)}`, cwd: gstack, codexHome });
    }
    assert.throws(() => bindCodexChildProject({ gstackRoot: gstack,
      parentSessionId: rootSid, turnId, agentId: `sibling-${randomUUID().slice(0, 8)}`,
      agentType: 'worker', toolUseId: first, codexHome }), { code: 'SPAWN_AMBIGUOUS' });
  });
  check('an old-turn protected receipt cannot be claimed by a later native spawn', () => {
    const toolUseId = `exec-${randomUUID()}`;
    prepareCodexChildProject({ gstackRoot: gstack, projectsRoot: projects,
      parentSessionId: rootSid, turnId, toolUseId, agentType: 'analyst',
      taskName: 'oldturn', cwd: gstack, codexHome });
    const before = readFileSync(rootRollout);
    appendFileSync(rootRollout, line({ type: 'turn_context',
      payload: { turn_id: `later-${randomUUID()}` } }));
    try {
      assert.throws(() => bindCodexChildProject({ gstackRoot: gstack,
        parentSessionId: rootSid, turnId, agentId: `old-${randomUUID().slice(0, 8)}`,
        agentType: 'analyst', toolUseId, codexHome }), { code: 'PARENT_CLOSED' });
    } finally { writeFileSync(rootRollout, before); }
  });
  check('a project switch before SubagentStart cannot retarget a protected receipt', () => {
    const toolUseId = `exec-${randomUUID()}`;
    prepareCodexChildProject({ gstackRoot: gstack, projectsRoot: projects,
      parentSessionId: rootSid, turnId, toolUseId, agentType: 'auditor',
      taskName: 'crossproject', cwd: gstack, codexHome });
    const stateFile = join(gstack, '.claude', `.session-project-${rootSid}`);
    const before = readFileSync(stateFile);
    writeFileSync(stateFile, line({ ...JSON.parse(before.toString('utf8')), binding: b }));
    try {
      assert.throws(() => bindCodexChildProject({ gstackRoot: gstack,
        parentSessionId: rootSid, turnId, agentId: `cross-${randomUUID().slice(0, 8)}`,
        agentType: 'auditor', toolUseId, codexHome }), { code: 'PARENT_CLOSED' });
    } finally { writeFileSync(stateFile, before); }
  });
  const parentActive = readProjectState(gstack, rootSid).value;
  closeAttestedProjectEvent({ gstackRoot: gstack, projectsRoot: projects,
    sessionId: rootSid, eventId: parentActive.event_control.current.event_id,
    boundaryId: turnId });
  check('ordinary parent Stop and later project switch do not retarget the child', () => {
    const closed = readProjectState(gstack, rootSid).value;
    writeFileSync(join(gstack, '.claude', `.session-project-${rootSid}`), line({
      ...closed, binding: b, turn: { ...closed.turn, epoch: b.epoch },
    }));
    const resolved = resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome });
    assert.equal(resolved.binding.project, 'projA');
  });
  check('a later task completion does not permanently remove child association', () => {
    appendFileSync(childRollout, line({ type: 'event_msg', payload: { type: 'task_complete' } }));
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }).active, false);
    appendFileSync(childRollout, line({ type: 'event_msg', payload: { type: 'task_started',
      turn_id: 'child-followup' } }));
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }).active, true);
  });
  let nestedSid = '';
  check('a nested child inherits the same frozen project through a proven native edge', () => {
    nestedSid = `nested-${randomUUID().slice(0, 8)}`;
    const nestedCall = `call_${randomUUID()}`;
    const nestedTurn = 'child-followup';
    const nestedRollout = join(rolloutDir, `rollout-2026-09-28T00-00-02-${nestedSid}.jsonl`);
    appendFileSync(childRollout, line({ type: 'turn_context', payload: { turn_id: nestedTurn } }));
    appendFileSync(childRollout, line({ type: 'response_item', payload: {
      type: 'function_call', name: 'spawn_agent', call_id: nestedCall,
      arguments: JSON.stringify({ task_name: 'nested', agent_type: 'default' }),
      internal_chat_message_metadata_passthrough: { turn_id: nestedTurn },
    } }));
    const preparedNested = prepareCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, parentSessionId: childSid, turnId: nestedTurn,
      toolUseId: nestedCall, agentType: 'default', taskName: 'nested',
      cwd: gstack, codexHome });
    assert.match(preparedNested.receiptDigest, /^[a-f0-9]{64}$/);
    bindCodexChildProject({ gstackRoot: gstack, parentSessionId: childSid,
      turnId: nestedTurn, agentId: nestedSid, agentType: 'default',
      toolUseId: nestedCall, codexHome });
    writeRows(nestedRollout, [
      { type: 'session_meta', payload: {
        id: nestedSid, session_id: childSid, cwd: gstack,
        parent_thread_id: childSid, forked_from_id: childSid, thread_source: 'subagent',
        source: { subagent: { thread_spawn: { parent_thread_id: childSid,
          depth: 2, agent_role: 'default', agent_path: '/root/review/nested' } } },
      } },
      { type: 'event_msg', payload: { type: 'task_started', turn_id: 'nested-turn' } },
      { type: 'turn_context', payload: { turn_id: 'nested-turn' } },
    ]);
    const nested = resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: nestedSid, cwd: gstack, codexHome });
    assert.equal(nested.binding.project, 'projA');
    assert.equal(nested.parentSessionId, childSid);
    assert.equal(nested.rootSessionId, rootSid);
  });
  check('scope guard points child docs access to the frozen project', () => {
    const result = spawnSync(process.execPath, [join(REPO, '.claude/hooks/project-scope-guard.mjs')], {
      cwd: gstack, encoding: 'utf8',
      input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: childSid,
        turn_id: `child-turn-${childSid}`, cwd: gstack, tool_name: 'Bash',
        tool_input: { command: 'cat docs/PROGRESS.md' } }),
      env: { ...process.env, CLAUDE_PROJECT_DIR: gstack, LUCA_ACTUAL_HARNESS: 'codex',
        CODEX_HOME: codexHome },
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout.trim());
    assert.equal(output.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.equal(output.hookSpecificOutput.updatedInput?.command,
      `cat ${join(projectA, 'docs', 'PROGRESS.md')}`, JSON.stringify(output));
  });
  check('scope guard uses native child transcript when Codex reports parent session ID', () => {
    const invoke = transcriptPath => spawnSync(process.execPath,
      [join(REPO, '.claude/hooks/project-scope-guard.mjs')], {
        cwd: gstack, encoding: 'utf8',
        input: JSON.stringify({ hook_event_name: 'PreToolUse', session_id: rootSid,
          turn_id: `child-turn-${childSid}`, transcript_path: transcriptPath,
          cwd: gstack, tool_name: 'Bash', tool_input: { command: 'cat docs/PROGRESS.md' } }),
        env: { ...process.env, CLAUDE_PROJECT_DIR: gstack, LUCA_ACTUAL_HARNESS: 'codex',
          CODEX_HOME: codexHome },
      });
    const valid = invoke(childRollout);
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(JSON.parse(valid.stdout.trim()).hookSpecificOutput.updatedInput?.command,
      `cat ${join(projectA, 'docs', 'PROGRESS.md')}`);
    const forged = invoke(join(rolloutDir,
      `rollout-2026-09-28T00-00-05-01${randomUUID().slice(2)}.jsonl`));
    assert.equal(forged.status, 0, forged.stderr);
    assert.match(JSON.parse(forged.stdout.trim()).hookSpecificOutput.permissionDecisionReason,
      /CHILD_UNVERIFIED/);
  });
  check('host status reports verified child association without execution authority', () => {
    const result = spawnSync(process.execPath, [join(REPO, 'scripts/project-pin.mjs'),
      'status', '--view', 'host', '--session-id', childSid], {
      cwd: gstack, encoding: 'utf8',
      env: { ...process.env, LUCA_GSTACK_ROOT: gstack,
        CLAUDE_PROJECT_DIR: gstack, CODEX_HOME: codexHome },
    });
    assert.equal(result.status, 0, result.stderr);
    const status = JSON.parse(result.stdout);
    assert.equal(status.state, 'CHILD_ASSOCIATED');
    assert.equal(status.binding_validation, 'VERIFIED');
    assert.equal(status.current_binding.project, 'projA');
    assert.equal(status.execution_authority, 'NOT_PROVIDED');
  });
  check('an intermediate child abort revokes its descendant through ancestor revalidation', () => {
    const before = readFileSync(childRollout);
    appendFileSync(childRollout, line({ type: 'turn_aborted',
      payload: { turn_id: `child-turn-${childSid}` } }));
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: nestedSid, codexHome }), null);
    writeFileSync(childRollout, before);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: nestedSid, codexHome }).binding.project, 'projA');
  });
  check('native parent cancellation and activation pause revoke association', () => {
    appendFileSync(rootRollout, line({ type: 'turn_aborted', payload: { turn_id: turnId } }));
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }), null);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: nestedSid, codexHome }), null);
    writeRows(rootRollout, rootRows);
    const revoked = revokeCodexChildProjectActivation({ gstackRoot: gstack,
      rootSessionId: rootSid });
    assert.equal(revoked.revoked, true);
    assert.ok(revoked.revokedCount >= 1);
    pauseActivation({ harness: 'codex', root_session_id: rootSid, state_root: stateRoot });
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }), null);
    const stateFile = join(stateRoot, 'codex',
      `${createHash('sha256').update(rootSid).digest('hex')}.json`);
    const paused = JSON.parse(readFileSync(stateFile, 'utf8'));
    writeFileSync(stateFile, line({ ...paused, status: 'active' }));
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }), null);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: nestedSid, codexHome }), null);
    startActivation({ harness: 'codex', root_session_id: rootSid,
      root_anchor: { model: 'fixture-model', source: 'resume' },
      release_digest: 'a'.repeat(64), state_root: stateRoot });
    assert.notEqual(readActivation({ harness: 'codex', root_session_id: rootSid,
      state_root: stateRoot }).activation_id, paused.activation_id);
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }), null);
    writeFileSync(stateFile, line({ ...paused, status: 'active' }));
    assert.equal(resolveCodexChildProject({ gstackRoot: gstack,
      projectsRoot: projects, childSessionId: childSid, codexHome }), null);
    assert.throws(() => bindCodexChildProject({ gstackRoot: gstack,
      parentSessionId: rootSid, turnId, agentId: childSid,
      agentType, toolUseId, codexHome }), { code: 'ACTIVATION_INACTIVE' });
  });
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
