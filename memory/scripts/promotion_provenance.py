#!/usr/bin/env python3
"""Issue and verify authenticated provenance for stable semantic-memory changes.

The durable receipt is deliberately not its own trust root.  A per-worktree key and
single-transition authority record live below Git's private directory (or below a
detached MEMORY_ROOT only for non-repository fixtures).  Commit and health guards
therefore reject JSON that is merely structurally plausible.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import inspect
import json
import os
import re
import secrets
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


SCHEMA = "luca.memory-promotion-receipt.v1"
AUTH_SCHEMA = "luca.memory-promotion-authority.v1"
STABLE_REL = "memory/semantic/promoted-facts.yaml"
RECEIPTS_REL = "memory/semantic/promotion-receipts"
TOOL_REL = "memory/scripts/consolidate_memory.py"
NEGATIVE_MARKERS = ("不得", "不能", "禁止", "不应", "must not", "cannot", "can't", "not", "never")
POSITIVE_MARKERS = ("必须", "应当", "需要", "must", "should", "required")


class ProvenanceError(RuntimeError):
    """A promotion transition is absent, forged, stale, or ambiguous."""


def _canonical(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _atomic_write(path: Path, data: bytes, mode: int = 0o600) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _write_exclusive(path: Path, data: bytes, mode: int = 0o600) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    except BaseException:
        try:
            path.unlink()
        except OSError:
            pass
        raise


def _git(root: Path, *args: str, input_bytes: bytes | None = None, check: bool = True) -> subprocess.CompletedProcess:
    result = subprocess.run(
        ["git", "-C", str(root), *args], input=input_bytes, capture_output=True, check=False
    )
    if check and result.returncode != 0:
        message = result.stderr.decode("utf-8", errors="replace").strip()
        raise ProvenanceError(f"git {' '.join(args)} failed: {message}")
    return result


def _repo_context(root: Path) -> dict[str, str]:
    root = root.resolve()
    top = _git(root, "rev-parse", "--show-toplevel", check=False)
    if top.returncode != 0:
        authority = root / ".luca" / "promotion-authority"
        return {
            "kind": "detached-memory-root",
            "root": str(root),
            "git_dir": "",
            "head": "NO_GIT",
            "authority_dir": str(authority),
        }
    repo_root = Path(top.stdout.decode().strip()).resolve()
    if repo_root != root:
        raise ProvenanceError(f"MEMORY_ROOT must equal git toplevel: root={root} git={repo_root}")
    git_dir_raw = _git(root, "rev-parse", "--git-dir").stdout.decode().strip()
    git_dir = Path(git_dir_raw)
    if not git_dir.is_absolute():
        git_dir = (root / git_dir).resolve()
    head = _git(root, "rev-parse", "HEAD").stdout.decode().strip()
    return {
        "kind": "git-worktree",
        "root": str(root),
        "git_dir": str(git_dir),
        "head": head,
        "authority_dir": str(git_dir / "luca-memory-promotion"),
    }


def _repo_id(ctx: dict[str, str]) -> str:
    material = {"kind": ctx["kind"], "root": ctx["root"], "git_dir": ctx["git_dir"]}
    return _sha256(_canonical(material))


def _authority_key(ctx: dict[str, str], *, create: bool) -> bytes:
    path = Path(ctx["authority_dir"]) / "authority.key"
    if path.exists():
        key = path.read_bytes()
        if len(key) != 32:
            raise ProvenanceError("promotion authority key has invalid length")
        return key
    if not create:
        raise ProvenanceError("promotion authority key is absent")
    key = secrets.token_bytes(32)
    try:
        _write_exclusive(path, key)
        return key
    except FileExistsError:
        key = path.read_bytes()
        if len(key) != 32:
            raise ProvenanceError("promotion authority key race produced invalid key")
        return key


def _blob(root: Path, data: bytes, ctx: dict[str, str]) -> dict[str, str]:
    if ctx["kind"] == "git-worktree":
        oid = _git(root, "hash-object", "--stdin", input_bytes=data).stdout.decode().strip()
    else:
        oid = f"sha256:{_sha256(data)}"
    return {"git_oid": oid, "sha256": _sha256(data)}


def _source_path(root: Path, rel: str) -> Path:
    path = root / rel
    if path.is_file():
        return path
    # Tests execute repository scripts against a detached MEMORY_ROOT.
    fallback = Path(__file__).resolve().parents[2] / rel
    if fallback.is_file():
        return fallback
    raise ProvenanceError(f"required producer source is missing: {rel}")


def _producer_attestation(root: Path) -> dict[str, dict[str, str]]:
    writer = _source_path(root, TOOL_REL)
    argv0 = Path(sys.argv[0]).resolve()
    allowed = {
        _source_path(root, TOOL_REL).resolve(): TOOL_REL,
        _source_path(root, "memory/scripts/review_candidates.py").resolve(): "memory/scripts/review_candidates.py",
    }
    if argv0 not in allowed:
        raise ProvenanceError(f"unauthorized promotion producer entrypoint: {argv0}")
    caller = inspect.currentframe().f_back
    # Walk past issue_receipt itself; the immediate external frame must be the
    # central writer, not an importing helper that fabricated source objects.
    caller = caller.f_back if caller is not None else None
    if caller is None or caller.f_code.co_name != "promote_ready_candidates":
        raise ProvenanceError("promotion issuer must be called by promote_ready_candidates")
    if Path(caller.f_code.co_filename).resolve() != writer.resolve():
        raise ProvenanceError("promotion issuer caller source is not the central writer")
    return {
        "writer": {"path": TOOL_REL, "sha256": _sha256(writer.read_bytes())},
        "entrypoint": {"path": allowed[argv0], "sha256": _sha256(argv0.read_bytes())},
    }


def _verify_producer(root: Path, producer: Any) -> None:
    _verify_producer_with_loader(root, producer, lambda rel: _source_path(root, rel).read_bytes())


def _verify_producer_with_loader(root: Path, producer: Any, loader) -> None:
    if not isinstance(producer, dict) or set(producer) != {"writer", "entrypoint"}:
        raise ProvenanceError("receipt producer attestation shape mismatch")
    allowed = {TOOL_REL, "memory/scripts/review_candidates.py"}
    for role in ("writer", "entrypoint"):
        item = producer.get(role)
        if not isinstance(item, dict) or set(item) != {"path", "sha256"}:
            raise ProvenanceError(f"receipt producer {role} shape mismatch")
        rel = str(item.get("path", ""))
        if role == "writer" and rel != TOOL_REL:
            raise ProvenanceError("receipt writer path mismatch")
        if role == "entrypoint" and rel not in allowed:
            raise ProvenanceError("receipt entrypoint is not allowed")
        if _sha256(loader(rel)) != item.get("sha256"):
            raise ProvenanceError(f"receipt producer {role} digest mismatch")


def _read_jsonl_strict(path: Path) -> tuple[list[dict], bytes]:
    raw = path.read_bytes() if path.exists() else b""
    rows = []
    for number, line in enumerate(raw.decode("utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ProvenanceError(f"{path}: malformed JSONL line {number}: {exc}") from exc
        if not isinstance(value, dict):
            raise ProvenanceError(f"{path}: non-object JSONL line {number}")
        rows.append(value)
    return rows, raw


def _jsonl_bytes_strict(raw: bytes, label: str) -> list[dict]:
    rows = []
    for number, line in enumerate(raw.decode("utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ProvenanceError(f"{label}: malformed JSONL line {number}: {exc}") from exc
        if not isinstance(value, dict):
            raise ProvenanceError(f"{label}: non-object JSONL line {number}")
        rows.append(value)
    return rows


def _normalize(value: Any) -> Any:
    if hasattr(value, "isoformat") and not isinstance(value, (str, bytes)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _normalize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    return value


def _parse_stable(data: bytes, label: str) -> list[dict]:
    if not data:
        return []
    try:
        parsed = yaml.safe_load(data.decode("utf-8")) or {}
    except Exception as exc:
        raise ProvenanceError(f"{label} stable store is invalid YAML: {exc}") from exc
    facts = (parsed.get("facts") or []) if isinstance(parsed, dict) else []
    if not isinstance(facts, list) or any(not isinstance(item, dict) for item in facts):
        raise ProvenanceError(f"{label} stable store facts must be object array")
    return [_normalize(item) for item in facts]


def _expected_fact(candidate: dict, added_date: str) -> dict:
    fact = {
        "id": candidate.get("id", ""),
        "domain": candidate.get("domain", ""),
        "fact": str(candidate.get("fact", "")),
        "confidence": candidate.get("confidence", "high"),
        "stable": True,
        "added": added_date,
        "source": str(candidate.get("source") or candidate.get("evidence") or "consolidate_memory"),
    }
    for key in ("evidence", "reviewer", "valid_until", "supersedes"):
        value = candidate.get(key)
        if str(value or "").strip():
            fact[key] = str(value)
    if str(candidate.get("scope", "")).strip():
        fact["scope"] = str(candidate.get("scope"))
    if candidate.get("tags"):
        tags = candidate.get("tags")
        fact["tags"] = [item.strip() for item in tags.split(",") if item.strip()] if isinstance(tags, str) else tags
    return _normalize(fact)


def _normalize_fact(text: str) -> str:
    return "".join(re.findall(r"[\w#]+", str(text).lower()))


def _polarity(text: str) -> str:
    lowered = str(text).lower()
    if any(marker in lowered for marker in NEGATIVE_MARKERS):
        return "negative"
    if any(marker in lowered for marker in POSITIVE_MARKERS):
        return "positive"
    return "neutral"


def _polarity_core(text: str) -> str:
    lowered = str(text).lower()
    for marker in sorted(NEGATIVE_MARKERS + POSITIVE_MARKERS, key=len, reverse=True):
        lowered = lowered.replace(marker, " ")
    return _normalize_fact(lowered)


def _similar(left: str, right: str) -> bool:
    return bool(left and right) and (
        left == right or (len(left) >= 12 and len(right) >= 12 and (left in right or right in left))
    )


def _assert_governance_ready(before_facts: list[dict], candidates: list[dict]) -> None:
    rows = [(item, False) for item in before_facts] + [(item, True) for item in candidates]
    before_ids = {str(item.get("id", "")) for item in before_facts}
    candidate_ids = [str(item.get("id", "")) for item in candidates]
    reused = sorted(before_ids & set(candidate_ids))
    if reused:
        raise ProvenanceError(f"promotion reuses stable ids: {', '.join(reused)}")
    for index, (left, left_is_candidate) in enumerate(rows):
        for right, right_is_candidate in rows[index + 1:]:
            if not (left_is_candidate or right_is_candidate):
                continue
            if str(left.get("domain", "")) != str(right.get("domain", "")):
                continue
            left_norm = _normalize_fact(left.get("fact", ""))
            right_norm = _normalize_fact(right.get("fact", ""))
            if _similar(left_norm, right_norm):
                raise ProvenanceError("promotion contains duplicate/containing stable fact")
            left_polarity, right_polarity = _polarity(left.get("fact", "")), _polarity(right.get("fact", ""))
            if (
                left_polarity != "neutral"
                and right_polarity != "neutral"
                and left_polarity != right_polarity
                and _similar(_polarity_core(left.get("fact", "")), _polarity_core(right.get("fact", "")))
            ):
                raise ProvenanceError("promotion conflicts with stable fact polarity")


def _attest_real_sources_and_transition(
    root: Path,
    before: bytes,
    after: bytes,
    candidates: list[dict],
    approvals: list[dict],
) -> tuple[dict[str, str], str]:
    candidate_path = root / "memory/semantic/candidates.jsonl"
    review_path = root / "memory/semantic/reviews.jsonl"
    candidate_rows, candidate_raw = _read_jsonl_strict(candidate_path)
    review_rows, review_raw = _read_jsonl_strict(review_path)
    requested_ids = [str(item.get("id", "")) for item in candidates]
    real_by_id = {str(item.get("id", "")): item for item in candidate_rows}
    if any(cid not in real_by_id for cid in requested_ids):
        raise ProvenanceError("issuer candidate snapshot is absent from real candidates.jsonl")
    if any(_canonical(real_by_id[cid]) != _canonical(candidate) for cid, candidate in zip(requested_ids, candidates)):
        raise ProvenanceError("issuer candidate snapshot differs from real candidates.jsonl")
    latest_approval = {}
    for review in review_rows:
        if str(review.get("decision", "")).lower() == "approved_stable":
            latest_approval[str(review.get("candidate_id", ""))] = review
    supplied = {str(item.get("candidate_id", "")): item for item in approvals}
    for cid in requested_ids:
        if cid not in latest_approval or cid not in supplied:
            raise ProvenanceError(f"{cid}: no real approved_stable review")
        if _canonical(latest_approval[cid]) != _canonical(supplied[cid]):
            raise ProvenanceError(f"{cid}: supplied approval is not latest real approval")

    ctx = _repo_context(root)
    if ctx["kind"] == "git-worktree":
        parent_review_result = _git(root, "show", "HEAD:memory/semantic/reviews.jsonl", check=False)
        parent_review_raw = parent_review_result.stdout if parent_review_result.returncode == 0 else b""
        parent_reviews = _jsonl_bytes_strict(parent_review_raw, "HEAD reviews.jsonl")
        for approval in approvals:
            if not any(_canonical(row) == _canonical(approval) for row in parent_reviews):
                raise ProvenanceError(
                    f"{approval.get('candidate_id', '?')}: approved_stable review must be committed before promotion"
                )
    else:
        parent_review_raw = review_raw

    before_facts = _parse_stable(before, "before")
    after_facts = _parse_stable(after, "after")
    _assert_governance_ready(before_facts, candidates)
    if after_facts[:len(before_facts)] != before_facts:
        raise ProvenanceError("promotion modified or deleted an existing stable fact")
    appended = after_facts[len(before_facts):]
    if len(appended) != len(requested_ids):
        raise ProvenanceError("stable diff append count differs from candidate set")
    added_dates = {str(item.get("added", "")) for item in appended}
    if len(added_dates) != 1:
        raise ProvenanceError("promotion append set must freeze one added date")
    added_date = next(iter(added_dates))
    try:
        datetime.strptime(added_date, "%Y-%m-%d")
    except ValueError as exc:
        raise ProvenanceError("promotion added date is not YYYY-MM-DD") from exc
    expected = [_expected_fact(real_by_id[cid], added_date) for cid in requested_ids]
    if appended != expected:
        raise ProvenanceError("stable diff is not the exact candidate append set")
    return ({
        "candidates_path": "memory/semantic/candidates.jsonl",
        "candidates_sha256": _sha256(candidate_raw),
        "reviews_path": "memory/semantic/reviews.jsonl",
        "reviews_sha256": _sha256(review_raw),
        "parent_reviews_sha256": _sha256(parent_review_raw),
        "schema_path": "memory/semantic/promotion-receipt.schema.json",
        "schema_sha256": _sha256(_source_path(root, "memory/semantic/promotion-receipt.schema.json").read_bytes()),
    }, added_date)


def _validate_sources(candidates: list[dict], approvals: list[dict]) -> None:
    if not candidates:
        raise ProvenanceError("promotion receipt requires at least one candidate")
    candidate_ids = []
    for candidate in candidates:
        cid = str(candidate.get("id", "")).strip()
        if not cid or cid in candidate_ids:
            raise ProvenanceError("candidate ids must be non-empty and unique")
        candidate_ids.append(cid)
        if candidate.get("proposed_stable") is not True:
            raise ProvenanceError(f"{cid}: candidate lacks proposed_stable=true")
        if str(candidate.get("confidence", "")).lower() != "high":
            raise ProvenanceError(f"{cid}: candidate confidence is not high")
        for field in ("fact", "evidence", "scope", "reviewer"):
            if not str(candidate.get(field, "")).strip():
                raise ProvenanceError(f"{cid}: candidate missing {field}")
    approval_by_id: dict[str, dict] = {}
    for review in approvals:
        cid = str(review.get("candidate_id", "")).strip()
        if cid in candidate_ids and str(review.get("decision", "")).lower() == "approved_stable":
            if not str(review.get("reviewer", "")).strip() or not str(review.get("reviewed_at", "")).strip():
                raise ProvenanceError(f"{cid}: approved review lacks reviewer/reviewed_at")
            approval_by_id[cid] = review
    missing = sorted(set(candidate_ids) - set(approval_by_id))
    if missing:
        raise ProvenanceError(f"promotion lacks approved_stable review: {', '.join(missing)}")
    for candidate in candidates:
        cid = str(candidate.get("id", ""))
        if approval_by_id[cid].get("candidate_sha256") != _sha256(_canonical(candidate)):
            raise ProvenanceError(f"{cid}: approved review is not bound to the candidate record")


def issue_receipt(
    root: Path,
    before: bytes,
    after: bytes,
    candidates: list[dict],
    approvals: list[dict],
) -> tuple[Path, str]:
    """Mint one receipt and an out-of-tree authority record for an exact transition."""
    root = root.resolve()
    if before == after:
        raise ProvenanceError("refusing receipt for a no-op stable-store transition")
    _validate_sources(candidates, approvals)
    source_files, added_date = _attest_real_sources_and_transition(root, before, after, candidates, approvals)
    producer = _producer_attestation(root)
    ctx = _repo_context(root)
    key = _authority_key(ctx, create=True)
    receipt_id = secrets.token_hex(24)
    # Preserve the exact central-writer append order; lexical reordering would
    # make a valid multi-candidate transition unverifiable.
    ordered_candidates = list(candidates)
    approval_by_id = {
        str(item.get("candidate_id")): item
        for item in approvals
        if str(item.get("decision", "")).lower() == "approved_stable"
    }
    ordered_approvals = [approval_by_id[str(item["id"])] for item in ordered_candidates]
    payload = {
        "schema": SCHEMA,
        "receipt_id": receipt_id,
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "repository": {
            "kind": ctx["kind"],
            "id": _repo_id(ctx),
            "root": ctx["root"],
            "head": ctx["head"],
        },
        "transition": {
            "path": STABLE_REL,
            "before": _blob(root, before, ctx),
            "after": _blob(root, after, ctx),
        },
        "candidates": ordered_candidates,
        "approved_reviews": ordered_approvals,
        "promotion_ready": {
            "candidate_ids": [str(item["id"]) for item in ordered_candidates],
            "added_date": added_date,
            "criteria": [
                "candidate_exists",
                "proposed_stable_true",
                "confidence_high",
                "review_metadata_complete",
                "approved_stable_review",
                "not_duplicate",
                "not_conflicting",
            ],
        },
        "source_files": source_files,
        "producer": producer,
        "nonce": secrets.token_hex(24),
    }
    mac = hmac.new(key, _canonical(payload), hashlib.sha256).hexdigest()
    receipt = {
        **payload,
        "signature": {
            "algorithm": "hmac-sha256",
            "key_id": _sha256(key)[:24],
            "mac": mac,
        },
    }
    receipt_bytes = (json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    authority = {
        "schema": AUTH_SCHEMA,
        "receipt_id": receipt_id,
        "receipt_sha256": _sha256(receipt_bytes),
        "payload_sha256": _sha256(_canonical(payload)),
        "repository_id": _repo_id(ctx),
        "head": ctx["head"],
        "state": "pending",
        "index_fingerprint": None,
    }
    authority_path = Path(ctx["authority_dir"]) / "transitions" / f"{receipt_id}.json"
    receipt_path = root / RECEIPTS_REL / f"{receipt_id}.json"
    _write_exclusive(authority_path, _canonical(authority) + b"\n")
    try:
        _write_exclusive(receipt_path, receipt_bytes, mode=0o644)
    except BaseException:
        try:
            authority_path.unlink()
        except OSError:
            pass
        raise
    return receipt_path, receipt_id


def revoke_receipt(root: Path, receipt_path: Path, receipt_id: str) -> None:
    """Best-effort rollback for an issuance whose surrounding promotion failed."""
    try:
        ctx = _repo_context(root.resolve())
        authority = Path(ctx["authority_dir"]) / "transitions" / f"{receipt_id}.json"
        if authority.exists():
            authority.unlink()
    finally:
        try:
            receipt_path.unlink()
        except OSError:
            pass


def _parse_receipt(raw: bytes) -> dict:
    try:
        receipt = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ProvenanceError(f"invalid promotion receipt JSON: {exc}") from exc
    if not isinstance(receipt, dict) or receipt.get("schema") != SCHEMA:
        raise ProvenanceError("promotion receipt schema mismatch")
    required = {"receipt_id", "issued_at", "repository", "transition", "candidates", "approved_reviews", "promotion_ready", "source_files", "producer", "nonce", "signature"}
    missing = sorted(required - set(receipt))
    if missing:
        raise ProvenanceError(f"promotion receipt missing fields: {', '.join(missing)}")
    if set(receipt) != required | {"schema"}:
        raise ProvenanceError("promotion receipt contains undeclared top-level fields")
    return receipt


def _verify_one(
    root: Path,
    raw: bytes,
    before: bytes,
    after: bytes,
    *,
    index_fingerprint: str | None,
    consume: bool,
    source_mode: str,
) -> dict:
    root = root.resolve()
    receipt = _parse_receipt(raw)
    ctx = _repo_context(root)
    repo = receipt["repository"]
    if repo != {"kind": ctx["kind"], "id": _repo_id(ctx), "root": ctx["root"], "head": ctx["head"]}:
        raise ProvenanceError("receipt repository/HEAD binding mismatch")
    expected_transition = {
        "path": STABLE_REL,
        "before": _blob(root, before, ctx),
        "after": _blob(root, after, ctx),
    }
    if receipt["transition"] != expected_transition:
        raise ProvenanceError("receipt before/after blob binding mismatch")
    _verify_producer(root, receipt.get("producer"))
    if not isinstance(receipt.get("candidates"), list) or not isinstance(receipt.get("approved_reviews"), list):
        raise ProvenanceError("receipt candidate/review snapshots must be arrays")
    _validate_sources(receipt["candidates"], receipt["approved_reviews"])
    if not isinstance(receipt.get("source_files"), dict) or set(receipt["source_files"]) != {
        "candidates_path", "candidates_sha256", "reviews_path", "reviews_sha256", "parent_reviews_sha256",
        "schema_path", "schema_sha256"
    }:
        raise ProvenanceError("receipt source-file binding shape mismatch")
    if receipt["source_files"].get("candidates_path") != "memory/semantic/candidates.jsonl" or receipt["source_files"].get("reviews_path") != "memory/semantic/reviews.jsonl":
        raise ProvenanceError("receipt source-file paths mismatch")
    if receipt["source_files"].get("schema_path") != "memory/semantic/promotion-receipt.schema.json":
        raise ProvenanceError("receipt schema source path mismatch")
    _verify_signed_sources(root, receipt, source_mode)
    added_date = str(receipt.get("promotion_ready", {}).get("added_date", ""))
    _attest_receipt_transition(before, after, receipt["candidates"], added_date)
    ids = [str(item.get("id")) for item in receipt["candidates"]]
    ready = receipt.get("promotion_ready", {})
    if ready.get("candidate_ids") != ids or not isinstance(ready.get("criteria"), list):
        raise ProvenanceError("receipt promotion_ready binding mismatch")
    signature = receipt.get("signature", {})
    if set(signature) != {"algorithm", "key_id", "mac"} or signature.get("algorithm") != "hmac-sha256":
        raise ProvenanceError("receipt signature shape/algorithm mismatch")
    key = _authority_key(ctx, create=False)
    if signature.get("key_id") != _sha256(key)[:24]:
        raise ProvenanceError("receipt authority key id mismatch")
    payload = {key_name: value for key_name, value in receipt.items() if key_name != "signature"}
    expected_mac = hmac.new(key, _canonical(payload), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(str(signature.get("mac", "")), expected_mac):
        raise ProvenanceError("receipt authentication failed")

    receipt_id = str(receipt["receipt_id"])
    authority_path = Path(ctx["authority_dir"]) / "transitions" / f"{receipt_id}.json"
    if not authority_path.is_file():
        raise ProvenanceError("receipt has no out-of-tree authority record")
    try:
        authority = json.loads(authority_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ProvenanceError(f"invalid promotion authority record: {exc}") from exc
    if authority.get("schema") != AUTH_SCHEMA:
        raise ProvenanceError("promotion authority schema mismatch")
    if authority.get("receipt_sha256") != _sha256(raw):
        raise ProvenanceError("authority receipt digest mismatch")
    if authority.get("payload_sha256") != _sha256(_canonical(payload)):
        raise ProvenanceError("authority payload digest mismatch")
    if authority.get("repository_id") != _repo_id(ctx) or authority.get("head") != ctx["head"]:
        raise ProvenanceError("authority repository/HEAD mismatch")
    state = authority.get("state")
    if state not in {"pending", "consumed"}:
        raise ProvenanceError("authority state is invalid")
    if consume:
        if not index_fingerprint:
            raise ProvenanceError("consumption requires staged index fingerprint")
        if state == "consumed" and authority.get("index_fingerprint") != index_fingerprint:
            raise ProvenanceError("receipt replayed against a different staged index")
        if state == "pending":
            authority["state"] = "consumed"
            authority["index_fingerprint"] = index_fingerprint
            authority["consumed_at"] = datetime.now(timezone.utc).isoformat()
            _atomic_write(authority_path, _canonical(authority) + b"\n")
    return {"receipt_id": receipt_id, "candidate_ids": ids, "state": "consumed" if consume else state}


def _index_file(root: Path, rel: str) -> bytes:
    result = _git(root, "show", f":{rel}", check=False)
    if result.returncode != 0:
        raise ProvenanceError(f"required staged source is absent from index: {rel}")
    return result.stdout


def _verify_signed_sources(root: Path, receipt: dict, mode: str) -> None:
    sources = receipt["source_files"]
    if mode == "staged":
        reviews_raw = _index_file(root, "memory/semantic/reviews.jsonl")
    elif mode == "worktree":
        review_path = root / "memory/semantic/reviews.jsonl"
        reviews_raw = review_path.read_bytes() if review_path.exists() else b""
    else:
        raise ProvenanceError(f"unsupported live source verification mode: {mode}")
    if _sha256(reviews_raw) != sources.get("reviews_sha256"):
        raise ProvenanceError("promotion review source is omitted or differs from signed receipt")
    if mode == "staged":
        schema_raw = _index_file(root, "memory/semantic/promotion-receipt.schema.json")
    else:
        schema_path = root / "memory/semantic/promotion-receipt.schema.json"
        schema_raw = schema_path.read_bytes() if schema_path.exists() else b""
    if _sha256(schema_raw) != sources.get("schema_sha256"):
        raise ProvenanceError("promotion receipt schema is omitted or differs from signed receipt")

    signed = {_sha256(_canonical(item)): item for item in receipt["candidates"]}
    candidate_path = root / "memory/semantic/candidates.jsonl"
    current_raw = candidate_path.read_bytes() if candidate_path.exists() else b""
    found: set[str] = set()
    if _sha256(current_raw) == sources.get("candidates_sha256"):
        for row in _jsonl_bytes_strict(current_raw, "current candidates.jsonl"):
            digest = _sha256(_canonical(row))
            if digest in signed:
                found.add(digest)
    if found != set(signed):
        archive_rows = []
        if mode == "staged":
            listing = _git(
                root, "diff", "--cached", "--name-only", "--diff-filter=AM", "--",
                "memory/semantic/archive"
            )
            for rel in listing.stdout.decode().splitlines():
                if rel.endswith(".jsonl"):
                    archive_rows.extend(_jsonl_bytes_strict(_index_file(root, rel), f"staged {rel}"))
        else:
            archive_dir = root / "memory/semantic/archive"
            for path in sorted(archive_dir.glob("candidates-*.jsonl")) if archive_dir.is_dir() else []:
                archive_rows.extend(_jsonl_bytes_strict(path.read_bytes(), str(path)))
        for row in archive_rows:
            digest = _sha256(_canonical(row))
            if digest in signed:
                found.add(digest)
    missing = set(signed) - found
    if missing:
        ids = sorted(str(signed[digest].get("id", "?")) for digest in missing)
        raise ProvenanceError(f"signed candidate snapshot missing from current queue/staged archive: {', '.join(ids)}")


def _attest_receipt_transition(before: bytes, after: bytes, candidates: list[dict], added_date: str) -> None:
    before_facts = _parse_stable(before, "before")
    after_facts = _parse_stable(after, "after")
    if after_facts[:len(before_facts)] != before_facts:
        raise ProvenanceError("receipt transition modifies existing stable facts")
    try:
        datetime.strptime(added_date, "%Y-%m-%d")
    except ValueError as exc:
        raise ProvenanceError("receipt added date is not YYYY-MM-DD") from exc
    if after_facts[len(before_facts):] != [_expected_fact(item, added_date) for item in candidates]:
        raise ProvenanceError("receipt transition does not exactly append signed candidates")


def _verify_portable_receipt(root: Path, commit: str, parent: str, path: str, raw: bytes,
                             before: bytes, after: bytes) -> dict:
    """Verify a committed receipt using immutable Git ancestry, not local HMAC state."""
    receipt = _parse_receipt(raw)
    repo = receipt.get("repository", {})
    if repo.get("kind") != "git-worktree" or repo.get("head") != parent:
        raise ProvenanceError("committed receipt is not bound to its first parent")
    ctx = _repo_context(root)
    expected_transition = {
        "path": STABLE_REL,
        "before": _blob(root, before, ctx),
        "after": _blob(root, after, ctx),
    }
    if receipt.get("transition") != expected_transition:
        raise ProvenanceError("committed receipt transition differs from parent→commit blobs")
    candidates = receipt.get("candidates")
    approvals = receipt.get("approved_reviews")
    if not isinstance(candidates, list) or not isinstance(approvals, list):
        raise ProvenanceError("committed receipt candidate/review snapshots must be arrays")
    _validate_sources(candidates, approvals)
    added_date = str(receipt.get("promotion_ready", {}).get("added_date", ""))
    _attest_receipt_transition(before, after, candidates, added_date)
    ids = [str(item.get("id", "")) for item in candidates]
    if receipt.get("promotion_ready", {}).get("candidate_ids") != ids:
        raise ProvenanceError("committed receipt promotion-ready set mismatch")

    def commit_file(rel: str) -> bytes:
        result = _git(root, "show", f"{commit}:{rel}", check=False)
        if result.returncode != 0:
            raise ProvenanceError(f"committed producer file missing: {rel}")
        return result.stdout

    _verify_producer_with_loader(root, receipt.get("producer"), commit_file)
    sources = receipt.get("source_files")
    required_sources = {
        "candidates_path", "candidates_sha256", "reviews_path", "reviews_sha256", "parent_reviews_sha256",
        "schema_path", "schema_sha256"
    }
    if not isinstance(sources, dict) or set(sources) != required_sources:
        raise ProvenanceError("committed receipt source-file binding shape mismatch")
    if sources.get("candidates_path") != "memory/semantic/candidates.jsonl":
        raise ProvenanceError("committed receipt candidate source path mismatch")
    if sources.get("reviews_path") != "memory/semantic/reviews.jsonl":
        raise ProvenanceError("committed receipt review source path mismatch")
    if sources.get("schema_path") != "memory/semantic/promotion-receipt.schema.json":
        raise ProvenanceError("committed receipt schema source path mismatch")
    parent_reviews_result = _git(root, "show", f"{parent}:memory/semantic/reviews.jsonl", check=False)
    parent_reviews_raw = parent_reviews_result.stdout if parent_reviews_result.returncode == 0 else b""
    if _sha256(parent_reviews_raw) != sources.get("parent_reviews_sha256"):
        raise ProvenanceError("committed receipt parent review-store hash mismatch")
    parent_reviews = _jsonl_bytes_strict(parent_reviews_raw, f"{parent} reviews.jsonl")
    last_governance_decision = {}
    latest_parent_approval = {}
    for row in parent_reviews:
        cid = str(row.get("candidate_id", ""))
        decision = str(row.get("decision", "")).lower()
        if decision in {"approved_stable", "rejected", "promoted"}:
            last_governance_decision[cid] = decision
        if decision == "approved_stable":
            latest_parent_approval[cid] = row
    for approval in approvals:
        cid = str(approval.get("candidate_id", ""))
        if last_governance_decision.get(cid) != "approved_stable":
            raise ProvenanceError(f"{cid}: parent history does not end in approved_stable")
        if cid not in latest_parent_approval or _canonical(latest_parent_approval[cid]) != _canonical(approval):
            raise ProvenanceError(
                f"{approval.get('candidate_id', '?')}: approval was not committed in parent history"
            )
    commit_reviews_result = _git(root, "show", f"{commit}:memory/semantic/reviews.jsonl", check=False)
    commit_reviews_raw = commit_reviews_result.stdout if commit_reviews_result.returncode == 0 else b""
    if _sha256(commit_reviews_raw) != sources.get("reviews_sha256"):
        raise ProvenanceError("committed receipt review-store hash mismatch")
    schema_result = _git(root, "show", f"{commit}:memory/semantic/promotion-receipt.schema.json", check=False)
    if schema_result.returncode != 0 or _sha256(schema_result.stdout) != sources.get("schema_sha256"):
        raise ProvenanceError("committed receipt schema blob hash mismatch")
    signature = receipt.get("signature", {})
    if set(signature) != {"algorithm", "key_id", "mac"} or signature.get("algorithm") != "hmac-sha256":
        raise ProvenanceError("committed receipt signature shape mismatch")
    if Path(path).stem != str(receipt.get("receipt_id", "")):
        raise ProvenanceError("committed receipt filename/id mismatch")
    return {"commit": commit, "receipt_id": receipt["receipt_id"], "candidate_ids": ids}


def verify_committed_history(root: Path) -> dict:
    """Audit every stable-store write after the provenance guard activation commit."""
    root = root.resolve()
    ctx = _repo_context(root)
    if ctx["kind"] != "git-worktree":
        return {"status": "PASS", "checked": False, "mode": "history", "transitions": []}
    schema_rel = "memory/semantic/promotion-receipt.schema.json"
    activation_result = _git(
        root, "log", "--diff-filter=A", "--format=%H", "--reverse", "--", schema_rel, check=False
    )
    activations = [line for line in activation_result.stdout.decode().splitlines() if line]
    if not activations:
        return {"status": "PASS", "checked": False, "mode": "history", "transitions": []}
    activation = activations[0]
    parent_result = _git(root, "rev-parse", f"{activation}^", check=False)
    range_spec = f"{activation}^..HEAD" if parent_result.returncode == 0 else "HEAD"
    log = _git(
        root, "log", "--format=%H", "--reverse", range_spec, "--", STABLE_REL, RECEIPTS_REL
    )
    commits = [line for line in log.stdout.decode().splitlines() if line]
    transitions = []
    for commit in commits:
        parent_out = _git(root, "rev-parse", f"{commit}^1", check=False)
        parent = parent_out.stdout.decode().strip() if parent_out.returncode == 0 else ""
        if not parent:
            raise ProvenanceError(f"cannot audit root stable transition commit {commit}")
        status = _git(root, "diff", "--name-status", parent, commit, "--", STABLE_REL, RECEIPTS_REL)
        rows = [line.split("\t", 1) for line in status.stdout.decode().splitlines() if "\t" in line]
        stable_changed = any(path == STABLE_REL for _kind, path in rows)
        receipt_changes = [(kind, path) for kind, path in rows if path.startswith(f"{RECEIPTS_REL}/")]
        if any(kind != "A" for kind, _path in receipt_changes):
            raise ProvenanceError(f"committed receipt was modified/deleted in {commit}")
        additions = [path for kind, path in receipt_changes if kind == "A"]
        if stable_changed and len(additions) != 1:
            raise ProvenanceError(f"stable commit {commit} requires exactly one new receipt; found {len(additions)}")
        if additions and not stable_changed:
            raise ProvenanceError(f"orphan committed promotion receipt in {commit}")
        if not stable_changed:
            continue
        before_result = _git(root, "show", f"{parent}:{STABLE_REL}", check=False)
        after_result = _git(root, "show", f"{commit}:{STABLE_REL}", check=False)
        before = before_result.stdout if before_result.returncode == 0 else b""
        if after_result.returncode != 0:
            raise ProvenanceError(f"stable store deleted in {commit}")
        receipt_result = _git(root, "show", f"{commit}:{additions[0]}", check=False)
        if receipt_result.returncode != 0:
            raise ProvenanceError(f"receipt unreadable in {commit}")
        transitions.append(
            _verify_portable_receipt(root, commit, parent, additions[0], receipt_result.stdout, before, after_result.stdout)
        )
    return {"status": "PASS", "checked": True, "mode": "history", "activation": activation, "transitions": transitions}


def _head_bytes(root: Path) -> bytes:
    result = _git(root, "show", f"HEAD:{STABLE_REL}", check=False)
    return result.stdout if result.returncode == 0 else b""


def _index_bytes(root: Path) -> bytes:
    result = _git(root, "show", f":{STABLE_REL}", check=False)
    if result.returncode != 0:
        raise ProvenanceError("stable store is absent from staged index")
    return result.stdout


def _staged_receipts(root: Path) -> list[tuple[str, bytes]]:
    result = _git(root, "diff", "--cached", "--name-only", "--diff-filter=AM", "--", RECEIPTS_REL)
    paths = [line for line in result.stdout.decode().splitlines() if line]
    rows = []
    for path in paths:
        raw = _git(root, "show", f":{path}", check=False)
        if raw.returncode != 0:
            raise ProvenanceError(f"staged receipt is unreadable: {path}")
        rows.append((path, raw.stdout))
    return rows


def verify_staged(root: Path, *, consume: bool = False) -> dict:
    root = root.resolve()
    ctx = _repo_context(root)
    if ctx["kind"] != "git-worktree":
        raise ProvenanceError("staged provenance requires a git worktree")
    stable_changed = _git(root, "diff", "--cached", "--quiet", "--", STABLE_REL, check=False).returncode == 1
    receipts = _staged_receipts(root)
    if not stable_changed:
        if receipts:
            raise ProvenanceError("orphan promotion receipt staged without stable-store transition")
        return {"status": "PASS", "checked": False, "mode": "staged"}
    if os.environ.get("FAST_COMMIT", "0") == "1":
        raise ProvenanceError("FAST_COMMIT cannot authorize a stable-memory transition")
    if len(receipts) != 1:
        raise ProvenanceError(f"stable transition requires exactly one staged receipt; found {len(receipts)}")
    before, after = _head_bytes(root), _index_bytes(root)
    diff = _git(root, "diff", "--cached", "--binary", "--full-index", "--no-ext-diff").stdout
    fingerprint = _sha256(diff)
    verified = _verify_one(
        root, receipts[0][1], before, after,
        index_fingerprint=fingerprint, consume=consume, source_mode="staged"
    )
    return {"status": "PASS", "checked": True, "mode": "staged", **verified}


def verify_worktree(root: Path) -> dict:
    root = root.resolve()
    ctx = _repo_context(root)
    if ctx["kind"] != "git-worktree":
        return {"status": "PASS", "checked": False, "mode": "detached-memory-root"}
    stable_path = root / STABLE_REL
    # Compare the combined index+worktree image to HEAD.  Plain `git diff`
    # misses a fully staged direct write because worktree and index then agree.
    tracked_change = _git(root, "diff", "HEAD", "--quiet", "--", STABLE_REL, check=False).returncode == 1
    untracked = _git(root, "ls-files", "--others", "--exclude-standard", "--", STABLE_REL).stdout.strip()
    if not tracked_change and not untracked:
        return {"status": "PASS", "checked": False, "mode": "worktree"}
    before = _head_bytes(root)
    after = stable_path.read_bytes() if stable_path.exists() else b""
    candidates = []
    receipt_dir = root / RECEIPTS_REL
    if receipt_dir.is_dir():
        for path in sorted(receipt_dir.glob("*.json")):
            try:
                verified = _verify_one(
                    root, path.read_bytes(), before, after,
                    index_fingerprint=None, consume=False, source_mode="worktree"
                )
                candidates.append((path, verified))
            except ProvenanceError:
                continue
    if len(candidates) != 1:
        raise ProvenanceError(f"worktree stable transition requires exactly one authenticated receipt; found {len(candidates)}")
    return {"status": "PASS", "checked": True, "mode": "worktree", **candidates[0][1]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--staged", action="store_true")
    modes.add_argument("--worktree", action="store_true")
    modes.add_argument("--history", action="store_true")
    parser.add_argument("--consume", action="store_true", help="bind staged receipt to this exact index")
    parser.add_argument("--root", default=os.environ.get("MEMORY_ROOT", ""))
    args = parser.parse_args()
    if args.consume and not args.staged:
        parser.error("--consume requires --staged")
    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parents[2]
    try:
        if args.staged:
            result = verify_staged(root, consume=args.consume)
        elif args.worktree:
            result = verify_worktree(root)
        else:
            result = verify_committed_history(root)
    except ProvenanceError as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
