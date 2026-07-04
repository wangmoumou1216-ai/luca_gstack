#!/usr/bin/env node
// 自成长 hook 回归测试。覆盖 session-sync 的 block/release 模型（HOOK-001/002/005）、
// 三重防循环、V3 tool-count 实质判据、session-restore 兜底提醒、route-guard 规则注入、
// 以及 search_memory 的 --project 作用域过滤（MEM）。
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const projectRoot = process.cwd();
const sessionSyncHook = resolve(projectRoot, '.claude/hooks/session-sync.mjs');
const sessionRestoreHook = resolve(projectRoot, '.claude/hooks/session-restore.mjs');
const routeGuardHook = resolve(projectRoot, '.claude/hooks/route-guard.mjs');
const sessionEndHook = resolve(projectRoot, '.claude/hooks/session-end.mjs');
const postEditHook = resolve(projectRoot, '.claude/hooks/post-edit.mjs');
const searchScript = resolve(projectRoot, 'memory/scripts/search_memory.py');
const isSymlink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

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

// ── HOOK-001（critical）：实质工作（有文件编辑）→ block 路径 stdout 是纯 JSON，旁路文本只在 stderr ──
{
  const root = makeFixture({ turns: 5, edits: 1, activeProject: 'testproj' });
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
  const base = () => makeFixture({ turns: 5, edits: 1, activeProject: 'testproj' });

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

// ── HOOK-006：纯咨询（多轮、零编辑、少工具）→ 不再当场拦截（release），仅 pending 软兜底 ──
{
  const root = makeFixture({ turns: 6, edits: 0, tools: 2, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root);
  assert.equal(result.stdout, '', '纯咨询(多轮零产出)必须放行，不得 block（轮次不再单独触发拦截）');
  assert.ok(
    existsSync(join(root, '.claude', 'observability', 'pending-extraction.md')),
    '纯咨询 release 仍写 pending 软兜底'
  );
  console.log('PASS HOOK-006 纯咨询多轮零产出放行，不当场拦截');
}

// ── HOOK-007：block reason 为短指针（四信号速记 + 真值源路径 + marker），不再整段注入说明书 ──
{
  const root = makeFixture({ edits: 1, activeProject: 'testproj' });
  const parsed = JSON.parse(runNode(sessionSyncHook, root).stdout);
  assert.equal(parsed.decision, 'block');
  for (const kw of ['默认不存', '明确纠正', '复发', '返工', '候选', 'candidate_feedback_',
    'extraction-bar.md', '写入协议', '.episode-written-']) {
    assert.ok(parsed.reason.includes(kw), `短指针 reason 必须含「${kw}」，实际缺失`);
  }
  assert.ok(parsed.reason.includes('testproj/.luca/memory/MEMORY.md'), '有激活项目时必须注入项目本地落点');
  assert.ok(parsed.reason.length <= 900,
    `reason 必须保持短指针（≤900 字符，实际 ${parsed.reason.length}）——勿回归成全文注入`);

  const pNoProj = JSON.parse(runNode(sessionSyncHook, makeFixture({ edits: 1 })).stdout);
  assert.ok(pNoProj.reason.includes('不带 --project'), '无激活项目时必须提示暂记 episodic 待归位');
  console.log('PASS HOOK-007 block reason 为短指针且长度受控，不整段注入');
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

  // person 层候选提示：GLOBAL_MEMORY_DIR 指向带 1 个 candidate 的临时目录
  const globalDir = mkdtempSync(join(tmpdir(), 'luca-gstack-person-'));
  writeFileSync(join(globalDir, 'candidate_feedback_t.md'), '---\nname: t\ndescription: 测试候选\n---\n');

  const result = runNode(sessionRestoreHook, root, { env: { GLOBAL_MEMORY_DIR: globalDir } });

  assert.match(result.stdout, /summary-only memory loaded/, '应跑 get_memory --summary');
  assert.match(result.stdout, /\.claude\/observability\/pending-extraction\.md/, '应提示 pending 文件');
  assert.match(result.stdout, /测试主题/, '兜底提醒应带上 pending 里的真实 topic（> Topic: 修复生效）');
  assert.doesNotMatch(result.stdout, /SHOULD_NOT_RUN/, '启动不得跑候选 review');
  assert.equal(existsSync(reviewMarker), false, 'session-restore 不得运行 semantic 候选 review');
  assert.match(result.stdout, /1 条 person 记忆候选待裁决/, '有 candidate_feedback 时启动应独立提示');
  console.log('PASS session-restore 启动 memory-light，兜底提醒带真实 topic + person 候选提示');
}

// ── GOV-001：daily_governance 对 person 层只读看护——digest 列候选+软上限，且绝不改全局目录 ──
{
  const memRoot = mkdtempSync(join(tmpdir(), 'luca-gstack-gov-'));
  const globalDir = mkdtempSync(join(tmpdir(), 'luca-gstack-person-'));
  const candBody = '---\nname: gov-t\ndescription: 治理测试候选\n---\n\n正文\n';
  writeFileSync(join(globalDir, 'candidate_feedback_gov-t.md'), candBody);
  writeFileSync(
    join(globalDir, 'MEMORY.md'),
    '# Memory Index\n\n' + Array.from({ length: 21 }, (_, i) => `- [m${i}](f${i}.md) — hook`).join('\n') + '\n'
  );
  const before = readdirSync(globalDir).sort().join(',');

  const r = spawnSync('python3', [resolve(projectRoot, 'memory/scripts/daily_governance.py')], {
    cwd: projectRoot, encoding: 'utf8',
    env: { ...process.env, MEMORY_ROOT: memRoot, GLOBAL_MEMORY_DIR: globalDir },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);

  const digestsDir = join(memRoot, 'memory', 'digests');
  const digestFile = readdirSync(digestsDir).find(f => f.endsWith('.md'));
  assert.ok(digestFile, '治理应写出 digest');
  const digest = readFileSync(join(digestsDir, digestFile), 'utf8');
  assert.match(digest, /person 层候选/, 'digest 应有 person 层候选节');
  assert.match(digest, /candidate_feedback_gov-t\.md/, 'digest 应列出候选文件名与采纳命令');
  assert.match(digest, /软上限.*21 条/, 'MEMORY.md >20 条应触发软上限告警');

  assert.equal(readdirSync(globalDir).sort().join(','), before, '治理必须只读：不得增删/改名全局目录文件');
  assert.equal(readFileSync(join(globalDir, 'candidate_feedback_gov-t.md'), 'utf8'), candBody, '候选文件内容不得被修改');
  console.log('PASS GOV-001 person 层只读看护：digest 列候选+软上限，全局目录零写入');
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

// ── POST-EDIT：自成长「活动信号」Writer —— edit-count 仅文件编辑工具递增、
//    tool-count 任何命中工具递增、framework/ 编辑触发只读警告（此前该 Writer 零覆盖）──
{
  const peHook = resolve(projectRoot, '.claude/hooks/post-edit.mjs');
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-postedit-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  const readCount = (f) => {
    const p = join(root, '.claude', f);
    return existsSync(p) ? parseInt(readFileSync(p, 'utf8'), 10) || 0 : 0;
  };
  const fire = (toolName, filePath) =>
    runNode(peHook, root, {
      env: { CLAUDE_PROJECT_DIR: root },
      input: JSON.stringify({ tool_name: toolName, tool_input: filePath ? { file_path: filePath } : {} }),
    });

  fire('Edit', join(root, 'a.txt'));
  assert.equal(readCount('.session-edit-count'), 1, 'Edit 应使 edit-count=1');
  assert.equal(readCount('.session-tool-count'), 1, 'Edit 应使 tool-count=1');

  fire('Bash');
  assert.equal(readCount('.session-edit-count'), 1, 'Bash 不应递增 edit-count');
  assert.equal(readCount('.session-tool-count'), 2, 'Bash 应使 tool-count=2');

  fire('Write', join(root, 'b.txt'));
  assert.equal(readCount('.session-edit-count'), 2, 'Write 应使 edit-count=2');
  assert.equal(readCount('.session-tool-count'), 3, 'Write 应使 tool-count=3');

  const fw = fire('Write', join(root, 'framework', 'list-page.html'));
  assert.match(fw.stdout, /framework\//, 'framework/ 编辑应触发只读警告');
  console.log('PASS post-edit Writer：edit-count 仅文件编辑递增、tool-count 全工具递增、framework/ 警告');
}

// ── SETTINGS-001：PostToolUse matcher 必须覆盖 Agent（2026-07-04 修复 Task→Agent 工具名漂移）──
// settings.json 此前零测试覆盖；subagent 工具名已从 Task 演化为 Agent，matcher 漏配会让
// 纯 subagent 扇出的 session tool-count 漏计 → session-sync 误判"无实质工作"跳过记忆提取。
{
  const settings = JSON.parse(readFileSync(resolve(projectRoot, '.claude/settings.json'), 'utf8'));
  const matcher = settings.hooks.PostToolUse[0].matcher;
  const re = new RegExp(matcher);
  for (const mustMatch of ['Agent', 'Task', 'Bash', 'Write', 'mcp__figma__use_figma']) {
    assert.ok(re.test(mustMatch), `PostToolUse matcher 必须匹配 ${mustMatch}，当前: ${matcher}`);
  }
  for (const mustNotMatch of ['Read', 'Glob', 'Grep', 'AskUserQuestion']) {
    assert.ok(!re.test(mustNotMatch), `PostToolUse matcher 不应匹配只读工具 ${mustNotMatch}`);
  }
  console.log('PASS SETTINGS-001 PostToolUse matcher 覆盖 Agent+Task，不误匹配只读工具');
}

// ── RULES-001：get_rules.py 真 YAML 解析后行为契约——正常输出格式 + 坏 YAML fail-open ──
{
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-getrules-'));
  mkdirSync(join(root, 'observability', 'scripts'), { recursive: true });
  const getRules = readFileSync(resolve(projectRoot, '.claude/observability/scripts/get_rules.py'), 'utf8');
  writeFileSync(join(root, 'observability', 'scripts', 'get_rules.py'), getRules);
  writeFileSync(join(root, 'observability', 'rules.yaml'), [
    'version: 1',
    'rules:',
    '- id: R-TEST-001',
    '  status: active',
    '  severity: high',
    '  scope:',
    '    skills: [alpha, beta]',
    '    scenes: ["*"]',
    '  rule: "alpha: test rule text"',
    '- id: R-TEST-002',
    '  status: retired',
    '  scope:',
    '    skills: [alpha]',
    '  rule: "retired rule must not surface"',
    '',
  ].join('\n'));
  const runPy = (args) => spawnSync('python3', [join(root, 'observability', 'scripts', 'get_rules.py'), ...args], { encoding: 'utf8' });

  const hit = runPy(['alpha']);
  assert.equal(hit.status, 0);
  assert.match(hit.stdout, /^Applicable rules for alpha:\n- R-TEST-001 \[high\]: alpha: test rule text\n$/,
    `输出格式契约漂移: ${JSON.stringify(hit.stdout)}`);
  const miss = runPy(['gamma']);
  assert.equal(miss.stdout, 'Applicable rules for gamma: none\n');

  writeFileSync(join(root, 'observability', 'rules.yaml'), 'rules:\n  - id: [broken\n    unclosed');
  const broken = runPy(['alpha']);
  assert.equal(broken.status, 0, '坏 YAML 必须 fail-open exit 0');
  assert.equal(broken.stdout, 'Applicable rules for alpha: none\n', '坏 YAML 时按无规则继续');
  assert.match(broken.stderr, /解析失败/, '坏 YAML 须在 stderr 留痕');
  console.log('PASS RULES-001 get_rules.py 输出格式契约 + retired 过滤 + 坏 YAML fail-open');
}

// ══════════════ G2 并发隔离回归（2026-07-04 流程优化）══════════════

// ── CONC-001：post-edit 双 sid 计数隔离——并行 session 互不污染 ──
{
  const peHook = resolve(projectRoot, '.claude/hooks/post-edit.mjs');
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-conc1-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  const fire = (sid, toolName) => runNode(peHook, root, {
    env: { CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: sid, tool_name: toolName, tool_input: { file_path: join(root, 'x.txt') } }),
  });
  fire('sess-A', 'Edit');
  fire('sess-A', 'Edit');
  fire('sess-B', 'Bash');
  const rc = (f) => { try { return parseInt(readFileSync(join(root, '.claude', f), 'utf8'), 10); } catch { return -1; } };
  assert.equal(rc('.session-edit-count-sess-A'), 2, 'A 的 edit-count 应=2');
  assert.equal(rc('.session-tool-count-sess-A'), 2, 'A 的 tool-count 应=2');
  assert.equal(rc('.session-tool-count-sess-B'), 1, 'B 的 tool-count 应=1，不受 A 污染');
  assert.equal(rc('.session-edit-count-sess-B'), -1, 'B 无编辑，不应有 edit-count 文件');
  assert.equal(rc('.session-edit-count'), -1, '有 sid 时不得写 legacy 文件');
  console.log('PASS CONC-001 post-edit 双 sid 计数隔离，互不污染且不落 legacy');
}

// ── CONC-002：session-sync per-sid 读取——A 的实质工作不使 B 被误拦 ──
{
  const root = makeFixture({ activeProject: 'testproj' });
  writeFileSync(join(root, '.claude', '.session-edit-count-sess-A'), '3');
  const rB = runNode(sessionSyncHook, root, { input: JSON.stringify({ session_id: 'sess-B' }) });
  assert.equal(rB.stdout, '', 'B 无自己的计数 → 放行，不得因 A 的编辑被 block');
  const rA = runNode(sessionSyncHook, root, { input: JSON.stringify({ session_id: 'sess-A' }) });
  const parsedA = JSON.parse(rA.stdout);
  assert.equal(parsedA.decision, 'block', 'A 有自己的编辑计数 → block');
  assert.match(parsedA.reason, /\.episode-written-sess-A/, 'A 的解锁 marker 名须带自己的 sid');
  console.log('PASS CONC-002 session-sync 只认本 sid 计数：A 实质 B 放行');
}

// ── CONC-003：session-restore marker/计数器按 mtime GC——只删过期，不删并行 session 的活状态 ──
{
  const root = makeFixture({ activeProject: 'testproj' });
  const cl = join(root, '.claude');
  const old = Date.now() / 1000 - 72 * 3600; // 72h 前
  writeFileSync(join(cl, '.episode-written-oldsess'), '');
  utimesSync(join(cl, '.episode-written-oldsess'), old, old);
  writeFileSync(join(cl, '.episode-written-freshsess'), '');
  writeFileSync(join(cl, '.session-tool-count-freshsess'), '5');
  const oldCounter = join(cl, '.session-tool-count-staleold');
  writeFileSync(oldCounter, '9');
  utimesSync(oldCounter, Date.now() / 1000 - 8 * 24 * 3600, Date.now() / 1000 - 8 * 24 * 3600);
  runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.ok(!existsSync(join(cl, '.episode-written-oldsess')), '>48h 的 marker 应被 GC');
  assert.ok(existsSync(join(cl, '.episode-written-freshsess')), '新鲜 marker 必须保留（并行 session 的守卫）');
  assert.ok(existsSync(join(cl, '.session-tool-count-freshsess')), '新鲜 per-sid 计数必须保留');
  assert.equal(readFileSync(join(cl, '.session-tool-count-freshsess'), 'utf8'), '5', '保留的计数值不得被清零');
  assert.ok(!existsSync(oldCounter), '>7天的 per-sid 计数应被 GC');
  console.log('PASS CONC-003 启动 GC 只删过期状态，绝不清并行 session 的活 marker/计数');
}

// ── CONC-004：digest-shown O_EXCL 抢占——marker 已存在则静默，不重复展示 ──
{
  const root = makeFixture({ activeProject: 'testproj' });
  mkdirSync(join(root, 'memory', 'digests'), { recursive: true });
  writeFileSync(join(root, 'memory', 'digests', '2026-01-01.md'), '# 成长摘要 — 测试digest正文');
  const r1 = runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.match(r1.stdout, /成长摘要 \(2026-01-01\.md/, '首个 session 应展示 digest');
  assert.ok(existsSync(join(root, '.claude', '.digest-shown-2026-01-01')), '展示后应留 marker');
  const r2 = runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.doesNotMatch(r2.stdout, /成长摘要 \(2026-01-01\.md/, '第二个 session 不得重复展示（wx 抢占失败即静默）');
  console.log('PASS CONC-004 digest 展示 O_EXCL 抢占：先到先得，后到静默');
}

// ── CONC-005：governance .checked O_EXCL 认领——已被认领则不再 spawn ──
{
  const root = makeFixture({ activeProject: 'testproj' });
  mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });
  mkdirSync(join(root, 'memory', 'digests'), { recursive: true });
  writeFileSync(join(root, 'memory', 'scripts', 'daily_governance.py'), 'import sys; sys.exit(0)\n');
  const today = UTC_TODAY;
  writeFileSync(join(root, 'memory', 'digests', `.checked-${today}`), '');
  const r = runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.doesNotMatch(r.stderr, /已后台触发每日记忆治理/, '.checked 已存在（他 session 认领）→ 不得重复 spawn');
  const root2 = makeFixture({ activeProject: 'testproj' });
  mkdirSync(join(root2, 'memory', 'scripts'), { recursive: true });
  writeFileSync(join(root2, 'memory', 'scripts', 'daily_governance.py'), 'import sys; sys.exit(0)\n');
  const r2 = runNode(sessionRestoreHook, root2, { env: { CLAUDE_PROJECT_DIR: root2 } });
  assert.match(r2.stderr, /已后台触发每日记忆治理/, '无人认领时应 spawn');
  assert.ok(existsSync(join(root2, 'memory', 'digests', `.checked-${today}`)), 'spawn 方应原子创建 .checked 认领');
  console.log('PASS CONC-005 governance 触发 O_EXCL 认领：单日单 spawn');
}

// ── CONC-006：route-guard 轮次计数 per-sid + pending-extraction per-sid 全链 ──
{
  const root = makeFixture({ activeProject: 'testproj' });
  runNode(routeGuardHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, ROUTE_GUARD_CURRENT_PROJECT: 'testproj' },
    input: JSON.stringify({ session_id: 'sess-R', prompt: '做一个登录页原型' }),
  });
  const turnFile = join(root, '.claude', '.session-turn-count-sess-R');
  assert.ok(existsSync(turnFile), '有 sid 时轮次计数应写 per-sid 文件');
  assert.equal(readFileSync(turnFile, 'utf8'), '1', '首轮应=1');

  // pending per-sid：trivial session 放行时写 pending-extraction-<sid>.md，restore 逐个提醒
  const rSync = runNode(sessionSyncHook, root, { input: JSON.stringify({ session_id: 'sess-R' }) });
  assert.equal(rSync.stdout, '', 'trivial + sid → 放行');
  const pendingFile = join(root, '.claude', 'observability', 'pending-extraction-sess-R.md');
  assert.ok(existsSync(pendingFile), 'pending 应带 sid 后缀');
  const rRestore = runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.match(rRestore.stdout, /pending-extraction-sess-R\.md/, 'restore 应按 glob 提醒 per-sid pending');
  console.log('PASS CONC-006 route-guard 轮次 + pending 全链 per-sid');
}

// ── CONC-007：project.sh 并发 switch——锁串行化 + 原子替换后三链一致、无 tmp 残留 ──
{
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-conc7-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, '.claude', 'templates'), { recursive: true });
  writeFileSync(join(root, '.claude', 'templates', 'workflow-state.yaml'), 'topic: ""\nnodes:\n');
  const projectsRoot = join(root, '项目');
  mkdirSync(projectsRoot, { recursive: true });
  // 复制 project.sh 进 fixture（PROJECT_ROOT 由脚本位置推导=root），只重写 PROJECTS_ROOT 一行
  const scriptSrc = readFileSync(resolve(projectRoot, 'scripts/project.sh'), 'utf8')
    .replace('PROJECTS_ROOT="$HOME/Desktop/项目"', `PROJECTS_ROOT="${projectsRoot}"`);
  const scriptPath = join(root, 'scripts', 'project.sh');
  writeFileSync(scriptPath, scriptSrc, { mode: 0o755 });

  const run = (args) => spawnSync('bash', [scriptPath, ...args], { encoding: 'utf8' });
  assert.equal(run(['new', 'projA']).status, 0, 'new projA 应成功');
  assert.equal(run(['new', 'projB']).status, 0, 'new projB 应成功');

  // 并发 10 次交替 switch + 同时读者探测：readlink 永不悬空（原子替换的核心承诺）
  const stress = spawnSync('bash', ['-c', [
    `set -e`,
    `for i in 1 2 3 4 5; do`,
    `  bash "${scriptPath}" switch projA >/dev/null 2>&1 &`,
    `  bash "${scriptPath}" switch projB >/dev/null 2>&1 &`,
    `done`,
    `for j in $(seq 1 40); do`,
    `  if [ -L "${root}/docs" ]; then readlink "${root}/docs" >/dev/null || echo "DANGLING"; fi`,
    `  sleep 0.05`,
    `done`,
    `wait`,
  ].join('\n')], { encoding: 'utf8' });
  assert.doesNotMatch(stress.stdout, /DANGLING/, '并发 switch 期间 docs 链不得悬空（原子替换）');
  const leftovers = readdirSync(root).filter(f => f.includes('.tmp.'));
  assert.equal(leftovers.length, 0, `不得残留临时链: ${leftovers}`);
  assert.ok(!existsSync(join(root, '.claude', '.project-switch.lock')), '锁目录应已释放');
  // 终态一致性：三链同项目
  const linkTarget = (p) => { try { return readFileSync(join(root, p), 'utf8') && ''; } catch { return ''; } };
  const docsT = spawnSync('readlink', [join(root, 'docs')], { encoding: 'utf8' }).stdout.trim();
  const stateT = spawnSync('readlink', [join(root, '.claude', 'workflow-state.yaml')], { encoding: 'utf8' }).stdout.trim();
  const topicT = spawnSync('readlink', [join(root, '.claude', 'current-topic.txt')], { encoding: 'utf8' }).stdout.trim();
  const projOf = (t) => (t.match(/项目\/([^/]+)\//) || [])[1] || '';
  assert.ok(projOf(docsT) && projOf(docsT) === projOf(stateT) && projOf(docsT) === projOf(topicT),
    `并发 switch 终态三链必须同项目: docs=${docsT} state=${stateT} topic=${topicT}`);
  console.log('PASS CONC-007 project.sh 并发 switch：锁串行化 + 原子替换 + 终态一致');
}

// ══════════════ G6 会话粘性回归（2026-07-04）══════════════
const STICKY = (root, source, sid = 'me', extraEnv = {}) => runNode(sessionRestoreHook, root, {
  env: { CLAUDE_PROJECT_DIR: root, ...extraEnv },
  input: JSON.stringify(source === null ? { session_id: sid } : { source, session_id: sid }),
});

// STICKY-001：source=startup + 无活跃并行 → 清 symlink（原始意图保留）
{
  const root = makeFixture({ activeProject: 'projA' });
  STICKY(root, 'startup');
  assert.ok(!isSymlink(join(root, 'docs')), 'startup + 无并行应清 docs 链');
  console.log('PASS STICKY-001 冷启动无并行 → 清 symlink');
}

// STICKY-002：source=resume → 保留（恢复态清自己上下文是 bug）
{
  const root = makeFixture({ activeProject: 'projA' });
  const r = STICKY(root, 'resume');
  assert.ok(isSymlink(join(root, 'docs')), 'resume 必须保留 docs 链');
  assert.doesNotMatch(r.stdout, /无激活项目/, 'resume 保留态不得谎称无激活项目');
  console.log('PASS STICKY-002 resume → 保留 symlink，不谎称无激活');
}

// STICKY-003：source=startup + 活跃并行（新鲜他-sid 计数）→ 保留 + 明确告知
{
  const root = makeFixture({ activeProject: 'projA' });
  writeFileSync(join(root, '.claude', '.session-tool-count-other'), '3'); // 新鲜=活跃
  const r = STICKY(root, 'startup', 'me');
  assert.ok(isSymlink(join(root, 'docs')), 'startup + 活跃并行应保留');
  assert.match(r.stdout, /当前激活项目: projA（检测到活跃并行/, '应告知保留了激活项目');
  console.log('PASS STICKY-003 冷启动+活跃并行 → 保留 + 告知激活项目');
}

// STICKY-003b：活跃探测排除本 sid 自己（own-sid，R3）——只有自己的计数不算"并行"
{
  const root = makeFixture({ activeProject: 'projA' });
  writeFileSync(join(root, '.claude', '.session-tool-count-me'), '5'); // 本 sid 自己
  STICKY(root, 'startup', 'me');
  assert.ok(!isSymlink(join(root, 'docs')), '只有本 sid 计数不算活跃并行 → 应清');
  console.log('PASS STICKY-003b 活跃探测排除本 sid（own-sid）');
}

// STICKY-003c：legacy 无后缀计数（启动自写）不得被当作活跃并行信号（R3 陷阱）
{
  const root = makeFixture({ activeProject: 'projA' });
  writeFileSync(join(root, '.claude', '.session-tool-count'), '9'); // legacy 无后缀
  STICKY(root, 'startup', 'me');
  assert.ok(!isSymlink(join(root, 'docs')), 'legacy 无后缀计数不是 per-sid，不得挡清理');
  console.log('PASS STICKY-003c legacy 无后缀计数不挡清理');
}

// STICKY-004：悬空链 → 无视保留条件（连 source=resume）直接清（R5 安全 gate）
{
  const root = makeFixture({ activeProject: 'projA' });
  spawnSync('rm', ['-rf', join(root, '项目', 'projA')]); // 删目标目录制造悬空链
  const r = STICKY(root, 'resume'); // resume 本该保留
  assert.ok(!isSymlink(join(root, 'docs')), '悬空链应无视 resume 保留直接清');
  assert.match(r.stderr, /悬空项目链/, '悬空清除应留痕');
  console.log('PASS STICKY-004 悬空链无视保留条件直接清（安全 gate）');
}

// STICKY-005：kill-switch SESSION_RESTORE_ALWAYS_CLEAR=1 → 清（回退旧行为）
{
  const root = makeFixture({ activeProject: 'projA' });
  STICKY(root, 'resume', 'me', { SESSION_RESTORE_ALWAYS_CLEAR: '1' });
  assert.ok(!isSymlink(join(root, 'docs')), 'kill-switch 应无条件清');
  console.log('PASS STICKY-005 kill-switch 回退旧行为（无条件清）');
}

// STICKY-006：source 缺失 → 保留 + canary（安全侧，防 harness 语义漂移静默误清）
{
  const root = makeFixture({ activeProject: 'projA' });
  const r = STICKY(root, null, 'me'); // 不带 source 字段
  assert.ok(isSymlink(join(root, 'docs')), 'source 缺失应保守保留');
  assert.match(r.stderr, /未拿到 source 字段/, 'source 缺失应有 canary 留痕');
  console.log('PASS STICKY-006 source 缺失 → 保留 + canary');
}

// STICKY-007：transcript-mtime 活跃信号（R1）——他-sid transcript 新鲜 → 保留
{
  const root = makeFixture({ activeProject: 'projA' });
  const tdir = mkdtempSync(join(tmpdir(), 'luca-gstack-tx-'));
  writeFileSync(join(tdir, 'other-sid.jsonl'), '{}'); // 新鲜他-sid transcript
  STICKY(root, 'startup', 'me', { SESSION_STICKY_TRANSCRIPT_DIR: tdir });
  assert.ok(isSymlink(join(root, 'docs')), 'transcript 活跃信号应保留（覆盖只读/权限盲区）');
  console.log('PASS STICKY-007 transcript-mtime 活跃信号触发保留');
}

// STICKY-008：pin 继承提示（route-guard）——docs 有链 + 本 sid 无 pin → 首条消息提示继承
{
  const root = makeFixture({ activeProject: 'projA' });
  const r = runNode(routeGuardHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, ROUTE_GUARD_PROJECTS: 'projA' },
    input: JSON.stringify({ session_id: 'sess-I', prompt: '随便说点什么' }),
  });
  assert.match(r.stdout, /继承了激活项目「projA」/, '继承态首条消息应提示');
  assert.ok(existsSync(join(root, '.claude', '.session-project-sess-I')), '应写 pin');
  console.log('PASS STICKY-008 pin 继承提示 + 写 pin');
}

// STICKY-009：SessionEnd 清理本 sid 计数 + pin（R H2 僵尸窗口归零）
{
  const root = makeFixture({});
  const cl = join(root, '.claude');
  for (const f of ['.session-tool-count-gone', '.session-turn-count-gone', '.session-project-gone', '.session-projnag-gone']) {
    writeFileSync(join(cl, f), 'x');
  }
  writeFileSync(join(cl, '.session-tool-count-other'), 'y'); // 他 sid，不应被删
  runNode(sessionEndHook, root, { env: { CLAUDE_PROJECT_DIR: root }, input: JSON.stringify({ session_id: 'gone' }) });
  for (const f of ['.session-tool-count-gone', '.session-turn-count-gone', '.session-project-gone', '.session-projnag-gone']) {
    assert.ok(!existsSync(join(cl, f)), `SessionEnd 应删本 sid 的 ${f}`);
  }
  assert.ok(existsSync(join(cl, '.session-tool-count-other')), 'SessionEnd 不得删他 sid 文件');
  console.log('PASS STICKY-009 SessionEnd 只清本 sid 状态');
}

// STICKY-010：post-edit pin-vs-docs 警告（R7③ 自治运行盲区）
{
  const root = makeFixture({ activeProject: 'projB' }); // docs → projB
  writeFileSync(join(root, '.claude', '.session-project-auto'), 'projA'); // pin=projA，与 docs 不符
  const r = runNode(postEditHook, root, {
    env: { CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: 'auto', tool_name: 'Write', tool_input: { file_path: join(root, 'docs', 'x.md') } }),
  });
  assert.match(r.stdout, /pin 的项目是「projA」，但 docs\/ 当前指向「projB」/, 'pin≠docs 写 docs/ 应告警');
  console.log('PASS STICKY-010 post-edit pin-vs-docs 自治盲区告警');
}

console.log('\nALL HOOK/MEMORY REGRESSION TESTS PASSED');
