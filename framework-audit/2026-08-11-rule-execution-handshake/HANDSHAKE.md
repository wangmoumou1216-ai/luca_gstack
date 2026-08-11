# Rule Execution Repair — Final Handshake

状态：`READY_FOR_USER_AUDIT`

这份握手证明最终计划包已完成红队与独立判官审查，但**不表示用户已批准，也不表示实现已经开始**。

## 冻结对象

- plan_id：`REX-20260811-001`
- plan_sha256：`ca4d57b0057dea529943e167b833eaca5a07d51495fc0f62e2dd47ac23daf4d8`
- final_judge_sha256：`d4a06781c6c0cd8e2fd8eaaa208a8b7b00aa12dd420fdcb33dbee7d8df17aa8f`
- source_manifest_sha256：`5b66b5814addeb97e1cc4f7d890a5897f180023ca3a4c285f5898c1e3df228ff`
- bundle_manifest_sha256：`89555b30ebddaf2f32143c9c54a52f57d566c4fe9210bff145218adfc40b4144`
- g_plan_proposal_sha256：`7948abf601a80c9f4267dbbdf7b9cde1b0d90e85e729dc654df768804266443e`
- expiry：`2026-08-18T04:48:11Z`

`FINAL_PLAN_BUNDLE_INTEGRITY_PASS` 只证明 bundle bytes、声明结构和 103 文件 source set 的闭合；
`structural integrity is not plan truth`。语义成立由独立判官的 `SURVIVES` 裁决承担，是否执行仍只由用户决定。

## 审计与批准

请先审计计划。若要提出修改，直接说明修改项，**不要**发送下面的批准字节；任何计划包成员变化都会让
当前 proposal、nonce 和批准字节失效，并要求重新判官与重新握手。

若审计后确实批准这一精确版本，必须在新的顶层用户消息中逐字发送：

```text
APPROVE G-PLAN 7948abf601a80c9f4267dbbdf7b9cde1b0d90e85e729dc654df768804266443e f687feb84f0de01f1bffaa5d1e435ced
```

该批准只打开计划的第一个执行门；G-PACKAGE、G-CONTAIN、G-OBLIGATION-SCOPE、G-ACTIVATE、
G-REMOTE 仍需各自绑定新 descriptor 的独立批准。代理、工具或委派 agent 复述此字节均不构成授权。

<!-- FILE_END: HANDSHAKE.md -->
