import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "memory" / "scripts"


def canonical_sha(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def isolated_subprocess_env(extra=None):
    """Keep temporary Git fixtures isolated even when invoked from a real hook.

    Git exports repository-scoped ``GIT_*`` variables to hooks.  Those variables
    override ``git -C <fixture>`` and can otherwise redirect a fixture commit to
    the repository whose hook is running.
    """
    env = os.environ.copy()
    for key in tuple(env):
        if key.startswith("GIT_"):
            env.pop(key, None)
    if extra:
        env.update(extra)
    return env


class PromotionIssuerTests(unittest.TestCase):
    def test_fixture_subprocess_env_scrubs_inherited_git_context(self):
        poisoned = {
            "GIT_DIR": "/tmp/should-not-survive",
            "GIT_WORK_TREE": "/tmp/should-not-survive",
            "GIT_INDEX_FILE": "/tmp/should-not-survive-index",
            "GIT_PREFIX": "nested/",
        }
        with mock.patch.dict(os.environ, poisoned, clear=False):
            isolated = isolated_subprocess_env({"KEEP_ME": "yes"})
        self.assertEqual(isolated["KEEP_ME"], "yes")
        self.assertFalse([key for key in isolated if key.startswith("GIT_")])

    def run_script(self, name, *args, root, check=True):
        env = isolated_subprocess_env({"MEMORY_ROOT": str(root)})
        result = subprocess.run(
            [sys.executable, str(SCRIPTS / name), *args],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
        )
        if check and result.returncode != 0:
            self.fail(f"{name} failed\nstdout={result.stdout}\nstderr={result.stderr}")
        return result

    def candidate(self, cid="SC-U011-VALID"):
        return {
            "id": cid,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "domain": "skill-rule",
            "fact": f"authenticated fact {cid}",
            "confidence": "high",
            "status": "CANDIDATE",
            "stable_requested": True,
            "proposed_stable": False,
            "evidence": "ASSERT-019 fixture",
            "scope": "memory",
            "reviewer": "proposer",
        }

    def write_candidate(self, root, candidate):
        semantic = root / "memory" / "semantic"
        semantic.mkdir(parents=True)
        (semantic / "candidates.jsonl").write_text(json.dumps(candidate) + "\n", encoding="utf-8")

    def test_central_writer_mints_authenticated_receipt_after_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidate = self.candidate()
            self.write_candidate(root, candidate)
            self.run_script(
                "consolidate_memory.py", "--set-stable", candidate["id"],
                "--reviewer", "human-reviewer", root=root,
            )
            result = self.run_script("consolidate_memory.py", "--promote-ready", "--json", root=root)
            queue = json.loads(result.stdout)
            self.assertEqual(queue["actions"]["promoted"], [candidate["id"]])
            receipts = list((root / "memory" / "semantic" / "promotion-receipts").glob("*.json"))
            self.assertEqual(len(receipts), 1)
            receipt = json.loads(receipts[0].read_text(encoding="utf-8"))
            self.assertEqual(receipt["candidates"][0]["id"], candidate["id"])
            self.assertEqual(receipt["approved_reviews"][0]["decision"], "approved_stable")
            self.assertEqual(receipt["approved_reviews"][0]["candidate_sha256"], canonical_sha(receipt["candidates"][0]))

    def test_imported_issuer_rejects_fake_chain_even_with_spoofed_argv(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidate = self.candidate("SC-U011-FAKE")
            candidate["proposed_stable"] = True
            self.write_candidate(root, candidate)
            approval = {
                "candidate_id": candidate["id"],
                "decision": "approved_stable",
                "reviewer": "attacker",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "candidate_sha256": canonical_sha(candidate),
            }
            reviews = root / "memory" / "semantic" / "reviews.jsonl"
            reviews.write_text(json.dumps(approval) + "\n", encoding="utf-8")
            after = (
                "version: 1\nfacts:\n"
                f"  - id: {candidate['id']}\n"
                "    domain: skill-rule\n"
                f"    fact: \"{candidate['fact']}\"\n"
                "    confidence: high\n"
                "    stable: true\n"
                f"    added: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n"
                "    source: \"ASSERT-019 fixture\"\n"
                "    evidence: \"ASSERT-019 fixture\"\n"
                "    reviewer: \"proposer\"\n"
                "    scope: \"memory\"\n"
            ).encode()
            code = (
                "import json,sys; from pathlib import Path; "
                "sys.path.insert(0, sys.argv[1]); "
                "from promotion_provenance import issue_receipt; "
                "root=Path(sys.argv[2]); c=json.loads(sys.argv[3]); a=json.loads(sys.argv[4]); "
                f"sys.argv[0]={str(SCRIPTS / 'consolidate_memory.py')!r}; "
                "issue_receipt(root,b'',sys.stdin.buffer.read(),[c],[a])"
            )
            result = subprocess.run(
                [sys.executable, "-c", code, str(SCRIPTS), str(root), json.dumps(candidate), json.dumps(approval)],
                input=after,
                env=isolated_subprocess_env(),
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b"must be called by promote_ready_candidates", result.stderr)
            self.assertFalse((root / "memory" / "semantic" / "promotion-receipts").exists())


class PromotionGitGuardTests(unittest.TestCase):
    run_script = PromotionIssuerTests.run_script
    candidate = PromotionIssuerTests.candidate
    def git(self, root, *args, check=True):
        result = subprocess.run(
            ["git", "-C", str(root), *args],
            env=isolated_subprocess_env(),
            text=True,
            capture_output=True,
        )
        if check and result.returncode != 0:
            self.fail(f"git {' '.join(args)} failed\n{result.stdout}\n{result.stderr}")
        return result

    def prepare_transition(self, root, ids=("SC-Z-LAST", "SC-A-FIRST")):
        self.git(root, "init", "-b", "main")
        self.git(root, "config", "user.email", "u011@example.invalid")
        self.git(root, "config", "user.name", "U011 Fixture")
        semantic = root / "memory" / "semantic"
        semantic.mkdir(parents=True)
        candidates = []
        approvals = []
        for cid in ids:
            candidate = self.candidate(cid)
            candidate["proposed_stable"] = True
            candidates.append(candidate)
            approvals.append(
                {
                    "candidate_id": cid,
                    "decision": "approved_stable",
                    "reviewer": "human-reviewer",
                    "reviewed_at": "2026-08-11T00:00:00+00:00",
                    "candidate_sha256": canonical_sha(candidate),
                    "source": "consolidate_memory.py",
                }
            )
        (semantic / "candidates.jsonl").write_text(
            "\n".join(json.dumps(item) for item in candidates) + "\n", encoding="utf-8"
        )
        stable = semantic / "promoted-facts.yaml"
        stable.write_text("version: 1\nfacts:\n", encoding="utf-8")
        reviews = semantic / "reviews.jsonl"
        reviews.write_text("\n".join(json.dumps(item) for item in approvals) + "\n", encoding="utf-8")
        self.git(root, "add", "memory/semantic/promoted-facts.yaml", "memory/semantic/reviews.jsonl")
        self.git(root, "commit", "--no-verify", "-m", "fixture: approved parent")

        result = self.run_script("consolidate_memory.py", "--promote-ready", "--json", root=root)
        self.assertEqual(json.loads(result.stdout)["actions"]["promoted"], list(ids))
        receipt = next((semantic / "promotion-receipts").glob("*.json"))
        expected_reviews = reviews.read_bytes()

        # The transition commit carries the exact producer/schema blobs so a
        # future clone can audit history without this machine's Git-private key.
        (root / "memory" / "scripts").mkdir(parents=True)
        for name in ("consolidate_memory.py", "review_candidates.py"):
            shutil.copy2(SCRIPTS / name, root / "memory" / "scripts" / name)
        shutil.copy2(
            ROOT / "memory" / "semantic" / "promotion-receipt.schema.json",
            semantic / "promotion-receipt.schema.json",
        )
        self.git(
            root, "add",
            "memory/semantic/promoted-facts.yaml",
            str(receipt.relative_to(root)),
            "memory/scripts/consolidate_memory.py",
            "memory/scripts/review_candidates.py",
            "memory/semantic/promotion-receipt.schema.json",
        )
        return receipt, reviews, expected_reviews

    def run_guard(self, root, *args, env=None):
        merged = isolated_subprocess_env(env)
        return subprocess.run(
            [sys.executable, str(SCRIPTS / "promotion_provenance.py"), "--root", str(root), *args],
            cwd=ROOT, env=merged, text=True, capture_output=True,
        )

    def test_staged_guard_rejects_omitted_and_tampered_reviews_then_accepts_exact_chain(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            receipt, reviews, expected_reviews = self.prepare_transition(root)

            omitted = self.run_guard(root, "--staged")
            self.assertNotEqual(omitted.returncode, 0)
            self.assertIn("review source is omitted or differs", omitted.stderr)

            reviews.write_bytes(expected_reviews + b'{"tampered":true}\n')
            self.git(root, "add", "memory/semantic/reviews.jsonl")
            tampered = self.run_guard(root, "--staged")
            self.assertNotEqual(tampered.returncode, 0)
            self.assertIn("review source is omitted or differs", tampered.stderr)

            reviews.write_bytes(expected_reviews)
            self.git(root, "add", "memory/semantic/reviews.jsonl")
            fast = self.run_guard(root, "--staged", env={"FAST_COMMIT": "1"})
            self.assertNotEqual(fast.returncode, 0)
            self.assertIn("FAST_COMMIT", fast.stderr)
            accepted = self.run_guard(root, "--staged", "--consume")
            self.assertEqual(accepted.returncode, 0, accepted.stderr)
            payload = json.loads(accepted.stdout)
            self.assertEqual(payload["candidate_ids"], ["SC-Z-LAST", "SC-A-FIRST"])
            self.assertEqual(json.loads(receipt.read_text())["promotion_ready"]["candidate_ids"], payload["candidate_ids"])

    def test_committed_history_is_portable_to_fresh_clone(self):
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as clone_tmp:
            root = Path(tmp)
            _receipt, reviews, expected_reviews = self.prepare_transition(root)
            reviews.write_bytes(expected_reviews)
            self.git(root, "add", "memory/semantic/reviews.jsonl")
            accepted = self.run_guard(root, "--staged", "--consume")
            self.assertEqual(accepted.returncode, 0, accepted.stderr)
            self.git(root, "commit", "--no-verify", "-m", "fixture: authenticated promotion")
            local = self.run_guard(root, "--history")
            self.assertEqual(local.returncode, 0, local.stderr)
            self.assertEqual(len(json.loads(local.stdout)["transitions"]), 1)

            clone = Path(clone_tmp) / "fresh"
            subprocess.run(
                ["git", "clone", "--quiet", str(root), str(clone)],
                env=isolated_subprocess_env(),
                check=True,
            )
            fresh = self.run_guard(clone, "--history")
            self.assertEqual(fresh.returncode, 0, fresh.stderr)
            self.assertEqual(len(json.loads(fresh.stdout)["transitions"]), 1)

    def test_historical_added_date_is_receipt_data_not_current_clock(self):
        sys.path.insert(0, str(SCRIPTS))
        try:
            from promotion_provenance import _attest_receipt_transition
            candidate = self.candidate("SC-HISTORICAL")
            candidate["proposed_stable"] = True
            after = (
                "version: 1\nfacts:\n"
                "  - id: SC-HISTORICAL\n"
                "    domain: skill-rule\n"
                "    fact: \"authenticated fact SC-HISTORICAL\"\n"
                "    confidence: high\n"
                "    stable: true\n"
                "    added: 2020-01-02\n"
                "    source: \"ASSERT-019 fixture\"\n"
                "    evidence: \"ASSERT-019 fixture\"\n"
                "    reviewer: \"proposer\"\n"
                "    scope: \"memory\"\n"
            ).encode()
            _attest_receipt_transition(b"version: 1\nfacts:\n", after, [candidate], "2020-01-02")
        finally:
            sys.path.pop(0)

    def test_direct_valid_yaml_and_foreign_structural_receipt_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.git(root, "init", "-b", "main")
            self.git(root, "config", "user.email", "u011@example.invalid")
            self.git(root, "config", "user.name", "U011 Fixture")
            semantic = root / "memory" / "semantic"
            semantic.mkdir(parents=True)
            candidate = self.candidate("SC-DIRECT")
            candidate["proposed_stable"] = True
            candidate["fact"] = "direct but valid"
            (semantic / "candidates.jsonl").write_text(json.dumps(candidate) + "\n", encoding="utf-8")
            approval = {
                "candidate_id": candidate["id"],
                "decision": "approved_stable",
                "reviewer": "human-reviewer",
                "reviewed_at": "2026-08-11T00:00:00+00:00",
                "candidate_sha256": canonical_sha(candidate),
                "source": "consolidate_memory.py",
            }
            reviews = semantic / "reviews.jsonl"
            reviews.write_text(json.dumps(approval) + "\n", encoding="utf-8")
            schema = semantic / "promotion-receipt.schema.json"
            shutil.copy2(ROOT / "memory" / "semantic" / "promotion-receipt.schema.json", schema)
            stable = semantic / "promoted-facts.yaml"
            stable.write_text("version: 1\nfacts:\n", encoding="utf-8")
            before = stable.read_bytes()
            self.git(
                root, "add", "memory/semantic/promoted-facts.yaml",
                "memory/semantic/reviews.jsonl",
            )
            self.git(root, "commit", "--no-verify", "-m", "fixture: baseline")
            self.git(root, "add", "memory/semantic/promotion-receipt.schema.json")
            self.git(root, "commit", "--no-verify", "-m", "fixture: activate provenance")
            stable.write_text(
                "version: 1\nfacts:\n"
                "  - id: SC-DIRECT\n    domain: skill-rule\n    fact: \"direct but valid\"\n"
                "    confidence: high\n    stable: true\n    added: 2026-08-11\n"
                "    source: \"ASSERT-019 fixture\"\n    evidence: \"ASSERT-019 fixture\"\n"
                "    reviewer: \"proposer\"\n    scope: \"memory\"\n",
                encoding="utf-8",
            )
            self.git(root, "add", "memory/semantic/promoted-facts.yaml")
            direct = self.run_guard(root, "--staged")
            self.assertNotEqual(direct.returncode, 0)
            self.assertIn("exactly one staged receipt; found 0", direct.stderr)
            health_env = isolated_subprocess_env({"MEMORY_ROOT": str(root)})
            health = subprocess.run(
                [sys.executable, str(SCRIPTS / "check_memory_health.py")],
                cwd=ROOT, env=health_env, text=True, capture_output=True,
            )
            self.assertNotEqual(health.returncode, 0)
            self.assertIn("stable-memory provenance", health.stdout)

            receipts = semantic / "promotion-receipts"
            receipts.mkdir()
            receipt_id = "f" * 48
            fake = receipts / f"{receipt_id}.json"
            after = stable.read_bytes()
            head = self.git(root, "rev-parse", "HEAD").stdout.strip()
            repo_id = canonical_sha(
                {"kind": "git-worktree", "root": str(root.resolve()), "git_dir": str((root / ".git").resolve())}
            )
            def oid(data):
                return subprocess.run(
                    ["git", "-C", str(root), "hash-object", "--stdin"],
                    input=data,
                    env=isolated_subprocess_env(),
                    capture_output=True,
                    check=True,
                ).stdout.decode().strip()
            writer_raw = (SCRIPTS / "consolidate_memory.py").read_bytes()
            source_files = {
                "candidates_path": "memory/semantic/candidates.jsonl",
                "candidates_sha256": hashlib.sha256((semantic / "candidates.jsonl").read_bytes()).hexdigest(),
                "reviews_path": "memory/semantic/reviews.jsonl",
                "reviews_sha256": hashlib.sha256(reviews.read_bytes()).hexdigest(),
                "parent_reviews_sha256": hashlib.sha256(reviews.read_bytes()).hexdigest(),
                "schema_path": "memory/semantic/promotion-receipt.schema.json",
                "schema_sha256": hashlib.sha256(schema.read_bytes()).hexdigest(),
            }
            forged_receipt = {
                "schema": "luca.memory-promotion-receipt.v1",
                "receipt_id": receipt_id,
                "issued_at": "2026-08-11T00:00:00+00:00",
                "repository": {"kind": "git-worktree", "id": repo_id, "root": str(root.resolve()), "head": head},
                "transition": {
                    "path": "memory/semantic/promoted-facts.yaml",
                    "before": {"git_oid": oid(before), "sha256": hashlib.sha256(before).hexdigest()},
                    "after": {"git_oid": oid(after), "sha256": hashlib.sha256(after).hexdigest()},
                },
                "candidates": [candidate],
                "approved_reviews": [approval],
                "promotion_ready": {
                    "candidate_ids": [candidate["id"]], "added_date": "2026-08-11",
                    "criteria": ["candidate_exists", "approved_stable_review", "not_duplicate", "not_conflicting"],
                },
                "source_files": source_files,
                "producer": {
                    "writer": {"path": "memory/scripts/consolidate_memory.py", "sha256": hashlib.sha256(writer_raw).hexdigest()},
                    "entrypoint": {"path": "memory/scripts/consolidate_memory.py", "sha256": hashlib.sha256(writer_raw).hexdigest()},
                },
                "nonce": "e" * 48,
                "signature": {"algorithm": "hmac-sha256", "key_id": "a" * 24, "mac": "b" * 64},
            }
            fake.write_text(json.dumps(forged_receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            self.git(root, "add", str(fake.relative_to(root)))
            forged = self.run_guard(root, "--staged")
            self.assertNotEqual(forged.returncode, 0)
            self.assertIn("promotion authority key is absent", forged.stderr)

    def test_sync_is_read_only_and_rejects_write_or_remote_inputs(self):
        script = (ROOT / "scripts" / "sync.sh").read_text(encoding="utf-8")
        for forbidden in ("git pull", "git push", "git add", "git commit", "git stash"):
            self.assertNotIn(forbidden, script)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.git(root, "init", "-b", "main")
            self.git(root, "config", "user.email", "u011@example.invalid")
            self.git(root, "config", "user.name", "U011 Fixture")
            (root / "scripts").mkdir()
            shutil.copy2(ROOT / "scripts" / "sync.sh", root / "scripts" / "sync.sh")
            (root / "memory" / "scripts").mkdir(parents=True)
            for name in ("promotion_provenance.py", "check_memory_health.py"):
                shutil.copy2(SCRIPTS / name, root / "memory" / "scripts" / name)
            semantic = root / "memory" / "semantic"
            semantic.mkdir(parents=True)
            (semantic / "promoted-facts.yaml").write_text("version: 1\nfacts: []\n", encoding="utf-8")
            self.git(
                root, "add", "scripts/sync.sh", "memory/scripts/promotion_provenance.py",
                "memory/scripts/check_memory_health.py", "memory/semantic/promoted-facts.yaml",
            )
            self.git(root, "commit", "--no-verify", "-m", "fixture: sync")
            before = self.git(root, "status", "--porcelain=v1").stdout
            ok = subprocess.run(
                ["bash", "scripts/sync.sh"], cwd=root,
                env=isolated_subprocess_env(), text=True, capture_output=True,
            )
            self.assertEqual(ok.returncode, 0, ok.stderr)
            self.assertIn("MEMORY_SYNC_INSPECTION_PASS", ok.stdout)
            self.assertEqual(self.git(root, "status", "--porcelain=v1").stdout, before)
            wrong = subprocess.run(
                ["bash", "scripts/sync.sh", "wrong-remote"], cwd=root,
                env=isolated_subprocess_env(), text=True, capture_output=True,
            )
            self.assertEqual(wrong.returncode, 2)
            fast_env = isolated_subprocess_env({"FAST_COMMIT": "1"})
            fast = subprocess.run(["bash", "scripts/sync.sh"], cwd=root, env=fast_env, text=True, capture_output=True)
            self.assertEqual(fast.returncode, 2)
            remote_env = isolated_subprocess_env({"SYNC_REMOTE": "not-origin"})
            remote = subprocess.run(["bash", "scripts/sync.sh"], cwd=root, env=remote_env, text=True, capture_output=True)
            self.assertEqual(remote.returncode, 2)

    def test_precommit_consumer_blocks_direct_stable_write_before_fast_commit_branch(self):
        hook_source = (ROOT / ".githooks" / "pre-commit").read_text(encoding="utf-8")
        guard_pos = hook_source.index("promotion_provenance.py --staged --consume")
        fast_pos = hook_source.index('if [ "${FAST_COMMIT:-0}" = "1" ]')
        self.assertLess(guard_pos, fast_pos)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.git(root, "init", "-b", "main")
            self.git(root, "config", "user.email", "u011@example.invalid")
            self.git(root, "config", "user.name", "U011 Fixture")
            (root / ".githooks").mkdir()
            shutil.copy2(ROOT / ".githooks" / "pre-commit", root / ".githooks" / "pre-commit")
            closeout_stub = root / ".githooks" / "pre-commit-git-closeout"
            closeout_stub.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
            closeout_stub.chmod(0o755)
            (root / "memory" / "scripts").mkdir(parents=True)
            shutil.copy2(SCRIPTS / "promotion_provenance.py", root / "memory" / "scripts" / "promotion_provenance.py")
            semantic = root / "memory" / "semantic"
            semantic.mkdir(parents=True)
            stable = semantic / "promoted-facts.yaml"
            stable.write_text("version: 1\nfacts: []\n", encoding="utf-8")
            stub = root / "scripts" / "evolution" / "verify-obligation-runtime.mjs"
            stub.parent.mkdir(parents=True)
            stub.write_text("console.log('OBLIGATION_STUB_PASS');\n", encoding="utf-8")
            self.git(root, "add", "memory/semantic/promoted-facts.yaml")
            self.git(root, "commit", "--no-verify", "-m", "fixture: baseline")
            stable.write_text(
                "version: 1\nfacts:\n"
                "  - id: SC-HOOK-DIRECT\n    domain: skill-rule\n    fact: direct valid yaml\n"
                "    confidence: high\n    stable: true\n    added: 2026-08-11\n    source: fixture\n",
                encoding="utf-8",
            )
            self.git(root, "add", "memory/semantic/promoted-facts.yaml")
            for fast in ("0", "1"):
                env = isolated_subprocess_env({"FAST_COMMIT": fast})
                result = subprocess.run(
                    ["bash", ".githooks/pre-commit"], cwd=root, env=env,
                    text=True, capture_output=True,
                )
                self.assertNotEqual(result.returncode, 0, f"FAST_COMMIT={fast} unexpectedly passed")
                expected = "exactly one staged receipt; found 0" if fast == "0" else "FAST_COMMIT cannot authorize"
                self.assertIn(expected, result.stderr)
                self.assertIn("OBLIGATION_STUB_PASS", result.stdout)


if __name__ == "__main__":
    unittest.main()
