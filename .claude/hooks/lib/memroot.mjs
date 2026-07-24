// 单一记忆根解析器（JS 孪生，P1 / FIX-1，2026-07-24 跨-agent 适配）。
// 与 py 孪生 `memory/scripts/_memroot.py` **同算法**（cross-lang parity 由
// scripts/test-memroot-parity.mjs 保证）。
//
// FIX-1 核心：fallback = **脚本相对仓根**（import.meta.url 上 3 级 = lib→hooks→.claude→repo），
// 与 py 侧 parents[2] BY-CONSTRUCTION 同根，与 cwd / CLAUDE_PROJECT_DIR 无关。
// 旧代码用 `MEMORY_ROOT || (CLAUDE_PROJECT_DIR||cwd)`：cloud/Codex 下 CLAUDE_PROJECT_DIR 未注入
// + 非仓 cwd 时 JS 回落到 cwd、py 回落到 script-location → 同一 store 裂成两根。改脚本相对后消除。
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { statSync } from 'fs';

// memroot.mjs 在 .claude/hooks/lib/ → 上 3 级 = 仓根（lib→hooks→.claude→repo）
export const SCRIPT_REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}
// store-shape 哨兵：真 store 必有 memory/ 子目录（真实 checkout 有 memory/{semantic,episodic}，
// 测试 fixture 亦建 memory/）。用父级 memory/ 而非 memory/semantic/ 以兼容 partial fixture；
// 真·bogus 根（如 /tmp、随机目录）无 memory/ 仍被拒。wrong-but-valid-store 由 daily_governance
// 判别器（硬编码 auth 对比）兜底（R3B-3）。
function isStore(p) {
  return isDir(join(p, 'memory'));
}

// 返回 { path, mode }；mode ∈ {'env','repo-fallback'}。
// opts.fallbackRoot（可选）：回落根。默认 = 脚本相对仓根（与 py `_memroot.py` parents[2] 同根，
//   供独立脚本/parity 用）。**hook 传入 projectRoot（=CLAUDE_PROJECT_DIR||cwd）**——这样：
//   ① 生产态 CLAUDE_PROJECT_DIR=checkout=脚本相对根 → 与 py 一致；
//   ② cloud（MEMORY_ROOT 指不存在 master）projectRoot=cwd=repo → 回落到 repo、消幻影树（R3B-1）；
//   ③ 测试沙箱 projectRoot=temp → 记忆操作留在沙箱，不打到真实仓。
//   仅当 fallbackRoot ≠ 脚本相对根且真走回落时 LOUD-warn（沙箱=有意；误配=暴露，不静默裂 store）。
export function resolveMemoryRoot(env = process.env, opts = {}) {
  const fallbackRoot = opts.fallbackRoot || SCRIPT_REPO_ROOT;
  const loud = opts.loud || ((m) => process.stderr.write(m + '\n'));
  const m = env.MEMORY_ROOT;
  let result;
  if (m && isDir(m) && isStore(m)) {
    result = { path: m, mode: 'env' };
  } else if (m && isDir(m)) {
    loud(`[memroot] MEMORY_ROOT=${m} 存在但非记忆 store 形状（缺 memory/semantic/）→回落 ${fallbackRoot}`);
    result = { path: fallbackRoot, mode: 'repo-fallback' };
  } else if (m) {
    loud(`[memroot] MEMORY_ROOT=${m} 不存在→回落 ${fallbackRoot}`);
    result = { path: fallbackRoot, mode: 'repo-fallback' };
  } else {
    result = { path: fallbackRoot, mode: 'repo-fallback' };
  }
  if (opts.fallbackRoot && result.mode === 'repo-fallback' && fallbackRoot !== SCRIPT_REPO_ROOT) {
    loud(`[memroot] 回落根 ${fallbackRoot} ≠ 脚本相对仓根 ${SCRIPT_REPO_ROOT}（沙箱/异 cwd；生产态二者重合）`);
  }
  return result;
}

// 供 parity 测试直接 import 调用；命令行入口打印 {path}\n{mode}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = resolveMemoryRoot();
  process.stdout.write(r.path + '\n' + r.mode + '\n');
}
