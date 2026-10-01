#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  absolutePathForRow,
  atomicWriteJson,
  canonicalJson,
  claimPaths,
  controlRoot,
  discoverControlState,
  gitCommonDirRealpath,
  pathsConflict,
  readToolReservations,
  writeToolReservations,
  blockedScopeConflicts,
  setNativeScopeState,
  discoverCheckoutControlState,
  pathTuple,
  repoRealpath,
  sha256Bytes,
  sha256File,
  tupleEqual,
  validateBoundRequired,
} from '../../scripts/controlled-change.mjs';
import {
  PROJECTS_ROOT,
  readProjectState,
  sanitizeSessionId,
} from './lib/project-substrate.mjs';
import {
  authorizePublicSelection,
  matchExpandedSelectionState,
  parseExpandedSelectionCommand,
} from './lib/project-selection.mjs';

import { attestControlledOwner, controllerInvocation, issueNativeClaim, nativeClaimRoot, readonlyShellInput, reservationSource, sameNativeOwner, withControlLock } from '../../scripts/controlled-native-owner.mjs';

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

function consumeEffect(current, effect, command, invocationCwd, data) {
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
    ...(witness.native_owner ? { exclusive_lane: true, lane_tool: laneTool(data, command) } : {}),
  };
  if (witness.native_owner) setNativeScopeState(manifest, witness.native_owner, witness.generation, 'ACTIVE', true);
  atomicWriteJson(paths.witness, nextWitness, { expectedSha256: sha256File(paths.witness) });
  validateBoundRequired(nextWitness, active);
}

function laneTool(data, command) {
  return { session_id: data.session_id, turn_id: data.turn_id, tool_use_id: data.tool_use_id,
    command_sha256: sha256Bytes(Buffer.from(command)), inflight: true };
}

function guardRequired(data, current, globalState) {
  if (current.witness.lane_tool?.inflight) { emitDeny('previous exclusive tool is still in flight'); return; }
  const manifest = current.manifest;
  const tool = String(data.tool_name || '');
  const input = data.tool_input && typeof data.tool_input === 'object' ? data.tool_input : {};

  // Project/path isolation runs independently; these native tools do not mutate.
  if (['Read', 'Glob', 'Grep'].includes(tool)) return;

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
      if (current.witness.native_owner && ((globalState.currents.length !== 1 || globalState.blocked.length)
          || current.witness.effect_authorizations.some(item => item.remaining_uses === 0))) {
        emitDeny('Git/shared effects require a single REQUIRED and no unresolved effect'); return;
      }
      const invocationCwd = typeof data.cwd === 'string' && data.cwd
        ? data.cwd
        : (process.env.CLAUDE_PROJECT_DIR || process.cwd());
      try { consumeEffect(current, effect, command, invocationCwd, data); }
      catch (error) { emitDeny(error.message); }
      return;
    }
    let authorizedCommand = command.trim();
    const expandedSelection = parseExpandedSelectionCommand(authorizedCommand);
    if (expandedSelection) {
      try {
        if (sanitizeSessionId(expandedSelection.session_id) !== expandedSelection.session_id) {
          throw new Error('expanded selection session id is not canonical');
        }
        const state = readProjectState(manifest.repo_realpath, expandedSelection.session_id, PROJECTS_ROOT).value;
        const matched = matchExpandedSelectionState({ parsed: expandedSelection, state });
        if (!matched) throw new Error('expanded selection lacks a matching trusted proposal or committed receipt');
        authorizedCommand = authorizePublicSelection({
          manifest,
          selection: expandedSelection,
          projectsRoot: PROJECTS_ROOT,
          mode: matched.mode,
          trustedRecord: matched.record,
        }).publicCommand;
      } catch (error) {
        emitDeny(`project selection authorization failed: ${error.message}`);
        return;
      }
    }
    if (manifest.allowed_commands.includes(authorizedCommand)) {
      if (current.witness.native_owner) {
        if ((globalState.currents.length !== 1 || globalState.blocked.length)) { emitDeny('opaque Bash requires checkout-exclusive lane'); return; }
        setNativeScopeState(manifest, current.witness.native_owner, current.witness.generation, 'ACTIVE', true);
        atomicWriteJson(current.paths.witness, { ...current.witness, exclusive_lane: true, lane_tool: laneTool(data, command) },
          { expectedSha256: sha256File(current.paths.witness) });
      }
      return;
    }
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

function structuredTargets(data) {
  const input = data.tool_input || {};
  if (data.tool_name === 'apply_patch') {
    const targets = parsePatchTargets(String(input.command || ''));
    if (!targets) throw new Error('unrecognized structured patch');
    return targets;
  }
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(data.tool_name)) {
    const target = input.file_path || input.notebook_path || input.path;
    if (typeof target !== 'string' || !target) throw new Error('structured edit lacks an exact path');
    return [target];
  }
  return null;
}

async function main() {
  const repo = repoRealpath(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const data = JSON.parse(readFileSync(0, 'utf8') || '{}');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('hook stdin must be an object');
  if (data.hook_event_name === 'PostToolUse') {
    if (data.tool_name === 'Bash' && readonlyShellInput(data.tool_input?.command)) return;
    return withControlLock(controlRoot(repo), () => {
      const state = discoverControlState(repo);
      const pending = readToolReservations(repo);
      const remaining = pending.filter(tool => !(tool.session_id === data.session_id && tool.turn_id === data.turn_id
        && tool.tool_use_id === data.tool_use_id && tool.repo_realpath === repo));
      if (remaining.length !== pending.length) writeToolReservations(repo, remaining);
      if (state.kind !== 'required') return;
      for (const current of state.currents) {
        const lane = current.witness.lane_tool;
        if (lane?.inflight && lane.session_id === data.session_id && lane.turn_id === data.turn_id
            && lane.tool_use_id === data.tool_use_id && lane.command_sha256 === sha256Bytes(Buffer.from(data.tool_input?.command || ''))) {
          atomicWriteJson(current.paths.witness, { ...current.witness,
            lane_tool: { ...lane, inflight: false } }, { expectedSha256: sha256File(current.paths.witness) });
        }
      }
    }, { wait: true });
  }
  // Corrupt mutation state must never disable safe inspection.
  if (['Read', 'Glob', 'Grep'].includes(data.tool_name)) return;
  if (data.tool_name === 'Bash') {
    const command = readonlyShellInput(data.tool_input?.command);
    if (command) {
      process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow',
        updatedInput: { ...data.tool_input, command } } })}\n`);
      return;
    }
  }
  const targets = structuredTargets(data);
  if (targets) {
    const reserved = [gitCommonDirRealpath(repo), `${repo}/.git`, `${repo}/.claude/.session`, resolve(nativeClaimRoot(repo), '..')];
    for (const target of targets) {
      const absolute = resolve(data.cwd || repo, target);
      if (reserved.some(path => pathsConflict(absolute, path))
          || absolute.startsWith(`${repo}/.claude/.session-`)) throw new Error('structured edit targets protected control metadata');
    }
  }
  return withControlLock(controlRoot(repo), () => {
    const globalState = discoverControlState(repo);
    const state = discoverCheckoutControlState(repo);
    if (state.kind === 'invalid') throw new Error(`controlled state is invalid: ${state.reason}`);
    if (targets?.some(target => globalState.blocked?.some(entry => blockedScopeConflicts(entry, resolve(data.cwd || repo, target))))) throw new Error('structured edit intersects a damaged task scope');
    const invocation = data.tool_name === 'Bash' ? controllerInvocation(repo, data.tool_input?.command || '') : null;
    if (invocation) {
      const owner = attestControlledOwner(repo, data);
      const existing = globalState.entries.find(entry => entry.witness?.task_id === invocation.manifest?.task_id);
      if (existing?.witness?.native_owner && !sameNativeOwner(owner, existing.witness.native_owner)) throw new Error('controller belongs to another native owner');
      if (existing?.kind === 'required' && !existing.witness.native_owner) throw new Error('native controller cannot take over legacy REQUIRED');
      if (invocation.operation === 'recover-tool') {
        const reservation = readToolReservations(repo).find(row => row.tool_use_id === invocation.options['tool-use-id']);
        if (!reservation || reservation.session_id !== owner.session_id || reservation.turn_id !== invocation.options['turn-id']) throw new Error('recovery does not belong to current owner and original turn');
      }
      const claim = issueNativeClaim(repo, data, invocation);
      process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse',
        permissionDecision: 'allow', updatedInput: { ...data.tool_input,
          command: `${data.tool_input.command} --native-owner-claim '${claim.path}'` } } })}\n`);
      return;
    }
    if (!targets && globalState.blocked?.some(row => row.exclusive)) throw new Error('shared exclusive effects require damaged owner reconciliation');
    if (!targets && readToolReservations(repo).some(row => row.repo_realpath === repo)) throw new Error('opaque Bash is fenced while structured tools await completion or recovery');
    const reserve = taskId => {
      if (!targets || data.hook_event_name !== 'PreToolUse' || !data.turn_id) return;
      const pending = readToolReservations(repo);
      const absoluteTargets = targets.map(target => resolve(data.cwd || repo, target));
      if (pending.some(tool => tool.targets.some(path => absoluteTargets.some(target => pathsConflict(target, path))))) throw new Error('structured target already has an in-flight tool');
      writeToolReservations(repo, [...pending, { session_id: data.session_id, turn_id: data.turn_id,
        tool_use_id: data.tool_use_id, repo_realpath: repo, task_id: taskId || null, targets: absoluteTargets,
        created_at: Date.now(), request_sha256: sha256Bytes(canonicalJson([data.tool_name, data.tool_input])),
        source: reservationSource(repo, data.session_id) }]);
    };
    if (state.kind === 'inactive') {
      if (targets && data.hook_event_name === 'PreToolUse' && data.turn_id) { attestControlledOwner(repo, data); reserve(); }
      return;
    }
    if (!targets && state.blocked?.length) throw new Error('opaque effects cannot run while this checkout has damaged task authority');
    // Existing unbound records retain their explicit checkout-exclusive compatibility.
    if (state.current && !state.current.witness.native_owner) { guardRequired(data, state.current, globalState); return; }
    const owner = attestControlledOwner(repo, data);
    const owned = state.currents.filter(entry => sameNativeOwner(entry.witness.native_owner, owner));
    if (owned.length) {
      const matching = targets ? owned.filter(entry => targets.every(target =>
        safeScratchTarget(resolve(data.cwd || repo, target), entry.manifest.scratch_root)
          || rowForTarget(entry.manifest, target))) : owned;
      if (matching.length !== 1) throw new Error('tool must belong to exactly one native owner task');
      for (const entry of state.currents) if (entry !== matching[0] && targets?.some(target =>
        claimPaths(entry.manifest).some(path => pathsConflict(resolve(data.cwd || repo, target), path)))) throw new Error('tool conflicts with another task claim');
      guardRequired(data, matching[0], globalState);
      if (!process.exitCode) reserve(matching[0].manifest.task_id);
      return;
    }
    // A third session can make provable disjoint edits, never borrow commands or one-use effects.
    if (!targets) throw new Error('non-owner opaque mutation is denied while native claims are active');
    if (state.currents.some(entry => entry.witness.exclusive_lane)) throw new Error('checkout-exclusive lane is active');
    if (targets.some(target => state.currents.some(entry => claimPaths(entry.manifest).some(path =>
      pathsConflict(resolve(data.cwd || repo, target), path))))) throw new Error('structured edit conflicts with active owner scope');
    reserve();
  }, { wait: true });
}

try { await main(); }
catch (error) { emitDeny(`guard refused mutation: ${error.message}`); }
