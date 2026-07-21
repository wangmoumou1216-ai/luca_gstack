# CLAUDE.md 附录（懒加载细则）

> 2026-07-10 C4 瘦身批次从 CLAUDE.md 移出的细则、模板与沿革（内容原样保留，出处节在 CLAUDE.md 留有指针）。
> 行为契约以 CLAUDE.md 为准；本文件是"怎么做/为什么"的细节层，按需 Read，不随 session 注入。

## Checkpoint 写法

写入 `docs/handoff/YYYY-MM-DD-<topic>-checkpoint.md`，必须包含：
1. **已完成**：每项用 ✅ 标注，列出具体文件和验证结果
2. **进行中**：Agent ID（如已失效注明）、负责内容
3. **待执行**：剩余任务的具体描述
4. **关键决策**：本 session 做过的重要判断（不可从代码推导的）
5. **恢复指令**：新 session 应该执行什么命令/读什么文件来接续

## PROGRESS.md 更新规则

- 每完成一个 Phase → 移入"已完成 ✅"，更新 Last updated 时间戳
- 探索型长任务（fog-of-war，见 plan-agent.md）→ 可增「尚未锐化（fog）」节；fog 项过毕业判准
  （能精确陈述问题）才移入"待执行"
- 遇到卡点/决策 → 记录在"进行中 🔄"的说明内
- session 结束前 → 更新"恢复指令"

格式参见 `docs/PROGRESS.md` 模板。

## Agent Context 预算

| Agent 类型 | 推荐 prompt 长度 | 原则 |
|-----------|----------------|------|
| Explore Agent | < 500 tokens | 只给搜索目标，不给背景 |
| Work Agent | < 2000 tokens | 给精确任务 + 必要文件路径，不给决策背景 |
| Eval Agent | < 1000 tokens | 只给断言列表 + 文件路径 |
| Plan Agent | < 1500 tokens | 给任务描述 + 约束，不给执行细节 |

## 框架建设预算——依据与沿革（2026-07-03，全量搭建 review P2-8）

> 依据：review 发现 episodic 34-42% session 是 luca_gstack 自身框架建设（非下游项目产出），
> git 近 30 commits ~29 个是框架基建；"维护维护系统"的 session 链在自我复制
> （月度自进化→治理积压清算→健康度体检→体检收口→演进 digest……）。工具本身不应该
> 比它砍的柴还重。

- **软上限：** 纯框架自建 session（改 luca_gstack 自身 `.claude/`/`memory/scripts/`/`scripts/`，
  不产出任何下游项目 artifact）**每月建议 ≤ 2 次**；超出时先自问"这次框架改动是不是能等到
  真实使用中暴露问题再改"（by-design 的响应式改进优先于预防式重构）。
- **批处理优先：** 月度演进 scout、日常治理产出**默认攒批到季度裁决**，不追求每次发现都立即落地；
  见 `.claude/skill-os/evolution/digests/` 与 CLAUDE.md「治理 + 晋升」相关降频规则。
- **不是硬门禁：** 本节是自省提示，不是 route-guard 拦截条件；真正的高优先级框架修复
  （红线违反/CI 红/安全问题）不受此软上限约束。

## 自动自成长（auto-grow，2026-06-05 起）机制细节

> 经验沉淀**不再依赖用户开口提醒**。三个自动环节：

1. **捕获（每 session 自动）：** Stop hook（`.claude/hooks/session-sync.mjs`）在「本 session 有实质工作
   （有编辑 或 工具调用 ≥8 次；纯轮次不拦截，HOOK-006）且尚未沉淀」时**拦截结束**，注入短指针
   （四信号速记 + `.claude/skill-os/extraction-bar.md` 路径，细则按需读；HOOK-007 锁定 ≤900 字符）
   要求当前 Agent 先就地裁决——过门槛的经验分
   **项目级**（`append_episode.py --project`，自动从 docs 软链推导项目）
   与 **通用**（`propose_semantic.py` 候选 ／ 全局 `feedback_*.md` 或 `candidate_feedback_*.md`）落地，
   全不中则直接 `touch .claude/.episode-written-<sid>` 解锁。三重防循环：`stop_hook_active` ／ 本 session marker ／
   `SESSION_SYNC_BLOCK=0` kill-switch；任何异常 fail-open（绝不卡住结束）。
2. **治理 + 晋升（每日检查，按需写 digest）：** `session-restore.mjs` 每天首次 session 启动时后台 detached 跑
   `daily_governance.py`（跑在 Claude 已获 Desktop 访问的 TCC 上下文，绕开 launchd 对 ~/Desktop 的 TCC 限制——见 review DG-01；
   `scripts/launchd/com.luca.memory-governance.plist` 是可选的真·无人值守路径，但需手动授 Full Disk Access）：消化候选 → **只晋升 promotion_ready 门禁内的候选**（红线 SC-20260523-003 不变，
   冲突/重复/borderline 留给你裁决）。**2026-07-03 治理降频（全量搭建 review P2-4，实测每日治理近4周
   空转率>90%）：只在有真实状态变化时才写 `memory/digests/<date>.md`；无变化则跳过写入，仅留
   `.checked-<date>` 轻量标记维持"每日一次"节流，改为**至少每 7 天强制心跳一次**（哪怕零变化，
   digest 头部会标注"周度强制心跳"以区分真实变化）。超期候选（`age_days` 达阈值）呈现升级为
   带一键命令的醒目行，不再逐日原样复读同一条（原有的告警疲劳问题）。
   2026-07-10 起 digest 含「⚙️ Loop 健康」小节（daily_governance.py `check_loop_health`：积压/双向陈旧度/
   写路径核验/DORMANT 白名单，仅异常时写）。
3. **回看（下次启动自动）：** `session-restore.mjs` 在 SessionStart 把最新 digest 提示一次。

## Session 启动——G6 会话粘性修订 + 方案A 并行安全（全文沿革）

> **重要（2026-07-04 G6 会话粘性修订，原"每次启动无条件清除"已条件化）：**
> `session-restore.mjs` 在 SessionStart 清除三个 symlink（`docs/`→项目 docs、
> `.claude/workflow-state.yaml`→state、`.claude/current-topic.txt`→topic）**仅当**：
> ① `source === 'startup'`（冷启动；resume/compact/clear 保留——恢复态清自己上下文是 bug）
> **且** ② 无活跃并行 session（探测他-sid 计数/transcript mtime < 15min）**且** ③ 未设
> `SESSION_RESTORE_ALWAYS_CLEAR=1`。悬空链（目标已删/改名）无视上述直接清（安全 gate）。
> **原设计意图仍在**（防跨 session 状态污染、走全新项目确认流程），只是不再牺牲并行 session——
> luca 常同时开多个 session（muse app 内嵌终端 + CLI + 不同项目），旧的无条件清会让任一新
> session 启动即清空其它 session 正在用的项目上下文（曾实测撞 3 次）。
> **后果（分两种）：**
> - **冷启动 + 无并行**：呈"无激活项目"，第一条消息触发 Project Gate（同旧行为）。
> - **保留态**（继承并行 session 的激活项目）：启动打印"当前激活项目: X（检测到活跃并行
>   session 已保留）"；此时首条消息 route-guard 会额外提示"全局激活项目 X 仅供参考——本 session
>   尚未绑定项目"（方案A 下继承≠绑定）——你要在某项目上干活就提它的名字 / switch 一次即绑定。
>   Meta/审计/内容工具 skill 例外分支不变。
>
> **会话级项目隔离（方案A，2026-07-08 —— 真隔离，取代旧"告警不阻止"）：** 激活项目从"工作目录属性"
> （全局共享软链）升级为"session 属性"——每个 session 的 `.claude/.session-project-<sid>` pin 是唯一
> 真值，PreToolUse 的 `project-scope-guard.mjs` 据此把该 session 对 `docs/`·workflow-state·current-topic
> 的读写**重定向到它自己 pin 项目的绝对路径**。于是 N 个并行 session 可同时在不同项目上工作互不
> 串扰；别的 session 怎么 switch 翻共享软链都改不动本 session 的落点（软链退化为纯展示）。未绑定
> session（纯对话/框架任务）碰 `docs/` 直接 deny；非项目路径（`.claude/skills`、`memory/`、`scripts/`、
> `framework/`…）原样放行。pin **只在显式声明/确认项目时写、永不从软链派生、漂移永不自动认领**。
> Bash 里字符串写 `docs/` 是唯一 best-effort 边，文件类工具精确重定向。**未绑定 session 的读
> （Read/Grep/Glob）放行、写 deny**；无 path 的 Grep/Glob 会经软链搜到当前项目（已知读/搜索侧局限，
> 非写入损坏）。回归 `scripts/test-project-scope-guard.mjs`。

## Project Gate 附则（被「命名即切换」升级取代的原文存档，2026-07-10）

> 以下为母版 2026-07-10 同步「命名即切换 + 语义自判」（fork 2026-07-06 能力）前的原行为契约，
> 原样存档；现行契约以 CLAUDE.md Project Gate ①-⑤ 为准。

**旧 ①（G6 继承态例外，确认制）：**
→ **例外（G6，2026-07-04）：若激活项目是"继承"来的**（route-guard 提示"本 session 继承了
  激活项目 X"，即本 session 从未确认过它、是并行 session 保留的），**不要静默继续**——先用
  一句话确认「当前继承激活项目 X，你要做的是它吗？还是切到别的项目？」再动手。判据：见到
  那条继承提示 = 继承态；没见到（本 session 自己 switch/确认过的）= 已确认，正常静默继续。

**绑定即注入（2026-07-09 M2 原文）：** 确认/绑定项目时（含上面继承态的确认、或点名当前已激活
项目这类"没跑过 switch"的路径），若本 session 尚未注入该项目本地记忆 → 幂等执行
`./scripts/project.sh switch {name}`（项目 MEMORY.md / CONTEXT.md 的注入挂在它的 stdout 上；
切到当前已激活的同名项目不改软链目标）。②/③ 分支本就跑 switch/new，注入天然覆盖。
**边界（2026-07-09 红队修订）：仅适用于真正要在该项目上做实质工作的 session。**
meta/框架/审计 session 不适用——只需读某项目记忆做参考时，直接 Read 其项目根 `CONTEXT.md`
与 `.luca/memory/MEMORY.md`，**不得 switch**：switch 翻全局共享软链，已 pin session 免疫，
但未 pin 的并行读 session 会被拖走，且方案A 已移除漂移告警，误切无人点名
（person 记忆 never-switch-parallel-session-projects，luca 标注严重问题）。

**旧 ②（确认制切换）：** 消息中包含已有项目名 → 提示切换：「切换到 {name}」→ 用户确认后执行
`./scripts/project.sh switch {name}` → 继续

**旧 ③（一律确认制新建）：** 消息描述新项目/新需求/新功能，或直接调用了 skill 且没有明确当前项目
→ 新项目信号；从描述/skill 参数推断候选名 → 一句话确认：「这是新项目，建议叫 {name}，确认？」
→ 用户确认（或给出其他名字）→ `./scripts/project.sh new {name}` → 执行原始请求

## Project Gate 附则：总原则 + 绑定即注入（全文）

> **总原则（命名即切换 + 语义自判，2026-07-06）：** 项目归属是**语义判断，不靠词表**——
> 即使 route-guard 因无关键词输出 STOP，只要你从用户语言能判断出「切某已有项目 / 这是个新项目 /
> 当前项目内的新需求」，就**决定性执行**（同 OD 单点交接的「语义不靠词表」原则）。route-guard
> 词表只是粗网，真判断在你。切换便宜可逆→不确认；新建会 detach 当前+建目录→仅"我自己猜的新项目"
> 留一句确认。

> **绑定即注入（2026-07-09）：** 确认/绑定项目时（含继承态确认、点名当前已激活项目这类
> "pin 已写但没跑 switch"的路径），若本 session 尚未注入该项目本地记忆 → 幂等执行
> `./scripts/project.sh switch {name}`（项目 MEMORY.md / CONTEXT.md 的注入挂在它的 stdout 上；
> 切到当前已激活的同名项目不改软链目标）。
> **边界（2026-07-09 红队修订）：仅适用于真正要在该项目上做实质工作的 session。**
> meta/框架/审计 session 不适用——只需读某项目记忆做参考时，直接 Read 其项目根 `CONTEXT.md`
> 与 `.luca/memory/MEMORY.md`，**不得 switch**：switch 翻全局共享软链，已 pin session 免疫，
> 但未 pin 的并行读 session 会被拖走，且方案A 已移除漂移告警，误切无人点名
> （person 记忆 never-switch-parallel-session-projects，luca 标注严重问题）。

## insight-synthesis 划界（三处消歧全文，2026-07-20）

`/insight-synthesis` = 一手定性综合，研究段第三"对象角度"（内部一手定性）。数据一律用户提供、skill 不自采。
三处易混边界（语义判断，route-guard STOP 不豁免；表行只留与 idea 的核心划界，全文在此）：
- **与 `/idea` = 忠实 vs 解读**：输入同类（都是一手资料），差别在输出——idea 只忠实结构化·禁推断（只 observation）；
  insight-synthesis 在用户确认主题后做 observation→interpretation 跃迁。
- **与 deepresearch / ux-research = 对象相反**：它们综合外部知识/竞品/先例；insight-synthesis 综合你自己的一手用户数据。
- **与 `/muse-req-triage` = 意图消歧**：同一份客户反馈既可投 triage（筛哪些值得做）也可投 synthesis（这批数据说明什么），靠用户意图分流。

## luca app 侧栏感知（全文，2026-07-11）

用户说"看看我侧栏/当前打开的页面/基于侧栏这个页做…"（语义识别非词表，route-guard STOP 不豁免；不进路由表、无斜杠命令）时：
① 先跑 `bash scripts/luca-sidebar.sh`（默认 meta）——返回激活面板、当前页 URL/标题、全部页签清单（输出首行为结果 md 路径；15s 超时 = app 未运行/异常，如实报告，绝不臆造页面内容）。
② 取内容**源头优先于 DOM**：GitHub → `gh` 拉源头；公网文档/文章 → WebFetch；X /status/ 页 → FxTwitter（`api.fxtwitter.com/<handle>/status/<id>` 无 key 恢复全文）；本地 HTML 预览页签 → 直接 Read meta 给的本地路径；登录墙/动态页无法重取 → `bash scripts/luca-sidebar.sh capture` 抓 DOM 正文兜底。
③ 下游接轨：诉求为"评估纳入 skill os / 工作流" → 接 `external-skill-scout`（Workflow）；评估通过要采纳 → 走既有治理轨道（main 落地 + routing-map + /office + workflow-graph + model-routing 三问 + parity 锚点），不为此新建机制。
④ 激活面板非网页（如会话面板）→ 如实告知，列页签清单请用户指定。

