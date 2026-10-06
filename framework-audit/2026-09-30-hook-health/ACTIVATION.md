# 最终启用范围（revision3，终版双轴复核已通过，待人工启用）

源根：`/Users/luca/Desktop/luca_gstack`。仅 `candidate-manifest.json` 中 7 个文件；
授信配置目录：`/Users/luca/.codex`。执行器仅批准这一源根/配置目录组合；继承任何其他 CODEX_HOME 时，在子进程与修改前拒绝。输出明确携带这两个目录，11/11 仅指这一组合。
补丁 SHA-256：`3d90329de723ab5720769576e66f9a2c92ec0568a7920f8658a8da7ce8504729`（revision 3）。
基线源码摘要：`a229918d10266b91b6205ec46efb8ab65e3d612b3bd5458762caad617cecebf3`。
最终源码摘要：`e2ca1945db477cc2f1cf073c80e34c8cb58c4f25d9ac2fb5a1d48d0982f59691`。

## 维护窗口先决条件

共享源更新会影响已经启动的审查；这不是只在 SessionStart 检查一次的配置。
启用前由用户协调共享本物理根的在途会话与子审查完成或明确暂停，保存检查点，并停止新审查派发。
本任务不会自行中断其他会话。先使用原生线程状态核对已知任务，再确认未列出的 CLI/外部会话；
一次状态查询不是并发锁，维护期间仍需保持源码冻结。任一在途审查未协调完成则不启用。
只读 health 不提供会话空闲证明。当前审查票不能因启用完成自动获得 accepted 或 PASS。

## 会产生的效果

1. 检查每个现有目标的前镜像 SHA；两个新文件必须不存在。校验完整源码基线，拒绝任何并发修改。只应用本补丁，不 stage、commit 或 push。
2. 使用现有安装器为此根生成受审清单：`node scripts/install-codex-source-guard.mjs --root /Users/luca/Desktop/luca_gstack --preserve-other-roots`。保留其他根和其快照；bootstrap/loader 不改变。
3. 使用现有官方精确授信入口 `node scripts/codex-trust-hooks.mjs --host-launch --dry-run` 检查后，再执行 `node scripts/codex-trust-hooks.mjs --host-launch`。只更新本根 11 条命令的信任值，保持模型选择、账号信息、其他根与第三方 Hook 不变。脚本保留配置备份并使用官方 expectedVersion CAS。
4. 重新执行只读 health、11 条授信读回；重新加载受影响的旧会话后执行真实工具调用确认。新进程通过不代替该步骤。在途审查若已中断，稳定基线后重新冻结并重审，保留原票未完成的证据。

步骤 1–3 是同一受审维护批次，不能在应用源码后将当前会话仍能继续作为前提。若原会话已阻断，只能由人工维护终端执行此批次，不能换工具绕行。此文档本身不授予执行权。

## 保留与回退

`rollback.tar.gz` 保存逐文件前镜像，含兄弟会话已存在的模型路由 Hook 注册内容；`candidate.tar.gz` 保存完整后镜像。清单逐文件 SHA 可核验两者。
任何预检不符均不修改生产源码、安装或信任。关键检查使用优化模式下仍有效的显式异常；不可变清单核心和准确七目标另有独立指纹及allowlist。仅在补丁明确成功应用后才进入回退；失败的补丁命令不回退未写目标。之后若安装前失败，只回退仍匹配本次后镜像 SHA 的文件；两项新文件也只有内容仍匹配才删除，任何并发修改都保留并报告。
安装与 trust 前分别保存受保护 manifest 字节和官方精确条目的原值。若受保护更新已发生而随后失败，保存阶段日志、停止后续步骤；不得盲目还原全局配置或覆盖并发授权。按旧 manifest 字节及 11 条信任原值做显式、CAS 保护的恢复。

授权依据需单列为此 7 文件包及对应安装/11 条信任，不能沿用兄弟会话的 13 文件发布授权。

## 最新候选与复核证据

43文件FILE_SET及补丁冻结在release-review/SCOPE-02.json。启用helper本身SHA为bd0841252789a30d24d7816aaca60298342e26db59ce5cdbab5d3da8c78dc979；其绑定的manifest核心SHA为a279e95e60e431856586d47b68c1c581d8732ee3f6ecf192c83d8c15ac85e6de。默认命令是只读预检：

```sh
python3 framework-audit/2026-09-30-hook-health/activate-reviewed.py
```

原review2 PASS不得用于放行revision3。终版Standards候选复核PASS5/5，Spec候选冷审PASS8/8；helper还会拒绝未获得终版候选PASS标记的--apply。该标记也不代替人类授权或真实会话验证。

## 多根与多配置目录的维护范围

每次发布先列出实际使用的源根/CODEX_HOME组合，逐一核对注册、源码摘要、受保护安装和官方信任；不得把所有根与所有配置目录做笛卡尔积后自动授信。副本同步不会复制受保护安装，也不会刷新独立配置目录中的 trusted_hash。改动哪个源根，就协调它的在途会话、审核该根、更新其安装，并在每个实际使用该根的配置目录里精确复核11条。共享 bootstrap/loader 发生变化时，另做所有安装根的运行时审查。

本机当前已验组合为母仓/系统目录、Muse副本/系统目录、Muse副本/AIHub Direct目录。后者于本次补充诊断中独立刷新了现有11条旧信任并通过真实“新会话”启动；详见DIRECT-PROFILE-REVIEW.md。母仓/Direct并非当前启动组合，官方没有加载其11条注册；不得为凑齐矩阵修改项目授权。母仓候选启用依然仅限本文开头的组合，Muse副本源码未由本次补充修复修改。

维护执行器的配置目录收窄必须独立补审；补审未完成时 candidate-manifest.json 的 release_review_status 保持 PENDING_PROFILE_SUPPLEMENT_REVIEW，不能执行 --apply。补审结果以配置目录补充审查报告为准。
