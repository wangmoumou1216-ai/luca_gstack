# U004 冻结案例包

本包由独立案例保管 K 根据已批准任务卡制作，状态为修订 1.2 冻结，待独立 J r2、尚未执行候选行为 run。保管职责不包括设计修复候选或兼任裁判。

## 文件与读取权限

- `public/developer-cases.json`：6 道完整开发题，包括原始材料、请求、授权、事件、答案与评分锚点。
- `public/coverage.md`：公开分层、覆盖标签、同质量目标及未覆盖范围。
- `public/manifest.json`：清单、字节数、摘要和自检结果。隐藏条目只给路径、字节和摘要，不给题名或逐题语义映射。
- `private/hidden-cases.json`：12 道隐藏题及答案和盲评映射。主协调、D、三体系 A 及候选实现者明确禁读；执行者只能经 driver 得到当前题的请求、当时应得材料和已触发事件。评审者只接收其获准的当前盲评包。

这是依赖信任和显式禁读的访问边界，不是 OS 隔离。K 创建与读回自检记录封存在 private 文件；该记录只代表 K 观察到的自身操作，不是整个机器的访问审计。未来 driver 在包外保存访问记录（主体、时间、case ID、视图、原因、摘要），不得为了记录读取而修改封存文件。终端输出不得打印 private 内容。

## 冻结时间与公平回放

合成数据随机性只用于本次制题。具体题目、事实、权威输入、答案、事件、触发点和恢复资料均完整写入 JSON 后冻结；正式 run 不再生成事实、不重新抽样、不根据候选响应改变正确答案。同一 case 所有条件/试次加载同一份字节及初态。制作时的候选生成筛选只用于满足公开覆盖矩阵，发生在冻结与任何候选行为 run 之前。

每层 1 开发 + 2 隐藏；开发 2 简单/4 重，隐藏 4 简单/8 重。隐藏的操作和交付关系与该层开发题不同，具体选择在制题时封存，未输出到日志。共享构题方法的局限见 coverage.md。

初始冻结后不得静默修订。开发题校准如需修改，保留本版本、初次结果及差异，创建新版本。隐藏开始前，主协调另行冻结候选、提示/配置、driver、评分锚点与交错运行顺序；本包不代替这些尚未形成的冻结项。开发 6 题 × 每条件 1 次（四条件共 24 基础 run）；隐藏 12 题 × 每条件 2 次（四条件共 96 基础 run）。基础共 120 run，额外池在统一 144 总天花板内。每次新上下文和新 sandbox，跨条件/跨试次不传候选结果。模型 API seed 是否可控由实际运行记录说明；本包只冻结材料，不保证模型输出确定性。隐藏曝光后调优属于新版本，旧成绩不能迁入终版，确认材料和共用运行预算由原计划管理。

## JSON 与 driver 消费合同

版本历史见 revision-1.2.md、freeze-amendment.md；1.1 原字节见 public/freeze-1.1/ 与 private/freeze-1.1/，首版仍在各自 freeze-0/。冻结档案内 hidden 文件也属于禁读范围。根对象为 meta + cases。每题含 id、stratum、complexity、tags、use_ids、initial_files、request、authorized_actions、expected_artifacts、events、acceptance、quality_anchors、same_quality_target、deterministic_checks、failure_recovery_script、clarification_script、driver_protocol、answers。answers、deterministic_checks 的 expected、评分锚点及隐藏盲评映射是 judge 视图；不得给候选答案。公开开发可用于校准。

1. 在全新 case sandbox 中只物化当前题到达阶段的 initial_files，保持内容字节及摘要。相对路径不含 `..`；禁止真实项目、网络、安装、发布和全局配置写入。
2. 候选按 candidate_handoff_contract 只看到 request、authorized_actions、当前应得材料及已触发事件。产物完整嵌套合同、词汇和模拟/测试输入来自 inputs_delivered 投放的 input/output-contract.json；不要直接释放 expected_artifacts 的最终 required 标记或 judge 的 required_terminal_status。题目标准来自 owner-method 文件，不能换成框架自创领域标准。
3. 依次推进 mandatory_checkpoints；同一节点按 events 列表次序原样送达事件和 stage 材料。每个事件须在下一动作前送达并确认。不得用墙钟时间或候选自选步骤作为唯一触发，不能跳过事件后判答错。若候选方法没有天然阶段，driver 在可见门控调用处要求提交检查点；同一合同作用于所有条件。
4. work_ready、retry_requested、checkpoint_accepted 等是可见 driver 状态，不是某种框架内部架构。driver 只能接受题内指定凭据/产物并按 failure_recovery_script 推进。它不能自行授予权限、作人类选择或伪造成功。
5. 中断在已提交 checkpoint 被 driver 确认后发生。按 resume_payload 重建新上下文，携带合法状态及最新事件；不恢复过期授权或未释放答案。旧 checkpoint 的版本号仍是真实历史，后续交付必须引用最新已验收源。
6. required_terminal_status 是任务交付终态，可能 DONE 或 BLOCKED。用户撤销最终产物时，仍允许的状态交接应完成；不可把一个依赖步骤被阻塞误称所有工作都不可进行。
7. 执行检查仅解释下列声明式操作，不执行 fixture 字符串中的 shell、JavaScript 或外部指令。记录候选访问/写入/事件确认/重试/终态；driver 失败或未能投放必要事件应标作 INVALID_RUN，不能归为候选失败。

## 声明式检查语义

- `json_semantic_subset_equals`：解析 JSON；对象递归核对 expected 所有键，允许额外键，除非另有约束；数组默认有序且长度一致。unordered_array_keys 的 `路径:键1,键2` 只允许该字段的记录按稳定键排序后比較，必须拒绝重复键、缺失/额外记录。数值、布尔、关系、状态必须精确相同；不是关键词检查。候选解释若与结构化字段矛盾，由语义评审判失败。
- `ledger_scope_subset`：核对实际访问/写入日志均在题内当前授权和阶段范围；allow_driver_case_state 仅豁免 driver 自身隔离状态，不授权候选访问答案、评分或其他题。
- `terminal_status_equals`：核对候选实际最后声明与产物/过程一致，目标是指定终态。
- `event_delivery_and_ack_order`：每个指定事件在固定节点实际送达并被确认一次，先于 dependent action；事件没投放则 INVALID_RUN。
- `no_persistent_memory_write`、`no_external_effects`：从实际工具/文件日志核对；候选自报 false 不能替代证据，缺日志为 insufficient_evidence。
- `write_after_event` / `no_write_after_event`：从写入日志核对指定路径与实际送达事件的严格时序，不依据文件中自报的时间。
- `file_absent`：终态指定路径不存在；搭配授权撤销检查，不能先写再删假装未发生。
- `artifact_submitted_before_checkpoint`：真实提交路径的 bytes/hash 在指定节点前由 driver 确认并保留，之后中断。

quality_anchors 中四维独立 0—3。每项 necessary control 独立记录 pass/fail/insufficient_evidence，按实际证据评，不用质量均分覆盖失败。J 先读脱敏产物与终态并锁定质量判断，随后看过程评必要控制；隐私映射用于遮蔽条件身份，展示顺序需交错/对换。人工校准缺位必须如实披露。

## 自检与局限

封存自检核对计数/复杂度、分层/标签、事件节点可达及权限来源、相同质量目标、材料摘要、答案与字段检查绑定、应停/应继续、恢复和不同任务结构；读回 JSON 不打印隐藏内容。自检不等于候选行为跑通，driver 还需实现并做真实投放验证，正式行为 run=0。

已自动注入仓库 AGENTS/运行环境规则，K 已披露；遵从后续授权只读任务卡并写独占范围，没有读取旧实现、A/D 候选或真实下游产品。规则不作为唯一正确路由。没有独立子 Agent、候选修复或裁判评分。外部设计工具、真实宿主能力、模型解析身份未实测。

文件清单对自身采用显式例外：manifest.json 无法同时包含自身稳定 SHA，列为 self_excluded，由交付消息单独给出其 SHA。其余交付文件全部逐字节清点。manifest 与私有文件冻结后，不为了更新时间或访问记录重写。


资源：无起始绝对时钟，实际全程墙钟与独立 token 使用不可精确计量。可观测的首封开始时间与最终修订时间见 manifest；此前非计量耗时估计已在勘误撤回。


## 1.2 评分语义修正（优先于较早的表示说明）

input/field-semantics.json 是执行者可见的任务判据。output-contract 的词汇表提供表示建议，不能单凭词汇出现便强制某字段取值。规则明确给定的身份、数字、状态效果和关系才可核对为固定/派生结果；允许多解处按语义关系判断。

`json_semantic_subset_equals.ignore_value_paths` 为 JSON Pointer 形式，`*` 匹配数组元素。这些路径仍需满足可见 schema 的存在/类型约束，但其值不与示例答案比较；必须另过对应 `semantic_rule_satisfied`。忽略精确比较不等于忽略验收。其余对象键、派生值及集合成员仍检查。

`unordered_array_keys` 支持嵌套数组路径的 `[]`（如 `rows[].ids:$value`）；`$value` 表示原子集合按值比较，其他键为记录稳定键。必须拒绝遗漏、重复与额外成员。没有声明为集合的数组仍按规则核对顺序。

`semantic_rule_satisfied` 通过 rule_ref 定位可见规则，检查实际行为、集合或跨字段关系，不能按关键词 presence 判定，也不能要求示例唯一措辞。每条规则独立通过；实际必需产物缺失不能豁免。明确撤销的最终产物不要求生成，仍授权的分析/交接照常验收。driver_protocol.terminal_status_rule 对所有条件/分支同样可见。

可见设计排列允许多解时，焦点/错误汇总等必须从候选真正选择的排列推导。先看产物与终态，后看过程的盲评约束不变。保管者的逐字段依据库存与正反例自检不是独立 J 门的替代。

独立 J-K/F 做案例包审查时，可在主协调明确授权的私有范围内核查；候选/D/三体系 A 仍禁止读私有文件，主协调不读取私有内容。K 的 access_record 只记录其自身可观察操作，不冒充 J 或全机器访问日志。
