#!/usr/bin/env python3
"""behavioral_ab.py — 行为级 A/B 判定（融合门 Step-6）。

为什么：静态/路由/记忆门全过，也不代表改了 skill 的 prose 真改变了 LLM 行为
(SC-20260601-002 / GAP-behavioral-verification)。本工具判定「baseline prose vs
candidate prose 在真实输入上是否产生可测行为差，且未回归」。

分工（Workflow 无 fs / Python 无 model API）：
- 模型调用（在 Sonnet 上跑 baseline/candidate 两版 prose、Fable 判官）由 agent/Workflow
  层做——本脚本不调模型。恒在 Sonnet 上 A/B（guided-execution 默认档 + quality-gate
  钉档；在 Opus/Fable 上测=测一个用户不常跑的模型）；judge 校验调用方声明的 model。
- 本脚本 owns 两件确定性的事：
  ① extract：从 episodic/eval 日志取真实输入做 fixture（"行为变没变"锚在用户真实用法）。
  ② judge：no-op 检测 + 回归检测 + Sonnet 模型守卫 → PASS/BLOCK（确定性，可自检）。

子命令：
  extract  --skill X [--n 5]                       从日志取真实输入，输出 fixtures JSON
  judge    --baseline F --candidate F [选项]        读两组输出，输出 {verdict,findings}，BLOCK→exit 1
  selftest                                          自检判定逻辑（no-op→BLOCK / delta→PASS / 回归→BLOCK / 非Sonnet→BLOCK）

judge 选项：
  --claims-behavior-change   该融合声称会改变行为（→ 无行为差即 no-op BLOCK）
  --model NAME               调用方实际用的模型（须 sonnet）
  --must-hold RE [RE ...]    baseline 满足、candidate 不得丢失的属性（正则）
  --epsilon F                行为差阈值（默认 0.02）

输入文件格式（baseline / candidate）：JSON 列表 [{"fixture_id": "...", "output": "..."}]
"""
import argparse
import difflib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
EPISODIC = ROOT / "memory" / "episodic" / "index.jsonl"
EVAL_LOG = ROOT / "memory" / "evals" / "eval-log.jsonl"


def _read_jsonl(p):
    rows = []
    if not p.exists():
        return rows
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except Exception:  # noqa: BLE001
            continue
    return rows


def extract(skill, n):
    """从真实日志取 skill 的输入做 fixture。eval-log.input_summary 优先，episodic 兜底。"""
    fixtures = []
    for r in _read_jsonl(EVAL_LOG):
        if (r.get("skill_name") or r.get("skill")) == skill and r.get("input_summary"):  # eval-log 用 skill_name
            fixtures.append({"fixture_id": r.get("id") or r.get("topic") or f"eval-{len(fixtures)}", "input": r["input_summary"], "src": "eval"})
    if len(fixtures) < n:
        for r in _read_jsonl(EPISODIC):
            skills = r.get("skills_used") or r.get("skills") or []  # episodic 用 skills_used
            if isinstance(skills, str):
                skills = [s.strip() for s in skills.split(",")]
            if skill in skills:
                inp = r.get("summary") or r.get("topic") or ""
                if inp:
                    fixtures.append({"fixture_id": r.get("id") or f"ep-{len(fixtures)}", "input": inp, "src": "episodic"})
    # 去重 + 截断
    seen, out = set(), []
    for f in fixtures:
        k = f["input"][:120]
        if k in seen:
            continue
        seen.add(k)
        out.append(f)
        if len(out) >= n:
            break
    return out


def _delta(a, b):
    """行为差 = 1 - 相似度。完全相同→0。"""
    return 1.0 - difflib.SequenceMatcher(None, a or "", b or "").ratio()


def judge(baseline, candidate, claims_change, model, must_hold, epsilon):
    findings = []
    verdict = "PASS"

    # 模型守卫：行为 A/B 必须在 Sonnet 上
    if model and model.lower() != "sonnet":
        findings.append(f"BLOCK: 行为 A/B 必须在 Sonnet 上跑（默认档 + quality-gate 钉档），收到 model={model}")
        verdict = "BLOCK"

    by_id_b = {r.get("fixture_id"): r.get("output", "") for r in baseline}
    by_id_c = {r.get("fixture_id"): r.get("output", "") for r in candidate}
    ids = [i for i in by_id_b if i in by_id_c]
    if not ids:
        findings.append("BLOCK: baseline/candidate 无共同 fixture_id，无法 A/B")
        return {"verdict": "BLOCK", "findings": findings, "max_delta": None, "fixtures": 0}

    deltas = {i: _delta(by_id_b[i], by_id_c[i]) for i in ids}
    max_delta = max(deltas.values())

    # no-op 检测：声称改行为却无可测差 → BLOCK（SC-20260601-002）
    if claims_change and max_delta < epsilon:
        findings.append(f"BLOCK: no-op——融合声称改变行为，但所有 fixture 行为差 < {epsilon}（max={max_delta:.4f}）；prose 改了行为没改")
        verdict = "BLOCK"

    # 回归检测：baseline 满足、candidate 丢失的属性
    for rx in must_hold or []:
        try:
            pat = re.compile(rx)
        except re.error as e:
            findings.append(f"WARN: must-hold 正则无效 '{rx}': {e}")
            continue
        for i in ids:
            if pat.search(by_id_b[i]) and not pat.search(by_id_c[i]):
                findings.append(f"BLOCK: 回归——属性 /{rx}/ 在 fixture {i} 的 candidate 输出中丢失（baseline 有）")
                verdict = "BLOCK"

    if verdict == "PASS":
        findings.append(f"PASS: 有可测行为差（max_delta={max_delta:.4f} ≥ {epsilon}）且无回归" if claims_change
                        else f"PASS: 无回归（max_delta={max_delta:.4f}）")
    return {"verdict": verdict, "findings": findings, "max_delta": round(max_delta, 4), "fixtures": len(ids)}


def selftest():
    cases = []

    # case1 no-op：两版输出相同 + 声称改行为 → BLOCK
    same = [{"fixture_id": "f1", "output": "alpha beta gamma"}]
    r1 = judge(same, list(same), claims_change=True, model="sonnet", must_hold=None, epsilon=0.02)
    cases.append(("no-op→BLOCK", r1["verdict"] == "BLOCK"))

    # case2 真行为差 + 无回归 → PASS
    b2 = [{"fixture_id": "f1", "output": "alpha beta gamma delta"}]
    c2 = [{"fixture_id": "f1", "output": "完全不同的输出 totally different behaviour now"}]
    r2 = judge(b2, c2, claims_change=True, model="sonnet", must_hold=None, epsilon=0.02)
    cases.append(("delta→PASS", r2["verdict"] == "PASS"))

    # case3 回归：must-hold 属性在 candidate 丢失 → BLOCK
    b3 = [{"fixture_id": "f1", "output": "color is #ff8000 brand ok and more text here"}]
    c3 = [{"fixture_id": "f1", "output": "color is #2563eb totally rebranded blue plus extra words"}]
    r3 = judge(b3, c3, claims_change=True, model="sonnet", must_hold=[r"#ff8000"], epsilon=0.02)
    cases.append(("regression→BLOCK", r3["verdict"] == "BLOCK"))

    # case4 非 Sonnet → BLOCK
    r4 = judge(b2, c2, claims_change=True, model="opus", must_hold=None, epsilon=0.02)
    cases.append(("non-sonnet→BLOCK", r4["verdict"] == "BLOCK"))

    # case5 不声称改行为 + 无回归 + 微小差 → PASS（纯重措辞允许）
    b5 = [{"fixture_id": "f1", "output": "alpha beta gamma"}]
    c5 = [{"fixture_id": "f1", "output": "alpha beta gamma"}]
    r5 = judge(b5, c5, claims_change=False, model="sonnet", must_hold=None, epsilon=0.02)
    cases.append(("no-claim-no-op→PASS", r5["verdict"] == "PASS"))

    ok = True
    for name, passed in cases:
        print(f"  [{'OK' if passed else 'FAIL'}] {name}")
        ok = ok and passed
    print("behavioral_ab selftest: " + ("ALL PASS" if ok else "FAILED"))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="行为级 A/B 判定")
    sub = ap.add_subparsers(dest="cmd", required=True)

    pe = sub.add_parser("extract")
    pe.add_argument("--skill", required=True)
    pe.add_argument("--n", type=int, default=5)

    pj = sub.add_parser("judge")
    pj.add_argument("--baseline", required=True)
    pj.add_argument("--candidate", required=True)
    pj.add_argument("--claims-behavior-change", action="store_true")
    pj.add_argument("--model", default=None)
    pj.add_argument("--must-hold", nargs="*", default=None)
    pj.add_argument("--epsilon", type=float, default=0.02)

    sub.add_parser("selftest")

    a = ap.parse_args()
    if a.cmd == "extract":
        print(json.dumps(extract(a.skill, a.n), ensure_ascii=False, indent=2))
        return 0
    if a.cmd == "judge":
        baseline = json.loads(Path(a.baseline).read_text(encoding="utf-8"))
        candidate = json.loads(Path(a.candidate).read_text(encoding="utf-8"))
        res = judge(baseline, candidate, a.claims_behavior_change, a.model, a.must_hold, a.epsilon)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 1 if res["verdict"] == "BLOCK" else 0
    if a.cmd == "selftest":
        return selftest()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
