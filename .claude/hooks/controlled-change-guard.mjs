#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  absolutePathForRow,
  atomicWriteJson,
  canonicalJson,
  discoverControlState,
  pathTuple,
  repoRealpath,
  sha256Bytes,
  sha256File,
  tupleEqual,
  validateBoundRequired,
} from '../../scripts/controlled-change.mjs';

function emitDeny(reason) {
  const message = `[controlled-change] deny: ${reason}`;
  process.stderr.write(`${message}\n`);
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: message,
    },
  })}\n`);
  process.exitCode = 2;
}

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function safeScratchTarget(path, scratchRoot) {
  const target = resolve(path);
  const root = existsSync(scratchRoot) ? realpathSync(scratchRoot) : resolve(scratchRoot);
  if (!inside(target, root)) return false;
  let cursor = target;
  while (!existsSync(cursor)) {
    const parent = resolve(cursor, '..');
    if (parent === cursor) return false;
    cursor = parent;
  }
  try { return inside(realpathSync(cursor), root); } catch { return false; }
}

function parsePatchTargets(command) {
  const source = String(command || '');
  if (!source.startsWith('*** Begin Patch\n') || !source.trimEnd().endsWith('*** End Patch')) return null;
  const targets = [];
  const header = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm;
  for (const match of source.matchAll(header)) {
    const path = match[1].trim();
    if (!path) throw new Error('patch contains an empty target');
    if (!targets.includes(path)) targets.push(path);
  }
  if (!targets.length) throw new Error('patch has no recognized target headers');
  return targets;
}

function rowForTarget(manifest, target) {
  const absolute = isAbsolute(target) ? resolve(target) : resolve(manifest.repo_realpath, target);
  if (inside(absolute, manifest.repo_realpath)) {
    const rel = relative(manifest.repo_realpath, absolute).split(sep).join('/');
    const row = manifest.repo_paths.find((candidate) => candidate.path === rel);
    return row ? { row, scope: 'repo_paths', absolute } : null;
  }
  const row = manifest.external_paths.find((candidate) => candidate.path === absolute);
  return row ? { row, scope: 'external_paths', absolute } : null;
}

function assertTargetPreimages(manifest, targets) {
  for (const target of targets) {
    const absolute = isAbsolute(target) ? resolve(target) : resolve(manifest.repo_realpath, target);
    if (safeScratchTarget(absolute, manifest.scratch_root)) continue;
    const matched = rowForTarget(manifest, target);
    if (!matched) throw new Error(`target is outside current ${manifest.u_id} authority: ${target}`);
    const canonical = absolutePathForRow(manifest, matched.row, matched.scope);
    const actual = pathTuple(canonical);
    if (!tupleEqual(actual, matched.row.preimage)) {
      throw new Error(`stale preimage for ${target}: expected ${canonicalJson(matched.row.preimage)}, got ${canonicalJson(actual)}`);
    }
  }
}

function classifyGitEffect(command) {
  const match = String(command).match(/(?:^|[;&|]\s*)(?:\/usr\/bin\/)?git(?:\s+-C\s+\S+)?\s+(add|commit|push|update-ref|tag|branch|checkout|switch|reset|clean|stash|merge|rebase|cherry-pick|am|apply)\b/);
  if (!match) return null;
  const verb = match[1];
  if (verb === 'add' || verb === 'apply') return 'git-stage';
  if (verb === 'commit') return 'git-commit';
  if (verb === 'push') return 'git-push';
  if (['update-ref', 'tag', 'branch', 'checkout', 'switch'].includes(verb)) return 'git-ref';
  return 'git-worktree-effect';
}

function consumeEffect(current, effect, command, invocationCwd) {
  const { witness, active, manifest, paths } = current;
  let cwd;
  try { cwd = realpathSync(invocationCwd); }
  catch (error) { throw new Error(`effect cwd is not an existing realpath: ${error.message}`); }
  if (cwd !== manifest.repo_realpath) throw new Error('effect cwd does not equal the manifest repo identity');
  const commandSha256 = sha256Bytes(Buffer.from(command, 'utf8'));
  const index = witness.effect_authorizations.findIndex((item) => item.effect === effect
    && item.command_sha256 === commandSha256
    && item.repo_realpath === manifest.repo_realpath
    && item.cwd_realpath === cwd
    && item.remaining_uses === 1);
  if (index < 0) throw new Error(`Git/external effect lacks an exact one-use command/cwd authorization: ${effect}`);
  const authorizations = witness.effect_authorizations.map((item, i) => i === index ? {
    ...item,
    remaining_uses: 0,
    consumed_at: Date.now(),
    outcome: 'EFFECT_UNKNOWN',
  } : item);
  const nextWitness = {
    ...witness,
    effect_authorizations: authorizations,
  };
  atomicWriteJson(paths.witness, nextWitness, { expectedSha256: sha256File(paths.witness) });
  validateBoundRequired(nextWitness, active);
}

function guardRequired(data, current) {
  const manifest = current.manifest;
  const tool = String(data.tool_name || '');
  const input = data.tool_input && typeof data.tool_input === 'object' ? data.tool_input : {};

  if (tool === 'apply_patch' || tool === 'Bash') {
    const command = String(input.command || '');
    let patchTargets = null;
    try { patchTargets = parsePatchTargets(command); }
    catch (error) { emitDeny(error.message); return; }
    if (patchTargets) {
      const patchSha256 = manifest.metadata?.patch_sha256;
      if (!/^[0-9a-f]{64}$/.test(String(patchSha256 || ''))) {
        emitDeny('apply_patch requires manifest metadata.patch_sha256 as an exact lowercase SHA-256');
        return;
      }
      if (sha256Bytes(Buffer.from(command, 'utf8')) !== patchSha256) {
        emitDeny('patch bytes do not match manifest metadata.patch_sha256');
        return;
      }
      try { assertTargetPreimages(manifest, patchTargets); }
      catch (error) { emitDeny(error.message); }
      return;
    }
    if (tool === 'apply_patch') { emitDeny('apply_patch payload is not an exact recognized patch'); return; }

    const effect = classifyGitEffect(command);
    if (effect) {
      const invocationCwd = typeof data.cwd === 'string' && data.cwd
        ? data.cwd
        : (process.env.CLAUDE_PROJECT_DIR || process.cwd());
      try { consumeEffect(current, effect, command, invocationCwd); }
      catch (error) { emitDeny(error.message); }
      return;
    }
    if (manifest.allowed_commands.includes(command.trim())) return;
    emitDeny('Bash is deny-by-default in controlled mode; use an exact manifest allowed_command or a structured exact-path action');
    return;
  }

  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(tool)) {
    const target = input.file_path || input.notebook_path || input.path;
    if (typeof target !== 'string' || !target) { emitDeny(`${tool} has no target path`); return; }
    try { assertTargetPreimages(manifest, [target]); }
    catch (error) { emitDeny(error.message); }
    return;
  }

  emitDeny(`mutation tool is not supported in controlled mode: ${tool || '(missing)'}`);
}

function main() {
  const repo = repoRealpath(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); }
  catch { raw = ''; }
  let state;
  try { state = discoverControlState(repo); }
  catch (error) { emitDeny(`cannot inspect controlled state: ${error.message}`); return; }
  if (state.kind === 'inactive') return;
  if (state.kind === 'invalid') { emitDeny(`controlled state is invalid: ${state.reason}`); return; }
  let data;
  try { data = JSON.parse(raw || '{}'); }
  catch { emitDeny('hook stdin is malformed while controlled mode is required'); return; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) { emitDeny('hook stdin must be an object'); return; }
  guardRequired(data, state.current);
}

try { main(); }
catch (error) { emitDeny(`guard exception while controlled mode is required: ${error.message}`); }
