#!/usr/bin/env node
// harness 检测 + 能力探针回归（P0 / WS-A0，2026-07-25）。
// 核心不变量：**按输出类型反转的安全默认**——harness 检测天然不可靠，故 CC 专有强制动词
// （decision:block / permissionDecision:deny / updatedInput）只在 claude **正向确定**时才允许；
// unknown/codex 一律关闭（降级为纯文本 advisory）。反过来会让真 Codex 会话收到解析不了的 JSON。
import { detectHarness, capabilities, canEmitControlVerb, HARNESS } from '../.claude/hooks/lib/harness.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${d ? ` — ${d}` : ''}`); } };

// ① 三态检测
ok('H1 CLAUDE_PROJECT_DIR 在 → claude', detectHarness({ CLAUDE_PROJECT_DIR: '/x' }) === HARNESS.CLAUDE);
ok('H2 CODEX_* 在 → codex', detectHarness({ CODEX_HOME: '/y' }) === HARNESS.CODEX);
ok('H3 都不在 → unknown（不猜）', detectHarness({}) === HARNESS.UNKNOWN);

// ② 安全默认：强制动词仅 claude 正向可用
ok('H4 claude → canEmitControlVerb=true', canEmitControlVerb({ CLAUDE_PROJECT_DIR: '/x' }) === true);
ok('H5 codex → canEmitControlVerb=false（不吐 CC JSON）', canEmitControlVerb({ CODEX_HOME: '/y' }) === false);
ok('H6 unknown → canEmitControlVerb=false（安全默认，不赌）', canEmitControlVerb({}) === false);

// ③ 能力表：CC 专有原语在非-claude 下全关；harness-agnostic 能力不受影响
for (const h of [HARNESS.CODEX, HARNESS.UNKNOWN]) {
  const c = capabilities(h);
  ok(`H7 ${h}: blockVerb/writeHook/inputMutation/workflow/askUserWidget 全关`,
    !c.blockVerb && !c.writeHook && !c.inputMutation && !c.workflow && !c.askUserWidget);
}
{
  const c = capabilities(HARNESS.CLAUDE);
  ok('H8 claude: CC 专有原语全开', c.blockVerb && c.writeHook && c.inputMutation && c.workflow && c.askUserWidget);
}

console.log(`\n=== test-harness summary: PASS=${pass} FAIL=${fail} ===`);
process.exit(fail ? 1 : 0);
