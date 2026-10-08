# U007-BASELINE-R1 review-bound delta — awaiting real human decision

本项不扩大原12源码路径、发布/桌面效果或native矩阵，也不重置任何旧票或Phase计数。

原R1 §4明确：“两轮后仍有Important交真人，不无界重跑。”本案累计按同一PO/RP修复链计：
1. B4 Spec v1 FAIL6/8：RP04缺跨产物对象判据，PO放过矛盾正文和永成功命令；原生invocation d4985b4f-2c2c-4031-92df-8a3a2c79979a已completed+accepted，失败票保留。
2. 受影响B3 v2 FAIL4/5：自由failure_policy/self_check仍可在规范投影中声称批准并跳过失败/依赖；原生invocation f22749e5-5d33-45eb-9898-8768c3048b97已completed+accepted，失败票保留。
不同version或phase不重置计数。R4默认允许解释值得多审一轮的理由，但此已批准R1的停止条款更具体；在真人裁决前不派第三轮冷Agent，不进入B5。

## 已完成可审查返修

仍仅修改原12中的B3源码/测试：明确PRD/原型/Figma三方输入与review_object判据；完整Markdown为结构字段的规范投影；断言只能使用实际含正反例的现有依赖图/strict handoff suite；failure_policy/self_check绑定共享公开source constraints，criteria限定公开rubric且去重，external_blockers只允许实际来源。不靠危险词枚举封堵，不执行生成的任意命令。

实际新suite、production hint、真实新增runner入口均退出0，零native。权限/失败策略约束单guard mutation实际exit1，恢复实际exit0；另外两个正文/命令守卫及旧两臂transport变异证据保留。完整原生语义/Plan质量、原A1/A2/A3/U5、原17分母与全面隐私仍未闭合。

冻结返修输入：U007-BASELINE-B3-gate-input-v3.json。该编号只是源字节身份，并非第三轮已获许可或已派发。下一步仍须独立B3终版核验→最终B4 Standards→Spec→正常hooks/immutableCI→publication gate→exact-head六CI普通merge→Desktop ownedv3 reverse+ff-only→主会话独立读回。

## 唯一待裁决

是否允许仅对上述同范围冻结返修再进行一次必需终版独立核验，并在它通过后沿用已有有限发布批准完成剩余既定门；若再有Important则停止并返回真人，不能再自行加轮？

选择停止则保留当前修复和原始三笔历史，不发布、不恢复桌面。尚未提交/推送PR，Desktop未修改。

## 真人裁决（保留上方历史待决记录）

2026-10-08T02:12:03.040Z，真实root用户消息msg_01a11948-2d5f-7631-9f84-99f705720b8d明确回复：“允许一次终版验收，通过后发布并同步”。对应call_66b5a8859ad14b17aaedc6c5f68c09a5；原native rollout L9860、row SHA2cbe9142c748eb49e3c76bfb74c0d3562a6c2f2a68539ca9b1f7968e0ccae845已独立核验。只增加一次终版独立验收机会，不改原12/外部效果范围；Important再出现即停。

## 2026-10-08 两项具体补修恢复（实际真人指令）

真人原生 L10166：`那你解决啊`；只恢复既有有限范围内 C4 verification 与 C5 同版本证据两项补修及既定验收/发布/同步。实际授权记录：/Users/luca/.codex/worktrees/a65e/luca_gstack/framework-audit/2026-10-07-agent-orchestration-live/U010-two-item-real-human-authorization.json，SHA 27fdf4be94712afee097519d914536aa80c4c4409beafdfd62d74fc54242c4b9。原 FAIL3/5、两轮停止和单次追加失败全部保留；不重置历史、阶段或完成分母。源码仅修改既有 U007-B3 两文件，保持 DONE 状态与结果；合法 assertion.command 约束适用于所有单元。正文投影/行为命令/DONE验证守卫以修复后同版本 source/driver/input/log 完整绑定，目标断言红、恢复绿；失败日志保留。继续串行必要独立门，只有 required PASS 才进入正常 hooks/immutableCI/PR/六项 CI/普通 merge/Desktop 精确部署逆补丁及 ff-only。范围外或不可解决条件另报告，不重复请求同两项常规补修授权。
