# 发布前专项审查计划

Source: 用户要求发布前 review，及既有修复授权。NO_PIN。
前提：已有中途阻断和假健康反例，必须解；复用既有双轴code-review和已冻结代码，不重造完整审查制度。
模式：Sequential（原生critical reviewer一次一个）；不执行发布/授信，故无需新增发布批准。
1. 冻结FILE_SET与字节SHA，preflight验证非空范围/双轴输入/框架作用域。
2. 两个冷启动quality-gate串行审Standards与Spec，第二轴不读取第一轴结果。Runtime分区和负例/mutation限自有临时副本。
3. 分列聚合，Critical/Important先进入已授权修复阶段，修后独立终版闭合；未闭合问题和实际会话UNKNOWN阻止发布放行。
Gate: scope SHA稳定，两轴证据完整；每个Major/Critical有复现，修复有红→绿与final bytes审查。候选未变化时不重复无关全量测试。
现有可执行验证：node --test scripts/test-codex-hook-health.mjs scripts/test-codex-trust-hooks.mjs；node --test scripts/test-source-guard-preserve.mjs scripts/test-codex-child-hook-integrity.mjs；node scripts/test-hook-source-digests.mjs；npm run check:hooks --silent。都在SCOPE.review_root运行，不在生产做变异。

## Direct 配置补充阶段

新增证据表明：同一框架根在不同 CODEX_HOME 中具有独立信任状态。保持 revision3 七文件包不变，补充审查维护执行器与精确范围记录。
先做配置目录拒绝的红测试，再将执行器锁定到已审母仓/系统目录这一对；输出源根与 CODEX_HOME，拒绝继承其他目录后误启用。随后冻结 SCOPE-03，通过冷启动双轴独立补审。当前 Muse/Direct 的旧信任修复有独立官方读回与真实 GUI 启动证据；不据此放行母仓候选，也不把未使用的母仓/Direct 组合纳入自动授信。
