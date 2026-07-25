#!/usr/bin/env python3
"""项目基座单一裁决 helper（py 孪生，P2 / FIX-2，2026-07-24）。

与 JS 孪生 `.claude/hooks/lib/project-substrate.mjs` **同算法**。见该文件头注。
append_episode.py 的 docs 软链推导改用本模块，与 3 个 JS 站点统一 canonical。
"""
import os
from pathlib import Path

# PROJECTS_ROOT：LUCA_PROJECTS_ROOT 覆盖，默认 $HOME/Desktop/项目
PROJECTS_ROOT = os.environ.get("LUCA_PROJECTS_ROOT") or str(Path.home() / "Desktop" / "项目")


def list_projects(projects_root=None):
    root = Path(projects_root or PROJECTS_ROOT)
    try:
        return [d.name for d in root.iterdir() if d.is_dir() and not d.name.startswith(".")]
    except OSError:
        return []


def project_name_from_link(target, projects=None, projects_root=None):
    """docs 软链 target → 规范项目名（known-projects 最长前缀匹配，无命中回退首段）。"""
    if not target:
        return ""
    projects_root = projects_root or PROJECTS_ROOT
    if projects is None:
        projects = list_projects(projects_root)
    path = str(target)
    # strip 尾部 /docs（含尾斜杠）
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
        for mk in ("/项目/", "Desktop/项目/"):
            idx = path.rfind(mk)
            if idx >= 0:
                rest = path[idx + len(mk):]
                break
    if rest is None:
        return ""
    segs = [s for s in rest.split("/") if s]
    if not segs:
        return ""
    for n in range(len(segs), 0, -1):
        cand = "/".join(segs[:n])
        if cand in projects:
            return cand
    return segs[0]
