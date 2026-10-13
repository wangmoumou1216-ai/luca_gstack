#!/usr/bin/env node
// Read-only byte identity and original JSONL line instances; never deduplicate IDs.
import {openSync, closeSync, fstatSync, lstatSync, readFileSync, constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function adoptionSnapshot(root) {
  const path = join(root, '.claude/skill-os/evolution/adoption-log.jsonl');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || !(before.mode & 0o444)) throw new Error('adoption ledger must be a readable, singly linked regular file');
    const bytes = readFileSync(fd), after = fstatSync(fd), named = lstatSync(path);
    if (['dev','ino','size','mtimeMs','ctimeMs'].some(k => before[k] !== after[k] || after[k] !== named[k])) throw new Error('adoption ledger changed while reading');
    const entries = [];
    new TextDecoder('utf-8', {fatal: true}).decode(bytes).split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      let row;
      try { row = JSON.parse(line); } catch { throw new Error(`malformed adoption ledger line ${i + 1}`); }
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.fused_candidate_id !== 'string' || !row.fused_candidate_id.trim()) throw new Error(`invalid adoption instance line ${i + 1}`);
      entries.push({line: i + 1, fused_candidate_id: row.fused_candidate_id});
    });
    return {version: 1, sha256: createHash('sha256').update(bytes).digest('hex'), byte_length: bytes.length, entries};
  } finally { closeSync(fd); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), opts = {};
    for (let i = 0; i < args.length; i++) {
      const key = args[i];
      if (key === '--workflow-args' && !opts[key]) { opts[key] = true; continue; }
      if (!['--root','--expect-sha256','--date'].includes(key) || !args[i + 1]?.trim() || args[i + 1].startsWith('--') || opts[key]) throw new Error('usage: evolution-adoption-snapshot.mjs [--root DIR] [--expect-sha256 HASH] [--workflow-args [--date RUN_DATE]]');
      opts[key] = args[++i];
    }
    if (opts['--date'] && !opts['--workflow-args']) throw new Error('--date requires --workflow-args');
    const snapshot = adoptionSnapshot(resolve(opts['--root'] || process.cwd()));
    if (opts['--expect-sha256'] && opts['--expect-sha256'] !== snapshot.sha256) throw new Error('stale adoption ledger byte hash');
    console.log(JSON.stringify(opts['--workflow-args'] ? {adoption_snapshot:snapshot, ...(opts['--date'] ? {date:opts['--date']} : {})} : snapshot));
  } catch (e) { console.error(e.message); process.exitCode = 2; }
}
