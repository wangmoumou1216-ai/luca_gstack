# ADR-0006: 让学习闭环自转

状态: 提议 → 度量先行 — 经辩论重大修订

> ⚠️ 辩论重大修订：
> 1. 原"Stop hook 执行外部 LLM 抽取"**不可行**——`ANTHROPIC_API_KEY` ABSENT、无 `.env`（订阅 OAuth）。
> 2. 重设计为 Stop hook 返回 `decision:"block"`+`reason`，由当前模型自己跑确定性脚本（官方文档 code.claude.com/docs/en/hooks 验证可行，`stop_hook_active` 防循环；block 须有条件，否则 user-hostile）；并砍去 Mem0 去重/合并 + `turns%N` 计数器（过早优化）。
> 3. **但最终降级为"先度量"**：影响取决于记忆是否被有用读取，证据（5 episode/~2 facts 数周/eval 0 字节）显示检索价值近噪声。评分对比：自动写 Score 6.0 < **冻结写侧 Score 10.0**。先用 10 个 session 度量 `search_memory` 命中是否改变动作：≥~3 次有用→建廉价重设计版；≈0→冻结写侧（删 7 写脚本，留 2 读脚本 + 静态 fallback）。
> 详见 `../DEBATE-CONCLUSION.md`。

## 背景
- A4: 3 层记忆 + observe→candidate→review→promote 管线齐全，但**闭环从不自转**：
  - 写入端：`session-sync.mjs:65-72` 只 **print** 出 `append_episode`/`propose_semantic` 命令字符串，从不执行。
  - 晋升端：`consolidate_memory.py:573` / review 需人工 `--promote-ready --reviewer`。
  - 净产出：数周仅 2 条 promoted facts；eval 系统全 skill 0 字节；run-log 0 行。
  - 这正是 Hermes 自己诊断出、却从未修复只是搬家的"bootstrap 陷阱"。
- B2 源码级结论（Mem0 47k+★、Letta）：
  - **成熟系统没有"打印命令等人跑"的中间态**。Mem0 `add(infer=True)`（main.py:581,659）在调用点直接跑 LLM 抽取（FACT_RETRIEVAL_PROMPT, prompts.py:15-60）写库。
  - **晋升靠 LLM 决策而非人工**：`DEFAULT_UPDATE_MEMORY_PROMPT`（prompts.py:176-324）喂"新事实+旧记忆"给 LLM 自动 ADD/UPDATE/DELETE/NONE，合并相似、删矛盾、跳重复。prompt 近乎可直接移植。
  - **定期触发**：Letta sleeptime 用 `turns_counter % freq == 0` 定期后台重整（sleeptime_multi_agent_v3.py:139-145）。
  - **确定性双保险**：md5 hash + 0.95 相似度阈值兜底防膨胀（main.py:799-803）。

## 决策
做，最小自转改造（尊重现有 candidate→review 红线，不全自动晋升）：
1. **写入端去手动**：把 Stop/SessionEnd hook 从 `print(cmd)` 改为**直接执行**一次轻量 LLM 抽取（仿 `add(infer=True)`），自动写 episode + 自动 `propose_semantic`（写 candidate，不直接 promote）。这一步就解开了主要堵点（堵点在 propose，现在只打印）。
2. **晋升半自动**：移植 Mem0 的 ADD/UPDATE/DELETE/NONE 判断做**候选预处理**（自动合并/去重/标矛盾），但**保留人工或轻量自动门禁做最终 promote**——满足 CLAUDE.md "stable fact 必须经 review" 红线（B2 也建议此折中：LLM 出 event + evidence 字段校验的轻量自动门禁）。
3. **定期触发**：挂在 route-guard 已有的轮数计数器上，`turns % N == 0` 自动跑一次 consolidate（非永远 dry-run）。
4. **确定性去重**：自动写入配 md5 + 相似度阈值兜底。

## 理由
ROI：影响=5（决定整个记忆系统是否还有 ROI——否则 12 脚本 read-thin 是纯负债），可行=3（hook 内 LLM 调用 + 移植 prompt），成本=4。Score 3.75，P1 并列首位。

## 后果
- 影响文件：`session-sync.mjs`（print→execute）、`propose_semantic.py`/`consolidate_memory.py`（接 LLM 预处理 + 计数触发）、eval 文件统一（与 ADR-0001 协同）。
- 风险：中。Claude Code 无常驻进程——不能照搬 Letta 后台 run，改成 **hook 内一次性 LLM 调用写完即退**；文件型存储无向量库，自动**检索注入**保持关键词/recency，不引向量依赖；自动写入务必配确定性去重防文件膨胀。
- 验证：跑 3-5 个真实 session 后，episode 与 candidate 计数应自动增长（无需手敲命令）；promotion 队列不再恒为 0；eval 文件被实际写入。

## 度量先行实现（measure-first，当前已落地）

> 上述「决策/后果」节是**被降级**的原方案，保留作上下文。当前实际落地的只有轻量埋点，不重建记忆系统、不在 hook 内调用 LLM、不改 session-sync 的 print→execute。

埋点（全部在 `memory/scripts/search_memory.py`，fail-safe，绝不影响 search 输出）：
1. 每次 `search_memory.py` 检索追加一条 JSONL 到 `memory/retrieval-log.jsonl`：`ts / type=search / session / query / result_count / top_id / top_score / top_layer`。任何写入失败（磁盘/权限）被吞掉，search stdout 字节级不变。
2. `--mattered`：可选、最小的主观信号入口；为给定 query 追加一条 `type=mattered` 标注（不执行检索），用于记录「这次检索真的改变了某个动作」。
3. `--retrieval-stats`：在日志上汇总 total searches / searches-with-hits / mattered 计数 / distinct sessions，足以套用下面的决策规则。
4. `retrieval-log.jsonl` 为运行时数据，已在 `.gitignore` 与其他 episodic/candidate 运行时文件一致忽略。

### 决策协议（review 时机与裁决）
- **时机：** 约 10 个 distinct session（无真实 session id 时以 `--retrieval-stats` 的 distinct sessions = distinct 日期代理）后运行 `python3 memory/scripts/search_memory.py --retrieval-stats` 复盘。
- **裁决（基于客观 + 主观双信号，沿用 DEBATE-CONCLUSION 第五节并修正）：**
  - `mattered` ≥ ~3（检索确实改变了动作）→ 记忆值得喂，影响→4、Score 8 > 冻结 → 建 §4.2 的廉价重设计版。
  - **客观低使用**：窗口内 `searches` ≈ 0（几乎没发生检索）或 `searches-with-hits` ≈ 0（检索几乎从不命中）→ 读侧客观上未被使用 → **冻结写侧候选**：删/归档 7 个写脚本，保留 2 个读脚本 + SF-001~005 静态 fallback。
  - **`mattered` ≈ 0 但 `searches-with-hits` 不低** → **结论不充分（inconclusive），不得自动冻结**：缺主观标注 ≠ 读无用（`--mattered` 容易漏记）。处置：人工抽查这些命中检索是否真改变了动作，或延长测量窗口并主动用 `--mattered` 标注后再裁决。**严禁仅凭"mattered 计数为 0"就删除 7 个写脚本。**
