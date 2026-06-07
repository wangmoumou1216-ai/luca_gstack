import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


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
            self.assertIn('"proposed_stable": true', candidates)
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


if __name__ == "__main__":
    unittest.main()
