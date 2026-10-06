# U007 接口补充 3：真实子线程与探针释放

W10已交付20项离线测试通过，但其“一个runtime仅接受一个thread”限制会阻断获准的原生协作。不能把该限制作为削弱T的理由。下面是主协调的必要共享接口修正；不增平台、案例或预算，不宣称本机子Agent已验证。

## 1. 线程登记

case runtime新增 `registerThread({threadId, parentThreadId})`，由driver调用，不是候选可调用的工具。

- parentThreadId=null 表示driver从本次 thread/start 实际响应得到的当前根线程；初始只能登记一个根。只有合法fresh边界、resumeMessage之后，才接受不同的新根；旧根与其后代不再可调用工具。历史账保持。
- parentThreadId为当前已登记家族内线程时，登记实际原生证据确认的子线程。拒绝未知parent、同ID换parent/根、旧家族复活与伪造新根。重复相同登记可以幂等并留可核关系。
- handleTool仅接受当前已登记根或其后代。子线程可读已到的合法资料、在共同许可内写文件并留自己的身份；不能取得未来资料、扩大权限或覆盖无关工作。阶段推进、确认/重试、人类问答及fresh由根协调者负责，子线程调用此类控制工具明确拒绝并留原请求。写入的任务分工/语义权限仍由原生派发、候选及J核，不从登记自动授予。
- driver在根thread/start完成后、turn/start前登记根；只从已知parent的原生 thread/started source 或原生 collabAgentToolCall 的receiver关系登记child，不把模型文本或fixture_worker作为原生登记依据。原始事件及关系留证。未知child的工具不能假装属于根；所有工具/失败/usage保持child原ID。
- fresh前driver停止或等到全部原家族活动工作真实终态；然后resumeMessage、新thread/start、登记新根、下一turn。单纯新thread ID不证明后台已停。

Context单测须覆盖：已登记child合法读/写，未登记/伪parent拒绝，child不能推进阶段/请求fresh，fresh后旧根和旧child拒绝且新根可继续、原失败历史不丢。driver离线测试须实际调用这个API并记录原生parent-child传播；集成时不能只用无约束stub掩盖缺接线。

## 2. 补正探针与U007就绪的先后

原补充1“J-U007就绪后才生成run manifest”适用于正式开发/隐藏比较；若同样套在能力探针上，会和J检查真实能力形成循环。按原已批准U007任务卡，主协调可以在绑定源码/实例/最小输入/作用域/断言/停止/证据之后，单独注册并释放至多6池内能力/driver探针，先取得实际证据再给J-U007。探针也计144总池，真实失败保留，不称正式比较已放行。

run manifest用 `runtime_release.stage='probe'|'development'|'hidden'` 和 `status='READY'` 表达具体单run授权；默认比较manifest仍BUILD_ONLY。probe必须带 `probe_id`、本次登记路径、明确实际输入和小预算。主协调负责实际签发；worker本批仍0真实模型调用。driver校验stage枚举并保留，不因字段存在就自行创造授权。development/hidden仍需真实独立U007/后续阶段证据。

<!-- FILE_END: u007-interface-addendum-3.md -->
