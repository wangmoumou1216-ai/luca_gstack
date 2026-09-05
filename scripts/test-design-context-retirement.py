#!/usr/bin/env python3
"""Exercise the active rule/search consumers without writing retrieval logs."""
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
os.environ["MEMORY_ROOT"] = str(ROOT)
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "memory/scripts"))
import search_memory as memory

spec = importlib.util.spec_from_file_location("design_rules", ROOT / ".claude/observability/scripts/get_rules.py")
rules = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rules)

OLD_RULE = "R-20260525-001"
QUERIES = {
    "SC-20260609-003": "HTML UI 规范",
    "SC-20260610-001": "figma-layer 路由",
    "SF-001": "brand-tokens",
}


def check_rules():
    active = [r for r in rules.load_rules() if rules.applies(r, "html-prototype", "*")]
    assert OLD_RULE not in {r["id"] for r in active}, "retired template rule is active"
    assert any(r.get("supersedes") == OLD_RULE for r in active), "replacement template rule must be active"


def check_memory():
    active = memory.parse_semantic_facts(memory.SEMANTIC_FACTS)
    for old_id, query in QUERIES.items():
        assert old_id not in {f["id"] for f in active}, f"retired fact is active: {old_id}"
        replacements = {f["id"] for f in active if f.get("supersedes") == old_id}
        assert replacements, f"replacement fact must be active: {old_id}"
        hits = {f["id"] for f in memory.search(query, 5, "semantic", "*", "")}
        assert old_id not in hits, f"retired fact returned by search: {old_id}"
        assert hits & replacements, f"replacement not retrieved: {query}"


class DesignContextRetirement(unittest.TestCase):
    def test_active_consumers(self):
        check_rules()
        check_memory()

    def test_old_rule_reactivation_is_detected(self):
        check_rules()
        original = rules.RULES
        data = yaml.safe_load(original.read_text())
        old = next(r for r in data["rules"] if r["id"] == OLD_RULE)
        old["status"] = "active"
        with tempfile.TemporaryDirectory(prefix="design-rule-mutation-") as directory:
            try:
                rules.RULES = Path(directory) / "rules.yaml"
                rules.RULES.write_text(yaml.safe_dump(data, allow_unicode=True))
                with self.assertRaisesRegex(AssertionError, "retired template rule is active"):
                    check_rules()
            finally:
                rules.RULES = original
        check_rules()

    def test_old_memory_restoration_is_detected(self):
        check_memory()
        original = memory.SEMANTIC_FACTS
        archive = yaml.safe_load((ROOT / "memory/semantic/archive/superseded-facts-2026.yaml").read_text())
        historical = {f["id"]: f for f in archive["facts"] if f["id"] in QUERIES}
        self.assertEqual(set(historical), set(QUERIES), "retired evidence must be preserved")
        for old_id in QUERIES:
            data = yaml.safe_load(original.read_text())
            data["facts"] = [f for f in data["facts"] if f.get("supersedes") != old_id] + [historical[old_id]]
            with tempfile.TemporaryDirectory(prefix="design-memory-mutation-") as directory:
                try:
                    memory.SEMANTIC_FACTS = Path(directory) / "promoted-facts.yaml"
                    memory.SEMANTIC_FACTS.write_text(yaml.safe_dump(data, allow_unicode=True))
                    self.assertIn(old_id, {f["id"] for f in memory.search(QUERIES[old_id], 5, "semantic", "*", "")})
                    with self.assertRaisesRegex(AssertionError, f"retired fact is active: {old_id}"):
                        check_memory()
                finally:
                    memory.SEMANTIC_FACTS = original
            check_memory()


if __name__ == "__main__":
    unittest.main(verbosity=2)
