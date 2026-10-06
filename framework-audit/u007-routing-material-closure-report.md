# W18：当前入口的冻结材料闭包交付

**DONE_WITH_CONCERNS — 构建代码及离线验证完成；原生行为/正式比较未释放。** 本次不是提案：conditions 构建器已实际修改，用生产 R 的 U002 冻结原件成功构建 B/S/T/I，并验证只读启动与确定性摘要。W14 proposal、原失败记录及原报告保持原样。

## 目标与新事实

评估保持一个框架，按任务理解、执行组织、信息连续性和必要人类控制判断通用净价值；当前优先 Codex 桌面/CLI，不新增平台矩阵、领域技能重构或通用编排层。当前入口的实际机制与原生能力分别归因，材料可达不等于已加载、已执行或有收益。

已完整读取共同合同、W18 卡、补充 5、u007-hook-layer-root-cause.json。当前记录显示生产项目层 11 个 hook 均 trusted 但 enabled=false；补充 5 说明五个启用的全局 hook 是通知器。隔离项目层 disabled 的元数据也保留。该事实不回填 U002 时点、历史会话或所有桌面入口。W18 不再把启用用户停用的 11 hooks 当作这批 B 的必要步骤，也未重复开关探测/授信。

## 实现与公共接口

只改独占的 `scripts/tri-system-eval/conditions.mjs` 和 `conditions.test.mjs`。`materializeCondition` 参数与既有顶层返回合同不变；新增的明细落在既有 sourceBindings/complexity 中，没有改 driver、case protocol、manifest、生产源或全局配置。

- 在现有冻结选择器上新增 **22 个原件**：8 个记忆辅助/治理脚本、14 个 Codex 文档/后端/适配源码。原字节、原路径保留，不修改鉴权、模型选择、事件验真或阶段控制。此前已复制的 scripts/build-agent-context.py、model-route.mjs、model-route-host.mjs 和两份 semantic 数据提升为显式必要项。
- **39 个必需路径**在写目标前核实存在于选中普通文件集合，缺失即 MISSING_BASELINE；仍逐文件核对 U002 bytes/hash，源字节漂移即 SOURCE_DRIFT。新增的字面量相对 ESM import 检查，真实源得到 95 条可达依赖边；未被冻结/未被选中依赖即 MISSING_RUNTIME_DEPENDENCY，不跟随清单外文件补洞。此检查不声称解析 computed import、所有 Markdown 引用或可选运行数据。
- 从冻结 `.claude/skills/office` owner 原件生成 **48 个 `.agents/skills/<name>` 普通文件目录**，含相应子资源；367 文件、2,886,890 bytes。没有读取本机既存 `.agents` alias，也无指向源/全局目录的链接。每个生成文件记录 owner 路径、源/副本 hash、源/副本大小、generatedAlias 与 originalAliasRead=false；每个 alias 有文件数、字节数和原生发现未验证的限制。office 自身目录包含嵌套 owner，故存在有意重复字节，不把它隐藏为零成本。
- 未冻结的原 `.claude/skills/magicpath` 链接目标继续 omitted、不跟随。生成的 `.agents/skills/magicpath` 只复制冻结的 `.claude/skills/office/magicpath` owner，并不复原机器外部 MagicPath 安装；两者身份分别记录。
- `.codex/hooks.json`、`.codex/config.toml`、`.claude/settings.json` 和机器原 alias 不复制/不加载；不存在 hook 注册、项目 trust、全局写或网络配置激活。Codex 适配源码作为只读材料存在不等于执行入口已启用。
- B/S 使用同一闭包。S 仍仅修改 AGENTS.md 的 K2、K4、K10-startup 三处约定入口，K3/K5/K6/K7/K8/K9 等关键原控制未变。T/I 仍只包含自身一份 AGENTS.md，不打开 B manifest、不注入 B root 或 native aliases。
- 扩展禁止路径过滤，明确排除 hidden 目录/文件前缀，延续 private、archive、answers、fixtures、case 等排除。未冻结但放在源磁盘的相对依赖被反例验证拒绝，而不是碰巧从磁盘复制。

## 新增原件及来源指纹

所有来源以 `/Users/luca/Desktop/luca_gstack` 为根，以下文件在真实构建中源 SHA 与副本 SHA 完全一致。

| 新增路径 | bytes | SHA256 |
|---|---:|---|
| `.codex/MODEL_ROUTING.md` | 2794 | `f26f47e586b77d9c27b81c96f9fd7f8c679ec45187c2b0f81dc6878a76174b15` |
| `.codex/agents/muse-proto-judge.toml` | 1272 | `d0df9808abb58f111c1fbbbaca7c3637178210d52b4c3e0e3a49c23e4a15ef0a` |
| `.codex/agents/preflight-agent.toml` | 1270 | `17934f4730f5f6b1f981020f9d4696b498b4a7a051592ed92854d2cd63c8aab6` |
| `.codex/agents/quality-gate.toml` | 1744 | `ca99839b32704662a5c7db323f46dc9e0e5819ce0889b1009d7c923061685d47` |
| `.codex/codex-hook-adapter.mjs` | 23090 | `0a08f28ca43b1b2a3ab8b5859b02c13052c28986df53063efc818f0f2beeb6b7` |
| `.codex/codex-source-guard-bootstrap.mjs` | 3732 | `f4c5dd3d5996e1fe09b74a7f564b79a8b49fdffe4c88165deac5810feb864e32` |
| `.codex/codex-source-guard-loader.mjs` | 2940 | `d784256e26da61a7d46fa5d47ac4e5c549f81b69e820d3bb69da3fa89f2fbf30` |
| `.codex/hook-source-integrity.mjs` | 12380 | `5668e523584fe27bf0d53430756a9974c69729325e83eea80728ee071ff7735b` |
| `.codex/host-launch-adapter.mjs` | 4596 | `d51ecb774fb690664b1cdb49fe441ee5287323995a82da9587b091562bc120b8` |
| `.codex/host-launch-hook.mjs` | 3326 | `f1cf91ab00fac7e7c1b5484d31bbee9799039d09c41557117c20522a919f3109` |
| `.codex/model-route-hook.mjs` | 26721 | `f5df0dd7ead1b2f923911436bf7af3c95da61b3867675dad673c0440516bda9b` |
| `.codex/model-routing-bindings.example.json` | 238 | `ca1e6c823e6a87d4be58e4fccd8e666963051ce4ffa457679eb6911ad0cc717e` |
| `.codex/stop-integrity-failure.mjs` | 2512 | `406758f657317488b36556c7f076b22862867afae9640ed6f4c3bff61a8a7b4c` |
| `.codex/workflow-runner.mjs` | 35833 | `d794913d9c003549dae33545f1d09a6704f41190fa4b2b66905e8aa4e7a8c531` |
| `memory/scripts/append_episode.py` | 8599 | `2f06b74989b546bf06a8513fe6d02d18f524555b32e171f1ad1e7c7bc41b39fe` |
| `memory/scripts/check_memory_health.py` | 7571 | `554f0a6c4a6e15e43238f04433926063de6a2e65734d2c2fdfd2d34d799c3f6f` |
| `memory/scripts/check_memory_integrity.py` | 16283 | `e6fc632f56b888402fd96e7be48da751b46cef62ecb43e4f6a2fdf22f26d3504` |
| `memory/scripts/consolidate_memory.py` | 53689 | `9df101b9bbd4c95257a669d47f06cb168d6821d8e0117d6da37a845a6b1164a3` |
| `memory/scripts/daily_governance.py` | 100941 | `e9c93b16a48a591526c68a827f2c5b8665655e437677b46c3aafaa368d5c73fb` |
| `memory/scripts/propose_semantic.py` | 8575 | `3db918b6cb884fa371ec12172db337e07e0c1d765153d64b2d4e28f0ddf6b9c4` |
| `memory/scripts/record_eval.py` | 11513 | `9a2b360ab69271d54d3eb99f12f0b553f1efe2fff17f2a99aa237445413dd58b` |
| `memory/scripts/review_candidates.py` | 7882 | `71e93b4dc9d69834d9b17938f2d65116e60eb8fcbb20ed226f7178e8701dd495` |

## 行为测试与真实构建

- **58ed10，exit1，21/22**：新增只读启动测试的源快照 helper 原先拒绝 fixture 内原本合法的 source symlink；在执行启动命令之前失败。保留此真实失败。修正仅让源快照 hash 链接文本、不跟随链接，输出材料的无 symlink 断言未放松。
- **0aef3c，exit0，22/22**：修正后的全套离线通过。
- **4c5888，exit0，22/22**：新增 hidden 禁止路径反例后的最终稳定代码验证。命令：`node --test scripts/tri-system-eval/conditions.test.mjs scripts/tri-system-eval/native-baseline.test.mjs`。18 项 conditions（含旧 14 项、新 4 项）及原 W14 4 项测试。保护性反例覆盖必需源遗漏、源漂移、清单外相对依赖、外部/父级/绝对软链、MagicPath 不跟随、T/I 不读 manifest、目标独占与源码原字节保留。
- **b8442d → 33a0d9，exit0**：真实生产 R/U002 构建 B/S/T/I；B/S 各重复构建一次。不仅 materialSha256 相同，完整返回摘要在仅归一化 destination.root 后也完全相同。B/S 唯一不同文件为 AGENTS.md。426 个不同的被复制生产原件在构建与启动后重新核 hash，均未变。
- 同一真实构建中仅运行 `python3 -B <condition>/memory/scripts/get_memory.py --summary`，显式 MEMORY_ROOT 指向该条件；没有改变 HOME/home/CODEX_HOME。B/S 均 exit0，stdout 同为 `Memory: no episodic sessions, 89 semantic facts, procedural → semantic domain:skill-rule`。-B 禁止 pycache 写；调用前后重新算完整材料 digest，一致。未读取生产私人历史，也未执行 search 的潜在日志分支、governance、hooks、workflow runner 或模型。

| 条件 | 文件数 | allowedReadPaths | materialSha256 |
|---|---:|---:|---|
| B | 867 | 658 | `acad2f94ec315f425ba45a84b31831ee24e1e43f2f4af2d0bdcf7db0b018509c` |
| S | 867 | 658 | `6e703d946ea454f91b4298d4419177dfe5601f4c38cf42c4345664e4096006ed` |
| T | 1 | 1 | `66bee6476856dc260e2425e8b4785522db699e066d49fa8fd6d3f7ffba77d2e5` |
| I | 1 | 1 | `ee9c612cb8231cd02fdec25b958cc5d95d96458aeb63d75e9734bda89a75b0a8` |

B/S：426 原件 + 74 个既有内部 alias 展开文件 + 367 个新 native skill 材料文件 = 867。相较 W08 的 478 文件增加 389（22 原件 + 367 生成副本）。T/I 材料 hash 与 W08 相同。计数只说明材料与维护成本，不代表模型采用、质量收益或 token 节省；实际问题数/交接数/token/维护时间仍 null。

## 仍不能复现或尚未验证的能力

1. U002 **没有 `.claude/workflows/*.js` 和 CLAUDE.md**。已复制 .codex/workflow-runner.mjs，但没有伪造其 workflow 正文，因此不能宣称可运行该流程或取得 Claude-root 等价。候选只有材料，不能利用此缺口证明替代方案更优。
2. 私人 model-routing-bindings、原生 session/child attestation、全局个人记忆、episodic/eval 历史及真实项目状态都不复制。补齐代码不生成这些状态；治理/安全写分支不可由本轮只读条件授权执行。
3. 当前记录的 disabled 项目 hooks 事实仅绑定观测入口/时点；11-hook 验真、拒绝与恢复行为没有运行证明。W14 的保护域/状态路径问题仍有价值，但不被强塞为本批启动动作。
4. `.agents/skills` 目录具备冻结 owner 及子资源原字节，实际 Codex 扫描、选用、相对路径消费、外部技能依赖与产品交付行为仍未验收。没有将目录存在当作原生能力 PASS。
5. 字面量 ESM 依赖闭合不等于全部运行时依赖闭合。Python 包、gh、computed paths、历史 Git 数据及可选文件未被伪造；不安装依赖或 PATH stub。copy 与 get_memory 的只读成功也不证明治理全链可执行。
6. 本轮没有验证 app-server 的有效 named permission profile、原生读取边界、MCP/Apps 或真实读取范围。遵守补充 5：访问隔离与读取计量分别判定；材料构建不清除 UNKNOWN，不签发正式 release，不支持缺证保护用途的替换建议。

## 生成 alias 清单

大小是独立复制成本；每个文件的 hash/binding 在完整条件摘要中保存。全部为冻结 owner 副本，不读取现有机器 alias。

| name | 冻结 owner | 文件数 | bytes |
|---|---|---:|---:|
| auto | `.claude/skills/office/auto` | 1 | 13657 |
| brainstorm | `.claude/skills/office/brainstorm` | 6 | 97871 |
| careful | `.claude/skills/office/careful` | 2 | 1922 |
| challenge | `.claude/skills/office/challenge` | 2 | 6452 |
| code-hygiene | `.claude/skills/office/code-hygiene` | 3 | 27952 |
| code-recon | `.claude/skills/office/code-recon` | 2 | 22276 |
| code-review | `.claude/skills/office/code-review` | 3 | 5124 |
| codebase-design | `.claude/skills/office/codebase-design` | 7 | 26448 |
| compare | `.claude/skills/office/compare` | 1 | 3572 |
| deepresearch | `.claude/skills/office/deepresearch` | 4 | 40840 |
| design-brief | `.claude/skills/office/design-brief` | 7 | 117060 |
| diagnosing-bugs | `.claude/skills/office/diagnosing-bugs` | 12 | 33482 |
| domain-modeling | `.claude/skills/office/domain-modeling` | 5 | 12488 |
| evals | `.claude/skills/office/evals` | 1 | 4423 |
| figma-demo | `.claude/skills/office/figma-demo` | 11 | 118091 |
| grilling | `.claude/skills/office/grilling` | 3 | 5043 |
| handoff | `.claude/skills/office/handoff` | 2 | 5946 |
| html-prototype | `.claude/skills/office/html-prototype` | 7 | 121840 |
| idea | `.claude/skills/office/idea` | 2 | 10094 |
| implement | `.claude/skills/office/implement` | 4 | 11274 |
| insight-synthesis | `.claude/skills/office/insight-synthesis` | 1 | 6354 |
| issue-triage | `.claude/skills/office/issue-triage` | 6 | 33615 |
| loop-me | `.claude/skills/office/loop-me` | 3 | 24959 |
| magicpath | `.claude/skills/office/magicpath` | 1 | 3719 |
| motion-polish | `.claude/skills/office/motion-polish` | 2 | 8903 |
| muse-req-triage | `.claude/skills/office/muse-req-triage` | 1 | 10988 |
| muse-x-digest | `.claude/skills/office/muse-x-digest` | 4 | 18779 |
| office | `.claude/skills/office` | 184 | 1450922 |
| open-design | `.claude/skills/office/open-design` | 1 | 35418 |
| quick-research | `.claude/skills/office/quick-research` | 1 | 4296 |
| redteam | `.claude/skills/office/redteam` | 2 | 9366 |
| references | `.claude/skills/office/references` | 24 | 223954 |
| research-kit | `.claude/skills/office/research-kit` | 3 | 26237 |
| resolving-merge-conflicts | `.claude/skills/office/resolving-merge-conflicts` | 4 | 18551 |
| retro | `.claude/skills/office/retro` | 2 | 4507 |
| setup-wizard | `.claude/skills/office/setup-wizard` | 4 | 33585 |
| task-plan | `.claude/skills/office/task-plan` | 1 | 18992 |
| tech-spec | `.claude/skills/office/tech-spec` | 1 | 18841 |
| to-spec | `.claude/skills/office/to-spec` | 3 | 6023 |
| to-tickets | `.claude/skills/office/to-tickets` | 3 | 9740 |
| ux-audit | `.claude/skills/office/ux-audit` | 5 | 36749 |
| ux-brainstorm | `.claude/skills/office/ux-brainstorm` | 6 | 85788 |
| ux-research | `.claude/skills/office/ux-research` | 4 | 49441 |
| ux-writing | `.claude/skills/office/ux-writing` | 1 | 5929 |
| wait-what | `.claude/skills/office/wait-what` | 3 | 3054 |
| wayfinder | `.claude/skills/office/wayfinder` | 3 | 6053 |
| writing-for-agents | `.claude/skills/office/writing-for-agents` | 4 | 17625 |
| writing-workshop | `.claude/skills/office/writing-workshop` | 5 | 28647 |

## 必需闭包

```text
.claude/agents/plan-agent.md
.claude/skill-os/agent-context-manifest.json
.claude/skill-os/generated/context-index.md
.claude/skill-os/generated/skill-catalog.md
.claude/skill-os/runtime/project-session.md
.claude/skills/office/SKILL.md
.codex/MODEL_ROUTING.md
.codex/agents/muse-proto-judge.toml
.codex/agents/preflight-agent.toml
.codex/agents/quality-gate.toml
.codex/codex-hook-adapter.mjs
.codex/codex-source-guard-bootstrap.mjs
.codex/codex-source-guard-loader.mjs
.codex/hook-source-integrity.mjs
.codex/host-launch-adapter.mjs
.codex/host-launch-hook.mjs
.codex/model-route-hook.mjs
.codex/model-routing-bindings.example.json
.codex/stop-integrity-failure.mjs
.codex/workflow-runner.mjs
AGENTS.md
CONTEXT.md
memory/scripts/_memroot.py
memory/scripts/_project.py
memory/scripts/append_episode.py
memory/scripts/check_memory_health.py
memory/scripts/check_memory_integrity.py
memory/scripts/consolidate_memory.py
memory/scripts/daily_governance.py
memory/scripts/get_memory.py
memory/scripts/propose_semantic.py
memory/scripts/record_eval.py
memory/scripts/review_candidates.py
memory/scripts/search_memory.py
memory/semantic/promoted-facts.yaml
memory/semantic/static-fallback-allowlist.txt
scripts/build-agent-context.py
scripts/model-route-host.mjs
scripts/model-route.mjs
```

## 稳定交接

- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.mjs`：`33b1a3a4813710c86f7cfd654e9988fcdaf1fd0d43cd1d32061508c3133dcac8`
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/conditions.test.mjs`：`920fa505bc96bae1c423dc651696b92710d5c3d72f8965d6df8fb1f695ef1c2d`
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/native-baseline.mjs`：`06182a7bdba9b914243738af0a21d949da7bb5623070d82579abf17636184f30`（W14 未改）
- `/Users/luca/.codex/worktrees/8812/luca_gstack/scripts/tri-system-eval/native-baseline.test.mjs`：`27f403fb93e06ba2e1bc522e7aec1f113cce965247be1a877e273ce30947ba15`（W14 未改）
- `u007-routing-material-closure-task.md`：`11364846645eecd1837d0d2eded6732158bc884460d27590e1577464e8138f44`
- `u007-interface-addendum-5.md`：`5727306f38a0b5779d0e18c51f0ff73ab5386bf3f6c2a5ddc252946ca106ed3a`
- `u007-hook-layer-root-cause.json`：`596b009f3c4dae92898caf2f0a0d6aa74684fee13adf739bacfdb0daf2076833`
- `u002-source-manifest.json`：`cbbf8d9cf338b8bbf2aa3434e500a9f83eb69f524018968a4d8b0d798b9c41b9`
- `u007-routing-native-wiring-report.md`：`0dcd5678e840dee11994ac4730ce65ea9128dd81ad9a4fe235ec6116cb36adc3`（原失败报告未改）

真实离线输出目录：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w18-real-closure-dvzeoU`。

- `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w18-real-closure-dvzeoU/summary.json`：`c7acb24956e061db990e3accc6c77a416ca2b62c2e0323b0d003ed9869bd92e1`
- `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w18-real-closure-dvzeoU/B-material.json`：`1e35b0ba86bcf325b90313d6c7178c6c30994e0edf2b55cd8a35cbfb250bfb37`
- `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w18-real-closure-dvzeoU/S-material.json`：`493928d06f91a2f5ac60ae71e0a4aa488b4100e4b49c3a5c5aa185f12b577414`
- `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w18-real-closure-dvzeoU/T-material.json`：`c3393557c4746a699d52d7de4542544b190fdaf71c0f65c167edb20c5e22878f`
- `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/w18-real-closure-dvzeoU/I-material.json`：`d566e4b16c955a2a9e7d49ca0a21575cee11a8ea51d0a75366f027ab2a627c2e`

只交这两个构建代码变更与本报告供原 Context owner 联测。未修改其他 owner 文件，不发回跨会话消息、不创建 Agent、不自行提交/推送。主协调负责集成及独立就绪结论。

资源：准备池本次 1 次，模型/正式 run/额外 Agent/网络研究/全局配置写=0。没有新 app-server 或 hook 探针。本次可见命令/编辑/轮询以及内嵌只读 startup 子命令保守不超过 40 个底层调用（文件复制/读取的逐 syscall 计数不可得，不冒充工具动作数）；低于 90 动作预算。完整 observable token 没有计量接口，unknown。墙钟从首次源清单读取记录的 epoch 1790966977.34195 计至生成报告为 703.28 秒，另有开头三批定向合同/状态读取，未到 45 分钟。

<!-- FILE_END: u007-routing-material-closure-report.md -->
