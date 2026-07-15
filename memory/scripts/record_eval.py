#!/usr/bin/env python3
"""
record_eval.py — 记录 skill 执行的 eval record
写入 memory/evals/eval-log.jsonl，供将来 GEPA 使用

用法:
  python3 memory/scripts/record_eval.py \
    --skill brainstorm \
    --topic "商机列表" \
    --scene A \
    --gate-status PASS \
    --gate-score 8 \
    --output-paths docs/prd/2026-05-20-crm-prd.md \
    --gate-findings "R-001 缺少边界条件" \
    --duration medium \
    --input-summary "用户想做商机AI推荐功能"
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Record skill eval entry")
    parser.add_argument("--skill", required=True, help="Skill 名称")
    parser.add_argument("--topic", required=True, help="当前 topic")
    parser.add_argument("--scene", default="unknown", choices=["A", "B", "C", "D", "unknown"])
    parser.add_argument("--input-summary", default="", help="输入意图摘要（≤300字）")
    parser.add_argument("--output-paths", nargs="*", default=[], metavar="PATH")
    # 2026-07-09 E5 语义切换：新值 = 0-1 通过率（pass_count/total，来自逐 criteria 二元判定）；
    # 历史值 10.0/8.0 为旧制无 rubric 主观分（2026-06-12/14 六条）；None 语义不变（未跑 judge）。
    parser.add_argument("--gate-score", type=float, default=None,
                        help="Quality gate 通过率 0-1（旧制 0-10 主观分已废止，历史数据保留原值）")
    parser.add_argument("--gate-status", required=True,
                        choices=["PASS", "FAIL", "CONDITIONAL_PASS"])
    parser.add_argument("--gate-findings", nargs="*", default=[], metavar="FINDING",
                        help="FAIL/WARN 项（可多个）")
    parser.add_argument("--duration", default="medium",
                        choices=["lightweight", "medium", "heavy"])
    parser.add_argument("--user-adopted", default="unknown",
                        choices=["true", "false", "unknown"])
    args = parser.parse_args()

    record = {
        # UTC 对齐全链（episodic/governance 均 UTC；旧本地时区在时差边界会错一天）
        "session_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "skill_name": args.skill,
        "topic": args.topic,
        "scene": args.scene,
        "input_summary": args.input_summary[:300],
        "output_paths": args.output_paths,
        "quality_gate_score": args.gate_score,
        "quality_gate_status": args.gate_status,
        "quality_gate_findings": args.gate_findings,
        "execution_duration_est": args.duration,
        "user_adopted": args.user_adopted,
    }

    # 默认仓根而非 cwd（旧默认 "." 在任意目录跑会产生杂散 ./memory/evals/ 目录，
    # 且与 append_episode/daily_governance 的 parents[2] 惯例不一致）
    root = Path(os.environ.get("MEMORY_ROOT", Path(__file__).resolve().parents[2]))
    log_path = root / "memory" / "evals" / "eval-log.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"[record_eval] ✓ {args.skill} → {log_path}  (status={args.gate_status})")


if __name__ == "__main__":
    main()
