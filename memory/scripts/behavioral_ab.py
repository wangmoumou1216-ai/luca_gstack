#!/usr/bin/env python3
"""Extract fixtures and check output text, with a mechanical-only verdict.

This script does not run a model, validate trusted native adoption, or determine
skill capability gain. Real baseline/candidate sessions read their separately
frozen sources and an independent oracle evaluates their native behavior.

extract retains the JSON fixture format. judge requires nonempty unique fixture
IDs and identical arm sets, then checks text delta and regex preservation. PASS
means those mechanical checks passed; capability_gain remains unknown.

--claims-behavior-change is a compatibility alias of --claims-text-change.
--model records caller-supplied metadata only; it is never adoption evidence.
--skill-tier choices come from the owning checkout's model-routing.yaml tiers.
"""
import argparse
import difflib
import json
import math
import os
import re
from pathlib import Path

def _resolve_root():
    """记忆根解析（P1/FIX-1）：统一走 _memroot.resolve_memory_root——含 store-shape 哨兵、
    相对路径拒绝、脚本相对回落，与 JS 侧 memroot.mjs 同算法（防 JS/py 裂脑与 cloud 幻影树）。
    robust import：subprocess 下 sys.path[0]=memory/scripts 可直接 import；spec 加载等
    上下文回退按路径加载（不污染 sys.path）。"""
    try:
        from _memroot import resolve_memory_root
    except ImportError:
        import importlib.util as _ilu
        _p = Path(__file__).resolve().parent / "_memroot.py"
        if not _p.is_file():
            # 三级兜底：脚本被复制到别处单独运行（测试 fixture 会这么做）时 _memroot.py 不在同目录。
            # 内联等价解析，fail-open——绝不因辅助模块缺失而崩（旧行为亦是纯 env 读取）。
            _env = os.environ.get("MEMORY_ROOT")
            if _env and os.path.isabs(_env) and Path(_env).is_dir():
                return Path("/" + "/".join(s for s in _env.split("/") if s not in ("", ".")))
            return Path(__file__).resolve().parents[2]
        _s = _ilu.spec_from_file_location("_memroot", _p)
        _m = _ilu.module_from_spec(_s)
        _s.loader.exec_module(_m)
        resolve_memory_root = _m.resolve_memory_root
    return resolve_memory_root()[0]


ROOT = _resolve_root()
EPISODIC = ROOT / "memory" / "episodic" / "index.jsonl"
EVAL_LOG = ROOT / "memory" / "evals" / "eval-log.jsonl"

CODE_ROOT = Path(__file__).resolve().parents[2]
ROUTING_PATH = CODE_ROOT / ".claude" / "skill-os" / "model-routing.yaml"


def _skill_tiers():
    # Use code authority, not MEMORY_ROOT, which only redirects data extraction.
    import yaml

    try:
        policy = yaml.safe_load(ROUTING_PATH.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        raise ValueError(f"invalid model-routing.yaml: {error}") from error
    tiers = policy.get("tiers") if isinstance(policy, dict) else None
    if not isinstance(tiers, dict) or not tiers or any(
        not isinstance(name, str) or not name.strip() for name in tiers
    ):
        raise ValueError("model-routing.yaml must define nonempty tier names")
    return tuple(tiers)


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


def _text_delta(a, b):
    """Text distance only; equivalent behavior can have different output bytes."""
    return 1.0 - difflib.SequenceMatcher(None, a, b).ratio()


def _result(verdict, findings, *, max_text_delta=None, fixtures=0,
            skill_tier=None, model=None):
    return {
        "scope": "mechanical-only",
        "verdict": verdict,
        "findings": findings,
        "max_text_delta": max_text_delta,
        "fixtures": fixtures,
        "skill_tier": skill_tier,
        "declared_model": model,
        "native_adoption": "NOT_VERIFIED",
        "native_behavior_status": "NOT_RUN",
        "capability_gain": None,
        "final_behavior_judge": "independent-oracle-required",
    }


def _outputs_by_id(rows, arm, findings):
    if not isinstance(rows, list) or not rows:
        findings.append(f"BLOCK: {arm} must be a nonempty JSON list")
        return {}
    by_id = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            findings.append(f"BLOCK: {arm}[{index}] must be an object")
            continue
        fixture_id = row.get("fixture_id")
        if not isinstance(fixture_id, str) or not fixture_id.strip():
            findings.append(f"BLOCK: {arm}[{index}] fixture_id must be a nonempty string")
            continue
        if fixture_id in by_id:
            findings.append(f"BLOCK: {arm} duplicate fixture_id {fixture_id!r}")
            continue
        output = row.get("output")
        if not isinstance(output, str):
            findings.append(f"BLOCK: {arm} fixture {fixture_id!r} output must be a string")
            continue
        by_id[fixture_id] = output
    return by_id


def judge(baseline, candidate, claims_change, model, must_hold, epsilon,
          skill_tier="guided-execution"):
    """Return a text check. Caller metadata cannot prove runtime adoption/gain."""
    findings = []
    try:
        tiers = _skill_tiers()
    except (OSError, UnicodeError, ValueError, ImportError) as error:
        findings.append(f"BLOCK: cannot load current skill tiers: {error}")
    else:
        if skill_tier not in tiers:
            findings.append(f"BLOCK: unknown skill tier {skill_tier!r}")
    if not isinstance(epsilon, (int, float)) or not math.isfinite(epsilon) or not 0 <= epsilon <= 1:
        findings.append("BLOCK: epsilon must be a finite number between 0 and 1")

    patterns = []
    for rx in must_hold or []:
        try:
            patterns.append((rx, re.compile(rx)))
        except (re.error, TypeError) as error:
            findings.append(f"BLOCK: invalid must-hold regex {rx!r}: {error}")

    by_id_b = _outputs_by_id(baseline, "baseline", findings)
    by_id_c = _outputs_by_id(candidate, "candidate", findings)
    if set(by_id_b) != set(by_id_c):
        findings.append(
            "BLOCK: fixture_id sets must be identical; "
            f"baseline-only={sorted(set(by_id_b) - set(by_id_c))!r}, "
            f"candidate-only={sorted(set(by_id_c) - set(by_id_b))!r}"
        )
    if findings:
        return _result("BLOCK", findings, skill_tier=skill_tier, model=model)

    deltas = {fixture_id: _text_delta(output, by_id_c[fixture_id])
              for fixture_id, output in by_id_b.items()}
    max_text_delta = max(deltas.values())
    if claims_change and max_text_delta < epsilon:
        findings.append(
            f"BLOCK: claimed text change has text delta < {epsilon} "
            f"for every fixture (max_text_delta={max_text_delta:.4f})"
        )
    for rx, pattern in patterns:
        for fixture_id in by_id_b:
            if pattern.search(by_id_b[fixture_id]) and not pattern.search(by_id_c[fixture_id]):
                findings.append(
                    f"BLOCK: text preservation /{rx}/ lost in candidate fixture {fixture_id!r}"
                )
    verdict = "BLOCK" if findings else "PASS"
    if verdict == "PASS":
        findings.append(
            f"PASS: mechanical text checks passed (max_text_delta={max_text_delta:.4f}); "
            "capability gain requires an independent native behavior oracle"
        )
    return _result(verdict, findings, max_text_delta=round(max_text_delta, 4),
                   fixtures=len(by_id_b), skill_tier=skill_tier, model=model)


def selftest():
    same = [{"fixture_id": "f1", "output": "result: 2"}]
    wording = [{"fixture_id": "f1", "output": "The calculated result is 2."}]
    cases = [
        ("claimed-text-no-op", same, same, True, None, "guided-execution", "BLOCK"),
        ("wording-only-mechanical-pass", same, wording, True, None, "core-execution", "PASS"),
        ("text-preservation-loss", same, [{"fixture_id": "f1", "output": "result: 3"}],
         False, ["2"], "guided-execution", "BLOCK"),
        ("empty-id", [{"fixture_id": "", "output": "x"}], same,
         False, None, "guided-execution", "BLOCK"),
        ("duplicate-id", same + same, same, False, None, "guided-execution", "BLOCK"),
        ("mismatched-sets", same, [{"fixture_id": "f2", "output": "x"}],
         False, None, "guided-execution", "BLOCK"),
        ("invalid-regex", same, same, False, ["["], "guided-execution", "BLOCK"),
        ("unclaimed-no-op", same, same, False, None, "guided-execution", "PASS"),
    ]
    ok = True
    for name, baseline, candidate, claim, patterns, tier, expected in cases:
        result = judge(baseline, candidate, claim, None, patterns, 0.02, tier)
        passed = (result["verdict"] == expected
                  and result["scope"] == "mechanical-only"
                  and result["capability_gain"] is None
                  and result["native_behavior_status"] == "NOT_RUN")
        print(f"  [{'OK' if passed else 'FAIL'}] {name}")
        ok = ok and passed
    print("behavioral_ab mechanical-only selftest: " + ("ALL PASS" if ok else "FAILED"))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description="Mechanical-only fixture and output text checks")
    sub = ap.add_subparsers(dest="cmd", required=True)

    pe = sub.add_parser("extract")
    pe.add_argument("--skill", required=True)
    pe.add_argument("--n", type=int, default=5)

    pj = sub.add_parser("judge")
    pj.add_argument("--baseline", required=True)
    pj.add_argument("--candidate", required=True)
    pj.add_argument("--claims-text-change", "--claims-behavior-change",
                    dest="claims_change", action="store_true",
                    help="require measurable text delta; compatibility alias does not test behavior")
    pj.add_argument("--model", default=None, help="caller metadata only, never adoption evidence")
    try:
        tiers = _skill_tiers()
    except (OSError, UnicodeError, ValueError, ImportError) as error:
        print(json.dumps(_result("BLOCK", [f"BLOCK: cannot load current skill tiers: {error}"]),
                         ensure_ascii=False, indent=2))
        return 1
    pj.add_argument("--skill-tier", default="guided-execution", choices=tiers)
    pj.add_argument("--must-hold", nargs="*", default=None)
    pj.add_argument("--epsilon", type=float, default=0.02)

    sub.add_parser("selftest")
    args = ap.parse_args()
    if args.cmd == "extract":
        print(json.dumps(extract(args.skill, args.n), ensure_ascii=False, indent=2))
        return 0
    if args.cmd == "judge":
        try:
            baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))
            candidate = json.loads(Path(args.candidate).read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            result = _result("BLOCK", [f"BLOCK: cannot load arm JSON: {error}"],
                             skill_tier=args.skill_tier, model=args.model)
        else:
            result = judge(baseline, candidate, args.claims_change, args.model,
                           args.must_hold, args.epsilon, args.skill_tier)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1 if result["verdict"] == "BLOCK" else 0
    if args.cmd == "selftest":
        return selftest()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
