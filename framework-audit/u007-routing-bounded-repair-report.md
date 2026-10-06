# W21 路由模块：有界修复与原生 MCP 配置证据

状态：DONE_WITH_CONCERNS（仅本任务卡交付）；不是模块全生命周期 DONE，不释放正式比较、迁移或生产。J05 FAIL、N01 原文及历史失败/成本全部保留。

## 1. 范围和计账

按 u007-routing-bounded-repair-task.md（SHA 44bab614125532e0018a841288fc78e8e21a7e18679929c8b9399ec14c68e104）及补充6（4238376c4138210fd992af1fc98447cae18e16fece78abc6aabda5f4c4e1ab9a）执行。共同合同、补充1—5、J05/envelope、R3复用本会话已完整读取的相同版本；补充6本轮完整读取。生产R、root集成工作树只读。

这是 N01 已交付并结束后收到的新实际执行回合，不能并入旧 N01 turn 免费续接。当前 turn ID：UNKNOWN（可用工具未提供当前实际 turn ID）；任务卡预期的 01a0fe29-da50-7c72-a99b-c9c99b4b6401 不冒称为本轮ID。请 root 用实际聊天记录核账。首次观察 epoch 1790971231.246204，本轮预算45分钟/90保守动作/120000可观察token，不因上下文压缩重置。

只改8812中 conditions.mjs / conditions.test.mjs；未改driver、case-protocol、集成测试或案例协议。无新Agent/聊天、真实模型、探针、网络调用、MCP工具调用、thread/start、turn/start、standalone command/exec、全局配置写入、commit/push。CLI配置列表读取不算模型/行为探针；它不证明行为边界。最后P06未使用。

## 2. 原副本保护与集成基线

先核对本地旧交付hash与R3两个hash全部一致，才备份、同步。没有覆盖陌生变更。

备份及本轮临时证据目录：
`/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-w21-routing-zjp1ta4z`

| 文件 | 备份原副本SHA256 | R3基线SHA256 | 当前交付SHA256 |
|---|---|---|---|
| conditions.mjs | 33b1a3a4813710c86f7cfd654e9988fcdaf1fd0d43cd1d32061508c3133dcac8 | 211c7d3530ccff80b589cb8f152e2f916c0a21d95c54d24755d26b5bde2cdf2f | 1406739d77c6025cac9b7efc1cd4621d0c1a3ed51a456273df26f7f3db1c88a3 |
| conditions.test.mjs | 920fa505bc96bae1c423dc651696b92710d5c3d72f8965d6df8fb1f695ef1c2d | 30e75cff9be6573f618062d0ba854379103bd8a47d5eab2b334f5174bfe5b643 | c9a95ac014676c7ea50121a5e59e446a845ce448474b45d2ebc6f0fcd48a8775 |

原文件按原名保存在上述临时目录；R3副本前缀 `r3-`。当前交付绝对路径：
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.mjs`（24464 bytes）
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.test.mjs`（19955 bytes）

保持root已完成的native技能目录去重。相对R3仅新增1行限制声明及4行对应断言，无公共字段/接口变化。
差异文件在临时目录：`conditions.mjs.diff` SHA ddf0f674a373f68fdccdb43bd0ea3be36452ca0944db4c8233873efa33af8780；`conditions.test.mjs.diff` SHA 5f7ee7318a685ca5be9bda9cdc6df03545f186327551de60fa802665044dca8f。

## 3. 入口路径与材料缺口

对冻结U002构造B/S，构造发生于R3同步后、限制声明补充前，执行输出 bd247b，exit 0。U002 SHA cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9。每个复制件684条sourceBindings，native目录48个SKILL入口，未再次启动原生skills/list或模型。

- B材料hash ae16fb3489536bdaf2a880bf1783a0c05578cb2c6808006ec39a4fe4b4c0470a。
- S材料hash 0f9044b44a7058a32e4f8fb8b38c9a5cfb738094af007d3a0817ef78f16733d8。
- 检查生成native SKILL.md中实际的 `../` 文件引用，共18次/每条件，全部目标存在；包括careful检查脚本、兄弟skill、共享references。另一个regex命中是muse-x-digest的 `.../status/<id>` URL示例，不是文件引用，明确排除，不能报材料缺陷。
- 本检查只覆盖这些字面引用及现有构造器的必需文件/import闭包，不代表所有自然语言引用、计算路径、执行依赖均闭合。
- 原始扫描结果 `entry-path-check.json` SHA f170c8a3ca4445788b886cae14dee285d0a79f22e19b98bcde25bf30c358b211；详细绑定在B.json/S.json，复制件在B/、S/。

新确认缺口：冻结office入口SKILL.md第24行的preamble调用 `python3 .claude/observability/scripts/get_rules.py office "*" 2>/dev/null || true`。U002的 `.claude/observability/` 记录为0，B/S无该脚本。这是明确缺失，非目录去重造成；失败被原入口的 `|| true` 吸收，也不等于规则已成功加载。当前材料不能重现该active-rule加载分支。真实生产有无适用规则、数量与对具体案例的影响仍UNKNOWN；没有越过U002读取或补入规则数据。

本次修正是在现有 `complexity.materialClosure.missingFrozenCapabilities` 中明确列出这个已证实的入口能力缺口。没有伪造文件、改skill方法或将B自动标为合格。材料复制/patch逻辑没有改动；以上字节hash是R3实际构造记录，未为一个声明变化重复构造整个材料集。其余已有缺口（workflow/CLAUDE根、私有绑定、项目状态等）保留。

## 4. RED/GREEN与有限回归

工作目录统一 `/Users/luca/.codex/worktrees/8812/luca_gstack`。

1. 同步R3后，`node --test --test-name-pattern='B/S copy the same required closure|an unmanifested MagicPath target' scripts/tri-system-eval/conditions.test.mjs`：exit 0，2/2通过（fe5448）。
2. RED：先增加“缺get_rules必须披露active-rule能力缺口”断言，再运行 `node --test --test-name-pattern='B/S copy the same required closure' scripts/tri-system-eval/conditions.test.mjs`：exit 1，1/1失败，ERR_ASSERTION，信息为 `the office preamble cannot load active rules from the frozen materials; disclose this gap`（cc04f8）。这证明限制披露缺失，不冒充原生规则加载行为试验。
3. GREEN：补充限制声明后，运行第1项的相同命令：exit 0，2/2通过（75cca4）。闭包相等、去重、字节保留和MagicPath越界不跟随断言仍通过。

最后将声明收窄为仅已直接证实的get_rules.py缺失，避免推断其数据位置；再运行同一2项定向检查，exit 0、2/2通过（dea1a5）。未重复完整suite或已通过的native基线测试。一次辅助rg查既有报告中的get_rules/observability无命中，exit 1（d60518），属于搜索无命中，不是测试失败。一次直接猜测InitializeParams顶层路径不存在，随后文件名检索发现v1位置；未借此启动app-server或补造schema结论。部分大段只读搜索输出被截断，未把截断内容当完整契约读取证明。

## 5. 原生MCP配置：已证明的元数据与未知

本轮仅本机只读CLI：`codex app-server --help`、`codex mcp list --help`、三个 `codex mcp list --json` 配置读取进程；未启动app-server，未调用任何MCP服务器工具。JSON原始内容仅在进程内解析，输出/落盘只保留name、enabled和命令/退出码，不保存transport、args、headers、env或凭据。

初始与最终默认列表相等（均exit 0）：

| server | 默认enabled | 限定进程override后enabled |
|---|---|---|
| code-review | false | false |
| codex_app | false | false |
| computer-use | false | false |
| context7 | true | false |
| cua_repl | true | true |
| figma | false | false |
| fxiaoke-crm | false | false |
| node_repl | true | true |
| pencil | true | false |
| shadcn | true | false |

实际限定配置命令（exit 0，727004）：
```sh
codex mcp list --json -c mcp_servers.context7.enabled=false -c mcp_servers.pencil.enabled=false -c mcp_servers.shadcn.enabled=false
```

它准确改变这3个server的enabled，未改变其余7个。这里只用三项检验配置的逐项控制能力；这不是“已裁定全部未获准外部MCP恰好只有三项”。没有对node_repl/cua_repl作外部/原生归类或权限推断，没有将此配置写入driver、候选运行或全局文件。

P05保存RPC第9—14、18—20、22—26行的startupStatus显示node_repl、context7、pencil、cua_repl、shadcn依次starting/ready（读取投影输出fcf845），和当前默认启用名单一致。P05既有动态工具/失败/token记录保持，不从启动事件推导各server token成本。

本地协议schema路径 `/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-u007-protocol-eh1f4k95`：ConfigReadParams允许cwd/includeLayers，ConfigReadResponse的Config.additionalProperties=true，ConfigLayerSource将sessionFlags描述为 `-c/--config` 会话覆盖。它不是MCP enabled字段的强类型证明。本机CLI实际接受并反映上述字段，提供比泛型schema更直接的配置元数据证据。app-server公开help也提供相同dotted-config开关；据此推断同名进程覆盖路径可供root考虑，但本轮没有读取该app-server进程的有效配置或检验其服务器启动行为。

结论：**逐服务器、仅当前CLI进程的enabled覆盖在本机配置元数据层可行**；不需要改HOME/CODEX_HOME、清空用户配置、关闭所有规则/技能或整体禁用原生工具。**“在真实候选模型进程精确禁用全部未获准外部MCP且保留所有原生能力、规则、技能”仍UNKNOWN。** 原生能力/插件归属、具体案例许可集合、内置/插件注入服务器、模型端工具可见性、真实效果隔离及成本下降均未检验。本轮没有配置或调用原生工具，因此也不能宣称已证明这些工具仍可用。root须先裁定精确server集合，再由独立审阅决定是否将配置用于后续已授权验证；不得凭元数据自批release或使用P06。

安全证据文件（在临时目录）：
- mcp-baseline-safe.json：75e6f29d1214fceff35cf04f9094e49ee644d6a94fc9816c6c5b952c322c08c6
- mcp-process-override-safe.json：e779c3e799a6740bdab0671a1bf3b948914edc7aafe4d75b5d133de062cd2012
- mcp-after-safe.json：8419c32da14f765ad92468a03ee58600c1897bcaa66f99e23e7f75c49af79791

## 6. 生命周期仍欠的工作

N01文件未修改，复核SHA仍为 e276a1ac7c82ecb1aee013e28f056622fdb31ea967e98b35922e584038ae7ef2。其证据/用途建议不因本轮声明修复升级为比较结论。

root后续按既有任务卡收取本两文件及其他owner输出、检查相同集成基线、联测并取得非作者复审。J05的权限对象缺失与INVALID传播确定缺陷由其他owner负责，本报告不替其签字。B当前入口的规则/运行依赖与真实采纳仍需资格判断；比较、价值归因、迁移、统一最终验收及正常提交推送尚未完成。未提出新公共字段、配置体系、平台分支或新实验阶段；重复AGENTS/request/inputs开销没有借机改协议。

## 7. 资源尾记

本轮首观察epoch：1790971231.246204；报告写入前epoch：1790972020.818412；已观察跨度：789.572秒（起点前未观察开销不声称为零）。保守动作上界70，包含压缩前已知调用、functions包装、嵌套工具、三次patch、报告写入及交付读回；不是精确平台计费数，低于90且不把压缩前动作扣除。所有子进程已经返回，未留运行中的Agent/app-server/模型或测试。

当前会话token计数接口不可用，实际可观察token总数UNKNOWN，不能声称为0或伪造精确预算余量；请root从实际turn账本核对。这里没有新增真实模型评估token。准备调用23/评分复核29/总52以及其他所有冻结总额保持，本新turn须单独计一次准备调用。

<!-- FILE_END: u007-routing-bounded-repair-report.md -->
