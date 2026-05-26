# B1 — 多 Agent 编排框架 源码级调研

> 研究目标：针对 luca_gstack 的 4 个真实编排痛点（spec-only 假 agent、纸面 hierarchical、turn-count 伪 token 预算、handoff 归属矛盾），从成熟开源框架的**实现层**找可借鉴解法。
> 调研方式：`git clone --depth 1` 后阅读核心实现文件。所有引用均带 file:line，未能从源码证实的不写。

---

## 一、深挖项目

### 1. LangGraph — graph-based state machine（图编排）
- 星数：~33.0k（github.com/langchain-ai/langgraph，API 实测 2026-05）
- 仓库：https://github.com/langchain-ai/langgraph
- 读了哪几个核心文件:行：
  - `libs/langgraph/langgraph/graph/state.py:130-204`（StateGraph 定义 + reducer 模型）
  - `libs/langgraph/langgraph/pregel/types.py`（旧路径，types 实际在）`libs/langgraph/langgraph/types.py:406-427`（RetryPolicy）、`:440-503`（TimeoutPolicy）、`:655-743`（Send）、`:749-799`（Command）
  - `libs/langgraph/langgraph/pregel/_loop.py:583-665`（super-step `tick()`）、`:667-677`（`after_tick` apply_writes）
  - `libs/langgraph/langgraph/pregel/_retry.py:541-644`（`run_with_retry` 退避实现）
  - `libs/langgraph/langgraph/pregel/main.py:2534`（recursion_limit 校验）、`:2974-2980`（GraphRecursionError）

### 2. CrewAI — crews/flows + hierarchical process（角色委派）
- 星数：~52.2k（github.com/crewAIInc/crewAI，API 实测 2026-05）
- 仓库：https://github.com/crewAIInc/crewAI
- 读了哪几个核心文件:行：
  - `lib/crewai/src/crewai/process.py:1-11`（Process 枚举，全部内容）
  - `lib/crewai/src/crewai/crew.py:1465-1574`（hierarchical 入口 + `_create_manager_agent` + `_execute_tasks`）、`:1592-1608`（`_prepare_tools` 注入委派工具）、`:2087-2092`（按 agent 聚合 token）
  - `lib/crewai/src/crewai/tools/agent_tools/agent_tools.py:1-36`（委派工具集 = delegate + ask）
  - `lib/crewai/src/crewai/tools/agent_tools/base_agent_tools.py`（`_execute` 真正的「agent 调 agent」）
  - `lib/crewai/src/crewai/agents/agent_builder/utilities/base_token_process.py`（TokenProcess 真实 token 累加器）
  - `lib/crewai/src/crewai/agent/core.py:185-246`（max_iter/max_rpm/max_execution_time/max_retry_limit 预算字段）
  - `lib/crewai/src/crewai/agents/crew_agent_executor.py:340-341`（`has_reached_max_iterations` 硬熔断）

---

## 二、关键实现拆解（落到实现层）

### A. 编排主控循环

**LangGraph = Pregel super-step BSP 循环。** 每个 node 签名是 `State -> Partial<State>`（state.py:133）。主循环是 `tick()`（_loop.py:583）：
```
tick():
  if self.step > self.stop: status="out_of_steps"; return False   # 步数熔断
  self.tasks = prepare_next_tasks(checkpoint, channels, step, stop, retry_policy, cache_policy, ...)
  if not self.tasks: status="done"; return False                  # 无可执行节点 → 收敛
  if should_interrupt(...): raise GraphInterrupt()                 # human-in-the-loop
  return True
after_tick():
  writes = [w for t in tasks for w in t.writes]
  self.updated_channels = apply_writes(checkpoint, channels, tasks, ...)  # 一次性把本超步所有 writes 归并进 channel
```
- 一个 super-step = 「找出所有被触发的 node → 并行跑 → 把它们的 writes 通过 reducer 归并回 channel → checkpoint」。`self.stop = self.step + recursion_limit + 1`（main.py:1668）是**结构化的 loop 预算**，超出抛 `GraphRecursionError`（main.py:2974）。
- 任务/状态的真实数据结构：channel（带 reducer 的命名 state key）+ `PregelExecutableTask`（待执行节点 + 输入 + retry_policy）。state 不是自由文本，是带 schema 的 TypedDict。

**CrewAI = 顺序/层级两种 Process（process.py），层级本质仍是顺序执行 + 一个 manager agent。**
```python
# crew.py:1465
def _run_hierarchical_process(self):
    self._create_manager_agent()      # 造一个带委派工具的 manager
    return self._execute_tasks(self.tasks)   # 仍然 for task in tasks 顺序跑
# _execute_tasks (crew.py:1529) 核心：
for task_index, task in enumerate(tasks):
    context = self._get_context(task, task_outputs)   # 上游产物作为 context 传入
    task_output = task.execute_sync(agent=exec_data.agent, context=context, tools=exec_data.tools)
    task_outputs.append(task_output)
```
注意：层级模式里每个 task 的 `executing_agent = self.manager_agent`（crew.py:460），由 manager 决定再委派给谁。

### B. 委派 & agent-to-agent（真假层级的分水岭）

**CrewAI 的委派是「把别的 agent 包装成 manager 的 tool」**（crew.py:1489 `tools=AgentTools(agents=self.agents).tools()`）。真正的嵌套发生在 `base_agent_tools.py:_execute`：
```python
# manager LLM 调用 DelegateWorkTool(coworker=..., task=..., context=...) 时触发：
task_with_assigned_agent = Task(description=task, agent=selected_agent,
                                expected_output=I18N.slice("manager_request"))
return selected_agent.execute_task(task_with_assigned_agent, context)   # ← 同步嵌套调用下层 agent
```
这就是**真·agent 生 agent**：manager 在自己的一次 tool-call 内同步 spawn 并阻塞等待 worker 的 `execute_task`。机制是「委派 = 工具调用」，无需独立调度器。约束：manager 不许带普通 tools（crew.py:1474 警告 + 抛错），保证它只做编排不做执行。

**LangGraph 的委派是 `Command(goto=..., update=...)` 显式路由 + `Send` 动态扇出。**
```python
# types.py:749  一个节点返回 Command 即同时完成 状态更新 + 路由
Command(update={...}, goto="worker_node")          # 路由到兄弟节点
Command(graph=Command.PARENT, update={...})        # 向父图回传（子图→父图 handoff）
# types.py:655  map-reduce 扇出：
return [Send("generate_joke", {"subject": s}) for s in subjects]   # 同节点并行多实例
```
真层级靠 **subgraph**：一个编译后的图可作为另一个图的 node，子图用 `Command(graph=Command.PARENT)` 把结果写回父图 channel。嵌套是「图套图」，不是「角色扮演」。

### C. Handoff / 状态传递（单一真相源）

- **LangGraph：state channel 是唯一真相源。** 谁都不「写 handoff 文档」——node 只 return partial state，框架用 `apply_writes`（_loop.py:671）按 reducer（`Annotated[list, operator.add]`，state.py:167-174）归并。多个 node 并发写同一 key 由 reducer 决定合并策略，无歧义、无「谁负责写」的争议。子图→父图用 `Command(graph=Command.PARENT)` 单一通道回传。
- **CrewAI：`task_outputs` 列表 + `_get_context` 是真相源。** 上游 task 的 output 由框架（不是 agent 自己）通过 `_get_context(task, task_outputs)` 注入下游 context（crew.py:1561）。「谁写、谁读」由编排器代码统一裁决，agent 不自行决定 handoff 归属。

### D. 失败 / 重试 / 预算（真实 token 计量在此）

**LangGraph 重试（_retry.py:541-644）—— 结构化退避 + 选择性重试：**
```python
RetryPolicy(initial_interval=0.5, backoff_factor=2.0, max_interval=128.0,
            max_attempts=3, jitter=True, retry_on=default_retry_on)   # types.py:406
# run_with_retry: 失败 → 匹配 policy → attempts>=max_attempts 则放弃
interval = min(max_interval, initial_interval * backoff_factor**(attempts-1))
sleep_time = interval + random.uniform(0,1) if jitter else interval   # _retry.py:627-634
```
+ Loop 预算 `recursion_limit`（结构化步数熔断，非时间）+ `TimeoutPolicy(run_timeout / idle_timeout)`（types.py:440，墙钟 + 空闲双闸）。

**CrewAI 真实 token 计量（base_token_process.py）—— 靠 LLM callback 读真实 usage：**
```python
class TokenProcess:  # 每个 agent 一个实例，PrivateAttr
    total_tokens / prompt_tokens / cached_prompt_tokens / completion_tokens / successful_requests
    def sum_prompt_tokens(self, tokens): self.prompt_tokens += tokens; self.total_tokens += tokens
```
token 由 `TokenCalcHandler`（LLM 回调）从模型响应的 usage 字段累加，crew 收尾时按 agent 聚合（crew.py:2087-2092）。**这是真实 token 计量，不是 turn 计数。** 预算硬闸：`max_iter`（agents/crew_agent_executor.py:340 `has_reached_max_iterations` → 强制收尾）、`max_rpm`、`max_execution_time`、`max_retry_limit`（agent/core.py:185-246）。

---

## 三、与 luca_gstack 的差异（它怎么做 vs 我的痛点）

| luca_gstack 痛点 | 两框架怎么做 |
|---|---|
| 5 个 agent 是 Markdown spec，主 agent 角色扮演，非真实注册 agent | LangGraph：node 是注册到 `StateGraph.nodes` 的可执行单元，编译后才能 invoke；CrewAI：Agent 是 pydantic 对象，`execute_task` 真实跑。两者「agent」都是运行时实体，不是被朗读的文档。 |
| hierarchical 设计了 agent-spawn-agent + Worker Group，但 work-agent 规则禁止嵌套 → 退化单层 | CrewAI：委派=工具，manager 在 tool-call 内同步 `selected_agent.execute_task()` 实现真嵌套（base_agent_tools.py）；LangGraph：subgraph 作 node + `Command(graph=PARENT)` 回传。嵌套不是靠「允许扮演」，是靠机制（工具调用 / 图套图）。 |
| context 预算靠数对话轮数（<20/20-30/>30），无法测 token | CrewAI：`TokenProcess` 从 LLM 响应 usage 真实累加 token，按 agent 聚合；硬闸是 `max_iter` 步数 + `max_rpm`。LangGraph：`recursion_limit` 结构化步数熔断 + `TimeoutPolicy` 墙钟/空闲双闸。**轮数不是预算源，真实 usage / 结构化步数才是。** |
| 「谁写 handoff summary」3 个文件互相矛盾 | LangGraph：没有人写 handoff——state channel + reducer 是唯一真相，框架 `apply_writes` 自动归并；CrewAI：框架的 `_get_context` 统一注入上游 output。**handoff 归属由编排器代码裁决，不交给 agent 各自决定。** |

---

## 四、可借鉴清单

1. **委派 = 工具调用模式**（CrewAI base_agent_tools.py `_execute`）
   `[可借鉴度:需改造]` `[痛点:纸面 hierarchical]`
   把「子 agent」做成主 agent 可调用的 Task/Tool（在 Claude Code 即 subagent dispatch），委派语义=一次工具调用并阻塞等结果，天然就是真嵌套。改造点：Claude Code 单 session 用 Task tool spawn subagent 替代「同步 execute_task」。

2. **真实 token 计量替代 turn 计数**（CrewAI TokenProcess + TokenCalcHandler）
   `[可借鉴度:需改造]` `[痛点:伪 token 预算]`
   从每次 LLM 响应的 usage 字段累加真实 token（prompt/completion/cached/total），而非数对话轮。Claude Code 场景下：用 transcript / API usage 回读真实 token，或退一步用「工具调用次数 + 字符量估算」做更接近的代理，而非纯轮数。

3. **结构化步数熔断 + 退避重试策略**（LangGraph `recursion_limit` + `RetryPolicy`）
   `[可借鉴度:仅理念→需改造]` `[痛点:失败/loop 无界]`
   显式 `max_attempts / backoff_factor / max_interval / jitter / retry_on(选择性)` 是一套干净的失败治理契约。luca_gstack 的 handoff-review「连续失败 N 次」可借这套结构化字段表达（已有 iteration≥3 概念，可升级为 RetryPolicy 形态）。

4. **单一 state 真相源 + reducer 归并**（LangGraph state.py + apply_writes）
   `[可借鉴度:仅理念]` `[痛点:handoff 归属矛盾]`
   核心理念：不让 agent 各自写 handoff，而是定义带 reducer 的共享 state，框架统一归并。luca_gstack 的 `workflow-state.yaml` 可定位为这个唯一真相源，明确「只有编排器按规则写、skill 只 return partial 更新」，从源头消除 3 文件矛盾。

5. **Command：状态更新 + 路由二合一**（LangGraph types.py:749）
   `[可借鉴度:仅理念]` `[痛点:handoff 归属矛盾]`
   一个返回对象同时携带 `update`（写什么）+ `goto`（去哪）+ `Command.PARENT`（回传父级）。handoff 协议可借此统一为「下游 skill 返回 {state 更新, 下一步建议}」单一结构，避免分散在多文件。

---

## 五、风险 / 不适配点（为何不能照搬到 Claude Code 单用户 markdown-spec 场景）

- **两框架都是「真代码运行时 + 真 LLM client」**：CrewAI 的 `execute_task`、LangGraph 的 `compile().invoke()` 是 Python 进程内的对象调用与并行调度。luca_gstack 是 markdown-spec + 单个 Claude Code session 主 agent，没有进程级并行执行器，也没有独立 agent 注册表。委派的「同步阻塞等子 agent」在单 session 下只能用 Task tool spawn subagent 近似，无法真正并行多个对等 agent。
- **真实 token 计量依赖框架持有 LLM client 的 response.usage**（TokenCalcHandler 是 LiteLLM 回调）。Claude Code 主 agent 通常拿不到逐次调用的精确 usage，只能事后读 transcript 或估算——所以「真实 token」对 luca_gstack 是「更好的代理」而非「精确计量」，仍优于纯轮数。
- **LangGraph reducer / channel 模型要求 state 有 schema（TypedDict + Annotated reducer）**。luca_gstack 的 state 是 YAML + markdown，缺乏类型化归并语义；可借「单一真相源 + 谁写谁读由编排器裁决」的理念，但 reducer 自动归并难以在 markdown-spec 落地。
- **CrewAI 的 manager「不许带 tools」约束**（crew.py:1474）能成立是因为它有独立 worker agent 承接执行；luca_gstack 主 agent 既编排又执行，强行剥离编排/执行会与单 session 现实冲突——可借「编排者不直接干活」的纪律，但不能强制结构隔离。

<!-- FILE_END: B1-orchestration -->
