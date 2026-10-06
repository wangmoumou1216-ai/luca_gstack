# W20 Context：readiness 联测与原生发现核验

**DONE_WITH_CONCERNS。真实三模块离线联测 10/10 通过；原生 metadata 核验发现两项需要 owner 处理的差异。不能据此释放正式比较。**

共同目的仍是评估一个跨 Codex 桌面、Codex CLI、Claude Code CLI 的框架，在任务理解、组织执行、信息连续性与必要人类控制上的增量价值和成本。Codex 桌面/CLI 优先；不扩展平台分支、技能领域方法或新实验池。本报告分开离线接线、原生发现 metadata 与尚未运行的真实行为，不自评架构优越。

## 交付与稳定来源

本轮仅修改独占的 `/Users/luca/.codex/worktrees/9a9a/luca_gstack/scripts/tri-system-eval/integration.test.mjs`，新增本报告。没有修改 Context 协议、其单测、driver、conditions 或其他 owner 文件。未发现需要修复的 Context 协议真实 bug。旧 W16 报告及错误历史保留。

完整读 W20 卡、补充 5、W18/W19 任务卡及最终报告。先写独立断言，在两个 owner 报告交付且源码 hash 匹配后才运行最终全套。最终运行前后摘要一致：

| 来源 | SHA-256 |
|---|---|
| 71f8 `driver.mjs`，W19 已交付 | `f766babd64996cb3b34e3856dfe0167e22c00a38778666f8697b396f128b12f1` |
| 8812 `conditions.mjs`，W18 已交付 | `33b1a3a4813710c86f7cfd654e9988fcdaf1fd0d43cd1d32061508c3133dcac8` |
| 9a9a `case-protocol.mjs`，未改 | `ce9a1b6c40d435a34813538f27deca5468f5a9ee38f35c2a165dd0f9e84a86e8` |
| 9a9a `integration.test.mjs`，本轮交付 | `cf43047b371b8cecfa7646d3069d3807a4f86c7d912afa5a021245e82068105e` |
| U002 source manifest | `cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9` |
| 接口补充 5 | `5727306f38a0b5779d0e18c51f0ff73ab5386bf3f6c2a5ddc252946ca106ed3a` |

用独占临时目录中的三个文件链接指向上述原件，配合 Node `--preserve-symlinks` 保留真实同目录 import。未复制或改写模块，未注入 loadModules、conditions stub 或 runtime stub；createTrialRunner 仅注入 fake transport。默认不设 U007_MODULE_ROOT 时仍从测试自身同目录导入。

## 实际离线联测

工作目录 `/Users/luca/.codex/worktrees/9a9a/luca_gstack`，命令：

```sh
U007_SOURCE_MANIFEST=/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest.json U007_MODULE_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w20-modules-rra5m11v node --preserve-symlinks --test scripts/tri-system-eval/integration.test.mjs
```

工具输出 `7743c6` / `c2a87c`：**exit 0，tests 10，pass 10，fail/cancelled/skipped 0，17775.595792 ms**。源码前核验 `491e44`，后核验 `9a47dc`。

| 断言 | 结果与边界 |
|---|---|
| T/I 普通成功 | 真实生成材料、case 工具、全部 checkpoint、真实 finalize 和证据落盘；既有兼容模式保留 |
| B/S 启动材料与 case 链路 | 使用真实 U002/R 原件，核 get_memory、daily_governance、_memroot、_project、context-index、office 原字节；生成原生 office 入口存在；阶段链路完成 |
| 权限进程/thread/turn 一致 | B/S 及 Context 保护反例使用合成已登记 probe；精确断言 argv profile、thread config、thread/turn permissions 相同且不混 sandbox/sandboxPolicy |
| 未验证权限边界保持未知 | effective_probe=null，协议可完成但 driver 必须 INVALID_RUN，保留 NATIVE_BOUNDARY_UNVERIFIED 和 actual_read_scope=UNKNOWN；不是正式就绪 |
| 证据与未来材料保护 | conditionRoot 是唯一任务读根，caseRoot 在其内，case-engine、原 case JSON、source manifest 在其外；真实 case_read 拒绝证据文件和未来材料，未来材料在释放前不存在、到阶段后可读 |
| 合法形状命令 observation | 仅模拟 commandExecution 事件，不执行命令；UNKNOWN_NATIVE_READ_SCOPE 保留，无 proof 时不能取得正式完成资格 |
| 无 proof 正式拒绝 | development 在派发前抛 NATIVE_EFFECTIVE_PROOF_REQUIRED，fake transport 未启动 |
| 证据父级授权拒绝 | 已登记合成 probe 试图把 run 父目录加入 filesystem，报 NATIVE_FILESYSTEM_MISMATCH，fake transport 未启动 |
| 失败后 retry | 原失败、拒绝历史和后续合法重试全部保留 |
| child/fresh 回归 | 真实登记 child，可读写但不能控制阶段；fresh 等旧根及子 turn 实际模拟终态，新根续接并保留旧失败、checkpoint 与身份 |

B/S 联测中的 startup 是文件可达与字节检查；本 owner 没有执行 get_memory 或治理代码。W18 报告的只读 startup 成功属于 W18 自己的证据，不冒充本联测结果。B/S 共用新条件实现，T/I 没有 B 根注入。

所有 fake registration 明确使用 OFFLINE-FIXTURE-NOT-A-LIVE-RELEASE，仅存在于临时 fixture；没有写 ACCEPTED effective proof 或 J 批准记录。测试通过意味着拒绝/未知行为符合断言，不意味着这些合成 probe 获得正式释放。临时 run 证据按测试清理，TAP 保存在本聊天工具输出。

### 分步验证与错误历史

1. 不依赖 W18/W19 的原始 Context 反例：`4208e5`，1 pass，exit 0。使用当时 f351 driver `0dccdb661a73cab30dd3d082d8700451f2e46711708527f5994c3186b24316d3`、旧 conditions `0337ed8b1d78805de5b2a3658623de00db87cd5c29aac29a3aa760c1dec63dc4`。不是新代码最终 PASS。
2. W19 冻结后、新 W18 报告尚未到达时的权限定向验证：`4858e6`，3 pass，exit 0；明确未作为最终联测结论。
3. 两报告冻结后完整联测：上述 10/10。没有把运行中文件结果当最终通过。
4. 下节实际 UA 的最小解析反例：`b14115`，**exit 1**，保留真实断言失败；未修改 driver 来掩盖。

## 原生 metadata 观察

仅使用本机 app-server initialize/initialized/skills/list；无 thread、turn、模型或 hook 执行。skills/list 按实际本机 schema 使用 cwds 与 forceReload=true。只保存 name/path/scope/enabled/pluginId/errors，不读取清单外技能正文、不安装/启用技能、不改 trust。`debug prompt-input` 仅读 help，未运行渲染入口。没有删除全局技能。

| cwd | repo 记录 | repo 名称 | 重复名称 | user | system | errors |
|---|---:|---:|---:|---:|---:|---|
| 当前生产 R `/Users/luca/Desktop/luca_gstack` | 49 | 48 | 1 | 69 | 5 | [] |
| 新 B 隔离材料 | 95 | 48 | 47 | 69 | 5 | [] |
| 新 S 隔离材料 | 95 | 48 | 47 | 69 | 5 | [] |
| T 隔离材料 | 0 | 0 | 0 | 69 | 5 | [] |
| I 隔离材料 | 0 | 0 | 0 | 69 | 5 | [] |

所有返回记录 enabled=true。五处 74 个全局/系统记录按上述保存字段逐项完全一致；它们是共同能力，不能计为框架特有收益。当前 R metadata 只绑定本次观测时点，不能回填 U002 时点或桌面其他入口。

### 发现 1：B/S 技能列表出现重复入口（归属 conditions owner）

B/S 的 48 个冻结 owner 名称均可被发现；但 `office` 之外的 47 个名称各被发现两次。最小例：

```text
B/.agents/skills/auto/SKILL.md
B/.agents/skills/office/auto/SKILL.md
```

这两份生成材料由 sourceBindings 证实 copySha256 相同。其余 46 对也逐一核对相同。源 R 的 auto 仅一条；R 唯一同名重复为两个不同来源的 magicpath。B/S 的 magicpath 两条则都是冻结 owner 的副本，不复现 R 的外部 MagicPath 身份。

因此 native 发现不是“缺少全部仓库技能”，而是**入口数量/身份与 R 不等价**。这已是实测 metadata 差异，不是仅凭目录推测。重复对 prompt 长度、选择歧义和真实任务表现的影响尚未测量；不能称为更多能力或已经证明收益。没有代改 conditions，交给原 owner/协调者裁定；本报告不自行释放整体基线。

### 发现 2：driver 的版本解析不匹配实际 initialize UA（归属 driver owner）

按 driver 完全相同的 initialize clientInfo `{name:tri_system_eval,version:1}` 单独读取原生返回，得到：

```text
tri_system_eval/0.160.0 (Mac OS 26.7.0; arm64) dumb (tri_system_eval; 1)
```

同机 `codex --version` 为 `codex-cli 0.160.0`。冻结 driver 第 522 行使用：

```js
const version = initialized.userAgent?.match(/(?:codex_cli_rs|codex)\/(\S+)/)?.[1];
```

对真实 UA 的解析结果为 undefined。最小反例只将已保存 UA 输入此表达式并断言等于 `0.160.0`；`b14115` 以 `ERR_ASSERTION`/exit 1 失败，堆栈 `[eval1]:7:8`。按第 523–524 行条件，即便 proof 的完整 UA 字段与实际值一致、版本填实际值，也会落入 `NATIVE_CODEX_VERSION_MISMATCH`。这是实际 metadata 加代码分支推出的确定性不匹配；没有运行真实 proof/thread/turn，也不伪造 J 接受。

当前 10 项联测使用 null effective_probe，故不会覆盖此有效 proof 分支，二者结果不矛盾。需要 driver owner 修正解析并保留完整 UA/版本绑定，再回归有效 proof 分支；本 owner 没有改其文件。

## 精确材料与 metadata 证据

保留在 OS 临时证据根 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w20-discovery-stgjaF/`，供协调者接收；本轮未删除。该位置是临时留证，不宣称永久归档。

| 证据 | SHA-256 |
|---|---|
| `skills-r-t-i.json`，精确 cwd/返回路径/可见性/错误 | `ed3e262497f1724b8eab05eb4a1d4325e40bb6fefd1448c1cbd302b9e05d74da` |
| `skills-b-s.json`，精确 cwd/返回路径/可见性/错误 | `b6a953ae10fa622f5c93aee13fb889138c4fd4eddabea37df389c44d6baa6d1e` |
| `driver-client-initialize.json`，原请求/响应/CLI版本 | `8591c617b0d27e599840ff29306494179e1afdfcc1aeb705dacf70043cf01c00` |
| SkillsListParams 本机 schema | `1d245374e64c5acc9739dfc68a4fe5114c6c9147af04c480886f1846d2ca6239` |
| SkillsListResponse 本机 schema | `230f125d6c36ec1b1514018a0bb6d0627f7308ea82f1ef04cad85490de482bae` |

schema 位于 `/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w20-schema-5c63pb_e/v2/`，来自 `codex app-server generate-json-schema --experimental`。完整材料摘要在同一 discovery 根的 `materials.json`、`bs-materials.json`；B=`acad2f94ec315f425ba45a84b31831ee24e1e43f2f4af2d0bdcf7db0b018509c`，S=`6e703d946ea454f91b4298d4419177dfe5601f4c38cf42c4345664e4096006ed`，各 658 allowedReadPaths，与 W18 一致。

## 给 J 的已核事实输入

- 已核：稳定三个实际模块接线 10/10；权限配置精确传递、无 proof 的拒绝/未知状态、证据/未来材料的 case 工具保护、历史回归。
- 已核：新 B/S 材料 hash 与 W18 一致，native skills/list 看见全部 48 个 owner 名称，同时产生 47 组重复入口；全局 74 个记录未被删除或改造。
- 已核：实际 initialize UA 与 driver 版本解析不相容，最小反例失败。有效 proof 分支尚需原 owner 处理；不签发本机就绪。
- 未核：named permission 在真实 app-server 命令中的硬边界、`:minimal` 范围、MCP/Apps/网络、原生子 Agent 继承、模型实际采用/读取字节、收益/成本与必要控制整体评级。
- 本次不重测 hooks，不改变补充 5 中项目 hooks 停用事实，不将其开启为理想 B；也不以材料/技能 metadata 冒充原生控制生效。
- 正式公开六题、hidden、模型与行为探针均未运行。本轮原生请求仅 metadata，不占模型行为 PASS。COMPLETED、RECORDED、技能 enabled 均不等于语义质量或净收益。

## 资源和交接边界

本轮准备调用 1 次。开始于 2026-10-02 18:49:22 UTC，最终验证及反例完成于约 19:05 UTC，报告收尾仍在 45 分钟内。可见工具动作约 60 次，内嵌原生 initialize/skills/list 请求共 7 次另列，保守合计低于 90；文件 syscall 不冒充工具动作。完整 observable token、货币成本无可靠计量，UNKNOWN。模拟遥测 token 不是本轮模型消耗。

真实模型/正式 run/hidden/额外 Agent/会话消息/网络研究/全局配置写/安装/commit/push 均为 0。四次短生命周期 app-server 只读 metadata 进程已终止。没有对其他 owner 做代修，也没有把两项已发现差异悄悄删去。整体就绪判断与后续修复分发由协调者/J负责。

<!-- FILE_END: u007-context-readiness-integration-report.md -->
