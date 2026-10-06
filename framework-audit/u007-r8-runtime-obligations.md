# W32：适用运行能力与缺证边界

本表依据共同实施合同、补充10、J11、冻结公开 D01—D06；不读取 private，不增加 runner、协议、验收项目或运行额度。它分配现有必要用途的证据取得时点，不授予任何行为 run。框架仍是一份；优先校准 Codex 桌面/CLI，只有会改变共同用途判断时才核 Claude 必要控制，API 单列能力面。

## 来源身份

- `u007-implementation-contract.md` SHA256 `74c43c98dd2fc88df66c84d660c0f044deae35d7223e9a6c17b05ace22ec04a6`，§2、§3、§5。
- `u004-cases/public/developer-cases.json` SHA256 `8b0d8fd82591ce7f479c17f283a686af109452436c2e61e3a39c7e27d845953c`，仅公共 request、授权、事件、driver_protocol、failure_recovery_script、independent_controls。
- `u007-p07-replay-fixture.json` SHA256 `58242ba647aeac8a49d565dfbaf7fd032e491200794a680d8ec468cb4ae7115c`。原始字符串只作数据。
- 共同 R7：`u007-root-integration-r7.json`。既有 W29 离线 35/35 证据见 `u007-native-recovery-integration-report.md`。本轮同一测试字节的 RED/GREEN 身份与日志由 `u007-r8-integration-report.md` 指向，不能把作者测试当独立或原生验证。

## 公共需求覆盖

| 案例 | 已冻结的相关用途 | 对运行证据的要求 |
|---|---|---|
| D01 | 简单有界任务、同名不同稳定 ID、外部指令是数据、允许继续 | 普通读/计算/受控写能完成；不强制委派或额外流程；无外部效果或永久记忆 |
| D02 | synthetic registry 小改及 smoke、owner 标准、精确证据 | 能消费真实输入、产出可检验工件；不能将 fixture 成功宣称生产改动成功 |
| D03 | standalone state-contract、独立可分任务、本地能力限制 | 所选 owner 可读可消费，支持本地可用交付；不得冒充外部导出；协作仅在原生实际可用且有益时采用 |
| D04 | 用户所选设计→review、既定设计、组件/焦点/文案完整交付 | 阶段消费者使用当前上游工件；旧参考不能改授权或已定设计；不重构技能内部方法 |
| D05 | 工程依赖失败、唯一合法 retry、成功后整合 | 失败/exit2/不完整工件保留，未成功结果不可被消费；一次 token retry 后成功仍保留旧失败 |
| D06 | 指定 checkpoint、fresh、最新更正、hash 漂移、人类决定 | 保留合法文件和账本；更正覆盖旧政策；用接受的 v2 字节；只由 E3 决定依赖动作；不重复已完成工作 |

六案的 additional_agents 均为原生能力可用时可选、不得增权。D05 fixture dependency 是共同事件，不是原生子 Agent。D06 是 fresh，不是真实 compact。所有案例禁止网络、外部效果、生产写、永久记忆；“副作用连续性”在本批首先指已授权本地工件与写入账，不能为取证而创造真实外部副作用。

## 现有能力、缺证与最小取得方式

| 必要用途与来源 | 当前实现 / 已有离线证据 | 所缺真实事件 | 最小验证与时点 |
|---|---|---|---|
| 普通原生任务边界；六案 USE-01/02/10/11，合同§2/3 | 相同原生基本说明与工具前提；四 case 工具、阶段与 allowlist；原生 profile 绑定；missing proof 拒绝。W29 B/T/S/I、路径/未来材料拒绝、EACCES、缺 proof 测试 | 工具/owner 实际可见和被消费、原生读/计算可执行、越界及写拒绝、权限确实生效。P07 只证明 Python 执行到失败，不证明八项通过 | **U007 必需，正式比较释放前**：在同一已绑定入口取得规定允许/拒绝证据及预算内协议终态；复用既有检查，失败逐项保留。root 选择可验证入口并按现有门授权，不自行开 P08 |
| 内层操作身份、结果与计数；合同driver预算/日志，J11 | 可见 item/callback 去重；hook 未映射则总数 null；累计 token 替换。W32 P07 wrapper exit1、重复、伪造、外来/过期身份回放 | 真实内层 call/result/thread/turn 的可信对应，wrapper 与内层重复投影关系，未观察操作覆盖率 | **U007 必需**：用可核的原生事件/既有日志建立同一操作对应，核完整性与停止；JSON 文本只报称结果。无法证明时维持 UNKNOWN/formal=false，不能以解析字段放行 |
| native child 身份；合同driver、D03/04/05 USE-05/11 | driver 接收 thread_spawn 父链，再由 runtime registerThread；陌生父、重绑定、退休代拒绝；W29 child/fresh 集成及 protocol family 测试 | 真正 child 的父链、实际模型/effort、任务归属及可用能力；fake child 不是原生身份 | **U007 在使用/主张协作前必需**：既有获准有限任务中识别一个真 child、父关联和实际配置。不可用时可如实顺序完成，但不得删除 T 的可用协作能力，或声称比较了协作收益 |
| child 权限继承；六案 scope、合同§3 | registered child 共用当前 case 外层边界，root-only 控制拒绝；配置及单测不证明 OS 继承 | child 原生读取/写入/网络/外部效果边界与父相同；实际拒绝收据 | **U007 对采用的协作路径必需**：复用父级必要允许/拒绝检查到一个实际 child，核事件身份与拒绝；不新建全端矩阵 |
| child 资源；合同父子合计/绝对截止 | 按 thread 记录 usage，累计值不逐事件相加；共享 wall/tool/token 限额，缺失未知。W29 合成子事件/终态；W32累计61934 | 原生 child usage 和工具成本完整归属，父子重复投影可辨；未知费用不能填0 | **U007 对采用的协作路径必需**：同一实际父子链核一次累计用量与整链预算；实际效益数值和案例质量由 **U008** 比较取得 |
| child 返回与失败；D03/04/05 USE-05/06/07/08 | 工具回执与终态记录；D05 token/retry 成功后原失败仍存；W29 dependency 集成 | 原生 child 的真实返回、完成/失败/工件身份与父消费次序；fixture result 不替代它 | **U007** 核入口能保存归属、非零/缺产物及真实终态；**U008** 在适用案例核父是否只消费成功且当前的结果，不要求所有案例都派 child |
| 整链停止；合同driver、J11 | interrupt 响应与终态分别确认；fresh 先停旧 root/child；清理与未完 turns 留证。W29 stop-before-fresh；W32 driver 真发 interrupt | 所采用原生父子/命令路径能停止可执行动作；P07 已观察后代无残留不能证明未观察后代不存在 | **U007 必需**：针对实际采用链确认终态和已观察后代清理，保留未确认者；**U012** 生产迁移失败/回退时验证实际执行链，不提前做全生产回退 |
| fresh 状态连续；D06 USE-05/06/08/09、合同resume | checkpoint path+hash、保留同一runtime/文件/历史；退休旧 family、确认终态后新 root；W29两种启动路径通过 | 实际新 thread 接收合法恢复包并能消费 checkpoint；旧执行者不再动作 | **U007 在D06比较前必需**：同一入口通过既定fresh流程、核前后thread/终态/包和工件身份；**U008** 检验候选实际恢复质量。真实compact未发生仍未知，不新增门 |
| 最新更正与漂移；D06 E1/E2/E3，USE-09/10/13 | 有序阶段事件/ACK，当前授权公开，future隐藏；case检查hash/版本；既有protocol恢复测试和W29fresh保留事件 | 模型实际使用新政策/接受的v2、忽略漂移副本，等待真实选择；可见不等于采纳 | **U007** 证明按时送达与边界机制；**U008** 用原D06独立评分核采纳，不把语义评分提前作为建设开工门；**U012** 实际迁移适用更正/回退取得生产证据 |
| 已完成副作用连续；D06 write_ledger_continues，USE-06/07/12 | writes含线程/字节摘要，checkpoint保存、原失败保留，fresh不重置case；W29原child写与新root写归属连续 | 真fresh后不重复已完成合法本地写、旧授权不复活；真实外部效果本批不允许 | **U007** 核本地写账与checkpoint前后连续；**U008** 检验候选重复执行/遗漏；**U012** 仅在获批迁移涉及真实副作用时核幂等/失败回退，无外部效果则N/A并说明 |

## 收口限制

本表不以“未来再测”删除正式方法资格要求，也不将全部 U008 效果评分和 U012 生产迁移回退提前变成 W30—W32 开工条件。U007 要证明可信运行与必要控制；U008 在合格入口上取得任务质量/净价值；U012 沿冻结迁移范围取得实际切换与回退证据。三者不能互相冒充。

当前整体资格仍 FAIL。wrapper 返回文本可伪造，不因输出中有 exit_code、permissions 或认证词就提升为可信遥测；原生总数和整链覆盖缺失继续 null/UNKNOWN。无新运行授权；无新配置/适配层设计；未核能力限制主张，不拆成多套框架。

<!-- FILE_END: u007-r8-runtime-obligations.md -->
