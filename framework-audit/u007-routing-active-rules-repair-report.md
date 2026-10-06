# W24：B/S active-rule 材料闭包实际修复

**DONE_WITH_CONCERNS，仅本任务卡。** 已补齐并冻结原始loader与完整规则文件，源/B/S的21组只读输入（63次loader执行）stdout、stderr、exit全部一致。office的5条active规则、场景过滤、无规则结果以及retired/superseded排除均实际验证。本模块20项离线测试通过。真实模型sandbox、其余完整闭包、比较与整个模块/项目终验仍未通过，本报告不释放P06或正式运行。

## 授权、输入与保护

本轮是W21结束后的新实际turn，工作第24次；当前实际turn ID未由可用工具提供，记UNKNOWN，由root账本解析，不能并入W21。按任务卡（SHA f53c9b730bd9ce2cdafc8586f39926bdde039cd238d1d98c1be1d1d3a1d1a8ee）及补充7（a165d7b60bb5fc97fd39b7456e539b0bdc515d58d0c74793bd96c118eca9fb89）授权执行，无需新增启动批准。完整读了任务卡、补充7、J06实际票（d20008271935c375bd9a5d15afaa91c3267faffc1050a464648e95bb3ce807be）、gap记录（8bd60c90c63ff38759df97cfe64b723dd57ee741bcc9c093b271482dbad5f7b8）及R4记录（0d3da9db81b058eb7ab74094a3bd00b4aaf71553b6f96e9b4eed1f5e7bf767a1）。既有未变合同/方法owner复用。

先核本地conditions代码1406739d…、test c9a95ac…均等于W21/R4交付，备份后才编辑。未覆盖root f351或其他owner修改；交付前核root两文件仍为R4原hash。旧U002、R4、J05/J06、W21及全部失败保留。没有改生产规则/脚本、global配置、framework/、项目/docs alias、driver/protocol/integration，没有安装依赖、联网、模型、探针、Agent、提交/推送。

本轮备份/原始日志/复跑工具根：
`/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-w24-active-rules-99bg5mty`
其中 `conditions.mjs`、`conditions.test.mjs` 是R4前像备份，hash分别为1406739d77c6025cac9b7efc1cd4621d0c1a3ed51a456273df26f7f3db1c88a3、c9a95ac014676c7ea50121a5e59e446a845ce448474b45d2ebc6f0fcd48a8775；不是当前交付。

## 当前交付及最小修改

| 文件 | bytes | SHA256 |
|---|---:|---|
| conditions.mjs | 24895 | 216d21cdb7d52b57914c8cdefa2a338f7ed62fe721546f61225ea10698be84bc |
| conditions.test.mjs | 22755 | 4decae0bac8a40d87cde6d67457cbdac0f55b89bfa1febac31d8ed7832258920 |

绝对路径位于 `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/`，只改这两份代码。

- 用精确二项 `ACTIVE_RULE_MATERIALS` 纳入B/S必需材料，保持原文件bytes/hash、状态和顺序，不通配复制observability。
- `rules.yaml`加入已有allowedReadPaths，和其它规则文档一样可被读取；loader .py沿用runtime helper的边界，不进入case_read文档白名单。复制文件不授予执行或外部效果权限。
- 移除已过时的“loader未提供”声明，保留Python/PyYAML及真实sandbox采纳未证的限制。
- 缺其中任一项在生成目录前以MISSING_BASELINE拒绝。原U002配新构造器实际拒绝且无输出目录；root后续须明确绑定新manifest，不能让新代码静默继续使用旧清单。
- 测试增加真实loader在合成规则上的输出/错误/退出/过滤一致性，要求active、retired、superseded和scene过滤不变；缺PyYAML的fail-open警告不能冒充无规则PASS。缺项反例、目录去重、字节身份、拒绝链接/越界/漂移及不复制observability历史均回归通过。

## 新manifest及来源身份

新文件：`/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest-active-rules-v1.json`
SHA256：53cf8e61a3a1e0232ed3a3f638dc5698651fa0dad5d39f62629573ffc294f136。

原文件保持不变：`/Users/luca/Desktop/luca_gstack/framework-audit/u002-source-manifest.json`，SHA cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9。全部原541条tracked_sources按原序逐项相等；仅末尾追加2条，合计543条。现有selection.exact追加相同2路径，captured_at更新为本次冻结时间；其它元数据/结构保持不变，无新schema层。版本补充关系在本报告记录，未改原master release。

| 新增源路径 | bytes | SHA256 |
|---|---:|---|
| .claude/observability/scripts/get_rules.py | 2195 | db87c92b97f6945c54846297eba5e57d0e373eb5c3237ec4b9fc1a37e5a3d020 |
| .claude/observability/rules.yaml | 9407 | 98ff8956517f1bb9f1d6f093674ba68276f1c5ba9dd26e6310cb18b25359fbc2 |

两文件均完整读取；本轮以只读 `git show 05120197073144c0f46b6fb30a192733d529cc4f:<path>` 比较实际源bytes，均与同一提交完全相同。没有沿source_observations ID读取历史，没有筛减不利规则。规则文件共20条，16 active、3 retired、1 superseded；原20条全部复制。

## RED → GREEN原始行为

**实际R4缺口，工具10593e。** 同一宿主执行以下形式，参数相同且不加 `|| true`：
```sh
python3 -B <root>/.claude/observability/scripts/get_rules.py office '*'
```
源root `/Users/luca/Desktop/luca_gstack`：exit 0、stderr空、stdout列出5条office规则。原R4副本root为本轮临时目录内r4-B/r4-S：各exit 2、stdout空、stderr为Python `can't open file ... [Errno 2]`。全部原始命令、cwd、stdout、stderr、exit在red-source-vs-r4.json。真实office前导的 `2>/dev/null || true` 会丢弃stderr并把命令状态变成成功，故不能以“未见规则输出”推断源规则为空。

**测试RED，工具7af471。** 先改测试，再运行：
```sh
node --test --test-name-pattern='W24|B/S copy the same required closure' scripts/tri-system-eval/conditions.test.mjs
```
3项全部失败，子进程exit 1：新输入未复制ENOENT、缺必需项仍未拒绝、源loader输出与副本缺文件exit2不一致。外层取证Python因成功捕获预期RED而exit0，二者未混淆。原始TAP/stdout/stderr在red-tests.json。

**测试GREEN，工具7645be。** 修复后：
```sh
node --test scripts/tri-system-eval/conditions.test.mjs
```
exit 0，20 pass、0 fail，1269.684541ms；只跑本条件模块，未重跑无变化的其他owner。包括5组×源/B/S的真实loader合成夹具行为及无参数usage错误exit2。原始TAP/stdout/stderr在green-tests.json。

**真实冻结规则GREEN，工具2d84c6。**
```sh
python3 -B /var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-w24-active-rules-99bg5mty/compare-rules.py
```
exit 0。21组输入×源/B/S=63个loader子进程；每组的stdout、stderr、exit逐字相等，不只比较文件hash或规则条数。正常20组exit0且stderr空，无参数组exit2且stderr为相同usage。完整原始命令输出在green-rule-comparison.json，判定/ID/不变性在comparison-summary.json。

| 查询 | 实际结果（三处一致） |
|---|---|
| office '*' | 5条：R-20260522-001、R-20260523-001、R-20260820-001、R-20260824-001、R-20260923-003 |
| html-prototype '*' / B | 按源序2条：R-20260826-001、R-20260905-001 |
| html-prototype A | 仅R-20260905-001 |
| code-recon A / B | A无；B仅R-20260826-001 |
| code-hygiene '*' | 4条：R-20260920-001/002/003、R-20260923-002 |
| careful '*' | `Applicable rules for careful: none` |
| '*' '*' | 全部16条active，保持YAML原序；3 retired及1 superseded均不输出 |
| 无参数 | stdout空、usage在stderr、exit2 |

规则/脚本源与副本的前后hash一致，执行使用 `-B` 防止Python字节码写入。最终又逐条核B/S全部sourceBindings并重算完整材料hash，和执行前相同，不仅核二项新文件。

## 公开案例与影响边界

仅读取当前公开 `framework-audit/u004-cases/public/developer-cases.json`，未读取隐藏资料。六个案例的request和input/owner-method.json单独投影，原文件SHA及实际测试名字在public-case-owner-projection.json。它们没有传入显式scene，因此对该组执行loader时省略scene参数，保留源的默认语义，不推断A/B/C/D。

| 公开case | 实测字面owner/请求标签（scene省略） |
|---|---|
| D01 | bounded-record-method |
| D02 | registry-contract |
| D03 | state-contract |
| D04 | flow-design, review |
| D05 | transform-validate-integrate |
| D06 | requirements_normalize, flow_design, handoff_check, requirements, flow-design, handoff |

上表11个去重后的名字实际规则输出均为none、stderr空、exit0；这些是公开材料中的方法名/工作流标签，不能由此声称它们均是仓库注册skill，亦没有把它们替换成同义框架skill。D01/D02只有method_id，没有显式skill。D03—D06的字面方法过滤也不代表真实模型最终选择/执行路径已观察。

该修复服务于入口路由所需的规则context提供、及实际进入office/skill核心逻辑的用途；以实际轨迹决定是否适用，不能强称每个公开案例都会加载这5条office规则。也不能将case方法本身查不到规则推导成B/S可以省略通用office路径。规则重叠其它owner文本不等于原加载行为等价。

## 材料身份、T/I与现存依赖

| 条件 | 当前material SHA256 |
|---|---|
| B | acf61801365cd7de843680265be893ee32b9a8c923e037af8d47f7998e8a9f9a |
| S | a98b6e6e1fa7840921f463029ee7227dac059f12500514ff53a099f34d812077 |
| T | 66bee6476856dc260e2425e8b4785522db699e066d49fa8fd6d3f7ffba77d2e5 |
| I | ee9c612cb8231cd02fdec25b958cc5d95d96458aeb63d75e9734bda89a75b0a8 |

B/S各由684→686条复制绑定，新增恰好上表二文件；原有684条路径和copySha逐条相同，包括S已有三处root patch。每条件48个native SKILL入口、无重复源，18处实际字面相对文件引用仍存在。没有复制observability其它文件。生成目录为green-B/green-S，原R4复制件保留r4-B/r4-S。

T/I仍各只有AGENTS.md，使用R4函数和新函数实构比较，材料hash相同；不读取baseline manifest、不增加框架规则、机制或公共任务事实。二项规则属于B/S框架机制的缺漏补齐，不能顺便注入T/I。

直接依赖来自已完整读取脚本：sys、pathlib（stdlib）与PyYAML；只读数据唯一是通过脚本自身位置解析的rules.yaml。三个cwd分别执行相同依赖身份命令，stdout逐字一致：
- Python 3.14.5；真实可执行文件 `/opt/homebrew/Cellar/python@3.14/3.14.5/Frameworks/Python.framework/Versions/3.14/bin/python3.14`，SHA 2477b47fa3ae65b9574eb18a15edb364e96948eaa1875ad3f1c80d780efc9c12。
- PyYAML 6.0.3；`/Users/luca/Library/Python/3.14/lib/python/site-packages/yaml/__init__.py`，SHA b19dfcc333d6a75dfd73073901164507252f271b41d3b5f7d85510033a0547a7。
- pathlib入口SHA 042a4d0a5e1ef66778daa86dc269af205bd42d06e793e53d8b99dff4c45928ca；sys为builtin。详细路径/命令/退出见dependency-identity.json。这是解释器及模块入口身份，不声称已完整hash全部PyYAML包文件。

**仍未知：** 真实模型sandbox对该Python及用户site-packages路径可读/可执行性、实际规则加载/消费、其余skill/workflow/project路径完整闭包、真实命令隔离及协作/恢复、净收益。没有安装或复制PyYAML、没有放宽profile/global trust，宿主成功不能替代这些证据。其他历史缺口仍保留。

## 证据清单与后续

以下文件均位于本轮临时证据根，除报告/新manifest/两份代码外未另写持久交付：

| 文件 | SHA256 |
|---|---|
| red-source-vs-r4.json | 096a05c532ab96117478c1f3d6f5f589467d73f09fc8bcf9e3d69a66a2023374 |
| red-tests.json | d0d430b69d13faefc83c233bc986155b64dbf7099237b5dbec704b441e071e30 |
| green-tests.json | 17b68375155427117b565694c40a9a1982638e8c36f4037d9a772ff76162b6d9 |
| green-rule-comparison.json | 5b07b9ed35c001e6634521ff337da65a57c387ca536b156476fe689056d4a2d2 |
| comparison-summary.json | 639f8da62032d1a5aa63db37f122c2af0a50783898e4cf7fdcd1c7bada649dab |
| dependency-identity.json | af331c6e6287e579b8bfce8f35a52427964b86b01cfe4dda78aaacc45e02cd9c |
| public-case-owner-projection.json | 87dea57180870799e7bd247247ea8bfdddd3862bbf789e4f1c55014f655bd6f8 |
| build-check.mjs | ebf734a0cecf6399f4726725399a8c00ba497e95f47d27ef5f7a41f4d6fca21d |
| build-check.json | 3c6f92cd954a7cca31a351baaba5f607dcfba43cbeff0942add1c8da3731645f |
| compare-rules.py | a44990f27ca8b1dc5b534affd09f5b131aa831b2054a9199424fab13ba01351e |
| final-integrity.json | 0942d9afaad2aa7e61f4712c2a36b57028f2ed04d6a092fd9dcf86c64210244f |
| conditions.mjs.diff | af5f3e93a523726404f8f834a350ab6e6072c0bc905c1a58d45475e8421ae844 |
| conditions.test.mjs.diff | 956b02b6b2f3d78725435bdfd1ecae39eda4bcb2f8609b4a31eb9ee660c39d9a |

root后续收取两文件和新manifest，重新绑定版本、跑所需跨模块回归并交非作者复核；本owner不自签独立票。本报告仅闭合active-rule离线忠实性缺口，J05/J06历史FAIL不覆盖，R4不重写，不自动释放P06、正式development/hidden或生产。原三模块最终实施、统一验收及正常commit/push职责仍未完成。

## 资源

W24第一条任务读取发生于首时钟观察之前；首观察epoch 1790973490.833581。报告生成epoch 1790974182.62657（UTC 2026-10-02T20:49:42.626570+00:00），已观察跨度 691.793 秒，不把时钟前开销说成零。工具层保守动作上界40，包含functions包装、嵌套工具、2次apply_patch、取证/报告/最终读回；批内子进程另明确披露，不称为免费：真实规则GREEN 63次loader、RED源/R4 3次loader、3次依赖身份Python；另有RED/GREEN单测内部合成loader/内存入口检查及2次只读git show。

实际模型usage/token遥测不可用，总token UNKNOWN，不伪造精确余量或金额。0新模型/探针，未占用模型行为池或P06。45分钟/90保守工具动作/120000可观察token上限未重置；24+28=52总调用和其它冻结预算保持，此新turn单独记准备第24次。所有被启动的离线子进程已返回，未留运行任务。

<!-- FILE_END: u007-routing-active-rules-repair-report.md -->
