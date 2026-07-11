#!/bin/bash
# luca-sidebar.sh [meta|capture] — 问 luca app 侧边栏当前打开的内容。
#   meta(默认)：激活面板 + 当前页 URL/标题 + 全部页签清单；capture：抓当前激活网页完整正文。
#   机制：原子写请求 ~/.luca/sidebar-spool/<reqId>（内容=mode），app 主进程 watch 消费、
#   问渲染层后把结果写 ~/.luca/sidebar/<reqId>/result.md；本脚本轮询该文件，15s 超时。
#   依赖 luca app 运行中（app 内嵌终端天然满足）；app 未运行会超时报错，不做 open -a 拉起
#   （拉起的空 app 没有"用户正在看"的页面，报错比假数据诚实）。
set -euo pipefail
mode="${1:-meta}"
case "$mode" in meta|capture) ;; *) echo "用法: luca-sidebar.sh [meta|capture]" >&2; exit 1 ;; esac
spool="$HOME/.luca/sidebar-spool"
mkdir -p "$spool"
req="$(date +%s).$$.$RANDOM"
tmp="$spool/.tmp.$req"
printf '%s' "$mode" > "$tmp"
mv "$tmp" "$spool/$req"
res="$HOME/.luca/sidebar/$req/result.md"
for _ in $(seq 1 150); do
  if [ -f "$res" ]; then
    echo "[result: $res]"
    cat "$res"
    exit 0
  fi
  sleep 0.1
done
echo "超时：luca app 未响应（app 未运行或侧栏请求异常），无法获取侧栏内容" >&2
exit 2
