**Spec：FAIL，2 项 Important。** 判定仅针对冻结版本，不包含 Standards 轴。

1. **Important｜项目隔离未覆盖 episodic 默认召回。**  
   规格：计划 Phase 3、C2；研究第 2 项“无范围无项目读”。  
   位置：[search_memory.py:526](/private/tmp/memory-final-review/files/memory/scripts/search_memory.py:526)。项目过滤仅在 `project` 非空时执行；默认 `all` 仍加载 episodic。  
   **实测**：给冻结代码注入一条 `project=beta` 的合成记录，无项目参数时返回该记录；指定 `alpha` 才排除。项目文件层的预读隔离已生效，但这个既有召回路径未被修复，NO_PIN 查询仍能获得项目专属摘要。

2. **Important｜归档前失败后的重试会重复记账。**  
   规格：计划 Phase 3“恢复/重试不重写 ID、不丢证据、不重复记账”；研究第 4、8 项。  
   位置：[daily_governance.py:274](/private/tmp/memory-final-review/files/memory/scripts/daily_governance.py:274)、[315](/private/tmp/memory-final-review/files/memory/scripts/daily_governance.py:315)。只有 active 文件已消失才进入恢复；文件仍在时会生成新 disposition ID，再追加裁决。  
   **实测**：在首次 `DISPOSITION_RECORDED` 后注入 rename 失败，原参数重试得到 **两条裁决、一个完成事件、两个 disposition ID**，原文哈希相同。原文保住了，但首条事件悬空；[健康统计:1169](/private/tmp/memory-final-review/files/memory/scripts/daily_governance.py:1169) 会把一次裁决计为两次。

实际验证：37/37 文件哈希匹配；19 个代码文件语法检查通过；上述行为探针直接运行冻结函数，文件读写使用内存替身，未修改真实数据。

未知项：未重跑需要临时落盘的完整回归、真实 Git 测试及双 harness 原生流程；未执行迁移，未核实历史提交声明。计划仍为 `IN_PROGRESS`，报告和聚焦提交尚未收尾本身**不计为实现失败**。