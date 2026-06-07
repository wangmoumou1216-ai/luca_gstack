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
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
INDEX = ROOT / "memory" / "episodic" / "index.jsonl"
SESSIONS = ROOT / "memory" / "episodic" / "sessions"
ARCHIVE = ROOT / "memory" / "episodic" / "archive"


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
    parser.add_argument("--project", default="", help="项目作用域；留空则自动从 docs 软链推导")
    args = parser.parse_args()

    project = args.project.strip() or active_project()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    count = sum(1 for l in INDEX.read_text(encoding="utf-8").splitlines() if l.strip()) if INDEX.exists() else 0
    ep_id = f"EP-{today.replace('-', '')}-{count + 1:03d}"
    slug = slugify(args.topic)
    session_file = f"sessions/{today}-{slug}.md"

    skills = [s.strip() for s in args.skills.split(",") if s.strip()]
    outcomes = [o.strip() for o in args.outcomes.split(",") if o.strip()]
    blockers = [b.strip() for b in args.blockers.split(",") if b.strip()]
    decision = args.decision.strip()
    next_risk = getattr(args, "next_risk", "").strip()

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

    if not decision and (outcomes or blockers):
        import sys
        sys.stderr.write(
            f"[append_episode] ⚠️  --decision 未填写。"
            f"本次有 {len(outcomes)} 个产出{'和 ' + str(len(blockers)) + ' 个阻碍' if blockers else ''}，"
            f"如果做过非显而易见的判断，请补充 --decision。\n"
        )

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
    INDEX.write_text("\n".join(keep) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
