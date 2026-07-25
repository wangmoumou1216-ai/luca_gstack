#!/usr/bin/env python3
"""项目基座单一裁决 helper（py 孪生，P2 / FIX-2，2026-07-24；2026-07-25 深审加固）。

与 JS 孪生 `.claude/hooks/lib/project-substrate.mjs` **同算法**。见该文件头注（段校验 fail-closed /
根归一化 / endsWith 兜底 / first-marker / listProjects 形参与软链语义对齐）。
"""
import os
from pathlib import Path

DEFAULT_ROOT = str(Path.home() / "Desktop" / "项目")


def _norm_root(p) -> str:
    s = str(p or "").rstrip("/")
    return s or DEFAULT_ROOT


def _resolve_projects_root() -> str:
    ov = os.environ.get("LUCA_PROJECTS_ROOT")
    if not ov:
        return _norm_root(DEFAULT_ROOT)
    if not os.path.isabs(ov):
        import sys
        sys.stderr.write(f"[_project] LUCA_PROJECTS_ROOT={ov} 非绝对路径（会随 cwd 漂移）→忽略，用默认根\n")
        return _norm_root(DEFAULT_ROOT)
    return _norm_root(ov)


PROJECTS_ROOT = _resolve_projects_root()


def list_projects(projects_root=None):
    """PROJECTS_ROOT 直接子目录名（软链目录也算，与 JS 侧对齐）。"""
    root = Path(_norm_root(projects_root or PROJECTS_ROOT))
    try:
        return [d.name for d in root.iterdir() if not d.name.startswith(".") and d.is_dir()]
    except OSError:
        return []


def project_name_from_link(target, projects=None, projects_root=None):
    """docs 软链 target → 规范项目名（known-projects 最长前缀匹配，无命中回退首段）。"""
    if not target:
        return ""
    projects_root = _norm_root(projects_root or PROJECTS_ROOT)
    if projects is None:
        projects = list_projects(projects_root)
    raw = str(target)
    path = raw
    if path.endswith("/docs"):
        path = path[: -len("/docs")]
    elif path.endswith("/docs/"):
        path = path[: -len("/docs/")]
    if path == projects_root:
        return ""
    rest = None
    if path.startswith(projects_root + "/"):
        rest = path[len(projects_root) + 1:]
    else:
        # legacy/相对软链：用**第一个** marker（与被替换的旧实现 find/正则语义一致）
        for mk in ("/项目/", "Desktop/项目/"):
            idx = path.find(mk)
            if idx >= 0:
                rest = path[idx + len(mk):]
                break
    if rest is None:
        # 兜底：已知项目名后缀匹配（旧 route-guard 第二通路）
        for name in projects:
            if name and "/" not in name and raw.endswith(f"/{name}/docs"):
                return name
        return ""
    segs = rest.split("/")
    # fail-closed 段校验：空段 / '.' / '..' 一律拒绝（防路径穿越）
    if any(s in ("", ".", "..") for s in segs):
        return ""
    if not segs:
        return ""
    for n in range(len(segs), 0, -1):
        cand = "/".join(segs[:n])
        if cand in projects:
            return cand
    return segs[0]
