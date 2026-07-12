#!/usr/bin/env python3
"""P0 inventory freeze — enumerate mattpocock/skills into a hashed inventory.

Machine-derives invocation type (frontmatter `disable-model-invocation`) and
promoted status (presence in .claude-plugin/plugin.json), so the inventory is
observed, not asserted. Every file hashed (sha256) — the inventory is the
denominator for all coverage assertions (A1/A2/A7).

Usage: python3 gen_inventory.py <clone_root> > inventory.yaml
"""
import sys, os, hashlib, json, re

CLONE = sys.argv[1].rstrip("/")
COMMIT = os.environ.get("BM_COMMIT", "unknown")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def rel(path):
    return os.path.relpath(path, CLONE)


def frontmatter_flag(skill_md, key):
    """Return True if frontmatter has `key: true`. Frontmatter = leading --- block."""
    try:
        with open(skill_md, encoding="utf-8") as f:
            txt = f.read()
    except Exception:
        return False
    m = re.match(r"^---\n(.*?)\n---", txt, re.S)
    if not m:
        return False
    for line in m.group(1).splitlines():
        mm = re.match(rf"\s*{re.escape(key)}\s*:\s*(\S+)", line)
        if mm:
            return mm.group(1).strip().lower() == "true"
    return False


def description(skill_md):
    try:
        with open(skill_md, encoding="utf-8") as f:
            txt = f.read()
    except Exception:
        return ""
    m = re.match(r"^---\n(.*?)\n---", txt, re.S)
    if not m:
        return ""
    for line in m.group(1).splitlines():
        mm = re.match(r"\s*description\s*:\s*(.+)", line)
        if mm:
            return mm.group(1).strip().strip('"').strip("'")
    return ""


# --- promoted set from plugin.json ---
promoted_paths = set()
plugin_json = os.path.join(CLONE, ".claude-plugin", "plugin.json")
if os.path.exists(plugin_json):
    with open(plugin_json) as f:
        pj = json.load(f)
    # plugin.json lists skill paths; normalize to bucket/name
    blob = json.dumps(pj)
    for m in re.finditer(r"skills/([a-z-]+)/([a-z0-9-]+)", blob):
        promoted_paths.add(f"{m.group(1)}/{m.group(2)}")


# --- skill units ---
skills_root = os.path.join(CLONE, "skills")
skill_dirs = {}
for dirpath, _, files in os.walk(skills_root):
    if "SKILL.md" in files:
        skill_dirs[dirpath] = files

units = []
for d in sorted(skill_dirs):
    parts = rel(d).split(os.sep)  # skills/<bucket>/<name>
    bucket, name = parts[1], parts[2]
    skill_md = os.path.join(d, "SKILL.md")
    key = f"{bucket}/{name}"
    support = []
    for dp, _, fs in os.walk(d):
        for fn in sorted(fs):
            if fn == "SKILL.md" and dp == d:
                continue
            p = os.path.join(dp, fn)
            support.append({"path": rel(p), "sha256": sha256(p)})
    units.append({
        "id": f"skill:{key}",
        "kind": "skill",
        "bucket": bucket,
        "name": name,
        "invocation": "user-invoked" if frontmatter_flag(skill_md, "disable-model-invocation") else "model-invoked",
        "promoted": key in promoted_paths,
        "path": rel(skill_md),
        "sha256": sha256(skill_md),
        "description": description(skill_md),
        "support_files": support,
    })

# --- mechanism units (cross-cutting framework conventions/techniques) ---
# Each evaluates a TRANSFERABLE pattern distinct from any single skill file.
def hfiles(paths):
    out = []
    for p in paths:
        ap = os.path.join(CLONE, p)
        if os.path.exists(ap):
            out.append({"path": p, "sha256": sha256(ap)})
        else:
            out.append({"path": p, "sha256": "MISSING"})
    return out

mech = [
    ("mech:invocation-cost-model",
     "user-invoked vs model-invoked 显式成本模型（context load vs cognitive load）+ 两轴分类学",
     [".agents/invocation.md", "skills/productivity/writing-great-skills/SKILL.md",
      "skills/productivity/writing-great-skills/GLOSSARY.md"]),
    ("mech:writing-great-skills-metavocab",
     "写 skill 的元词汇系统（Predictability 根德性 + 20+ 术语 + 6 failure mode）作为可教/可 code-review 的对象",
     ["skills/productivity/writing-great-skills/SKILL.md",
      "skills/productivity/writing-great-skills/GLOSSARY.md"]),
    ("mech:leading-word",
     "leading word / Leitwort 手法——把 skill 锚在一个招募预训练先验的压缩概念上",
     ["skills/productivity/writing-great-skills/GLOSSARY.md",
      "skills/engineering/wayfinder/SKILL.md",
      "skills/engineering/diagnosing-bugs/SKILL.md"]),
    ("mech:avoid-alias-table",
     "_Avoid_ 别名表强制语言收敛（选一个 canonical 词 + 列要避免的同义词）",
     ["skills/engineering/codebase-design/SKILL.md",
      "skills/engineering/domain-modeling/CONTEXT-FORMAT.md",
      "skills/productivity/teach/GLOSSARY-FORMAT.md"]),
    ("mech:out-of-scope-registry",
     ".out-of-scope/ 被拒需求知识库作为一等制品（防反复重新讨论同一被拒需求）",
     [".out-of-scope/mainstream-issue-trackers-only.md",
      ".out-of-scope/question-limits.md",
      ".out-of-scope/setup-skill-verify-mode.md",
      "skills/engineering/triage/OUT-OF-SCOPE.md"]),
    ("mech:promoted-contract",
     "promoted 契约（README/plugin.json/docs 三处机器可校验同步）+ bucket 生命周期建模",
     ["CLAUDE.md", ".claude-plugin/plugin.json", ".agents/writing-docs.md"]),
    ("mech:hard-soft-dependency-adr",
     "hard vs soft 依赖 ADR（避免到处 cargo-cult setup 指针）",
     [".agents/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md"]),
    ("mech:prove-it-bites",
     "prove-it-bites 验证环（观察到 fail 再 pass / 验 exit code / 粘命令+输出，不接受'应该能工作'）",
     ["skills/in-progress/setup-ts-deep-modules/SKILL.md",
      "skills/engineering/diagnosing-bugs/SKILL.md",
      "skills/misc/git-guardrails-claude-code/SKILL.md"]),
    ("mech:thin-orchestration-thick-primitive",
     "薄编排层 + 厚 primitive（几行 skill 靠 /skill 式散文调用 model-invoked primitive 获得完整能力）",
     ["skills/engineering/grill-with-docs/SKILL.md",
      "skills/engineering/implement/SKILL.md",
      "skills/productivity/grill-me/SKILL.md"]),
    ("mech:changelog-rationale-archive",
     "CHANGELOG/changesets 作为设计决策演进 rationale 档案（记录重命名/搬迁/reframe 理由）",
     ["CHANGELOG.md", ".changeset/prototype-primary-source.md",
      ".changeset/friendlier-setup-and-local-tickets.md"]),
    ("mech:context-md-domain-glossary",
     "CONTEXT.md 领域词汇表作为一等制品 + 主动领域建模（passive 读 vs active 建）+ 吃自己狗粮",
     ["CONTEXT.md", "skills/engineering/domain-modeling/CONTEXT-FORMAT.md",
      "skills/engineering/domain-modeling/SKILL.md"]),
    ("mech:docs-as-distributed-router",
     "docs 页作为分布式路由器节点（固定骨架/必点 defining constraint/绝对链接）",
     [".agents/writing-docs.md"]),
]
for mid, mname, anchors in mech:
    units.append({
        "id": mid,
        "kind": "mechanism",
        "name": mname,
        "anchor_files": hfiles(anchors),
    })

# --- emit YAML (hand-rolled to avoid yaml dep for writing; readable) ---
def y(s):
    if s is None:
        return '""'
    s = str(s)
    if s == "" or any(c in s for c in ':#{}[],&*!|>\'"%@`') or s != s.strip():
        return json.dumps(s, ensure_ascii=False)
    return s

print("# P0 inventory freeze — mattpocock/skills 对标分母")
print(f"source_repo: mattpocock/skills")
print(f"commit: {COMMIT}")
print(f"clone_root: {CLONE}")
print(f"skill_count: {len([u for u in units if u['kind']=='skill'])}")
print(f"mechanism_count: {len([u for u in units if u['kind']=='mechanism'])}")
print(f"total_units: {len(units)}")
print("units:")
for u in units:
    print(f"  - id: {u['id']}")
    print(f"    kind: {u['kind']}")
    if u["kind"] == "skill":
        print(f"    bucket: {u['bucket']}")
        print(f"    name: {u['name']}")
        print(f"    invocation: {u['invocation']}")
        print(f"    promoted: {str(u['promoted']).lower()}")
        print(f"    path: {u['path']}")
        print(f"    sha256: {u['sha256']}")
        print(f"    description: {y(u['description'])}")
        if u["support_files"]:
            print(f"    support_files:")
            for sf in u["support_files"]:
                print(f"      - path: {sf['path']}")
                print(f"        sha256: {sf['sha256']}")
        else:
            print(f"    support_files: []")
    else:
        print(f"    name: {y(u['name'])}")
        print(f"    anchor_files:")
        for af in u["anchor_files"]:
            print(f"      - path: {af['path']}")
            print(f"        sha256: {af['sha256']}")
