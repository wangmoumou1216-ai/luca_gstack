# W19 原生命令权限实现报告

状态：DONE_WITH_CONCERNS。补充5的 driver 接线与离线验证完成，34/34测试通过。未运行真实 app-server thread/turn、模型、hook、MCP 或新能力探针；未产生或签发真实 effective proof。真实入口边界仍待协调者探针及 J 接受。

## 交付身份与范围

- 工作树 `/Users/luca/.codex/worktrees/71f8/luca_gstack`，HEAD `05120197073144c0f46b6fb30a192733d529cc4f`，NO_PIN。
- 仅修改 `scripts/tri-system-eval/driver.mjs`、`driver.test.mjs`；新增本报告。conditions、case-protocol、integration、公共 manifest/release、全局配置、真实项目、framework、旧报告均未改；无 commit/push/安装/新 Agent/网络。
- driver SHA256：`f766babd64996cb3b34e3856dfe0167e22c00a38778666f8697b396f128b12f1`。
- test SHA256：`6d408fb2e314c2c6d7cc76b1589df31fc8b6626fbc3fdeb395d2494d03095f0a`。
- 完整读取 W19 task，SHA256 `101975af7c7f8d109c178ae67523c7a86ae4c695b060bc70d1ec347008285243`；完整读取补充5，SHA256 `5727306f38a0b5779d0e18c51f0ff73ab5386bf3f6c2a5ddc252946ca106ed3a`。
- 完整读取自己的 W15 报告，含后附 P02 收取/权限字段建议（上一轮增补记录，无独立 W17 命名文件命中）；旧建议以补充5的已冻结 native_command_permissions 形状为准。

## 已实现行为

1. 保持原未配置模式兼容。无 native_command_permissions 时仍使用原 sandbox/sandboxPolicy；原生命令/图片/MCP的未知读取继续使 run 无效。
2. 新对象严格检查 profile_id、profile、runtime_read_roots、effective_probe 四字段；profile仅 filesystem/network，network严格 `{enabled:false}`；禁止 extends/write/多余网络键。profile_id只接受可安全用于配置键的字母数字、下划线、短横线。
3. filesystem严格等于 `:root=deny`、`:minimal=read`、当前规范 condition.root=read、逐项 runtime_read_roots=read。运行时根要求已存在、规范、普通目录、非链接、无重复；拒绝根/用户根/常见宽泛系统和安装根，以及与源仓库、输入/审计目录、run/condition目录重叠的运行时授权。准备完成、派发前重复检查，捕获路径链接漂移。
4. probe registration 对 native_command_permissions 做完整结构等值绑定。缺项、增加/删改、摘要漂移不获得派发资格。
5. 同一个 profile 通过 app-server 的 `-c permissions.<id>=<TOML inline table>` 和 `-c default_permissions=<id>` 明确设置进程配置；thread/start 的 config 同时传 `permissions:{<id>:profile}` 与 `default_permissions:<id>`。这些值作为 argv/RPC 传输，不经过 shell，不改 HOME/CODEX_HOME 或磁盘全局配置。
6. thread/start 和每次 turn/start 都传 `permissions:<id>`，不再混传 sandbox/sandboxPolicy。每个新 root/fresh 的 response 必须回显匹配 activePermissionProfile.id 且 extends为空；model/provider/effort/approval继续核验，实际安全响应要求 readOnly 且 networkAccess=false。该粗粒度安全响应只是附加防降级检查，不能证明文件读取集合。
7. 有 proof 时 initialize.userAgent 须与 proof.codex_user_agent完全相同，并从 codex_cli_rs/<version> 或 codex/<version> 提取版本，与 proof.codex_version比较。新格式/缺失/错版本失败关闭，原始 initialize 与 thread响应保留。
8. 配置了 profile 而 effective_probe=null：仅已登记 stage=probe 可派发取证；报告保留 NATIVE_BOUNDARY_UNVERIFIED、实际响应/工具/失败/用量，最终 INVALID_RUN，不成为正式就绪。development/hidden在派发前拒绝。
9. 有合格 proof 与匹配实际身份的根线程原生命令，不再因 UNKNOWN_NATIVE_READ_SCOPE 自动污染；仍保留该限制和 actual_read_scope=UNKNOWN，不生成访问账/消费字节/Context收益结论。报告状态 BOUND_TO_ACCEPTED_PROBE 仅说明绑定，不是 driver 自评行为 PASS。
10. imageView/MCP不能继承命令证明；MCP hint缺失/非true的既有 fatal规则保留。网络、fileChange/imageGeneration等限制保留。未取得自身有效profile身份的子Agent命令仍严格未知；子进程继承证据不自动证明另一个原生thread。未关闭原生shell或增加全局MCP/hooks禁用设置；已有 apps/web限制保持。
11. 原始命令 exitCode/错误、case工具失败、family/预算/中断/清理记录不删除。COMPLETED仍只是传输/协议终止状态，语义质量与必要控制由外部判定。

## effective_probe 的可消费记录格式

补充5固定了外层 `{path,sha256}` 和必须绑定的语义；本实现将其落实为以下JSON字段供协调者生成真实证据时使用。这些是机械消费要求，不是新增签名/身份服务；当前仅有fake fixture，没有worker签发的真实批准记录。

| 字段 | driver检查 |
| --- | --- |
| schema_version / kind | `1` / `u007-app-server-native-command-boundary`；P02的 native-cli kind 不接受 |
| status / issued_by | `ACCEPTED` / `root-coordinator` |
| j_review | `decision:ACCEPTED`，`evidence:{path,sha256}` 指向已存在且hash匹配的J证据 |
| driver_sha256 | 等于当前 release 的实际 driver binding |
| codex_version / codex_user_agent | 非空，派发后与initialize实际版本/完整UA核对 |
| condition_root / profile / runtime_read_roots | profile结构与当前一致；仅允许将旧独占condition目录映射为当前condition.root；不增加额外读根，拒绝宽泛旧condition根；runtime根列表等值 |
| active_permission_profile | id与本次profile_id一致，extends空 |
| effective_config | 严格等于 `{default_permissions:id,permissions:{[id]:proof.profile}}`；这是被接受的探针配置记录，不冒充本次live config/read |
| checks | 唯一id、passed=true、非空command、整数exit_code、`evidence:{path,sha256}`；至少 app_server_command、allowed_read、outside_read_denied、symlink_escape_denied、write_denied、child_inherits_denial 六项 |
| unmeasured | 非空字符串数组，保留未测表面 |

所有证据引用必须是规范绝对普通文件、非symlink、原字节hash匹配；派发前复核。proof/J/check原始文件均复制到run证据目录，并在 result.native_command_permissions.evidence 中记录原路径、副本和摘要。证据的内容真实性由主协调/J负责，driver不从一个本地 ACCEPTED 字符串推导密码学身份。

process参数、thread config、请求RPC和响应都留下原始证据。实际activePermissionProfile只给id/extends，不能把它等同于完整策略回显。正式运行的边界依据是**同driver/版本/配置结构的真实app-server证明 + 当前请求及实际身份匹配**；没有真实证明就只准已登记probe取证。旧sandbox_mode/配置层的真实冲突仍须在app-server探针验证；driver不写全局配置消除冲突，也不伪造其生效结果。

## 实际验证与命令证据

命令工作目录均为71f8。

| 命令 | 实际输出/退出 |
| --- | --- |
| `node --check scripts/tri-system-eval/driver.mjs` | 392cb2，exit0 |
| `node --test scripts/tri-system-eval/driver.test.mjs` 首轮 | b7d7be + 991c0e，exit0，33/33，10356.2765ms |
| 同命令，补路径漂移与保护 | 7481a6 + 17da4b，exit0，34/34，10502.471083ms |
| 同命令，最终代码 | 26ebb8 + 3b93e8，exit0，34/34，10504.948833ms；fail/cancelled/skipped均0 |
| `git rev-parse HEAD` 和任务/补充hash | 4c7f6f，exit0；HEAD/输入摘要如上 |
| 两代码文件SHA与 `git status --short` | cb63b1，exit0；仅原有自有 `?? scripts/tri-system-eval/` |

新增测试覆盖：已接受fake proof+合法command完成而实际读取UNKNOWN；process/thread配置一致；thread/turn无互斥旧字段；无proof正式拒绝、注册probe保留未验证；登记对象不等拒绝；extends/write/root/network额外键、路径逃逸/不规范/不存在/symlink/集合不等拒绝；proof类型/J/driver/config/检查/文件hash错误拒绝；缺失或错profile/extends/版本/unsafe响应拒绝；MCP/image不继承、真实错误不丢；同结构目录替换、fresh一致；精确运行时目录允许、派发前symlink漂移拒绝。

既有26项测试继续覆盖无profile兼容、绝对deadline、计数、native family注册/fresh/子线程失败、登记hash、进程组清理等。没有跑全框架测试或真实三模块integration；该联测由Context owner读取这些稳定文件进行，不能用本报告冒充其结果。

## 未测范围与交接

- 本轮真实模型/真实thread/turn/hook/MCP/网络/探针均0；fake proof和fake J文本只在临时fixture经注入Node fake-server使用，不构成live许可。CLI唯一测试仍是BUILD_ONLY派发前拒绝。
- P01失败/P02命令沙箱成功维持原有限结论；本代码不会接受P02文件作为app-server effective proof。没有改共享行为池计数。
- app-server实际命名profile生效、全局/项目层冲突、hooks、MCP/Apps、子Agent命令profile、minimal实际可读范围、读取字节消费均未取得本owner实证。不得因此给出对应机制替换建议。
- Runtime只读路径是协调者已核实依赖声明；driver验证规范路径、范围及proof等值，不扫描或自行发现用户机器全部依赖。routing owner继续负责材料闭包。
- 本次只读本机冻结schema（InitializeResponse、ThreadStartResponse/SandboxPolicy、ConfigReadParams/Response）；没有执行config/read、没有读取真实私有config。schema阅读不等于宿主行为验证。
- 当前无活动子Agent；恢复读集为W19 task、补充5、本报告、driver/test；复核命令 `node --test scripts/tri-system-eval/driver.test.mjs`。
- 本次准备调用在45分钟/90底层动作预算内；工具时间检查1790966979.4601212至1790967370.785714约6.5分钟（不含前几次读卡）；可观察token计量 UNKNOWN。未加预算。

<!-- FILE_END: u007-orchestration-native-permissions-report.md -->
