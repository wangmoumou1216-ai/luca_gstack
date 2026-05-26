## 记忆 / 上下文系统 调研

> 调研目标：开源成熟记忆框架如何让 learning loop "自转"（自动），用来解决
> luca_gstack 记忆环两端都手动、数周只晋升 2 条事实的问题。

### 深挖项目

| 项目 | 星数(约) | 仓库 | 读的核心文件:行 |
|---|---|---|---|
| **Mem0** | ~38k | https://github.com/mem0ai/mem0 | `mem0/memory/main.py:573-872`（add 管线）、`mem0/configs/prompts.py:15-60`(FACT_RETRIEVAL)、`:176-324`(UPDATE/DELETE 决策)、`:406-460`(get_update_memory_messages)、`:468-944`(V3 ADDITIVE_EXTRACTION) |
| **Letta / MemGPT** | ~17k | https://github.com/letta-ai/letta | `letta/functions/function_sets/base.py:246-391`（memory 编辑工具）、`:283`(rethink_memory)、`letta/prompts/system_prompts/sleeptime_v2.py:1-30`（后台整理 prompt）、`letta/groups/sleeptime_multi_agent_v3.py:127-186`（自动触发）、`letta/agents/letta_agent_v3.py:1218-1262`（context 超限自动 compact）、`letta/services/group_manager.py:264`（turns_counter） |

两者代表两种自转范式：Mem0 = **程序化管线**（代码自动调 LLM 抽取+决策）；
Letta = **Agent 自编辑 + 后台 sleeptime agent**（LLM 把"写记忆"当工具，每轮调用 + 计数器触发后台整理）。

---

### 关键实现拆解

#### A. Mem0：自动抽取 → 自动 ADD/UPDATE/DELETE 决策（无人工步骤）

**1. 触发点：`add()` 是普通函数调用，infer=True 默认开启全自动 LLM 管线。**
`main.py:581` `infer: bool = True` → `:659` 直接进 `_add_to_vector_store`。
调用方只是 `m.add(messages, user_id=...)`，没有任何"打印命令让人去跑"的中间态。

**2. Phase 1-2：抽取事实（main.py:699-768）**
```python
# Phase 1: 先用 embedding 检索可能相关的旧记忆（top_k=10）
existing_results = self.vector_store.search(query=parsed_messages, ...)
# UUID→整数映射，防止 LLM 幻觉出新 ID（main.py:716-721）
# Phase 2: 单次 LLM 调用抽取事实
system_prompt = ADDITIVE_EXTRACTION_PROMPT      # prompts.py:468
response = self.llm.generate_response(..., response_format={"type":"json_object"})
extracted_memories = json.loads(response).get("memory", [])
```
抽取 prompt（`FACT_RETRIEVAL_PROMPT` prompts.py:15）核心规则：从对话里抽"facts"，
不相关返回 `{"facts": []}`，少样本里 "Hi." / "There are branches in trees" → 空。
**判断"什么值得记"的逻辑全在 prompt 里，由 LLM 执行，不靠人。**

**3. ADD/UPDATE/DELETE 决策（DEFAULT_UPDATE_MEMORY_PROMPT prompts.py:176-324）**
这是最关键的"自动晋升/合并冲突"逻辑。把新事实 + 现有记忆喂给 LLM，让它对每条输出 event：
- **ADD**：新信息→生成新 ID
- **UPDATE**：同主题但信息更全 → 保留同 ID、合并文本（"likes cricket"+"plays cricket with friends"→后者）
- **DELETE**：矛盾信息 → 删旧（"loves pizza" 遇 "dislikes pizza" → DELETE）
- **NONE**：已存在 → 不动
LLM 直接返回结构化 JSON（prompts.py:439-449），代码据此执行写库，**无人工 review**。

**4. 去重双保险**：除 LLM 语义判断外，还有 md5 hash 精确去重（main.py:799-803）
+ 0.95 相似度阈值跳过（main.py:422-426）。

**5. 检索（main.py:1126 search / 1343 _search_vector_store）**：向量相似度 + 可选 reranker
(main.py:349-354) + 实体 boost（`_compute_entity_boosts` main.py:1440）。无显式 recency 衰减，靠 `created_at` 元数据。

#### B. Letta：LLM 把"写记忆"当工具 + 后台 agent 自动整理

**1. 前台自编辑：记忆编辑是 LLM 的普通 function call（base.py:246-391）**
```python
def core_memory_append(agent_state, label, content):   # base.py:246
    new_value = current_value + "\n" + content
    agent_state.memory.update_block_value(label=label, value=new_value)
def memory_replace(agent_state, label, old_string, new_string):  # base.py:311  精确替换
def rethink_memory(agent_state, new_memory, target_block_label): # base.py:283  整块重写
```
system prompt（memgpt_v2_chat.py:39-44）明确告诉模型："编辑你自己的长期记忆是你
作为有意识存在的关键能力" → **模型在正常对话中自发决定何时写记忆，无需外部脚本。**

**2. 后台 sleeptime agent 自动触发（sleeptime_multi_agent_v3.py:135-145）**
```python
turns_counter = bump_turns_counter_async(...)                 # 每轮 +1
if turns_counter % self.group.sleeptime_agent_frequency == 0: # 计数器取模触发
    for sleeptime_agent_id in self.group.agent_ids:
        self._issue_background_task(...)   # 异步后台 run，不阻塞前台
```
`group_manager.py:264`：`turns_counter = (turns_counter+1) % frequency`。
后台 agent 用 sleeptime_v2 prompt（"You run in the background, organizing memories…
make sure blocks are comprehensive, readable, up to date, no redundant/outdated info"）
→ **这就是 Letta 的"自动 consolidation/promotion"：定期由 LLM 重整、去冗余、去过期，等价于 luca_gstack 缺失的自动晋升。**

**3. context 超限自动 compact（letta_agent_v3.py:1218-1262）**
捕获 `ContextWindowExceededError` → 自动 `self.compact(...)`（递归摘要驱逐旧消息），
trigger="context_window_exceeded"。摘要触发器是事件驱动，不是人手动跑。

---

### 与 luca_gstack 的差异（它怎么自动 vs 我的手动断点）

| 环节 | Mem0 / Letta（自动） | luca_gstack（手动断点） |
|---|---|---|
| **写入触发** | Mem0 `add()` 代码直接调 LLM；Letta LLM 把写记忆当工具每轮自发调 | `session-sync.mjs:67,71` **只 `print` 出 append_episode/propose_semantic 命令字符串**，从不执行 → 写入永不发生 |
| **抽取"什么值得记"** | LLM 跑 FACT_RETRIEVAL / sleeptime prompt 自动判断 | 无自动抽取器；要人读对话手敲 `--summary --decision` |
| **合并/晋升** | Mem0 LLM 出 ADD/UPDATE/DELETE 直接写库；Letta sleeptime agent 计数器到点自动重整 | `review_candidates.py:97` 必须人工 `--promote --reviewer` 才晋升；consolidate 默认 dry-run 只读 |
| **冲突处理** | LLM DELETE 矛盾项 + hash/0.95 阈值去重 | 无自动冲突消解 |
| **净产出** | 每轮自动累积 | 数周仅 2 条 promoted facts；eval 0 字节 |

**根因复现确认**：`session-sync.mjs:67/71` 确为"打印命令"而非执行；
`review_candidates.py:101` 确实强制 `--promote requires --reviewer`。两端皆手动 = 环不转。

---

### 可借鉴清单

1. **[可借鉴度: 需改造] [痛点: 写入端打印命令不执行]**
   把 session-end hook 从"打印 append_episode 命令"改成**真正执行一次 LLM 抽取**：
   仿 Mem0 `add(infer=True)`，hook 里直接调一次 Claude（或本地小模型）跑 FACT_RETRIEVAL
   式 prompt，输出 `{"facts":[...]}` 后直接写 episodic/candidate，无人工。这是让环自转的**最小机制**。

2. **[可借鉴度: 直接可用] [痛点: 合并/晋升靠人]**
   移植 Mem0 `DEFAULT_UPDATE_MEMORY_PROMPT`(prompts.py:176-324) 的 **ADD/UPDATE/DELETE/NONE** 四态决策。
   候选写入后用一次 LLM 调用对照已有 promoted-facts，自动给出 event，替代 `--promote --reviewer` 人工门禁。
   prompt 几乎可直接复用，改成中文 + skill-rule domain 即可。

3. **[可借鉴度: 需改造] [痛点: consolidate 永远 dry-run]**
   仿 Letta sleeptime 的 **turns_counter % frequency** 触发：在 route-guard 已有的"对话轮数计数器"
   上挂一个 frequency（如每 N 轮 / 每个 Phase 结束），到点自动跑一次 consolidate+promote（非 dry-run），
   而不是等人手动。Letta 证明"计数器取模 + 后台 run"足以让 consolidation 自转。

4. **[可借鉴度: 仅理念] [痛点: 抽取质量/防幻觉]**
   Mem0 的 **UUID→整数映射防 LLM 编 ID**（main.py:716-721）+ **md5 hash 精确去重 + 0.95 阈值**
   双保险，理念可借鉴：LLM 自动写入必须配廉价的确定性去重，否则文件型存储会膨胀。

5. **[可借鉴度: 仅理念] [痛点: eval 空]**
   Letta `rethink_memory`/sleeptime "去冗余去过期" = 把记忆库当可被 LLM 持续重写的活文档。
   luca_gstack 的 eval 层可改为：每次 consolidate 时让 LLM 评估候选质量并打分，自动填充当前 0 字节的 eval。

---

### 风险 / 不适配点（Claude Code 单用户 + 文件型存储）

- **无常驻进程**：Letta 的后台 sleeptime agent 依赖异步 task / 服务端常驻；Claude Code 是
  单次 session 进程，hook 结束即退出。**不能照搬"后台 run"**，只能改成 **hook 同步执行一次轻量 LLM 抽取**
  （SessionEnd / Stop hook 里 spawn 一个一次性 LLM 调用，写完即退）。
- **LLM 自动写入成本/失控**：Mem0 每次 add 都至少 1-2 次 LLM 调用。单用户文件型场景要控频
  （如只在 session 结束 / Phase 结束跑一次），否则 token 成本和误写风险高。
- **文件型存储无向量库**：Mem0 检索靠向量库 + reranker；luca_gstack 是 jsonl/yaml。
  自动写入可借鉴，但**自动检索注入**只能退化为关键词/recency（现有 search_memory.py 已是关键词），
  不要强行引入向量依赖。
- **"无人 review 直接晋升"与现有红线冲突**：CLAUDE.md 明确要求稳定事实先走 candidate→review。
  借鉴 Mem0 全自动晋升时，建议保留一个**轻量自动门禁**（LLM 出 event + 必填 evidence 字段校验），
  而非完全去掉 review，折中满足红线。
- **bootstrap 问题本质**：luca_gstack 之前 Hermes 废弃也是"候选生成没接线"。核心不是缺脚本，
  是**没有任何东西自动调用写入脚本**。最小修复 = 让 SessionEnd hook 从 `print(cmd)` 改成 `exec(cmd with LLM-extracted args)`。
