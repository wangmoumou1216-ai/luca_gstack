#!/usr/bin/env node
// FIX-2 单一裁决 round-trip：projectNameFromLink（JS）跨 default/override/嵌套/新项目/legacy 布局
// 解出规范项目名，且与 py 孪生 _project.project_name_from_link **同值**。全 4 marker 站点共用此
// helper，故"4 站在嵌套下解析一致"由本测试对 helper 的裁决直接保证。
import { projectNameFromLink } from '../.claude/hooks/lib/project-substrate.mjs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { join } from 'path';

const REPO = fileURLToPath(new URL('..', import.meta.url));

function pyResolve(target, projects, projectsRoot) {
  const code = [
    "import sys; sys.path.insert(0, 'memory/scripts')",
    'from _project import project_name_from_link',
    `print(project_name_from_link(${JSON.stringify(target)}, ${JSON.stringify(projects)}, ${JSON.stringify(projectsRoot)}))`,
  ].join('\n');
  return execFileSync('python3', ['-c', code], { cwd: REPO, encoding: 'utf8' }).replace(/\n$/, '');
}

const PR = '/PR';
const cases = [
  { n: 'T1 default 单段 → muse', target: `${PR}/muse/docs`, projects: ['muse'], root: PR, exp: 'muse' },
  { n: 'T2 [FIX-2] 嵌套 muse/lucagstack（lucagstack∉known）→ 收敛 muse', target: `${PR}/muse/lucagstack/docs`, projects: ['muse'], root: PR, exp: 'muse' },
  { n: 'T3 嵌套且两级都 known → 取更具体 muse/lucagstack', target: `${PR}/muse/lucagstack/docs`, projects: ['muse', 'muse/lucagstack'], root: PR, exp: 'muse/lucagstack' },
  { n: 'T4 [override] LUCA_PROJECTS_ROOT 自定义根 → foo', target: `/custom/root/foo/docs`, projects: ['foo'], root: '/custom/root', exp: 'foo' },
  { n: 'T5 新项目（∉known，override 常见）→ 首段回退 newproj', target: `${PR}/newproj/docs`, projects: [], root: PR, exp: 'newproj' },
  { n: 'T6 legacy 相对软链 ../项目/bar/docs → bar', target: `../项目/bar/docs`, projects: [], root: PR, exp: 'bar' },
  { n: 'T7 target=projectsRoot/docs（无项目段）→ 空', target: `${PR}/docs`, projects: [], root: PR, exp: '' },
  { n: 'T8 空 target → 空', target: '', projects: [], root: PR, exp: '' },
  { n: 'T9 单段新项目在首段（与首段正则同值，证零回归）→ projA', target: `${PR}/projA/docs`, projects: ['muse', 'todo-capsule'], root: PR, exp: 'projA' },
  // ── 2026-07-25 深审补覆盖 ──
  // 路径穿越（实证旧行为可让 checkpoint 写到 projects 根之外）→ fail-closed 返回空
  { n: 'T10 [安全] 穿越 ../ → 空（fail-closed）', target: `${PR}/../docs`, projects: [], root: PR, exp: '' },
  { n: 'T11 [安全] 穿越多级 ../../../tmp/evil → 空', target: `${PR}/../../../tmp/evil/docs`, projects: [], root: PR, exp: '' },
  { n: 'T12 [安全] 段为 "." → 空', target: `${PR}/./docs`, projects: [], root: PR, exp: '' },
  { n: 'T13 [安全] 中间段含 .. → 空（身份与落点不一致）', target: `${PR}/muse/../crm/docs`, projects: ['muse'], root: PR, exp: '' },
  // 根归一化：带尾斜杠的 projectsRoot 曾让 4 站全部静默解析失败
  { n: 'T14 [归一] projectsRoot 带尾斜杠 → 仍解出 foo', target: `${PR}/foo/docs`, projects: ['foo'], root: PR + '/', exp: 'foo' },
  { n: 'T15 [归一] target 带尾斜杠 /docs/ → 仍解出 foo', target: `${PR}/foo/docs/`, projects: ['foo'], root: PR, exp: 'foo' },
  // endsWith 兜底（旧 route-guard 第二通路，FIX-2 首版误删 → 根外/同级相对链解析退化为"无项目"）
  { n: 'T16 [兜底] 根外路径 + 已知项目名 → endsWith 命中 muse', target: '/opt/elsewhere/muse/docs', projects: ['muse'], root: PR, exp: 'muse' },
  { n: 'T17 [兜底] 同级相对链 ../muse/docs + 已知 muse → muse', target: '../muse/docs', projects: ['muse'], root: PR, exp: 'muse' },
  { n: 'T18 根外且非已知项目 → 空', target: '/opt/elsewhere/unknown/docs', projects: ['muse'], root: PR, exp: '' },
  // marker 语义：用**第一个** marker（与被替换的旧实现一致，不做静默反转）
  { n: 'T19 [语义] 多 marker 取第一个（对齐旧实现）', target: `/tmp/项目/muse/项目/crm/docs`, projects: [], root: PR, exp: 'muse' },
];

let fail = 0;
for (const c of cases) {
  const js = projectNameFromLink(c.target, { projects: c.projects, projectsRoot: c.root });
  const py = pyResolve(c.target, c.projects, c.root);
  const parity = js === py;
  const correct = js === c.exp;
  const ok = parity && correct;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.n}${ok ? '' : `  JS=${JSON.stringify(js)} PY=${JSON.stringify(py)} EXP=${JSON.stringify(c.exp)}`}`);
}
// ── [深审补] 默认实参 + LUCA_PROJECTS_ROOT **真 env** 端到端（3/4 生产站点走这条通路，原零覆盖）──
// 原 T4 名为 "[override]" 却只是显式传参；env 通道（模块级 PROJECTS_ROOT + listProjects()）从未被测。
{
  const { mkdtempSync, mkdirSync } = await import('fs');
  const { tmpdir } = await import('os');
  const envRoot = mkdtempSync(join(tmpdir(), 'substrate-env-'));
  mkdirSync(join(envRoot, 'alpha'), { recursive: true });
  mkdirSync(join(envRoot, 'alpha-beta'), { recursive: true });
  const target = `${envRoot}/alpha-beta/docs`;
  const childEnv = { ...process.env, LUCA_PROJECTS_ROOT: envRoot };

  // JS 子进程：不传任何 opts，全靠 env + listProjects()
  const jsCode = `import('${join(REPO, '.claude/hooks/lib/project-substrate.mjs')}').then(m=>{` +
    `process.stdout.write(m.projectNameFromLink(${JSON.stringify(target)})+'\\n'+JSON.stringify(m.listProjects().sort()))})`;
  const jsOut = execFileSync('node', ['--input-type=module', '-e', jsCode], { env: childEnv, encoding: 'utf8' }).trim().split('\n');
  // py 子进程：同样不传参
  const pyOut = execFileSync('python3', ['-c',
    "import sys; sys.path.insert(0,'memory/scripts')\nfrom _project import project_name_from_link, list_projects\n" +
    `print(project_name_from_link(${JSON.stringify(target)}))\nimport json; print(json.dumps(sorted(list_projects())))`,
  ], { cwd: REPO, env: childEnv, encoding: 'utf8' }).trim().split('\n');

  const nameOk = jsOut[0] === 'alpha-beta' && pyOut[0] === 'alpha-beta';
  // 比**解析后的集合**，不比 JSON 字面（py json.dumps 带空格分隔，字面永不相等）
  const listOk = JSON.stringify(JSON.parse(jsOut[1])) === JSON.stringify(JSON.parse(pyOut[1]));
  if (!nameOk) fail++;
  if (!listOk) fail++;
  console.log(`${nameOk ? 'PASS' : 'FAIL'} T20 [env] LUCA_PROJECTS_ROOT 真 env + 默认实参 → JS=${jsOut[0]} PY=${pyOut[0]}（期望 alpha-beta，且不被 alpha 前缀截断）`);
  console.log(`${listOk ? 'PASS' : 'FAIL'} T21 [env] listProjects JS↔py 同集合 → JS=${jsOut[1]} PY=${pyOut[1]}`);
}

console.log(`\n=== test-project-substrate summary: FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
