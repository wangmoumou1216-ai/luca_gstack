#!/usr/bin/env node
// Retirement gate for the former mega-appendix. It may remain as rollback evidence, but no runtime
// root or conditional manifest may make it part of the active context graph.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appendix = join(root, '.claude/skill-os/claude-md-appendix.md');
assert.ok(existsSync(appendix) && statSync(appendix).size > 0, 'rollback appendix must remain until post-cutover review closes');

for (const path of ['CLAUDE.md', 'AGENTS.md', '.claude/skill-os/agent-context-manifest.json']) {
  const text = readFileSync(join(root, path), 'utf8');
  assert.doesNotMatch(text, /claude-md-appendix\.md/, `${path} restores the retired mega-appendix to runtime context`);
}

const state = JSON.parse(readFileSync(join(root, '.claude/skill-os/agent-context-state.json'), 'utf8'));
assert.ok(['roots-projected', 'projected'].includes(state.phase), `appendix retirement requires projected roots, got ${state.phase}`);
console.log('PASS former mega-appendix is retained only as rollback evidence and absent from runtime context');
