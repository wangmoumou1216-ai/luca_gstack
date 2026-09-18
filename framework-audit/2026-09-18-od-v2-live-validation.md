# OD V2 发布后真实验证

- 时间：2026-09-18（Asia/Shanghai）
- 框架仓库：`upstream/main`
- 发布提交：`87c4c9d feat(open-design): add template carrier handoff v2`
- 同批已闭环提交：`e9210ba feat(model-routing): add parser-only policy core`
- OD 版本：`0.22.2`
- 目标项目：`fux-66-permission-matrix-e2e-20260914`
- 用户指定快照：`py425bvj0tibihhpq2fxaq5s/files/fux66-permission-matrix-final.html`
- handoff：`luca-od-v2-e2e-20260918-1`
- namespace：`handoffs/luca-od-v2-e2e-20260918-1`

## 能力与边界证据

- daemon health `ok=true`；Codex agent `available=true` 且 `authStatus=ok`。
- stage 前 namespace 不存在；写入只发生在新 handoff namespace。
- 项目原有的 `fux66-permission-matrix-final.html`、`brand-spec.md`、`behavior-reference.html`、`brief.md` 通过全项目 pre/post inventory 校验，未被覆盖、删除或改写。
- 运行时 capability receipt 绑定 `runtime=codex`、精确 project/handoff/namespace/bundle hash 及 `stage|run|recover`。

## 真实状态机结果

```text
EXPORTED
  → STAGED
  → OD_RUN_AUTHORIZED
  → GENERATED_OBSERVED
  → RECOVERED
```

- OD run ID：`029ec06b-3cc8-4538-b5d0-e503d43f3087`
- source packet SHA-256：`672aab9863aec3e9fbbf63481e92f59050ca78aebf85c18d351664790bd48dfc`
- module contract SHA-256：`c348f45d0079574b6c41e762a9ffc3e04214c86489cc30d23118c87bd0789af0`
- carrier content SHA-256：`b69956e35f71e35b7a226051e27f57f59556a2f6d7ba803a39f156a5c6e10199`
- handoff bundle SHA-256：`a796cd7085ae054cdcec869edc090cffda128642f4510a9583e6cdef98c49502`
- prompt SHA-256：`ec61a488d0acd07af0913caf88a6cb07c2304b852b401b9f4f43c434451c44b6`
- 输出：`output/index.html`，248 bytes，SHA-256 `064c2b166b7a30239b89c107e5c10ff0e7e4f538139145faab80c1fd4b8a7302`
- provenance：`od_run_observed`
- `C-01` modify trace：PASS，绑定 `D-001`。
- `preserved-module:preserved-stays`：PASS，源/输出锚定 DOM 一致。
- mechanical validation：PASS。
- semantic acceptance：`PENDING_INDEPENDENT_REVIEW`；机械闭环不冒充产品语义验收。

## 结论

`structural_carrier + single` 已在发布后代码和用户指定的真实 OD 项目中完成 stage、headless run、精确 output readback 与 recover 闭环。本证据不授权模板迁移、`framework/` 写入或旧模板删除；这些仍属独立的未闭环需求。

<!-- FILE_END: 2026-09-18-od-v2-live-validation.md -->
