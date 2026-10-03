// Consumer of OpenAI codex rust-v0.160.0 rollout-trace (raw_event, writer,
// tool_dispatch, thread, protocol_event). This is not a runtime coverage proof.
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join, relative, sep } from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const id = value => typeof value === 'string' && value.length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const terminal = new Set(['completed', 'failed', 'cancelled', 'aborted']);
const rolloutTerminal = new Set(['completed', 'failed', 'aborted']);
const refFields = {
  thread_started: ['metadata_payload'], inference_started: ['request_payload'],
  inference_completed: ['response_payload'], inference_failed: ['partial_response_payload'],
  inference_cancelled: ['partial_response_payload'], tool_call_started: ['invocation_payload'],
  tool_call_ended: ['result_payload'], tool_call_runtime_started: ['runtime_payload'],
  tool_call_runtime_ended: ['runtime_payload'], code_cell_initial_response: ['response_payload'],
  code_cell_ended: ['response_payload'], compaction_request_started: ['request_payload'],
  compaction_request_completed: ['response_payload'], compaction_installed: ['checkpoint_payload'],
  agent_result_observed: ['carried_payload'], protocol_event_observed: ['event_payload'],
};
const eventTypes = new Set([...Object.keys(refFields), 'rollout_started', 'rollout_ended',
  'thread_ended', 'codex_turn_started', 'codex_turn_ended', 'code_cell_started',
  'mcp_tool_call_correlation_assigned', 'compaction_request_failed', 'other']);
const payloadKinds = new Set(['inference_request', 'inference_response', 'compaction_request',
  'compaction_checkpoint', 'compaction_response', 'tool_invocation', 'tool_result',
  'tool_runtime_event', 'terminal_runtime_event', 'protocol_event', 'session_metadata', 'agent_result']);

function requireFact(test, code) {
  if (!test) throw Object.assign(new Error(code), { traceCode: code });
}

// No symlink component, special file, or traversal may redirect a bundle read.
async function readInside(root, path) {
  requireFact(!(await lstat(root)).isSymbolicLink() && await realpath(root) === root, 'SYMLINK_PATH');
  const full = resolve(root, path);
  const rel = relative(root, full);
  requireFact(rel && rel !== '..' && !rel.startsWith(`..${sep}`), 'PATH_ESCAPE');
  let current = root;
  const components = rel.split(sep);
  for (const [index, part] of components.entries()) {
    current = join(current, part);
    const stat = await lstat(current);
    requireFact(!stat.isSymbolicLink(), 'SYMLINK_PATH');
    requireFact(index === components.length - 1 ? stat.isFile() : stat.isDirectory(), 'NONREGULAR_PATH');
  }
  const file = await open(full, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    requireFact((await file.stat()).isFile(), 'NONREGULAR_PATH');
    requireFact(await realpath(full) === full, 'PATH_ESCAPE');
    return await file.readFile();
  } finally { await file.close(); }
}

function decode(bytes) {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

/** Cumulative, detached snapshots. PENDING includes a structurally sound live
 * bundle; operations are visible immediately at dispatch start. INVALID sticks.
 * Hashes attest bytes observed here, not a signature supplied by the writer.
 * Trust requires a driver-owned directory excluded from candidate read/write.
 */
export function createNativeTraceObserver({ traceRoot }) {
  requireFact(id(traceRoot), 'TRACE_ROOT_REQUIRED');
  const root = resolve(traceRoot);
  const bundles = new Map();
  const roots = new Set();
  const issues = new Map();
  let queue = Promise.resolve();
  function issue(code, path = root, seq = null) {
    const value = { code, path, seq };
    issues.set(JSON.stringify(value), value);
  }

  async function payload(bundle, ref) {
    requireFact(object(ref) && /^raw_payload:[1-9]\d*$/.test(ref.raw_payload_id)
      && object(ref.kind) && payloadKinds.has(ref.kind.type), 'INVALID_PAYLOAD_REF');
    requireFact(ref.path === `payloads/${ref.raw_payload_id.slice(12)}.json`, 'INVALID_PAYLOAD_PATH');
    const bytes = await readInside(bundle.path, ref.path);
    const sha256 = hash(bytes);
    const prior = bundle.payloads.get(ref.raw_payload_id);
    requireFact(!prior || (prior.ref.sha256 === sha256 && prior.ref.kind.type === ref.kind.type
      && prior.ref.path === ref.path), 'PAYLOAD_CHANGED');
    const value = { ref: { raw_payload_id: ref.raw_payload_id, kind: { type: ref.kind.type },
      path: ref.path, sha256, bytes: bytes.length }, data: decode(bytes) };
    bundle.payloads.set(ref.raw_payload_id, value);
    return value;
  }

  async function consume(b, event) {
    const p = event.payload;
    requireFact(event.schema_version === 1 && Number.isSafeInteger(event.seq)
      && event.seq === b.seq + 1 && Number.isSafeInteger(event.wall_time_unix_ms), 'INVALID_SEQUENCE_OR_SCHEMA');
    requireFact(event.rollout_id === b.manifest.rollout_id, 'FOREIGN_ROLLOUT');
    requireFact(object(p) && eventTypes.has(p.type), 'UNKNOWN_EVENT_TYPE');
    requireFact(!b.end_seq, 'EVENT_AFTER_ROLLOUT_END');
    requireFact(b.seq > 0 || p.type === 'rollout_started', 'MISSING_ROLLOUT_START');
    const thread = event.thread_id ?? null;
    const turn = event.codex_turn_id ?? null;
    if (thread !== null) requireFact(b.threads.has(thread), 'UNKNOWN_THREAD');
    if (turn !== null && p.type !== 'codex_turn_started') {
      requireFact(b.turns.has(turn) && b.turns.get(turn).thread_id === thread, 'FOREIGN_TURN');
    }
    const refs = {};
    for (const field of refFields[p.type] ?? []) {
      if (p[field] != null) refs[field] = await payload(b, p[field]);
    }
    if (p.type === 'other') {
      requireFact(Array.isArray(p.payloads), 'INVALID_PAYLOAD_REF');
      for (const ref of p.payloads) await payload(b, ref);
    }
    const context = () => requireFact(id(thread) && id(turn) && b.turns.has(turn)
      && b.turns.get(turn).thread_id === thread, 'MISSING_TOOL_CONTEXT');
    const operation = () => {
      context();
      const op = b.operations.get(p.tool_call_id);
      requireFact(op && op.thread_id === thread && op.turn_id === turn, 'UNMATCHED_TOOL_EVENT');
      return op;
    };
    switch (p.type) {
      case 'rollout_started':
        requireFact(b.seq === 0 && p.trace_id === b.manifest.trace_id
          && p.root_thread_id === b.manifest.root_thread_id, 'ROLLOUT_IDENTITY_CONFLICT');
        b.start_seq = event.seq;
        break;
      case 'thread_started': {
        requireFact(id(p.thread_id) && id(p.agent_path) && !b.threads.has(p.thread_id), 'DUPLICATE_THREAD');
        const meta = refs.metadata_payload;
        requireFact(meta?.ref.kind.type === 'session_metadata' && object(meta.data)
          && meta.data.thread_id === p.thread_id && meta.data.agent_path === p.agent_path, 'INVALID_THREAD_METADATA');
        const parent = meta.data.session_source?.subagent?.thread_spawn?.parent_thread_id ?? null;
        if (parent !== null) requireFact(id(parent) && b.threads.has(parent), 'UNKNOWN_PARENT');
        if (p.thread_id !== b.manifest.root_thread_id) requireFact(parent !== null, 'UNPROVEN_THREAD_PARENT');
        b.threads.set(p.thread_id, { bundle_id: b.manifest.trace_id, thread_id: p.thread_id,
          parent_thread_id: parent, agent_path: p.agent_path, start_seq: event.seq, end_seq: null,
          status: 'running', metadata_ref: meta.ref, model: meta.data.model ?? null, effort: null });
        break;
      }
      case 'thread_ended': {
        const t = b.threads.get(p.thread_id);
        requireFact(t && !t.end_seq && rolloutTerminal.has(p.status), 'UNMATCHED_THREAD_END');
        t.end_seq = event.seq; t.status = p.status;
        break;
      }
      case 'codex_turn_started':
        requireFact(id(p.codex_turn_id) && b.threads.has(p.thread_id)
          && !b.threads.get(p.thread_id).end_seq && !b.turns.has(p.codex_turn_id)
          && thread === p.thread_id && turn === p.codex_turn_id, 'INVALID_TURN_START');
        b.turns.set(turn, { thread_id: thread, start_seq: event.seq, end_seq: null, status: 'running' });
        break;
      case 'codex_turn_ended': {
        const t = b.turns.get(p.codex_turn_id);
        requireFact(t && !t.end_seq && turn === p.codex_turn_id && terminal.has(p.status), 'UNMATCHED_TURN_END');
        t.end_seq = event.seq; t.status = p.status;
        break;
      }
      case 'code_cell_started':
        context();
        requireFact(id(p.runtime_cell_id) && id(p.model_visible_call_id)
          && !b.cells.has(p.runtime_cell_id), 'DUPLICATE_CODE_CELL');
        b.cells.set(p.runtime_cell_id, { thread, turn, model_visible_call_id: p.model_visible_call_id,
          end_seq: null });
        break;
      case 'code_cell_initial_response':
      case 'code_cell_ended': {
        context();
        const cell = b.cells.get(p.runtime_cell_id);
        requireFact(cell && cell.thread === thread && cell.turn === turn && !cell.end_seq, 'UNMATCHED_CODE_CELL');
        requireFact(refs.response_payload?.ref.kind.type === 'tool_result', 'MISSING_CELL_RESULT');
        const response = refs.response_payload.data?.response;
        const variant = response && Object.keys(response);
        requireFact(object(response) && variant.length === 1
          && ['Result', 'Yielded', 'Terminated'].includes(variant[0])
          && object(response[variant[0]]) && Array.isArray(response[variant[0]].content_items), 'INVALID_CELL_RESULT');
        if (p.type === 'code_cell_ended') {
          requireFact(['completed', 'failed', 'terminated'].includes(p.status), 'INVALID_CELL_END');
          cell.end_seq = event.seq;
        }
        break;
      }
      case 'tool_call_started': {
        context();
        requireFact(!b.turns.get(turn).end_seq && !b.threads.get(thread).end_seq, 'TOOL_AFTER_TERMINAL');
        requireFact(id(p.tool_call_id) && !b.operations.has(p.tool_call_id), 'DUPLICATE_TOOL_CALL');
        const input = refs.invocation_payload;
        requireFact(input?.ref.kind.type === 'tool_invocation' && object(input.data)
          && id(input.data.tool_name) && (input.data.tool_namespace == null || id(input.data.tool_namespace))
          && object(input.data.payload), 'MISSING_TOOL_INPUT');
        // The upstream writer suppresses only an unnamespaced custom exec.
        requireFact(!(input.data.tool_name === 'exec' && input.data.tool_namespace == null
          && input.data.payload.type === 'custom'), 'UNEXPECTED_WRAPPER_DISPATCH');
        requireFact(['model', 'code_cell'].includes(p.requester?.type), 'INVALID_REQUESTER');
        let wrapper = null;
        if (p.requester.type === 'code_cell') {
          const cell = b.cells.get(p.requester.runtime_cell_id);
          requireFact(cell && cell.thread === thread && cell.turn === turn && !cell.end_seq
            && id(p.code_mode_runtime_tool_id) && p.model_visible_call_id == null, 'UNMATCHED_REQUESTER');
          wrapper = cell.model_visible_call_id;
        } else requireFact(id(p.model_visible_call_id) && p.code_mode_runtime_tool_id == null, 'INVALID_REQUESTER');
        b.operations.set(p.tool_call_id, {
          key: JSON.stringify([b.manifest.trace_id, thread, turn, p.tool_call_id]),
          bundle_id: b.manifest.trace_id, thread_id: thread, turn_id: turn, tool_call_id: p.tool_call_id,
          tool_name: input.data.tool_name, tool_namespace: input.data.tool_namespace ?? null,
          requester: p.requester.type === 'model' ? { type: 'model' }
            : { type: 'code_cell', runtime_cell_id: p.requester.runtime_cell_id },
          model_visible_call_id: p.model_visible_call_id ?? null,
          code_mode_runtime_tool_id: p.code_mode_runtime_tool_id ?? null, wrapper_call_id: wrapper,
          start_seq: event.seq, end_seq: null, status: 'running', input_ref: input.ref,
          result_ref: null, runtime_refs: [], exit_code: null,
        });
        break;
      }
      case 'tool_call_ended': {
        const op = operation();
        requireFact(!op.end_seq && terminal.has(p.status), 'DUPLICATE_OR_INVALID_TOOL_END');
        const result = refs.result_payload;
        requireFact(result?.ref.kind.type === 'tool_result' && object(result.data)
          && ['direct_response', 'code_mode_response', 'error'].includes(result.data.type), 'INVALID_TOOL_RESULT');
        if (result.data.type === 'direct_response') requireFact(op.requester.type === 'model' && object(result.data.response_item)
          && result.data.response_item.call_id === op.model_visible_call_id, 'RESULT_CALL_MISMATCH');
        if (result.data.type === 'code_mode_response') requireFact(op.requester.type === 'code_cell'
          && Object.hasOwn(result.data, 'value'), 'RESULT_REQUESTER_MISMATCH');
        if (result.data.type === 'error') requireFact(typeof result.data.error === 'string'
          && p.status === 'failed', 'INVALID_ERROR_RESULT');
        op.end_seq = event.seq; op.status = p.status; op.result_ref = result.ref;
        break;
      }
      case 'tool_call_runtime_started':
      case 'tool_call_runtime_ended': {
        const op = operation();
        const runtime = refs.runtime_payload;
        requireFact(runtime?.ref.kind.type === 'tool_runtime_event' && object(runtime.data), 'INVALID_RUNTIME_PAYLOAD');
        const data = runtime.data;
        if (['exec_command', 'write_stdin', 'shell', 'shell_command', 'local_shell'].includes(op.tool_name)) {
          requireFact(data.call_id === op.tool_call_id && data.turn_id === turn
            && ['agent', 'unified_exec_startup', 'unified_exec_interaction'].includes(data.source), 'RUNTIME_CALL_MISMATCH');
          if (p.type === 'tool_call_runtime_ended') {
            requireFact(Number.isInteger(data.exit_code), 'INVALID_EXIT_CODE');
            requireFact(op.runtime_refs.some(r => r.type === 'tool_call_runtime_started'), 'UNMATCHED_RUNTIME_END');
            if (op.exit_code !== null) requireFact(op.exit_code === data.exit_code, 'EXIT_CODE_CONFLICT');
            op.exit_code = data.exit_code;
          }
        }
        op.runtime_refs.push({ seq: event.seq, type: p.type, ref: runtime.ref });
        break;
      }
      case 'inference_started':
      case 'compaction_request_started': {
        context();
        const key = p.inference_call_id ?? p.compaction_request_id;
        requireFact(id(key) && !b.auxiliary.has(key) && refs.request_payload
          && p.thread_id === thread && p.codex_turn_id === turn, 'INVALID_AUXILIARY_START');
        b.auxiliary.set(key, { thread, turn, end_seq: null });
        break;
      }
      case 'inference_completed':
      case 'inference_failed':
      case 'inference_cancelled':
      case 'compaction_request_completed':
      case 'compaction_request_failed': {
        context();
        const item = b.auxiliary.get(p.inference_call_id ?? p.compaction_request_id);
        requireFact(item && item.thread === thread && item.turn === turn && !item.end_seq, 'UNMATCHED_AUXILIARY_END');
        if (p.type.endsWith('_completed')) requireFact(refs.response_payload, 'MISSING_RESPONSE_PAYLOAD');
        item.end_seq = event.seq;
        break;
      }
      case 'rollout_ended':
        requireFact(rolloutTerminal.has(p.status) && b.threads.get(b.manifest.root_thread_id)?.end_seq,
          'UNMATCHED_ROLLOUT_END');
        b.end_seq = event.seq; b.status = p.status;
        break;
      // Remaining typed events carry evidence but are not extra dispatches.
    }
    b.seq = event.seq;
  }

  async function pollNow({ rootThreadIds, final = false }) {
    requireFact(Array.isArray(rootThreadIds) && rootThreadIds.every(id), 'INVALID_ROOT_THREAD_IDS');
    for (const thread of rootThreadIds) roots.add(thread);
    let directories = [];
    let canonicalRoot;
    try {
      requireFact(!(await lstat(root)).isSymbolicLink(), 'SYMLINK_PATH');
      canonicalRoot = await realpath(root);
      directories = await readdir(canonicalRoot, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT' || final || bundles.size) issue(error.traceCode ?? 'TRACE_ROOT_MISSING');
    }
    const seen = new Set();
    for (const entry of directories.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(canonicalRoot, entry.name);
      if (!entry.isDirectory() || entry.isSymbolicLink()) { issue('UNEXPECTED_TRACE_ENTRY', path); continue; }
      seen.add(path);
      let b = bundles.get(path);
      try {
        const bytes = await readInside(path, 'manifest.json');
        const manifestHash = hash(bytes);
        const manifest = decode(bytes);
        requireFact(manifest.schema_version === 1 && id(manifest.trace_id) && id(manifest.rollout_id)
          && id(manifest.root_thread_id) && Number.isSafeInteger(manifest.started_at_unix_ms)
          && manifest.raw_event_log === 'trace.jsonl' && manifest.payloads_dir === 'payloads', 'INVALID_MANIFEST');
        requireFact(roots.has(manifest.root_thread_id), 'FOREIGN_ROOT');
        if (!b) {
          requireFact(![...bundles.values()].some(x => x.manifest.trace_id === manifest.trace_id
            || x.manifest.root_thread_id === manifest.root_thread_id), 'DUPLICATE_BUNDLE_IDENTITY');
          b = { path, manifest, manifestHash, bytes: Buffer.alloc(0), offset: 0, seq: 0,
            start_seq: null, end_seq: null, status: 'running', payloads: new Map(),
            threads: new Map(), turns: new Map(), cells: new Map(), auxiliary: new Map(), operations: new Map(), broken: false };
          bundles.set(path, b);
        }
        requireFact(b.manifestHash === manifestHash, 'MANIFEST_CHANGED');
        if (b.broken) continue;
        for (const prior of b.payloads.values()) await payload(b, prior.ref);
        const log = await readInside(path, 'trace.jsonl');
        requireFact(log.length >= b.bytes.length && log.subarray(0, b.bytes.length).equals(b.bytes), 'TRACE_REWRITTEN');
        b.bytes = log;
        let newline;
        while ((newline = log.indexOf(10, b.offset)) !== -1) {
          await consume(b, decode(log.subarray(b.offset, newline)));
          b.offset = newline + 1;
        }
        if (final && b.offset !== log.length) issue('TRUNCATED_FINAL_LINE', path, b.seq + 1);
      } catch (error) {
        // A directory can appear before its first manifest/log. Only that startup
        // race may remain pending; an event referring to absent payload is corrupt.
        if (!(error.code === 'ENOENT' && (!b || (b.seq === 0 && b.bytes.length === 0)) && !final)) {
          issue(error.traceCode ?? (error.code === 'ENOENT' ? 'MISSING_TRACE_FILE' : 'INVALID_TRACE_DATA'), path, b ? b.seq + 1 : null);
          if (b) b.broken = true;
        }
      }
    }
    for (const b of bundles.values()) if (!seen.has(b.path)) issue('BUNDLE_REMOVED', b.path);
    const threadOwners = new Map();
    for (const b of bundles.values()) for (const t of b.threads.values()) {
      if (threadOwners.has(t.thread_id)) issue('CROSS_BUNDLE_THREAD', b.path, t.start_seq);
      threadOwners.set(t.thread_id, b.manifest.trace_id);
    }
    let complete = roots.size > 0;
    if (final && roots.size === 0) issue('MISSING_ROOT_IDENTITIES');
    for (const thread of roots) {
      if (![...bundles.values()].some(b => b.manifest.root_thread_id === thread)) {
        complete = false;
        if (final) issue('MISSING_ROOT_BUNDLE', root);
      }
    }
    for (const b of bundles.values()) {
      const unfinished = !b.end_seq || b.offset !== b.bytes.length || !b.threads.has(b.manifest.root_thread_id)
        || [...b.threads.values(), ...b.turns.values(), ...b.cells.values(), ...b.auxiliary.values(),
          ...b.operations.values()].some(x => !x.end_seq)
        || [...b.operations.values()].some(op => op.runtime_refs.some(r => r.type === 'tool_call_runtime_started')
          && !op.runtime_refs.some(r => r.type === 'tool_call_runtime_ended'));
      if (unfinished) { complete = false; if (final) issue('UNFINISHED_BUNDLE', b.path, b.seq); }
    }
    return structuredClone({ version: 1, status: issues.size ? 'INVALID' : complete ? 'VALID' : 'PENDING',
      trace_root: root,
      bundles: [...bundles.values()].map(b => ({ bundle_id: b.manifest.trace_id, rollout_id: b.manifest.rollout_id,
        root_thread_id: b.manifest.root_thread_id, path: b.path, manifest_sha256: b.manifestHash,
        trace_path: join(b.path, 'trace.jsonl'), trace_sha256: hash(b.bytes), trace_bytes: b.bytes.length,
        last_seq: b.seq, start_seq: b.start_seq, end_seq: b.end_seq, status: b.status })),
      threads: [...bundles.values()].flatMap(b => [...b.threads.values()]),
      operations: [...bundles.values()].flatMap(b => [...b.operations.values()]), issues: [...issues.values()] });
  }
  return { poll(options) {
    const run = queue.then(() => pollNow(options));
    queue = run.catch(() => {});
    return run;
  } };
}
