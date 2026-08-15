#!/usr/bin/env python3
"""person 层记忆的引用完整性 + 矛盾/取代体检（只读，fail-open）。

补的是记忆系统缺的那条边：写入有闸、晋升有门，**退役与自检没有执行面**。
本脚本不修改任何文件，只输出待裁清单，供 daily_governance 写进 digest。

两块检查：
  A) 引用完整性 —— 死 wiki-link / 孤儿文件 / 索引-磁盘差集
  B) 矛盾与取代 —— 同主题高重叠 + 后者含「取代/推翻/已修/降为指针」类措辞

## 为什么输出「集合」而不是「计数」

死链的可修性分类依赖若干**未良定义的谓词**（`[[x.md]]` 算不算死？连字符归一能否与
补前缀复合？是否传递？）。三轮红队用三个等价实现得出 12/2/9/19、12/2/7/21、40 vs 42
三组不同数字——**锚在计数上，正确的实现会因对不上而 FAIL，错的会因对上而 PASS**。
因此本脚本的契约是：输出**目标集合**与每个目标的**解析尝试记录**，让人对着集合逐条裁，
计数只作展示。

环境变量：`GLOBAL_MEMORY_DIR` 覆盖 person 记忆目录（与 daily_governance.py 同名同义）。
"""
import json
import os
import re
import sys
from pathlib import Path

GLOBAL_MEMORY_DIR = Path(os.environ.get(
    "GLOBAL_MEMORY_DIR",
    str(Path.home() / ".claude" / "projects" / "-Users-luca-Desktop-luca-gstack" / "memory"),
))

INDEX_NAME = "MEMORY.md"
WIKI_RE = re.compile(r"\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]")
INDEX_ROW_RE = re.compile(r"^- \[[^\]]*\]\(([^)]+)\)")
# 「后者废止前者」的措辞信号（G6-6）。刻意做窄：宁可漏报也不要把正常的互相引用刷成噪音。
SUPERSEDE_WORDS = ("取代", "推翻", "已修", "降为指针", "已失效", "作废", "不再适用", "supersede")
# 退化触发器 / 到期复查声明（G6-2）
DECAY_WORDS = ("退化触发器", "复查时机", "待验证", "待重启验证", "通过后本条", "issue 关闭后")


def _read(path):
    try:
        return path.read_text(encoding="utf-8")
    except Exception:  # noqa: BLE001 — 体检绝不因单文件读失败而中断
        return ""


def memory_files(root):
    """活动记忆文件：排除索引本身、备份、归档子目录。"""
    out = []
    for p in sorted(root.glob("*.md")):
        if p.name == INDEX_NAME or ".bak" in p.name:
            continue
        out.append(p)
    return out


def resolve_target(target, stems):
    """把一个 wiki-link 目标解析到磁盘 stem。返回 (resolved_stem 或 None, 用了哪条规则)。

    规则按保守→宽松排列，先命中先返回；每条都记录下来，便于人工复核解析是否合理。
    """
    t = target.strip()
    if t in stems:
        return t, "exact"
    if t.endswith(".md") and t[:-3] in stems:
        return t[:-3], "strip_md"
    for prefix in ("feedback_", "reference_", "candidate_feedback_"):
        if prefix + t in stems:
            return prefix + t, f"prefix:{prefix}"
    # 连字符 ↔ 下划线归一：只在 stem 全集上做一次规范化比对，不与补前缀复合传递
    norm = lambda s: s.replace("-", "_").lower()
    hit = [s for s in stems if norm(s) == norm(t)]
    if len(hit) == 1:
        return hit[0], "sepnorm"
    for prefix in ("feedback_", "reference_", "candidate_feedback_"):
        hit = [s for s in stems if norm(s) == norm(prefix + t)]
        if len(hit) == 1:
            return hit[0], f"sepnorm+prefix:{prefix}"
    return None, "unresolved"


def check_references(root):
    files = memory_files(root)
    stems = {p.stem for p in files}
    index_path = root / INDEX_NAME
    index_text = _read(index_path)

    # 索引收录的文件
    indexed = set()
    for line in index_text.splitlines():
        m = INDEX_ROW_RE.match(line)
        if m:
            indexed.add(Path(m.group(1)).stem)

    dead = {}          # target -> {"occurrences": [...], "rule": ...}
    for p in [index_path] + files:
        text = _read(p)
        lines = text.splitlines()
        for lineno, line in enumerate(lines, start=1):
            for target in WIKI_RE.findall(line):
                resolved, rule = resolve_target(target, stems)
                if resolved is None:
                    entry = dead.setdefault(target, {"occurrences": [], "context_has_merge": False})
                    entry["occurrences"].append(f"{p.name}:{lineno}")
                    if "并入" in line:
                        entry["context_has_merge"] = True

    # 孤儿：磁盘上有、索引里没有，且不是设计上就不进索引的候选
    orphans = sorted(
        p.stem for p in files
        if p.stem not in indexed and not p.name.startswith("candidate_feedback_")
    )
    # 完全失联：既不在索引、也没有任何文件链接到它
    all_targets = set()
    for p in [index_path] + files:
        all_targets.update(t.strip() for t in WIKI_RE.findall(_read(p)))
    unreachable = sorted(
        s for s in orphans
        if s not in all_targets and s.replace("feedback_", "", 1) not in all_targets
    )
    # 索引指向但磁盘不存在
    broken_index = sorted(indexed - stems)

    return {
        "dead_link_targets": {k: v for k, v in sorted(dead.items())},
        "dead_link_target_count": len(dead),
        "dead_link_occurrence_count": sum(len(v["occurrences"]) for v in dead.values()),
        "orphan_files": orphans,
        "unreachable_files": unreachable,
        "broken_index_rows": broken_index,
        "index_entry_count": len(indexed),
        "index_chars": len(index_text),
    }


def _tokens(text):
    """与 search_memory 同族的轻量分词：CJK bigram + 拉丁词。"""
    cjk = re.findall(r"[一-鿿]", text)
    bigrams = {"".join(pair) for pair in zip(cjk, cjk[1:])}
    latin = {w.lower() for w in re.findall(r"[A-Za-z][A-Za-z_]{2,}", text)}
    return bigrams | latin


def _semantic_docs(memory_root):
    """框架 semantic 层的文档（候选 + 已晋升事实），用于跨层重复检测。"""
    docs = {}
    cand = memory_root / "semantic" / "candidates.jsonl"
    if cand.is_file():
        for line in _read(cand).splitlines():
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except Exception:  # noqa: BLE001
                continue
            fact = str(rec.get("fact", ""))
            if fact:
                docs[f"cand:{rec.get('id', '?')}"] = fact
    promoted = memory_root / "semantic" / "promoted-facts.yaml"
    if promoted.is_file():
        # 轻量解析：只抓 id 与 fact 首段，不引 yaml 依赖（与 search_memory 的容错解析同策）
        cur_id, buf = None, []
        for line in _read(promoted).splitlines():
            m = re.match(r"\s*-\s*id:\s*(\S+)", line)
            if m:
                if cur_id and buf:
                    docs[f"fact:{cur_id}"] = " ".join(buf)
                cur_id, buf = m.group(1), []
                continue
            m = re.match(r"\s*fact:\s*(.*)", line)
            if m and cur_id:
                buf.append(m.group(1))
        if cur_id and buf:
            docs[f"fact:{cur_id}"] = " ".join(buf)
    return docs


def check_supersession(memory_root, min_shared_rare=5, rare_df=3):
    """G6-6：找 semantic 层里「说的是同一件事」的记忆对，只提示不改。

    ## 为什么用「共享稀有 token」而不是重叠率

    实测（2026-08-15）：真实案例 SC-20260811-002 ↔ SC-20260814-001（同一条 Git env 隔离
    纪律的两次记录，后者自述「源头修复后本条只作兜底指针」）的 min-归一重叠只有 **0.161**、
    jaccard 0.071 —— 现成的 `duplicate_candidates`（normalize_fact 相等 / 包含）也 **永不触发**。
    改用 **df ≤ rare_df 的共享 token 计数**（IDF 思路）后，该案例以 `git_dir` /
    `git_work_tree` / `git_index_file` 等字面量被稳定命中；且该判据在 29 条候选上
    **独立复现了人工精读得出的全部三组重复**（722-003/005、722-002/728-001、811-002/814-001）。

    ## 为什么只扫 semantic 层，不扫 person 层

    person 记忆是 1–15KB 的长文，semantic 候选是几百字的单句事实。混在一个语料里时：
    ① min(len) 归一让任何小文档与巨型文档配对都高分（实测 person 层 9 对里 5 对挂着同一个
    15KB 文件）；② 中文 bigram 在长文里大量「恰好稀有」（`个平`/`了事`）成为噪音源；
    ③ 试过的降噪（限拉丁 token、剥 frontmatter 的 originSessionId 十六进制、去 wiki-link 名）
    在把噪音从 164 对压到 27 对的同时，把金标准命中率从 3/3 打到 1/3。
    **长度可比是这个判据的前提。** person 层的重复检测需要另一种方法（按段落切分或先摘要），
    本脚本**不做**——宁可不报，也不出一个在自己动机案例上失灵的检测器。

    废止措辞（SUPERSEDE_WORDS）是**注解**不是门槛——最该合并的那组（#FF8000 对比度两条）
    根本不含任何废止措辞。
    """
    docs = _semantic_docs(memory_root) if memory_root is not None else {}
    tokenized = {k: _tokens(v) for k, v in docs.items()}
    df = {}
    for ts in tokenized.values():
        for t in ts:
            df[t] = df.get(t, 0) + 1

    pairs = []
    names = sorted(tokenized)
    for i, a in enumerate(names):
        ta = tokenized[a]
        if not ta:
            continue
        for b in names[i + 1:]:
            tb = tokenized[b]
            if not tb:
                continue
            shared_rare = {t for t in (ta & tb) if df.get(t, 0) <= rare_df}
            if len(shared_rare) < min_shared_rare:
                continue
            signals = [w for w in SUPERSEDE_WORDS if w in docs[a] or w in docs[b]]
            pairs.append({
                "a": a, "b": b,
                "shared_rare": len(shared_rare),
                "sample_tokens": sorted(shared_rare)[:8],
                "supersede_signals": signals,
            })
    pairs.sort(key=lambda x: -x["shared_rare"])
    return pairs


def check_decay_triggers(root):
    """G6-2：自带退化触发器/复查条件的记忆，列出来让人复核条件是否已满足。"""
    out = []
    for p in memory_files(root):
        text = _read(p)
        hits = [w for w in DECAY_WORDS if w in text]
        if hits:
            out.append({"file": p.name, "signals": hits})
    return out


def main() -> int:
    root = GLOBAL_MEMORY_DIR
    if not root.is_dir():
        print(f"person 记忆目录不存在，跳过体检：{root}", file=sys.stderr)
        return 0

    # 框架 semantic 层的位置：优先 MEMORY_ROOT（与其余记忆脚本同源），否则脚本相对回落
    mem_env = os.environ.get("MEMORY_ROOT")
    memory_root = (Path(mem_env) / "memory") if mem_env else (Path(__file__).resolve().parents[1])
    if not memory_root.is_dir():
        memory_root = None

    report = {
        "root": str(root),
        "semantic_root": str(memory_root) if memory_root else None,
        "references": check_references(root),
        "supersession_candidates": check_supersession(memory_root),
        "decay_triggers": check_decay_triggers(root),
    }

    if "--json" in sys.argv:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    ref = report["references"]
    print(f"person 记忆体检 — {root}")
    print(f"  索引 {ref['index_entry_count']} 条 / {ref['index_chars']} 字符")
    print(f"  死 wiki-link：{ref['dead_link_target_count']} 个目标 / "
          f"{ref['dead_link_occurrence_count']} 处")
    merged = [k for k, v in ref["dead_link_targets"].items() if v["context_has_merge"]]
    print(f"    其中上下文含「并入」标注（可重定向到吸收者）：{len(merged)}")
    print(f"    真无主（无并入线索，需人工裁）：{ref['dead_link_target_count'] - len(merged)}")
    print(f"  孤儿文件（在磁盘不在索引）：{len(ref['orphan_files'])}")
    print(f"  完全失联（不在索引且无人链接）：{ref['unreachable_files'] or '无'}")
    print(f"  索引死行（指向不存在的文件）：{ref['broken_index_rows'] or '无'}")
    sup = report["supersession_candidates"]
    print(f"  疑似重复/取代待裁（semantic 层）：{len(sup)} 对")
    for pair in sup[:6]:
        sig = f" 废止措辞={','.join(pair['supersede_signals'])}" if pair["supersede_signals"] else ""
        print(f"    共享稀有token {pair['shared_rare']:3d}  {pair['a']} ↔ {pair['b']}{sig}")
        print(f"       {pair['sample_tokens']}")
    print(f"  自带退化触发器待复核：{len(report['decay_triggers'])} 条")
    for item in report["decay_triggers"][:5]:
        print(f"    {item['file']}  ({','.join(item['signals'])})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
