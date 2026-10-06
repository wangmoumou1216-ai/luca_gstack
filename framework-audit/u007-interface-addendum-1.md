# U007 接口补充 1：身份与运行释放字段

主协调针对 W09 的具体字段缺口作唯一裁决。补充 u007-implementation-contract.md，不更改原目的/范围/预算、条件定义或 BUILD_ONLY 状态。此文不是运行放行。

## materializeCondition 返回值

在既有返回对象中增加 `materialSha256`。计算规则：构建完成时枚举 destination 下所有普通文件，以 POSIX 相对路径排序，逐个 SHA256 原始字节，构成 `[{path,sha256},...]`；用 JavaScript JSON.stringify 得到 UTF-8（无额外换行）后 SHA256。不能包含绝对临时路径、mtime或自引用manifest文件。不能有逃逸symlink；内部symlink需要按共同条件代码公开的安全方式展开为普通文件。该摘要只证明材料身份，不证明已读或公平。

## runtime_release 精确形状

普通 u007-comparison-manifest.json 继续 BUILD_ONLY。主协调在源码/条件构建与 J-U007 就绪后，为每一已登记 trial 生成独立 run manifest，内容包括相同比较范围及如下字段：

```json
{
  "runtime_release": {
    "status": "READY",
    "run_id": "唯一已登记run字符串",
    "run": {"case_id": "实际case", "condition_id": "B/T/S/I之一", "trial": 1},
    "bindings": {
      "driver_sha256": "实际文件摘要",
      "conditions_sha256": "实际文件摘要",
      "case_protocol_sha256": "实际文件摘要",
      "cases_sha256": "实际输入案例包文件摘要",
      "source_manifest_sha256": "实际U002源清单文件摘要",
      "condition_material_sha256": "由上述固定算法得到的实际材料摘要"
    },
    "model": {"name": "本次已核选择的模型名", "effort": "用户拥有的当前effort"},
    "resources": {"wall_seconds": 1200, "tool_actions": 30, "observed_tokens": 40000},
    "entry": {"transport": "codex-app-server-stdio"}
  }
}
```

示例文本占位值仅说明schema，绝不是合格 READY 数据。driver 校验非空、hex256、合法枚举/数字、全部真实字节与CLI请求一致；run_id和输出目录不得复用覆盖。resources 不超过比较 manifest 对应 simple/heavy 上限；观测token不能硬实时控制时如实注明。model/effort 来自主协调实际配置读取及原权限，不允许worker自行降级或硬编码账户模型。

源码路径：driver/conditions/case-protocol 取 driver 实际相邻模块；cases 取 runTrial.caseFile；source_manifest 取 manifest.source_manifest（原比较文件目前该键为source_manifest）；sourceRoot 取 manifest.source_root。case-protocol/conditions 未到位时只用测试注入，不伪造真实身份。模型配置和资源不另从全局默认悄悄覆盖；实际thread/start/turn及服务回显差异保留，模型服务端真实身份缺回执不能伪称已证。

执行顺序：先核静态bindings和run参数→新建不重名run目录→materializeCondition→核materialSha256→准备隔离case→启动模型。任何不一致在模型启动前拒绝，保留原因。构建或离线测试可以验证假READY会被拒绝，不因此获得真实模型许可。

## 额外 API 小澄清

`createCaseRuntime` 允许返回对象或 Promise；driver 一律 await，其他成员按原合同。动态工具定义和参数由 Context 单owner给出，driver不复制参数schema。跨模块单测以各自stub模拟合同，最终集成须换真模块再验证。

<!-- FILE_END: u007-interface-addendum-1.md -->
