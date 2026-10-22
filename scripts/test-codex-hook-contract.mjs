import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { MAX_DOCUMENT_BYTES, MAX_REPORT_BYTES, evaluateHookDocument, describeHookContract,
  checkContractCompatibility, compareHookDocuments } from './lib/codex-hook-contract.mjs';
import { inspectHookHealth } from './codex-hook-health.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const oldBytes = readFileSync(new URL('./fixtures/codex-hook-contract/native-071.json', import.meta.url));
const currentBytes = readFileSync(new URL('./fixtures/codex-hook-contract/native-c6.json', import.meta.url));
const OLD = '071dcae5ae935ce15318dea12d1deaee3cddec60c74bda6d82ec1c422eb885e4';
const CURRENT = 'c6ef2efa3fcb18e91163f4c2dd25277d8c568ae82c490949d47aeff549601c45';
const clone = () => JSON.parse(currentBytes);
const evaluate = document => evaluateHookDocument(JSON.stringify(document));
function fixture(t, bytes = currentBytes) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'hook-contract-'))), repo = join(base, 'repo');
  t.after(() => rmSync(base, { recursive: true, force: true }));
  mkdirSync(join(repo, 'scripts/lib'), { recursive: true });
  mkdirSync(join(repo, '.codex'));
  for (const file of ['scripts/codex-hook-contract.mjs', 'scripts/lib/codex-hook-contract.mjs']) cpSync(join(root, file), join(repo, file));
  writeFileSync(join(repo, '.codex/hooks.json'), bytes);
  const run = (args = [], input) => {
    const child = spawnSync(process.execPath, [join(repo, 'scripts/codex-hook-contract.mjs'), 'inspect', '--json', '--root', repo, ...args],
      { input, encoding: 'utf8', timeout: 5000, maxBuffer: MAX_REPORT_BYTES + 1024 });
    return { ...child, report: JSON.parse(child.stdout) };
  };
  return { base, repo, run };
}

test('fixed historical artifacts recognize exactly old/current revisions and complete stable mappings', () => {
  for (const [bytes, digest, artifact, classification] of [
    [oldBytes, OLD, '158fab99b871b57dd28bcf870b302163c188fc61eb9d0c3a827b9035ca9c5542', 'RECOGNIZED_PREVIOUS'],
    [currentBytes, CURRENT, '8beee10eaa2f8297cb8ded5aefa9a95e1b29e8ddfb84b4b01e855b68c16c5805', 'CURRENT'],
  ]) {
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact);
    const value = evaluateHookDocument(bytes);
    assert.equal(value.recognized, true);
    assert.equal(value.classification, classification);
    assert.equal(value.semanticDigest, digest);
    assert.equal(value.artifactDigest, artifact);
    assert.deepEqual(value.problems, []);
    assert.equal(value.hooks.length, 11);
    assert.equal(new Set(value.hooks.map(row => row.id)).size, 11);
    const document = JSON.parse(bytes);
    for (const row of value.hooks) {
      const location = value.nativeLocations.find(location => location.id === row.id);
      assert.deepEqual(row.operationalFields, document.hooks[location.event][location.groupIndex].hooks[location.hookIndex]);
      assert.equal(row.nativeKeySuffix, `:${location.nativeEvent}:${location.groupIndex}:${location.hookIndex}`);
      assert.equal(Object.hasOwn(row, 'currentHash'), false, 'native hashes may only come from Codex');
    }
  }
  assert.deepEqual(evaluateHookDocument(oldBytes).nativeLocations, evaluateHookDocument(currentBytes).nativeLocations);
  assert.deepEqual(evaluateHookDocument(currentBytes).hooks.map(row => row.id), [
    'session-restore', 'model-route-root', 'route-guard', 'project-scope-guard', 'model-route-tool', 'post-edit',
    'session-sync', 'model-route-subagent-start', 'model-route-subagent-stop', 'session-end', 'model-route-session-end']);
});

test('only the reviewed old-to-new semantic delta has migration actions, with every stable ID mapped', () => {
  const forward = compareHookDocuments(currentBytes, oldBytes);
  assert.equal(forward.state, 'KNOWN_UPGRADE');
  assert.equal(forward.transition.fromDigest, OLD);
  assert.equal(forward.transition.toDigest, CURRENT);
  assert.match(forward.transition.reviewRef, /351bb15c514a9c64156c1dea60774ac1d9ef3e408a447f5c2bbe516bf55cf13f/);
  assert.equal(forward.transition.idMapping.length, 11);
  assert.ok(forward.transition.idMapping.every(row => row.fromId === row.toId));
  assert.deepEqual(forward.transition.allowedActions, ['replace-owned-registration', 'refresh-existing-native-trust', 'disable-framework-duplicates']);
  const changes = forward.transition.changes;
  assert.equal(changes.length, 1);
  assert.equal(changes[0].field, 'matcher');
  assert.equal(changes[0].id, 'model-route-tool');
  const before = JSON.parse(oldBytes), after = clone();
  assert.equal(before.hooks.PreToolUse[1].matcher, changes[0].before);
  assert.equal(after.hooks.PreToolUse[1].matcher, changes[0].after);
  before.hooks.PreToolUse[1].matcher = changes[0].after;
  assert.deepEqual(before, after);
  assert.deepEqual(compareHookDocuments(oldBytes, currentBytes), { state: 'INCOMPATIBLE', transition: null });
});

test('description, JSON spacing and object-key formatting change artifact identity only', t => {
  const f = fixture(t);
  for (const change of [document => { document.description = 'new description'; }, document => { delete document.description; },
    document => { document.hooks = Object.fromEntries(Object.entries(document.hooks).reverse()); }]) {
    const document = clone(); change(document);
    const bytes = JSON.stringify(document);
    const value = evaluateHookDocument(bytes);
    assert.equal(value.semanticDigest, CURRENT);
    assert.notEqual(value.artifactDigest, evaluateHookDocument(currentBytes).artifactDigest);
    assert.deepEqual(compareHookDocuments(currentBytes, bytes), { state: 'METADATA_ONLY', transition: null });
    writeFileSync(join(f.repo, '.codex/hooks.json'), bytes);
    assert.equal(inspectHookHealth(f.repo, { sourceOnly: true }).ok, true);
  }
  assert.deepEqual(compareHookDocuments(currentBytes, currentBytes), { state: 'EQUIVALENT', transition: null });
});

test('every registered operational field and missing field is checked, with no source self-approval', () => {
  let mutations = 0;
  for (const [event, groups] of Object.entries(clone().hooks)) for (const [groupIndex, group] of groups.entries()) {
    for (const [hookIndex, hook] of group.hooks.entries()) for (const field of Object.keys(hook)) {
      for (const kind of ['change', 'delete']) {
        const document = clone(), target = document.hooks[event][groupIndex].hooks[hookIndex];
        if (kind === 'delete') delete target[field];
        else target[field] = typeof target[field] === 'number' ? target[field] + 1 : target[field] + ' changed';
        const value = evaluate(document);
        assert.equal(value.recognized, false, `${event}[${groupIndex}].hooks[${hookIndex}].${field} ${kind}`);
        assert.deepEqual(value.hooks, []);
        assert.equal(describeHookContract(JSON.stringify(document)), null);
        assert.equal(compareHookDocuments(currentBytes, JSON.stringify(document)).state, 'LOCAL_MODIFIED');
        assert.equal(compareHookDocuments(JSON.stringify(document), currentBytes).state, 'INCOMPATIBLE');
        mutations++;
      }
    }
    if (Object.hasOwn(group, 'matcher')) {
      for (const kind of ['change', 'delete']) {
        const document = clone();
        if (kind === 'delete') delete document.hooks[event][groupIndex].matcher;
        else document.hooks[event][groupIndex].matcher += '|unknown';
        assert.equal(evaluate(document).recognized, false, `${event} matcher ${kind}`); mutations++;
      }
    }
  }
  assert.ok(mutations >= 70);
});

test('reorder, regroup, add, remove and unknown fields never acquire identity from position', () => {
  for (const mutate of [
    document => document.hooks.SessionStart.reverse(),
    document => document.hooks.SessionStart[0].hooks.push(document.hooks.SessionStart.pop().hooks[0]),
    document => document.hooks.SessionStart[0].hooks.push({ type: 'command', command: 'true' }),
    document => document.hooks.SessionStart.pop(),
    document => { delete document.hooks.Stop; },
    document => { document.hooks.OtherEvent = document.hooks.Stop; },
    document => { document.approved = true; },
    document => { document.contractRevision = 'native-trust-v1.3'; },
    document => { document.hooks.Stop[0].description = 'not display metadata'; },
    document => { document.hooks.Stop[0].hooks[0].description = 'not display metadata'; },
    document => { document.hooks.Stop[0].hooks[0].id = 'session-sync'; },
    document => { document.hooks.Stop[0].hooks[0].timeoutSec = 30; },
    document => { document.hooks.Stop[0].hooks[0].additionalContextLimit = 0; },
    document => { document.hooks.Stop[0].hooks[0].async = false; },
    document => { document.hooks.Stop[0].hooks[0].unknownOperationalField = true; },
  ]) {
    const document = clone(); mutate(document);
    const value = evaluate(document);
    assert.equal(value.recognized, false);
    assert.deepEqual(value.nativeLocations, []);
  }
});

test('schema, API, protocol and every required capability are independently negotiated', () => {
  const contract = describeHookContract(currentBytes);
  assert.equal(checkContractCompatibility(contract).ok, true);
  for (const options of [{ schemaVersion: 2 }, { contractApiMajor: 2 }, { appProtocol: 2 }, { appProtocol: 0 },
    { appCapabilities: [] }, { codexCapabilities: [] }]) assert.equal(checkContractCompatibility(contract, options).ok, false);
  for (const capability of contract.supportedCodexCapabilities) assert.equal(checkContractCompatibility(contract,
    { codexCapabilities: contract.supportedCodexCapabilities.filter(value => value !== capability) }).ok, false);
  for (const field of ['requiredCapabilities', 'supportedCodexCapabilities']) {
    const altered = structuredClone(contract); altered[field].push('future-required');
    assert.equal(checkContractCompatibility(altered).ok, false);
  }
  assert.equal(checkContractCompatibility({ ...contract, protocol: 'future' }).ok, false);
  contract.reviewedTransitions[0].idMapping[0].toId = 'tampered';
  assert.equal(describeHookContract(currentBytes).reviewedTransitions[0].idMapping[0].toId, 'session-restore');
});

test('CLI binds helper, source and physical canonical root, classifies stdin without adoption or writes', t => {
  const f = fixture(t), path = join(f.repo, '.codex/hooks.json'), before = lstatSync(path);
  const { status, report, stdout } = f.run(['--document-stdin'], oldBytes);
  assert.equal(status, 0);
  assert.equal(report.ok, true);
  assert.ok(Buffer.byteLength(stdout) < MAX_REPORT_BYTES);
  assert.deepEqual(report.frameworkRootIdentity, { canonicalPath: f.repo, dev: lstatSync(f.repo).dev, ino: lstatSync(f.repo).ino });
  assert.deepEqual(report.contract.frameworkRootIdentity, report.frameworkRootIdentity);
  assert.equal(report.source.artifactDigest, createHash('sha256').update(readFileSync(path)).digest('hex'));
  assert.equal(report.sourceFileIdentity.ino, before.ino);
  assert.equal(report.document.semanticDigest, OLD);
  assert.equal(report.comparison.state, 'KNOWN_UPGRADE');
  assert.deepEqual(report.adoption, { required: true, granted: false });
  assert.equal(report.contract.hooks.some(row => Object.hasOwn(row, 'currentHash')), false);
  const after = lstatSync(path);
  for (const field of ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs', 'mode']) assert.equal(after[field], before[field]);
  assert.equal(readFileSync(path).equals(currentBytes), true);
  assert.equal(f.run().report.document, null);
  const old = fixture(t, oldBytes);
  assert.equal(old.run().report.contract.contractRevision, 'native-trust-v1.1');
});

test('CLI rejects wrong root, symlink aliases, arbitrary path options, oversize and source drift', t => {
  const f = fixture(t), alias = join(f.base, 'alias');
  symlinkSync(f.repo, alias);
  for (const args of [['--root', root], ['--document', '/etc/passwd'], ['--json']]) assert.equal(f.run(args).status, 2);
  const wrongRoot = spawnSync(process.execPath, [join(f.repo, 'scripts/codex-hook-contract.mjs'), 'inspect', '--json', '--root', root], { encoding: 'utf8' });
  assert.equal(wrongRoot.status, 1); assert.match(wrongRoot.stdout, /HELPER_ROOT_MISMATCH/);
  const symlinkRoot = spawnSync(process.execPath, [join(f.repo, 'scripts/codex-hook-contract.mjs'), 'inspect', '--json', '--root', alias], { encoding: 'utf8' });
  assert.equal(symlinkRoot.status, 1); assert.match(symlinkRoot.stdout, /ROOT_NOT_CANONICAL/);
  const oversized = f.run(['--document-stdin'], Buffer.alloc(MAX_DOCUMENT_BYTES + 1, ' '));
  assert.equal(oversized.status, 1); assert.deepEqual(oversized.report.problems, ['DOCUMENT_TOO_LARGE']);
  const secret = 'DO_NOT_ECHO_UNREVIEWED_COMMAND', document = clone();
  document.hooks.Stop[0].hooks[0].command = `touch ${join(f.base, secret)}`;
  writeFileSync(join(f.repo, '.codex/hooks.json'), JSON.stringify(document));
  const changed = f.run();
  assert.equal(changed.status, 1); assert.equal(changed.report.contract, null);
  assert.doesNotMatch(changed.stdout, new RegExp(secret));
  assert.equal(existsSync(join(f.base, secret)), false);
});

test('invalid documents fail closed and report bounded reason codes', () => {
  for (const value of [null, {}, '', '[', 'null', '{}', '{"hooks":[]}', Buffer.alloc(MAX_DOCUMENT_BYTES + 1)]) {
    const report = evaluateHookDocument(value);
    assert.equal(report.recognized, false);
    assert.equal(report.classification, 'INVALID');
    assert.equal(report.problems.length, 1);
  }
});
