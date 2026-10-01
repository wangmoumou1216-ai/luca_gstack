#!/usr/bin/env node
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';

const canonical = '.claude/skills/office/wait-what';
const skill = readFileSync(`${canonical}/SKILL.md`, 'utf8');
const openai = readFileSync(`${canonical}/agents/openai.yaml`, 'utf8');
const command = readFileSync('.claude/commands/wait-what.md', 'utf8');
const routing = readFileSync('.claude/skill-os/skill-routing-map.yaml', 'utf8');
const modes = readFileSync('.claude/skill-os/input-modes.yaml', 'utf8');
const modelRouting = readFileSync('.claude/skill-os/model-routing.yaml', 'utf8');

assert.match(skill, /^name: wait-what$/m);
assert.match(skill, /^disable-model-invocation: true$/m);
assert.match(skill, /自然中文/);
assert.match(skill, /缺失前提|最少前提/);
assert.match(skill, /项目 CONTEXT/);
assert.match(skill, /多域按已有 map/);
assert.match(skill, /已有 verified 项目绑定/);
assert.match(skill, /没有绑定[\s\S]*?不为[\s\S]*?启动 Project Gate\/切换/);
assert.match(skill, /只输出重讲内容/);
assert.match(skill, /无文件、handoff、workflow、Git、网络或其他效果/);
assert.match(skill, /英语表达确为用户所需时[\s\S]*?Simplified Technical English/);
assert.match(skill, /中文任务保持自然中文/);

assert.match(openai, /display_name: "等等，我没听懂"/);
assert.match(openai, /allow_implicit_invocation: false/);
assert.match(command, /office\/wait-what\/SKILL\.md/);
assert.match(routing, /wait_what:\s+[\s\S]*?invoke: "\/wait-what"[\s\S]*?triggers: \[显式调用wait-what\]/);
assert.match(modes, /wait-what:\s+[\s\S]*?standalone:[\s\S]*?previous_assistant_message/);
assert.match(modelRouting, /guided-execution:[\s\S]*?skills: \[[\s\S]*?\bwait-what\b/);

for (const alias of ['.claude/skills/wait-what', '.agents/skills/wait-what']) {
  assert.equal(lstatSync(alias).isSymbolicLink(), true, `${alias} must be a symlink`);
  assert.equal(realpathSync(alias), realpathSync(canonical), `${alias} must resolve to the canonical skill`);
}

console.log('PASS wait-what Chinese explicit-only integration');
