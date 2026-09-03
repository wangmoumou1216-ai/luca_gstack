---
name: wait-what
description: "显式对话修复入口：当上一条说明没讲明白时，补足缺失前提，并用自然中文和项目术语重新讲清楚。"
license: MIT
disable-model-invocation: true
metadata:
  recommended-model: guided-execution
---

# 等等，我没听懂

## 重讲规则

重新讲解上一条没有讲清楚的内容：先补上听懂它所必需的前提和上下文，再用简明、自然的中文和短句说明。优先复用当前对话已经出现的项目术语；仅当会话已有经过验证的项目绑定时，才以该项目的 `CONTEXT.md` 为术语权威。如果该项目有多个上下文文件，按 `CONTEXT-MAP.md` 找到对应文件。没有项目绑定时，不为本技能发起项目确认或切换，直接依据已有对话重讲。

只输出重新讲解的内容，不解释执行过程，不追加计划、状态或完成标记。更短不是目的，让用户真正听懂才是。

本技能不创建产物、不写交接文档、不改工作流状态，也不获得任何新的工具或执行权限。

来源：`mattpocock/skills` 的 `skills/productivity/wait-what`（MIT），基于上游提交 `5c89081d4bbeb3d039a42093653f90bb698d780e` 做中文表达适配；保留其显式调用、补上下文和复用项目通用语言的核心机制。

<!-- FILE_END: wait-what/SKILL.md -->
