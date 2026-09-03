#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { READ_GRANTS_ENABLED, authorizeRead, readGrantSet } from '../.claude/hooks/lib/project-read-grants.mjs';
import {
  PROJECTS_ROOT,
  readProjectState,
  validatedBindingForState,
} from '../.claude/hooks/lib/project-substrate.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MAX_READ_BYTES = 1024 * 1024;
const MAX_LIST_ENTRIES = 500;
const MAX_SEARCH_FILES = 500;
const MAX_SEARCH_BYTES = 5 * 1024 * 1024;
const MAX_MATCHES = 1000;

function fail(message, code = 2) {
  process.stderr.write(`[project-read] ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const [verb, ...rest] = argv;
  if (!['read', 'list', 'search'].includes(verb)) fail('verb must be read, list, or search');
  const allowed = new Set(['--cap', '--relative', '--pattern']);
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (!allowed.has(flag) || value === undefined || options[flag] !== undefined) fail(`invalid argument: ${flag || '(missing)'}`);
    options[flag] = value;
  }
  if (!options['--cap']) fail('--cap is required');
  if (verb === 'search' && !options['--pattern']) fail('search requires --pattern');
  if (verb === 'search' && options['--relative'] !== undefined) fail('--relative is not valid for search');
  if (verb !== 'search' && options['--pattern'] !== undefined) fail('--pattern is only valid for search');
  return { verb, cap: options['--cap'], relative: options['--relative'], pattern: options['--pattern'] };
}

function parseCap(value) {
  const match = String(value || '').match(/^([\w-]{1,36}):([0-9a-f-]{36})$/i);
  if (!match) fail('cap must be <session-id>:<grant-id>');
  return { sessionId: match[1], grantId: match[2] };
}

function safeRelative(value) {
  if (value === undefined) return '';
  if (!value || isAbsolute(value)) fail('--relative must be a non-empty relative path');
  const parts = value.split(/[\\/]/);
  if (parts.some((part) => !part || part === '.' || part === '..')) fail('--relative contains traversal or empty segments');
  return parts.join(sep);
}

function currentBinding(gstackRoot, sessionId) {
  try {
    const state = readProjectState(gstackRoot, sessionId, PROJECTS_ROOT).value;
    return {
      state,
      valid: ['NO_PIN', 'TURN_ACTIVE'].includes(state.state),
      binding: validatedBindingForState(state, PROJECTS_ROOT),
      turnId: state.state === 'TURN_ACTIVE' ? state.turn.turn_id : undefined,
    };
  } catch {
    return { state: { state: 'INVALID' }, valid: false, binding: null, turnId: undefined };
  }
}

function fatalUtf8(buffer, label) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { fail(`${label} is not valid UTF-8 text`, 3); }
}

function readText(path) {
  const stat = statSync(path);
  if (!stat.isFile()) fail('read target is not a regular file', 3);
  if (stat.size > MAX_READ_BYTES) fail(`read target exceeds ${MAX_READ_BYTES} bytes`, 3);
  return fatalUtf8(readFileSync(path), path);
}

function listDirectory(path) {
  const stat = statSync(path);
  if (!stat.isDirectory()) fail('list target is not a directory', 3);
  const entries = readdirSync(path, { withFileTypes: true });
  if (entries.length > MAX_LIST_ENTRIES) fail(`directory exceeds ${MAX_LIST_ENTRIES} entries`, 3);
  return entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => `${entry.isDirectory() ? 'd' : entry.isFile() ? 'f' : entry.isSymbolicLink() ? 'l' : '?'}\t${entry.name}`)
    .join('\n');
}

function searchDirectory(root, pattern) {
  if (!pattern) fail('search pattern must be non-empty');
  if (!statSync(root).isDirectory()) fail('search target is not a directory', 3);
  const stack = [root];
  const output = [];
  let files = 0;
  let bytes = 0;
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink() || lstatSync(path).isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (!entry.isFile()) continue;
      files += 1;
      const stat = statSync(path);
      bytes += stat.size;
      if (files > MAX_SEARCH_FILES || bytes > MAX_SEARCH_BYTES) fail('search bounds exceeded', 3);
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path)); }
      catch { continue; }
      for (const [index, line] of text.split(/\r?\n/).entries()) {
        if (!line.includes(pattern)) continue;
        output.push(`${relative(root, path)}:${index + 1}:${line}`);
        if (output.length > MAX_MATCHES) fail(`search exceeds ${MAX_MATCHES} matches`, 3);
      }
    }
  }
  return output.join('\n');
}

const args = parseArgs(process.argv.slice(2));
const { sessionId, grantId } = parseCap(args.cap);
const gstackRoot = process.env.CLAUDE_PROJECT_DIR || process.env.LUCA_GSTACK_ROOT || ROOT;
// 2026-09-03 post-seal 增量审计的独立复审发现：readGrantSet() 本身不带 READ_GRANTS_ENABLED
// 门——目前无害，只因为下面的 authorizeRead() 恒 deny；但若隔离解除时漏改这个文件，会重演
// "先信 sidecar 内容、后授权"的原始漏洞形状。门提到最前面，data 层不再靠 consumer 层兜底。
if (!READ_GRANTS_ENABLED) fail('read grants disabled', 3);
let set;
try { set = readGrantSet(gstackRoot, sessionId).value; }
catch (error) { fail(error.message, 3); }
const grant = set?.grants?.find((item) => item.id === grantId);
if (!grant) fail('grant not found', 3);
const rel = safeRelative(args.relative);
if (grant.kind === 'file' && rel) fail('file grants do not accept --relative');
if (grant.kind === 'directory' && args.verb === 'read' && !rel) fail('directory read requires --relative');
const targetPath = rel ? join(grant.canonical_realpath, rel) : grant.canonical_realpath;
const active = currentBinding(gstackRoot, sessionId);
if (!active.valid) fail(`project state ${active.state.state} cannot consume read grants`, 3);
const verdict = authorizeRead({
  gstackRoot,
  projectsRoot: PROJECTS_ROOT,
  sessionId,
  turnId: active.turnId,
  binding: active.binding,
  operation: args.verb,
  toolName: 'project-read',
  targetPath,
  grantId,
});
if (!verdict.allowed) fail(verdict.reason, 3);

let output = '';
if (args.verb === 'read') output = readText(verdict.canonicalPath);
if (args.verb === 'list') output = listDirectory(verdict.canonicalPath);
if (args.verb === 'search') output = searchDirectory(verdict.canonicalPath, args.pattern);
process.stdout.write(output + (output.endsWith('\n') || !output ? '' : '\n'));
