"""Behavior checks for durable recall and pre-read project isolation."""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "memory" / "scripts"


class RecallScopeTests(unittest.TestCase):
    def run_cli(self, root, script, *args):
        result = subprocess.run(
            [sys.executable, str(SCRIPTS / script), *args],
            env={**os.environ, "MEMORY_ROOT": str(root)},
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_summary_is_recalled_by_a_fresh_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "memory/episodic").mkdir(parents=True)
            written = self.run_cli(root, "append_episode.py", "--meta", "--topic", "audit",
                                   "--summary", "UNIQUE_SUMMARY_RECALL_SENTINEL")
            found = self.run_cli(root, "search_memory.py", "UNIQUE_SUMMARY_RECALL_SENTINEL",
                                 "--layer", "episodic", "--json")
            self.assertIn(written["episode"], [row["id"] for row in found])

    def test_same_topic_does_not_overwrite_previous_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "memory/episodic").mkdir(parents=True)
            first = self.run_cli(root, "append_episode.py", "--meta", "--topic", "same",
                                 "--summary", "FIRST_EVIDENCE")
            second = self.run_cli(root, "append_episode.py", "--meta", "--topic", "same",
                                  "--summary", "SECOND_EVIDENCE")
            self.assertNotEqual(first["file"], second["file"])
            self.assertIn("FIRST_EVIDENCE", (root / "memory/episodic" / first["file"]).read_text())

    def test_default_recall_excludes_project_episodes_including_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            episodic = root / "memory/episodic"
            episodic.mkdir(parents=True)
            rows = [
                {"id": "EP-GLOBAL", "topic": "SCOPE_TOKEN", "project": ""},
                {"id": "EP-BETA", "topic": "SCOPE_TOKEN", "project": "beta"},
            ]
            (episodic / "index.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows))
            (episodic / "archive").mkdir()
            (episodic / "archive/history.jsonl").write_text(json.dumps({
                "id": "EP-ARCHIVE-BETA", "topic": "SCOPE_TOKEN", "project": "beta"}) + "\n")
            for layer in ("all", "episodic"):
                found = self.run_cli(root, "search_memory.py", "SCOPE_TOKEN", "--layer", layer, "--json")
                self.assertIn("EP-GLOBAL", [row["id"] for row in found])
                self.assertNotIn("EP-BETA", [row["id"] for row in found])
            found = self.run_cli(root, "search_memory.py", "SCOPE_TOKEN", "--include-archive", "--json")
            self.assertNotIn("EP-ARCHIVE-BETA", [row["id"] for row in found])
            found = self.run_cli(root, "search_memory.py", "SCOPE_TOKEN", "--layer", "episodic", "--project", "beta", "--json")
            self.assertIn("EP-BETA", [row["id"] for row in found])

    def test_no_scope_reads_nothing_and_explicit_scope_never_opens_neighbor(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "memory/episodic").mkdir(parents=True)
            projects = root / "projects"
            for project in ("alpha", "beta"):
                folder = projects / project / ".luca/memory"
                folder.mkdir(parents=True)
                (folder / "notes.md").write_text("SCOPE_SENTINEL")
            with mock.patch.dict(os.environ, {"MEMORY_ROOT": tmp, "MEMORY_PROJECTS_DIR": str(projects)}):
                spec = importlib.util.spec_from_file_location("scope_search", SCRIPTS / "search_memory.py")
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
            original = Path.read_text
            opened = []

            def record_read(path, *args, **kwargs):
                opened.append(path)
                return original(path, *args, **kwargs)

            with mock.patch.object(Path, "read_text", record_read):
                self.assertEqual(module.search("SCOPE_SENTINEL", 10, "project", "", ""), [])
                self.assertEqual(opened, [])
                rows = module.search("SCOPE_SENTINEL", 10, "project", "", "", "alpha")
                self.assertEqual([row["id"] for row in rows], ["alpha/notes"])
                self.assertEqual(opened, [projects / "alpha/.luca/memory/notes.md"])
                opened.clear()
                for bad in ("../projects/beta", str(projects / "beta"), "alpha/../beta"):
                    self.assertEqual(module.search("SCOPE_SENTINEL", 10, "project", "", "", bad), [])
                self.assertEqual(opened, [])
                (projects / "linked").symlink_to(projects / "beta", target_is_directory=True)
                self.assertEqual(module.search("SCOPE_SENTINEL", 10, "project", "", "", "linked"), [])
                self.assertEqual(opened, [])


if __name__ == "__main__":
    unittest.main()
