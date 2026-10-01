// Meaningful adversarial lifecycle verification. Requires separately approved finite regression roots.
// Retains failed/drifted fixtures for inspection; it never scans or cleans a prefix.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareSlots, captureSlots, retireSlots } from './exact-fixture-slots.mjs';

const helper = fileURLToPath(new URL('./exact-fixture-slots.mjs', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const planPath = process.env.LUCA_EXACT_FIXTURE_REGRESSION;
const planHash = process.env.LUCA_EXACT_FIXTURE_REGRESSION_SHA256;
assert.ok(planPath && /^[a-f0-9]{64}$/.test(planHash || ''), 'explicit regression manifest/hash required; no random fallback');
const planBytes = readFileSync(planPath);
assert.equal(digest(planBytes), planHash);
const plan = JSON.parse(planBytes);
const names = ['happy', 'foreign-eexist', 'exhausted', 'concurrent-claim', 'mode-drift', 'root-replaced', 'descendant-drift', 'symlink-descendant', 'unclaimed', 'live-child', 'config-drift', 'duplicate-slot'];
assert.deepEqual(plan.cases.map(c => c.name), names);
const json = (path, value) => writeFileSync(path, JSON.stringify(value) + '\n', { flag: 'wx', mode: 0o600 });
const childSource = `import {allocateFixtureRoot} from ${JSON.stringify(new URL('./exact-fixture-slots.mjs', import.meta.url).href)};
import {writeFileSync} from 'node:fs';import {join} from 'node:path';import assert from 'node:assert/strict';
const root=allocateFixtureRoot('/private/tmp/host-launch-');writeFileSync(join(root,'payload'),'owned',{flag:'wx',mode:0o600});
if(process.env.EXACT_REGRESSION_EXHAUST==='1')assert.throws(()=>allocateFixtureRoot('/private/tmp/host-launch-'),{code:'SLOT_EXHAUSTED_NO_FALLBACK'});`;
function setup(name) {
  const item = plan.cases.find(c => c.name === name);
  assert.equal(item.root, join(item.directory, 'host-launch-' + name));
  mkdirSync(item.directory, { mode: 0o700 });
  const configPath = join(item.directory, 'config.json');
  const cfg = { version: 1, runId: 'regression-' + name, purpose: 'lifecycle-regression', helperSHA256: digest(readFileSync(helper)),
    fixtureParent: item.directory, receiptDir: join(item.directory, 'receipts'), approvalPath: join(item.directory, 'approval.json'),
    exitConfirmationPath: join(item.directory, 'exit-confirmation.json'), exitEvidencePaths: [join(item.directory, 'exit-observation.json')],
    limits: { maxEntries: 30000, maxBytes: 268435456 }, slots: [{ id: name, path: item.root, quarantine: item.root + '-quarantine', defaultPrefix: '/private/tmp/host-launch-' }] };
  const raw = Buffer.from(JSON.stringify(cfg) + '\n'); writeFileSync(configPath, raw, { flag: 'wx', mode: 0o600 });
  const hash = digest(raw);
  json(cfg.approvalPath, { kind: 'SYNTHETIC_LIFECYCLE_REGRESSION', approved: true, exclusiveSameUserWindow: true,
    runId: cfg.runId, configSHA256: hash, helperSHA256: cfg.helperSHA256 });
  return { item, cfg, path: configPath, hash };
}
function run(c, extra = {}) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', childSource], {
    env: { ...process.env, LUCA_EXACT_FIXTURE_CONFIG: c.path, LUCA_EXACT_FIXTURE_CONFIG_SHA256: c.hash, ...extra }, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.error, undefined); return result;
}
function confirmation(c, childPids = []) {
  json(c.cfg.exitEvidencePaths[0], { kind: 'SYNTHETIC_LIFECYCLE_REGRESSION_EXIT', runId: c.cfg.runId, configSHA256: c.hash, exitCode: 0,
    source: 'Observed spawnSync result in this supplemental regression, not native or ordinary fullverify evidence' });
  json(c.cfg.exitConfirmationPath, { runId: c.cfg.runId, configSHA256: c.hash, allFrozenChildrenExited: true,
    exclusiveSameUserWindow: true, childPids, evidence: [{ path: c.cfg.exitEvidencePaths[0], sha256: digest(readFileSync(c.cfg.exitEvidencePaths[0])) }] });
  return digest(readFileSync(c.cfg.exitConfirmationPath));
}
let passed = 0;
function check(name, fn) { fn(setup(name)); passed++; }
check('happy', c => { prepareSlots(c.path, c.hash); assert.equal(run(c).status, 0); const exit = confirmation(c);
  const cap = captureSlots(c.path, c.hash, exit); retireSlots(c.path, c.hash, cap, exit);
  assert.equal(existsSync(c.item.root), false); assert.equal(existsSync(c.item.root + '-quarantine'), false);
  assert.ok(existsSync(join(c.cfg.receiptDir, 'retired.json'))); });
check('foreign-eexist', c => { mkdirSync(c.item.root, { mode: 0o700 }); writeFileSync(join(c.item.root, 'foreign'), 'preserve');
  assert.throws(() => prepareSlots(c.path, c.hash), { code: 'EEXIST' }); assert.equal(readFileSync(join(c.item.root, 'foreign'), 'utf8'), 'preserve'); });
check('exhausted', c => { prepareSlots(c.path, c.hash); assert.equal(run(c, { EXACT_REGRESSION_EXHAUST: '1' }).status, 0); assert.equal(run(c).status === 0, false); assert.equal(readFileSync(join(c.item.root, 'payload'), 'utf8'), 'owned'); });
// Competing once-only processes cannot both own a slot. The second claimant is refused without reuse.
check('concurrent-claim', c => { prepareSlots(c.path, c.hash);
  const parallelSource = `import {spawn} from 'node:child_process';const source=${JSON.stringify(childSource)};
const run=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',source],{env:process.env,stdio:['ignore','ignore','pipe']});child.once('error',reject);child.stderr.resume();child.once('close',resolve)});
process.stdout.write(JSON.stringify(await Promise.all([run(),run()])));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', parallelSource], {
    env: { ...process.env, LUCA_EXACT_FIXTURE_CONFIG: c.path, LUCA_EXACT_FIXTURE_CONFIG_SHA256: c.hash }, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0); assert.deepEqual(JSON.parse(result.stdout).sort(), [0, 1]);
  assert.equal(readFileSync(join(c.item.root, 'payload'), 'utf8'), 'owned'); });
check('mode-drift', c => { prepareSlots(c.path, c.hash); chmodSync(c.item.root, 0o755); assert.notEqual(run(c).status, 0); assert.ok(existsSync(c.item.root)); });
check('root-replaced', c => { prepareSlots(c.path, c.hash); assert.equal(run(c).status, 0); const exit = confirmation(c); const cap = captureSlots(c.path, c.hash, exit);
  renameSync(c.item.root, c.item.root + '-held'); mkdirSync(c.item.root, { mode: 0o700 }); writeFileSync(join(c.item.root, 'foreign'), 'preserve');
  assert.throws(() => retireSlots(c.path, c.hash, cap, exit)); assert.equal(readFileSync(join(c.item.root, 'foreign'), 'utf8'), 'preserve'); assert.ok(existsSync(c.item.root + '-held')); });
check('descendant-drift', c => { prepareSlots(c.path, c.hash); assert.equal(run(c).status, 0); const exit = confirmation(c); const cap = captureSlots(c.path, c.hash, exit);
  writeFileSync(join(c.item.root, 'payload'), 'third-state'); assert.throws(() => retireSlots(c.path, c.hash, cap, exit), { code: 'DESCENDANT_OR_ROOT_DRIFT' });
  assert.equal(readFileSync(join(c.item.root, 'payload'), 'utf8'), 'third-state'); });
check('symlink-descendant', c => { prepareSlots(c.path, c.hash); assert.equal(run(c).status, 0); symlinkSync(c.item.directory, join(c.item.root, 'foreign-link'));
  const exit = confirmation(c); assert.throws(() => captureSlots(c.path, c.hash, exit), { code: 'DESCENDANT_SYMLINK_OR_SPECIAL' }); assert.ok(existsSync(c.item.directory)); });
check('unclaimed', c => { prepareSlots(c.path, c.hash); const exit = confirmation(c); assert.throws(() => captureSlots(c.path, c.hash, exit)); assert.ok(existsSync(c.item.root)); });
check('live-child', c => { prepareSlots(c.path, c.hash); assert.equal(run(c).status, 0); const exit = confirmation(c, [process.pid]);
  assert.throws(() => captureSlots(c.path, c.hash, exit), { code: 'PROCESS_STILL_LIVE_OR_PID_REUSED' }); assert.ok(existsSync(c.item.root)); });
check('config-drift', c => { assert.throws(() => prepareSlots(c.path, '0'.repeat(64)), { code: 'CONFIG_DRIFT' }); assert.equal(existsSync(c.item.root), false); });
check('duplicate-slot', c => { const cfg = { ...c.cfg, slots: [...c.cfg.slots, c.cfg.slots[0]] }; const raw = Buffer.from(JSON.stringify(cfg) + '\n');
  const alt = join(c.item.directory, 'duplicate-config.json'); writeFileSync(alt, raw, { flag: 'wx', mode: 0o600 });
  assert.throws(() => prepareSlots(alt, digest(raw)), { code: 'DUPLICATE_SLOT' }); assert.equal(existsSync(c.item.root), false); });
assert.equal(passed, 12);
process.stdout.write('PASS: 12 supplemental exact-fixture lifecycle checks; no native adoption claim\n');
