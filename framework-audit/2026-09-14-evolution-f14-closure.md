# 2026-09-14 十二项演进裁决与 F14 验收记录

基线：8d1bfc3d342eddec77de86a2897ef7dbf54d00b0。用户对master plan完整十二项及一次F14提案明确回复「批准」。
作用域：NO_PIN框架维护；未读写下游项目、未改全局配置/root/skill正文。已有observations/rules/retrieval改动保留但不纳入本轮提交。

## 治理结论

U-GOV-01..12均有明确人工处置，见 `.claude/skill-os/evolution/digests/2026-09-evolution.md` 的2026-09-14节。延期/观察只是裁决闭环，不是相应未来工作已经执行。
6行反馈真实apply后再次apply=unchanged；38行身份与原始采纳事实保留。3行outcome=yes、3行usage=unknown；同一修锁事件的两条能力归因不计两个独立效果样本。
机会池新增7个人工adjudication记录，不作scout run、不改变yield、不实现自动TTL过滤。Q4对标与10月2日对照保留人工触发，不新增自动化。

## Standards（独立冷启动 gov_standards）

PASS，0 Critical/Important/Minor。与Spec上下文隔离，串行执行。
新鲜反馈测试13/13、演进裁决13/13；另在临时副本删除expected-log-hash守卫，测试因「sha256 mismatch: unexpectedly accepted」转红，生产源码未改。
检查default dry-run、批准/证据字段、精确身份、歧义拒绝、重放冲突、未选中行字节与并发修改保护。
边界：CLI批准引用是审计字段，不自动证明人类权限；锁/hash复检不保证对非合作写者的原子CAS。

## Spec（独立冷启动 gov_spec）

PASS，U-GOV-01..12逐项符合，0 findings。未读取本轮Standards报告。
反馈13/13、演进裁决13/13；临时独立探针验证同candidate不同日期精确选择、批次末尾错误不部分发布、空批准拒绝；去掉identity日期后阳性样本转红为歧义(2)，不是基础设施故障。
历史row4/11/13效果证据已核对；38条身份/原始事实、恰好6条反馈、candidate原字节+7行、5个source ID/yield均与基线对账。
外部URL可达性未由该reviewer重复联网，来源复核的范围/限制已在digest写明。

## 主检出验证

- `node scripts/test-evolution-feedback.mjs`：13/13 PASS，含usage守卫mutation与并发写入注入。
- `node scripts/check-evolution-adjudication.mjs`：13/13 PASS。
- `bash scripts/verify.sh`：**PASS=96 FAIL=0 WARN=0**，exit0，包含Claude/Codex独立回归及新S21b。
- `git diff --check`通过；主执行另核38行原始字段、6行反馈、yield不变、candidate append-only、benchmark-registry未改。

## 复审绑定的11文件 SHA-256

两轴独立读回得到完全相同的下列摘要；后续仅新增本验收记录及F14制品，不改这11个文件。

```text
ecda92d33c5fcb466c38ac691e9c0fdeb174e32c0afc0047f014ada53ef8aeff  scripts/evolution-feedback.mjs
5a03d2410e9d6e1f6e1a6f5df58fa45602188deba5efd30ac27827c8903a0348  scripts/test-evolution-feedback.mjs
64282672ec69199aded05aa4f65dc491d4955cdc55043a759635f628a2304123  package.json
1ee24d8d4caad4ef2fa885244d39f9219841a01beed010f0f3269117a05e76a5  scripts/verify.sh
81cb10fbd4616d4c293812c06fb3cdb39e48827093b7ed28dbc4fc95d5de8583  .claude/skill-os/evolution/adoption-log.jsonl
e4975b12b2b2613235ca57868362b8c95bd478f063e5f65e9009ffcb64250b7b  .claude/skill-os/evolution/candidate-log.jsonl
b8011c38171a8424c668c05d5e42776302d2447556487245bcb678ae89bf0903  .claude/skill-os/evolution/digests/2026-09-evolution.md
e7761e0c6d7535ce9b89fb6ec760d7122b848085ef6f142693d2ddb94f97ec77  .claude/skill-os/evolution/gaps-register.yaml
ba5472a8637f8f4f388b54484de848bc5bf1b2eeb5b1f4f1214350adc69159de  .claude/skill-os/evolution/sources-registry.yaml
3eb296d616485ad6797416cc5f8a1a7eae3cb98ac647fb3fb69807b1b63c078e  CHANGELOG.md
d05c2397e934fdc03f1cd153f74056eba277d3a1fdea0f275631618bd74f5245  framework-audit/2026-09-10-locks-and-blocks-plan.md
```

## F14 冻结与单次额度

- 新manifest：`framework-audit/2026-09-14-f14-release-v26.json`，保留旧manifest/失败行。
- candidate context=`6650c69397aad82f2ff1feec54bb3e09d93f0a1c2d9e30cf2018cc803f4092d7`，205文件；baseline身份沿用历史冻结，不代表本次重跑baseline。
- scoring_revision=`v26-office-wizard-invocation-boundary`，scoring SHA=`20e3c2c65956632fb00f3abdd23c02a873313c7c0ffdaf760e118e0afd8c51ec`，不改判据。
- manifest SHA=`895273bbf91d0440d9de013bdc3af9122cd02fe00021f31dbcc66c079e15caeb`；发射前describe确认RELEASE_BOUND、F14 live_ready=true。
- 唯一调用：candidate / codex / F14-flow-preservation / trials1 / concurrency1 / --require-pass；输出到`framework-audit/2026-09-14-f14-codex-v26.ndjson`。不自动重试、不换Claude arm。
- 本节为调用在途快照；结果以下续记为准，不预填PASS。

## F14 实际结果与停止点

**BLOCKED：正式结果仍为0/1，不能记PASS。P-GOV双审通过，P-F14关键门未通过，P-PUBLISH暂停；本轮未commit/push。**

- 原始记录恰好1行，batch=`e97bbb96-6b1f-4d83-8f83-f8f203853261`，run=`937b5ff2-7ef3-4964-addb-d9ca8a724f43`，harness=`codex-cli 0.154.0`。
- 文件687878 bytes，SHA256=`eb6eb75213943e8a974a037dcec0199feb449e49262ec0b106c7a77b012ec7f4`，保留raw_stdout/raw_stderr/trace及原判分，不覆盖旧失败记录。
- 已返回完整答案：42项claims，`claims_pass=true`、`source_pass=true`、`native_response_pass=true`；8个target_checks均complete=true。context/scoring/manifest三项stable均true。
- 总门未过：`shared_scope_audit.status=UNKNOWN`，violations为空、unknown共5条；具体为Codex原生`Reconnecting... 2/5`至`5/5 (request timed out)`及`Falling back from WebSockets to HTTPS transport. request timed out`。这些在原评分器里进入`unclassified_activity`，同时令trace_policy/reachability为false。
- 严格区分：不是没有返回答案，也未检出某个回答断言失败；但不能仅凭42项内容通过就抹去UNKNOWN，或把这行重写为正式行为PASS。运行器只发起一次trial；日志中的多次重连是该次Codex原生传输内部行为，不是主agent追加试验。
- 下一步需要delta授权：检查并修复评估器的窄传输事件分类，保留未知活动的default-deny，补正反例并独立审查；评分代码变更须提升评分身份、冻结新manifest，额外真实F14试验仍须明确新额度。不得为当前行原地改分，不切换Claude替票。
- 本次批准的唯一真实调用额度已用尽。未修改评分器/配置/模型、未自动重跑，未把静态96/0/0或治理PASS替代F14行为票。

## 2026-09-14 后续批准：最小成本传输分类补修

用户随后要求「补修，淡水最小成本验证」，按「但是最小成本验证」执行；前节未修状态是历史快照。

- 新代码仅scripts/run-agent-context-ab.mjs：精确识别Codex 0.154.0的timeout reconnect（1..5/5）与WebSocket→HTTPS fallback原生通知，字段集合/消息全文严格匹配，保留原event。未知错误、额外字段、近似文字及其他工具活动仍拒绝；不修改Claude投影行为。
- 评分revision提升为v27-codex-transport-notice-classification；源码SHA256=180357d2bbf8c97a28c93e6fc65c8f7b46b0cdb618d5feceb7cad854f1d77595。协议数据结构未改。旧v26 manifest不再适用于修改后的评分器，未来live必须另冻结，不能复用旧绑定。
- npm run test:agent-context-ab-evaluator --silent 两端完整本地自测均PASS（各含4个fixture/320个claim反例）；新增通知正例、近似/字段扩展反例、缺答案/错答案、同流越界I/O及Claude伪装描述反例。node --check与git diff --check通过。
- 临时内存副本撤掉通知分类后，自测以transport notice not preserved准确转红；生产文件从未置红，随后两端完整自测再次PASS。
- 保存日志只做离线分类回放：恰好5条unknown改为保留event的runtime_notice，其他trace及answer与旧结果相同。原F14文件仍1行、SHA仍eb6eb75213943e8a974a037dcec0199feb449e49262ec0b106c7a77b012ec7f4。首次包装遗漏outputTruncated导致ReferenceError，补齐原文辅助函数后才获得PASS，不把包装错误当生产失败。
- 本轮没有新live评测调用、没有重判/覆盖原0/1、没有重新跑整仓验证或commit/push。补修本地验证与正式F14 live票分开；本地通过不宣称取得新live PASS。独立窄复核结果待以下续记。

- 独立冷启动transport_delta_review：**PASS，0 findings**，绑定上述源码SHA。两端本地自测再次通过；独立隐藏command字段反例被拒，临时内存中删除精确字段守卫后该反例被错误放行，确认边界承重。旧日志hash独立核对未变。无live调用、编辑或历史重判。
- 当前补修状态：**DONE_WITH_CONCERNS**。C1窄分类/default-deny、C2两端隔离、C3历史票与本地证据分列均PASS。正式F14新live票及发布仍未执行，按用户最小成本要求保留，不外推整仓健康或新行为PASS。

## 2026-09-14 v27 单格 live 补票（新授权）

- Source：用户最新「最小成本跑。」明确授权一个Codex F14样本；单并发/trial1，不重跑Claude/整套评测、不自动追加试验、不改模型/配置。
- 本次只执行已审补修的P-F14验证，不启动新研究/实现/多agent评审；其余十二项状态不变。预算为一次运行器调用；原生CLI内部重连不冒称新的独立样本。
- 发射前已核源码SHA=180357d2bbf8c97a28c93e6fc65c8f7b46b0cdb618d5feceb7cad854f1d77595与独立review一致；context仍6650c69397aad82f2ff1feec54bb3e09d93f0a1c2d9e30cf2018cc803f4092d7。
- 新manifest=2026-09-14-f14-release-v27.json，SHA=fcd02e1b136054387c3d6257409d088603f0bca2d3ef3633e315166bd432073d；scoring SHA=d0628b939d879935545384deafafb21c9532649d90744cc569c11608ec2cfea6。describe=RELEASE_BOUND、F14 live_ready=true。
- 新输出=2026-09-14-f14-codex-v27.ndjson（发射前不存在）；旧v26文件保留。断言：恰好1条新记录、判据/上下文/manifest稳定、claims/read/scope/native各门逐字段核对；任何FAIL/UNKNOWN不能改写为PASS。以下待真实结果续记。

### v27 实际结果：仍未取得有效PASS，停止新增实测

- 运行器exit1，正式0/1；恰好1条记录，batch=d20cf312-5320-4475-8804-b8576f07ee0c，run=0d2a2f07-9b89-451c-afda-038119f7d3b8。文件690734 bytes，SHA256=e1450f9783aff1b4db8e971218306a0cd85b7363a3afd773f45f0b8a5242dd93。
- claims_pass/source_pass/native_response_pass/model_identity_pass均true；42项回答与8个必读target全通过，context/scoring/manifest均stable=true。没有检出的越界操作（violations=[]），但shared_scope_audit=UNKNOWN、reachability=false，不能抹去总门失败。
- 这次5条未知活动的原因文本变为`stream disconnected before completion: Connection reset by peer (os error 54)`：4条Reconnecting... 2/5至5/5，以及1条WebSockets→HTTPS fallback。raw_stderr同时记录真实WebSocket连接被重置。v27只精确覆盖request timed out，未覆盖此次连接重置；这是补修覆盖仍不足，不是42项内容断言回归。
- 原生usage：input_tokens=1508175，cached_input_tokens=1382400（相减非缓存输入125775），output_tokens=2080，reasoning_output_tokens=107。一次样本并不等于一次底层模型请求；这里只记原生计数，不推算金额，也不宣称零成本。
- 本次新授权只用1个trial，未追加实测、未改分、未新改代码、未commit/push。后续最小成本路径：用v26/v27两份原始日志离线补全传输分类正反例，避免继续用付费live试验发现错误文案变体；正式新试验与发布仍待后续决定。
- 当前整体状态：十二项治理已落地并双审通过；传输分类本地补修有证据但live暴露覆盖缺口；F14有效PASS及发布仍未闭环。恢复先读本节，不把上节本地PASS误当live通过。

## 最终闭环执行（用户授权：解决全部并提交发布）

用户随后明确授权「用最具性价比、最能解决问题的方式解决，完成所有闭环，然后提交发布」。本节取代前面暂停状态；不删除任何旧分数或失败经过。

### 评分语义与成本选择

[OpenAI官方非交互文档](https://learn.chatgpt.com/docs/non-interactive-mode)定义独立的turn生命周期、error与item事件；工具操作在item流中。文档不保证具体错误字符串，因此本仓恢复判据来自已捕获原生事件和正反例验证，不把某份错误文字枚举当平台完整协议。

v28识别严格形状的重连/协议回退状态；必须处于同一turn，通知后有答案且最终turn.completed，才保留为runtime_notice。无完成、失败/换turn、空答案、额外字段及未知活动仍不能免责；真实I/O始终独立审计。Claude投影不改，Codex复评模式对Claude输入明确拒绝。

两份真实执行的模型输入合同与context均未变，修的是确定性评分器而非被测指令。故复用原始完整轨迹重新评分，不继续支付模型生成费用。原样本仍只有两份：衍生复评不是新的live、不是新抽样，更不把2份原样本+2份复评累加成4份。

### 复评合同与结果（首次v28候选，零新增模型实测）

- runner SHA=a60b7030455e17f3e934818a0a4a14483d74cd5c272dda7164cc2eb4709f371a，revision=v28-recovered-transport-and-evidence-rescore；scoring SHA=d127917a3b0e8ec7a7f119926b94fe5e5aa2c1335c384b973d87660416cdabb7。
- 当前context仍6650c69397aad82f2ff1feec54bb3e09d93f0a1c2d9e30cf2018cc803f4092d7；新manifest=2026-09-14-f14-release-v28.json。复评核对外部指定原SHA、原manifest、fixture/schema/context、原执行稳定性和单个完成turn，再从raw_stdout重新解析answer/trace，不信任旧派生check。
- 原v26 run=937b5ff2-7ef3-4964-addb-d9ca8a724f43：复评**1/1 PASS**；新制品2026-09-14-f14-v26-rescored-v28.ndjson，SHA=17d3d475d61f6b352be49b53178232524ad8ce10d24323cc7977834c2769053b。
- 原v27 run=0d2a2f07-9b89-451c-afda-038119f7d3b8：复评**1/1 PASS**；新制品2026-09-14-f14-v27-rescored-v28.ndjson，SHA=3e2b01daae228fb401c67d4d1b1d36c4f29b83c4888ce2e23084b35fabc4e05a。
- 两份均42项claims、8个必读target、scope=PASS；original_passed=0、new_model_calls=0。旧文件SHA与前文一致。新输出独占创建，重跑到已有输出拒绝，不原地改分。
- 可复现命令：`node scripts/run-agent-context-ab.mjs --root <本仓绝对路径> --arm candidate --harness codex --fixture F14-flow-preservation --rescore <原始单行ndjson> --source-sha256 <前文原SHA> --source-release-manifest <对应v26或v27.json> --release-manifest framework-audit/2026-09-14-f14-release-v28.json --output <不存在的新文件>`。必须使用相同context；漂移即拒绝，不能假定任何未来checkout仍可复现。

### 发布前验证与保护范围

- `bash scripts/verify.sh` 本轮新鲜结果**96/0/0**，包含双端evaluator自测、新反馈S21b与既有hook/绑定回归。
- 本地自测覆盖复评成功/错hash/错context/fixture/schema/manifest/失败源/覆盖拒绝；PATH不含Codex或Claude，测试子进程不能意外发起live。人为错误的旧derived answer被忽略，新答案从raw重新构建。
- 两个内存mutation独立转红：取消同turn恢复条件→unrecovered/unknown error passed；取消字段集合约束→near-match transport event was exempted。生产文件始终未置红。
- 既有9个治理源码/数据/接线文件仍等于此前两轴审查hash；本计划和CHANGELOG仅追加新授权/修复叙事。十二项决策保留，Q4候选/10月2日复盘/观察项仍按批准的触发条件，不假装已执行未来工作。
- 发布排除`.claude/observability/observations.jsonl`、`.claude/observability/rules.yaml`、`memory/retrieval-log.jsonl`；不改全局配置/下游/根适配器。仅向upstream/main普通推送，不向backup推送。
- 独立双轴终版与发布证据以下续记；本段不提前声称远端已发布。

### v28 最终绑定（补齐离线参数准入后）

- 收尾发现并补齐`--rescore`漏值可能落回live模式的入口缺口。缺值、下一项是flag、重复flag、等号写法全部在任何模型调用之前exit2；回归测试把PATH置为无Codex/Claude，检查零输出制品。未发生真实误调用。
- 最终runner SHA=46cb4002de226aaa16b185f2de8eb0afbf573a16c3ce2c16ea8a99606194bb7a；scoring SHA=1a6c98cc958c8b0905fa9788d363eb5c061e1ba1b446dbd2e4ac5ed4853a7dd4。context和fixture不变，revision仍v28。前面的候选manifest/复评保留为审查历史，不作为最终绑定。
- 最终manifest：2026-09-14-f14-release-v28-final.json，SHA=009ca2054ca8b7d28407ed6872e31156f4b6ab082c67ffb9bc724f90bcefac9c。
- 最终v26复评：2026-09-14-f14-v26-rescored-v28-final.ndjson，SHA=5757efb55204f46516e8b26b596dc57dae7ff4fb88857914597441fcd6233917，1/1 PASS。
- 最终v27复评：2026-09-14-f14-v27-rescored-v28-final.ndjson，SHA=e133a9431527bbf69e7931677cbf0cca07fe34997c06e7b371a6980bf43f5724，1/1 PASS。两份仍绑定原run IDs，original_passed=0、new_model_calls=0；不增加样本计数。

#### Standards 终版

独立release_standards：PASS，0 findings。首轮24项独立反例/两份真实receipt重算一致；撤fixture绑定mutation转红。增量轮另验证15种异常离线参数均exit2、stdout空、无制品、零模型调用；删除这一增量可还原首轮已审代码hash。终版绑定上述46cb4002源码及三个final制品hash，未读Spec报告。

#### Spec 终版

独立release_spec：PASS，0 findings，未读取本轮Standards报告。各54个原生事件逐项重算（21条完成命令/5条恢复通知），两份answer/check/trace与终版receipt完全相同；42项claims/8个必读target全部通过。当前205文件context、源/新manifest、fixture/schema/稳定性全部验证；另跑12个恢复/字段反例、9个异常参数反例及两个内存mutation。把恢复通知改回UNKNOWN时两份均FAIL，确认0→1来自传输分类纠正而非放宽内容/I/O门。

Spec明确确认：归档真实行为可关闭本次F14判分阻塞，无须新增模型生成；只算两份原样本，不声称新增live或fixture明确延期的完整S9运行链。终版绑定与Standards相同。

### 发布检查点

- P-GOV=DONE：12项人工裁决已落地；延期/WATCH保持真实触发与后续人工责任。
- P-F14=DONE：两份真实样本在有据修正的最终评分器下均PASS，零新增模型实测；保留旧失败及全部来源。
- P-CHECK=DONE：最终46cb4002代码已完整verify **96/0/0**，两轴终版PASS；git diff --check通过。
- P-PUBLISH进入执行：23个精确路径，只包含治理代码/数据/叙事与本次完整证据；排除observations/rules/retrieval。远端main发射前为8d1bfc3，与本地基线相同。
- 本节为提交前快照，避免把自身提交SHA硬编码进自身内容。最终发布真值为普通Git提交 `fix(evolution): close feedback and recovered transport evidence` 在upstream/main的SHA，以及该SHA的GitHub Actions结果；恢复时直接核验这两处，不把本快照误读为永远未发布。
