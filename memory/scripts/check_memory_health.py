#!/usr/bin/env python3
"""Validate memory store health without loading long history into agent context."""
import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required for memory health checks", file=sys.stderr)
    sys.exit(2)


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
# Projection surfaces belong to the checkout that owns this script. The semantic store may be
# redirected to the other authoritative checkout by MEMORY_ROOT; mixing those roots makes a fresh
# worktree change validate stale root documents.
CODE_ROOT = Path(__file__).resolve().parents[2]
PROMOTED = ROOT / "memory" / "semantic" / "promoted-facts.yaml"


def main() -> int:
    errors = []
    if not PROMOTED.exists():
        errors.append(f"missing {PROMOTED}")
    else:
        try:
            data = yaml.safe_load(PROMOTED.read_text(encoding="utf-8")) or {}
        except Exception as exc:
            errors.append(f"invalid promoted-facts.yaml: {exc}")
            data = {}
        facts = data.get("facts", []) if isinstance(data, dict) else []
        if not isinstance(facts, list):
            errors.append("promoted-facts.yaml facts must be a list")
            facts = []
        seen = set()
        for index, fact in enumerate(facts, start=1):
            if not isinstance(fact, dict):
                errors.append(f"fact #{index} is not a mapping")
                continue
            for field in ("id", "domain", "fact", "confidence", "stable", "added", "source"):
                if field not in fact or str(fact.get(field, "")).strip() == "":
                    errors.append(f"{fact.get('id', '#' + str(index))}: missing {field}")
            fact_id = str(fact.get("id", ""))
            if fact_id in seen:
                errors.append(f"{fact_id}: duplicate id")
            seen.add(fact_id)
            if fact.get("stable") is not True:
                errors.append(f"{fact_id}: stable must be true")
            text = str(fact.get("fact", ""))
            if fact_id == "SC-20260522-001" and "U-block" not in text:
                errors.append("SC-20260522-001 fact appears truncated; missing U-block")
            if "..." in text.splitlines():
                errors.append(f"{fact_id}: contains YAML document marker in fact text")

        # Bi-temporal 一致性（BACKLOG #2 已闭合 2026-07-22）：读侧 get_memory/search_memory 的
        # parse_semantic_facts 现已消费 supersedes/valid_until（filter_superseded_expired 过滤被取代/
        # 过期的事实）。原"读侧未实现→带字段即 FAIL"的绊线已解除。这里改为轻校验：supersedes 指向的
        # 旧 id 若**仍作为 stable fact 存在于 promoted-facts**，提示应归档（读侧会过滤掉它，但留在文件里
        # 是冗余/易误解）——不阻断，只列 warning 级 error 供治理清理。悬空 supersedes（目标不在 store）静默放过。
        promoted_ids = {str(f.get("id") or "") for f in facts if isinstance(f, dict)}
        for fact in facts:
            if not isinstance(fact, dict):
                continue
            sup = str(fact.get("supersedes") or "").strip()
            if sup and sup in promoted_ids:
                errors.append(
                    f"{fact.get('id', '?')}: supersedes={sup}，而 {sup} 仍作为 stable 留在 promoted-facts"
                    f"（读侧已过滤，但应 consolidate 归档旧事实以免冗余）"
                )

        # Static Fallback 白名单一致性（防漂移）：白名单 ⊆ promoted ids；白名单 ⇔ CLAUDE.md SF 节
        import re
        allowlist_path = ROOT / "memory" / "semantic" / "static-fallback-allowlist.txt"
        if allowlist_path.exists():
            allow_ids = {ln.split("#", 1)[0].strip() for ln in allowlist_path.read_text(encoding="utf-8").splitlines() if ln.split("#", 1)[0].strip()}
            for aid in sorted(allow_ids - seen):
                errors.append(f"static-fallback-allowlist: {aid} 不在 promoted-facts.yaml")
            # canonical fact body 必须同时精确投影到 generated + 当前 checkout 的两个 root。
            # 只比对 bounded block，避免正文里的历史引用或同 ID prose 造成假绿。
            by_id = {str(f.get("id", "")): f for f in facts if isinstance(f, dict)}
            ordered_ids = [
                ln.split("#", 1)[0].strip()
                for ln in allowlist_path.read_text(encoding="utf-8").splitlines()
                if ln.split("#", 1)[0].strip()
            ]
            canonical = [
                f"- [{fact_id} / {by_id[fact_id].get('domain', '')}] "
                + re.sub(r"\s+", " ", str(by_id[fact_id].get("fact", ""))).strip()
                for fact_id in ordered_ids
                if fact_id in by_id
            ]

            def bounded_projection(path: Path):
                if not path.is_file():
                    errors.append(f"missing Static Fallback projection surface: {path.relative_to(CODE_ROOT)}")
                    return None
                match = re.search(
                    r"<!-- STATIC_FALLBACK:START -->\n([\s\S]*?)\n<!-- STATIC_FALLBACK:END -->",
                    path.read_text(encoding="utf-8"),
                )
                if not match:
                    errors.append(f"{path.relative_to(CODE_ROOT)} 缺 bounded Static Fallback projection")
                    return None
                return [line for line in match.group(1).strip().splitlines() if line]

            for rel in (
                ".claude/skill-os/generated/static-fallback.md",
                "CLAUDE.md",
                "AGENTS.md",
            ):
                projected = bounded_projection(CODE_ROOT / rel)
                if projected is not None and projected != canonical:
                    errors.append(f"{rel} Static Fallback fact body 与 canonical promoted facts 漂移")

    if errors:
        print(json.dumps({"status": "FAIL", "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"status": "PASS", "checked": str(PROMOTED)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
