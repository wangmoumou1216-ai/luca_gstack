#!/usr/bin/env python3
"""CLI contract tests for quality-gate verdict recording."""

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RECORDER = ROOT / "memory" / "scripts" / "record_eval.py"


def canonical_digest(value: dict) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class GateVerdictRecorderTests(unittest.TestCase):
    def envelope(self):
        return {
            "schema_version": 1,
            "producer": "quality-gate",
            "eval_run_id": "qg-run-001",
            "subject": {
                "skill": "route-guard",
                "topic": "routing polarity",
                "scene": "unknown",
                "input_summary": "framework scope regression",
                "output_paths": ["framework-audit/report.md"],
                "duration": "lightweight",
            },
            "verdict": {
                "status": "FAIL",
                "passed": 1,
                "total": 2,
                "findings": ["negative scope was classified as positive"],
            },
        }

    def run_recorder(self, root: Path, envelope: dict):
        envelope_path = root / "verdict.json"
        envelope_path.write_text(json.dumps(envelope, ensure_ascii=False), encoding="utf-8")
        env = os.environ.copy()
        env["MEMORY_ROOT"] = str(root)
        return subprocess.run(
            [sys.executable, str(RECORDER), "--verdict-file", str(envelope_path)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            env=env,
        )

    def log_rows(self, root: Path):
        path = root / "memory" / "evals" / "eval-log.jsonl"
        if not path.exists():
            return []
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

    def test_valid_envelope_is_hash_bound_and_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            envelope = self.envelope()
            first = self.run_recorder(root, envelope)
            self.assertEqual(first.returncode, 0, first.stderr)
            second = self.run_recorder(root, envelope)
            self.assertEqual(second.returncode, 0, second.stderr)

            rows = self.log_rows(root)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["quality_gate_run_id"], envelope["eval_run_id"])
            self.assertEqual(rows[0]["quality_gate_verdict_sha256"], canonical_digest(envelope))
            self.assertEqual(rows[0]["quality_gate_status"], "FAIL")
            self.assertEqual(rows[0]["quality_gate_score"], 0.5)

    def test_same_run_id_with_changed_verdict_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            envelope = self.envelope()
            self.assertEqual(self.run_recorder(root, envelope).returncode, 0)
            changed = deepcopy(envelope)
            changed["verdict"] = {
                "status": "PASS",
                "passed": 2,
                "total": 2,
                "findings": [],
            }
            conflict = self.run_recorder(root, changed)
            self.assertNotEqual(conflict.returncode, 0)
            self.assertIn("conflict", conflict.stderr.lower())
            self.assertEqual(len(self.log_rows(root)), 1)

    def test_internally_inconsistent_envelope_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            envelope = self.envelope()
            envelope["verdict"]["status"] = "PASS"
            invalid = self.run_recorder(root, envelope)
            self.assertNotEqual(invalid.returncode, 0)
            self.assertEqual(self.log_rows(root), [])

    def test_concurrent_replay_is_one_idempotent_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            envelope = self.envelope()
            envelope_path = root / "verdict.json"
            envelope_path.write_text(json.dumps(envelope, ensure_ascii=False), encoding="utf-8")
            env = os.environ.copy()
            env["MEMORY_ROOT"] = str(root)
            processes = [
                subprocess.Popen(
                    [sys.executable, str(RECORDER), "--verdict-file", str(envelope_path)],
                    cwd=ROOT,
                    text=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env=env,
                )
                for _ in range(12)
            ]
            for process in processes:
                _stdout, stderr = process.communicate(timeout=60)
                self.assertEqual(process.returncode, 0, stderr)
            self.assertEqual(len(self.log_rows(root)), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
