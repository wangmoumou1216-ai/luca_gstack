# U007 接口补充 4：探针登记的具体字段

本补充只完成补充3留下的字段缺口，不签发任何真实运行。默认比较manifest仍BUILD_ONLY；正式development/hidden的独立就绪要求不变。

对stage=probe，在runtime_release加入registration={"path":"绝对登记JSON路径","sha256":"登记原字节SHA256"}。登记JSON形状为：

```json
{
  "schema_version": 1,
  "kind": "u007-capability-probe",
  "status": "REGISTERED",
  "issued_by": "root-coordinator",
  "probe_id": "实际探针ID",
  "run_id": "同release",
  "run": {"case_id":"同release","condition_id":"同release","trial":1},
  "bindings": {"与release.bindings同名同值的六项摘要":"无占位的实际值"},
  "model": {"name":"同release","effort":"同release"},
  "resources": {"wall_seconds":120,"tool_actions":12,"observed_tokens":8000},
  "entry": {"transport":"codex-app-server-stdio"},
  "case_file": {"path":"本次真实输入绝对路径","sha256":"同cases_sha256"},
  "source_manifest": {"path":"同manifest.source_manifest","sha256":"同source_manifest_sha256"},
  "assertions": [{"id":"唯一断言ID","statement":"可核对的行为和所需证据"}],
  "stop_conditions": ["绝对墙钟/动作/已观察token触顶或权限/传输错误即终止并保留全部证据"],
  "pool": "additional-capability",
  "capability_probe_limit": 6
}
```

bindings示例仅说明结构，实际记录必须使用补充1六个精确字段；不得照抄占位。由主协调写入具体输入/断言/模型配置/资源/身份/用途并先在唯一ledger登记，worker没有签发权限。driver校验registration.path绝对普通文件（不接受symlink）、原字节hash、schema/kind/status/issuer/pool/limit固定值、probe_id/run_id及上述run/bindings/model/resources/entry结构相等、case_file/source_manifest规范路径及hash与实际参数相等、非空且唯一assertion ID/statement及非空stop_conditions。JSON对象键序不构成差异；不通过JS或shell执行登记内容。资源仍不得超过输入复杂度上限。

probe登记副本与其hash写入run证据，明确这只是主协调的一次本地运行记录，不是密码学身份认证或行为PASS。不在driver再建全局签名/审批服务；唯一ledger的总池计数归主协调。缺失、漂移、错输入或重复run输出目录均在派模型前拒绝。development/hidden不要求probe registration，也不能混称probe。离线fixture可造合格登记仅用于fake transport测试，不获得真实模型许可。

<!-- FILE_END: u007-interface-addendum-4.md -->
