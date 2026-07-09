#!/usr/bin/env python3
"""Append an episodic memory entry (session summary).

Writes to:
  - memory/episodic/index.jsonl  (structured, versioned)
  - memory/episodic/sessions/[date]-[slug].md  (raw, gitignored)

Usage:
  python3 memory/scripts/append_episode.py \
    --topic "html-prototype CRM列表页" \
    --summary "完成了纷享销客 CRM 列表页 HTML 原型" \
    --skills "html-prototype" \
    --outcomes "docs/prototype/crm-list.html" \
    --blockers "framework/ 路径需要绝对引用"
"""
import argparse
import json
import os
import re
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

try:
    import fcntl
except ImportError:  # 非 POSIX 平台 → fail-open 无锁
    fcntl = None

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
INDEX = ROOT / "memory" / "episodic" / "index.jsonl"
SESSIONS = ROOT / "memory" / "episodic" / "sessions"
ARCHIVE = ROOT / "memory" / "episodic" / "archive"
LOCK = ROOT / "memory" / "episodic" / ".index.lock"


@contextmanager
def index_lock():
    """串行化 seq 分配 → 追加 → rotate,防并发 dup-ID / rotate 整文件覆盖丢行。
    锁路径从 ROOT 派生 → 同一 index 的并发写者(含 muse MEMORY_ROOT redirect)争同一锁。
    fail-open:flock 不可用则无锁继续(单进程仍正确),绝不因加锁让记忆写入崩。"""
    fd = None
    if fcntl is not None:
        try:
            LOCK.parent.mkdir(parents=True, exist_ok=True)
            fd = os.open(str(LOCK), os.O_CREAT | os.O_RDWR, 0o644)
            fcntl.flock(fd, fcntl.LOCK_EX)
        except OSError as e:
            if fd is not None:
                try:
                    os.close(fd)
                except OSError:
                    pass
                fd = None
            sys.stderr.write(f"[append_episode] ⚠️  index lock 不可用 ({e});无锁继续\n")
    try:
        yield
    finally:
        if fd is not None:
            try:
                fcntl.flock(fd, fcntl.LOCK_UN)
            finally:
                os.close(fd)


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[\s_]+", "-", text.strip())
    return text[:40]


def active_project() -> str:
    """当前激活项目名，从 docs 软链目标 .../Desktop/项目/<name>/docs 推导。
    无激活项目（软链缺失/损坏）时返回 ""。"""
    docs = ROOT / "docs"
    try:
        target = os.readlink(docs)
    except OSError:
        return ""
    marker = "/项目/"
    idx = target.find(marker)
    if idx == -1:
        return ""
    rest = target[idx + len(marker):]
    return rest.split("/")[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--skills", default="", help="comma-separated skill names")
    parser.add_argument("--outcomes", default="", help="comma-separated outcome paths/items")
    parser.add_argument("--blockers", default="", help="comma-separated blockers encountered")
    parser.add_argument("--decision", default="", help="non-obvious judgment made this session (why, not what)")
    parser.add_argument("--next-risk", default="", help="anticipated risk or open question for next session")
    parser.add_argument("--project", default="", help="项目作用域；留空则自动从 docs 软链推导（框架级 session 用 --meta 禁止推导）")
    parser.add_argument("--meta", action="store_true",
                        help="框架级/meta session：不归属任何项目，跳过 docs 软链自动推导（防误标，见 EP-20260605-011）")
    args = parser.parse_args()

    project = "" if args.meta else (args.project.strip() or active_project())

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    slug = slugify(args.topic)
    session_file = f"sessions/{today}-{slug}.md"

    skills = [s.strip() for s in args.skills.split(",") if s.strip()]
    outcomes = [o.strip() for o in args.outcomes.split(",") if o.strip()]
    blockers = [b.strip() for b in args.blockers.split(",") if b.strip()]
    decision = args.decision.strip()
    next_risk = getattr(args, "next_risk", "").strip()

    if not decision and (outcomes or blockers):
        sys.stderr.write(
            f"[append_episode] ⚠️  --decision 未填写。"
            f"本次有 {len(outcomes)} 个产出{'和 ' + str(len(blockers)) + ' 个阻碍' if blockers else ''}，"
            f"如果做过非显而易见的判断，请补充 --decision。\n"
        )

    # 临界区：seq 分配 → 建 record → 追加 → rotate 必须整体串行，否则并发写撞号
    # (dup-ID, EP-20260701-051 曾重复) 或被 rotate 整文件覆盖丢行 (踩踏, EP-20260629-052)。
    with index_lock():
        # 行数当序号会在归档移行/并发追加后撞号；扫 index+archive 取最大序号+1 保证单调
        seq = 0
        for src in (INDEX, *(sorted(ARCHIVE.glob("*.jsonl")) if ARCHIVE.exists() else ())):
            if src.exists():
                for m in re.finditer(r'"EP-\d{8}-(\d{3})"', src.read_text(encoding="utf-8")):
                    seq = max(seq, int(m.group(1)))
        ep_id = f"EP-{today.replace('-', '')}-{seq + 1:03d}"

        record = {
            "id": ep_id,
            "date": today,
            "topic": args.topic,
            **({"project": project} if project else {}),
            "skills_used": skills,
            "outcomes": outcomes,
            "blockers": blockers,
            **({"decision": decision} if decision else {}),
            **({"next_risk": next_risk} if next_risk else {}),
            "file": session_file,
        }

        INDEX.parent.mkdir(parents=True, exist_ok=True)
        with INDEX.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        rotate_index(today)

    SESSIONS.mkdir(parents=True, exist_ok=True)
    raw_path = ROOT / "memory" / "episodic" / session_file
    md = f"""# {args.topic}

**Date:** {today}
**ID:** {ep_id}

## Summary

{args.summary}

## Skills Used

{chr(10).join(f'- {s}' for s in skills) if skills else '_(none recorded)_'}

## Outcomes

{chr(10).join(f'- {o}' for o in outcomes) if outcomes else '_(none recorded)_'}

## Blockers

{chr(10).join(f'- {b}' for b in blockers) if blockers else '_(none)_'}

## Decision

{decision if decision else '_(not recorded — add --decision if this session had non-obvious judgments)_'}

## Next Risk

{next_risk if next_risk else '_(not recorded)_'}
"""
    raw_path.write_text(md, encoding="utf-8")

    print(json.dumps({"episode": ep_id, "file": session_file}, ensure_ascii=False))
    return 0


def rotate_index(today: str) -> None:
    max_episodes = int(os.environ.get("MEMORY_MAX_EPISODES", "50"))
    if max_episodes <= 0 or not INDEX.exists():
        return
    lines = [line for line in INDEX.read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(lines) <= max_episodes:
        return
    overflow = lines[:-max_episodes]
    keep = lines[-max_episodes:]
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    archive_path = ARCHIVE / f"{today[:4]}.jsonl"
    with archive_path.open("a", encoding="utf-8") as f:
        for line in overflow:
            f.write(line + "\n")
    # 崩溃安全（audit F2-04）：rotate 重写走原子替换，truncate→write 中断不再丢整份 index
    from consolidate_memory import atomic_write_text
    atomic_write_text(INDEX, "\n".join(keep) + "\n")


if __name__ == "__main__":
    raise SystemExit(main())
