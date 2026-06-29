---
name: careful
preamble-tier: 0
version: 1.0.0
description: |
  危险操作警告。在执行 rm -rf、DROP TABLE、force-push、git reset --hard 等
  危险命令前警告用户，允许用户覆盖。来源：gstack careful，直接借用。(luca_gstack)
allowed-tools:
  - Bash
  - Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../careful/bin/check-careful.sh"
          statusMessage: "检查危险命令..."
context-cost:
  self: 326
  runtime-estimate: 5000
  shared-refs: [none]
  recommended-model: mechanical  # 格式合规检查
---

## 执行协议

说明「Careful 模式已激活」，然后正常执行用户请求。
对以下命令执行前警告并等待确认：rm -rf、DROP TABLE、force-push、git reset --hard、kubectl delete。

<!-- FILE_END: careful/SKILL.md -->
