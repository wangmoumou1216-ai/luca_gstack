#!/usr/bin/env node
// Bounded read-only CLI. The only path input is the canonical framework root;
// supplied owned copies are raw stdin bytes, never arbitrary readable paths.
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_SCHEMA_VERSION, CONTRACT_API_MAJOR, MAX_DOCUMENT_BYTES, MAX_REPORT_BYTES,
  evaluateHookDocument, describeHookContract, checkContractCompatibility, compareHookDocuments } from './lib/codex-hook-contract.mjs';

function fail(code) { throw new Error(code); }
function identity(root) {
  if (!isAbsolute(root) || resolve(root) !== root || realpathSync(root) !== root) fail('ROOT_NOT_CANONICAL');
  const stat = lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('ROOT_NOT_DIRECTORY');
  return { canonicalPath: root, dev: stat.dev, ino: stat.ino };
}
const same = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
function sourceFile(root) {
  const path = join(root, '.codex/hooks.json');
  if (realpathSync(path) !== path) fail('SOURCE_NOT_CANONICAL');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || before.size > MAX_DOCUMENT_BYTES) fail('INVALID_SOURCE_FILE');
    const bytes = readFileSync(fd);
    if (!same(before, fstatSync(fd)) || !same(before, lstatSync(path))) fail('SOURCE_CHANGED_DURING_READ');
    return { bytes, fileIdentity: { dev: before.dev, ino: before.ino, size: before.size, mtimeMs: before.mtimeMs, ctimeMs: before.ctimeMs } };
  } finally { closeSync(fd); }
}
async function readDocument() {
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > MAX_DOCUMENT_BYTES) fail('DOCUMENT_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function main() {
  const report = { schemaVersion: CONTRACT_SCHEMA_VERSION, contractApiMajor: CONTRACT_API_MAJOR, ok: false,
    frameworkRootIdentity: null, sourceFileIdentity: null, contract: null, source: null, document: null,
    comparison: null, compatibility: { ok: false, problems: [] },
    adoption: { required: true, granted: false }, problems: [] };
  let usage = false;
  try {
    const args = process.argv.slice(2);
    if (args.shift() !== 'inspect') fail('USAGE');
    let root, stdin = false, json = false;
    while (args.length) {
      const flag = args.shift();
      if (flag === '--root' && root === undefined && args[0] && !args[0].startsWith('--')) root = args.shift();
      else if (flag === '--document-stdin' && !stdin) stdin = true;
      else if (flag === '--json' && !json) json = true;
      else fail('USAGE');
    }
    if (!root || !json) fail('USAGE');
    const rootIdentity = identity(root);
    if (realpathSync(fileURLToPath(import.meta.url)) !== join(root, 'scripts/codex-hook-contract.mjs')
        || realpathSync(join(root, 'scripts/lib/codex-hook-contract.mjs')) !== join(root, 'scripts/lib/codex-hook-contract.mjs')) fail('HELPER_ROOT_MISMATCH');
    report.frameworkRootIdentity = rootIdentity;
    const source = sourceFile(root), document = stdin ? await readDocument() : null;
    report.sourceFileIdentity = source.fileIdentity;
    report.source = evaluateHookDocument(source.bytes);
    report.contract = describeHookContract(source.bytes, rootIdentity);
    report.compatibility = checkContractCompatibility(report.contract);
    if (document !== null) {
      report.document = evaluateHookDocument(document);
      report.comparison = compareHookDocuments(source.bytes, document);
    }
    if (JSON.stringify(identity(root)) !== JSON.stringify(rootIdentity)) fail('ROOT_CHANGED_DURING_INSPECTION');
    const after = sourceFile(root);
    if (!same(source.fileIdentity, after.fileIdentity) || !source.bytes.equals(after.bytes)) fail('SOURCE_CHANGED_DURING_INSPECTION');
    report.ok = report.source.recognized && report.compatibility.ok;
  } catch (error) {
    usage = error.message === 'USAGE';
    report.ok = false;
    // Do not serialize raw JSON, command strings or arbitrary filesystem errors.
    report.problems.push(/^[A-Z_]+$/.test(error.message) ? error.message : 'INSPECTION_FAILED');
  }
  let output = JSON.stringify(report);
  if (Buffer.byteLength(output) > MAX_REPORT_BYTES) {
    output = JSON.stringify({ schemaVersion: CONTRACT_SCHEMA_VERSION, contractApiMajor: CONTRACT_API_MAJOR,
      ok: false, problems: ['REPORT_TOO_LARGE'] });
    report.ok = false;
  }
  process.stdout.write(`${output}\n`);
  process.exitCode = usage ? 2 : report.ok ? 0 : 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
