import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { userInfo } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_RECORDS = 200_000;
const MAX_DIRECTORIES = 2_048;
const MAX_ROLLOUT_FILES = 8_192;
const MAX_DIRECTORY_ENTRIES = 8_192;
export const MAX_NATIVE_PROMPT_BYTES = 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class NativeEventAttestationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeEventAttestationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new NativeEventAttestationError(code, message);
}

function canonicalRegularFile(inputPath) {
  const absolute = resolve(String(inputPath || ''));
  let lst;
  try { lst = lstatSync(absolute, { bigint: true }); }
  catch (error) {
    if (error?.code === 'ENOENT') fail('SOURCE_NOT_VISIBLE', 'native event source is not visible');
    throw error;
  }
  if (lst.isSymbolicLink()) fail('SYMLINK_SOURCE', 'native event source must not be a symlink');
  if (!lst.isFile()) fail('SOURCE_TYPE', 'native event source must be a regular file');
  const canonical = realpathSync(absolute);
  if (canonical !== absolute) fail('SYMLINK_SOURCE', 'native event source path is not canonical');
  let fd;
  try { fd = openSync(canonical, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0)); }
  catch (error) {
    if (error?.code === 'ELOOP') fail('SYMLINK_SOURCE', 'native event source must not be a symlink');
    throw error;
  }
  const st = fstatSync(fd, { bigint: true });
  if (st.dev !== lst.dev || st.ino !== lst.ino || !st.isFile()) {
    closeSync(fd);
    fail('SOURCE_DRIFT', 'native event source identity changed during open');
  }
  if (st.size > BigInt(MAX_SOURCE_BYTES)) {
    closeSync(fd);
    fail('SOURCE_LIMIT', `native event source exceeds ${MAX_SOURCE_BYTES} bytes`);
  }
  return {
    path: canonical,
    stat: {
      dev: st.dev.toString(),
      ino: st.ino.toString(),
      size: Number(st.size),
      mtimeNs: st.mtimeNs.toString(),
      ctimeNs: st.ctimeNs.toString(),
    },
    fd,
  };
}

function runtimeHome() {
  let home = '';
  try { home = userInfo().homedir; } catch { }
  if (!home) fail('SOURCE_ROOT', 'operating-system user home is unavailable');
  return resolve(home);
}

function boundedCodexSource(candidate, explicitHome, allowTestSourceRoot) {
  const home = allowTestSourceRoot
    ? resolve(String(explicitHome || ''))
    : join(runtimeHome(), '.codex');
  if (allowTestSourceRoot && !explicitHome) fail('SOURCE_ROOT', 'test Codex source root is missing');
  let canonicalHome;
  try { canonicalHome = realpathSync(home); }
  catch (error) {
    if (error?.code === 'ENOENT') fail('SOURCE_NOT_VISIBLE', 'Codex home does not exist');
    throw error;
  }
  if (canonicalHome !== home) fail('SYMLINK_SOURCE', 'Codex home must be canonical');
  const sessions = join(canonicalHome, 'sessions');
  let canonicalSessions;
  try { canonicalSessions = realpathSync(sessions); }
  catch (error) {
    if (error?.code === 'ENOENT') fail('SOURCE_NOT_VISIBLE', 'Codex sessions root does not exist');
    throw error;
  }
  if (canonicalSessions !== sessions) fail('SYMLINK_SOURCE', 'Codex sessions root must be canonical');

  let directoryCount = 0;
  let fileCount = 0;
  let entryCount = 0;
  const matches = [];
  const descend = (directory, depth) => {
    directoryCount += 1;
    if (directoryCount > MAX_DIRECTORIES) fail('SOURCE_LIMIT', 'Codex session directory bound exceeded');
    const entries = readdirSync(directory, { withFileTypes: true });
    entryCount += entries.length;
    if (entryCount > MAX_DIRECTORY_ENTRIES) fail('SOURCE_LIMIT', 'Codex session directory entry bound exceeded');
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (depth < 3) {
        const validDirectory = depth === 0 ? /^\d{4}$/.test(entry.name)
          : depth === 1 ? /^(?:0[1-9]|1[0-2])$/.test(entry.name)
            : /^(?:0[1-9]|[12]\d|3[01])$/.test(entry.name);
        if (entry.isDirectory() && validDirectory) descend(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      fileCount += 1;
      if (fileCount > MAX_ROLLOUT_FILES) fail('SOURCE_LIMIT', 'Codex rollout file bound exceeded');
      if (!entry.name.startsWith('rollout-') || !entry.name.endsWith(`-${candidate.session_id}.jsonl`)) continue;
      matches.push(full);
      if (matches.length > 1) fail('SOURCE_AMBIGUOUS', 'multiple Codex rollouts match the native session');
    }
  };
  descend(canonicalSessions, 0);
  if (matches.length !== 1) fail('SOURCE_NOT_VISIBLE', 'no canonical Codex rollout matches the native session');
  return canonicalRegularFile(matches[0]);
}

function canonicalClaudeProjectsRoot() {
  const configRoot = join(runtimeHome(), '.claude');
  let canonicalConfig;
  try { canonicalConfig = realpathSync(configRoot); }
  catch { fail('SOURCE_ROOT', 'Claude runtime root is not visible'); }
  if (canonicalConfig !== configRoot) fail('SYMLINK_SOURCE', 'Claude runtime root must be canonical');
  const projectsRoot = join(canonicalConfig, 'projects');
  let canonicalProjects;
  try { canonicalProjects = realpathSync(projectsRoot); }
  catch { fail('SOURCE_ROOT', 'Claude transcript root is not visible'); }
  if (canonicalProjects !== projectsRoot) fail('SYMLINK_SOURCE', 'Claude transcript root must be canonical');
  return canonicalProjects;
}

function validateClaudeTranscriptLocation(sourcePath, candidate) {
  const projectsRoot = canonicalClaudeProjectsRoot();
  const rel = relative(projectsRoot, sourcePath);
  const parts = rel.split(/[\\/]/);
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || parts.length !== 2
      || !parts[0] || parts[0] === '.' || parts[0] === '..'
      || parts[1] !== `${candidate.session_id}.jsonl`) {
    fail('SOURCE_ROOT', 'Claude transcript is outside one canonical runtime project container');
  }
}

function sourceFor(candidate, transcriptPath, codexHome, allowTestSourceRoot) {
  if (candidate.harness === 'codex') {
    return boundedCodexSource(candidate, codexHome, allowTestSourceRoot);
  }
  if (candidate.harness === 'claude') {
    if (!transcriptPath) fail('SOURCE_NOT_VISIBLE', 'Claude transcript path is required');
    const source = canonicalRegularFile(transcriptPath);
    if (basename(source.path) !== `${candidate.session_id}.jsonl`) {
      closeSync(source.fd);
      fail('SESSION_MISMATCH', 'Claude transcript filename does not match the native session');
    }
    if (!allowTestSourceRoot) {
      try { validateClaudeTranscriptLocation(source.path, candidate); }
      catch (error) { closeSync(source.fd); throw error; }
    }
    return source;
  }
  fail('SOURCE_NOT_VISIBLE', 'native transcript path is required for this harness');
}

function recordsFromFile(source) {
  let bytes;
  try {
    bytes = readFileSync(source.fd);
    const after = fstatSync(source.fd, { bigint: true });
    if (after.dev.toString() !== source.stat.dev || after.ino.toString() !== source.stat.ino
        || Number(after.size) !== source.stat.size || bytes.length !== source.stat.size
        || after.mtimeNs.toString() !== source.stat.mtimeNs
        || after.ctimeNs.toString() !== source.stat.ctimeNs) {
      fail('SOURCE_DRIFT', 'native event source changed while being read');
    }
  } finally {
    try { closeSync(source.fd); } catch { }
  }
  if (bytes.length > MAX_SOURCE_BYTES) fail('SOURCE_LIMIT', 'native event source grew past the byte bound');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const records = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    if (records.length >= MAX_RECORDS) fail('SOURCE_LIMIT', 'native event record bound exceeded');
    const lineBytes = bytes.subarray(start, index);
    start = index + 1;
    if (lineBytes.length === 0) continue;
    let value;
    try { value = JSON.parse(decoder.decode(lineBytes)); }
    catch { fail('UNKNOWN_SCHEMA', 'native event source contains invalid JSON or UTF-8'); }
    records.push({ value, start: start - lineBytes.length - 1, end: start, index: records.length });
  }
  if (start !== bytes.length) {
    fail('UNKNOWN_SCHEMA', 'native event source ends with an incomplete JSONL record');
  }
  return { records, bytes };
}

function promptBytes(candidate) {
  const integrity = candidate?.prompt_integrity;
  if (integrity?.encoding !== 'utf-8' || typeof integrity.bytes_base64 !== 'string') {
    fail('CANDIDATE_SCHEMA', 'candidate lacks exact UTF-8 prompt bytes');
  }
  if (!Number.isSafeInteger(integrity.byte_length) || integrity.byte_length < 0
      || integrity.byte_length > MAX_NATIVE_PROMPT_BYTES
      || integrity.bytes_base64.length > Math.ceil(MAX_NATIVE_PROMPT_BYTES / 3) * 4 + 4) {
    fail('SOURCE_LIMIT', `native prompt exceeds ${MAX_NATIVE_PROMPT_BYTES} bytes`);
  }
  const bytes = Buffer.from(integrity.bytes_base64, 'base64');
  const canonicalBase64 = bytes.toString('base64');
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (canonicalBase64 !== integrity.bytes_base64 || bytes.length !== integrity.byte_length || sha !== integrity.sha256) {
    fail('CANDIDATE_SCHEMA', 'candidate prompt integrity is invalid');
  }
  return bytes;
}

function strictCodexText(content, expectedType) {
  if (!Array.isArray(content) || content.length === 0) fail('UNKNOWN_SCHEMA', 'Codex message content schema is unknown');
  const parts = content.map((part) => {
    if (!part || part.type !== expectedType || typeof part.text !== 'string') {
      fail('UNKNOWN_SCHEMA', 'Codex message content part schema is unknown');
    }
    return part.text;
  });
  return parts.join('\n');
}

// A prompt submitted with a pasted image records an `image` part alongside the
// `text` part; the prompt bytes the hook sees are the text parts alone (the text
// part itself carries the "[Image #N]" marker). Non-text parts are therefore
// skipped — but only the ones we have actually observed. An unrecognized part type
// still fails closed, so a future content kind cannot be silently dropped from the
// bytes being compared.
const CLAUDE_SKIPPABLE_CONTENT_PARTS = ['image'];

function strictClaudeText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.length === 0) fail('UNKNOWN_SCHEMA', 'Claude message content schema is unknown');
  const parts = [];
  for (const part of content) {
    if (part && typeof part.type === 'string' && CLAUDE_SKIPPABLE_CONTENT_PARTS.includes(part.type)) continue;
    if (!part || part.type !== 'text' || typeof part.text !== 'string') {
      fail('UNKNOWN_SCHEMA', 'Claude message content part schema is unknown');
    }
    parts.push(part.text);
  }
  if (!parts.length) fail('UNKNOWN_SCHEMA', 'Claude message content carries no text part');
  return parts.join('\n');
}

function sameUtf8(text, expected) {
  return Buffer.from(String(text), 'utf8').equals(expected);
}

function lengthPrefix(value) {
  const bytes = Buffer.from(String(value), 'utf8');
  return Buffer.concat([Buffer.from(`${bytes.length}:`, 'ascii'), bytes]);
}

function codexEventId(sessionId, sourceId, anchorId) {
  const hash = createHash('sha256');
  for (const value of ['luca-native-event:v1:codex', sessionId, sourceId, anchorId]) hash.update(lengthPrefix(value));
  return `codex:${hash.digest('hex')}`;
}

function validateCodexProvenance(records, candidate) {
  const metaRows = records.filter(record => record.value?.type === 'session_meta');
  if (metaRows.length !== 1) fail('SOURCE_AMBIGUOUS', 'Codex source must contain exactly one session_meta');
  if (metaRows[0].index !== 0) fail('UNKNOWN_SCHEMA', 'Codex session_meta must be the first published record');
  const meta = metaRows[0].value.payload || {};
  if (meta.id !== candidate.session_id || meta.session_id !== candidate.session_id) {
    fail('SESSION_MISMATCH', 'Codex session provenance mismatch');
  }
  if (meta.cwd !== candidate.cwd) fail('CWD_MISMATCH', 'Codex cwd provenance mismatch');
  if (meta.thread_source !== 'user' || meta.parent_thread_id || meta.forked_from_id) {
    fail('PROVENANCE_MISMATCH', 'Codex source is not the root native user thread');
  }
  return meta;
}

function prefixSha256(bytes, offset) {
  return createHash('sha256').update(bytes.subarray(0, offset)).digest('hex');
}

function cursorAt(source, records, bytes, recordIndex, byteOffset, harness) {
  return {
    schema_version: 1,
    harness,
    transcript_path: source.path,
    dev: source.stat.dev,
    ino: source.stat.ino,
    byte_offset: byteOffset,
    record_index: recordIndex,
    prefix_sha256: prefixSha256(bytes, byteOffset),
  };
}

function validateCursor(cursor, source, records, bytes, harness) {
  if (!cursor) return 0;
  if (cursor.schema_version !== 1 || cursor.harness !== harness
      || cursor.transcript_path !== source.path
      || cursor.dev !== source.stat.dev || cursor.ino !== source.stat.ino
      || !Number.isSafeInteger(cursor.byte_offset) || cursor.byte_offset < 0 || cursor.byte_offset > source.stat.size
      || !Number.isSafeInteger(cursor.record_index) || cursor.record_index < 0 || cursor.record_index > records.length
      || !/^[0-9a-f]{64}$/.test(String(cursor.prefix_sha256 || ''))) {
    fail('CURSOR_MISMATCH', 'native event cursor does not match the canonical source');
  }
  const expectedOffset = cursor.record_index === 0 ? 0 : records[cursor.record_index - 1]?.end;
  if (expectedOffset !== cursor.byte_offset
      || prefixSha256(bytes, cursor.byte_offset) !== cursor.prefix_sha256) {
    fail('CURSOR_MISMATCH', 'native event cursor is not on the attested source prefix');
  }
  return cursor.byte_offset;
}

function isCodexUserRecord(record) {
  const payload = record?.value?.payload;
  return record?.value?.type === 'response_item'
    && payload?.type === 'message' && payload?.role === 'user';
}

// Codex records injected turn context (AGENTS.md, plugin lists, environment
// preambles) as ordinary user messages: real `msg_*` id, same turn_id as the human
// prompt that follows. The one thing they never carry is a completed `UserMessage`
// item — that event is emitted only for what the person actually sent. The scan
// therefore skips a user record with no UserMessage anchor instead of comparing its
// bytes, which previously produced MISMATCH on the first turn of every session.
//
// This only skips; it never accepts. A record that does carry an anchor still has to
// match the candidate byte for byte, so a preamble cannot stand in for a prompt.
function codexRecordHasUserMessageAnchor(records, sourceIndex) {
  for (const distance of [1, 2]) {
    const next = records[sourceIndex + distance];
    if (!next) return false;
    if (isCodexUserRecord(next)) return false;
    const payload = next.value?.payload;
    if (next.value?.type === 'event_msg' && payload?.type === 'item_completed'
        && payload?.item?.type === 'UserMessage') return true;
  }
  return false;
}

function codexAnchor(records, sourceIndex, candidate, expected) {
  const first = records[sourceIndex + 1];
  if (!first) fail('BROKEN_LEG', 'Codex native source has no UserMessage anchor');
  if (isCodexUserRecord(first)) fail('INTERVENING_USER', 'another native user record intervenes before the anchor');
  const firstPayload = first.value?.payload;
  const firstIsAnchor = first.value?.type === 'event_msg' && firstPayload?.type === 'item_completed'
    && firstPayload?.item?.type === 'UserMessage';
  if (!firstIsAnchor && !(first.value?.type === 'turn_context' && firstPayload?.turn_id === candidate.boundary_id)) {
    fail('UNKNOWN_SCHEMA', 'Codex distance-2 middle record is not the attested safe shape');
  }
  const second = firstIsAnchor ? null : records[sourceIndex + 2];
  if (isCodexUserRecord(second)) fail('INTERVENING_USER', 'another native user record intervenes before the anchor');
  const secondPayload = second?.value?.payload;
  const secondIsAnchor = second?.value?.type === 'event_msg' && secondPayload?.type === 'item_completed'
    && secondPayload?.item?.type === 'UserMessage';
  if (!firstIsAnchor && !secondIsAnchor) {
    fail('BROKEN_LEG', 'Codex native source lacks a safe distance-1/2 UserMessage anchor');
  }
  const anchor = firstIsAnchor ? first : second;
  const anchorPayload = anchor.value.payload;
  if (anchorPayload.thread_id !== candidate.session_id || anchorPayload.turn_id !== candidate.boundary_id) {
    fail('MISMATCH', 'Codex UserMessage anchor provenance mismatch');
  }
  if (!sameUtf8(strictCodexText(anchorPayload.item.content, 'text'), expected)) {
    fail('MISMATCH', 'Codex source and anchor text differ');
  }
  const anchorId = String(anchorPayload.item.id || '');
  if (!anchorId) fail('BROKEN_LEG', 'Codex UserMessage anchor lacks native id');
  return { record: anchor, anchorId, distance: firstIsAnchor ? 1 : 2 };
}

function codexAssistantMessage(record) {
  const payload = record?.value?.payload;
  if (record?.value?.type !== 'response_item'
      || payload?.type !== 'message' || payload?.role !== 'assistant') return null;
  const id = String(payload.id || '');
  if (!/^msg_[\w-]+$/.test(id)) fail('UNKNOWN_SCHEMA', 'Codex assistant witness id is invalid');
  return { id, text: strictCodexText(payload.content, 'output_text') };
}

function codexStopWitness(records, afterIndex, assistantText, afterWitnessId = '') {
  if (typeof assistantText !== 'string' || !assistantText) {
    fail('STOP_WITNESS_MISSING', 'Stop attestation requires the native last assistant message');
  }
  const expected = Buffer.from(assistantText, 'utf8');
  let afterPriorWitness = !afterWitnessId;
  let matches = 0;
  let selected = '';
  for (let index = afterIndex + 1; index < records.length; index += 1) {
    const record = records[index];
    if (isCodexUserRecord(record)) {
      fail('INTERVENING_USER', 'a newer native user event exists before the Stop witness');
    }
    const assistant = codexAssistantMessage(record);
    if (!assistant) continue;
    if (sameUtf8(assistant.text, expected)) matches += 1;
    if (!afterPriorWitness) {
      if (assistant.id === afterWitnessId) afterPriorWitness = true;
      continue;
    }
    if (sameUtf8(assistant.text, expected)) selected = assistant.id;
  }
  if (!afterPriorWitness) fail('CURSOR_MISMATCH', 'prior Codex Stop witness is no longer visible');
  if (selected && matches > 1) fail('STOP_WITNESS_AMBIGUOUS', 'Stop text names multiple native assistant responses');
  if (selected) return selected;
  fail('SOURCE_NOT_VISIBLE', 'native assistant response for this Stop is not yet visible');
}

function assertCodexStopUnambiguous(records, candidate, currentEventId, currentAnchorIndex, assistantText, priorEvents) {
  const expected = Buffer.from(assistantText, 'utf8');
  // The ledger starts at adoption, not at native session creation. Earlier
  // responses still produce indistinguishable delayed Stop payloads.
  let nativeBoundary = '';
  for (let index = 0; index < currentAnchorIndex; index += 1) {
    const record = records[index];
    if (isCodexUserRecord(record)) {
      nativeBoundary = record.value.payload?.internal_chat_message_metadata_passthrough?.turn_id || '';
      continue;
    }
    if (nativeBoundary !== candidate.boundary_id) continue;
    const assistant = codexAssistantMessage(record);
    if (assistant && sameUtf8(assistant.text, expected)) {
      fail('STOP_WITNESS_AMBIGUOUS', 'Stop text also names a historical assistant response under this boundary');
    }
  }
  for (const prior of priorEvents) {
    if (!prior || prior.event_id === currentEventId || prior.boundary_id !== candidate.boundary_id) continue;
    if (prior.harness !== 'codex' || !prior.anchor_id
        || codexEventId(candidate.session_id, prior.native_id, prior.anchor_id) !== prior.event_id) {
      fail('CURSOR_MISMATCH', 'prior Codex event ledger entry is inconsistent');
    }
    const anchorIndex = records.findIndex(record => {
      const payload = record?.value?.payload;
      return record?.value?.type === 'event_msg' && payload?.type === 'item_completed'
        && payload?.thread_id === candidate.session_id
        && payload?.turn_id === prior.boundary_id
        && payload?.item?.type === 'UserMessage'
        && String(payload.item.id || '') === prior.anchor_id;
    });
    if (anchorIndex < 0 || anchorIndex >= currentAnchorIndex) {
      fail('CURSOR_MISMATCH', 'prior Codex event anchor is missing or out of order');
    }
    for (let index = anchorIndex + 1; index < currentAnchorIndex; index += 1) {
      const record = records[index];
      if (isCodexUserRecord(record)) break;
      const assistant = codexAssistantMessage(record);
      if (assistant && sameUtf8(assistant.text, expected)) {
        fail('STOP_WITNESS_AMBIGUOUS', 'Stop text also names an earlier assistant response under this boundary');
      }
    }
  }
}

function attestCodex(candidate, source, records, bytes, cursor, observation, assistantText,
  requireNoFollowingUser, priorEvents) {
  const meta = validateCodexProvenance(records, candidate);
  const expected = promptBytes(candidate);
  const cursorOffset = validateCursor(cursor, source, records, bytes, 'codex');
  let replayVisible = false;
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!isCodexUserRecord(record)) continue;
    const payload = record.value.payload;
    const sourceId = String(payload.id || '');
    if (record.start >= cursorOffset && !/^msg_[\w-]+$/.test(sourceId)) {
      fail('UNKNOWN_SCHEMA', 'next Codex native user event id is invalid');
    }
    if (!/^msg_[\w-]+$/.test(sourceId)) continue;
    const boundary = payload?.internal_chat_message_metadata_passthrough?.turn_id;
    if (record.start < cursorOffset) {
      try {
        if (boundary === candidate.boundary_id && sameUtf8(strictCodexText(payload.content, 'input_text'), expected)) replayVisible = true;
      } catch { /* historical content cannot grant authority; replay text is diagnostic only */ }
      continue;
    }
    const sourceText = strictCodexText(payload.content, 'input_text');
    const matchesCandidate = boundary === candidate.boundary_id && sameUtf8(sourceText, expected);
    if (!matchesCandidate) {
      // Only a record that does NOT match the candidate may be dismissed as injected
      // turn context, and only when it lacks a completed UserMessage item. A record
      // that DOES match still goes through codexAnchor below, so a missing, over-
      // distance, or reordered anchor keeps failing closed exactly as before.
      if (!codexRecordHasUserMessageAnchor(records, index)) continue;
      fail('MISMATCH', 'next Codex native user event does not match the pending candidate');
    }
    const anchor = codexAnchor(records, index, candidate, expected);
    const eventId = codexEventId(candidate.session_id, sourceId, anchor.anchorId);
    const stopWitnessId = observation === 'stop'
      ? codexStopWitness(records, anchor.record.index, assistantText) : '';
    if (stopWitnessId) {
      assertCodexStopUnambiguous(records, candidate, eventId, anchor.record.index, assistantText, priorEvents);
    }
    if (requireNoFollowingUser) {
      assertNoNewNativeUser(records, anchor.record.index + 1, 'codex');
    }
    return {
      event_id: eventId,
      boundary_id: candidate.boundary_id,
      native_id: sourceId,
      anchor_id: anchor.anchorId,
      distance: anchor.distance,
      ...(stopWitnessId ? { stop_witness_id: stopWitnessId } : {}),
      cursor_after: cursorAt(source, records, bytes, anchor.record.index + 1, anchor.record.end, 'codex'),
      provenance: { originator: meta.originator || '', thread_source: meta.thread_source },
    };
  }
  if (replayVisible) fail('EVENT_REPLAY', 'matching native event is behind the durable cursor');
  fail('SOURCE_NOT_VISIBLE', 'candidate native event is not yet visible');
}

function claudeEventId(sessionId, nativeId) {
  const hash = createHash('sha256');
  for (const value of ['luca-native-event:v1:claude', sessionId, nativeId]) hash.update(lengthPrefix(value));
  return `claude:${hash.digest('hex')}`;
}

function isClaudeToolResult(row) {
  const content = row?.message?.content;
  return row?.type === 'user' && row?.message?.role === 'user'
    && Array.isArray(content) && content.length > 0
    && content.every(part => part?.type === 'tool_result');
}

// Provenance lives in `origin.kind` + `promptSource`. `isMeta` is written only on
// meta rows — Claude Code has never emitted `isMeta: false` (verified across
// 2.1.233…2.1.266), so requiring it literally classified every real human prompt as
// 'unknown' and hard-failed every attestation. Absent therefore means "not meta".
const CLAUDE_HUMAN_PROMPT_SOURCES = ['typed', 'queued', 'suggestion_accepted'];
// Non-human origins are allowlisted rather than inferred: an unrecognized origin stays
// 'unknown' so a future human-bearing kind fails closed instead of being silently
// skipped as an intervening user event.
const CLAUDE_NON_HUMAN_ORIGIN_KINDS = ['task-notification', 'peer', 'auto-continuation'];
const CLAUDE_ORIGINLESS_PROMPT_SOURCES = ['sdk'];

function claudeUserKind(record) {
  const row = record?.value;
  if (row?.type !== 'user' || row?.message?.role !== 'user') return 'other';
  if (isClaudeToolResult(row)) return 'tool-result';
  if (row.isMeta === true) return 'meta';
  if (row.isMeta !== undefined && row.isMeta !== false) return 'unknown';
  const origin = row.origin;
  if (origin !== undefined && origin !== null && typeof origin !== 'object') return 'unknown';
  const kind = origin?.kind;
  // A slash-command turn carries origin.kind 'human' with no promptSource. It stays a
  // human event so intervening-user detection still sees it; its recorded text is the
  // command expansion, so a candidate minted from it is rejected by validateClaudeUser
  // rather than attesting.
  if (kind === 'human') {
    return row.promptSource === undefined || row.promptSource === null
      || CLAUDE_HUMAN_PROMPT_SOURCES.includes(row.promptSource) ? 'human' : 'unknown';
  }
  if (typeof kind === 'string') return CLAUDE_NON_HUMAN_ORIGIN_KINDS.includes(kind) ? 'other' : 'unknown';
  if (row.promptSource === undefined || row.promptSource === null
      || CLAUDE_ORIGINLESS_PROMPT_SOURCES.includes(row.promptSource)) return 'other';
  return 'unknown';
}

function isClaudeUserRecord(record) {
  return claudeUserKind(record) === 'human';
}

function validateClaudeUser(row, candidate) {
  const hasCamel = Object.prototype.hasOwnProperty.call(row, 'sessionId');
  const hasSnake = Object.prototype.hasOwnProperty.call(row, 'session_id');
  if (!hasCamel && !hasSnake) fail('UNKNOWN_SCHEMA', 'Claude user event lacks native session provenance');
  if (hasCamel && hasSnake && row.sessionId !== row.session_id) {
    fail('UNKNOWN_SCHEMA', 'Claude user event carries conflicting session provenance');
  }
  const rowSession = String(hasCamel ? row.sessionId : row.session_id);
  if (rowSession !== candidate.session_id) fail('SESSION_MISMATCH', 'Claude session provenance mismatch');
  if (row.cwd !== candidate.cwd) fail('CWD_MISMATCH', 'Claude cwd provenance mismatch');
  if (typeof row.isSidechain !== 'boolean') fail('UNKNOWN_SCHEMA', 'Claude sidechain provenance is not boolean');
  // Mirrors claudeUserKind: `isMeta` absent means "not meta", and the accepted prompt
  // sources come from the shared constant so the two sites cannot drift apart. A
  // slash-command turn (origin.kind 'human', no promptSource) counts as a human event
  // when scanning, but is not an attestable prompt source — it is rejected here.
  if (row.isSidechain || row.userType !== 'external' || row.isMeta === true
      || row.origin?.kind !== 'human' || !CLAUDE_HUMAN_PROMPT_SOURCES.includes(row.promptSource)) {
    fail('PROVENANCE_MISMATCH', 'Claude source is not a root external user event');
  }
  const nativeId = String(row.uuid || '');
  if (!UUID_RE.test(nativeId)) fail('UNKNOWN_SCHEMA', 'Claude user event native uuid is invalid');
  return nativeId;
}

function claudeAssistantVisibleText(row) {
  if (row?.type !== 'assistant' || row?.message?.role !== 'assistant') return null;
  const content = row.message.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.length === 0) {
    fail('UNKNOWN_SCHEMA', 'Claude assistant witness content schema is unknown');
  }
  const text = [];
  for (const part of content) {
    if (!part || typeof part.type !== 'string') {
      fail('UNKNOWN_SCHEMA', 'Claude assistant witness part schema is unknown');
    }
    if (part.type === 'text') {
      if (typeof part.text !== 'string') fail('UNKNOWN_SCHEMA', 'Claude assistant text witness is malformed');
      text.push(part.text);
      continue;
    }
    if (['thinking', 'redacted_thinking', 'tool_use'].includes(part.type)) continue;
    fail('UNKNOWN_SCHEMA', `Claude assistant witness part type is unknown: ${part.type}`);
  }
  return text.length ? text.join('\n') : null;
}

function claudeStopWitness(records, afterIndex, assistantText, afterWitnessId = '') {
  if (typeof assistantText !== 'string' || !assistantText) {
    fail('STOP_WITNESS_MISSING', 'Stop attestation requires the native last assistant message');
  }
  const expected = Buffer.from(assistantText, 'utf8');
  let afterPriorWitness = !afterWitnessId;
  let matches = 0;
  let selected = '';
  for (let index = afterIndex + 1; index < records.length; index += 1) {
    const record = records[index];
    const userKind = claudeUserKind(record);
    if (userKind === 'human') fail('INTERVENING_USER', 'a newer Claude user event exists before the Stop witness');
    if (userKind === 'unknown') fail('UNKNOWN_SCHEMA', 'Claude user-like row lacks known native provenance');
    const row = record.value;
    if (row?.type !== 'assistant' || row?.message?.role !== 'assistant') continue;
    const witnessId = String(row.uuid || '');
    if (!UUID_RE.test(witnessId)) fail('UNKNOWN_SCHEMA', 'Claude assistant witness uuid is invalid');
    const visible = claudeAssistantVisibleText(row);
    if (visible != null && sameUtf8(visible, expected)) matches += 1;
    if (!afterPriorWitness) {
      if (witnessId === afterWitnessId) afterPriorWitness = true;
      continue;
    }
    if (visible != null && sameUtf8(visible, expected)) selected = witnessId;
  }
  if (!afterPriorWitness) fail('CURSOR_MISMATCH', 'prior Claude Stop witness is no longer visible');
  if (selected && matches > 1) fail('STOP_WITNESS_AMBIGUOUS', 'Stop text names multiple native assistant responses');
  if (selected) return selected;
  fail('SOURCE_NOT_VISIBLE', 'Claude assistant response for this Stop is not yet visible');
}

function assertClaudeStopUnambiguous(records, candidate, currentEventId, currentIndex, assistantText, priorEvents) {
  const expected = Buffer.from(assistantText, 'utf8');
  for (let index = 0; index < currentIndex; index += 1) {
    const row = records[index].value;
    if (row?.type !== 'assistant' || row?.message?.role !== 'assistant') continue;
    const visible = claudeAssistantVisibleText(row);
    if (visible != null && sameUtf8(visible, expected)) {
      fail('STOP_WITNESS_AMBIGUOUS', 'Stop text also names a historical assistant response in this session');
    }
  }
  for (const prior of priorEvents) {
    if (!prior || prior.event_id === currentEventId || prior.boundary_id !== candidate.boundary_id) continue;
    if (prior.harness !== 'claude' || prior.anchor_id != null
        || claudeEventId(candidate.session_id, prior.native_id) !== prior.event_id) {
      fail('CURSOR_MISMATCH', 'prior Claude event ledger entry is inconsistent');
    }
    const priorIndex = records.findIndex(record => claudeUserKind(record) === 'human'
      && String(record.value?.uuid || '') === prior.native_id);
    if (priorIndex < 0 || priorIndex >= currentIndex) {
      fail('CURSOR_MISMATCH', 'prior Claude event is missing or out of order');
    }
    for (let index = priorIndex + 1; index < currentIndex; index += 1) {
      const record = records[index];
      const userKind = claudeUserKind(record);
      if (userKind === 'human') break;
      if (userKind === 'unknown') fail('UNKNOWN_SCHEMA', 'Claude user-like row lacks known native provenance');
      const row = record.value;
      if (row?.type !== 'assistant' || row?.message?.role !== 'assistant') continue;
      if (!UUID_RE.test(String(row.uuid || ''))) fail('UNKNOWN_SCHEMA', 'Claude assistant witness uuid is invalid');
      const visible = claudeAssistantVisibleText(row);
      if (visible != null && sameUtf8(visible, expected)) {
        fail('STOP_WITNESS_AMBIGUOUS', 'Stop text also names an earlier assistant response in this session');
      }
    }
  }
}

function attestClaude(candidate, source, records, bytes, cursor, observation, assistantText,
  requireNoFollowingUser, priorEvents) {
  const expected = promptBytes(candidate);
  const cursorOffset = validateCursor(cursor, source, records, bytes, 'claude');
  let replayVisible = false;
  for (const record of records) {
    const kind = claudeUserKind(record);
    if (kind === 'unknown') {
      if (record.start >= cursorOffset) fail('UNKNOWN_SCHEMA', 'Claude user-like row lacks known native provenance');
      continue;
    }
    if (kind !== 'human') continue;
    const row = record.value;
    if (record.start < cursorOffset) {
      // The fence already authenticates these historical bytes. They need not
      // have the current cwd/schema and can never grant current authority.
      try { if (sameUtf8(strictClaudeText(row.message.content), expected)) replayVisible = true; }
      catch { /* unreadable history is not evidence for a replay diagnostic */ }
      continue;
    }
    const nativeId = validateClaudeUser(row, candidate);
    const text = strictClaudeText(row.message.content);
    const matchesCandidate = sameUtf8(text, expected);
    if (!matchesCandidate) fail('MISMATCH', 'next Claude native user event does not match the pending candidate');
    const eventId = claudeEventId(candidate.session_id, nativeId);
    const stopWitnessId = observation === 'stop'
      ? claudeStopWitness(records, record.index, assistantText) : '';
    if (stopWitnessId) {
      assertClaudeStopUnambiguous(records, candidate, eventId, record.index, assistantText, priorEvents);
    }
    if (requireNoFollowingUser) {
      assertNoNewNativeUser(records, record.index + 1, 'claude');
    }
    return {
      event_id: eventId,
      boundary_id: candidate.boundary_id,
      native_id: nativeId,
      anchor_id: null,
      distance: 0,
      ...(stopWitnessId ? { stop_witness_id: stopWitnessId } : {}),
      cursor_after: cursorAt(source, records, bytes, record.index + 1, record.end, 'claude'),
      provenance: { user_type: row.userType, sidechain: row.isSidechain },
    };
  }
  if (replayVisible) fail('EVENT_REPLAY', 'matching Claude event is behind the durable cursor');
  fail('SOURCE_NOT_VISIBLE', 'candidate Claude event is not yet visible');
}


function validateCandidate(candidate) {
  if (!candidate || candidate.schema_version !== 1
      || !/^[\w-]{1,36}$/.test(String(candidate.session_id || ''))
      || !String(candidate.boundary_id || '') || String(candidate.boundary_id).length > 256
      || /[\u0000-\u001f\u007f]/.test(String(candidate.boundary_id))
      || !isAbsolute(String(candidate.cwd || ''))
      || !['codex', 'claude'].includes(candidate.harness)) {
    fail('CANDIDATE_SCHEMA', 'native event candidate schema is invalid');
  }
  if (candidate.harness === 'claude' && candidate.boundary_id !== candidate.session_id) {
    fail('CANDIDATE_SCHEMA', 'Claude boundary must be the native session boundary');
  }
  promptBytes(candidate);
}


function validateCurrentEventShape(event, sessionId) {
  const candidate = {
    session_id: String(sessionId || ''),
    boundary_id: String(event?.boundary_id || ''),
    cwd: String(event?.cwd || ''),
    harness: String(event?.harness || ''),
  };
  if (!/^[\w-]{1,36}$/.test(candidate.session_id)
      || !candidate.boundary_id || !isAbsolute(candidate.cwd)
      || !['codex', 'claude'].includes(candidate.harness)
      || !String(event?.event_id || '') || !String(event?.native_id || '')
      || (candidate.harness === 'codex' ? !String(event?.anchor_id || '') : event?.anchor_id != null)) {
    fail('CANDIDATE_SCHEMA', 'current native event shape is invalid');
  }
  if (candidate.harness === 'claude' && candidate.boundary_id !== candidate.session_id) {
    fail('CANDIDATE_SCHEMA', 'Claude current boundary must equal the native session boundary');
  }
  return candidate;
}

function validateCurrentCodexEvent(event, candidate, records, cursor) {
  validateCodexProvenance(records, candidate);
  const anchor = records[cursor.record_index - 1];
  const anchorPayload = anchor?.value?.payload;
  if (!anchor || anchor.end !== cursor.byte_offset
      || anchor.value?.type !== 'event_msg' || anchorPayload?.type !== 'item_completed'
      || anchorPayload?.item?.type !== 'UserMessage'
      || String(anchorPayload.item.id || '') !== event.anchor_id
      || anchorPayload.thread_id !== candidate.session_id
      || anchorPayload.turn_id !== candidate.boundary_id) {
    fail('CURSOR_MISMATCH', 'Codex cursor is not bound to the current UserMessage anchor');
  }
  let source = records[anchor.index - 1];
  let distance = 1;
  if (!isCodexUserRecord(source)) {
    const middle = source;
    const middlePayload = middle?.value?.payload;
    if (middle?.value?.type !== 'turn_context' || middlePayload?.turn_id !== candidate.boundary_id) {
      fail('UNKNOWN_SCHEMA', 'Codex current event distance-2 middle record is not the attested safe shape');
    }
    source = records[anchor.index - 2];
    distance = 2;
  }
  const sourcePayload = source?.value?.payload;
  if (!isCodexUserRecord(source) || !/^msg_[\w-]+$/.test(String(sourcePayload?.id || ''))
      || String(sourcePayload.id) !== event.native_id
      || sourcePayload?.internal_chat_message_metadata_passthrough?.turn_id !== candidate.boundary_id) {
    fail('CURSOR_MISMATCH', 'Codex cursor is not bound to the current native user source');
  }
  const sourceText = strictCodexText(sourcePayload.content, 'input_text');
  const anchorText = strictCodexText(anchorPayload.item.content, 'text');
  if (!sameUtf8(sourceText, Buffer.from(anchorText, 'utf8'))
      || codexEventId(candidate.session_id, event.native_id, event.anchor_id) !== event.event_id) {
    fail('MISMATCH', 'Codex current native event identity or source/anchor text is inconsistent');
  }
  return { afterIndex: anchor.index, distance };
}

function validateCurrentClaudeEvent(event, candidate, records, cursor) {
  const record = records[cursor.record_index - 1];
  if (!record || record.end !== cursor.byte_offset || claudeUserKind(record) !== 'human') {
    fail('CURSOR_MISMATCH', 'Claude cursor is not bound to the current native human event');
  }
  const nativeId = validateClaudeUser(record.value, candidate);
  if (nativeId !== event.native_id || claudeEventId(candidate.session_id, nativeId) !== event.event_id) {
    fail('MISMATCH', 'Claude current native event identity is inconsistent');
  }
  return { afterIndex: record.index, distance: 0 };
}

function assertNoNewNativeUser(records, startIndex, harness) {
  for (let index = startIndex; index < records.length; index += 1) {
    const record = records[index];
    if (harness === 'codex') {
      // Deliberately unfiltered: a newer user record revokes authority even when it
      // carries no UserMessage anchor yet. Reusing the scan's "injected context" skip
      // here would let an appended native prompt pass unseen — IDENTITY-STATE-007
      // covers exactly that, and it is the fail-open direction, so it stays strict.
      if (isCodexUserRecord(record)) {
        fail('INTERVENING_USER', 'a newer Codex native user event exists after the current authority cursor');
      }
      continue;
    }
    const kind = claudeUserKind(record);
    if (kind === 'human') {
      fail('INTERVENING_USER', 'a newer Claude native user event exists after the current authority cursor');
    }
    if (kind === 'unknown') {
      fail('UNKNOWN_SCHEMA', 'Claude user-like row lacks known native provenance');
    }
  }
}

// Re-observe an already attested current event. This is intentionally distinct
// from candidate attestation: it proves the durable cursor still names that
// exact native event and that no unqueued native user has appeared behind it.
export function observeCurrentNativeEvent({
  event,
  sessionId,
  cursor,
  transcriptPath = '',
  codexHome = '',
  observation = 'pre-tool',
  assistantText = '',
  allowTestSourceRoot = false,
  priorEvents = [],
}) {
  if (!['pre-tool', 'stop'].includes(observation)) fail('CANDIDATE_SCHEMA', 'native observation is invalid');
  const candidate = validateCurrentEventShape(event, sessionId);
  const source = sourceFor(candidate, transcriptPath, codexHome, allowTestSourceRoot === true);
  const loaded = recordsFromFile(source);
  validateCursor(cursor, source, loaded.records, loaded.bytes, candidate.harness);
  const validated = candidate.harness === 'codex'
    ? validateCurrentCodexEvent(event, candidate, loaded.records, cursor)
    : validateCurrentClaudeEvent(event, candidate, loaded.records, cursor);
  assertNoNewNativeUser(loaded.records, cursor.record_index, candidate.harness);
  const stopWitnessId = observation === 'stop'
    ? candidate.harness === 'codex'
      ? codexStopWitness(loaded.records, validated.afterIndex, assistantText, event.stop_witness_id || '')
      : claudeStopWitness(loaded.records, validated.afterIndex, assistantText, event.stop_witness_id || '')
    : '';
  if (stopWitnessId) {
    if (candidate.harness === 'codex') {
      assertCodexStopUnambiguous(loaded.records, candidate, event.event_id,
        validated.afterIndex, assistantText, priorEvents);
    } else {
      assertClaudeStopUnambiguous(loaded.records, candidate, event.event_id,
        validated.afterIndex, assistantText, priorEvents);
    }
  }
  return {
    event_id: event.event_id,
    boundary_id: event.boundary_id,
    native_id: event.native_id,
    anchor_id: event.anchor_id,
    distance: validated.distance,
    ...(stopWitnessId ? { stop_witness_id: stopWitnessId } : {}),
    cursor_after: cursor,
  };
}

export function attestNativeUserEvent({
  candidate,
  cursor = null,
  transcriptPath = '',
  codexHome = '',
  bootstrapFence = null,
  observation = 'pre-tool',
  assistantText = '',
  allowTestSourceRoot = false,
  requireNoFollowingUser = true,
  priorEvents = [],
}) {
  validateCandidate(candidate);
  if (!['pre-tool', 'stop'].includes(observation)) fail('CANDIDATE_SCHEMA', 'native observation is invalid');
  const source = sourceFor(candidate, transcriptPath, codexHome, allowTestSourceRoot === true);
  const loaded = recordsFromFile(source);
  // A tail selected by prompt equality cannot distinguish a new submission
  // from an unpublished retry of an older, identical native message.
  if (!cursor && !(bootstrapFence?.schema_version === 1
      && bootstrapFence.session_id === candidate.session_id
      && bootstrapFence.harness === candidate.harness && bootstrapFence.cwd === candidate.cwd
      && bootstrapFence.source_absent === true && bootstrapFence.cursor === null)) {
    fail('BOOTSTRAP_UNATTESTED', 'native event requires a pre-input SessionStart fence; resume or start a new session');
  }
  const effectiveCursor = cursor || cursorAt(source, loaded.records, loaded.bytes, 0, 0, candidate.harness);
  if (candidate.harness === 'codex') {
    return attestCodex(candidate, source, loaded.records, loaded.bytes, effectiveCursor, observation, assistantText,
      requireNoFollowingUser === true, priorEvents);
  }
  if (candidate.harness === 'claude') {
    return attestClaude(candidate, source, loaded.records, loaded.bytes, effectiveCursor, observation, assistantText,
      requireNoFollowingUser === true, priorEvents);
  }
  fail('UNKNOWN_SCHEMA', `unsupported native harness: ${candidate.harness}`);
}

// SessionStart establishes a read boundary, never an event identity. Existing
// history is excluded, while a proven absent source can later start at byte 0.
export function captureNativeEventFence({
  sessionId, harness, cwd, transcriptPath = '', codexHome = '', allowTestSourceRoot = false,
}) {
  const candidate = { session_id: String(sessionId || ''), harness, cwd };
  if (!/^[\w-]{1,36}$/.test(candidate.session_id) || !['codex', 'claude'].includes(harness)
      || !isAbsolute(String(cwd || ''))) fail('CANDIDATE_SCHEMA', 'native fence context is invalid');
  if (harness === 'claude') {
    if (!transcriptPath) fail('SOURCE_ROOT', 'Claude SessionStart must supply its transcript path');
    if (basename(transcriptPath) !== `${candidate.session_id}.jsonl`) fail('SESSION_MISMATCH', 'fence transcript filename mismatch');
    if (!allowTestSourceRoot) validateClaudeTranscriptLocation(resolve(transcriptPath), candidate);
  }
  const fence = { schema_version: 1, session_id: candidate.session_id, harness, cwd, source_absent: false, cursor: null };
  let source;
  try { source = sourceFor(candidate, transcriptPath, codexHome, allowTestSourceRoot === true); }
  catch (error) {
    if (error?.code !== 'SOURCE_NOT_VISIBLE') throw error;
    return { ...fence, source_absent: true };
  }
  const loaded = recordsFromFile(source);
  if (harness === 'codex') validateCodexProvenance(loaded.records, candidate);
  return { ...fence, cursor: cursorAt(source, loaded.records, loaded.bytes,
    loaded.records.length, loaded.bytes.length, harness) };
}
