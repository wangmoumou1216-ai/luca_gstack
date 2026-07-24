#!/bin/bash
# luca-open.sh <文件路径>… | --url <http(s)-url> — 让 luca app 侧栏打开文件或 URL。
#   文件模式：写绝对路径到 ~/.luca/open-spool（先 tmp 再 mv 保原子），app 主进程 watch 消费开预览页签。
#   --url 模式（2026-07-24）：把公开 URL 写成唯一路径 meta-refresh shim（~/.luca/mirror/<uniq>.html）再走同一
#     预览管道，让侧栏显示该页。仅接 http(s)；镜像=点名可见、默认不推（纪律见 appendix「luca app 侧栏感知」）。
#   app 未运行则 open -a 拉起（LUCA_OPEN_NO_LAUNCH=1 跳过拉起，仅供测试）。
set -euo pipefail
spool="$HOME/.luca/open-spool"
mkdir -p "$spool"

spool_push() {  # $1 = 待打开的绝对路径（裸路径协议，与 legacy 文件模式一致）
  local abs="$1" tmp
  tmp="$spool/.tmp.$$.$RANDOM"
  printf '%s' "$abs" > "$tmp"
  mv "$tmp" "$spool/$(date +%s).$$.$RANDOM"
}

launch() {  # LUCA_OPEN_NO_LAUNCH=1 跳过；LUCA_OPEN_LAUNCH_CMD 覆盖拉起命令（仅供测试）
  if [ "${LUCA_OPEN_NO_LAUNCH:-}" = "1" ]; then return 0; fi
  ${LUCA_OPEN_LAUNCH_CMD:-open -a luca} 2>/dev/null || true
}

if [ "${1:-}" = "--url" ]; then
  url="${2:-}"
  [ -n "$url" ] || { echo "用法: luca-open.sh --url <http(s)-url>" >&2; exit 1; }
  case "$url" in
    [Hh][Tt][Tt][Pp]://*|[Hh][Tt][Tt][Pp][Ss]://*) : ;;   # http/https 大小写不敏感（RFC scheme 不敏感）
    *) echo "只接受 http(s) URL，拒绝: $url" >&2; exit 1 ;;
  esac
  mdir="$HOME/.luca/mirror"
  mkdir -p "$mdir"
  shim="$mdir/$(date +%s).$$.$RANDOM.html"
  esc=$(printf '%s' "$url" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
  cat > "$shim" <<HTML
<!doctype html><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=$esc">
<title>镜像</title>
<body style="font-family:system-ui;padding:24px;color:#333">
正在打开 <a href="$esc">$esc</a> …
</body>
HTML
  spool_push "$shim"
  launch
  exit 0
fi

[ $# -ge 1 ] || { echo "用法: luca-open.sh <文件路径>… | --url <http(s)-url>" >&2; exit 1; }
for f in "$@"; do
  abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
  [ -f "$abs" ] || { echo "文件不存在: $f" >&2; exit 1; }
  spool_push "$abs"
done
launch
