#!/usr/bin/env python3
"""
eval_routing.py — 甲类语义路由命中率度量。

把"语义路由解决对吗"从体感变成可测、可回归的数字。测两层：

  keyword-layer（确定性，grader:code）：route-guard 关键词粗网是否把"该命中"的 fixture 路由到对的能力。
    这是可随时跑的回归守卫，与 test-route-guard.mjs 互补（那个测分支正确性，这个测"到对的能力"的召回）。
  semantic-layer（估计，grader:llm-judge）：route-guard STOP/漏的 semantic-dependent fixture，只能靠模型
    语义判断该路由到哪。本脚本只【确定性地】把这些 fixture 挑出来 + 导出 judge 工作单；实际判官由
    orchestrator/主循环起（python 起不了 Claude agent，也不该假装能——语义判断只能在模型内发生）。

复用（不重造）：route-guard.mjs 的 dry-run（ROUTE_GUARD_DRY_RUN=1，零副作用）、eval-methodology 的
grader 选型（keyword=code / semantic=llm-judge）。不碰冻结的 GEPA（collect_eval/pairs.jsonl/judge_eval）。

用法：
  python3 memory/scripts/eval_routing.py --selftest       # 内置小样例自检（断言 keyword 计算正确）
  python3 memory/scripts/eval_routing.py --keyword-only    # 只算 keyword 层命中率；回归数>容忍值 exit 1（verify 门）
  python3 memory/scripts/eval_routing.py --report          # 全报告：keyword 命中率 + semantic-dependent 清单
  python3 memory/scripts/eval_routing.py --judge           # 导出 semantic-dependent judge 工作单

fixture 格式（memory/evals/routing/fixtures.jsonl，逐行 JSON；// 开头为注释行，仅本脚本可读）：
  {"id","input","expected","layer","scene","note", 可选 "env":{...}}
    layer=keyword  → route-guard 关键词网应确定性到达 expected（算入 keyword 命中率）
    layer=semantic → route-guard 设计上 STOP/漏（无触发词），命中只能靠模型；本脚本挑出交 judge
    expected 取值（2026-07-13 二轮审查后词表）：
      具体 skill "/brainstorm"（含隐藏 skill 名如 "redteam"）
      决策 "PLAN_MODE"/"PLAN_CHECK"/"project:switch:<项目名>"（校验切对了谁；裸 project:switch 宽匹配）/"project:stop"
      多候选 "MULTI:<按字母序逗号拼接>"（如 "MULTI:/tech-spec,systematic-debugging"）
      流程 "flow:design-chain"/"flow:od-design"（OD-first 设计产出链）| 语义特例 "special:sidebar"/"special:luca-open"
      链路检查形态 "ask:research-first"（正确响应=按 routing-chain-check R1 先问"先调研还是直接开始"）
      平凡任务负样本 "direct"（期望 route-guard 不强路由，落 STOP/NONE，防过度路由）
      歧义多选 "A|B"（任一即中；标签对抗审查确认存在同等合理路由时使用）
    已删词条：special:od（僵尸——OD 交接本就关键词可达 → "/open-design"）；special:html
    （HTML 预览推送是"产出即推"的执行途中反射、乙类过程纪律，无路由真值，不作 fixture）。
judge 工作单不内嵌能力面——dispatch 判官时由 orchestrator 在 prompt 提供（真值 = CLAUDE.md
skill 表 + 语义特例节 + 语义兜底段；fork 判官面必须含 /muse-loop-orchestrate，标签审查 #18 教训）。
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

# 刻意用文件相对 REPO_ROOT、不理 MEMORY_ROOT env（memory/scripts/* 其余脚本走 MEMORY_ROOT→权威
# 记忆根）：routing fixture 必须配本仓的 route-guard/routing-map 评，跟着记忆根走会跨仓错评。
REPO_ROOT = Path(__file__).resolve().parents[2]
ROUTE_GUARD = REPO_ROOT / ".claude" / "hooks" / "route-guard.mjs"
FIXTURES = REPO_ROOT / "memory" / "evals" / "routing" / "fixtures.jsonl"
RESULTS_DIR = REPO_ROOT / "memory" / "evals" / "routing"

# keyword 层回归门语义（2026-07-13 二轮 A-F3）：比例阈值在 N≥21 时静默失效（20/21=0.952≥0.95
# 又能容忍单条回归，且无人提醒调阈值）。改为绝对计数 misses ≤ ALLOWED_MISSES（默认 0 =
# 任一回归即红，与 N 无关）；env 是显式逃生阀。
ALLOWED_MISSES = int(os.environ.get("ROUTING_ALLOWED_MISSES", "0"))


def run_route_guard(prompt, env_extra=None):
    """跑 route-guard dry-run（零副作用），返回 decision 对象。"""
    env = dict(os.environ)
    env.update({
        "ROUTE_GUARD_DRY_RUN": "1",
        "ROUTE_GUARD_CURRENT_PROJECT": "demo",
        "ROUTE_GUARD_PROJECTS": "demo",
        # G4-R6 同款防污染（2026-07-13 fable review 实测）：HEAVY set 由 env 初始化，开发者
        # shell/CI 恰好导出 ROUTE_GUARD_HEAVY_SKILLS 会把 SINGLE_SKILL 假翻 PLAN_CHECK
        # （kw-deepresearch 实测翻车）。显式钉空；fixture 自带 env 仍可覆盖。
        "ROUTE_GUARD_HEAVY_SKILLS": "",
        # 二轮 A-F1（实测 8/19 假红）：route-guard 的 projectRoot 优先读 CLAUDE_PROJECT_DIR，
        # session 锚在别的仓时会用错误仓的 skill-routing-map 评本仓 fixture。钉到本仓根。
        "CLAUDE_PROJECT_DIR": str(REPO_ROOT),
    })
    if env_extra:
        env.update(env_extra)
    try:
        out = subprocess.run(
            ["node", str(ROUTE_GUARD)],
            input=json.dumps({"prompt": prompt}),
            capture_output=True, text=True, env=env, cwd=str(REPO_ROOT),
            timeout=30,  # A-F6：route-guard 挂起不得拖死 verify——超时按 miss 变红
        )
    except FileNotFoundError:
        return {"decision": "NODE_MISSING", "_stderr": "node 不在 PATH"}
    except subprocess.TimeoutExpired:
        return {"decision": "TIMEOUT", "_stderr": "route-guard 超时 30s"}
    try:
        return json.loads(out.stdout)
    except Exception:
        return {"decision": "PARSE_ERR", "_stderr": out.stderr[:200]}


def routed_capability(decision):
    """把 route-guard 决策对象映射成统一的"路由到的能力"标识（与 fixture expected 同词表）。"""
    d = decision.get("decision")
    if d == "SINGLE_SKILL":
        return decision.get("skill", "?")
    if d == "PLAN_MODE":
        return "PLAN_MODE"
    if d == "PLAN_CHECK":
        return "PLAN_CHECK"
    if d == "PROJECT_SWITCH":
        # A-F9：带具体项目名，校验"切对了谁"（裸 project:switch 曾对切错项目也判 PASS）。
        proj = decision.get("project")
        return f"project:switch:{proj}" if proj else "project:switch"
    if d == "PROJECT_STOP":
        return "project:stop"
    if d == "MULTI_SKILL":
        return "MULTI:" + ",".join(sorted(decision.get("candidates", [])))
    return d or "NONE"  # STOP / NONE / PARSE_ERR


def keyword_correct(fixture, actual):
    """keyword 层是否命中：确定性二元判定（grader:code）。expected 支持 'A|B' 任一即中（歧义项）。"""
    for exp in str(fixture["expected"]).split("|"):
        if exp == "direct":
            # 平凡任务：route-guard 正确的行为是不强路由（落 STOP/NONE），交给模型按语义契约判分寸。
            # 若 route-guard 把琐事关键词命中到某 skill/PLAN_MODE = 过度路由 = 错。
            if actual in ("STOP", "NONE"):
                return True
        elif exp == "project:switch" and actual.startswith("project:switch"):
            return True  # 不带项目名的宽形态向后兼容；精确校验用 "project:switch:<名>"
        elif actual == exp:
            return True
    return False


def load_fixtures():
    if not FIXTURES.exists():
        return []
    rows = []
    # 二轮 A-F6：坏行报文件行号（json.loads 只报行内位置，永远 "line 1"，定位极差）。
    for lineno, line in enumerate(FIXTURES.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            raise SystemExit(f"[eval_routing] FAIL: fixtures 第 {lineno} 行 JSON 非法: {e}")
    return rows


def evaluate(fixtures):
    """跑全部 fixture，返回 (keyword_results, semantic_pending)。"""
    keyword_results = []   # layer==keyword：确定性判分
    semantic_pending = []  # layer==semantic：挑出交 judge
    for fx in fixtures:
        decision = run_route_guard(fx["input"], fx.get("env"))
        actual = routed_capability(decision)
        if fx.get("layer") == "semantic":
            semantic_pending.append({**fx, "route_guard_actual": actual})
        else:  # 默认 keyword
            keyword_results.append({
                **fx,
                "actual": actual,
                "correct": keyword_correct(fx, actual),
                # 二轮 A-F6：PARSE_ERR/NODE_MISSING 时把 stderr 带到 miss 行，别让用户猜。
                "diag": decision.get("_stderr", "") if actual in ("PARSE_ERR", "NODE_MISSING", "TIMEOUT") else "",
            })
    return keyword_results, semantic_pending


def keyword_rate(keyword_results):
    if not keyword_results:
        return 1.0
    hits = sum(1 for r in keyword_results if r["correct"])
    return hits / len(keyword_results)


def cmd_keyword_only():
    fixtures = load_fixtures()
    # 2026-07-13 fable review：文件缺失/为空时 0/0 曾算 1.0 真空通过——输入消失还发绿的
    # 回归门是坏门。显式变红。
    if not fixtures:
        print(f"[eval_routing] FAIL: fixtures 为空或缺失（{FIXTURES}）——回归门不允许真空通过")
        return 1
    kw, _ = evaluate(fixtures)
    rate = keyword_rate(kw)
    misses = [r for r in kw if not r["correct"]]
    print(f"[eval_routing] keyword-layer 命中率: {rate:.3f} "
          f"({sum(1 for r in kw if r['correct'])}/{len(kw)})  容忍回归数={ALLOWED_MISSES}")
    for m in misses:
        diag = f"  [{m['diag']}]" if m.get("diag") else ""
        print(f"  ✗ {m['id']}: expected={m['expected']} actual={m['actual']}{diag}  ⤷ {m['input']}")
    if len(misses) > ALLOWED_MISSES:
        print(f"[eval_routing] FAIL: {len(misses)} 条 keyword 回归 > 容忍数 {ALLOWED_MISSES}"
              f"（重跑看明细: python3 memory/scripts/eval_routing.py --keyword-only）")
        return 1
    print("[eval_routing] PASS")
    return 0


def cmd_report():
    fixtures = load_fixtures()
    kw, sem = evaluate(fixtures)
    rate = keyword_rate(kw)
    print(f"=== 甲类语义路由命中率报告 ({date.today()}) ===")
    print(f"fixtures: {len(fixtures)}  (keyword={len(kw)}, semantic-dependent={len(sem)})")
    print(f"\n[keyword-layer 确定性] 命中率 {rate:.3f} "
          f"({sum(1 for r in kw if r['correct'])}/{len(kw)})")
    for m in [r for r in kw if not r["correct"]]:
        print(f"  ✗ {m['id']}: expected={m['expected']} actual={m['actual']}  ⤷ {m['input']}")
    print(f"\n[semantic-dependent 靠模型判断，需 --judge 度量] {len(sem)} 条：")
    for s in sem:
        print(f"  ? {s['id']}: expected={s['expected']} route-guard={s['route_guard_actual']}  ⤷ {s['input']}")
    print("\nsemantic-layer 命中率非本脚本可确定性判定——语义判断只能在模型内发生。"
          "跑 --judge 导出工作单，由 orchestrator 起 llm-judge 度量。")
    return 0


def cmd_judge():
    """导出 semantic-dependent judge 工作单（实际判官由 orchestrator/主循环起，非本脚本）。"""
    fixtures = load_fixtures()
    _, sem = evaluate(fixtures)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESULTS_DIR / f"judge-queue-{date.today()}.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for s in sem:
            # 二轮 A-F4：补 scene/note（token 语义线索）+ actual_capability/reason 回填位
            # （与 eval-schema routing_eval_fields 对齐）。能力面不内嵌——由 orchestrator
            # dispatch 判官时在 prompt 提供（见文件头注；fork 面必须含 /muse-loop-orchestrate）。
            f.write(json.dumps({
                "eval_kind": "routing",
                "id": s["id"],
                "input": s["input"],
                "scene": s.get("scene", "unknown"),
                "note": s.get("note", ""),
                "expected_capability": s["expected"],
                "routing_layer": "semantic",
                "route_guard_actual": s["route_guard_actual"],
                "judge_question": (
                    f"给定框架能力面（由 dispatch 方提供），用户请求「{s['input']}」按含义应路由到"
                    f"哪个能力？（对照 expected={s['expected']}，判 pass/fail + 一句理由）"
                ),
                "actual_capability": None,  # 由 judge 回填：它认为该路由到的能力
                "verdict": None,            # 由 judge 回填 pass/fail
                "reason": None,             # 由 judge 回填一句理由
            }, ensure_ascii=False) + "\n")
    print(f"[eval_routing] 已导出 {len(sem)} 条 judge 工作单 → {out_path}")
    print("下一步：由 orchestrator/主循环对每条起独立 llm-judge（冷启动隔离），回填 verdict，"
          "再算 semantic-layer 命中率。")
    return 0


def cmd_selftest():
    """内置固定小样例，断言 keyword 层计算正确（不依赖 fixtures.jsonl）。"""
    cases = [
        # (prompt, expected, layer, 期望 correct)
        ("帮我写一份技术规格文档", "/tech-spec", "keyword", True),
        ("帮我加上订单查询、库存管理、报表导出三个功能", "PLAN_MODE", "keyword", True),
        ("帮我加个导出按钮", "direct", "keyword", True),          # 琐事应落 STOP/NONE
        ("帮我写一份技术规格文档", "/brainstorm", "keyword", False),  # 故意错标 → 应判不命中
    ]
    ok = True
    for prompt, expected, layer, want in cases:
        actual = routed_capability(run_route_guard(prompt))
        got = keyword_correct({"expected": expected}, actual)
        mark = "✓" if got == want else "✗"
        if got != want:
            ok = False
        print(f"  {mark} [{expected} vs actual={actual}] correct={got} (want {want})  ⤷ {prompt}")
    print("[eval_routing] selftest", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    p = argparse.ArgumentParser(description="甲类语义路由命中率度量")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--keyword-only", action="store_true", help="只算 keyword 命中率（verify 回归门）")
    g.add_argument("--report", action="store_true", help="全报告")
    g.add_argument("--judge", action="store_true", help="导出 semantic-dependent judge 工作单")
    g.add_argument("--selftest", action="store_true", help="内置小样例自检")
    args = p.parse_args()
    if args.selftest:
        return cmd_selftest()
    if args.keyword_only:
        return cmd_keyword_only()
    if args.judge:
        return cmd_judge()
    return cmd_report()


if __name__ == "__main__":
    sys.exit(main())
