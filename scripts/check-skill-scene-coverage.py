#!/usr/bin/env python3
"""场景覆盖报告：「使用即留任」规则的执行者（CLAUDE.md「使用即留任原则」，口径表以本文件 TABLE 为单真值源）。

判据是场景不是时长：对每个 skill 数两个数——窗口内触发场景发生次数（scene，用上下游
产物文件 mtime 过滤做代理）与窗口内产出次数（output）。判定：
  EXEMPT               在 EXEMPT_EXPECTED 白名单且 SKILL.md 含「非降级信号」声明（豁免①）
  TOO-NEW              skill 存在天数 < 窗口 → 不判（2026-08-03 名单 11→5 的年龄维度，保留为底线）
  NO-SIGNAL            窗口内场景代理计数 = 0 → 场景没发生，零使用毫无信息量，一律不处置
  DORMANT-WITH-SCENES  强代理场景 ≥ THRESH 且产出 = 0 → 规则的处置线（仍人工裁决）
  DORMANT?（弱代理）    弱代理场景 ≥ THRESH 且产出 = 0 → 场景语义需人工确认，不得直接处置
  ACTIVE / WATCH / UNMAPPED / UNOBSERVABLE  如字面
只报告不处置。**仅限本地运行**（数据在 ~/Desktop/项目/ 仓库外，CI 上不存在——
不得挂 verify.sh 的数据模式；--selftest 纯读仓内，可进 CI）。

产出映射是显式维护的表，禁止猜 glob（三次实证猜错：task-plan 在 engineering/、
research-kit 是前缀、muse-loop 产出是 REQ-* 目录不带 skill 名）。
"""
import glob
import os
import sys
import time
import pathlib
import subprocess

REPO = pathlib.Path(__file__).resolve().parent.parent
PROJECTS = pathlib.Path(os.path.expanduser("~/Desktop/项目"))
OFFICE = REPO / ".claude" / "skills" / "office"

WINDOW_DAYS = 60   # 窗口：老规则的 60 天保留为时间量纲（评审 BLOCKER：无窗则计数只增不减）
THRESH = 3         # 初始值，无实证推导（评审 MINOR：拍的）；首次真实治理复盘后按误报率校准

# 豁免①白名单：写「非降级信号」四个字还不够，须同时在此登记（滥用防护——
# 新增豁免必须改本文件，改动过 git review 可见）。
EXEMPT_EXPECTED = {"research-kit", "insight-synthesis", "ux-writing"}

D = "docs"
# skill → (场景代理 glob 或 None, 产出 glob, 代理强度 strong/weak)
# strong = 代理与「该 skill 的场景发生」有直接因果；weak = 只是必要条件（对象存在≠需求发生）。
# None+UNMAPPED = 链头/口径未定，显式不判不猜；"unobservable" = 场景结构上不落盘（如数据由用户手供）。
TABLE = {
    "design-brief":   ([f"{D}/prd/*-prd.md"],                      [f"{D}/decisions/*-design-brief.md"], "strong"),
    "ux-brainstorm":  ([f"{D}/prd/*-prd.md"],                      [f"{D}/decisions/*-ux-brainstorm.md"], "strong"),
    "tech-spec":      ([f"{D}/handoff/*-design-brief-handoff.md"], [f"{D}/engineering/*-tech-spec.md"], "strong"),
    "task-plan":      ([f"{D}/handoff/*-tech-spec-handoff.md"],    [f"{D}/engineering/*-task-plan.md"], "strong"),
    "ux-audit":       ([f"{D}/prototype/*/index.html"],            [f"{D}/evaluation/*ux-audit*.md"], "weak"),
    "research-kit":   ([f"{D}/prd/*-prd.md"],                      [f"{D}/research/research-kit-*.md"], "weak"),
    "insight-synthesis": (None,                                    [f"{D}/research/insight-synthesis-*.md"], "unobservable"),
    "ux-writing":     ([f"{D}/decisions/*-design-brief.md"],       [f"{D}/decisions/*-voice-copy-spec.md",
                                                                    f"{D}/evaluation/*ux-writing*.md"], "weak"),
    "muse-loop-orchestrate": ([f"{D}/prd/*-prd.md"],               [f"{D}/loop/specs/REQ-*"], "weak"),
    "html-prototype": ([f"{D}/decisions/*-design-brief.md"],       [f"{D}/prototype/*/prototype-spec.md"], "weak"),
    "open-design":    ([f"{D}/decisions/*-design-brief.md"],       [f"{D}/prototype/*/index.html"], "weak"),
    "figma-layer":    ([f"{D}/prototype/*/index.html"],            [f"{D}/figma/*/figma-spec.md"], "strong"),
    # 链头/多形态：代理口径未定，显式 UNMAPPED（诚实优于全覆盖）
    "brainstorm": (None, [f"{D}/prd/*-prd.md"], "unmapped"),
    "deepresearch": (None, [f"{D}/research/*deepresearch*.md"], "unmapped"),
    "quick-research": (None, [f"{D}/research/*quick-research*.md"], "unmapped"),
    "ux-research": (None, [f"{D}/research/ux-research-*.md"], "unmapped"),
    "idea": (None, [f"{D}/idea/*.md"], "unmapped"),
    # 会话工具：产物刻意落 OS 临时目录，不进入项目产物面；用 episodic skills_used 观察触发。
    "handoff": (None, [], "session-tool"),
    # auto：截流实验观察对象（2026-08-03 移出 ROUTE_GUARD_HEAVY_SKILLS，60 天盒到期 2026-10-02）。
    # 它是编排器、无唯一文件产物——观察通道 = 窗口内 episodic skills_used 含 "auto" 的条数
    # （自陈字段有漏记可能，复盘时辅以对话记录核对；混杂因素：部分触发词召回不全，
    # 如「全自动把这些需求做出来」落 STOP——复盘时先查词表召回再下需求侧结论）。
    "auto": (None, [], "experiment"),
    "code-recon": (None, [f"{D}/engineering/*architecture*"], "unmapped"),
    "code-hygiene": (None, [], "unmapped"),
    # 工程原语/只读审查入口均无固定落盘产物；实际触发由 episodic skills_used 观察。
    "codebase-design": (None, [], "unobservable"),
    "code-review": (None, [], "unobservable"),
    # Engineering-delivery methods/facades have no unique project-file output. Their canonical
    # owners (tech-spec/task-plan/Plan Agent/Orchestrator) own durable artifacts and state, so
    # attributing those files back to these entries would manufacture false usage evidence.
    "grilling": (None, [], "unobservable"),
    "diagnosing-bugs": (None, [], "unobservable"),
    "resolving-merge-conflicts": (None, [], "unobservable"),
    "to-spec": (None, [], "unobservable"),
    "to-tickets": (None, [], "unobservable"),
    "wait-what": (None, [], "unobservable"),
    "wayfinder": (None, [], "unobservable"),
    "implement": (None, [], "unobservable"),
    "muse-req-triage": (None, [f"{D}/loop/*"], "unmapped"),
}


def routing_map_invokes():
    """SSOT 对账源：skill-routing-map.yaml 的全部 invoke 名。"""
    import re
    text = (REPO / ".claude" / "skill-os" / "skill-routing-map.yaml").read_text(encoding="utf-8")
    return {m.group(1) for m in re.finditer(r'invoke:\s*"/([a-z0-9-]+)"', text)}


def count(project: pathlib.Path, patterns, cutoff: float):
    n = 0
    for pat in patterns:
        for f in glob.glob(str(project / pat)):
            try:
                if os.path.getmtime(f) >= cutoff:
                    n += 1
            except OSError:
                pass
    return n


def skill_age_days(skill: str):
    """首 commit 距今天数；取不到（git 失败）返回 None → 不做 TOO-NEW 判定。"""
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO), "log", "--follow", "--format=%at",
             "--", f".claude/skills/office/{skill}/SKILL.md"],
            capture_output=True, text=True, timeout=30)
        stamps = [int(x) for x in out.stdout.split() if x.strip()]
        return (time.time() - min(stamps)) / 86400 if stamps else None
    except Exception:
        return None


def episodic_uses(skill: str, cutoff: float):
    """窗口内 episodic 记录 skills_used 含该 skill 的条数（实验观察通道；自陈字段、可能漏记）。"""
    import json
    import datetime
    n = 0
    try:
        for line in (REPO / "memory" / "episodic" / "index.jsonl").read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if skill not in str(d.get("skills_used", "")):
                continue
            try:
                ts = datetime.datetime.fromisoformat(str(d.get("date", ""))[:10]).timestamp()
            except Exception:
                continue
            if ts >= cutoff:
                n += 1
    except OSError:
        pass
    return n


def is_exempt(skill: str) -> bool:
    if skill not in EXEMPT_EXPECTED:
        return False
    f = OFFICE / skill / "SKILL.md"
    return f.is_file() and "非降级信号" in f.read_text(encoding="utf-8")


def selftest() -> int:
    fails = []
    # 三个已知不规则保持形态
    if "engineering" not in TABLE["task-plan"][1][0]:
        fails.append("task-plan 产出应在 engineering/")
    if not TABLE["research-kit"][1][0].endswith("research-kit-*.md"):
        fails.append("research-kit 是前缀命名")
    if "REQ-*" not in TABLE["muse-loop-orchestrate"][1][0]:
        fails.append("muse-loop 产出是 REQ-* 目录")
    # SSOT：TABLE 必须覆盖 routing-map 的全部一级 invoke（新 skill 漏登记即红）
    missing = routing_map_invokes() - set(TABLE)
    if missing:
        fails.append(f"TABLE 缺 routing-map 一级 skill: {sorted(missing)}")
    # 豁免守护：白名单里每个 skill 的 SKILL.md 必须真含声明（四个字被误删即红）
    for s in sorted(EXEMPT_EXPECTED):
        f = OFFICE / s / "SKILL.md"
        if not (f.is_file() and "非降级信号" in f.read_text(encoding="utf-8")):
            fails.append(f"豁免声明缺失: {s}/SKILL.md 无「非降级信号」（白名单与声明必须同在）")
    for m in fails:
        print(f"  ✗ {m}")
    print(f"=== scene-coverage selftest: {'PASS' if not fails else f'{len(fails)} FAILED'} ===")
    return 1 if fails else 0


def main():
    if "--selftest" in sys.argv:
        return selftest()

    if not PROJECTS.is_dir():
        print(f"FAIL: {PROJECTS} 不存在——本脚本数据模式仅限本地（CI 无仓外数据）")
        return 1

    cutoff = time.time() - WINDOW_DAYS * 86400
    projects = [p for p in PROJECTS.iterdir() if p.is_dir() and (p / "docs").is_dir()]

    print(f"窗口 {WINDOW_DAYS} 天 · 阈值 {THRESH}（初始值待校准） · 项目 {len(projects)} 个\n")
    print(f"{'skill':24} {'scene':>6} {'output':>7}  判定")
    for skill, (scene_pats, out_pats, strength) in sorted(TABLE.items()):
        out_n = sum(count(p, out_pats, cutoff) for p in projects)
        if strength == "unmapped":
            print(f"{skill:24} {'-':>6} {out_n:>7}  UNMAPPED（代理口径未定，不判）")
            continue
        if strength == "experiment":
            used = episodic_uses(skill, cutoff)
            print(f"{skill:24} {'-':>6} {used:>7}  EXPERIMENT（截流实验观察中，output=窗口内 episodic 使用数；到期 2026-10-02 复盘，判据与混杂因素见 TABLE 注释）")
            continue
        if strength == "session-tool":
            used = episodic_uses(skill, cutoff)
            print(f"{skill:24} {'-':>6} {used:>7}  SESSION-TOOL（项目无关、OS 临时产物不入库；output=窗口内 episodic 使用数）")
            continue
        if strength == "unobservable":
            print(f"{skill:24} {'-':>6} {out_n:>7}  UNOBSERVABLE（场景不落盘；命中靠语义兜底 + session-restore kit→synthesis 接力提醒，不判）")
            continue
        scene_n = sum(count(p, scene_pats, cutoff) for p in projects)
        age = skill_age_days(skill)
        if is_exempt(skill):
            verdict = "EXEMPT（低频声明豁免①，白名单+声明双确认）"
        elif age is not None and age < WINDOW_DAYS:
            verdict = f"TOO-NEW（存在 {age:.0f} 天 < 窗口，不判）"
        elif out_n > 0:
            verdict = "ACTIVE"
        elif scene_n == 0:
            verdict = "NO-SIGNAL（窗口内场景未发生，不得处置）"
        elif scene_n >= THRESH:
            verdict = ("DORMANT-WITH-SCENES（场景发生而零调用→人工裁决）" if strength == "strong"
                       else "DORMANT?（弱代理：对象存在≠需求发生，场景语义需人工确认，不得直接处置）")
        else:
            verdict = f"WATCH（窗口内场景仅 {scene_n} 次，样本不足）"
        print(f"{skill:24} {scene_n:>6} {out_n:>7}  {verdict}")

    print("\n只报告不处置；任何 DORMANT 判定的处置（降级为隐藏）都须人工裁决。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
