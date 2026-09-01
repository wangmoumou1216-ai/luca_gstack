#!/usr/bin/env node
// Route probe rig: feed prompts to route-guard in dry-run, capture decisions.
// Usage: node probe.mjs <corpus.tsv> [--root <CLAUDE_PROJECT_DIR>]
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';

const args = process.argv.slice(2);
const corpusPath = args[0];
const rootIdx = args.indexOf('--root');
const REPO = '/Users/luca/Desktop/项目/muse/lucagstack';
const root = rootIdx >= 0 ? args[rootIdx + 1] : REPO;
const guard = process.env.PROBE_GUARD || `${REPO}/.claude/hooks/route-guard.mjs`;

const rows = readFileSync(corpusPath, 'utf8').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  .map(l => { const [id, expect, prompt] = l.split('\t'); return { id, expect, prompt }; });

const out = [];
for (const r of rows) {
  let d;
  try {
    const stdout = execFileSync('node', [guard, '--dry-run'], {
      input: JSON.stringify({ prompt: r.prompt }),
      env: { ...process.env, ROUTE_GUARD_DRY_RUN: '1', CLAUDE_PROJECT_DIR: root },
      encoding: 'utf8', timeout: 20000,
    });
    d = JSON.parse(stdout);
  } catch (e) {
    d = { decision: 'RIG_ERROR', message: String(e.message).slice(0, 200) };
  }
  const target = d.skill || d.flow || (d.candidates ? d.candidates.join('|') : '') || d.project || '';
  const soft = (d.softCandidates || []).map(c => c.skill || c.invoke || '').join('|');
  out.push({ id: r.id, expect: r.expect, prompt: r.prompt, decision: d.decision, target,
             score: d.complexityScore ?? '', soft, projectAction: d.projectAction || '' });
}
console.log(JSON.stringify(out, null, 2));
