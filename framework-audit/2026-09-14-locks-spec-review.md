# Spec 轴终版复审 — FAIL

独立、冷启动、default-REFUTE；只对照派发的中立 R1–R6，不读取 Standards 报告、作者日志、旧会话或 `auth-repair-evidence.md`。本轮未修代码。

## 冻结与范围

- ROOT：`/private/tmp/claude-501/-Users-luca-Desktop----muse-lucagstack/d291bde9-7011-48f6-a1fe-aba09461424c/scratchpad/wt-attest`
- HEAD：`e80bbc1ed91091e59b3f420aff58daa764c6b8ed`
- Freeze：`takeover-final-review-r1.diff`；SHA-256 `f119a0b167cc9ce570911d4dfcd2ea7843d6133da89b7cf67923f021b6f604f2`。
- 对象为 diff headers 的 12 路径：event-attestation、project-substrate、project-scope-guard、route-guard、session-sync、daily_governance、project-pin 及五个对应测试脚本。必要依赖与两 harness 仓内注册源在读范围内。
- 结束前现场计算同一 12 路径的 `git diff HEAD`，hash 与 Freeze 完全相同；`git diff --exit-code 97eb65a10873a661d7881ac513885a19f85a859a HEAD -- <12 paths>` 为 0。源码无本轴改动，status 仍为原 12 M + 原 untracked evidence。

## Finding

### S-1 — Important — R4：已知静态数据含单引号内 `|` 时仍被拒绝或改写

位置：`.claude/hooks/project-scope-guard.mjs:549`（全串 ``!/[|$`]/.test(command)`` 门；其后的 echo/printf/git message masking），以及 `:1011` 的 updatedInput 返回。

该门按原始命令串中的 `|` 决定是否执行数据遮罩，没有区分引号内字面量与真实管道。以下都是简单、已知、无展开、无管道的 shell 语法：

```sh
echo 'docs/x|message'
printf '%s' 'docs/x|message'
git commit -m 'docs/x|message'
```

独立临时夹具真调用守卫得到：

- `NO_PIN`：三条全部返回 `permissionDecision: deny`。
- 有可验证原生事件的 `TURN_ACTIVE`：三条全部返回 updatedInput，把数据里的 `docs/x` 替换成 `<binding>/docs/x`，例如 `echo 'docs/x|message'` 变为 `echo '<binding>/docs/x|message'`。printf 数据与 commit message 同样改变。
- 正反对照：普通 literal echo 和 quoted tee 数据不改写；真实 `git -C <foreign-project>`、heredoc 输入路径/后续解释器、foreign static cd 仍拒绝。

影响：R4 的“明确字面量保持字节不变”只有部分实现，既会错误拦截合法操作，也会静默修改输出/提交说明。这不是允许保守拒绝的“未知 shell 语法”，也不是安全绕过。现有 scope 套件 136/136 绿，但没有 quoted `|` 数据反例。

可复现探针：`/private/tmp/d291-spec-mutation.pcxyrU/probe-codex-scope.mjs`，以 ROOT 为参数运行。探针仅把命令字符串传给守卫，不执行这些 git/tee/shell 命令；项目、pin、rollout 均为临时夹具。

## 逐 R 判定

| 条目 | 判定 | 代码与运行证据 |
|---|---|---|
| R1 | PASS | `project-substrate.mjs:594` 只保留最后 32 个候选，cursor/consumed 不变；`:844` 仅非最终候选在确定 next-native-turn-differs 时跳过，不跳 native 行。prompt-attestation 实跑：Claude attachment/slash/non-human 各 40 条及 Codex 40 条后真人可继续；真人候选被挤出后其 orphan 行仍 MISMATCH、状态字节不变。 |
| R2 | PASS | `project-pin.mjs:313` 只接 NO_PIN/BOUND/TURN_CLOSED；`project-substrate.mjs:658` CAS 重建 fence 并清 binding/switch/current/candidates/ledger；`event-attestation.mjs:984` 验旧 source identity/prefix 与新增 provenance。transaction 实跑：Claude/Codex 恢复、延迟 flush 后再次恢复、旧 switch/旧消费事件重放拒绝、未知/缺失/损坏源拒绝且原字节不变、TURN_ACTIVE/SWITCH_ONLY 拒绝。独立 replay probe 与 mutation 见下。 |
| R3 | PASS | `project-substrate.mjs:812` 没有按非人类同文字清除最终候选。prompt-attestation 实跑 Claude echo collision：flush 前保留候选且不获权，真人落盘后认证。独立 Codex 探针加入相同文本无 human anchor 的 context row，先 SOURCE_NOT_VISIBLE/状态字节不变，再追加真人 source+anchor 后取得正确 native_id。 |
| R4 | FAIL | 普通数据、git -C、quoted cat/tee heredoc、真实操作数、解释器/展开/管道、已知 cd 与未知/重赋值拒绝均有现有套件及独立正反例；但 S-1 证明 quoted `|` 数据会被改写，字节保持不完整。 |
| R5 | PASS（临时运行分区） | `.claude/settings.json` 与 `.codex/hooks.json` 分别接 route/scope/Stop；transaction 分别调用两 harness 路径。`project-scope-guard.mjs:919` 在失去认证的关闭状态提供仅降权 deactivate 说明。`session-sync.mjs:39` 缺路径按 sid 查找，找不到仍 unavailable；hooks PENDING-006 实跑。`daily_governance.py:1159` 起 append-only correction/原字节 restore，`:341` 排除已恢复旧记录；PENDING-005 实跑更正幂等、恢复后再处置、篡改拒绝。route/hooks 的合成消息反例不产 switch intent/事务。 |
| R6 | PASS（本次代码边界） | 无新增跨项目授权或全局配置改动；NO_PIN recovery 不读取/改写 display links；L7 read-grants 仍隔离，未自动降级授权。transaction 保留并实跑 legacy/no-fence 分支。未决产品/演进裁决及 F14 收费模型票未在本轴冒充闭合。未见 material 未授权扩量。 |

## 现场执行票与 mutation

- `node scripts/test-project-transaction.mjs`：exit 0，PASS=50 FAIL=0。
- `node scripts/test-prompt-attestation.mjs`：exit 0，全断言通过。
- `node scripts/test-hooks.mjs`：exit 0，ALL HOOK/MEMORY REGRESSION TESTS PASSED；已隔离 read-grant 生命周期仍为显式 SKIP。
- `node scripts/test-route-guard.mjs`：exit 0，PASS=243 FAIL=0；read-grant issuer 仍显式 SKIP。
- 定向补跑 `node scripts/test-project-scope-guard.mjs`：exit 0，PASS=136 FAIL=0。
- 独立 R2 probe：只复制 event-attestation/project-substrate 到 `/private/tmp/d291-spec-mutation.pcxyrU/`。未变异副本 exit 0：旧 switch replay 拒绝，追加真人后仅新 tx 可达。只在副本把 recovery fence 返回值改为旧 recoveryCursor 后 exit 1：`Missing expected exception: recovered historical switch MUST NOT attest`。变异确实击穿 replay 防线并被断言捕获，ROOT 未改。
- 独立探针的首批夹具布局不满足 test-source-root 约束，出现 SOURCE_ROOT/SOURCE_NOT_VISIBLE；这些 setup 失败不计行为票。修正为系统 tmpdir 下、source 位于 fixture root 内后，以上有效票均重跑取得。失败的 source 发现未读取任何真实 transcript 内容。

## 未验证与结论边界

- 未跑真实 Claude/Codex 模型交互、真实会话数据、全量 verify 或发布；仓内注册读回和临时 harness 分区不等于已部署现场验证。
- 未证明任意 shell 语法可解析，需求也未要求完整解释器。S-1 的语法在明确要求的已知字面量范围内。
- 唯一存活 Spec finding 为 S-1（Important/R4）；无 Critical。R1/R2/R3/R5/R6 未被本轮定向反证击穿，但不能以它们的 PASS 遮住 R4 FAIL。

状态：DONE_WITH_CONCERNS（复审完成；Spec 未闭合）。

## 追加：R4 精确 delta 闭合（r2，仍 FAIL）

本节是最新判定，保留上述 r1 原始证据，不重写历史。

- 新 Freeze：同 scratchpad 的 `takeover-final-review-r2.diff`。
- SHA-256：`82363ef019606ad8d77cf95ab71351d00ac9cda5e75e98265243da783ebf0b34`。现场 `git diff HEAD -- <12 paths>` 回算一致。
- 比较 r1/r2 的 12 个 diff section，只有 `.claude/hooks/project-scope-guard.mjs`、`scripts/test-project-scope-guard.mjs` 两 section 不同。其他 10 项未变，R1/R2/R3/R5/R6 沿用此前票，不重跑四组长测。
- `node scripts/test-project-scope-guard.mjs` 现场 exit 0，PASS=137 FAIL=0；其中真实管道、可求值展开、printf -v 赋值、重定向、解释器/未引用 heredoc 的保护断言均通过。
- 复跑独立 `probe-codex-scope.mjs`：S-1 原有三条 quoted `|` 命令在 NO_PIN 与 TURN_ACTIVE 全部返回 null（无需改写），原 S-1 的具体反例 CLOSED。quoted tee 字节与 git -C/真实路径保护的对照也仍通过。

### S-2 — Important — R4：同类 quoted metachar 仍有 `<<` 残留

准确位置：`.claude/hooks/project-scope-guard.mjs:566`，数据遮罩条件仍含原始全串 `!command.includes('<<')`；`:505` 的搜索模式分支也保留相同全串条件。本项运行复现仅针对 echo/printf/git message，不扩展其他风险面。

```sh
echo 'docs/x<<message'
printf '%s' 'docs/x<<message'
git commit -m 'docs/x<<message'
```

这三条只有一个明确单引号字面量，并没有 heredoc。独立临时夹具现场结果：NO_PIN 三条都 deny；TURN_ACTIVE 三条都给 updatedInput，把 `docs/x<<message` 改成 `<binding>/docs/x<<message`。数据字节仍被修改，不满足 R4。新测试只含分开的 `< >`，未覆盖同属 quoted `<` 数据的相邻 `<<`。

最终轴状态：S-1（quoted `|`）已关闭；唯一存活项为 S-2（Important/R4），无 Critical。R4 仍 FAIL，不能把 137/137 的套件票当作字节保持已完整实现。真实模型/会话、全量 verify、发布依然未验证。本轴未改 ROOT，未读取 Standards，按本次有界 delta 要求停止，不自行追加修复或轮次。

状态：DONE_WITH_CONCERNS（delta 复审完成；Spec 未闭合）。

## 追加：新批准的统一 Shell 识别定向闭合（r3，PASS）

本节为最新有效结论，覆盖 r1/r2 的未闭合状态；历史 findings 与现场证据原样保留。

- Freeze：`takeover-final-review-r3.diff`；SHA-256 `eebfb0c96d4d144e80d6201b03050aad97ee755e626ac75e19d2365a37cc87b1`。读取冻结文件与结束前 `git diff HEAD -- <12 paths>` 回算均一致。
- 对比 r2/r3 的 12 个 diff section，仍只有 scope-guard 与 scope 测试两项变化。未扩扫其余 10 文件，R1/R2/R3/R5/R6 保留前述有效证据。
- 静态核对：各数据遮罩分支共用 `shellSyntax` 的 quote/escape-aware 结果；搜索模式、echo/printf/git message 不再按 raw `includes('<<')` 把 quoted 数据判为 heredoc；quoted cat/tee heredoc 头也消费同一操作符判断。
- 现场 `node scripts/test-project-scope-guard.mjs`：exit 0，PASS=137 FAIL=0。DATA-007 实际遍历 NO_PIN/TURN_ACTIVE，覆盖 S-1 的 quoted `|`、S-2 的三条 quoted `<<`、双引号 `<<` 及 grep/rg 模式，均返回 null、保持数据字节不变。DATA-002/005/006 继续证明真实 heredoc/管道/可求值展开/重定向/printf -v/解释器仍可被拒绝或重定向，普通 literal 与真实操作数同场时不误改 payload。
- 一条独立旧判据 mutation：只复制 guard 到 `/private/tmp/d291-spec-r4-mutation.ADacQX/project-scope-guard.mjs`，通过只读 lib 链接加载原依赖；只在该副本 echo/printf/git 分支恢复 `&& !command.includes('<<')`。用 `PSG_HOOK_UNDER_TEST` 跑同一 scope 套件，exit 1，PASS=136 FAIL=1，唯一失败为 `IDENTITY-DATA-007 … :: echo 'docs/x<<message'`。不是导入/基础设施失败；新断言准确击中旧问题。ROOT 与其他库未修改。

最新逐条判定：R1 PASS、R2 PASS、R3 PASS、R4 PASS、R5 PASS（临时运行分区）、R6 PASS（本次代码边界）。S-1 CLOSED；S-2 CLOSED；Spec 存活 findings=0，本次定向闭合未发现新的 Important/Critical。

未验证边界保持不变：未运行真实 Claude/Codex 模型、真实会话、全量 verify、发布；本票不替代主线发布前 gate，也不替代另一轴在同一 hash 上的确认。没有宣称完整 Shell 解释器支持。本轴未读 Standards、未修 ROOT，按一次定向闭合范围停止。

状态：DONE（本轮 Spec 复审完成，冻结 r3 的 Spec 轴 PASS）。
