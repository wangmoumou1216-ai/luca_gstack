import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _load_daily_governance():
    """Load daily_governance.py by file path (avoids sys.path pollution across tests)."""
    spec = importlib.util.spec_from_file_location(
        "daily_governance_under_test", ROOT / "memory" / "scripts" / "daily_governance.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MemorySystemTests(unittest.TestCase):
    def run_script(self, script, *args, env=None, check=True):
        merged_env = os.environ.copy()
        if env:
            merged_env.update(env)
        result = subprocess.run(
            [sys.executable, str(ROOT / "memory" / "scripts" / script), *args],
            cwd=ROOT,
            text=True,
            capture_output=True,
            env=merged_env,
        )
        if check and result.returncode != 0:
            self.fail(f"{script} failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}")
        return result

    def write_search_fixture(self, tmp):
        mem = Path(tmp) / "memory"
        (mem / "episodic").mkdir(parents=True)
        (mem / "semantic").mkdir(parents=True)
        (mem / "evals").mkdir(parents=True)
        (mem / "episodic" / "index.jsonl").write_text(
            "\n".join(
                [
                    json.dumps(
                        {
                            "id": "EP-old",
                            "date": "2026-05-20",
                            "topic": "prototype",
                            "summary": "Framework prototype cleanup",
                            "skills_used": ["html-prototype"],
                            "decision": "Use framework shell",
                            "source": "docs/handoff/prototype.md",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "EP-route",
                            "date": "2026-05-23",
                            "topic": "route guard",
                            "summary": "Project Gate route guard memory",
                            "skills_used": ["route-guard"],
                            "decision": "Project Gate first before skill routing",
                            "source": "docs/handoff/route.md",
                        }
                    ),
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        (mem / "semantic" / "promoted-facts.yaml").write_text(
            """version: 1
facts:
  - id: SC-route
    domain: skill-rule
    fact: "route-guard: Project Gate must run before skill routing"
    confidence: high
    stable: true
    added: 2026-05-22
    source: memory/semantic/promoted-facts.yaml
    scope:
      skills: [route-guard]
      scenes: [A]
    tags: [routing, project-gate]
  - id: SC-prototype
    domain: fxui
    fact: "HTML prototypes must use framework templates"
    confidence: medium
    stable: true
    added: 2026-05-18
    source: memory/semantic/promoted-facts.yaml
    scope:
      skills: [html-prototype]
  - id: SC-scope-scalar
    domain: fxui
    fact: "Tables keep row actions visible on hover"
    confidence: high
    stable: true
    added: 2026-05-23
    source: memory/semantic/promoted-facts.yaml
    scope: html-prototype
    tags: [html-prototype, table]
""",
            encoding="utf-8",
        )
        (mem / "evals" / "eval-log.jsonl").write_text(
            "\n".join(
                [
                    json.dumps(
                        {
                            "id": "EV-route",
                            "created_at": "2026-05-23T10:00:00+08:00",
                            "skill_name": "route-guard",
                            "topic": "route guard",
                            "quality_gate_status": "FAIL",
                            "quality_gate_findings": ["Project Gate route guard regression"],
                            "source": "memory/evals/eval-log.jsonl",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "EV-prototype",
                            "created_at": "2026-05-21T10:00:00+08:00",
                            "skill_name": "html-prototype",
                            "topic": "prototype",
                            "quality_gate_status": "PASS",
                            "quality_gate_findings": ["prototype ok"],
                        }
                    ),
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        return {"MEMORY_ROOT": str(Path(tmp))}

    def test_search_memory_ranks_results_across_three_layers(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_search_fixture(tmp)
            result = self.run_script(
                "search_memory.py",
                "Project Gate route guard",
                "--json",
                env=env,
            )
            rows = json.loads(result.stdout)
            self.assertGreaterEqual(len(rows), 3)
            self.assertEqual([row["score"] for row in rows], sorted([row["score"] for row in rows], reverse=True))
            self.assertEqual({row["layer"] for row in rows[:3]}, {"episodic", "semantic", "eval"})
            self.assertTrue(all({"layer", "id", "score", "reasons", "source", "path"}.issubset(row) for row in rows))
            self.assertTrue(any("keyword" in " ".join(row["reasons"]) for row in rows))
            self.assertTrue(any("stable" in " ".join(row["reasons"]) for row in rows if row["layer"] == "semantic"))
            self.assertTrue(any("gate_status" in " ".join(row["reasons"]) for row in rows if row["layer"] == "eval"))

    def test_search_memory_expands_chinese_project_gate_synonyms(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_search_fixture(tmp)
            result = self.run_script(
                "search_memory.py",
                "老项目 项目上下文门禁 路由",
                "--layer",
                "semantic",
                "--json",
                env=env,
            )
            rows = json.loads(result.stdout)
            self.assertEqual(rows[0]["id"], "SC-route")
            self.assertIn("project-gate", " ".join(rows[0]["reasons"]).lower())

    def test_search_memory_filters_by_layer_skill_and_topic(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_search_fixture(tmp)
            result = self.run_script(
                "search_memory.py",
                "Project Gate",
                "--layer",
                "episodic",
                "--skill",
                "route-guard",
                "--topic",
                "route",
                "--json",
                env=env,
            )
            rows = json.loads(result.stdout)
            self.assertEqual([row["id"] for row in rows], ["EP-route"])
            self.assertEqual(rows[0]["layer"], "episodic")
            self.assertIn("skill filter", rows[0]["reasons"])
            self.assertIn("topic filter", rows[0]["reasons"])

    def test_search_memory_json_output_contains_fact_or_title(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_search_fixture(tmp)
            result = self.run_script(
                "search_memory.py",
                "framework templates",
                "--layer",
                "semantic",
                "--json",
                env=env,
            )
            rows = json.loads(result.stdout)
            self.assertEqual(rows[0]["id"], "SC-prototype")
            self.assertEqual(rows[0]["fact"], "HTML prototypes must use framework templates")
            self.assertIsInstance(rows[0]["reasons"], list)

    def test_search_memory_semantic_skill_filter_reads_scalar_scope_and_tags(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_search_fixture(tmp)
            result = self.run_script(
                "search_memory.py",
                "row actions",
                "--layer",
                "semantic",
                "--skill",
                "html-prototype",
                "--json",
                env=env,
            )
            rows = json.loads(result.stdout)
            self.assertEqual([row["id"] for row in rows], ["SC-scope-scalar"])

    def test_search_memory_semantic_fallback_keeps_good_entries_when_yaml_is_malformed(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory" / "semantic"
            mem.mkdir(parents=True)
            (mem / "promoted-facts.yaml").write_text(
                """version: 1
facts:
  - id: SC-good
    domain: skill-rule
    fact: "brainstorm: ask from user goal"
    confidence: high
    stable: true
    added: 2026-05-23
    source: test
  - id: SC-bad
    domain: skill-rule
    fact: 'task-plan: malformed
  wrapped quote'
    confidence: high
    stable: true
""",
                encoding="utf-8",
            )
            result = self.run_script(
                "search_memory.py",
                "brainstorm user goal",
                "--layer",
                "semantic",
                "--json",
                env={"MEMORY_ROOT": str(Path(tmp))},
            )
            rows = json.loads(result.stdout)
            self.assertEqual([row["id"] for row in rows], ["SC-good"])

    def test_search_memory_reads_full_multiline_yaml_fact(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory" / "semantic"
            mem.mkdir(parents=True)
            (mem / "promoted-facts.yaml").write_text(
                """version: 1
facts:
  - id: SC-task-plan
    domain: skill-rule
    fact: 'task-plan: Phase 6 task cards require Read List;
      U-block must carry source sections;
      missing source context triggers NEEDS_CONTEXT'
    confidence: high
    stable: true
    added: 2026-05-23
    source: test
""",
                encoding="utf-8",
            )
            result = self.run_script(
                "search_memory.py",
                "U-block NEEDS_CONTEXT",
                "--layer",
                "semantic",
                "--json",
                env={"MEMORY_ROOT": str(Path(tmp))},
            )
            rows = json.loads(result.stdout)
            self.assertEqual(rows[0]["id"], "SC-task-plan")
            self.assertIn("NEEDS_CONTEXT", rows[0]["fact"])

    def test_retrieves_relevant_memory_by_filters(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory"
            (mem / "episodic").mkdir(parents=True)
            (mem / "semantic").mkdir(parents=True)
            (mem / "evals").mkdir(parents=True)
            (mem / "episodic" / "index.jsonl").write_text(
                "\n".join(
                    [
                        json.dumps({"id": "EP-1", "topic": "route guard", "skills_used": ["route-guard"], "decision": "Project Gate first"}),
                        json.dumps({"id": "EP-2", "topic": "prototype", "skills_used": ["html-prototype"], "decision": "Use framework"}),
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (mem / "semantic" / "promoted-facts.yaml").write_text(
                """version: 1
facts:
  - id: SC-1
    domain: skill-rule
    fact: "route-guard: Project Gate must run before skill routing"
    confidence: high
    stable: true
    added: 2026-05-23
    source: test
    scope:
      skills: [route-guard]
      scenes: [A]
    tags: [routing, project-gate]
  - id: SC-2
    domain: crm
    fact: "CRM brand color is #FF8000"
    confidence: high
    stable: true
    added: 2026-05-23
    source: test
""",
                encoding="utf-8",
            )
            (mem / "evals" / "eval-log.jsonl").write_text(
                json.dumps(
                    {
                        "skill_name": "html-prototype",
                        "topic": "lead-list",
                        "quality_gate_status": "FAIL",
                        "quality_gate_findings": ["missing dynamic reference"],
                    },
                    ensure_ascii=False,
                )
                + "\n",
                encoding="utf-8",
            )
            env = {"MEMORY_ROOT": str(Path(tmp))}

            episodic = self.run_script(
                "get_memory.py",
                "--layer",
                "episodic",
                "--topic",
                "route",
                "--skill",
                "route-guard",
                "--contains",
                "Project",
                env=env,
            ).stdout
            self.assertIn("EP-1", episodic)
            self.assertNotIn("EP-2", episodic)

            semantic = self.run_script(
                "get_memory.py",
                "--layer",
                "semantic",
                "--domain",
                "skill-rule",
                "--skill",
                "route-guard",
                "--scene",
                "A",
                "--contains",
                "Project Gate",
                env=env,
            ).stdout
            self.assertIn("SC-1", semantic)
            self.assertNotIn("SC-2", semantic)

            evals = self.run_script(
                "get_memory.py",
                "--layer",
                "eval",
                "--skill",
                "html-prototype",
                "--gate-status",
                "FAIL",
                env=env,
            ).stdout
            self.assertIn("missing dynamic reference", evals)

    def test_semantic_write_requires_review_metadata_and_dedupes(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": str(Path(tmp))}
            missing_metadata = self.run_script(
                "propose_semantic.py",
                "--domain",
                "crm",
                "--fact",
                "CRM objects use stable IDs",
                "--confidence",
                "high",
                "--stable",
                env=env,
                check=False,
            )
            self.assertNotEqual(missing_metadata.returncode, 0)
            self.assertIn("evidence", missing_metadata.stderr)

            accepted = self.run_script(
                "propose_semantic.py",
                "--domain",
                "crm",
                "--fact",
                "CRM objects use stable IDs",
                "--confidence",
                "high",
                "--stable",
                "--evidence",
                "docs/prd/crm.md#ids",
                "--scope",
                "crm",
                "--reviewer",
                "luca",
                "--tags",
                "crm,ids",
                env=env,
            )
            self.assertIn("candidate", accepted.stdout)
            candidates = Path(tmp, "memory", "semantic", "candidates.jsonl").read_text(encoding="utf-8")
            # 红线 SC-20260523-003：--stable 仅记意图，不得自评晋升（proposed_stable 须保持 false）
            self.assertIn('"proposed_stable": false', candidates)
            self.assertIn('"stable_requested": true', candidates)
            self.assertFalse(Path(tmp, "memory", "semantic", "promoted-facts.yaml").exists())

            duplicate = self.run_script(
                "propose_semantic.py",
                "--domain",
                "crm",
                "--fact",
                "CRM objects use stable IDs",
                "--confidence",
                "high",
                "--evidence",
                "docs/prd/crm.md#ids",
                "--scope",
                "crm",
                "--reviewer",
                "luca",
                env=env,
                check=False,
            )
            self.assertNotEqual(duplicate.returncode, 0)
            self.assertIn("duplicate", duplicate.stderr.lower())

    def test_semantic_reader_falls_back_when_yaml_has_bad_entry(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory" / "semantic"
            mem.mkdir(parents=True)
            (mem / "promoted-facts.yaml").write_text(
                """version: 1
facts:
  - id: SC-good
    domain: skill-rule
    fact: "brainstorm: ask from user goal"
    confidence: high
    stable: true
    added: 2026-05-23
    source: test
  - id: SC-bad
    domain: skill-rule
    fact: 'task-plan: malformed
  wrapped quote'
    confidence: high
    stable: true
""",
                encoding="utf-8",
            )
            out = self.run_script(
                "get_memory.py",
                "--layer",
                "semantic",
                "--domain",
                "skill-rule",
                "--skill",
                "brainstorm",
                env={"MEMORY_ROOT": str(Path(tmp))},
            ).stdout
            self.assertIn("SC-good", out)

    def test_episode_index_archives_when_over_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": str(Path(tmp)), "MEMORY_MAX_EPISODES": "2"}
            for i in range(4):
                self.run_script(
                    "append_episode.py",
                    "--topic",
                    f"session {i}",
                    "--summary",
                    f"summary {i}",
                    "--skills",
                    "memory",
                    "--outcomes",
                    f"outcome-{i}",
                    "--decision",
                    f"decision-{i}",
                    env=env,
                )
            index_lines = Path(tmp, "memory", "episodic", "index.jsonl").read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(index_lines), 2)
            self.assertIn("session 2", index_lines[0])
            archive_files = list(Path(tmp, "memory", "episodic", "archive").glob("*.jsonl"))
            self.assertTrue(archive_files)
            archived = "\n".join(path.read_text(encoding="utf-8") for path in archive_files)
            self.assertIn("session 0", archived)
            self.assertIn("session 1", archived)

    def test_candidate_review_requires_metadata_and_records_decision(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory" / "semantic"
            mem.mkdir(parents=True)
            (mem / "candidates.jsonl").write_text(
                "\n".join(
                    [
                        json.dumps(
                            {
                                "id": "SC-1",
                                "created_at": "2026-01-01T00:00:00+00:00",
                                "domain": "skill-rule",
                                "fact": "route-guard: Project Gate first",
                                "confidence": "high",
                                "source": "test",
                                "evidence": "tests",
                                "scope": "route-guard",
                                "reviewer": "agent",
                                "tags": ["routing"],
                                "proposed_stable": True,
                            }
                        ),
                        json.dumps(
                            {
                                "id": "SC-2",
                                "created_at": "2026-01-01T00:00:00+00:00",
                                "domain": "skill-rule",
                                "fact": "bad candidate without evidence",
                                "confidence": "high",
                                "source": "test",
                            }
                        ),
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            result = self.run_script(
                "review_candidates.py",
                "--days",
                "0",
                "--promote",
                "--reviewer",
                "luca",
                env={"MEMORY_ROOT": str(Path(tmp))},
            )
            self.assertIn("Promoted: SC-1", result.stdout)
            self.assertIn("missing review metadata", result.stdout)
            promoted = (mem / "promoted-facts.yaml").read_text(encoding="utf-8")
            self.assertIn("SC-1", promoted)
            self.assertNotIn("SC-2", promoted)
            reviews = (mem / "reviews.jsonl").read_text(encoding="utf-8")
            self.assertIn('"candidate_id": "SC-1"', reviews)
            self.assertIn('"decision": "promoted"', reviews)

    def test_review_candidates_uses_governance_queue_for_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory" / "semantic"
            mem.mkdir(parents=True)
            (mem / "promoted-facts.yaml").write_text(
                """version: 1
facts:
  - id: SC-promoted
    domain: crm
    fact: "Duplicate fact"
    confidence: high
    stable: true
    added: 2026-05-22
    source: test
""",
                encoding="utf-8",
            )
            (mem / "candidates.jsonl").write_text(
                json.dumps(
                    {
                        "id": "SC-dup",
                        "created_at": "2026-01-01T00:00:00+00:00",
                        "domain": "crm",
                        "fact": "Duplicate fact",
                        "confidence": "high",
                        "source": "test",
                        "evidence": "test",
                        "scope": "crm",
                        "reviewer": "agent",
                        "proposed_stable": True,
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            result = self.run_script(
                "review_candidates.py",
                "--days",
                "0",
                "--promote",
                "--reviewer",
                "luca",
                env={"MEMORY_ROOT": str(Path(tmp))},
            )
            promoted = (mem / "promoted-facts.yaml").read_text(encoding="utf-8")
            self.assertIn("blocked by governance queue", result.stdout)
            self.assertEqual(promoted.count("Duplicate fact"), 1)

    def write_consolidation_fixture(self, tmp):
        # 相对 now 计算日期：stale 窗口(>14d)不随运行日期漂移（根治绝对日期时间炸弹）。
        now = datetime.now(timezone.utc)
        stale_dt = (now - timedelta(days=30)).isoformat()  # 唯一应判 stale 的候选
        fresh_dt = (now - timedelta(days=2)).isoformat()   # 其余：近期、非 stale
        mem = Path(tmp) / "memory"
        (mem / "semantic").mkdir(parents=True)
        (mem / "episodic").mkdir(parents=True)
        (mem / "evals").mkdir(parents=True)
        (mem / "semantic" / "candidates.jsonl").write_text(
            "\n".join(
                [
                    json.dumps(
                        {
                            "id": "SC-old",
                            "created_at": stale_dt,
                            "domain": "crm",
                            "fact": "CRM objects use stable IDs",
                            "confidence": "medium",
                            "status": "CANDIDATE",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "SC-dup",
                            "created_at": fresh_dt,
                            "domain": "crm",
                            "fact": "CRM objects use stable IDs",
                            "confidence": "high",
                            "status": "CANDIDATE",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "SC-conflict",
                            "created_at": fresh_dt,
                            "domain": "skill-rule",
                            "fact": "html-prototype must use remote Tailwind CDN",
                            "confidence": "high",
                            "status": "CANDIDATE",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "SC-ready",
                            "created_at": fresh_dt,
                            "domain": "fxui",
                            "fact": "FxUI tables keep row actions visible on hover",
                            "confidence": "high",
                            "evidence": "docs/evaluation/table.md",
                            "scope": "fxui",
                            "reviewer": "luca",
                            "tags": ["fxui", "table"],
                            "proposed_stable": True,
                            "status": "CANDIDATE",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "SC-promoted",
                            "created_at": fresh_dt,
                            "domain": "crm",
                            "fact": "Old promoted candidate",
                            "confidence": "high",
                            "status": "CANDIDATE",
                        }
                    ),
                    json.dumps(
                        {
                            "id": "SC-rejected",
                            "created_at": fresh_dt,
                            "domain": "crm",
                            "fact": "Rejected candidate",
                            "confidence": "low",
                            "status": "CANDIDATE",
                        }
                    ),
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        (mem / "semantic" / "promoted-facts.yaml").write_text(
            """version: 1
facts:
  - id: SF-local-tailwind
    domain: skill-rule
    fact: "html-prototype must not use remote Tailwind CDN"
    confidence: high
    stable: true
    added: 2026-05-20
    source: test
  - id: SC-promoted
    domain: crm
    fact: "Old promoted candidate"
    confidence: high
    stable: true
    added: 2026-05-21
    source: test
""",
            encoding="utf-8",
        )
        (mem / "semantic" / "reviews.jsonl").write_text(
            json.dumps({"candidate_id": "SC-rejected", "decision": "rejected", "reviewer": "luca"}, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        (mem / "episodic" / "index.jsonl").write_text(
            "\n".join(
                [
                    json.dumps({"id": "EP-noisy", "topic": "empty", "outcomes": [], "blockers": []}),
                    json.dumps({"id": "EP-useful", "topic": "decision", "decision": "Use framework", "outcomes": []}),
                    json.dumps({"id": "EP-placeholder", "topic": "session 3", "summary": "summary 3", "decision": "decision-3", "outcomes": ["outcome"]}),
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        (mem / "evals" / "eval-log.jsonl").write_text(
            "\n".join(
                [
                    json.dumps(
                        {
                            "id": "EV-1",
                            "skill_name": "html-prototype",
                            "quality_gate_status": "FAIL",
                            "quality_gate_findings": ["missing dynamic reference"],
                        }
                    ),
                    json.dumps(
                        {
                            "id": "EV-2",
                            "skill_name": "html-prototype",
                            "quality_gate_status": "FAIL",
                            "quality_gate_findings": ["missing dynamic reference"],
                        }
                    ),
                    json.dumps(
                        {
                            "id": "EV-3",
                            "skill_name": "html-prototype",
                            "quality_gate_status": "PASS",
                            "quality_gate_findings": ["missing dynamic reference"],
                        }
                    ),
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        return {"MEMORY_ROOT": str(Path(tmp))}

    def test_consolidate_memory_dry_run_detects_review_queue_without_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_consolidation_fixture(tmp)
            candidates_path = Path(tmp, "memory", "semantic", "candidates.jsonl")
            reviews_path = Path(tmp, "memory", "semantic", "reviews.jsonl")
            before = {
                "candidates": candidates_path.read_text(encoding="utf-8"),
                "reviews": reviews_path.read_text(encoding="utf-8"),
                "promoted": Path(tmp, "memory", "semantic", "promoted-facts.yaml").read_text(encoding="utf-8"),
            }

            result = self.run_script("consolidate_memory.py", "--json", env=env)
            queue = json.loads(result.stdout)

            self.assertEqual(candidates_path.read_text(encoding="utf-8"), before["candidates"])
            self.assertEqual(reviews_path.read_text(encoding="utf-8"), before["reviews"])
            self.assertEqual(Path(tmp, "memory", "semantic", "promoted-facts.yaml").read_text(encoding="utf-8"), before["promoted"])
            self.assertTrue(any("SC-old" in item["candidate_ids"] and "SC-dup" in item["candidate_ids"] for item in queue["duplicate_candidates"]))
            self.assertTrue(any("SC-conflict" in item["ids"] and "SF-local-tailwind" in item["ids"] for item in queue["conflicts"]))
            self.assertEqual([item["id"] for item in queue["stale_candidates"]], ["SC-old"])
            self.assertEqual([item["id"] for item in queue["promotion_ready"]], ["SC-ready"])
            self.assertEqual([item["id"] for item in queue["noisy_episodes"]], ["EP-noisy", "EP-placeholder"])
            self.assertEqual(queue["failing_eval_patterns"][0]["skill_name"], "html-prototype")
            self.assertEqual(queue["failing_eval_patterns"][0]["count"], 2)

    def test_consolidate_memory_promote_ready_writes_promoted_and_review(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_consolidation_fixture(tmp)

            result = self.run_script("consolidate_memory.py", "--promote-ready", "--json", env=env)
            queue = json.loads(result.stdout)

            promoted = Path(tmp, "memory", "semantic", "promoted-facts.yaml").read_text(encoding="utf-8")
            reviews = Path(tmp, "memory", "semantic", "reviews.jsonl").read_text(encoding="utf-8")
            self.assertIn("SC-ready", promoted)
            self.assertIn("FxUI tables keep row actions visible on hover", promoted)
            self.assertIn("evidence:", promoted)
            self.assertIn("reviewer:", promoted)
            self.assertIn("scope:", promoted)
            self.assertIn("tags:", promoted)
            self.assertIn('"candidate_id": "SC-ready"', reviews)
            self.assertIn('"decision": "promoted"', reviews)
            self.assertEqual(queue["actions"]["promoted"], ["SC-ready"])

    def test_propose_stable_does_not_auto_promote_until_human_set_stable(self):
        # 置信度晋升洞回归：propose --stable 仅表达意图(stable_requested)；proposed_stable
        # 只能由人工 set_stable 翻转。无人值守 --promote-ready 不得晋升提案者自评候选。
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": str(Path(tmp))}
            out = self.run_script(
                "propose_semantic.py",
                "--domain", "skill-rule",
                "--fact", "regression: self-cert must not auto-promote",
                "--confidence", "high",
                "--stable",
                "--evidence", "audit 2026-06-28",
                "--scope", "memory",
                "--reviewer", "luca",
                env=env,
            )
            cid = json.loads(out.stdout)["candidate"]

            # 无人值守 promote-ready：候选只进 awaiting_approval，不进 promotion_ready，不被晋升
            q1 = json.loads(self.run_script("consolidate_memory.py", "--promote-ready", "--json", env=env).stdout)
            self.assertIn(cid, [i["id"] for i in q1["awaiting_approval"]])
            self.assertNotIn(cid, [i["id"] for i in q1["promotion_ready"]])
            self.assertEqual(q1["actions"]["promoted"], [])
            self.assertFalse(Path(tmp, "memory", "semantic", "promoted-facts.yaml").exists())

            # 人工 set_stable 批准后才进 promotion_ready 并被晋升
            q2 = json.loads(self.run_script("consolidate_memory.py", "--set-stable", cid, "--promote-ready", "--json", env=env).stdout)
            self.assertEqual(q2["actions"]["promoted"], [cid])
            self.assertIn(cid, Path(tmp, "memory", "semantic", "promoted-facts.yaml").read_text(encoding="utf-8"))

    def test_consolidate_memory_archive_reviewed_moves_candidates(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_consolidation_fixture(tmp)

            result = self.run_script("consolidate_memory.py", "--archive-reviewed", "--json", env=env)
            queue = json.loads(result.stdout)

            remaining = Path(tmp, "memory", "semantic", "candidates.jsonl").read_text(encoding="utf-8")
            archive = Path(tmp, "memory", "semantic", "archive", "candidates-2026.jsonl").read_text(encoding="utf-8")
            self.assertNotIn("SC-promoted", remaining)
            self.assertNotIn("SC-rejected", remaining)
            self.assertIn("SC-promoted", archive)
            self.assertIn("SC-rejected", archive)
            self.assertEqual(queue["actions"]["archived"], ["SC-promoted", "SC-rejected"])

    def test_consolidate_memory_archive_noisy_moves_episodes(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = self.write_consolidation_fixture(tmp)

            result = self.run_script("consolidate_memory.py", "--archive-noisy", "--json", env=env)
            queue = json.loads(result.stdout)

            remaining = Path(tmp, "memory", "episodic", "index.jsonl").read_text(encoding="utf-8")
            archive = Path(tmp, "memory", "episodic", "archive", "noisy-2026.jsonl").read_text(encoding="utf-8")
            self.assertNotIn("EP-noisy", remaining)
            self.assertNotIn("EP-placeholder", remaining)
            self.assertIn("EP-useful", remaining)
            self.assertIn("EP-noisy", archive)
            self.assertIn("EP-placeholder", archive)
            self.assertEqual(queue["actions"]["archived_noisy"], ["EP-noisy", "EP-placeholder"])

    def test_memory_health_rejects_invalid_promoted_yaml(self):
        with tempfile.TemporaryDirectory() as tmp:
            mem = Path(tmp) / "memory" / "semantic"
            mem.mkdir(parents=True)
            (mem / "promoted-facts.yaml").write_text(
                """version: 1
facts:
  - id: SC-bad
    domain: crm
    fact: broken
...
    confidence: high
""",
                encoding="utf-8",
            )
            result = self.run_script(
                "check_memory_health.py",
                env={"MEMORY_ROOT": str(Path(tmp))},
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("invalid promoted-facts.yaml", result.stdout)

    # --- daily_governance.py de-frequencing logic (2026-07-03 full-review P2-4) ---
    # consolidate_memory.py's stale_candidates() hardcodes a 14-day floor with no CLI
    # override, so anything render_stale() ever sees in production is already >=14 days
    # old — the escalation threshold must sit above that floor to have any real effect
    # (independent verification caught STALE_ESCALATE_DAYS=5 as unreachable dead code).
    def test_daily_governance_stale_escalation_threshold_is_above_the_14_day_floor(self):
        dg = _load_daily_governance()
        self.assertGreater(
            dg.STALE_ESCALATE_DAYS, 14,
            "STALE_ESCALATE_DAYS must exceed consolidate_memory.py's hardcoded 14-day "
            "stale floor, otherwise the 'plain' render branch is unreachable dead code "
            "for every real candidate that ever reaches render_stale().",
        )

    def test_daily_governance_render_stale_escalates_only_past_threshold(self):
        dg = _load_daily_governance()
        below = dg.render_stale({"id": "SC-X", "age_days": dg.STALE_ESCALATE_DAYS - 1, "fact": "recent-ish stale"})
        at = dg.render_stale({"id": "SC-Y", "age_days": dg.STALE_ESCALATE_DAYS, "fact": "long overdue"})
        above = dg.render_stale({"id": "SC-Z", "age_days": dg.STALE_ESCALATE_DAYS + 10, "fact": "very overdue"})
        self.assertNotIn("🔴", below)
        self.assertNotIn("consolidate_memory.py --set-stable", below)
        self.assertIn("🔴", at)
        self.assertIn("consolidate_memory.py --set-stable SC-Y", at)
        self.assertIn("🔴", above)
        # Non-dict / missing age_days must not crash (fail-open rendering).
        self.assertEqual(dg.render_stale("not-a-dict"), "not-a-dict")
        self.assertIn("SC-W", dg.render_stale({"id": "SC-W", "fact": "no age field"}))

    def test_daily_governance_last_digest_date_picks_max_and_ignores_checked_markers(self):
        dg = _load_daily_governance()
        with tempfile.TemporaryDirectory() as tmp:
            digests_dir = Path(tmp) / "digests"
            digests_dir.mkdir()
            for name in ["2026-06-20.md", "2026-07-01.md", "2026-06-15.md"]:
                (digests_dir / name).write_text("# digest", encoding="utf-8")
            (digests_dir / ".checked-2026-07-03").touch()  # must not be parsed as a digest date
            (digests_dir / "not-a-date.md").write_text("# junk", encoding="utf-8")
            original_digests = dg.DIGESTS
            try:
                dg.DIGESTS = digests_dir
                result = dg.last_digest_date()
                self.assertEqual(result, datetime(2026, 7, 1))
            finally:
                dg.DIGESTS = original_digests

    def test_daily_governance_last_digest_date_none_when_no_digests_exist(self):
        dg = _load_daily_governance()
        with tempfile.TemporaryDirectory() as tmp:
            empty_dir = Path(tmp) / "digests"
            original_digests = dg.DIGESTS
            try:
                dg.DIGESTS = empty_dir  # directory doesn't even exist yet
                self.assertIsNone(dg.last_digest_date())
            finally:
                dg.DIGESTS = original_digests


if __name__ == "__main__":
    unittest.main()
