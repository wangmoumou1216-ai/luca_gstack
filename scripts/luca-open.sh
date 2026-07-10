#!/bin/bash
# luca-open.sh <文件路径>… — 让 luca app 在新页签打开文件（md 等文本/图片）。
#   机制：写绝对路径到 ~/.luca/open-spool（先 tmp 再 mv 保原子），app 主进程 watch 消费；
#   app 未运行则 open -a 拉起（启动时会清 spool 积压）。
set -euo pipefail
[ $# -ge 1 ] || { echo "用法: luca-open.sh <文件路径>…" >&2; exit 1; }
spool="$HOME/.luca/open-spool"
mkdir -p "$spool"
for f in "$@"; do
  abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
  [ -f "$abs" ] || { echo "文件不存在: $f" >&2; exit 1; }
  tmp="$spool/.tmp.$$.$RANDOM"
  printf '%s' "$abs" > "$tmp"
  mv "$tmp" "$spool/$(date +%s).$$.$RANDOM"
done
open -a luca 2>/dev/null || true
