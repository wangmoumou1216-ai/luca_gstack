#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import assert from 'assert/strict';

const content = readFileSync('.claude/skill-os/skill-routing-map.yaml', 'utf8');
const claudeHead = readFileSync('CLAUDE.md', 'utf8').split('\n').slice(0, 40).join('\n');
const agentsHead = readFileSync('AGENTS.md', 'utf8').split('\n').slice(0, 40).join('\n');
const requiredInvokes = [
  '/auto',
  '/idea',
  '/deepresearch',
  '/brainstorm',
  'superpowers:brainstorming',
  '/ux-research',
  '/ux-audit',
  '/compare',
  '/ux-brainstorm',
  '/design-brief',
  'magicpath',
  '/html-prototype',
  '/figma-demo',
  '/figma-layer',
  '/tech-spec',
  '/task-plan',
];

for (const invoke of requiredInvokes) {
  assert.match(content, new RegExp(`invoke:\\s+"?${invoke.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?`), `missing invoke ${invoke}`);
}

assert.ok(!content.includes('invoke: "/status"'), '/status must not be a fake first-level skill');
assert.match(content, /project_context:/, 'missing project_context section');
assert.match(content, /老项目/, 'missing old-project trigger');
assert.match(content, /新项目/, 'missing new-project trigger');
assert.ok(existsSync('.claude/skills/office/compare/SKILL.md'), 'compare skill file missing');
assert.match(claudeHead, /Routing Contract TL;DR/, 'CLAUDE.md routing contract must stay in first 40 lines');
assert.match(agentsHead, /Routing Contract TL;DR/, 'AGENTS.md routing contract must stay in first 40 lines');
assert.match(claudeHead, /Project Gate first/, 'CLAUDE.md must front-load Project Gate priority');
assert.match(agentsHead, /Project Gate first/, 'AGENTS.md must front-load Project Gate priority');

console.log('PASS routing map coverage');
