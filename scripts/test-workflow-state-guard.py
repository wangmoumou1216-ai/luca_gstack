#!/usr/bin/env python3
"""回归测试：workflow-state 写入块不得在 yaml 解析失败时擦除既有状态。

背景（2026-08-03）：ux-audit / handoff-review / design-review 三个 skill 共用同款
写入块，原写法 `except: state = {}` 会在 yaml 解析失败时落到空字典，而紧随其后的
`yaml.dump(state, open(..., 'w'))` 是整文件覆写 —— 结果是 topic/scene 与其余全部
节点被一次性擦除。handoff-review 那份尤其危险：它是顶层 `iteration` 的唯一写者，
擦除后 `state.get('iteration', 0)` 读到 0，连续失败计数静默归零，
session-restore.mjs 的「已连续失败 N 次」告警随之失效。

本测试直接从三个 SKILL.md 提取**真实**的 python 块来跑（不抄代码，避免验错对象），
对每处断言两件事：
  ① 损坏 yaml → 非零退出 且 原文件一字不动
  ② 正常 yaml → 正常写入 且 既有节点全部保留（防「修成永远不写」）
"""
import re
import os
import sys
import shutil
import pathlib
import tempfile
import subprocess

REPO = pathlib.Path(__file__).resolve().parent.parent
SKILLS = REPO / ".claude" / "skills" / "office"

TARGETS = [
    ("ux-audit", SKILLS / "ux-audit" / "SKILL.md",
     {"_TOPIC": "t", "_OUTPUT": "o", "_EXTRA_BASELINE": "85"}),
]
# 原另两处（handoff-review / design-review）已随 2026-08-03 的评审资产整合删除；
# 若将来有新 skill 内嵌同款 yaml 读-改-写块，加进本表即可（不要复制那段 except 写法）。

GOOD = """topic: 速记
scene: B
iteration: 5
nodes:
  brainstorm:
    status: DONE
  design-brief:
    status: DONE
"""
BAD = GOOD + "  bad: [unclosed\n"

STATE_REL = os.path.join(".claude", "workflow-state.yaml")


def extract_block(path):
    src = pathlib.Path(path).read_text(encoding="utf-8")
    m = re.search(r"python3 <<\s*PYEOF\n(.*?)\nPYEOF", src, re.S)
    if not m:
        raise AssertionError(f"未在 {path} 找到 python 写入块")
    return m.group(1)


def run(code, env_extra, content):
    d = tempfile.mkdtemp()
    try:
        target = pathlib.Path(d) / STATE_REL
        target.parent.mkdir(parents=True)
        target.write_text(content, encoding="utf-8")
        before = target.read_text(encoding="utf-8")
        proc = subprocess.run(
            [sys.executable, "-c", code], cwd=d, env={**os.environ, **env_extra},
            capture_output=True, text=True,
        )
        return proc.returncode, before, target.read_text(encoding="utf-8")
    finally:
        shutil.rmtree(d, ignore_errors=True)


def main():
    fails = 0
    for name, path, env in TARGETS:
        code = extract_block(path)

        rc, before, after = run(code, env, BAD)
        ok = rc != 0 and before == after
        print(f"[{name}] 损坏yaml 拒写: exit={rc} 文件未变={before == after} "
              f"{'✅' if ok else '❌'}")
        fails += 0 if ok else 1

        rc, before, after = run(code, env, GOOD)
        kept = all(k in after for k in ("brainstorm", "design-brief", "topic:"))
        ok = rc == 0 and before != after and kept
        print(f"[{name}] 正常yaml 写入: exit={rc} 已写入={before != after} "
              f"既有节点保留={kept} {'✅' if ok else '❌'}")
        fails += 0 if ok else 1

    print(f"\n=== workflow-state guard: {'ALL PASS' if not fails else f'{fails} FAILED'} ===")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
