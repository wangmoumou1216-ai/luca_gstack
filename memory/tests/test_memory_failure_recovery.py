"""Real temporary files for failures identified by the independent release redteam."""
import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

CODE = Path(__file__).resolve().parents[2] / "memory/scripts"


def load(name, root):
    (root / "memory/episodic").mkdir(parents=True, exist_ok=True)
    with mock.patch.dict(os.environ, {"MEMORY_ROOT": str(root)}):
        spec = importlib.util.spec_from_file_location("failure_" + name, CODE / (name + ".py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    return module


class MemoryFailureRecoveryTests(unittest.TestCase):
    def test_governance_writer_failure_is_explicit_in_last_attempt(self):
        for prior_digest in (False, True):
            with self.subTest(prior_digest=prior_digest), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                dg = load("daily_governance", root)
                today = dg.datetime.now(dg.timezone.utc).strftime("%Y-%m-%d")
                dg.DIGESTS.mkdir(parents=True)
                digest = dg.DIGESTS / (today + ".md")
                if prior_digest:
                    digest.write_text("prior successful evidence\n")
                with contextlib.ExitStack() as stack:
                    for name in ("check_model_routing", "check_self_model", "check_gap_recheck",
                                 "check_person_memory", "check_memory_integrity_issues", "recent_episodes",
                                 "check_upstream_drift", "check_benchmark_drift"):
                        stack.enter_context(mock.patch.object(dg, name, return_value=[]))
                    stack.enter_context(mock.patch.object(dg, "check_loop_health", return_value=([], [])))
                    stack.enter_context(mock.patch.object(dg, "measure_context_injection", return_value={} ))
                    stack.enter_context(mock.patch.object(dg, "run_consolidate", return_value={"_error": "injected writer failure"}))
                    stdout = stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
                    self.assertEqual(dg.main(), 0, "scheduled governance stays fail-open")
                result = json.loads(stdout.getvalue())
                marker = json.loads((dg.DIGESTS / (".checked-" + today)).read_text())
                self.assertEqual(result.get("status"), "failed")
                self.assertEqual(marker.get("status"), "failed")
                self.assertIn("injected writer failure", marker.get("error", ""))
                if prior_digest:
                    self.assertEqual(digest.read_text(), "prior successful evidence\n")

    def test_promotion_audit_failure_retries_before_archiving_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            cm = load("consolidate_memory", Path(tmp))
            candidate = {"id": "SC-20260908-900", "domain": "tech", "fact": 'durable "approved" evidence',
                         "proposed_stable": True, "confidence": "high", "evidence": "reviewed source",
                         "scope": "framework", "reviewer": "human", "created_at": "2026-09-08",
                         "tags": ["recovery"], "source": "original\\nreview", "valid_until": None,
                         "supersedes": None}
            cm.CANDIDATES.parent.mkdir(parents=True, exist_ok=True)
            raw = json.dumps(candidate)
            cm.CANDIDATES.write_text(raw + "\n")
            ready = cm.promotion_ready([candidate], set(), set(), {})
            with mock.patch.object(cm, "append_review", side_effect=OSError("injected audit failure")):
                with self.assertRaises(OSError):
                    cm.promote_ready_candidates([candidate], ready, False)
            # Neither a bare stable fact nor the interrupted attempt is a completed audit.
            archived = cm.archive_reviewed_candidates([(candidate, raw)], {}, cm.parse_promoted_facts(cm.PROMOTED), False)
            self.assertEqual(archived, [])
            cm.promote_ready_candidates([{**candidate, "proposed_stable": False}], [], False)
            cm.promote_ready_candidates([{**candidate, "fact": "different claim"}], [], False)
            cm.promote_ready_candidates([{**candidate, "source": "different source"}], [], False)
            cm.promote_ready_candidates([{**candidate, "source": "original\nreview"}], [], False)
            self.assertFalse(cm.REVIEWS.exists(), "recovery must not invent approval or accept mismatched evidence")
            # The alternate CLI must reconcile even when duplicate filtering leaves no new ready item.
            retry = subprocess.run([sys.executable, str(CODE / "review_candidates.py"), "--promote", "--reviewer", "human", "--days", "0"],
                                   env={**os.environ, "MEMORY_ROOT": tmp}, capture_output=True, text=True)
            self.assertEqual(retry.returncode, 0, retry.stderr)
            queue, candidates, rows, promoted, decisions, _ = cm.build_queue([])
            cm.promote_ready_candidates(candidates, queue["promotion_ready"], False)
            reviews = cm.read_jsonl(cm.REVIEWS)
            self.assertEqual(len([r for r in reviews if r.get("decision") == "promoted"]), 1)
            self.assertEqual(len(cm.parse_promoted_facts(cm.PROMOTED)), 1)
            decisions = cm.review_decisions(reviews)
            self.assertEqual(cm.archive_reviewed_candidates(rows, decisions, cm.parse_promoted_facts(cm.PROMOTED), False), [candidate["id"]])

    def test_fallback_decodes_distinct_source_strings_without_aliasing(self):
        with tempfile.TemporaryDirectory() as tmp:
            cm = load("consolidate_memory", Path(tmp))
            literal = "approved\\nsource"
            newline = "approved\nsource"
            path = Path(tmp) / "facts.yaml"
            path.write_text("facts:\n  - id: A\n    source: " + json.dumps(literal) +
                            "\n  - id: B\n    source: " + json.dumps(newline) + "\n")
            with mock.patch.object(cm, "_HAS_YAML", False):
                rows = cm.parse_promoted_facts(path)
            self.assertEqual([row["source"] for row in rows], [literal, newline])
            self.assertNotEqual(rows[0]["source"], rows[1]["source"])

    def test_audit_recovery_matches_legacy_scope_serialization(self):
        for parser in (True, False):
            for scope in (None, False, 0, "", "framework"):
                with self.subTest(parser=parser, scope=scope), tempfile.TemporaryDirectory() as tmp:
                    cm = load("consolidate_memory", Path(tmp))
                    candidate = {"id": "SC-20260908-901", "domain": "tech", "fact": "approved scoped fact",
                                 "proposed_stable": True, "confidence": "high", "evidence": "reviewed evidence",
                                 "scope": scope, "reviewer": "human", "created_at": "2026-09-08"}
                    with mock.patch.object(cm, "_HAS_YAML", parser):
                        ready = cm.promotion_ready([candidate], set(), set(), {})
                        if scope == "":
                            self.assertFalse(ready, "empty scope remains ineligible")
                            cm.promote_ready_candidates([candidate], ready, False)
                            self.assertFalse(cm.PROMOTED.exists())
                            self.assertFalse(cm.REVIEWS.exists())
                            continue
                        self.assertTrue(ready)
                        with mock.patch.object(cm, "append_review", side_effect=OSError("audit interrupted")):
                            with self.assertRaises(OSError):
                                cm.promote_ready_candidates([candidate], ready, False)
                        before = cm.PROMOTED.read_bytes()
                        cm.promote_ready_candidates([{**candidate, "scope": "different-scope"}], [], False)
                        self.assertFalse(cm.REVIEWS.exists())
                        cm.promote_ready_candidates([candidate], [], False)
                        cm.promote_ready_candidates([candidate], [], False)
                        self.assertEqual(len(cm.read_jsonl(cm.REVIEWS)), 1)
                        self.assertEqual(cm.PROMOTED.read_bytes(), before)
