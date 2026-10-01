#!/usr/bin/env node
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { canonicalJson, discoverControlState, gitCommonDirRealpath, pathTuple, sha256Bytes, sha256File, readToolReservations, nativeScopeIndexPath } from './controlled-change.mjs';
import { initializeProjectEventFence, queueProjectEventCandidate } from '../.claude/hooks/lib/project-substrate.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'controlled-native-owner-')));
const repo = join(root, 'repo'), home = join(root, 'home'), codexHome = join(home, '.codex');
const projects = join(root, 'projects');
for (const path of [repo, home, codexHome, projects, join(repo, '.claude')]) mkdirSync(path, { recursive: true });
const env = { ...process.env, CLAUDE_PROJECT_DIR: repo, CODEX_HOME: codexHome,
  LUCA_PROJECTS_ROOT: projects, LUCA_EVENT_ATTESTATION_TEST: '1', LUCA_CONTROLLED_TEST_HOME: home };
process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
process.env.LUCA_CONTROLLED_TEST_HOME = home;
for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
function run(command, args, input, extraEnv = {}) { return spawnSync(command, args, { cwd: repo, env: { ...env, ...extraEnv }, input, encoding: 'utf8', timeout: 15000 }); }
function git(...args) { const r = run('/usr/bin/git', args); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); }
function ok(r) { assert.equal(r.status, 0, r.stderr || r.stdout); return r; }
function denied(r) { assert.equal(r.status, 2, `expected denial: ${r.stdout}\n${r.stderr}`); return r; }
const controller = join(source, 'scripts/controlled-change-controller.mjs');
const guardPath = join(source, '.claude/hooks/controlled-change-guard.mjs');
const passed = [];
function check(name, fn) { fn(); passed.push(name); console.log(`PASS ${name}`); }
function session() {
  const id = randomUUID(), turn = randomUUID();
  const sessions = join(codexHome, 'sessions', '2026', '10', '01');
  mkdirSync(sessions, { recursive: true });
  const transcript = join(sessions, `rollout-2026-10-01T00-00-00-${id}.jsonl`);
  const previous = process.env.LUCA_EVENT_ATTESTATION_TEST;
  process.env.LUCA_EVENT_ATTESTATION_TEST = '1';
  try { initializeProjectEventFence({ gstackRoot: repo, projectsRoot: projects,
    sessionId: id, harness: 'codex', cwd: repo, codexHome }); }
  finally { if (previous === undefined) delete process.env.LUCA_EVENT_ATTESTATION_TEST; else process.env.LUCA_EVENT_ATTESTATION_TEST = previous; }
  const prompt = `work ${id}`;
  queueProjectEventCandidate({ gstackRoot: repo, projectsRoot: projects, sessionId: id,
    boundaryId: turn, cwd: repo, harness: 'codex', prompt, intent: { kind: 'turn' } });
  writeFileSync(transcript, [
    { type: 'session_meta', payload: { id, session_id: id, cwd: repo, source: 'cli', originator: 'codex-tui', thread_source: 'user', parent_thread_id: null, forked_from_id: null } },
    { type: 'response_item', payload: { type: 'message', role: 'user', id: `msg_${randomUUID()}`,
      content: [{ type: 'input_text', text: prompt }], internal_chat_message_metadata_passthrough: { turn_id: turn } } },
    { type: 'event_msg', payload: { type: 'item_completed', thread_id: id, turn_id: turn,
      item: { type: 'UserMessage', id: randomUUID(), content: [{ type: 'text', text: prompt }] } } },
  ].map(JSON.stringify).join('\n') + '\n');
  return { hook_event_name: 'PreToolUse', session_id: id, turn_id: turn, transcript_path: transcript, cwd: repo };
}
function post(s, tool, input, id) { return run(process.execPath, [guardPath], JSON.stringify({ ...s,
  hook_event_name: 'PostToolUse', tool_use_id: id, tool_name: tool, tool_input: input, tool_response: { output: 'fixture completed' } })); }
function guard(s, tool, input, extra = {}) {
  const id = extra.tool_use_id || randomUUID();
  const result = run(process.execPath, [guardPath], JSON.stringify({ ...s,
    tool_use_id: id, tool_name: tool, tool_input: input, ...extra }));
  if (result.status === 0 && ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'apply_patch'].includes(tool)
      && !extra.keep_inflight) ok(post(s, tool, input, id));
  return result;
}
function manifest(name, path) {
  const scratch = join(root, `scratch-${name}`); mkdirSync(scratch);
  const value = { schema_version: 1, task_id: `native-${name}`, u_id: `U-003`, repo_realpath: repo,
    git_common_dir_realpath: gitCommonDirRealpath(repo), plan_sha256: '1'.repeat(64),
    plan_recorded_baseline: git('rev-parse', 'HEAD'), observed_baseline: git('rev-parse', 'HEAD'),
    session: 'a-free-label-is-not-authority', scratch_root: scratch,
    repo_paths: [{ path, mutation: 'modify', preimage: pathTuple(join(repo, path)), postimage: pathTuple(join(repo, path)) }],
    external_paths: [], mutation_classes: ['modify'], approved_effects: ['git-stage'], allowed_commands: ['printf native-test'] };
  const file = join(scratch, 'manifest.json'); writeFileSync(file, canonicalJson(value));
  return { value, file, witness: join(gitCommonDirRealpath(repo), 'luca-controlled-change', value.task_id, 'required-witness.json') };
}
function invocation(s, m, verb = 'prepare', tail = '', extraEnv = {}) {
  const command = `node '${controller}' ${verb} --manifest '${m.file}'${tail}`;
  const r = guard(s, 'Bash', { command });
  if (r.status !== 0) return r;
  const rewritten = JSON.parse(r.stdout).hookSpecificOutput.updatedInput.command;
  return run('/bin/sh', ['-c', rewritten], undefined, extraEnv);
}

try {
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  for (const name of ['a.txt', 'b.txt', 'c.txt']) writeFileSync(join(repo, name), `${name}\n`);
  writeFileSync(join(repo, 'README.md'), 'first\nsecond\nthird\nfourth\n');
  writeFileSync(join(repo, 'verification.mjs'), `import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs'; test('integrated edits', () => {assert.equal(readFileSync('a.txt','utf8'),'edited A\\n');assert.equal(readFileSync('b.txt','utf8'),'edited B\\n');});`);
  git('add', '.'); git('commit', '-qm', 'fixture');
  const a = session(), b = session(), c = session();
  const ma = manifest('a', 'a.txt'), mb = manifest('b', 'b.txt');
  check('bare prepare cannot silently create legacy authority', () => denied(run(process.execPath, [controller, 'prepare', '--manifest', ma.file])));
  check('native prepare binds attested session rather than free label', () => {
    ok(invocation(a, ma)); assert.equal(JSON.parse(readFileSync(ma.witness)).native_owner.session_id, a.session_id);
  });
  check('disjoint owners coexist in one checkout', () => { ok(invocation(b, mb)); assert.equal(discoverControlState(repo).currents.length, 2); });
  check('third SID actual App pwd and head reads remain usable during concurrent claims', () => {
    const before = [sha256File(ma.witness), sha256File(mb.witness)];
    const commands = ['pwd', 'head -n 3 README.md'];
    const ids = commands.map(() => randomUUID());
    const results = commands.map((command, i) => guard(c, 'Bash', { command }, { tool_use_id: ids[i] }));
    assert.deepEqual(results.map(result => result.status), [0, 0], JSON.stringify(results.map(result => result.stderr)));
    for (let i = 0; i < commands.length; i++) {
      const rewritten = JSON.parse(results[i].stdout).hookSpecificOutput.updatedInput.command;
      assert.equal(ok(run('/bin/sh', ['-c', rewritten])).stdout, i ? 'first\nsecond\nthird\n' : `${repo}\n`);
      ok(post(c, 'Bash', { command: rewritten }, ids[i]));
    }
    assert.deepEqual([sha256File(ma.witness), sha256File(mb.witness)], before);
    for (const command of ['pwd > c.txt', 'pwd | cat', 'pwd $(touch c.txt)', 'pwd unexpected',
      'head -n 3 README.md > c.txt', 'head -n 3 README.md; touch c.txt', 'head -n 3 $(touch c.txt)',
      'head -n 3 -', 'head -n 3', 'head -n -3 README.md', 'head --help', '/tmp/head -n 3 README.md']) {
      denied(guard(c, 'Bash', { command }));
    }
  });
  check('third SID native Bash cat and rg remain usable without consuming authority', () => {
    const before = sha256File(ma.witness);
    for (const command of ['cat a.txt', 'rg --files', 'rg -n a.txt a.txt']) {
      const id = randomUUID(), result = ok(guard(c, 'Bash', { command }, { tool_use_id: id }));
      const rewritten = JSON.parse(result.stdout).hookSpecificOutput.updatedInput.command;
      ok(run('/bin/sh', ['-c', rewritten])); ok(post(c, 'Bash', { command: rewritten }, id));
    }
    assert.equal(sha256File(ma.witness), before);
    for (const command of ['rg --pre touch x', 'cat a.txt > c.txt', 'cat a.txt\nrm c.txt', 'rg -g --pre touch']) denied(guard(c, 'Bash', { command }));
  });
  check('each owner writes only its exact scope', () => {
    ok(guard(a, 'Write', { file_path: join(repo, 'a.txt') })); ok(guard(b, 'Write', { file_path: join(repo, 'b.txt') }));
    denied(guard(b, 'Write', { file_path: join(repo, 'a.txt') }));
  });
  check('third owner disjoint structured edit allowed; claimed path denied', () => {
    ok(guard(c, 'Write', { file_path: join(repo, 'c.txt') })); denied(guard(c, 'Write', { file_path: join(repo, 'a.txt') }));
    denied(guard(c, 'Bash', { command: 'printf other' }));
  });
  check('in-flight ordinary edit fences concurrent overlapping prepare until matching Post', () => {
    const id = randomUUID();
    ok(guard(c, 'Write', { file_path: join(repo, 'c.txt') }, { tool_use_id: id, keep_inflight: true }));
    const mc = manifest('c-pending', 'c.txt');
    denied(invocation(c, mc));
    ok(post(c, 'Write', { file_path: join(repo, 'c.txt') }, id));
    ok(invocation(c, mc)); ok(invocation(c, mc, 'finish'));
  });
  check('missing Post requires exact terminal evidence; foreign/digest/turn/replay denied', () => {
    const id = randomUUID();
    ok(guard(c, 'Write', { file_path: join(repo, 'c.txt') }, { tool_use_id: id, keep_inflight: true }));
    const row = readToolReservations(repo).find(row => row.tool_use_id === id);
    const digest = sha256Bytes(canonicalJson(row));
    const command = (sha = digest, turn = c.turn_id) => `node '${controller}' recover-tool --repo '${repo}' --tool-use-id '${id}' --turn-id '${turn}' --expected-sha '${sha}' --reason 'lost Post fixture'`;
    const recover = (owner, cmd = command()) => {
      const result = guard(owner, 'Bash', { command: cmd });
      if (result.status) return result;
      return run('/bin/sh', ['-c', JSON.parse(result.stdout).hookSpecificOutput.updatedInput.command]);
    };
    denied(recover(a)); denied(recover({ ...c, session_id: '' }));
    denied(recover(c, command(digest, randomUUID()))); denied(recover(c, command('0'.repeat(64))));
    denied(recover(c));
    denied(guard(c, 'Bash', { command: `env node '${controller}' reconcile-tool` }));
    denied(guard(c, 'Bash', { command: 'printf arbitrary' }));
    appendFileSync(c.transcript_path, JSON.stringify({ type: 'event_msg', payload: {
      type: 'item_completed', thread_id: c.session_id, turn_id: c.turn_id,
      item: { type: 'FileChange', id, status: 'completed', changes: {} }, completed_at_ms: Date.now() } }) + '\n');
    ok(recover(c)); denied(recover(c));
    const mc = manifest('c-recovered', 'c.txt'); ok(invocation(c, mc)); ok(invocation(c, mc, 'finish'));
    const audit = JSON.parse(readFileSync(join(gitCommonDirRealpath(repo), 'luca-controlled-change/tool-reservations.json')));
    assert.equal(audit.history.at(-1).reservation_sha256, digest);
  });
  check('damaged B is scoped while healthy A and unclaimed paths remain writable', () => {
    const active = mb.witness.replace('required-witness.json', 'active-context.json');
    const original = readFileSync(active); writeFileSync(active, '{broken');
    const before = sha256File(ma.witness);
    ok(guard(a, 'Write', { file_path: join(repo, 'a.txt') }));
    ok(guard(c, 'Write', { file_path: join(repo, 'c.txt') }));
    denied(guard(b, 'Write', { file_path: join(repo, 'b.txt') }));
    assert.equal(sha256File(ma.witness), before); writeFileSync(active, original);
    const index = nativeScopeIndexPath(repo), saved = readFileSync(index); writeFileSync(index, '{broken');
    denied(guard(a, 'Write', { file_path: join(repo, 'a.txt') })); ok(guard(a, 'Read', { file_path: join(repo, 'a.txt') }));
    writeFileSync(index, saved);
  });
  check('allocation and terminal crash points keep other scopes live and recover exactly', () => {
    for (const point of ['after-scope-index', 'after-witness', 'after-active', 'after-prepared-receipt',
      'after-terminal-receipt', 'after-terminal-witness', 'after-active-remove']) {
      const mc = manifest(`crash-${point}`, 'c.txt');
      if (point.startsWith('after-terminal') || point === 'after-active-remove') {
        ok(invocation(c, mc)); denied(invocation(c, mc, 'finish', '', { LUCA_CONTROLLED_TEST_CRASH: point }));
        ok(guard(a, 'Write', { file_path: join(repo, 'a.txt') })); ok(invocation(c, mc, 'finish'));
      } else {
        denied(invocation(c, mc, 'prepare', '', { LUCA_CONTROLLED_TEST_CRASH: point }));
        ok(guard(a, 'Write', { file_path: join(repo, 'a.txt') })); ok(invocation(c, mc)); ok(invocation(c, mc, 'finish'));
      }
    }
  });
  check('no-evidence recovery is manual TTY only with exact CAS and durable UNKNOWN audit', () => {
    const id = randomUUID(); ok(guard(c, 'Write', { file_path: join(repo, 'c.txt') }, { tool_use_id: id, keep_inflight: true }));
    const row = readToolReservations(repo).find(row => row.tool_use_id === id), digest = sha256Bytes(canonicalJson(row));
    const args = [controller, 'reconcile-tool', '--repo', repo, '--tool-use-id', id, '--turn-id', c.turn_id,
      '--session-id', c.session_id, '--expected-sha', digest, '--reason', 'human fixture verified stopped process', '--outcome', 'UNKNOWN'];
    denied(run(process.execPath, args));
    denied(guard(c, 'Bash', { command: `node '${controller}' reconcile-tool --repo '${repo}'` }));
    const python = `import os,pty,subprocess,sys,select,json,time
+m,s=pty.openpty()
+p=subprocess.Popen(json.loads(sys.argv[1]),stdin=s,stdout=s,stderr=s);os.close(s)
+out=b'';sent=False;deadline=time.time()+10
+while time.time()<deadline:
+ if select.select([m],[],[],0.1)[0]:
+  try: chunk=os.read(m,65536)
+  except OSError: break
+  if not chunk: break
+  out+=chunk
+  if b'Type RECONCILE' in out and not sent: os.write(m,('RECONCILE '+sys.argv[2]+'\\n').encode());sent=True
+ if p.poll() is not None: break
+if p.poll() is None: p.kill()
+print(out.decode(errors='replace'));sys.exit(p.wait())`.replaceAll('\n+', '\n');
    ok(run('/usr/bin/python3', ['-c', python, JSON.stringify([process.execPath, ...args]), digest]));
    assert.ok(!readToolReservations(repo).some(row => row.tool_use_id === id));
    const audit = JSON.parse(readFileSync(join(gitCommonDirRealpath(repo), 'luca-controlled-change/tool-reservations.json')));
    assert.equal(audit.history.at(-1).outcome, 'UNKNOWN'); assert.equal(audit.history.at(-1).reservation_sha256, digest);
    const index = nativeScopeIndexPath(repo), reviewed = join(root, 'human-reviewed-index.json');
    writeFileSync(reviewed, readFileSync(index)); writeFileSync(index, '{broken');
    const indexSha = sha256File(index);
    const indexArgs = [controller, 'reconcile-index', '--repo', repo, '--reviewed-index', reviewed,
      '--expected-sha', indexSha, '--reason', 'human reviewed complete native scope inventory'];
    denied(run(process.execPath, indexArgs));
    ok(run('/usr/bin/python3', ['-c', python, JSON.stringify([process.execPath, ...indexArgs]), indexSha]));
    assert.equal(discoverControlState(repo).currents.length, 2);
    assert.equal(JSON.parse(readFileSync(index + '.reconciliation.json')).history.at(-1).prior_sha256, indexSha);

  });
  check('missing forged and old-turn identity rejected', () => {
    for (const extra of [{ session_id: '' }, { session_id: randomUUID() }, { turn_id: randomUUID() }]) denied(guard(a, 'Write', { file_path: join(repo, 'a.txt') }, extra));
  });
  check('foreign controller cannot change witness or consume authorization', () => {
    const before = sha256File(ma.witness); denied(invocation(b, ma, 'abort')); assert.equal(sha256File(ma.witness), before);
    denied(run(process.execPath, [controller, 'abort', '--manifest', ma.file])); assert.equal(sha256File(ma.witness), before);
  });
  check('multi-owner patch cannot cross task scopes', () => denied(guard(a, 'apply_patch', { command: '*** Begin Patch\n*** Update File: a.txt\n@@\n-a.txt\n+x\n*** Update File: b.txt\n@@\n-b.txt\n+y\n*** End Patch' })));
  check('same-file hardlink and symlink claims conflict', () => {
    linkSync(join(repo, 'a.txt'), join(repo, 'hard.txt')); symlinkSync('a.txt', join(repo, 'alias.txt'));
    for (const path of ['a.txt', 'hard.txt', 'alias.txt']) denied(invocation(c, manifest(path.replace('.', '-'), path)));
    assert.equal(discoverControlState(repo).currents.length, 2);
  });
  check('Git and opaque exact command denied during concurrent claims', () => {
    denied(guard(a, 'Bash', { command: 'git add a.txt' })); denied(guard(a, 'Bash', { command: 'printf native-test' }));
  });
  check('finishing releases only own claim', () => {
    ok(invocation(b, mb, 'finish')); assert.equal(discoverControlState(repo).currents.length, 1);
    ok(guard(a, 'Write', { file_path: join(repo, 'a.txt') }));
  });
  check('opaque command enters durable exclusive lane and blocks new prepare', () => {
    const id = randomUUID();
    ok(guard(a, 'Bash', { command: 'printf native-test' }, { tool_use_id: id }));
    denied(invocation(a, ma, 'finish'));
    ok(post(a, 'Bash', { command: 'printf native-test' }, id));
    assert.equal(JSON.parse(readFileSync(ma.witness)).exclusive_lane, true);
    denied(invocation(b, manifest('b-next', 'b.txt'))); denied(guard(c, 'Write', { file_path: join(repo, 'c.txt') }));
  });
  check('foreign cannot consume sole owner effect; owner uses once and unknown stays fenced', () => {
    const command = 'git add a.txt';
    ok(invocation(a, ma, 'authorize-effect', ` --effect git-stage --gate explicit-fixture-gate --command-sha256 ${sha256Bytes(Buffer.from(command))} --cwd '${repo}' --authorization-token fixture-auth-0001`));
    const before = sha256File(ma.witness);
    denied(guard(c, 'Bash', { command })); assert.equal(sha256File(ma.witness), before);
    const id = randomUUID(); ok(guard(a, 'Bash', { command }, { tool_use_id: id }));
    denied(invocation(a, ma, 'finish')); ok(post(a, 'Bash', { command }, id));
    const witness = JSON.parse(readFileSync(ma.witness));
    assert.equal(witness.effect_authorizations[0].remaining_uses, 0);
    assert.equal(witness.effect_authorizations[0].outcome, 'EFFECT_UNKNOWN');
    assert.equal(witness.exclusive_lane, true); denied(guard(a, 'Bash', { command }));
  });
  check('claim replay and altered controller args rejected', () => {
    const r = ok(guard(a, 'Bash', { command: `node '${controller}' record --manifest '${ma.file}' --state APPLIED` }));
    const cmd = JSON.parse(r.stdout).hookSpecificOutput.updatedInput.command;
    denied(run('/bin/sh', ['-c', cmd.replace('APPLIED', 'VERIFIED')])); ok(run('/bin/sh', ['-c', cmd])); denied(run('/bin/sh', ['-c', cmd]));
  });
  check('invalid state fails closed for mutation but permits Read', () => {
    const original = readFileSync(ma.witness); writeFileSync(ma.witness, '{broken');
    denied(guard(c, 'Write', { file_path: join(repo, 'c.txt') })); ok(guard(c, 'Read', { file_path: join(repo, 'a.txt') }));
    writeFileSync(ma.witness, original);
  });
  ok(invocation(a, ma, 'finish'));
  check('two disjoint tasks finish naturally, then sole integration runs real tests and Git', () => {
    const left = manifest('phase-left', 'a.txt'), right = manifest('phase-right', 'b.txt');
    for (const [m, text] of [[left, 'edited A\n'], [right, 'edited B\n']]) {
      m.value.repo_paths[0].postimage = { type: 'file', mode: '100644', sha256: sha256Bytes(Buffer.from(text)) };
      writeFileSync(m.file, canonicalJson(m.value));
    }
    ok(invocation(a, left)); ok(invocation(b, right));
    for (const [owner, m, text] of [[a, left, 'edited A\n'], [b, right, 'edited B\n']]) {
      const id = randomUUID(), target = join(repo, m.value.repo_paths[0].path);
      ok(guard(owner, 'Write', { file_path: target }, { tool_use_id: id, keep_inflight: true }));
      writeFileSync(target, text); ok(post(owner, 'Write', { file_path: target }, id));
    }
    ok(invocation(a, left, 'finish')); ok(invocation(b, right, 'finish'));
    assert.equal(JSON.parse(readFileSync(left.witness)).state, 'COMPLETED');
    assert.equal(JSON.parse(readFileSync(right.witness)).state, 'COMPLETED');
    const integration = manifest('phase-integration', 'a.txt');
    integration.value.repo_paths.push({ ...integration.value.repo_paths[0], path: 'b.txt',
      preimage: pathTuple(join(repo, 'b.txt')), postimage: pathTuple(join(repo, 'b.txt')) });
    integration.value.allowed_commands = ['node --test verification.mjs'];
    writeFileSync(integration.file, canonicalJson(integration.value));
    ok(invocation(a, integration));
    const execute = command => {
      const id = randomUUID(); ok(guard(a, 'Bash', { command }, { tool_use_id: id }));
      const result = ok(run('/bin/sh', ['-c', command])); ok(post(a, 'Bash', { command }, id)); return result;
    };
    assert.match(execute('node --test verification.mjs').stdout, /pass 1/);
    const command = 'git add a.txt b.txt';
    ok(invocation(a, integration, 'authorize-effect', ` --effect git-stage --gate fixture-publication-gate --command-sha256 ${sha256Bytes(Buffer.from(command))} --cwd '${repo}' --authorization-token integration-auth-0001`));
    execute(command); assert.equal(git('diff', '--cached', '--name-only'), 'a.txt\nb.txt');
    ok(invocation(a, integration, 'finish'));
    assert.equal(JSON.parse(readFileSync(integration.witness)).state, 'COMPLETED');
  });
  console.log(`PASS ${passed.length} native-owner assertions`);
} finally { rmSync(root, { recursive: true, force: true }); }
