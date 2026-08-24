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


# 单真值源是 main，但它有**两个检出**，而 memory/semantic/candidates.jsonl 在两边都是
# untracked（各持一份、永不合并）。若只扫本地 store 取 max+1，**同一天在两个检出各提一条
# 必然撞号**——2026-08-20 实测：两边各有一条内容完全不同的 SC-20260820-001 与 -002，
# 而下游 verifier 只在其中一侧按 ID+字节校验，所以门禁看不见这个损伤。
# 修法：跨全部已知检出取全局 max。ID 格式不变（下游有 SC-\d{8}-\d{3} 的消费者）。
KNOWN_ROOTS = (
    Path("/Users/luca/Desktop/luca_gstack"),              # 母版＝记忆权威 store
    Path("/Users/luca/Desktop/项目/muse/lucagstack"),      # muse 运行时检出
)


def _seq_from(fact_id: str, prefix: str) -> int:
    if not fact_id.startswith(prefix):
        return 0
    try:
        return int(fact_id.split("-")[-1])
    except Exception:
        return 0


def _max_seq_for_prefix(prefix: str) -> int:
    """跨全部已知检出扫 candidates + promoted，返回该前缀下的最大序号。"""
    roots = {ROOT.resolve()}
    for r in KNOWN_ROOTS:
        try:
            if r.is_dir():
                roots.add(r.resolve())
        except Exception:
            pass
    best = 0
    for root in roots:
        cand = root / "memory" / "semantic" / "candidates.jsonl"
        if cand.exists():
            for line in cand.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    best = max(best, _seq_from(json.loads(line).get("id", ""), prefix))
                except Exception:
                    pass
        prom = root / "memory" / "semantic" / "promoted-facts.yaml"
        if prom.exists():
            for line in prom.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("- id:") or line.startswith("id:"):
                    best = max(best, _seq_from(line.split(":", 1)[1].strip().strip('"'), prefix))
    return best


def next_id() -> str:
    today = datetime.now(timezone.utc).strftime('%Y%m%d')
    prefix = f"SC-{today}-"
    return f"{prefix}{_max_seq_for_prefix(prefix) + 1:03d}"


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

    if is_duplicate(args.domain, args.fact):
        print("duplicate semantic memory candidate", file=sys.stderr)
        return 2
    if args.stable:
        missing = [name for name, value in {
            "evidence": args.evidence,
            "scope": args.scope,
            "reviewer": args.reviewer,
        }.items() if not value.strip()]
        if missing:
            print(f"--stable requires review metadata: {', '.join(missing)}", file=sys.stderr)
            return 2

    candidate_id = next_id()
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

    if args.stable and args.confidence != "high":
        print(json.dumps({
            "warning": f"--stable 已设置但 confidence={args.confidence}，当前记录写入候选队列，等待人工审核。"
        }, ensure_ascii=False), file=sys.stderr)

    CANDIDATES.parent.mkdir(parents=True, exist_ok=True)
    with CANDIDATES.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

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
