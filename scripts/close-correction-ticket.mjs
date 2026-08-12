#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildCorrectionCloseRequest,
  closeCorrectionTicket,
  correctionEvidenceVariants,
  inspectCorrectionTransitionLock,
  recordCorrectionEvidence,
  readActiveCorrectionTicket,
  readCorrectionTicketForClose,
  recoverCorrectionTransitionLock,
} from '../.claude/hooks/lib/correction-contract.mjs';

function fail(message) {
  process.stderr.write(`CORRECTION_CLOSE_REJECTED ${message}\n`);
  process.exit(2);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function count(root, sessionId, kind) {
  const perSession = resolve(root, '.claude', `.session-${kind}-count-${sessionId}`);
  try {
    const value = Number.parseInt(readFileSync(perSession, 'utf8'), 10);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function rootPath() {
  return resolve(process.env.LUCA_GSTACK_ROOT || process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

function active(root, sessionId) {
  if (!sessionId) fail('--session is required');
  const record = readActiveCorrectionTicket({ root, sessionId });
  if (!record) fail(`no active ticket for session ${sessionId}`);
  return record.ticket;
}

function closeCandidate(root, sessionId) {
  if (!sessionId) fail('--session is required');
  const record = readCorrectionTicketForClose({ root, sessionId });
  if (!record) fail(`no active or recoverable closing ticket for session ${sessionId}`);
  return record.ticket;
}

function placeholder(kind) {
  const verifier = {
    DISCLOSURE: 'DISCLOSURE_LINE_V1',
    AFFECTED_ARTIFACT: 'REGULAR_FILE_SHA256_V1',
    OBSERVATION_RULE: 'OBSERVATION_RULE_JSONL_V1',
    SEMANTIC_CANDIDATE: 'SEMANTIC_CANDIDATE_JSONL_V1',
    FIX_OR_TASK_POINTER: 'FIX_OR_TASK_POINTER_V1',
    ROUTING_FIXTURE: 'ROUTING_FIXTURE_JSONL_V1',
  }[kind];
  return { kind, verifier, path: '<absolute-or-repo-relative-path>', selector: '' };
}

try {
  const command = process.argv[2] || '';
  const root = rootPath();
  if (command === 'show') {
    const sessionId = option('--session');
    process.stdout.write(`${JSON.stringify(active(root, sessionId), null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'template') {
    const sessionId = option('--session');
    const level = option('--level');
    const route = process.argv.includes('--route');
    const ticket = active(root, sessionId);
    const variants = correctionEvidenceVariants(level, route);
    const templates = variants.map(evidenceKinds => buildCorrectionCloseRequest({
      ticket,
      attributionLevel: level,
      routeCorrection: route,
      evidence: evidenceKinds.map(placeholder),
    }));
    process.stdout.write(`${JSON.stringify({
      evidence_content_binding: {
        ticket: `ticket=${ticket.ticket_id}`,
        nonce: `nonce=${ticket.nonce}`,
        rule: 'Each selected evidence producer output must contain both exact binding strings.',
      },
      choose_exactly_one: templates,
    }, null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'inspect-lock') {
    const sessionId = option('--session');
    if (!sessionId) fail('--session is required');
    process.stdout.write(`${JSON.stringify(inspectCorrectionTransitionLock({ root, sessionId }), null, 2)}\n`);
    process.exit(0);
  }

  if (command === 'recover-lock') {
    const sessionId = option('--session');
    const handleFile = option('--handle-file');
    if (!sessionId || !handleFile) fail('recover-lock requires --session and --handle-file');
    const parsed = JSON.parse(readFileSync(resolve(handleFile), 'utf8'));
    const ownerHandle = parsed.owner_handle || parsed;
    const result = recoverCorrectionTransitionLock({ root, sessionId, ownerHandle });
    process.stdout.write(`CORRECTION_TRANSITION_LOCK_RECOVERED ${result.owner_handle.raw_sha256}\n`);
    process.exit(0);
  }

  if (!['record', 'close'].includes(command)) {
    fail('usage: close-correction-ticket.mjs <show|template|record|close|inspect-lock|recover-lock> ...');
  }

  let request;
  const requestPath = option('--request');
  if (requestPath) {
    request = JSON.parse(readFileSync(resolve(requestPath), 'utf8'));
  } else {
    const sessionId = option('--session');
    const level = option('--level');
    if (level !== 'NONE' || process.argv.includes('--route')) {
      fail('non-NONE closure requires --request from a reviewed template');
    }
    request = buildCorrectionCloseRequest({
      ticket: closeCandidate(root, sessionId),
      attributionLevel: 'NONE',
      routeCorrection: false,
      evidence: [],
    });
  }

  if (command === 'record') {
    if (!requestPath) fail('record requires --request from a reviewed template');
    const recorded = recordCorrectionEvidence({ root, request });
    process.stdout.write(`CORRECTION_EVIDENCE_RECORDED ${recorded.ticket.ticket_id} ${recorded.evidence.map(item => item.proof_id).join(',')}\n`);
    process.exit(0);
  }
  const result = closeCorrectionTicket({
    root,
    request,
    baselineCounts: {
      edit: count(root, request.session_id, 'edit'),
      tool: count(root, request.session_id, 'tool'),
    },
  });
  process.stdout.write(`CORRECTION_RECEIPT_CLOSED ${result.receipt.receipt_id} ${result.receipt_sha256}\n`);
} catch (error) {
  fail(String(error?.message || error));
}
