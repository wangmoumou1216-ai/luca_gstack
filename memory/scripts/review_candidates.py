
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
from consolidate_memory import build_queue, promote_ready_candidates, atomic_write_text

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


def promote(candidate: dict, reviewer: str) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    fact_id = candidate.get("id", "")
    domain = candidate.get("domain", "")
    fact = candidate.get("fact", "")
    confidence = candidate.get("confidence", "high")
    source = candidate.get("source", "review")
    fact_yaml = json.dumps(str(fact), ensure_ascii=False)
    entry = (
        f"  - id: {fact_id}\n"
        f"    domain: {domain}\n"
        f"    fact: {fact_yaml}\n"
        f"    confidence: {confidence}\n"
        f"    stable: true\n"
        f"    added: {today}\n"
        f"    source: {source}\n"
    )
    if not PROMOTED.exists():
        atomic_write_text(PROMOTED, f"version: 1\nfacts:\n{entry}")
    else:
        content = PROMOTED.read_text(encoding="utf-8")
        if "facts:" not in content:
            content += "\nfacts:\n"
        atomic_write_text(PROMOTED, content.rstrip() + "\n" + entry)
    # Sync CLAUDE.md static fallback section
    claude_md = ROOT / "CLAUDE.md"
    if claude_md.exists():
        content = claude_md.read_text(encoding="utf-8")
        marker = "> 维护规则："
        allow = ROOT / "memory" / "semantic" / "static-fallback-allowlist.txt"
        allowed = {ln.split("#", 1)[0].strip() for ln in allow.read_text(encoding="utf-8").splitlines() if ln.split("#", 1)[0].strip()} if allow.exists() else set()
        # 非白名单(宪法级/红线)事实不进每-session SF（只留 promoted-facts.yaml 走 search）
        if marker in content and fact_id not in content and fact_id in allowed:
            new_line = f"- [{fact_id} / {domain}] {fact}\n"
            content = content.replace(marker, new_line + "\n" + marker)
            atomic_write_text(claude_md, content)
        elif fact_id in allowed and marker not in content:
            # 应镜像但通道断了 → 不再静默（audit F2-08）
            import sys
            sys.stderr.write(f"[review] ⚠️ CLAUDE.md 缺 '> 维护规则：' marker，白名单事实 {fact_id} 无法镜像进 SF 节\n")
    record_review(fact_id, "promoted", reviewer, "metadata present and candidate selected for promotion")


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
        if not has_review_metadata(c):
            skipped.append((cid, "missing review metadata"))
            if args.promote:
                record_review(cid, "rejected", args.reviewer, "missing evidence/scope/reviewer metadata")
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
