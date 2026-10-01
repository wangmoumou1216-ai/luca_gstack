---
name: grilling
description: "Stress-test a plan through design-tree rounds: ask all independent ready frontier decisions with recommendations, wait for real answers, and confirm shared understanding."
license: MIT
metadata:
  recommended-model: core-execution
---

# Grilling — design tree frontier

把 plan、decision 或 idea 映射为 design tree：每项决策的分支和前置都明确。事实查证归 agent；
价值取舍、命名和范围选择归真实用户。这里只澄清，不扩大写入、网络、Git 或外部权限。

## 1. 绑定树与 caller

确认待审目标、已接受决定、证据、未决项及依赖。内部调用保留原 U-ID、scope、
resume_target、authority_record 和权限交集，返回同一 owner，不创建第二任务或 workflow 节点。
每个前置标 settled / unresolved / researching；决策只由真实答案 settled，事实只由实际证据 settled。

## 2. 查事实并计算 frontier

frontier 是所有前置已 settled 的决策。可查的环境事实先自行读取或委托一名 native executor；
派发仍守 Plan、模型角色、串行和现有权限。running research 是 unsettled prerequisite，
只阻塞依赖它的问题；其余 ready frontier 可先询问。没有权限或资料时标缺证据，不让用户猜事实。

## 3. 一轮询问全部 ready 独立决策

编号每项问题并给推荐与理由；每项只承载一个独立选择。所有 ready 问题同轮呈现：

```text
❓ Q1 — <title>: <choice and relevant facts>
➡️ Recommended: <answer and reason>

❓ Q2 — <independent title>: <choice and relevant facts>
➡️ Recommended: <answer and reason>
```

若 Q2 的答案依赖尚未回答的 Q1，Q2 属于后轮。此精确 frontier 例外来自 office Voice；
普通 Human Gate、平台选择和效果批准仍由各自合同处理，不能夹带实施许可。
用可用 structured widget 呈现，容量不足则完整编号纯文本；缺 widget 不允许自行选择。

## 4. 等待真实答案、重算

发问后等待。分别记录用户实际回答的项，未答项保持 unresolved；模糊项只澄清对应决策。
答案可改变树、废弃分支或暴露新问题，每轮重算 frontier。推荐、沉默、AFK 和 agent 模拟
都不是答案。正在查证的事实返回后按真实证据更新，再算下一轮。

## 5. 需要领域文档时组合 domain-modeling

只有术语、实体归属或关系边界影响当前合同，才完整读取 `../domain-modeling/SKILL.md` 并调用。
传入原 U-ID、相同 scope/resume_target、具体 domain_question、trigger_condition、现有
vocabulary owner 与 inherited authority/effect intersection；权限只能取交集。
没有 exact artifact 写权只返回模型建议，采访回答不自动授予文档写权。domain 返回的未答
dependent 问题回原 owner 等待；resolved term 按已批准 owner 落点，不另造 root glossary。

## 6. shared understanding 收尾

frontier 为空且每个分支已访问、接受或被用户明确延后时，列出 settled 决策、仍有的证据
限制与 deferred 项，向用户确认 shared understanding。用户确认后才完成；未确认保留
NEEDS_CONTEXT。行动需要另外有效的执行授权。返回原 caller 的决定/证据/未决依赖及恢复点。

完成证据：每轮仅包含当时 ready 独立项、每个推荐有理由、可查事实已实际查证、真实答案
驱动树变化、无 silent assumption、closing confirmation 真实取得。来源：source33，MIT，
pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`；source06 的组合能力保持同一 caller 权限。

<!-- FILE_END: grilling/SKILL.md -->
