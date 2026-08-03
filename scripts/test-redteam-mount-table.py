#!/usr/bin/env python3
"""回归测试：redteam 判据挂载表必须存在且其引用路径全部有效。

背景（2026-08-03）：三个零使用的评审 skill 被删除后，框架积累的领域判据改由 redteam 的
「判据挂载表」按 target 类型取用。那张表是这些判据唯一的可达入口，而它只是 SKILL.md 里的
一段 markdown——文件改名、路径笔误、甚至整张表被删，都不会被任何门禁发现。

本测试**同时**断言三件事（缺任何一条就会退化成半空测试，实现后评审已实证）：
  ① 表还在——按已知路径条数设下限，整张表被删/被大幅削减即转红
  ② 表里每条 `路径.md` 都真实存在
  ③ 表里点名的判据文件里确实有对应内容（抽样锚点，防"文件在但内容被掏空"）

第 ① 条是关键：此前用 `for p in $(grep ...)` 实现，grep 无输出时循环体一次都不执行、
恒返回 0——删掉整张表反而"通过"。
"""
import re
import sys
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
OFFICE = REPO / ".claude" / "skills" / "office"
REDTEAM = OFFICE / "redteam" / "SKILL.md"

# 表里应当出现的最少路径条数。新增挂载行时同步上调；下调需说明理由。
MIN_PATHS = 8

# 抽样锚点：{路径: 该文件里必须命中的正则}，防"文件还在但判据被掏空"
CONTENT_ANCHORS = {
    "ux-audit/specialists/module-a-visual.md": r"得分计算|间距",
    "ux-audit/specialists/module-b-interaction.md": r"Nielsen",
    "references/ai-native-taste-anchors.md": r"取证表|锚点",
    "references/ai-native-design-framework.md": r"Slop",
    "references/oracle-vs-taste-criteria.md": r"oracle|taste",
}

# 反引号包裹的 markdown 路径；大小写与下划线一并收，避免改名逃出视野
PATH_RE = re.compile(r"`([A-Za-z0-9_./-]+\.md)`")


def main():
    if not REDTEAM.is_file():
        print(f"FAIL: {REDTEAM} 不存在")
        return 1

    text = REDTEAM.read_text(encoding="utf-8")
    if "判据挂载" not in text:
        print("FAIL: redteam/SKILL.md 里找不到「判据挂载」表——判据的唯一可达入口消失了")
        return 1

    paths = sorted({p for p in PATH_RE.findall(text) if "/" in p or p.endswith(".md")})
    # 只保留能在 office/ 下解析的相对路径（排除正文里提到的其它文档）
    resolved = [p for p in paths if (OFFICE / p).exists() or p in CONTENT_ANCHORS
                or p.startswith(("references/", "ux-audit/", "design-brief/"))]

    fails = []
    if len(resolved) < MIN_PATHS:
        fails.append(f"挂载表路径只剩 {len(resolved)} 条 (< {MIN_PATHS})——表可能被删除或大幅削减")

    for p in resolved:
        target = OFFICE / p
        if not target.is_file():
            fails.append(f"路径不存在: {p}")
            continue
        pat = CONTENT_ANCHORS.get(p)
        if pat and not re.search(pat, target.read_text(encoding="utf-8"), re.I):
            fails.append(f"内容锚点缺失: {p} 里找不到 /{pat}/")

    print(f"挂载表路径 {len(resolved)} 条（下限 {MIN_PATHS}），内容锚点 {len(CONTENT_ANCHORS)} 项")
    for f in fails:
        print(f"  ✗ {f}")
    print(f"=== redteam mount table: {'ALL PASS' if not fails else f'{len(fails)} FAILED'} ===")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
