# 交付报告 —— E1 + E2（E3 已拆出单独立项）

> 执行 session：`lucagstack-9d`　|　分支 `fix/routing-steering-e1e2e3` @ 基线 `fc6eeb5`
> luca 主检出（`HEAD=72bd1f2`，95 项在途）**全程零触碰**——每次提交后都以
> `git -C <主检出> rev-parse --short HEAD` + `status --porcelain | wc -l` 复核

按计划 §11 第 4 步：报告**三条回归用例的实际输出**、**变异体红/绿证据**、以及**没做什么**。

---

## 1. 直接复现原始故障的回归用例

### E1 —— `进入 luca app 项目` 解析不出 canonical `muse`

**改前**：框架内没有任何「产品名 → 目录名」的真值，guard 只认真实目录名，模型无据可依。

> **⚠ 本节初稿的「改后实测」是错的，已更正。** 初稿引的是 **dry-run JSON**，而 dry-run 只有测试
> 会开——`.claude/settings.json` 与 `.codex/hooks.json` 都不设 `ROUTE_GUARD_DRY_RUN`。冷启动深审
> 实测：改前与改后的**真实 hook 输出逐字节相同**，`decisionToHints` 从不提 `aliasResolution`，
> 全仓只有 route-guard 自己和测试文件读它 —— **修复完全没接线（BLOCKER-1）**。
> 这正是「模块+单测全绿 ≠ 生效」：我全程只验了 dry-run 这一层。已补生产面渲染 + 生产面断言。

**改后实测（真实 hook 面，非 dry-run）**：

```
$ echo '{"prompt":"进入 luca app 项目"}' | ROUTE_GUARD_DRY_RUN=0 … node route-guard.mjs
[route-guard] 🔎 别名候选（证据，非授权；本 hook 不裁决切换）：「luca app」→ muse。
              是否切换由你按语义路由契约判断；多个候选一律不代选。

dry-run JSON 同时给出结构化证据：
  aliasResolution.status = OK, registry_complete = true
  candidates = [ { surface:"luca app", canonical:"muse", span 3–11, marker_present:true } ]
阳性对照 1：`进入 luca ap 项目`（少一个 p）→ 无 aliasResolution、无 🔎 行
阳性对照 2：同一输入指向**无 manifest** 的项目根 → 无 🔎 行（证明这行来自解析而非硬编码）
授权面差分：有/无 manifest 两次运行的 decision/projectAction/operation/project/tx/
            expectedEpoch/projectMutation **逐字节相同** ← RESOLVE 对授权面净影响为零
```

冻结 fixture 15 条（含 6 条否定式）全部产出**恰好一条** `muse` 候选：否定式**照样产候选**
正是「授权轴不做否定判定」的证据。两目标 `从 luca app 切换到 crm 项目` → 两条都记录、都不选。

### E2 —— 界面结构请求 score=0 被当成「不需要 skill」

**改前**：`帮我优化下设置页面，功能堆砌太严重了很难找` route score = 0 → `STOP`。
**改后实测**：

```
帮我优化下设置页面，功能堆砌太严重了很难找
  → semanticRouteAxis.axis = interface_structure_change
    evidence = [change:优化(span 2), surface:设置(span 5), structure:功能堆砌(span 11)]
    structure 腿 span_start=11 > 逗号位置 10   ← 跨从句，「同从句」约束会把它判为阴性
    complexityScore = 0, recommendedSkills = undefined  ← 信号不计分、不派 skill
```

义务时序实测（同一 sid）：

```
轮1 产信号 → SIGNAL_UNCONFIRMED，注入 0 行      ← 确认门
轮2 再产信号 → PENDING，注入 1 行
轮3/4/5 无关消息 → 每轮各注入 1 行              ← 「每轮可见」而非某个边界一次
第20轮 注入 1 行 / 第21、22轮 注入 0 行          ← 20 轮硬封顶
整句「不用了」→ 状态文件消失，此后注入 0 行
切换回合 → DEFERRED_BY_PROJECT_CHANGE，exact_task_text 完整保留，下一轮恢复注入
```

### `REQ-SCOPE-NULL-FIRST`（§6.1，基线为红）

**改前实测**（三组最小对全部翻转，且**真的会建项目**）：

```
new project: 涉及项目的route-guard   → NEEDS_CONTEXT
new project: 不涉及项目的route-guard → PROJECT_SWITCH / create_new_project
                                       project = "不涉及项目的route-guard"   ← 解绑当前、三条软链重指
属于/不属于、项目/非项目相关 同样翻转
```

**改后**：三组否定式均为 `NONE` / 无 `projectAction`；肯定式仍 `NEEDS_CONTEXT`。
反向对照三条全绿：具名项目仍 gate（`muse` → `switch_existing_project`）、正常新建仍工作
（`新建项目 beta` → `create_new_project`）、显式「新建项目 X」两种极性行为一致。

---

## 2. 变异体红/绿证据

每条都先证明**变异真的生效**（`cmp` 比对 + `node --check` 语法合法），再看转红；
全部 `cp` 备份逐字节还原并复跑基线。**变异未生效的一律作废重做，不计为通过。**

| 变异体 | 内容 | 实测 |
|---|---|---|
| 2 | 候选以 marker 为条件 | `打开 luca app`、`继续 luca app 的登录流程` **双双归零** —— 正是计划警告的「退回零证据、重开 E1」 |
| 3 | 授权轴重新引入机械否定 | 7 条否定式 fixture 转红 |
| 11 | 恢复「三腿须同从句」 | **E2 原始复现串首先转红**，另带 4 条 fixture |
| 12 | 信号改为只在非早返路径计算 | 四条早返用例**全红**（FRAMEWORK_FLOW / 裸 return complexity / mixed_ambiguous / gate） |
| 6 | 光有信号直接建 PENDING | 确认门用例转红 |
| 13 | 切换回合丢弃义务 | DEFERRED 用例转红 |
| 14 | 只在升 PENDING 那轮注入一次 | 「同 sid 连续 3 轮」用例转红（单轮用例判不出这条） |
| 15 | 去掉 20 轮封顶 | 封顶用例转红 |
| 17 | 义务读取去掉 try/catch | 见下方「两次返工」 |
| 18 | 状态文件不被 `.gitignore` 覆盖 | 由 `git check-ignore` 断言 + 阳性对照守护 |
| — | cap 上限 8→99 / 去掉保留词检查 / `lstat` 换 `stat` | 各自对应用例转红 |
| — | 去掉 `REQ-SCOPE-NULL-FIRST` 臂序 | **恰好**三条最小对转红，三条反向对照**保持绿** |

**两次返工（写下来是因为它们本可以变成假绿）：**

1. **变异体 2 第一次没生效**——perl 模式没匹配上，输出「通过」。按「变异未生效不算通过」作废重做，
   换锚点后才咬住。
2. **变异体 17 第一次咬不住**——它转红了 6 条却**没有**目标用例。原因是外层 driver 还有一道
   try/catch，把内层抛出的异常吞掉了：我测的是外层不是内层，属**影子守卫**形态。
   改成同时变异两层（承重的是 driver 那层）后，损坏状态文件让 hook `exit 1`，用例转红。

**另一次夹具事故**：中途 `grep` 返回空、连阳性对照也空——查出本仓 `grep` 被 shell 快照重定义
成函数、会静默吞输出。若当时信了那个空结果，会据此对文件内容下错结论。此后一律 `/usr/bin/grep`。

---

## 3. 回归底线

| 套件 | 基线（`fc6eeb5`） | 交付 |
|---|---|---|
| `test-route-guard` | 139 / 0 | **195 / 0**（新增 56 条：A-ALIAS 25 + A-SCOPE-NULL 6 + A-SIGNAL 15 + A-OBLIG 10） |
| `test-project-scope-guard` | 97 / 0 | 97 / 0（未动） |
| `test-codex-adapter` | 23 / 0 | 23 / 0（未动） |
| `test-hooks` | ALL PASSED | ALL PASSED |
| `verify.sh` | 86 / 0 / 1 warn | 86 / 0 / 1 warn（钩子环境内外一致） |

---

## 3b. 冷启动独立深审（判 BLOCKER）与逐条处置

计划 §11 第 3 步要求「实现后开独立 reviewer 冷启动深审」。它判 **BLOCKER**，抓到 3 BLOCKER
+ 3 MAJOR + 5 MINOR，**其中五条是我自己的断言恒真**。全部已修并各带变异证明：

| 缺陷 | 实质 | 处置 + 变异证明 |
|---|---|---|
| **BLOCKER-1/6** | E1/E2 只活在 dry-run JSON，真实输出与改前**逐字节相同**——修复未接线 | 顶层渲染 🔎/🧩 两行证据（措辞「证据，非授权/非判定」）。变异：删渲染 → 生产面用例转红 |
| **BLOCKER-2** | `assertNoAuthority` 查 `decision.command`，而 `command` 是 route-guard **从不产出**的键 → 恒真。深审把 `aliasResolution` 直接接成 `PROJECT_SWITCH` 后 25 条 A-ALIAS **全绿** | 改为**差分**：有/无 manifest 两次运行的全部授权字段必须逐字节相同。变异：复现深审那条接线 → **15 条 A-ALIAS 转红** |
| **BLOCKER-3** | `DEFERRED→PENDING` 恢复分支不计费，任何 `PROJECT_SWITCH` 回合退还整份注入预算——交替 40 轮实测 `injected_turns` 恒为 0、注入不停 | 恢复同样计费。新增交替 30 轮用例。变异：恢复不计费 → 转红 |
| **MAJOR-4** | `一段证据不得兼任两腿` 的 fixture `重构结构` **没有界面腿**，走不到相交判定 → 影子守卫。深审把 `overlaps` 整个删掉仍全绿 | 补 `regrouping the settings page`（`regroup` ⊂ `grouping`，字节 2-7 重复计入）。变异：`overlaps=()=>false` → 转红 |
| **MAJOR-5** | 臂序以 `!named` 为条件，**否定短语里嵌真实项目名就绕开**：`不涉及项目的muse路由` 实测建出该名字的项目 | 改按 `negatedDownstreamSignals` 本身闸（§6.1 原文就是「**任何**作用域否定结果」）。补两条内嵌项目名用例 + zzz 对照。变异：删闸 → 2 条转红 |
| MINOR-7 | `UI` 无词边界，`build`/`guide`/`quick` 全部误命中——而误报现在会变成缠 20 轮的义务 | `\bUI\b`。实测三条误报消失，真 `UI` 仍命中 |
| MINOR-8 | 义务文件是该目录唯一含**用户原文逐字节**却不被 GC 的 per-sid 文件；`--resume` 复用 sid → 陈旧义务数天后复活 | 加进 `session-end.mjs` 清理清单 |
| MINOR-9 | 字符检查跑在 NFKC **之前**，`ａ／ｂ` 的全角斜杠溜进候选 | 折叠后复查。实测候选数 0 |
| MINOR-11 | `exact_task_text` 无上限，而 `.gitignore` 注释声称 262,144 B | 加上限，超限才截断并留标记 |
| MINOR-10 | 重复键检测可被 `aliases` 绕过 | **未修**：威胁模型是用户自有文件，且修它要换 JSON 解析器；已在此备案 |

深审同时**逐项验过并判定站得住**的攻击面（用于分辨「审过了」与「没审到」）：包装器无绕过路径、
正则元字符别名不会被当 RegExp、NFKC span 映射正确、符号链接 `.luca`/manifest 双双被拒、
别名注册表七类校验全对、`session_id` 无路径穿越、`pickDisjointLegs` 无回溯爆炸（1KB→400KB 线性
68/102/212/624ms）、`lastIndex` 无残留、dry-run 与无 sid 回合零注入零状态文件、
`session-sync.mjs` 与 `project-scope-guard.mjs` **根本不在改动面**（「不拦 Stop、不拒 scope」结构性成立）、
S45 放宽是正当而非为迁就本改动。它也独立复核了主检出未被触碰（`72bd1f2` / 95 项）。

## 4. 没做什么（明写，防止被误读为已交付）

- **E3 整条**：`UserPromptSubmit` 的 revoke-and-queue、惰性认证、Codex `msg_*` 事件身份、
  `K6` 无锚点 rollout 旁路。已按 P1 门冷启动会审裁决**拆出单独立项**——理由不是漂移，
  是计划自身的边界矛盾：§5.2 要求的惰性认证层在本仓不存在，唯一两个可能宿主
  （`project-scope-guard.mjs` / `session-sync.mjs`）都被 §8 与变异体 15 声明「不改」。
- **D4 / MAJOR-5**（谁把 `SIGNAL_UNCONFIRMED` 升 `PENDING`、两条断言对 Stop 互相矛盾）：
  同一条边界，随 E3 一起走。本次用 R-11 的非语义代理顶上，**E3 落地后只需换这一处**。
- **`A-OBLIG-*` 的 Stop 侧断言**：今天恒真（§8 从不改 `session-sync.mjs`）。本次只保留
  「Stop stdout 不因义务改变」这条可测的守卫，其余随 E3 重做。
- **变异体 8/9/10/16/19**：8/9/10/16 属 E3；19 经会审判定**恒真作废**（它描述的形态在
  `project-scope-guard.mjs`，而该文件已被 BLOCKER-2 移出 §8）。
- **plan-execution 状态机、bridge、activation、rollback**：原稿 §5.3/§9–§11，不在本次范围。
- **计划本体一个字节未改**（避免触发 `K1`）。全部差异走 `EXEC-AUDIT-DRIFT-01.md` 的
  R-1..R-11 口径台账；计划的修订与重新批准 SHA 由 luca / 计划所有者裁。
- **下游 `muse/.luca/project.json` 不是我写的**：project-scope-guard 正确拒绝了无 pin 的
  框架 session 访问项目路径，该文件由绑定 muse 的 `lucagstack-e3` 经 `/goal` 交接落盘并验证。
  **它现在在 muse 仓里是未跟踪状态**——不提交的话换机/clone 后 E1 又会缺文件，是 luca 的决定。

<!-- FILE_END: EXEC-DELIVERY-E1E2.md -->
