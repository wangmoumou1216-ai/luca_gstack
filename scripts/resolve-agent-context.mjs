#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const runtime = arg('--runtime');
const prompt = arg('--prompt');
if (!['claude', 'codex'].includes(runtime) || typeof prompt !== 'string') {
  console.error('usage: node scripts/resolve-agent-context.mjs --runtime claude|codex --prompt <text>');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(join(ROOT, '.claude/skill-os/agent-context-manifest.json'), 'utf8'));
const folded = prompt.toLocaleLowerCase('zh-CN');
const targets = [];
for (const entry of manifest.entries) {
  if (!entry.runtime.includes(runtime)) continue;
  const matched = entry.leading_words.some((word) => folded.includes(String(word).toLocaleLowerCase('zh-CN')));
  if (matched) targets.push({ id: entry.id, target: entry.target, read_to_end: entry.read_to_end });
}
console.log(JSON.stringify({ runtime, targets }, null, 2));
