// Diagnostic only: execute the real workflow bodies with controlled agent returns.
// No network, models, project access, bookkeeping, or production mutations.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root = resolve(process.argv[2] || '.');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const load = {sources: [{id: 'S1', authority_tier: 'official', discovery: {}, reuse_mode: ['install'], feeds_dimensions: ['x']}], gaps: [{id: 'G1', dimension: 'x', severity: 'high'}], existing_names: [], existing_repos: []};
const candidate = repo => ({name: repo.split('/')[1], repo, url: `https://github.com/${repo}`, dimension: 'x', gap_id: 'G1', reuse_mode: 'install', source_id: 'S1', one_line_value: 'fixture', fit_score: 3});
const verdict = {scores: {fit: 3, quality: 3, adoption: 3, maintenance: 3}, hard: {safety: 'PASS', compatibility: 'PASS', non_redundancy: 'PASS', gap_addressed: 'PASS', provenance: 'PASS'}, evidence: {stars: 10, last_commit: '2026-10-01', license: 'MIT', verified_at: '2026-10-09', source_url: 'fixture'}, supply_chain: {pinned_sha: 'a'.repeat(40), egress: 'none'}, why_useful: 'fixture', how_to_reuse: 'fixture'};
async function run(name, args, changes = {}) {
  const source = readFileSync(resolve(root, `.claude/workflows/${name}.js`), 'utf8').replace('export const meta', 'const meta');
  const calls = [];
  const output = await new AsyncFunction('args', 'agent', 'phase', 'parallel', 'log', source)(args, async (prompt, options) => {
    calls.push(options.label);
    if (Object.hasOwn(changes, options.label)) return changes[options.label];
    if (options.phase === 'Load') return name === 'external-skill-scout' ? {existing_names: ['fixture']} : load;
    if (options.phase === 'AdoptionReview') return {entries: [], review_notes: 'fixture'};
    if (options.phase === 'Discover') return {candidates: [candidate('owner/one')], channel_notes: 'fixture'};
    if (options.phase === 'Intake') return {candidates: [candidate(options.label.slice(7))], channel_notes: 'fixture'};
    if (options.phase === 'Verify') return verdict;
    if (options.phase === 'Redteam') return {redteam_verdict: 'stands', integration_risk: 'LOW', reason: 'fixture'};
  }, () => {}, thunks => Promise.all(thunks.map(f => f())), () => {});
  return {status: output.run_status, stats: output.stats, results: (output.results || output.approved || []).map(v => ({repo: v.repo, gap: v.gap_id, score: v.weighted_score, verdict: v.verdict})), calls};
}
const cases = [
  ['lost discovery', {}, {'disc:S1': null}],
  ['lost adoption', {}, {'adoption-review': null}],
  ['lost intake', {target_repos: ['owner/one', 'owner/two']}, {'intake:owner/two': null}],
  ['invalid redteam', {}, {'redteam:owner/one': {redteam_verdict: 'UNKNOWN', integration_risk: 'LOW', reason: 'uncertain'}}],
  ['gap drift', {target_repos: ['owner/one']}, {'verify:owner/one': {...verdict, gap_id: 'NO_SUCH_OPEN_GAP'}}],
  ['invalid scores', {}, {'verify:owner/one': {...verdict, scores: {fit: 99, quality: 99, adoption: 99, maintenance: 99}}}],
  ['empty target expands', {target_repos: ['']}, {}],
];
for (const [label, args, changes] of cases) console.log(JSON.stringify({case: label, ...await run('framework-evolution-scout', args, changes)}));
console.log(JSON.stringify({case: 'external missing verify', ...await run('external-skill-scout', {}, {'verify:owner/one': null})}));
