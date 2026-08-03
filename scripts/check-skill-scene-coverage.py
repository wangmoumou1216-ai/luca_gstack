#!/usr/bin/env python3
"""场景覆盖报告：「使用即留任」规则的执行者（CLAUDE.md「使用即留任原则」2026-08-03 版）。

判据是场景不是时长：对每个 skill 数两个数——触发场景发生次数（scene，用上下游产物
文件做代理）与它的实际产出次数（output）。判定：
  EXEMPT               SKILL.md 含「非降级信号」低频声明（豁免①），不参与处置
  NO-SIGNAL            场景代理计数 = 0 → 场景没发生，零使用毫无信息量，一律不处置
  DORMANT-WITH-SCENES  场景 ≥ 3 且产出 = 0 → 才是规则的处置线（降级为隐藏；仍人工裁决）
  ACTIVE               有产出
  UNMAPPED             尚未定义场景代理（链头 skill / 代理口径未定），不参与判定——
                       宁可显式 UNMAPPED，不可拍脑袋编代理（无 silent caps）

只报告不处置。**仅限本地运行**：数据在 ~/Desktop/项目/（仓库外），CI runner 上
不存在——不得挂进 verify.sh / GitHub Actions（2026-08-03 红队 R1-D BLOCKER 教训：
check:registration 同错，本地绿 CI 红/假绿）。

产出映射是显式维护的表，禁止按 skill 名猜 glob——同日三次实证猜错：
task-plan 在 engineering/ 非 tasks/；research-kit 是文件名前缀非后缀；
muse-loop-orchestrate 的产出是 loop/specs/REQ-* 目录、不带 skill 名。
"""
import glob
import os
import sys
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
PROJECTS = pathlib.Path(os.path.expanduser("~/Desktop/项目"))
OFFICE = REPO / ".claude" / "skills" / "office"

D = "docs"
# skill → (场景代理 glob 列表, 产出 glob 列表)。glob 相对各项目根。
# 场景代理 = 「该 skill 的输入/评审对象存在」的物证；None = UNMAPPED（显式，不猜）。
TABLE = {
    # 设计→工程链（场景 = 上游产物存在）
    "design-brief":   ([f"{D}/prd/*-prd.md"],                    [f"{D}/decisions/*-design-brief.md"]),
    "ux-brainstorm":  ([f"{D}/prd/*-prd.md", f"{D}/research/*"], [f"{D}/decisions/*-ux-brainstorm.md"]),
    "tech-spec":      ([f"{D}/handoff/*-design-brief-handoff.md"], [f"{D}/engineering/*-tech-spec.md"]),
    "task-plan":      ([f"{D}/handoff/*-tech-spec-handoff.md"],  [f"{D}/engineering/*-task-plan.md"]),  # 不规则①：engineering/ 非 tasks/
    "ux-audit":       ([f"{D}/prototype/*/index.html"],          [f"{D}/evaluation/*ux-audit*.md"]),
    # 研究/内容（本轮对象；场景代理偏弱，判定只会更保守）
    "research-kit":   ([f"{D}/prd/*-prd.md"],                    [f"{D}/research/research-kit-*.md"]),   # 不规则②：前缀
    "insight-synthesis": ([f"{D}/research/research-kit-*.md"],   [f"{D}/research/insight-synthesis-*.md"]),
    "ux-writing":     ([f"{D}/decisions/*-design-brief.md"],     [f"{D}/decisions/*-voice-copy-spec.md",
                                                                  f"{D}/evaluation/*ux-writing*.md"]),
    "muse-loop-orchestrate": ([f"{D}/prd/*-prd.md"],             [f"{D}/loop/specs/REQ-*"]),             # 不规则③：目录、不带 skill 名
    # 链头/多形态产出：代理口径未定，显式不判
    "brainstorm": (None, [f"{D}/prd/*-prd.md"]),
    "deepresearch": (None, [f"{D}/research/*deepresearch*.md"]),
}


def count(project: pathlib.Path, patterns):
    n = 0
    for pat in patterns:
        n += len(glob.glob(str(project / pat)))
    return n


def is_exempt(skill: str) -> bool:
    f = OFFICE / skill / "SKILL.md"
    return f.is_file() and "非降级信号" in f.read_text(encoding="utf-8")


def main():
    if "--selftest" in sys.argv:
        # 守护映射表本身：三个已知不规则必须在表里保持其不规则形态
        ok = ("engineering" in TABLE["task-plan"][1][0]
              and TABLE["research-kit"][1][0].endswith("research-kit-*.md")
              and "REQ-*" in TABLE["muse-loop-orchestrate"][1][0]
              and len(TABLE) >= 8)
        print(f"=== scene-coverage selftest: {'PASS' if ok else 'FAIL'} ===")
        return 0 if ok else 1

    if not PROJECTS.is_dir():
        print(f"FAIL: {PROJECTS} 不存在——本脚本仅限本地运行（数据在仓库外，CI 上没有）")
        return 1

    projects = [p for p in PROJECTS.iterdir()
                if p.is_dir() and (p / "docs").is_dir() and p.name != "muse" or
                (p.is_dir() and p.name == "muse")]

    print(f"{'skill':24} {'scene':>6} {'output':>7}  判定")
    verdicts = []
    for skill, (scene_pats, out_pats) in TABLE.items():
        out_n = sum(count(p, out_pats) for p in projects)
        if scene_pats is None:
            verdict = "UNMAPPED"
            scene_n = "-"
        else:
            scene_n = sum(count(p, scene_pats) for p in projects)
            if is_exempt(skill):
                verdict = "EXEMPT（低频声明豁免①）"
            elif out_n > 0:
                verdict = "ACTIVE"
            elif scene_n == 0:
                verdict = "NO-SIGNAL（场景未发生，不得处置）"
            elif scene_n >= 3:
                verdict = "DORMANT-WITH-SCENES（场景发生而零调用→人工裁决是否降级）"
            else:
                verdict = f"WATCH（场景仅 {scene_n} 次，样本不足）"
        print(f"{skill:24} {scene_n!s:>6} {out_n:>7}  {verdict}")
        verdicts.append(verdict)

    print("\n只报告不处置；DORMANT-WITH-SCENES 的处置（降级为隐藏）仍须人工裁决。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
