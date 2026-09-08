import importlib.util
import json
import os
import tempfile
import unittest
from unittest import mock
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class ConsumerHealthTests(unittest.TestCase):
    def test_redirected_store_does_not_select_a_stale_code_checkout(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "memory/episodic").mkdir(parents=True)
            with mock.patch.dict(os.environ, {"MEMORY_ROOT": tmp}):
                spec = importlib.util.spec_from_file_location("consumer_code_root", ROOT / "memory/scripts/daily_governance.py")
                dg = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(dg)
            self.assertEqual(dg.ROOT, Path(tmp))
            self.assertEqual(dg.CODE_ROOT, ROOT)
            with mock.patch.object(dg.subprocess, "run", return_value=mock.Mock(returncode=0, stdout="{}")) as run:
                dg.run_consolidate([])
            self.assertEqual(Path(run.call_args.args[0][1]), ROOT / "memory/scripts/consolidate_memory.py")
            # The old data checkout can contain obsolete framework instructions.
            (Path(tmp) / "CLAUDE.md").write_text("x" * 60000)
            self.assertEqual(dg.measure_context_injection()["CLAUDE.md"],
                             len((ROOT / "CLAUDE.md").read_text()))
            with mock.patch.object(dg, "AUTHORITATIVE_MEMORY_ROOT", tmp):
                anomalies, notes = dg.check_loop_health(
                    Path(tmp) / ".claude/observability", Path(tmp) / "memory/episodic/index.jsonl",
                    Path(tmp) / "memory/digests", Path(tmp), ROOT, tmp, "2026-09-08")
            self.assertFalse(any("CLAUDE.md 58.6KB" in item for item in anomalies), anomalies)
            self.assertTrue(any("CLAUDE.md 预算 OK" in item for item in notes), notes)

    def test_claim_alone_does_not_hide_unadjudicated_old_evidence(self):
        spec = importlib.util.spec_from_file_location("consumer_health", ROOT / "memory/scripts/daily_governance.py")
        dg = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(dg)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            obs = root / ".claude/observability"
            obs.mkdir(parents=True)
            pending = obs / "pending-extraction-old.md"
            pending.write_text("Retained old evidence")
            now = datetime.now(timezone.utc)
            old = (now - timedelta(days=30)).timestamp()
            os.utime(pending, (old, old))
            claims = obs / dg.PENDING_CLAIMS_DIR
            claims.mkdir()
            (claims / f"{pending.name}.json").write_text(json.dumps({
                "claimed_at": now.isoformat(), "claim_count": 100,
            }))
            anomalies, notes = dg.check_loop_health(obs, root / "memory/episodic/index.jsonl",
                root / "memory/digests", root, root, str(root), now.strftime("%Y-%m-%d"))
            self.assertTrue(any("pending-extraction" in item for item in anomalies), notes)
            self.assertTrue(any("claimed=1" in item for item in notes))


if __name__ == "__main__":
    unittest.main()
