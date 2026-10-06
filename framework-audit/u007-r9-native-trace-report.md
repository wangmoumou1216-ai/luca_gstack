# W33 原生记录消费模块

DONE_WITH_CONCERNS：实现与离线验证完成；真实native资格仍UNKNOWN，不覆盖J11 FAIL。

代码目录：/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/
- native-trace.mjs SHA256 afcc6cb544c9f85319b8598284591f22a011302304ff886cce581a979da046ce
- native-trace.test.mjs SHA256 3d18363963e0383c3e077805d573606d66b5ef1c36a66719dd0bb13376884f22

指定HEAD已核；两文件前像不存在。仅新建两文件及本报告，未改其他owner、生产、配置或权限。

API保持createNativeTraceObserver({traceRoot})→{poll}，poll({rootThreadIds,final})返回独立累计快照。只按tool_call_started计dispatch；wrapper和runtime/terminal投影不另计。requester形状为type=model或type=code_cell+runtime_cell_id；原生两个call-ID字段独立保留，wrapper_call_id只从匹配cell取得。

root/fresh只用driver明示ID；child父关联只取原生session_source。首次缺文件或live未收尾为PENDING，final缺失/未收尾为INVALID；损坏不能恢复VALID。校验序号、身份、起终、payload结构/hash，拒绝逃逸、symlink、跨bundle混入和已读字节改写。只从匹配的原生terminal对象取exit，不解析wrapper报称JSON。快照不导出prompt、推理、源码或工具输入输出原文。

来源：[OpenAI rust-v0.160.0](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/rollout-trace/README.md)。所读官方schema、dispatch、thread、writer及直接类型owner的URL/hash/读取段逐项存sources.json。公开静态获取，无登录/CDP；一次model.rs 404后沿真实owner读取model/mod.rs，未执行下载源码。

证据目录：
/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w33-native-trace-tdcvtb5a/

evidence.json收录输入/产物/日志hash。最终命令：node --test scripts/tri-system-eval/native-trace.test.mjs（上述工作树cwd）；32/32、exit0、0.198秒。完整日志tests-final.tap，命令及身份tests-final.json。首轮26/26日志保留。覆盖直接/CodeMode、幂等/live、child/fresh、身份/序号冲突、缺失/截断、引用/链接、hash漂移、伪造JSON和未终态。

synthetic-index.json SHA256 2ccd7492c0edac5f884f26526dad2b6a9b988791660e216044523fa1a2d8f45d；traceRoot=证据目录/synthetic，rootThreadIds=["synthetic-root"]。合成样例读得结构VALID、1操作、exit1，绝非实际native证据。

VALID不证明writer无漏记或整链覆盖。hash是消费者观察值，不是上游签名；依赖排除候选读写的专属目录。该版本resumed child不共享writer，effort/未观察链保持unknown。live轮询存在延迟；取消、覆盖及P08由root另行资格核验。本轮0模型/行为探针、0新Agent、无提交推送。

资源：起点epoch1790985805.3670552；至报告写入54保守动作，准确耗时见evidence.json；实际turn ID、模型usage和完整观察token unknown。两次报告长度预检失败均未落盘，已缩短。
