// 项目基座单一裁决 helper（P2 / FIX-2，2026-07-24 跨-agent 适配）。
// 与 py 孪生 memory/scripts/_project.py **同算法**。
//
// FIX-2：4 个 marker-parser 站点（route-guard / session-restore / session-sync / append_episode）
// 原本语义不一（route-guard 多段 slice+endsWith 兜底、其余首段正则），嵌套路径
// `.../项目/muse/lucagstack/docs` 下 route-guard 返 'muse/lucagstack'、其余返 'muse' → cross-hook
// project-identity 分裂。改为**单一 canonical 裁决**：strip /docs → 取 PROJECTS_ROOT 后路径 →
// known-projects **最长前缀匹配**（无命中回退首段）。全 4 站共用 → 嵌套下亦一致。
//
// 关键性质：**单段 rest（所有现有用例）下 longest-match ≡ 首段**，故对 project.sh 实际产物
// （单段项目名）零行为变化；仅把嵌套/checkout 病态路径收敛到 ∈known-projects 的顶层名。
import { readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// PROJECTS_ROOT：LUCA_PROJECTS_ROOT 覆盖（cloud/override），默认 $HOME/Desktop/项目
export const PROJECTS_ROOT = process.env.LUCA_PROJECTS_ROOT || join(homedir(), 'Desktop', '项目');

// PROJECTS_ROOT 直接子目录名（均单段），作 longest-match 的 known-projects 集
export function listProjects() {
  try {
    return readdirSync(PROJECTS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name);
  } catch {
    return [];
  }
}

// docs 软链 target → 规范项目名。opts.projects 可显式传入（route-guard 有 known list）；
// opts.projectsRoot 可覆盖（测试）。缺省 listProjects()/PROJECTS_ROOT。
export function projectNameFromLink(target, opts = {}) {
  if (!target) return '';
  const projects = opts.projects || listProjects();
  const projectsRoot = opts.projectsRoot || PROJECTS_ROOT;
  // strip 尾部 /docs（含可能的尾斜杠）
  const path = String(target).replace(/\/docs\/?$/, '');
  // 定位 projects-root：优先配置根前缀；否则 legacy/相对软链回退到 '项目/' 子串标记
  let rest = null;
  if (path === projectsRoot) {
    return '';
  } else if (path.startsWith(projectsRoot + '/')) {
    rest = path.slice(projectsRoot.length + 1);
  } else {
    for (const mk of ['/项目/', 'Desktop/项目/']) {
      const idx = path.lastIndexOf(mk);
      if (idx >= 0) { rest = path.slice(idx + mk.length); break; }
    }
  }
  if (rest == null) return '';
  const segs = rest.split('/').filter(Boolean);
  if (segs.length === 0) return '';
  // known-projects 最长前缀匹配（从长到短，返回首个 ∈projects 的前缀）
  for (let n = segs.length; n >= 1; n--) {
    const cand = segs.slice(0, n).join('/');
    if (projects.includes(cand)) return cand;
  }
  // 无 known 前缀（override 下全新项目 / 列表读失败）→ 回退首段（保 3 站首段语义为安全默认）
  return segs[0];
}
