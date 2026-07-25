#!/usr/bin/env node
// FIX-2 wiring 集成测试（对应 memroot 的 MEMROOT-WIRING-001）：证明 **4 个 marker 站点真的共用**
// projectNameFromLink 的 canonical 裁决，而不是各自留着旧的 marker 解析。
//
// 判据：造**嵌套** docs 软链 `<root>/项目/<proj>/<checkout>/docs`——
//   · 旧 route-guard（多段 slice）会返回 "<proj>/<checkout>"
//   · 旧 session-restore / session-sync / append_episode（首段正则）会返回 "<proj>"
//   → cross-hook 项目身份分裂。接线后 4 站必须**全部**返回同一 canonical "<proj>"。
// 把任一站点改回旧解析，本测试即变红（mutation 可验）。
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const PROJ = 'muse';           // ∈ known-projects（真实 PROJECTS_ROOT 有 muse）
const CHECKOUT = 'lucagstack'; // ∉ known-projects（在 muse/ 之下）

// fixture：root/项目/muse/lucagstack/docs ← root/docs（嵌套 layout）
const root = mkdtempSync(join(tmpdir(), 'luca-identity-'));
const nested = join(root, '项目', PROJ, CHECKOUT, 'docs');
mkdirSync(nested, { recursive: true });
symlinkSync(nested, join(root, 'docs'));
mkdirSync(join(root, '.claude'), { recursive: true });
mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
writeFileSync(join(root, '.claude', 'workflow-state.yaml'), 'topic: "identity-test"\nnodes:\n  n1:\n    status: DONE\niteration: 1\n');

const baseEnv = { ...process.env, CLAUDE_PROJECT_DIR: root };
delete baseEnv.MEMORY_ROOT; delete baseEnv.ROUTE_GUARD_CURRENT_PROJECT; delete baseEnv.ROUTE_GUARD_PROJECTS;

const results = {};

// ① route-guard：未绑定 session + 继承标记 → hint 打印「全局激活项目「<readCurrentProject 结果>」」
{
  writeFileSync(join(root, '.claude', '.session-inherited-ident-1'), '');
  const r = spawnSync('node', [join(REPO, '.claude/hooks/route-guard.mjs')], {
    cwd: root, encoding: 'utf8', env: baseEnv,
    // prompt 不得含项目名（含则走绑定分支写 pin 而非打印 hint）
    input: JSON.stringify({ session_id: 'ident-1', prompt: '帮我看看这段逻辑对不对' }),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/全局激活项目「([^」]+)」/);
  results['route-guard'] = m ? m[1] : `(未解析出: ${out.slice(0, 140).replace(/\n/g, '⏎')})`;
}

// ② session-restore：stdin 无 source 字段 → 保守保留分支打印「保守保留激活项目 <activeProject>」
{
  const r = spawnSync('node', [join(REPO, '.claude/hooks/session-restore.mjs')], {
    cwd: root, encoding: 'utf8', env: baseEnv, input: JSON.stringify({ session_id: 'ident-2' }),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/保守保留激活项目\s*([^\s（(，,\n]+)/) || out.match(/当前激活项目[:：]\s*([^\s（(，,\n]+)/);
  results['session-restore'] = m ? m[1] : `(未解析出: ${out.slice(0, 140).replace(/\n/g, '⏎')})`;
}

// ③ session-sync：block reason 里带「当前激活项目「X」」
{
  writeFileSync(join(root, '.claude', '.session-edit-count'), '9');
  writeFileSync(join(root, '.claude', '.session-tool-count'), '25');
  const r = spawnSync('node', [join(REPO, '.claude/hooks/session-sync.mjs')], {
    cwd: root, encoding: 'utf8', env: baseEnv, input: JSON.stringify({ session_id: 'ident-3' }),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/当前激活项目「([^」]+)」/) || out.match(/项目[:：]\s*([^\s（(，,\n]+)/);
  results['session-sync'] = m ? m[1] : `(未解析出: ${out.slice(0, 160).replace(/\n/g, '⏎')})`;
}

// ④ append_episode.active_project()：直接调用（MEMORY_ROOT=root 让 ROOT/docs 命中 fixture 软链）
{
  const code = [
    `import sys; sys.path.insert(0, ${JSON.stringify(join(REPO, 'memory', 'scripts'))})`,
    'import importlib.util as ilu',
    `s = ilu.spec_from_file_location('ae', ${JSON.stringify(join(REPO, 'memory/scripts/append_episode.py'))})`,
    'm = ilu.module_from_spec(s)',
    'try:\n    s.loader.exec_module(m)\nexcept SystemExit:\n    pass',
    'print(m.active_project())',
  ].join('\n');
  const out = execFileSync('python3', ['-c', code], {
    cwd: root, encoding: 'utf8', env: { ...baseEnv, MEMORY_ROOT: root },
  });
  results['append_episode'] = out.trim().split('\n').pop();
}

let fail = 0;
console.log(`fixture: docs → …/项目/${PROJ}/${CHECKOUT}/docs（嵌套；canonical 应为 "${PROJ}"）\n`);
for (const [site, got] of Object.entries(results)) {
  const ok = got === PROJ;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${site.padEnd(16)} → ${JSON.stringify(got)}${ok ? '' : `  期望 ${JSON.stringify(PROJ)}（旧多段 slice 会给 "${PROJ}/${CHECKOUT}"）`}`);
}
const uniq = [...new Set(Object.values(results))];
const consistent = uniq.length === 1;
if (!consistent) fail++;
console.log(`\n${consistent ? 'PASS' : 'FAIL'} 4 站一致性：${consistent ? `全部解析为 ${JSON.stringify(uniq[0])}` : `发散 → ${JSON.stringify(uniq)}`}`);
console.log(`\n=== test-project-identity-wiring summary: ${fail ? `FAIL=${fail}` : 'ALL PASS（4 站 canonical 一致）'} ===`);
process.exit(fail ? 1 : 0);
