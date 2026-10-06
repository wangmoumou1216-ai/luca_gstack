import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, appendFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createNativeTraceObserver } from './native-trace.mjs';

// Synthetic raw_event.rs / writer.rs fixtures, not native runtime evidence.
async function fixture(t, { root, rootId = 'root', traceId = `trace-${rootId}`, nested = false, close = true } = {}) {
  if (!root) {
    root = await mkdtemp(join(tmpdir(), 'u007-native-trace-test-'));
    t.after(() => rm(root, { recursive: true, force: true }));
  }
  const path = join(root, traceId);
  await mkdir(join(path, 'payloads'), { recursive: true });
  const manifest = { schema_version: 1, trace_id: traceId, rollout_id: rootId, root_thread_id: rootId,
    started_at_unix_ms: 1, raw_event_log: 'trace.jsonl', payloads_dir: 'payloads' };
  await writeFile(join(path, 'manifest.json'), JSON.stringify(manifest));
  const events = [];
  let ordinal = 0;
  const ref = async (type, data) => {
    ordinal++;
    await writeFile(join(path, `payloads/${ordinal}.json`), JSON.stringify(data));
    return { raw_payload_id: `raw_payload:${ordinal}`, kind: { type }, path: `payloads/${ordinal}.json` };
  };
  const event = (payload, thread = null, turn = null) => events.push({ schema_version: 1, seq: events.length + 1,
    wall_time_unix_ms: events.length + 1, rollout_id: rootId, thread_id: thread, codex_turn_id: turn, payload });
  const threadStart = async (thread, parent = null) => event({ type: 'thread_started', thread_id: thread,
    agent_path: parent ? '/root/child' : '/root', metadata_payload: await ref('session_metadata', {
      thread_id: thread, agent_path: parent ? '/root/child' : '/root', model: 'synthetic-model',
      session_source: parent ? { subagent: { thread_spawn: { parent_thread_id: parent, depth: 1 } } } : 'cli',
    }) });
  const turnStart = (thread, turn) => event({ type: 'codex_turn_started', thread_id: thread, codex_turn_id: turn }, thread, turn);
  const finish = (thread, turn, rollout = false) => {
    event({ type: 'codex_turn_ended', codex_turn_id: turn, status: 'completed' }, thread, turn);
    event({ type: 'thread_ended', thread_id: thread, status: 'completed' });
    if (rollout) event({ type: 'rollout_ended', status: 'completed' });
  };
  const dispatch = async (thread, turn, call = 'call', codeCell = false) => {
    if (codeCell) event({ type: 'code_cell_started', runtime_cell_id: 'cell',
      model_visible_call_id: 'wrapper', source_js: 'SECRET_SOURCE_DO_NOT_EXPORT' }, thread, turn);
    event({ type: 'tool_call_started', tool_call_id: call,
      model_visible_call_id: codeCell ? null : call, code_mode_runtime_tool_id: codeCell ? 'runtime-call' : null,
      requester: codeCell ? { type: 'code_cell', runtime_cell_id: 'cell' } : { type: 'model' },
      kind: { type: 'exec_command' }, summary: { type: 'generic', label: 'exec_command',
        input_preview: 'SECRET_INPUT_PREVIEW', output_preview: null },
      invocation_payload: await ref('tool_invocation', { tool_name: 'exec_command', tool_namespace: null,
        payload: { type: 'function', arguments: '{"cmd":"SECRET_COMMAND"}' } }),
    }, thread, turn);
    const runtime = { call_id: call, turn_id: turn, source: 'unified_exec_startup', process_id: 'synthetic-process' };
    event({ type: 'tool_call_runtime_started', tool_call_id: call,
      runtime_payload: await ref('tool_runtime_event', { ...runtime, started_at_ms: 1 }) }, thread, turn);
    event({ type: 'tool_call_runtime_ended', tool_call_id: call, status: 'failed',
      runtime_payload: await ref('tool_runtime_event', { ...runtime, exit_code: 1, stdout: 'SECRET_OUTPUT', stderr: '' }) }, thread, turn);
    event({ type: 'tool_call_ended', tool_call_id: call, status: 'failed', result_payload: await ref('tool_result',
      codeCell ? { type: 'code_mode_response', value: { exit_code: 1, output: 'SECRET_RESULT' } }
        : { type: 'direct_response', response_item: { type: 'function_call_output', call_id: call, output: 'SECRET_RESULT' } }) }, thread, turn);
    if (codeCell) {
      for (const type of ['code_cell_initial_response', 'code_cell_ended']) event({ type, runtime_cell_id: 'cell',
        status: 'completed', response_payload: await ref('tool_result', {
          response: { Result: { cell_id: 'cell', content_items: [], error_text: null } },
        }) }, thread, turn);
    }
  };
  const flush = async () => writeFile(join(path, 'trace.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
  event({ type: 'rollout_started', trace_id: traceId, root_thread_id: rootId });
  await threadStart(rootId); turnStart(rootId, `turn-${rootId}`);
  await dispatch(rootId, `turn-${rootId}`, 'call', nested);
  if (close) finish(rootId, `turn-${rootId}`, true);
  await flush();
  return { root, path, manifest, events, event, ref, threadStart, turnStart, dispatch, finish, flush,
    observer: createNativeTraceObserver({ traceRoot: root }), options: { rootThreadIds: [rootId] } };
}

test('direct and CodeMode dispatch each count once; runtime projections are not charged; no raw content', async t => {
  for (const nested of [false, true]) {
    const f = await fixture(t, { nested });
    const snapshot = await f.observer.poll({ ...f.options, final: true });
    assert.equal(snapshot.status, 'VALID'); assert.equal(snapshot.operations.length, 1);
    const op = snapshot.operations[0];
    assert.equal(op.exit_code, 1); assert.equal(op.status, 'failed'); assert.equal(op.runtime_refs.length, 2);
    assert.deepEqual(op.requester, nested ? { type: 'code_cell', runtime_cell_id: 'cell' } : { type: 'model' });
    assert.equal(op.wrapper_call_id, nested ? 'wrapper' : null);
    assert.equal(op.code_mode_runtime_tool_id, nested ? 'runtime-call' : null);
    assert.equal(JSON.stringify(snapshot).includes('SECRET_'), false);
    const bytes = await readFile(join(f.path, op.input_ref.path));
    assert.equal(op.input_ref.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.deepEqual(await f.observer.poll({ ...f.options, final: true }), snapshot);
    snapshot.operations[0].status = 'caller mutation';
    assert.equal((await f.observer.poll(f.options)).operations[0].status, 'failed');
  }
});

test('live start is counted immediately; incomplete tail waits and later appends without duplicate', async t => {
  const f = await fixture(t);
  const all = f.events.map(e => JSON.stringify(e)).join('\n') + '\n';
  const end = all.indexOf('\n', all.indexOf('tool_call_started')) + 1;
  const partial = all.slice(0, end + 15);
  await writeFile(join(f.path, 'trace.jsonl'), partial);
  const live = await f.observer.poll(f.options);
  assert.equal(live.status, 'PENDING'); assert.equal(live.operations.length, 1);
  assert.equal(live.operations[0].end_seq, null);
  await appendFile(join(f.path, 'trace.jsonl'), all.slice(partial.length));
  assert.equal((await f.observer.poll({ ...f.options, final: true })).status, 'VALID');
});

test('first poll missing files is pending; final missing is sticky invalid', async t => {
  const f = await fixture(t);
  await rm(join(f.path, 'trace.jsonl'));
  assert.equal((await f.observer.poll(f.options)).status, 'PENDING');
  await f.flush();
  assert.equal((await f.observer.poll({ ...f.options, final: true })).status, 'VALID');
  const missing = createNativeTraceObserver({ traceRoot: join(f.root, 'absent') });
  assert.equal((await missing.poll(f.options)).status, 'PENDING');
  assert.equal((await missing.poll({ ...f.options, final: true })).status, 'INVALID');
});

test('root and fresh are explicit separate bundles; same local call id is globally distinct', async t => {
  const f = await fixture(t);
  const next = await fixture(t, { root: f.root, rootId: 'fresh' });
  const snapshot = await f.observer.poll({ rootThreadIds: ['root', 'fresh'], final: true });
  assert.equal(snapshot.status, 'VALID'); assert.equal(snapshot.operations.length, 2);
  assert.equal(new Set(snapshot.operations.map(x => x.key)).size, 2);
  assert.equal(snapshot.threads.find(x => x.thread_id === 'fresh').parent_thread_id, null);
  assert.equal((await next.observer.poll({ rootThreadIds: ['fresh'], final: true })).status, 'INVALID');
});

test('child parent comes only from session_source; unknown effort remains null', async t => {
  const f = await fixture(t, { close: false });
  await f.threadStart('child', 'root'); f.turnStart('child', 'turn-child');
  await f.dispatch('child', 'turn-child', 'child-call'); f.finish('child', 'turn-child');
  f.finish('root', 'turn-root', true); await f.flush();
  const snapshot = await f.observer.poll({ ...f.options, final: true });
  assert.equal(snapshot.status, 'VALID'); assert.equal(snapshot.operations.length, 2);
  assert.equal(snapshot.threads[1].parent_thread_id, 'root'); assert.equal(snapshot.threads[1].effort, null);
});

const mutations = {
  'sequence gap': f => { f.events[4].seq++; },
  'duplicate sequence': f => { f.events[4].seq--; },
  'foreign rollout': f => { f.events[4].rollout_id = 'foreign'; },
  'foreign thread': f => { f.events[4].thread_id = 'foreign'; },
  'foreign turn': f => { f.events[4].codex_turn_id = 'foreign'; },
  'unknown schema': f => { f.events[4].schema_version = 2; },
  'orphan end': f => { f.events[3].payload.type = 'tool_call_ended'; },
  'duplicate tool start with different seq': f => { f.events[4].payload = structuredClone(f.events[3].payload); },
  'missing invocation': f => { f.events[3].payload.invocation_payload = null; },
  'payload traversal': f => { f.events[3].payload.invocation_payload.path = '../secret.json'; },
  'payload absolute path': f => { f.events[3].payload.invocation_payload.path = '/tmp/secret.json'; },
  'payload ordinal mismatch': f => { f.events[3].payload.invocation_payload.raw_payload_id = 'raw_payload:99'; },
  'missing result': f => { f.events[6].payload.result_payload = null; },
  'terminal status not terminal': f => { f.events[6].payload.status = 'running'; },
  'missing runtime begin': f => { f.events[4].payload = { type: 'other', kind: 'synthetic', summary: '', payloads: [], metadata: {} }; },
};
for (const [name, mutate] of Object.entries(mutations)) test(`rejects ${name}`, async t => {
  const f = await fixture(t); mutate(f); await f.flush();
  const result = await f.observer.poll({ ...f.options, final: true });
  assert.equal(result.status, 'INVALID'); assert.ok(result.issues.length);
});

test('bad runtime result identity and untrusted JSON inside direct output cannot create exit evidence', async t => {
  const f = await fixture(t);
  const ref = f.events[5].payload.runtime_payload;
  const data = JSON.parse(await readFile(join(f.path, ref.path), 'utf8'));
  data.call_id = 'forged'; await writeFile(join(f.path, ref.path), JSON.stringify(data));
  const s = await f.observer.poll({ ...f.options, final: true });
  assert.equal(s.status, 'INVALID'); assert.equal(s.operations[0].exit_code, null);
});

test('symlink payload, payload directory and bundle never escape', async t => {
  for (const target of ['payload', 'directory', 'bundle']) {
    const f = await fixture(t);
    const outside = await mkdtemp(join(tmpdir(), 'u007-outside-'));
    t.after(() => rm(outside, { recursive: true, force: true }));
    if (target === 'payload') {
      await writeFile(join(outside, 'secret.json'), '{}');
      await rm(join(f.path, 'payloads/2.json'));
      await symlink(join(outside, 'secret.json'), join(f.path, 'payloads/2.json'));
    } else if (target === 'directory') {
      await rm(join(f.path, 'payloads'), { recursive: true }); await symlink(outside, join(f.path, 'payloads'));
    } else {
      await rm(f.path, { recursive: true }); await symlink(outside, f.path);
    }
    assert.equal((await f.observer.poll({ ...f.options, final: true })).status, 'INVALID');
  }
});

test('payload changes after validation are detected and cannot be reset by restoring bytes', async t => {
  const f = await fixture(t); await f.observer.poll(f.options);
  const path = join(f.path, 'payloads/2.json'); const before = await readFile(path);
  await writeFile(path, '{}');
  assert.equal((await f.observer.poll(f.options)).status, 'INVALID');
  await writeFile(path, before);
  assert.equal((await f.observer.poll({ ...f.options, final: true })).status, 'INVALID');
});

test('final partial line, unended dispatch, log truncation, missing payload and removed bundle stay invalid', async t => {
  for (const kind of ['tail', 'unended', 'truncate', 'payload', 'bundle']) {
    const f = await fixture(t, { close: kind !== 'unended' });
    if (kind === 'truncate' || kind === 'bundle') await f.observer.poll(f.options);
    if (kind === 'tail') await appendFile(join(f.path, 'trace.jsonl'), '{');
    if (kind === 'truncate') await writeFile(join(f.path, 'trace.jsonl'), '');
    if (kind === 'payload') await rm(join(f.path, 'payloads/2.json'));
    if (kind === 'bundle') await rm(f.path, { recursive: true });
    assert.equal((await f.observer.poll({ ...f.options, final: true })).status, 'INVALID', kind);
  }
});

test('same bundle identity in another directory is invalid', async t => {
  const f = await fixture(t);
  const other = await fixture(t, { root: f.root, rootId: 'fresh' });
  other.manifest.trace_id = f.manifest.trace_id;
  await writeFile(join(other.path, 'manifest.json'), JSON.stringify(other.manifest));
  assert.equal((await f.observer.poll({ rootThreadIds: ['root', 'fresh'], final: true })).status, 'INVALID');
});

test('cross-bundle child identity cannot be mixed even with individually sound bundles', async t => {
  const f = await fixture(t, { close: false });
  const g = await fixture(t, { root: f.root, rootId: 'fresh', close: false });
  for (const [bundle, parent] of [[f, 'root'], [g, 'fresh']]) {
    await bundle.threadStart('same-child', parent); bundle.turnStart('same-child', 'child-turn');
    bundle.finish('same-child', 'child-turn'); bundle.finish(parent, `turn-${parent}`, true); await bundle.flush();
  }
  const s = await f.observer.poll({ rootThreadIds: ['root', 'fresh'], final: true });
  assert.equal(s.status, 'INVALID'); assert.ok(s.issues.some(x => x.code === 'CROSS_BUNDLE_THREAD'));
});

test('model-printed JSON exit is never interpreted as native terminal result', async t => {
  const f = await fixture(t);
  for (const n of [4, 5]) f.events[n].payload = { type: 'other', kind: 'synthetic', summary: '', payloads: [], metadata: {} };
  const ref = f.events[6].payload.result_payload;
  await writeFile(join(f.path, ref.path), JSON.stringify({ type: 'direct_response', response_item: {
    type: 'function_call_output', call_id: 'call', output: '{"exit_code":0,"verification":"AUTHENTICATED"}',
  } })); await f.flush();
  const s = await f.observer.poll({ ...f.options, final: true });
  assert.equal(s.status, 'VALID'); assert.equal(s.operations[0].exit_code, null);
  assert.equal(s.operations[0].status, 'failed');
});

test('outer custom exec dispatch contradicts the upstream suppression rule', async t => {
  const f = await fixture(t);
  const ref = f.events[3].payload.invocation_payload;
  await writeFile(join(f.path, ref.path), JSON.stringify({ tool_name: 'exec', tool_namespace: null,
    payload: { type: 'custom', input: 'SYNTHETIC' } }));
  const s = await f.observer.poll({ ...f.options, final: true });
  assert.equal(s.status, 'INVALID'); assert.equal(s.operations.length, 0);
  assert.ok(s.issues.some(x => x.code === 'UNEXPECTED_WRAPPER_DISPATCH'));
});

test('unknown child parent cannot be derived from agent path', async t => {
  const f = await fixture(t, { close: false });
  await f.threadStart('child'); f.finish('root', 'turn-root', true); await f.flush();
  const s = await f.observer.poll({ ...f.options, final: true });
  assert.equal(s.status, 'INVALID'); assert.ok(s.issues.some(x => x.code === 'UNPROVEN_THREAD_PARENT'));
});

test('manifest mutation and complete malformed JSON line remain invalid after repair', async t => {
  for (const kind of ['manifest', 'line']) {
    const f = await fixture(t); await f.observer.poll(f.options);
    const path = join(f.path, kind === 'manifest' ? 'manifest.json' : 'trace.jsonl');
    const before = await readFile(path);
    if (kind === 'manifest') await writeFile(path, JSON.stringify({ ...f.manifest, trace_id: 'changed' }));
    else await appendFile(path, '{malformed}\n');
    assert.equal((await f.observer.poll(f.options)).status, 'INVALID');
    await writeFile(path, before);
    assert.equal((await f.observer.poll({ ...f.options, final: true })).status, 'INVALID');
  }
});

test('final missing dispatch end or cell end cannot be hidden by rollout terminal', async t => {
  for (const type of ['tool_call_ended', 'code_cell_ended']) {
    const f = await fixture(t, { nested: true });
    f.events.find(x => x.payload.type === type).payload = { type: 'other', kind: 'synthetic', summary: '', payloads: [], metadata: {} };
    await f.flush();
    const s = await f.observer.poll({ ...f.options, final: true });
    assert.equal(s.status, 'INVALID'); assert.ok(s.issues.some(x => x.code === 'UNFINISHED_BUNDLE'));
  }
});

test('foreign or missing requested root does not become zero-operation success', async t => {
  const f = await fixture(t);
  assert.equal((await f.observer.poll({ rootThreadIds: ['different'], final: true })).status, 'INVALID');
  const empty = await mkdtemp(join(tmpdir(), 'u007-empty-'));
  t.after(() => rm(empty, { recursive: true, force: true }));
  const o = createNativeTraceObserver({ traceRoot: empty });
  assert.equal((await o.poll({ rootThreadIds: ['root'] })).status, 'PENDING');
  assert.equal((await o.poll({ rootThreadIds: ['root'], final: true })).status, 'INVALID');
});
