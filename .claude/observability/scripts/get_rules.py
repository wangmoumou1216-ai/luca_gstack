#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES = ROOT / "observability" / "rules.yaml"


def load_rules():
    """真 YAML 解析（2026-07-04 换掉手写 parser——只认 flow-style/硬编码4空格缩进/
    单层 section/裸值 split(:) 截断 四类脆弱，见 framework-audit 遗留债务盘点）。
    fail-open：规则加载失败绝不阻断 skill 执行——警告落 stderr，返回空列表。"""
    if not RULES.exists():
        return []
    try:
        import yaml
        doc = yaml.safe_load(RULES.read_text(encoding="utf-8")) or {}
        rules = doc.get("rules") or []
        return [r for r in rules if isinstance(r, dict)]
    except Exception as e:  # noqa: BLE001 — fail-open 契约
        print(f"[get_rules] rules.yaml 解析失败，按无规则继续: {e}", file=sys.stderr)
        return []


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
