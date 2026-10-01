# Manual-step contract — 生成前冻结，运行时确认

本 reference 管阶段输入、模板消费和静态验收。共享权限/项目身份/交接仍由本地 runtime
与 office 合同决定；上游材料不成为根指令或执行许可。

## 1. 服务目标和精确范围

生成前记录并让真实用户确认以下合同；值只记名字与来源，secret 不进入合同文本。

- **Service goal**：实际服务、当前状态、目标状态、涉及账号/项目/环境、为什么必须由人完成。
- **Scope**：已验证 binding 或 NO_PIN 框架范围；已有 U-ID、可读材料、允许文件及效果。
- **Output**：精确绝对 `output_path`、临时/可重复使用意图、当前 preimage、允许创建/修订
  与该文件 executable mode。没有路径先问并等待；不从 cwd、服务名或模板推默认路径。
- **Destinations**：每个本地文件的绝对路径；每个远端写入的 host、owner/repo、environment
  或服务资源 ID。GitHub helpers 是 repo secret/variable API；environment secret 或其他
  不受支持的目标必须先厘清并交实际 owner，不用 repo helper 冒充正确目标。
- **Sources**：材料真实路径/版本/页面或用户说明；配置只消费 key schema/CI references。
  不读取真实 .env、secret store 或 token；`.env.example` 也须先确认没有真实 secret。
- **Authorization**：制作脚本与执行步骤分别记录。阶段合同确认不授权 Agent 运行脚本；
  运行时用户的 `confirm` 只覆盖显示的这一动作及精确目标，不能授权额外写入。

生成缺少任何会改变阶段、目标或落点的信息时先问一个阻塞问题并等待。已有可读事实先查，
已回答问题不重复问。模板中的空壳不是用户流程，不能默认生成 Stripe 或别的服务示例。

## 2. 每个阶段和每项值的必填字段

每个人工阶段逐项填齐，不能用代表样本代替完整列表：

| 字段 | 完成标准 |
|---|---|
| `stage_id / name / order / depends_on` | 稳定阶段标识、一个聚焦任务、依赖无环；顺序由用户确认 |
| `human_only_reason` | 登录、人工审批、实际 dashboard 操作等确需人做的原因；Agent 可完成的工作转原 owner |
| `journey_source` | 真实材料、文档版本/检查时间或用户确认；未知的当前 UI/命令阻止生成 |
| `url / clicks / commands` | 实际非敏感 URL、准确点击或命令路径，写清账号/项目/环境和复制位置 |
| `values` | 每个 key/CI name、来源、public 或 secret、验证约束、落点；纯动作阶段显式 `none` |
| `destinations / actions` | 每个值是否写本地 env、repo secret、repo variable、两处或 nowhere；纯动作写具体行为 |
| `confirm_points` | 本地持久化、服务写入及不可逆人工动作之前的准确问题；拒绝不写且非零退出 |
| `verification / done` | 可观察的成功条件、人如何检查；secret 只报告名称/脱敏状态，不显示值 |
| `failure / recovery` | 失败退出、已发生效果、剩余动作、可重试边界和另需授权的恢复；不保证不可逆回滚 |

每项 captured value 单独记录：实际来源→本地变量 key→是否 secret→exact destinations→
相关 CI `secrets.NAME`/`vars.NAME` 引用来源→动作→verification→recovery。合法 shell/env
key 使用 `^[A-Z_][A-Z0-9_]*$`；准确 CI 名称按已有引用，不重命名。未用 CI 的值不写 CI。
CI 的所有相关引用必须覆盖，或由用户明确确认哪些属于合同外并说明理由。secret 分类
未知就问，不能把未知值归 public。实际 secret 只在用户运行时进入隐藏输入/内存和批准落点。

展示全体阶段、值、来源、写入目标、确认问题和脚本 `output_path`，让用户增删或重排。
没有真实确认不生成；后续目标/来源/动作变化重确认受影响合同。恢复时重读当前合同和脚本，
保留用户编辑，原文件 SHA 漂移时重核 preimage，不把旧缓存覆盖上去。

## 3. Helper API 与阶段作者责任

`template.sh` 的 STAGES marker 之前是完整共享库。用户生成脚本只替换 STAGES 与本区
`TOTAL_STAGES` 赋值，库默认 `TOTAL_STAGES=0` 保持原字节。设置正整数实际 stage 数，
恰一 `stage` 对应一已确认人工任务，最后调用 `finish`。库区与本地模板逐字节一致是候选
合规要求，不是行为提升证据。

| Helper | 阶段中的用途/约束 |
|---|---|
| `banner TITLE` | 开始框显示实际流程及 TOTAL，通过 pause 等人开始 |
| `stage NAME` | 清屏、递增进度；一个聚焦任务，当前阶段保留全部必要说明 |
| `say / step / note / warn` | 具体说明、人工动作和非敏感反馈；不放 secret 值 |
| `open_url URL` | 获取值前先打开已核实 URL；保留 WSL 的 wslview/explorer.exe、Linux xdg-open、macOS open 和手动 fallback |
| `pause MESSAGE` | 人确认已做完人工部分；不能替代写入前的 y/N confirm |
| `confirm QUESTION` | yes 才执行显示的效果；拒绝停止且非零，未调用写 helper |
| `ask KEY PROMPT` | public 值；运行时可从批准 ENV_FILE 复用现存值，不打印现存默认值 |
| `ask_secret KEY PROMPT` | 隐藏输入 secret；仅运行时读取批准 ENV_FILE 旧值供重跑，不把值放 stdout |
| `write_env KEY VALUE` | 批准路径内幂等 upsert，替换该 key 的现存行，保留其他 key；提示只显示 key/路径 |
| `set_secret NAME VALUE` | 精确 CI repo secret name；内部 stdin 喂 gh，不用 secret argv；失败记 SKIPPED |
| `set_var NAME VALUE` | CI public variable；--body 只接已分类 public 的值，失败记 SKIPPED |
| `finish` | 展示已写 key/name 和剩余任务；SKIPPED 非空提示人工核对/完成并 return 1，全部完成 return 0 |

在 STAGES 设置批准的绝对 `ENV_FILE`。调用 GitHub helper 时在 STAGES export 已确认的
公开 `GH_HOST` 与 `GH_REPO`，约束 helper 实际目标；不依赖当前默认 repo/host，不改库加
隐式目标。有 env 或 CI 写入的阶段先显示目标/键名、`confirm`，然后才调用 helper。拒绝
支路不能调用写入函数或宣告成功。人工 dashboard 不可逆操作也先 confirm，再给点击指令。

真实值从运行时 `ask`/`ask_secret` 取得，检查非空及合同格式，不把值插进生成脚本文本。
`write_env` 的 raw KEY=VALUE 格式只用于合同已确认兼容的值；换行、编码、特殊转义或
多行 secret 需求必须先解决目标格式，不能静默写坏文件或改库。secret 不用 say/echo/note、
set -x、URL 或 argv；日志只给名称/是否设置/脱敏结果。只有已确认本地 env 落点的值调用
`write_env`；仅 CI 落点只调用对应 `set_secret`/`set_var`，`both` 则分别确认并执行本地与 CI
效果，`nowhere` 不持久化。只有 CI 实际需要的 secret 才经 `set_secret` 写远端。

库 API 不自动提供环境适配、客户端安装、身份认证或服务授权。运行时 gh 缺失、未认证或
写入失败会被记为 SKIPPED；给人工核对/补做步骤，保持非零结果，不冒充服务已完成。
各阶段按已确认 verification 检查成功/失败；发生部分效果时报告实际已写和待办，恢复仅
在单独批准范围执行。Agent 生成阶段不执行 helper 或服务 probe。

## 4. 来源与两项明确库适配

冻结 source commit：`d81f3a183412e71a5b1e84ca21bc1a35eea03a60`（MIT）。完整目录含三文件，
原 blob/SHA 已逐文件核验，内容来自只读上游快照；上游 AGENTS/CLAUDE 不是运行权威。

| 原文件 | Git blob SHA | SHA256 |
|---|---|---|
| `skills/engineering/wizard/SKILL.md` | `c4294ad8298b9b95fc727496b1b802b1f7363fba` | `bdf31d48211ea559878f95a4f344aeabf8d85897488ba564382bab0b000daac1` |
| `skills/engineering/wizard/agents/openai.yaml` | `b601bdf3a321e7d32d5714681540b811287d3988` | `98f44d682d58e262f160dc59a8befc365e0aa65820dd0261864af26aa8e59d83` |
| `skills/engineering/wizard/template.sh` | `1b3cdf40ad4923a9845fd682653d8cc4510f516e` | `33cbe9dfb1d0e9185b60248a52aabed14bc64785a00cac695e302e739dd6c153` |

完整 template 库移植保留原所有 API、跨平台 URL opening、hidden input、幂等 env upsert、
secret stdin 和 gh variable 行为；**库区只含 finish 和移除未使用 RED 声明两项 diff**。上游 skipped 仍打印
“Setup complete”且没有非零结果；本地在有 SKIPPED 时提示仍需人工核对/完成并 return 1，
无 SKIPPED 的完成摘要及 return 0 明确保留。其他库字节不改，源模板 mode 保持 100644。
第二项库适配删除从未读取的 `RED` 色值赋值，处理可用 ShellCheck 的未使用变量检查；
不更改 helper API、运行时选择、浏览器分支或 secret/confirm 行为，不关闭任何 lint 检查。
STAGES 区移除默认 Stripe 示例，改为未确认合同的非零空壳；它不是额外库改动。

```diff
--- upstream finish
+++ local finish
@@ -1,11 +1,18 @@
 finish() {
   _clear
-  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
+  if (( ${#SKIPPED[@]} )); then
+    printf '\n%s%s  ⚠ Setup needs manual review/completion%s\n' "$BOLD" "$YELLOW" "$RESET"
+  else
+    printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
+  fi
   (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
   (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
   if (( ${#SKIPPED[@]} )); then
-    printf '\n'; warn "still to do by hand:"
+    printf '\n'; warn "still to verify/complete by hand:"
     for s in "${SKIPPED[@]}"; do note "  - $s"; done
+    printf '\n'
+    return 1
   fi
   printf '\n'
+  return 0
 }
```

```diff
--- upstream color declarations
+++ local color declarations
-  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
+  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
-  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
+  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""
```

库区边界：文件开头至紧邻 `# STAGES: author this section.` 的横线注释之前；完整包含
上方 `finish` 及其尾部换行。本地库区 SHA256：`1dca0aefd0ef013409ccdb25dc17f6f13a2a4f8abab7276325bda36db6b3dff8`。
生成脚本同一区域必须与本地 template 逐字节一致；对用户脚本 STAGES 的修改不能改库区、
marker 或来源模板。脚本执行文件的 chmod 是其精确路径效果，不改变 template 的 Git mode。

## 5. 静态制作验收与真实行为验收

制作阶段静态检查全部合同、所有 stage/value/target/confirm/verification/recovery，校对
TOTAL 和实际 stage 数、完整库区字节、CI exact names、`bash -n`、已可用 shellcheck 与
批准的生成脚本 executable mode；没有真实 secret 读取或 helper 执行。来源保持不变。
报告生成文件、hash、静态结果、人工运行命令与未执行动作；生成 DONE 不能称配置成功。

M18.P01/P02/N01/E01 的内容要求在前四节与 SKILL 中完整覆盖。M18.P03 的 copied
library/STAGES-only/TOTAL/chmod/bash-n/available-shellcheck 是 **candidate compliance only**；
baseline 模板缺失、内部函数名或字节不同均不能形成行为 FAIL 或增益。

M18.P04/G01 留给有 Htest 与隔离 dummy fixture 的真实黑盒用户入口：同一确认两阶段需求、
输入、seed 和 harness，各 arm 3 个有效 trial，观察顺序/TOTAL、幂等 .env upsert、拒绝无写、
secret 无 stdout、正确 gh name/value、失败/skip 非零、source pre/postimage。只使用非敏感
dummy 值和外部命令替身。candidate 全部 MUST 3/3 PASS、baseline 至少 2 个明确行为 FAIL
才可判选定增益；UNKNOWN 阻断比较且不算 FAIL。实现字节不同但可观察行为等价则两个 arm
行为均 PASS、没有增益；candidate 库区不一致单独判候选合规失败。不能用静态 hash、alias
不存在、helper 名称或未完成原生试验冒充 baseline 失败。

这些黑盒运行、反例/mutation、独立判官和服务验证属于后置真实验收；本内容制作不运行它们。
root 受控应用、路由/别名登记和安装也有各自 owner，不由本 reference 取得权限。

## 6. 实际交接与恢复

执行共享 office Completion/Handoff Summary Protocol；heavyweight 不能默认 standalone
免交接。项目 pin 已验证且写入获准时，摘要路径为
`<_PROJECT_ROOT>/docs/handoff/YYYY-MM-DD-<topic>-setup-wizard-handoff.md`，≤2000 tokens，
有 gate_result、3–7 条带证据 criteria、决策≤8、约束≤5、风险≤3和产物路径，按共享 checker
验证后再 DONE/state。NO_PIN 不访问 shared docs/topic/state 别名，按 long-session 使用已
授权外部审计/临时 checkpoint；缺必要路径授权先停在范围确认。

恢复摘要保存真实合同、来源路径/hash、output_path/pre/postimage/hash、目标和键名、
用户确认、当前/待做阶段、验证/失败/恢复和 NOT_RUN 状态。secret/token/密码/PII 一律脱敏，
不记录实际凭据或复制 env 内容。恢复时重新读合同与当前脚本，确认用户编辑和实际人工结果；
不靠“上次生成成功”推断服务已配置，不自动重跑或自动删除临时脚本。

<!-- FILE_END: setup-wizard/references/manual-step-contract.md -->
