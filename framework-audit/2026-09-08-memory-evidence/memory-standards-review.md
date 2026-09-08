**Standards：FAIL — 2 项 Important，均为本次新增。**

1. **损坏 manifest 后仍移走证据。** [daily_governance.py:315](/private/tmp/memory-final-review/files/memory/scripts/daily_governance.py:315) 未校验现有日志便追加并归档。内存探针预置半截 JSON 后，首次返回 `0`、active 被移走；按原参数重试返回 `2: pending manifest line 1 is not valid JSON`。原文仍在归档，但裁决记录不可解析，恢复无法完成。违反证据保全及“先持久化有效裁决，再移出 active”的约束。

2. **manifest 软链可导致越界写入。** [daily_governance.py:310](/private/tmp/memory-final-review/files/memory/scripts/daily_governance.py:310) 直接 `open("a+")`，未拒绝软链；恢复分支却明确拒绝软链。模拟 manifest 指向无关文件时，冻结函数向该文件追加事件、移走 pending，并返回 `0`。违反 AGENTS K6 的范围与用户文件保全要求。

实际验证：37/37 冻结哈希匹配；20 个代码／配置文件语法检查通过；三种 disposition 正常路径、幂等重试及 5 项 semantic 函数探针通过。上述异常通过**内存文件系统替身执行冻结函数**复现，未操作真实数据。

限制：只读沙箱下未运行完整测试套件、真实文件系统故障或迁移 apply；未审 Spec。项目路径探针因包含 `../beta` 被自动范围守卫判为跨项目访问并拒绝，未绕过，也未计为通过。