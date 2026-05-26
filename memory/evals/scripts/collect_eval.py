#!/usr/bin/env python3
"""Collect an html-prototype eval pair after a session completes.

Usage:
  python3 memory/evals/scripts/collect_eval.py \
    --skill html-prototype \
    --topic opportunity-follow \
    --scene A
"""
import argparse
import json
import glob
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def next_id(pairs_path: Path, prefix: str) -> str:
    if not pairs_path.exists():
        return f"{prefix}-001"
    lines = [l for l in pairs_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    max_n = 0
    for line in lines:
        try:
            rec = json.loads(line)
            rid = rec.get("id", "")
            if rid.startswith(prefix + "-"):
                n = int(rid.split("-")[-1])
                max_n = max(max_n, n)
        except Exception:
            pass
    return f"{prefix}-{max_n + 1:03d}"


def find_latest(pattern: str) -> str | None:
    matches = sorted(glob.glob(str(ROOT / pattern)))
    return str(Path(matches[-1]).relative_to(ROOT)) if matches else None


def load_qa(qa_path_rel: str | None) -> dict:
    if not qa_path_rel:
        return {}
    qa_path = ROOT / qa_path_rel
    if not qa_path.exists():
        return {}
    try:
        data = json.loads(qa_path.read_text(encoding="utf-8"))
        checks = data.get("checks", [])
        passed = sum(1 for c in checks if c.get("passed"))
        total = len(checks)
        spec_score = None
        spec_path = qa_path.parent / "prototype-spec.md"
        if spec_path.exists():
            import re
            m = re.search(r"Current Aesthetic Score\s*[:：]\s*(\d{1,2})\s*/\s*30", spec_path.read_text(encoding="utf-8"), re.IGNORECASE)
            if m:
                spec_score = int(m.group(1))
        ref_status = None
        if spec_path.exists():
            import re
            m = re.search(r"Dynamic Reference Status:\s*(\w+)", spec_path.read_text(encoding="utf-8"), re.IGNORECASE)
            if m:
                ref_status = m.group(1)
        return {
            "verify_passed": data.get("passed", False),
            "checks_passed": passed,
            "checks_total": total,
            "primary_usage": data.get("primaryCount"),
            "states": data.get("states", []),
            "aesthetic_score": spec_score,
            "dynamic_ref_status": ref_status,
        }
    except Exception:
        return {}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill", default="html-prototype")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--scene", choices=["A", "B", "C"], default="A")
    args = parser.parse_args()

    pairs_path = ROOT / "memory" / "evals" / args.skill / "pairs.jsonl"
    prefix = args.skill.split("-")[0][0].upper() + "P"  # hp for html-prototype
    eval_id = next_id(pairs_path, prefix.lower())

    prototype_path = find_latest(f"docs/prototype/*{args.topic}*/index.html")
    spec_path = find_latest(f"docs/prototype/*{args.topic}*/prototype-spec.md")
    qa_path = find_latest(f"docs/prototype/*{args.topic}*/qa-results.json")
    brief_path = find_latest(f"docs/decisions/*{args.topic}*design-brief.md")
    prd_path = find_latest(f"docs/prd/*{args.topic}*prd.md")

    qa = load_qa(qa_path)

    record = {
        "id": eval_id,
        "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "scene": args.scene,
        "input": {
            "topic": args.topic,
            "design_brief_path": brief_path,
            "prd_path": prd_path,
        },
        "output": {
            "prototype_path": prototype_path,
            "spec_path": spec_path,
            "qa_results_path": qa_path,
        },
        "qa": qa,
        "judge": None,
    }

    pairs_path.parent.mkdir(parents=True, exist_ok=True)
    with pairs_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(json.dumps({"collected": eval_id, "qa_passed": qa.get("verify_passed"), "aesthetic": qa.get("aesthetic_score")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
