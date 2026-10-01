---
name: wait-what
description: "显式对话修复入口：当上一条说明没讲明白时，补足缺失前提，并用自然中文和项目术语重新讲清楚。"
license: MIT
disable-model-invocation: true
metadata:
  recommended-model: guided-execution
---

# 等等，我没听懂

## Phase 1 — 补足前提并重新讲清

只重新讲清上一条未理解的回复。先补理解所需的最少前提，接着用自然中文、短句和明确动词
说明结论、因果和下一步含义；保留原意义、条件和不确定性。用户只指出某段时聚焦该段。
更短不等于更懂；一个具体例子可帮助理解，但不要换题或新增方案。

复用对话中已确认的领域词。若已有 verified 项目绑定且确需核对词义，读取该项目已授权
词汇 owner；单域取现有 glossary，多域按已有 map 到正确 context。项目 CONTEXT 中已明确
承载的术语可以复用，但框架 root CONTEXT 不能当产品词汇。没有绑定就用对话证据，不为
本 skill 启动 Project Gate/切换、研究或创建 glossary。词义仍不确定时明确说明并确认，不能猜。

英语表达确为用户所需时，采用 ASD-STE100 Simplified Technical English 的简单、明确句式；
中文任务保持自然中文。只输出重讲内容，不讲执行过程、不追加状态、计划或完成标记。
本 skill 无文件、handoff、workflow、Git、网络或其他效果。

来源：source37，MIT，pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。中文、项目隔离和
授权 owner 查词保留本地适配；英语简单表达只在英语场景使用。

<!-- FILE_END: wait-what/SKILL.md -->
