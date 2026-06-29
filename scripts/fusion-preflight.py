#!/usr/bin/env python3
"""fusion-preflight.py — 融合门 Step①：地毯式影响分析 → impact-report 骨架。

读 self-model.yaml 的 surface[dimension]，列出该维度融合会触碰的真实文件 +
通用隐式耦合清单(FM-6) + 九步门禁序列。输出到 stdout，用户重定向成 impact-report.md。
同时检查 git worktree 是否干净（融合须在干净起点）。

用法：
  python3 scripts/fusion-preflight.py --dimension routing --candidate "some-skill" [--reuse-mode install]
"""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF_MODEL = ROOT / ".claude" / "skill-os" / "evolution" / "self-model.yaml"

IMPLICIT_COUPLING = [
    "4 路 model 一致：SKILL.md recommended-model ↔ model-routing.yaml ↔ CLAUDE.md 快照 ↔ orchestrator.md 快照",
    "observability/rules.yaml 按 skill 名 scope 的规则（skill 改名 → 静默孤儿化）",
    "路由 5 文件同步：skill-routing-map / input-modes / optional-workflow-graph / rules.yaml / CLAUDE.md+AGENTS.md",
    "受保护区：framework/ 只读、SKILL.md P1-P7、brand-tokens #FF8000",
]
GATE_SEQUENCE = [
    "④ 静态+契约：bash scripts/verify.sh + npm run check:hooks/check:routing-map/check:quality-gates/check:coding-discipline/check:self-model",
    "⑤ 漂移：npm run check:routing-map + daily_governance.check_model_routing()",
    "⑥ 行为A/B（prose 改动必做）：behavioral_ab.py --skill-tier <候选 skill 档：reasoning-heavy=fable/opus · guided-execution=sonnet · mechanical=haiku>，在该档上 baseline vs candidate（勿固定 Sonnet，否则给 reasoning-heavy skill 测错模型，见 GAP-behavioral-ab-tier）",
    "⑦ 对抗：preflight-agent + quality-gate(Sonnet) + redteam(Fable)",
    "⑧ 回滚就绪：git tag pre-fuse-<id> → worktree squash-merge 单提交",
    "⑨ 反馈：append adoption-log.jsonl",
]


def load_surface(dimension):
    import yaml
    data = yaml.safe_load(SELF_MODEL.read_text(encoding="utf-8")) or {}
    surface = (data.get("surface") or {})
    if dimension not in surface:
        sys.stderr.write(f"未知 dimension '{dimension}'。有效：{', '.join(surface.keys())}\n")
        sys.exit(2)
    return surface[dimension]


def collect_files(node):
    """从一个 surface 维度的 dict 里收集所有 file-ish 值（字符串路径 / 列表）。"""
    out = []
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "external_help":
                continue
            if isinstance(v, str):
                out.append(f"{k}: {v}")
            elif isinstance(v, list):
                out.append(f"{k}: {', '.join(str(x) for x in v)}")
    return out


def git_clean():
    try:
        r = subprocess.run(["git", "status", "--porcelain"], cwd=str(ROOT), capture_output=True, text=True, timeout=15)
        return r.stdout.strip() == ""
    except Exception:  # noqa: BLE001
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dimension", required=True)
    ap.add_argument("--candidate", default="(unnamed)")
    ap.add_argument("--reuse-mode", default="(unspecified)")
    a = ap.parse_args()

    surface = load_surface(a.dimension)
    files = collect_files(surface)
    clean = git_clean()
    ext = surface.get("external_help", "")

    lines = [
        f"# 融合影响分析（impact-report）— {a.candidate}",
        "",
        f"- dimension: **{a.dimension}**　reuse_mode: **{a.reuse_mode}**",
        f"- worktree 干净: {'✅' if clean else ('⚠️ 有未提交改动，先 stash/commit' if clean is False else '❓git 不可用')}",
        f"- 该维度通常受外部帮助的方向: {ext}",
        "",
        "## 受影响 surface 文件（闭合扫描集，逐个核对）",
    ]
    lines += [f"- [ ] {f}" for f in files] or ["- (surface 该维度无文件登记)"]
    lines += ["", "## 隐式耦合清单（FM-6，必扫）"]
    lines += [f"- [ ] {c}" for c in IMPLICIT_COUPLING]
    lines += ["", "## 门禁序列（Gate C）"]
    lines += [f"- [ ] {g}" for g in GATE_SEQUENCE]
    lines += ["", "> 任一受保护区被触碰 → 标 HIGH-INTEGRATION-RISK，对抗审查必过。", ""]
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
