#!/usr/bin/env node
// FIX-2 单一裁决 round-trip：projectNameFromLink（JS）跨 default/override/嵌套/新项目/legacy 布局
// 解出规范项目名，且与 py 孪生 _project.project_name_from_link **同值**。全 4 marker 站点共用此
// helper，故"4 站在嵌套下解析一致"由本测试对 helper 的裁决直接保证。
import { projectNameFromLink } from '../.claude/hooks/lib/project-substrate.mjs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

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
console.log(`\n=== test-project-substrate summary: PASS=${cases.length - fail} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
