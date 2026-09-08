"""One-time, exact-evidence re-proposal. Defaults to a read-only plan; never edits promoted facts."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

CODE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CODE / "memory/scripts"))
import consolidate_memory as cm

EVENT = "memory-collision-reproposal-20260908"
SOURCE = CODE / "memory/semantic/candidates.jsonl"
ARCHIVE = CODE / f"memory/semantic/archive/candidates-{EVENT}.jsonl"
RECEIPT = CODE / f"framework-audit/{EVENT}.json"
IDS = {"SC-20260820-001", "SC-20260820-002"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def destination():
    return {"memory_root": str(cm.ROOT), "candidates": str(cm.CANDIDATES),
            "known_roots": [str(root) for root in cm.semantic_known_roots()],
            "lock": str(cm.semantic_id_lock_path())}


def snapshot():
    data = SOURCE.read_bytes()
    rows = []
    for line in data.splitlines(keepends=True):
        value = json.loads(line)
        if value.get("id") in IDS:
            rows.append({"old_id": value["id"], "line": line.decode(), "line_sha256": sha(line),
                         "record": value})
    if {row["old_id"] for row in rows} != IDS or len(rows) != 2:
        raise RuntimeError("exact two source candidate rows required")
    collisions = cm.candidate_id_collisions()
    if {row["id"] for row in collisions} != IDS:
        raise RuntimeError("unexpected collision inventory; re-review required")
    return {"event": EVENT, "source": str(SOURCE), "destination": destination(), "source_sha256": sha(data), "rows": rows,
            "namespace_owners": collisions,
            "policy": "authoritative store keeps current identities; fork evidence archived and re-proposed, not approved",
            "promoted_sha256": {str(root / "memory/semantic/promoted-facts.yaml"):
                sha((root / "memory/semantic/promoted-facts.yaml").read_bytes()) for root in cm.semantic_known_roots()}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply-plan", type=Path)
    args = parser.parse_args()
    if not args.apply_plan:
        print(json.dumps(snapshot(), ensure_ascii=False, indent=2))
        return
    plan = json.loads(args.apply_plan.read_text())
    if plan.get("event") != EVENT or plan.get("source") != str(SOURCE):
        raise RuntimeError("wrong migration plan")
    if plan.get("destination") != destination():
        raise RuntimeError("store, known roots or lock changed; re-review required")
    with cm.semantic_id_lock():
        data = SOURCE.read_bytes()
        old_lines = [row["line"].encode() for row in plan["rows"]]
        if len(old_lines) != 2 or {row["old_id"] for row in plan["rows"]} != IDS:
            raise RuntimeError("unexpected source identity set")
        for row, line in zip(plan["rows"], old_lines):
            if sha(line) != row["line_sha256"] or json.loads(line) != row["record"]:
                raise RuntimeError("source evidence plan changed")
        archived = b"".join(old_lines)
        if ARCHIVE.exists() and ARCHIVE.read_bytes() != archived:
            raise RuntimeError("archive evidence differs")
        present = [line in data.splitlines(keepends=True) for line in old_lines]
        if any(present):
            if not all(present) or sha(data) != plan["source_sha256"]:
                raise RuntimeError("source changed since plan; no writes")
            if snapshot() != plan:
                raise RuntimeError("namespace or promoted evidence changed since plan")
            # Write immutable evidence and intent before removing exact source bytes.
            cm.atomic_write_text(ARCHIVE, archived.decode())
            cm.atomic_write_text(RECEIPT, json.dumps({**plan, "stage": "ARCHIVE_DURABLE"}, ensure_ascii=False, indent=2))
            remaining = b"".join(line for line in data.splitlines(keepends=True) if line not in old_lines)
            cm.atomic_write_text(SOURCE, remaining.decode())
        elif not ARCHIVE.exists() or not RECEIPT.exists():
            raise RuntimeError("source missing without durable migration evidence")
        for path, digest in plan["promoted_sha256"].items():
            if sha(Path(path).read_bytes()) != digest:
                raise RuntimeError("promoted evidence changed; do not re-propose")
        if cm.candidate_id_collisions():
            raise RuntimeError("namespace still collided; no re-proposal")

    # Do not recurse into the same file lock via a subprocess. Source keys make retries idempotent.
    mappings = []
    for row in plan["rows"]:
        record = row["record"]
        source_key = f"{EVENT}:{row['line_sha256']}:{ARCHIVE}"
        existing = [item for item in cm.read_jsonl(cm.CANDIDATES)
                    if item.get("source") == source_key]
        if existing:
            if (len(existing) != 1 or existing[0].get("fact") != record["fact"]
                    or existing[0].get("domain") != record["domain"]
                    or existing[0].get("status") != "CANDIDATE"
                    or existing[0].get("proposed_stable") is not False
                    or existing[0].get("supersedes")):
                raise RuntimeError("ambiguous prior re-proposal")
            new_id = existing[0]["id"]
        else:
            out = subprocess.run([sys.executable, str(CODE / "memory/scripts/propose_semantic.py"),
                "--domain", record["domain"], "--fact", record["fact"], "--source", source_key,
                "--confidence", record.get("confidence", "medium"),
                "--evidence", record.get("evidence", "") or source_key,
                "--scope", record.get("scope", "framework/meta"),
                "--reviewer", record.get("reviewer", ""),
                "--tags", ",".join(record.get("tags", [])),
                *(["--stable"] if record.get("stable_requested") else [])],
                env=os.environ.copy(), capture_output=True, text=True)
            if out.returncode:
                raise RuntimeError(f"re-proposal failed; archived evidence retained: {out.stderr}")
            new_id = json.loads(out.stdout)["candidate"]
        mappings.append({"old_id": row["old_id"], "old_line_sha256": row["line_sha256"],
                         "new_candidate": new_id, "source": source_key})
    for path, digest in plan["promoted_sha256"].items():
        if sha(Path(path).read_bytes()) != digest:
            raise RuntimeError("promoted evidence changed during re-proposal")
    cm.atomic_write_text(RECEIPT, json.dumps({**plan, "stage": "REPROPOSED_PENDING_REVIEW",
                                           "mappings": mappings}, ensure_ascii=False, indent=2))
    print(json.dumps({"receipt": str(RECEIPT), "mappings": mappings}, ensure_ascii=False))


if __name__ == "__main__":
    main()
