// 单一记忆根解析器（JS 孪生，P1 / FIX-1，2026-07-24 跨-agent 适配）。
// 与 py 孪生 `memory/scripts/_memroot.py` **同算法**（cross-lang parity 由
// scripts/test-memroot-parity.mjs 保证）。
//
// FIX-1 核心：fallback = **脚本相对仓根**（import.meta.url 上 3 级 = lib→hooks→.claude→repo，
// 且 realpathSync 解符号链接与 py `.resolve()` 对齐），与 py 侧 parents[2] BY-CONSTRUCTION 同根，
// 与 cwd / CLAUDE_PROJECT_DIR 无关。hook 传 fallbackRoot=projectRoot 保生产/云端/沙箱三态一致。
//
// 深审 R1 修复（2026-07-24）：① env 命中路径经 normalizeAbs 规范化（去尾斜杠/折叠 //、.），
// 与 py PurePosixPath(str) 逐字对齐，杜绝下游裸字符串比较误判；② 相对 MEMORY_ROOT 一律拒绝回落
// （相对路径按各自进程 cwd 解析会 JS/py 裂脑）；③ SCRIPT_REPO_ROOT realpathSync 解符号链接。
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { statSync, realpathSync } from 'fs';

// memroot.mjs 在 .claude/hooks/lib/ → 上 3 级 = 仓根（lib→hooks→.claude→repo）
const _lexicalRepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// realpath 解符号链接，与 py `Path(__file__).resolve().parents[2]` 对齐（realpath 失败退词法值）
export const SCRIPT_REPO_ROOT = (() => {
  try { return realpathSync(_lexicalRepoRoot); } catch { return _lexicalRepoRoot; }
})();

// 绝对路径词法规范化，与 py PurePosixPath(str) 一致：折叠 // 与 .、去尾斜杠、保留 ..（不解符号链接）
function normalizeAbs(p) {
  const segs = String(p).split('/').filter((s) => s !== '' && s !== '.');
  return '/' + segs.join('/');
}
function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

// 返回 { path, mode }；mode ∈ {'env','repo-fallback'}。
// opts.fallbackRoot（可选）：回落根。默认 = 脚本相对仓根（与 py parents[2] 同根）。
//   hook 传 projectRoot（=CLAUDE_PROJECT_DIR||cwd）→ 生产态=checkout、云端=cwd/repo（消幻影树）、
//   测试沙箱=temp（记忆留沙箱）。仅当 fallbackRoot≠脚本相对根且真走回落时 LOUD-warn。
export function resolveMemoryRoot(env = process.env, opts = {}) {
  const fallbackRoot = opts.fallbackRoot || SCRIPT_REPO_ROOT;
  const loud = opts.loud || ((m) => process.stderr.write(m + '\n'));
  const m = env.MEMORY_ROOT;
  let result;
  if (m && !isAbsolute(m)) {
    loud(`[memroot] MEMORY_ROOT=${m} 非绝对路径（相对按 cwd 解析会 JS/py 裂脑）→回落 ${fallbackRoot}`);
    result = { path: fallbackRoot, mode: 'repo-fallback' };
  } else if (m && isDir(m)) {
    // 目录存在即接受（显式设 MEMORY_ROOT = 明确意图，含首次 bootstrap 的空 store）。
    // wrong-but-existing store 由 daily_governance 判别器（硬编码 auth 对比）兜底。
    result = { path: normalizeAbs(m), mode: 'env' };
  } else if (m) {
    loud(`[memroot] MEMORY_ROOT=${m} 不存在/不可访问→回落 ${fallbackRoot}`);
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
// 注：用 fileURLToPath 比对而非 `file://${argv[1]}` 字符串拼接——后者对含非 ASCII（如中文目录）
// 的路径不成立（import.meta.url 是 percent-encoded），会让 CLI 入口静默失效（深审 F11 抓出）。
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const r = resolveMemoryRoot();
  process.stdout.write(r.path + '\n' + r.mode + '\n');
}
