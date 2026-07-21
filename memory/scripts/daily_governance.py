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
import time
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
                f" / 明确拒绝：`python3 memory/scripts/consolidate_memory.py --reject {cid} --reason \"<理由>\" --reviewer <你的名字>`")
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

        # 新场景入场 tripwire（2026-07-10 new_scenario_protocol）：
        # ① office skill 目录既无 frontmatter 声明也未在真值源登记 → 待评估档位
        non_dispatch = set(data.get("non_dispatchable") or [])
        if skills_dir.is_dir():
            for sk in sorted(skills_dir.iterdir()):
                if not (sk / "SKILL.md").is_file():
                    continue
                if sk.name in non_dispatch:
                    continue  # 只读参考资产目录等非可调度项，无模型档
                if sk.name not in declared and sk.name not in registered:
                    issues.append(f"model-routing: 新场景待评估档位——office/{sk.name} 未声明 recommended-model 且未在真值源登记（按 new_scenario_protocol 三问定档）")
        # ② agents/*.md（有 frontmatter 的）：pin 值须与 agents: 登记一致；无 pin 须在 agents_no_pin
        agents_dir = ROOT / ".claude" / "agents"
        pinned = {k: str(v) for k, v in (data.get("agents") or {}).items()}
        no_pin = set(data.get("agents_no_pin") or [])
        if agents_dir.is_dir():
            for af in sorted(agents_dir.glob("*.md")):
                text = af.read_text(encoding="utf-8")
                if not text.startswith("---") or text.count("---") < 2:
                    continue  # 无 frontmatter 的行为模式文档（如 plan-agent）不在机检范围
                fm = text.split("---", 2)[1]
                fm_model = None
                for l in fm.splitlines():
                    if l.strip().startswith("model:"):
                        fm_model = l.split(":", 1)[1].split("#", 1)[0].strip()
                        break
                stem = af.stem
                if fm_model:
                    if stem not in pinned:
                        issues.append(f"model-routing: agents/{af.name} 有 pin={fm_model} 但真值源 agents: 未登记")
                    elif pinned[stem] != fm_model:
                        issues.append(f"model-routing: agents/{af.name} pin={fm_model} 与真值源登记={pinned[stem]} 不一致")
                elif stem not in no_pin:
                    issues.append(f"model-routing: 新场景待评估档位——agents/{af.name} 无 model pin 且未在 agents_no_pin 登记（按 new_scenario_protocol 三问定档）")

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


def check_gap_recheck():
    """gaps-register 到期项：addressed 满 90 天的复核窗 + open gap 自设重访条件已满足。

    此前 90 天算术只存在于 framework-evolution-scout 的 loader prompt（给 LLM 的自然语言指令），
    月度 scout 不跑或算漏就无人知；open gap 的自设重访条件更是零执行者（曾写在 YAML 注释里）。
    这里补一个**每日确定性观察者**，接已有 digest 消费面（2026-07-21 收口 Pass，BACKLOG 触发器纪律：
    延后项的触发条件必须有人在必经界面看得见）。检测 only，不改 gaps-register（人工拥有）。
    fail-open：任何异常折叠成一条 issue，绝不打断治理。
    """
    issues = []
    try:
        import yaml
        gaps_path = ROOT / ".claude" / "skill-os" / "evolution" / "gaps-register.yaml"
        if not gaps_path.exists():
            return issues  # 未启用演进子系统时静默跳过
        data = yaml.safe_load(gaps_path.read_text(encoding="utf-8")) or {}
        gaps = data.get("gaps", []) or []
        today_d = datetime.now(timezone.utc).date()
        recheck_days = int(data.get("addressed_recheck_days", 90))
        due = []
        for g in gaps:
            if not isinstance(g, dict):
                continue
            gid = g.get("id", "?")
            status = str(g.get("status", "")).strip()
            if status == "addressed":
                at = g.get("addressed_at")
                if not at:
                    issues.append(f"gaps-register: {gid} 标 addressed 但缺 addressed_at，复核窗无法计算")
                    continue
                # 逐 gap 容错：单条坏日期不得让整轮检查失明（否则一个 'not-a-date'
                # 会把其余所有超期项与 revisit-MET 项一起静默吞掉，且报错不含犯错 id）
                try:
                    at_d = at if hasattr(at, "year") else datetime.strptime(str(at), "%Y-%m-%d").date()
                except Exception:
                    issues.append(f"gaps-register: {gid} 的 addressed_at={at!r} 不是合法日期（YYYY-MM-DD），该条复核窗无法计算")
                    continue
                age = (today_d - at_d).days
                if age > recheck_days:
                    due.append(f"{gid}({age}天)")
            elif status == "open" and str(g.get("revisit_status") or "").strip().upper().startswith("MET"):
                issues.append(
                    f"gaps-register: {gid} 自设重访条件已满足（{g.get('revisit_when') or '见 revisit_status'}）"
                    f"——须裁决开工/改条件/关闭，勿再留在 open 里空转"
                )
        if due:
            shown = ", ".join(due[:5]) + (f" 等 {len(due)} 个" if len(due) > 5 else "")
            issues.append(
                f"gaps-register: {len(due)} 个 addressed gap 到期复核（>{recheck_days}天）：{shown}"
                f"——按 severity 分批裁决，勿逐个开工"
            )
    except Exception as e:  # noqa: BLE001 — 校验绝不打断治理
        issues.append(f"gaps-register 复核校验异常：{e}")
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


AUTHORITATIVE_MEMORY_ROOT = "/Users/luca/Desktop/luca_gstack"  # 记忆单一权威 store（07-09 拍板）；双仓同一逻辑
UPSTREAM_DRIFT_INTERVAL_DAYS = 7   # skill 类上游查询节流：marker mtime ≥7 天才实跑（plugin 检查纯本地不节流）
UPSTREAM_FETCH_TIMEOUT = 10        # 单源 gh api 超时（秒）
UPSTREAM_TOTAL_BUDGET = 45         # 整轮网络查询总预算（秒），超预算剩余单元折叠"部分跳过"


def _gh_latest_commit(repo: str, path):
    """与 installed-pins.yaml watch_sha 同款查询：touching path 的最后一次 commit SHA。"""
    url = f"repos/{repo}/commits?per_page=1" + (f"&path={path}" if path else "")
    proc = subprocess.run(["gh", "api", url, "--jq", ".[0].sha"],
                          capture_output=True, text=True, timeout=UPSTREAM_FETCH_TIMEOUT)
    if proc.returncode != 0:
        raise RuntimeError(f"gh exit {proc.returncode}: {(proc.stderr or '').strip()[:120]}")
    return (proc.stdout or "").strip()


def check_upstream_drift(pins_path, plugins_json_path, marker_path, today, fetch_latest=None):
    """外部 skill/plugin 上游漂移侦测（2026-07-15 B1）。propose-only：只产 digest 行供人裁，
    watcher 永不改任何 skill 文件——已装 skill 带本地护栏/增量改造、上游是未审供应链，
    盲自动更新会同时破坏两者；refresh 走 FUSION 九步。

    比较键 = pins 的 watch_sha（path 域 commit，与本函数同款查询），不用 repo HEAD
    （6/8 单元来自天天动的 monorepo，repo 级比较=永久假漂移=第一周就告警疲劳）。
    ack_sha = 已裁决「不采纳」的静音版本。节流：marker mtime ≥7 天才实跑网络查询，
    成功才 touch（全失败次日重试）；最坏可见延迟 ≈ 7（节流）+ 7（digest 心跳）天。
    fail-open：任何异常折叠成 issue/注记，绝不打断治理。路径与 fetch 全参数化可测。
    """
    issues = []
    try:
        pins_path = Path(pins_path)
        if not pins_path.is_file():
            return issues
        import yaml
        units = (yaml.safe_load(pins_path.read_text(encoding="utf-8")) or {}).get("units") or []

        def _find_plugin_entry(obj, key):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k == key and isinstance(v, list) and v and isinstance(v[0], dict):
                        return v[0]
                    hit = _find_plugin_entry(v, key)
                    if hit:
                        return hit
            elif isinstance(obj, list):
                for item in obj:
                    hit = _find_plugin_entry(item, key)
                    if hit:
                        return hit
            return None

        # plugin 单元：读 installed_plugins.json 纯本地对比，零网络、不受节流——
        # 插件管理器随时静默升级（superpowers 5.1.0→6.1.1 无人察觉 37 天是立项实证）
        for u in units:
            if u.get("kind") != "plugin":
                continue
            uname = u.get("name", "?")
            try:
                plugins = json.loads(Path(plugins_json_path).read_text(encoding="utf-8"))
                entry = _find_plugin_entry(plugins, str(u.get("plugin_key")))
                current = str(entry.get("version")) if entry else ""
                vetted = str(u.get("last_vetted_version") or "")
                if current and current != vetted:
                    issues.append(
                        f"{uname}: 插件已静默升级到 {current}（vetting 停在 {vetted}）"
                        f"——补审后同步 vetting-registry + installed-pins 的 last_vetted_version")
            except Exception as e:  # noqa: BLE001
                issues.append(f"{uname}: 插件版本检查异常（fail-open）：{e}")

        skill_units = [u for u in units if u.get("kind") == "skill"]
        if not skill_units:
            return issues
        marker = Path(marker_path)
        if marker.exists():
            age_days = (datetime.now(timezone.utc).timestamp() - marker.stat().st_mtime) / 86400
            if age_days < UPSTREAM_DRIFT_INTERVAL_DAYS:
                # 节流窗口内回放上次实跑的缓存结果——否则同日/同周 digest 重写时查询被跳过，
                # 漂移行会从新 digest 里消失（人看到的是"没货"的版本）
                try:
                    cached = json.loads(marker.read_text(encoding="utf-8")).get("issues") or []
                    issues.extend(cached)
                except Exception:  # noqa: BLE001 — 旧格式/损坏 marker 视作无缓存
                    pass
                return issues

        fetch = fetch_latest or _gh_latest_commit
        deadline = time.monotonic() + UPSTREAM_TOTAL_BUDGET
        any_success = False
        failures = []
        skill_issues = []
        for u in skill_units:
            uname = u.get("name", "?")
            if time.monotonic() > deadline:
                skill_issues.append(f"上游漂移检查部分跳过（总预算 {UPSTREAM_TOTAL_BUDGET}s 用尽，{uname} 起未查）")
                break
            ipath_raw = str(u.get("install_path") or "")
            if ipath_raw and not Path(os.path.expanduser(ipath_raw)).exists():
                skill_issues.append(f"{uname}: install_path 不存在（疑已卸载）——installed-pins 该行待清理")
                continue
            try:
                current = fetch(u.get("repo", ""), u.get("path"))
            except Exception as e:  # noqa: BLE001
                failures.append(f"{uname}（{e}）")
                continue
            any_success = True
            if not current:
                # 空 ≠ 等值：path 拼错/移动时查询返回空，判成"无漂移"就是静默漏报
                skill_issues.append(f"{uname}: 上游查询返回空（repo/path 疑错或已移动）——检查 installed-pins 该行")
                continue
            watch = str(u.get("watch_sha") or "")
            ack = str(u.get("ack_sha") or "")
            if current != watch and current != ack:
                repo = u.get("repo", "")
                loc = f"{repo} · {u['path']}" if u.get("path") else repo
                skill_issues.append(
                    f"{uname}: 上游 {loc} 有新提交 {current[:8]}（pin {u.get('pinned_at', '?')} @ {watch[:8]}）"
                    f"——refresh 走 FUSION 九步；不采纳则把 {current[:8]} 填 ack_sha 静音。"
                    f"对比 https://github.com/{repo}/compare/{watch[:8]}...{current[:8]}（force-push 时链接可能失效）")
        if failures:
            if any_success:
                skill_issues.append("上游无法访问（同批其他源正常——404 即删库/私有化/改名的供应链信号，请人工核查）："
                                    + "、".join(failures))
            else:
                skill_issues.append(f"上游漂移检查跳过（{len(failures)} 源全失败，疑离线/gh 未认证——marker 不刷新，下次重试）")
        issues.extend(skill_issues)
        if any_success:
            # 成功才写 marker（全失败次日重试）；内容缓存本轮结果供节流期回放
            try:
                marker.parent.mkdir(parents=True, exist_ok=True)
                marker.write_text(json.dumps({"checked_at": today, "issues": skill_issues}, ensure_ascii=False),
                                  encoding="utf-8")
            except OSError:
                pass
    except Exception as e:  # noqa: BLE001 — 漂移检查绝不打断治理
        issues.append(f"上游漂移检查异常（已 fail-open）：{e}")
    return issues


LOOP_PENDING_ALERT = 5   # pending-extraction 积压 >= 此值 → 捕获→消化链疑似断
CLAUDE_MD_SOFT_BUDGET = 44 * 1024  # CLAUDE.md 软预算早警阈值（B1 硬门 45KB，软门给 1KB 撞墙前预警）；
                                   # 超此即 digest 告警，把撞墙式硬门升级成早警防贴墙（2026-07-21，
                                   # 2026-07-20 加 skill 贴到剩 2 字节的教训；实测安全 offload floor≈42.8KB）
LOOP_STALE_DAYS = 3      # marker 领先 episodic >= 此值 → 疑 capture(Stop hook/SESSION_SYNC) 停摆
DORMANT_LOOPS = "muse-loop gen↔judge"  # by-design 零真实运行，永不告警（A2 DORMANT 白名单）


def check_loop_health(observability_dir, episodic_index, digests_dir,
                      resolved_root, fork_home, env_memory_root, today):
    """Loop 健康自检（A2）：只查可观测工件，任何异常 fail-open（吞掉、不打断治理）。

    返回 (anomalies, notes)：anomalies 非空才由调用方追加「⚙️ Loop 健康」小节，且不改 digest 的
    写入判定（遵守既有"有真实状态变化才写"降频，不 regress）；notes 是随小节一起呈现的上下文行。
    DORMANT 白名单（muse-loop gen↔judge）by-design 零运行，永不进 anomalies（固定标注）。
    路径全部由参数传入，便于对临时 fixture 目录做测试而不碰真实状态。
    """
    anomalies, notes = [], []
    try:
        observability_dir = Path(observability_dir)
        episodic_index = Path(episodic_index)
        digests_dir = Path(digests_dir)
        resolved_root = Path(resolved_root)
        fork_home = Path(fork_home)
        today_dt = datetime.strptime(today, "%Y-%m-%d")

        # 1. pending-extraction 积压——捕获侧(session-sync)把 pending 写在各自 projectRoot，
        # 真实 session 多在 fork：只查权威库会在事故最可能发生的仓失明（评审切面 c C1，2026-07-15）。
        # fork_home 由调用方经 GOVERNANCE_CALLER_ROOT 传入（session-restore spawn 时注入自己的
        # projectRoot）；母版自跑时两目录相同，union 退化为单目录。
        pend_dirs = {observability_dir, Path(fork_home) / ".claude" / "observability"}
        pend = []
        for pd in pend_dirs:
            if Path(pd).is_dir():
                pend += sorted(Path(pd).glob("pending-extraction-*.md"))
        if len(pend) >= LOOP_PENDING_ALERT:
            anomalies.append(
                f"pending-extraction 积压 {len(pend)} 个（≥{LOOP_PENDING_ALERT}，跨 {len(pend_dirs)} 个仓查得，捕获→消化链疑似断）"
                "——逐个按 extraction-bar 四信号裁决后清零"
            )

        # 3. 写路径核验（2026-07-10 双仓统一逻辑）：异常 = 解析 root ≠ 权威库
        # AUTHORITATIVE_MEMORY_ROOT（fork 未设 env 会回落本地=分裂脑、env 指错同理；
        # 母版本体默认解析即权威 → 天然 OK）。不 auto-fix。
        auth = Path(AUTHORITATIVE_MEMORY_ROOT)
        env_tag = f"MEMORY_ROOT={env_memory_root}" if env_memory_root else "MEMORY_ROOT 未设，用默认"
        if not auth.is_dir():
            anomalies.append(f"权威 store {AUTHORITATIVE_MEMORY_ROOT} 不存在——检查目录是否改名/迁移")
        elif resolved_root.resolve() != auth.resolve():
            anomalies.append(
                f"写路径脱离单一权威 store：{env_tag} 解析到 {resolved_root}"
                f"（≠ {AUTHORITATIVE_MEMORY_ROOT}）——memory 读写将分裂；fork 侧检查 .claude/settings.json env 注入"
            )
        else:
            notes.append(f"写路径 OK：{resolved_root}（单一权威 store，by design 2026-07-09；{env_tag}）")

        # 4. CLAUDE.md 预算早警（2026-07-21）：每-session 注入面贴 45KB 硬门（verify.sh B1）前先软警。
        # 硬门撞墙式（不到 45KB 不响）；软目标提前告警，creep 早发现别贴到墙。fail-open，任何异常吞掉。
        try:
            claude_md = auth / "CLAUDE.md"
            if claude_md.is_file():
                sz = claude_md.stat().st_size
                if sz > CLAUDE_MD_SOFT_BUDGET:
                    anomalies.append(
                        f"CLAUDE.md {sz/1024:.1f}KB 超软目标 {CLAUDE_MD_SOFT_BUDGET//1024}KB、逼近 45KB 硬门（B1）"
                        "——每-session 注入面接近预算墙，把参考细节 offload 到 claude-md-appendix.md（lazy-load）腾 headroom"
                    )
                else:
                    notes.append(f"CLAUDE.md 预算 OK：{sz/1024:.1f}KB（软 {CLAUDE_MD_SOFT_BUDGET//1024}KB / 硬 45KB）")
        except Exception:  # noqa: BLE001
            pass

        # 2. 双向陈旧度：最新 episodic 日期 vs 最新 digest/.checked marker 日期（ISO 日期串可直接比较）
        ep_dates = []
        if episodic_index.is_file():
            for line in episodic_index.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line).get("date")
                except Exception:  # noqa: BLE001
                    continue
                if d:
                    ep_dates.append(d)
        marker_dates = set()
        if digests_dir.is_dir():
            for p in digests_dir.glob("*.md"):
                marker_dates.add(p.stem)
            # .checked 是 session-restore spawn 前抢建的「认领」痕；治理跑完才写入结果 JSON。
            # 空 marker = 认领后未完成（进程崩了）——不算已治理，否则崩溃日被自己的认领痕
            # 掩蔽且永不重试（评审切面 c C3，2026-07-15）。
            for p in digests_dir.glob(".checked-*"):
                try:
                    if p.stat().st_size > 0:
                        marker_dates.add(p.name[len(".checked-"):])
                except OSError:
                    pass
        ep_newest = max(ep_dates) if ep_dates else None
        marker_newest = max(marker_dates) if marker_dates else None

        def _parse(d):
            try:
                return datetime.strptime(d, "%Y-%m-%d")
            except Exception:  # noqa: BLE001
                return None
        ep_dt = _parse(ep_newest) if ep_newest else None
        mk_dt = _parse(marker_newest) if marker_newest else None
        if ep_newest or marker_newest:
            ep_stale = (today_dt - ep_dt).days if ep_dt else None
            mk_stale = (today_dt - mk_dt).days if mk_dt else None
            notes.append(
                f"双向陈旧度：episodic 最新 {ep_newest or '无'}（距今 {ep_stale if ep_stale is not None else '—'} 天）"
                f" / marker 最新 {marker_newest or '无'}（距今 {mk_stale if mk_stale is not None else '—'} 天）"
            )
        # 方向一（治理断）：最新 episodic 活动日(<今天) 在权威 store 无对应 marker
        if ep_newest and ep_newest < today and ep_newest not in marker_dates:
            anomalies.append(
                f"episodic 最新活动 {ep_newest} 在权威 store 无对应 governance marker（.checked/digest）"
                "——该日 session 未被治理，疑治理未跑或写路径分裂"
            )
        # 方向二（capture 断）：marker 明显领先 episodic → 治理在跑却无新经验落盘
        if ep_dt and mk_dt and (mk_dt - ep_dt).days >= LOOP_STALE_DAYS:
            anomalies.append(
                f"marker 已到 {marker_newest} 但 episodic 停在 {ep_newest}（滞后 {(mk_dt - ep_dt).days} 天）"
                "——治理在跑却无新经验落盘，疑 capture(Stop hook/SESSION_SYNC) 停摆"
            )

        # 4. DORMANT 白名单：固定标注，永不告警
        notes.append(f"DORMANT 白名单：{DORMANT_LOOPS} 零真实运行属 by-design 待首用，不告警")
    except Exception as e:  # noqa: BLE001 — 健康自检绝不打断治理
        anomalies.append(f"loop 健康自检异常（已 fail-open）：{e}")
    return anomalies, notes


def _write_marker_result(today: str, payload: dict) -> None:
    """治理健康跑完后把结果 JSON 写进 .checked marker——空 marker = 认领后未完成（崩溃痕）。
    loop-health 方向一检测只认非空 marker，session-restore 启动时对陈旧空 marker 提示补跑。"""
    try:
        (DIGESTS / f".checked-{today}").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


def main() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_dt = datetime.strptime(today, "%Y-%m-%d")

    # 每次调用都留一个"今天已检查过"的轻量标记，让 session-restore 的每日一次触发节流
    # 独立于"今天是否真的写了 digest"——否则降频后会变成每个 session 都重跑 consolidate
    # （2026-07-03 治理降频修复，见 CLAUDE.md P2-4）。此时只 touch（认领/刷新 mtime）；
    # 健康跑完由 _write_marker_result 写入结果，空 marker 即崩溃痕。
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
    awaiting = result.get("awaiting_approval", []) or []
    routing_issues = check_model_routing()
    self_model_issues = check_self_model() + check_gap_recheck()
    person_issues = check_person_memory()
    eps = recent_episodes(today)

    # A2 loop 健康自检（fail-open）——在降频判定之前跑：异常本身构成写 digest 的理由。
    # 此前只在"已决定写"的路径上跑，而「capture 停摆」类异常恰与 has_change=False 高度相关
    # （捕获断→无新经验→无状态变化），最需要报警时被降频压到 7 天心跳、最坏 8 天盲窗
    # （评审切面 c C2，2026-07-15）。全部检测均为本地文件读，无网络抖动强制写入的风险。
    loop_anomalies, loop_notes = check_loop_health(
        observability_dir=ROOT / ".claude" / "observability",
        episodic_index=EPISODIC_INDEX,
        digests_dir=DIGESTS,
        resolved_root=ROOT,
        fork_home=Path(os.environ.get("GOVERNANCE_CALLER_ROOT") or Path(__file__).resolve().parents[2]),
        env_memory_root=os.environ.get("MEMORY_ROOT"),
        today=today,
    )

    has_change = bool(
        promoted or archived or archived_noisy or conflicts or dups or stale or awaiting
        or routing_issues or self_model_issues or person_issues or eps
    )
    last_dt = last_digest_date()
    days_since = (today_dt - last_dt).days if last_dt else FORCE_WEEKLY_DAYS
    # 2026-07-03 治理降频（全量搭建 review P2-4）：R5 实测每日治理近4周只产生2次真实状态
    # 变化、空转率>90%——改为"有状态变化才写 + 周度强制心跳"，不再逐日复读同一份空 digest。
    if not has_change and not loop_anomalies and days_since < FORCE_WEEKLY_DAYS and not result.get("_error"):
        skip_payload = {
            "skipped": "无状态变化，未到周度强制心跳",
            "days_since_last_digest": days_since,
        }
        _write_marker_result(today, skip_payload)
        print(json.dumps(skip_payload, ensure_ascii=False))
        return 0

    by_project = {}
    for e in eps:
        by_project.setdefault(e.get("project", "(未分项目)") or "(未分项目)", []).append(e)

    # 标题行带异常计数：session-restore 预览覆盖「待你裁决」整节（上限 40 行），⚙️ 小节固定在 digest 尾部
    # 必被截断——计数进标题才保证异常在预览可见（评审切面 c C2 第二层，2026-07-15）。
    title_suffix = f"（⚙️ Loop 异常 {len(loop_anomalies)}）" if loop_anomalies else ""
    lines = [f"# 成长摘要 — {today}{title_suffix}", ""]
    if not has_change:
        lines += [f"> 🫀 周度强制心跳：连续 {days_since} 天无状态变化，仍照跑一次确认管线存活（非真实变化）", ""]
    if result.get("_error"):
        lines += [f"> ⚠️ consolidate 调用异常：{result['_error']}", ""]

    lines += [f"## 🟢 自动晋升的稳定事实（{len(promoted)}）", ""]
    lines += ([f"- {render_item(p)}" for p in promoted] or ["_无_"]) + [""]

    pending = len(conflicts) + len(dups) + len(stale) + len(awaiting) + len(routing_issues) + len(self_model_issues) + len(person_issues)
    lines += [f"## ⏳ 待你裁决（需人工，{pending}）", ""]
    if awaiting:
        # awaiting_approval 桶：提案者已 --stable 请求、条件齐备、只差人工闸门放行。
        # 此前该桶建了却从不进 digest，候选 0-14 天窗口对人完全不可见、只能等 14 天后
        # 以超期身份浮出（评审切面 a 问题 3，2026-07-15）。
        lines.append("**待批准晋升（提案者已请求 stable，条件齐备，等你放行/拒绝）：**")
        for a in awaiting:
            aid = a.get("id", "?") if isinstance(a, dict) else str(a)
            afact = (a.get("fact", "") or "")[:80] if isinstance(a, dict) else ""
            lines.append(f"- **{aid}** — {afact}\n"
                         f"  放行：`python3 memory/scripts/consolidate_memory.py --set-stable {aid} --reviewer <你的名字>`"
                         f" / 拒绝：`... --reject {aid} --reason \"<理由>\" --reviewer <你的名字>`")
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

    # 编排层 eval 消费（2026-07-14 编排体系评审）：record_eval.py 落的 eval-log 此前零消费——
    # 又一个"写而不读的台账"。此节只随 digest 顺带呈现（fail-open，不参与 has_change 判定、
    # 不改 digest 写入门槛；7 天强制心跳保证至少每周被读一次）。
    try:
        eval_log = ROOT / "memory" / "evals" / "eval-log.jsonl"
        if eval_log.is_file():
            cutoff = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=30)).strftime("%Y-%m-%d")
            counts, recent_fails = {}, []
            for ln in eval_log.read_text(encoding="utf-8").splitlines():
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    ev = json.loads(ln)
                except Exception:
                    continue
                if str(ev.get("session_date", "")) < cutoff:
                    continue
                st = str(ev.get("quality_gate_status", "?"))
                counts[st] = counts.get(st, 0) + 1
                if st != "PASS":
                    recent_fails.append(f"{ev.get('session_date')} {ev.get('skill_name')}（{st}）")
            if counts:
                total = sum(counts.values())
                parts = " / ".join(f"{k} {v}" for k, v in sorted(counts.items()))
                lines += [f"## 🧪 Skill 评估消费（近30天 {total} 条）", "", f"- {parts}"]
                lines += [f"- 非 PASS：{f}" for f in recent_fails[:5]]
                lines.append("")
    except Exception as e:  # noqa: BLE001
        # fail-open 但留残留信号：整段静默吞掉会让「节消失」被误读成「近30天无 eval」（C6）
        lines += [f"> ⚠️ eval 消费节异常（fail-open）：{e}", ""]

    # 检索度量消费（2026-07-15 记忆层评审）：retrieval-log 此前只写不读，ADR-0006 裁决检查点
    # 无 owner（158 次检索 0 次 mattered 标注、裁决过期 2.6 倍无人知晓）。此节只随 digest 顺带
    # 呈现（fail-open，不参与写入判定）；排除测试流量（source 非 live / e2e 特征 query）。
    try:
        rlog = ROOT / "memory" / "retrieval-log.jsonl"
        if rlog.is_file():
            searches = misses = mattered_n = excluded = 0
            for ln in rlog.read_text(encoding="utf-8").splitlines():
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    ev = json.loads(ln)
                except Exception:
                    continue
                src = str(ev.get("source", "live"))
                qtext = str(ev.get("query", ""))
                # 与 --retrieval-stats 同口径：无 source 字段的 legacy 行（采集升级前，
                # 54% 测试污染不可分）一并排除，只计打过标的新行
                if "source" not in ev or src != "live" or "e2e" in qtext.lower() or "agent-e2e-test" in str(ev.get("cwd_tail", "")):
                    excluded += 1
                    continue
                if ev.get("type") == "mattered" or ev.get("mattered") is True:
                    mattered_n += 1
                elif ev.get("type") == "search":
                    searches += 1
                    if ev.get("result_count") == 0:
                        misses += 1
            if searches or mattered_n:
                lines += [f"## 🔎 检索度量（ADR-0006）", "",
                          f"- 真实检索 {searches} 次 / miss {misses} / mattered 标注 {mattered_n}（已排除测试流量 {excluded} 条）",
                          f"- 裁决入口：`python3 memory/scripts/search_memory.py --retrieval-stats`；检索改变了行动请补 `--mattered \"<query>\"`",
                          ""]
    except Exception as e:  # noqa: BLE001
        lines += [f"> ⚠️ 检索度量节异常（fail-open）：{e}", ""]

    lines += [f"## 📥 归档", "", f"- 已审候选归档：{len(archived)}", f"- noisy episode 归档：{len(archived_noisy)}", ""]

    # 外部 skill 上游漂移（2026-07-15 B1）：propose-only 顺带呈现支路——不参与写入判定
    # （网络抖动不得强制写 digest），有货才出小节；节流/比较键/静音语义见函数 docstring。
    try:
        drift = check_upstream_drift(
            pins_path=ROOT / ".claude" / "skill-os" / "external-skills" / "installed-pins.yaml",
            plugins_json_path=Path.home() / ".claude" / "plugins" / "installed_plugins.json",
            marker_path=DIGESTS / ".upstream-drift-checked",
            today=today,
        )
        if drift:
            lines += ["## 📦 外部 skill 上游漂移（propose-only；refresh 走 FUSION 九步，watcher 永不自动改）", ""]
            lines += [f"- {i}" for i in drift] + [""]
    except Exception as e:  # noqa: BLE001
        lines += [f"> ⚠️ 上游漂移检查异常（fail-open）：{e}", ""]

    # ⚙️ 小节呈现（loop_anomalies 已在降频判定前算出——异常本身构成写 digest 的理由）
    if loop_anomalies:
        lines += ["## ⚙️ Loop 健康", "", "**异常（需处理）：**"] + [f"- {a}" for a in loop_anomalies] + [""]
        if loop_notes:
            lines += ["**上下文：**"] + [f"- {n}" for n in loop_notes] + [""]

    digest_path = DIGESTS / f"{today}.md"
    if result.get("_error") and digest_path.exists():
        # DG-02：consolidate 失败且今日已有好 digest → 不用退化版覆盖它。
        # 不写完成痕：本次运行未健康完成，marker 留由早前成功运行写的内容（若有）。
        print(json.dumps({"skipped": "consolidate 失败，保留今日已有 digest", "error": result["_error"]}, ensure_ascii=False))
        return 0
    DIGESTS.mkdir(parents=True, exist_ok=True)
    digest_path.write_text("\n".join(lines), encoding="utf-8")

    summary = {
        "digest": f"memory/digests/{today}.md",
        "promoted": len(promoted),
        "pending_human": pending,
        "new_episodes": len(eps),
        "loop_anomalies": len(loop_anomalies),
    }
    _write_marker_result(today, summary)
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001 — 调度任务绝不因异常 exit≠0
        sys.stderr.write(f"[daily_governance] {e}\n")
        raise SystemExit(0)
