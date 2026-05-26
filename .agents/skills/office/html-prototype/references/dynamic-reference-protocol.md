# Dynamic Reference Protocol

> 被 `/html-prototype` 必读。用途：让原型设计吸收当前最顶级产品的 UI、
> 动效、AI/Agent 交互趋势，而不是只依赖静态 reference。

## 0. 为什么需要动态参考

静态 reference 负责守住底线：
- 品牌 token
- B2B SaaS 规范
- 当前审美原则
- 反模式清单
- 状态覆盖

动态 reference 负责跟上当前最好的产品实践：
- 这个功能类型在一线产品里现在怎么做？
- AI/Agent 状态现在怎么表达？
- 顶级产品怎么处理动效、反馈、置信度、接管、回退？
- 哪些做法已经过时或显得像 AI 模板？

## 1. 什么时候必须动态查询

以下任一条件成立，必须执行动态参考查询：

- 需求涉及 AI / Agent / 自动化 / 推荐 / 总结 / 生成 / 预测 / 分析。
- 需求涉及复杂 B2B 工作流：审批、CRM 对象详情、销售跟进、任务编排、
  仪表盘、设置、权限。
- 需求涉及新交互范式：自然语言入口、命令面板、任务执行流、活动日志、可回退操作。
- 设计目标写了“高级感”“现代”“像一线产品”“当前审美”“动效”。
- 静态 reference 无法判断某个 UI pattern 是否过时。

如果完全离线或工具不可用，允许跳过动态查询，但必须在 `prototype-spec.md` 写：

```text
Dynamic Reference Status: SKIPPED_TOOL_UNAVAILABLE
风险：本次只使用静态 reference，未校准最新外部产品实践。
```

## 2. 顶级产品筛选标准

不要随便找“看起来好看”的页面。候选产品必须满足至少 4 项：

| 标准 | 判断方式 |
|---|---|
| 类目相关 | 与当前功能同类：CRM、协作、Agent、BI、DevTools、自动化、企业后台等 |
| 产品领先 | 行业内被广泛使用、讨论或被竞品借鉴 |
| 证据新 | 官方页面、文档、博客、发布说明、截图或视频在近 18 个月内更新 |
| UI 可观察 | 能看到真实界面、组件、状态、动效或流程，而非纯营销文案 |
| 设计系统成熟 | 有 design system、component docs、公开产品截图或一致的产品语言 |
| AI/Agent 成熟 | 对 AI 的可见性、置信度、接管、回退、日志有明确处理 |
| 企业可信 | 面向工作流、权限、审计、稳定性，而非纯消费级炫技 |

## 3. 推荐候选池

根据需求类型选择 5-8 个候选，再筛到 3-5 个进入深读。

### CRM / 销售 / 客户对象

- Salesforce Agentforce / Sales Cloud
- HubSpot CRM
- Attio
- Linear（对象、列表、活动流，不是 CRM 但对象体验强）

### Agent / 自动化 / 任务执行

- Cursor
- Salesforce Agentforce Builder
- OpenAI / ChatGPT Projects / Tasks（如有最新官方材料）
- Zapier / Microsoft Copilot Studio
- Devin / GitHub Copilot Workspace（如有可观察界面）

### AI 总结 / 会议 / 语料 / 知识工作

- Granola
- Notion AI
- Coda AI
- Microsoft Loop / Copilot

### B2B 列表 / 表格 / 工作台

- Linear
- Retool
- Airtable
- Atlassian Jira
- Vercel dashboard

### 设置 / 权限 / 管理后台

- Atlassian Admin
- Salesforce Setup / Agentforce Builder
- Vercel / Stripe dashboard
- GitHub settings

## 4. 查询策略

先查官方和一手来源，再看高质量二手分析。

### 必查来源优先级

1. 官方产品页、官方 docs、官方 changelog、官方 engineering/design blog。
2. 公开视频、发布演示、官方截图。
3. 设计系统文档：Atlassian Design、Material Design、Salesforce Lightning、Vercel/v0、shadcn。
4. 权威行业文章或设计分析。
5. X / 社区讨论只能作为趋势发现，不作为唯一依据。

### 查询模板

根据当前需求生成 3-5 条搜索：

```text
{product} {feature type} UI screenshot workflow
{product} AI agent builder UI control preview audit log
{feature type} enterprise SaaS UI pattern 2026
{product} motion interaction design changelog
{design system} {component type} motion feedback empty state
```

## 5. 多轮验证

### Round 1：候选发现

找 5-8 个候选，记录：

```text
产品：
相关功能：
证据链接：
证据类型：official docs / product page / changelog / screenshot / video / article
初步借鉴点：
```

### Round 2：证据筛选

剔除：
- 只有营销图、没有真实 UI 的材料。
- 超过 18 个月且没有明显延续性的材料。
- 只有视觉风格相似、功能不相关的材料。
- 消费级 UI，无法迁移到 B2B 高频工作流的材料。
- 无法说明状态、反馈、交互、信任机制的材料。

### Round 3：共性提取

从 3-5 个最终参考中提取共性：

```text
布局共性：
信息层级共性：
AI/Agent 表达共性：
动效共性：
状态/错误/空态共性：
控制权/信任共性：
不采用的方向：
```

### Round 4：迁移判断

不要直接抄 UI。必须回答：

```text
哪些共性适合当前 CRM/B2B 场景？
哪些共性不适合，因为会破坏密度、品牌或用户任务？
哪些必须转译成纷享销客 framework 语言？
```

## 6. 动效提取标准

不要只写“有高级动效”。必须提取可落地参数：

| 维度 | 要记录什么 |
|---|---|
| 触发 | hover / click / focus / state change / agent progress / completion |
| 时长 | desktop 默认 150-200ms，复杂状态可 225-300ms，超过 400ms 需说明 |
| 缓动 | ease-out / ease-in-out / cubic-bezier |
| 方向 | 进入、退出、展开、收起、流式生成、进度推进 |
| 反馈意义 | 是确认、等待、风险、可接管、完成，还是纯装饰 |
| 可降级 | prefers-reduced-motion 下是否能关闭或简化 |

禁止：
- 为了“高级感”增加无意义动效。
- 背景大面积流动、视差、Ken Burns。
- AI 输出使用炫彩 shimmer 表达“智能”。

## 7. AI 时代必须动态关注的 pattern

### 7.1 Structured UI over Chat

如果功能是 AI/Agent 输出结果，优先寻找结构化 UI 参考，而不是聊天气泡：
- 表格/卡片/步骤/字段/差异对比/活动日志。
- AI 输出应嵌入对象和工作流。

### 7.2 Human Control Surface

Agent 类功能必须找控制面参考：
- 当前步骤
- 下一步
- 暂停
- 接管
- 撤销
- 重试
- 审计日志

### 7.3 Confidence and Uncertainty

AI 结果必须观察顶级产品如何表达：
- 来源
- 置信度
- 更新时间
- “基于有限数据”
- 人工确认入口

### 7.4 Progressive Autonomy

不要默认让 Agent 全自动。动态参考应判断：
- 哪些动作可自动执行？
- 哪些动作必须先预览？
- 哪些动作必须审批？
- 哪些动作只提供建议？

## 8. 输出格式

每次动态参考完成后，在 `prototype-spec.md` 写入：

```markdown
## Dynamic Reference Scan

Dynamic Reference Status: COMPLETED

### 查询目标
{本次要解决的 UI/动效/AI pattern 问题}

### 入选参考
| 产品 | 来源 | 证据类型 | 借鉴点 | 采用/不采用 |
|---|---|---|---|---|

### 共性提取
- 布局：
- 信息层级：
- AI/Agent 表达：
- 动效：
- 状态反馈：
- 信任/控制：

### 转译为本原型的设计决定
- {决定 1}
- {决定 2}
- {决定 3}
```

同时在 `prototype-qa-report.md` 或最终回复中说明动态参考是否完成。

