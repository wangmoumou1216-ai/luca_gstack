# R9 接线字段裁定（主协调）

补充11的同一实现范围内补齐字段，不新增阶段/运行权：

1. `runtime_release.bindings.native_trace_sha256` 绑定实际 `native-trace.mjs` 字节；`createTrialRunner` 的 paths 注入可增加 `nativeTrace` 路径供离线测试，默认同目录文件。登记的 bindings 必须与 release 一致。启用 `runtime_release.native_trace` 时登记也包含相同 `native_trace` 对象，并严格交叉验证。
2. 已启用 trace 的 capability registration 额度为8，与补充11一致；同时核manifest的capability预算。旧未启用路径继续已有6/7，不能删上限检查。
3. `report.native_trace` 是 observer 最后快照；`report.native_trace_accounting` 至少包含 `observed_unique_operations`、`mapping_complete`、`whole_chain_coverage`、`poll_count`、`max_poll_gap_ms`、`final_status`。无真实资格证据时 whole_chain_coverage='UNKNOWN'，不因结构VALID自动formal=true。
4. native唯一操作及原有visible操作分别保留来源。callback/item/hook只有可信ID能合并；无法对应不造映射、不盲相加。运行时任一已观测不重复操作集合超限都足以停止；未合并清楚的总数保留null、完整性UNKNOWN，不能把较小集合伪装总量。
5. W33请尽早给一个来自已核官方schema的最小synthetic bundle样例（专属临时目录，明确不是实际native证据）、准确路径/hash与operation requester的真实字段形状；root传给W34/W35，不要求它们重复检索源码。W33的reader允许向既定快照添加源字段所需的证据说明，但不得改变既定必需字段或猜父关联。

<!-- FILE_END: u007-r9-interface-clarification.md -->
