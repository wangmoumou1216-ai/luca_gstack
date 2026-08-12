import { createHash } from 'crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { spawnSync } from 'child_process';
import { withoutLocalGitEnv } from './git-env.mjs';

export const CORRECTION_VERIFIER_REGISTRY_VERSION = 'correction-verifiers-v1';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function claimHash(value) {
  return sha256(Buffer.from(stable(value), 'utf8'));
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} keys must be exactly: ${wanted.join(', ')}`);
  }
}

function observedAt(value, label) {
  if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be an ISO date-time`);
  return new Date(value).toISOString();
}

function earliestObservedAt(values) {
  return new Date(Math.min(...values.map(value => Date.parse(value)))).toISOString();
}

function regularFile(rawPath, root) {
  if (typeof rawPath !== 'string' || !rawPath || rawPath.includes('\0')) throw new Error('evidence path is invalid');
  const absolute = isAbsolute(rawPath) ? resolve(rawPath) : resolve(root, rawPath);
  const lst = lstatSync(absolute);
  if (lst.isSymbolicLink() || !lst.isFile()) throw new Error(`evidence must be a regular non-symlink file: ${rawPath}`);
  if (lst.nlink !== 1) throw new Error(`evidence must not be a hardlink: ${rawPath}`);
  const real = realpathSync(absolute);
  const st = statSync(real);
  if (!st.isFile()) throw new Error(`evidence target is not a regular file: ${rawPath}`);
  const bytes = readFileSync(real);
  return { path: real, bytes, sha256: sha256(bytes), observed_at: lst.mtime.toISOString() };
}

function artifact(file) {
  return { path: file.path, sha256: file.sha256 };
}

function jsonLines(file) {
  const records = [];
  for (const raw of file.bytes.toString('utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    let parsed;
    try { parsed = JSON.parse(line); } catch { throw new Error(`invalid JSONL evidence: ${file.path}`); }
    records.push(parsed);
  }
  return records;
}

function disclosure(entry, context) {
  const file = regularFile(entry.path, context.root);
  if (entry.selector !== '') throw new Error('DISCLOSURE selector must be empty');
  const text = file.bytes.toString('utf8').trim();
  if (!text || text.includes('\n') || Buffer.byteLength(text, 'utf8') > 500) {
    throw new Error('disclosure must be one non-empty line of at most 500 bytes');
  }
  if (!text.includes('归因') || !new RegExp(`(?:^|[^A-Z0-9])${context.attributionLevel}(?:[^0-9]|$)`).test(text)) {
    throw new Error(`disclosure must name attribution ${context.attributionLevel}`);
  }
  return { artifacts: [artifact(file)], observed_at: file.observed_at, claim_sha256: claimHash({ attribution: context.attributionLevel, text }) };
}

function affectedArtifact(entry, context) {
  if (entry.selector !== '') throw new Error('AFFECTED_ARTIFACT selector must be empty');
  const file = regularFile(entry.path, context.root);
  return { artifacts: [artifact(file)], observed_at: file.observed_at, claim_sha256: claimHash({ path: file.path, sha256: file.sha256 }) };
}

function observationRule(entry, context) {
  if (!/^O-\d{8}-\d{3,}$/.test(entry.selector)) throw new Error('observation selector must be an O-* id');
  const observations = regularFile(entry.path, context.root);
  const record = jsonLines(observations).find(item => item?.id === entry.selector);
  if (!record || typeof record.skill !== 'string' || !record.skill || typeof record.message !== 'string' || !record.message) {
    throw new Error(`observation not found or incomplete: ${entry.selector}`);
  }
  const recordTime = observedAt(record.time, 'observation time');
  const rules = regularFile(resolve(dirname(observations.path), 'rules.yaml'), context.root);
  const blocks = rules.bytes.toString('utf8').split(/(?=^- id:\s*R-)/m);
  const ruleBlock = blocks.find(block => (
    /^\s*- id:\s*R-[^\n]+/m.test(block)
    && /^\s+rule:\s*\S.+$/m.test(block)
    && block.split(/\r?\n/).some(line => line.trim() === `- ${entry.selector}`)
  ));
  if (!ruleBlock) throw new Error(`active rule for observation not found: ${entry.selector}`);
  return {
    artifacts: [artifact(observations), artifact(rules)],
    observed_at: earliestObservedAt([recordTime, rules.observed_at]),
    claim_sha256: claimHash({ observation: record, rule_block: ruleBlock.trim() }),
  };
}

function semanticCandidate(entry, context) {
  if (!/^SC-\d{8}-\d{3,}$/.test(entry.selector)) throw new Error('candidate selector must be an SC-* id');
  const candidates = regularFile(entry.path, context.root);
  const record = jsonLines(candidates).find(item => item?.id === entry.selector);
  if (!record || record.status !== 'CANDIDATE' || typeof record.fact !== 'string' || !record.fact || typeof record.domain !== 'string') {
    throw new Error(`semantic candidate not found or incomplete: ${entry.selector}`);
  }
  return { artifacts: [artifact(candidates)], observed_at: observedAt(record.created_at, 'semantic candidate created_at'), claim_sha256: claimHash(record) };
}

function fixOrTaskPointer(entry, context) {
  if (entry.selector !== '') throw new Error('FIX_OR_TASK_POINTER selector must be empty');
  const pointer = regularFile(entry.path, context.root);
  let record;
  try { record = JSON.parse(pointer.bytes.toString('utf8')); } catch { throw new Error('fix/task pointer must be JSON'); }
  exactKeys(record, ['schema_version', 'pointer_type', 'target', 'target_sha256'], 'fix/task pointer');
  if (record.schema_version !== 'correction-fix-pointer-v1') throw new Error('wrong fix/task pointer schema_version');
  if (!['artifact', 'task', 'git_commit'].includes(record.pointer_type)) throw new Error('wrong fix/task pointer_type');
  if (typeof record.target !== 'string' || !record.target) throw new Error('fix/task pointer target is required');
  if (!/^[a-f0-9]{40,64}$/.test(record.target_sha256)) throw new Error('fix/task pointer target_sha256 is invalid');

  const artifacts = [artifact(pointer)];
  if (record.pointer_type === 'git_commit') {
    const repo = isAbsolute(record.target) ? resolve(record.target) : resolve(dirname(pointer.path), record.target);
    const lst = lstatSync(repo);
    if (lst.isSymbolicLink() || !lst.isDirectory()) throw new Error('git pointer target must be a non-symlink directory');
    const realRepo = realpathSync(repo);
    const check = spawnSync('git', ['-C', realRepo, 'cat-file', '-e', `${record.target_sha256}^{commit}`], {
      encoding: 'utf8', env: withoutLocalGitEnv(), stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (check.status !== 0) throw new Error('git pointer commit is not reachable in target repository');
  } else {
    const targetPath = isAbsolute(record.target) ? resolve(record.target) : resolve(dirname(pointer.path), record.target);
    const target = regularFile(targetPath, context.root);
    if (target.sha256 !== record.target_sha256) throw new Error('fix/task pointer target hash mismatch');
    artifacts.push(artifact(target));
  }
  return { artifacts, observed_at: pointer.observed_at, claim_sha256: claimHash(record) };
}

function routingFixture(entry, context) {
  if (!entry.selector) throw new Error('routing fixture selector is required');
  const fixtures = regularFile(entry.path, context.root);
  const record = jsonLines(fixtures).find(item => item?.id === entry.selector);
  if (!record || typeof record.input !== 'string' || !record.input || typeof record.expected !== 'string' || !record.expected || !['keyword', 'semantic'].includes(record.layer)) {
    throw new Error(`routing fixture not found or incomplete: ${entry.selector}`);
  }
  return { artifacts: [artifact(fixtures)], observed_at: fixtures.observed_at, claim_sha256: claimHash(record) };
}

export const CORRECTION_VERIFIER_REGISTRY = Object.freeze({
  DISCLOSURE_LINE_V1: Object.freeze({ kind: 'DISCLOSURE', verify: disclosure }),
  REGULAR_FILE_SHA256_V1: Object.freeze({ kind: 'AFFECTED_ARTIFACT', verify: affectedArtifact }),
  OBSERVATION_RULE_JSONL_V1: Object.freeze({ kind: 'OBSERVATION_RULE', verify: observationRule }),
  SEMANTIC_CANDIDATE_JSONL_V1: Object.freeze({ kind: 'SEMANTIC_CANDIDATE', verify: semanticCandidate }),
  FIX_OR_TASK_POINTER_V1: Object.freeze({ kind: 'FIX_OR_TASK_POINTER', verify: fixOrTaskPointer }),
  ROUTING_FIXTURE_JSONL_V1: Object.freeze({ kind: 'ROUTING_FIXTURE', verify: routingFixture }),
});

export function verifyCorrectionEvidence(entry, context) {
  exactKeys(entry, ['kind', 'verifier', 'path', 'selector'], 'evidence entry');
  if (typeof entry.kind !== 'string' || typeof entry.verifier !== 'string') throw new Error('evidence kind/verifier must be strings');
  if (typeof entry.path !== 'string' || typeof entry.selector !== 'string') throw new Error('evidence path/selector must be strings');
  const registered = CORRECTION_VERIFIER_REGISTRY[entry.verifier];
  if (!registered || typeof registered.verify !== 'function') throw new Error(`unknown fixed verifier enum: ${entry.verifier}`);
  if (registered.kind !== entry.kind) throw new Error(`verifier ${entry.verifier} cannot verify ${entry.kind}`);
  const result = registered.verify(entry, context);
  return { ...entry, observed_at: result.observed_at, claim_sha256: result.claim_sha256, artifacts: result.artifacts };
}
