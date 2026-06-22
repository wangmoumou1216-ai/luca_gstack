#!/usr/bin/env python3
"""Validate memory store health without loading long history into agent context."""
import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required for memory health checks", file=sys.stderr)
    sys.exit(2)


ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
PROMOTED = ROOT / "memory" / "semantic" / "promoted-facts.yaml"


def main() -> int:
    errors = []
    if not PROMOTED.exists():
        errors.append(f"missing {PROMOTED}")
    else:
        try:
            data = yaml.safe_load(PROMOTED.read_text(encoding="utf-8")) or {}
        except Exception as exc:
            errors.append(f"invalid promoted-facts.yaml: {exc}")
            data = {}
        facts = data.get("facts", []) if isinstance(data, dict) else []
        if not isinstance(facts, list):
            errors.append("promoted-facts.yaml facts must be a list")
            facts = []
        seen = set()
        for index, fact in enumerate(facts, start=1):
            if not isinstance(fact, dict):
                errors.append(f"fact #{index} is not a mapping")
                continue
            for field in ("id", "domain", "fact", "confidence", "stable", "added", "source"):
                if field not in fact or str(fact.get(field, "")).strip() == "":
                    errors.append(f"{fact.get('id', '#' + str(index))}: missing {field}")
            fact_id = str(fact.get("id", ""))
            if fact_id in seen:
                errors.append(f"{fact_id}: duplicate id")
            seen.add(fact_id)
            if fact.get("stable") is not True:
                errors.append(f"{fact_id}: stable must be true")
            text = str(fact.get("fact", ""))
            if fact_id == "SC-20260522-001" and "U-block" not in text:
                errors.append("SC-20260522-001 fact appears truncated; missing U-block")
            if "..." in text.splitlines():
                errors.append(f"{fact_id}: contains YAML document marker in fact text")

        # Static Fallback 白名单一致性（防漂移）：白名单 ⊆ promoted ids；CLAUDE.md SF ⊆ 白名单
        import re
        allowlist_path = ROOT / "memory" / "semantic" / "static-fallback-allowlist.txt"
        if allowlist_path.exists():
            allow_ids = {ln.split("#", 1)[0].strip() for ln in allowlist_path.read_text(encoding="utf-8").splitlines() if ln.split("#", 1)[0].strip()}
            for aid in sorted(allow_ids - seen):
                errors.append(f"static-fallback-allowlist: {aid} 不在 promoted-facts.yaml")
            claude_md_path = ROOT / "CLAUDE.md"
            if claude_md_path.exists():
                sf_ids = set(re.findall(r"^- \[([A-Z0-9-]+) /", claude_md_path.read_text(encoding="utf-8"), re.M))
                for sid in sorted(sf_ids - allow_ids):
                    errors.append(f"CLAUDE.md SF: {sid} 不在白名单（SF 须为白名单子集）")

    if errors:
        print(json.dumps({"status": "FAIL", "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"status": "PASS", "checked": str(PROMOTED)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
