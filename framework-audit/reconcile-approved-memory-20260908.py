"""Replay four already-approved September 5 candidates into the redirected data store.

No new approval is inferred. All stable writes use the existing promotion_ready gate.
Default is read-only; --apply-plan binds source approval evidence before any write.
After an interrupted replay, inspect the durable receipt and obtain a reviewed fresh plan.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

CODE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CODE / "memory/scripts"))
import consolidate_memory as cm

IDS = {f"SC-20260905-{i:03d}" for i in range(1, 5)}
OLD_IDS = {"SF-001", "SF-002", "SC-20260609-003", "SC-20260610-001"}
STORE = Path("/Users/luca/Desktop/luca_gstack")
RECEIPT = CODE / "framework-audit/memory-approved-reconciliation-20260908.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-plan", type=Path)
    args = parser.parse_args()
    if cm.ROOT != STORE or set(cm.semantic_known_roots()) != {CODE, STORE}:
        raise RuntimeError("unexpected memory destination or namespace")
    source = CODE / "memory/semantic"
    candidates = [row for row in cm.read_jsonl(source / "candidates.jsonl") if row.get("id") in IDS]
    facts = {row["id"]: row for row in cm.parse_promoted_facts(source / "promoted-facts.yaml")}
    reviews = cm.read_jsonl(source / "reviews.jsonl")
    if len(candidates) != 4 or {row["id"] for row in candidates} != IDS:
        raise RuntimeError("missing source candidates")
    approval_events = []
    for row in candidates:
        history = [review for review in reviews if review.get("candidate_id") == row["id"]]
        approved = [review for review in history if review.get("decision") == "approved_stable"]
        if not approved or not history or history[-1]["decision"] != "promoted":
            raise RuntimeError("missing explicit source approval and promotion")
        if row.get("proposed_stable") is not True or row.get("confidence") != "high":
            raise RuntimeError("source not approved-stable")
        for field in ("domain", "fact", "supersedes", "scope", "evidence", "reviewer"):
            if row.get(field) != facts[row["id"]].get(field):
                raise RuntimeError(f"source candidate/fact mismatch: {field}")
        approval_events.append(approved[-1])
    before = {str(path): digest(path) for path in (
        cm.CANDIDATES, cm.REVIEWS, cm.PROMOTED, STORE / "memory/semantic/static-fallback-allowlist.txt")}
    plan = {"event": "approved-memory-reconciliation-20260908", "destination": str(STORE),
            "lock": str(cm.semantic_id_lock_path()), "code_root": str(cm.CODE_ROOT),
            "known_roots": [str(root) for root in cm.semantic_known_roots()],
            "ids": sorted(IDS), "before": before,
            "source_sha256": {str(source / name): digest(source / name)
                              for name in ("candidates.jsonl", "reviews.jsonl", "promoted-facts.yaml", "static-fallback-allowlist.txt")},
            "approval_events": approval_events}
    if not args.apply_plan:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return
    if json.loads(args.apply_plan.read_text()) != plan:
        raise RuntimeError("reviewed plan changed; no writes, inspect and re-review")
    with cm.semantic_id_lock():
        if cm.candidate_id_collisions():
            raise RuntimeError("collided namespace")
        for path, value in {**before, **plan["source_sha256"]}.items():
            if digest(Path(path)) != value:
                raise RuntimeError("file changed before lock")
        existing = cm.read_jsonl(cm.CANDIDATES)
        by_id = {row["id"]: row for row in existing}
        for row in candidates:
            if row["id"] in by_id and by_id[row["id"]] != row:
                raise RuntimeError("target candidate differs; no identity overwrite")
        target_facts = {row["id"]: row for row in cm.parse_promoted_facts(cm.PROMOTED)}
        for cid in IDS & target_facts.keys():
            if target_facts[cid].get("fact") != facts[cid]["fact"]:
                raise RuntimeError("target promoted identity differs")
        combined = {**target_facts, **{cid: facts[cid] for cid in IDS}}
        projected_archive = {row.get("supersedes") for row in combined.values()} & combined.keys()
        if not projected_archive <= OLD_IDS:
            raise RuntimeError("unexpected superseded targets; stop before ANY write")
        allow_path = STORE / "memory/semantic/static-fallback-allowlist.txt"
        allow_ids = {line.split("#", 1)[0].strip() for line in allow_path.read_text().splitlines()}
        if allow_ids & (IDS - target_facts.keys()):
            raise RuntimeError("promotion would invoke projection writer; separate reviewed projection required")
        cm.atomic_write_text(RECEIPT, json.dumps({**plan, "stage": "APPROVAL_REPLAY_INTENT"}, ensure_ascii=False, indent=2))
        candidate_text = cm.CANDIDATES.read_text() if cm.CANDIDATES.exists() else ""
        for row in candidates:
            if row["id"] not in by_id:
                candidate_text += json.dumps(row, ensure_ascii=False) + "\n"
        cm.atomic_write_text(cm.CANDIDATES, candidate_text)
        prior_reviews = cm.read_jsonl(cm.REVIEWS)
        review_text = cm.REVIEWS.read_text() if cm.REVIEWS.exists() else ""
        for event in approval_events:
            if event not in prior_reviews:
                review_text += json.dumps(event, ensure_ascii=False) + "\n"
        cm.atomic_write_text(cm.REVIEWS, review_text)
        queue, all_candidates, *_ = cm.build_queue()
        pending_ids = IDS - target_facts.keys()
        ready = [row for row in queue["promotion_ready"] if row["id"] in IDS]
        if {row["id"] for row in ready} != pending_ids:
            raise RuntimeError("existing promotion_ready gate did not accept the exact approved set")
        promoted = cm.promote_ready_candidates(all_candidates, ready, dry_run=False)
        to_archive = cm.archive_superseded_facts(dry_run=True)
        if not set(to_archive) <= OLD_IDS:
            raise RuntimeError("unexpected superseded targets; stop before archive")
        archived = cm.archive_superseded_facts(dry_run=False, reviewer="replay verified September 5 approval; memory audit 2026-09-08")
        cm.atomic_write_text(STORE / "memory/semantic/static-fallback-allowlist.txt",
                             (source / "static-fallback-allowlist.txt").read_text())
        # Existing current-checkout projections already contain these approved bytes.
        # Do not run the broad context builder or touch concurrently edited adapters/catalogs.
        cm.atomic_write_text(RECEIPT, json.dumps({**plan, "stage": "RECONCILED", "promoted": promoted,
            "archived": archived, "after": {path: digest(Path(path)) for path in before}}, ensure_ascii=False, indent=2))
    print(json.dumps({"receipt": str(RECEIPT), "promoted": promoted, "archived": archived}, ensure_ascii=False))


if __name__ == "__main__":
    main()
