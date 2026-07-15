
#!/usr/bin/env python3
"""Review semantic memory candidates.

Promotion criteria (all must be met):
  - present in consolidate_memory.py promotion_ready queue
  - proposed_stable = true
  - confidence = high
  - age >= DAYS_THRESHOLD days (default: 7)
  - evidence/scope/reviewer metadata present
  - not duplicate or conflicting according to consolidate_memory.py
  - not already present in promoted-facts.yaml

Usage:
  python3 memory/scripts/review_candidates.py [--days 7]
"""
import argparse
import json
import os
import yaml
from datetime import datetime, timezone
from pathlib import Path
from consolidate_memory import build_queue, promote_ready_candidates

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
CANDIDATES = ROOT / "memory" / "semantic" / "candidates.jsonl"
PROMOTED = ROOT / "memory" / "semantic" / "promoted-facts.yaml"
REVIEWS = ROOT / "memory" / "semantic" / "reviews.jsonl"


def load_promoted_ids() -> set:
    if not PROMOTED.exists():
        return set()
    ids = set()
    for line in PROMOTED.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("- id:") or (line.startswith("id:") and not line.startswith("id: null")):
            ids.add(line.split(":", 1)[1].strip().strip('"'))
    return ids


def record_review(candidate_id: str, decision: str, reviewer: str, reason: str) -> None:
    REVIEWS.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "candidate_id": candidate_id,
        "decision": decision,
        "reviewer": reviewer,
        "reason": reason,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    with REVIEWS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def has_review_metadata(candidate: dict) -> bool:
    return all(str(candidate.get(field, "")).strip() for field in ("evidence", "scope", "reviewer"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=7, help="Age threshold in days for promotion eligibility")
    parser.add_argument("--promote", action="store_true", help="actually promote eligible candidates")
    parser.add_argument("--reviewer", default="", help="reviewer required when --promote is used")
    args = parser.parse_args()

    if args.promote and not args.reviewer.strip():
        print("--promote requires --reviewer", file=__import__("sys").stderr)
        return 2

    if not CANDIDATES.exists():
        print("No candidates file found.")
        return 0

    now = datetime.now(timezone.utc)
    promoted_ids = load_promoted_ids()
    promoted, skipped = [], []
    queue, all_candidates, _candidate_rows, _promoted_facts, _decisions, _episode_rows = build_queue()
    promotion_ready_by_id = {item["id"]: item for item in queue.get("promotion_ready", [])}
    ready_after_age = []

    for line in CANDIDATES.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            c = json.loads(line)
        except json.JSONDecodeError:
            continue

        cid = c.get("id", "")
        if cid in promoted_ids:
            skipped.append((cid, "already promoted"))
            continue
        if c.get("confidence") != "high":
            skipped.append((cid, f"confidence={c.get('confidence')}"))
            continue

        try:
            age_days = (now - datetime.fromisoformat(c.get("created_at", ""))).days
        except Exception:
            age_days = 0

        if age_days < args.days:
            skipped.append((cid, f"age={age_days}d < {args.days}d threshold"))
            continue
        # 缺元数据 = 可补救状态，只 skip 不落 rejected review——rejected 是终审决定
        # （decisions 永久排除该 id 且随 --archive-reviewed 静默归档，不可逆），
        # 由元数据缺失自动触发是误伤（评审切面 a 问题 5，2026-07-15）。
        if not has_review_metadata(c):
            skipped.append((cid, "missing review metadata（补齐 evidence/scope/reviewer 后可晋升）"))
            continue
        if c.get("proposed_stable") is not True:
            skipped.append((cid, "not proposed_stable"))
            continue
        if cid not in promotion_ready_by_id:
            skipped.append((cid, "blocked by governance queue; check duplicates/conflicts/reviews with consolidate_memory.py --json"))
            continue

        if args.promote:
            ready_after_age.append(promotion_ready_by_id[cid])
        else:
            skipped.append((cid, "eligible; rerun with --promote after review"))

    if args.promote and ready_after_age:
        promoted = promote_ready_candidates(all_candidates, ready_after_age, dry_run=False)
        facts_by_id = {candidate.get("id"): candidate.get("fact", "") for candidate in all_candidates}
        for cid in promoted:
            print(f"✅ Promoted: {cid} — {facts_by_id.get(cid, '')[:70]}")

    for cid, reason in skipped:
        print(f"⏭  Skipped: {cid} ({reason})")

    print(f"\nSummary: {len(promoted)} promoted, {len(skipped)} skipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
