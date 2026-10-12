# 核心精细复审与补漏

## 最新用户范围

用户最新要求：“做核心，加快进度”。本轮完成核心策略、遗漏消费者修正、必要回归、独立复审与 Git 发布。完整净收益对照、扩大部署与回退演练移出本轮；已有部分实验结果保留，不记为完整通过。原冻结计划保持原字节，scope-update.json 记录实际范围变更。

## 原发布与复审发现

核心改造已由 PR #33 合并到 main（931b059b8807338488740adcc7915d31b5604135）。发布后再次冷审：Standards 6/6 PASS；对原整项计划的 Spec 3/6 FAIL，原票、envelope 和同次 accepted 记录均保留。失败包括原计划未完成的实验/扩大部署、验证证据缺口，以及 code-hygiene 的过时 fable→opus 示例。原 FAIL 不改写为 PASS。

## 本次唯一语义修正

code-hygiene 清理护栏把模型降级示例替换为实际 memory-root 相对路径回退。原 fallback、fail-open、兼容语义、WHY 注释保护不变；未改 hook、runner、模型策略、账户配置、私有 binding 或用户 effort。CHANGELOG 说明修正原因。

冻结最终核心源 33 个文件，见 core-final-input.json / core-final.diff.gz。后续新增仅为审计材料和 eval 判决落账，不改变已审源文件。冻结输入 SHA-256：9fc2f8886a7ec56ba18be91f52c7d02a3ef322df839465db235812275835448b。

## 当前验收

- A01 路由 / host / hook：26 组、138、379，通过；完整原始输出附带。
- A02 runner / harness：85、17，通过；完整原始输出附带。
- Claude native routing：31 个实际 checker/governance 反例和恢复，通过。
- writing-for-agents：源、边界、路由与双宿主合同，通过。
- 最终独立 Standards：5/5 PASS，0 findings；原生 agent 01a12e6a-61e0-7cc0-a2a3-86f45943ddba，invocation bcef9011-2d1e-459e-a89c-3179049b5095，同次 accepted。

Spec 与全仓验证的最终结果在完成后追加。以上测试不证明净收益或全局部署成功。

最终独立 Spec：7/7 PASS，0 findings；原生 agent 01a12e6c-3e17-79b3-91cf-6aa89f0b5e67，invocation 955cca9b-efdc-47be-a325-dc485d7f24e3，同次 accepted。两轴冷上下文严格串行，未共享评判。结论只覆盖最终核心源，不覆盖整项原计划。

原始 diff 与包含 Markdown 行尾格式的历史 Standards 原票以确定性 gzip 保存；解压逐字节复原，未改写原票。
