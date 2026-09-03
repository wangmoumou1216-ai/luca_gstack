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
assert.match(skill, /缺失的前提|前提和上下文/);
assert.match(skill, /`CONTEXT\.md`/);
assert.match(skill, /`CONTEXT-MAP\.md`/);
assert.match(skill, /仅当会话已有经过验证的项目绑定/);
assert.match(skill, /没有项目绑定时，不为本技能发起项目确认或切换/);
assert.match(skill, /只输出重新讲解的内容/);
assert.match(skill, /不创建产物.*不写交接文档.*不改工作流状态/s);
assert.doesNotMatch(skill, /ASD-STE100|Simplified Technical English/);

assert.match(openai, /display_name: "等等，我没听懂"/);
assert.match(openai, /allow_implicit_invocation: false/);
assert.match(command, /office\/wait-what\/SKILL\.md/);
assert.match(routing, /wait_what:\s+[\s\S]*?invoke: "\/wait-what"[\s\S]*?triggers: \[显式调用wait-what\]/);
assert.match(modes, /wait-what:\s+[\s\S]*?standalone:[\s\S]*?previous_assistant_message/);
assert.match(modelRouting, /guided-execution:[\s\S]*?skills: \[[\s\S]*?wait-what\]/);

for (const alias of ['.claude/skills/wait-what', '.agents/skills/wait-what']) {
  assert.equal(lstatSync(alias).isSymbolicLink(), true, `${alias} must be a symlink`);
  assert.equal(realpathSync(alias), realpathSync(canonical), `${alias} must resolve to the canonical skill`);
}

console.log('PASS wait-what Chinese explicit-only integration');
