#!/usr/bin/env node
// harness 检测 + 静态宿主声明回归（P0 / WS-A0，2026-07-25）。
// 核心不变量：当前 Codex 与 Claude 均原生接受 decision:block、permissionDecision:deny
// 与 updatedInput（后者需 permissionDecision:allow）。能力表必须反映实测事实，不再把
// 历史方言假设钉成永久降级。
// E1-E4 是**端到端接线断言**：spawn 真 hook 验证该门确实作用于生产 emitter（首版只测纯函数，
// 导致 harness.mjs 零生产调用者而门 100% 永绿）。
import { detectHarness, capabilities, canEmitControlVerb, HARNESS } from '../.claude/hooks/lib/harness.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

// ① 三态检测
ok('H1 CLAUDE_PROJECT_DIR 在 → claude', detectHarness({ CLAUDE_PROJECT_DIR: '/x' }) === HARNESS.CLAUDE);
ok('H2 CODEX_* 在 → codex', detectHarness({ CODEX_HOME: '/y' }) === HARNESS.CODEX);
ok('H3 都不在 → unknown（不猜）', detectHarness({}) === HARNESS.UNKNOWN);

// ② 安全默认：两家共享强制动词；unknown 仍偏向保住强制
ok('H4 claude → canEmitControlVerb=true', canEmitControlVerb({ CLAUDE_PROJECT_DIR: '/x' }) === true);
ok('H5 codex → canEmitControlVerb=true（实测共享控制动词）', canEmitControlVerb({ CODEX_HOME: '/y' }) === true);
// 深审修正：unknown 多为 CLAUDE_PROJECT_DIR 被剥的 Claude 会话；关掉会静默丢失主路径治理强制
// （Stop 不再拦、PreToolUse 不再 deny），比在未知 harness 多吐一行 JSON 严重得多 → 失效方向偏向保住强制。
ok('H6 unknown → canEmitControlVerb=true（失效方向偏向保住强制）', canEmitControlVerb({}) === true);

// ③ 静态声明：控制原语有独立实测；扩展字段只保留宿主分类，不验证部署。
{
  const c = capabilities(HARNESS.CODEX);
  ok('H7a codex: block/write hook/input mutation 均可用，Workflow/AskUser 关闭',
    c.blockVerb && c.writeHook && c.inputMutation && !c.workflow && !c.askUserWidget);
}
{
  const c = capabilities(HARNESS.UNKNOWN);
  ok('H7b unknown: 强制动词保留（保住强制），但 workflow/askUser 仍关（吐了也没人能执行）',
    c.blockVerb && c.writeHook && c.inputMutation && !c.workflow && !c.askUserWidget);
}
{
  const c = capabilities(HARNESS.CLAUDE);
  ok('H8 claude: 历史扩展宿主分类保留，非部署证明', c.blockVerb && c.writeHook && c.inputMutation && c.workflow && c.askUserWidget);
}

// Defaults must use actual host identity even when the adapter speaks Claude's hook protocol.
{
  const {spawnSync} = await import('node:child_process');
  const {mkdtempSync,mkdirSync,writeFileSync,rmSync} = await import('node:fs');
  const {join} = await import('node:path');
  const {tmpdir} = await import('node:os');
  const helper = new URL('../.claude/hooks/lib/harness.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath,['--input-type=module','-e',
    `import {detectHarness,actualHarness,capabilities} from ${JSON.stringify(helper)};
     console.log(JSON.stringify({protocol:detectHarness(),actual:actualHarness(),caps:capabilities()}));`],
    {encoding:'utf8',env:{PATH:process.env.PATH,CLAUDE_PROJECT_DIR:'/fixture',LUCA_ACTUAL_HARNESS:'codex',LUCA_HARNESS_ADAPTED:'1'}});
  const observed = JSON.parse(result.stdout || '{}');
  ok('H9 adapted Codex default separates actual capability from Claude protocol',
    result.status===0 && observed.protocol==='claude' && observed.actual==='codex'
    && observed.caps?.harness==='codex' && !observed.caps.workflow && !observed.caps.askUserWidget,
    result.stderr || result.stdout);

  const hook = new URL('../.claude/hooks/session-restore.mjs',import.meta.url).pathname;
  for(const host of ['claude','codex','unknown']) {
    const root=mkdtempSync(join(tmpdir(),`harness-startup-${host}-`));
    try {
      for(const dir of ['.claude/skill-os/evolution','memory/episodic','projects','global'])mkdirSync(join(root,dir),{recursive:true});
      writeFileSync(join(root,'.claude/skill-os/evolution/self-model.yaml'),'enabled: true\n');
      const env={PATH:process.env.PATH,HOME:join(root,'home'),LANG:'C',MEMORY_ROOT:root,
        GLOBAL_MEMORY_DIR:join(root,'global'),LUCA_PROJECTS_ROOT:join(root,'projects'),LUCA_GSTACK_ROOT:root};
      if(host!=='unknown')env.CLAUDE_PROJECT_DIR=root;
      if(host==='codex'){env.LUCA_ACTUAL_HARNESS='codex';env.LUCA_HARNESS_ADAPTED='1';}
      const r=spawnSync(process.execPath,[hook],{cwd:root,encoding:'utf8',env,input:'{}',timeout:10000});
      const positive=host==='claude'?/Workflow\(\{name:'framework-evolution-scout'/:
        host==='codex'?/node \.codex\/workflow-runner\.mjs framework-evolution-scout/:/未知宿主/;
      const negative=host==='codex'||host==='unknown'?/Workflow\(\{name:/:/node \.codex\/workflow-runner/;
      const discoveredOrRefused=host!=='claude'||(/先确认当前会话实际提供 Workflow 工具/.test(r.stdout)
        && /缺失或未验证则报告 BLOCKED/.test(r.stdout) && /仅确认可用后/.test(r.stdout));
      ok(`H10-${host} real SessionStart distinguishes invocation from verified availability`,r.status===0&&positive.test(r.stdout)&&!negative.test(r.stdout)&&discoveredOrRefused,r.stderr+r.stdout);
    } finally {rmSync(root,{recursive:true,force:true});}
  }
}

// ── V2 template discovery: the internal Phase-A primitive must degrade to NO_HINT per harness ──
// This is intentionally a real CLI invocation, not a prose-only promise. It does not reach OD,
// write framework assets, or bind a template: an absent catalog/primitive is a controlled no-hint
// result, while malformed supplied data remains the page-context validator's fail-closed concern.
{
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, readdirSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const ROOT = fileURLToPath(new URL('..', import.meta.url));
  const PAGE_CONTEXT = join(ROOT, 'scripts', 'page-context.mjs');
  const harnessEnv = (kind) => {
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    delete env.CODEX_HOME;
    if (kind === 'claude') env.CLAUDE_PROJECT_DIR = ROOT;
    else env.CODEX_HOME = join(tmpdir(), 'codex-template-discovery');
    return env;
  };
  const invoke = (kind, root) => {
    const result = spawnSync(process.execPath, [PAGE_CONTEXT, 'phase-a-discovery',
      '--query', 'unrelated spatial sculpture', '--root', root], {
      cwd: ROOT, encoding: 'utf8', env: harnessEnv(kind),
    });
    let body;
    try { body = JSON.parse(result.stdout || ''); } catch { body = null; }
    return { result, body };
  };
  for (const kind of ['claude', 'codex']) {
    const discovered = invoke(kind, ROOT);
    ok(`V2-${kind} discovery invokes phase-a-discovery without binding`,
      discovered.result.status === 0 && discovered.body?.schema_version === 2
      && discovered.body?.mode === 'phase_a_discovery' && discovered.body?.ephemeral === true
      && discovered.body?.status === 'NO_HINT' && Array.isArray(discovered.body?.candidate_hints)
      && discovered.body.candidate_hints.length === 0,
    `status=${discovered.result.status} stdout=${(discovered.result.stdout || '').slice(0, 160)} stderr=${(discovered.result.stderr || '').slice(0, 160)}`);

    const absentRoot = mkdtempSync(join(tmpdir(), `template-discovery-${kind}-`));
    const unavailable = invoke(kind, absentRoot);
    ok(`V2-${kind} unavailable discovery primitive degrades to NO_HINT without writes`,
      unavailable.result.status === 0 && unavailable.body?.mode === 'phase_a_discovery'
      && unavailable.body?.status === 'NO_HINT' && unavailable.body?.ephemeral === true
      && Array.isArray(unavailable.body?.candidate_hints) && unavailable.body.candidate_hints.length === 0
      && readdirSync(absentRoot).length === 0,
    `status=${unavailable.result.status} stdout=${(unavailable.result.stdout || '').slice(0, 160)} stderr=${(unavailable.result.stderr || '').slice(0, 160)}`);
    try { rmSync(absentRoot, { recursive: true, force: true }); } catch { }
  }
}

// ── [深审 BLOCKER 修复] 端到端接线断言：harness 门必须真作用于**生产 emitter** ──
// 首版只测纯函数 → harness.mjs 零生产调用者、S30 100% 永绿（守着不存在的不变量）。
// 现两个 CC 强制动词出口（session-sync 的 decision:block / project-scope-guard 的
// permissionDecision:deny）都经 canEmitControlVerb 门控；此处 spawn 真 hook 验证：
//   · Codex 正向检出 → 原样输出共享控制 JSON
//   · Claude → 同样输出控制 JSON（零回归）
{
  const { spawnSync } = await import('child_process');
  const { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { fileURLToPath } = await import('url');
  const REPO = fileURLToPath(new URL('..', import.meta.url));
  const D = 'do' + 'cs';

  const root = mkdtempSync(join(tmpdir(), 'harness-e2e-'));
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(root, 'memory', 'episodic'), { recursive: true });
  mkdirSync(join(root, '项目', 'p1', D), { recursive: true });
  symlinkSync(join(root, '项目', 'p1', D), join(root, D));
  writeFileSync(join(root, '.claude', 'workflow-state.yaml'), 'topic: "t"\nnodes:\n  n1:\n    status: IN_PROGRESS\niteration: 1\n');
  for (const sid of ['e2e-c', 'e2e-x']) {
    writeFileSync(join(root, '.claude', `.session-edit-count-${sid}`), '9');
    writeFileSync(join(root, '.claude', `.session-tool-count-${sid}`), '25');
  }
  const base = { PATH: process.env.PATH, HOME: join(root, 'home'), LANG: 'en_US.UTF-8' };
  const SYNC = join(REPO, '.claude/hooks/session-sync.mjs');
  const GUARD = join(REPO, '.claude/hooks/project-scope-guard.mjs');

  // ① Claude：block JSON 照常
  const rC = spawnSync('node', [SYNC], {
    cwd: root, encoding: 'utf8', env: { ...base, CLAUDE_PROJECT_DIR: root, SESSION_SYNC_FORCE_ON_STOP: '1' },
    input: JSON.stringify({ session_id: 'e2e-c' }),
  });
  ok('E1 [接线] session-sync @claude → stdout 仍是 decision:block JSON（零回归）',
    /"decision"\s*:\s*"block"/.test(rC.stdout || ''), `stdout=${(rC.stdout || '').slice(0, 60)}`);

  // ② Codex：原生接受同一 decision:block JSON
  const rX = spawnSync('node', [SYNC], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx', SESSION_SYNC_FORCE_ON_STOP: '1' },
    input: JSON.stringify({ session_id: 'e2e-x' }),
  });
  ok('E2 [接线] session-sync @codex → stdout 保留 decision:block JSON',
    /"decision"\s*:\s*"block"/.test(rX.stdout || ''),
    `stdout=${(rX.stdout || '').slice(0, 40)} stderr=${(rX.stderr || '').slice(0, 80)}`);

  // ③ project-scope-guard：Codex 原生接受 permissionDecision:deny
  const gX = spawnSync('node', [GUARD], {
    cwd: root, encoding: 'utf8', env: { ...base, CODEX_HOME: '/tmp/cx' },
    input: JSON.stringify({ session_id: 'e2e-g', tool_name: 'Write', tool_input: { file_path: `${D}/x.md` } }),
  });
  ok('E3 [接线] project-scope-guard @codex → stdout 保留 permissionDecision',
    /permissionDecision/.test(gX.stdout || ''),
    `stdout=${(gX.stdout || '').slice(0, 40)}`);

  // ④ project-scope-guard @claude：仍吐 CC JSON
  const gC = spawnSync('node', [GUARD], {
    cwd: root, encoding: 'utf8', env: { ...base, CLAUDE_PROJECT_DIR: root },
    input: JSON.stringify({ session_id: 'e2e-gc', tool_name: 'Write', tool_input: { file_path: `${D}/x.md` } }),
  });
  ok('E4 [接线] project-scope-guard @claude → 仍吐 permissionDecision（零回归）',
    /permissionDecision/.test(gC.stdout || ''), `stdout=${(gC.stdout || '').slice(0, 60)}`);

  try { (await import('fs')).rmSync(root, { recursive: true, force: true }); } catch { }
}

console.log(`\n=== test-harness summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
