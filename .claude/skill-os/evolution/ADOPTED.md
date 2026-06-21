# 已采纳外部能力（ADOPTED）

> 演进 scout 发现 → 门禁通过 → 经 FUSION-RUNBOOK 落地/采纳的外部能力登记。
> propose-only：每条均人工裁决；记录复用方式、落点、钉版本、供应链结论、回滚。
> 明细见 `adoption-log.jsonl`；本文件是人读速查。

## CodeGraph（框架自维护 / 下游代码项目）
- repo: `colbymchenry/codegraph` · MIT · 52k★ / 3197 fork · 活跃（2026-06-21 仍推）
- gap: `GAP-fusion-impact-automation` · layer: **framework** · reuse_mode: **install(MCP/CLI)**
- **scope: 下游代码项目**（luca 设计产出的实现工程）；luca 自身小仓（md/yaml）价值边际，**不强装进设计环境**
- 钉版本: **v1.0.1 @ a1489f77a6d69538bfe29020b8366ee034f90860**（2026-06-13）
- 安全/供应链: install.sh 实读 = 下载 release tarball + 解压，`rm -rf` 仅作用自身 INSTALL_DIR/tmp，无 sudo / 远程 eval / 密钥读 / 数据外发；deps 干净（tree-sitter 系）
- **安全安装（不盲 curl|sh）**: `npm i -g @colbymchenry/codegraph@1.0.1`
- 落点: **不进 office/route-guard**（非设计 skill）；下游代码项目按需装为 MCP；可选喂 `fusion-preflight` 替手写耦合检测
- 行为 A/B: N/A（工具非 skill-prose）
- 采纳状态: **下游推荐，非 luca 核心采纳**。⚠️ 严格 scout（定论 verify, run 2026-06b）将其 **REJECTED** —— compatibility「非可落 skill、无 SKILL.md」（因它是 MCP/CLI 工具，非 Claude skill）。这是 **scout 兼容门的局限**（只判"可落 skill"，缺 install-as-MCP/tool 分支 → 系统性误拒 MCP 候选，待修）。人工裁定:它是合法 npm-MCP，但**对 luca 自身小仓边际**，价值在下游代码项目。实际 `npm i -g` 由用户按下游项目需要触发（未自动装）。

## OST（pm-skills opportunity-solution-tree → /ux-brainstorm Phase 3.6）
- repo: `phuryn/pm-skills` · MIT · 20k★ / 2055 fork · gap: `GAP-design-methodology-review` · layer: **application** · reuse_mode: **adapt-idea**
- 落点: `/ux-brainstorm` 新增 Phase 3.6 机会映射（OST）+ Phase 4.1 锚定
- 门禁: 静态 45/0 · **行为 A/B PASS**（Opus 回退；非 no-op + 无回归 保守/理想/非显+范式转变+守卫）· 红队清白
- 落地状态: 编辑 **live in 工作树**（随 /ux-brainstorm 精简重构一起提交）；回滚 ref `tag pre-fuse-ost-uxb`
- 弃用部分: pm-skills 的 `create-prd`（冗余于 /brainstorm 苏格拉底式 + Oracle，更弱）

<!-- FILE_END: ADOPTED -->
