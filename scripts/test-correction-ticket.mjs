#!/usr/bin/env node
import assert from 'assert/strict';
import { createHash, randomUUID } from 'crypto';
import { spawnSync } from 'child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import {
  buildCorrectionCloseRequest,
  classifyCorrectionPrompt,
  closeCorrectionTicket,
  correctionEvidenceVariants,
  hashCorrectionPrompt,
  issueCorrectionTicket,
  readActiveCorrectionTicket,
  readCurrentCorrectionReceipt,
} from '../.claude/hooks/lib/correction-contract.mjs';
import {
  CORRECTION_VERIFIER_REGISTRY,
  CORRECTION_VERIFIER_REGISTRY_VERSION,
} from '../.claude/hooks/lib/correction-verifiers.mjs';

const repoRoot = process.cwd();
const routeGuard = resolve(repoRoot, '.claude/hooks/route-guard.mjs');
const sessionSync = resolve(repoRoot, '.claude/hooks/session-sync.mjs');
const closeScript = resolve(repoRoot, 'scripts/close-correction-ticket.mjs');
let sequence = 0;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function rootFixture() {
  const root = mkdtempSync(join(tmpdir(), 'correction-ticket-'));
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
  return root;
}

function write(root, relative, content) {
  const path = join(root, relative);
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, content);
  return path;
}

function issue(root, label = 'case') {
  sequence += 1;
  const sessionId = `s-${label}-${sequence}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 36);
  const eventId = `event-${sequence}`;
  const prompt = `prompt-${label}-${sequence}`;
  const record = issueCorrectionTicket({
    root, sessionId, eventId, prompt,
    now: new Date(Date.now() - 5_000).toISOString(),
  });
  assert.equal(record.created, true);
  assert.equal(record.ticket.prompt_sha256, hashCorrectionPrompt(prompt));
  return { sessionId, eventId, prompt, record };
}

function evidenceFor(root, level, route, { l3Candidate = false } = {}) {
  const evidence = [];
  if (level === 'L1') {
    evidence.push({
      kind: 'DISCLOSURE', verifier: 'DISCLOSURE_LINE_V1',
      path: write(root, 'evidence/disclosure.txt', '归因: L1 产出物层 ｜ 依据: 一次性偏差 ｜ 处置: 已修\n'), selector: '',
    });
  } else if (level === 'L2') {
    evidence.push({
      kind: 'AFFECTED_ARTIFACT', verifier: 'REGULAR_FILE_SHA256_V1',
      path: write(root, 'evidence/affected.md', '# corrected artifact\n'), selector: '',
    });
  } else if (level === 'L3' && !l3Candidate) {
    const observationId = `O-20260812-${String(sequence).padStart(3, '0')}`;
    const observations = write(root, 'evidence/observations.jsonl', `${JSON.stringify({
      id: observationId,
      time: new Date().toISOString(),
      skill: 'test-skill',
      source: 'user_feedback',
      severity: 'medium',
      message: 'explicit correction',
      problem: '',
      correction: 'fixed',
    })}\n`);
    write(root, 'evidence/rules.yaml', [
      'version: 1',
      'rules:',
      '- id: R-20260812-001',
      '  status: active',
      '  rule: "test-skill: corrected rule"',
      '  source_observations:',
      `    - ${observationId}`,
      '',
    ].join('\n'));
    evidence.push({
      kind: 'OBSERVATION_RULE', verifier: 'OBSERVATION_RULE_JSONL_V1',
      path: observations, selector: observationId,
    });
  } else if (level === 'L3' || level === 'L4') {
    const candidateId = `SC-20260812-${String(sequence).padStart(3, '0')}`;
    const candidates = write(root, 'evidence/candidates.jsonl', `${JSON.stringify({
      id: candidateId,
      created_at: new Date().toISOString(),
      domain: 'skill-rule',
      fact: 'verified framework correction',
      confidence: 'high',
      source: 'test',
      evidence: 'fixture',
      scope: 'test',
      reviewer: 'luca',
      tags: [],
      valid_until: '',
      supersedes: '',
      proposed_stable: false,
      stable_requested: true,
      status: 'CANDIDATE',
    })}\n`);
    evidence.push({
      kind: 'SEMANTIC_CANDIDATE', verifier: 'SEMANTIC_CANDIDATE_JSONL_V1',
      path: candidates, selector: candidateId,
    });
  } else if (level === 'L5') {
    const target = write(root, 'evidence/task.md', '# owned source repair task\n');
    const pointer = write(root, 'evidence/fix-pointer.json', `${JSON.stringify({
      schema_version: 'correction-fix-pointer-v1',
      pointer_type: 'task',
      target: 'task.md',
      target_sha256: sha256(readFileSync(target)),
    }, null, 2)}\n`);
    evidence.push({
      kind: 'FIX_OR_TASK_POINTER', verifier: 'FIX_OR_TASK_POINTER_V1',
      path: pointer, selector: '',
    });
  }
  if (route) {
    const fixtureId = `route:correction:${sequence}`;
    const fixtures = write(root, 'evidence/fixtures.jsonl', `${JSON.stringify({
      id: fixtureId,
      input: 'user correction prompt',
      expected: 'quick-research',
      layer: 'semantic',
      scene: 'meta',
      note: 'real correction fixture',
    })}\n`);
    evidence.push({
      kind: 'ROUTING_FIXTURE', verifier: 'ROUTING_FIXTURE_JSONL_V1',
      path: fixtures, selector: fixtureId,
    });
  }
  return evidence;
}

function closeLevel(level, route, options = {}) {
  const root = rootFixture();
  const issued = issue(root, `${level}-${route ? 'route' : 'plain'}`);
  const evidence = evidenceFor(root, level, route, options);
  const request = buildCorrectionCloseRequest({
    ticket: issued.record.ticket,
    attributionLevel: level,
    routeCorrection: route,
    evidence,
  });
  const closed = closeCorrectionTicket({
    root,
    request,
    baselineCounts: { edit: 3, tool: 9 },
  });
  assert.equal(closed.receipt.attribution_level, level);
  assert.equal(closed.receipt.route_correction, route);
  assert.deepEqual(
    [...closed.receipt.required_evidence_kinds].sort(),
    evidence.map(item => item.kind).sort(),
  );
  assert.equal(readActiveCorrectionTicket({ root, sessionId: issued.sessionId }), null);
  assert.equal(readCurrentCorrectionReceipt({ root, sessionId: issued.sessionId }).receipt.receipt_id, closed.receipt.receipt_id);
  return { root, issued, request, closed, evidence };
}

// ASSERT-011: every L1-L5 x route bit closes with exactly the matrix-derived entities.
for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
  for (const route of [false, true]) closeLevel(level, route);
}
closeLevel('L3', false, { l3Candidate: true });
closeLevel('NONE', false);
assert.equal(classifyCorrectionPrompt('普通问题：今天的状态是什么？'), 'NO_EXPLICIT_CORRECTION');
assert.equal(
  classifyCorrectionPrompt('纠正：你刚才路由错了，以后必须命中 quick-research'),
  'EXPLICIT_CORRECTION',
);
assert.deepEqual(correctionEvidenceVariants('L3', true), [
  ['OBSERVATION_RULE', 'ROUTING_FIXTURE'],
  ['SEMANTIC_CANDIDATE', 'ROUTING_FIXTURE'],
]);
console.log('PASS ASSERT-011 L1-L5 × route/non-route exact evidence matrix');

// Strict schemas and fixed registry: no arbitrary command/verifier channel exists.
const ticketSchema = JSON.parse(readFileSync('.claude/skill-os/correction-ticket.schema.json', 'utf8'));
const receiptSchema = JSON.parse(readFileSync('.claude/skill-os/correction-receipt.schema.json', 'utf8'));
assert.equal(ticketSchema.additionalProperties, false);
assert.equal(receiptSchema.additionalProperties, false);
assert.equal(Object.isFrozen(CORRECTION_VERIFIER_REGISTRY), true);
assert.equal(CORRECTION_VERIFIER_REGISTRY_VERSION, 'correction-verifiers-v1');
assert.deepEqual(
  [...receiptSchema.properties.evidence.items.properties.verifier.enum].sort(),
  Object.keys(CORRECTION_VERIFIER_REGISTRY).sort(),
);
for (const value of Object.values(CORRECTION_VERIFIER_REGISTRY)) assert.equal(Object.isFrozen(value), true);

// ASSERT-012: wrong bindings, missing/extra entities, fake verifier and command injection all reject before mutation.
{
  const root = rootFixture();
  const issued = issue(root, 'negative');
  const evidence = evidenceFor(root, 'L4', false);
  const good = buildCorrectionCloseRequest({
    ticket: issued.record.ticket,
    attributionLevel: 'L4',
    routeCorrection: false,
    evidence,
  });
  const mutations = [
    { ...good, ticket_id: `ct-${'0'.repeat(64)}` },
    { ...good, session_id: 'wrong-session' },
    { ...good, event_id: 'wrong-event' },
    { ...good, prompt_sha256: '0'.repeat(64) },
    { ...good, prompt_signal: 'EXPLICIT_CORRECTION' },
    { ...good, nonce: randomUUID() },
    { ...good, evidence: [] },
    { ...good, evidence: [...good.evidence, {
      kind: 'ROUTING_FIXTURE', verifier: 'ROUTING_FIXTURE_JSONL_V1', path: good.evidence[0].path, selector: 'fake',
    }] },
    { ...good, evidence: [{ ...good.evidence[0], verifier: 'ALWAYS_SUCCESS' }] },
    { ...good, evidence: [{ ...good.evidence[0], command: 'true' }] },
  ];
  for (const request of mutations) {
    assert.throws(() => closeCorrectionTicket({ root, request, baselineCounts: { edit: 1, tool: 1 } }));
    assert.equal(readActiveCorrectionTicket({ root, sessionId: issued.sessionId }).ticket.ticket_id, issued.record.ticket.ticket_id);
  }
  const closed = closeCorrectionTicket({ root, request: good, baselineCounts: { edit: 1, tool: 1 } });
  assert.throws(
    () => closeCorrectionTicket({ root, request: good, baselineCounts: { edit: 1, tool: 1 } }),
    /already consumed/,
  );
  writeFileSync(evidence[0].path, `${readFileSync(evidence[0].path, 'utf8')}{"tampered":true}\n`);
  assert.throws(() => readCurrentCorrectionReceipt({ root, sessionId: issued.sessionId }), /changed after receipt close|invalid JSONL/);
  assert.ok(closed.receipt.receipt_id.startsWith('cr-'));
}

// A prompt classified from the original bytes as an explicit correction cannot self-report NONE.
{
  const root = rootFixture();
  const prompt = '纠正：你刚才路由错了，以后必须命中 quick-research';
  const issued = issueCorrectionTicket({
    root,
    sessionId: 'explicit-correction',
    eventId: 'event-explicit-correction',
    prompt,
    now: new Date(Date.now() - 5_000).toISOString(),
  });
  assert.equal(issued.ticket.prompt_signal, 'EXPLICIT_CORRECTION');
  assert.throws(
    () => buildCorrectionCloseRequest({
      ticket: issued.ticket,
      attributionLevel: 'NONE',
      routeCorrection: false,
      evidence: [],
    }),
    /explicit correction cannot close as NONE/,
  );
  assert.equal(readActiveCorrectionTicket({ root, sessionId: 'explicit-correction' }).ticket.ticket_id, issued.ticket.ticket_id);
}

// Evidence that predates a ticket cannot be reused unchanged for that ticket.
{
  const root = rootFixture();
  const issued = issue(root, 'old-evidence');
  const evidence = evidenceFor(root, 'L1', false);
  const stale = new Date(Date.parse(issued.record.ticket.created_at) - 60_000);
  utimesSync(evidence[0].path, stale, stale);
  const request = buildCorrectionCloseRequest({
    ticket: issued.record.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence,
  });
  assert.throws(
    () => closeCorrectionTicket({ root, request, baselineCounts: { edit: 1, tool: 1 } }),
    /evidence predates ticket/,
  );
  assert.equal(readActiveCorrectionTicket({ root, sessionId: issued.sessionId }).ticket.ticket_id, issued.record.ticket.ticket_id);
}

// Evidence accepted for ticket A cannot be replayed unchanged against later ticket B.
{
  const completed = closeLevel('L1', false);
  const ticketBCreatedAt = new Date(Date.now() + 2_000).toISOString();
  const ticketB = issueCorrectionTicket({
    root: completed.root,
    sessionId: completed.issued.sessionId,
    eventId: 'event-evidence-replay-b',
    prompt: '普通后续任务',
    now: ticketBCreatedAt,
  });
  const requestB = buildCorrectionCloseRequest({
    ticket: ticketB.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: completed.evidence,
  });
  assert.throws(
    () => closeCorrectionTicket({
      root: completed.root,
      request: requestB,
      baselineCounts: { edit: 2, tool: 2 },
      now: new Date(Date.parse(ticketBCreatedAt) + 1_000).toISOString(),
    }),
    /evidence predates ticket/,
  );
  assert.equal(
    readActiveCorrectionTicket({ root: completed.root, sessionId: completed.issued.sessionId }).ticket.ticket_id,
    ticketB.ticket.ticket_id,
  );
}

// A changed receipt or ticket cannot be repaired by a matching self-report.
{
  const completed = closeLevel('L2', false);
  const state = join(completed.root, '.claude', 'correction-state', completed.issued.sessionId);
  const receiptPath = join(state, 'receipts', `${completed.issued.record.ticket.ticket_id}.json`);
  const forged = JSON.parse(readFileSync(receiptPath, 'utf8'));
  forged.nonce = randomUUID();
  writeFileSync(receiptPath, `${JSON.stringify(forged, null, 2)}\n`);
  assert.throws(
    () => readCurrentCorrectionReceipt({ root: completed.root, sessionId: completed.issued.sessionId }),
    /completion hash mismatch/,
  );
}

{
  const root = rootFixture();
  const issued = issue(root, 'ticket-tamper');
  const activePath = join(root, '.claude', 'correction-state', issued.sessionId, 'active-ticket.json');
  const forged = JSON.parse(readFileSync(activePath, 'utf8'));
  forged.nonce = randomUUID();
  writeFileSync(activePath, `${JSON.stringify(forged, null, 2)}\n`);
  assert.throws(() => readActiveCorrectionTicket({ root, sessionId: issued.sessionId }), /integrity mismatch/);
}

{
  const root = rootFixture();
  const issued = issue(root, 'state-symlink');
  const stateRoot = join(root, '.claude', 'correction-state');
  const sessionRoot = join(stateRoot, issued.sessionId);
  const parked = join(stateRoot, `${issued.sessionId}-parked`);
  renameSync(sessionRoot, parked);
  symlinkSync(parked, sessionRoot);
  assert.throws(
    () => readActiveCorrectionTicket({ root, sessionId: issued.sessionId }),
    /not a real directory/,
  );
}

{
  const root = rootFixture();
  const issued = issue(root, 'ticket-leaf-symlink');
  const stateRoot = join(root, '.claude', 'correction-state', issued.sessionId);
  const activePath = join(stateRoot, 'active-ticket.json');
  const parked = join(root, 'external-ticket.json');
  renameSync(activePath, parked);
  symlinkSync(parked, activePath);
  assert.throws(
    () => readActiveCorrectionTicket({ root, sessionId: issued.sessionId }),
    /regular non-symlink/,
  );
}
console.log('PASS ASSERT-012 replay/forgery/wrong-binding/evidence-tamper rejection');

// The shipped close CLI—not only the library—must produce the verified NONE receipt.
{
  const root = rootFixture();
  const issued = issue(root, 'cli');
  write(root, `.claude/.session-edit-count-${issued.sessionId}`, '4');
  write(root, `.claude/.session-tool-count-${issued.sessionId}`, '7');
  const template = spawnSync('node', [closeScript, 'template', '--session', issued.sessionId, '--level', 'L4'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root },
  });
  assert.equal(template.status, 0, template.stderr);
  const templateJson = JSON.parse(template.stdout);
  assert.equal(templateJson.choose_exactly_one[0].evidence[0].verifier, 'SEMANTIC_CANDIDATE_JSONL_V1');
  const closed = spawnSync('node', [closeScript, 'close', '--session', issued.sessionId, '--level', 'NONE'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root },
  });
  assert.equal(closed.status, 0, closed.stderr);
  assert.match(closed.stdout, /^CORRECTION_RECEIPT_CLOSED cr-[a-f0-9]{64} [a-f0-9]{64}\n$/);
  assert.deepEqual(readCurrentCorrectionReceipt({ root, sessionId: issued.sessionId }).receipt.baseline_counts, { edit: 4, tool: 7 });
}
console.log('PASS close CLI template + receipt read-back');

function runHook(script, root, input, extraEnv = {}) {
  const result = spawnSync('node', [script], {
    cwd: root,
    encoding: 'utf8',
    input: JSON.stringify(input),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
      LUCA_GSTACK_ROOT: root,
      LUCA_PROJECTS_ROOT: join(root, 'projects'),
      ROUTE_GUARD_PROJECTS: '',
      ROUTE_GUARD_CURRENT_PROJECT: '',
      ...extraEnv,
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

// A valid old completion can never release Stop while a newer ticket is active.
{
  const completed = closeLevel('NONE', false);
  const sessionId = completed.issued.sessionId;
  const next = issueCorrectionTicket({
    root: completed.root,
    sessionId,
    eventId: 'event-after-completion',
    prompt: '普通后续任务',
    now: new Date(Date.now() - 1_000).toISOString(),
  });
  assert.equal(next.created, true);
  assert.throws(
    () => readCurrentCorrectionReceipt({ root: completed.root, sessionId }),
    /active correction ticket supersedes prior completion/,
  );
  write(completed.root, `.claude/.session-edit-count-${sessionId}`, '4');
  write(completed.root, `.claude/.session-tool-count-${sessionId}`, '9');
  const blocked = runHook(sessionSync, completed.root, { session_id: sessionId, stop_hook_active: true });
  const decision = JSON.parse(blocked.stdout);
  assert.equal(decision.decision, 'block');
  assert.match(decision.reason, new RegExp(next.ticket.ticket_id));
  assert.equal(readActiveCorrectionTicket({ root: completed.root, sessionId }).ticket.ticket_id, next.ticket.ticket_id);
}

// Live hook composition: UserPromptSubmit issues first; marker and stop_hook_active cannot release.
{
  const root = rootFixture();
  const sessionId = 'hook-session';
  const prompt = '这是一次需要纠正的框架任务';
  runHook(routeGuard, root, { session_id: sessionId, turn_id: 'native-turn-1', prompt });
  const active = readActiveCorrectionTicket({ root, sessionId });
  assert.equal(active.ticket.event_id, 'native-turn-1');
  assert.equal(active.ticket.prompt_sha256, hashCorrectionPrompt(prompt));
  write(root, `.claude/.session-edit-count-${sessionId}`, '1');
  write(root, `.claude/.session-tool-count-${sessionId}`, '2');
  write(root, `.claude/.episode-written-${sessionId}`, '999 999');
  const blocked = runHook(sessionSync, root, { session_id: sessionId, stop_hook_active: true });
  const decision = JSON.parse(blocked.stdout);
  assert.equal(decision.decision, 'block');
  assert.match(decision.reason, new RegExp(active.ticket.ticket_id));
  assert.match(decision.reason, /marker 仅提示，绝无放行权/);
  assert.ok(decision.reason.length <= 900, `Stop reason too long: ${decision.reason.length}`);

  const request = buildCorrectionCloseRequest({
    ticket: active.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: evidenceFor(root, 'L1', false),
  });
  closeCorrectionTicket({ root, request, baselineCounts: { edit: 1, tool: 2 } });
  assert.equal(runHook(sessionSync, root, { session_id: sessionId, stop_hook_active: true }).stdout, '');

  write(root, `.claude/.session-edit-count-${sessionId}`, '12');
  const rearmed = runHook(sessionSync, root, { session_id: sessionId, stop_hook_active: true });
  assert.equal(JSON.parse(rearmed.stdout).decision, 'block');
  assert.match(JSON.parse(rearmed.stdout).reason, /Δedit=11/);
  assert.ok(readActiveCorrectionTicket({ root, sessionId }), 'rearm must have one active O_EXCL ticket');
}
console.log('PASS hook issuance + receipt-only release + receipt-derived rearm');

console.log('CORRECTION_ATTRIBUTION_MATRIX_PASS');
