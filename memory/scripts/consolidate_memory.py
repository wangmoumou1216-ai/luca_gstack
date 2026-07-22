#!/usr/bin/env python3
"""Build a memory governance review queue and apply approved maintenance actions."""
import argparse
import json
import os
import re
import sys
import tempfile
from contextlib import contextmanager

try:
    import fcntl
except ImportError:  # 非 POSIX 环境 fail-open（与 append_episode 同策略）
    fcntl = None
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
try:
    import yaml as _yaml
    _HAS_YAML = True
except ImportError:
    _HAS_YAML = False


ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
MEMORY_DIR = ROOT / "memory"
SEMANTIC_DIR = MEMORY_DIR / "semantic"
CANDIDATES = SEMANTIC_DIR / "candidates.jsonl"
PROMOTED = SEMANTIC_DIR / "promoted-facts.yaml"
REVIEWS = SEMANTIC_DIR / "reviews.jsonl"
EPISODIC_INDEX = MEMORY_DIR / "episodic" / "index.jsonl"
EVAL_LOG = MEMORY_DIR / "evals" / "eval-log.jsonl"
EPISODIC_ARCHIVE = MEMORY_DIR / "episodic" / "archive"

NEGATIVE_MARKERS = ("不得", "不能", "禁止", "不应", "must not", "cannot", "can't", "not", "never")
POSITIVE_MARKERS = ("必须", "应当", "需要", "must", "should", "required")
POLARITY_MARKERS = NEGATIVE_MARKERS + POSITIVE_MARKERS


@contextmanager
def episodic_index_lock():
    """与 append_episode.index_lock 争同一把 .index.lock（ROOT 派生）：
    串行化 index 的 read→rewrite 与并发追加（audit F2-03）。
    fail-open：flock 不可用则无锁继续，绝不因加锁让治理崩。"""
    fd = None
    if fcntl is not None:
        try:
            lock = EPISODIC_INDEX.parent / ".index.lock"
            lock.parent.mkdir(parents=True, exist_ok=True)
            fd = os.open(str(lock), os.O_CREAT | os.O_RDWR, 0o644)
            fcntl.flock(fd, fcntl.LOCK_EX)
        except OSError as e:
            if fd is not None:
                try:
                    os.close(fd)
                except OSError:
                    pass
                fd = None
            sys.stderr.write(f"[consolidate] ⚠️ index lock 不可用 ({e})；无锁继续\n")
    try:
        yield
    finally:
        if fd is not None:
            try:
                fcntl.flock(fd, fcntl.LOCK_UN)
            except OSError:
                pass
            try:
                os.close(fd)
            except OSError:
                pass


def atomic_write_text(path: Path, text: str) -> None:
    """崩溃安全写：先写同目录临时文件并 fsync，再 os.replace 原子替换目标。
    避免 truncate→write 窗口被中断时丢失整份文件（candidates/reviews/index 被 gitignore，
    无 git 兜底，旧 write_text 截断重写在无人值守崩溃下会静默不可逆丢队列）。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            rows.append(value)
    return rows


def read_jsonl_with_raw(path: Path) -> list[tuple[dict | None, str]]:
    """返回 (parsed, raw)；解析失败/非 dict 的行以 (None, raw) 保留——重写路径必须原样带走
    这些行，否则整文件重写会把手滑的半截行静默蒸发（candidates/reviews 被 gitignore，无 git 兜底）。"""
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            rows.append((None, line))
            continue
        rows.append((value if isinstance(value, dict) else None, line))
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


def parse_promoted_facts(path: Path) -> list[dict]:
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
            return [fact for fact in facts if isinstance(fact, dict)]
        except Exception:
            pass
    facts = []
    current = None
    current_key = ""
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or stripped == "facts:" or stripped == "...":
            continue
        if stripped.startswith("- id:"):
            if current:
                facts.append(current)
            current = {"id": clean_scalar(stripped.split(":", 1)[1])}
            current_key = ""
            continue
        if current is None:
            continue
        if ":" not in stripped:
            if current_key == "fact" and current.get("fact"):
                current["fact"] = f"{current['fact']} {stripped.strip().strip(chr(34)).strip(chr(39))}".strip()
            continue
        key, value = stripped.split(":", 1)
        current[key.strip()] = clean_scalar(value)
        current_key = key.strip()
    if current:
        facts.append(current)
    return facts


def review_decisions(reviews: list[dict]) -> dict[str, str]:
    decisions = {}
    for review in reviews:
        cid = str(review.get("candidate_id", "")).strip()
        decision = str(review.get("decision", "")).strip().lower()
        if cid and decision:
            decisions[cid] = decision
    return decisions


def parse_datetime(value: str):
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        try:
            parsed = datetime.strptime(text[:10], "%Y-%m-%d")
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def normalize_fact(text: str) -> str:
    return "".join(re.findall(r"[\w#]+", str(text).lower()))


def duplicate_candidates(candidates: list[dict], promoted: list[dict]) -> tuple[list[dict], set[str]]:
    groups = []
    duplicate_ids = set()
    by_domain = defaultdict(list)
    for candidate in candidates:
        record = dict(candidate)
        record["kind"] = "candidate"
        by_domain[candidate.get("domain", "")].append(record)
    for fact in promoted:
        record = dict(fact)
        record["kind"] = "promoted"
        by_domain[fact.get("domain", "")].append(record)
    for domain, rows in by_domain.items():
        seen_pairs = set()
        for index, left in enumerate(rows):
            left_norm = normalize_fact(left.get("fact", ""))
            if not left_norm:
                continue
            group = [left]
            for right in rows[index + 1 :]:
                right_norm = normalize_fact(right.get("fact", ""))
                if not right_norm:
                    continue
                same = left_norm == right_norm
                contains = len(left_norm) >= 12 and len(right_norm) >= 12 and (
                    left_norm in right_norm or right_norm in left_norm
                )
                if same or contains:
                    pair = tuple(sorted([str(left.get("id", "")), str(right.get("id", ""))]))
                    if pair in seen_pairs:
                        continue
                    seen_pairs.add(pair)
                    group.append(right)
            if len(group) > 1:
                candidate_ids = sorted({str(item.get("id", "")) for item in group if item.get("id") and item.get("kind") == "candidate"})
                promoted_ids = sorted({str(item.get("id", "")) for item in group if item.get("id") and item.get("kind") == "promoted"})
                if not candidate_ids:
                    continue
                duplicate_ids.update(candidate_ids)
                groups.append(
                    {
                        "domain": domain,
                        "candidate_ids": candidate_ids,
                        "promoted_ids": promoted_ids,
                        "facts": [str(item.get("fact", "")) for item in group],
                    }
                )
    return groups, duplicate_ids


def fact_polarity(fact: str) -> str:
    text = str(fact).lower()
    if any(marker in text for marker in NEGATIVE_MARKERS):
        return "negative"
    if any(marker in text for marker in POSITIVE_MARKERS):
        return "positive"
    return "neutral"


def polarity_core(fact: str) -> str:
    text = str(fact).lower()
    for marker in sorted(POLARITY_MARKERS, key=len, reverse=True):
        text = text.replace(marker, " ")
    return normalize_fact(text)


def similar_core(left: str, right: str) -> bool:
    if not left or not right:
        return False
    if left == right:
        return True
    return len(left) >= 12 and len(right) >= 12 and (left in right or right in left)


def conflicts(candidates: list[dict], promoted: list[dict]) -> tuple[list[dict], set[str]]:
    rows = []
    for candidate in candidates:
        record = dict(candidate)
        record["kind"] = "candidate"
        rows.append(record)
    for fact in promoted:
        record = dict(fact)
        record["kind"] = "promoted"
        rows.append(record)

    queue = []
    conflict_ids = set()
    by_domain = defaultdict(list)
    for row in rows:
        by_domain[row.get("domain", "")].append(row)

    seen = set()
    for domain, records in by_domain.items():
        for index, left in enumerate(records):
            left_polarity = fact_polarity(left.get("fact", ""))
            if left_polarity == "neutral":
                continue
            for right in records[index + 1 :]:
                right_polarity = fact_polarity(right.get("fact", ""))
                if right_polarity == "neutral" or right_polarity == left_polarity:
                    continue
                if not similar_core(polarity_core(left.get("fact", "")), polarity_core(right.get("fact", ""))):
                    continue
                ids = tuple(sorted([str(left.get("id", "")), str(right.get("id", ""))]))
                if ids in seen:
                    continue
                seen.add(ids)
                conflict_ids.update(id_ for id_ in ids if id_)
                queue.append(
                    {
                        "domain": domain,
                        "ids": list(ids),
                        "facts": [str(left.get("fact", "")), str(right.get("fact", ""))],
                        "kinds": [left.get("kind"), right.get("kind")],
                    }
                )
    return queue, conflict_ids


def stale_candidates(candidates: list[dict], decisions: dict[str, str], days: int = 14) -> list[dict]:
    now = datetime.now(timezone.utc)
    queue = []
    for candidate in candidates:
        cid = str(candidate.get("id", ""))
        if decisions.get(cid) in {"promoted", "rejected"}:
            continue
        created = parse_datetime(candidate.get("created_at", ""))
        if not created:
            continue
        age_days = (now - created).days
        if age_days > days:
            queue.append({"id": cid, "domain": candidate.get("domain", ""), "age_days": age_days, "fact": candidate.get("fact", "")})
    return queue


def has_review_metadata(candidate: dict) -> bool:
    return all(str(candidate.get(field, "")).strip() for field in ("evidence", "scope", "reviewer"))


def promotion_ready(candidates: list[dict], duplicate_ids: set[str], conflict_ids: set[str], decisions: dict[str, str]) -> list[dict]:
    ready = []
    for candidate in candidates:
        cid = str(candidate.get("id", ""))
        if decisions.get(cid) in {"promoted", "rejected"}:
            continue
        if cid in duplicate_ids or cid in conflict_ids:
            continue
        if candidate.get("proposed_stable") is not True:
            continue
        if str(candidate.get("confidence", "")).lower() != "high":
            continue
        if not has_review_metadata(candidate):
            continue
        ready.append(
            {
                "id": cid,
                "domain": candidate.get("domain", ""),
                "fact": candidate.get("fact", ""),
                "evidence": candidate.get("evidence", ""),
                "scope": candidate.get("scope", ""),
                "reviewer": candidate.get("reviewer", ""),
            }
        )
    return ready


def awaiting_approval(candidates: list[dict], duplicate_ids: set[str], conflict_ids: set[str], decisions: dict[str, str]) -> list[dict]:
    """候选满足全部晋升条件但 proposed_stable 仍为 False —— 即提案者已 --stable 请求晋升，
    却未经人工闸门 consolidate --set-stable 批准。红线 SC-20260523-003：proposed_stable
    只能由人工翻转，提案者自评不得直接晋升。本桶让"待你批准"候选在治理命令中可见，
    供人工 `consolidate_memory.py --set-stable <id>` 放行后才进 promotion_ready。"""
    pending = []
    for candidate in candidates:
        cid = str(candidate.get("id", ""))
        if decisions.get(cid) in {"promoted", "rejected"}:
            continue
        if cid in duplicate_ids or cid in conflict_ids:
            continue
        if candidate.get("proposed_stable") is True:
            continue  # 已批准 → 属 promotion_ready
        if not candidate.get("stable_requested"):
            continue  # 提案者未请求 stable
        if str(candidate.get("confidence", "")).lower() != "high":
            continue
        if not has_review_metadata(candidate):
            continue
        pending.append(
            {
                "id": cid,
                "domain": candidate.get("domain", ""),
                "fact": candidate.get("fact", ""),
                "reviewer": candidate.get("reviewer", ""),
            }
        )
    return pending


def noisy_episodes(episodes: list[dict]) -> list[dict]:
    queue = []
    for episode in episodes:
        outcomes = episode.get("outcomes", [])
        if not isinstance(outcomes, list):
            outcomes = [outcomes] if outcomes else []
        decision = str(episode.get("decision", "")).strip()
        next_risk = str(episode.get("next_risk", "")).strip()
        topic = str(episode.get("topic", "")).strip()
        summary = str(episode.get("summary", "")).strip()
        placeholder = (
            re.fullmatch(r"session\s+\d+", topic.lower() or "") is not None
            or re.fullmatch(r"decision-\d+", decision.lower() or "") is not None
            or re.fullmatch(r"summary\s+\d+", summary.lower() or "") is not None
        )
        if decision and not placeholder:
            continue
        if next_risk and not placeholder:
            continue
        if outcomes and not placeholder:
            continue
        queue.append({"id": episode.get("id", ""), "topic": episode.get("topic", ""), "date": episode.get("date", "")})
    return queue


def normalize_finding(finding: str) -> str:
    return " ".join(str(finding).lower().split())


def failing_eval_patterns(evals: list[dict]) -> list[dict]:
    counter = Counter()
    examples = {}
    for record in evals:
        status = str(record.get("quality_gate_status") or record.get("gate_status") or "").upper()
        if status != "FAIL":
            continue
        skill = str(record.get("skill_name") or record.get("skill") or "")
        findings = record.get("quality_gate_findings") or record.get("findings") or []
        if isinstance(findings, str):
            findings = [findings]
        for finding in findings:
            normalized = normalize_finding(finding)
            if not skill or not normalized:
                continue
            key = (skill, normalized)
            counter[key] += 1
            examples.setdefault(key, str(finding))
    return [
        {"skill_name": skill, "finding": examples[(skill, finding)], "normalized_finding": finding, "count": count}
        for (skill, finding), count in sorted(counter.items())
        if count > 1
    ]


def yaml_scalar(value) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def yaml_list(values) -> str:
    if isinstance(values, str):
        values = [item.strip() for item in values.split(",") if item.strip()]
    if not isinstance(values, list):
        values = [values] if values else []
    return "[" + ", ".join(yaml_scalar(value) for value in values) + "]"


def append_optional_metadata(entry: str, candidate: dict) -> str:
    lines = [entry.rstrip()]
    for key in ("evidence", "reviewer", "valid_until", "supersedes"):
        value = candidate.get(key)
        if str(value or "").strip():
            lines.append(f"    {key}: {yaml_scalar(value)}")
    if str(candidate.get("scope", "")).strip():
        lines.append(f"    scope: {yaml_scalar(candidate.get('scope'))}")
    if candidate.get("tags"):
        lines.append(f"    tags: {yaml_list(candidate.get('tags'))}")
    return "\n".join(lines) + "\n"


def sync_claude_fallback(candidate: dict) -> None:
    claude_md = ROOT / "CLAUDE.md"
    if not claude_md.exists():
        return
    content = claude_md.read_text(encoding="utf-8")
    marker = "> 维护规则："
    fact_id = str(candidate.get("id", ""))
    allow = ROOT / "memory" / "semantic" / "static-fallback-allowlist.txt"
    allowed = {ln.split("#", 1)[0].strip() for ln in allow.read_text(encoding="utf-8").splitlines() if ln.split("#", 1)[0].strip()} if allow.exists() else set()
    # 非白名单(宪法级/红线)事实不镜像进每-session SF；只留 promoted-facts.yaml 走 search_memory
    if not fact_id or fact_id not in allowed:
        return  # by design：非白名单静默跳过是正确行为
    if marker not in content:
        # 应镜像但镜像通道断了 → 不再静默（audit F2-08）
        sys.stderr.write(f"[consolidate] ⚠️ CLAUDE.md 缺 '> 维护规则：' marker，白名单事实 {fact_id} 无法镜像进 SF 节\n")
        return
    if fact_id in content:
        return  # 已在 CLAUDE.md（注意：全文匹配，prose 引用会误判已镜像——audit F2-08，反向校验挂 BACKLOG）
    new_line = f"- [{fact_id} / {candidate.get('domain', '')}] {candidate.get('fact', '')}\n"
    atomic_write_text(claude_md, content.replace(marker, new_line + "\n" + marker))


def promoted_ids(promoted: list[dict]) -> set[str]:
    return {str(item.get("id", "")) for item in promoted if item.get("id")}


def append_promoted(candidate: dict) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = (
        f"  - id: {candidate.get('id', '')}\n"
        f"    domain: {candidate.get('domain', '')}\n"
        f"    fact: {yaml_scalar(candidate.get('fact', ''))}\n"
        f"    confidence: {candidate.get('confidence', 'high')}\n"
        f"    stable: true\n"
        f"    added: {today}\n"
        f"    source: {yaml_scalar(candidate.get('source') or candidate.get('evidence') or 'consolidate_memory')}\n"
    )
    entry = append_optional_metadata(entry, candidate)
    PROMOTED.parent.mkdir(parents=True, exist_ok=True)
    if not PROMOTED.exists():
        atomic_write_text(PROMOTED, f"version: 1\nfacts:\n{entry}")
    else:
        content = PROMOTED.read_text(encoding="utf-8")
        if "facts:" not in content:
            content = content.rstrip() + "\nfacts:\n"
        atomic_write_text(PROMOTED, content.rstrip() + "\n" + entry)
    sync_claude_fallback(candidate)


def append_review(candidate_id: str, reviewer: str, decision: str, reason: str) -> None:
    REVIEWS.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "candidate_id": candidate_id,
        "decision": decision,
        "reviewer": reviewer,
        "reason": reason,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "source": "consolidate_memory.py",
    }
    with REVIEWS.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def promote_ready_candidates(candidates: list[dict], ready: list[dict], dry_run: bool) -> list[str]:
    ready_ids = {item["id"] for item in ready}
    existing = promoted_ids(parse_promoted_facts(PROMOTED))
    promoted = []
    for candidate in candidates:
        cid = str(candidate.get("id", ""))
        if cid not in ready_ids or cid in existing:
            continue
        promoted.append(cid)
        if not dry_run:
            append_promoted(candidate)
            append_review(cid, str(candidate.get("reviewer") or "consolidate_memory"), "promoted", "promotion_ready review queue item")
    return promoted


def set_stable(ids: list, dry_run: bool, reviewer: str = "") -> dict:
    """人工复核后批准：把指定候选 id 的 proposed_stable 置 True（缺失的「候选→可晋升」人工闸门）。

    SC-20260615-001：此前无任何路径把已存在候选置 True，导致 promotion_ready 永远为空、0 晋升。
    红线 SC-20260523-003：本动作只翻转批准旗标，**不**直接写 promoted-facts；实际晋升仍由
    promotion_ready 门禁（confidence=high + evidence/scope/reviewer + 非重复/冲突）裁决。
    批准留痕：每次翻转写一条 decision=approved_stable 的 review 记录（操作者=--reviewer），
    否则晋升台账里的 reviewer 只剩提案者自填字段，人工闸门不可审计。
    """
    want = {str(i) for i in ids}
    rows = read_jsonl_with_raw(CANDIDATES)
    set_done, out_lines, found, reviewer_filled = [], [], set(), []
    for candidate, raw in rows:
        if candidate is None:
            out_lines.append(raw.rstrip())
            continue
        cid = str(candidate.get("id", ""))
        if cid in want:
            found.add(cid)
            if candidate.get("proposed_stable") is not True:
                candidate["proposed_stable"] = True
                set_done.append(cid)
            # 2026-07-21：人工放行同时回填候选本体的 reviewer。
            # 缺口实证：promotion_ready 的 has_review_metadata 要求候选自带 evidence/scope/reviewer；
            # 提案时未传 --reviewer 的候选（reviewer=""）即便人工 --set-stable 放行，仍永远卡在门禁外，
            # 而署名只写进了 reviews.jsonl、不回流本体——与 SC-20260615-001 同型（缺一条写入路径）。
            # 落盘条件必须含本回填：已 proposed_stable 的候选 set_done 为空，只按 set_done 落盘会把回填丢在内存里。
            if reviewer and not str(candidate.get("reviewer", "")).strip():
                candidate["reviewer"] = reviewer
                reviewer_filled.append(cid)
            out_lines.append(json.dumps(candidate, ensure_ascii=False))
        else:
            out_lines.append(raw.rstrip())
    if not dry_run and (set_done or reviewer_filled):
        atomic_write_text(CANDIDATES, ("\n".join(out_lines) + "\n") if out_lines else "")
        for cid in set_done:
            append_review(cid, reviewer or "unattributed", "approved_stable", "人工闸门放行：proposed_stable 置 True")
        for cid in reviewer_filled:
            append_review(cid, reviewer or "unattributed", "reviewer_backfilled", "人工放行时回填候选 reviewer（解 has_review_metadata 门禁）")
    return {
        "set_stable": set_done,
        "reviewer_filled": reviewer_filled,
        "already_stable": sorted(found - set(set_done)),
        "not_found": sorted(want - found),
    }


def reject_candidates(ids: list, reason: str, reviewer: str, dry_run: bool) -> dict:
    """人工拒绝：写 reviews.jsonl decision=rejected（拒绝与批准对称留痕）。
    候选本体不在此处删除——随 --archive-reviewed 按 decisions 归档移出队列。
    此前拒绝只能手工编辑 jsonl（8 条历史手工拒绝为证），本函数是缺失的机器动词。"""
    want = {str(i) for i in ids}
    rows = read_jsonl_with_raw(CANDIDATES)
    existing = {str(c.get("id", "")) for c, _raw in rows if c is not None}
    rejected = sorted(want & existing)
    if not dry_run:
        for cid in rejected:
            append_review(cid, reviewer or "unattributed", "rejected", reason or "人工拒绝（未附理由）")
    return {"rejected": rejected, "not_found": sorted(want - existing)}


def archive_reviewed_candidates(candidate_rows: list[tuple[dict, str]], decisions: dict[str, str], promoted: list[dict], dry_run: bool) -> list[str]:
    promoted_id_set = promoted_ids(promoted)
    archived = []
    remaining = []
    by_year = defaultdict(list)
    for candidate, raw in candidate_rows:
        if candidate is None:
            remaining.append(raw)  # 畸形行原样保留在队列文件，绝不归档/丢弃
            continue
        cid = str(candidate.get("id", ""))
        status = str(candidate.get("status", "")).lower()
        reviewed = cid in promoted_id_set or decisions.get(cid) in {"promoted", "rejected"} or status in {"promoted", "rejected"}
        if reviewed:
            archived.append(cid)
            created = parse_datetime(candidate.get("created_at", "")) or datetime.now(timezone.utc)
            by_year[created.strftime("%Y")].append(raw)
        else:
            remaining.append(raw)
    if not dry_run and archived:
        archive_dir = SEMANTIC_DIR / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        for year, lines in by_year.items():
            with (archive_dir / f"candidates-{year}.jsonl").open("a", encoding="utf-8") as handle:
                for line in lines:
                    handle.write(line.rstrip() + "\n")
        atomic_write_text(CANDIDATES, ("\n".join(remaining) + "\n") if remaining else "")
    return archived


def archive_noisy_episode_rows(episode_rows: list[tuple[dict, str]], noisy: list[dict], dry_run: bool) -> list[str]:
    noisy_ids = {str(item.get("id", "")) for item in noisy if item.get("id")}
    archived = []
    remaining = []
    by_year = defaultdict(list)
    for episode, raw in episode_rows:
        eid = str(episode.get("id", "")) if episode is not None else ""
        if episode is not None and eid in noisy_ids:
            archived.append(eid)
            parsed = parse_datetime(episode.get("date", "")) or datetime.now(timezone.utc)
            by_year[parsed.strftime("%Y")].append(raw)
        else:
            remaining.append(raw)
    if not dry_run and archived:
        EPISODIC_ARCHIVE.mkdir(parents=True, exist_ok=True)
        # 与 append_episode 争同一把 .index.lock：锁内**重读**→归档→重写。
        # 无锁的 stale read→rewrite 会吞掉并行 Stop 链路刚追加的行（audit F2-03）。
        with episodic_index_lock():
            fresh_rows = read_jsonl_with_raw(EPISODIC_INDEX)
            archived = []
            remaining = []
            by_year = defaultdict(list)
            for episode, raw in fresh_rows:
                eid = str(episode.get("id", "")) if episode is not None else ""
                if episode is not None and eid in noisy_ids:
                    archived.append(eid)
                    parsed = parse_datetime(episode.get("date", "")) or datetime.now(timezone.utc)
                    by_year[parsed.strftime("%Y")].append(raw)
                else:
                    remaining.append(raw)
            for year, lines in by_year.items():
                with (EPISODIC_ARCHIVE / f"noisy-{year}.jsonl").open("a", encoding="utf-8") as handle:
                    for line in lines:
                        handle.write(line.rstrip() + "\n")
            atomic_write_text(EPISODIC_INDEX, ("\n".join(remaining) + "\n") if remaining else "")
    return archived


def build_queue() -> tuple[dict, list[dict], list[tuple[dict, str]], list[dict], dict[str, str], list[tuple[dict, str]]]:
    candidate_rows = read_jsonl_with_raw(CANDIDATES)
    candidates = [row for row, _raw in candidate_rows if row is not None]
    episode_rows = read_jsonl_with_raw(EPISODIC_INDEX)
    episodes = [row for row, _raw in episode_rows if row is not None]
    promoted = parse_promoted_facts(PROMOTED)
    reviews = read_jsonl(REVIEWS)
    decisions = review_decisions(reviews)
    duplicate_queue, duplicate_ids = duplicate_candidates(candidates, promoted)
    conflict_queue, conflict_ids = conflicts(candidates, promoted)
    queue = {
        "duplicate_candidates": duplicate_queue,
        "conflicts": conflict_queue,
        "stale_candidates": stale_candidates(candidates, decisions),
        "promotion_ready": promotion_ready(candidates, duplicate_ids, conflict_ids, decisions),
        "awaiting_approval": awaiting_approval(candidates, duplicate_ids, conflict_ids, decisions),
        "noisy_episodes": noisy_episodes(episodes),
        "failing_eval_patterns": failing_eval_patterns(read_jsonl(EVAL_LOG)),
        # 区分「无源」与「有源无失败」：二者此前同为空 list，人看不出是 eval 没接通还是真没失败模式
        # （BACKLOG #19；冻结已于 2026-07-15 解除，eval-log 现为活跃写入面）
        "eval_source_present": EVAL_LOG.exists(),
        "actions": {"promoted": [], "archived": [], "archived_noisy": []},
    }
    return queue, candidates, candidate_rows, promoted, decisions, episode_rows


def print_human(queue: dict, dry_run: bool) -> None:
    mode = "DRY RUN" if dry_run else "WRITE ENABLED"
    print(f"Memory consolidation review queue ({mode})")
    for key in (
        "duplicate_candidates",
        "conflicts",
        "stale_candidates",
        "promotion_ready",
        "awaiting_approval",
        "noisy_episodes",
        "failing_eval_patterns",
    ):
        rows = queue.get(key, [])
        suffix = ""
        if key == "failing_eval_patterns" and not queue.get("eval_source_present", True):
            suffix = "  (eval-log 不存在——无源，非『有源无失败』)"
        print(f"\n{key}: {len(rows)}{suffix}")
        for row in rows:
            print(f"- {json.dumps(row, ensure_ascii=False)}")
    actions = queue.get("actions", {})
    if actions.get("promoted") or actions.get("archived") or actions.get("set_stable") or actions.get("rejected"):
        print("\nactions:")
        ss = actions.get("set_stable")
        if ss:
            print(f"- set_stable: {', '.join(ss.get('set_stable', [])) or '-'} (not_found: {', '.join(ss.get('not_found', [])) or '-'})")
        rj = actions.get("rejected")
        if rj:
            print(f"- rejected: {', '.join(rj.get('rejected', [])) or '-'} (not_found: {', '.join(rj.get('not_found', [])) or '-'})")
        print(f"- promoted: {', '.join(actions.get('promoted', [])) or '-'}")
        print(f"- archived: {', '.join(actions.get('archived', [])) or '-'}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="force no writes even with action flags")
    parser.add_argument("--json", action="store_true", help="print structured JSON")
    parser.add_argument("--promote-ready", action="store_true", help="promote eligible candidates and record reviews")
    parser.add_argument("--archive-reviewed", action="store_true", help="move promoted/rejected candidates into semantic/archive")
    parser.add_argument("--archive-noisy", action="store_true", help="move noisy episodic records out of the hot index")
    parser.add_argument("--set-stable", nargs="+", metavar="ID", default=None,
                        help="人工复核后批准：把候选 ids 的 proposed_stable 置 True（晋升仍走 promotion_ready 门禁，不直接写 promoted-facts）")
    parser.add_argument("--reject", nargs="+", metavar="ID", default=None,
                        help="人工拒绝候选：写 reviews.jsonl decision=rejected（配合 --archive-reviewed 同次归档）")
    parser.add_argument("--reason", default="", help="--reject 的拒绝理由（写入审计记录）")
    parser.add_argument("--reviewer", default="", metavar="NAME",
                        help="操作者署名：--set-stable/--reject 必填，写入 reviews.jsonl 审计记录")
    args = parser.parse_args()

    if (args.set_stable or args.reject) and not args.reviewer.strip():
        print("--set-stable/--reject 需要 --reviewer <你的名字>（人工闸门审计留痕）", file=sys.stderr)
        return 2

    write_enabled = (args.promote_ready or args.archive_reviewed or args.archive_noisy
                     or args.set_stable or args.reject) and not args.dry_run

    # set-stable/reject 先于 build_queue：写盘后 promotion_ready/decisions 才能看到结果
    # （支持 --set-stable X --promote-ready、--reject Y --archive-reviewed 单次完成）
    set_stable_result = set_stable(args.set_stable, dry_run=not write_enabled, reviewer=args.reviewer) if args.set_stable else None
    reject_result = reject_candidates(args.reject, args.reason, args.reviewer, dry_run=not write_enabled) if args.reject else None

    queue, candidates, candidate_rows, promoted, decisions, episode_rows = build_queue()
    if set_stable_result is not None:
        queue["actions"]["set_stable"] = set_stable_result
    if reject_result is not None:
        queue["actions"]["rejected"] = reject_result

    if args.promote_ready:
        queue["actions"]["promoted"] = promote_ready_candidates(candidates, queue["promotion_ready"], dry_run=not write_enabled)
        if write_enabled:
            promoted = parse_promoted_facts(PROMOTED)
    if args.archive_reviewed:
        queue["actions"]["archived"] = archive_reviewed_candidates(candidate_rows, decisions, promoted, dry_run=not write_enabled)
    if args.archive_noisy:
        queue["actions"]["archived_noisy"] = archive_noisy_episode_rows(episode_rows, queue["noisy_episodes"], dry_run=not write_enabled)

    if args.json:
        print(json.dumps(queue, ensure_ascii=False, indent=2))
    else:
        print_human(queue, dry_run=not write_enabled)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
