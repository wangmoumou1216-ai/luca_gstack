# Outcomes — 每种 state 的内容

形成结果前完整读取；状态转换、映射和外部效果真值由 tracker-contract 承担。
这里定义交付内容，所有外发文本仍需 AI 声明、operation marker 和明确授权。

## Ready for agent

完整读取 agent-brief，起草 current/desired/key interfaces/独立 acceptance/out-of-scope 合同。
验证结果放入事实；未执行检查明确写未执行。正常 triage 若仍有可改变实现的待答项，先 needs-info，
不能让 AFK agent 猜人类选择。PR 针对现有 diff 的剩余工作、review gaps 和已确认约束。
待精确授权后才可 post brief 并条件写 role；未发送预览不能称“已附 brief”。

显式 role override 缺 brief 时必须问是否补写。若维护者明确拒绝补写，保留其 override、
缺失及风险，不能宣称完整 agent-ready contract 已具备；不把询问当补写授权。

## Ready for human

使用同一 brief 结构，并加“为什么不能委托/人类下一步”：具体判断、外部访问、设计选择、
人工测试、权限或合并责任。PR 可以是人类 merge 前的剩余检查与责任人；本技能不 merge。
“复杂”“需要人”不是充分理由，要说明什么必须由真人完成。

## Needs info

保存旧 notes 中已解决内容和新回应，问题要具体可回答，不重复采访。离线/无发送权先给下列
comment 草稿；真正发送时按 tracker-contract 添加声明和 marker：

```markdown
## Triage Notes

**What we've established so far:**
- <已解决事实/已接受决定，以及真实来源和验证结果>
- <旧 notes 的已答问题及新 reporter 回应>

**What we still need from you (@reporter):**
- <明确待答问题，如复现步骤、输入、预期/实际输出或环境>
- <哪个未决决策影响哪项验收；已知内容不再询问>
```

记录最新 notes 的真实时间/ID；新 reporter 活动后可重新 needs-triage。没有实际发送就保留本地
草稿来源/时间，不冒充远端 last triage notes。信息不足/权限不足区分清楚，不能编 reporter 回答。

## Needs triage

保留维护者仍待评估的状态，给当前已查证材料和下一步；部分进展 comment 可选且独立授权。
正常 unlabelled 先进入此态；category 仍恰一，不用 needs-triage 代替 category 分类。

## Wontfix：先分原因，再列效果

| 原因 | 要交付的说明 | KB 效果 |
|---|---|---|
| Already implemented（任何 category，Issue/PR） | 行为已存在的概念、public interface/真实实现证据及如何使用；说明请求与现有能力为何等价 | **无拒绝 KB 写入**；已建功能不能污染历史拒绝 |
| Rejected bug（Issue/PR） | 礼貌而实质的解释、实际证据与决定；不能把无法复现自动当作已拒绝 | **无 KB 写入** |
| Rejected enhancement（Issue/PR） | 维护者确认的持久拒绝理由、concept 记录链接及 prior request | 仅按 out-of-scope 的 exact-path 授权/CAS 创建或更新；同 concept 追加不重复建文件 |

临时“忙/以后再做”是 deferral，不作为持久拒绝理由；交维护者选合适 state，不能捏实质原因。
历史拒绝匹配由真实维护者 confirm/reconsider/disagree；confirm 后才采用旧决定处理新请求。
reconsider 的新请求继续正常 triage；旧 KB 的删除/修订需要另获精确授权，旧 Issue/PR 不自动 reopen。

形成 closing comment 预览后，把 state update、comment、close 和 KB patch 分别列出，取得对应
真人权限并验证条件写。KB 没写权只交其预览；不能关闭请求冒充整套 rejected enhancement 流程完成。
已实现与 rejected bug 也需明确授权才能 comment/close；本内容规则本身不提供任何 tracker 操作权限。

<!-- FILE_END: issue-triage/references/outcomes.md -->
