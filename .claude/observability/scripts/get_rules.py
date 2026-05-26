#!/usr/bin/env python3
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES = ROOT / "observability" / "rules.yaml"


def parse_scalar(value):
    value = value.strip()
    if value in ("[]", ""):
        return []
    if value.startswith("[") and value.endswith("]"):
        body = value[1:-1].strip()
        if not body:
            return []
        return [item.strip().strip('"').strip("'") for item in body.split(",")]
    return value.strip('"').strip("'")


def load_rules():
    if not RULES.exists():
        return []
    rules = []
    current = None
    section = None
    for raw in RULES.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped in ("version: 1", "rules: []", "rules:"):
            continue
        if stripped.startswith("- id:"):
            if current:
                rules.append(current)
            current = {"id": parse_scalar(stripped.split(":", 1)[1])}
            section = None
            continue
        if current is None:
            continue
        if re.match(r"^[a-zA-Z_]+:\s*$", stripped):
            section = stripped[:-1]
            current.setdefault(section, {})
            continue
        if stripped.startswith("- ") and section:
            current.setdefault(section, [])
            if isinstance(current[section], list):
                current[section].append(parse_scalar(stripped[2:]))
            continue
        if ":" in stripped:
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = parse_scalar(value)
            is_nested = raw.startswith("    ") or raw.startswith("\t")
            if section and is_nested and isinstance(current.get(section), dict):
                current[section][key] = value
            else:
                section = None
                current[key] = value
    if current:
        rules.append(current)
    return rules


def applies(rule, skill, scene):
    if rule.get("status", "active") != "active":
        return False
    scope = rule.get("scope", {})
    skills = scope.get("skills", []) if isinstance(scope, dict) else []
    scenes = scope.get("scenes", []) if isinstance(scope, dict) else []
    if skill != "*" and skills and "*" not in skills and skill not in skills:
        return False
    if scene and scene != "*" and scenes and "*" not in scenes and scene not in scenes:
        return False
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: get_rules.py <skill-name> [scene]", file=sys.stderr)
        return 2
    skill = sys.argv[1]
    scene = sys.argv[2] if len(sys.argv) > 2 else ""
    matches = [rule for rule in load_rules() if applies(rule, skill, scene)]
    if not matches:
        print(f"Applicable rules for {skill}: none")
        return 0
    print(f"Applicable rules for {skill}:")
    for rule in matches[:20]:
        severity = rule.get("severity", "medium")
        text = rule.get("rule", "")
        print(f"- {rule.get('id', 'R-UNKNOWN')} [{severity}]: {text}")
    if len(matches) > 20:
        print(f"- truncated: {len(matches) - 20} additional active rules not shown")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
