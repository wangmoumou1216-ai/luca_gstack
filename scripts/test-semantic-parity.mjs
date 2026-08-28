#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readAuthority } from './lib/semantic-projection.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checker = join(root, 'scripts', 'check-capability-parity.mjs');
let pass = 0;

function ok(name, condition, detail = '') {
  assert.ok(condition, `${name}${detail ? ` — ${detail}` : ''}`);
  pass++;
  console.log(`PASS ${name}`);
}

function run(fixtureRoot) {
  return spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LUCA_PARITY_ROOT: fixtureRoot },
  });
}

function digest(
  reference,
  obligations,
  orderSignificant,
  appliesWhen = 'workflow_mode',
  allowStandaloneOverride = false,
  allowParallelStart = false,
) {
  const normalized = orderSignificant ? [...obligations] : [...obligations].sort();
  const payload = JSON.stringify({
    schema_version: 2,
    authority: reference,
    applies_when: appliesWhen,
    allow_standalone_override: allowStandaloneOverride,
    allow_parallel_start: allowParallelStart,
    order_significant: orderSignificant,
    block_if: normalized,
  });
  return `sha256:${createHash('sha256').update(payload).digest('hex')}`;
}

function graph(
  obligations,
  orderSignificant = false,
  appliesWhen = 'workflow_mode',
  allowStandaloneOverride = false,
  allowParallelStart = false,
) {
  return [
    'handoff_gates:',
    '  design_brief_to_magicpath:',
    `    applies_when: "${appliesWhen}"`,
    `    order_significant: ${orderSignificant}`,
    '    block_if:',
    ...obligations.map((item) => `      - "${item}"`),
    `    allow_standalone_override: ${allowStandaloneOverride}`,
    `    allow_parallel_start: ${allowParallelStart}`,
    '',
  ].join('\n');
}

function runtimeReceipt(body = [
  'Before any MagicPath CLI command, read the wrapper and enforce its referenced gate exactly.',
  'If the wrapper or gate cannot be read, or the gate does not pass, stop before delegation.',
].join('\n')) {
  return [
    '<!-- LUCA_RUNTIME_RECEIPT_BEGIN -->',
    body,
    '<!-- LUCA_RUNTIME_RECEIPT_END -->',
  ].join('\n');
}

function sourceMagicpath(target = '.agents/skills/magicpath/SKILL.md', sourceName = 'magicpath') {
  return `---
name: ${sourceName}
metadata:
  codex-projection-mode: external-delegation
  codex-projection-target: ${target}
  codex-projection-reason: "Use the full external plugin while the shared wrapper owns workflow obligations."
  codex-obligation-source: ${authority}
---
# wrapper
${runtimeReceipt()}
`;
}

function projectedMagicpath(obligations, orderSignificant = false, receipt = runtimeReceipt()) {
  return `---
name: magicpath
metadata:
  luca-wrapper: .claude/skills/office/magicpath/SKILL.md
  luca-obligation-source: ${authority}
  luca-obligation-digest: ${digest(authority, obligations, orderSignificant)}
---
# external
${receipt}
`;
}

const real = run(root);
ok('real repository semantic parity', real.status === 0, `${real.stdout}${real.stderr}`);

const fixture = mkdtempSync(join(tmpdir(), 'luca-semantic-parity-'));
const authority = '.claude/skill-os/optional-workflow-graph.yaml#handoff_gates.design_brief_to_magicpath';
const original = ['packet missing', 'mapping missing', 'traceability gate failed'];

try {
  const officeRootFixture = mkdtempSync(join(tmpdir(), 'luca-office-root-symlink-'));
  const externalOfficeRoot = mkdtempSync(join(tmpdir(), 'luca-external-office-'));
  mkdirSync(join(officeRootFixture, '.claude', 'skill-os'), { recursive: true });
  mkdirSync(join(officeRootFixture, '.claude', 'skills'), { recursive: true });
  mkdirSync(join(officeRootFixture, '.agents', 'skills'), { recursive: true });
  writeFileSync(join(officeRootFixture, '.claude', 'skill-os', 'capability-parity.json'), '{"files":{}}\n');
  writeFileSync(join(externalOfficeRoot, 'SKILL.md'), '---\nname: office\n---\n');
  symlinkSync(externalOfficeRoot, join(officeRootFixture, '.claude', 'skills', 'office'), 'dir');
  let result = run(officeRootFixture);
  ok('symlinked office root is rejected', result.status === 1 && /.claude\/skills\/office 必须是仓内真实目录/.test(`${result.stdout}${result.stderr}`));
  rmSync(officeRootFixture, { recursive: true, force: true });
  rmSync(externalOfficeRoot, { recursive: true, force: true });

  const agentsRootFixture = mkdtempSync(join(tmpdir(), 'luca-agents-root-symlink-'));
  const externalAgentsRoot = mkdtempSync(join(tmpdir(), 'luca-external-agents-'));
  mkdirSync(join(agentsRootFixture, '.claude', 'skill-os'), { recursive: true });
  mkdirSync(join(agentsRootFixture, '.claude', 'skills', 'office'), { recursive: true });
  mkdirSync(join(agentsRootFixture, '.agents'), { recursive: true });
  writeFileSync(join(agentsRootFixture, '.claude', 'skill-os', 'capability-parity.json'), '{"files":{}}\n');
  writeFileSync(join(agentsRootFixture, '.claude', 'skills', 'office', 'SKILL.md'), '---\nname: office\n---\n');
  symlinkSync(externalAgentsRoot, join(agentsRootFixture, '.agents', 'skills'), 'dir');
  result = run(agentsRootFixture);
  ok('symlinked agents root is rejected', result.status === 1 && /.agents\/skills 必须是仓内真实目录/.test(`${result.stdout}${result.stderr}`));
  rmSync(agentsRootFixture, { recursive: true, force: true });
  rmSync(externalAgentsRoot, { recursive: true, force: true });

  mkdirSync(join(fixture, '.claude', 'skill-os'), { recursive: true });
  mkdirSync(join(fixture, '.claude', 'skills', 'office', 'alpha'), { recursive: true });
  mkdirSync(join(fixture, '.claude', 'skills', 'office', 'magicpath'), { recursive: true });
  mkdirSync(join(fixture, '.agents', 'skills', 'magicpath'), { recursive: true });
  writeFileSync(join(fixture, '.claude', 'skill-os', 'capability-parity.json'), '{"files":{}}\n');
  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original));
  writeFileSync(join(fixture, '.claude', 'skills', 'office', 'SKILL.md'), '---\nname: office\n---\n');
  writeFileSync(join(fixture, '.claude', 'skills', 'office', 'alpha', 'SKILL.md'), '---\nname: alpha\n---\n');
  writeFileSync(join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'), sourceMagicpath());
  writeFileSync(join(fixture, '.agents', 'skills', 'magicpath', 'SKILL.md'), projectedMagicpath(original));
  symlinkSync(join(fixture, '.claude', 'skills', 'office'), join(fixture, '.agents', 'skills', 'office'), 'dir');
  symlinkSync(join(fixture, '.claude', 'skills', 'office', 'alpha'), join(fixture, '.agents', 'skills', 'alpha'), 'dir');

  result = run(fixture);
  ok('intentional external delegation positive fixture', result.status === 0, `${result.stdout}${result.stderr}`);

  const externalBeta = join(fixture, 'external-beta');
  mkdirSync(externalBeta);
  writeFileSync(join(externalBeta, 'SKILL.md'), '---\nname: beta\n---\n');
  const betaSource = join(fixture, '.claude', 'skills', 'office', 'beta');
  symlinkSync(externalBeta, betaSource, 'dir');
  result = run(fixture);
  ok('symlinked source skill without projection is rejected', result.status === 1 && /source skill 禁止 symlink/.test(`${result.stdout}${result.stderr}`));
  unlinkSync(betaSource);

  const danglingBeta = join(fixture, '.claude', 'skills', 'office', 'dangling-beta');
  symlinkSync(join(fixture, 'missing-source-directory'), danglingBeta, 'dir');
  result = run(fixture);
  ok('dangling source directory symlink is rejected', result.status === 1 && /source skill 禁止 symlink/.test(`${result.stdout}${result.stderr}`));
  unlinkSync(danglingBeta);

  const gammaSource = join(fixture, '.claude', 'skills', 'office', 'gamma');
  mkdirSync(gammaSource);
  const externalGamma = join(fixture, 'external-gamma-skill.md');
  writeFileSync(externalGamma, '---\nname: gamma\n---\n');
  symlinkSync(externalGamma, join(gammaSource, 'SKILL.md'));
  result = run(fixture);
  ok('symlinked source SKILL.md is rejected', result.status === 1 && /source SKILL.md 必须是普通文件/.test(`${result.stdout}${result.stderr}`));
  rmSync(gammaSource, { recursive: true, force: true });

  const danglingGamma = join(fixture, '.claude', 'skills', 'office', 'dangling-gamma');
  mkdirSync(danglingGamma);
  symlinkSync(join(fixture, 'missing-source-skill.md'), join(danglingGamma, 'SKILL.md'));
  result = run(fixture);
  ok('dangling source SKILL.md symlink is rejected', result.status === 1 && /source SKILL.md 必须是普通文件/.test(`${result.stdout}${result.stderr}`));
  rmSync(danglingGamma, { recursive: true, force: true });

  const escapedAuthorityRoot = mkdtempSync(join(tmpdir(), 'luca-authority-escape-'));
  const escapedAuthority = join(escapedAuthorityRoot, 'authority.yaml');
  writeFileSync(escapedAuthority, graph(original));
  let authorityEscapeRejected = false;
  try { readAuthority(fixture, `${escapedAuthority}#handoff_gates.design_brief_to_magicpath`); } catch (error) {
    authorityEscapeRejected = /authority escapes repository root/.test(error.message);
  }
  rmSync(escapedAuthorityRoot, { recursive: true, force: true });
  ok('authority path escape is rejected', authorityEscapeRejected);

  writeFileSync(join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'), sourceMagicpath('.agents/skills/alpha/SKILL.md'));
  result = run(fixture);
  ok('swapped delegation target is rejected', result.status === 1 && /target swap/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'),
    sourceMagicpath('.agents/skills/magicpath/SKILL.md', 'not-magicpath'),
  );
  result = run(fixture);
  ok('source skill name mismatch is rejected', result.status === 1 && /source name=not-magicpath/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'),
    sourceMagicpath().replace('name: magicpath\n', 'name: magicpath\nname: shadow\n'),
  );
  result = run(fixture);
  ok('duplicate source name is rejected', result.status === 1 && /duplicate key/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'),
    sourceMagicpath().replace('metadata:\n', 'metadata:\nmetadata:\n'),
  );
  result = run(fixture);
  ok('duplicate source metadata is rejected', result.status === 1 && /duplicate key/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'),
    sourceMagicpath().replace('name: magicpath\n', 'name: magicpath\nname:\n'),
  );
  result = run(fixture);
  ok('empty duplicate source name is rejected', result.status === 1 && /duplicate key/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'),
    sourceMagicpath().replace('name: magicpath\n', 'name: magicpath\n"name": shadow\n'),
  );
  result = run(fixture);
  ok('quoted duplicate source name is rejected', result.status === 1 && /duplicate key/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'),
    sourceMagicpath().replace('name: magicpath', 'name: [magicpath'),
  );
  result = run(fixture);
  ok('invalid YAML frontmatter is rejected', result.status === 1 && /invalid frontmatter/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.claude', 'skills', 'office', 'magicpath', 'SKILL.md'), sourceMagicpath());
  const projectedPath = join(fixture, '.agents', 'skills', 'magicpath', 'SKILL.md');
  const escapedPath = join(fixture, 'escaped-magicpath-skill.md');
  writeFileSync(escapedPath, projectedMagicpath(original));
  unlinkSync(projectedPath);
  symlinkSync(escapedPath, projectedPath);
  result = run(fixture);
  ok('actual delegation file symlink swap is rejected', result.status === 1 && /禁止 symlink/.test(`${result.stdout}${result.stderr}`));
  unlinkSync(projectedPath);
  writeFileSync(projectedPath, projectedMagicpath(original));

  unlinkSync(projectedPath);
  result = run(fixture);
  ok('deleted delegation target is rejected', result.status === 1 && /delegation target 缺失/.test(`${result.stdout}${result.stderr}`));

  symlinkSync(join(fixture, 'missing-external-skill.md'), projectedPath);
  result = run(fixture);
  ok('dangling delegation target symlink is rejected', result.status === 1 && /禁止 symlink/.test(`${result.stdout}${result.stderr}`));
  unlinkSync(projectedPath);
  writeFileSync(projectedPath, projectedMagicpath(original));

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original.slice(0, -1)));
  result = run(fixture);
  ok('removed mandatory obligation is rejected', result.status === 1 && /obligation digest drift/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original, false, 'always'));
  result = run(fixture);
  ok('gate scope mutation is rejected', result.status === 1 && /obligation digest drift/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original, false, 'workflow_mode', true));
  result = run(fixture);
  ok('standalone override mutation is rejected', result.status === 1 && /obligation digest drift/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original, false, 'workflow_mode', false, true));
  result = run(fixture);
  ok('parallel-start mutation is rejected', result.status === 1 && /obligation digest drift/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'),
    graph(original).replace(/^    order_significant:.*\n/m, ''),
  );
  result = run(fixture);
  ok('missing order semantics is rejected', result.status === 1 && /order_significant must be boolean/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'),
    graph(original).replace('order_significant: false', 'order_significant: "true"'),
  );
  result = run(fixture);
  ok('string order semantics is rejected', result.status === 1 && /order_significant must be boolean/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph([...original].reverse()));
  result = run(fixture);
  ok('unordered authority permits obligation reordering', result.status === 0, `${result.stdout}${result.stderr}`);

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original, true));
  writeFileSync(join(fixture, '.agents', 'skills', 'magicpath', 'SKILL.md'), projectedMagicpath(original, true));
  result = run(fixture);
  ok('ordered authority positive fixture', result.status === 0, `${result.stdout}${result.stderr}`);
  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph([...original].reverse(), true));
  result = run(fixture);
  ok('ordered authority rejects obligation reordering', result.status === 1 && /obligation digest drift/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.claude', 'skill-os', 'optional-workflow-graph.yaml'), graph(original));
  writeFileSync(join(fixture, '.agents', 'skills', 'magicpath', 'SKILL.md'), projectedMagicpath(original, false, ''));
  result = run(fixture);
  ok('metadata-only receipt without runtime instruction is rejected', result.status === 1 && /runtime receipt 非法/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(
    join(fixture, '.agents', 'skills', 'magicpath', 'SKILL.md'),
    projectedMagicpath(original, false, runtimeReceipt([
      'Never read the wrapper before any MagicPath CLI command.',
      'Do not stop before delegation.',
    ].join('\n'))),
  );
  result = run(fixture);
  ok('negated runtime receipt is rejected', result.status === 1 && /runtime receipt drift/.test(`${result.stdout}${result.stderr}`));

  writeFileSync(join(fixture, '.agents', 'skills', 'magicpath', 'SKILL.md'), projectedMagicpath(original));
  writeFileSync(join(fixture, '.agents', 'skills', 'orphan'), 'unexpected projection\n');
  result = run(fixture);
  ok('orphan Codex projection without source authority is rejected', result.status === 1 && /orphan entry/.test(`${result.stdout}${result.stderr}`));
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log(`PASS semantic parity proof-it-bites ${pass}/${pass}`);
