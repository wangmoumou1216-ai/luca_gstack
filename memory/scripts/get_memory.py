#!/usr/bin/env python3
"""Lazy-load memory context for a given layer/skill/domain.

Usage:
  python3 memory/scripts/get_memory.py --summary
  python3 memory/scripts/get_memory.py --layer episodic --limit 3
  python3 memory/scripts/get_memory.py --layer semantic --domain crm
  python3 memory/scripts/get_memory.py --layer procedural --skill html-prototype --scene A
"""
import argparse
import json
import os
import sys
from pathlib import Path
try:
    import yaml as _yaml
    _HAS_YAML = True
except ImportError:
    _HAS_YAML = False

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
EPISODIC_INDEX = ROOT / "memory" / "episodic" / "index.jsonl"
SEMANTIC_FACTS = ROOT / "memory" / "semantic" / "promoted-facts.yaml"
EVAL_LOG = ROOT / "memory" / "evals" / "eval-log.jsonl"


def load_episodic(limit: int = 5) -> list[dict]:
    if not EPISODIC_INDEX.exists():
        return []
    lines = [l for l in EPISODIC_INDEX.read_text(encoding="utf-8").splitlines() if l.strip()]
    entries = []
    for line in lines[-limit:]:
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return entries


def parse_semantic_facts(domain: str = "*") -> list[dict]:
    if not SEMANTIC_FACTS.exists():
        return []
    text = SEMANTIC_FACTS.read_text(encoding="utf-8")
    if _HAS_YAML:
        try:
            raw_data = _yaml.safe_load(text) or {}
            if isinstance(raw_data, list):
                facts = raw_data
            elif isinstance(raw_data, dict):
                facts = raw_data.get("facts", [])
            else:
                facts = []
        except Exception:
            facts = parse_semantic_facts_fallback(text)
    else:
        facts = parse_semantic_facts_fallback(text)
    if domain != "*":
        facts = [f for f in facts if f.get("domain") == domain]
    return [f for f in facts if f.get("stable", False)]


def parse_semantic_facts_fallback(text: str) -> list[dict]:
    facts = []
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("- id:"):
            if current:
                facts.append(current)
            current = {"id": line.split(":", 1)[1].strip().strip('"').strip("'")}
        elif current is not None and line.startswith("domain:"):
            current["domain"] = line.split(":", 1)[1].strip().strip('"').strip("'")
        elif current is not None and line.startswith("fact:"):
            current["fact"] = line.split(":", 1)[1].strip().strip('"').strip("'")
        elif current is not None and line.startswith("confidence:"):
            current["confidence"] = line.split(":", 1)[1].strip()
        elif current is not None and line.startswith("stable:"):
            current["stable"] = line.split(":", 1)[1].strip().lower() == "true"
        elif current is not None and line.startswith("source:"):
            current["source"] = line.split(":", 1)[1].strip().strip('"').strip("'")
    if current:
        facts.append(current)
    return facts


def load_evals() -> list[dict]:
    if not EVAL_LOG.exists():
        return []
    entries = []
    for line in EVAL_LOG.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return entries


def text_matches(record: dict, needle: str) -> bool:
    if not needle:
        return True
    return needle.lower() in json.dumps(record, ensure_ascii=False, default=str).lower()


def list_contains(values, needle: str) -> bool:
    if not needle:
        return True
    if not isinstance(values, list):
        values = [values] if values else []
    return any(needle.lower() in str(value).lower() for value in values)


def scope_contains(scope, key: str, needle: str) -> bool:
    if not needle:
        return True
    if not isinstance(scope, dict):
        return False
    return list_contains(scope.get(key, []), needle)


def load_procedural(skill: str = "*", scene: str = "*") -> str:
    facts = parse_semantic_facts("skill-rule")
    if not facts:
        return "Procedural memory: no skill rules recorded yet"
    if skill != "*":
        facts = [f for f in facts if skill.lower() in f.get("fact", "").lower()]
    if scene != "*":
        facts = [f for f in facts if scene.lower() in f.get("fact", "").lower()]
    if not facts:
        return f"Procedural memory: no rules found for skill={skill}, scene={scene}"
    header = f"Procedural memory (domain:skill-rule, skill={skill}, scene={scene}):"
    lines = [header] + [f"- {f.get('id', '?')}: {f.get('fact', '')}" for f in facts]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layer", choices=["episodic", "semantic", "procedural", "eval"])
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--domain", default="*")
    parser.add_argument("--skill", default="*")
    parser.add_argument("--scene", default="*")
    parser.add_argument("--topic", default="")
    parser.add_argument("--project", default="", help="按项目作用域过滤 episodic（含历史记录文本兜底）")
    parser.add_argument("--source", default="")
    parser.add_argument("--id", default="")
    parser.add_argument("--contains", default="")
    parser.add_argument("--gate-status", default="")
    parser.add_argument("--since", default="")
    parser.add_argument("--summary", action="store_true")
    args = parser.parse_args()

    if args.summary:
        ep = load_episodic(100000)
        sf = parse_semantic_facts("*")
        ep_str = f"{len(ep)} episodic sessions" if ep else "no episodic sessions"
        sf_str = f"{len(sf)} semantic facts" if sf else "no semantic facts"
        print(f"Memory: {ep_str}, {sf_str}, procedural → semantic domain:skill-rule")
        if ep:
            last = ep[-1]
            print(f"  Last session: {last.get('date', '?')} — {last.get('topic', '?')}")
            if last.get("decision"):
                print(f"  Decision: {last['decision']}")
            if last.get("next_risk"):
                print(f"  Next risk: {last['next_risk']}")
        return 0

    if args.layer == "episodic":
        entries = load_episodic(100000)
        if args.project:
            entries = [
                e for e in entries
                if (e.get("project", "").lower() == args.project.lower())
                or (not e.get("project") and args.project.lower() in str(e.get("topic", "")).lower())
            ]
        if args.topic:
            entries = [e for e in entries if args.topic.lower() in e.get("topic", "").lower()]
        if args.skill != "*":
            entries = [e for e in entries if list_contains(e.get("skills_used", []), args.skill)]
        if args.since:
            entries = [e for e in entries if e.get("date", "") >= args.since]
        if args.contains:
            entries = [e for e in entries if text_matches(e, args.contains)]
        entries = entries[-args.limit:]
        if not entries:
            print("Episodic memory: no sessions recorded")
            return 0
        print(f"Episodic memory (last {len(entries)}):")
        for e in entries:
            outcomes = ", ".join(e.get("outcomes", []))
            print(f"- {e.get('id', '?')} [{e.get('date', '?')}] {e.get('topic', '?')}")
            if outcomes:
                print(f"  outcomes: {outcomes}")
            blockers = e.get("blockers", [])
            if blockers:
                print(f"  blockers: {', '.join(blockers)}")
            if e.get("decision"):
                print(f"  decision: {e['decision']}")
            if e.get("next_risk"):
                print(f"  next-risk: {e['next_risk']}")
        return 0

    if args.layer == "semantic":
        facts = parse_semantic_facts(args.domain)
        if args.id:
            facts = [f for f in facts if f.get("id") == args.id]
        if args.source:
            facts = [f for f in facts if args.source.lower() in str(f.get("source", "")).lower()]
        if args.skill != "*":
            facts = [
                f for f in facts
                if scope_contains(f.get("scope"), "skills", args.skill)
                or args.skill.lower() in f.get("fact", "").lower()
            ]
        if args.scene != "*":
            facts = [
                f for f in facts
                if scope_contains(f.get("scope"), "scenes", args.scene)
                or args.scene.lower() in f.get("fact", "").lower()
            ]
        if args.contains:
            facts = [f for f in facts if text_matches(f, args.contains)]
        facts = facts[-args.limit:]
        if not facts:
            label = f"domain={args.domain}" if args.domain != "*" else "any domain"
            print(f"Semantic memory: no stable facts for {label}")
            return 0
        label = f"domain={args.domain}" if args.domain != "*" else "all domains"
        print(f"Semantic memory ({label}, {len(facts)} facts):")
        for f in facts:
            print(f"- {f.get('id', '?')} [{f.get('domain', '?')}]: {f.get('fact', '')}")
        return 0

    if args.layer == "eval":
        entries = load_evals()
        if args.skill != "*":
            entries = [e for e in entries if args.skill.lower() in e.get("skill_name", "").lower()]
        if args.topic:
            entries = [e for e in entries if args.topic.lower() in e.get("topic", "").lower()]
        if args.scene != "*":
            entries = [e for e in entries if e.get("scene") == args.scene]
        if args.gate_status:
            entries = [e for e in entries if e.get("quality_gate_status") == args.gate_status]
        if args.contains:
            entries = [e for e in entries if text_matches(e, args.contains)]
        entries = entries[-args.limit:]
        if not entries:
            print("Eval memory: no matching records")
            return 0
        print(f"Eval memory (last {len(entries)} matching):")
        for e in entries:
            print(f"- {e.get('skill_name', '?')} [{e.get('quality_gate_status', '?')}] {e.get('topic', '?')}")
            findings = e.get("quality_gate_findings", [])
            if findings:
                print(f"  findings: {', '.join(findings)}")
        return 0

    if args.layer == "procedural":
        output = load_procedural(args.skill, args.scene)
        print(output)
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
