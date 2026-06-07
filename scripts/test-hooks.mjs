#!/usr/bin/env node
// 自成长 hook 回归测试。覆盖 session-sync 的 block/release 模型（HOOK-001/002/005）、
// 三重防循环、V3 tool-count 实质判据、session-restore 兜底提醒、route-guard 规则注入、
// 以及 search_memory 的 --project 作用域过滤（MEM）。
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const projectRoot = process.cwd();
const sessionSyncHook = resolve(projectRoot, '.claude/hooks/session-sync.mjs');
const sessionRestoreHook = resolve(projectRoot, '.claude/hooks/session-restore.mjs');
const routeGuardHook = resolve(projectRoot, '.claude/hooks/route-guard.mjs');
const searchScript = resolve(projectRoot, 'memory/scripts/search_memory.py');

const UTC_TODAY = new Date().toISOString().slice(0, 10);

function makeFixture({
  topic = '"hook-test"',
  statuses = ['IN_PROGRESS', 'DONE'],
  turns = null,
  edits = null,
  tools = null,
  activeProject = null,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-hooks-'));
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });
  mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
  const statusLines = statuses.flatMap((status, index) => [
    `  node-${index + 1}:`,
    `    status: ${status}`,
  ]);
  writeFileSync(
    join(root, '.claude', 'workflow-state.yaml'),
    [`topic: ${topic}`, 'nodes:', ...statusLines, 'iteration: 1', ''].join('\n')
  );
  if (turns != null) writeFileSync(join(root, '.claude', '.session-turn-count'), String(turns));
  if (edits != null) writeFileSync(join(root, '.claude', '.session-edit-count'), String(edits));
  if (tools != null) writeFileSync(join(root, '.claude', '.session-tool-count'), String(tools));
  if (activeProject) {
    // docs 软链指向 .../项目/<name>/docs —— session-sync 据此解析"激活项目"。
    const projDocs = join(root, '项目', activeProject, 'docs');
    mkdirSync(projDocs, { recursive: true });
    symlinkSync(projDocs, join(root, 'docs'));
  }
  return root;
}

function runNode(scriptPath, cwd, { env = {}, input } = {}) {
  const result = spawnSync('node', [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    ...(input != null ? { input } : {}),
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

// ── HOOK-001（critical）：实质工作 → block 路径 stdout 是纯 JSON，旁路文本只在 stderr ──
{
  const root = makeFixture({ turns: 5, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); },
    `block 路径 stdout 必须是可解析的纯 JSON，实际: ${JSON.stringify(result.stdout.slice(0, 80))}`);
  assert.equal(parsed.decision, 'block', 'decision 必须为 block');
  assert.ok(parsed.reason && parsed.reason.length > 0, 'block 必须带 reason');
  assert.doesNotMatch(result.stdout, /已自动写入 checkpoint/, 'checkpoint 提示不得污染 stdout');
  assert.match(result.stderr, /已自动写入 checkpoint/, 'checkpoint 提示必须在 stderr');
  assert.ok(
    readdirSync(join(root, 'docs', 'handoff')).some(n => n.endsWith('-auto-checkpoint.md')),
    '激活项目 + IN_PROGRESS 时应写 checkpoint'
  );
  console.log('PASS HOOK-001 block 路径 stdout 纯 JSON，checkpoint 仅在 stderr');
}

// ── HOOK-001 反面 + HOOK-005：trivial session → release，stdout 空，pending 落 observability ──
{
  const root = makeFixture({ activeProject: 'testproj' }); // 无任何计数 → 非实质
  const result = runNode(sessionSyncHook, root);
  assert.equal(result.stdout, '', 'trivial session 放行时 stdout 必须为空（无 block JSON）');
  assert.ok(
    existsSync(join(root, '.claude', 'observability', 'pending-extraction.md')),
    'release 路径应写 pending-extraction 兜底'
  );
  assert.match(result.stderr, /Session 结束/, '放行信息应在 stderr');
  console.log('PASS release 路径 stdout 为空，pending 兜底落 .claude/observability');
}

// ── HOOK-002（high）：只有 DONE 节点的空 session 不被误拦，无项目不落杂散 checkpoint ──
{
  const root = makeFixture({ topic: '""', statuses: ['DONE', 'DONE'] });
  const result = runNode(sessionSyncHook, root);
  assert.equal(result.stdout, '', 'DONE-only 空 session 必须放行（stdout 空）');
  assert.equal(existsSync(join(root, 'docs')), false, '无激活项目时不得创建 docs/handoff');
  console.log('PASS HOOK-002 DONE-only 空 session 放行且不落 checkpoint');
}

// ── 三重防循环：marker / kill-switch / stop_hook_active 任一命中 → 不 block ──
{
  const base = () => makeFixture({ turns: 5, activeProject: 'testproj' });

  const rMarker = base();
  writeFileSync(join(rMarker, '.claude', `.episode-written-date-${UTC_TODAY}`), '');
  assert.equal(runNode(sessionSyncHook, rMarker).stdout, '', 'marker 命中应放行');

  const rKill = base();
  assert.equal(runNode(sessionSyncHook, rKill, { env: { SESSION_SYNC_BLOCK: '0' } }).stdout, '',
    'kill-switch 应放行');

  const rStop = base();
  assert.equal(runNode(sessionSyncHook, rStop, { input: JSON.stringify({ stop_hook_active: true }) }).stdout, '',
    'stop_hook_active 应放行');

  console.log('PASS 三重防循环（marker / kill-switch / stop_hook_active）均不 block');
}

// ── V3 修复：重 Bash/subagent/MCP、零编辑、少轮次 → tool-count 触发实质判据 → block ──
{
  const root = makeFixture({ turns: 0, edits: 0, tools: 8, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); },
    'tool-count 达阈值时应走 block 路径');
  assert.equal(parsed.decision, 'block', 'tool-count>=阈值的实质 session 必须 block');
  console.log('PASS V3 tool-count 兜住"重操作零编辑少轮次"的实质 session');
}

// ── session-restore：memory-light 启动 + 兜底提醒带上真实 topic（V3 兜底 header 修复）──
{
  const root = makeFixture();
  const reviewMarker = join(root, 'review-candidates-ran.txt');
  writeFileSync(join(root, 'memory', 'scripts', 'get_memory.py'), 'print("summary-only memory loaded")\n');
  writeFileSync(
    join(root, 'memory', 'scripts', 'review_candidates.py'),
    ['from pathlib import Path', `Path(${JSON.stringify(reviewMarker)}).write_text("ran")`, 'print("SHOULD_NOT_RUN")', ''].join('\n')
  );
  writeFileSync(
    join(root, '.claude', 'observability', 'pending-extraction.md'),
    ['# Pending Skill-Rule Extraction', '', '> Topic: 测试主题', '', 'python3 ...', ''].join('\n')
  );

  const result = runNode(sessionRestoreHook, root);

  assert.match(result.stdout, /summary-only memory loaded/, '应跑 get_memory --summary');
  assert.match(result.stdout, /\.claude\/observability\/pending-extraction\.md/, '应提示 pending 文件');
  assert.match(result.stdout, /测试主题/, '兜底提醒应带上 pending 里的真实 topic（> Topic: 修复生效）');
  assert.doesNotMatch(result.stdout, /SHOULD_NOT_RUN/, '启动不得跑候选 review');
  assert.equal(existsSync(reviewMarker), false, 'session-restore 不得运行 semantic 候选 review');
  console.log('PASS session-restore 启动 memory-light，兜底提醒带真实 topic');
}

// ── route-guard：命中 skill 自动注入其活跃规则；无规则则静默 ──
function makeRouteFixture() {
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-route-'));
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, '.claude', 'skill-os'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'observability', 'rules.yaml'),
    ['version: 1', 'rules:', '- id: R-TEST-001', '  status: active', '  severity: medium',
      '  type: quality_rule', '  scope:', '    skills: [alpha]', '    scenes: [*]',
      '  rule: "alpha: 闭环注入回归测试规则"', ''].join('\n')
  );
  writeFileSync(
    join(root, '.claude', 'skill-os', 'skill-routing-map.yaml'),
    ['version: 1', 'project_skills:', '', '  alpha:', '    invoke: "/alpha"', '    weight: 6',
      '    triggers: [对比]', '', '  beta:', '    invoke: "/beta"', '    weight: 6',
      '    triggers: [比较一下]', ''].join('\n')
  );
  return root;
}

function runRouteGuard(cwd, prompt) {
  const env = { ...process.env };
  delete env.ROUTE_GUARD_DRY_RUN;
  const result = spawnSync('node', [routeGuardHook], { cwd, input: JSON.stringify({ prompt }), encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

{
  const result = runRouteGuard(makeRouteFixture(), '对比两个版本');
  assert.match(result.stdout, /建议调用.*\/alpha/, 'should route to alpha');
  assert.match(result.stdout, /📏 alpha 活跃规则/, 'should auto-surface alpha rules at routing time');
  assert.match(result.stdout, /R-TEST-001/, 'should include the matched rule id');
  console.log('PASS route-guard auto-injects active rules for the matched skill');
}

{
  const result = runRouteGuard(makeRouteFixture(), '比较一下两个版本');
  assert.match(result.stdout, /建议调用.*\/beta/, 'should route to beta');
  assert.doesNotMatch(result.stdout, /活跃规则/, 'no rule block for a skill without rules');
  console.log('PASS route-guard stays silent when the matched skill has no rules');
}

// ── MEM：search_memory --project 对 episodic 作用域过滤（含历史无字段记录的 topic 兜底）──
{
  const memRoot = mkdtempSync(join(tmpdir(), 'luca-gstack-mem-'));
  mkdirSync(join(memRoot, 'memory', 'episodic'), { recursive: true });
  const recs = [
    { id: 'EP-1', date: '2026-06-01', topic: 'alpha widget', project: 'alpha', summary: 'did widget work here' },
    { id: 'EP-2', date: '2026-06-01', topic: 'beta dashboard', summary: 'dashboard work done' }, // 无 project 字段
    { id: 'EP-3', date: '2026-06-01', topic: 'gamma report', project: 'gamma', summary: 'report work' },
  ];
  writeFileSync(join(memRoot, 'memory', 'episodic', 'index.jsonl'),
    recs.map(r => JSON.stringify(r)).join('\n') + '\n');

  function runSearch(args) {
    const r = spawnSync('python3', [searchScript, ...args],
      { cwd: projectRoot, encoding: 'utf8', env: { ...process.env, MEMORY_ROOT: memRoot } });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    return r.stdout;
  }

  const withAlpha = runSearch(['work', '--project', 'alpha', '--layer', 'episodic']);
  assert.match(withAlpha, /EP-1/, '--project alpha 应命中带 project=alpha 的记录');
  assert.doesNotMatch(withAlpha, /EP-2/, '应过滤掉无 project 字段且 topic 不含 alpha 的记录');
  assert.doesNotMatch(withAlpha, /EP-3/, '应过滤掉 project=gamma 的记录');

  const bogus = runSearch(['work', '--project', 'zzznope', '--layer', 'episodic']);
  assert.match(bogus, /no matching records/, '不存在的项目应零命中（过滤有区分性）');

  const noFilter = runSearch(['work', '--layer', 'episodic']);
  assert.match(noFilter, /EP-1/);
  assert.match(noFilter, /EP-2/, '不加过滤时 EP-2 应出现 → 证明 --project 真的删掉了它');
  console.log('PASS search_memory --project 作用域过滤有区分性（含历史记录 topic 兜底）');
}

console.log('\nALL HOOK/MEMORY REGRESSION TESTS PASSED');
