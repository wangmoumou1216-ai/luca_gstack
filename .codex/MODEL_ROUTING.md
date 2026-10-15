# Codex 模型绑定

自动模型路由由 `.claude/skill-os/model-routing.yaml` 定义角色，当前账户模型名与顺序保存在
`/Users/luca/.luca/model-routing-bindings.json`，权限为 `0600`。native hook 与 workflow runner
读取同一个私有文件；仓库中的测试模型名是回归夹具，不会配置你的账户。

本仓库提供 [6 系列绑定示例](model-routing-bindings.example.json)：轻任务为 `gpt-6-luna`，
常规执行为 `gpt-6-sol`，关键验收为 `gpt-6-astra`。该示例按本次用户授权更新，作为可版本化
的配置起点，不被 hook/runner 自动读取。应用到其他账户前确认这三个模型确实可调用并获得
用户批准，再合并到私有文件；已有 Claude 或旧模型配置不应被整文件覆盖。

私有文件的结构如下（占位符必须替换为用户明确批准、账户可调用的模型）：

```json
{
  "schema_version": 1,
  "harnesses": {
    "codex": {
      "peak_model": "APPROVED_REVIEW_MODEL",
      "light_model": "APPROVED_LIGHT_MODEL",
      "approved_order": [
        "APPROVED_LIGHT_MODEL",
        "APPROVED_EXECUTION_MODEL",
        "APPROVED_REVIEW_MODEL"
      ]
    }
  }
}
```

`approved_order` 是用户批准的路由顺序，从低到高，不是系统根据模型名称猜测的排行榜。
根会话当前实际模型是 `anchor`，也必须在此顺序中。普通执行继承 anchor；轻任务在有明确
较低且已批准的 light 时切换；关键验收在有明确较高且已批准的 peak 时切换。anchor 已在
peak 档或更高时保留 anchor。用户的 reasoning effort 不参与模型档位比较。

新增一个系列时，应核对该系列所有可调用的轻任务、执行、验收模型，更新 light/peak 和
完整顺序，保留仍需兼容的旧会话模型。不要只替换 peak 后遗漏当前 anchor。保留其他
harness 的配置；修改后保持 `0600`，不将真实私有文件提交到 Git。

可选 `inherit_prefixes` 是用户批准的供应商前缀列表（每项为不含空白、`/` 前至少一个字符并以
`/` 结尾的字符串，例如经网关接入的另一账户 `"<provider-id>/"`）。根会话模型以其中某个前缀
开头时，peak 与 light 场景都保留该根模型（`INHERIT_PREFIX_ANCHOR`），即计划与评审以同档模型
执行、轻任务也不改写成不带前缀的绑定名，避免请求被送往另一个供应商。该规则优先于
`approved_order` 排名：即使同前缀的更高模型也在顺序中，列出前缀后仍保持同档。未列出的前缀、
仅在路径中间出现的前缀与不在顺序中的模型仍按 `UNKNOWN_MODEL_RELATION` 拒绝关键验收；格式
无效时所有场景返回 `INVALID_INHERIT_PREFIXES`。设置该字段后它进入路由配置摘要（缺省时摘要不变），
hook 与 runner 均原样传入。关键派发一旦因上述原因被拒，本会话的失败闩锁保持生效；修正绑定后
需在新会话中重试。

遇到 `UNKNOWN_MODEL_RELATION` 时，hook/runner 会指出顺序中缺失的模型名，或指出顺序
格式无效。先核对本次会话实际模型和私有绑定，经用户授权补齐关系，再重试；未知关系
仍然拒绝关键验收，不自动补顺序或绕过门禁。改变模型系列本身不需要改公共路由政策。

本地回归：

```bash
node scripts/test-model-route.mjs
node scripts/test-codex-model-route-hook.mjs
node scripts/test-model-route-host.mjs
```

这几组测试覆盖角色选择、缺失顺序拒绝、显式补齐后恢复、effort 保持和采用证据检查。
真实打通还需分别调用 light、anchor、peak，并在对应 SubagentStop 后检查同一次调用的
可信模型采用证据。只有测试通过不能证明某账户上的模型可实际调用。
