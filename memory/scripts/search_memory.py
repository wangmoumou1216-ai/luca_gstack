#!/usr/bin/env python3
"""Keyword search across luca_gstack memory layers.

关键词+子串匹配引擎（含中文 bigram），非语义/自然语言检索——整句丢进来靠 bigram 兜底，
但 query 拆成关键词效果最好（2026-07-15 记忆层评审 B5：旧自述 natural-language 与实现不符，
正是「拿整句用户 prompt 当 query → 十连 miss」的调用方心智根源）。"""
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

# 2026-07-15 记忆层评审 B3：移除裸 "project"/"gate" 宽词——它们把「质量门禁」类 query
# 扩展成整组项目门禁词、污染排序；保留 "project-gate" 复合词。
SYNONYM_GROUPS = [
    ("老项目", "已有项目", "旧项目", "继续项目", "上次项目", "之前项目", "project-gate", "项目上下文门禁", "项目门禁"),
    ("路由", "route", "routing", "route-guard", "skill-routing", "skill路由"),
    ("治理", "governance", "review", "review-queue", "质量门禁", "写入门禁"),
    ("记忆", "memory", "三层记忆", "semantic", "episodic"),
    ("原型", "prototype", "html-prototype", "framework", "母版"),
]

_CJK_RE = re.compile(r"[一-鿿]+")
# 中文虚词 bigram 黑名单字符：两字皆属此集的 bigram 不产出（纯功能词无检索信息量）
_CJK_STOP_CHARS = set("的了吗呢吧是在有和对把这那个我你他它们与及就都还也很要能会用去来上下中为到从请帮给个一")


def tokenize(text: str) -> list[str]:
    """拉丁/数字词 + 中文 bigram。旧实现 `[\\w#-]+` 把连续中文（含粘连英文）整体吞成一个
    巨 token（'给muse项目生成一个进度html' → 1 个 token），巨 token 永不是任何记录的子串
    → 整句中文 query 必然零命中，真实流量漏检 ~15%（2026-07-15 记忆层评审 B2，26 miss 尸检）。"""
    lowered = text.lower()
    tokens = []
    for token in re.findall(r"[a-z0-9_#-]+", lowered):
        if token in STOP_TOKENS or len(token) == 1:
            continue
        tokens.append(token)
    for run in _CJK_RE.findall(text):
        if len(run) < 2:
            continue
        if len(run) <= 4:
            tokens.append(run)  # 短语级中文词（如「路由」「触发词」）整体保留
        for i in range(len(run) - 1):
            bigram = run[i:i + 2]
            if bigram[0] in _CJK_STOP_CHARS and bigram[1] in _CJK_STOP_CHARS:
                continue
            tokens.append(bigram)
    expanded = set(tokens)
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
    """打分与分词同批调（B2 实证：只加 bigram 救查全杀精度）：
    - 同一 SYNONYM_GROUP 的多个命中折叠计 1 次（旧行为 route/routing/route-guard 各 +10，
      让老 stable fact 靠同义组刷分碾压新 episodic——B3 排序偏置的主源）；
    - 中文 bigram 命中计 5 分（半权：泛 bigram 如「项目」「生成」信息量低）；
    - exact-phrase 要求 query ≥2 字符（旧行为单字符 'x' 作为裸子串命中几乎一切记录）。"""
    text = as_text(record)
    hits = {token for token in tokens if token in text}
    remaining = set(hits)
    group_hits = 0
    for group in SYNONYM_GROUPS:
        group_terms = {term.lower() for term in group}
        if remaining & group_terms:
            group_hits += 1
            remaining -= group_terms
    full = {t for t in remaining if not (_CJK_RE.fullmatch(t) and len(t) == 2)}
    bigrams = remaining - full
    score = (group_hits + len(full)) * 10 + len(bigrams) * 5
    reasons = []
    if hits:
        reasons.append(f"keyword hits: {', '.join(sorted(hits))}")
    q = query.strip().lower()
    if len(q) >= 2 and q in text:
        score += 15
        reasons.append("exact query phrase")
    return score, reasons


def recency_score(record: dict) -> tuple[int, list[str]]:
    value = record_date(record)
    if not value:
        return 0, []
    age_days = max((dt.datetime.now(value.tzinfo) - value).days, 0)
    # 2026-07-15 B3 同批调：7 天内 5→10，让近期直接相关的 episodic 能与
    # stable(+10)+confidence(+8) 的老 facts 竞争（旧权重下 2 天前的相关记录排不进前 4）
    if age_days <= 7:
        score = 10
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


INCLUDE_ARCHIVE = False  # 由 main() 按 --include-archive 置位；默认关，零默认噪音/零性能回归


def load_archive_episodes() -> list[dict]:
    """归档 episodic（memory/episodic/archive/*.jsonl）。默认不进检索面。

    BACKLOG #21：归档层随时间增长到与热窗等量（2026-07-21 实测 archive 50 条 vs index 50 条），
    默认并入会引入噪音与性能回归，故做成显式开关而非默认行为。fail-open：读不动就当空。
    """
    archive_dir = MEMORY_DIR / "episodic" / "archive"
    if not archive_dir.is_dir():
        return []
    # noisy-*.jsonl 是「因是噪音而归档」的记录，与本开关初衷相悖，不并入检索面
    hot_ids = {str(r.get("id")) for r in read_jsonl(EPISODIC_INDEX) if r.get("id")}
    rows: list[dict] = []
    seen: set[str] = set()
    for path in sorted(archive_dir.glob("*.jsonl")):
        if path.name.startswith("noisy"):
            continue
        try:
            for row in read_jsonl(path):
                rid = str(row.get("id") or "")
                # 与热窗同 id 的归档副本跳过，否则同一条经验返回两行、各占一个 limit 名额
                if rid and (rid in hot_ids or rid in seen):
                    continue
                if rid:
                    seen.add(rid)
                row["_src"] = path       # 逐行标注真实来源，供 search() 正确溯源
                rows.append(row)
        except Exception:
            continue
    return rows


def load_layer(layer: str) -> tuple[Path, list[dict]]:
    if layer == "episodic":
        rows = read_jsonl(EPISODIC_INDEX)
        if INCLUDE_ARCHIVE:
            rows = rows + load_archive_episodes()
        return EPISODIC_INDEX, rows
    if layer == "semantic":
        return SEMANTIC_FACTS, parse_semantic_facts(SEMANTIC_FACTS)
    return EVAL_LOG, read_jsonl(EVAL_LOG)


def passes_filters(layer: str, record: dict, skill: str, topic: str, project: str = "") -> bool:
    if topic and topic.lower() not in str(record.get("topic", "")).lower() and topic.lower() not in as_text(record):
        return False
    if project and layer == "episodic":
        rec_proj = str(record.get("project", "")).strip()
        if rec_proj:
            if project.lower() != rec_proj.lower():
                return False
        elif project.lower() not in str(record.get("topic", "")).lower():  # 历史记录无 project 字段：只在 topic 上兜底匹配
            return False
    if not skill or skill == "*":
        return True
    if layer == "episodic":
        return list_matches(record.get("skills_used", []), skill)
    if layer == "semantic":
        return semantic_skill_matches(record, skill)
    return skill.lower() in str(record.get("skill_name", "")).lower()


def search(query: str, limit: int, layer: str, skill: str, topic: str, project: str = "") -> list[dict]:
    tokens = tokenize(query)
    layers = ["episodic", "semantic", "eval"] if layer == "all" else [layer]
    results = []
    for layer_name in layers:
        path, rows = load_layer(layer_name)
        for record in rows:
            if not passes_filters(layer_name, record, skill, topic, project):
                continue
            # 归档行的溯源路径必须是它自己的文件，否则 --include-archive 的命中会指着
            # index.jsonl 让人去错文件里找（_src 由 load_archive_episodes 逐行标注）
            rec_path = record.get("_src") or path
            result = score_record(layer_name, record, query, tokens, rec_path, skill, topic)
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
            # 2026-07-15 记忆层评审 B1c 修采集：miss 归因需要检索参数；测试流量打标
            # （e2e harness 设 MEMORY_SEARCH_SOURCE=test）+ cwd 尾巴兜底识别。
            # 无 source 字段的历史行 = 采集升级前的 legacy（54% 测试污染，决策统计只计新行）。
            "source": os.environ.get("MEMORY_SEARCH_SOURCE", "live"),
            "cwd_tail": "/".join(Path.cwd().parts[-2:]),
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
    # ADR-0006 decision protocol: review only after this many distinct sessions.
    DECISION_MIN_SESSIONS = 10
    DECISION_MATTERED_MIN = 3
    all_rows = read_retrieval_log()
    # 2026-07-15 B1b 修采集：决策统计只计「采集升级后的干净行」——legacy 行（无 source 字段）
    # 混有 54% e2e 测试流量且无法可靠区分；测试行（source≠live / e2e cwd）显式排除。
    legacy = [r for r in all_rows if "source" not in r]
    tagged = [r for r in all_rows if "source" in r]
    test_rows = [r for r in tagged
                 if str(r.get("source")) != "live" or "agent-e2e-test" in str(r.get("cwd_tail", ""))]
    rows = [r for r in tagged if r not in test_rows]
    searches = [r for r in rows if r.get("type", "search") == "search"]
    with_hits = [r for r in searches if (r.get("result_count") or 0) > 0]
    mattered = [r for r in rows if r.get("type") == "mattered" or r.get("mattered") is True]
    sessions = {r.get("session") for r in rows if r.get("session")}
    dates = {(r.get("ts") or "")[:10] for r in rows if r.get("ts")}
    n_searches = len(searches)
    n_with_hits = len(with_hits)
    n_mattered = len(mattered)
    n_sessions = len(sessions)
    n_dates = len(dates)
    # Robust time-axis: distinct sessions OR distinct calendar days, whichever
    # is larger. Guards against a stable session id collapsing all records to 1
    # (then distinct days still accumulate toward the ~10 review threshold).
    n_window = max(n_sessions, n_dates)
    print("ADR-0006 retrieval stats (measure-first):")
    print(f"  excluded:            {len(legacy)} legacy rows（采集升级前，~54% 测试污染不可靠） + {len(test_rows)} tagged test rows")
    print(f"  total searches:      {n_searches}")
    print(f"  searches with hits:  {n_with_hits}")
    print(f"  flagged 'mattered':  {n_mattered}")
    print(f"  distinct sessions:   {n_sessions}")
    print(f"  distinct days:       {n_dates}")
    print(f"  review window (max): {n_window} / {DECISION_MIN_SESSIONS}")
    print(f"  log: {RETRIEVAL_LOG}")
    print("  decision rule (review after ~10 distinct sessions/days):")
    print("    - mattered >= ~3                  -> build cheap self-turning version")
    print("    - searches~=0 OR with-hits~=0     -> freeze write-side (objective: reads unused)")
    print("    - mattered~=0 but with-hits high  -> INCONCLUSIVE; do NOT auto-freeze")

    # Self-computed verdict over the documented decision protocol.
    if n_window < DECISION_MIN_SESSIONS:
        verdict = "STILL-ACCUMULATING"
        reason = (f"need >= {DECISION_MIN_SESSIONS} distinct sessions/days; "
                  f"have {n_window}")
        decision_due = False
    elif n_mattered >= DECISION_MATTERED_MIN:
        verdict = "BUILD"
        reason = (f"mattered={n_mattered} >= {DECISION_MATTERED_MIN}; "
                  "cheap self-turning version worth it")
        decision_due = True
    elif n_searches == 0 or n_with_hits == 0:
        verdict = "FREEZE"
        reason = (f"searches={n_searches}, with_hits={n_with_hits}; "
                  "reads objectively unused -> freeze write-side")
        decision_due = True
    else:
        verdict = "INCONCLUSIVE"
        reason = (f"searches={n_searches}, with_hits={n_with_hits}, "
                  f"mattered={n_mattered} < {DECISION_MATTERED_MIN}; "
                  "reads hit but none flagged useful -> manual review / longer window")
        decision_due = True

    print(f"  computed verdict:    {verdict} ({reason})")
    if decision_due:
        print("  ⏰ DECISION DUE")
    else:
        print("  DECISION DUE: no")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("query", nargs="?", default="")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--layer", choices=["episodic", "semantic", "eval", "all"], default="all")
    parser.add_argument("--skill", default="*")
    parser.add_argument("--topic", default="")
    parser.add_argument("--project", default="", help="按项目作用域过滤 episodic（含历史记录文本兜底）")
    parser.add_argument("--include-archive", action="store_true",
                        help="把 memory/episodic/archive/*.jsonl 并入 episodic 检索面（默认关；BACKLOG #21）")
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

    global INCLUDE_ARCHIVE
    INCLUDE_ARCHIVE = bool(args.include_archive)

    rows = search(args.query, args.limit, args.layer, args.skill, args.topic, args.project)
    # Fail-safe instrumentation: logged AFTER computing results, swallows all errors,
    # and does not touch the search output below. 检索参数一并入 log（miss 归因需要）。
    log_retrieval(args.query, rows, extra={
        "layer": args.layer, "skill": args.skill, "topic": args.topic,
        "project": args.project, "limit": args.limit,
    })
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print_human(rows)
        # B4：归档层不在检索面——miss 时无法与「真无」区分，至少让检索者知道还有一层
        if args.layer in ("all", "episodic") and not INCLUDE_ARCHIVE:
            try:
                archive_dir = MEMORY_DIR / "episodic" / "archive"
                n_arch = sum(
                    1 for p in archive_dir.glob("*.jsonl")
                    for ln in p.read_text(encoding="utf-8").splitlines() if ln.strip()
                ) if archive_dir.is_dir() else 0
                if n_arch:
                    print(f"（另有 {n_arch} 条已归档 episodic 不在检索面——加 --include-archive 并入本次检索，或 grep memory/episodic/archive/）")
            except Exception:
                pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
