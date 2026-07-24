#!/usr/bin/env python3
"""单一记忆根解析器 + 裂脑判别器（P1 / FIX-1，2026-07-24 跨-agent 适配）。

与 JS 孪生 `.claude/hooks/lib/memroot.mjs` **同算法**（cross-lang parity 由
`scripts/test-memroot-parity.mjs` 保证）。

设计要点：
- fallback = **脚本相对仓根** `Path(__file__).resolve().parents[2]`（cwd 无关），
  与 JS 侧 `import.meta.url` 上 3 级 = lib→hooks→.claude→repo **BY-CONSTRUCTION 同根**。
  这是 FIX-1 的核心：cloud/Codex 下 CLAUDE_PROJECT_DIR 未注入 + 非仓 cwd 时，py 与 JS
  都归到脚本相对仓根，不再一个用 cwd、一个用 script-location 而裂开。
- store-shape 哨兵：MEMORY_ROOT 指向"存在但非记忆 store 形状"（缺 memory/semantic/）时
  LOUD 回落，防"错-但-存在目录/网络挂载抖动"静默写错根（R2F2-6）。
- 判别器 FAIL-SAFE 向检测：auth 缺失时，**缺 opt-in 一律保 LOUD anomaly**（本地 master
  改名/删除、fork 配错仍大声报）；仅正向 `MEMORY_STANDALONE=1`（deploy 注入）或
  gitignored marker `.claude/.memory-standalone` 才降 note（R2F2-1 / R3A-1）。
"""
import os
import sys
from pathlib import Path

# _memroot.py 在 memory/scripts/ → parents[2] = 仓根（与全 10 记忆脚本旧惯例 parents[2] 一致）
SCRIPT_REPO_ROOT = Path(__file__).resolve().parents[2]


def _is_store(p: Path) -> bool:
    """记忆 store 形状哨兵：真 store 必有 memory/ 子目录（真实 checkout 有 memory/{semantic,episodic}，
    测试 fixture 亦建 memory/）。用父级 memory/ 兼容 partial fixture；真·bogus 根无 memory/ 仍被拒。
    wrong-but-valid-store 由 daily_governance 判别器（硬编码 auth 对比）兜底。"""
    try:
        return (p / "memory").is_dir()
    except OSError:
        return False


def resolve_memory_root(env=None, loud=None):
    """解析记忆数据根。返回 (Path, mode)；mode ∈ {'env', 'repo-fallback'}。

    loud: 可选回调（默认写 stderr），用于回落时的可见告警。
    """
    if env is None:
        env = os.environ
    if loud is None:
        loud = lambda m: sys.stderr.write(m + "\n")
    m = env.get("MEMORY_ROOT")
    if m:
        mp = Path(m)
        try:
            is_dir = mp.is_dir()
        except OSError:
            is_dir = False
        if is_dir and _is_store(mp):
            return mp, "env"
        if is_dir:
            loud(f"[memroot] MEMORY_ROOT={m} 存在但非记忆 store 形状（缺 memory/semantic/）→回落 {SCRIPT_REPO_ROOT}")
            return SCRIPT_REPO_ROOT, "repo-fallback"
        loud(f"[memroot] MEMORY_ROOT={m} 不存在→回落 {SCRIPT_REPO_ROOT}")
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
