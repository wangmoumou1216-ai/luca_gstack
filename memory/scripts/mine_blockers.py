#!/usr/bin/env python3
"""Mine recurring blockers from episodic memory and propose as semantic candidates.

Scans episodic/index.jsonl for next_risk values that share >= 2 keywords
and appear >= min-count times. Proposes matching patterns as candidates
(confidence: medium) if not already covered in promoted-facts.yaml.

Usage:
  python3 memory/scripts/mine_blockers.py [--min-count 2] [--dry-run]
"""
import argparse
import json
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EPISODIC_INDEX = ROOT / "memory" / "episodic" / "index.jsonl"
PROMOTED = ROOT / "memory" / "semantic" / "promoted-facts.yaml"
CANDIDATES = ROOT / "memory" / "semantic" / "candidates.jsonl"
PROPOSE_SCRIPT = ROOT / "memory" / "scripts" / "propose_semantic.py"

_STOPWORDS = {"的", "是", "了", "和", "在", "不", "有", "会", "需要", "可能", "时", "后", "前", "要", "用", "做"}


def keywords(text: str) -> set:
    words = set()
    for tok in text.replace("，", " ").replace("。", " ").replace(",", " ").replace("、", " ").split():
        tok = tok.strip("「」【】（）()：:；;")
        if len(tok) >= 2 and tok not in _STOPWORDS:
            words.add(tok.lower())
    return words


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").lower() if path.exists() else ""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-count", type=int, default=2, help="Min cluster size to propose")
    parser.add_argument("--dry-run", action="store_true", help="Print findings without writing candidates")
    args = parser.parse_args()

    if not EPISODIC_INDEX.exists():
        print("No episodic index found.")
        return 0

    risks = []
    for line in EPISODIC_INDEX.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            risk = entry.get("next_risk", "").strip()
            if risk:
                risks.append(risk)
        except json.JSONDecodeError:
            continue

    if not risks:
        print("No next_risk entries found in episodic memory.")
        return 0

    print(f"Scanning {len(risks)} next_risk entries...")

    promoted_text = load_text(PROMOTED)
    candidate_text = load_text(CANDIDATES)
    proposed, checked = 0, set()

    for i, risk_a in enumerate(risks):
        if risk_a in checked:
            continue
        kw_a = keywords(risk_a)
        if len(kw_a) < 2:
            continue
        cluster = [risk_a]
        for j, risk_b in enumerate(risks):
            if i == j or risk_b in checked:
                continue
            if len(kw_a & keywords(risk_b)) >= 2:
                cluster.append(risk_b)

        if len(cluster) < args.min_count:
            continue

        checked.update(cluster)
        # Skip if similar keywords already covered
        kw_list = sorted(kw_a)
        if any(kw in promoted_text or kw in candidate_text for kw in kw_list[:3]):
            print(f"⏭  Skipped (already covered): {risk_a[:60]}")
            continue

        representative = max(cluster, key=len)
        print(f"🔍 Pattern ({len(cluster)}x): {representative[:70]}")
        if not args.dry_run:
            result = subprocess.run(
                [sys.executable, str(PROPOSE_SCRIPT),
                 "--domain", "skill-rule",
                 "--fact", f"recurring-risk: {representative}",
                 "--confidence", "medium",
                 "--source", f"episodic-mining ({len(cluster)} occurrences)"],
                capture_output=True, text=True
            )
            try:
                out = json.loads(result.stdout.strip())
                print(f"  → Candidate: {out.get('candidate', '?')}")
            except Exception:
                print(f"  → {result.stdout.strip()[:60]}")
            proposed += 1

    print(f"\nSummary: {proposed} candidates proposed" if not args.dry_run else "\n[dry-run] No candidates written")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
