# 五方向评估与执行证据

计划：`FIVE-DIRECTION-20261027`，批准版本 SHA-256 `c00049c2be3c5b1ab551728f2020dacd5b4509981b3852d5b63ececea40f3e98`。框架 NO_PIN，基线 `a0a145ee1b45cf0467895eb529e64eae811836bb`。用户在展示该版本后回复「继续」；批准绑定记录在本次系统临时目录，身份检查和依赖图通过。

## U001 — 诊断时的人为变异

现状：原规则要求 exact symptom 和实际 red，但未要求证明人为变异实际落地、运行了被变异实例、失败因果及恢复。新增规则只在已有权限且实际采用人为变异时生效；自然 red 不被要求制造变异。原 skill SHA `c8a604156372dc1173243431c62a7a286d5ee40d77eed42fcf16d63dac46d57a`，当前 SHA `77ed93366f2d9d4a82bfad3e65d107e7fc01c130cb172a92b9d03ce60508f304`。

行为对照：以 `scripts/test-design-flow-handoff.mjs`（SHA `1e66d0436517412d49664f00fadf0608ce2dfcc845317048e6b1c23c343a6dfd`）为真实 suite，通过 `DESIGN_HANDOFF_TEST_MODULE` 指定隔离副本。目标 `scripts/design-flow-handoff.mjs` 原 SHA `8ef0acbbe4e04d293a36f627b137714117f32f84dc5995667d915069e8e9fdb8`；移除唯一 hash 检查后 SHA `361ef263ed379b87db5b1336559231fa0fbef01051f56229a25507af5a89b6da`。baseline exit 0；未命中替换、错对象各 exit 0；语法错误 exit 1 但为 SyntaxError；正确实例变异 exit 1 且出现 `grant binds the exact bundle hash` 断言；恢复相同 SHA 后 exit 0。测试副本与依赖在独立 OS 临时目录，原文件未变。`node scripts/test-design-flow-handoff.mjs --mutation` 完整运行 exit 0；它对其余既有真实 guard 也执行 red/restore。

Codex `quality-gate` 角色 `five-direction-u001-consumer-01` 读取修改后文件并对五种受控输入作出符合规则的判断；由于它同时生成判断而非审查冻结产物，该输出只作模拟，不当作独立验收票。Claude Code 原生 `/diagnosing-bugs` 只读模拟（session `a8b033d0-3c08-4bf8-8577-06e8e9e30512`，exit 0）报告加载命令注入的 skill，正确拒绝错文件/语法错误红灯并保留自然 red 豁免。实际长期收益仍 UNKNOWN；测试只证明选定实例及其检测行为，不证明全部诊断场景。

## U002 — 测试 seam 的覆盖说明

现状：真实个人文件与仓库候选原字节一致，SHA `dc4d7f99b3a0e7d674eb78b5f7e7a352c09702bf02947c7235db4df11a54afe5`。Codex 当前技能目录列出个人 `tdd`，Claude 个人目录是到同一文件的符号链接；这不证明两宿主真实加载或 M13 已验收。按批准在两处加入相同的待选 seam 覆盖、遗漏和未知说明，已有确认复用；新 SHA 均为 `c11a0a218dd09f71614d0f94cbf69d277d7352b9a0d2debea896c3305af4ae82`。个人文件原字节备份于本次 OS 临时目录 `five-direction-tdd-preimage-x35p5br1/SKILL.md`，不在 Git 内。

受控消费：使用同一 client/server 和成功、离线两种 fixture；两次 Codex 原生执行者分别读原文件和候选文件。后续重导出的答复文本显示原版解释两种可测路径和未知接线并复用确认，候选版还指出 mock 不证明真实 server 或持久化、没有公开持久化读取方式；由于首轮消息正文无法独立读取，首轮行为差异为 UNKNOWN，不能据此证明收益。没有把 fixture 当真实数据库。一次 quality-gate 被误用于生成消费答复，返回 NEEDS_CONTEXT；已保留其失败并改用执行者，未将其计为验收票。Claude Code 原生 `/tdd` 首次返回 `Skill "tdd" is disabled via skillOverrides`（session `ad61420e-22c8-4807-aed2-520d30123e7b`）。用户随后明确允许启用：从 `/Users/luca/.claude/settings.json` 仅移除 `skillOverrides.tdd: off`，其余 JSON 语义不变，权限仍为 0600；前后 SHA 分别为 `fb60aa742c29783eef206fcd466a010c9b678234479fe46d44fdeb072f82f1e6` 和 `eeecc5779831c564bc9fbbac46bdddb1395cc319cda086b8c5c115b40c2239f3`，前像保存在 OS 临时目录 `five-direction-claude-settings-hsgp4cci/settings.preimage.json`。实际 `/tdd` 只读调用 exit 0（session `368903d2-2a3e-4514-bd0d-6a2b36ab1922`），报告加载个人 skill，解释候选边界的可观察、遗漏和未知，并沿用已确认边界。该样例不是完整 M13 安装或全部行为的验收。

针对 Spec 审查的必要性缺口，重新用同一 fixture 和问题做两次冷消费，首次答复直接写入临时文件：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-seam-bjnfc1o_/baseline-live.md` SHA `fd75ddd554abe652d7c4a160609fe3406234927be3f7033f7950ba457035a477`；同目录 `candidate-live.md` SHA `ad355891e5c821de62da601a081c910f34125cadfaa24f54a183df61bafa7834`。原版已明确模拟 API 不覆盖真实 server/数据库及未知连接，候选进一步指出缺少公开读取接口不能保证验证持久化；两者均沿用已确认 seam。该单样本有具体边界说明增量，但不能证明稳定增益；是否保留变更交终审对照判断。

## U003 — 交接与恢复

现有交接已要求目标、状态、授权、绝对路径和首个动作，但生成者原规则没有明确检查关键本地引用可用性及精确字节身份。补充交付前核对存在性和必要 hash，并明确缺失来源及首个恢复动作；不改变临时目录或交接边界。原 SHA `4141ff03f96a0140631f41852d06f4a955e96f7272a1452421a65a1aa99cfa66`，新 SHA `834446af5290eb5a445d6b010c4f2578ffe5965173fde0c744d50e9de81cb298`。

受控恢复：四份独立临时 handoff 指向有效来源、缺失来源、错误 hash、未授权删除；独立 Codex 消费者实际读取并核对源 hash：正常只读继续；缺失和不匹配均停在具体缺口；删除未执行。生成端另一执行者实际检查存在和缺失引用；后续重导出的草稿文本包含来源 SHA、缺口、首个核对动作和只读权限，但首轮消息正文不可独立读取，首轮生成表现为 UNKNOWN。Claude Code 原生 `/handoff` 只读模拟（session `892292bd-4a34-45de-b356-bb7db73d1c60`，exit 0）指出缺失来源、未知 hash、只读授权及恢复首步，但未执行文件生成或当场验证来源。真实新会话生成及用户任务的长期收益仍 UNKNOWN。

针对生成端分母缺口，两位冷执行者用相同 `cases.json` 分别按原版和候选 skill 生成四份真实临时交接：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-handoff-ab-7yodk1m0/` 下 `baseline-{normal,missing,drift,unauthorized}.md` 与 `candidate-{normal,missing,drift,unauthorized}.md`。原版将来源状态留待接手核验，候选生成时检查并区分存在、缺失、hash 漂移及禁止删除。另一接收者对八份逐一读取并核查，`receiver-matrix.md` SHA `eb58090990fd888de5a8390351ee74aec13bff24423e8ea75c625dbf266630a9`；其同时读取 `cases.json`，因此不是仅凭交接文件的盲接收试验，证据范围需据此收窄。

另对真实工作区版本变化做独立本地 Git fixture：预期 HEAD `162849df5c8bbfbe1fa6aa5a5f9aefe0fe9e2f3f`、当前 HEAD `b22b704dc2d45a33cc9a2caa87bad0a8fa3d4899`。原版和候选各自生成交接，两者均记录差异及只读边界；接收者分别核验并停止依赖原版本的工作。材料位于 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-version-sj355sa5/`，接收记录 `receiver.md` SHA `627e71da1d0afa9acfa5ee4776464e2142a880d4c0428625362d0362a1d966bb`。原版在这一场景本来也发现了漂移；不能把该例归因于新增规则。

## U004 — 工单关系与部分恢复

现有 facade 绑定目标、要求原生关系/降级、读回和未知创建不盲重试，但未明确关系写入不确定时逐边读回和只恢复缺失边。补充按已批准目标、已创建 issue 身份、每个 parent/blocker 关系逐一对账；未知边先读回，无法确认则 BLOCKED。随后受控负例发现缺 gate 时消费者返回 BLOCKED 而非预期 NEEDS_CONTEXT，补明缺 `TASK PLAN GATE PASS` 时在任何业务写入前返回 NEEDS_CONTEXT。原 SHA `e16399e2556c5d6841af4986065569d053800e2d4a74817540701c73304c843b`，当前 SHA `d672f32901a09dba7376dd737446d947b0df24105a6cda97fb10d19b521896b4`。

独立 Codex 消费者实际操作 OS 临时模拟 tracker：目标从已批准 A 变为 B 时未调用；issue 创建成功但 blocks 返回 exit 2 时读回缺失后仅重试该边，最终 parent/blocks 均存在；issue 创建结果未知 exit 3 后读回发现已创建，没有重复创建。修改后另一冷消费者模拟 blocks 成功但响应未知 exit 3，先读回发现已存在而不重试；parent exit 2 后读回缺失，只重试该边并成功。调用日志 `five-direction-tracker-c23mp8vz/recovery-OASJFn0I/state.json` SHA `7e5dfba06ee89643a756c6426048593c75b07f6f06ebac165a7f2f6644cc9536`。Claude Code 原生 `/to-tickets` 只读模拟（session `11e6d59b-dc1d-487d-b1a6-a158ea88ca42`，exit 0）正确保留缺 task-plan 和真实批准的门，解释关系未知时先读回。模拟器不校验 ticket 正文、计划 SHA、真实 provider 或父工单存在性，不能证明实际平台行为；真实平台与跨平台关系接口均 UNKNOWN。

后续负例中，缺 gate 的模拟计划仍发生了获准的 mock 正文更新；独立 Spec 判定该操作不触及真实平台，但不能作为完整 skill 合规通过。重建三组隔离对照后：合法 synthetic gate 下有一次 body fallback 和读回；无 gate 组零业务写但返回 BLOCKED 而非预设 NEEDS_CONTEXT；目标冲突组零业务写。补明上述状态规则后，重新冻结并运行无 gate 组，返回 NEEDS_CONTEXT，零 body/link/create；该运行中 `provider.py --help` exit 1（未写业务状态）及模型列表刷新超时保留在日志。证据：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-gate-b-new-4wsrk6zf/manifest.json` SHA `d5f288013cf487c02f11a01ce57580fcd83cb8a698527ef926c384f16b5a09e1`，`evidence/receipt.json` SHA `5b7d16cc63c0a57ff1ce73de4c4460810ecf2201268972c703ef11221dda3ff7`。synthetic gate 不是原生 Phase 7 验收；session/PID 独立绑定仍 GAP，真实 provider 未验证。

## U005 — 长期目标连续视图

对照现有 Plan/wayfinder 的目的地、frontier 与决策指针，以及 handoff 的目标、状态、阻塞、首步与授权，未创建新 skill 或平行状态。受控两会话实验中，第一位执行者按现有合同生成临时恢复视图（SHA `b3289dc2a74dd5c92789a1b585f8274755d3689742c365094158a060f815b732`），记录模拟 CSV 目标、读取完成但未实证、实现待办、目录待真人选择、发布未授权，指向决策源及其 SHA `752704fc6b65b72009b40b0fc9f975cc9b9fe5c2e527e72528e5d94c59de3ed1`。第二位冷执行者读回并正确恢复上述字段，没有把 fixture 的用户选择、读取状态或发布权限扩大为真实证据。

来源修改后 hash 变为 `1dabb47dcade26b92e022ce4a24080e7f41402117f546a2792b3bfaab1e3942d`；第三位冷执行者实际检测不符并停止，将目录选择与发布权限保留为限制。之后只恢复本次受控变异并核对原 hash。该样本表明现有组合能覆盖本次定义的连续视图，因此本项暂不新增机制；只是一组受控样本，真实多会话使用成本、不同宿主和长期效果仍 UNKNOWN。

成本观察：第二次受控会话的原生记录显示约 20.2 秒、5 次本地命令（其中 2 次为框架通用启动、3 次为读取交接、读取来源及计算 hash），不需要安装服务或重复要求已确认决定；唯一未决问题是 fixture 中真实待人选择的目录。这是在一个短 fixture 上的实测成本，不是用户对未来任务成本的接受承诺；以无需新增基础设施和一次读取即可恢复为本轮的工程判断，暂时复用现有组合。大任务、真实操作及用户长期体验仍 UNKNOWN。

## U006 — 检查与独立审查

`node scripts/test-engineering-delivery-skills.mjs --all` exit 0，八项通过；`node scripts/test-matt-skills-adaptation.mjs --all` exit 0，结果明确为 STATIC_SYNTHETIC_PASS、native NOT_RUN、adoption PENDING；`node scripts/test-writing-for-agents-skill.mjs` exit 0；`bash scripts/validate-skills.sh` exit 0（保留其提示的若干 handoff 声明 warning）；`git diff --check` exit 0。以上不替代各真实 loader 或本次独立终审；后续 Claude `/tdd` 只读样例见 U002。

原始运行记录可通过 Codex app `read_thread` 的 `includeOutputs=true` 读取；它们是会话记录，不是可长期保证的文件归档。主会话 ID `01a17caf-14e1-7ea1-beea-0c7fcc152061` 中本轮命令包括 U001 隔离实验、既有套件和 Claude CLI 输出；后者使用 `--no-session-persistence`，以主会话命令输出为原始证据。独立消费者原生会话 ID：U001 `01a17ccc-85ce-78f0-84cb-6fa82234bad3`；U002 原版 `01a17cd0-0029-7d00-ad6d-faffea05e363`、候选 `01a17cd0-650d-7031-955e-1c06789d4158`；U003 恢复 `01a17cd1-41c9-7740-a017-c8794a0ce4b0`、生成模拟 `01a17cd1-dcb6-7a30-a0e5-3715c3fbc560`；U004 原版 `01a17cd2-de63-7503-9d96-9b64c07733d8`、恢复 `01a17cd3-9bcf-7b71-97da-7335d6b5cc6c`；U005 第一、第二、漂移消费分别 `01a17cd4-91b0-70b2-b719-2151c8654f67`、`01a17cd5-6dc6-77e0-8422-486d79492fae`、`01a17cd5-e2b1-7453-8862-314330e2c489`。源、fixture 和日志的可用性、裁剪与原生读取需审查者实际核验；读取不到时对应结论 UNKNOWN，不由本索引代替证据。

独立审查发现 `read_thread` 不返回子 agent 发给主任务的消息正文。经原消费者后续重导出，U002 原版答复在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-seam-bjnfc1o_/baseline-answer.md`（SHA `fec17b6ec66838a6f0e6f3268672ba036c340343e090515a6c1306e39694d1b7`），候选答复在同目录 `candidate-answer.md`（SHA `d0fcc2ecb6ae3faec2a1cadd9e16cf1f77d1708d929bca7333dd56a0d28d8ea0`）；U003 生成草稿在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-handoff-wjkem4zu/generator-answer.md`（SHA `0101b269f259629c532cd7cdf59e10a0284638081e7f856b71dc9f7859b9bcec`）。这些文件由各消费者自报逐字重导出，并非宿主独立签名的原始消息；无法独立比对原始消息时，精确逐字一致性仍 UNKNOWN。

Standards 轴独立审查完成三轮，最终票 `five-direction-standards-targeted-final-20261027` 为 FAIL（4/5）：保护、授权、可执行性和结构通过，首轮消息正文不可独立读取为 Important UNKNOWN。此后按其解除建议将 U002/U003 精确结论改为“后续重导出文本显示”，首轮表现明确 UNKNOWN；这一修订尚无独立终版票。按 serial 门，Spec 轴 NOT_RUN，U006 未通过，禁止 U007 发布。用户后续单独批准并完成 Claude `tdd` 启用，具体验证见 U002。

后续 Standards 票 `five-direction-standards-post-user-20261027` 对当时报告 SHA `2f72ad418c0cd31f63396e87f31fbc2f77d968a7442f30b0385fc53a7b7e697c` 返回 PASS；Spec 票 `five-direction-spec-20261027` 返回 FAIL（4/8），指出 U002 对照、U003 生成分母、U005 成本依据和 Claude 完整输出缺口。上文补充的证据及本报告已改变该 SHA，旧票不能证明当前版本，须重审。

Claude 完整输出保存在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-claude-clean-vpl4rs_z/`；`manifest.json` SHA `75c233dda4002ca1a9843b0838a024c0a374e39dcbd8718c66b76a6eff9f2969`，四个只读命令均 exit 0，输入使用 DEVNULL；逐命令 argv、完整 JSONL、stderr、时间与 hash 在该 manifest 中。此前 `five-direction-claude-proof-7x9apm_6` 的运行意外将驱动脚本传入子进程，属于污染输入，保留失败记录，不作宿主验收依据。四项仍是单次只读场景，不代表真实 tracker 或长期效果。

最终 aggregate 票 `five-direction-final-aggregate-retry-20261027` 返回 FAIL（8/14）：A0–A3 和 C1–C4 通过；R1–R4、C5–C6 因预冻结实例/来源收据、完整当前版本终审和保全证据不足而 UNKNOWN。后续从新冻结 U001 试验及 U002–U005 多轮独立实验保留原始证据，但均仍有如 session 身份绑定、实例生命周期、场景提示或原生上游 gate 的 GAP，不能替代整体验收。U001 追加证据在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u001-full-eq0a3kh4/`，其 manifest SHA `c38b0171322ba855ca2ee780991547bf88b2f181f1b7cf1f481038ff068cdcc3`、receipt SHA `640f8f954240b66b1bfec9efc1bf98b3fa68f2c9824d4deaee33c66056c1cf29`，模型消费语义判定仍待独立验收。补充试验目录、GAP 和逐例证据由 `five-direction-final-gaps-nn1r242g/evidence/adjudication.md` 描述，SHA `00d1e4d5b0f37d32bcbfc1db1df8a4dccfd057ac0c4607e88dd3c46decf304b7`。修改 to-tickets 后，旧版本的 Standards/Spec 票不代表当前版本；发布仍未进行。

再次预冻结并以可核对的原生会话运行 U001：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u001-canonical-orv85ooi/`，独立票 `five-direction-u001-canonical-20261027` 为 11/12，唯一缺口为操作元数据；补充保留原始记录的 `receipt-v2.json` 后，定向票 `five-direction-u001-operation-v2-20261027` 为 3/3 PASS。自然 red 仅作语义判断，不声称已运行新的自然 red 测试。

U002 重新冻结相同输入并分别运行原版与候选：原版 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u002-baseline-native-h4rqks0x/`，候选 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u002-candidate-native-f_9ci4fz/`。原始 receipt 的语义判断保留 UNKNOWN，独立票 `five-direction-u002-native-receipts-20261027` 对逐项语义及实例核验为 13/13 PASS；候选在此单样本补充说明，长期效果仍 UNKNOWN。

U003 重新冻结两个原生生成实例：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u003-baseline-native-m3j3oqjw/` 与 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u003-candidate-native-rg243z10/`，各有五个情景；两者均未运行 skill preamble。独立接收实例及逐例记录在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u003-receiver-native.MnhkkrTweZ/`，但交接材料引用了含全部场景的 `cases.json`，因此不能称完全盲接收；执行环境也禁止删除。该次独立审查尚待完成。

U004 对当前规则重新冻结三个隔离实例，原生会话与状态记录在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u004-native-fixture/`：有效模拟 gate 执行获准的正文回退并读回；缺 gate 返回 NEEDS_CONTEXT 且状态不变；目标冲突 BLOCKED 且无业务写入。模拟 gate 并非真实上游验收，该记录仍待独立审查。

独立定向票 `five-direction-u003-prefrozen-native-20261027` 为 FAIL（44/45）：十份交接的五类局部生成与接收判断通过，但接收端清单和收据未满足完整合同；A/B 接收行为相同、preamble 未运行及额外只读约束均限制结论。票 `five-direction-u004-u005-native-20261027` 为 FAIL（10/12）：五个局部行为与实例身份、时序通过，但两项均缺完整合同收据。U004 本轮未覆盖创建后关系失败及未知结果恢复，U005 的两个异常接续不代替完整双会话连续视图。真实 provider、长期效果仍 UNKNOWN。两票都不能代替 aggregate。

对当时报告 SHA `c53fbf04d95434a48cf7d1e1d25873021f3312ea6e42c94d87ac4aeee63f5c67` 的独立 Standards 票 `five-direction-standards-current-20261027` 为 PASS（5/5），后续 Spec 票 `five-direction-spec-current-20261027` 为 FAIL（6/8）：当前版工单恢复覆盖及完整收据、最新 Claude 消费仍未闭合。修改本报告后这些票只适用于旧报告字节，不是当前最终审查。

新交接接收实例 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u003-receiver-retry.aMFBJUXEyx/` 的定向票 `five-direction-u003-receiver-retry-20261027` 为 FAIL（24/25）：20 个行为项通过，但预冻结清单字段、证据目录和测试后来源/计划探针不满足合同；不能事后改写旧记录补成通过。

新的四例工单恢复模拟 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u004-reconcile-fixture-3fkx35la/` 已记录逐次调用和状态：四个只读检查器均返回 0，但其结论和实例收据仍待独立验收；消费者发现模拟工单正文缺少 Parent 与 Blocked by 章节，报告 BLOCKED，没有宣称完整合规。模拟 gate、真实 provider 及未知结果未落地等情况仍有上述限制。当前版 Claude `/to-tickets` 只读复验返回 HTTP 429 `usage_limit_reached`、零 token（session `f2a67b0e-71c6-4409-b786-ab7c4e4e0b67`），并未实际消费；日志位于该目录 `evidence/claude-current.json`。服务提示北京时间 21:10 恢复，当前版 Claude 结果为 UNKNOWN。

后续独立票 `five-direction-u004-reconciliation-native-20261027` 为 FAIL（13/15）：四种失败及未知结果的恢复行为、实例身份和前后探针通过；正文缺少必需章节，另有一次 `--help` 失败未纳入完整操作收据，单次时间未记录。原生调用和四次只读检查器支持本轮模拟恢复，不支持完整发布合规或真实 provider 结论。

新交接接收实例 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u003-final-native.455sWa5VAh/` 的独立票 `five-direction-u003-final-native-20261027` 为 FAIL（24/25）：20 个局部行为、实际来源/计划探针和保全通过，入口路径拼错后恢复读取的失败操作未入原收据。原件与失败票保留，依据原生记录追加补充文件 `proof/operation-supplement.json` SHA `27ffc80392b086f4c5f452c8a7e04d3fb1e32f5b31e0e1c72e518fb79b60850d`；独立票 `five-direction-u003-operation-supplement-20261027` 为 PASS（1/1），仅闭合该操作遗漏。共享输入、串行接收、额外只读和生成端 preamble NOT_RUN 仍限制结论。

修正正文后，新工单模拟 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u004-closed-body-lmihzr4s/` 的独立票 `five-direction-u004-closed-body-native-20261027` 为 PASS（15/15）：四类受控恢复、正文与关系、34 次操作和实例证据通过。该票仅覆盖模拟 gate、已知身份与已落地后返回未知的故障，不证明真实 Phase 7、真实 provider 或未知未落地情景。

U005 新增两次预冻结原生会话材料在 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u005-dual-native.cJg5QDghyH/`：生成者产生交接，另一接收者核对来源并恢复目标、待办及授权边界；两套收据保留前后探针和清理记录，语义及完整性仍待独立审查。该实验不代表真实项目执行或长期收益。

其后独立票 `five-direction-u005-dual-native-20261027` 为 PASS（16/16）：生成与接收正确保留目标、未实证状态、人类目录选择及授权边界，两套实例证据和清理通过。接收者没有收到交接文件预期 hash，审查者以冻结 manifest 与生成产物独立核对；不代表真实项目或长期收益。

最新报告 SHA `f06fba831c48005c2d74dae06b9ded327889af7620a7a761ef8477513224bf0d` 的 Standards 票 `five-direction-standards-after-receipts-20261027` 为 PASS（5/5），Spec 票 `five-direction-spec-after-receipts-20261027` 为 FAIL（7/8）：要求当前 Claude 消费、工单三例门禁及长期目标异常续接的完整收据。两票只绑定该报告字节，后续本报告变化须重新终审。

来源漂移与权限撤销的新实例 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u005-negative-complete/` 获独立票 `five-direction-u005-negative-complete-20261027` PASS（10/10）：识别来源变化并停止，撤销后未写 marker，实例与收据通过。复用接收会话、串行案例、额外只读及测试前准备漂移/撤销限制适用；未验证真实项目中途撤权。

工单门禁三例的新实例 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u004-gate-fixture-f6im99hd/` 已保存完整原生调用、初始及结束状态和收据；首次缺参数调用真实失败，三个自动检查因此返回 1，独立审查尚待完成。不能只凭业务状态推定通过。

其独立票 `five-direction-u004-gate-complete-20261027` 为 FAIL（12/14）：六项局部业务行为通过，但失败调用的 cwd 在原收据中记录有误，且失败后未重新进行完整 doctor。保留原票及原记录；随后按明确 CLI 语法预冻结新实例 `/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/five-direction-u004-gate-explicit-cli-9nyupqhn/`，三例检查器 exit 0，完整实例及行为仍待独立验收。

Claude 额度恢复后重新冻结并执行当前 `/to-tickets` 只读消费：`evidence/claude-manifest.json` SHA `cf7573e52f11b5b7370d3f4460a18e966f9afb35b103bad9bfd3ed8bcd49cc22`，完整输出 `evidence/claude-final.json` SHA `fb009d3695fa9f1c566fccf88571ec4e2d848ad63b1193eea9f2c4ff14b08d11`，session `591d7530-5cc7-4b42-8d16-8e6db42c351d`、exit 0。前后实际哈希均为当前规则 `d672f32901a09dba7376dd737446d947b0df24105a6cda97fb10d19b521896b4`，加载的 `.claude/skills/to-tickets/SKILL.md` 经真实路径解析到该文件。答复正确表示缺 gate 停止、未知关系先读回且不重复、失败边只补缺项；样例只读且未证明真实 provider。之前 429 失败保留为历史记录。

门禁三例新实例的独立票 `five-direction-u004-gate-explicit-20261027` 为 PASS（14/14）：有效 gate 的唯一正文回退及读回、缺 gate 和目标冲突的零业务写入、全部 11 次模拟调用与前后实例收据均通过；三个检查器均 exit 0，invalid-events 为空。先前 FAIL 票保留；该票只覆盖模拟 provider 和合成 gate，不证明真实平台或原生 Phase 7。Claude 当前版只读结果另待独立核验。

Claude 当前版只读消费的独立票 `five-direction-claude-current-20261027` 为 PASS（8/8）：冻结命令、实际 session、前后源及 alias 身份、三个语义场景和保留证据均通过。完整注入文本逐字加载轨迹、真实 provider、完整 skill 流程和跨宿主等价仍未证明。

## U007

待执行。
