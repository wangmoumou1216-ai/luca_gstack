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

        # Bi-temporal 读侧未接通的看门人（BACKLOG #2）：写侧 propose_semantic/consolidate 已能写
        # supersedes/valid_until，读侧 get_memory/search_memory 的 parse_semantic_facts 尚不消费——
        # 一旦有事实带上这两个字段，被取代的旧事实仍会被检索出来与新事实并列。此断言让"第一次真正
        # 写入"当场可见，而不是静默生效。补完读侧过滤后连同本断言一起解除。
        for fact in facts:
            if not isinstance(fact, dict):
                continue
            for field in ("supersedes", "valid_until"):
                # `or ""` 而非 get(field, "")：YAML 里写 `supersedes:` 空值解析成 None，
                # str(None) == "None" 会被判非空而误触发（与 consolidate_memory.py 同一写法对齐）
                if str(fact.get(field) or "").strip():
                    errors.append(
                        f"{fact.get('id', '?')}: 带 {field} 但读侧过滤尚未实现（BACKLOG #2）——"
                        f"先补 get_memory/search_memory 的 parse_semantic_facts 过滤，再解除本断言"
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
