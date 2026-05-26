#!/usr/bin/env python3
"""Propose a new semantic memory candidate (Hermes-lite pipeline).

Appends to memory/semantic/candidates.jsonl.
Candidates require manual/agent review before promotion to promoted-facts.yaml.

Usage:
  python3 memory/scripts/propose_semantic.py \
    --domain crm \
    --fact "纷享销客使用 GraphQL API，非 REST" \
    --confidence medium \
    --source "deepresearch 2026-05"
"""
import argparse
import json
import os
import sys
import yaml
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
CANDIDATES = ROOT / "memory" / "semantic" / "candidates.jsonl"
PROMOTED = ROOT / "memory" / "semantic" / "promoted-facts.yaml"


def next_id() -> str:
    today = datetime.now(timezone.utc).strftime('%Y%m%d')
    prefix = f"SC-{today}-"

    # Count candidates with today's prefix
    candidate_count = 0
    if CANDIDATES.exists():
        for line in CANDIDATES.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    rec = json.loads(line)
                    if rec.get("id", "").startswith(prefix):
                        seq = int(rec["id"].split("-")[-1])
                        candidate_count = max(candidate_count, seq)
                except Exception:
                    pass

    # Count promoted facts with today's prefix
    promoted_count = 0
    if PROMOTED.exists():
        for line in PROMOTED.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("- id:") or line.startswith("id:"):
                fact_id = line.split(":", 1)[1].strip().strip('"')
                if fact_id.startswith(prefix):
                    seq = int(fact_id.split("-")[-1])
                    promoted_count = max(promoted_count, seq)

    return f"{prefix}{max(candidate_count, promoted_count) + 1:03d}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True, choices=["crm", "fxui", "workflow", "design", "tech", "skill-rule"])
    parser.add_argument("--fact", required=True)
    parser.add_argument("--confidence", choices=["high", "medium", "low"], default="medium")
    parser.add_argument("--source", default="observation")
    parser.add_argument("--stable", action="store_true", help="mark candidate as proposed stable; review is still required")
    parser.add_argument("--evidence", default="", help="source path, quote, or observation that supports the fact")
    parser.add_argument("--scope", default="", help="applicability scope, e.g. crm, html-prototype, scene:A")
    parser.add_argument("--reviewer", default="", help="human or agent reviewer required for proposed stable facts")
    parser.add_argument("--tags", default="", help="comma-separated retrieval tags")
    parser.add_argument("--valid-until", default="", help="optional ISO date when the fact should expire")
    parser.add_argument("--supersedes", default="", help="optional previous fact id superseded by this candidate")
    args = parser.parse_args()

    if is_duplicate(args.domain, args.fact):
        print("duplicate semantic memory candidate", file=sys.stderr)
        return 2
    if args.stable:
        missing = [name for name, value in {
            "evidence": args.evidence,
            "scope": args.scope,
            "reviewer": args.reviewer,
        }.items() if not value.strip()]
        if missing:
            print(f"--stable requires review metadata: {', '.join(missing)}", file=sys.stderr)
            return 2

    candidate_id = next_id()
    record = {
        "id": candidate_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "domain": args.domain,
        "fact": args.fact,
        "confidence": args.confidence,
        "source": args.source,
        "evidence": args.evidence,
        "scope": args.scope,
        "reviewer": args.reviewer,
        "tags": [tag.strip() for tag in args.tags.split(",") if tag.strip()],
        "valid_until": args.valid_until,
        "supersedes": args.supersedes,
        "proposed_stable": bool(args.stable),
        "status": "CANDIDATE",
    }

    if args.stable and args.confidence != "high":
        print(json.dumps({
            "warning": f"--stable 已设置但 confidence={args.confidence}，当前记录写入候选队列，等待人工审核。"
        }, ensure_ascii=False), file=sys.stderr)

    CANDIDATES.parent.mkdir(parents=True, exist_ok=True)
    with CANDIDATES.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(json.dumps({"candidate": candidate_id, "status": "pending_review"}, ensure_ascii=False))
    return 0


def normalize_fact(text: str) -> str:
    return "".join(str(text).lower().split())


def is_duplicate(domain: str, fact: str) -> bool:
    needle = normalize_fact(fact)
    records = []
    if CANDIDATES.exists():
        for line in CANDIDATES.read_text(encoding="utf-8").splitlines():
            try:
                records.append(json.loads(line))
            except Exception:
                pass
    if PROMOTED.exists():
        try:
            data = yaml.safe_load(PROMOTED.read_text(encoding="utf-8")) or {}
            records.extend(data.get("facts", []) if isinstance(data, dict) else [])
        except Exception:
            pass
    for record in records:
        if record.get("domain") == domain and normalize_fact(record.get("fact", "")) == needle:
            return True
    return False


def _promote(fact_id: str, domain: str, fact: str, confidence: str, source: str) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
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
        PROMOTED.write_text(f"version: 1\nfacts:\n{entry}", encoding="utf-8")
    else:
        content = PROMOTED.read_text(encoding="utf-8")
        if "facts:" not in content:
            content += "\nfacts:\n"
        PROMOTED.write_text(content.rstrip() + "\n" + entry, encoding="utf-8")
    _sync_claude_md_fallback(fact_id, domain, fact)


def _sync_claude_md_fallback(fact_id: str, domain: str, fact: str) -> None:
    claude_md = ROOT / "CLAUDE.md"
    if not claude_md.exists():
        return
    content = claude_md.read_text(encoding="utf-8")
    marker = "> 维护规则："
    if marker not in content:
        return
    new_line = f"- [{fact_id} / {domain}] {fact}\n"
    # 避免重复插入
    if fact_id in content:
        return
    content = content.replace(marker, new_line + "\n" + marker)
    claude_md.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
