#!/usr/bin/env python3
"""Public-seam regression tests for write_observation.py."""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".claude" / "observability" / "scripts" / "write_observation.py"


class ObservabilityWriterTests(unittest.TestCase):
    def make_fixture(self, tmp: str):
        store = Path(tmp) / "observability"
        scripts = store / "scripts"
        scripts.mkdir(parents=True)
        target = scripts / "write_observation.py"
        shutil.copy2(SOURCE, target)
        return target, store

    def command(self, script: Path, index: int):
        return [
            sys.executable,
            str(script),
            "--skill",
            "test-skill",
            "--message",
            f"message-{index}",
            "--rule",
            f"rule-{index}",
            "--source",
            "concurrency-test",
        ]

    def read_state(self, store: Path):
        observations = [
            json.loads(line)
            for line in (store / "observations.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        rules_text = (store / "rules.yaml").read_text(encoding="utf-8")
        rule_ids = re.findall(r"^- id: (R-\d{8}-\d{3,})$", rules_text, re.MULTILINE)
        source_ids = re.findall(r"^    - (O-\d{8}-\d{3,})$", rules_text, re.MULTILINE)
        return observations, rule_ids, source_ids

    def assert_consistent(self, store: Path, expected_count: int):
        observations, rule_ids, source_ids = self.read_state(store)
        observation_ids = [row["id"] for row in observations]
        self.assertEqual(len(observations), expected_count)
        self.assertEqual(len(set(observation_ids)), expected_count, observation_ids)
        self.assertEqual(len(rule_ids), expected_count)
        self.assertEqual(len(set(rule_ids)), expected_count, rule_ids)
        self.assertEqual(set(source_ids), set(observation_ids))
        self.assertFalse((store / ".write-transaction.json").exists())
        self.assertEqual(list(store.glob(".txn-*.tmp")), [])

    def test_concurrent_writers_have_unique_ids_and_no_lost_rules(self):
        with tempfile.TemporaryDirectory() as tmp:
            script, store = self.make_fixture(tmp)
            count = 24
            processes = [
                subprocess.Popen(
                    self.command(script, index),
                    cwd=ROOT,
                    text=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                for index in range(count)
            ]
            for process in processes:
                _stdout, stderr = process.communicate(timeout=60)
                self.assertEqual(process.returncode, 0, stderr)
            self.assert_consistent(store, count)

    def test_interrupted_two_file_commit_recovers_before_next_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            script, store = self.make_fixture(tmp)
            first = subprocess.run(self.command(script, 1), cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(first.returncode, 0, first.stderr)

            env = os.environ.copy()
            env["LUCA_OBSERVABILITY_FAILPOINT"] = "after_observations_replace"
            interrupted = subprocess.run(
                self.command(script, 2), cwd=ROOT, text=True, capture_output=True, env=env
            )
            self.assertEqual(interrupted.returncode, 86, interrupted.stderr)
            self.assertTrue((store / ".write-transaction.json").exists())

            recovered = subprocess.run(self.command(script, 3), cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(recovered.returncode, 0, recovered.stderr)
            self.assert_consistent(store, 3)

    def test_malformed_existing_log_fails_without_rewriting_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            script, store = self.make_fixture(tmp)
            malformed = '{"id":"O-20260828-001"}\nnot-json\n'
            (store / "observations.jsonl").write_text(malformed, encoding="utf-8")

            rejected = subprocess.run(self.command(script, 1), cwd=ROOT, text=True, capture_output=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("invalid JSON", rejected.stderr)
            self.assertEqual((store / "observations.jsonl").read_text(encoding="utf-8"), malformed)
            self.assertFalse((store / ".write-transaction.json").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
