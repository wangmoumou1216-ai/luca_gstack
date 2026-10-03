#!/usr/bin/env node
// Provenance only: source snapshots come from the caller, never from child-supplied paths.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, expected) => record(v) && Object.keys(v).length === expected.length
  && expected.every(k => Object.hasOwn(v, k));
const id = v => typeof v === 'string' && v.length > 0 && v.length <= 128 && v.trim() === v;
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const reject = (code, questionId = null) => ({provenance_status: 'FAIL', code,
  question_id: questionId, content_accepted: false, requires_anchor_review: true});

function validate(request, candidate) {
  if (!keys(request, ['version', 'request_id', 'questions', 'sources']) || request.version !== 1
      || !id(request.request_id) || !Array.isArray(request.questions) || !request.questions.length
      || request.questions.length > 64 || !Array.isArray(request.sources)
      || !request.sources.length || request.sources.length > 16) return reject('INVALID_REQUEST');
  const questions = new Map(), sources = new Map();
  let sourceLength = 0;
  for (const q of request.questions) {
    if (!keys(q, ['id', 'question']) || !id(q.id) || questions.has(q.id)
        || typeof q.question !== 'string' || !q.question.trim() || q.question.length > 8192) {
      return reject('INVALID_REQUEST_QUESTION');
    }
    questions.set(q.id, q.question);
  }
  for (const s of request.sources) {
    if (!keys(s, ['id', 'text']) || !id(s.id) || sources.has(s.id)
        || typeof s.text !== 'string' || s.text.length > 262144) return reject('INVALID_REQUEST_SOURCE');
    sourceLength += s.text.length;
    if (sourceLength > 1048576) return reject('REQUEST_TOO_LARGE');
    sources.set(s.id, {text: s.text.replaceAll('\r\n', '\n'), sha256: digest(s.text)});
  }
  if (!keys(candidate, ['version', 'request_id', 'answers']) || candidate.version !== 1
      || !Array.isArray(candidate.answers)) return reject('INVALID_CANDIDATE');
  if (candidate.request_id !== request.request_id) return reject('REQUEST_MISMATCH');
  if (candidate.answers.length !== questions.size) return reject('QUESTION_COVERAGE_MISMATCH');
  const seen = new Set(), verified = [];
  for (const answer of candidate.answers) {
    if (!keys(answer, ['question_id', 'excerpts']) || !questions.has(answer.question_id)
        || seen.has(answer.question_id) || !Array.isArray(answer.excerpts)
        || answer.excerpts.length > 64) return reject('INVALID_ANSWER');
    seen.add(answer.question_id);
    const excerpts = [];
    for (const e of answer.excerpts) {
      if (!keys(e, ['source_id', 'quote']) || typeof e.quote !== 'string' || !e.quote.trim()) {
        return reject('INVALID_EXCERPT', answer.question_id);
      }
      const source = sources.get(e.source_id);
      if (!source) return reject('UNKNOWN_SOURCE', answer.question_id);
      const positions = [];
      for (let at = source.text.indexOf(e.quote); at !== -1; at = source.text.indexOf(e.quote, at + 1)) {
        const end = at + e.quote.length;
        if ((at === 0 || source.text[at - 1] === '\n')
            && (end === source.text.length || source.text[end] === '\n')) positions.push(at);
        if (positions.length > 1) return reject('AMBIGUOUS_QUOTE', answer.question_id);
      }
      if (!positions.length) return reject('QUOTE_MISMATCH', answer.question_id);
      const start = positions[0], lineStart = source.text.slice(0, start).split('\n').length;
      const quote = source.text.slice(start, start + e.quote.length);
      // The program locates a unique full-line quote; models do not count source lines.
      excerpts.push({source_id: e.source_id, source_sha256: source.sha256,
        line_start: lineStart, line_end: lineStart + quote.split('\n').length - 1, quote});
    }
    verified.push({question_id: answer.question_id, excerpts});
  }
  return {provenance_status: 'PASS', request_id: request.request_id,
    request_sha256: digest(request), candidate_sha256: digest(candidate),
    content_accepted: false, requires_anchor_review: true,
    gaps: verified.filter(q => !q.excerpts.length).map(q => q.question_id), answers: verified};
}

export function verifyFactCandidates(request, candidate) {
  const result = validate(request, candidate);
  // Parsed JSON inputs remain identifiable even when their provenance fails.
  return {...result,
    ...(request === undefined ? {} : {request_sha256: digest(request)}),
    ...(candidate === undefined ? {} : {candidate_sha256: digest(candidate)})};
}

function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/verify-fact-candidates.mjs --request REQUEST.json --candidate CANDIDATE.json\n'
      + 'Or send {"request":...,"candidate":...} as JSON on stdin. Exit 0 verifies provenance only; exit 1 rejects; exit 2 is invalid input/I/O.\n'
      + 'Request: {version:1,request_id,questions:[{id,question}],sources:[{id,text}]}\n'
      + 'Candidate: {version:1,request_id,answers:[{question_id,excerpts:[{source_id,quote}]}]}\n'
      + 'Caller supplies authorized source snapshots. Unique full-line quotes receive computed 1-based line numbers; CRLF becomes LF. Empty excerpts preserve a gap.\n'
      + 'Anchor must still check relevance, completeness, conflicts and any interpretation before use.');
    return;
  }
  const read = file => {
    const bytes = readFileSync(file);
    if (bytes.length > 4194304) throw new Error('INPUT_TOO_LARGE');
    return JSON.parse(bytes.toString('utf8'));
  };
  try {
    let request, candidate;
    if (!args.length) {
      const input = read(0);
      if (!keys(input, ['request', 'candidate'])) throw new Error('INVALID_INPUT');
      ({request, candidate} = input);
    } else if (args.length === 4 && args[0] === '--request' && args[2] === '--candidate') {
      request = read(args[1]);
      candidate = read(args[3]);
    } else throw new Error('INVALID_ARGUMENTS');
    const result = verifyFactCandidates(request, candidate);
    console.log(JSON.stringify(result));
    process.exitCode = result.provenance_status === 'PASS' ? 0 : 1;
  } catch {
    console.log(JSON.stringify(reject('INPUT_ERROR')));
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
