#!/usr/bin/env node
import { closeSync, fchmodSync, fsyncSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateProjection, readAuthority, readSkillHeader } from './lib/semantic-projection.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRAPPER = '.claude/skills/office/magicpath/SKILL.md';
const TARGET = '.agents/skills/magicpath/SKILL.md';
const GRAPH = '.claude/skill-os/optional-workflow-graph.yaml';
const AUTHORITY = `${GRAPH}#handoff_gates.design_brief_to_magicpath`;

function fileVersion(stat, file) {
  const fields = file ? ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'] : ['dev', 'ino', 'mode'];
  return fields.map((field) => stat[field]).join(':');
}

function requireRegularPath(root, relative, snapshots) {
  const parts = relative.split('/');
  let path = root;
  for (let index = 0; index < parts.length; index++) {
    path = join(path, parts[index]);
    const stat = lstatSync(path, { bigint: true });
    const file = index === parts.length - 1;
    if (stat.isSymbolicLink() || !(file ? stat.isFile() : stat.isDirectory())) {
      throw new Error(`${path} must be a ${file ? 'regular file' : 'directory'}, never a symlink`);
    }
    if (!snapshots.has(path)) snapshots.set(path, {
      file, version: fileVersion(stat, file), mode: Number(stat.mode & 0o777n),
      bytes: file ? readFileSync(path) : null,
    });
  }
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}`);
}

// The root argument is for isolated fixture callers; the CLI always uses this checkout.
export function prepareMagicpathProjection(root = ROOT) {
  if (!isAbsolute(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) {
    throw new Error('root must be an exact absolute directory, never a symlink');
  }
  root = realpathSync(root);
  const snapshots = new Map([[root, {
    file: false, version: fileVersion(lstatSync(root, { bigint: true }), false),
  }]]);
  for (const relative of [WRAPPER, TARGET, GRAPH]) requireRegularPath(root, relative, snapshots);
  function assertUnchanged() {
    for (const [path, snapshot] of snapshots) {
      const stat = lstatSync(path, { bigint: true });
      if (stat.isSymbolicLink() || fileVersion(stat, snapshot.file) !== snapshot.version
          || (snapshot.file && !readFileSync(path).equals(snapshot.bytes))) {
        throw new Error(`projection input changed since preparation: ${path}`);
      }
    }
  }
  const wrapper = readSkillHeader(join(root, WRAPPER));
  const targetPath = join(root, TARGET);
  const target = readSkillHeader(targetPath);
  if (!Buffer.from(target.source).equals(snapshots.get(targetPath).bytes)) {
    throw new Error('target changed while reading or is not lossless UTF-8');
  }
  requireEqual(wrapper.name, 'magicpath', 'wrapper name');
  requireEqual(wrapper.metadata['codex-projection-mode'], 'external-delegation', 'projection mode');
  requireEqual(wrapper.metadata['codex-projection-target'], TARGET, 'projection target');
  requireEqual(wrapper.metadata['codex-obligation-source'], AUTHORITY, 'wrapper authority');
  requireEqual(target.name, 'magicpath', 'projection name');
  requireEqual(target.metadata['luca-wrapper'], WRAPPER, 'projection wrapper');
  requireEqual(target.metadata['luca-obligation-source'], AUTHORITY, 'projection authority');
  const current = target.metadata['luca-obligation-digest'];
  const expected = gateProjection(AUTHORITY, readAuthority(root, AUTHORITY)).digest;
  const header = target.source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const matches = [...(header || '').matchAll(/^([ ]+luca-obligation-digest:[ \t]*)(sha256:[a-f0-9]{64})([ \t]*(?:#[^\r\n]*)?)(\r?)$/gm)];
  if (matches.length !== 1 || matches[0][2] !== current) {
    throw new Error('target requires exactly one canonical metadata luca-obligation-digest line');
  }
  const tokenAt = target.source.indexOf(header) + matches[0].index + matches[0][1].length;
  const updated = target.source.slice(0, tokenAt) + expected + target.source.slice(tokenAt + current.length);
  assertUnchanged();
  return Object.freeze({
    current,
    expected,
    changed: current !== expected,
    write() {
      assertUnchanged();
      if (current === expected) return false;
      const temporary = join(dirname(targetPath), `.magicpath-digest-${randomUUID()}.tmp`);
      let fd;
      let created = false;
      let installed = false;
      try {
        fd = openSync(temporary, 'wx', snapshots.get(targetPath).mode);
        created = true;
        fchmodSync(fd, snapshots.get(targetPath).mode);
        writeFileSync(fd, updated);
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        // Reject edits made during preparation/staging; rename never installs a partial file.
        assertUnchanged();
        renameSync(temporary, targetPath);
        installed = true;
      } finally {
        if (fd !== undefined) closeSync(fd);
        if (created && !installed) {
          try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
      }
      return true;
    },
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--check', '--write'].includes(args[0]))) {
    console.error('Usage: node scripts/sync-magicpath-projection.mjs [--check | --write]');
    process.exitCode = 2;
  } else {
    try {
      const plan = prepareMagicpathProjection();
      if (args[0] === '--write') {
        const written = plan.write();
        console.log(`${written ? 'WROTE' : 'PASS'} MagicPath projection digest: ${plan.expected}`);
      } else if (plan.changed) {
        console.error(`DRIFT MagicPath projection digest: actual=${plan.current} expected=${plan.expected}`);
        process.exitCode = 1;
      } else {
        console.log(`PASS MagicPath projection digest: ${plan.expected}`);
      }
    } catch (error) {
      console.error(`FAIL MagicPath projection sync: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
