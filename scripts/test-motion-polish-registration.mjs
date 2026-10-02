#!/usr/bin/env node
// Local registration/consumer contract checks and actual CLI integrity. Native agent consumption is a separate gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkCandidate } from './prototype-delivery.mjs';
import { createDeliveryFixture, createLocalIntegrityReport, enhancedCSS } from './test-prototype-delivery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const selectedRoot = path.resolve(option('--root') || ROOT);
const read = (root, name) => fs.readFileSync(path.join(root, name), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileRef = name => ({ path: name, sha256: hash(fs.readFileSync(name)) });
const json = (name, value) => fs.writeFileSync(name, `${JSON.stringify(value, null, 2)}\n`);
const OWNER = '.claude/skill-os/runtime/prototype-delivery.md';
const consumers = [
  ['OD', '.claude/skills/office/open-design/SKILL.md', OWNER, 'resolve'],
  ['TS', '.claude/skills/office/tech-spec/SKILL.md', OWNER, 'resolve'],
  ['TP', '.claude/skills/office/task-plan/SKILL.md', OWNER, 'resolve'],
  ['compile', '.claude/agents/references/plan-engineering-modes.md', OWNER, 'resolve'],
  ['implement', '.claude/skills/office/implement/SKILL.md', '.claude/agents/references/plan-engineering-modes.md'],
  ['Plan', '.claude/agents/plan-agent.md', '.claude/agents/references/plan-engineering-modes.md'],
  ['QG', '.claude/agents/quality-gate.md', OWNER, 'candidate-check'],
  ['Orchestrator', '.claude/agents/orchestrator.md', OWNER],
  ['handoff', '.claude/skills/office/references/handoff-protocol.md', OWNER],
];

function consumerContracts(root) {
  for (const [name, filename, owner, command] of consumers) {
    const text = read(root, filename);
    assert.ok(text.includes('final_artifact_ref') && text.includes(owner), `MISSING_FINAL_CONSUMER_POINTER:${name}`);
    if (command) {
      assert.match(text, new RegExp(`node scripts/prototype-delivery\\.mjs ${command} --${command === 'resolve' ? 'accepted' : 'subject'} <[^>]+> --sha256 <[^>]+> --delivery-root <[^>]+>`), `MISSING_EXACT_CLI_CONSUMER:${name}`);
      assert.ok(text.includes('--read-path') && text.includes('--read-root'), `MISSING_CURRENT_READ_CONTEXT:${name}`);
    }
  }
  const od = read(root, consumers[0][1]), ts = read(root, consumers[1][1]), tp = read(root, consumers[2][1]);
  const compile = read(root, consumers[3][1]), qg = read(root, consumers[6][1]), orch = read(root, consumers[7][1]);
  assert.ok(od.includes('不要求 raw semantic PASS') && od.includes('原 raw FAIL 保留') && od.includes('全部原源 D/STATE/AC/KEEP'), 'MISSING_SAME_PHASE_RAW_FAIL_EDGE');
  assert.ok(od.includes('_NODE="open-design"') && od.includes('_STATUS="DONE"') && od.includes('程序化绑定返回的 `final_entry`'), 'MISSING_NARROW_P7_OUTPUT_EDGE');
  assert.ok(ts.includes('artifact_evidence{accepted_ref,final_entry,') && ts.includes('HTML/DOM/CSS/JS/WAAPI/gesture'), 'MISSING_ACTUAL_CMP_EVIDENCE');
  assert.ok(tp.includes('SRC-PROTOTYPE') && tp.includes('输出 §2 L1 Index') && tp.includes('DEV/TEST') && tp.includes('stale'), 'MISSING_L1_CARD_EVIDENCE');
  assert.ok(compile.includes('whole current candidate/final/source/base raw') && /same\s+task-plan SHA does not excuse external artifact drift/.test(compile), 'MISSING_COMPILE_EXTERNAL_DRIFT');
  assert.ok(qg.includes('PREACCEPT 不要求历史 accepted') && qg.includes('完整\n`required_behavior_refs`') && qg.includes('MR-004'), 'MISSING_INDEPENDENT_PREACCEPT_EDGE');
  for (const filename of ['.claude/agents/plan-agent.md', consumers[2][1], consumers[6][1]])
    assert.ok(read(root, filename).includes('.claude/agents/references/project-verification.md'), `MISSING_CURRENT_INSTANCE_OWNER:${filename}`);
  assert.ok(qg.includes('before/after') && qg.includes('retained proof') && tp.includes('manifest exact path+hash'), 'MISSING_CURRENT_TEST_CONSUMPTION');
  assert.ok(orch.includes('.claude/agents/references/evidence-receipts.md') && qg.includes('.claude/agents/references/evidence-receipts.md')
    && orch.includes('pre-freeze expected') && qg.includes('原分母') && qg.includes('measurement'), 'MISSING_ORIGINAL_DENOMINATOR_CONSUMPTION');
}

function registrations(root) {
  const python = spawnSync('python3', ['-c', String.raw`
import json,pathlib,sys,yaml
r=pathlib.Path(sys.argv[1]); body=(r/'.claude/skills/office/motion-polish/SKILL.md').read_text()
out={name:yaml.safe_load((r/name).read_text()) for name in ['.claude/skill-os/skill-routing-map.yaml','.claude/skill-os/input-modes.yaml','.claude/skill-os/model-routing.yaml','.claude/skill-os/codex-viability.yaml']}
out['frontmatter']=yaml.safe_load(body.split('---',2)[1]); print(json.dumps(out,default=str))
`, root], { encoding: 'utf8' });
  assert.equal(python.status, 0, `YAML_REGISTRY_READ_FAILED:${python.stderr}`);
  const registry = JSON.parse(python.stdout), route = registry['.claude/skill-os/skill-routing-map.yaml'].project_skills.motion_polish;
  assert.deepEqual(route, { invoke: '/motion-polish', weight: 8, triggers: ['motion-polish', '完善HTML动效', '补足HTML微交互', '润色已有HTML动效'] }, 'DIRECT_IMPLICIT_ROUTE_DRIFT');
  for (const unrelated of ['动画原理是什么', '评审代码', '生成新UI', '设计一个新页面'])
    assert.ok(!route.triggers.some(trigger => unrelated.includes(trigger)), `NEGATIVE_REGISTRY_TRIGGER:${unrelated}`);
  assert.match(read(root, '.claude/skill-os/skill-routing-map.yaml'), /triggers: \[motion-polish, 完善HTML动效, 补足HTML微交互, 润色已有HTML动效\]/);
  const canonical = fs.realpathSync(path.join(root, '.claude/skills/office/motion-polish'));
  for (const alias of ['.claude/skills/motion-polish', '.agents/skills/motion-polish']) {
    assert.equal(fs.readlinkSync(path.join(root, alias)), 'office/motion-polish', `ALIAS_TOPOLOGY:${alias}`);
    assert.equal(fs.realpathSync(path.join(root, alias)), canonical, `ALIAS_AUTHORITY:${alias}`);
  }
  assert.equal(read(root, '.claude/commands/motion-polish.md'), '读取 `.claude/skills/office/motion-polish/SKILL.md` 并严格按照其中的指令执行。\n');
  assert.match(read(root, '.claude/skills/office/motion-polish/agents/openai.yaml'), /allow_implicit_invocation: true/);
  const fm = registry.frontmatter, body = read(root, '.claude/skills/office/motion-polish/SKILL.md');
  assert.equal(fm.name, 'motion-polish'); assert.equal(fm['preamble-tier'], 1);
  assert.equal(fm['context-cost'].self, Buffer.byteLength(body)); assert.equal(fm['context-cost']['runtime-estimate'], 6500);
  assert.equal(fm.metadata['recommended-model'], 'core-execution');
  assert.deepEqual(fm['allowed-tools'], ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep']);
  assert.ok(!fm['disable-model-invocation'] && !fm['allowed-tools'].includes('Agent'), 'SINGLE_EXECUTOR_BOUNDARY');
  assert.ok(body.trimEnd().endsWith('<!-- FILE_END: motion-polish/SKILL.md -->'), 'SKILL_EOF');
  assert.ok(body.includes('New UI generation remains') && body.includes('animation explanations and code review'), 'SEMANTIC_REFINEMENT_BOUNDARY');
  const modes = registry['.claude/skill-os/input-modes.yaml'].skills['motion-polish'];
  assert.deepEqual(modes.modes.standalone.required, ['actual_html_artifact', 'requested_motion_scope']);
  assert.deepEqual(modes.modes.workflow.required, ['actual_html_artifact', 'source_handoff', 'requested_motion_scope']);
  assert.deepEqual(modes.modes.internal.required, ['caller', 'actual_html_artifact', 'requested_motion_scope', 'condition_evidence', 'inherited_authority', 'authority_effect_intersection']);
  assert.deepEqual(modes.quality_gates, ['base_html_bound', 'scope_and_authority_bound', 'product_facts_preserved', 'motion_gap_resolved', 'runtime_evidence_for_final_html', 'single_final_artifact', 'caller_resumed']);
  const view = JSON.parse(read(root, '.claude/skill-os/generated/input-modes/motion-polish.json'));
  assert.deepEqual(view.contract, modes); assert.equal(view.source_sha256, hash(read(root, '.claude/skill-os/input-modes.yaml')));
  const model = registry['.claude/skill-os/model-routing.yaml'];
  assert.ok(model.tiers['core-execution'].skills.includes('motion-polish'), 'COMPAT_MODEL_REGISTRATION');
  assert.match(read(root, '.claude/skill-os/model-routing.yaml'), /quality-gate:\s*MR-004/);
  assert.equal(registry['.claude/skill-os/codex-viability.yaml'].skills['motion-polish'].tier, 1);
  assert.match(read(root, 'scripts/check-skill-scene-coverage.py'), /"motion-polish":\s+\(\[f"\{D\}\/prototype\/\*\/index.html"\],\s+\[f"\{D\}\/handoff\/\*-motion-polish-handoff.md"\], "weak"\)/);
  assert.match(read(root, '.claude/skill-os/generated/skill-catalog.md'), /\| `motion-polish` \|[^\n]+\.claude\/skills\/office\/motion-polish\/SKILL.md/);
  const wizard = read(root, '.claude/skills/office/references/office-wizard.md');
  assert.equal((wizard.match(/^\/motion-polish /gm) || []).length, 1, 'FIRST_CLASS_WIZARD_ONE_ENTRY');
  assert.ok(wizard.indexOf('/motion-polish ') > wizard.indexOf('── 原型实现'), 'WIZARD_ENTRY_SCOPE');
  const manifest = JSON.parse(read(root, '.claude/skill-os/agent-context-manifest.json'));
  const entry = manifest.entries.find(item => item.id === 'prototype-delivery');
  assert.ok(entry && entry.target === OWNER && entry.read_to_end === true, 'CONDITIONAL_OWNER');
  assert.deepEqual(entry.runtime, ['claude', 'codex']);
  assert.ok(read(root, OWNER).trimEnd().endsWith('<!-- FILE_END: skill-os/runtime/prototype-delivery.md -->'), 'DELIVERY_OWNER_EOF');
  const schema = JSON.parse(read(root, '.claude/skill-os/prototype-delivery.schema.json'));
  assert.ok(schema.$defs || schema.definitions, 'DELIVERY_SCHEMA_DEFINITIONS');
}

// Bind the actual prose CLI templates to exact fixture refs without a shell or guessed/latest lookup.
function proseArgs(text, command, fixture, ref) {
  const line = text.split('\n').find(line => line.trim().startsWith(`node scripts/prototype-delivery.mjs ${command} `));
  assert.ok(line, `MISSING_ACTUAL_PROSE_CLI:${command}`);
  const trimmed = line.trim().replace(/ \[--read-(?:path|root) <[^>]+>\]/g, '');
  const tokens = trimmed.match(/<[^>]+>|[^\s]+/g).slice(2);
  for (let i = 1; i < tokens.length; i += 2) {
    const flag = tokens[i];
    assert.ok(['--subject', '--accepted', '--sha256', '--delivery-root'].includes(flag), `UNKNOWN_PROSE_CLI_FLAG:${flag}`);
    assert.match(tokens[i + 1], /^<[^>]+>$/);
    tokens[i + 1] = flag === '--sha256' ? ref.sha256 : flag === '--delivery-root' ? fixture.deliveryRoot : ref.path;
  }
  return [...tokens, ...fixture.context.read_paths.flatMap(file => ['--read-path', file])];
}

async function main() {
  if (process.argv.includes('--check-consumers')) {
    consumerContracts(selectedRoot); console.log('PASS exact consumer contracts'); return;
  }
  const evidenceRoot = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), 'motion-registration-'));
  const receipts = [], mutationReceipts = [];
  const execute = (label, args, expected = 0, errorPattern) => {
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
    const out = path.join(evidenceRoot, `${label}.stdout`), err = path.join(evidenceRoot, `${label}.stderr`);
    fs.writeFileSync(out, result.stdout || ''); fs.writeFileSync(err, result.stderr || '');
    receipts.push({ label, argv: [process.execPath, ...args], exit_code: result.status, signal: result.signal,
      stdout_ref: fileRef(out), stderr_ref: fileRef(err), error: result.error?.message || null });
    assert.equal(result.status, expected, `${label}: actual exit\n${result.stderr}`);
    assert.ok(!result.error && !/SyntaxError|ERR_MODULE_NOT_FOUND|command not found/.test(result.stderr), `${label}: infrastructure is not behavioral RED`);
    if (errorPattern) assert.match(`${result.stdout}${result.stderr}`, errorPattern, `${label}: named rejection required`);
    return result;
  };
  try {
    registrations(selectedRoot); consumerContracts(selectedRoot);
    console.log('PASS direct/implicit/negative registry, aliases, modes, model, scene proxy and EOF');
    execute('registration-syntax', ['--check', SELF]);
    const mirror = path.join(evidenceRoot, 'consumer-mirror');
    for (const [, filename] of consumers) {
      const target = path.join(mirror, filename); fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(selectedRoot, filename), target);
    }
    for (const [name, filename] of consumers) {
      const target = path.join(mirror, filename), before = fs.readFileSync(target);
      fs.writeFileSync(target, before.toString().replaceAll('final_artifact_ref', 'unselected-artifact'));
      const mutationRef = fileRef(target);
      execute(`pointer-${name}-removed`, [SELF, '--check-consumers', '--root', mirror], 1, new RegExp(`MISSING_FINAL_CONSUMER_POINTER:${name}`));
      fs.writeFileSync(target, before);
      execute(`pointer-${name}-restored`, [SELF, '--check-consumers', '--root', mirror]);
      assert.equal(fileRef(target).sha256, hash(before));
      mutationReceipts.push({ consumer: name, path: filename, original_sha256: hash(before), mutation_sha256: mutationRef.sha256,
        source_script_syntax_exit: 0, removed_exit: 1, restored_exit: 0 });
    }
    console.log(`PASS ${mutationReceipts.length} named consumer pointer deletions RED and restored GREEN`);
    const fixture = createDeliveryFixture(path.join(evidenceRoot, 'cli-fixture'), { freeze: false });
    fs.writeFileSync(path.join(fixture.attempt.content_root, 'assets/base.css'), enhancedCSS);
    fixture.resolved = checkCandidate(fixture.candidateInput(), fixture.context);
    assert.ok(!fs.existsSync(path.join(fixture.attempt.attempt_dir, 'accepted-delivery.json')), 'PREACCEPT does not require accepted/DONE');
    const helper = path.join(ROOT, 'scripts/prototype-delivery.mjs');
    const qgArgs = proseArgs(read(selectedRoot, consumers[6][1]), 'candidate-check', fixture, fixture.resolved.candidate_ref);
    const preaccept = execute('actual-QG-prose-preaccept', [helper, ...qgArgs]);
    assert.equal(JSON.parse(preaccept.stdout).final_entry, fixture.attempt.entry);
    execute('candidate-no-current-external-read', [helper, ...qgArgs.slice(0, 7)], 1, /READ_SCOPE_REFUSED/);
    const local = createLocalIntegrityReport(fixture);
    assert.equal(local.report.reviewer_provenance.origin, 'LOCAL_TEST_NOT_INDEPENDENT');
    for (const [name, filename, , command] of consumers.filter(item => item[3] === 'resolve')) {
      const args = proseArgs(read(selectedRoot, filename), command, fixture, local.accepted.accepted_ref);
      const resolved = JSON.parse(execute(`actual-${name}-prose-resolve`, [helper, ...args]).stdout);
      assert.equal(resolved.final_entry, fixture.attempt.entry); assert.equal(resolved.spec_path, fixture.resolved.spec_path);
      assert.deepEqual(resolved.accepted_ref, local.accepted.accepted_ref); assert.equal(resolved.source_ref.sha256, fixture.bound.source.sha256);
      const bad = [...args]; bad[bad.indexOf('--sha256') + 1] = '0'.repeat(64);
      execute(`actual-${name}-wrong-ref`, [helper, ...bad], 1, /HASH_DRIFT/);
      const saved = fs.readFileSync(fixture.resolved.spec_path); fs.appendFileSync(fixture.resolved.spec_path, '\nDRIFT');
      execute(`actual-${name}-spec-drift`, [helper, ...args], 1, /HASH_DRIFT/);
      fs.writeFileSync(fixture.resolved.spec_path, saved);
      execute(`actual-${name}-restored`, [helper, ...args]);
    }
    console.log('PASS actual prose CLI candidate/final resolution, missing read context and stale ref/spec rejection');
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
  finally {
    json(path.join(evidenceRoot, 'commands.json'), receipts);
    json(path.join(evidenceRoot, 'summary.json'), { passed: !process.exitCode, consumer_count: consumers.length, mutations: mutationReceipts,
      source_refs: consumers.map(([, filename]) => fileRef(path.join(selectedRoot, filename))), scope: 'EXPLICIT_NO_PIN_FRAMEWORK_FIXTURE',
      limits: ['Local registry/pointer/CLI integrity only; not native routing, implicit invocation or consumer-agent execution.',
        'Synthetic LOCAL_TEST_NOT_INDEPENDENT acceptance exercises resolve integrity; not semantic motion acceptance or model authenticity.',
        'Real browser and cold native TS/TP/Plan/QG/OD and both-harness consumption remain separate gates.'] });
    console.log(`Evidence: ${evidenceRoot}`);
  }
}
await main();
