// Native ownership is derived from the existing attested event, never manifest.session.
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { attestPendingProjectEvent, readProjectState, sanitizeSessionId } from '../.claude/hooks/lib/project-substrate.mjs';
import { nativeClaimRoot, canonicalJson, loadManifestFile, manifestSha256, parseCli, sha256Bytes } from './controlled-change.mjs';

export { nativeClaimRoot } from './controlled-change.mjs';
const CONTROLLER = realpathSync(join(dirname(fileURLToPath(import.meta.url)), 'controlled-change-controller.mjs'));
const hash = value => sha256Bytes(Buffer.from(canonicalJson(value)));
const fail = message => { throw new Error(message); };

export async function withControlLock(root, operation, { wait = false } = {}) {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const child = spawn('/usr/bin/python3', ['-c', String.raw`
import fcntl, os, sys
fd = os.open(sys.argv[1], os.O_RDONLY)
try:
    fcntl.flock(fd, fcntl.LOCK_EX | (0 if sys.argv[2] == 'wait' else fcntl.LOCK_NB))
except BlockingIOError:
    sys.exit(73)
print('READY', flush=True)
sys.stdin.buffer.read()
os.close(fd)
`, root, wait ? 'wait' : 'nowait'], { stdio: ['pipe', 'pipe', 'pipe'] });
  await new Promise((yes, no) => {
    let out = '';
    child.stdout.on('data', bytes => { out += bytes; if (out.includes('READY\n')) yes(); });
    child.on('error', no);
    child.on('exit', code => no(new Error(`controlled common-directory lock unavailable (${code})`)));
  });
  try { return await operation(); }
  finally {
    await new Promise((yes, no) => {
      child.once('close', code => code === 0 ? yes() : no(new Error('controlled lock release failed')));
      child.stdin.end();
    });
  }
}

export function attestControlledOwner(repo, data) {
  const sid = String(data.session_id || '');
  const turn = String(data.turn_id || '');
  if (!sid || sid !== sanitizeSessionId(sid) || !turn || !data.tool_use_id
      || data.hook_event_name !== 'PreToolUse' || realpathSync(data.cwd || '.') !== repo) {
    fail('native owner requires exact session, current turn, tool use, and checkout');
  }
  const observed = attestPendingProjectEvent({
    gstackRoot: repo, sessionId: sid, boundaryId: turn, cwd: repo,
    transcriptPath: String(data.transcript_path || ''), codexHome: process.env.CODEX_HOME || '',
  });
  if (observed.event.harness !== 'codex' || observed.state.session_id !== sid
      || observed.event.boundary_id !== turn || observed.event.status !== 'active') fail('native owner event mismatch');
  return { version: 1, harness: 'codex', session_id: sid, repo_realpath: repo };
}

export function sameNativeOwner(left, right) {
  return Boolean(left && right && canonicalJson(left) === canonicalJson(right));
}

// A deliberately small single-argv shell grammar. No JS, substitutions, chaining, or redirection.
function shellWords(command) {
  if (/[\r\n]/.test(command)) return null;
  const words = [];
  let word = '', quote = '', started = false;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = '';
      else { if (quote === '"' && /[$`\\]/.test(c)) return null; word += c; }
    } else if (c === "'" || c === '"') { quote = c; started = true; }
    else if (/\s/.test(c)) { if (started) { words.push(word); word = ''; started = false; } }
    else if (/[;&|<>`$\\()]/.test(c)) return null;
    else { word += c; started = true; }
  }
  if (quote) return null;
  if (started) words.push(word);
  return words;
}

export function readonlyShellInput(command) {
  const words = shellWords(String(command || ''));
  if (!words?.length) return null;
  let binary, args = words.slice(1);
  if (['node', process.execPath].includes(words[0]) && words.length === 5
      && words[2] === 'inspect-recovery' && words[3] === '--repo') {
    let script; try { script = realpathSync(words[1]); } catch { return null; }
    if (script !== CONTROLLER) return null;
    binary = process.execPath; args = [CONTROLLER, ...words.slice(2)];
  } else
  if (['pwd', '/bin/pwd'].includes(words[0])) {
    if (args.length) return null;
    binary = '/bin/pwd';
  } else if (['head', '/usr/bin/head'].includes(words[0])) {
    if (args.length !== 3 || args[0] !== '-n' || !/^[1-9][0-9]{0,5}$/.test(args[1])
        || !args[2] || args[2].startsWith('-')) return null;
    binary = '/usr/bin/head';
  } else if (['cat', '/bin/cat'].includes(words[0])) {
    binary = '/bin/cat';
    if (!args.length || args.some(arg => arg === '-' || (arg.startsWith('-') && arg !== '--' && !/^-[benstuvET]+$/.test(arg)))) return null;
  } else if (words[0] === 'rg' || words[0].endsWith('/rg')) {
    const flags = new Set(['--files', '--hidden', '--no-ignore', '-n', '--line-number', '-l', '--files-with-matches',
      '-F', '--fixed-strings', '-i', '--ignore-case', '-S', '--smart-case', '--no-heading', '--no-config']);
    const valued = new Set(['-g', '--glob', '--iglob', '-t', '--type', '-m', '--max-count', '--max-depth']);
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--') break;
      if (valued.has(args[i])) { if (++i >= args.length || args[i].startsWith('-')) return null; }
      else if (args[i].startsWith('-') && !flags.has(args[i])) return null;
    }
    const located = spawnSync('/usr/bin/which', ['rg'], { encoding: 'utf8' });
    if (located.status !== 0) return null;
    binary = realpathSync(located.stdout.trim());
    if (words[0] !== 'rg' && realpathSync(words[0]) !== binary) return null;
    args = ['--no-config', ...args];
  } else return null;
  const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
  return [binary, ...args].map(quote).join(' ');
}

export function controllerInvocation(repo, command) {
  const words = shellWords(String(command));
  if (!words || !['node', process.execPath, '/usr/bin/node'].includes(words[0]) || words.length < 3) return null;
  let script;
  try { script = realpathSync(resolve(repo, words[1])); } catch { return null; }
  if (script !== CONTROLLER && script !== join(repo, 'scripts', 'controlled-change-controller.mjs')) return null;
  const args = words.slice(2);
  const { command: operation, options } = parseCli(args);
  if (!['prepare', 'record', 'authorize-effect', 'finish', 'abort', 'recover-tool'].includes(operation) || options._.length) fail('invalid controlled controller invocation');
  if (options['native-owner-claim'] || options['legacy-checkout-exclusive'] || options.now) fail('native caller cannot supply claims, legacy downgrade, or a clock override');
  if (operation === 'recover-tool') {
    if (options.repo !== repo || !options['tool-use-id'] || !options['turn-id'] || !options['expected-sha'] || !options.reason) fail('tool recovery requires exact repo, original tool/turn, reservation SHA and reason');
    return { args, operation, options, manifest: null };
  }
  if (!options.manifest) fail('controller requires a manifest');
  const manifest = loadManifestFile(resolve(repo, options.manifest));
  if (manifest.repo_realpath !== repo) fail('controller manifest checkout mismatch');
  return { args, operation, options, manifest };
}

function writeExclusive(path, value) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, `${canonicalJson(value)}\n`); fsyncSync(fd); }
  finally { closeSync(fd); }
  const dir = openSync(dirname(path), 'r');
  try { fsyncSync(dir); } finally { closeSync(dir); }
}

export function issueNativeClaim(repo, data, invocation) {
  const owner = attestControlledOwner(repo, data);
  const nonce = hash([owner, data.turn_id, data.tool_use_id, invocation.args]);
  const path = join(nativeClaimRoot(repo, true), `${nonce}.json`);
  const claim = {
    version: 1, owner, manifest_sha256: invocation.manifest ? manifestSha256(invocation.manifest) : hash(['recover-tool', repo]),
    args_sha256: hash(invocation.args), issued_at: Date.now(),
    observation: { hook_event_name: 'PreToolUse', session_id: data.session_id,
      turn_id: data.turn_id, tool_use_id: data.tool_use_id, cwd: repo,
      transcript_path: data.transcript_path || '' },
  };
  if (existsSync(`${path}.used`)) fail('native tool-use claim replay');
  if (!existsSync(path)) writeExclusive(path, claim);
  return { owner, path };
}

export function consumeNativeClaim(repo, path, args, manifest, expectedOwner) {
  const root = nativeClaimRoot(repo, true);
  if (dirname(path) !== root || !/^[a-f0-9]{64}\.json$/.test(path.slice(root.length + 1))) fail('native claim is outside the protected claim store');
  const st = lstatSync(path);
  if (!st.isFile() || st.isSymbolicLink() || st.uid !== process.getuid() || (st.mode & 0o077)) fail('native claim is not a private regular file');
  const claim = JSON.parse(readFileSync(path, 'utf8'));
  if (claim.version !== 1 || claim.args_sha256 !== hash(args)
      || claim.manifest_sha256 !== (manifest ? manifestSha256(manifest) : hash(['recover-tool', repo])) || claim.owner?.repo_realpath !== repo
      || !Number.isInteger(claim.issued_at) || Date.now() - claim.issued_at > 60000
      || claim.issued_at > Date.now()) fail('native claim binding or freshness mismatch');
  const owner = attestControlledOwner(repo, claim.observation);
  if (!sameNativeOwner(owner, claim.owner)) fail('native claim owner changed');
  if (expectedOwner && !sameNativeOwner(owner, expectedOwner)) fail('native claim belongs to a different owner');
  writeExclusive(`${path}.used`, { consumed_at: Date.now() });
  return owner;
}

export function reservationSource(repo, sid) {
  const cursor = readProjectState(repo, sid).value.event_control?.cursor;
  if (!cursor?.transcript_path) fail('reservation lacks attested native source');
  const path = cursor.transcript_path, st = lstatSync(path), bytes = readFileSync(path);
  if (realpathSync(path) !== path || !st.isFile() || String(st.dev) !== cursor.dev || String(st.ino) !== cursor.ino) fail('reservation source identity changed');
  const size = bytes.lastIndexOf(10) + 1;
  return { path, dev: String(st.dev), ino: String(st.ino), size, prefix_sha256: sha256Bytes(bytes.subarray(0, size)) };
}

export function verifyReservationCompleted(reservation) {
  const source = reservation.source;
  if (!source) fail('reservation lacks recoverable native source proof');
  const st = lstatSync(source.path), bytes = readFileSync(source.path);
  if (realpathSync(source.path) !== source.path || !st.isFile() || String(st.dev) !== source.dev
      || String(st.ino) !== source.ino || bytes.length < source.size
      || sha256Bytes(bytes.subarray(0, source.size)) !== source.prefix_sha256) fail('reservation source prefix/identity changed');
  const records = bytes.subarray(source.size).toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const matches = records.filter(row => row.type === 'event_msg' && row.payload?.type === 'item_completed'
    && row.payload.thread_id === reservation.session_id && row.payload.turn_id === reservation.turn_id
    && row.payload.item?.id === reservation.tool_use_id && ['CommandExecution', 'FileChange'].includes(row.payload.item.type)
    && ['completed', 'failed', 'declined'].includes(row.payload.item.status)
    && Number.isFinite(row.payload.completed_at_ms) && row.payload.completed_at_ms >= reservation.created_at);
  if (matches.length !== 1) fail('exact native terminal tool evidence is missing or ambiguous');
  return { evidence_sha256: hash(matches[0]), outcome: matches[0].payload.item.status };
}
