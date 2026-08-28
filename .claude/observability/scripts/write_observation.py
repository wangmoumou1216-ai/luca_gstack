#!/usr/bin/env python3
"""Crash-consistently record one observability event and its optional active rule."""

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import uuid
from contextlib import contextmanager
from pathlib import Path

try:
    import fcntl
except ImportError:  # pragma: no cover - repository runtime is POSIX
    fcntl = None


ROOT = Path(__file__).resolve().parents[2]
STORE = ROOT / "observability"
OBS = STORE / "observations.jsonl"
RULES = STORE / "rules.yaml"
LOCK = STORE / ".write.lock"
JOURNAL = STORE / ".write-transaction.json"


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fsync_dir(path: Path) -> None:
    try:
        fd = os.open(str(path), os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


@contextmanager
def store_lock():
    """Serialize recovery, ID allocation, and the complete two-file commit."""
    if fcntl is None:
        raise RuntimeError("observability writer requires POSIX flock; refusing an unsafe unlocked write")
    STORE.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(LOCK), os.O_CREAT | os.O_RDWR, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def cleanup_orphan_temps() -> None:
    for path in STORE.glob(".txn-*.tmp"):
        try:
            path.unlink()
        except OSError:
            pass


def recover_transaction() -> None:
    """Finish a journaled commit or fail loudly if its staged data is unavailable."""
    if not JOURNAL.exists():
        cleanup_orphan_temps()
        return
    try:
        journal = json.loads(JOURNAL.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"cannot recover observability transaction journal: {error}") from error
    if journal.get("version") != 1 or not isinstance(journal.get("files"), list):
        raise RuntimeError("unsupported observability transaction journal")

    allowed = {OBS.name, RULES.name}
    seen = set()
    for entry in journal["files"]:
        name = entry.get("path")
        temp_name = entry.get("temp")
        expected = entry.get("sha256")
        if (
            name not in allowed
            or name in seen
            or not isinstance(temp_name, str)
            or not temp_name.startswith(".txn-")
            or "/" in temp_name
            or not isinstance(expected, str)
        ):
            raise RuntimeError("invalid observability transaction journal entry")
        seen.add(name)
        destination = STORE / name
        staged = STORE / temp_name
        if destination.exists() and file_hash(destination) == expected:
            if staged.exists():
                staged.unlink()
            continue
        if not staged.exists() or file_hash(staged) != expected:
            raise RuntimeError(f"cannot recover {name}: staged content missing or corrupt")
        os.replace(staged, destination)
        fsync_dir(STORE)

    JOURNAL.unlink()
    fsync_dir(STORE)
    cleanup_orphan_temps()


def stage_text(path: Path, text: str, transaction_id: str) -> tuple[Path, str]:
    staged = STORE / f".txn-{transaction_id}-{path.name}.tmp"
    with staged.open("x", encoding="utf-8") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
    return staged, file_hash(staged)


def publish_journal(transaction_id: str, entries: list[dict]) -> None:
    staged = STORE / f".txn-{transaction_id}-journal.tmp"
    payload = json.dumps({"version": 1, "transaction_id": transaction_id, "files": entries}, ensure_ascii=False)
    with staged.open("x", encoding="utf-8") as handle:
        handle.write(payload + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(staged, JOURNAL)
    fsync_dir(STORE)


def commit_texts(texts: list[tuple[Path, str]]) -> None:
    transaction_id = uuid.uuid4().hex
    entries = []
    journal_published = False
    try:
        for path, text in texts:
            staged, digest = stage_text(path, text, transaction_id)
            entries.append({"path": path.name, "temp": staged.name, "sha256": digest})
        publish_journal(transaction_id, entries)
        journal_published = True
        for entry in entries:
            os.replace(STORE / entry["temp"], STORE / entry["path"])
            fsync_dir(STORE)
            if (
                entry["path"] == OBS.name
                and os.environ.get("LUCA_OBSERVABILITY_FAILPOINT") == "after_observations_replace"
            ):
                os._exit(86)
        JOURNAL.unlink()
        fsync_dir(STORE)
    except BaseException:
        if not journal_published:
            cleanup_orphan_temps()
        raise


def next_id(prefix: str, text: str) -> str:
    today = dt.datetime.now().strftime("%Y%m%d")
    sequences = [int(value) for value in re.findall(rf"\b{prefix}-{today}-(\d+)\b", text)]
    return f"{prefix}-{today}-{(max(sequences, default=0) + 1):03d}"


def yaml_quote(text: str) -> str:
    return json.dumps(text, ensure_ascii=False)


def validate_observations(text: str) -> None:
    for number, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise RuntimeError(f"observations.jsonl line {number} is invalid JSON") from error
        if not isinstance(value, dict) or not isinstance(value.get("id"), str):
            raise RuntimeError(f"observations.jsonl line {number} has no record id")


def append_rule_text(args, observation_id: str, current: str) -> tuple[str, str | None]:
    if not args.rule:
        return current, None
    rule_id = next_id("R", current)
    text = current
    if not text.strip():
        text = "version: 1\nrules:\n"
    if "rules: []" in text:
        text = text.replace("rules: []", "rules:")
    skills = ", ".join(yaml_quote(skill) for skill in (args.applies_to or [args.skill]))
    scenes = ", ".join(yaml_quote(scene) for scene in (args.scenes or ["*"]))
    block = [
        f"- id: {rule_id}",
        "  status: active",
        f"  severity: {args.severity}",
        f"  type: {args.rule_type}",
        "  scope:",
        f"    skills: [{skills}]",
        f"    scenes: [{scenes}]",
        f"  rule: {yaml_quote(args.rule)}",
        "  source_observations:",
        f"    - {observation_id}",
        "",
    ]
    if not text.endswith("\n"):
        text += "\n"
    return text + "\n".join(block), rule_id


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skill", required=True)
    parser.add_argument("--message", required=True, help="Raw user feedback or issue statement.")
    parser.add_argument("--problem", default="")
    parser.add_argument("--correction", default="")
    parser.add_argument("--severity", default="medium", choices=["low", "medium", "high", "critical"])
    parser.add_argument("--rule", default="", help="Actionable distilled rule. If present, appends to rules.yaml.")
    parser.add_argument("--rule-type", default="quality_rule")
    parser.add_argument("--applies-to", nargs="*", default=[])
    parser.add_argument("--scenes", nargs="*", default=[])
    parser.add_argument("--source", default="user_feedback")
    return parser.parse_args()


def main():
    args = parse_args()
    with store_lock():
        recover_transaction()
        observations_text = OBS.read_text(encoding="utf-8") if OBS.exists() else ""
        rules_text = RULES.read_text(encoding="utf-8") if RULES.exists() else ""
        validate_observations(observations_text)

        observation_id = next_id("O", observations_text)
        record = {
            "id": observation_id,
            "time": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
            "skill": args.skill,
            "source": args.source,
            "severity": args.severity,
            "message": args.message,
            "problem": args.problem,
            "correction": args.correction,
        }
        if observations_text and not observations_text.endswith("\n"):
            observations_text += "\n"
        observations_text += json.dumps(record, ensure_ascii=False) + "\n"
        rules_text, rule_id = append_rule_text(args, observation_id, rules_text)

        writes = [(OBS, observations_text)]
        if args.rule:
            writes.append((RULES, rules_text))
        commit_texts(writes)

    print(json.dumps({"observation": observation_id, "rule": rule_id}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - CLI must fail loudly without a partial new write
        print(f"[write_observation] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
