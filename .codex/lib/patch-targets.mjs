import { createHash } from 'crypto';
import { posix } from 'path';

const BEGIN = '*** Begin Patch';
const END = '*** End Patch';
const TARGET_HEADER = /^\*\*\* (Add|Update|Delete) File: (.+)$/;
const PROTECTED_ROOT_CASE = new Map([
  ['.claude', '.claude'],
  ['docs', 'docs'],
  ['framework', 'framework'],
]);

export class PatchEnvelopeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PatchEnvelopeError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PatchEnvelopeError(code, message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function asSourceBuffer(input) {
  if (typeof input !== 'string' && !Buffer.isBuffer(input)) {
    fail('PATCH_INPUT_TYPE', 'patch envelope must be a string or Buffer');
  }
  const source = Buffer.isBuffer(input) ? Buffer.from(input) : Buffer.from(input, 'utf8');
  if (!source.length) fail('PATCH_EMPTY', 'patch envelope is empty');
  if (!Buffer.from(source.toString('utf8'), 'utf8').equals(source)) {
    fail('PATCH_INVALID_UTF8', 'patch envelope must be valid UTF-8');
  }
  if (source.includes(0)) fail('PATCH_NUL', 'patch envelope contains a NUL byte');
  return source;
}

function lineRecords(source) {
  const lines = [];
  let start = 0;
  while (start < source.length) {
    const newline = source.indexOf(0x0a, start);
    const end = newline === -1 ? source.length : newline;
    const fullEnd = newline === -1 ? source.length : newline + 1;
    lines.push({
      start,
      end,
      full_end: fullEnd,
      text: source.subarray(start, end).toString('utf8'),
    });
    start = fullEnd;
  }
  return lines;
}

function validateRelativeTarget(value) {
  const target = String(value || '');
  if (!target || target !== target.trim()) {
    fail('PATCH_TARGET_EMPTY_OR_PADDED', `invalid patch target: ${JSON.stringify(target)}`);
  }
  if (target.includes('\\')) {
    fail('PATCH_TARGET_BACKSLASH', `patch target contains a backslash: ${target}`);
  }
  if (/[\u0000-\u001f\u007f]/.test(target)) {
    fail('PATCH_TARGET_CONTROL_BYTE', `patch target contains a control byte: ${JSON.stringify(target)}`);
  }
  if (target.startsWith('/') || /^[A-Za-z]:/.test(target)) {
    fail('PATCH_TARGET_ABSOLUTE', `absolute patch target is forbidden: ${target}`);
  }
  const parts = target.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    fail('PATCH_TARGET_TRAVERSAL', `patch target has an empty, dot, or traversal segment: ${target}`);
  }
  if (posix.normalize(target) !== target) {
    fail('PATCH_TARGET_NONCANONICAL', `patch target is not canonical: ${target}`);
  }
  const canonicalRoot = PROTECTED_ROOT_CASE.get(parts[0].toLowerCase());
  if (canonicalRoot && parts[0] !== canonicalRoot) {
    fail('PATCH_TARGET_CASE_VARIANT', `protected patch root must use canonical case: ${target}`);
  }
  return target;
}

function validateReplacement(value) {
  if (typeof value !== 'string' || !value || value !== value.trim()) {
    fail('PATCH_REPLACEMENT_INVALID', 'redirected patch target must be a non-empty unpadded string');
  }
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) {
    fail('PATCH_REPLACEMENT_INVALID', `redirected patch target is malformed: ${JSON.stringify(value)}`);
  }
  if (!value.startsWith('/')) return validateRelativeTarget(value);
  if (value === '/' || value.startsWith('//') || value.endsWith('/')) {
    fail('PATCH_REPLACEMENT_INVALID', `redirected absolute target is not canonical: ${value}`);
  }
  const parts = value.slice(1).split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..') || posix.normalize(value) !== value) {
    fail('PATCH_REPLACEMENT_INVALID', `redirected absolute target is not canonical: ${value}`);
  }
  return value;
}

function joinedHash(source, spans) {
  return sha256(Buffer.concat(spans.map(({ start, end }) => source.subarray(start, end))));
}

function complementSpans(length, excluded) {
  const spans = [];
  let cursor = 0;
  for (const span of excluded) {
    if (!Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.end)
        || span.start < cursor || span.end < span.start || span.end > length) {
      fail('PATCH_SPAN_INVALID', 'patch target spans are invalid or overlap');
    }
    if (cursor < span.start) spans.push({ start: cursor, end: span.start });
    cursor = span.end;
  }
  if (cursor < length) spans.push({ start: cursor, end: length });
  return spans;
}

function validateBody(operation, path, bodyLines) {
  if (operation === 'add') {
    if (!bodyLines.length) fail('PATCH_ADD_BODY', `Add File body must not be empty: ${path}`);
    if (bodyLines.some((line) => !line.text.startsWith('+'))) {
      fail('PATCH_ADD_BODY', `every Add File body line must begin with +: ${path}`);
    }
    return;
  }
  if (operation === 'delete') {
    if (bodyLines.length) fail('PATCH_DELETE_BODY', `Delete File body must be empty: ${path}`);
    return;
  }

  let sawHunk = false;
  let hunkHasLine = false;
  for (const line of bodyLines) {
    if (line.text === '@@' || /^@@ .+$/.test(line.text)) {
      if (sawHunk && !hunkHasLine) {
        fail('PATCH_UPDATE_BODY', `Update File contains an empty hunk: ${path}`);
      }
      sawHunk = true;
      hunkHasLine = false;
      continue;
    }
    if (!sawHunk || !/^[ +\-]/.test(line.text)) {
      fail('PATCH_UPDATE_BODY', `malformed Update File body: ${path}`);
    }
    hunkHasLine = true;
  }
  if (!sawHunk || !hunkHasLine) {
    fail('PATCH_UPDATE_BODY', `Update File body lacks a non-empty hunk: ${path}`);
  }
}

/**
 * Parse the native Codex apply_patch envelope without interpreting body prose.
 * Every offset is a UTF-8 byte offset into `source`, never a JS character index.
 */
export function parsePatchTargets(input) {
  const source = asSourceBuffer(input);
  const lines = lineRecords(source);
  if (lines[0]?.text !== BEGIN) {
    fail('PATCH_BEGIN', `patch must begin with the exact control line ${BEGIN}`);
  }

  const endIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].text === END) endIndexes.push(index);
  }
  if (endIndexes.length !== 1) {
    fail('PATCH_END_COUNT', `patch must contain exactly one ${END} control line`);
  }
  const endIndex = endIndexes[0];
  if (endIndex !== lines.length - 1) {
    fail('PATCH_AFTER_END', `data after ${END} is forbidden`);
  }

  const targets = [];
  const seen = new Set();
  let current = null;
  for (let lineIndex = 1; lineIndex < endIndex; lineIndex += 1) {
    const line = lines[lineIndex];
    const match = line.text.match(TARGET_HEADER);
    if (match) {
      const operation = match[1].toLowerCase();
      const path = validateRelativeTarget(match[2]);
      const key = path.toLowerCase();
      if (seen.has(key)) fail('PATCH_TARGET_DUPLICATE', `duplicate patch target: ${path}`);
      seen.add(key);
      const prefix = `*** ${match[1]} File: `;
      const pathStart = line.start + Buffer.byteLength(prefix, 'utf8');
      current = {
        index: targets.length,
        operation,
        path,
        line_index: lineIndex,
        header_span: { start: line.start, end: line.full_end },
        path_span: { start: pathStart, end: pathStart + Buffer.byteLength(path, 'utf8') },
        body_span: null,
      };
      targets.push(current);
      continue;
    }
    // Only column-zero, exact control lines are structural. Diff data such as
    // `+*** Add File: literal` remains ordinary body bytes.
    if (line.text.startsWith('***')) {
      fail('PATCH_CONTROL_UNKNOWN', `unknown, duplicate, move/rename, or malformed control line: ${line.text}`);
    }
    if (!current) fail('PATCH_BODY_BEFORE_TARGET', 'patch body appeared before the first target header');
  }
  if (!targets.length) fail('PATCH_TARGET_MISSING', 'patch contains no target headers');

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const nextLineIndex = index + 1 < targets.length ? targets[index + 1].line_index : endIndex;
    const start = lines[target.line_index].full_end;
    const end = lines[nextLineIndex].start;
    target.body_span = { start, end };
    validateBody(target.operation, target.path, lines.slice(target.line_index + 1, nextLineIndex));
  }

  const pathSpans = targets.map(({ path_span }) => ({ ...path_span }));
  const nonPathSpans = complementSpans(source.length, pathSpans);
  const bodySpans = targets.map(({ body_span }) => ({ ...body_span }));
  const sourceHash = sha256(source);
  const bodyHash = joinedHash(source, bodySpans);
  const nonPathHash = joinedHash(source, nonPathSpans);
  return {
    source,
    source_hash: sourceHash,
    targets,
    path_spans: pathSpans,
    body_spans: bodySpans,
    body_hash: bodyHash,
    non_header_spans: bodySpans.map((span) => ({ ...span })),
    non_header_hash: bodyHash,
    non_path_spans: nonPathSpans,
    non_path_hash: nonPathHash,
  };
}

function assertParsedInventory(parsed) {
  if (!parsed || !Buffer.isBuffer(parsed.source) || !Array.isArray(parsed.targets) || !parsed.targets.length) {
    fail('PATCH_INVENTORY_REQUIRED', 'parsed patch inventory is required');
  }
  if (sha256(parsed.source) !== parsed.source_hash) {
    fail('PATCH_INVENTORY_MUTATED', 'parsed patch source changed after classification');
  }
  let cursor = 0;
  for (const [index, target] of parsed.targets.entries()) {
    const span = target?.path_span;
    if (target?.index !== index || !span || span.start < cursor || span.end <= span.start
        || span.end > parsed.source.length) {
      fail('PATCH_INVENTORY_MUTATED', 'parsed patch target inventory is malformed');
    }
    if (parsed.source.subarray(span.start, span.end).toString('utf8') !== target.path) {
      fail('PATCH_INVENTORY_MUTATED', 'parsed patch target span no longer matches its path');
    }
    cursor = span.end;
  }
}

function translatedOffset(sourceOffset, spanMap) {
  let delta = 0;
  for (const item of spanMap) {
    if (item.source.end > sourceOffset) break;
    delta += (item.output.end - item.output.start) - (item.source.end - item.source.start);
  }
  return sourceOffset + delta;
}

/**
 * Replace only previously-classified header path spans. Absolute replacements
 * are reserved for guard-produced canonical outputs; source envelopes never
 * accept absolute targets.
 */
export function rewritePatchTargets(parsed, replacements) {
  assertParsedInventory(parsed);
  if (!Array.isArray(replacements) || replacements.length !== parsed.targets.length) {
    fail('PATCH_REPLACEMENT_COUNT', 'replacement inventory length does not match parsed targets');
  }

  const chunks = [];
  const spanMap = [];
  let sourceCursor = 0;
  let outputCursor = 0;
  for (let index = 0; index < parsed.targets.length; index += 1) {
    const target = parsed.targets[index];
    const replacement = validateReplacement(replacements[index]);
    const unchanged = parsed.source.subarray(sourceCursor, target.path_span.start);
    const replacementBytes = Buffer.from(replacement, 'utf8');
    chunks.push(unchanged, replacementBytes);
    outputCursor += unchanged.length;
    spanMap.push({
      index,
      source: { ...target.path_span },
      output: { start: outputCursor, end: outputCursor + replacementBytes.length },
      source_path: target.path,
      output_path: replacement,
    });
    outputCursor += replacementBytes.length;
    sourceCursor = target.path_span.end;
  }
  chunks.push(parsed.source.subarray(sourceCursor));
  const output = Buffer.concat(chunks);

  const preservedSource = [];
  const preservedOutput = [];
  let sourceStart = 0;
  let outputStart = 0;
  for (const item of spanMap) {
    preservedSource.push(parsed.source.subarray(sourceStart, item.source.start));
    preservedOutput.push(output.subarray(outputStart, item.output.start));
    sourceStart = item.source.end;
    outputStart = item.output.end;
  }
  preservedSource.push(parsed.source.subarray(sourceStart));
  preservedOutput.push(output.subarray(outputStart));
  const sourceNonPath = Buffer.concat(preservedSource);
  const outputNonPath = Buffer.concat(preservedOutput);
  if (!sourceNonPath.equals(outputNonPath)) {
    fail('PATCH_BYTES_CHANGED', 'bytes outside target path spans changed during rewrite');
  }

  const outputBodySpans = parsed.body_spans.map(({ start, end }) => ({
    start: translatedOffset(start, spanMap),
    end: translatedOffset(end, spanMap),
  }));
  const outputBodyHash = joinedHash(output, outputBodySpans);
  if (outputBodyHash !== parsed.body_hash) {
    fail('PATCH_BODY_CHANGED', 'patch body bytes changed during target rewrite');
  }
  const outputNonPathHash = sha256(outputNonPath);
  if (outputNonPathHash !== parsed.non_path_hash) {
    fail('PATCH_BYTES_CHANGED', 'non-path byte hash changed during target rewrite');
  }

  return {
    output,
    source_hash: parsed.source_hash,
    output_hash: sha256(output),
    body_hash: parsed.body_hash,
    output_body_hash: outputBodyHash,
    non_header_hash: parsed.non_header_hash,
    non_path_hash: parsed.non_path_hash,
    output_non_path_hash: outputNonPathHash,
    span_map: spanMap,
    body_span_map: parsed.body_spans.map((source, index) => ({
      index,
      source: { ...source },
      output: outputBodySpans[index],
    })),
  };
}
