# W15 编排探针登记修复报告

状态：DONE_WITH_CONCERNS。补充4登记校验已实现，26项离线测试通过。原生 shell/MCP 的完整访问范围仍无观察合同，真实 B 启动运行尚不能获得有效比较资格。本报告不是独立验收或真实行为 PASS。

## 范围与输入

- 工作树：`/Users/luca/.codex/worktrees/71f8/luca_gstack`；HEAD `05120197073144c0f46b6fb30a192733d529cc4f`，NO_PIN。
- 只修改本树 `scripts/tri-system-eval/driver.mjs`、`driver.test.mjs`，新增本报告。没有改 conditions/case-protocol、主 manifest、生产实现、framework、全局配置或真实项目；没有 commit/push。
- W15 task SHA256：`b4221174e55740ba9ba61862f8c4a71a61917cfb2394e8ead8bafa0ce69b0bcb`。
- 完整读取补充4，实测 SHA256：`5ea1a081c26ed680969929cfa69898be0562e5d4e4bfc9452ef4706c13f1534a`。
- 原构建报告未覆盖，SHA256 仍为 `3f1e40f50ec518979a250f76424dd50e42fb11034ae60ca2e38159e9957e02d5`。
- 真实模型 run=0，网络=0，新 Agent=0，hidden case 读取/运行=0。测试中的 stage=hidden 只是既有 synthetic example 的阶段字段验证。

## 代码结果

`driver.mjs:29` 新增 `readProbeRegistration`，替代原来的 `PROBE_REGISTRATION_CONTRACT_REQUIRED` 占位拒绝：

1. probe 要求非空 probe_id，绝对登记文件路径、普通文件且非 symlink 端点、原字节 SHA256。
2. 核验 schema/kind/status/issuer/pool/limit 固定值、probe_id/run_id；run/bindings/model/resources/entry 用结构相等比较，忽略对象键序；bindings 必须恰为六项已验证摘要。
3. case_file/source_manifest 路径均须绝对，realpath 规范身份与实际输入相同，声明 hash 与 release binding、文件实际 hash 一致。路径别名按规范身份比较，不要求 macOS `/var` 与 `/private/var` 的字面拼写相同。
4. assertions 非空，ID 和 statement 均非空且去首尾空白后各自唯一；stop_conditions 为非空字符串数组。只解析 JSON，不执行其中内容。
5. 沿用输入复杂度资源上限；在输出目录创建之前验证登记，在模型派发前再次读取核验，发现准备期间漂移即拒绝派发。另补齐 source manifest 的派发前摘要复核。
6. `evidence/probe-registration.json` 保存登记原字节，`result.json.probe_registration` 记录副本路径、来源规范路径及 SHA256，并明确它只是协调者本地运行记录，不是密码学认证或行为 PASS；全局池计数仍属于协调者 ledger。
7. development/hidden 不要求登记，stage 原样保留；重复 run 输出目录继续通过独占 mkdir 拒绝覆盖。

登记不是签名安全边界，也没有新增签发入口、全局身份服务或运行许可。测试 fixture 自造登记仅走注入的 Node fake-server；公共 CLI 没有跳过登记的参数。

## 实际验证

工作目录均为上述 71f8 工作树。

| 命令/证据 | 实际结果 |
| --- | --- |
| `node --test scripts/tri-system-eval/driver.test.mjs` 首轮；输出 a77571 + f7ae7c | exit 0；25/25；8336.924958 ms |
| 同命令最终轮；输出 92acb9 + dc93a2 | exit 0；26/26；8724.032875 ms；fail/cancelled/skipped 均0 |
| `git rev-parse HEAD`；输出 6e4e85 | exit 0；上述 HEAD |
| `git status --short`；输出 5e7fed | exit 0；仅 `?? scripts/tri-system-eval/`；窄文件列表确认目录只有两个自有文件 |
| `shasum -a 256` 两代码文件和旧报告；输出 6e4e85 | exit 0；摘要见本文 |
| 补充4全文与 `shasum -a 256`；输出 917065 | exit 0；匹配派发摘要 |

最终测试新增/更新的行为证据：

- 合格假登记接受、嵌套对象键序变化接受、登记副本字节/hash 完整保留、重复 run 不再启动传输。
- 缺登记、相对路径、不存在文件、目录、symlink、原字节漂移，均在 fake transport 启动前拒绝。
- 固定字段、case/condition/trial、model/effort、binding 缺失/漂移/额外项、transport、resource 错配，以及同字节异路径输入、错 hash、空/重复 assertion、空 stop_conditions 均拒绝，launches=0。
- 登记与 release 一起提高预算仍不能突破复杂度 cap；准备期间登记漂移会留下原副本及 INVALID_RUN，launches=0。
- 原21项测试的预算、失败保留、线程注册、fresh family、中断确认、进程组清理等行为继续通过。
- 新增 B 条件 fake event：成功 shell startup、readOnlyHint=true 的 MCP、hint 缺失 MCP 均 INVALID_RUN；只有 hint 缺失者额外触发外部/写工具 fail。这是事件处理验证，不是实际 B CLI 成功运行证据。

未运行全框架测试，没有把作者自检或 fake 完成等同于独立验收、真实工具成功或语义质量 PASS。

## B startup 与原生工具兼容结论

精确行为：`driver.mjs:321` 对 commandExecution/imageView/mcpToolCall 的 started 或 completed 事件无条件添加 UNKNOWN_NATIVE_READ_SCOPE；`:512` 最终据此将报告改为 INVALID_RUN。commandExecution 的 exitCode=0、命令只算术、命令属于已复制的 memory helper，都不会移除这项限制。此路径不会仅因未知读取立即 interrupt，但不能产出有效比较结果。MCP hint 不为 true 时还在 `:324` 触发即时 fatal；hint=true 仍留下未知读取限制。

因此，“所有真实 B 必然 INVALID”须加条件：凡履行非平凡 startup 并通过当前事件协议执行原生 shell 命令的 B，必然命中此判定；完全没有这些事件的 B 不因这一条被拒，但不能据此证明已合格履行 B。T/S/I 的相同工具事件也受同规则影响，不能靠禁工具或跳过 B startup 获得可信比较。

只读检查 root 集成版本：

| 文件 | 本次快照 SHA256 | 已读范围/作用 |
| --- | --- | --- |
| f351 `scripts/tri-system-eval/conditions.mjs` | `0337ed8b1d78805de5b2a3658623de00db87cd5c29aac29a3aa760c1dec63dc4` | rg 定位，138–215、249–324；B/S 复制原来源，helper 仅复制未安装/执行；allowedReadPaths 仅包含可读文档/配置，非 helper 脚本；自带依赖/启动未验证限制 |
| f351 `scripts/tri-system-eval/case-protocol.mjs` | `ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8` | rg 定位，345–425；registerThread 与四个 case 工具，snapshot 的 file_access 是 engine 的读取账，不覆盖原生 shell |
| 冻结 schema `v2/ThreadItemsListResponse.json` | 未另冻结为新接口 | rg 定位，1000–1105、1145–1235；commandActions 明确为 best-effort command parsing；MCP 有 readOnlyHint，但没有完整本地/远端访问账 |

以上 f351 是读取时快照；routing owner 的并行后续修改可能改变接线，不宣称其后版本已通过验证。没有执行旧评估 driver、真实 memory startup 或 MCP。

## 需协调者冻结的最小接口增补（建议，未实施）

目的只是在保留原生工具能力的前提下，把“外层范围可证明”与“实际消费证据可证明”接入同一 driver；不新增平台架构，不将解析出来的 commandActions 伪装成真实读取。

| 合同块 | 至少字段与证据 | 责任边界 |
| --- | --- | --- |
| 运行绑定 | run_id、condition material hash、collector 实现/配置 hash、有效 policy hash、collector 启停边界 | 主协调冻结；driver 复核与保留原始凭据 |
| 事件关联 | 单调 sequence、thread_id、turn_id、item_id、进程/子进程身份、generation、时间；MCP server/tool/call identity | 可信宿主观察来源，不能由候选模型自报；跨 fresh/child 不中断归因 |
| 执行描述 | 原始 command 或 argv、cwd、可公开的环境策略标识、helper/runtime 依赖闭包摘要、exit/输出摘要；不导出秘密环境值 | routing 确认 B 原生入口及依赖材料；driver 关联预算与原始 RPC，不预代替模型执行启动 |
| 有效范围 | 规范 read/write/network 允许范围、阶段版本、实际施加策略的回执；源仓库/隐藏输入/答案/transport 证据/全局私有配置不可被候选偷读 | 可信执行约束或隔离的证明，不把只读 sandbox 当成读取隔离；T 保留同等原生能力 |
| 实际访问 | canonical resource identity、operation、allowed/denied/outcome、文件版本/hash；需要消费字节度量时含 ranges/bytes；MCP 另含远端资源与副作用回执 | 真实 observer 提供；Context 接收有来源的账，不把 case_read 账扩写成未观察的 shell 账 |
| 完整性 | coverage=complete/partial/unknown、丢事件/截断、进程后代覆盖、读取/缓存/mmap 等捕获边界、开始/终止确认、原始日志路径/hash | 任一缺口保留 UNKNOWN；仅解析命令、工具hint或“无违规记录”不能消除 UNKNOWN |
| 收口规则 | 完整受控范围证明可用于外层有效性；若仅证明范围、未证明实际消费，则消费度量仍 UNKNOWN；不据此生成语义/权限 PASS | 协调者明确何种证明足以比较；driver 无授权自行降低要求 |

最小可行路线应先确认现有宿主能否提供**真实且覆盖完整的范围约束回执或访问观察**。如果能用隔离后的可见文件集合严格限定外层范围，就无需为外层范围判断强造逐字节账；但这不能证明哪些字节被消费。当前 app-server item schema 本身不足以提供这两类证明，尚未验证本机存在合格 collector。

受影响路径：driver 的 spawn/thread-start 安全参数与原生事件处理/最终状态；conditions 的 helper 与依赖闭包材料清单、来源 hash；case-protocol 在需要实际读取记账时增加接收可信 observation 的接口。共同 manifest/release 需冻结 observer 绑定及接收标准。后三者由各 owner/协调者维护；W15 没有自行改动或新增这些字段。

## 交付身份与续接

- driver.mjs SHA256：`0dccdb661a73cab30dd3d082d8700451f2e46711708527f5994c3186b24316d3`
- driver.test.mjs SHA256：`54dc9b5d0dc1152e59cf40c0b619165499cbdb0eaab4aca4866689935b9681c5`
- 恢复最小读集：W15 task、补充4、本报告、上述两代码文件；验收命令 `node --test scripts/tri-system-eval/driver.test.mjs`。
- W15 本轮没有活动 child agent。原实现历史保存在旧 build report，不覆盖。
- 下一项由主协调决定：收取代码与 Context owner 的三模块离线集成证据；冻结原生执行/观察的最小合同；之后才决定真实 probe release。W15 不签发真实运行。
- 可观察 token 计量不可用，保持 UNKNOWN；本次工作在45分钟/90底层动作预算内。启动时间 epoch 1790964998.6699982；最终耗时与报告hash在交付工具回执核对。

## 收口时收到的协调者证据补充

协调者在同一任务中通知：正在登记并执行无模型的哨兵目录 sandbox 能力探针；本 owner 不重复运行。协调者报告其已读官方 permissions 文档，命名 profile 可设置 filesystem 的默认 deny、minimal read、指定工作目录读写及 network=false；范围仅覆盖原生命令，不覆盖 MCP/Apps。这里是来源明确的协调者输入，本 owner 没有联网复读，也没有据此宣称本机 effective policy 已验证。

本 owner 只读复核本机冻结 schema（命令输出 fd3449，exit 0）：`ThreadStartParams.json:433` 支持 permissions 并禁止与 sandbox 同传；`TurnStartParams.json:875` 支持 permissions 并禁止与 sandboxPolicy 同传；`ThreadStartResponse.json:3047` 返回 activePermissionProfile。该线索使“用已有命名 profile 接通可证明的外层范围”成为优先待验证路线，可能不需要新增逐调用执行包装器。

若协调者哨兵证据成立，最小 driver 接线仍需冻结 profile ID、配置/内容摘要、作用域及探针证据绑定；thread/turn 请求改用 permissions 并移除互斥旧字段，核验实际 activePermissionProfile 及有效配置。要验证启动配置中的旧 sandbox_mode 冲突、子进程/fresh 继承及源仓库/证据目录隔离。MCP/Apps 不能冒用命令 profile 的证明，实际消费字节仍可 UNKNOWN。当前未修改这些参数，未把 UNKNOWN_NATIVE_READ_SCOPE 洗成合格，也未禁用原生 shell。此接线不属于已经冻结的补充4实现。

## P02 实证收取与最小 profile 字段建议

已完整读取协调者指定的 P02 登记与结果，未重复运行探针。读取/hash 命令 d61f6f，exit 0：

- `u007-p02-native-fs-registration.json` SHA256 `30c806ab597c887fcb7be19c6a02dbfb6d0fbcbc3c12abe44ee70fa0dd280b4f`。
- `u007-p02-native-fs-result.json` SHA256 `6ff3ddb2645059634fe37c516f13ec117d727cd1225902302263968dc4767c95`；其中 registered_input_sha256 与实测登记摘要一致，probe_id/run_id 对应。
- 结果：exit 0、未超时、0.09秒、model_calls=0，child 7/7 checks=true，parent 5项检查=true。覆盖允许读、外部读拒绝、symlink逃逸拒绝、scratch写允许、只读目录/外部写拒绝、子进程继承拒绝；标记保持不变且禁止的写入不存在。状态准确为 PASS_NATIVE_SANDBOX_COMMAND_ONLY。
- 登记中的 argv 使用命名 profile `u007-p02`，默认根 deny、minimal read、精确 Python.framework 目录 read、workspace read、scratch write、network.enabled=false。P01 的 exit134及依赖原因来自 P02登记的 reason_for_new_attempt；本次未另读 P01原日志，不提升为本 owner 独立诊断。
- 文件明确排除 app-server effective profile、hook、MCP/Apps、实际读取范围消费证明；未尝试网络访问。因此 network=false 是登记配置，不能写成网络阻断实测通过。
- 共享池2/6、总2/144来自协调者消息；本次没有重算或改动唯一 ledger。

本机 schema 的 ActivePermissionProfile 已进一步读取（ca9a8e，exit 0）：它仅包含必需 id 与可选 extends。**ID/extends 回显不携带完整有效 filesystem/network 内容或摘要**，不能单凭 profile名相同认定配置生效。

建议协调者下一份接口补充冻结一个独立块，例如 `runtime_release.native_command_permissions`，并在 probe registration 中要求该块结构相等（不扩写补充4现有六项 bindings）：

| 最小字段 | 核验用途 |
| --- | --- |
| profile_id、extends（初版明确 null） | thread/start 与每次 turn/start 的 permissions 使用同一绑定；activePermissionProfile.id/extends 精确匹配，拒绝隐式继承 |
| config.path、config.sha256 | 固定本地完整 profile 配置原字节；限定 filesystem root/minimal、规范 workspace/scratch/runtime 目录及 network；读取与派发前防漂移，保存副本 |
| runtime_read_grants（规范路径及运行依赖材料摘要） | P02已证明 minimal 不足以启动当前 Python；按实际依赖授予，不扩大到 Home/源仓库；明确这些额外可读字节属于可见范围 |
| scope= native-command-only | 防止 profile证明外推到 app-server主进程、hook、MCP/Apps；这些表面仍各自 UNKNOWN |
| evidence.registration/result 的绝对路径和摘要 | 绑定本次基础能力证据；P02可作为本机CLI能力证据，不能替代后续 app-server 同配置证据 |
| effective_evidence 的来源/路径/hash/覆盖面 | 记录实际解析后策略或与当前配置、二进制及线程路径绑定的执行证据；仅请求配置和 id 回显时标为 UNKNOWN，不伪造宿主不存在的回显字段 |

driver 接线位置仍是已有 spawn配置、thread/start、turn/start 和有效响应校验：使用 permissions 时移除互斥 sandbox/sandboxPolicy；记录原始响应和实际配置来源，检查 legacy sandbox_mode 冲突；新 root/fresh 都重新校验，子进程/子线程继承需要相应真实证据。不能继续用现有 response.sandbox.type===readOnly 作为命名 profile 的充分校验，也不能只删掉这个旧检查而不补有效性证据。

P02让“复用已有原生命令 profile”有实证基础，优先于新增执行包装器。当前仍未冻结上述字段或改 driver 的 UNKNOWN判定；补充4登记实现与26项测试的代码hash保持不变。待协调者冻结接口并提供 app-server层证据后再实施，不重复探针、不调整池计数、不削弱 T 原生能力。

<!-- FILE_END: u007-orchestration-probe-fix-report.md -->
