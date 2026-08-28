#!/usr/bin/env python3
"""
record_eval.py — 记录 skill 执行的 eval record
写入 memory/evals/eval-log.jsonl，供将来 GEPA 使用

用法:
  python3 memory/scripts/record_eval.py \
    --skill brainstorm \
    --topic "商机列表" \
    --scene A \
    --gate-status PASS \
    --gate-score 8 \
    --output-paths docs/prd/2026-05-20-crm-prd.md \
    --gate-findings "R-001 缺少边界条件" \
    --duration medium \
    --input-summary "用户想做商机AI推荐功能"
"""

import argparse
import hashlib
import json
import os
import re
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

try:
    import fcntl
except ImportError:  # pragma: no cover - repository runtime is POSIX
    fcntl = None


def _resolve_root():
    """记忆根解析（P1/FIX-1）：统一走 _memroot.resolve_memory_root——含 store-shape 哨兵、
    相对路径拒绝、脚本相对回落，与 JS 侧 memroot.mjs 同算法（防 JS/py 裂脑与 cloud 幻影树）。
    robust import：subprocess 下 sys.path[0]=memory/scripts 可直接 import；spec 加载等
    上下文回退按路径加载（不污染 sys.path）。"""
    try:
        from _memroot import resolve_memory_root
    except ImportError:
        import importlib.util as _ilu
        _p = Path(__file__).resolve().parent / "_memroot.py"
        if not _p.is_file():
            # 三级兜底：脚本被复制到别处单独运行（测试 fixture 会这么做）时 _memroot.py 不在同目录。
            # 内联等价解析，fail-open——绝不因辅助模块缺失而崩（旧行为亦是纯 env 读取）。
            _env = os.environ.get("MEMORY_ROOT")
            if _env and os.path.isabs(_env) and Path(_env).is_dir():
                return Path("/" + "/".join(s for s in _env.split("/") if s not in ("", ".")))
            return Path(__file__).resolve().parents[2]
        _s = _ilu.spec_from_file_location("_memroot", _p)
        _m = _ilu.module_from_spec(_s)
        _s.loader.exec_module(_m)
        resolve_memory_root = _m.resolve_memory_root
    return resolve_memory_root()[0]


def _canonical_digest(value):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _require_keys(value, expected, label):
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    actual = set(value)
    if actual != set(expected):
        raise ValueError(f"{label} keys mismatch: expected {sorted(expected)}, got {sorted(actual)}")


def _validate_verdict_envelope(value):
    _require_keys(value, {"schema_version", "producer", "eval_run_id", "subject", "verdict"}, "envelope")
    if value["schema_version"] != 1:
        raise ValueError("unsupported verdict envelope schema_version")
    if value["producer"] != "quality-gate":
        raise ValueError("verdict envelope producer must be quality-gate")
    run_id = value["eval_run_id"]
    if not isinstance(run_id, str) or not re.fullmatch(r"[A-Za-z0-9._:-]{8,128}", run_id):
        raise ValueError("eval_run_id must be an opaque 8-128 character identifier")

    subject_keys = {"skill", "topic", "scene", "input_summary", "output_paths", "duration"}
    _require_keys(value["subject"], subject_keys, "subject")
    subject = value["subject"]
    if not isinstance(subject["skill"], str) or not subject["skill"].strip():
        raise ValueError("subject.skill is required")
    if not isinstance(subject["topic"], str) or not subject["topic"].strip():
        raise ValueError("subject.topic is required")
    if subject["scene"] not in {"A", "B", "C", "D", "unknown"}:
        raise ValueError("subject.scene is invalid")
    if not isinstance(subject["input_summary"], str):
        raise ValueError("subject.input_summary must be a string")
    if not isinstance(subject["output_paths"], list) or not all(isinstance(path, str) for path in subject["output_paths"]):
        raise ValueError("subject.output_paths must be a string array")
    if subject["duration"] not in {"lightweight", "medium", "heavy"}:
        raise ValueError("subject.duration is invalid")

    _require_keys(value["verdict"], {"status", "passed", "total", "findings"}, "verdict")
    verdict = value["verdict"]
    if verdict["status"] not in {"PASS", "FAIL", "CONDITIONAL_PASS"}:
        raise ValueError("verdict.status is invalid")
    if (
        isinstance(verdict["passed"], bool)
        or isinstance(verdict["total"], bool)
        or not isinstance(verdict["passed"], int)
        or not isinstance(verdict["total"], int)
        or verdict["total"] < 1
        or not 0 <= verdict["passed"] <= verdict["total"]
    ):
        raise ValueError("verdict passed/total counts are invalid")
    if (verdict["status"] == "PASS") != (verdict["passed"] == verdict["total"]):
        raise ValueError("PASS status must exactly match a full pass count")
    if not isinstance(verdict["findings"], list) or not all(isinstance(item, str) for item in verdict["findings"]):
        raise ValueError("verdict.findings must be a string array")
    return value


@contextmanager
def _eval_log_lock(log_path):
    if fcntl is None:
        raise RuntimeError("eval recorder requires POSIX flock; refusing an unsafe unlocked write")
    lock_path = log_path.parent / ".eval-log.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(lock_path), os.O_CREAT | os.O_RDWR, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


def _append_record(log_path, record, run_id="", digest=""):
    with _eval_log_lock(log_path):
        if run_id and log_path.exists():
            for number, line in enumerate(log_path.read_text(encoding="utf-8").splitlines(), start=1):
                if not line.strip():
                    continue
                try:
                    existing = json.loads(line)
                except json.JSONDecodeError as error:
                    raise RuntimeError(f"eval-log line {number} is invalid JSON") from error
                if existing.get("quality_gate_run_id") != run_id:
                    continue
                if existing.get("quality_gate_verdict_sha256") == digest:
                    return False
                raise ValueError(f"eval_run_id conflict: {run_id} already has a different verdict digest")
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
    return True


def _record_from_envelope(path, log_path):
    try:
        envelope = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"cannot read verdict envelope: {error}") from error
    _validate_verdict_envelope(envelope)
    subject = envelope["subject"]
    verdict = envelope["verdict"]
    digest = _canonical_digest(envelope)
    record = {
        "session_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "skill_name": subject["skill"],
        "topic": subject["topic"],
        "scene": subject["scene"],
        "input_summary": subject["input_summary"][:300],
        "output_paths": subject["output_paths"],
        "quality_gate_score": verdict["passed"] / verdict["total"],
        "quality_gate_status": verdict["status"],
        "quality_gate_findings": verdict["findings"],
        "execution_duration_est": subject["duration"],
        "user_adopted": "unknown",
        "quality_gate_run_id": envelope["eval_run_id"],
        "quality_gate_producer": envelope["producer"],
        "quality_gate_verdict_sha256": digest,
        "quality_gate_verdict_schema": envelope["schema_version"],
        "quality_gate_passed": verdict["passed"],
        "quality_gate_total": verdict["total"],
    }
    appended = _append_record(log_path, record, envelope["eval_run_id"], digest)
    state = "recorded" if appended else "already-recorded"
    print(f"[record_eval] ✓ {subject['skill']} → {log_path} (status={verdict['status']}, {state}, sha256={digest})")


def main():
    parser = argparse.ArgumentParser(description="Record skill eval entry")
    parser.add_argument("--verdict-file", help="quality-gate 输出的 EVAL_ENVELOPE_JSON 文件；与 legacy 参数互斥")
    parser.add_argument("--skill", help="Skill 名称")
    parser.add_argument("--topic", help="当前 topic")
    parser.add_argument("--scene", default="unknown", choices=["A", "B", "C", "D", "unknown"])
    parser.add_argument("--input-summary", default="", help="输入意图摘要（≤300字）")
    parser.add_argument("--output-paths", nargs="*", default=[], metavar="PATH")
    # 2026-07-09 E5 语义切换：新值 = 0-1 通过率（pass_count/total，来自逐 criteria 二元判定）；
    # 历史值 10.0/8.0 为旧制无 rubric 主观分（2026-06-12/14 六条）；None 语义不变（未跑 judge）。
    parser.add_argument("--gate-score", type=float, default=None,
                        help="Quality gate 通过率 0-1（旧制 0-10 主观分已废止，历史数据保留原值）")
    parser.add_argument("--gate-status",
                        choices=["PASS", "FAIL", "CONDITIONAL_PASS"])
    parser.add_argument("--gate-findings", nargs="*", default=[], metavar="FINDING",
                        help="FAIL/WARN 项（可多个）")
    parser.add_argument("--duration", default="medium",
                        choices=["lightweight", "medium", "heavy"])
    parser.add_argument("--user-adopted", default="unknown",
                        choices=["true", "false", "unknown"])
    args = parser.parse_args()

    root = _resolve_root()
    log_path = root / "memory" / "evals" / "eval-log.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if args.verdict_file:
        legacy_values = [args.skill, args.topic, args.gate_status, args.gate_score, *args.output_paths, *args.gate_findings]
        if any(value is not None and value != "" for value in legacy_values):
            parser.error("--verdict-file cannot be combined with legacy eval fields")
        _record_from_envelope(args.verdict_file, log_path)
        return
    if not args.skill or not args.topic or not args.gate_status:
        parser.error("legacy mode requires --skill, --topic, and --gate-status")

    record = {
        # UTC 对齐全链（episodic/governance 均 UTC；旧本地时区在时差边界会错一天）
        "session_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "skill_name": args.skill,
        "topic": args.topic,
        "scene": args.scene,
        "input_summary": args.input_summary[:300],
        "output_paths": args.output_paths,
        "quality_gate_score": args.gate_score,
        "quality_gate_status": args.gate_status,
        "quality_gate_findings": args.gate_findings,
        "execution_duration_est": args.duration,
        "user_adopted": args.user_adopted,
    }

    _append_record(log_path, record)

    print(f"[record_eval] ✓ {args.skill} → {log_path}  (status={args.gate_status})")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError) as error:
        print(f"[record_eval] ERROR: {error}", file=sys.stderr)
        raise SystemExit(2)
