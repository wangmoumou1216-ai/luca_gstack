---
name: design-output
preamble-tier: 1
description: |
  冻结 Generation Packet 的设计工具选择薄入口：继承已选工具，未选时只问 OD 或 Claude Design，
  保留完整任务和冻结字节，交给实际 adapter；不拥有第二份产物或 workflow DONE 节点。(luca_gstack)
allowed-tools: [Read, Write, Bash, AskUserQuestion]
context-cost:
  runtime-estimate: 3000
  recommended-model: guided-execution
---

## Preamble

```bash
python3 .claude/observability/scripts/get_rules.py design-output "*"
```

## 选择与续接

先按 office 共享合同核实际项目、当前完整任务与已选流程，读 R2/R3 和本 skill input-mode。
已有需求/原型尚未形成完整冻结 Packet 时回 design-brief 成熟输入入口；不补未选研究/PRD。
明确单点交给 OD 的 adhoc 与历史 OD recover 仍直接由 open-design 承接，不迁移历史节点。

1. 读取精确冻结 Packet，绑定 canonical path + SHA-256，核 Brief 的冻结目标及其真实选择来源。
   无已选工具时展示 OD 与 Claude Design 两项，说明 OD 按其客户端合同、CD 在 Luca app
   Design 内由用户生成；只问一次并等待真实回答。不可把推荐、输入格式或工具故障当选择。
2. 已明确选择直接继承；也可直接继承用户已选择的本地 HTML / MagicPath。
   短回复只更新 tool，保留原 source_ref、完整 scope、execution_mode、下游交付、未决决定和权限范围。
   JSON/模型自报不证明真人选择。没有可核原完整任务时 NEEDS_CONTEXT，不猜恢复。
3. 原 Packet 明确工具未选：调用 `scripts/design-output-selection.mjs` 的 `resolveDesignOutput`，
   将返回 selection 写到 caller 已授权的精确 `tool-selection.json` 旁车，绑定 Packet path/hash、
   原完整 task/hash、tool 和真实 choice_source_ref；原 Packet 字节不变。
   helper 仅校验本地身份，不验证真人或授读写权；调用前读其实现，caller 独立核源。
   已存在 sidecar 必须先读并传入核验，不覆盖或按 latest 猜选。有效选择不重问。
4. Packet 硬绑定另一工具、旁车冲突或事实变化 → 返回 Brief 修订重冻，保持原材料与历史。
   新工具选择不授权模板采用/外部传输；这些门分别继承有效依据，缺口归实际 adapter。
5. 选择后读取实际 `open-design` / `claude-design`（或已选备用工具）完整 SKILL 和 input-mode，
   将同一完整任务、精确 Packet、sidecar、已核来源与权限交回该 owner，不只交工具名。

## 共同操作流程

两条路径均为：选工具 → 确认该工具设计规范 → 材料就位 → 生成/迭代 → 回收验收。
回收验收由独立执行者在真实浏览器里按 Brief 的 Given/When/Then 逐条实操；未通过项只修这些项并复测，
最多两轮，仍未通过的列为剩余项交用户，不把一轮复测当全过；复测中新报出的项也计入这两轮上限。
实际 adapter 用同一 resolveDesignExecutionDefaults 策略继承同工具的有效设计规范确认；
缺确认只问“沿用当前设计系统，还是指定另一套？”，OD/CD 确认不能互相迁移。
短答续接保留完整任务；recover 不重新选择工具、规范或模板。OD 保留既有执行模式；
CD 用户发送/生成/迭代并正式下载 HTML，Agent 在“可以回收了”/“拉回来”后按准确文件回收。
实际传输、人工生成和完成证据归相应 adapter，不在入口新增完成状态。

## 完成边界

本入口没有独立 workflow 节点、DONE、handoff 或 writer；SELECTED 只是内部选择结果。
Workflow 展开时把入口替换为实际 adapter 节点，completion_owner=Orchestrator；
只有 adapter 回收、独立语义验收、适用加工与当前 Human Gate 通过后，由 Orchestrator 一次提交。
standalone 继续实际 adapter 合同；缺宿主/能力按该 adapter 返回 NEEDS_CONTEXT/BLOCKED，
不把选择完成、EXPORTED、STAGED 或下载当原型交付完成，不自动换工具。
Claude `/design-output` 与 Codex `$design-output` / skill selector 加载此同一权威；无问答 widget 用文字等待。

<!-- FILE_END: design-output/SKILL.md -->
