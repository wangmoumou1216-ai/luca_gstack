#!/usr/bin/env node
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';

const canonical = '.claude/skills/office/writing-for-agents';
const read = path => readFileSync(path, 'utf8');
const skill = read(`${canonical}/SKILL.md`);
const mechanics = read(`${canonical}/SKILL-MECHANICS.md`);
const authoring = read('.claude/skill-os/skill-authoring.md');
const openai = read(`${canonical}/agents/openai.yaml`);
const license = read(`${canonical}/LICENSE`);
const command = read('.claude/commands/writing-for-agents.md');
const routing = read('.claude/skill-os/skill-routing-map.yaml');
const modes = read('.claude/skill-os/input-modes.yaml');
const modelRouting = read('.claude/skill-os/model-routing.yaml');
const codexViability = read('.claude/skill-os/codex-viability.yaml');
const pins = read('.claude/skill-os/external-skills/installed-pins.yaml');
const vetting = read('.claude/skill-os/external-skills/vetting-registry.yaml');
const integrationMap = read('.claude/skill-os/external-skills/INTEGRATION-MAP.md');
const claude = read('CLAUDE.md');
const agents = read('AGENTS.md');
const catalog = read('.claude/skill-os/generated/skill-catalog.md');
const wizard = read('.claude/skills/office/references/office-wizard.md');

assert.match(skill, /^name: writing-for-agents$/m);
assert.match(skill, /^description: .*skills, AGENTS\.md, or CLAUDE\.md/m);
assert.match(skill, /^\s+recommended-model: guided-execution$/m);
assert.doesNotMatch(skill, /^disable-model-invocation:/m);
assert.match(skill, /context pointers/i);
assert.match(skill, /information hierarchy/i);
assert.match(skill, /completion criterion/i);
assert.match(skill, /leading words/i);
assert.match(skill, /通用写作方法的唯一权威/);
assert.match(skill, /创建\/包装按本地 skill-creator 合同/);
assert.match(skill, /skill-authoring 保持结构\/注册权/);
assert.match(skill, /领域 skill 仍拥有事实、产品文案/);
assert.match(skill, /No independent workflow state, automatic handoff/);
assert.match(skill, /new network,[\s\S]*?Git\/publication or memory-writing authority/);
assert.match(skill, /d81f3a183412e71a5b1e84ca21bc1a35eea03a60/);
assert.match(skill, /FILE_END: writing-for-agents\/SKILL\.md/);

assert.match(skill, /context load/i);
assert.match(skill, /cognitive load/i);
assert.match(authoring, /writing-for-agents\/SKILL\.md/);
assert.match(skill, /Leading word/i);
for (const term of ["premature completion","duplication","sediment","sprawl","no-op","negation"]) assert.ok(skill.toLowerCase().includes(term));

assert.match(mechanics, /Model-reachable/);
assert.match(mechanics, /direct user invocation/);
assert.match(mechanics, /allow_implicit_invocation/);
assert.match(mechanics, /false value/);
assert.match(mechanics, /one canonical body/);
assert.match(mechanics, /Workflow graph remains optional[\s\S]*?real owned/);
assert.match(mechanics, /FILE_END: writing-for-agents\/SKILL-MECHANICS\.md/);

assert.match(openai, /display_name: "Writing for Agents"/);
assert.match(openai, /allow_implicit_invocation: true/);
assert.match(license, /MIT License/);
assert.match(license, /Copyright \(c\) 2026 Matt Pocock/);
assert.match(command, /office\/writing-for-agents\/SKILL\.md/);
assert.match(command, /SKILL-MECHANICS\.md/);
assert.match(routing, /writing_for_agents:\s+[\s\S]*?invoke: "\/writing-for-agents"[\s\S]*?triggers: \[[^\]]*修改AGENTS\.md[^\]]*修改CLAUDE\.md/);
assert.match(modes, /writing-for-agents:\s+[\s\S]*?agent_facing_document_target[\s\S]*?truth_owner_preserved/);
assert.match(modelRouting, /guided-execution:[\s\S]*?writing-for-agents/);
assert.match(codexViability, /writing-for-agents: \{tier: 1\}/);
assert.match(pins, /name: writing-for-agents[\s\S]*?path: skills\/productivity\/writing-for-agents[\s\S]*?pinned_sha: [a-f0-9]{40}/);
assert.match(vetting, /name: writing-for-agents[\s\S]*?verdict: ADOPTED[^\n]*/);
assert.match(integrationMap, /\| 11 \| writing-for-agents \|/);
assert.match(catalog, /\| `writing-for-agents` \|[\s\S]*?office\/writing-for-agents\/SKILL\.md/);
assert.match(claude, /generated\/skill-catalog\.md/);
assert.match(claude, /native slash-command/);
assert.match(agents, /generated\/skill-catalog\.md/);
assert.match(agents, /\$<skill-name>/);
assert.match(wizard, /\/writing-for-agents/);

for (const alias of ['.claude/skills/writing-for-agents', '.agents/skills/writing-for-agents']) {
  assert.equal(lstatSync(alias).isSymbolicLink(), true, `${alias} must be a symlink`);
  assert.equal(realpathSync(alias), realpathSync(canonical), `${alias} must resolve to the canonical skill`);
}

console.log('PASS writing-for-agents source, boundary, routing, and dual-harness integration');
