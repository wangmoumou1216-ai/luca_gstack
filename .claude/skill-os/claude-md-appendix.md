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
   与 **通用**（`propose_semantic.py` 候选 ／ 全局 `feedback_*.md` 或 `candidate_feedback_*.md`）落地。
   UserPromptSubmit 先 O_EXCL 签发绑定 event/session/prompt hash/nonce 的 ticket；全不中以
   `close-correction-ticket.mjs close --session <sid> --level NONE` 闭合，命中则按 L1–L5 + route bit 的
   fixed verifier exact-set 闭合。只有验证 receipt 可放行；`stop_hook_active` 与旧 `.episode-written-*`
   marker 均无放行权，`SESSION_SYNC_BLOCK=0` 仅保留为显式应急 kill-switch。
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
route-guard 为当前 `UserPromptSubmit` 生成的完整 `./scripts/project.sh switch ... --session-id ... --tx ... --expected-epoch ...`
事务命令（项目 MEMORY.md / CONTEXT.md 的注入挂在它的 stdout 上；
切到当前已激活的同名项目不改软链目标）。②/③ 分支本就跑 switch/new，注入天然覆盖。
**边界（2026-07-09 红队修订）：仅适用于真正要在该项目上做实质工作的 session。**
meta/框架/审计 session 不适用——只需读某项目记忆做参考时，直接 Read 其项目根 `CONTEXT.md`
与 `.luca/memory/MEMORY.md`，**不得 switch**：switch 翻全局共享软链，已 pin session 免疫，
但未 pin 的并行读 session 会被拖走，且方案A 已移除漂移告警，误切无人点名
（person 记忆 never-switch-parallel-session-projects，luca 标注严重问题）。

**旧 ②（确认制切换）：** 消息中包含已有项目名 → 提示切换：「切换到 {name}」→ 用户确认后执行
执行 route-guard 本轮生成的完整 `switch` 事务命令 → 成功后结束本轮，下一轮继续

**旧 ③（一律确认制新建）：** 消息描述新项目/新需求/新功能，或直接调用了 skill 且没有明确当前项目
→ 新项目信号；从描述/skill 参数推断候选名 → 一句话确认：「这是新项目，建议叫 {name}，确认？」
→ 用户确认（或给出其他名字）→ 下一条 prompt 由 route-guard 生成完整 `new` 事务命令 → 执行后结束本轮，下一轮执行原始请求

## Project Gate 附则：总原则 + 绑定即注入（全文）

> **总原则（命名即切换 + 语义自判，2026-07-06）：** 项目归属是**语义判断，不靠词表**——
> 即使 route-guard 因无关键词输出 STOP，只要你从用户语言能判断出「切某已有项目 / 这是个新项目 /
> 当前项目内的新需求」，就**决定性执行**（同 OD 单点交接的「语义不靠词表」原则）。route-guard
> 词表只是粗网，真判断在你。切换便宜可逆→不确认；新建会 detach 当前+建目录→仅"我自己猜的新项目"
> 留一句确认。

> **绑定即注入（2026-07-09）：** 确认/绑定项目时（含继承态确认、点名当前已激活项目这类
> "pin 已写但没跑 switch"的路径），若本 session 尚未注入该项目本地记忆 → 幂等执行
> route-guard 为当前 `UserPromptSubmit` 生成的完整 `./scripts/project.sh switch ... --session-id ... --tx ... --expected-epoch ...`
> 事务命令（项目 MEMORY.md / CONTEXT.md 的注入挂在它的 stdout 上；
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

## Figma 写入后主动开侧栏看结果（全文，2026-07-22 luca 明确指示）

**规则：** 只要向 Figma 写入了内容（`use_figma` 建/改节点、`create_new_file`、`generate_figma_design`，
以及 figma-layer / figma-demo 的任何写入步骤），**完成后必须主动在 luca app 侧栏浏览器打开结果**，
不等用户开口。写完不看等于没交付——与「HTML 产物主动推送预览」「能力必须落到日常在用的制品」同源。

**操作接口（2026-07-24 起）：`scripts/luca-open.sh --url <http(s)-url>` 可直接把公开 URL 推进侧栏**
（内部写唯一路径 meta-refresh shim 再走既有预览管道；仅接 http(s)）。**Figma 开侧栏首选
`open_in_view(url)` 深链直开（2026-07-30 修订，取代原「不迁 --url」裁决；全链与已知边界见
「luca app 侧栏感知 › 侧栏交付面」）**；下方 meta-refresh 跳转页降为**兜底做法**——保留
file key / node id 兜底链接，app 接管插页/渲染异常时仍有信息价值。
`scripts/luca-sidebar.sh` 是**只读**的（只有 `meta` / `capture` 两个模式，问当前开了什么），不写。

**兜底做法（2026-07-22 实测跳转生效；首选深链直开见上）：**
1. 在本次 Figma 产出目录写一个跳转页（如 `open-figma.html`）：
   `<meta http-equiv="refresh" content="0; url=https://www.figma.com/design/<fileKey>">`
   加一个可点的兜底按钮（附 file key / 母版帧 node id，跳转失败时仍有信息价值）
2. `bash scripts/luca-open.sh <该跳转页绝对路径>`
3. `bash scripts/luca-sidebar.sh` 核当前页 URL 是否已变为目标 Figma 文件

**触发场景：** 2026-07-22 建完 6 个 Figma 帧、写完 spec 与 handoff，只把 URL 贴在对话里，
luca 连问「你置入到 figma 里面了吗」「打开浏览器到侧边栏」两次才看到画布。

---

## muse 工具通道（MCP，2026-07-30）

app 内嵌 claude session 由 app 注入 `--mcp-config`（`~/.luca/mcp/muse-<实例哈希>.json`，
app 启动时生成），暴露 7 个 `mcp__muse__*` 工具（server：app 内 unix socket + mcp-shim.cjs）：

| 工具 | 用途 | 何时用 |
|---|---|---|
| `workspace_state` | 工作台现状 JSON（panes/分屏/侧栏/预览页签） | 指挥动作前置读；用户提"当前打开的/侧栏/分屏" |
| `preview_screenshot` | 截**预览页签或网页页签**真实像素（返回图 + 全尺寸 PNG 路径）；**恒激活目标页签**；产帧探针+纯色帧拒绝，本地预览带源文件 mtime、远程页只带抓取时刻 | **改 HTML 后自验 UI（以像素为准），代替"让 luca 看"**；也可自验侧栏网页渲染 |
| `open_in_view` | 开文件/URL（HTML→侧栏预览，md→文件页签，`target:"split"` 分屏——**split 仅对本地文件生效**） | 替代 luca-open 的模型主动路径 |
| `web_locate` | 定位侧栏页签回 tabKey/URL/pageOrigin/标题/rect；`reveal:false`（默认）**不切面板不抢焦点** | **开页前查重（纪律③的执行手段）**；`reveal:true`＝把已开页签调到前面给 luca 看 |
| `sidebar_read` | 读**指定**页签正文（含跨域子帧）；不切页签；正文按不可信输入披露 | 用户说"基于侧栏那页"而该页非激活页签时（纪律④ 的执行手段） |
| `sidebar_selection` | 读**用户当前选中的文字**＋所在元素 CSS selector（selector 在页内自验证过唯一命中，验不过就不给而非给个错的）；抓取跑**隔离世界**故页面伪造不了选区；不切页签、不抢焦点、不改工作台状态；只读顶层文档——iframe（**含同源**）/shadow DOM/input·textarea 内的选区一律够不到；正文折叠转义且 400 字上限（截断会明说），**不能当字面量去 grep/Edit**；正文与本地 file:// 一律按不可信输入披露 | **指代消解**：用户说"这个/这段/这里/改一下这个按钮"而侧栏开着——他在看屏幕我没在看，先问一次再答，别猜元素。空结果＝去问用户，不等于"他没选" |
| `sidebar_navigate` | 已有页签内导航（等加载完）；跨分区目标改新开正确分区页签 | 想移动已有页签而非堆新页签 |

**读面安全边界（2026-07-30 A 批落地）**：`claude.ai` 域的 `sidebar_read`/`preview_screenshot`/
`sidebar_selection` **一律硬拒**（该登录态属 Claude 自身通道，判据取页签当前 URL 不信入参）；figma 走独立分区
`persist:figma`（跨分区 in-tab 导航被守卫拦下改新开页签，含页内链接/地址栏/工具三入口）。
**写面（点击/输入）本批不存在**——需权限门先落地，见 muse
`docs/plans/2026-07-30-sidebar-automation-plan.md` B 批。

**降级链**（工具不可见时逐级回落，均如实报告）：① 终端 session / Codex / 云端 → 本表动作走
既有脚本（luca-open.sh / luca-sidebar.sh）；② app 内嵌 session 里 `/exit` 落 shell 后手动重跑
`claude` → 无 `--mcp-config`，工具消失属预期非故障，走脚本；③ 工具调用报"app 未运行/通道
不可用" → 如实报告，不臆造工作台状态；④ **内嵌 session 里工具静默缺席** = config 守卫
fail-open（坏 config 裸启动）或 app 尚未重启到含 MCP 的版本 → 预期非故障，走脚本。
**与 luca-sidebar.sh 的分工（2026-07-30 改口）**：meta 面（面板/页签清单）二者重叠——工具可见时
workspace_state 优先；capture 面**已部分吸收**——`sidebar_read` 覆盖**浏览器面板的指定页签**
（脚本只能读当前激活面板），而 **X / YouTube / Claude Design 三个面板的正文抓取仍归
`luca-sidebar.sh capture`**，工具不覆盖那三个面板。
可达性口径（FM-11 内建能力改编版，by-design 不进 skill body）：CLAUDE.md 契约引用 + 内嵌
session 实调成功即为可达。实现与方案记录：muse 仓 `app/main.js`、`app/mcp-shim.cjs`、
`docs/plans/2026-07-30-muse-mcp-substrate-plan.md`。

## luca app 侧栏感知（全文，2026-07-11）

用户说"看看我侧栏/当前打开的页面/基于侧栏这个页做…"（语义识别非词表，route-guard STOP 不豁免；不进路由表、无斜杠命令）时：
① 先跑 `bash scripts/luca-sidebar.sh`（默认 meta）——返回激活面板、当前页 URL/标题、全部页签清单（输出首行为结果 md 路径；15s 超时 = app 未运行/异常，如实报告，绝不臆造页面内容）。**`mcp__muse__workspace_state` 可见时本步用它等价代替**（meta 同源超集，见「muse 工具通道」）。
② 取内容**源头优先于 DOM**：GitHub → `gh` 拉源头；公网文档/文章 → WebFetch；X /status/ 页 → FxTwitter（`api.fxtwitter.com/<handle>/status/<id>` 无 key 恢复全文）；本地 HTML 预览页签 → 直接 Read meta 给的本地路径；登录墙/动态页无法重取 → `bash scripts/luca-sidebar.sh capture` 抓 DOM 正文兜底。
③ 下游接轨：诉求为"评估纳入 skill os / 工作流" → 接 `external-skill-scout`（Workflow）；评估通过要采纳 → 走既有治理轨道（main 落地 + routing-map + /office + workflow-graph + model-routing 三问 + parity 锚点），不为此新建机制。
④ 激活面板非网页（如会话面板）→ 如实告知，列页签清单请用户指定。

### 浏览器点名镜像（乙类，2026-07-24；显式点名 default-off）

**只镜像 luca 点名的浏览器页，默认全静默——批量调研 / 竞品 / 抓取一律不推。**
- **触发**：luca 显式说"盯这个 / 镜像这个 / 给我看这个" → 我执行该指令跑 `bash scripts/luca-open.sh --url <url>`。
  这是"识别并执行一条明确用户指令"，**不是替 luca 猜哪页他想看**。
- **有界 scope（非机械 follow）**：点名开一段作用域，期间镜像被点名任务**主线**页；
  **lookup / verify 岔路（查资料 / 竞品 / 验证）即便是顶层导航也不镜像**——这是可 post-hoc 核查的线、
  不是 a-priori 可判定的规则，是我的判断被此审计线 bound。
- **teardown**：作用域在 session 结束 + 显式任务切换时失效；话题切换后要再推前先**重确认**（"还在盯 X 吗？"）。
  无持久 latch、靠我追踪，属**纪律非结构保证**。
- **诚实定性**：机器无 ambient 自发是结构性的（脚本非调不发）；"我不 over-invoke"是纪律
  （同 pre-hook HTML 推送可靠性类）、非保证，可接受**因 blast radius 低（一个可关页签）**。
- **审计否定（限镜像语境，见下「侧栏交付面」划界）**：未点名不得调 `--url`；调用前须能引用 luca 点名原话；lookup 不镜像即便顶层；话题切换后重确认。
- **边界（须让 luca 知情）**：镜像是**同 URL 在你自己 app session live 载入、跟随主线导航**，
  **非**我 Claude-in-Chrome 独立浏览器里逐帧点击直播（要逐帧需截图流）；当前 DEFER 实现走预览面板
  `persist:aihot`，claude.ai 等登录页会显示未登录（要登录态正确须升 BUILD 版走 browser 面板）。
- **不重复既有 push**：该 URL 若已被 auto-push 覆盖（本地 .html 产物已在预览 / Figma 已开）→ 跳过不双开。

> 以上四条 bullets 原错落在「harness 注入边界」节尾（2026-07-28 插入时被劈开），2026-07-30 归位。

### 侧栏交付面：展示归侧栏，Chrome 归自动化（2026-07-30）

**app 内嵌 session（`mcp__muse__*` 可见）下的双轨分工**：侧栏＝present 面（一切交付与展示），
claude-in-chrome＝act 面（自动化）。判断路径＝语义路由契约的每请求通用反射——「展示类打开 X」
是 CLAUDE.md 声明的工具动作（甲类路由目标）；「终态拉回侧栏」是乙类交付纪律（与「HTML 产物
主动推送」「Figma 写入后开侧栏」同构同源）。

- **展示意图**（任何措辞的「打开/看看/预览 X 给我看」，语义识别非词表）→ `open_in_view(url)`；
  工具不可见 → `bash scripts/luca-open.sh --url <url>`；两者均不可用 → 才开 Chrome 并如实
  说明。（本条＝「muse 工具通道」4 级降级链对 URL 展示类的**链尾扩展**，非新链。）
- **Chrome（claude-in-chrome）正面用途**：需要页内交互、登录态操作、console/网络取证的
  **自动化**（查找/定位/验证/抓取）。反例：仅为「打开给 luca 看」开 Chrome＝错误路由。
  **route-guard 对 agent_browser 的 SINGLE 命中不豁免本判断**——展示类语义改道侧栏；
  SINGLE 照常遵守的对象是自动化语义（语义路由契约原文只写了 STOP 不豁免，本句补齐）。
- **终态拉回**：Chrome 查找/操作结束后把最终 URL `open_in_view` 进侧栏——Chrome 是查找
  工具，不是交付面。
- **Figma 定位链**：先查本地线索（docs/handoff、figma-layer 产出、memory 的 fileKey/node-id）
  拼深链 `figma.com/design/<fileKey>?node-id=<id>` 侧栏直开（零 Chrome）；线索不足才 Chrome
  查找，查到即拉回。Figma 页内自动化走 figma MCP，不做侧栏点击。
  **已知边界（2026-07-30 实测）**：file URL 直开可能命中「桌面 App 接管插页」（非登录墙）——
  告知 luca 在该页签点一次「Open here instead」（一次性、永久记住浏览器偏好）；即时兜底用
  embed viewer `figma.com/embed?embed_host=luca&url=<URL-escaped file url>`（已实测渲染画布、
  登录态正常）。
- **登录墙**：`persist:aihot` 分区遇登录墙如实报告（capture 输出自带启发式警告），给两条路：
  luca 侧栏登录一次（密码保险箱可用）或本次改 Chrome 交付。
- **指给你看**：`#:~:text=` Text Fragment 深链在侧栏 webview 生效（2026-07-30 像素实测，经
  mirror shim 亦存活）——需把注意力引到页面具体句子时带上。
- **交互纪律**：①开页必配一句话告知并引用页面标题，禁静默开页；②先答后开、逐级升不跳级——
  栏内能说清的不开页，页面只用于必须看原件/可视化/需用户操作的场景；③开页前查
  `workspace_state` 防同 URL 重复开——已开且激活不再开，已开未激活用
  `web_locate(url, reveal:true)` 调到前面并按标题告知「《X》已在侧栏打开」（不按序数指称；
  **关闭页签仍无工具**，收尾只报账不清理）；④读侧栏页面前声明读的是哪个页签（标题+域名）
  ——非激活页签用 `sidebar_read(url|tabKey)`，X/YouTube/Design 面板仍走
  `luca-sidebar.sh capture`。焦点：用户显式要求看→切换合理（现 url 分支固定抢焦点）；
  主动推送场景的「不抢焦点+角标」需 app 层支持（B 批 C1/C2），暂以「开完即告知」兜底；
  **读面工具已默认不抢焦点**（`reveal:false`，真机实证 display:none 的页签照常可读）。
- **与「浏览器点名镜像」划界**：镜像管「跟随 luca 自己的浏览」（default-off 防打扰，其
  「未点名不得调 `--url`」审计条款限定在镜像语境）；本条管「我主动要交付/展示的 URL」
  （default-on 交付收口）。对象不同，不冲突，不受「更严格者为准」互吃。

---

## harness 注入边界（规则优先级第 2 层的适用范围，2026-07-28）

> CLAUDE.md「规则优先级体系」第 2 层写作「当前 agent runtime 的 system/developer 安全与工具约束」。
> 本节界定它**不包含**什么。（沿革：2026-07-28 正文因 B1 门余 4 字节无法内联；claude5-unhobble
> 瘦身后正文已有本节指针与边界注，本节仍为两问判据全文权威源。）
> 该条的**确定性投递由 route-guard STOP 分支的研究轴提示钉承担**（见下"结构承载"）；
> AGENTS.md 第 2 层已内联同一套语义的英文全文。

**属于第 2 层（可压第 4 层路由）：** harness 的**安全约束与工具能力事实**——不许做什么、
工具不存在、权限不足、沙箱边界、不可逆操作的门。

**不属于第 2 层（无权压第 4 层路由）：** harness 的**行为偏好类**注入，例如
`Do not use workflows or deep-research unless the user requested it`、
`user is not watching, asking will block the work`、`Do not call the AgentTool unless requested`。
这些约束的是**我要不要自作主张升级重型编排 / 要不要停下来提问**，
**不是**「这个请求属不属于某个 skill」，更不是「要不要有计划」。

**判据（把冲突拆成两问）：**

| 问题 | 由谁裁 |
|---|---|
| 要不要**问**用户 / 要不要**升重型编排** | harness 注入（第 2 层）说了算 |
| 这题**属不属于**某 skill / 该不该**有计划** | 永远由第 4-5 层裁，注入无权豁免 |

第二问永远零成本可做：**产出计划、按含义识别 skill 都是干活，不是提问。**

**两次实证（同一条注入，6 天内两次同型失效）：**
- **2026-07-22（CRM 三列表改造）**：拿 `Do not use deep-research unless requested` +
  `user is not watching` 当豁免 → 跳过 route-guard 的 MULTI 门 → 裸奔 ad-hoc WebSearch → 被打断三次。
  处置：写 person 记忆 `feedback_skill_routing_verify` 第 4 条。
- **2026-07-28（pi agent 框架调研）**：同一条注入被扩大解释成"这题不属于 research 类" →
  STOP 下裸奔 WebSearch → 被打断两次。**证明"只写记忆"这条处置不足够**，遂补结构承载。

**结构承载（为什么这条不只是纪律）：** route-guard `complexityDecision()` 的 7 个信号原本全在
**构建轴**（做东西），研究-理解类诉求 complexityScore 恒 0，导致 STOP 分支那颗防
"把 STOP 当直接执行"的提示钉对研究类**永不触发**——而 research 词表是刻意做窄的
（`quick_research` 自注"宽表述靠语义兜底"）。两者叠加使研究轴成为**唯一的单层保护**，
构建轴却是词表+复杂度网双层。2026-07-28 补「研究/认知诉求」信号（weight 2，双要素
认知动词∧认知对象 + 两条反担保）补齐该不对称，并在提示钉里直接写明本节判据。
回归锁：`scripts/test-route-guard.mjs` 5 条研究轴用例（含 weight 取 2 的边界锚——
取 3 会与"规划意图"叠加到 6 而误升 PLAN_MODE）。

**已知残留（不粉饰）：** 窄正则追不上自然语言，措辞刁钻的研究诉求仍会漏；
提示钉提高叫醒率但**不保证**叫醒。本节是降低复发率的手段，不是消除。

> （原挂此处的四条「浏览器点名镜像」bullets 系 2026-07-28 本节插入时被劈开的错位段，
> 2026-07-30 已归位回「luca app 侧栏感知 › 浏览器点名镜像」节，约束原文不变。）
