#!/bin/bash
# luca_gstack 项目管理脚本
# 用法:
#   ./scripts/project.sh new <name>      创建新项目并切换
#   ./scripts/project.sh switch <name>   切换到已有项目
#   ./scripts/project.sh list            列出所有项目及当前激活
#   ./scripts/project.sh status          显示当前项目链接状态
#   ./scripts/project.sh deactivate      清除当前激活项目（下次启动走全新流程）

set -euo pipefail

PROJECTS_ROOT="$HOME/Desktop/项目"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_LINK="$PROJECT_ROOT/docs"
STATE_LINK="$PROJECT_ROOT/.claude/workflow-state.yaml"
TOPIC_LINK="$PROJECT_ROOT/.claude/current-topic.txt"
STATE_TEMPLATE="$PROJECT_ROOT/.claude/templates/workflow-state.yaml"

cleanup_stale_docs_aliases() {
  local candidate target
  for candidate in "$PROJECT_ROOT"/docs\ *; do
    [ -e "$candidate" ] || [ -L "$candidate" ] || continue
    if [ ! -L "$candidate" ]; then
      echo "ERROR: found docs-like entry that is not a symlink: $candidate. Please inspect it before switching."
      exit 1
    fi
    target=$(readlink "$candidate" 2>/dev/null || true)
    if [[ "$target" == "$PROJECTS_ROOT"/*/docs ]]; then
      rm -f "$candidate"
      echo "Cleaned stale docs alias: $(basename "$candidate") -> $target"
    else
      echo "ERROR: found unknown docs alias: $candidate -> ${target:-"(empty)"}. Please inspect it before switching."
      exit 1
    fi
  done
}

current_project() {
  local target
  target=$(readlink "$DOCS_LINK" 2>/dev/null)
  if [ -n "$target" ]; then
    echo "$target" | sed "s|$PROJECTS_ROOT/||" | sed 's|/docs$||'
  else
    echo ""
  fi
}

ensure_project() {
  local name="$1"
  local root="$PROJECTS_ROOT/$name"
  mkdir -p "$root/docs/handoff" "$root/.luca/memory"
  if [ ! -f "$root/.luca/workflow-state.yaml" ]; then
    cp "$STATE_TEMPLATE" "$root/.luca/workflow-state.yaml"
  fi
  touch "$root/.luca/current-topic.txt"
  # 项目本地记忆索引：只在该项目激活时加载（见 activate_project 注入），
  # 与全局个人记忆（每 session 无差别注入）分离，避免跨项目上下文污染。
  if [ ! -f "$root/.luca/memory/MEMORY.md" ]; then
    cat > "$root/.luca/memory/MEMORY.md" <<EOF
# $name — 项目本地记忆

> 只存「只对本项目成立」的事实（部署坑 / 状态真值路径 / 项目结构 / 本项目专属约束）。
> 跨项目工作偏好 → 全局个人记忆；luca_gstack 框架规则 → semantic candidate。
> 一行一条：- [标题](file.md) — 一句钩子

EOF
  fi
}

# 并发安全（G2，2026-07-04）：原 rm -f + ln -s 两步替换存在"链接短暂不存在"的窗口——
# 并发 session 的 hook/verify 在窗口内 readlink 会失败（昨日实测三次互踩的成因之一）。
# 改为"建临时链 + rename(2) 原子替换"：读者任意时刻要么看到旧链要么看到新链，永不悬空。
# 注意不能用 mv——macOS mv 对"指向目录的既有 symlink"会跟随目标（把临时链挪进 docs/ 里），
# python3 os.replace 直接调 rename(2) 不解引用。
replace_symlink() {
  local link_path="$1"
  local target="$2"
  if [ -e "$link_path" ] && [ ! -L "$link_path" ]; then
    echo "❌ $link_path 不是 symlink。请先迁移或备份后再切换。"
    exit 1
  fi
  local tmp="${link_path}.tmp.$$"
  rm -f "$tmp"
  ln -s "$target" "$tmp"
  if ! python3 -c 'import os,sys; os.replace(sys.argv[1], sys.argv[2])' "$tmp" "$link_path"; then
    rm -f "$tmp"
    echo "❌ 原子替换 $link_path 失败"
    exit 1
  fi
}

# 切换互斥锁：mkdir 原子性防两个并发 switch 交错（三链分三次替换，跨链一致性靠锁串行化）。
# stale 锁（>60s，持有者已死）按 mtime 抢占。project.sh 是用户脚本非 hook，锁不到可响亮报错。
SWITCH_LOCK="$PROJECT_ROOT/.claude/.project-switch.lock"
acquire_switch_lock() {
  local tries=0
  while ! mkdir "$SWITCH_LOCK" 2>/dev/null; do
    local lock_mtime now_s
    lock_mtime=$(stat -f %m "$SWITCH_LOCK" 2>/dev/null || echo 0)
    now_s=$(date +%s)
    if [ $((now_s - lock_mtime)) -gt 60 ]; then
      rm -rf "$SWITCH_LOCK" 2>/dev/null || true
      continue
    fi
    tries=$((tries + 1))
    if [ "$tries" -gt 50 ]; then
      echo "❌ 另一个 project.sh 正在切换项目（锁: .claude/.project-switch.lock）。稍候重试，或确认无切换进行中后手动删除该目录。"
      exit 1
    fi
    sleep 0.1
  done
  trap 'rm -rf "$SWITCH_LOCK"' EXIT
}

activate_project() {
  local name="$1"
  local root="$PROJECTS_ROOT/$name"
  ensure_project "$name"
  acquire_switch_lock
  cleanup_stale_docs_aliases
  replace_symlink "$DOCS_LINK" "$root/docs"
  replace_symlink "$STATE_LINK" "$root/.luca/workflow-state.yaml"
  replace_symlink "$TOPIC_LINK" "$root/.luca/current-topic.txt"
  cleanup_stale_docs_aliases
}

# 注入项目本地记忆：激活后打印该项目 MEMORY.md（含正文行）到 stdout，
# 让运行 switch/new 的 agent 把它纳入上下文。只在该项目激活时加载。
inject_project_memory() {
  local root="$PROJECTS_ROOT/$1"
  local mem="$root/.luca/memory/MEMORY.md"
  [ -f "$mem" ] || return 0
  # 仅当索引区有真实条目（以 "- " 开头的行）才注入，空模板不打扰。
  if grep -q '^- ' "$mem" 2>/dev/null; then
    echo ""
    echo "🧠 项目本地记忆（$1）:"
    cat "$mem"
  fi
}

print_status() {
  local current
  current=$(current_project)
  echo "当前激活项目: ${current:-(未设置)}"
  echo "docs -> $(readlink "$DOCS_LINK" 2>/dev/null || echo '(未设置)')"
  echo "workflow-state -> $(readlink "$STATE_LINK" 2>/dev/null || echo '(未设置)')"
  echo "current-topic -> $(readlink "$TOPIC_LINK" 2>/dev/null || echo '(未设置)')"
}

cmd="${1:-}"

case "$cmd" in
  new)
    name="${2:-}"
    if [ -z "$name" ]; then echo "❌ 用法: project.sh new <name>"; exit 1; fi
    mkdir -p "$PROJECTS_ROOT/$name"
    git -C "$PROJECTS_ROOT/$name" init -q 2>/dev/null || true
    activate_project "$name"
    echo "✅ 项目 '$name' 已创建，docs/ 和 workflow-state 已切换"
    inject_project_memory "$name"
    ;;
  switch)
    name="${2:-}"
    if [ -z "$name" ]; then echo "❌ 用法: project.sh switch <name>"; exit 1; fi
    if [ ! -d "$PROJECTS_ROOT/$name" ]; then
      echo "❌ 项目 '$name' 不存在（路径: $PROJECTS_ROOT/$name）"
      exit 1
    fi
    activate_project "$name"
    echo "✅ 已切换到项目 '$name'"
    inject_project_memory "$name"
    ;;
  list)
    current=$(current_project)
    echo "当前激活项目: ${current:-(未设置)}"
    echo ""
    echo "所有项目:"
    while IFS= read -r -d '' p; do
      name=$(basename "$p")
      if [ "$name" = "$current" ]; then
        printf "  ● %s（激活）\n" "$name"
      else
        printf "  ○ %s\n" "$name"
      fi
    done < <(find "$PROJECTS_ROOT" -mindepth 1 -maxdepth 1 -type d -print0 | sort -z)
    ;;
  status)
    print_status
    ;;
  deactivate)
    current=$(current_project)
    if [ -z "$current" ]; then
      echo "没有激活的项目，无需操作。"
      exit 0
    fi
    acquire_switch_lock
    for link in "$DOCS_LINK" "$STATE_LINK" "$TOPIC_LINK"; do
      if [ -L "$link" ]; then rm -f "$link"; fi
    done
    echo "✅ 项目 '$current' 已取消激活。下次启动 luca 将走全新流程。"
    ;;
  *)
    echo "用法: project.sh <new|switch|list|status|deactivate> [name]"
    ;;
esac
