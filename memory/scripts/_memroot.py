#!/usr/bin/env python3
"""单一记忆根解析器 + 裂脑判别器（P1 / FIX-1，2026-07-24 跨-agent 适配）。

与 JS 孪生 `.claude/hooks/lib/memroot.mjs` **同算法**（cross-lang parity 由
`scripts/test-memroot-parity.mjs` 保证）。生产 10 个记忆脚本的 ROOT 解析统一走
`resolve_memory_root`（消 JS/py 裂脑与 cloud 幻影树）。

设计要点：
- fallback = **脚本相对仓根** `Path(__file__).resolve().parents[2]`（cwd 无关、解符号链接），
  与 JS 侧 `import.meta.url` 上 3 级 + realpathSync = lib→hooks→.claude→repo **同根**。
- MEMORY_ROOT 目录存在即接受（显式意图，含 bootstrap 空 store）；只对"不存在/不可访问/非绝对"
  回落。wrong-but-existing store 由 daily_governance 判别器（硬编码 auth 对比）兜底。
- 相对 MEMORY_ROOT 一律拒绝回落（相对路径按各自进程 cwd 解析会 JS/py 裂脑，深审 R1）。
- 判别器 FAIL-SAFE 向检测：auth 缺失时缺 opt-in 一律 ANOMALY，仅正向 MEMORY_STANDALONE=1 /
  gitignored marker 才降 note。
"""
import os
import sys
from pathlib import Path

# _memroot.py 在 memory/scripts/ → parents[2] = 仓根（.resolve() 解符号链接）
SCRIPT_REPO_ROOT = Path(__file__).resolve().parents[2]


def _normalize_abs(p) -> str:
    """绝对路径词法规范化，与 JS normalizeAbs 逐字一致：折叠 // 与 .、去尾斜杠、保留 ..（不解符号链接）。
    不用 str(Path(p))——POSIX 下 Path 会保留双前导斜杠 `//x`（标准语义），与 JS 折叠行为发散（深审 F8）。"""
    segs = [s for s in str(p).split("/") if s not in ("", ".")]
    return "/" + "/".join(segs)


def resolve_memory_root(env=None, loud=None):
    """解析记忆数据根。返回 (Path, mode)；mode ∈ {'env', 'repo-fallback'}。"""
    if env is None:
        env = os.environ
    if loud is None:
        loud = lambda m: sys.stderr.write(m + "\n")
    m = env.get("MEMORY_ROOT")
    if m:
        if not os.path.isabs(m):
            loud(f"[memroot] MEMORY_ROOT={m} 非绝对路径（相对按 cwd 解析会 JS/py 裂脑）→回落 {SCRIPT_REPO_ROOT}")
            return SCRIPT_REPO_ROOT, "repo-fallback"
        mp = Path(m)
        try:
            is_dir = mp.is_dir()
        except OSError:
            is_dir = False
        if is_dir:
            # 目录存在即接受（显式意图，含 bootstrap 空 store）；wrong-but-existing 由判别器兜底
            return Path(_normalize_abs(m)), "env"
        loud(f"[memroot] MEMORY_ROOT={m} 不存在/不可访问→回落 {SCRIPT_REPO_ROOT}")
        return SCRIPT_REPO_ROOT, "repo-fallback"
    return SCRIPT_REPO_ROOT, "repo-fallback"


def memory_anomaly_verdict(auth: Path, resolved_root: Path, env=None):
    """裂脑判别器（FAIL-SAFE 向检测）。返回 (verdict, message)；verdict ∈ {'NOTE','ANOMALY'}。

    - auth 缺失 + 有正向 standalone opt-in → NOTE（合法 cloud/单检出）。
    - auth 缺失 + 无 opt-in → **ANOMALY**（本地 master 改名/迁移、fork 配错仍大声报；
      cloud 合法部署须显式 opt-in——committed MEMORY_ROOT 对 cloud 与本地-master-改名两态
      同态，唯一区分器是正向 opt-in，故默认保守报警）。
    - auth 在但 resolved≠auth → ANOMALY（fork 写路径脱离单一权威 store）。
    """
    if env is None:
        env = os.environ
    marker = SCRIPT_REPO_ROOT / ".claude" / ".memory-standalone"
    standalone = env.get("MEMORY_STANDALONE") == "1" or marker.exists()
    if not auth.is_dir():
        if standalone:
            return "NOTE", f"standalone/cloud store {resolved_root}（MEMORY_STANDALONE opt-in 生效）"
        return "ANOMALY", (
            f"权威 store {auth} 不存在——master 改名/迁移或 fork 配错；"
            f"若为合法 standalone/单检出部署请显式设 MEMORY_STANDALONE=1（deploy 注入，勿写 committed settings.json）"
        )
    if resolved_root.resolve() != auth.resolve():
        return "ANOMALY", (
            f"写路径脱离单一权威 store：解析到 {resolved_root}（≠ {auth}）"
            f"——memory 读写将分裂；fork 侧检查 .claude/settings.json env 注入"
        )
    return "NOTE", f"写路径 OK：{resolved_root}（单一权威 store）"


if __name__ == "__main__":
    # 供 cross-lang parity 测试以子进程调用：打印 {path}\n{mode}
    root, mode = resolve_memory_root()
    print(root)
    print(mode)
