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

    def test_concurrent_appends_are_atomic_no_dup_no_lost(self):
        """并发原子性:N 个进程同时 append_episode → 序号必须互异(无 dup-ID)且
        无丢行(rotate 整文件覆盖不踩踏)。小 MAX_EPISODES 强制并发期间反复 rotate 施压。
        WITH flock 恒过；摘掉 flock 会 FAIL(变异校验，见 handoff)。"""
        import re as _re
        n = 20
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env.update({"MEMORY_ROOT": str(Path(tmp)), "MEMORY_MAX_EPISODES": "5"})
            script = str(ROOT / "memory" / "scripts" / "append_episode.py")
            procs = [
                subprocess.Popen(
                    [sys.executable, script, "--topic", f"concurrent-{i}",
                     "--summary", f"summary {i}", "--skills", "memory", "--meta"],
                    cwd=ROOT, text=True,
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env,
                )
                for i in range(n)
            ]
            for p in procs:
                _out, err = p.communicate(timeout=60)
                self.assertEqual(p.returncode, 0, f"append failed: {err}")

            ep_dir = Path(tmp, "memory", "episodic")
            sources = [ep_dir / "index.jsonl", *sorted((ep_dir / "archive").glob("*.jsonl"))]
            ids = []
            for src in sources:
                if src.exists():
                    for line in src.read_text(encoding="utf-8").splitlines():
                        if line.strip():
                            ids.append(json.loads(line)["id"])
            # 无丢行：index + archive 合计恰好 n 条（rotate 覆盖丢行会 < n）
            self.assertEqual(len(ids), n, f"lost/extra appends: got {len(ids)} want {n}")
            # 无 dup-ID：全部互异
            self.assertEqual(len(set(ids)), n, f"duplicate ids: {sorted(ids)}")
            # 单调连续：序号恰为 001..n（撞号或丢行都会破坏连续性）
            seqs = sorted(int(_re.search(r"-(\d{3})$", i).group(1)) for i in ids)
            self.assertEqual(seqs, list(range(1, n + 1)), f"non-contiguous seqs: {seqs}")

    def test_index_lock_fail_open_when_fcntl_unavailable(self):
        """fail-open:flock 不可用(非 POSIX / import 失败)时 index_lock 仍 yield 不崩,
        绝不因加锁让记忆写入失败。"""
        spec = importlib.util.spec_from_file_location(
            "append_episode_failopen", ROOT / "memory" / "scripts" / "append_episode.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        with tempfile.TemporaryDirectory() as tmp:
            mod.LOCK = Path(tmp) / "nonexistent-subdir" / ".index.lock"  # 父目录尚不存在
            mod.fcntl = None  # 模拟 fcntl 不可用
            entered = []
            with mod.index_lock():
                entered.append(True)
            self.assertEqual(entered, [True], "fail-open 分支未 yield")

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

            # 人工 set_stable 批准后才进 promotion_ready 并被晋升（2026-07-15 起闸门必须署名）
            q2 = json.loads(self.run_script("consolidate_memory.py", "--set-stable", cid, "--reviewer", "tester", "--promote-ready", "--json", env=env).stdout)
            self.assertEqual(q2["actions"]["promoted"], [cid])
            self.assertIn(cid, Path(tmp, "memory", "semantic", "promoted-facts.yaml").read_text(encoding="utf-8"))
            # 闸门留痕：approved_stable 记录带操作者署名（评审切面 a 问题 4）
            reviews = Path(tmp, "memory", "semantic", "reviews.jsonl").read_text(encoding="utf-8")
            self.assertIn('"decision": "approved_stable"', reviews)
            self.assertIn('"reviewer": "tester"', reviews)
            # 无署名的闸门操作直接被 argparse 层拒绝
            bare = self.run_script("consolidate_memory.py", "--set-stable", cid, env=env, check=False)
            self.assertEqual(bare.returncode, 2)

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


class MemoryReviewRound2026_07_15(unittest.TestCase):
    """记忆+自成长层评审（2026-07-15）修复的回归钉：决策通道/数据完整性/检索/可见性。"""

    run_script = MemorySystemTests.run_script

    def _minimal_candidate(self, tmp, cid="SC-fix", **overrides):
        sem = Path(tmp) / "memory" / "semantic"
        sem.mkdir(parents=True, exist_ok=True)
        c = {
            "id": cid, "domain": "skill-rule", "fact": f"fact for {cid}",
            "confidence": "high", "proposed_stable": False, "stable_requested": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "evidence": "review 2026-07-15", "scope": "memory", "reviewer": "proposer",
            "status": "CANDIDATE",
        }
        c.update(overrides)
        with (sem / "candidates.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
        return c

    def test_reject_verb_writes_review_and_archives(self):
        # 评审切面 a 问题 2：拒绝此前没有机器动词，只能手工编辑 jsonl
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            self._minimal_candidate(tmp, "SC-to-reject")
            out = json.loads(self.run_script(
                "consolidate_memory.py", "--reject", "SC-to-reject",
                "--reason", "过时", "--reviewer", "tester", "--archive-reviewed", "--json",
                env=env).stdout)
            self.assertEqual(out["actions"]["rejected"]["rejected"], ["SC-to-reject"])
            reviews = Path(tmp, "memory", "semantic", "reviews.jsonl").read_text(encoding="utf-8")
            self.assertIn('"decision": "rejected"', reviews)
            self.assertIn('"reviewer": "tester"', reviews)
            self.assertIn("过时", reviews)
            # 同次 --archive-reviewed 直接归档（decisions 在 reject 写盘后构建）
            self.assertNotIn("SC-to-reject", Path(tmp, "memory", "semantic", "candidates.jsonl").read_text(encoding="utf-8"))
            self.assertIn("SC-to-reject", Path(tmp, "memory", "semantic", "archive", "candidates-2026.jsonl").read_text(encoding="utf-8"))

    def test_digest_stale_commands_pass_target_argparse(self):
        # 评审切面 a 问题 1 的契约钉：digest 生成的每条命令必须能通过目标脚本 argparse
        # （史前 --approve 误写、本次 --reviewer 未定义，同类命令级错误第三次不允许发生）
        import re as _re
        import shlex as _shlex
        dg = _load_daily_governance()
        rendered = dg.render_stale({"id": "SC-cmd", "age_days": dg.STALE_ESCALATE_DAYS + 1, "fact": "f"})
        cmds = _re.findall(r"`python3 memory/scripts/(\S+) ([^`]+)`", rendered)
        self.assertGreaterEqual(len(cmds), 2, f"应至少含晋升+拒绝两条命令：{rendered}")
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            Path(tmp, "memory", "semantic").mkdir(parents=True)
            for script, argstr in cmds:
                argstr = argstr.replace("<你的名字>", "tester").replace("<理由>", "r")
                result = self.run_script(script, *_shlex.split(argstr), env=env, check=False)
                self.assertNotEqual(result.returncode, 2,
                                    f"digest 命令未通过 {script} argparse：{argstr}\n{result.stderr}")

    def test_review_candidates_missing_metadata_not_auto_rejected(self):
        # 评审切面 a 问题 5：缺元数据是可补救状态，--promote 不得写下不可逆的 rejected 终审
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
            self._minimal_candidate(tmp, "SC-no-meta", evidence="", scope="", reviewer="", created_at=old)
            out = self.run_script("review_candidates.py", "--promote", "--reviewer", "tester", env=env)
            self.assertIn("missing review metadata", out.stdout)
            reviews_path = Path(tmp, "memory", "semantic", "reviews.jsonl")
            if reviews_path.exists():
                self.assertNotIn('"decision": "rejected"', reviews_path.read_text(encoding="utf-8"))

    def test_malformed_candidate_line_survives_rewrite(self):
        # 评审切面 a 问题 7：整文件重写不得静默蒸发畸形行（实测曾 22 行变 21 行零告警）
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            self._minimal_candidate(tmp, "SC-good")
            broken = '{"id": "SC-broken", "fact": "half a line'
            cand = Path(tmp, "memory", "semantic", "candidates.jsonl")
            with cand.open("a", encoding="utf-8") as f:
                f.write(broken + "\n")
            self.run_script("consolidate_memory.py", "--set-stable", "SC-good", "--reviewer", "tester", env=env)
            content = cand.read_text(encoding="utf-8")
            self.assertIn(broken, content, "畸形行在 set-stable 重写后消失")
            # 归档重写路径同样保留
            self.run_script("consolidate_memory.py", "--archive-reviewed", env=env)
            self.assertIn(broken, cand.read_text(encoding="utf-8"), "畸形行在 archive 重写后消失")

    def test_promoted_source_with_colon_yields_valid_yaml(self):
        # 评审切面 a 问题 8：source 含冒号曾毒化 promoted-facts.yaml 严格解析
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            self._minimal_candidate(tmp, "SC-colon", source="deepresearch 2026-05: notes")
            self.run_script("consolidate_memory.py", "--set-stable", "SC-colon", "--reviewer", "tester",
                            "--promote-ready", env=env)
            import yaml as _yaml
            parsed = _yaml.safe_load(Path(tmp, "memory", "semantic", "promoted-facts.yaml").read_text(encoding="utf-8"))
            self.assertTrue(any(f.get("id") == "SC-colon" for f in parsed["facts"]))

    def test_awaiting_approval_renders_in_digest_and_marker_gets_content(self):
        # 评审切面 a 问题 3（正门装门铃）+ 切面 c C3（marker 完成痕）
        import shutil
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            scripts_dir = Path(tmp, "memory", "scripts")
            scripts_dir.mkdir(parents=True)
            shutil.copy(ROOT / "memory" / "scripts" / "consolidate_memory.py", scripts_dir)
            self._minimal_candidate(tmp, "SC-await")  # stable_requested=True, proposed_stable=False
            self.run_script("daily_governance.py", env=env)
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            digest = Path(tmp, "memory", "digests", f"{today}.md").read_text(encoding="utf-8")
            self.assertIn("待批准晋升", digest)
            self.assertIn("SC-await", digest)
            self.assertIn("--set-stable SC-await --reviewer", digest)
            marker = Path(tmp, "memory", "digests", f".checked-{today}")
            self.assertTrue(marker.exists())
            self.assertGreater(marker.stat().st_size, 0, "治理健康完成后 marker 必须带结果 JSON（空=崩溃痕）")

    def test_loop_health_pending_backlog_checks_caller_repo(self):
        # 评审切面 c C1：捕获侧把 pending 写在 fork，只查权威库 = 事故最可能发生的仓失明
        dg = _load_daily_governance()
        with tempfile.TemporaryDirectory() as tmp:
            auth = Path(tmp) / "auth"
            fork = Path(tmp) / "fork"
            (auth / ".claude" / "observability").mkdir(parents=True)
            fork_obs = fork / ".claude" / "observability"
            fork_obs.mkdir(parents=True)
            for i in range(dg.LOOP_PENDING_ALERT):
                (fork_obs / f"pending-extraction-{i}.md").write_text("x", encoding="utf-8")
            anomalies, _notes = dg.check_loop_health(
                observability_dir=auth / ".claude" / "observability",
                episodic_index=auth / "index.jsonl", digests_dir=auth / "digests",
                resolved_root=Path(dg.AUTHORITATIVE_MEMORY_ROOT), fork_home=fork,
                env_memory_root=None, today="2026-07-15")
            self.assertTrue(any("pending-extraction 积压" in a for a in anomalies),
                            f"fork 侧积压未被发现：{anomalies}")

    def test_loop_health_ignores_empty_checked_markers(self):
        # 评审切面 c C3：空 marker = 认领后未完成，不得算「已治理」而掩蔽崩溃日
        dg = _load_daily_governance()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".claude" / "observability").mkdir(parents=True)
            digests = root / "digests"
            digests.mkdir()
            (root / "index.jsonl").write_text(json.dumps({"id": "EP-x", "date": "2026-07-14"}) + "\n", encoding="utf-8")
            (digests / ".checked-2026-07-14").write_text("", encoding="utf-8")  # 认领痕（空=崩溃）
            kwargs = dict(observability_dir=root / ".claude" / "observability",
                          episodic_index=root / "index.jsonl", digests_dir=digests,
                          resolved_root=Path(dg.AUTHORITATIVE_MEMORY_ROOT), fork_home=root,
                          env_memory_root=None, today="2026-07-15")
            anomalies, _ = dg.check_loop_health(**kwargs)
            self.assertTrue(any("无对应 governance marker" in a for a in anomalies),
                            f"空 marker 掩蔽了崩溃日：{anomalies}")
            (digests / ".checked-2026-07-14").write_text('{"ok": 1}', encoding="utf-8")
            anomalies2, _ = dg.check_loop_health(**kwargs)
            self.assertFalse(any("无对应 governance marker" in a for a in anomalies2))

    def test_tokenize_cjk_sentence_query_hits(self):
        # 评审切面 b B2：旧分词把整句中文吞成巨 token，整句 query 必然零命中（漏检 ~15%）
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp}
            ep = Path(tmp, "memory", "episodic")
            ep.mkdir(parents=True)
            (ep / "index.jsonl").write_text(json.dumps({
                "id": "EP-progress", "date": "2026-07-10", "topic": "muse 项目进度页 html 原型",
                "skills_used": ["html-prototype"], "decision": "进度页用 framework 母版",
            }, ensure_ascii=False) + "\n", encoding="utf-8")
            out = json.loads(self.run_script(
                "search_memory.py", "给muse项目生成一个进度html", "--json", env=env).stdout)
            self.assertTrue(out, "整句中文+粘连英文 query 应命中（muse/html/进度 bigram）")
            self.assertEqual(out[0]["id"], "EP-progress")
            # 单字符 query 不得靠裸子串 exact-phrase 命中一切
            out2 = json.loads(self.run_script("search_memory.py", "x", "--json", env=env).stdout)
            self.assertEqual(out2, [])

    def test_retrieval_log_records_params_and_source_tag(self):
        # 评审切面 b B1：log 不记参数则 miss 不可归因；测试流量必须可打标排除
        with tempfile.TemporaryDirectory() as tmp:
            env = {"MEMORY_ROOT": tmp, "MEMORY_SEARCH_SOURCE": "test"}
            Path(tmp, "memory", "episodic").mkdir(parents=True)
            Path(tmp, "memory", "episodic", "index.jsonl").write_text("", encoding="utf-8")
            self.run_script("search_memory.py", "任意查询词", "--layer", "episodic", "--limit", "3", env=env)
            log_lines = Path(tmp, "memory", "retrieval-log.jsonl").read_text(encoding="utf-8").strip().splitlines()
            rec = json.loads(log_lines[-1])
            self.assertEqual(rec["source"], "test")
            self.assertEqual(rec["layer"], "episodic")
            self.assertEqual(rec["limit"], 3)
            self.assertIn("cwd_tail", rec)


class ConsolidationPass2026_07_21(unittest.TestCase):
    """收口 Pass（2026-07-21）的回归钉：归档检索开关 + gaps 复核观察者。

    独立验收批评本批改动"零回归覆盖"——正则/算术无 checker 咬住。这里补上。
    """

    run_script = MemorySystemTests.run_script

    def _archive_fixture(self, tmp):
        ep = Path(tmp) / "memory" / "episodic"
        (ep / "archive").mkdir(parents=True, exist_ok=True)
        hot = {"id": "EP-HOT-001", "topic": "热窗条目 zebrahot", "date": "2026-07-01"}
        arch = {"id": "EP-ARCH-001", "topic": "归档独有 zebraarch", "date": "2026-05-01"}
        noisy = {"id": "EP-NOISY-001", "topic": "噪音归档 zebranoisy", "date": "2026-05-02"}
        dup = {"id": "EP-HOT-001", "topic": "热窗条目 zebrahot", "date": "2026-07-01"}
        (ep / "index.jsonl").write_text(json.dumps(hot, ensure_ascii=False) + "\n", encoding="utf-8")
        (ep / "archive" / "2026.jsonl").write_text(
            json.dumps(arch, ensure_ascii=False) + "\n" + json.dumps(dup, ensure_ascii=False) + "\n",
            encoding="utf-8")
        (ep / "archive" / "noisy-2026.jsonl").write_text(json.dumps(noisy, ensure_ascii=False) + "\n", encoding="utf-8")

    def test_archive_hidden_by_default_and_visible_with_flag(self):
        # BACKLOG #21：归档默认不在检索面；--include-archive 才并入（零默认噪音）
        with tempfile.TemporaryDirectory() as tmp:
            self._archive_fixture(tmp)
            env = {"MEMORY_ROOT": tmp}
            off = self.run_script("search_memory.py", "zebraarch", "--layer", "episodic", env=env)
            self.assertNotIn("EP-ARCH-001", off.stdout, "默认档不得检索到归档条目")
            self.assertIn("--include-archive", off.stdout, "miss 提示必须指向新开关（消费面接线）")
            on = self.run_script("search_memory.py", "zebraarch", "--layer", "episodic",
                                 "--include-archive", env=env)
            self.assertIn("EP-ARCH-001", on.stdout, "开关打开后归档条目必须可检索")
            self.assertIn("archive/2026.jsonl", on.stdout, "归档命中的溯源路径须指向档案文件而非 index")

    def test_archive_excludes_noisy_and_dedupes_against_hot_window(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._archive_fixture(tmp)
            env = {"MEMORY_ROOT": tmp}
            noisy = self.run_script("search_memory.py", "zebranoisy", "--layer", "episodic",
                                    "--include-archive", env=env)
            self.assertNotIn("EP-NOISY-001", noisy.stdout, "noisy-*.jsonl 因是噪音而归档，不得并入检索面")
            dup = self.run_script("search_memory.py", "zebrahot", "--layer", "episodic",
                                  "--include-archive", env=env)
            self.assertEqual(dup.stdout.count("EP-HOT-001"), 1,
                             "同 id 同时在 index 与 archive 时不得返回双份（各占一个 limit 名额）")

    def _gaps_fixture(self, tmp, body):
        d = Path(tmp) / ".claude" / "skill-os" / "evolution"
        d.mkdir(parents=True, exist_ok=True)
        (d / "gaps-register.yaml").write_text(body, encoding="utf-8")

    def _gap_issues(self, tmp):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "dg_probe", ROOT / "memory" / "scripts" / "daily_governance.py")
        os.environ["MEMORY_ROOT"] = str(tmp)
        try:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod.check_gap_recheck()
        finally:
            os.environ.pop("MEMORY_ROOT", None)

    def test_gap_recheck_reports_overdue_met_and_bad_date_independently(self):
        # 一条坏日期曾让整轮检查失明（超期项与 MET 项双双静默丢失）——三分支必须互不遮蔽
        self.maxDiff = None
        with tempfile.TemporaryDirectory() as tmp:
            self._gaps_fixture(tmp, (
                "gaps:\n"
                "  - id: GAP-BAD\n    dimension: t\n    severity: low\n"
                "    status: addressed\n    addressed_at: not-a-date\n"
                "  - id: GAP-OVERDUE\n    dimension: t\n    severity: high\n"
                "    status: addressed\n    addressed_at: 2024-01-01\n"
                "  - id: GAP-MET\n    dimension: t\n    severity: low\n"
                "    status: open\n    revisit_when: \"cond\"\n    revisit_status: \"MET — x\"\n"
            ))
            blob = "\n".join(self._gap_issues(tmp))
            self.assertIn("GAP-BAD", blob, "坏日期须点名报错，不得静默跳过")
            self.assertIn("GAP-OVERDUE", blob, "坏日期不得让超期项失明")
            self.assertIn("GAP-MET", blob, "坏日期不得让 revisit-MET 项失明")

    def test_bitemporal_readside_filters_superseded_and_expired(self):
        # BACKLOG #2 闭合：读侧过滤被取代(supersedes)与过期(valid_until)的事实；悬空引用保留自己
        with tempfile.TemporaryDirectory() as tmp:
            sem = Path(tmp) / "memory" / "semantic"
            sem.mkdir(parents=True, exist_ok=True)
            (sem / "promoted-facts.yaml").write_text(
                "facts:\n"
                "  - id: SC-NEW\n    domain: skill-rule\n    fact: zebrabitemp new\n"
                "    confidence: high\n    stable: true\n    added: 2026-07-22\n    source: t\n    supersedes: SC-OLD\n"
                "  - id: SC-OLD\n    domain: skill-rule\n    fact: zebrabitemp old\n"
                "    confidence: high\n    stable: true\n    added: 2026-07-01\n    source: t\n"
                "  - id: SC-EXPIRED\n    domain: skill-rule\n    fact: zebrabitemp expired\n"
                "    confidence: high\n    stable: true\n    added: 2026-07-01\n    source: t\n    valid_until: 2026-07-10\n"
                "  - id: SC-DANGLING\n    domain: skill-rule\n    fact: zebrabitemp dangling\n"
                "    confidence: high\n    stable: true\n    added: 2026-07-22\n    source: t\n    supersedes: SC-NOEXIST\n",
                encoding="utf-8")
            r = self.run_script("search_memory.py", "zebrabitemp", "--layer", "semantic", "--limit", "10",
                                env={"MEMORY_ROOT": tmp})
            self.assertIn("SC-NEW", r.stdout, "取代方须保留")
            self.assertIn("SC-DANGLING", r.stdout, "悬空 supersedes 须保留自己")
            self.assertNotIn("SC-OLD", r.stdout, "被取代的旧事实必须被读侧过滤（BACKLOG #2）")
            self.assertNotIn("SC-EXPIRED", r.stdout, "过期事实必须被读侧过滤")

    def test_gap_recheck_silent_when_nothing_due_and_when_file_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            self._gaps_fixture(tmp, (
                "gaps:\n"
                "  - id: GAP-FRESH\n    dimension: t\n    severity: low\n"
                "    status: addressed\n    addressed_at: "
                + datetime.now(timezone.utc).date().isoformat() + "\n"
                "  - id: GAP-PLAIN\n    dimension: t\n    severity: low\n    status: open\n"
            ))
            self.assertEqual(self._gap_issues(tmp), [], "无到期项时须静默，不得制造噪音")
        with tempfile.TemporaryDirectory() as tmp2:
            self.assertEqual(self._gap_issues(tmp2), [], "gaps-register 缺失须 fail-open 静默")


class UpstreamDriftWatcherTests(unittest.TestCase):
    """B1 上游漂移侦测（2026-07-15）：propose-only watcher 行为契约（比较键/节流/静音/fail-open）。"""

    def _write_pins(self, tmp, units):
        import yaml
        p = Path(tmp) / "installed-pins.yaml"
        p.write_text(yaml.safe_dump({"units": units}, allow_unicode=True), encoding="utf-8")
        return p

    def _skill_unit(self, name="tdd", watch="a" * 40, **over):
        u = {"name": name, "kind": "skill", "repo": "o/r", "path": f"skills/{name}",
             "install_path": None, "pinned_sha": None, "watch_sha": watch,
             "ack_sha": None, "pinned_at": "2026-07-15", "source": "backfill", "note": None}
        u.update(over)
        return u

    def _run(self, tmp, units, fetch, plugins=None, marker_name="marker"):
        dg = _load_daily_governance()
        pins = self._write_pins(tmp, units)
        pj = Path(tmp) / "installed_plugins.json"
        pj.write_text(json.dumps(plugins or {}), encoding="utf-8")
        return dg.check_upstream_drift(pins, pj, Path(tmp) / marker_name, "2026-07-15", fetch_latest=fetch)

    def test_drift_reported_when_watch_sha_moves(self):
        with tempfile.TemporaryDirectory() as tmp:
            issues = self._run(tmp, [self._skill_unit(watch="a" * 40)], lambda r, p: "b" * 40)
            self.assertEqual(len(issues), 1)
            self.assertIn("tdd", issues[0])
            self.assertIn("a" * 8, issues[0])
            self.assertIn("b" * 8, issues[0])
            self.assertIn("compare/", issues[0])
            self.assertIn("FUSION", issues[0])

    def test_silent_when_unchanged_and_ack_silences(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(self._run(tmp, [self._skill_unit(watch="a" * 40)], lambda r, p: "a" * 40), [])
        with tempfile.TemporaryDirectory() as tmp:
            # 已裁决不采纳（ack_sha）→ 静音；上游再动到第三个版本才重新告警
            unit = self._skill_unit(watch="a" * 40, ack_sha="b" * 40)
            self.assertEqual(self._run(tmp, [unit], lambda r, p: "b" * 40), [])
            issues = self._run(tmp, [unit], lambda r, p: "c" * 40, marker_name="m2")
            self.assertEqual(len(issues), 1)

    def test_plugin_check_is_local_zero_network(self):
        calls = []
        def fetch(r, p):
            calls.append(r)
            return "a" * 40
        with tempfile.TemporaryDirectory() as tmp:
            plugin = {"name": "superpowers", "kind": "plugin",
                      "plugin_key": "superpowers@claude-plugins-official",
                      "last_vetted_version": "5.1.0", "pinned_at": "2026-06-07"}
            plugins_json = {"superpowers@claude-plugins-official": [{"version": "6.1.1"}]}
            issues = self._run(tmp, [plugin], fetch, plugins=plugins_json)
            self.assertEqual(len(issues), 1)
            self.assertIn("6.1.1", issues[0])
            self.assertIn("5.1.0", issues[0])
            self.assertEqual(calls, [], "plugin 检查必须纯本地零网络")

    def test_throttle_marker_three_states_and_cache_replay(self):
        calls = []
        def fetch(r, p):
            calls.append(r)
            return "a" * 40
        with tempfile.TemporaryDirectory() as tmp:
            marker = Path(tmp) / "marker"
            # 新鲜 marker（旧格式非 JSON）→ 零网络调用、无缓存可回放
            marker.write_text("2026-07-15", encoding="utf-8")
            issues = self._run(tmp, [self._skill_unit()], fetch)
            self.assertEqual(calls, [])
            self.assertEqual(issues, [])
            # marker 缺失 → 实跑且成功后写入（含缓存 JSON）
            marker.unlink()
            self._run(tmp, [self._skill_unit()], fetch)
            self.assertEqual(len(calls), 1)
            self.assertTrue(marker.exists(), "成功后 marker 应被写")
            # 全失败 → marker 不 touch（次日重试）
            marker.unlink()
            def boom(r, p):
                raise RuntimeError("offline")
            issues = self._run(tmp, [self._skill_unit()], boom)
            self.assertFalse(marker.exists(), "全失败不得刷新节流 marker")
            self.assertTrue(any("全失败" in i for i in issues))
        with tempfile.TemporaryDirectory() as tmp:
            # 缓存回放：实跑发现漂移 → 节流期内重跑（零网络）仍返回同一条漂移行，
            # 否则同日 digest 重写会把漂移行洗掉
            drift_calls = []
            def drift_fetch(r, p):
                drift_calls.append(r)
                return "b" * 40
            first = self._run(tmp, [self._skill_unit(watch="a" * 40)], drift_fetch)
            self.assertEqual(len(first), 1)
            def must_not_call(r, p):
                raise AssertionError("节流期不得打网络")
            replay = self._run(tmp, [self._skill_unit(watch="a" * 40)], must_not_call)
            self.assertEqual(replay, first, "节流期应回放缓存的漂移行")

    def test_fail_open_family(self):
        dg = _load_daily_governance()
        with tempfile.TemporaryDirectory() as tmp:
            # pins 缺失 → 空返回无异常
            self.assertEqual(dg.check_upstream_drift(
                Path(tmp) / "nope.yaml", Path(tmp) / "nope.json", Path(tmp) / "m", "2026-07-15",
                fetch_latest=lambda r, p: "x"), [])
            # pins 畸形 → 折叠单条异常 issue
            bad = Path(tmp) / "bad.yaml"
            bad.write_text("units: [->{{", encoding="utf-8")
            issues = dg.check_upstream_drift(bad, Path(tmp) / "n.json", Path(tmp) / "m1", "2026-07-15",
                                             fetch_latest=lambda r, p: "x")
            self.assertEqual(len(issues), 1)
            self.assertIn("fail-open", issues[0])
        with tempfile.TemporaryDirectory() as tmp:
            # 单源异常不吞全局：另一源照常判漂移；失败源单列供应链信号
            def fetch(r, p):
                if "dead" in p:
                    raise RuntimeError("HTTP 404")
                return "b" * 40
            issues = self._run(tmp, [self._skill_unit("dead"), self._skill_unit("alive", watch="a" * 40)], fetch)
            self.assertTrue(any("alive" in i and "compare/" in i for i in issues))
            self.assertTrue(any("dead" in i and "404" in i and "供应链" in i for i in issues))
        with tempfile.TemporaryDirectory() as tmp:
            # 空串结果 ≠ 无漂移：判 repo/path 疑错
            issues = self._run(tmp, [self._skill_unit()], lambda r, p: "")
            self.assertTrue(any("疑错" in i for i in issues), issues)

    def test_propose_only_never_mutates(self):
        with tempfile.TemporaryDirectory() as tmp:
            pins = self._write_pins(tmp, [self._skill_unit(watch="a" * 40)])
            before = pins.read_bytes()
            entries_before = sorted(p.name for p in Path(tmp).iterdir())
            pj = Path(tmp) / "installed_plugins.json"
            pj.write_text("{}", encoding="utf-8")
            dg = _load_daily_governance()
            dg.check_upstream_drift(pins, pj, Path(tmp) / "marker", "2026-07-15",
                                    fetch_latest=lambda r, p: "b" * 40)
            self.assertEqual(pins.read_bytes(), before, "watcher 不得改 pins")
            entries_after = sorted(p.name for p in Path(tmp).iterdir())
            self.assertEqual(set(entries_after) - set(entries_before) - {"installed_plugins.json"},
                             {"marker"}, "除节流 marker 外不得产生任何新文件")


if __name__ == "__main__":
    unittest.main()
