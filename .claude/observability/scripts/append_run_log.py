#!/usr/bin/env python3
import argparse
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUN_LOG = ROOT / "observability" / "run-log.jsonl"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill", required=True)
    parser.add_argument("--status", required=True)
    parser.add_argument("--output", action="append", default=[])
    parser.add_argument("--rules", nargs="*", default=[])
    parser.add_argument("--notes", default="")
    args = parser.parse_args()
    RUN_LOG.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "time": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "skill": args.skill,
        "status": args.status,
        "outputs": args.output,
        "rules_applied": args.rules,
        "notes": args.notes,
    }
    with RUN_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    print("RUN_LOG_APPENDED")


if __name__ == "__main__":
    main()
