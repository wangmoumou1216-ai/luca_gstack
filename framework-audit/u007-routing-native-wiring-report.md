# W14 原生基线局部化：离线交付与未通过项

交付状态：**DONE_WITH_CONCERNS（有界替代交付）**。原生 B/S 资格：**BLOCKED**。这不是可执行原生基线，不得用它证明 S/I 胜出；也不证明未来无法实现完整原生基线。

## 共同目标与范围

保持一个跨宿主框架，以任务理解、执行组织、信息连续性和必要人类控制评价净价值。当前优先 Codex 桌面/CLI，必要兼容检查服务共同用途；没有新增平台矩阵或领域技能重构。W14 只处理已冻结基线的原生接线。真实模型、正式 run、hook 执行、新 Agent、网络研究、commit/push 均为 0。没有读取私人绑定、历史、凭据或真实项目，没有运行 trust 脚本或 config/batchWrite，没有修改 HOME/home/CODEX_HOME。

生产源基线：05120197073144c0f46b6fb30a192733d529cc4f。U002 manifest SHA256：cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9。任务卡 SHA256：7699e96af1c5e698b193c2987ca2fabd57609bbf078540f13b139d64e88559db。附录 4 SHA256：5ea1a081c26ed680969929cfa69898be0562e5d4e4bfc9452ef4706c13f1534a。

## 实际交付

新增两个独占文件：

- `scripts/tri-system-eval/native-baseline.mjs`：`prepareNativeBaselineProposal({sourceRoot, sourceManifestPath, destination})`，只生成不可自动加载的审阅包。
- `scripts/tri-system-eval/native-baseline.test.mjs`：真实冻结源的离线正反例。

原 conditions.mjs / conditions.test.mjs 未改，公共 API、manifest、driver、W08 报告未改。生成器验证七个精确源的 manifest、固定源 hash、普通文件类型和父路径；拒绝缺源、源漂移、伪造更新后的 manifest、软链源、源/目标重叠及已存在目标。目标独占创建。只在审阅包内部写 0600 文件；候选源均追加 `.review.txt`，不生成活跃 .codex/hooks.json、运行仓或状态目录。返回 nativeReady=false、mayExecuteHooks=false、status=BLOCKED。

具体补丁保留 11 个 hook 的事件、matcher、顺序、命令控制流和 Stop 失败处理。仅替换外层 MEMORY_ROOT/日志路径、模型绑定文件路径、模型路由状态默认路径及 session-restore 内部 spool/日志路径。项目 config 是独立标注的隔离配置替换：writable_roots=[]、network_access=false；不是“只改路径”的控制等价性主张。没有使用 NODE_ENV=test，也未改 native transcript 路径、鉴权、事件验真、模型选择或阶段逻辑。

## 为什么本轮不能释放原生 B/S

1. `.claude/hooks/lib/codex-child-project.mjs:70–90`：生产 store 写入原生 ~/.codex/luca-child-project；现有显式覆盖仅允许 test + 测试 attestation 身份。保留原代码就违反本轮框架状态写入只限副本的要求；使用测试覆盖就不再是真实身份。把 store 移到模型可写工作目录还会破坏受保护状态边界。必须先证明专用 hook 状态域对候选不可写；当前未取得该原生 hook 边界证据。此文件完整保留原 hash，没有移除任何判断。
2. `.claude/hooks/lib/event-attestation.mjs:129–156`：journal 生成路径与 assertHostLaunchJournal 的父目录校验同时绑定原生 .codex/luca-child-project。只改 writer 会被 reader 拒绝；取消检查改变安全判断。本轮保留它。纯路径局部化仍需保留全部 owner-only/canonical 校验并证明新域的写权限，不能从 CLI sandbox 结果外推。
3. `.codex/model-route-hook.mjs:29–30,70–75`：局部绑定文件没有经授权的实际内容。没有读取私人 model-routing-bindings.json，也不能凭空填模型及 approved_order 后声称与 B 等价。补丁仅提出文件位置，缺内容保持阻塞。
4. `.claude/hooks/session-restore.mjs:488–510`：daily_governance.py 确实存在于冻结 manifest，但 W08 条件构建器只选择四个 memory 脚本，未复制该运行依赖。原逻辑以 existsSync 控制是否启动治理，缺文件会改变行为。需要补齐该依赖的写路径/传递依赖闭包；本轮没有审计整棵治理树，也没有通过预造“已完成”标记跳过治理。不是宣称该源在 U002 缺失。
5. session-restore 的 git fetch 在存在 upstream 时可能后台运行；未来独立 Git 副本应无 upstream，本轮没有运行 session-restore。GLOBAL_MEMORY_DIR、LUCA_PROJECTS_ROOT、MEMORY_ROOT 可用但须对所有实际调用显式绑定，继承的宿主环境及 host-launch IPC 分支尚不能认定已闭合。
6. skills aliases 还未激活。后续只能对已冻结目标生成；W11 记录 .agents aliases 不在 U002，MagicPath 目标在冻结范围外，必须显式排除并记录。此审阅包没有伪称完成 skill discovery。

因此本交付是“精确阻碍 + 可真实应用的最小路径替代补丁”，不是删 hooks、prompt-only B、干跑通过或弱化控制后的 baseline。缺口仍由主协调/J 决定是否接受环境局部化及其等价验证；不是等待协调者代写本模块代码。

## 官方只读 app-server 检查

使用本机 `codex app-server --help` 确认 -c dotted TOML 进程覆盖语法（回执 6daa97）。未执行仓库 trust 脚本，只读取其协议和精确 key 规则。

三次均新建独立临时 Git 仓，放置原始完整 11-hook JSON。每个进程只请求 initialize、hooks/list（第一轮另发送 initialized 通知），没有 thread/start、turn/start、config/batchWrite 或 hook 执行。

| 回执 | 设置 | 原生结果 | 判定 |
|---|---|---|---|
| 68c02e | 默认进程配置 | 本目录精确 hook key=0；11 条断言失败，exit1 | 保留失败 |
| c5a24e | 独立目录重现并查看结构 | 分组 hooksCount=5，ownKeys=[]，errors=[]，exit0 | 5 条是非本目录项，未输出其命令，也不授信 |
| ab7682 | 仅此进程增加 projects."<精确临时路径>".trust_level="trusted" | ownCount=0，warnings=[[]]，errors=[[]]，exit0 | 项目授信覆盖未解决发现问题 |

三次均未获得本目录原生 currentHash，所以 **没有**继续发 hooks.state.<key>.trusted_hash 覆盖，更没有声称其可用或不可用。发现失败原因仍 UNKNOWN。达到三次同类失败即停止，不反复盲试。项目授信只是该次 app-server 的进程参数，没有写全局配置；未启动任何 hook 的执行流程。三个临时仓保留诊断材料，没有装 PATH stub。

## 验证与证据

- 6a413b：`node --test scripts/tri-system-eval/native-baseline.test.mjs scripts/tri-system-eval/conditions.test.mjs`，18/18 PASS，exit0。其中新测试 4 项、W08 回归 14 项；包括拒绝缺源/漂移/软链/重叠/覆盖、环境值不变、11-hook JSON 逆替换全等、所有改动逆补丁恢复原字节、两个鉴权文件原字节不变。没有把测试构造的普通源 manifest 当原生身份。
- a4662e：用生产 R 的真实 U002 冻结源构建。对另一个独占临时副本实际 `git apply --unidiff-zero localization.patch`，再逐文件比对 proposedSha256，全部一致；重新 hash 七个生产源全部不变，exit0。没有在生产 R 应用补丁。
- 18a9ea：七个源 SHA 均与 U002 相符，确认 daily_governance.py 在冻结源内。
- 8cac37：完整读取主协调 P02 registration/result，7/7 命令哨兵及父级检查通过。状态明确为 PASS_NATIVE_SANDBOX_COMMAND_ONLY，0 模型；**不**证明 app-server、原生 hook 或 MCP/Apps 边界。此证据不替代上面的阻塞项，也没有重复跑该探针。

仅对补丁生成器及其源字节保真做验证；没有证明运行候选的所有写路径已经闭合，也未做独立行为等价验收。源内仍保留外部写路径是显式阻碍，不被静态扫描“洗绿”。

## 最小接口建议（不修改 driver）

现有 materializeCondition 保持不变。主协调可先调用本函数取得 proposal；driver 不得把 proposal.root 当 condition.root。将来 runnableNative 根的释放需分别具备：精确 11-hook discovery/trust 回显、有效 permissions/activePermissionProfile 证据、候选不可写的 hook 状态域证据、完整依赖与状态输入清单、冻结 skill aliases 清单和行为等价结论。缺任何项仍 nativeReady=false。命名 profile 不能与旧 sandbox 参数随意混传；本文件的保守 config 不是 effective 权限的证据。

## 资源与后续边界

本次准备池 1 次；真实模型/正式 run=0，新 Agent=0。app-server 只读进程 3 次。无 thread/turn 调用。本轮工具外层调用及内嵌子命令按可见记录保守计不超过 50 个底层动作，低于 90；具体文件读取操作不能等同命令次数。墙钟截至报告生成见下；完整 observable token 计数没有工具级计量，记 unknown，不伪造 120000 内的精确余额。没有额外能力探针登记；上述 hooks/list 检查来自 W14 明确允许的准备范围，主协调 P02 仍按其原账本 2/6 计。

本轮不继续重试 discovery，也不启动真实 hook/model。可收取实现和最小补丁；原生 B/S 放行仍 BLOCKED。

墙钟：881.17 秒（开始 epoch 1790965015.643883，包含压缩后的继续工作）。

## 文件指纹

- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.mjs`：`0337ed8b1d78805de5b2a3658623de00db87cd5c29aac29a3aa760c1dec63dc4`
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.test.mjs`：`9146af4df873a5a29028305a3a313d231e10ebed6b7c3cd9509bd738b5d4f1cd`
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/native-baseline.mjs`：`06182a7bdba9b914243738af0a21d949da7bb5623070d82579abf17636184f30`
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/native-baseline.test.mjs`：`27f403fb93e06ba2e1bc522e7aec1f113cce965247be1a877e273ce30947ba15`

审阅包：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal`。patch SHA256：`1dcc3f1d94c5d56f46b6b35b3fdc058e94e665df6631ddac8e4933630ccb7502`。下列 JSON 保留所有原/新字节 hash。

```json
[
  {
    "path": ".codex/hooks.json",
    "sourceSha256": "6ea4c6e05e3d61ced51b8cb785dcd04a9ce2acc94494a08e1be304fb42b1dfad",
    "proposedSha256": "6d59ad176f702d211375ebe534ed7483f36d6f02d4fcacf4594fb902e6e7df9c",
    "changed": true
  },
  {
    "path": ".codex/config.toml",
    "sourceSha256": "94cbd3534392be5631ab7f87386a3ce26c65347b8a065e0eb7698863c384081a",
    "proposedSha256": "d70746c2cc4b9fb271694d01ad0ac4063724e1cdcd61da250366e157113e33c4",
    "changed": true
  },
  {
    "path": ".codex/model-route-hook.mjs",
    "sourceSha256": "f5df0dd7ead1b2f923911436bf7af3c95da61b3867675dad673c0440516bda9b",
    "proposedSha256": "f844c5ce67010b4fcd99a8988497279c752a16801dad6b27c5cc68f659cc8330",
    "changed": true
  },
  {
    "path": "scripts/model-route-host.mjs",
    "sourceSha256": "77b7f952bf39781d57a155e06fa69de8b6427d118c681f4cf1f80a220958bedc",
    "proposedSha256": "539936b45ee20e906756fc374be60d9a1331877316cada654b7804c1fc1901e9",
    "changed": true
  },
  {
    "path": ".claude/hooks/session-restore.mjs",
    "sourceSha256": "10ef4912c835e75c8e5f0b239bf2dd4e66788ceb34b830d13c365e3861997a04",
    "proposedSha256": "102ab72833ddbe6dfed753406a60e5bae22c1ab02d81debe2816379149ad58f5",
    "changed": true
  },
  {
    "path": ".claude/hooks/lib/codex-child-project.mjs",
    "sourceSha256": "02139c51c4815e6766ff58d874f75c10da61b82b4776f7042f8a721d18f9f492",
    "proposedSha256": "02139c51c4815e6766ff58d874f75c10da61b82b4776f7042f8a721d18f9f492",
    "changed": false
  },
  {
    "path": ".claude/hooks/lib/event-attestation.mjs",
    "sourceSha256": "fa46750b6e1323af5e5dc1445a9f7df4999ba9a59691f8df4443daf1540bc5f6",
    "proposedSha256": "fa46750b6e1323af5e5dc1445a9f7df4999ba9a59691f8df4443daf1540bc5f6",
    "changed": false
  }
]
```

## 可复核的精确补丁

仅在独占测试副本中验证应用。路径绑定本次审阅包，不得直接在生产目录或原生运行目录应用。受保护 store/journal 两个文件未改变，故不出现在 diff。

```diff
--- a/.codex/hooks.json
+++ b/.codex/hooks.json
@@ -10,1 +10,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$luca_hook_root/.codex/host-launch-hook.mjs\" \"$luca_hook_root/.claude/hooks/session-restore.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/runtime-not-created node \"$luca_hook_root/.codex/host-launch-hook.mjs\" \"$luca_hook_root/.claude/hooks/session-restore.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
@@ -20,1 +20,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
@@ -32,1 +32,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$luca_hook_root/.codex/host-launch-hook.mjs\" \"$luca_hook_root/.claude/hooks/route-guard.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/runtime-not-created node \"$luca_hook_root/.codex/host-launch-hook.mjs\" \"$luca_hook_root/.claude/hooks/route-guard.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
@@ -45,1 +45,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$luca_hook_root/.codex/host-launch-hook.mjs\" \"$luca_hook_root/.claude/hooks/project-scope-guard.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/runtime-not-created node \"$luca_hook_root/.codex/host-launch-hook.mjs\" \"$luca_hook_root/.claude/hooks/project-scope-guard.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
@@ -55,1 +55,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
@@ -66,1 +66,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$luca_hook_root/.codex/codex-hook-adapter.mjs\" \"$luca_hook_root/.claude/hooks/post-edit.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/runtime-not-created node \"$luca_hook_root/.codex/codex-hook-adapter.mjs\" \"$luca_hook_root/.claude/hooks/post-edit.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
@@ -76,1 +76,1 @@
-            "command": "luca_stop_payload=$(cat); luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || { printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Review hook configuration before continuing.\"}'; exit 0; }; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; luca_stop_output=$(printf '%s' \"$luca_stop_payload\" | MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$luca_hook_root/.codex/codex-hook-adapter.mjs\" \"$luca_hook_root/.claude/hooks/session-sync.mjs\" 2>> /tmp/luca-gstack-hooks.log); c=$?; if [ \"$c\" = \"0\" ]; then printf '%s' \"$luca_stop_output\"; exit 0; fi; luca_stop_recovery=$(printf '%s' \"$luca_stop_payload\" | LUCA_CHILD_SOURCE_ROOT=\"$luca_hook_root\" node \"$luca_hook_root/.codex/stop-integrity-failure.mjs\"); c=$?; if [ \"$c\" = \"0\" ]; then printf '%s' \"$luca_stop_recovery\"; else printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Review hook configuration before continuing.\"}'; fi; exit 0"
+            "command": "luca_stop_payload=$(cat); luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || { printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Review hook configuration before continuing.\"}'; exit 0; }; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; luca_stop_output=$(printf '%s' \"$luca_stop_payload\" | MEMORY_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/runtime-not-created node \"$luca_hook_root/.codex/codex-hook-adapter.mjs\" \"$luca_hook_root/.claude/hooks/session-sync.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log); c=$?; if [ \"$c\" = \"0\" ]; then printf '%s' \"$luca_stop_output\"; exit 0; fi; luca_stop_recovery=$(printf '%s' \"$luca_stop_payload\" | LUCA_CHILD_SOURCE_ROOT=\"$luca_hook_root\" node \"$luca_hook_root/.codex/stop-integrity-failure.mjs\"); c=$?; if [ \"$c\" = \"0\" ]; then printf '%s' \"$luca_stop_recovery\"; else printf '%s\\n' '{\"continue\":false,\"stopReason\":\"Hook recovery unavailable; turn stopped. Review hook configuration before continuing.\"}'; fi; exit 0"
@@ -87,1 +87,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
@@ -99,1 +99,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2"
@@ -109,1 +109,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/Users/luca/Desktop/luca_gstack node \"$luca_hook_root/.codex/codex-hook-adapter.mjs\" \"$luca_hook_root/.claude/hooks/session-end.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; MEMORY_ROOT=/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/runtime-not-created node \"$luca_hook_root/.codex/codex-hook-adapter.mjs\" \"$luca_hook_root/.claude/hooks/session-end.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
@@ -118,1 +118,1 @@
-            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /tmp/luca-gstack-hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
+            "command": "luca_hook_root=$(git rev-parse --show-toplevel) && [ -n \"$luca_hook_root\" ] && cd \"$luca_hook_root\" && luca_hook_root=$(pwd -P) && [ -n \"$luca_hook_root\" ] || exit 2; unset NODE_OPTIONS LUCA_CHILD_SOURCE_ROOT LUCA_PROTECTED_CODE_ROOT; export LUCA_NATIVE_HOOK_STRICT=1; node \"$luca_hook_root/.codex/model-route-hook.mjs\" 2>> /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log; c=$?; [ \"$c\" = \"0\" ] && exit 0 || exit 2",
--- a/.codex/config.toml
+++ b/.codex/config.toml
@@ -1,53 +1,4 @@
-# luca_gstack 的 Codex 仓库级配置（随版本控制走，无需改用户全局 ~/.codex/config.toml）。
-#
-# 【为什么必须有这个文件 —— 2026-08-06 真实使用终验发现】
-# Codex 沙箱的**读是全局的，只有写受工作根约束**。而 luca_gstack 有两类**必须写在工作根之外**
-# 的路径，不加进 writable_roots 就会被 `Operation not permitted` 静默打断：
-#
-#  1. MEMORY_ROOT（母版仓）—— 三层记忆系统的权威 store。
-#     实测未加时：`append_episode.py` 抛
-#     `PermissionError: Operation not permitted: .../memory/episodic/index.jsonl`
-#     后果：**整个记忆写入路径在 Codex 下是断的**（读正常，写全废）——
-#     自成长捕获、semantic 候选、治理落盘全部无声失败。
-#     这是"跑测试全绿但真用起来坏掉"的典型，只有真实使用才暴露。
-#
-#  2. ~/.claude/projects/<repo>/memory —— **全局个人记忆** store（三分表第一层：
-#     feedback_*.md / MEMORY.md / candidate_feedback_*.md）。daily_governance.py:710 引用此 canonical 路径。
-#     实测未加时 `os.access(..., W_OK)` = **False**：person 层记忆写入在 Codex 下同样是断的。
-#     范围刻意取最窄（只到 memory 子目录），不放开整个 ~/.claude（那里还有会话 transcript）。
-#
-#  3. ~/.luca/**（muse app 的 IPC spool）—— luca-open.sh / luca-sidebar.sh 的投递通道。
-#     实测未加时：`luca-open.sh <file>` 本地 exit=0，Codex 内报
-#     `/Users/luca/.luca/open-spool/.tmp.…: Operation not permitted` 且 exit=1。
-#     后果：侧栏预览、HTML 产物推送、侧栏感知全部失效。
-#     （我此前在模块矩阵里写这条降级链"纯 bash、零 harness 依赖、可用"——**是错的**，
-#       那是静态推断，没在沙箱里真跑过。）
-#
-#  4. PROJECTS_ROOT（`$HOME/Desktop/项目`，单真值源 scripts/project.sh:16）—— **skill 产出与流程状态**。
-#     `docs/`、`.claude/workflow-state.yaml`、`.claude/current-topic.txt` 三者都是**软链**，
-#     目标落在 `$PROJECTS_ROOT/<项目>/` 下，即工作根之外。
-#     实测未加时：`docs/`、`<项目>/.luca/`、`$PROJECTS_ROOT` 全部 `Operation not permitted`。
-#     后果：**所有 skill 产出（PRD/design-brief/tech-spec/handoff/plans）与流程状态写入全部静默失败**。
-#     【为什么前三条扫出来了、这条没有 —— 漏因是结构性的，值得后来者记住】
-#     上一轮的扫法是 `git ls-files` 过可执行文件、提取 `$HOME`/`~`/`/Users/luca` **绝对路径**。
-#     而这三条在脚本里一律写作**相对路径**（`docs/...`），绝对路径只在**运行时由软链解析**才出现，
-#     ⇒ 静态扫法在结构上就覆盖不到。**凡"软链指向工作根之外"的路径，绝对路径扫描一律扫不出，
-#     必须另用「沙箱内真写探针」这一类运行时手段来发现。**
-#     范围取 `$PROJECTS_ROOT` 整体而非单个项目目录：`project.sh switch/new` 要写**别的**项目的
-#     `.luca/`，限死单项目会让 PROJECT GATE 失效。
-#
-# 【口径】只加这四条，不放开别的。仓库本身在工作根内、本来就可写，无需列出。
-# 断言 S13 守护本文件与这四条路径的存在（改坏了会红）。
-
-[sandbox_workspace_write]
-# 四条工作根之外的必写路径（少任一条 → 对应能力静默失效）
-writable_roots = [
-  "/Users/luca/Desktop/luca_gstack",                                    # 母版仓：记忆权威 store
-  "/Users/luca/.claude/projects/-Users-luca-Desktop-luca-gstack/memory", # 全局个人记忆（范围取最窄）
-  "/Users/luca/.luca",                                                  # muse app IPC spool
-  "/Users/luca/Desktop/项目",                                            # PROJECTS_ROOT：skill 产出 + 流程状态（软链目标）
-]
-
-# 发现层依赖 gh（external-skill-scout 16 处 / framework-evolution-scout 12 处）；
-# 关掉会让每个 channel 静默返回空 → filter(Boolean) 清零 → 产出恒空且无告警。
-network_access = true
+# REVIEW ONLY: requires effective permission-profile verification.
+[sandbox_workspace_write]
+writable_roots = []
+network_access = false
--- a/.codex/model-route-hook.mjs
+++ b/.codex/model-route-hook.mjs
@@ -31,1 +31,1 @@
-  || '/Users/luca/.luca/model-routing-bindings.json';
+  || '/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/model-routing-bindings.json';
--- a/scripts/model-route-host.mjs
+++ b/scripts/model-route-host.mjs
@@ -46,1 +46,1 @@
-  return explicit || '/Users/luca/.luca/state/model-routing';
+  return explicit || '/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/model-routing';
--- a/.claude/hooks/session-restore.mjs
+++ b/.claude/hooks/session-restore.mjs
@@ -109,1 +109,1 @@
-    const dir = join(homedir(), '.luca', 'session-spool');
+    const dir = '/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/session-spool';
@@ -126,1 +126,1 @@
-for (const hookLog of ['/tmp/luca-gstack-hooks.log', '/tmp/luca-gstack-hooks.muse.log']) {
+for (const hookLog of ['/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.log', '/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/hooks.muse.log']) {
@@ -503,1 +503,1 @@
-      try { govErr = openSync('/tmp/luca-gstack-governance.log', 'a'); } catch { }
+      try { govErr = openSync('/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/governance.log', 'a'); } catch { }
@@ -515,1 +515,1 @@
-      process.stdout.write(`[session-restore] 🌱 已后台触发每日记忆治理（今日首次启动；运行留痕 /tmp/luca-gstack-governance.log）\n`);
+      process.stdout.write(`[session-restore] 🌱 已后台触发每日记忆治理（今日首次启动；运行留痕 /private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w14-real-build-XrU5yW/proposal/state-not-created/governance.log）\n`);
```

<!-- FILE_END: u007-routing-native-wiring-report.md -->
