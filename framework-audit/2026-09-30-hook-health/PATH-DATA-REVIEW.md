# 交接正文路径误判检查

## 结论

交接产物已经生成，但不能据此声称 Bash / Python 正文的路径误判已修复。
已发布提交 1ea5d2364cb2b706e8183b3a51ea079b6a1c71da 的七文件修复没有修改 project-scope-guard 或 handoff skill。

## 原始证据

官方 read_thread 核对“继续完成 Skill 仓库更新”会话 01a0f15b-003a-7111-8c7f-1b2610c16be4。
其原始 commentary 确实声明 Bash 写入被拒后改用文件工具；之后实际 fileChange 创建并验证了 OS 临时交接 Markdown。
紧邻其前的 daily_governance pending-disposition 命令 exit 0，因此截图上方那条已运行命令不是失败的交接写入本身。
该分页未提供被拒写入命令的完整工具参数；下述 Python 案例是同类代表复现，不冒充原命令逐字重放。

## 当前行为验证

现有隔离回归：test-project-scope-guard PASS=151 / FAIL=0。
追加诊断仅向隔离的临时 fixture 发送人工工具 payload；不执行 payload 中的 shell / Python 命令，不操作真实共享路径。

| 案例 | 当前结果 |
|---|---|
| Python heredoc：只向临时文件写正文，正文提及 docs/handoff 与 .claude/workflow-state.yaml | NO_PIN deny，仍会误判 |
| 带引号的 cat heredoc：同一临时目标与正文 | allow |
| 文件工具：明确临时 file_path，正文含同样路径字样 | allow |
| 文件工具：真实目标为 docs/handoff/probe.md | deny |
| 文件工具：真实目标为 .claude/workflow-state.yaml | deny |

## 方案判断

handoff/SKILL.md 第 5 步原本已规定：获取 os.tmpdir 后使用 Write 写入交接文档；Codex 通过其文件编辑接口按明确目标落地。
这条结构化路径能区分正文与操作目标，是现有的正确执行路径，应从第一次写入就采用。
不应为了此文档场景豁免任意 Python / shell 正文：解释器正文也能执行真实共享路径读写，未经可靠语义判定的整段遮罩会削弱保护。
真实拒绝不能靠换工具来绕过；只有目标本身明确获准、文件工具仍对同一目标独立判定时，才属于合法的结构化操作。

本次请求是核实是否解决，未修改生产守卫或技能契约，也未把“已有安全写法”记为“通用 Bash 误判已根治”。
本机母仓 / Direct 信任修复仍通过；安装版“新会话”实点验收连续被 Mac 锁屏阻挡，GUI 阶段等待手动解锁。
