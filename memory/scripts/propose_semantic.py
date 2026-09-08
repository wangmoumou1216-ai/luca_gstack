#!/usr/bin/env python3
"""Propose a new semantic memory candidate (Hermes-lite pipeline).

Appends to memory/semantic/candidates.jsonl.
Candidates require manual/agent review before promotion to promoted-facts.yaml.

Usage:
  python3 memory/scripts/propose_semantic.py \
    --domain crm \
    --fact "纷享销客使用 GraphQL API，非 REST" \
    --confidence medium \
    --source "deepresearch 2026-05"
"""
import argparse
import json
import os
import sys
import yaml
from datetime import datetime, timezone
from pathlib import Path

try:
    from consolidate_memory import (
        candidate_id_census,
        candidate_id_collisions,
        next_candidate_id,
        semantic_id_lock,
    )
except ImportError:
    # importlib-based tests do not always put memory/scripts on sys.path.
    import importlib.util as _ilu
    _consolidate_path = Path(__file__).resolve().parent / "consolidate_memory.py"
    _spec = _ilu.spec_from_file_location("consolidate_memory", _consolidate_path)
    _consolidate = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_consolidate)
    candidate_id_census = _consolidate.candidate_id_census
    candidate_id_collisions = _consolidate.candidate_id_collisions
    next_candidate_id = _consolidate.next_candidate_id
    semantic_id_lock = _consolidate.semantic_id_lock


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


ROOT = _resolve_root()
CANDIDATES = ROOT / "memory" / "semantic" / "candidates.jsonl"
PROMOTED = ROOT / "memory" / "semantic" / "promoted-facts.yaml"


def next_id(census=None) -> str:
    """Compatibility wrapper; the proposal path calls this while holding the shared lock."""
    return next_candidate_id(census if census is not None else candidate_id_census(ROOT))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True, choices=["crm", "fxui", "workflow", "design", "tech", "skill-rule"])
    parser.add_argument("--fact", required=True)
    parser.add_argument("--confidence", choices=["high", "medium", "low"], default="medium")
    parser.add_argument("--source", default="observation")
    parser.add_argument("--stable", action="store_true", help="请求晋升为 stable（仅记 stable_requested 意图）；proposed_stable 只能由人工 consolidate --set-stable 批准翻转，提案者不得自评晋升")
    parser.add_argument("--evidence", default="", help="source path, quote, or observation that supports the fact")
    parser.add_argument("--scope", default="", help="applicability scope, e.g. crm, html-prototype, scene:A")
    parser.add_argument("--reviewer", default="", help="human or agent reviewer required for proposed stable facts")
    parser.add_argument("--tags", default="", help="comma-separated retrieval tags")
    parser.add_argument("--valid-until", default="", help="optional ISO date when the fact should expire")
    parser.add_argument("--supersedes", default="", help="optional previous fact id superseded by this candidate")
    args = parser.parse_args()

    if args.stable:
        missing = [name for name, value in {
            "evidence": args.evidence,
            "scope": args.scope,
            "reviewer": args.reviewer,
        }.items() if not value.strip()]
        if missing:
            print(f"--stable requires review metadata: {', '.join(missing)}", file=sys.stderr)
            return 2

    if args.stable and args.confidence != "high":
        print(json.dumps({
            "warning": f"--stable 已设置但 confidence={args.confidence}，当前记录写入候选队列，等待人工审核。"
        }, ensure_ascii=False), file=sys.stderr)

    try:
        preflight_census = candidate_id_census(ROOT)
        preflight_collisions = candidate_id_collisions(preflight_census)
        if preflight_collisions:
            print(
                json.dumps({"candidate_id_collisions": preflight_collisions}, ensure_ascii=False),
                file=sys.stderr,
            )
            print("semantic candidate ID collision detected; refusing proposal", file=sys.stderr)
            return 2
        # One critical section covers cross-root census, collision refusal,
        # max+1 allocation, duplicate recheck, and the append itself.
        with semantic_id_lock(ROOT):
            census = candidate_id_census(ROOT)
            collisions = candidate_id_collisions(census)
            if collisions:
                print(json.dumps({"candidate_id_collisions": collisions}, ensure_ascii=False), file=sys.stderr)
                print("semantic candidate ID collision detected; refusing proposal", file=sys.stderr)
                return 2
            if is_duplicate(args.domain, args.fact):
                print("duplicate semantic memory candidate", file=sys.stderr)
                return 2

            candidate_id = next_id(census)
            record = {
                "id": candidate_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "domain": args.domain,
                "fact": args.fact,
                "confidence": args.confidence,
                "source": args.source,
                "evidence": args.evidence,
                "scope": args.scope,
                "reviewer": args.reviewer,
                "tags": [tag.strip() for tag in args.tags.split(",") if tag.strip()],
                "valid_until": args.valid_until,
                "supersedes": args.supersedes,
                # 红线 SC-20260523-003：提案者不得自评晋升。--stable 仅记意图，
                # proposed_stable 只能由人工闸门 consolidate --set-stable 翻转（见 set_stable docstring）。
                "proposed_stable": False,
                "stable_requested": bool(args.stable),
                "status": "CANDIDATE",
            }
            CANDIDATES.parent.mkdir(parents=True, exist_ok=True)
            with CANDIDATES.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"semantic candidate ID lock/census unavailable; refusing proposal: {exc}", file=sys.stderr)
        return 2

    print(json.dumps({"candidate": candidate_id, "status": "pending_review"}, ensure_ascii=False))
    return 0


def normalize_fact(text: str) -> str:
    return "".join(str(text).lower().split())


def is_duplicate(domain: str, fact: str) -> bool:
    needle = normalize_fact(fact)
    records = []
    if CANDIDATES.exists():
        for line in CANDIDATES.read_text(encoding="utf-8").splitlines():
            try:
                records.append(json.loads(line))
            except Exception:
                pass
    if PROMOTED.exists():
        try:
            data = yaml.safe_load(PROMOTED.read_text(encoding="utf-8")) or {}
            records.extend(data.get("facts", []) if isinstance(data, dict) else [])
        except Exception:
            pass
    for record in records:
        if record.get("domain") == domain and normalize_fact(record.get("fact", "")) == needle:
            return True
    return False


if __name__ == "__main__":
    raise SystemExit(main())
