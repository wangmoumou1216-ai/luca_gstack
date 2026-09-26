import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

const SESSION_RE = /^[A-Za-z0-9_-]{1,36}$/;
const TX_RE = /^[A-Za-z0-9-]{8,128}$/;

function inside(candidate, root) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith('..') && !rel.includes(`${sep}..${sep}`));
}

export function tokenizeSelectionCommand(command) {
  const source = String(command || '').trim();
  if (!source || source.includes('\n') || source.includes('\r') || source.includes('\0')) return null;
  const words = [];
  let word = '';
  let quote = '';
  let started = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) { quote = ''; started = true; continue; }
      if (quote === '"' && (char === '$' || char === '`' || char === '\\')) return null;
      word += char;
      started = true;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; started = true; continue; }
    if (/\s/.test(char)) {
      if (started) { words.push(word); word = ''; started = false; }
      continue;
    }
    if (';&|<>`$(){}[]*?!\\'.includes(char)) return null;
    word += char;
    started = true;
  }
  if (quote || !started && words.length === 0) return null;
  if (started) words.push(word);
  return words;
}

function commandWords(command) {
  const words = tokenizeSelectionCommand(command);
  if (!words) return null;
  let cursor = 0;
  if (words[cursor] === 'bash') cursor += 1;
  if (!['scripts/project.sh', './scripts/project.sh'].includes(words[cursor])) return null;
  return words.slice(cursor + 1);
}

export function parsePublicSelectionCommand(command) {
  const words = commandWords(command);
  if (!words || words.length !== 2 || !['switch', 'new'].includes(words[0]) || !words[1]) return null;
  return { operation: words[0], target: words[1] };
}

export function parseExpandedSelectionCommand(command) {
  const words = commandWords(command);
  if (!words || words.length !== 8 || !['switch', 'new'].includes(words[0]) || !words[1]
      || words[2] !== '--session-id' || !SESSION_RE.test(words[3])
      || words[4] !== '--tx' || !TX_RE.test(words[5])
      || words[6] !== '--expected-epoch' || !/^\d+$/.test(words[7])) return null;
  const expectedEpoch = Number(words[7]);
  if (!Number.isSafeInteger(expectedEpoch)) return null;
  return {
    operation: words[0], target: words[1], session_id: words[3], tx: words[5], expected_epoch: expectedEpoch,
  };
}

export function shellQuoteSelectionWord(value) {
  const word = String(value || '');
  if (/^[A-Za-z0-9._\-/\u4e00-\u9fff]+$/u.test(word)) return word;
  return `'${word.replaceAll("'", `'"'"'`)}'`;
}

export function canonicalPublicSelectionCommand(value) {
  return `./scripts/project.sh ${value.operation} ${shellQuoteSelectionWord(value.target)}`;
}

export function expandedSelectionCommand(value) {
  return `${canonicalPublicSelectionCommand(value)} --session-id ${value.session_id} --tx ${value.tx} --expected-epoch ${value.expected_epoch}`;
}

export function minimalProjectContext(project) {
  return [`# ${project} — CONTEXT`, '', '> 项目级长期约束与共识；按项目需要逐步补充。', ''].join('\n');
}

function contextPostimage(project) {
  const bytes = Buffer.from(minimalProjectContext(project), 'utf8');
  return { type: 'file', mode: '100644', sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function projectReservationPath(projectsRoot, project) {
  const key = createHash('sha256').update(Buffer.from(String(project), 'utf8')).digest('hex').slice(0, 24);
  return join(realpathSync(resolve(projectsRoot)), `.luca-project-reservation-${key}.json`);
}

export function readProjectReservation(projectsRoot, project) {
  const path = projectReservationPath(projectsRoot, project);
  if (!existsSync(path)) return { path, value: null };
  const value = JSON.parse(readFileSync(path, 'utf8'));
  return { path, value };
}

function sameTuple(actual, expected) {
  return actual?.type === expected.type && actual?.mode === expected.mode && actual?.sha256 === expected.sha256;
}

function manifestContextRow(manifest, contextPath) {
  const repoRows = Array.isArray(manifest?.repo_paths) ? manifest.repo_paths : [];
  const externalRows = Array.isArray(manifest?.external_paths) ? manifest.external_paths : [];
  const repoPath = manifest?.repo_realpath && inside(contextPath, manifest.repo_realpath)
    ? relative(manifest.repo_realpath, contextPath).split(sep).join('/')
    : null;
  return repoPath
    ? repoRows.find(row => row?.path === repoPath)
    : externalRows.find(row => row?.path === contextPath);
}

export function authorizePublicSelection({ manifest, selection, projectsRoot, mode = 'prepare', trustedRecord = null }) {
  const publicCommand = canonicalPublicSelectionCommand(selection);
  if (!manifest?.allowed_commands?.includes(publicCommand)) {
    throw new Error(`controlled manifest does not allow canonical project selection: ${publicCommand}`);
  }
  if (selection.operation !== 'new' || mode === 'replay') return { publicCommand, contextPath: null };
  const root = realpathSync(resolve(projectsRoot));
  const targetRoot = join(root, selection.target);
  if (!inside(targetRoot, root) || targetRoot === root || resolve(targetRoot) !== targetRoot) {
    throw new Error('new target is not a direct canonical child of PROJECTS_ROOT');
  }
  const parent = realpathSync(resolve(targetRoot, '..'));
  if (parent !== root || lstatSync(root).isSymbolicLink()) throw new Error('new target parent identity is not trusted PROJECTS_ROOT');
  const contextPath = join(targetRoot, 'CONTEXT.md');
  const row = manifestContextRow(manifest, contextPath);
  const expectedPostimage = contextPostimage(selection.target);
  if (!row || row.mutation !== 'add' || row.preimage?.type !== 'absent' || !sameTuple(row.postimage, expectedPostimage)) {
    throw new Error('new requires an exact absent→minimal CONTEXT.md manifest row');
  }
  if (mode === 'prepare') {
    if (existsSync(targetRoot)) throw new Error('new target preimage is not absent');
    return { publicCommand, contextPath };
  }
  if (mode !== 'recover') throw new Error(`unsupported selection authorization mode: ${mode}`);
  const reservation = readProjectReservation(root, selection.target);
  const owner = reservation.value;
  if (!owner && trustedRecord?.tx === selection.tx
      && trustedRecord?.operation === 'new' && trustedRecord?.target === selection.target
      && trustedRecord?.status === 'RUNNING' && !existsSync(targetRoot)) {
    // The controller may die after atomically claiming RUNNING but before its
    // first filesystem side effect (the reservation create). The same trusted
    // tx can resume from the original absent preimage; a different tx cannot.
    return { publicCommand, contextPath };
  }
  if (!owner || owner.schema_version !== 1 || owner.tx !== selection.tx
      || owner.session_id !== selection.session_id || owner.operation !== 'new'
      || owner.target !== selection.target || trustedRecord?.tx !== selection.tx) {
    throw new Error('new recovery lacks an exact trusted reservation owner');
  }
  if (existsSync(targetRoot)) {
    const targetStat = lstatSync(targetRoot);
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink()
        || Number(targetStat.dev) !== owner.dev || Number(targetStat.ino) !== owner.ino) {
      throw new Error('new recovery target identity does not match its reservation');
    }
    if (existsSync(contextPath)) {
      const contextStat = statSync(contextPath);
      const actual = {
        type: contextStat.isFile() ? 'file' : 'other',
        mode: (contextStat.mode & 0o777).toString(8).padStart(6, '0').slice(-6),
        sha256: contextStat.isFile() ? createHash('sha256').update(readFileSync(contextPath)).digest('hex') : null,
      };
      actual.mode = `100${(contextStat.mode & 0o777).toString(8).padStart(3, '0')}`;
      if (!sameTuple(actual, expectedPostimage)) throw new Error('new recovery CONTEXT.md does not match the deterministic postimage');
    }
  } else if (owner.dev != null || owner.ino != null) {
    throw new Error('new recovery reservation claims a missing target identity');
  }
  return { publicCommand, contextPath };
}

export function matchExpandedSelectionState({ parsed, state }) {
  const exact = item => item && (item.tx || item.operation_id) === parsed.tx
    && (item.operation || item.kind) === parsed.operation
    && item.target === parsed.target && item.expected_epoch === parsed.expected_epoch;
  const pending = state?.selection?.pending || state?.switch;
  if (exact(pending) && ['PREPARED', 'RUNNING', 'CREATING'].includes(String(pending.status || 'PREPARED'))) {
    return { mode: pending.status === 'PREPARED' || !pending.status ? 'prepare' : 'recover', record: pending };
  }
  const receipts = Array.isArray(state?.selection?.receipts) ? state.selection.receipts : [];
  const receipt = receipts.find(item => item?.operation_id === parsed.tx);
  if (exact(receipt) && receipt.status === 'COMMITTED') return { mode: 'replay', record: receipt };
  return null;
}
