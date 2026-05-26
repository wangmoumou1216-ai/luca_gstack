#!/usr/bin/env python3
import argparse
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OBS = ROOT / "observability" / "observations.jsonl"
RULES = ROOT / "observability" / "rules.yaml"


def next_id(prefix, path):
    today = dt.datetime.now().strftime("%Y%m%d")
    count = 1
    if path.exists():
        count += path.read_text(encoding="utf-8").count(f"{prefix}-{today}-")
    return f"{prefix}-{today}-{count:03d}"


def yaml_quote(text):
    return json.dumps(text, ensure_ascii=False)


def append_rule(args, observation_id):
    if not args.rule:
        return None
    rule_id = next_id("R", RULES)
    if not RULES.exists() or not RULES.read_text(encoding="utf-8").strip():
        RULES.write_text("version: 1\nrules:\n", encoding="utf-8")
    text = RULES.read_text(encoding="utf-8")
    if "rules: []" in text:
        text = text.replace("rules: []", "rules:")
    skills = ", ".join(args.applies_to or [args.skill])
    scenes = ", ".join(args.scenes or ["*"])
    block = [
        f"- id: {rule_id}",
        "  status: active",
        f"  severity: {args.severity}",
        f"  type: {args.rule_type}",
        "  scope:",
        f"    skills: [{skills}]",
        f"    scenes: [{scenes}]",
        f"  rule: {yaml_quote(args.rule)}",
        "  source_observations:",
        f"    - {observation_id}",
        "",
    ]
    if not text.endswith("\n"):
        text += "\n"
    RULES.write_text(text + "\n".join(block), encoding="utf-8")
    return rule_id


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill", required=True)
    parser.add_argument("--message", required=True, help="Raw user feedback or issue statement.")
    parser.add_argument("--problem", default="")
    parser.add_argument("--correction", default="")
    parser.add_argument("--severity", default="medium", choices=["low", "medium", "high", "critical"])
    parser.add_argument("--rule", default="", help="Actionable distilled rule. If present, appends to rules.yaml.")
    parser.add_argument("--rule-type", default="quality_rule")
    parser.add_argument("--applies-to", nargs="*", default=[])
    parser.add_argument("--scenes", nargs="*", default=[])
    parser.add_argument("--source", default="user_feedback")
    args = parser.parse_args()

    OBS.parent.mkdir(parents=True, exist_ok=True)
    observation_id = next_id("O", OBS)
    record = {
        "id": observation_id,
        "time": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "skill": args.skill,
        "source": args.source,
        "severity": args.severity,
        "message": args.message,
        "problem": args.problem,
        "correction": args.correction,
    }
    with OBS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    rule_id = append_rule(args, observation_id)
    print(json.dumps({"observation": observation_id, "rule": rule_id}, ensure_ascii=False))


if __name__ == "__main__":
    main()
