import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync, realpathSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { sourceDigest } from './codex-hook-health.mjs';
import { installTestSourceGuard } from './source-guard-test-fixture.mjs';

// Fixed stable-v3 fixture remains independent of the default native registration.
function stableRegistration(config) {
  const prefix = "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" || exit 2; export LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\"; export NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\"; node \"$(git rev-parse --show-toplevel)/.codex/hook-source-integrity.mjs\" --verify || { echo \"[luca_gstack] hook source integrity mismatch\" >&2; exit 2; }; ";
  const stop = "luca_stop_payload=$(cat); luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" || { printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'; exit 0; }; export LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\"; export NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\"; node \"$(git rev-parse --show-toplevel)/.codex/hook-source-integrity.mjs\" --verify || { echo \"[luca_gstack] hook source integrity mismatch\" >&2; printf '%s' \"$luca_stop_payload\" | LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\" NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\" node --input-type=module -e 'await import(process.env.LUCA_PROTECTED_CODE_ROOT + \"/.codex/stop-integrity-failure.mjs\")' || printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'; exit 0; }; printf '%s' \"$luca_stop_payload\" | MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$(git rev-parse --show-toplevel)/.codex/codex-hook-adapter.mjs\" \"$(git rev-parse --show-toplevel)/.claude/hooks/session-sync.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0; printf '%s' \"$luca_stop_payload\" | LUCA_CHILD_SOURCE_ROOT=\"$(pwd -P)\" NODE_OPTIONS=\"--import=$HOME/.codex/luca-child-project/source-guard/bootstrap.mjs\" node --input-type=module -e 'await import(process.env.LUCA_PROTECTED_CODE_ROOT + \"/.codex/stop-integrity-failure.mjs\")' || printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Restore the protected installation before continuing.\"}'; exit 0";
  for (const [event, groups] of Object.entries(config.hooks)) for (const group of groups) for (const hook of group.hooks) {
    if (event === 'Stop') hook.command = stop;
    else {
      const marker = 'export LUCA_NATIVE_HOOK_STRICT=1; ';
      const suffix = hook.command.slice(hook.command.indexOf(marker) + marker.length)
        .replaceAll('$luca_hook_root', '$(git rev-parse --show-toplevel)');
      hook.command = prefix + suffix;
      if (hook.command.includes('/.codex/host-launch-hook.mjs')) {
        hook.command = hook.command.replace('; c=$?;', ' 2>> /tmp/luca-gstack-hooks.log; c=$?;');
      }
    }
  }
  return config;
}

function fixture(t, mode = 'ok', { stable = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hook-trust-')));
  const guardHome = realpathSync(mkdtempSync(join(tmpdir(), 'hook-trust-home-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  t.after(() => rmSync(guardHome, { recursive: true, force: true }));
  for (const dir of ['scripts', '.codex', 'home', 'bin', 'memory/scripts', '.claude/hooks',
    '.claude/skill-os', '.claude/skills/office', '.claude/agents']) {
    mkdirSync(join(root, dir), { recursive: true, mode: 0o700 });
  }
  writeFileSync(join(root, 'CLAUDE.md'), 'isolated trust fixture');
  cpSync(new URL('./codex-trust-hooks.mjs', import.meta.url), join(root, 'scripts/codex-trust-hooks.mjs'));
  cpSync(new URL('./codex-hook-health.mjs', import.meta.url), join(root, 'scripts/codex-hook-health.mjs'));
  cpSync(new URL('./source-guard-review.mjs', import.meta.url), join(root, 'scripts/source-guard-review.mjs'));
  cpSync(new URL('../.codex/hook-source-integrity.mjs', import.meta.url), join(root, '.codex/hook-source-integrity.mjs'));
  for (const name of ['bootstrap', 'loader']) cpSync(new URL(`../.codex/codex-source-guard-${name}.mjs`, import.meta.url),
    join(root, '.codex', `codex-source-guard-${name}.mjs`));
  cpSync(new URL('../.codex/hooks.json', import.meta.url), join(root, '.codex/hooks.json'));
  writeFileSync(join(root, 'home/config.toml'), 'model = "user-choice"\n');
  const server = String.raw`
const fs = require('node:fs'), path = require('node:path');
const root = process.env.MOCK_ROOT, mode = process.env.MOCK_MODE;
const statePath = path.join(root, 'rpc-state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : {
  writes: 0, version: 'v1', config: { model: 'user-choice', secret: 'synthetic_test_secret_never_print', hooks: { state: { foreign: {trusted_hash:'foreign-old'} } } }
};
if (mode.startsWith('linked-')) state.config.hooks.state[path.join(root, 'primary/.codex/hooks.json') + ':session_start:0:0'] ||= { enabled: false };
const send = obj => process.stdout.write(JSON.stringify(obj)+'\n');
require('node:readline').createInterface({input: process.stdin}).on('line', line => {
 const req = JSON.parse(line), reply = result => send({jsonrpc:'2.0',id:req.id,result});
 if(req.method==='initialize') return reply({});
 if(req.method==='hooks/list') {
   const registrationRoot = mode.startsWith('linked-') ? path.join(root, 'primary') : root;
   const hooks=JSON.parse(fs.readFileSync(path.join(registrationRoot,'.codex/hooks.json'))).hooks, rows=[];
   for(const [event,groups] of Object.entries(hooks)) groups.forEach((group,gi)=>(group.hooks||[]).forEach((hook,hi)=>{
     const snake=event.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
     rows.push({key:path.join(registrationRoot,'.codex/hooks.json')+':'+snake+':'+gi+':'+hi,
       eventName:event[0].toLowerCase()+event.slice(1),command:hook.command,
       currentHash:'official-'+rows.length,trustStatus:state.writes || mode==='already-trusted'?'trusted':'untrusted'});
   }));
   rows.push({...rows[0],key:'foreign',trustStatus:'untrusted',currentHash:'foreign-official'});
   rows.push({...rows[0],key:'foreign-secret',command:'third-party --token=synthetic_foreign_command_never_print',trustStatus:'untrusted',currentHash:'foreign-secret-official'});
   if(mode==='registration-drift-trusted' || mode==='registration-drift-dry') {
     const configPath=path.join(root,'.codex/hooks.json'), config=JSON.parse(fs.readFileSync(configPath));
     config.description += ' concurrent edit';
     fs.writeFileSync(configPath,JSON.stringify(config));
     if(mode==='registration-drift-trusted') rows.forEach(row=>row.trustStatus='trusted');
   }
   if(mode==='missing-hash') delete rows[0].currentHash;
   if(state.writes) {
     if(mode==='empty-readback') rows.length=0;
     if(mode==='missing-readback') rows.shift();
     if(mode==='duplicate-readback') rows.push({...rows[0]});
     if(mode==='hash-drift') rows[0].currentHash='unexpected';
     if(mode==='foreign-drift') rows.at(-1).trustStatus='trusted';
     if(mode==='foreign-command-drift') rows.at(-1).command='third-party --token=synthetic_foreign_command_never_print --changed';
   }
   return reply({data:[{hooks:rows}]});
 }
 if(req.method==='config/read') {
   if(mode==='linked-shared-drift') fs.appendFileSync(path.join(root,'primary/.codex/hooks.json'),'\n');
   if(mode==='source-drift-before-write') fs.appendFileSync(path.join(root,'scripts/codex-trust-hooks.mjs'),'\n// concurrent source drift\n');
   return reply({layers:[{name:{type:'user',file:path.join(root,'home/config.toml'),profile:null},version:state.version,config:state.config}]});
 }
 if(req.method==='config/batchWrite') {
   if(req.params.filePath!==path.join(root,'home/config.toml') || req.params.expectedVersion!==state.version) {
     return send({id:req.id,error:{code:-1,message:'missing CAS'}});
   }
   if(mode==='missing-ack') return process.exit(0);
   if(mode==='timeout') return;
   if(mode==='version-conflict') return send({id:req.id,error:{code:-1,message:'conflict'}});
   for(const edit of req.params.edits) {
     const prefix='hooks.state.', suffix='.trusted_hash';
     const key=JSON.parse(edit.keyPath.slice(prefix.length,-suffix.length));
     state.config.hooks.state[key] ||= {};
     state.config.hooks.state[key].trusted_hash=edit.value;
   }
   state.writes++; state.version='v2';
   if(mode==='config-drift') state.config.model='changed';
   fs.writeFileSync(statePath,JSON.stringify(state));
   if(mode==='duplicate-ack') return process.stdout.write(JSON.stringify({id:req.id,result:{}})+'\n'+JSON.stringify({id:req.id,result:{}})+'\n');
   return reply({});
 }
 send({id:req.id,error:{code:-1,message:'unsupported'}});
});
`;
  writeFileSync(join(root, 'bin/codex'), `#!${process.execPath}\n${server}`, { mode: 0o700 });
  const hooksPath = join(root, '.codex/hooks.json');
  if (stable) writeFileSync(hooksPath, JSON.stringify(stableRegistration(JSON.parse(readFileSync(hooksPath)))));
  const syncRegistration = () => {
    const hooks = JSON.parse(readFileSync(hooksPath));
    const digest = sourceDigest(root);
    for (const groups of Object.values(hooks.hooks)) for (const group of groups) for (const hook of group.hooks) {
      hook.command = hook.command.replace(/case "\$h" in [a-f0-9]{64}/, `case "$h" in ${digest}`);
    }
    writeFileSync(hooksPath, JSON.stringify(hooks));
  };
  const guardRoot = join(guardHome, '.codex/luca-child-project/source-guard');
  if (stable) {
    syncRegistration();
    mkdirSync(join(guardHome, '.codex/luca-child-project'), { recursive: true, mode: 0o700 });
    const installed = installTestSourceGuard({roots:[root],destination:guardRoot,directory:guardHome});
    assert.equal(installed.status, 0, installed.stderr);
  }
  if (mode.startsWith('linked-')) {
    const primary = join(root, 'primary');
    mkdirSync(join(primary, '.codex'), { recursive: true });
    mkdirSync(join(primary, '.git'), { recursive: true });
    cpSync(hooksPath, join(primary, '.codex/hooks.json'));
    if (mode === 'linked-registration-drift') {
      const registration = JSON.parse(readFileSync(join(primary, '.codex/hooks.json')));
      registration.hooks.SessionStart[0].hooks[0].command += '; true';
      writeFileSync(join(primary, '.codex/hooks.json'), JSON.stringify(registration));
    }
    writeFileSync(join(root, 'bin/git'), `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(join(primary, '.git') + '\n')});\n`, { mode: 0o700 });
  }
  const run = args => spawnSync(process.execPath, [join(root, 'scripts/codex-trust-hooks.mjs'), '--host-launch', ...args], {
    env: { ...process.env, HOME: guardHome, CODEX_HOME: join(root, 'home'), NODE_OPTIONS: '', MOCK_ROOT: root,
      MOCK_MODE: mode, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
    encoding: 'utf8', timeout: 25_000,
  });
  return { root, run, guardRoot, syncRegistration };
}

test('official CAS writes only exact repository hooks and preserves same-command foreign hooks', t => {
  const f = fixture(t), result = f.run([]);
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(readFileSync(join(f.root, 'rpc-state.json')));
  assert.equal(state.writes, 1);
  assert.equal(state.config.model, 'user-choice');
  assert.equal(state.config.hooks.state.foreign.trusted_hash, 'foreign-old');
  assert.equal(Object.keys(state.config.hooks.state).length, 12);
  assert.equal(readdirSync(join(f.root, 'home')).filter(name => name.includes('.bak-')).length, 1);
});
test('dry run neither writes configuration nor creates a backup', t => {
  const f = fixture(t), result = f.run(['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(join(f.root, 'home')), ['config.toml']);
  assert.equal(readdirSync(f.root).includes('rpc-state.json'), false);
});
for (const mode of ['missing-ack', 'timeout', 'version-conflict', 'duplicate-ack', 'empty-readback',
  'missing-readback', 'duplicate-readback', 'hash-drift', 'foreign-drift', 'foreign-command-drift', 'config-drift', 'missing-hash']) {
  test(`trust refuses ${mode} instead of reporting success`, t => {
    const f = fixture(t, mode), result = f.run([]);
    assert.notEqual(result.status, 0, mode);
    const reasons = {
      'missing-ack': /closed before config\/batchWrite acknowledgement/,
      timeout: /config\/batchWrite timed out/,
      'version-conflict': /config\/batchWrite failed/,
      'duplicate-ack': /Duplicate config\/batchWrite response/,
      'empty-readback': /Expected exactly one official hook/,
      'missing-readback': /Expected exactly one official hook/,
      'duplicate-readback': /Expected exactly one official hook/,
      'hash-drift': /Exact hook readback failed/,
      'foreign-drift': /Foreign hook state changed/,
      'foreign-command-drift': /Foreign hook state changed/,
      'config-drift': /Non-target configuration changed/,
      'missing-hash': /Missing official hash/,
    };
    assert.match(result.stderr, reasons[mode], 'the intended failure must be reached');
    assert.ok(!result.stderr.includes('synthetic_test_secret_never_print'), 'configuration values must not leak');
    assert.ok(!result.stderr.includes('synthetic_foreign_command_never_print'), 'foreign commands must not leak to stderr');
    assert.ok(!result.stdout.includes('synthetic_foreign_command_never_print'), 'foreign commands must not leak to stdout');
    assert.equal(result.error, undefined, 'script must terminate by its own bounded failure');
  });
}

// Symptom regression: trust must not certify a registration whose source gate fails.
test('optional stable-v3 trust rejects unhealthy source before a trust write', t => {
  const f = fixture(t, 'ok', { stable: true });
  writeFileSync(join(f.root, '.codex', 'changed-hook.mjs'), 'export const unreviewed = true;\n');
  const result = f.run([]);
  assert.notEqual(result.status, 0, 'source drift was accepted and trusted');
  assert.match(result.stderr, /SOURCE_DIGEST_MISMATCH/);
  assert.equal(readdirSync(f.root).includes('rpc-state.json'), false, 'must fail before RPC mutation');
});

test('already trusted still refuses changed source or stale installation', t => {
  for (const kind of ['source', 'manifest']) {
    const f = fixture(t, 'already-trusted', { stable: true });
    writeFileSync(join(f.root, '.codex', 'changed-hook.mjs'), 'export const unreviewed = true;\n');
    if (kind === 'manifest') f.syncRegistration();
    const result = f.run(['--dry-run']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SOURCE_DIGEST_MISMATCH|INSTALLED_SOURCE_MISMATCH/);
    assert.ok(!result.stdout.includes('全部已授信'));
    assert.equal(readdirSync(f.root).includes('rpc-state.json'), false);
  }
});
test('source drift between official checks and batchWrite refuses the trust mutation', t => {
  const f = fixture(t, 'source-drift-before-write', { stable: true }), result = f.run([]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SOURCE_DIGEST_MISMATCH/);
  assert.equal(readdirSync(f.root).includes('rpc-state.json'), false);
});
test('registration bytes drifting during lookup refuse trusted and dry-run early returns', t => {
  for (const mode of ['registration-drift-trusted', 'registration-drift-dry']) {
    const f = fixture(t, mode), result = f.run(['--dry-run']);
    assert.notEqual(result.status, 0, mode);
    assert.match(result.stderr, /Hook registrations changed during trust/);
    assert.ok(!result.stdout.includes('全部已授信'));
    assert.equal(readdirSync(f.root).includes('rpc-state.json'), false);
    assert.deepEqual(readdirSync(join(f.root, 'home')), ['config.toml']);
  }
});

test('native exact11 trust accepts source edits without creating an optional source guard', t => {
  const f = fixture(t, 'source-drift-before-write');
  writeFileSync(join(f.root, '.codex/changed-hook.mjs'), 'export const changed = true;\n');
  const result = f.run([]);
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(readFileSync(join(f.root, 'rpc-state.json')));
  assert.equal(state.writes, 1);
  assert.equal(existsSync(f.guardRoot), false, 'native trust must not initialize an optional guard');
  assert.equal(Object.keys(state.config.hooks.state).length, 12);
  assert.equal(readdirSync(f.root).includes('rpc-state.json'), true);
  assert.equal(readdirSync(join(f.root, 'home')).filter(name => name.includes('.bak-')).length, 1);
});
test('native trust refuses inserted commands and retired stderr redirection before any official trust write', t => {
  for (const mutate of [command => command + '; true',
    command => command.replace('; c=$?;', ' 2>> /tmp/luca-gstack-hooks.log; c=$?;')]) {
    const f = fixture(t), path = join(f.root, '.codex/hooks.json');
    const config = JSON.parse(readFileSync(path));
    config.hooks.PreToolUse[0].hooks[0].command = mutate(config.hooks.PreToolUse[0].hooks[0].command);
    writeFileSync(path, JSON.stringify(config));
    const result = f.run([]);
    assert.notEqual(result.status, 0);
    assert.equal(readdirSync(f.root).includes('rpc-state.json'), false);
  }
});

// Codex discovers shared repository registrations at the primary Git worktree.
test('linked worktree trusts official primary registrations and preserves disabled settings', t => {
  const f = fixture(t, 'linked-ok'), result = f.run([]);
  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(readFileSync(join(f.root, 'rpc-state.json')));
  const keys = Object.keys(state.config.hooks.state).filter(key => key !== 'foreign');
  assert.equal(keys.length, 11);
  assert.ok(keys.every(key => key.startsWith(join(f.root, 'primary/.codex/hooks.json') + ':')));
  assert.equal(state.config.hooks.state[join(f.root, 'primary/.codex/hooks.json') + ':session_start:0:0'].enabled, false);
});
test('linked registration divergence refuses before any trust write', t => {
  const f = fixture(t, 'linked-registration-drift'), result = f.run([]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Shared Git hook registrations differ/);
  assert.equal(existsSync(join(f.root, 'rpc-state.json')), false);
});

test('shared primary registration drift during trust refuses before mutation', t => {
  const f = fixture(t, 'linked-shared-drift'), result = f.run([]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Shared Git hook registrations differ/);
  assert.equal(existsSync(join(f.root, 'rpc-state.json')), false);
});
