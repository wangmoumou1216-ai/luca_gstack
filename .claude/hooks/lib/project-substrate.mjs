// 项目基座单一裁决 helper（P2 / FIX-2，2026-07-24；2026-07-25 深审加固）。
// 与 py 孪生 memory/scripts/_project.py **同算法**（parity 由 scripts/test-project-substrate.mjs 保证）。
//
// FIX-2：4 个 marker-parser 站点（route-guard / session-restore / session-sync / append_episode）
// 原本语义不一（route-guard 多段 slice+endsWith 兜底、其余首段正则），嵌套路径下 cross-hook
// 项目身份分裂。统一为**单一 canonical 裁决**。
//
// 深审加固（2026-07-25）：
//  · 段校验 fail-closed：任一段为 '' / '.' / '..' → 返回 ''（实证旧行为可让写入逃出 projects 根）。
//  · PROJECTS_ROOT 归一化：去尾斜杠（带斜杠曾让 4 站全部静默解析失败）；非绝对路径的 override
//    忽略并告警（相对根会随各 hook 的 cwd 漂移 = 重新制造分裂）。
//  · 恢复 endsWith 兜底（旧 route-guard 的第二通路，被 FIX-2 首版误删）。
//  · marker 用 **first**（indexOf/find）与被替换的旧实现语义一致，不做静默反转。
//  · listProjects 接受 projectsRoot 形参；软链目录判定与 py `Path.is_dir()`（跟随）对齐。
import { readdirSync, statSync } from 'fs';
import { join, isAbsolute } from 'path';
import { homedir } from 'os';

const DEFAULT_ROOT = join(homedir(), 'Desktop', '项目');
function normRoot(p) {
  const s = String(p || '').replace(/\/+$/, '');
  return s || DEFAULT_ROOT;
}
// LUCA_PROJECTS_ROOT 覆盖（cloud/异机）；非绝对路径忽略（会随 cwd 漂移→跨 hook 分裂）
export const PROJECTS_ROOT = (() => {
  const ov = process.env.LUCA_PROJECTS_ROOT;
  if (!ov) return normRoot(DEFAULT_ROOT);
  if (!isAbsolute(ov)) {
    try { process.stderr.write(`[project-substrate] LUCA_PROJECTS_ROOT=${ov} 非绝对路径（会随 cwd 漂移）→忽略，用默认根\n`); } catch { }
    return normRoot(DEFAULT_ROOT);
  }
  return normRoot(ov);
})();

// PROJECTS_ROOT 直接子目录名（均单段）；软链目录也算（与 py Path.is_dir() 跟随语义一致）
export function listProjects(projectsRoot = PROJECTS_ROOT) {
  try {
    return readdirSync(projectsRoot, { withFileTypes: true })
      .filter((d) => {
        if (d.name.startsWith('.')) return false;
        if (d.isDirectory()) return true;
        if (d.isSymbolicLink()) {
          try { return statSync(join(projectsRoot, d.name)).isDirectory(); } catch { return false; }
        }
        return false;
      })
      .map((d) => d.name);
  } catch {
    return [];
  }
}

// docs 软链 target → 规范项目名。opts.projects / opts.projectsRoot 可覆盖（测试与 route-guard 用）。
export function projectNameFromLink(target, opts = {}) {
  if (!target) return '';
  const projectsRoot = normRoot(opts.projectsRoot || PROJECTS_ROOT);
  const projects = opts.projects || listProjects(projectsRoot);
  const raw = String(target);
  const path = raw.replace(/\/docs\/?$/, ''); // strip 尾部 /docs（含尾斜杠）
  let rest = null;
  if (path === projectsRoot) {
    return '';
  } else if (path.startsWith(projectsRoot + '/')) {
    rest = path.slice(projectsRoot.length + 1);
  } else {
    // legacy/相对软链：用**第一个** marker（与被替换的旧实现 indexOf/正则语义一致）
    for (const mk of ['/项目/', 'Desktop/项目/']) {
      const idx = path.indexOf(mk);
      if (idx >= 0) { rest = path.slice(idx + mk.length); break; }
    }
  }
  if (rest == null) {
    // 兜底：已知项目名后缀匹配（旧 route-guard 的第二通路；根外/同级相对链仍可解析）
    const hit = projects.find((name) => name && !name.includes('/') && raw.endsWith(`/${name}/docs`));
    return hit || '';
  }
  const segs = rest.split('/');
  // fail-closed 段校验：空段 / '.' / '..' 一律拒绝（防路径穿越——实证可让写入逃出 projects 根）
  if (segs.some((s) => s === '' || s === '.' || s === '..')) return '';
  if (segs.length === 0) return '';
  // known-projects 最长前缀匹配（合约；生产中 listProjects 恒单段 ⇒ 等价首段）
  for (let n = segs.length; n >= 1; n--) {
    const cand = segs.slice(0, n).join('/');
    if (projects.includes(cand)) return cand;
  }
  return segs[0]; // 无 known 前缀（新项目/列表读失败）→ 回退首段
}
