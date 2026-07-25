#!/usr/bin/env node
// FIX-2 wiring 集成测试：证明 **4 个 marker 站点真的共用** projectNameFromLink 的 canonical 裁决。
//
// 【2026-07-25 深审修正 — 判别式 fixture】
// 首版 fixture 用 `<tmp>/项目/muse/lucagstack/docs`，但该布局下 canonical ≡ 旧首段正则（都得 "muse"），
// 于是把 session-restore / session-sync / append_episode 改回旧解析测试**仍全绿**（M4/M5 mutant 存活）
// ——4 站里只有 route-guard 有判别力，却据此宣称"非假绿"。
// 现改为**判别式**布局：PROJECTS_ROOT 用 LUCA_PROJECTS_ROOT 覆盖到一个**路径中不含「项目」二字**的根：
//   <tmp>/roots/<PROJ>/<CHECKOUT>/docs
// · 旧首段正则/marker 解析：找不到 `/项目/` → 返回 ''（判别出未接线）
// · canonical：走 projectsRoot 前缀分支 + known-projects 最长前缀 → 返回 <PROJ>
// 因此把任一站点改回旧解析，本测试必红（4 个 mutant 全部可杀）。
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const PROJ = 'zz-ident-probe';   // 哨兵名：绝不会从别处冒出（防兜底正则误匹配路径里的其它词）
const CHECKOUT = 'inner-checkout';

const root = mkdtempSync(join(tmpdir(), 'luca-identity-'));
const altRoot = join(root, 'roots');                       // 注意：路径中**不含**「项目」二字
const nested = join(altRoot, PROJ, CHECKOUT, 'docs');
mkdirSync(nested, { recursive: true });
symlinkSync(nested, join(root, 'docs'));
mkdirSync(join(root, '.claude'), { recursive: true });
mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
writeFileSync(join(root, '.claude', 'workflow-state.yaml'), 'topic: "identity-test"\nnodes:\n  n1:\n    status: DONE\niteration: 1\n');

// hermetic env 白名单：只保留必需项，显式清掉会改变行为的开关（深审：宿主 SESSION_RESTORE_ALWAYS_CLEAR=1
// 会让探针②删掉 fixture 软链，连累③④假红）
const baseEnv = {
  PATH: process.env.PATH, HOME: join(root, 'home'), LANG: process.env.LANG || 'en_US.UTF-8',
  CLAUDE_PROJECT_DIR: root,
  LUCA_PROJECTS_ROOT: altRoot, // 判别式：根不含「项目」
};
mkdirSync(baseEnv.HOME, { recursive: true });

const results = {};
const statuses = {};

// ① route-guard：未绑定 session + 继承标记 → hint 打印「全局激活项目「<readCurrentProject 结果>」」
{
  writeFileSync(join(root, '.claude', '.session-inherited-ident-1'), '');
  const r = spawnSync('node', [join(REPO, '.claude/hooks/route-guard.mjs')], {
    cwd: root, encoding: 'utf8', env: baseEnv,
    input: JSON.stringify({ session_id: 'ident-1', prompt: '帮我看看这段逻辑对不对' }),
  });
  statuses['route-guard'] = r.status;
  const m = ((r.stdout || '') + (r.stderr || '')).match(/全局激活项目「([^」]+)」/);
  results['route-guard'] = m ? m[1] : '(未解析出)';
}

// ② session-restore：stdin 无 source → 保守保留分支打印「保守保留激活项目 <activeProject>」
{
  const r = spawnSync('node', [join(REPO, '.claude/hooks/session-restore.mjs')], {
    cwd: root, encoding: 'utf8', env: baseEnv, input: JSON.stringify({ session_id: 'ident-2' }),
  });
  statuses['session-restore'] = r.status;
  // 边界到中文/半角括号与空白（该行紧跟「（如需清除：…）」，\S+ 会贪婪吞进后缀）
  const m = ((r.stdout || '') + (r.stderr || '')).match(/保守保留激活项目\s*([^\s（(，,。\n]+)/);
  results['session-restore'] = m ? m[1] : '(未解析出)';
}

// ③ session-sync：block reason 里带「当前激活项目「X」」
//    深审修正：计数文件必须带 -<sid> 后缀，否则 hook 读不到 → 永不 block → 该锚点根本不出现
//    （首版靠松散兜底正则 /项目[:：]/ 匹配到别的行才"变绿"，等于探针从未触发目标路径）。
{
  const sid = 'ident-3';
  writeFileSync(join(root, '.claude', `.session-edit-count-${sid}`), '9');
  writeFileSync(join(root, '.claude', `.session-tool-count-${sid}`), '25');
  const r = spawnSync('node', [join(REPO, '.claude/hooks/session-sync.mjs')], {
    cwd: root, encoding: 'utf8', env: baseEnv, input: JSON.stringify({ session_id: sid }),
  });
  statuses['session-sync'] = r.status;
  // 只用主锚点，不留松散兜底（兜底正是首版探针错位无声通过的原因）
  const m = ((r.stdout || '') + (r.stderr || '')).match(/当前激活项目「([^」]+)」/);
  results['session-sync'] = m ? m[1] : '(未解析出)';
}

// ④ append_episode.active_project()
{
  const code = [
    'import importlib.util as ilu',
    `s = ilu.spec_from_file_location('ae', ${JSON.stringify(join(REPO, 'memory/scripts/append_episode.py'))})`,
    'm = ilu.module_from_spec(s)',
    'try:\n    s.loader.exec_module(m)\nexcept SystemExit:\n    pass',
    'print(m.active_project())',
  ].join('\n');
  try {
    const out = execFileSync('python3', ['-c', code], {
      cwd: root, encoding: 'utf8', env: { ...baseEnv, MEMORY_ROOT: root },
    });
    statuses['append_episode'] = 0;
    results['append_episode'] = out.trim().split('\n').pop() || '(空)';
  } catch (e) {
    statuses['append_episode'] = e.status ?? 1;
    results['append_episode'] = '(执行失败)';
  }
}

let fail = 0;
console.log(`判别式 fixture: LUCA_PROJECTS_ROOT=<tmp>/roots（不含「项目」）; docs → …/roots/${PROJ}/${CHECKOUT}/docs`);
console.log(`  · canonical（接线正确）→ "${PROJ}"   · 旧首段/marker 解析（未接线）→ ""（找不到 /项目/ 标记）\n`);
for (const [site, got] of Object.entries(results)) {
  const okStatus = statuses[site] === 0;
  const ok = got === PROJ && okStatus;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${site.padEnd(16)} → ${JSON.stringify(got)}${ok ? '' : `  期望 ${JSON.stringify(PROJ)}（exit=${statuses[site]}；未接线的站点在此 fixture 下解析不出项目名）`}`);
}
const uniq = [...new Set(Object.values(results))];
const consistent = uniq.length === 1;
if (!consistent) fail++;
console.log(`\n${consistent ? 'PASS' : 'FAIL'} 4 站一致性：${consistent ? `全部解析为 ${JSON.stringify(uniq[0])}` : `发散 → ${JSON.stringify(uniq)}`}`);

try { rmSync(root, { recursive: true, force: true }); } catch { }
console.log(`\n=== test-project-identity-wiring summary: ${fail ? `FAIL=${fail}` : 'ALL PASS（4 站 canonical 一致）'} ===`);
process.exit(fail ? 1 : 0);
