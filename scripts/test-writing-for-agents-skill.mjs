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
const wizard = read('.claude/skills/office/references/office-wizard.md');

assert.match(skill, /^name: writing-for-agents$/m);
assert.match(skill, /^description: .*skills, AGENTS\.md, or CLAUDE\.md/m);
assert.match(skill, /^\s+recommended-model: guided-execution$/m);
assert.doesNotMatch(skill, /^disable-model-invocation:/m);
assert.match(skill, /context pointers/i);
assert.match(skill, /information hierarchy/i);
assert.match(skill, /Completion criterion:/);
assert.match(skill, /leading words/i);
assert.match(skill, /thin callable entry/);
assert.match(skill, /skill-creator.*creation, packaging, and evaluation/s);
assert.match(skill, /skill-authoring\.md.*single source of\s+truth/s);
assert.match(skill, /`ux-writing`.*user-facing interface language/s);
assert.match(skill, /no independent workflow state or handoff artifact/);
assert.match(skill, /grants no new Git, network,\s+publication, or external-effect authority/s);
assert.match(skill, /321658273cb1d20b76026717d027d505790106d4/);
assert.match(skill, /FILE_END: writing-for-agents\/SKILL\.md/);

assert.match(authoring, /context load/);
assert.match(authoring, /cognitive load/);
assert.match(authoring, /信息层级三阶梯/);
assert.match(authoring, /Leading word/);
assert.match(authoring, /premature completion.*duplication.*sediment.*sprawl.*no-op.*negation/s);

assert.match(mechanics, /Model-invoked/);
assert.match(mechanics, /User-invoked/);
assert.match(mechanics, /allow_implicit_invocation: true/);
assert.match(mechanics, /allow_implicit_invocation: false/);
assert.match(mechanics, /one canonical `office\/<name>\/SKILL\.md`/);
assert.match(mechanics, /no workflow-graph edge unless the skill owns a real/);
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
assert.match(pins, /name: writing-for-agents[\s\S]*?path: skills\/productivity\/writing-for-agents[\s\S]*?pinned_sha: 321658273cb1d20b76026717d027d505790106d4/);
assert.match(vetting, /name: writing-for-agents[\s\S]*?verdict: ADOPTED-AS-THIN-ENTRY/);
assert.match(integrationMap, /\| 11 \| writing-for-agents \|/);
assert.match(claude, /`\/writing-for-agents`/);
assert.match(agents, /`\/writing-for-agents`/);
assert.match(wizard, /\/writing-for-agents/);

for (const alias of ['.claude/skills/writing-for-agents', '.agents/skills/writing-for-agents']) {
  assert.equal(lstatSync(alias).isSymbolicLink(), true, `${alias} must be a symlink`);
  assert.equal(realpathSync(alias), realpathSync(canonical), `${alias} must resolve to the canonical skill`);
}

console.log('PASS writing-for-agents source, boundary, routing, and dual-harness integration');
