#!/usr/bin/env python3
"""每日记忆治理（无人值守）：消化候选 → 自动晋升「合格(strict-gate)」候选 → 写「成长摘要」digest。

由 launchd/cron 每日调用，或手动 `python3 memory/scripts/daily_governance.py`。

红线：晋升只走 consolidate_memory.py 的 promotion_ready 门禁（proposed_stable + confidence=high +
evidence/scope/reviewer 齐全，且非重复/冲突），本脚本不直接写 promoted-facts.yaml（SC-20260523-003）。
冲突/重复/stale 等需要判断的，只列进 digest 等你裁决，不自动处理。

永远 exit 0，绝不打断调度。
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
SCRIPTS = ROOT / "memory" / "scripts"
DIGESTS = ROOT / "memory" / "digests"
EPISODIC_INDEX = ROOT / "memory" / "episodic" / "index.jsonl"


def run_consolidate(extra_args):
    try:
        proc = subprocess.run(
            [sys.executable, str(SCRIPTS / "consolidate_memory.py"), "--json", *extra_args],
            capture_output=True, text=True, timeout=120, cwd=str(ROOT),
        )
        if proc.returncode != 0:  # DG-03：子进程崩溃(可能已部分写盘)不能当成功
            return {"_error": f"consolidate exit {proc.returncode}: {(proc.stderr or '')[:200]}"}
        return json.loads(proc.stdout or "{}")
    except Exception as e:  # noqa: BLE001
        return {"_error": str(e)}


def render_item(x):
    if isinstance(x, dict):
        return x.get("id") or x.get("fact") or json.dumps(x, ensure_ascii=False)[:120]
    return str(x)


def recent_episodes(today: str):
    if not EPISODIC_INDEX.exists():
        return []
    yesterday = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    window = {today, yesterday}
    out = []
    for line in EPISODIC_INDEX.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:  # noqa: BLE001
            continue
        if r.get("date") in window:
            out.append(r)
    return out


def main() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 应用治理：晋升合格候选 + 归档已审/noisy（全部在 consolidate 的门禁内）
    result = run_consolidate(["--promote-ready", "--archive-reviewed", "--archive-noisy"])
    actions = result.get("actions", {}) if isinstance(result, dict) else {}
    promoted = actions.get("promoted", []) or []
    archived = actions.get("archived", []) or []
    archived_noisy = actions.get("archived_noisy", []) or []
    conflicts = result.get("conflicts", []) or []
    dups = result.get("duplicate_candidates", []) or []
    stale = result.get("stale_candidates", []) or []
    eps = recent_episodes(today)

    by_project = {}
    for e in eps:
        by_project.setdefault(e.get("project", "(未分项目)") or "(未分项目)", []).append(e)

    lines = [f"# 成长摘要 — {today}", ""]
    if result.get("_error"):
        lines += [f"> ⚠️ consolidate 调用异常：{result['_error']}", ""]

    lines += [f"## 🟢 自动晋升的稳定事实（{len(promoted)}）", ""]
    lines += ([f"- {render_item(p)}" for p in promoted] or ["_无_"]) + [""]

    pending = len(conflicts) + len(dups) + len(stale)
    lines += [f"## ⏳ 待你裁决（需人工，{pending}）", ""]
    if conflicts:
        lines.append("**冲突：**")
        lines += [f"- {render_item(c)}" for c in conflicts]
    if dups:
        lines.append("**疑似重复候选：**")
        lines += [f"- {render_item(d)}" for d in dups]
    if stale:
        lines.append("**超期候选（久未晋升/处理）：**")
        lines += [f"- {render_item(s)}" for s in stale]
    if not pending:
        lines.append("_无_")
    lines.append("")

    lines += [f"## 📓 近期新增经验（{len(eps)}，含昨日）", ""]
    if eps:
        for proj, items in by_project.items():
            lines.append(f"**{proj}**")
            for e in items:
                dec = e.get("decision", "")
                tail = f" — {dec[:80]}" if dec else ""
                lines.append(f"- [{e.get('id', '?')}] {e.get('topic', '')}{tail}")
            lines.append("")
    else:
        lines += ["_无_", ""]

    lines += [f"## 📥 归档", "", f"- 已审候选归档：{len(archived)}", f"- noisy episode 归档：{len(archived_noisy)}", ""]

    digest_path = DIGESTS / f"{today}.md"
    if result.get("_error") and digest_path.exists():
        # DG-02：consolidate 失败且今日已有好 digest → 不用退化版覆盖它
        print(json.dumps({"skipped": "consolidate 失败，保留今日已有 digest", "error": result["_error"]}, ensure_ascii=False))
        return 0
    DIGESTS.mkdir(parents=True, exist_ok=True)
    digest_path.write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({
        "digest": f"memory/digests/{today}.md",
        "promoted": len(promoted),
        "pending_human": pending,
        "new_episodes": len(eps),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001 — 调度任务绝不因异常 exit≠0
        sys.stderr.write(f"[daily_governance] {e}\n")
        raise SystemExit(0)
