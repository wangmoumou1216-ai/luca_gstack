#!/usr/bin/env python3
"""Natural-language search across luca_gstack memory layers."""
import argparse
import datetime as dt
import json
import os
import re
from pathlib import Path
from typing import Optional
try:
    import yaml as _yaml
    _HAS_YAML = True
except ImportError:
    _HAS_YAML = False


ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
MEMORY_DIR = ROOT / "memory"
EPISODIC_INDEX = MEMORY_DIR / "episodic" / "index.jsonl"
SEMANTIC_FACTS = MEMORY_DIR / "semantic" / "promoted-facts.yaml"
EVAL_LOG = MEMORY_DIR / "evals" / "eval-log.jsonl"
# ADR-0006 measure-first instrumentation: runtime retrieval-usefulness log.
RETRIEVAL_LOG = MEMORY_DIR / "retrieval-log.jsonl"

STOP_TOKENS = {
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "a", "b", "c", "d", "i", "v", "x",
}

SYNONYM_GROUPS = [
    ("老项目", "已有项目", "旧项目", "继续项目", "上次项目", "之前项目", "project-gate", "project", "gate", "项目上下文门禁", "项目门禁"),
    ("路由", "route", "routing", "route-guard", "skill-routing", "skill路由"),
    ("治理", "governance", "review", "review-queue", "质量门禁", "写入门禁"),
    ("记忆", "memory", "三层记忆", "semantic", "episodic"),
    ("原型", "prototype", "html-prototype", "framework", "母版"),
]


def tokenize(text: str) -> list[str]:
    raw_tokens = [token for token in re.findall(r"[\w#-]+", text.lower()) if token]
    tokens = []
    for token in raw_tokens:
        if token in STOP_TOKENS or len(token) == 1:
            continue
        tokens.append(token)
    expanded = set(tokens)
    lowered = text.lower()
    for group in SYNONYM_GROUPS:
        if any(term.lower() in lowered or term.lower() in expanded for term in group):
            expanded.update(term.lower() for term in group)
    return sorted(expanded)


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            rows.append(value)
    return rows


def clean_scalar(value: str):
    value = value.strip().rstrip(",")
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [clean_scalar(part) for part in inner.split(",")]
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    return value


def parse_semantic_facts(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    if _HAS_YAML:
        try:
            data = _yaml.safe_load(text) or {}
            if isinstance(data, dict):
                facts = data.get("facts", [])
            elif isinstance(data, list):
                facts = data
            else:
                facts = []
            return [fact for fact in facts if isinstance(fact, dict) and fact.get("stable") is True]
        except Exception:
            pass
    facts = []
    current = None
    in_scope = False
    current_key = ""
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or stripped == "facts:":
            continue
        if stripped.startswith("- id:"):
            if current:
                facts.append(current)
            current = {"id": clean_scalar(stripped.split(":", 1)[1]), "scope": {}}
            in_scope = False
            current_key = ""
            continue
        if current is None:
            continue
        if stripped == "scope:":
            in_scope = True
            current.setdefault("scope", {})
            current_key = "scope"
            continue
        if ":" not in stripped:
            if current_key == "fact" and current.get("fact"):
                current["fact"] = f"{current['fact']} {stripped.strip().strip(chr(34)).strip(chr(39))}".strip()
            continue
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = clean_scalar(value)
        if in_scope and raw.startswith((" ", "\t")):
            current.setdefault("scope", {})[key] = value
        else:
            current[key] = value
            in_scope = False
        current_key = key
    if current:
        facts.append(current)
    return [fact for fact in facts if fact.get("stable") is True]


def as_text(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=str).lower()


def list_matches(values, needle: str) -> bool:
    if not needle or needle == "*":
        return True
    if not isinstance(values, list):
        values = [values] if values else []
    return any(needle.lower() in str(value).lower() for value in values)


def semantic_skill_matches(record: dict, skill: str) -> bool:
    if not skill or skill == "*":
        return True
    scope = record.get("scope")
    if isinstance(scope, dict):
        scope_match = list_matches(scope.get("skills", []), skill)
    else:
        scope_match = list_matches(scope, skill)
    return (
        scope_match
        or list_matches(record.get("tags", []), skill)
        or skill.lower() in str(record.get("fact", "")).lower()
    )


def record_date(record: dict) -> Optional[dt.datetime]:
    for key in ("date", "added", "created_at", "timestamp", "completed_at"):
        value = record.get(key)
        if not value:
            continue
        text = str(value).replace("Z", "+00:00")
        try:
            return dt.datetime.fromisoformat(text)
        except ValueError:
            try:
                return dt.datetime.strptime(text[:10], "%Y-%m-%d")
            except ValueError:
                continue
    return None


def keyword_score(record: dict, query: str, tokens: list[str]) -> tuple[int, list[str]]:
    text = as_text(record)
    hits = [token for token in tokens if token in text]
    score = len(set(hits)) * 10
    reasons = []
    if hits:
        reasons.append(f"keyword hits: {', '.join(sorted(set(hits)))}")
    if query.lower() in text:
        score += 15
        reasons.append("exact query phrase")
    return score, reasons


def recency_score(record: dict) -> tuple[int, list[str]]:
    value = record_date(record)
    if not value:
        return 0, []
    age_days = max((dt.datetime.now(value.tzinfo) - value).days, 0)
    if age_days <= 7:
        score = 5
    elif age_days <= 30:
        score = 3
    else:
        score = 1
    return score, [f"recency: {value.date().isoformat()}"]


def base_result(layer: str, record: dict, path: Path) -> dict:
    result = {
        "layer": layer,
        "id": str(record.get("id") or record.get("candidate_id") or "?"),
        "score": 0,
        "reasons": [],
        "source": str(record.get("source") or path),
        "path": str(path),
    }
    if layer == "semantic":
        result["fact"] = str(record.get("fact", ""))
        result["title"] = str(record.get("domain", "semantic"))
    elif layer == "eval":
        result["title"] = str(record.get("topic") or record.get("skill_name") or "eval")
    else:
        result["title"] = str(record.get("topic") or record.get("summary") or "episode")
    return result


def score_record(layer: str, record: dict, query: str, tokens: list[str], path: Path, skill: str, topic: str) -> dict:
    result = base_result(layer, record, path)
    score, reasons = keyword_score(record, query, tokens)
    result["score"] += score
    result["reasons"].extend(reasons)
    if skill and skill != "*":
        result["score"] += 5
        result["reasons"].append("skill filter")
    if topic:
        result["score"] += 5
        result["reasons"].append("topic filter")
    if layer == "semantic":
        if record.get("stable") is True:
            result["score"] += 10
            result["reasons"].append("semantic stable")
        confidence = str(record.get("confidence", "")).lower()
        confidence_score = {"high": 8, "medium": 4, "low": 1}.get(confidence, 0)
        if confidence_score:
            result["score"] += confidence_score
            result["reasons"].append(f"semantic confidence: {confidence}")
    if layer == "eval":
        gate_status = str(record.get("quality_gate_status") or record.get("gate_status") or "").upper()
        gate_score = {"FAIL": 8, "CONDITIONAL_PASS": 4, "PASS": 1}.get(gate_status, 0)
        if gate_score:
            result["score"] += gate_score
            result["reasons"].append(f"gate_status: {gate_status}")
    recent_score, recent_reasons = recency_score(record)
    result["score"] += recent_score
    result["reasons"].extend(recent_reasons)
    return result


def load_layer(layer: str) -> tuple[Path, list[dict]]:
    if layer == "episodic":
        return EPISODIC_INDEX, read_jsonl(EPISODIC_INDEX)
    if layer == "semantic":
        return SEMANTIC_FACTS, parse_semantic_facts(SEMANTIC_FACTS)
    return EVAL_LOG, read_jsonl(EVAL_LOG)


def passes_filters(layer: str, record: dict, skill: str, topic: str) -> bool:
    if topic and topic.lower() not in str(record.get("topic", "")).lower() and topic.lower() not in as_text(record):
        return False
    if not skill or skill == "*":
        return True
    if layer == "episodic":
        return list_matches(record.get("skills_used", []), skill)
    if layer == "semantic":
        return semantic_skill_matches(record, skill)
    return skill.lower() in str(record.get("skill_name", "")).lower()


def search(query: str, limit: int, layer: str, skill: str, topic: str) -> list[dict]:
    tokens = tokenize(query)
    layers = ["episodic", "semantic", "eval"] if layer == "all" else [layer]
    results = []
    for layer_name in layers:
        path, rows = load_layer(layer_name)
        for record in rows:
            if not passes_filters(layer_name, record, skill, topic):
                continue
            result = score_record(layer_name, record, query, tokens, path, skill, topic)
            has_query_match = any(
                reason.startswith("keyword hits:") or reason == "exact query phrase"
                for reason in result["reasons"]
            )
            if has_query_match:
                results.append(result)
    results.sort(key=lambda row: (-row["score"], row["layer"], row["id"]))
    return results[:limit]


def print_human(rows: list[dict]) -> None:
    if not rows:
        print("Memory search: no matching records")
        return
    print(f"Memory search ({len(rows)} results):")
    for row in rows:
        label = row.get("fact") or row.get("title") or row.get("id")
        print(f"- [{row['layer']}] {row['id']} score={row['score']} {label}")
        print(f"  reasons: {', '.join(row['reasons'])}")
        print(f"  source: {row['source']}")
        print(f"  path: {row['path']}")


def _session_id() -> str:
    # Best-effort, dependency-free session correlation. Never raises.
    try:
        sid = os.environ.get("CLAUDE_SESSION_ID") or os.environ.get("LUCA_SESSION_ID")
        if sid:
            return str(sid)
        topic = ROOT / ".claude" / "current-topic.txt"
        if topic.exists():
            value = topic.read_text(encoding="utf-8").strip()
            if value:
                return value
    except Exception:
        pass
    # No real session id (env unset, topic file empty). Fall back to a date
    # bucket so the retrieval log keeps a meaningful time axis — distinct days
    # act as a session proxy for the ~10-session decision checkpoint, instead of
    # collapsing every record to a single "unknown".
    try:
        return f"date:{dt.date.today().isoformat()}"
    except Exception:
        return "unknown"


def log_retrieval(query: str, rows: list[dict], record_type: str = "search", extra: Optional[dict] = None) -> None:
    """Append ONE JSONL record about this retrieval. FULLY fail-safe:
    any error (disk, perms, encoding) is swallowed and never affects search output."""
    try:
        top = rows[0] if rows else None
        record = {
            "ts": dt.datetime.now().isoformat(timespec="seconds"),
            "type": record_type,
            "session": _session_id(),
            "query": query,
            "result_count": len(rows),
            "top_id": (top.get("id") if top else None),
            "top_score": (top.get("score") if top else None),
            "top_layer": (top.get("layer") if top else None),
        }
        if extra:
            record.update(extra)
        RETRIEVAL_LOG.parent.mkdir(parents=True, exist_ok=True)
        with RETRIEVAL_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
    except Exception:
        # Instrumentation must never break or slow the search. Swallow everything.
        pass


def read_retrieval_log() -> list[dict]:
    if not RETRIEVAL_LOG.exists():
        return []
    rows = []
    try:
        for line in RETRIEVAL_LOG.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict):
                rows.append(value)
    except Exception:
        return rows
    return rows


def print_retrieval_stats() -> None:
    """ADR-0006 decision-rule readout over the retrieval log."""
    rows = read_retrieval_log()
    searches = [r for r in rows if r.get("type", "search") == "search"]
    with_hits = [r for r in searches if (r.get("result_count") or 0) > 0]
    mattered = [r for r in rows if r.get("type") == "mattered" or r.get("mattered") is True]
    sessions = {r.get("session") for r in rows if r.get("session")}
    print("ADR-0006 retrieval stats (measure-first):")
    print(f"  total searches:      {len(searches)}")
    print(f"  searches with hits:  {len(with_hits)}")
    print(f"  flagged 'mattered':  {len(mattered)}")
    print(f"  distinct sessions:   {len(sessions)}")
    print(f"  log: {RETRIEVAL_LOG}")
    print("  decision rule (review after ~10 distinct sessions/days):")
    print("    - mattered >= ~3                  -> build cheap self-turning version")
    print("    - searches~=0 OR with-hits~=0     -> freeze write-side (objective: reads unused)")
    print("    - mattered~=0 but with-hits high  -> INCONCLUSIVE; do NOT auto-freeze")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("query", nargs="?", default="")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--layer", choices=["episodic", "semantic", "eval", "all"], default="all")
    parser.add_argument("--skill", default="*")
    parser.add_argument("--topic", default="")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--retrieval-stats", action="store_true",
                        help="ADR-0006: summarize retrieval-log.jsonl (no search performed)")
    parser.add_argument("--mattered", action="store_true",
                        help="ADR-0006: annotate that the given query's retrieval changed an action (no search performed)")
    args = parser.parse_args()

    if args.retrieval_stats:
        print_retrieval_stats()
        return 0

    if args.mattered:
        # Optional, minimal subjective signal: log a 'mattered' annotation.
        log_retrieval(args.query, [], record_type="mattered", extra={"mattered": True})
        print(f"Recorded 'mattered' annotation for query: {args.query!r}")
        return 0

    if not args.query:
        parser.error("query is required unless --retrieval-stats is used")

    rows = search(args.query, args.limit, args.layer, args.skill, args.topic)
    # Fail-safe instrumentation: logged AFTER computing results, swallows all errors,
    # and does not touch the search output below.
    log_retrieval(args.query, rows)
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print_human(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
