#!/usr/bin/env python3
"""Build and verify generated agent-context projections.

The script derives the skill catalog from skill frontmatter, the routing map, and explicit
visibility metadata. It derives Static Fallback text from promoted facts plus the allowlist, and
selected-skill input contracts from the one YAML registry. Generated files are deterministic and
are never hand-edited.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".claude" / "skills" / "office"
ROUTING = ROOT / ".claude" / "skill-os" / "skill-routing-map.yaml"
VISIBILITY = ROOT / ".claude" / "skill-os" / "skill-visibility.json"
MEMORY_ROOT = ROOT
ALLOWLIST = MEMORY_ROOT / "memory" / "semantic" / "static-fallback-allowlist.txt"
PROMOTED = MEMORY_ROOT / "memory" / "semantic" / "promoted-facts.yaml"
GENERATED = ROOT / ".claude" / "skill-os" / "generated"
CATALOG = GENERATED / "skill-catalog.md"
STATIC_FALLBACK = GENERATED / "static-fallback.md"
CONTEXT_INDEX = GENERATED / "context-index.md"
CONTEXT_MANIFEST = ROOT / ".claude/skill-os/agent-context-manifest.json"
INPUT_MODES = ROOT / ".claude/skill-os/input-modes.yaml"
INPUT_MODE_DIR = GENERATED / "input-modes"
INPUT_MODE_KEYS = (
    "auto", "handoff", "wait-what", "domain-modeling", "writing-for-agents", "magicpath",
    "open-design", "idea", "deepresearch", "quick-research", "brainstorm",
    "superpowers-brainstorming", "ux-research", "ux-brainstorm", "design-brief",
    "html-prototype", "figma-demo", "tech-spec", "task-plan", "grilling", "diagnosing-bugs",
    "resolving-merge-conflicts", "to-spec", "to-tickets", "wayfinder", "implement",
    "code-hygiene", "code-review", "codebase-design", "code-recon", "muse-req-triage",
    "insight-synthesis", "research-kit", "ux-writing", "compare", "ux-audit", "redteam",
    "evals", "retro",
)
CONTEXT_FIELDS = (
    "id", "obligation_ids", "runtime", "leading_words", "condition", "load_before",
    "target", "contains", "loader", "read_to_end", "fallback",
)


def fail(message: str) -> None:
    raise ValueError(message)


def set_memory_root(path: Path) -> None:
    """Select the governed memory store without changing the code/projection checkout."""
    global MEMORY_ROOT, ALLOWLIST, PROMOTED
    MEMORY_ROOT = path.resolve()
    ALLOWLIST = MEMORY_ROOT / "memory" / "semantic" / "static-fallback-allowlist.txt"
    PROMOTED = MEMORY_ROOT / "memory" / "semantic" / "promoted-facts.yaml"


class UniqueKeyLoader(yaml.SafeLoader):
    """Safe YAML loader that rejects ambiguous duplicate mapping keys."""


def construct_unique_mapping(loader: UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False) -> dict:
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            fail(f"duplicate YAML key in input-modes.yaml: {key}")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_unique_mapping,
)


def frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---(?:\n|$)", text, re.S)
    if not match:
        fail(f"missing YAML frontmatter: {path.relative_to(ROOT)}")
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        fail(f"frontmatter is not a mapping: {path.relative_to(ROOT)}")
    return data


def skill_paths() -> dict[str, Path]:
    paths = {"office": SKILLS / "SKILL.md"}
    for child in sorted(SKILLS.iterdir()):
        candidate = child / "SKILL.md"
        if child.is_dir() and candidate.is_file():
            paths[child.name] = candidate
    return paths


def routed_local_skills(paths: dict[str, Path]) -> set[str]:
    data = yaml.safe_load(ROUTING.read_text(encoding="utf-8")) or {}
    entries = data.get("project_skills", {})
    if not isinstance(entries, dict):
        fail("routing map project_skills must be a mapping")
    routed = set()
    for key, entry in entries.items():
        if not isinstance(entry, dict):
            continue
        candidate = str(entry.get("skill") or key.replace("_", "-"))
        if candidate in paths:
            routed.add(candidate)
    return routed


def defining_constraint(description: object) -> str:
    text = re.sub(r"\s+", " ", str(description or "")).strip()
    text = text.replace("(luca_gstack)", "").strip()
    if not text:
        fail("skill description is empty")
    if len(text) > 104:
        text = text[:101].rstrip(" ,，。.;；") + "…"
    return text.replace("|", "\\|")


def render_catalog() -> str:
    paths = skill_paths()
    visibility = json.loads(VISIBILITY.read_text(encoding="utf-8"))
    visible = routed_local_skills(paths) | set(visibility.get("visible_additions", []))
    hidden = set(visibility.get("hidden", []))
    internal = set(visibility.get("internal", []))
    groups = {"Visible/direct": visible, "Hidden/on-demand": hidden, "Internal/delegated": internal}

    overlaps = (visible & hidden) | (visible & internal) | (hidden & internal)
    if overlaps:
        fail(f"skill visibility overlaps: {sorted(overlaps)}")
    classified = visible | hidden | internal
    missing = set(paths) - classified
    extra = classified - set(paths)
    if missing or extra:
        fail(f"skill visibility partition drift: missing={sorted(missing)} extra={sorted(extra)}")

    retired = visibility.get("retired", [])
    if not isinstance(retired, list):
        fail("skill visibility retired entries must be a list")
    retired_names: set[str] = set()
    for entry in retired:
        required = {"name", "status", "replacement", "decision_id", "boundary"}
        if not isinstance(entry, dict) or set(entry) != required:
            fail("each retired skill entry must contain exactly name/status/replacement/decision_id/boundary")
        name = str(entry["name"])
        if not re.fullmatch(r"[a-z][a-z0-9-]*", name) or name in retired_names:
            fail(f"invalid or duplicate retired skill name: {name}")
        if name in classified or name in paths:
            fail(f"retired skill remains active: {name}")
        # A retirement need not invent a successor. Only null means no replacement;
        # named replacements must still resolve to a current skill.
        replacement = entry["replacement"]
        if entry["status"] != "retired-unavailable" or not (
            replacement is None or isinstance(replacement, str) and replacement in paths
        ):
            fail(f"invalid retired skill status or replacement: {name}")
        # RET identifies a user-approved repository retirement, not a promoted memory fact.
        if not re.fullmatch(r"(?:SC|RET)-\d{8}-\d{3}", str(entry["decision_id"])) or not str(entry["boundary"]).strip():
            fail(f"invalid retired skill decision or boundary: {name}")
        retired_names.add(name)

    lines = [
        "# Agent skill discovery catalog",
        "",
        "> Generated by `scripts/build-agent-context.py`; do not edit by hand. Read this catalog before skill selection, including STOP with no matched skill.",
    ]
    for heading, names in groups.items():
        lines.extend(["", f"## {heading}", "", "| Skill | Defining constraint | Authority path |", "|---|---|---|"])
        for name in sorted(names):
            path = paths[name]
            fm = frontmatter(path)
            declared = str(fm.get("name") or "")
            if declared != name:
                fail(f"skill name mismatch: path={name} frontmatter={declared}")
            rel = path.relative_to(ROOT).as_posix()
            lines.append(f"| `{name}` | {defining_constraint(fm.get('description'))} | `{rel}` |")
    if retired:
        lines.extend([
            "",
            "## Retired/unavailable",
            "",
            "These discovery tombstones are not callable skills or authority-file links.",
            "",
        ])
        for entry in sorted(retired, key=lambda item: item["name"]):
            lines.append(
                f"- `{entry['name']}` — `{entry['status']}`; replacement: `{entry['replacement'] if entry['replacement'] is not None else 'none'}`; "
                f"{entry['boundary']} (`{entry['decision_id']}`)"
            )
    lines.extend(["", "<!-- FILE_END: skill-os/generated/skill-catalog.md -->", ""])
    rendered = "\n".join(lines)
    if len(rendered.encode("utf-8")) > 12_288:
        fail(f"skill catalog exceeds 12KB soft cap: {len(rendered.encode('utf-8'))} bytes")
    return rendered


def allowlisted_facts() -> list[dict]:
    allow = [
        line.split("#", 1)[0].strip()
        for line in ALLOWLIST.read_text(encoding="utf-8").splitlines()
        if line.split("#", 1)[0].strip()
    ]
    data = yaml.safe_load(PROMOTED.read_text(encoding="utf-8")) or {}
    facts = data.get("facts", [])
    by_id = {str(fact.get("id")): fact for fact in facts if isinstance(fact, dict)}
    missing = [fact_id for fact_id in allow if fact_id not in by_id]
    if missing:
        fail(f"allowlisted facts missing from promoted facts: {missing}")
    return [by_id[fact_id] for fact_id in allow]


def render_static_fallback() -> str:
    lines = [
        "# Static Fallback projection",
        "",
        "> Generated by `scripts/build-agent-context.py` from governed semantic memory. Both root adapters must inline the bullets exactly.",
        "",
        "<!-- STATIC_FALLBACK:START -->",
    ]
    for fact in allowlisted_facts():
        text = re.sub(r"\s+", " ", str(fact["fact"])).strip()
        lines.append(f"- [{fact['id']} / {fact['domain']}] {text}")
    lines.extend([
        "<!-- STATIC_FALLBACK:END -->",
        "",
        "<!-- FILE_END: skill-os/generated/static-fallback.md -->",
        "",
    ])
    return "\n".join(lines)


def render_context_index() -> str:
    manifest = json.loads(CONTEXT_MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("version") != 1 or not isinstance(manifest.get("entries"), list):
        fail("unsupported context manifest")
    entries = []
    for entry in manifest["entries"]:
        # New fields must be classified rather than silently omitted from agent context.
        if set(entry) != set(CONTEXT_FIELDS) | {"truth_owner", "fixtures"}:
            fail(f"unclassified or missing context fields: {entry.get('id', '<unknown>')}")
        projected = {key: entry[key] for key in CONTEXT_FIELDS}
        if entry["truth_owner"] != entry["target"]:
            projected["truth_owner"] = entry["truth_owner"]
        entries.append(projected)
    lines = [
        "# Agent context index",
        "",
        "> Generated from `.claude/skill-os/agent-context-manifest.json`; do not edit by hand.",
        "Only implementation-source and test-fixture metadata are omitted. All operational fields are verbatim.",
        "Match conditions semantically, not by hints alone. Root timing, full owner reads and safety gates are unchanged.",
        "If this index is missing, unreadable or known stale, use the complete source manifest; never infer no obligations.",
        "",
        "```json",
        "[",
    ]
    lines.extend(json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
                 + ("," if index < len(entries) - 1 else "") for index, entry in enumerate(entries))
    lines.extend([
        "]", "```", "", "<!-- FILE_END: skill-os/generated/context-index.md -->", "",
    ])
    return "\n".join(lines)


def input_mode_views() -> dict[Path, str]:
    source_bytes = INPUT_MODES.read_bytes()
    source = yaml.load(source_bytes.decode("utf-8"), Loader=UniqueKeyLoader)
    if not isinstance(source, dict) or set(source) != {"version", "principle", "skills", "governance_tools"}:
        fail("input-modes.yaml must contain exactly version/principle/skills/governance_tools")
    if source["version"] != 1 or not isinstance(source["principle"], str) or not source["principle"].strip():
        fail("input-modes.yaml has an invalid version or principle")
    groups = {name: source[name] for name in ("skills", "governance_tools")}
    if any(not isinstance(group, dict) for group in groups.values()):
        fail("input-modes.yaml groups must be mappings")
    overlaps = set(groups["skills"]) & set(groups["governance_tools"])
    if overlaps:
        fail(f"input-mode keys overlap across groups: {sorted(overlaps)}")
    actual = set(groups["skills"]) | set(groups["governance_tools"])
    expected = set(INPUT_MODE_KEYS)
    if actual != expected:
        fail(f"input-mode key set drift: missing={sorted(expected - actual)} extra={sorted(actual - expected)}")
    digest = hashlib.sha256(source_bytes).hexdigest()
    rendered = {}
    for skill in INPUT_MODE_KEYS:
        group = "skills" if skill in groups["skills"] else "governance_tools"
        contract = groups[group][skill]
        if not isinstance(contract, dict) or not contract:
            fail(f"input-mode contract must be a non-empty mapping: {skill}")
        view = {
            "schema_version": 1,
            "source_sha256": digest,
            "skill": skill,
            "group": group,
            "global": {"version": source["version"], "principle": source["principle"]},
            "contract": contract,
        }
        rendered[INPUT_MODE_DIR / f"{skill}.json"] = json.dumps(
            view, ensure_ascii=False, indent=2, sort_keys=False,
        ) + "\n"
    return rendered


def expected_files() -> dict[Path, str]:
    return {
        CATALOG: render_catalog(),
        STATIC_FALLBACK: render_static_fallback(),
        CONTEXT_INDEX: render_context_index(),
        **input_mode_views(),
    }


def reject_extra_input_mode_views() -> None:
    if not INPUT_MODE_DIR.exists():
        return
    expected = {f"{key}.json" for key in INPUT_MODE_KEYS}
    actual = {path.name for path in INPUT_MODE_DIR.iterdir()}
    extra = sorted(actual - expected)
    if extra:
        fail(f"unexpected generated input-mode files: {extra}")


def static_fallback_block() -> str:
    rendered = render_static_fallback()
    match = re.search(r"<!-- STATIC_FALLBACK:START -->\n[\s\S]*?\n<!-- STATIC_FALLBACK:END -->", rendered)
    if not match:
        fail("rendered Static Fallback lacks bounded projection")
    return match.group(0)


def sync_projections() -> None:
    """Update generated artifacts and both bounded root projections as one rollback unit.

    Each installed file uses an atomic rename. A synchronous install error restores every
    preimage; cross-file crash atomicity is neither available nor claimed.
    """
    reject_extra_input_mode_views()
    planned = expected_files()
    block = static_fallback_block()
    for root_name in ("CLAUDE.md", "AGENTS.md"):
        path = ROOT / root_name
        content = path.read_text(encoding="utf-8")
        updated, count = re.subn(
            r"<!-- STATIC_FALLBACK:START -->\n[\s\S]*?\n<!-- STATIC_FALLBACK:END -->",
            lambda _match: block,
            content,
            count=1,
        )
        if count != 1:
            fail(f"{root_name} must contain exactly one bounded Static Fallback projection")
        planned[path] = updated

    snapshots = {path: path.read_bytes() if path.exists() else None for path in planned}
    temp_paths: dict[Path, Path] = {}
    try:
        for path, content in planned.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            fd, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            temp_paths[path] = Path(name)
        fail_after_raw = os.environ.get("AGENT_CONTEXT_TEST_FAIL_AFTER_REPLACE", "")
        fail_after = int(fail_after_raw) if fail_after_raw else 0
        for index, (path, temp_path) in enumerate(temp_paths.items(), start=1):
            os.replace(temp_path, path)
            if fail_after and index == fail_after:
                raise RuntimeError(f"injected projection install failure after replace {index}")
        print("WROTE generated context and both root Static Fallback projections")
    except Exception:
        for path, snapshot in snapshots.items():
            if snapshot is None:
                if path.exists():
                    path.unlink()
            else:
                fd, name = tempfile.mkstemp(prefix=f".{path.name}.rollback.", dir=path.parent)
                try:
                    with os.fdopen(fd, "wb") as handle:
                        handle.write(snapshot)
                        handle.flush()
                        os.fsync(handle.fileno())
                    os.replace(name, path)
                finally:
                    if os.path.exists(name):
                        os.unlink(name)
        raise
    finally:
        for temp_path in temp_paths.values():
            if temp_path.exists():
                temp_path.unlink()


def check_generated() -> None:
    reject_extra_input_mode_views()
    errors = []
    for path, expected in expected_files().items():
        if not path.is_file():
            errors.append(f"missing generated file: {path.relative_to(ROOT)}")
        elif path.read_text(encoding="utf-8") != expected:
            errors.append(f"stale generated file: {path.relative_to(ROOT)}")
    if errors:
        fail("; ".join(errors))
    print("PASS generated agent context is current")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("check", "sync"))
    parser.add_argument(
        "--memory-root",
        type=Path,
        default=ROOT,
        help="authoritative memory-store root; projections stay in this script's checkout",
    )
    args = parser.parse_args()
    try:
        set_memory_root(args.memory_root)
        if args.mode == "sync":
            sync_projections()
        else:
            check_generated()
    except Exception as exc:
        print(f"FAIL build-agent-context: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
