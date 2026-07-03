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
GLOBAL_MEMORY_DIR = Path(os.environ.get(
    "GLOBAL_MEMORY_DIR",
    str(Path.home() / ".claude" / "projects" / "-Users-luca-Desktop-luca-gstack" / "memory"),
))


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


# consolidate_memory.py 的 stale_candidates() 硬编码 days=14（无 CLI 覆盖）作为"进入超期列表"
# 的门槛——本函数看到的候选已经保证 >=14 天。阈值须定在 14 之上才有实际二级区分（独立核验
# 发现：曾设为 5 时该分支在生产环境永远不可达，凡进这里的都已 >=14 天，"平铺"档位形同虚设）。
STALE_ESCALATE_DAYS = 21  # 在 14 天门槛上再多逾期 7 天才升级为一键命令显眼行，给"刚满14天"
                          # 和"拖了3周+"一个真实可区分的呈现档位


def render_stale(x):
    """超期候选按 age_days 分级呈现——2026-07-03 治理降频修复：R5 发现同一候选连续 9 天
    逐字复读仍推不动裁决（告警疲劳）；age_days>=阈值时升级呈现+给可执行命令，而不是原样重复。"""
    if not isinstance(x, dict):
        return str(x)
    cid = x.get("id", "?")
    age = x.get("age_days")
    fact = (x.get("fact") or "")[:80]
    if isinstance(age, (int, float)) and age >= STALE_ESCALATE_DAYS:
        return (f"🔴 **{cid}**（已超期 {int(age)} 天未处理）— {fact}\n"
                f"  一键晋升：`python3 memory/scripts/consolidate_memory.py --set-stable {cid} --reviewer <你的名字>`"
                f" / 明确拒绝请在 `memory/semantic/reviews.jsonl` 记一行 decision=rejected")
    if isinstance(age, (int, float)):
        return f"{cid}（{int(age)}天）— {fact}"
    return render_item(x)


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


def check_model_routing():
    """模型路由真值源 ↔ skill frontmatter 一致性 + 复核期限。

    只做检测并列入 digest 待裁决，不自动改映射（重映射是判断题，留给人）。
    fail-open：任何异常折叠成一条 issue，绝不打断治理。
    """
    issues = []
    try:
        import yaml
        routing_path = ROOT / ".claude" / "skill-os" / "model-routing.yaml"
        if not routing_path.exists():
            return ["model-routing.yaml 不存在（模型路由真值源缺失）"]
        data = yaml.safe_load(routing_path.read_text(encoding="utf-8")) or {}
        tiers = data.get("tiers", {}) or {}
        lineup = data.get("known_lineup", []) or []

        registered = {}
        for name, t in tiers.items():
            t = t or {}
            if t.get("resolves_to") not in lineup:
                issues.append(f"model-routing: tier {name} 的 resolves_to={t.get('resolves_to')} 不在 known_lineup {lineup} 内")
            for s in t.get("skills", []) or []:
                registered[s] = name

        declared = {}
        skills_dir = ROOT / ".claude" / "skills" / "office"
        if skills_dir.is_dir():
            for sk in sorted(skills_dir.iterdir()):
                f = sk / "SKILL.md"
                if not f.is_file():
                    continue
                for line in f.read_text(encoding="utf-8").splitlines():
                    ls = line.strip()
                    if ls.startswith("recommended-model:"):
                        declared[sk.name] = ls.split(":", 1)[1].split("#", 1)[0].strip()
                        break
        for skill, tier in declared.items():
            if tier not in tiers:
                issues.append(f"model-routing: {skill}/SKILL.md recommended-model={tier} 不是已定义 tier")
            elif registered.get(skill) != tier:
                issues.append(f"model-routing: {skill} frontmatter={tier} 与真值源登记={registered.get(skill, '未登记')} 不一致")
        for skill in registered:
            if skill not in declared:
                issues.append(f"model-routing: 真值源登记了 {skill} 但其 SKILL.md 无 recommended-model 声明")

        # markdown 速查快照与真值源同步（CLAUDE.md / orchestrator.md 双写点）
        for md_rel in ("CLAUDE.md", ".claude/agents/orchestrator.md"):
            md_path = ROOT / md_rel
            if not md_path.is_file():
                continue
            md_lines = md_path.read_text(encoding="utf-8").splitlines()
            for name, t in tiers.items():
                alias = str((t or {}).get("resolves_to", ""))
                for line in md_lines:
                    if line.strip().startswith(f"| {name} "):
                        if alias and alias.lower() not in line.lower():
                            issues.append(f"model-routing: {md_rel} 速查快照 {name} 行未含当前解析 {alias}，快照漂移")
                        break
                else:
                    issues.append(f"model-routing: {md_rel} 速查快照缺少 {name} 行（表被改动或删除）")

        updated = data.get("updated")
        review_days = int(data.get("review_after_days", 90))
        if updated:
            updated_date = updated if hasattr(updated, "year") else datetime.strptime(str(updated), "%Y-%m-%d").date()
            age = (datetime.now(timezone.utc).date() - updated_date).days
            if age > review_days:
                issues.append(f"model-routing: 已 {age} 天未复核（>{review_days}），模型阵容可能已变化，建议核对档位映射")
    except Exception as e:  # noqa: BLE001 — 校验绝不打断治理
        issues.append(f"model-routing 校验异常：{e}")
    return issues


def check_self_model():
    """自模型真值源(self-model.yaml)复核期限 + generated 清单存在性。

    只做检测并列入 digest，不自动改 self-model.yaml（人工拥有）。
    fail-open：任何异常折叠成一条 issue，绝不打断治理。
    """
    issues = []
    try:
        import yaml
        sm_path = ROOT / ".claude" / "skill-os" / "evolution" / "self-model.yaml"
        if not sm_path.exists():
            return issues  # 未启用演进子系统时静默跳过
        data = yaml.safe_load(sm_path.read_text(encoding="utf-8")) or {}
        updated = data.get("updated")
        review_days = int(data.get("review_after_days", 35))
        if updated:
            updated_date = updated if hasattr(updated, "year") else datetime.strptime(str(updated), "%Y-%m-%d").date()
            age = (datetime.now(timezone.utc).date() - updated_date).days
            if age > review_days:
                issues.append(f"self-model: 已 {age} 天未复核（>{review_days}），演进面/缺口/源可能已漂移，建议核对 self-model.yaml + gaps-register.yaml + sources-registry.yaml")
        gen_path = ROOT / ".claude" / "skill-os" / "evolution" / "self-model.generated.yaml"
        if not gen_path.exists():
            issues.append("self-model: 缺 self-model.generated.yaml，运行 node scripts/build-self-model.mjs 生成实时清单")
    except Exception as e:  # noqa: BLE001 — 校验绝不打断治理
        issues.append(f"self-model 校验异常：{e}")
    return issues


def check_person_memory():
    """person 层（全局个人记忆）看护：candidate_feedback 候选清单 + MEMORY.md 软上限。

    门槛真值源见 .claude/skill-os/extraction-bar.md。本函数对全局目录**只读**，
    digest 只列建议命令，绝不自动写/改名/归档（红线：feedback_no-auto-edit-global-claude-config）。
    fail-open：任何异常折叠成一条 issue，绝不打断治理。
    """
    issues = []
    try:
        gdir = GLOBAL_MEMORY_DIR
        if not gdir.is_dir():
            return issues
        now = datetime.now(timezone.utc)
        for f in sorted(gdir.glob("candidate_feedback_*.md")):
            desc = ""
            try:
                for line in f.read_text(encoding="utf-8").splitlines():
                    ls = line.strip()
                    if ls.startswith("description:"):
                        desc = ls.split(":", 1)[1].strip()
                        break
            except Exception:  # noqa: BLE001
                pass
            age = (now - datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)).days
            stale_tag = f"已 {age} 天，超期：建议归档或丢弃" if age >= 14 else f"{age} 天"
            target = f.with_name(f.name.replace("candidate_", "", 1))
            issues.append(
                f"person 层候选 {f.name}（{stale_tag}）{desc} — 采纳：mv \"{f}\" \"{target}\" 并在 MEMORY.md 追加索引行；丢弃：直接删除"
            )
        memory_md = gdir / "MEMORY.md"
        if memory_md.is_file():
            entries = [l for l in memory_md.read_text(encoding="utf-8").splitlines() if l.lstrip().startswith("- ")]
            if len(entries) > 20:
                issues.append(
                    f"person 层软上限：MEMORY.md 已 {len(entries)} 条（>20，每 session 全量注入 context），建议合并/修剪"
                )
    except Exception as e:  # noqa: BLE001 — 看护绝不打断治理
        issues.append(f"person 层看护异常：{e}")
    return issues


FORCE_WEEKLY_DAYS = 7  # 无状态变化也至少每 N 天写一次心跳 digest，确认管线存活


def last_digest_date():
    """最近一份已写 digest 的日期（不含仅 touch 的 .checked-* 标记）。"""
    if not DIGESTS.exists():
        return None
    dates = []
    for p in DIGESTS.glob("*.md"):
        try:
            dates.append(datetime.strptime(p.stem, "%Y-%m-%d"))
        except ValueError:
            continue
    return max(dates) if dates else None


def main() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_dt = datetime.strptime(today, "%Y-%m-%d")

    # 每次调用都留一个"今天已检查过"的轻量标记（不含内容），让 session-restore 的
    # 每日一次触发节流独立于"今天是否真的写了 digest"——否则降频后会变成每个
    # session 都重跑 consolidate（2026-07-03 治理降频修复，见 CLAUDE.md P2-4）。
    DIGESTS.mkdir(parents=True, exist_ok=True)
    try:
        (DIGESTS / f".checked-{today}").touch()
    except OSError:
        pass

    # 应用治理：晋升合格候选 + 归档已审/noisy（全部在 consolidate 的门禁内）
    result = run_consolidate(["--promote-ready", "--archive-reviewed", "--archive-noisy"])
    actions = result.get("actions", {}) if isinstance(result, dict) else {}
    promoted = actions.get("promoted", []) or []
    archived = actions.get("archived", []) or []
    archived_noisy = actions.get("archived_noisy", []) or []
    conflicts = result.get("conflicts", []) or []
    dups = result.get("duplicate_candidates", []) or []
    stale = result.get("stale_candidates", []) or []
    routing_issues = check_model_routing()
    self_model_issues = check_self_model()
    person_issues = check_person_memory()
    eps = recent_episodes(today)

    has_change = bool(
        promoted or archived or archived_noisy or conflicts or dups or stale
        or routing_issues or self_model_issues or person_issues or eps
    )
    last_dt = last_digest_date()
    days_since = (today_dt - last_dt).days if last_dt else FORCE_WEEKLY_DAYS
    # 2026-07-03 治理降频（全量搭建 review P2-4）：R5 实测每日治理近4周只产生2次真实状态
    # 变化、空转率>90%——改为"有状态变化才写 + 周度强制心跳"，不再逐日复读同一份空 digest。
    if not has_change and days_since < FORCE_WEEKLY_DAYS and not result.get("_error"):
        print(json.dumps({
            "skipped": "无状态变化，未到周度强制心跳",
            "days_since_last_digest": days_since,
        }, ensure_ascii=False))
        return 0

    by_project = {}
    for e in eps:
        by_project.setdefault(e.get("project", "(未分项目)") or "(未分项目)", []).append(e)

    lines = [f"# 成长摘要 — {today}", ""]
    if not has_change:
        lines += [f"> 🫀 周度强制心跳：连续 {days_since} 天无状态变化，仍照跑一次确认管线存活（非真实变化）", ""]
    if result.get("_error"):
        lines += [f"> ⚠️ consolidate 调用异常：{result['_error']}", ""]

    lines += [f"## 🟢 自动晋升的稳定事实（{len(promoted)}）", ""]
    lines += ([f"- {render_item(p)}" for p in promoted] or ["_无_"]) + [""]

    pending = len(conflicts) + len(dups) + len(stale) + len(routing_issues) + len(self_model_issues) + len(person_issues)
    lines += [f"## ⏳ 待你裁决（需人工，{pending}）", ""]
    if conflicts:
        lines.append("**冲突：**")
        lines += [f"- {render_item(c)}" for c in conflicts]
    if dups:
        lines.append("**疑似重复候选：**")
        lines += [f"- {render_item(d)}" for d in dups]
    if stale:
        lines.append("**超期候选（久未晋升/处理）：**")
        lines += [f"- {render_stale(s)}" for s in stale]
    if routing_issues:
        lines.append("**模型路由（真值源一致性/复核）：**")
        lines += [f"- {i}" for i in routing_issues]
    if self_model_issues:
        lines.append("**自模型/演进面（复核/生成）：**")
        lines += [f"- {i}" for i in self_model_issues]
    if person_issues:
        lines.append("**person 层候选（全局个人记忆，只读看护）：**")
        lines += [f"- {i}" for i in person_issues]
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
