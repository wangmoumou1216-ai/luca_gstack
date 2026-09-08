import contextlib
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]


def _load_daily_governance():
    spec = importlib.util.spec_from_file_location(
        "daily_governance_pending_recovery_under_test",
        ROOT / "memory" / "scripts" / "daily_governance.py",
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PendingDispositionRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.dg = _load_daily_governance()

    def _fixture(self, root: str, name: str = "pending-extraction-recovery.md"):
        observability = Path(root) / ".claude" / "observability"
        observability.mkdir(parents=True)
        pending = observability / name
        source = b"# Pending Experience Adjudication\n\nRECOVERY_SENTINEL\n"
        pending.write_bytes(source)
        args = [
            "--pending", str(pending),
            "--status", "QUALIFIED",
            "--evidence", "L4 source fix and focused regression evidence",
            "--actor", "pending-recovery-test",
        ]
        return observability, pending, source, args

    def _run(self, args):
        stdout = io.StringIO()
        stderr = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = self.dg.pending_disposition_cli(args)
        return code, stdout.getvalue(), stderr.getvalue()

    def _events(self, observability: Path):
        manifest = observability / self.dg.PENDING_MANIFEST
        return [
            json.loads(line)
            for line in manifest.read_text(encoding="utf-8").splitlines()
            if line
        ]

    def _crash_after_rename(self, args):
        original_append = self.dg._append_pending_event

        def fail_terminal_append(handle, record):
            if record.get("event") == "ACTIVE_REMOVED":
                raise OSError("simulated crash after rename")
            return original_append(handle, record)

        with mock.patch.object(self.dg, "_append_pending_event", side_effect=fail_terminal_append):
            return self._run(args)

    def test_retry_recovers_crash_after_rename_once_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            observability, pending, source, args = self._fixture(tmp)
            code, _stdout, _stderr = self._crash_after_rename(args)
            self.assertEqual(code, 2)
            self.assertFalse(pending.exists())
            events = self._events(observability)
            self.assertEqual([event["event"] for event in events], ["DISPOSITION_RECORDED"])
            archive = Path(events[0]["archive_path"])
            self.assertEqual(archive.read_bytes(), source)

            code, stdout, stderr = self._run(args)
            self.assertEqual(code, 0, stderr)
            result = json.loads(stdout)
            self.assertEqual(result["disposition_id"], events[0]["disposition_id"])
            self.assertTrue(result["recovered"])
            events = self._events(observability)
            self.assertEqual(
                [event["event"] for event in events],
                ["DISPOSITION_RECORDED", "ACTIVE_REMOVED"],
            )
            self.assertTrue(events[-1]["recovered_after_interrupted_move"])

            manifest = observability / self.dg.PENDING_MANIFEST
            before_second_retry = manifest.read_bytes()
            code, stdout, stderr = self._run(args)
            self.assertEqual(code, 0, stderr)
            self.assertTrue(json.loads(stdout)["already_complete"])
            self.assertEqual(manifest.read_bytes(), before_second_retry)

    def test_retry_fails_closed_on_archive_hash_or_path_mismatch(self):
        for mismatch in ("hash", "path"):
            with self.subTest(mismatch=mismatch), tempfile.TemporaryDirectory() as tmp:
                observability, pending, source, args = self._fixture(tmp)
                self.assertEqual(self._crash_after_rename(args)[0], 2)
                event = self._events(observability)[0]
                archive = Path(event["archive_path"])
                if mismatch == "hash":
                    archive.write_bytes(b"TAMPERED_ARCHIVE\n")
                else:
                    wrong_archive = archive.with_name(f"wrong-{archive.name}")
                    archive.rename(wrong_archive)
                    event["archive_path"] = str(wrong_archive)
                    (observability / self.dg.PENDING_MANIFEST).write_text(
                        json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n",
                        encoding="utf-8",
                    )
                    archive = wrong_archive

                before_retry = (observability / self.dg.PENDING_MANIFEST).read_bytes()
                code, _stdout, stderr = self._run(args)
                self.assertEqual(code, 2)
                self.assertIn("archive", stderr)
                self.assertFalse(pending.exists())
                self.assertTrue(archive.exists(), "failed recovery must preserve archive evidence")
                self.assertEqual(
                    (observability / self.dg.PENDING_MANIFEST).read_bytes(),
                    before_retry,
                )
                if mismatch == "hash":
                    self.assertNotEqual(hashlib.sha256(archive.read_bytes()).hexdigest(), event["source_sha256"])
                else:
                    self.assertEqual(archive.read_bytes(), source)

    def test_retry_fails_closed_when_two_archives_are_plausible(self):
        with tempfile.TemporaryDirectory() as tmp:
            observability, pending, source, args = self._fixture(tmp)
            self.assertEqual(self._crash_after_rename(args)[0], 2)
            first = self._events(observability)[0]
            second = dict(first)
            second["disposition_id"] = f"{first['disposition_id']}-ambiguous"
            recorded_pending = Path(first["pending_path"])
            second_archive = (
                recorded_pending.parent
                / "pending-extraction-resolved"
                / f"{recorded_pending.stem}-{second['disposition_id']}.md"
            )
            second["archive_path"] = str(second_archive)
            second_archive.write_bytes(source)
            manifest = observability / self.dg.PENDING_MANIFEST
            with manifest.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(second, ensure_ascii=False, sort_keys=True) + "\n")

            before_retry = manifest.read_bytes()
            code, _stdout, stderr = self._run(args)
            self.assertEqual(code, 2)
            self.assertIn("ambiguous", stderr)
            self.assertEqual(manifest.read_bytes(), before_retry)
            self.assertTrue(Path(first["archive_path"]).exists())
            self.assertTrue(second_archive.exists())

    def test_retry_requires_the_exact_durable_decision_inputs(self):
        for field in ("status", "evidence", "actor"):
            with self.subTest(field=field), tempfile.TemporaryDirectory() as tmp:
                observability, pending, _source, args = self._fixture(tmp)
                self.assertEqual(self._crash_after_rename(args)[0], 2)
                retry_args = list(args)
                if field == "status":
                    retry_args[retry_args.index("QUALIFIED")] = "NO_SIGNAL"
                elif field == "evidence":
                    retry_args[retry_args.index("L4 source fix and focused regression evidence")] = (
                        "Different evidence must not select an archived decision"
                    )
                else:
                    retry_args[retry_args.index("pending-recovery-test")] = "different-actor"

                manifest = observability / self.dg.PENDING_MANIFEST
                before_retry = manifest.read_bytes()
                code, _stdout, stderr = self._run(retry_args)
                self.assertEqual(code, 2)
                self.assertIn("no matching verified archive", stderr)
                self.assertFalse(pending.exists())
                self.assertEqual(manifest.read_bytes(), before_retry)
                self.assertTrue(Path(self._events(observability)[0]["archive_path"]).exists())

    def test_normal_qualified_no_signal_and_unresolved_statuses(self):
        for status in self.dg.PENDING_STATUSES:
            with self.subTest(status=status), tempfile.TemporaryDirectory() as tmp:
                observability, pending, source, args = self._fixture(
                    tmp, f"pending-extraction-{status.lower()}.md"
                )
                args[args.index("QUALIFIED")] = status
                code, stdout, stderr = self._run(args)
                self.assertEqual(code, 0, stderr)
                result = json.loads(stdout)
                events = self._events(observability)
                if status == "UNRESOLVED":
                    self.assertTrue(pending.exists())
                    self.assertEqual(pending.read_bytes(), source)
                    self.assertEqual([event["event"] for event in events], ["DISPOSITION_RECORDED"])
                    self.assertTrue(events[0]["active_retained"])
                    self.assertIsNone(result["archive_path"])
                else:
                    self.assertFalse(pending.exists())
                    self.assertEqual(
                        [event["event"] for event in events],
                        ["DISPOSITION_RECORDED", "ACTIVE_REMOVED"],
                    )
                    self.assertEqual(Path(result["archive_path"]).read_bytes(), source)

    def test_corrupt_manifest_preserves_active_and_log_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            obs, pending, source, args = self._fixture(tmp)
            manifest = obs / self.dg.PENDING_MANIFEST
            manifest.write_bytes(b'{"event":')
            self.assertEqual(self._run(args)[0], 2)
            self.assertEqual(pending.read_bytes(), source)
            self.assertEqual(manifest.read_bytes(), b'{"event":')

    def test_symlink_targets_are_never_mutated(self):
        for target in ("manifest", "archive", "pending"):
            with self.subTest(target=target), tempfile.TemporaryDirectory() as tmp:
                obs, pending, source, args = self._fixture(tmp)
                outside = Path(tmp) / "unrelated"
                outside_bytes = b'{"event":"EXISTING"}\n' if target == "manifest" else source
                if target == "archive":
                    outside.mkdir()
                    (obs / "pending-extraction-resolved").symlink_to(outside, target_is_directory=True)
                else:
                    outside.write_bytes(outside_bytes)
                    link = obs / self.dg.PENDING_MANIFEST if target == "manifest" else pending
                    if link.exists():
                        link.unlink()
                    link.symlink_to(outside)
                self.assertEqual(self._run(args)[0], 2)
                self.assertEqual(pending.read_bytes(), source)
                if target == "archive":
                    self.assertEqual(list(outside.iterdir()), [])
                else:
                    self.assertEqual(outside.read_bytes(), outside_bytes)

    def test_retry_before_rename_reuses_durable_decision(self):
        with tempfile.TemporaryDirectory() as tmp:
            obs, pending, source, args = self._fixture(tmp)
            with mock.patch.object(self.dg.os, "rename", side_effect=OSError("simulated move failure")):
                self.assertEqual(self._run(args)[0], 2)
            first = self._events(obs)[0]
            self.assertEqual(pending.read_bytes(), source)
            code, stdout, stderr = self._run(args)
            self.assertEqual(code, 0, stderr)
            self.assertEqual(json.loads(stdout)["disposition_id"], first["disposition_id"])
            self.assertEqual([e["event"] for e in self._events(obs)],
                             ["DISPOSITION_RECORDED", "ACTIVE_REMOVED"])
            self.assertEqual(Path(first["archive_path"]).read_bytes(), source)

    def test_unresolved_retry_after_durable_append_does_not_duplicate(self):
        with tempfile.TemporaryDirectory() as tmp:
            obs, pending, source, args = self._fixture(tmp)
            args[args.index("QUALIFIED")] = "UNRESOLVED"
            append = self.dg._append_pending_event
            def interrupted(handle, record):
                append(handle, record)
                raise OSError("interruption after durable append")
            with mock.patch.object(self.dg, "_append_pending_event", side_effect=interrupted):
                self.assertEqual(self._run(args)[0], 2)
            first = self._events(obs)[0]
            code, stdout, stderr = self._run(args)
            self.assertEqual(code, 0, stderr)
            self.assertEqual(json.loads(stdout)["disposition_id"], first["disposition_id"])
            self.assertEqual(len(self._events(obs)), 1)
            self.assertEqual(pending.read_bytes(), source)


if __name__ == "__main__":
    unittest.main()
