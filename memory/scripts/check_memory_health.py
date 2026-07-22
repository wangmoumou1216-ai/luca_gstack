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


ROOT = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
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
            claude_md_path = ROOT / "CLAUDE.md"
            if claude_md_path.exists():
                # 只在 Static Fallback 小节内匹配：全文匹配会把路由节的 prose 引用误判为"已镜像"（audit F2-08）
                md_lines = claude_md_path.read_text(encoding="utf-8").splitlines()
                start = next((i for i, ln in enumerate(md_lines) if ln.startswith("#") and "Static Fallback" in ln), None)
                if start is None:
                    errors.append("CLAUDE.md 缺少 Static Fallback 小节（每-session 注入通道断裂）")
                    sf_ids = set()
                else:
                    end = next((j for j in range(start + 1, len(md_lines)) if md_lines[j].startswith("#")), len(md_lines))
                    sf_ids = set(re.findall(r"^- \[([A-Z0-9-]+) /", "\n".join(md_lines[start:end]), re.M))
                for sid in sorted(sf_ids - allow_ids):
                    errors.append(f"CLAUDE.md SF: {sid} 不在白名单（SF 须为白名单子集）")
                # 反向（BACKLOG #20）：白名单事实必须真出现在 SF 节，否则事实从 CLAUDE.md 静默消失无人察觉
                for aid in sorted(allow_ids - sf_ids):
                    errors.append(f"static-fallback-allowlist: {aid} 未出现在 CLAUDE.md Static Fallback 节（镜像缺失）")

    if errors:
        print(json.dumps({"status": "FAIL", "errors": errors}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"status": "PASS", "checked": str(PROMOTED)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
