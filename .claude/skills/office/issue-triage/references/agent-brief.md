# Agent Brief — durable 行为合同

写 ready-for-agent/ready-for-human brief 前完整读取。本文件采用 source16 AGENT-BRIEF 方法；
维护者接受并真正发布的 brief 是 agent 工作合同，原 body/discussion 是有出处的上下文。
离线草稿或未经采用内容仍是 proposal；brief 的发布不授权 agent 执行、checkout、写文件或外发。

## 原则

**Durability over precision**：item 可能等待数周。描述 interfaces、types、signatures、config shape
及行为合同，让实现者重新探索。合同不以易变 file path/line number 或当前组织结构作为步骤；
真实代码路径可放“验证证据”作为当时观察，不把它们变成必须照改的指令。

**Behavioral, not procedural**：说系统该怎样表现，不指示加 switch、改第几行或固定内部实现。
如“SkillConfig 接受可选 schedule: CronExpression”，胜于“在某文件42行加字段”。
状态/错误、边界与既有用户行为都要明确；不能把代码猜测写成人类已接受需求。

**Complete independent acceptance**：每条验收能独立检查，有触发、可观察结果和必要边界。
“triage 应正常工作”无法验收；“同一个请求最终恰一 category/state，并保留非角色 labels”可检查。
验收不能只是实现步骤、空标题或引用行号；实际检查结果与未来验收分开。

**Explicit scope**：排除相邻能力、配置/权限扩张和装饰性优化，防止实现者自选需求。
Key interfaces 仅写已经证实/接受的接口约束；未知接口查证或留待答，不虚构签名。

## 必备结构

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** <一句需完成的行为>

**Current behavior:**
<真实现状；bug 的损坏行为，enhancement 的既有能力。PR 写已读 diff 的完成部分和剩余缺口。>

**Desired behavior:**
<目标行为、边界、错误处理和需要保持的行为。PR 写现有 diff 接下来应达到什么。>

**Key interfaces:**
- <稳定 type、signature、返回合同或 config shape；变化和原因>

**Acceptance criteria:**
- [ ] <独立可观察的触发/结果>
- [ ] <另一独立行为/边界>

**Out of scope:**
- <相邻但此次不做的能力/变化>

**Verification evidence:**
- <真实复现/PR检查、命令、环境、结果与代码证据；未运行及原因明确>

**Human-only work:**
<仅 ready-for-human 必填：为什么不可委托、由谁完成哪些判断/访问/测试/合并。>
```

正常 ready-for-agent 的 current/desired/key interfaces/独立 acceptance/out-of-scope 均有实质内容，
不能残留影响实现的未决问题。缺信息返回 needs-info；显式 override 缺 brief 的例外归 outcomes，
不能靠填模糊词掩盖缺口。

## Bug 示例（示例不是当前项目事实）

```markdown
## Agent Brief
**Category:** bug
**Summary:** 描述截断不再切断单词。

**Current behavior:**
超过1024字符时固定截断，可能得到“Use when the user wants to confi”。
**Desired behavior:**
在长度上限内的最后完整词边界截断并附“...”；原长度限制仍为1024。
**Key interfaces:**
- SkillMetadata.description 类型不变，提取/处理描述的行为改为尊重词边界。
**Acceptance criteria:**
- [ ] 小于1024字符的描述完全不变。
- [ ] 超长描述只在最终允许的完整词边界截断。
- [ ] 被截断的描述以“...”结束。
- [ ] 含“...”的最终总长不超过1024。
**Out of scope:**
- 改长度上限；增加多行描述支持。
```

这些验收分别可检查；生产 brief 需补实际 verify 证据并把字符/词边界细节真实澄清。

## Enhancement 示例（示例不是写入授权）

Rejected enhancement 的 concept KB 能力：current 写只关闭请求导致理由遗失；desired 写有
concept/持久原因/prior requests 的授权记录，未来请求由维护者确认概念匹配。
Key interfaces 为 `.out-of-scope/` 的已批准 Markdown owner 格式及 triage 消费合同。
独立验收分别检查记录内容、同 concept 追加而不重复、新请求展示旧理由；排除自动匹配裁决、
自动 reopen 和 bug 入 KB。模板中的路径只表达这项能力的 public storage contract，不指挥改某代码行。

## PR 示例（对现有 diff 的剩余工作）

```markdown
## Agent Brief
**Category:** enhancement
**Summary:** 补完贡献者为 triage list 添加的 --json 输出。

**Current behavior:**
已读 diff 在 happy path 序列化列表，符合现有命令结构；error 仍输出人类文本且新 flag 无测试。
**Desired behavior:**
--json 下 success/error 都是有效 JSON，exit codes 保持；无 flag 的人类输出不变。
**Key interfaces:**
- Error 路径在 --json 下返回 {"error": string}。
- 复用 diff 已有 serializer，success shape 不变。
**Acceptance criteria:**
- [ ] triage list --json 的 success 输出可解析为 JSON。
- [ ] 同一命令的 error 输出可解析为 JSON。
- [ ] exit codes 与相同无 flag 场景相同。
- [ ] 测试独立覆盖 success 与一种 error。
- [ ] 默认人类输出字节保持。
**Out of scope:**
- 给其他命令加 --json；改已有 success JSON shape。
```

真正 PR brief 需先读真实 diff/run 相关检查，不能把示例结果当 observed。ready-for-human 追加
不能委托的具体理由，例如有权限的维护者要做人工兼容验证和 merge；本技能不会执行 merge。

## 反例

“修 triage；去 main file 第150行，改 src/types.ts 42行”没有 category、真实 current/desired、
interfaces、可验收行为或 scope，而且绑定易变路径/行号。它不能作为 agent-ready 合同。

<!-- FILE_END: issue-triage/references/agent-brief.md -->
