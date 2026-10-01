# Out-of-Scope — concept 拒绝知识库

gather 历史拒绝或准备任何 KB 效果前完整读取。采用 source16 OUT-OF-SCOPE 方法，
把 institutional memory 与 concept 去重落到已授权项目的既有 `.out-of-scope/` owner；
这不是全局 memory、根 CONTEXT 或自动脚手架。

## 1. 读取与概念比较

按当前 scope 完整读取已授权目录的所有 Markdown 记录，而非只搜请求词。
缺目录只记录不存在；缺读权给预览/请求精确范围，不跨项目查找或建目录。
一文件一 concept；dark-mode、plugin-system、graphql-api 等只是格式示例。
“night theme”可能与 dark-mode 同概念，但相关词不等于同一个请求；比较行为、边界和旧理由。

匹配时展示旧文件/决定/实质原因和 prior requests，向真实维护者提供三选一并等待：

- **Confirm**：仍拒绝这个 concept；新请求可追加到同一文件的 Prior requests，再按授权拟
  comment/close，不创建重复文件。
- **Reconsider**：改变旧决定；新请求回正常 triage。旧文件修改或删除要另获精确 path/patch
  授权及 CAS，选择 reconsider 本身不等于删除权。保留旧请求作为历史，不自动 reopen。
- **Disagree**：相近但不同 concept；解释区别后继续新请求 triage，不污染原记录。

维护者未答时匹配仅 proposal。记录多个候选和不确定性，不能取一个相似词自动 wontfix。

## 2. 何时允许写

**只有维护者确认 rejected enhancement 的 wontfix（Issue 或 PR）才走 KB 记录。**
already-implemented 不记录拒绝，rejected bug 也不写 KB；具体 closing 内容归 outcomes。
临时“太忙”是推迟而非持久拒绝，先向维护者澄清，不能把它包装成项目哲学。

复核以下三件事后才写：已接受 concept/实质持久原因；当前已授权 scope 内的精确
`.out-of-scope/<kebab-case>.md` 目标；实际文件 preimage（absent 或 mode/hash/字节）与批准 patch。
目录读权不授予创建/修改/删除权，tracker close/send 权也不授予文件写权。
没有 KB 写权，交完整内容/patch 预览并说明缺口，不关闭请求冒充整套已完成。

有同 concept 文件：写前实际重读，保留原理由与用户编辑，只把新的真实 Issue/PR link/title
追加到 Prior requests；同一个 request 已存在就不重复追加。不为同 concept 另造文件。
没有同 concept 文件：在精确批准的新 path 创建，记录 concept、decision、实质原因和首个 prior request。
短 descriptive kebab-case 名称要能看出 concept，不以 item 编号命名。

## 3. 记录格式与原因

使用短设计说明的自然段、示例或代码解释理由，而非只存“不想做”的数据库标签。
必须有 concept 标题、明确 decision、持久 substantive reason 和真实 prior requests。
原因可来自项目 scope/philosophy、可验证技术约束或真实战略取舍；区分人类决定与代码事实。
示例格式（只说明结构，不替当前项目作决定）：

```markdown
# Dark Mode

**Decision:** 维护者确认将用户主题配置放在下游，当前内容生成器不实现此能力。

## Why this is out of scope

当前 ThemeConfig 只接受构建时解析的单一 ColorPalette。运行时多主题会要求组件主题解析、
上下文传播及用户偏好持久化；这与项目专注内容生成的已接受边界不同。下游消费者拥有展示主题。
这里需要对应实际接口证据和维护者已确认的取舍，不能复制示例作为事实。

## Prior requests

- [issue #42](<真实链接>): Add dark mode support
- [PR #87](<真实链接>): Night theme implementation
```

reason 需要让首次读到的人明白“为何拒绝”，不是临时资源不足。若 existing ADR 与拟理由冲突，
先交原决策 owner/维护者澄清；不静默改 ADR 或全局语义记忆。

## 4. 效果顺序与 reconsider

正常 rejected enhancement：确认拒绝 → 检查现有 concept → 取得 exact KB patch 权并 CAS 写入/
读回 → 在获批 comment 中链接真实 KB → 按获批 conditional write close/state。
每个 tracker 动作单独需要明确真人授权。没有真实 KB 写入不能把链接草稿称为已保存记录。
应用一个效果后失败/unknown，保留其 pre/postimage，停止其余动作并据实报告；不假装事务或自动回滚。

reconsider 要修改/删除旧 KB：单独展示 exact path、当前 preimage、拟 revision/delete、保留的历史、
授权和验证方式，获批后以现有文件 CAS 修改。删除不是默认；未获批准旧 KB 保留，当前新请求
按已接受的新方向 triage并记录该差异，不自动重开旧 Issue/PR。任何 drift 重新读取后停止旧 patch。

KB/file 与 tracker 的 pre/postimages、readback、真实 effects 独立记录，详细协议消费 tracker-contract；
本 reference 不创建第二个执行器或绕过 controlled-change、项目隔离与既有 effect gate。

<!-- FILE_END: issue-triage/references/out-of-scope.md -->
