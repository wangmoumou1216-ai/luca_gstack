"""Bounded evidence driver for this approved local change; no native behaviour grading."""
import concurrent.futures
import datetime
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = Path(__file__).resolve().parent
INVENTORY = EVIDENCE / "final-source-inventory.json"
CHECKS = {
    "A1": ["node", "scripts/test-routing-candidate-hints.mjs"],
    "A2": ["node", "scripts/test-agent-context.mjs"],
    "A3": ["node", "scripts/test-design-tool-routing.mjs"],
    "A4": ["node", "scripts/test-eval-routing-contract.mjs"],
    "A5": ["python3", "memory/scripts/eval_routing.py", "--keyword-only"],
    "A6a": ["python3", "scripts/build-agent-context.py", "check"],
    "A6b": ["node", "scripts/check-agent-context.mjs"],
    "A7a": ["node", "--check", ".claude/hooks/route-guard.mjs"],
    "A7b": ["node", "scripts/check-capability-parity.mjs"],
}
digest = lambda data: hashlib.sha256(data).hexdigest()
frozen = INVENTORY.read_bytes()
source = json.loads(frozen)


def probe():
    return {
        row["path"]: digest(Path(row["path"]).read_bytes()) == row["sha256"]
        for row in source["files"]
    }


before = probe()
assert all(before.values()), "source changed before local assertions"
out = EVIDENCE / "final-tests"
out.mkdir(exist_ok=True)


def check(item):
    assertion, argv = item
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    result = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, timeout=240)
    refs = {}
    for kind, value in [("stdout", result.stdout), ("stderr", result.stderr)]:
        path = out / f"{assertion}.{kind}.txt"
        path.write_text(value)
        refs[kind] = {"path": str(path), "sha256": digest(path.read_bytes())}
    record = {
        "assert_id": assertion, "argv": argv, "cwd": str(ROOT),
        "started_at": start,
        "ended_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "exit_code": result.returncode, "evidence_refs": refs,
        "source_inventory": {"path": str(INVENTORY), "sha256": digest(frozen)},
        "driver_sha256": digest(Path(__file__).read_bytes()),
    }
    (out / f"{assertion}.json").write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps({"assert_id": assertion, "exit_code": result.returncode}), flush=True)
    return record


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check, CHECKS.items()))
after = probe()
ok = all(r["exit_code"] == 0 for r in results) and all(after.values()) and INVENTORY.read_bytes() == frozen
summary = {
    "kind": "local assertions only; not native agent behaviour or parity",
    "status": "PASS" if ok else "FAIL", "assertions": results,
    "source_probe_before": before, "source_probe_after": after,
    "required_assert_ids": list(CHECKS), "native_A8": "BLOCKED: separately retained required GAP",
}
(EVIDENCE / "final-test-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(summary["status"], flush=True)
raise SystemExit(0 if ok else 1)
