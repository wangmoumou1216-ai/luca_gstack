#!/usr/bin/env python3
"""U002 mechanical-only boundary tests; no native capability claims."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "behavioral_ab.py"
spec = importlib.util.spec_from_file_location("behavioral_ab_gate", SCRIPT)
ab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ab)


class BehavioralAbGateTests(unittest.TestCase):
    def check(self, baseline, candidate, *, claim=False, patterns=None, tier="guided-execution"):
        result = ab.judge(baseline, candidate, claim, "caller-declared-name", patterns, 0.02, tier)
        self.assertEqual(result["scope"], "mechanical-only")
        self.assertIsNone(result["capability_gain"])
        self.assertEqual(result["native_behavior_status"], "NOT_RUN")
        self.assertEqual(result["native_adoption"], "NOT_VERIFIED")
        self.assertEqual(result["final_behavior_judge"], "independent-oracle-required")
        return result

    @staticmethod
    def row(fixture_id="f1", output="result: 2"):
        return {"fixture_id": fixture_id, "output": output}

    def test_empty_missing_and_whitespace_ids_block_in_either_arm(self):
        for bad_id in (None, "", " ", 0):
            for arm in ("baseline", "candidate"):
                with self.subTest(bad_id=bad_id, arm=arm):
                    bad = [self.row(bad_id)]
                    good = [self.row()]
                    result = self.check(bad if arm == "baseline" else good,
                                        bad if arm == "candidate" else good)
                    self.assertEqual(result["verdict"], "BLOCK")
                    self.assertTrue(any("nonempty string" in f for f in result["findings"]))

    def test_duplicate_ids_block_in_either_arm(self):
        good = [self.row()]
        duplicate = good + [self.row(output="different")]
        for baseline, candidate in ((duplicate, good), (good, duplicate)):
            with self.subTest(baseline=baseline):
                result = self.check(baseline, candidate)
                self.assertEqual(result["verdict"], "BLOCK")
                self.assertTrue(any("duplicate fixture_id" in f for f in result["findings"]))

    def test_set_mismatch_blocks_even_with_common_ids(self):
        good = [self.row()]
        for baseline, candidate in ((good + [self.row("f2")], good),
                                    (good, good + [self.row("f2")])):
            with self.subTest(baseline=baseline):
                result = self.check(baseline, candidate)
                self.assertEqual(result["verdict"], "BLOCK")
                self.assertTrue(any("sets must be identical" in f for f in result["findings"]))
                self.assertIsNone(result["max_text_delta"])

    def test_empty_arms_block(self):
        self.assertEqual(self.check([], [])["verdict"], "BLOCK")

    def test_same_set_different_order_passes(self):
        baseline = [self.row("f1"), self.row("f2")]
        result = self.check(baseline, list(reversed(baseline)))
        self.assertEqual(result["verdict"], "PASS")
        self.assertEqual(result["fixtures"], 2)

    def test_invalid_regex_blocks(self):
        result = self.check([self.row()], [self.row()], patterns=["["])
        self.assertEqual(result["verdict"], "BLOCK")
        self.assertTrue(any("invalid must-hold regex" in f for f in result["findings"]))

    def test_text_preservation_violation_blocks(self):
        result = self.check([self.row()], [self.row(output="result: 3")], patterns=["2"])
        self.assertEqual(result["verdict"], "BLOCK")
        self.assertTrue(any("text preservation" in f for f in result["findings"]))

    def test_claimed_text_no_op_blocks(self):
        result = self.check([self.row()], [self.row()], claim=True)
        self.assertEqual(result["verdict"], "BLOCK")
        self.assertEqual(result["max_text_delta"], 0)

    def test_wording_only_cannot_establish_capability_gain(self):
        result = self.check([self.row()], [self.row(output="The calculated result is 2.")], claim=True)
        self.assertEqual(result["verdict"], "PASS")
        self.assertGreater(result["max_text_delta"], 0.02)
        self.assertIsNone(result["capability_gain"])
        self.assertFalse(any("behavior change" in f or "行为差" in f for f in result["findings"]))
        self.assertNotIn("max_delta", result)

    def test_all_current_tiers_including_core_are_supported(self):
        self.assertIn("core-execution", ab._skill_tiers())
        for tier in ab._skill_tiers():
            with self.subTest(tier=tier):
                self.assertEqual(self.check([self.row()], [self.row()], tier=tier)["verdict"], "PASS")

    def test_tier_choices_follow_owner_definition(self):
        with tempfile.TemporaryDirectory() as directory:
            policy = Path(directory) / "model-routing.yaml"
            policy.write_text("tiers:\n  core-execution: {}\n  future-owner-tier: {}\n", encoding="utf-8")
            with patch.object(ab, "ROUTING_PATH", policy):
                self.assertEqual(ab._skill_tiers(), ("core-execution", "future-owner-tier"))

    def test_unreadable_tier_authority_is_scoped_block(self):
        with patch.object(ab, "ROUTING_PATH", Path("/nonexistent/u002-model-routing.yaml")):
            result = self.check([self.row()], [self.row()])
        self.assertEqual(result["verdict"], "BLOCK")
        self.assertTrue(any("cannot load current skill tiers" in f for f in result["findings"]))

    def test_unknown_tier_blocks_direct_call(self):
        self.assertEqual(self.check([self.row()], [self.row()], tier="unknown")["verdict"], "BLOCK")

    def test_model_metadata_does_not_prove_or_reject_adoption(self):
        result = self.check([self.row()], [self.row()], tier="core-execution")
        self.assertEqual(result["verdict"], "PASS")
        self.assertEqual(result["declared_model"], "caller-declared-name")
        self.assertEqual(result["native_adoption"], "NOT_VERIFIED")

    def run_cli(self, baseline, candidate, *options):
        with tempfile.TemporaryDirectory() as directory:
            baseline_path = Path(directory) / "baseline.json"
            candidate_path = Path(directory) / "candidate.json"
            baseline_path.write_text(json.dumps(baseline), encoding="utf-8")
            candidate_path.write_text(json.dumps(candidate), encoding="utf-8")
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), "judge", "--baseline", str(baseline_path),
                 "--candidate", str(candidate_path), *options],
                capture_output=True, text=True, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
        return completed, json.loads(completed.stdout)

    def test_core_cli_and_legacy_flag_remain_mechanical(self):
        completed, result = self.run_cli([self.row()], [self.row(output="The calculated result is 2.")],
                                        "--skill-tier", "core-execution", "--claims-behavior-change")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(result["scope"], "mechanical-only")
        self.assertIsNone(result["capability_gain"])

    def test_cli_pass_block_pass_proves_gate_bites(self):
        good = [self.row()]
        first, first_result = self.run_cli(good, good)
        broken, broken_result = self.run_cli(good + good, good)
        restored, restored_result = self.run_cli(good, good)
        self.assertEqual((first.returncode, broken.returncode, restored.returncode), (0, 1, 0))
        self.assertEqual((first_result["verdict"], broken_result["verdict"], restored_result["verdict"]),
                         ("PASS", "BLOCK", "PASS"))
        self.assertTrue(any("duplicate fixture_id" in f for f in broken_result["findings"]))

    def test_cli_invalid_regex_exits_one_with_block(self):
        completed, result = self.run_cli([self.row()], [self.row()], "--must-hold", "[")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["verdict"], "BLOCK")

    def test_extract_retains_json_fixtures_without_writing_logs(self):
        with tempfile.TemporaryDirectory() as directory:
            eval_log = Path(directory) / "eval.jsonl"
            episodic = Path(directory) / "episodic.jsonl"
            eval_bytes = json.dumps({"skill_name": "skill-x", "id": "eval-1", "input_summary": "question one"}) + "\n"
            episode_bytes = json.dumps({"skills_used": ["skill-x"], "id": "ep-2", "summary": "question two"}) + "\n"
            eval_log.write_text(eval_bytes, encoding="utf-8")
            episodic.write_text(episode_bytes, encoding="utf-8")
            with patch.object(ab, "EVAL_LOG", eval_log), patch.object(ab, "EPISODIC", episodic):
                fixtures = ab.extract("skill-x", 5)
            self.assertEqual(fixtures, [
                {"fixture_id": "eval-1", "input": "question one", "src": "eval"},
                {"fixture_id": "ep-2", "input": "question two", "src": "episodic"},
            ])
            self.assertEqual(json.loads(json.dumps(fixtures)), fixtures)
            self.assertEqual(eval_log.read_text(encoding="utf-8"), eval_bytes)
            self.assertEqual(episodic.read_text(encoding="utf-8"), episode_bytes)


if __name__ == "__main__":
    unittest.main()
