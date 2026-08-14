#!/usr/bin/env node
import assert from 'assert/strict';
import { createHash, randomUUID } from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { once } from 'events';
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import {
  acquireCurrentCorrectionReceiptSnapshot,
  buildCorrectionCloseRequest,
  classifyCorrectionPrompt,
  closeCorrectionTicket,
  CORRECTION_CLOSING_SCHEMA_VERSION,
  CORRECTION_EVIDENCE_BINDING_SCHEMA_VERSION,
  CORRECTION_RECEIPT_SCHEMA_VERSION,
  correctionEvidenceVariants,
  hashCorrectionPrompt,
  inspectCorrectionTransitionLock,
  issueCorrectionTicket,
  recordCorrectionEvidence,
  readActiveCorrectionTicket,
  readCurrentCorrectionReceipt,
  recoverCorrectionTransitionLock,
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

function processStartSha256(pid) {
  const result = spawnSync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const started = String(result.stdout).trim().replace(/\s+/g, ' ');
  assert.ok(started);
  return sha256(Buffer.from(`ps-lstart:${started}`, 'utf8'));
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

function recoverDeadTransition(root, sessionId) {
  const inspected = inspectCorrectionTransitionLock({ root, sessionId });
  assert.equal(inspected.occupied, true);
  assert.equal(inspected.owner_alive, false);
  assert.equal(recoverCorrectionTransitionLock({
    root,
    sessionId,
    ownerHandle: inspected.owner_handle,
  }).recovered, true);
}

function evidenceBinding(ticket) {
  return `ticket=${ticket.ticket_id} nonce=${ticket.nonce}`;
}

function evidenceFor(root, ticket, level, route, { l3Candidate = false } = {}) {
  const binding = evidenceBinding(ticket);
  const evidence = [];
  if (level === 'L1') {
    evidence.push({
      kind: 'DISCLOSURE', verifier: 'DISCLOSURE_LINE_V1',
      path: write(root, 'evidence/disclosure.txt', `归因: L1 产出物层 ｜ 依据: 一次性偏差 ｜ 处置: 已修 ｜ ${binding}\n`), selector: '',
    });
  } else if (level === 'L2') {
    evidence.push({
      kind: 'AFFECTED_ARTIFACT', verifier: 'REGULAR_FILE_SHA256_V1',
      path: write(root, 'evidence/affected.md', `# corrected artifact\n<!-- ${binding} -->\n`), selector: '',
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
      correction: `fixed ${binding}`,
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
      evidence: `fixture ${binding}`,
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
      correction_ticket_id: ticket.ticket_id,
      correction_nonce: ticket.nonce,
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
      note: `real correction fixture ${binding}`,
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
  const evidence = evidenceFor(root, issued.record.ticket, level, route, options);
  const request = buildCorrectionCloseRequest({
    ticket: issued.record.ticket,
    attributionLevel: level,
    routeCorrection: route,
    evidence,
  });
  recordCorrectionEvidence({ root, request });
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
for (const prompt of [
  '你现在没有先识别是什么项目吗？还是已经识别了',
  '那你为什么没有识别？',
  '我是说，先确认项目，再执行后续任务',
  '这个流程有问题',
]) {
  assert.equal(
    classifyCorrectionPrompt(prompt),
    'EXPLICIT_CORRECTION',
    `high-confidence Chinese correction must be explicit: ${prompt}`,
  );
}
for (const prompt of [
  '不对称加密怎么实现？',
  '这个流程有问题吗？',
  '以后用户必须先登录吗？',
  '下次发布必须先跑测试吗？',
]) {
  assert.equal(
    classifyCorrectionPrompt(prompt),
    'NO_EXPLICIT_CORRECTION',
    `ordinary terminology/product question must not become a correction: ${prompt}`,
  );
}
assert.deepEqual(correctionEvidenceVariants('L3', true), [
  ['OBSERVATION_RULE', 'ROUTING_FIXTURE'],
  ['SEMANTIC_CANDIDATE', 'ROUTING_FIXTURE'],
]);
console.log('PASS ASSERT-011 L1-L5 × route/non-route exact evidence matrix');

// Strict schemas and fixed registry: no arbitrary command/verifier channel exists.
const ticketSchema = JSON.parse(readFileSync('.claude/skill-os/correction-ticket.schema.json', 'utf8'));
const receiptSchema = JSON.parse(readFileSync('.claude/skill-os/correction-receipt.schema.json', 'utf8'));
const evidenceBindingSchema = JSON.parse(readFileSync('.claude/skill-os/correction-evidence-binding.schema.json', 'utf8'));
const closingSchema = JSON.parse(readFileSync('.claude/skill-os/correction-closing.schema.json', 'utf8'));
assert.equal(ticketSchema.additionalProperties, false);
assert.equal(receiptSchema.additionalProperties, false);
assert.equal(evidenceBindingSchema.additionalProperties, false);
assert.equal(closingSchema.additionalProperties, false);
assert.equal(evidenceBindingSchema.properties.schema_version.const, CORRECTION_EVIDENCE_BINDING_SCHEMA_VERSION);
assert.equal(closingSchema.properties.schema_version.const, CORRECTION_CLOSING_SCHEMA_VERSION);
assert.equal(receiptSchema.properties.schema_version.const, CORRECTION_RECEIPT_SCHEMA_VERSION);
assert.equal(ticketSchema.properties.verifier_registry.const, CORRECTION_VERIFIER_REGISTRY_VERSION);
assert.equal(receiptSchema.properties.verifier_registry.const, CORRECTION_VERIFIER_REGISTRY_VERSION);
assert.deepEqual(
  ['binding_sha256', 'bound_at', 'proof_id'].every(key => receiptSchema.properties.evidence.items.required.includes(key)),
  true,
);
assert.equal(Object.isFrozen(CORRECTION_VERIFIER_REGISTRY), true);
assert.equal(CORRECTION_VERIFIER_REGISTRY_VERSION, 'correction-verifiers-v2');
assert.deepEqual(
  [...receiptSchema.properties.evidence.items.properties.verifier.enum].sort(),
  Object.keys(CORRECTION_VERIFIER_REGISTRY).sort(),
);
for (const value of Object.values(CORRECTION_VERIFIER_REGISTRY)) assert.equal(Object.isFrozen(value), true);
assert.throws(
  () => issueCorrectionTicket({
    root: rootFixture(),
    sessionId: 'date-only-rejected',
    eventId: 'event-date-only',
    prompt: '普通任务',
    now: '2026-08-12',
  }),
  /ISO date-time/,
);
assert.throws(
  () => issueCorrectionTicket({
    root: rootFixture(),
    sessionId: 'invalid-calendar-rejected',
    eventId: 'event-invalid-calendar',
    prompt: '普通任务',
    now: '2026-02-30T00:00:00Z',
  }),
  /ISO date-time/,
);

// ASSERT-012: wrong bindings, missing/extra entities, fake verifier and command injection all reject before mutation.
{
  const root = rootFixture();
  const issued = issue(root, 'negative');
  const evidence = evidenceFor(root, issued.record.ticket, 'L4', false);
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
  recordCorrectionEvidence({ root, request: good });
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

// A later explicit correction event must supersede an older ordinary active ticket.
{
  const root = rootFixture();
  const sessionId = 'explicit-supersession';
  const ordinary = issueCorrectionTicket({
    root,
    sessionId,
    eventId: 'event-ordinary-a',
    prompt: '普通问题：今天的状态是什么？',
    now: new Date(Date.now() - 10_000).toISOString(),
  });
  const correctionPrompt = '纠正：你刚才路由错了，以后必须命中 quick-research';
  const corrective = issueCorrectionTicket({
    root,
    sessionId,
    eventId: 'event-correction-b',
    prompt: correctionPrompt,
    now: new Date(Date.now() - 5_000).toISOString(),
  });
  assert.equal(corrective.created, true);
  assert.notEqual(corrective.ticket.ticket_id, ordinary.ticket.ticket_id);
  assert.equal(corrective.ticket.event_id, 'event-correction-b');
  assert.equal(corrective.ticket.prompt_sha256, hashCorrectionPrompt(correctionPrompt));
  assert.equal(corrective.ticket.prompt_signal, 'EXPLICIT_CORRECTION');
  assert.equal(readActiveCorrectionTicket({ root, sessionId }).ticket.ticket_id, corrective.ticket.ticket_id);
  const staleOrdinaryRequest = buildCorrectionCloseRequest({
    ticket: ordinary.ticket,
    attributionLevel: 'NONE',
    routeCorrection: false,
    evidence: [],
  });
  assert.throws(
    () => closeCorrectionTicket({ root, request: staleOrdinaryRequest, baselineCounts: { edit: 1, tool: 1 } }),
    /does not bind active ticket/,
  );
  assert.throws(
    () => buildCorrectionCloseRequest({
      ticket: corrective.ticket,
      attributionLevel: 'NONE',
      routeCorrection: false,
      evidence: [],
    }),
    /explicit correction cannot close as NONE/,
  );
}

// Millisecond-identical events use the event-barrier serialization order,
// never arbitrary event_id/ticket_id lexical order. The later lock holder wins.
{
  const root = rootFixture();
  const sessionId = 'same-millisecond-order';
  const sameCreatedAt = '2026-08-12T10:00:00.123Z';
  issueCorrectionTicket({
    root,
    sessionId,
    eventId: 'z-older-event',
    prompt: '纠正：同毫秒内的第一条事件',
    now: sameCreatedAt,
  });
  const newer = issueCorrectionTicket({
    root,
    sessionId,
    eventId: 'a-newer-event',
    prompt: '纠正：同毫秒内的第二条事件',
    now: sameCreatedAt,
  });
  assert.equal(newer.ticket.event_id, 'a-newer-event');
  assert.equal(readActiveCorrectionTicket({ root, sessionId }).ticket.event_id, 'a-newer-event');
}

// A lock owner cannot make the newest explicit event disappear. The hook may
// report contention, but the complete pending ticket remains a fail-closed
// boundary and is promoted by the next transition owner.
{
  const root = rootFixture();
  const sessionId = 'explicit-lock-contention';
  const ordinary = issueCorrectionTicket({
    root,
    sessionId,
    eventId: 'event-lock-a',
    prompt: '普通问题 A',
    now: new Date(Date.now() - 10_000).toISOString(),
  });
  const staleRequest = buildCorrectionCloseRequest({
    ticket: ordinary.ticket,
    attributionLevel: 'NONE',
    routeCorrection: false,
    evidence: [],
  });
  const state = join(root, '.claude', 'correction-state', sessionId);
  const lock = join(state, '.transition.lock');
  const base = Date.now();
  writeFileSync(lock, `${JSON.stringify({
    schema_version: 1,
    owner_token: randomUUID(),
    pid: process.pid,
    process_nonce: randomUUID(),
    process_start_sha256: processStartSha256(process.pid),
    acquired_at: new Date().toISOString(),
  }, null, 2)}\n`);
  assert.throws(
    () => issueCorrectionTicket({
      root,
      sessionId,
      eventId: 'event-lock-b',
      prompt: '纠正：以后不要再丢失并发纠正事件',
      now: new Date(base + 20_000).toISOString(),
    }),
    /transition lock exists/,
  );
  const pendingPath = join(state, 'pending-explicit-ticket.json');
  assert.equal(lstatSync(pendingPath).nlink, 1);
  const pending = JSON.parse(readFileSync(pendingPath, 'utf8'));
  assert.equal(pending.event_id, 'event-lock-b');
  assert.equal(pending.prompt_signal, 'EXPLICIT_CORRECTION');
  // A delayed older invocation that publishes last cannot erase B.
  assert.throws(
    () => issueCorrectionTicket({
      root,
      sessionId,
      eventId: 'event-lock-older',
      prompt: '纠正：这是更早开始但延迟发布的事件',
      now: new Date(base + 10_000).toISOString(),
    }),
    /transition lock exists/,
  );
  assert.equal(JSON.parse(readFileSync(pendingPath, 'utf8')).event_id, 'event-lock-b');
  // A genuinely newer invocation does replace the pending head.
  assert.throws(
    () => issueCorrectionTicket({
      root,
      sessionId,
      eventId: 'event-lock-newest',
      prompt: '纠正：这是最新的显式事件',
      now: new Date(base + 30_000).toISOString(),
    }),
    /transition lock exists/,
  );
  assert.equal(JSON.parse(readFileSync(pendingPath, 'utf8')).event_id, 'event-lock-newest');
  const fractionalSecond = new Date(base + 40_000).toISOString().replace(/\.\d{3}Z$/, '');
  assert.throws(
    () => issueCorrectionTicket({
      root,
      sessionId,
      eventId: 'a-fraction-newer',
      prompt: '纠正：同毫秒内也必须保留真正较新的事件',
      now: `${fractionalSecond}.0009Z`,
    }),
    /transition lock exists/,
  );
  assert.throws(
    () => issueCorrectionTicket({
      root,
      sessionId,
      eventId: 'z-fraction-older-delayed',
      prompt: '纠正：这是同毫秒内更早但延迟发布的事件',
      now: `${fractionalSecond}.0001Z`,
    }),
    /transition lock exists/,
  );
  assert.equal(JSON.parse(readFileSync(pendingPath, 'utf8')).event_id, 'a-fraction-newer');
  unlinkSync(lock);
  assert.throws(
    () => closeCorrectionTicket({ root, request: staleRequest, baselineCounts: { edit: 1, tool: 1 } }),
    /pending explicit correction/,
  );
  // The close/template consumer can promote the durable pending event; no
  // additional top-level user prompt is required to make progress.
  const promoted = readActiveCorrectionTicket({ root, sessionId });
  assert.equal(promoted.ticket.event_id, 'a-fraction-newer');
  assert.equal(promoted.ticket.prompt_signal, 'EXPLICIT_CORRECTION');
  assert.throws(
    () => buildCorrectionCloseRequest({
      ticket: promoted.ticket,
      attributionLevel: 'NONE',
      routeCorrection: false,
      evidence: [],
    }),
    /explicit correction cannot close as NONE/,
  );
}

// A verified completion snapshot is held through the Stop decision. A
// concurrent explicit issuer cannot become durable until that allow
// linearization point has released both transition and pending locks.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const snapshot = acquireCurrentCorrectionReceiptSnapshot({ root, sessionId });
  assert.ok(snapshot.completed);
  const contractUrl = pathToFileURL(resolve(repoRoot, '.claude/hooks/lib/correction-contract.mjs')).href;
  const childSource = [
    `import { issueCorrectionTicket } from ${JSON.stringify(contractUrl)};`,
    `process.stdout.write('READY\\n');`,
    `try {`,
    `  issueCorrectionTicket({ root: process.argv[1], sessionId: process.argv[2], eventId: 'event-stop-race-b', prompt: '纠正：Stop 不得返回旧回执' });`,
    `  process.stdout.write('ISSUED\\n');`,
    `} catch (error) {`,
    `  process.stderr.write(String(error?.stack || error)); process.exit(5);`,
    `}`,
  ].join('\n');
  const child = spawn(process.execPath, ['--input-type=module', '-e', childSource, root, sessionId], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let childStdout = '';
  let childStderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { childStdout += chunk; });
  child.stderr.on('data', chunk => { childStderr += chunk; });
  while (!childStdout.includes('READY\n')) await once(child.stdout, 'data');
  await new Promise(resolveWait => setTimeout(resolveWait, 100));
  const pendingPath = join(root, '.claude', 'correction-state', sessionId, 'pending-explicit-ticket.json');
  assert.equal(existsSync(pendingPath), false);
  snapshot.release();
  const [exitCode, exitSignal] = await once(child, 'exit');
  assert.equal(exitSignal, null);
  assert.equal(exitCode, 0, childStderr);
  assert.match(childStdout, /ISSUED/);
  assert.throws(
    () => readCurrentCorrectionReceipt({ root, sessionId }),
    /active correction ticket/,
  );
  assert.equal(readActiveCorrectionTicket({ root, sessionId }).ticket.event_id, 'event-stop-race-b');
}

// Stop's allow barrier is intentionally abandoned to process death. Even
// after the allow text is emitted and transition locks are released, a new
// prompt remains non-durable until the Stop process actually exits.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const contractUrl = pathToFileURL(resolve(repoRoot, '.claude/hooks/lib/correction-contract.mjs')).href;
  const stopSource = [
    `import { acquireCurrentCorrectionReceiptSnapshot } from ${JSON.stringify(contractUrl)};`,
    `const snapshot = acquireCurrentCorrectionReceiptSnapshot({ root: process.argv[1], sessionId: process.argv[2] });`,
    `if (!snapshot.completed) process.exit(6);`,
    `process.stdout.write('ALLOW_EMITTED\\n');`,
    `snapshot.sealForProcessExit();`,
    `process.stdout.write('SEALED\\n');`,
    `setTimeout(() => process.exit(0), 350);`,
  ].join('\n');
  const stopChild = spawn(process.execPath, ['--input-type=module', '-e', stopSource, root, sessionId], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stopExit = once(stopChild, 'exit');
  let stopStdout = '';
  let stopStderr = '';
  stopChild.stdout.setEncoding('utf8');
  stopChild.stderr.setEncoding('utf8');
  stopChild.stdout.on('data', chunk => { stopStdout += chunk; });
  stopChild.stderr.on('data', chunk => { stopStderr += chunk; });
  while (!stopStdout.includes('SEALED\n')) await once(stopChild.stdout, 'data');

  const issueSource = [
    `import { issueCorrectionTicket } from ${JSON.stringify(contractUrl)};`,
    `issueCorrectionTicket({ root: process.argv[1], sessionId: process.argv[2], eventId: 'event-after-stop-eof', prompt: '纠正：只能在 Stop 退出后生效' });`,
    `process.stdout.write('ISSUED\\n');`,
  ].join('\n');
  const issueChild = spawn(process.execPath, ['--input-type=module', '-e', issueSource, root, sessionId], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const issueExit = once(issueChild, 'exit');
  let issueStdout = '';
  let issueStderr = '';
  issueChild.stdout.setEncoding('utf8');
  issueChild.stderr.setEncoding('utf8');
  issueChild.stdout.on('data', chunk => { issueStdout += chunk; });
  issueChild.stderr.on('data', chunk => { issueStderr += chunk; });
  await new Promise(resolveWait => setTimeout(resolveWait, 75));
  assert.equal(issueStdout, '');
  assert.equal(readActiveCorrectionTicket({ root, sessionId }), null);
  const [stopCode, stopSignal] = await stopExit;
  assert.equal(stopSignal, null);
  assert.equal(stopCode, 0, stopStderr);
  const [issueCode, issueSignal] = await issueExit;
  assert.equal(issueSignal, null);
  assert.equal(issueCode, 0, issueStderr);
  assert.equal(issueStdout, 'ISSUED\n');
  assert.equal(readActiveCorrectionTicket({ root, sessionId }).ticket.event_id, 'event-after-stop-eof');
}

// Evidence that predates a ticket cannot be reused unchanged for that ticket.
{
  const root = rootFixture();
  const issued = issue(root, 'old-evidence');
  const evidence = evidenceFor(root, issued.record.ticket, 'L1', false);
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
    () => recordCorrectionEvidence({
      root: completed.root,
      request: requestB,
      now: new Date(Date.parse(ticketBCreatedAt) + 500).toISOString(),
    }),
    /current ticket and nonce binding|predates ticket|another ticket|ticket-bound proof/,
  );
  assert.throws(
    () => closeCorrectionTicket({
      root: completed.root,
      request: requestB,
      baselineCounts: { edit: 2, tool: 2 },
      now: new Date(Date.parse(ticketBCreatedAt) + 1_000).toISOString(),
    }),
    /current ticket and nonce binding|evidence predates ticket/,
  );
  assert.equal(
    readActiveCorrectionTicket({ root: completed.root, sessionId: completed.issued.sessionId }).ticket.ticket_id,
    ticketB.ticket.ticket_id,
  );
}

// Mutable mtime cannot turn ticket A's unchanged evidence into ticket B evidence.
{
  const completed = closeLevel('L1', false);
  const originalBytes = readFileSync(completed.evidence[0].path);
  const originalHash = sha256(originalBytes);
  const ticketBCreatedAt = new Date(Date.now() + 2_000).toISOString();
  const ticketB = issueCorrectionTicket({
    root: completed.root,
    sessionId: completed.issued.sessionId,
    eventId: 'event-evidence-touch-b',
    prompt: '普通后续任务 B',
    now: ticketBCreatedAt,
  });
  const forgedFreshness = new Date(Date.parse(ticketBCreatedAt) + 1_000);
  utimesSync(completed.evidence[0].path, forgedFreshness, forgedFreshness);
  assert.equal(sha256(readFileSync(completed.evidence[0].path)), originalHash);
  const requestB = buildCorrectionCloseRequest({
    ticket: ticketB.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: completed.evidence,
  });
  assert.throws(
    () => recordCorrectionEvidence({
      root: completed.root,
      request: requestB,
      now: new Date(Date.parse(ticketBCreatedAt) + 1_500).toISOString(),
    }),
    /current ticket and nonce binding|another ticket|ticket-bound proof/,
  );
  assert.throws(
    () => closeCorrectionTicket({
      root: completed.root,
      request: requestB,
      baselineCounts: { edit: 3, tool: 3 },
      now: new Date(Date.parse(ticketBCreatedAt) + 2_000).toISOString(),
    }),
    /current ticket and nonce binding|ticket-bound evidence|evidence binding|predates ticket/,
  );
  assert.equal(readActiveCorrectionTicket({ root: completed.root, sessionId: completed.issued.sessionId }).ticket.ticket_id, ticketB.ticket.ticket_id);
}

// Close cannot mint its own provenance for bytes that existed before the ticket.
{
  const root = rootFixture();
  const oldPath = write(root, 'evidence/pre-ticket-disclosure.txt', '归因: L1 产出物层 ｜ 依据: 旧内容 ｜ 处置: 已修\n');
  const ticketCreatedAt = new Date(Date.now() - 1_000);
  const issued = issueCorrectionTicket({
    root,
    sessionId: 'unbound-pre-ticket',
    eventId: 'event-unbound-pre-ticket',
    prompt: '普通后续任务',
    now: ticketCreatedAt.toISOString(),
  });
  const touched = new Date(ticketCreatedAt.getTime() + 500);
  utimesSync(oldPath, touched, touched);
  const request = buildCorrectionCloseRequest({
    ticket: issued.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: [{ kind: 'DISCLOSURE', verifier: 'DISCLOSURE_LINE_V1', path: oldPath, selector: '' }],
  });
  assert.throws(
    () => recordCorrectionEvidence({ root, request }),
    /current ticket and nonce binding/,
  );
  assert.throws(
    () => closeCorrectionTicket({
      root,
      request,
      baselineCounts: { edit: 1, tool: 1 },
    }),
    /current ticket and nonce binding/,
  );
}

// Cosmetic container mutation cannot create a fresh semantic evidence proof.
{
  const completed = closeLevel('L1', false);
  const ticketB = issueCorrectionTicket({
    root: completed.root,
    sessionId: completed.issued.sessionId,
    eventId: 'event-cosmetic-replay-b',
    prompt: '普通后续任务 B',
    now: new Date(Date.now() - 1_000).toISOString(),
  });
  writeFileSync(
    completed.evidence[0].path,
    `${readFileSync(completed.evidence[0].path, 'utf8').trim()}   \n`,
  );
  const requestB = buildCorrectionCloseRequest({
    ticket: ticketB.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: completed.evidence,
  });
  assert.throws(
    () => recordCorrectionEvidence({ root: completed.root, request: requestB }),
    /current ticket and nonce binding|another ticket|ticket-bound proof/,
  );
  assert.throws(
    () => closeCorrectionTicket({
      root: completed.root,
      request: requestB,
      baselineCounts: { edit: 2, tool: 2 },
    }),
    /current ticket and nonce binding|another ticket|already consumed|ticket-bound evidence|ticket-bound proof/,
  );
}

// The same human-readable L1 explanation remains legal for ticket B when the
// producer emits B's fresh event binding; replay keys are ticket-scoped.
{
  const completed = closeLevel('L1', false);
  const ticketB = issueCorrectionTicket({
    root: completed.root,
    sessionId: completed.issued.sessionId,
    eventId: 'event-fresh-evidence-b',
    prompt: '普通后续任务的新裁决',
    now: new Date(Date.now() - 1_000).toISOString(),
  });
  const freshEvidence = [{
    kind: 'DISCLOSURE',
    verifier: 'DISCLOSURE_LINE_V1',
    path: write(
      completed.root,
      'evidence/disclosure.txt',
      `归因: L1 产出物层 ｜ 依据: 一次性偏差 ｜ 处置: 已修 ｜ ${evidenceBinding(ticketB.ticket)}\n`,
    ),
    selector: '',
  }];
  const freshRequest = buildCorrectionCloseRequest({
    ticket: ticketB.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: freshEvidence,
  });
  recordCorrectionEvidence({ root: completed.root, request: freshRequest });
  const closedB = closeCorrectionTicket({
    root: completed.root,
    request: freshRequest,
    baselineCounts: { edit: 4, tool: 4 },
  });
  assert.notEqual(closedB.receipt.evidence[0].proof_id, completed.closed.receipt.evidence[0].proof_id);
  assert.equal(closedB.receipt.ticket_id, ticketB.ticket.ticket_id);
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

// Invalid time boundaries are rejected before the closing journal, receipt,
// ticket consumption, or completion can become durable.
{
  const root = rootFixture();
  const createdAt = new Date(Date.now() - 2_000);
  const issued = issueCorrectionTicket({
    root,
    sessionId: 'precommit-time-boundary',
    eventId: 'event-precommit-time',
    prompt: '普通任务',
    now: createdAt.toISOString(),
  });
  const request = buildCorrectionCloseRequest({
    ticket: issued.ticket,
    attributionLevel: 'NONE',
    routeCorrection: false,
    evidence: [],
  });
  assert.throws(
    () => closeCorrectionTicket({
      root,
      request,
      baselineCounts: { edit: 1, tool: 1 },
      now: new Date(createdAt.getTime() - 1_000).toISOString(),
    }),
    /receipt predates ticket/,
  );
  const state = join(root, '.claude', 'correction-state', issued.ticket.session_id);
  assert.equal(existsSync(join(state, 'closing.json')), false);
  assert.equal(existsSync(join(state, 'completion.json')), false);
  assert.equal(existsSync(join(state, 'consumed', `${issued.ticket.ticket_id}.json`)), false);
  assert.equal(existsSync(join(state, 'receipts', `${issued.ticket.ticket_id}.json`)), false);
  assert.equal(readActiveCorrectionTicket({ root, sessionId: issued.ticket.session_id }).ticket.ticket_id, issued.ticket.ticket_id);
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

// Non-NONE CLI closure requires a distinct evidence-record transaction.
{
  const root = rootFixture();
  const issued = issue(root, 'cli-record');
  write(root, `.claude/.session-edit-count-${issued.sessionId}`, '5');
  write(root, `.claude/.session-tool-count-${issued.sessionId}`, '8');
  const request = buildCorrectionCloseRequest({
    ticket: issued.record.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence: evidenceFor(root, issued.record.ticket, 'L1', false),
  });
  const requestPath = write(root, 'close-request.json', `${JSON.stringify(request, null, 2)}\n`);
  const premature = spawnSync('node', [closeScript, 'close', '--request', requestPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root },
  });
  assert.equal(premature.status, 2);
  assert.match(premature.stderr, /evidence must be recorded/);
  const recorded = spawnSync('node', [closeScript, 'record', '--request', requestPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root },
  });
  assert.equal(recorded.status, 0, recorded.stderr);
  assert.match(recorded.stdout, /^CORRECTION_EVIDENCE_RECORDED ct-[a-f0-9]{64} cep-[a-f0-9]{64}\n$/);
  const closed = spawnSync('node', [closeScript, 'close', '--request', requestPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root },
  });
  assert.equal(closed.status, 0, closed.stderr);
  assert.match(closed.stdout, /^CORRECTION_RECEIPT_CLOSED cr-[a-f0-9]{64} [a-f0-9]{64}\n$/);
}
console.log('PASS separate CLI evidence record → close transaction');

// The shipped requestless NONE CLI resumes from the consumed ticket after an
// after-consume crash. Hook/tool counters may increase while recovery is
// performed; the journal's original baseline remains authoritative.
{
  const root = rootFixture();
  const issued = issue(root, 'cli-none-resume');
  write(root, `.claude/.session-edit-count-${issued.sessionId}`, '2');
  write(root, `.claude/.session-tool-count-${issued.sessionId}`, '3');
  const interrupted = spawnSync('node', [closeScript, 'close', '--session', issued.sessionId, '--level', 'NONE'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root, CORRECTION_CLOSE_FAULT: 'after-consume' },
  });
  assert.equal(interrupted.status, 2);
  assert.match(interrupted.stderr, /injected correction close fault after consume/);
  assert.equal(readActiveCorrectionTicket({ root, sessionId: issued.sessionId }), null);
  write(root, `.claude/.session-edit-count-${issued.sessionId}`, '3');
  write(root, `.claude/.session-tool-count-${issued.sessionId}`, '5');
  const resumed = spawnSync('node', [closeScript, 'close', '--session', issued.sessionId, '--level', 'NONE'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, LUCA_GSTACK_ROOT: root },
  });
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.match(resumed.stdout, /^CORRECTION_RECEIPT_CLOSED cr-[a-f0-9]{64} [a-f0-9]{64}\n$/);
  assert.deepEqual(readCurrentCorrectionReceipt({ root, sessionId: issued.sessionId }).receipt.baseline_counts, { edit: 2, tool: 3 });
}
console.log('PASS requestless NONE CLI crash resume with monotonic counter drift');

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

// Integrity failure between receipt verification and the allow seal is a
// blocking governance error, never a peripheral fail-open exception.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const transitionPath = join(root, '.claude', 'correction-state', sessionId, '.transition.lock');
  const preload = write(root, 'tamper-before-stop-seal.mjs', [
    `import { writeFileSync } from 'fs';`,
    `const originalWrite = process.stderr.write.bind(process.stderr);`,
    `let tampered = false;`,
    `process.stderr.write = (chunk, ...args) => {`,
    `  if (!tampered && String(chunk).includes('Session 结束于')) {`,
    `    tampered = true;`,
    `    writeFileSync(process.env.TAMPER_TRANSITION_PATH, '{bad-json\\n');`,
    `  }`,
    `  return originalWrite(chunk, ...args);`,
    `};`,
    '',
  ].join('\n'));
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, sessionSync], {
    cwd: root,
    encoding: 'utf8',
    input: JSON.stringify({ session_id: sessionId, stop_hook_active: true }),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
      LUCA_GSTACK_ROOT: root,
      LUCA_PROJECTS_ROOT: join(root, 'projects'),
      LUCA_ACTUAL_HARNESS: 'claude',
      TAMPER_TRANSITION_PATH: transitionPath,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).decision, 'block');
  assert.match(JSON.parse(result.stdout).reason, /snapshot finalization failed/);
  assert.doesNotMatch(result.stderr, /receipt 已验证.*放行|异常，已放行/);
}

// The Stop seal also verifies the exact event barrier that it intends to
// abandon until process death. Removing that barrier must block, not allow.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const barrierPath = join(root, '.claude', 'correction-state', sessionId, '.event-barrier.publish-lock');
  const preload = write(root, 'tamper-event-barrier-before-stop-seal.mjs', [
    `import { unlinkSync } from 'fs';`,
    `const originalWrite = process.stderr.write.bind(process.stderr);`,
    `let tampered = false;`,
    `process.stderr.write = (chunk, ...args) => {`,
    `  if (!tampered && String(chunk).includes('Session 结束于')) {`,
    `    tampered = true;`,
    `    unlinkSync(process.env.TAMPER_BARRIER_PATH);`,
    `  }`,
    `  return originalWrite(chunk, ...args);`,
    `};`,
    '',
  ].join('\n'));
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, sessionSync], {
    cwd: root,
    encoding: 'utf8',
    input: JSON.stringify({ session_id: sessionId, stop_hook_active: true }),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
      LUCA_GSTACK_ROOT: root,
      LUCA_PROJECTS_ROOT: join(root, 'projects'),
      LUCA_ACTUAL_HARNESS: 'claude',
      TAMPER_BARRIER_PATH: barrierPath,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).decision, 'block');
  assert.match(JSON.parse(result.stdout).reason, /snapshot finalization failed/);
  assert.doesNotMatch(result.stderr, /receipt 已验证.*放行|异常，已放行/);
}

// Process identity lookup is independent of mutable PATH. A live barrier
// owner cannot be misclassified and stolen by a contender with a broken PATH.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const contractUrl = pathToFileURL(resolve(repoRoot, '.claude/hooks/lib/correction-contract.mjs')).href;
  const holderSource = [
    `import { acquireCurrentCorrectionReceiptSnapshot } from ${JSON.stringify(contractUrl)};`,
    `const snapshot = acquireCurrentCorrectionReceiptSnapshot({ root: process.argv[1], sessionId: process.argv[2] });`,
    `snapshot.sealForProcessExit();`,
    `process.stdout.write('SEALED\\n');`,
    `setTimeout(() => process.exit(0), 1200);`,
  ].join('\n');
  const holder = spawn(process.execPath, ['--input-type=module', '-e', holderSource, root, sessionId], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const holderExit = once(holder, 'exit');
  let holderOut = '';
  let holderErr = '';
  holder.stdout.setEncoding('utf8');
  holder.stderr.setEncoding('utf8');
  holder.stdout.on('data', chunk => { holderOut += chunk; });
  holder.stderr.on('data', chunk => { holderErr += chunk; });
  while (!holderOut.includes('SEALED\n')) await once(holder.stdout, 'data');
  const contenderSource = [
    `import { issueCorrectionTicket } from ${JSON.stringify(contractUrl)};`,
    `issueCorrectionTicket({ root: process.argv[1], sessionId: process.argv[2], eventId: 'event-broken-path', prompt: '纠正：PATH 不得影响活锁身份' });`,
  ].join('\n');
  const contender = spawn(process.execPath, ['--input-type=module', '-e', contenderSource, root, sessionId], {
    cwd: repoRoot,
    env: { ...process.env, PATH: '/definitely/missing' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const contenderExit = once(contender, 'exit');
  await new Promise(resolveWait => setTimeout(resolveWait, 250));
  assert.equal(lstatSync(join(root, '.claude', 'correction-state', sessionId, '.event-barrier.publish-lock')).isSymbolicLink(), true);
  const [holderCode, holderSignal] = await holderExit;
  assert.equal(holderSignal, null);
  assert.equal(holderCode, 0, holderErr);
  const [contenderCode, contenderSignal] = await contenderExit;
  assert.equal(contenderSignal, null);
  assert.equal(contenderCode, 0);
}

// A peripheral failure after receipt verification is still an allow path, so
// it retains the event barrier until process death before reporting fail-open.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const marker = join(root, 'peripheral-exit-requested');
  const preload = write(root, 'fail-peripheral-and-delay-exit.mjs', [
    `import { writeFileSync } from 'fs';`,
    `const originalWrite = process.stderr.write.bind(process.stderr);`,
    `const originalExit = process.exit.bind(process);`,
    `let failed = false;`,
    `process.stderr.write = (chunk, ...args) => {`,
    `  if (!failed && String(chunk).includes('Session 结束于')) { failed = true; throw new Error('injected peripheral failure'); }`,
    `  return originalWrite(chunk, ...args);`,
    `};`,
    `process.exit = code => {`,
    `  writeFileSync(process.env.PERIPHERAL_EXIT_MARKER, 'requested\\n');`,
    `  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 600);`,
    `  originalExit(code);`,
    `};`,
    '',
  ].join('\n'));
  const hookEnv = {
    ...process.env,
    CLAUDE_PROJECT_DIR: root,
    LUCA_GSTACK_ROOT: root,
    LUCA_PROJECTS_ROOT: join(root, 'projects'),
  };
  const stopChild = spawn(process.execPath, ['--import', pathToFileURL(preload).href, sessionSync], {
    cwd: root,
    env: { ...hookEnv, PERIPHERAL_EXIT_MARKER: marker },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stopExit = once(stopChild, 'exit');
  let stopErr = '';
  stopChild.stderr.setEncoding('utf8');
  stopChild.stderr.on('data', chunk => { stopErr += chunk; });
  stopChild.stdin.end(JSON.stringify({ session_id: sessionId, stop_hook_active: true }));
  for (let attempt = 0; attempt < 100 && !existsSync(marker); attempt += 1) {
    await new Promise(resolveWait => setTimeout(resolveWait, 10));
  }
  assert.equal(existsSync(marker), true, stopErr);
  assert.match(stopErr, /异常，已放行/);
  const promptChild = spawn(process.execPath, [routeGuard], {
    cwd: root,
    env: hookEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const promptExit = once(promptChild, 'exit');
  promptChild.stdin.end(JSON.stringify({
    session_id: sessionId,
    turn_id: 'native-after-peripheral-eof',
    prompt: '纠正：外围异常放行也必须等 Stop 退出',
  }));
  await new Promise(resolveWait => setTimeout(resolveWait, 200));
  assert.equal(readActiveCorrectionTicket({ root, sessionId }), null);
  const [stopCode, stopSignal] = await stopExit;
  assert.equal(stopSignal, null);
  assert.equal(stopCode, 0, stopErr);
  const [promptCode, promptSignal] = await promptExit;
  assert.equal(promptSignal, null);
  assert.equal(promptCode, 0);
  assert.equal(readActiveCorrectionTicket({ root, sessionId }).ticket.event_id, 'native-after-peripheral-eof');
}

// Integration boundary: pause the actual Stop hook after it requests exit.
// UserPromptSubmit must remain blocked until the Stop process really dies,
// even though the verified-allow diagnostic was already emitted.
{
  const completed = closeLevel('NONE', false);
  const root = completed.root;
  const sessionId = completed.issued.sessionId;
  const exitMarker = join(root, 'stop-exit-requested');
  const preload = write(root, 'delay-process-exit.mjs', [
    `import { writeFileSync } from 'fs';`,
    `const originalExit = process.exit.bind(process);`,
    `process.exit = code => {`,
    `  writeFileSync(process.env.STOP_EXIT_MARKER, 'requested\\n');`,
    `  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 600);`,
    `  originalExit(code);`,
    `};`,
    '',
  ].join('\n'));
  const hookEnv = {
    ...process.env,
    CLAUDE_PROJECT_DIR: root,
    LUCA_GSTACK_ROOT: root,
    LUCA_PROJECTS_ROOT: join(root, 'projects'),
    ROUTE_GUARD_PROJECTS: '',
    ROUTE_GUARD_CURRENT_PROJECT: '',
  };
  const stopChild = spawn(process.execPath, ['--import', pathToFileURL(preload).href, sessionSync], {
    cwd: root,
    env: { ...hookEnv, STOP_EXIT_MARKER: exitMarker },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stopExit = once(stopChild, 'exit');
  let stopOut = '';
  let stopErr = '';
  stopChild.stdout.setEncoding('utf8');
  stopChild.stderr.setEncoding('utf8');
  stopChild.stdout.on('data', chunk => { stopOut += chunk; });
  stopChild.stderr.on('data', chunk => { stopErr += chunk; });
  stopChild.stdin.end(JSON.stringify({ session_id: sessionId, stop_hook_active: true }));
  for (let attempt = 0; attempt < 100 && !existsSync(exitMarker); attempt += 1) {
    await new Promise(resolveWait => setTimeout(resolveWait, 10));
  }
  assert.equal(existsSync(exitMarker), true, stopErr);
  assert.match(stopErr, /correction receipt 已验证/);

  const promptChild = spawn(process.execPath, [routeGuard], {
    cwd: root,
    env: hookEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const promptExit = once(promptChild, 'exit');
  let promptOut = '';
  let promptErr = '';
  promptChild.stdout.setEncoding('utf8');
  promptChild.stderr.setEncoding('utf8');
  promptChild.stdout.on('data', chunk => { promptOut += chunk; });
  promptChild.stderr.on('data', chunk => { promptErr += chunk; });
  promptChild.stdin.end(JSON.stringify({
    session_id: sessionId,
    turn_id: 'native-after-stop-eof',
    prompt: '纠正：真实 Stop 必须退出后才能签发',
  }));
  await new Promise(resolveWait => setTimeout(resolveWait, 200));
  assert.equal(readActiveCorrectionTicket({ root, sessionId }), null);
  const [stopCode, stopSignal] = await stopExit;
  assert.equal(stopSignal, null);
  assert.equal(stopCode, 0, stopErr);
  assert.equal(stopOut, '');
  const [promptCode, promptSignal] = await promptExit;
  assert.equal(promptSignal, null);
  assert.equal(promptCode, 0, promptErr || promptOut);
  assert.equal(readActiveCorrectionTicket({ root, sessionId }).ticket.event_id, 'native-after-stop-eof');
}

// The native UserPromptSubmit seam must bind the latest explicit correction,
// not merely the first prompt seen in the session.
{
  const root = rootFixture();
  const sessionId = 'hook-explicit-supersession';
  runHook(routeGuard, root, {
    session_id: sessionId,
    turn_id: 'native-ordinary-a',
    prompt: '普通问题：今天的状态是什么？',
  });
  const ordinary = readActiveCorrectionTicket({ root, sessionId });
  const explicitPrompt = '纠正：你刚才路由错了，以后必须命中 quick-research';
  runHook(routeGuard, root, {
    session_id: sessionId,
    turn_id: 'native-correction-b',
    prompt: explicitPrompt,
  });
  const corrective = readActiveCorrectionTicket({ root, sessionId });
  assert.notEqual(corrective.ticket.ticket_id, ordinary.ticket.ticket_id);
  assert.equal(corrective.ticket.event_id, 'native-correction-b');
  assert.equal(corrective.ticket.prompt_sha256, hashCorrectionPrompt(explicitPrompt));
  assert.equal(corrective.ticket.prompt_signal, 'EXPLICIT_CORRECTION');
  assert.throws(
    () => buildCorrectionCloseRequest({
      ticket: corrective.ticket,
      attributionLevel: 'NONE',
      routeCorrection: false,
      evidence: [],
    }),
    /explicit correction cannot close as NONE/,
  );
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

// An in-flight or crashed transition is a fail-closed boundary: it can never
// expose the previous completion after the new active ticket is consumed.
{
  const completed = closeLevel('NONE', false);
  const sessionId = completed.issued.sessionId;
  const next = issueCorrectionTicket({
    root: completed.root,
    sessionId,
    eventId: 'event-close-window-b',
    prompt: '普通后续任务 B',
    now: new Date(Date.now() - 1_000).toISOString(),
  });
  const state = join(completed.root, '.claude', 'correction-state', sessionId);
  mkdirSync(join(state, '.transition.lock'));
  renameSync(
    join(state, 'active-ticket.json'),
    join(state, 'consumed', `${next.ticket.ticket_id}.json`),
  );
  assert.throws(
    () => readCurrentCorrectionReceipt({ root: completed.root, sessionId }),
    /transition|closing/,
  );
}

// Every durable close boundary resumes idempotently, while the prior
// completion stays non-releasable throughout the interrupted transaction.
for (const fault of ['after-receipt', 'after-consume', 'after-completion']) {
  const completed = closeLevel('NONE', false);
  const sessionId = completed.issued.sessionId;
  const ticketB = issueCorrectionTicket({
    root: completed.root,
    sessionId,
    eventId: `event-${fault}`,
    prompt: `普通后续任务 ${fault}`,
    now: new Date(Date.now() - 1_000).toISOString(),
  });
  const evidence = evidenceFor(completed.root, ticketB.ticket, 'L1', false);
  const request = buildCorrectionCloseRequest({
    ticket: ticketB.ticket,
    attributionLevel: 'L1',
    routeCorrection: false,
    evidence,
  });
  recordCorrectionEvidence({ root: completed.root, request });
  process.env.CORRECTION_CLOSE_FAULT = fault;
  try {
    assert.throws(
      () => closeCorrectionTicket({
        root: completed.root,
        request,
        baselineCounts: { edit: 8, tool: 13 },
      }),
      new RegExp(`injected correction close fault ${fault.replace('-', ' ')}`),
    );
  } finally {
    delete process.env.CORRECTION_CLOSE_FAULT;
  }
  assert.throws(
    () => readCurrentCorrectionReceipt({ root: completed.root, sessionId }),
    /active correction ticket|closing transaction|transition/,
  );
  const resumed = closeCorrectionTicket({
    root: completed.root,
    request,
    baselineCounts: { edit: 9, tool: 14 },
  });
  assert.deepEqual(resumed.receipt.baseline_counts, { edit: 8, tool: 13 });
  assert.equal(resumed.receipt.ticket_id, ticketB.ticket.ticket_id);
  assert.equal(readCurrentCorrectionReceipt({ root: completed.root, sessionId }).receipt.receipt_id, resumed.receipt.receipt_id);
}

// Direct-final JSON writes are forbidden for durable ticket state. A crash
// may leave a private staging inode, a zero-byte reservation, or a complete final;
// every target below must recover without accepting truncated final JSON.
for (const phase of ['after-staging', 'after-reserve', 'after-publish']) {
  {
    const root = rootFixture();
    const issued = issue(root, `binding-${phase}`);
    const request = buildCorrectionCloseRequest({
      ticket: issued.record.ticket,
      attributionLevel: 'L1',
      routeCorrection: false,
      evidence: evidenceFor(root, issued.record.ticket, 'L1', false),
    });
    process.env.CORRECTION_PUBLICATION_FAULT = `evidence-binding:${phase}`;
    try {
      assert.throws(() => recordCorrectionEvidence({ root, request }), new RegExp(`publication fault ${phase.replace('-', ' ')}`));
    } finally {
      delete process.env.CORRECTION_PUBLICATION_FAULT;
    }
    recordCorrectionEvidence({ root, request });
    closeCorrectionTicket({ root, request, baselineCounts: { edit: 1, tool: 2 } });
    assert.ok(readCurrentCorrectionReceipt({ root, sessionId: issued.sessionId }));
  }

  for (const target of ['closing-journal', 'correction-receipt']) {
    const root = rootFixture();
    const issued = issue(root, `${target === 'correction-receipt' ? 'receipt' : 'journal'}-${phase}`);
    const request = buildCorrectionCloseRequest({
      ticket: issued.record.ticket,
      attributionLevel: 'NONE',
      routeCorrection: false,
      evidence: [],
    });
    process.env.CORRECTION_PUBLICATION_FAULT = `${target}:${phase}`;
    try {
      assert.throws(
        () => closeCorrectionTicket({ root, request, baselineCounts: { edit: 2, tool: 4 } }),
        new RegExp(`publication fault ${phase.replace('-', ' ')}`),
      );
    } finally {
      delete process.env.CORRECTION_PUBLICATION_FAULT;
    }
    const resumed = closeCorrectionTicket({ root, request, baselineCounts: { edit: 3, tool: 5 } });
    assert.deepEqual(resumed.receipt.baseline_counts, { edit: 2, tool: 4 });
  }
}
console.log('PASS crash-safe durable publication for binding/journal/receipt');

// Cross-process proof: recovery metadata—not process memory—must be enough
// after a real child exits at each durable publication boundary.
for (const phase of ['after-staging', 'after-reserve', 'after-publish']) {
  {
    const root = rootFixture();
    const issued = issue(root, `cross-binding-${phase}`);
    const request = buildCorrectionCloseRequest({
      ticket: issued.record.ticket,
      attributionLevel: 'L1',
      routeCorrection: false,
      evidence: evidenceFor(root, issued.record.ticket, 'L1', false),
    });
    const requestPath = write(root, 'cross-binding-request.json', `${JSON.stringify(request, null, 2)}\n`);
    const interrupted = spawnSync('node', [closeScript, 'record', '--request', requestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, LUCA_GSTACK_ROOT: root, CORRECTION_PUBLICATION_CRASH: `evidence-binding:${phase}` },
    });
    assert.equal(interrupted.status, null);
    assert.equal(interrupted.signal, 'SIGKILL');
    recoverDeadTransition(root, issued.sessionId);
    const resumed = spawnSync('node', [closeScript, 'record', '--request', requestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, LUCA_GSTACK_ROOT: root },
    });
    assert.equal(resumed.status, 0, resumed.stderr);
    const closed = spawnSync('node', [closeScript, 'close', '--request', requestPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, LUCA_GSTACK_ROOT: root },
    });
    assert.equal(closed.status, 0, closed.stderr);
  }

  for (const target of ['closing-journal', 'correction-receipt']) {
    const root = rootFixture();
    const issued = issue(root, `cross-${target === 'correction-receipt' ? 'receipt' : 'journal'}-${phase}`);
    write(root, `.claude/.session-edit-count-${issued.sessionId}`, '2');
    write(root, `.claude/.session-tool-count-${issued.sessionId}`, '4');
    const interrupted = spawnSync('node', [closeScript, 'close', '--session', issued.sessionId, '--level', 'NONE'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, LUCA_GSTACK_ROOT: root, CORRECTION_PUBLICATION_CRASH: `${target}:${phase}` },
    });
    assert.equal(interrupted.status, null);
    assert.equal(interrupted.signal, 'SIGKILL');
    recoverDeadTransition(root, issued.sessionId);
    write(root, `.claude/.session-edit-count-${issued.sessionId}`, '3');
    write(root, `.claude/.session-tool-count-${issued.sessionId}`, '5');
    const resumed = spawnSync('node', [closeScript, 'close', '--session', issued.sessionId, '--level', 'NONE'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, LUCA_GSTACK_ROOT: root },
    });
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.deepEqual(readCurrentCorrectionReceipt({ root, sessionId: issued.sessionId }).receipt.baseline_counts, { edit: 2, tool: 4 });
  }
}
console.log('PASS fresh-process durable publication recovery');

// A forged publication-shaped hardlink and matching sidecar never gain the
// creator process's in-memory ownership capability and remain fail-closed.
{
  const root = rootFixture();
  const issued = issue(root, 'forged-publication');
  const activePath = join(root, '.claude', 'correction-state', issued.sessionId, 'active-ticket.json');
  const stagingPath = `${activePath}.publish-99999999-${randomUUID()}`;
  const markerPath = `${activePath}.publish-recovery`;
  linkSync(activePath, stagingPath);
  writeFileSync(markerPath, `${JSON.stringify({
    schema_version: 1,
    final_path: activePath,
    staging_path: stagingPath,
    content_sha256: sha256(readFileSync(stagingPath)),
  }, null, 2)}\n`);
  assert.throws(
    () => readActiveCorrectionTicket({ root, sessionId: issued.sessionId }),
    /exactly 1 link|non-hardlink/,
  );
  assert.equal(existsSync(stagingPath), true);
  assert.equal(lstatSync(activePath).nlink, 2);
}

// A reused live PID is not accepted as the old publication owner: process
// start identity, not PID alone, determines whether stale lock recovery is safe.
{
  const root = rootFixture();
  const issued = issue(root, 'publication-pid-reuse');
  const activePath = join(root, '.claude', 'correction-state', issued.sessionId, 'active-ticket.json');
  const owner = {
    schema_version: 1,
    pid: process.pid,
    process_nonce: randomUUID(),
    process_start_sha256: '0'.repeat(64),
    acquired_at: new Date().toISOString(),
  };
  const target = `correction-publication-lock-v1.${Buffer.from(JSON.stringify(owner), 'utf8').toString('base64url')}`;
  const lockPath = `${activePath}.publish-lock`;
  symlinkSync(target, lockPath);
  assert.equal(readActiveCorrectionTicket({ root, sessionId: issued.sessionId }).ticket.ticket_id, issued.record.ticket.ticket_id);
  assert.equal(existsSync(lockPath), false);
}

// A crash-owned transition lock is fail-closed and recoverable only with its
// exact owner handle after the owner process is proven dead.
{
  const completed = closeLevel('NONE', false);
  const sessionId = completed.issued.sessionId;
  const state = join(completed.root, '.claude', 'correction-state', sessionId);
  const dead = spawn(process.execPath, ['-e', `process.stdout.write('READY\\n'); setInterval(() => {}, 1000);`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let deadOut = '';
  dead.stdout.setEncoding('utf8');
  dead.stdout.on('data', chunk => { deadOut += chunk; });
  while (!deadOut.includes('READY\n')) await once(dead.stdout, 'data');
  const deadStartSha256 = processStartSha256(dead.pid);
  dead.kill('SIGTERM');
  const [deadCode, deadSignal] = await once(dead, 'exit');
  assert.equal(deadCode, null);
  assert.equal(deadSignal, 'SIGTERM');
  const owner = {
    schema_version: 1,
    owner_token: randomUUID(),
    pid: dead.pid,
    process_nonce: randomUUID(),
    process_start_sha256: deadStartSha256,
    acquired_at: new Date().toISOString(),
  };
  writeFileSync(join(state, '.transition.lock'), `${JSON.stringify(owner, null, 2)}\n`);
  const inspected = inspectCorrectionTransitionLock({ root: completed.root, sessionId });
  assert.equal(inspected.occupied, true);
  assert.equal(inspected.owner_alive, false);
  assert.throws(
    () => issueCorrectionTicket({
      root: completed.root,
      sessionId,
      eventId: 'event-explicit-after-crash',
      prompt: '纠正：以后不要再忽略显式事件',
    }),
    /exact recovery required/,
  );
  assert.throws(
    () => readCurrentCorrectionReceipt({ root: completed.root, sessionId }),
    /transition is in progress/,
  );
  assert.equal(recoverCorrectionTransitionLock({
    root: completed.root,
    sessionId,
    ownerHandle: inspected.owner_handle,
  }).recovered, true);
  const explicit = issueCorrectionTicket({
    root: completed.root,
    sessionId,
    eventId: 'event-explicit-after-crash',
    prompt: '纠正：以后不要再忽略显式事件',
  });
  assert.equal(explicit.ticket.prompt_signal, 'EXPLICIT_CORRECTION');
  assert.throws(
    () => readCurrentCorrectionReceipt({ root: completed.root, sessionId }),
    /active correction ticket supersedes prior completion/,
  );
}

// PID reuse cannot make a dead transition owner look live. Exact recovery
// compares process-start identity in addition to the numeric PID.
{
  const completed = closeLevel('NONE', false);
  const sessionId = completed.issued.sessionId;
  const state = join(completed.root, '.claude', 'correction-state', sessionId);
  const owner = {
    schema_version: 1,
    owner_token: randomUUID(),
    pid: process.pid,
    process_nonce: randomUUID(),
    process_start_sha256: '0'.repeat(64),
    acquired_at: new Date().toISOString(),
  };
  writeFileSync(join(state, '.transition.lock'), `${JSON.stringify(owner, null, 2)}\n`);
  const inspected = inspectCorrectionTransitionLock({ root: completed.root, sessionId });
  assert.equal(inspected.occupied, true);
  assert.equal(inspected.owner_alive, false);
  assert.equal(recoverCorrectionTransitionLock({
    root: completed.root,
    sessionId,
    ownerHandle: inspected.owner_handle,
  }).recovered, true);
}

// Lock inspection/recovery validates every state parent first and cannot
// follow a replaced session directory to rename an external lock.
{
  const completed = closeLevel('NONE', false);
  const sessionId = completed.issued.sessionId;
  const stateRoot = join(completed.root, '.claude', 'correction-state');
  const sessionRoot = join(stateRoot, sessionId);
  const parked = join(stateRoot, `${sessionId}-outside`);
  renameSync(sessionRoot, parked);
  symlinkSync(parked, sessionRoot);
  assert.throws(
    () => inspectCorrectionTransitionLock({ root: completed.root, sessionId }),
    /not a real directory/,
  );
  assert.throws(
    () => recoverCorrectionTransitionLock({
      root: completed.root,
      sessionId,
      ownerHandle: { path: join(sessionRoot, '.transition.lock'), owner: {}, raw_sha256: '0'.repeat(64) },
    }),
    /not a real directory/,
  );
  unlinkSync(sessionRoot);
  renameSync(parked, sessionRoot);
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
    evidence: evidenceFor(root, active.ticket, 'L1', false),
  });
  recordCorrectionEvidence({ root, request });
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
