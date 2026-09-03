#!/usr/bin/env node
// 自成长 hook 回归测试。覆盖 session-sync 的 block/release 模型（HOOK-001/002/005）、
// 三重防循环、V3 tool-count 实质判据、session-restore 兜底提醒、route-guard 规则注入、
// 以及 search_memory 的 --project 作用域过滤（MEM）。
import assert from 'assert/strict';
import { spawnSync } from 'child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { withoutLocalGitEnv } from '../.claude/hooks/lib/git-env.mjs';
import {
  READ_GRANTS_ENABLED,
  authorizeRead,
  grantSetPath,
  reconcilePromptGrants,
  turnWitnessPath,
} from '../.claude/hooks/lib/project-read-grants.mjs';

const projectRoot = process.cwd();
const sessionSyncHook = resolve(projectRoot, '.claude/hooks/session-sync.mjs');
const sessionRestoreHook = resolve(projectRoot, '.claude/hooks/session-restore.mjs');
const routeGuardHook = resolve(projectRoot, '.claude/hooks/route-guard.mjs');
const sessionEndHook = resolve(projectRoot, '.claude/hooks/session-end.mjs');
const postEditHook = resolve(projectRoot, '.claude/hooks/post-edit.mjs');
const projectPinScript = resolve(projectRoot, 'scripts/project-pin.mjs');
const projectLeaseScript = resolve(projectRoot, 'scripts/project-lease.mjs');
const projectScript = resolve(projectRoot, 'scripts/project.sh');
const searchScript = resolve(projectRoot, 'memory/scripts/search_memory.py');
const isSymlink = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

const UTC_TODAY = new Date().toISOString().slice(0, 10);
const FORCE_STOP_ENV = { SESSION_SYNC_FORCE_ON_STOP: '1' };

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
    // docs 软链指向 .../项目/<name>/docs （旧行为遗留：session-sync **不再**据此解析激活项目，改由 TURN_ACTIVE binding 唯一裁决；此处软链只用于构造「有共享展示链但无 pin」的场景）。
    const project = join(root, '项目', activeProject);
    const projDocs = join(project, 'docs');
    mkdirSync(projDocs, { recursive: true });
    mkdirSync(join(project, '.luca'), { recursive: true });
    writeFileSync(join(project, '.luca', 'workflow-state.yaml'), readFileSync(join(root, '.claude', 'workflow-state.yaml')));
    writeFileSync(join(project, '.luca', 'current-topic.txt'), `${activeProject}\n`);
    unlinkSync(join(root, '.claude', 'workflow-state.yaml'));
    symlinkSync(projDocs, join(root, 'docs'));
    symlinkSync(join(project, '.luca', 'workflow-state.yaml'), join(root, '.claude', 'workflow-state.yaml'));
    symlinkSync(join(project, '.luca', 'current-topic.txt'), join(root, '.claude', 'current-topic.txt'));
  }
  return root;
}

function runNode(scriptPath, cwd, { env = {}, input } = {}) {
  // Hermetic env: strip the ambient SESSION_SYNC_BLOCK kill-switch so a dev shell
  // exporting SESSION_SYNC_BLOCK=0 can't leak into block-expecting tests (C11 root
  // cause). The 三重防循环 kill-switch case passes it explicitly via `env`, which
  // still wins in the spread below.
  const baseEnv = { ...process.env };
  delete baseEnv.SESSION_SYNC_BLOCK;
  delete baseEnv.SESSION_SYNC_FORCE_ON_STOP;
  // 同 C11 理由（audit F2-01）：MEMORY_ROOT/GLOBAL_MEMORY_DIR 残留会把 hook 的记忆/治理路径
  // 重定向出测试 fixture；需要它们的测试均已显式经 `env` 传入（spread 仍然生效）。
  delete baseEnv.MEMORY_ROOT;
  delete baseEnv.GLOBAL_MEMORY_DIR;
  for (const key of ['LUCA_ACTUAL_HARNESS', 'LUCA_HARNESS_ADAPTED', 'CODEX_HOME', 'CODEX_SANDBOX', 'CODEX_SESSION_ID']) {
    delete baseEnv[key];
  }
  const result = spawnSync('node', [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: { ...baseEnv, ...env },
    ...(input != null ? { input } : {}),
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function bindActiveTurn(root, project = 'testproj', sid = 'hook-session') {
  const projectsRoot = join(root, 'projects');
  const projectRoot = join(projectsRoot, project);
  mkdirSync(join(projectRoot, 'docs', 'handoff'), { recursive: true });
  mkdirSync(join(projectRoot, '.luca'), { recursive: true });
  const sharedState = join(root, '.claude', 'workflow-state.yaml');
  writeFileSync(join(projectRoot, '.luca', 'workflow-state.yaml'), readFileSync(sharedState));
  writeFileSync(join(projectRoot, '.luca', 'current-topic.txt'), `${project}\n`);
  const st = statSync(projectRoot);
  const binding = { project, epoch: 1, realpath: realpathSync(projectRoot), dev: Number(st.dev), ino: Number(st.ino) };
  writeFileSync(join(root, '.claude', `.session-project-${sid}`), `${JSON.stringify({
    schema_version: 2,
    state: 'TURN_ACTIVE',
    session_id: sid,
    binding,
    turn: { turn_id: `turn-${sid}`, epoch: 1 },
  })}\n`);
  for (const counter of ['turn', 'edit', 'tool']) {
    const legacy = join(root, '.claude', `.session-${counter}-count`);
    if (existsSync(legacy)) writeFileSync(join(root, '.claude', `.session-${counter}-count-${sid}`), readFileSync(legacy));
  }
  return {
    env: { CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projectsRoot },
    input: JSON.stringify({ session_id: sid }),
    projectRoot,
    sid,
  };
}

// ── HOOK-000：Stop 是回合边界，不是 SessionEnd；默认只留 pending，不开启新一轮对话 ──
{
  const root = makeFixture({ turns: 5, edits: 1, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root);
  assert.equal(result.stdout, '', '默认 Stop 不得输出 decision:block 或 hook prompt');
  assert.ok(
    existsSync(join(root, '.claude', 'observability', 'pending-extraction.md')),
    '实质工作应以 pending 形式留待真正收尾处理'
  );
  console.log('PASS HOOK-000 substantive Stop 默认安静放行并留下 pending');
}

// ── HOOK-001（critical）：显式旧强制模式仍保留纯 JSON block 契约 ──
{
  const root = makeFixture({ turns: 5, edits: 1, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root, { env: FORCE_STOP_ENV });
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); },
    `block 路径 stdout 必须是可解析的纯 JSON，实际: ${JSON.stringify(result.stdout.slice(0, 80))}`);
  assert.equal(parsed.decision, 'block', 'decision 必须为 block');
  assert.ok(parsed.reason && parsed.reason.length > 0, 'block 必须带 reason');
  // C4（源自 2026-08-11 WIP 台账 framework-audit/2026-08-20-stash-wip-adjudication.md）：
  // 无 pin 时 reason 必须**自陈**「当前无激活项目」，不得把共享展示链指向的项目当成激活项目
  // 写进提取指令。session-sync 现在只从 TURN_ACTIVE 的 binding 取 project、无软链回退，
  // 但本文件 makeFixture 的注释仍描述着旧的「据软链解析」行为——这两条断言防它被重新引入。
  assert.match(parsed.reason, /当前无激活项目/, 'no-pin 的 reason 必须自陈无激活项目');
  assert.doesNotMatch(parsed.reason, /testproj/, 'no-pin 的 reason 不得出现共享展示链指向的项目名');
  assert.doesNotMatch(result.stdout, /已自动写入 checkpoint/, 'checkpoint 提示不得污染 stdout');
  assert.doesNotMatch(result.stderr, /已自动写入 checkpoint/, 'no-pin 不得沿 shared docs/state 写 checkpoint');
  console.log('PASS HOOK-001 no-pin substantive 仍 block，且 shared project 零读取/零 checkpoint');
}

{
  const root = makeFixture({ turns: 5, edits: 1, activeProject: 'display-only' });
  const active = bindActiveTurn(root, 'testproj');
  const result = runNode(sessionSyncHook, root, {
    ...active,
    env: { ...active.env, ...FORCE_STOP_ENV },
  });
  assert.equal(JSON.parse(result.stdout).decision, 'block');
  assert.match(result.stderr, /已自动写入 checkpoint/);
  assert.ok(readdirSync(join(active.projectRoot, 'docs', 'handoff')).some(n => n.endsWith('-auto-checkpoint.md')));
  assert.equal(existsSync(join(root, '项目', 'display-only', 'docs', 'handoff', `${UTC_TODAY}-auto-checkpoint.md`)), false);
  console.log('PASS HOOK-001 identity-bound TURN_ACTIVE checkpoint 只落 binding project');
}

// ── HOOK-001 反面 + HOOK-005：trivial session → release，stdout 空，且**不写** pending ──
// （audit 2026-07-07 F1-03：trivial 也写 pending 会让每 session 首个 stop 落一个 stub 无限堆积，
//  与 CLAUDE.md「无文件产出且工具调用不足不拦截、不提醒」矛盾。pending 兜底只留给
//  substantive-但-未拦截（kill-switch / stop_hook_active）的情形。）
{
  const root = makeFixture({ activeProject: 'testproj' }); // 无任何计数 → 非实质
  const result = runNode(sessionSyncHook, root);
  assert.equal(result.stdout, '', 'trivial session 放行时 stdout 必须为空（无 block JSON）');
  assert.equal(
    existsSync(join(root, '.claude', 'observability', 'pending-extraction.md')),
    false,
    'trivial session 不得写 pending-extraction（F1-03）'
  );
  assert.match(result.stderr, /回合结束/, '放行信息应在 stderr');
  console.log('PASS release 路径 stdout 为空，trivial 不落 pending（F1-03）');
}

// ── F1-03 正面：substantive + kill-switch → 放行但写 pending 兜底；kill-switch 需 stderr 留痕（F1-02）──
{
  const root = makeFixture({ edits: 1, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root, { env: { ...process.env, SESSION_SYNC_BLOCK: '0' } });
  assert.equal(result.stdout, '', 'kill-switch 下放行 stdout 必须为空');
  assert.ok(
    existsSync(join(root, '.claude', 'observability', 'pending-extraction.md')),
    'substantive + kill-switch 应写 pending-extraction 兜底'
  );
  assert.match(result.stderr, /SESSION_SYNC_BLOCK=0 生效/, 'kill-switch 生效必须 stderr 留痕（F1-02）');
  console.log('PASS substantive+kill-switch 落 pending 且 stderr 留痕（F1-02/F1-03）');
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
  assert.equal(runNode(sessionSyncHook, rMarker, { env: FORCE_STOP_ENV }).stdout, '', 'marker 命中应放行');

  const rKill = base();
  assert.equal(runNode(sessionSyncHook, rKill, { env: { ...FORCE_STOP_ENV, SESSION_SYNC_BLOCK: '0' } }).stdout, '',
    'kill-switch 应放行');

  const rStop = base();
  assert.equal(runNode(sessionSyncHook, rStop, { env: FORCE_STOP_ENV, input: JSON.stringify({ stop_hook_active: true }) }).stdout, '',
    'stop_hook_active 应放行');

  console.log('PASS 三重防循环（marker / kill-switch / stop_hook_active）均不 block');
}

// ── REARM（2026-07-13 M1）：增量重拦——marker 只免"已裁决过的工作量"，大增量再拦一次 ──
{
  const markerName = `.episode-written-date-${UTC_TODAY}`;

  // REARM-001：marker 基线 "1 5"，计数涨到 edits=12（Δ=11≥10）→ 必须再 block，且基线被刷新
  const r1 = makeFixture({ edits: 12, tools: 10, activeProject: 'testproj' });
  writeFileSync(join(r1, '.claude', markerName), '1 5');
  const res1 = runNode(sessionSyncHook, r1, { env: FORCE_STOP_ENV });
  let parsed1;
  assert.doesNotThrow(() => { parsed1 = JSON.parse(res1.stdout); }, '增量超阈值必须走 block 路径');
  assert.equal(parsed1.decision, 'block', '增量重拦必须 block');
  assert.match(parsed1.reason, /Δedit=11/, 'reason 应带增量数字');
  assert.equal(readFileSync(join(r1, '.claude', markerName), 'utf8'), '12 10',
    '拦截前必须刷新基线（防循环承重）');

  // REARM-002 防循环：同一 fixture 立刻再跑（基线已刷新，Δ=0）→ 放行
  assert.equal(runNode(sessionSyncHook, r1, { env: FORCE_STOP_ENV }).stdout, '', '基线刷新后同一增量不得二次拦截');

  // REARM-003 空 marker 补基线：首跑放行且回填计数；计数大涨后再跑 → block
  const r3 = makeFixture({ edits: 3, tools: 4, activeProject: 'testproj' });
  writeFileSync(join(r3, '.claude', markerName), '');
  assert.equal(runNode(sessionSyncHook, r3, { env: FORCE_STOP_ENV }).stdout, '', '空 marker（旧 touch 形态）首跑应放行');
  assert.equal(readFileSync(join(r3, '.claude', markerName), 'utf8'), '3 4', '空 marker 应被回填当前计数为基线');
  writeFileSync(join(r3, '.claude', '.session-edit-count'), '20');
  const res3 = runNode(sessionSyncHook, r3, { env: FORCE_STOP_ENV });
  assert.equal(JSON.parse(res3.stdout).decision, 'block', '回填基线后大增量（Δedit=17）应重拦');

  // REARM-004 关断阀：SESSION_SYNC_REARM=0 时大增量也放行
  const r4 = makeFixture({ edits: 50, tools: 90, activeProject: 'testproj' });
  writeFileSync(join(r4, '.claude', markerName), '1 5');
  assert.equal(runNode(sessionSyncHook, r4, { env: { ...FORCE_STOP_ENV, SESSION_SYNC_REARM: '0' } }).stdout, '',
    'SESSION_SYNC_REARM=0 应关闭增量重拦');

  console.log('PASS REARM 增量重拦：大增量再拦一次 / 基线刷新防循环 / 空 marker 回填 / 关断阀');
}

// ── V3 修复：重 Bash/subagent/MCP、零编辑、少轮次 → tool-count 触发实质判据 → block ──
{
  const root = makeFixture({ turns: 0, edits: 0, tools: 8, activeProject: 'testproj' });
  const result = runNode(sessionSyncHook, root, { env: FORCE_STOP_ENV });
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
  assert.equal(
    existsSync(join(root, '.claude', 'observability', 'pending-extraction.md')),
    false,
    '纯咨询(非 substantive)不得写 pending——与 CLAUDE.md「不拦截、不提醒」对齐（audit F1-03）'
  );
  console.log('PASS HOOK-006 纯咨询多轮零产出放行，不当场拦截也不落 pending');
}

// ── HOOK-007：block reason 为短指针（四信号速记 + 真值源路径 + marker），不再整段注入说明书 ──
{
  const root = makeFixture({ edits: 1, activeProject: 'testproj' });
  const parsed = JSON.parse(runNode(sessionSyncHook, root, { env: FORCE_STOP_ENV }).stdout);
  assert.equal(parsed.decision, 'block');
  for (const kw of ['默认不存', '明确纠正', '复发', '返工', '候选', 'candidate_feedback_',
    'extraction-bar.md', '写入协议', '修源头', '.episode-written-']) {
    assert.ok(parsed.reason.includes(kw), `短指针 reason 必须含「${kw}」，实际缺失`);
  }
  assert.ok(parsed.reason.includes('不带 --project'), '无 pin substantive block 不得借 shared display 推断项目');
  assert.ok(parsed.reason.length <= 900,
    `reason 必须保持短指针（≤900 字符，实际 ${parsed.reason.length}）——勿回归成全文注入`);

  const pNoProj = JSON.parse(runNode(sessionSyncHook, makeFixture({ edits: 1 }), { env: FORCE_STOP_ENV }).stdout);
  assert.ok(pNoProj.reason.includes('不带 --project'), '无激活项目时必须提示暂记 episodic 待归位');
  const activeRoot = makeFixture({ edits: 1, activeProject: 'display-only' });
  const active = bindActiveTurn(activeRoot, 'testproj', 'reason-session');
  const pActive = JSON.parse(runNode(sessionSyncHook, activeRoot, {
    ...active,
    env: { ...active.env, ...FORCE_STOP_ENV },
  }).stdout);
  assert.ok(pActive.reason.includes('testproj/.luca/memory/MEMORY.md'), 'TURN_ACTIVE identity 绑定时必须注入项目本地落点');
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

// ── STARTUP-IDENTITY-N01/N02：NO_PIN 不得读取 shared workflow-state / docs PROGRESS ──
// 两个路径各放一个无 writer 的 FIFO；任何 exists 后 read 都会阻塞并触发 timeout。
for (const which of ['workflow-state', 'progress']) {
  const root = mkdtempSync(join(tmpdir(), `luca-gstack-startup-${which}-`));
  const projectsRoot = join(root, 'projects');
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });
  mkdirSync(projectsRoot, { recursive: true });
  const fifo = which === 'workflow-state'
    ? join(root, '.claude', 'workflow-state.yaml')
    : join(root, 'docs', 'PROGRESS.md');
  mkdirSync(dirname(fifo), { recursive: true });
  const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr || 'mkfifo failed');
  const baseEnv = { ...process.env };
  for (const key of ['LUCA_ACTUAL_HARNESS', 'LUCA_HARNESS_ADAPTED', 'CODEX_HOME', 'CODEX_SANDBOX', 'CODEX_SESSION_ID']) {
    delete baseEnv[key];
  }
  const r = spawnSync('node', [sessionRestoreHook], {
    cwd: root,
    encoding: 'utf8',
    timeout: 1500,
    input: JSON.stringify({ session_id: `sess-NO-PIN-${which}`, source: 'resume' }),
    env: {
      ...baseEnv,
      CLAUDE_PROJECT_DIR: root,
      LUCA_GSTACK_ROOT: root,
      LUCA_PROJECTS_ROOT: projectsRoot,
      MEMORY_ROOT: root,
    },
  });
  assert.notEqual(r.error?.code, 'ETIMEDOUT', `NO_PIN startup 不得读取 shared ${which} FIFO`);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  console.log(`PASS STARTUP-IDENTITY-${which === 'workflow-state' ? 'N01' : 'N02'} NO_PIN 对 shared ${which} 零读取`);
}

{
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-startup-bad-epoch-'));
  const projectsRoot = join(root, 'projects');
  const project = join(projectsRoot, 'alpha');
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(join(root, 'memory', 'scripts'), { recursive: true });
  mkdirSync(join(project, '.luca'), { recursive: true });
  mkdirSync(join(project, 'docs'), { recursive: true });
  const fifo = join(project, '.luca', 'workflow-state.yaml');
  const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr || 'mkfifo failed');
  const st = statSync(project);
  const binding = { project: 'alpha', epoch: 4, realpath: realpathSync(project), dev: Number(st.dev), ino: Number(st.ino) };
  writeFileSync(join(root, '.claude', '.session-project-sess-BAD-EPOCH'), `${JSON.stringify({
    schema_version: 2,
    state: 'TURN_ACTIVE',
    session_id: 'sess-BAD-EPOCH',
    binding,
    turn: { turn_id: 'turn-bad', epoch: 3 },
  })}\n`);
  const r = spawnSync('node', [sessionRestoreHook], {
    cwd: root,
    encoding: 'utf8',
    timeout: 1500,
    input: JSON.stringify({ session_id: 'sess-BAD-EPOCH', source: 'resume' }),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
      LUCA_GSTACK_ROOT: root,
      LUCA_PROJECTS_ROOT: projectsRoot,
      MEMORY_ROOT: root,
    },
  });
  assert.notEqual(r.error?.code, 'ETIMEDOUT', 'corrupt turn epoch must be rejected before bound workflow FIFO read');
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stderr, /identity 无效|epoch snapshot/, 'corrupt epoch rejection must stay visible');
  console.log('PASS STARTUP-IDENTITY-N03 corrupt turn epoch 不加载项目上下文');
}

// ── GOV-001：daily_governance 对 person 层只读看护——digest 列候选+软上限，且绝不改全局目录 ──
{
  const memRoot = mkdtempSync(join(tmpdir(), 'luca-gstack-gov-'));
  const globalDir = mkdtempSync(join(tmpdir(), 'luca-gstack-person-'));
  const candBody = '---\nname: gov-t\ndescription: 治理测试候选\n---\n\n正文\n';
  writeFileSync(join(globalDir, 'candidate_feedback_gov-t.md'), candBody);
  // 索引预算门按**字符**不按条数（2026-08-15）：条数与注入成本不是一回事——真实索引里
  // 18 条 >300 字符的行就占了总字符的 62%。fixture 因此要造出「超字符预算」而非「超条数」，
  // 并额外造一条含「并入」标注的行来验合并落点提醒。
  const fatHook = 'x'.repeat(320);
  writeFileSync(
    join(globalDir, 'MEMORY.md'),
    '# Memory Index\n\n'
    + Array.from({ length: 21 }, (_, i) => `- [m${i}](f${i}.md) — ${fatHook}`).join('\n')
    + `\n- [merged](fm.md) — ${fatHook}（并入 [[f0]]）\n`
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
  assert.match(digest, /索引预算：MEMORY\.md 索引 22 条 \/ \d+ 字符/, '超字符预算应触发索引预算门');
  assert.match(digest, /最肥 5 条：/, '预算门必须点名最肥的条目（只说"建议修剪"落不到动作）');
  assert.match(digest, /合并落点：1 条索引行带「并入」标注/, '含「并入」的索引行应触发合并落点提醒');
  assert.match(digest, /记忆注入成本/, 'digest 应含注入成本度量节（治理成败判据）');
  assert.match(digest, /person 层候选（全局个人记忆，只读看护）/, 'person 块应在「待你裁决」节内');
  // 顺序断言：person 块必须是「待你裁决」下的**第一个**子块——预览是 40 行硬帽，
  // 排在后面等于永不可见（实测 58% 的队列从未进入注入面，而 100% 不可见的正是 person 块）。
  // 写成「第一个」而非「早于某块」：后者在对照块缺席时 indexOf 返回 -1，顺序比较被静默跳过
  // ——断言没跑到会被计成绿（本 fixture 2026-08-15 实证过一次，变异不转红）。
  // 本 fixture 的 memRoot 是空临时目录、没有 memory/scripts，consolidate 子进程跑不起来，
  // 因此 awaiting/stale 块恒缺席；只有「第一个子块」这个写法在此仍然可判。
  const decideIdx = digest.indexOf('## ⏳ 待你裁决');
  assert.notEqual(decideIdx, -1, 'digest 应有「待你裁决」节');
  const subBlocks = digest.slice(decideIdx).split('\n').filter(l => l.startsWith('**'));
  assert.ok(subBlocks.length > 0, 'fixture 必须产出至少一个子块，否则顺序断言无从判定');
  assert.match(subBlocks[0], /person 层候选/,
    'person 块必须是「待你裁决」下的第一个子块（40 行预览硬帽下的可见性）');

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

// ── POST-EDIT/FW-TRIPWIRE（2026-09-03）：PreToolUse 按 shell 写语法认写入，**解释器中转的
//    母版写入它在文本层看不见**（实测 python3 -c / node -e / patch 读文件 / bash 脚本 四种全部
//    放行），故 post-edit 按 git 实际状态事后兜底。四条断言缺一不可：干净不吵、脏了告警、
//    同一状态不重复吵（会被无视的告警等于没有）、显式豁免期间闭嘴。──
{
  // PE_HOOK_UNDER_TEST：显式注入口，专供隔离变异夹具（同 PSG_HOOK_UNDER_TEST 的用法）——
  // 把 post-edit.mjs 连同 hooks/lib 拷到临时目录后指向副本，即可在**不碰活体钩子**的前提下
  // 做变异测试。本 hook 静态 import ./lib/git-env.mjs，只拷单文件会直接崩，务必连 lib 一起拷。
  const peHook = process.env.PE_HOOK_UNDER_TEST || resolve(projectRoot, '.claude/hooks/post-edit.mjs');
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-fwtrip-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(root, 'framework'), { recursive: true });
  const master = join(root, 'framework', 'shared-head.html');
  writeFileSync(master, '<head>母版</head>\n');
  // 夹具自身必须与外层仓解绑：继承 GIT_DIR 会让 git init 绑到外层仓，断言整齐地读出假结果。
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', env: withoutLocalGitEnv() });
  git('init', '-q');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'fixture');
  git('add', '-A');
  git('commit', '-qm', 'seed master');
  assert.equal(git('status', '--porcelain', '--', 'framework').stdout.trim(), '', '夹具自检：seed 后母版必须干净');
  const fireBash_env = (extra = {}) => runNode(peHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, ...extra },
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'true' } }),
  });
  const fireBash = () => fireBash_env();

  assert.doesNotMatch(fireBash().stdout, /只读母版出现未提交改动/, '母版干净时不应告警');
  writeFileSync(master, '<head>被解释器改过</head>\n');   // 不经任何 shell 写语法
  assert.match(fireBash().stdout, /只读母版出现未提交改动/, '母版被改后必须告警');
  assert.doesNotMatch(fireBash().stdout, /只读母版出现未提交改动/, '同一状态不得重复告警');

  // GIT_* 污染下仍须报警：继承外层仓的 GIT_DIR 会让子 git 读错仓库、告警静默消失。
  // 这条断言专钉 withoutLocalGitEnv()，去掉隔离即转红（变异实测）。
  const poison = join(root, 'poison-git-dir');
  mkdirSync(poison, { recursive: true });
  writeFileSync(master, '<head>污染环境下再改</head>\n');
  writeFileSync(join(root, 'framework', 'extra-a.html'), 'x\n');   // 让 porcelain 串真的变化
  assert.match(fireBash_env({ GIT_DIR: poison }).stdout, /只读母版出现未提交改动/,
    'GIT_* 污染下母版被改仍须告警（子 git 必须与外层仓解绑）');

  // 豁免闭嘴（两个口子各测一次，与 PreToolUse 的 frameworkEscapeActive() 同语义）。
  // 每次都必须让 porcelain 串**确实变化**，否则会被上面的水位短路挡住、断言恒真
  // （变异实测：改同一个文件两次，porcelain 输出一模一样，豁免判据去掉也不转红）。
  writeFileSync(join(root, 'framework', 'extra-b.html'), 'y\n');
  assert.doesNotMatch(fireBash_env({ ALLOW_FRAMEWORK_WRITE: '1' }).stdout, /只读母版出现未提交改动/,
    'ALLOW_FRAMEWORK_WRITE=1 期间不应告警');
  writeFileSync(join(root, 'framework', 'extra-c.html'), 'z\n');
  writeFileSync(join(root, '.claude', '.allow-framework-write'), '');
  assert.doesNotMatch(fireBash().stdout, /只读母版出现未提交改动/, '显式豁免开关期间不应告警');
  console.log('PASS post-edit framework tripwire：干净不吵/脏了告警/不重复吵/污染仍报/两个豁免口都闭嘴');
}

// ── POST-EDIT/FSMONITOR-RCE（2026-09-03 post-seal 增量审计 finding #6）：tripwire 探针跑的
//    是普通 `git status`，会尊重仓库本地 core.fsmonitor 配置——一个恶意 fsmonitor 程序因此能
//    借"只读检测"之名任意执行。修复=给探针加 `-c core.fsmonitor=false`；同一处顺带把恢复文案
//    从会连坐清掉不相关未提交改动的 `git checkout -- framework` 换成先 inspect 再由人确认。
//    两条断言缺一不可：RCE 关闭 **且** 脏检测本身不受影响（否则"修复"等于连告警一起哑掉）。
{
  const peHook = process.env.PE_HOOK_UNDER_TEST || resolve(projectRoot, '.claude/hooks/post-edit.mjs');
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-fsmonitor-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(root, 'framework'), { recursive: true });
  writeFileSync(join(root, 'framework', 'master.html'), 'seed\n');
  const marker = join(root, 'fsmonitor-executed');
  const monitor = join(root, 'malicious-fsmonitor.sh');
  writeFileSync(monitor, `#!/bin/sh\ntouch '${marker}'\nprintf '\\n'\n`);
  chmodSync(monitor, 0o755);
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', env: withoutLocalGitEnv() });
  git('init', '-q');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'fixture');
  git('add', '-A');
  git('commit', '-qm', 'seed');
  git('config', 'core.fsmonitor', monitor);
  writeFileSync(join(root, 'framework', 'master.html'), 'dirty\n');
  const post = runNode(peHook, root, {
    env: { CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'true' } }),
  });
  assert.equal(existsSync(marker), false,
    '恶意 core.fsmonitor 绝不能被 tripwire 的 git status 探针执行（RCE）');
  assert.match(post.stdout, /只读母版出现未提交改动/, '中和 fsmonitor 后脏检测本身必须仍然生效');
  assert.match(post.stdout, /git status --short -- framework/, '恢复文案必须先教用户 inspect 再动手');
  assert.doesNotMatch(post.stdout, /git checkout -- framework/, '恢复文案不得再建议无条件清空 framework/（会连坐未跟踪/无关改动）');
  console.log('PASS post-edit fsmonitor RCE 已中和 + 脏检测保留 + 恢复文案改为先 inspect');
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

// ── SETTINGS-002：hooks 布线契约（S22 手法延伸，2026-07-14）——六 hook 挂对事件 + README §8 表
//    与真实布线一致。背景：README 曾把 project-scope-guard 写成 PostToolUse、session-end 写成
//    Stop（重定向必须在工具执行前，写错是语义级误导），手写表零机检漂移了未知时长。
//    本块两仓逐字一致：fork 专属断言（HEAVY set 注入）以 muse-loop-orchestrate skill 目录存在与否条件化。
{
  const settings = JSON.parse(readFileSync(resolve(projectRoot, '.claude/settings.json'), 'utf8'));
  const wiring = {
    SessionStart: 'session-restore.mjs',
    UserPromptSubmit: 'route-guard.mjs',
    PreToolUse: 'project-scope-guard.mjs',
    PostToolUse: 'post-edit.mjs',
    Stop: 'session-sync.mjs',
    SessionEnd: 'session-end.mjs',
  };
  for (const [event, script] of Object.entries(wiring)) {
    const entries = settings.hooks[event];
    assert.ok(entries && entries.length, `settings.json 必须有 ${event} hook`);
    const cmds = entries.flatMap(e => e.hooks.map(h => h.command)).join('\n');
    assert.ok(cmds.includes(script), `${event} 必须挂 ${script}，实际: ${cmds}`);
  }
  // PreToolUse matcher 必须覆盖读写与 Bash（重定向/deny 的作用面）
  const preRe = new RegExp(settings.hooks.PreToolUse[0].matcher);
  for (const t of ['Write', 'Edit', 'Read', 'Bash', 'Grep', 'Glob']) {
    assert.ok(preRe.test(t), `PreToolUse matcher 必须匹配 ${t}`);
  }
  // muse-loop-orchestrate 在场时 HEAVY set 必须经 tracked env 块注入（PLAN_CHECK 双保险；
  // 2026-07-16 B2 合并起从行内前缀升级为 settings.env——两检出一致生效，无本地配置可丢）
  if (existsSync(resolve(projectRoot, '.claude/skills/office/muse-loop-orchestrate'))) {
    assert.match(settings.env?.ROUTE_GUARD_HEAVY_SKILLS ?? '', /(^|,)muse-loop-orchestrate(,|$)/,
      'settings.json env 块必须注入 muse-loop-orchestrate 进 ROUTE_GUARD_HEAVY_SKILLS');
  }
  // auto 截流实验不变量（2026-08-03，60 天盒到期 2026-10-02）：实验期内 HEAVY 集不得含 auto——
  // 否则实验静默失效且无人发现（复盘会把截流期的零使用误读为需求侧结论）。
  // 实验结束后按复盘裁决删除或反转本断言。
  assert.doesNotMatch(settings.env?.ROUTE_GUARD_HEAVY_SKILLS ?? '', /(^|,)auto(,|$)/,
    'auto 截流实验期内不得回到 ROUTE_GUARD_HEAVY_SKILLS（见 plan-agent.md 实验记录）');
  // README §8 表的「时机」行不得与真实布线矛盾
  const readme = readFileSync(resolve(projectRoot, 'README.md'), 'utf8');
  for (const [row, script] of [
    ['PreToolUse', 'project-scope-guard'],
    ['PostToolUse', 'post-edit'],
    ['Stop', 'session-sync'],
    ['SessionEnd', 'session-end'],
  ]) {
    assert.ok(new RegExp(`\\|\\s*\\*\\*${row}\\*\\*\\s*\\|\\s*${script}`).test(readme),
      `README §8 表 ${row} 行必须挂 ${script}（布线↔文档契约）`);
  }
  console.log('PASS SETTINGS-002 hooks 布线契约：六事件挂对脚本 + README §8 表一致');
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
  const rB = runNode(sessionSyncHook, root, { env: FORCE_STOP_ENV, input: JSON.stringify({ session_id: 'sess-B' }) });
  assert.equal(rB.stdout, '', 'B 无自己的计数 → 放行，不得因 A 的编辑被 block');
  const rA = runNode(sessionSyncHook, root, { env: FORCE_STOP_ENV, input: JSON.stringify({ session_id: 'sess-A' }) });
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
  const identity = bindActiveTurn(root, 'identity-project', 'identity-old');
  const identityPath = join(cl, '.session-project-identity-old');
  utimesSync(identityPath, Date.now() / 1000 - 30 * 24 * 3600, Date.now() / 1000 - 30 * 24 * 3600);
  runNode(sessionRestoreHook, root, { env: identity.env, input: JSON.stringify({ session_id: 'identity-old', source: 'resume' }) });
  assert.ok(!existsSync(join(cl, '.episode-written-oldsess')), '>48h 的 marker 应被 GC');
  assert.ok(existsSync(join(cl, '.episode-written-freshsess')), '新鲜 marker 必须保留（并行 session 的守卫）');
  assert.ok(existsSync(join(cl, '.session-tool-count-freshsess')), '新鲜 per-sid 计数必须保留');
  assert.equal(readFileSync(join(cl, '.session-tool-count-freshsess'), 'utf8'), '5', '保留的计数值不得被清零');
  assert.ok(!existsSync(oldCounter), '>7天的 per-sid 计数应被 GC');
  assert.ok(existsSync(identityPath), 'identity 无 generation/liveness 证明，不得仅按 mtime 偷删');
  console.log('PASS CONC-003 启动 GC 只删可证明过期的临时状态，identity 不按年龄偷删');
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
  // 2026-07-15 记忆层评审 C4：🌱 触发通知从 stderr（死信日志）迁到 stdout（用户可见通道）
  const r = runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.doesNotMatch(r.stdout + r.stderr, /已后台触发每日记忆治理/, '.checked 已存在（他 session 认领）→ 不得重复 spawn');
  const root2 = makeFixture({ activeProject: 'testproj' });
  mkdirSync(join(root2, 'memory', 'scripts'), { recursive: true });
  writeFileSync(join(root2, 'memory', 'scripts', 'daily_governance.py'), 'import sys; sys.exit(0)\n');
  const r2 = runNode(sessionRestoreHook, root2, { env: { CLAUDE_PROJECT_DIR: root2 } });
  assert.match(r2.stdout, /已后台触发每日记忆治理/, '无人认领时应 spawn（通知走 stdout 用户可见通道）');
  assert.ok(existsSync(join(root2, 'memory', 'digests', `.checked-${today}`)), 'spawn 方应原子创建 .checked 认领');
  console.log('PASS CONC-005 governance 触发 O_EXCL 认领：单日单 spawn（通知在 stdout）');
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

  // pending per-sid：substantive-但-未拦截（kill-switch）时写 pending-extraction-<sid>.md，restore 逐个提醒
  //（F1-03 后 trivial 不再写 pending，这里用 edit-count + kill-switch 构造软兜底路径）
  writeFileSync(join(root, '.claude', '.session-edit-count-sess-R'), '1');
  const rSync = runNode(sessionSyncHook, root, {
    input: JSON.stringify({ session_id: 'sess-R' }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, SESSION_SYNC_BLOCK: '0' },
  });
  assert.equal(rSync.stdout, '', 'kill-switch + sid → 放行');
  const pendingFile = join(root, '.claude', 'observability', 'pending-extraction-sess-R.md');
  assert.ok(existsSync(pendingFile), 'pending 应带 sid 后缀');
  const rRestore = runNode(sessionRestoreHook, root, { env: { CLAUDE_PROJECT_DIR: root } });
  assert.match(rRestore.stdout, /pending-extraction-sess-R\.md/, 'restore 应按 glob 提醒 per-sid pending');
  console.log('PASS CONC-006 route-guard 轮次 + pending 全链 per-sid');
}

// ── CONC-007：project.sh 并发 switch——锁串行化 + 原子替换后三链一致、无 tmp 残留 ──
{
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-conc7-'));
  mkdirSync(join(root, '.claude', 'templates'), { recursive: true });
  writeFileSync(join(root, '.claude', 'templates', 'workflow-state.yaml'), 'topic: ""\nnodes:\n');
  const projectsRoot = join(root, 'projects');
  mkdirSync(projectsRoot, { recursive: true });
  for (const name of ['projA', 'projB']) {
    mkdirSync(join(projectsRoot, name, 'docs'), { recursive: true });
    mkdirSync(join(projectsRoot, name, '.luca'), { recursive: true });
    writeFileSync(join(projectsRoot, name, '.luca', 'workflow-state.yaml'), `topic: ${name}\n`);
    writeFileSync(join(projectsRoot, name, '.luca', 'current-topic.txt'), name);
  }
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projectsRoot };
  const prep = (sid, target) => {
    const r = spawnSync('node', [projectPinScript, 'prepare', '--session', sid, '--operation', 'switch', '--target', target, '--turn-id', `turn-${sid}`], { env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  const pA = prep('conc-A', 'projA');
  const pB = prep('conc-B', 'projB');
  const cmd = (sid, target, p) => `bash ${JSON.stringify(projectScript)} switch ${target} --session-id ${sid} --tx ${p.tx} --expected-epoch ${p.expected_epoch}`;
  const stress = spawnSync('bash', ['-c', `${cmd('conc-A', 'projA', pA)} &\n${cmd('conc-B', 'projB', pB)} &\nwait`], { env, encoding: 'utf8' });
  assert.equal(stress.status, 0, stress.stderr || stress.stdout);
  assert.ok(!existsSync(join(root, '.claude', '.project-switch.lock')), '锁目录应已释放');
  // 终态一致性：三链同项目
  const linkTarget = (p) => { try { return readFileSync(join(root, p), 'utf8') && ''; } catch { return ''; } };
  const docsT = spawnSync('readlink', [join(root, 'docs')], { encoding: 'utf8' }).stdout.trim();
  const stateT = spawnSync('readlink', [join(root, '.claude', 'workflow-state.yaml')], { encoding: 'utf8' }).stdout.trim();
  const topicT = spawnSync('readlink', [join(root, '.claude', 'current-topic.txt')], { encoding: 'utf8' }).stdout.trim();
  const projOf = (t) => (t.match(/projects\/([^/]+)\//) || [])[1] || '';
  assert.ok(projOf(docsT) && projOf(docsT) === projOf(stateT) && projOf(docsT) === projOf(topicT),
    `并发 switch 终态三链必须同项目: docs=${docsT} state=${stateT} topic=${topicT}`);
  console.log('PASS CONC-007 project.sh 并发 switch：锁串行化 + 原子替换 + 终态一致');
}

// ── CONC-008：startup clear 与 switch 共用 global lease，lease 忙时绝不拆 display tuple ──
{
  const root = makeFixture({ activeProject: 'projA' });
  const links = [join(root, 'docs'), join(root, '.claude', 'workflow-state.yaml'), join(root, '.claude', 'current-topic.txt')];
  const before = links.map(path => spawnSync('readlink', [path], { encoding: 'utf8' }).stdout.trim());
  const acquired = spawnSync('node', [projectLeaseScript, 'acquire', '--root', root, '--owner-token', 'switch-in-flight', '--pid', String(process.pid)], {
    cwd: projectRoot, encoding: 'utf8', env: process.env,
  });
  assert.equal(acquired.status, 0, acquired.stderr);
  const held = JSON.parse(acquired.stdout);
  const restore = runNode(sessionRestoreHook, root, {
    env: { CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: 'startup-racer', source: 'startup' }),
  });
  assert.match(restore.stderr, /未清理|live owner|lease/, 'lease busy 必须 fail-visible 且保守不清');
  const after = links.map(path => spawnSync('readlink', [path], { encoding: 'utf8' }).stdout.trim());
  assert.deepEqual(after, before, 'startup clear 不得与持锁 switch 互踩或拆散三链');
  const released = spawnSync('node', [projectLeaseScript, 'release', '--root', root, '--handle-json', JSON.stringify(held.owner_handle)], {
    cwd: projectRoot, encoding: 'utf8', env: process.env,
  });
  assert.equal(released.status, 0, released.stderr);
  console.log('PASS CONC-008 startup clear 与 switch 共用 lease，忙时 display tuple 保持原样');
}

// ── CONC-009：startup clear 已提交后 release-before-rename 失败，不得谎报 clear 失败/诱发重试 ──
{
  const root = makeFixture({ activeProject: 'projA' });
  const restore = runNode(sessionRestoreHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, LUCA_PROJECT_LEASE_FAULT: 'before-release-rename' },
    input: JSON.stringify({ session_id: 'startup-release-fault', source: 'startup' }),
  });
  assert.ok(!isSymlink(join(root, 'docs')), 'release 失败发生在 clear commit 之后，display tuple 应保持已清理');
  assert.match(restore.stderr, /startup clear 已完成.*lease 释放失败.*禁止重试 clear/);
  const inspected = spawnSync('node', [projectLeaseScript, 'inspect', '--root', root], {
    cwd: projectRoot, encoding: 'utf8', env: process.env,
  });
  assert.equal(inspected.status, 0, inspected.stderr);
  const held = JSON.parse(inspected.stdout);
  assert.equal(held.owner_alive, false);
  const recovered = spawnSync('node', [projectLeaseScript, 'recover', '--root', root, '--handle-json', JSON.stringify(held.owner_handle)], {
    cwd: projectRoot, encoding: 'utf8', env: process.env,
  });
  assert.equal(recovered.status, 0, recovered.stderr);
  console.log('PASS CONC-009 startup clear commit 后 lease release 失败保持成功语义并可 exact recovery');
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

// STICKY-006b：未知非空 source（如 harness 把 'startup' 改名）→ 保留 + canary（A1 加固，决策红队）
{
  const root = makeFixture({ activeProject: 'projA' });
  const r = STICKY(root, 'launch', 'me'); // 'launch' = 假设的改名值，非 startup/resume/clear/compact
  assert.ok(isSymlink(join(root, 'docs')), '未知 source 应保守保留（不静默走冷启动清除）');
  assert.match(r.stderr, /source 值未知/, '未知 source 应有 canary 警告，不得静默保留');
  console.log('PASS STICKY-006b 未知 source → 保留 + canary（堵 A1 改名盲区）');
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

// STICKY-007b：真走【生产路径】——用 payload 的 transcript_path 定位 transcript 目录（不靠 env 覆盖）。
// 决策红队 killer：原 STICKY-007 靠 SESSION_STICKY_TRANSCRIPT_DIR 覆盖，从不走生产推导，掩盖了
// projectRoot.replace(/\//g,'-') 只换斜杠不换下划线的笔误（真实 CC 目录 luca_gstack→luca-gstack），
// 导致 transcript 信号在生产环境静默失效却测试全绿。本用例强制走 payload.transcript_path 分支。
{
  const root = makeFixture({ activeProject: 'projA' });
  const tdir = mkdtempSync(join(tmpdir(), 'luca-gstack-tx-'));
  writeFileSync(join(tdir, 'other-sid.jsonl'), '{}'); // 新鲜他-sid transcript（活跃并行）
  writeFileSync(join(tdir, 'me.jsonl'), '{}');        // 本 session transcript，transcript_path 指向它
  const r = runNode(sessionRestoreHook, root, {
    env: { CLAUDE_PROJECT_DIR: root }, // 不设 SESSION_STICKY_TRANSCRIPT_DIR，强制走生产路径
    input: JSON.stringify({ source: 'startup', session_id: 'me', transcript_path: join(tdir, 'me.jsonl') }),
  });
  assert.ok(isSymlink(join(root, 'docs')), 'payload.transcript_path 应让生产路径正确定位 transcript 目录 → 保留');
  console.log('PASS STICKY-007b 生产路径经 transcript_path 定位（不靠 env 覆盖，堵假绿）');
}

// STICKY-008：继承 display marker 不得成为生产 identity；普通对话也不得因此制造 gate。
{
  const root = makeFixture({ activeProject: 'projA' });
  writeFileSync(join(root, '.claude', '.session-inherited-sess-I'), 'projA'); // session-restore 保留态写的
  const r = runNode(routeGuardHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, ROUTE_GUARD_PROJECTS: 'projA' },
    input: JSON.stringify({ session_id: 'sess-I', prompt: '随便说点什么' }),
  });
  assert.doesNotMatch(r.stdout, /PROJECT GATE/, 'NO_PIN + 普通对话不是项目意图，不得制造 gate');
  assert.ok(!existsSync(join(root, '.claude', '.session-project-sess-I')), 'A 下继承态不写 pin（未绑定）');
  assert.ok(!existsSync(join(root, '.claude', '.session-inherited-sess-I')), '继承标记应一次性读后删');
  console.log('PASS STICKY-008 继承 display marker 不成为 identity，也不把普通对话变成项目任务');
}

// STICKY-008b（方案A）：pin 只在"显式声明/确认项目"时写，永不从软链 auto-adopt（跨 session 污染根因）
{
  // (i) 点名项目只创建 SWITCH_ONLY，不预写 BOUND。
  const rootA = makeFixture({ activeProject: 'projA' });
  runNode(routeGuardHook, rootA, {
    env: { CLAUDE_PROJECT_DIR: rootA, ROUTE_GUARD_PROJECTS: 'projA' },
    input: JSON.stringify({ session_id: 'sess-Sa', prompt: '继续 projA 的列表' }),
  });
  const stateA = JSON.parse(readFileSync(join(rootA, '.claude', '.session-project-sess-Sa'), 'utf8'));
  assert.equal(stateA.state, 'SWITCH_ONLY');
  assert.equal(stateA.switch.target, 'projA');

  // (ii) ★no-adopt★ 无标记 + 不点名任何项目（cur=projA 仍在软链）→ 不写 pin（保持未绑定）
  const rootB = makeFixture({ activeProject: 'projA' });
  const rB = runNode(routeGuardHook, rootB, {
    env: { CLAUDE_PROJECT_DIR: rootB, ROUTE_GUARD_PROJECTS: 'projA' },
    input: JSON.stringify({ session_id: 'sess-Sb', prompt: '随便说点什么' }),
  });
  assert.ok(!existsSync(join(rootB, '.claude', '.session-project-sess-Sb')), 'A 下不再从软链 auto-adopt pin');
  assert.doesNotMatch(rB.stdout, /并行 session 保留/, '不得残留旧继承措辞');
  console.log('PASS STICKY-008b 点名只建 SWITCH_ONLY，未点名不从 display symlink auto-adopt');
}

// STICKY-008c（命名即切换 2026-07-06）：本 session 主动切到具名项目 → emit 立即切换（无"确认后"）；
// pin 记成【目标】项目（非当前），清继承标记 + 清残留漂移计数，且本轮不误报漂移。
{
  const root = makeFixture({ activeProject: 'projA' });
  writeFileSync(join(root, '.claude', '.session-inherited-sess-N'), 'projA'); // 继承态
  writeFileSync(join(root, '.claude', '.session-projnag-sess-N'), '2');       // 预置残留漂移计数
  const r = runNode(routeGuardHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, ROUTE_GUARD_PROJECTS: 'projA,projB' },
    input: JSON.stringify({ session_id: 'sess-N', prompt: '继续 projB 的任务' }),
  });
  assert.match(r.stdout, /SWITCH_ONLY/, '应 emit SWITCH_ONLY transaction');
  assert.match(r.stdout, /project\.sh switch projB --session-id sess-N --tx .+ --expected-epoch 0/, '应给出 hash-bound 事务命令');
  assert.doesNotMatch(r.stdout, /原在项目/, '自己主动切不得报"被切走"漂移');
  const pin = JSON.parse(readFileSync(join(root, '.claude', '.session-project-sess-N'), 'utf8'));
  assert.equal(pin.state, 'SWITCH_ONLY');
  assert.equal(pin.switch.target, 'projB', 'SWITCH_ONLY target 应为 projB，尚未 BOUND');
  assert.ok(!existsSync(join(root, '.claude', '.session-inherited-sess-N')), '自切应清继承标记');
  assert.ok(!existsSync(join(root, '.claude', '.session-projnag-sess-N')), '自切应清残留漂移计数');
  console.log('PASS STICKY-008c 命名切换 → SWITCH_ONLY + tx/epoch + 清标记');
}

// STICKY-009：SessionEnd 清计数但保留 identity（End 无 generation，不能安全删 pin）
{
  const root = makeFixture({});
  const cl = join(root, '.claude');
  const active = bindActiveTurn(root, 'testproj', 'gone');
  for (const f of ['.session-tool-count-gone', '.session-turn-count-gone', '.session-projnag-gone']) {
    writeFileSync(join(cl, f), 'x');
  }
  writeFileSync(join(cl, '.session-tool-count-other'), 'y'); // 他 sid，不应被删
  runNode(sessionEndHook, root, { env: active.env, input: JSON.stringify({ session_id: 'gone' }) });
  for (const f of ['.session-tool-count-gone', '.session-turn-count-gone', '.session-projnag-gone']) {
    assert.ok(!existsSync(join(cl, f)), `SessionEnd 应删本 sid 的 ${f}`);
  }
  assert.ok(existsSync(join(cl, '.session-project-gone')), 'SessionEnd 无 generation snapshot，不得删除可能已被 resume/reuse 的 identity');
  assert.ok(existsSync(join(cl, '.session-tool-count-other')), 'SessionEnd 不得删他 sid 文件');
  console.log('PASS STICKY-009 SessionEnd 清本 sid 临时计数但保留 identity');
}

// STICKY-010（方案A 2026-07-08）：docs/ 落点已由 PreToolUse project-scope-guard 重定向到 pin 项目，
// post-edit 原先的"pin≠docs 软链 → 可能落错项目"事后告警失去意义（A 下 pin≠软链是常态、且写入未落
// 软链而是落 pin），已移除 → 断言 post-edit 不再吐该告警（真兜底见 test-project-scope-guard.mjs）。
{
  const root = makeFixture({ activeProject: 'projB' }); // docs → projB
  writeFileSync(join(root, '.claude', '.session-project-auto'), 'projA'); // pin=projA，与 docs 不符
  const r = runNode(postEditHook, root, {
    env: { CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: 'auto', tool_name: 'Write', tool_input: { file_path: join(root, 'docs', 'x.md') } }),
  });
  assert.doesNotMatch(r.stdout, /可能落错项目|pin 的项目是/, 'A 下 post-edit 不再事后告警 pin≠docs（兜底前移到 PreToolUse）');
  console.log('PASS STICKY-010 post-edit 不再吐 pin≠docs 事后告警（A 下由重定向兜底）');
}

// ══════════════ Stop 链 pin-aware + 提醒盲区修复（方案A 补全，2026-07-14）══════════════

// ── SYNC-PIN-001：pin=projA、软链=projB（并行切走形态）→ 归因/checkpoint/topic 全以 pin 为真值 ──
{
  const home = mkdtempSync(join(tmpdir(), 'luca-gstack-syncpin-'));
  const root = join(home, 'gstack');
  mkdirSync(join(root, '.claude'), { recursive: true });
  const projectsRoot = join(home, 'projects');
  const projBdocs = join(projectsRoot, 'projB', 'docs');
  mkdirSync(projBdocs, { recursive: true });
  symlinkSync(projBdocs, join(root, 'docs'));
  const projA = join(projectsRoot, 'projA');
  mkdirSync(join(projA, '.luca'), { recursive: true });
  mkdirSync(join(projA, 'docs'), { recursive: true });
  writeFileSync(join(projA, '.luca', 'workflow-state.yaml'),
    ['topic: "pin-topic"', 'nodes:', '  node-pin:', '    status: IN_PROGRESS', 'iteration: 1', ''].join('\n'));
  writeFileSync(join(projA, '.luca', 'current-topic.txt'), 'pin-topic\n');
  const st = statSync(projA);
  const binding = { project: 'projA', epoch: 1, realpath: realpathSync(projA), dev: Number(st.dev), ino: Number(st.ino) };
  writeFileSync(join(root, '.claude', '.session-project-sessPIN'), `${JSON.stringify({
    schema_version: 2, state: 'TURN_ACTIVE', session_id: 'sessPIN', binding,
    turn: { turn_id: 'turn-sessPIN', epoch: 1 },
  })}\n`);
  writeFileSync(join(root, '.claude', '.session-edit-count-sessPIN'), '1');
  const r = runNode(sessionSyncHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projectsRoot, ...FORCE_STOP_ENV },
    input: JSON.stringify({ session_id: 'sessPIN' }),
  });
  const parsed = JSON.parse(r.stdout);
  assert.match(parsed.reason, /当前激活项目「projA」/, '归因必须指向 identity binding 项目 projA');
  assert.doesNotMatch(parsed.reason, /projB/, '归因不得指向软链项目 projB（P2 实证回归）');
  const ckDir = join(projA, 'docs', 'handoff');
  assert.ok(existsSync(ckDir) && readdirSync(ckDir).some(n => n.endsWith('-auto-checkpoint.md')),
    'checkpoint 必须落 pin 项目 projA 的 docs/handoff');
  const ckFile = readdirSync(ckDir).find(n => n.endsWith('-auto-checkpoint.md'));
  assert.match(readFileSync(join(ckDir, ckFile), 'utf8'), /pin-topic/,
    'topic 必须读自 pin 项目的 .luca/workflow-state.yaml（与落点同源）');
  assert.ok(!existsSync(join(projectsRoot, 'projB', 'docs', 'handoff')),
    '软链项目 projB 不得被写入');
  console.log('PASS SYNC-PIN-001 Stop 链 pin 优先：归因/checkpoint/topic 与 pin 同源，projB 零写入');
}

// ── SYNC-PIN-002：失效/malformed pin → no-pin，绝不回退 display symlink ──
{
  const home = mkdtempSync(join(tmpdir(), 'luca-gstack-syncgh-'));
  const root = join(home, 'gstack');
  mkdirSync(join(root, '.claude'), { recursive: true });
  const projectsRoot = join(home, 'projects');
  const projBdocs = join(projectsRoot, 'projB', 'docs');
  mkdirSync(projBdocs, { recursive: true });
  symlinkSync(projBdocs, join(root, 'docs'));
  writeFileSync(join(root, '.claude', '.session-project-sessGH'), 'ghost'); // 指向不存在的项目
  writeFileSync(join(root, '.claude', '.session-edit-count-sessGH'), '1');
  const r = runNode(sessionSyncHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projectsRoot, ...FORCE_STOP_ENV },
    input: JSON.stringify({ session_id: 'sessGH' }),
  });
  assert.doesNotMatch(JSON.parse(r.stdout).reason, /projB/, '失效 pin 不得回退 display symlink projB');
  assert.match(JSON.parse(r.stdout).reason, /不带 --project/, '失效 pin 应按 no-pin 归因');
  assert.ok(!existsSync(join(projectsRoot, 'ghost')), '不得为失效 pin 创建幽灵项目目录');
  console.log('PASS SYNC-PIN-002 失效 pin fail-closed 为 no-pin，不回退 display symlink');
}

// ── SYNC-MEM-001：MEMORY_ROOT 重定向时脏记忆提醒必须查该仓（P3 实证回归：fork 写脏母版无人提醒）──
{
  const root = makeFixture({}); // trivial → release 路径（提醒只在放行侧发）
  const memRoot = mkdtempSync(join(tmpdir(), 'luca-gstack-memdirty-'));
  mkdirSync(join(memRoot, 'memory', 'episodic'), { recursive: true });
  spawnSync('git', ['init', '-q'], {
    cwd: memRoot,
    encoding: 'utf8',
    env: withoutLocalGitEnv(),
  });
  writeFileSync(join(memRoot, 'memory', 'episodic', 'index.jsonl'), '{}'); // untracked = 脏
  const r = runNode(sessionSyncHook, root, { env: { CLAUDE_PROJECT_DIR: root, MEMORY_ROOT: memRoot } });
  assert.match(r.stderr, /MEMORY_ROOT 仓（.*）有未提交的记忆/, 'MEMORY_ROOT 仓脏时提醒必须响且点名该仓');
  const poison = mkdtempSync(join(tmpdir(), 'luca-gstack-git-env-'));
  spawnSync('git', ['init', '-q'], { cwd: poison, env: withoutLocalGitEnv() });
  mkdirSync(join(poison, 'memory', 'episodic'), { recursive: true });
  writeFileSync(join(poison, 'memory', 'episodic', 'index.jsonl'), '{}\n');
  const rClean = runNode(sessionSyncHook, makeFixture({}), {
    env: {
      GIT_DIR: join(poison, '.git'),
      GIT_WORK_TREE: poison,
      GIT_INDEX_FILE: join(poison, '.git', 'index'),
    },
  });
  assert.doesNotMatch(rClean.stderr, /🔔/, 'Git hook local env 不得把外仓脏状态误报到 fixture');
  console.log('PASS SYNC-MEM-001 MEMORY_ROOT 仓脏 → 提醒点名该仓（split-brain 提醒盲区修复）');
}

// ── STICKY-011（P5 修复回归 2026-07-14）：affirmsCur 词边界匹配——裸子串不再误绑 pin ──
{
  const root = makeFixture({ activeProject: 'muse' });
  const fire = (prompt) => runNode(routeGuardHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, ROUTE_GUARD_PROJECTS: 'muse', ROUTE_GUARD_CURRENT_PROJECT: 'muse' },
    input: JSON.stringify({ session_id: 'sess-SUB', prompt }),
  });
  fire('我在读amusement相关的代码');
  assert.ok(!existsSync(join(root, '.claude', '.session-project-sess-SUB')),
    '子串（amusement ⊃ muse）不得绑 pin（P5 实证回归）');
  fire('继续 muse 的任务');
  const prepared = JSON.parse(readFileSync(join(root, '.claude', '.session-project-sess-SUB'), 'utf8'));
  assert.equal(prepared.state, 'SWITCH_ONLY',
    '真点名（词边界成立）须进入 SWITCH_ONLY，不能在切换事务完成前伪造 BOUND pin');
  assert.equal(prepared.switch?.target, 'muse', 'SWITCH_ONLY 必须保留规范化目标项目');
  console.log('PASS STICKY-011 project switch 词边界：amusement 不误触，点名 muse 只准备事务');
}

// ── IDENTITY-FIFO-001：NO_PIN route 不得探测 shared workflow-state ──
// FIFO 没有 writer 时任何 readFileSync 都会永久阻塞；用短 timeout 把“没有读取”变成机械证据。
{
  const root = mkdtempSync(join(tmpdir(), 'luca-gstack-route-fifo-'));
  const projectsRoot = join(root, 'projects');
  mkdirSync(join(root, '.claude', 'observability'), { recursive: true });
  mkdirSync(projectsRoot, { recursive: true });
  const fifo = join(root, '.claude', 'workflow-state.yaml');
  const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr || 'mkfifo failed');
  const baseEnv = { ...process.env };
  for (const key of ['LUCA_ACTUAL_HARNESS', 'LUCA_HARNESS_ADAPTED', 'CODEX_HOME', 'CODEX_SANDBOX', 'CODEX_SESSION_ID']) {
    delete baseEnv[key];
  }
  const r = spawnSync('node', [routeGuardHook], {
    cwd: root,
    encoding: 'utf8',
    timeout: 1500,
    input: JSON.stringify({ session_id: 'sess-FIFO', turn_id: 'turn-FIFO', prompt: '审查 luca_gstack route guard' }),
    env: {
      ...baseEnv,
      CLAUDE_PROJECT_DIR: root,
      LUCA_GSTACK_ROOT: root,
      LUCA_PROJECTS_ROOT: projectsRoot,
      ROUTE_GUARD_CURRENT_PROJECT: '',
      ROUTE_GUARD_PROJECTS: '',
    },
  });
  assert.notEqual(r.error?.code, 'ETIMEDOUT', 'NO_PIN route 读取 shared workflow-state 会在 FIFO 上卡死');
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.ok(!existsSync(join(root, '.claude', '.session-project-sess-FIFO')),
    '纯框架 prompt 不得因 display state 创建项目 identity');
  console.log('PASS IDENTITY-FIFO-001 NO_PIN route 对 shared workflow-state 零读取');
}

// ── DIGEST-001（BACKLOG #17 送达链，2026-07-21）：digest「待你裁决」标题的**生产端与消费端必须咬住** ──
// 生产端 daily_governance.py 写标题、消费端 session-restore.mjs 用正则定位它来决定预览窗。
// 二者此前零耦合：改标题措辞/层级 → 预览静默退回 14 行、待办重新被切在窗外且无人察觉。
{
  const govSrc = readFileSync(resolve(projectRoot, 'memory/scripts/daily_governance.py'), 'utf8');
  const restoreSrc = readFileSync(sessionRestoreHook, 'utf8');

  const headingLine = govSrc.split('\n').find(l => l.includes('待') && l.includes('裁决') && l.includes('##'));
  assert.ok(headingLine, '生产端 daily_governance.py 必须仍写出「待…裁决」小节标题');
  // 还原成 digest 里的真实字面量（f-string 占位符换成样例值）
  const rendered = headingLine.slice(headingLine.indexOf('##')).replace(/\{[^}]*\}/g, '7').replace(/["'\],]+\s*$/, '');

  const reMatch = restoreSrc.match(/const decideAt = digestLines\.findIndex\(l => (\/.+?\/)\.test\(l\)\)/);
  assert.ok(reMatch, '消费端 session-restore.mjs 必须仍用正则定位该节（预览窗算法未被改走）');
  const consumerRe = new RegExp(reMatch[1].slice(1, -1));
  assert.ok(consumerRe.test(rendered),
    `消费端正则 ${reMatch[1]} 匹配不到生产端标题 ${JSON.stringify(rendered)}——送达链已断：` +
    'digest 预览会静默退回 14 行，「待你裁决」条目重新被切在窗外（BACKLOG #17 原故障）');

  assert.ok(/还有 \$\{cut\} 行未显示|未显示/.test(restoreSrc),
    '预览截断必须可见（带剩余行数指示），否则等于把 #17「看不出被切」的原故障重装一遍');
  console.log('PASS DIGEST-001 「待你裁决」标题生产端↔消费端正则咬合，且截断可见');
}

// ── MEMROOT-WIRING-001（深审 M5 存活缺口，2026-07-24）：session-restore 的 memoryRoot **必须**
// 经 resolveMemoryRoot 解析，而非裸 `process.env.MEMORY_ROOT || projectRoot`。
// 判据：MEMORY_ROOT 指向**不存在**的路径（cloud 常态：committed env 指向本机没有的 master）时，
// 治理/digest 路径必须落回 projectRoot，而不是在幻影路径上 mkdir（R3B-1 幻影树 + 治理每 session
// 重 spawn + 成长摘要永不展示）。把 wiring 换回裸 env 逻辑，本用例即变红（M5 mutant 被杀）。
{
  const root = makeFixture();
  const phantom = join(tmpdir(), `luca-gstack-phantom-${Date.now()}`); // 故意不创建
  mkdirSync(join(root, 'memory', 'digests'), { recursive: true });
  writeFileSync(join(root, 'memory', 'digests', '2026-01-02.md'), '# 成长摘要 — wiring 测试正文');
  const r = runNode(sessionRestoreHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, MEMORY_ROOT: phantom },
  });
  assert.equal(existsSync(phantom), false,
    'MEMORY_ROOT 指向不存在路径时，绝不能在该幻影路径上创建目录树（R3B-1 幻影树回归）');
  assert.match(r.stdout, /成长摘要 \(2026-01-02\.md/,
    'memoryRoot 必须回落 projectRoot 才能找到本仓 digest；裸 `MEMORY_ROOT||projectRoot` 会指向幻影路径而找不到（M5 wiring 缺口）');
  console.log('PASS MEMROOT-WIRING-001 session-restore 经 resolveMemoryRoot 解析（幻影 MEMORY_ROOT 回落本仓，不建幻影树）');
}

// ── WS-B4-CLASSIFY（审计 Round1 CR0044 + Round2 修正）：记忆加载失败分类可见，测**真实可达**路径。
// Round2 发现原用例测伪造场景——真实 get_memory.py 用 try/except 吞掉缺 yaml 并静默降级、--summary
// 退出 0，故"缺 PyYAML"分支不可达（已在 session-restore 删除该死分支）。改测 python3 缺失（云端/
// 精简镜像真实常态）：execSync 经 /bin/sh 找不到 python3 → "command not found" → 分类"未找到 python3"。
// 把该分类分支改回统一兜底文案，本用例即变红（mutation 有杀伤力）。
{
  const root = makeFixture();
  writeFileSync(join(root, 'memory', 'scripts', 'get_memory.py'), 'print("ok")\n'); // 脚本本身能跑，只让 python3 不可达
  // hermetic（Round3 修 test-portability）：不用 dirname(node)——homebrew/conda 下 node 与 python3
  // 同目录会让 python3 一并可达、用例假绿。改建一个**只含 node 软链**的临时空目录当 PATH，python3
  // 无论宿主布局都不可达。
  const binDir = mkdtempSync(join(tmpdir(), 'wsb4-nobin-'));
  symlinkSync(process.execPath, join(binDir, 'node'));
  const r = runNode(sessionRestoreHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, PATH: binDir },
  });
  assert.match(r.stdout, /记忆加载失败（未找到 python3）/,
    'python3 不在 PATH（真实可达失败）→ stdout 必须分类为「未找到 python3」（WS-B4 失败分类）');
  assert.match(r.stdout, /安装 python3/, '未找到 python3 分类必须附可执行补救');
  console.log('PASS WS-B4-CLASSIFY session-restore 记忆加载失败分类可见（python3 缺失=真实可达路径）');
}

// ── GOVERNANCE-SPAWN-FAILOPEN（审计 Round5 MAJOR）：云端 python3 缺失时，daily_governance 的
// **detached spawn** 的 async ENOENT 'error' 事件必须被 .on('error') 吞掉——否则 hook 崩溃退出 1、
// 吐 Node 栈盖过干净的"未找到 python3"告警（既报告又崩溃，违反系列 fail-open 契约）。删掉 spawn 的
// .on('error') 本用例即红。前四轮静态审计全 declared-dry、只有 Round5 运行时分区抓到此 MAJOR。
{
  const root = makeFixture();
  writeFileSync(join(root, 'memory', 'scripts', 'daily_governance.py'), 'print("gov")\n'); // govScript 存在 → 触发治理 spawn
  const binDir = mkdtempSync(join(tmpdir(), 'gov-nopy-'));
  symlinkSync(process.execPath, join(binDir, 'node')); // PATH 只含 node → python3 不可达
  const r = runNode(sessionRestoreHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, MEMORY_ROOT: root, PATH: binDir },
  });
  assert.equal(r.status, 0,
    `session-restore 在 python3 缺失+governance 触发下必须 fail-open 退出 0（detached spawn 的 async ENOENT 须被 .on('error') 吞掉），实际 status=${r.status}`);
  assert.doesNotMatch(String(r.stderr || ''), /Unhandled 'error'|spawn python3 ENOENT|node:events/,
    'detached governance spawn 崩溃栈绝不能泄漏到 stderr（会盖过干净告警、被 SessionStart 展示给用户）');
  console.log('PASS GOVERNANCE-SPAWN-FAILOPEN session-restore 云端 python3 缺失下 detached spawn fail-open（Round5 MAJOR 回归门）');
}

// ── READ-GRANT-LIFECYCLE：blocked Stop 不是边界；non-blocking Stop / SessionEnd 才撤销 ──
// 2026-09-03 post-seal 增量审计 finding #5：READ_GRANTS_ENABLED=false 把 reconcilePromptGrants/
// authorizeRead 短路成恒定 deny，下面三段测的是正向生命周期（grant 在 blocked Stop 下存活、在
// non-blocking Stop/SessionEnd 下被撤销），quarantine 期间既拿不到真 grant 也谈不上"存活"，
// 断言会失真而不是抓到真回归。整批跟隔离开关一起跳过，别硬凑出假绿或吵得盖过真问题。
// 隔离解除、重新设计好授权通道后，把 READ_GRANTS_ENABLED 改回 true 即可原样复跑。
if (READ_GRANTS_ENABLED) {
  const root = makeFixture({ statuses: [] });
  const projects = join(root, 'projects');
  const target = join(projects, 'beta', 'docs', 'reference.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, 'reference');
  const sid = 'grant-blocked-stop';
  reconcilePromptGrants({
    gstackRoot: root, projectsRoot: projects, sessionId: sid, turnId: 'turn-blocked', binding: null,
    prompt: `只读引用: \`${target}\``,
  });
  writeFileSync(join(root, '.claude', `.session-edit-count-${sid}`), '1');
  const blocked = runNode(sessionSyncHook, root, {
    env: { ...FORCE_STOP_ENV, CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projects },
    input: JSON.stringify({ session_id: sid }),
  });
  assert.equal(JSON.parse(blocked.stdout).decision, 'block');
  assert.equal(authorizeRead({
    gstackRoot: root, projectsRoot: projects, sessionId: sid, binding: null,
    operation: 'read', toolName: 'Read', targetPath: target,
  }).allowed, true, 'blocked Stop must retain the active turn grant');
  console.log('PASS READ-GRANT-LIFECYCLE blocked Stop preserves turn grant');
} else {
  console.log('SKIP READ-GRANT-LIFECYCLE blocked Stop preserves turn grant (read-grants quarantined: READ_GRANTS_ENABLED=false)');
}

if (READ_GRANTS_ENABLED) {
  const root = makeFixture({ statuses: [] });
  const projects = join(root, 'projects');
  const target = join(projects, 'beta', 'docs', 'reference.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, 'reference');
  const sid = 'grant-open-stop';
  reconcilePromptGrants({
    gstackRoot: root, projectsRoot: projects, sessionId: sid, turnId: 'turn-open', binding: null,
    prompt: `只读引用: \`${target}\``,
  });
  runNode(sessionSyncHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projects },
    input: JSON.stringify({ session_id: sid }),
  });
  assert.equal(authorizeRead({
    gstackRoot: root, projectsRoot: projects, sessionId: sid, binding: null,
    operation: 'read', toolName: 'Read', targetPath: target,
  }).allowed, false, 'non-blocking Stop must close the turn witness');
  assert.equal(JSON.parse(readFileSync(turnWitnessPath(root, sid), 'utf8')).open, false);
  console.log('PASS READ-GRANT-LIFECYCLE non-blocking Stop closes turn grant');
} else {
  console.log('SKIP READ-GRANT-LIFECYCLE non-blocking Stop closes turn grant (read-grants quarantined: READ_GRANTS_ENABLED=false)');
}

if (READ_GRANTS_ENABLED) {
  const root = makeFixture({ statuses: [] });
  const projects = join(root, 'projects');
  const target = join(projects, 'beta', 'docs', 'reference.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, 'reference');
  const sid = 'grant-session-end';
  reconcilePromptGrants({
    gstackRoot: root, projectsRoot: projects, sessionId: sid, turnId: 'turn-session', binding: null,
    prompt: `本会话只读引用: \`${target}\``,
  });
  runNode(sessionEndHook, root, {
    env: { CLAUDE_PROJECT_DIR: root, LUCA_GSTACK_ROOT: root, LUCA_PROJECTS_ROOT: projects },
    input: JSON.stringify({ session_id: sid }),
  });
  assert.equal(existsSync(grantSetPath(root, sid)), false);
  assert.equal(existsSync(turnWitnessPath(root, sid)), false);
  console.log('PASS READ-GRANT-LIFECYCLE SessionEnd revokes all grants');
} else {
  console.log('SKIP READ-GRANT-LIFECYCLE SessionEnd revokes all grants (read-grants quarantined: READ_GRANTS_ENABLED=false)');
}

console.log('\nALL HOOK/MEMORY REGRESSION TESTS PASSED');
