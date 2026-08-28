---
name: codebase-design
preamble-tier: 1
version: 1.0.0
description: |
  工程模块设计原语：用 Module / Interface / Depth / Seam / Adapter 的稳定词汇，判断模块是否足够深、
  接口是否把复杂度藏在正确位置，以及测试面应放在哪里。用于模块拆分、接口收敛、deepening、seam
  选择和可测试性设计；不用于通用 UI 设计、产品流程设计或无代码对象的泛“接口设计”。(luca_gstack)
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
context-cost:
  self: 3600
  runtime-estimate: 9000
  shared-refs: [DEEPENING.md, DESIGN-IT-TWICE.md]
  recommended-model: core-execution
---

## Preamble（先执行）

```bash
git branch --show-current 2>/dev/null || true
python3 .claude/observability/scripts/get_rules.py codebase-design "*" 2>/dev/null || true
```

下游项目任务必须先经过 Luca Project Gate；框架自身的 meta/skill 设计不要求项目 pin。本 skill
默认只做分析与设计，不直接改代码；若用户同时要求实现，把设计结论交给后续工程执行并另行验证。

## 定位与边界

**Defining constraint：把大量行为藏在小接口后，接口落在清晰 seam 上，并能通过该接口测试。**

这是可被 `tech-spec`、`code-recon` 或工程实现内部调用的共享设计原语，也是可独立调用的 skill。
它没有固定 workflow 产物，不拥有工作流状态，也不是主流程必经节点。
**Handoff 约定：** standalone/internal 调用不单独写 workflow handoff；由调用方把采用的 interface/seam
结论带入自己的正式产物与 handoff，避免为一个分析原语制造空节点。

来源：`mattpocock/skills` 的 `skills/engineering/codebase-design`（MIT），上游锚
`6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`。Luca 适配增加了项目边界、按需引用、并行降级与验收合同。

## 共享词汇

在同一份分析中严格使用以下词，不随意换成 component/service/API/boundary；稳定词汇本身就是本
skill 的价值。

- **Module**：任何同时具有 interface 与 implementation 的东西；可以是函数、类、包或跨层切片。
- **Interface**：调用者正确使用 module 必须知道的一切，包括类型、约束、顺序、错误、配置和性能特征。
- **Implementation**：module 内部的代码与行为。
- **Depth**：interface 的杠杆率。调用者每学习一单位 interface，能获得多少行为。大量行为 + 小接口是 deep；接口几乎和实现一样复杂是 shallow。
- **Seam**：无需在调用点编辑代码，就能替换行为的位置；也就是 module interface 所在的位置。
- **Adapter**：在某个 seam 上满足 interface 的具体实现；它描述角色，不描述内部材料。
- **Leverage**：深度给调用者的回报；一次实现服务多个调用点与测试。
- **Locality**：深度给维护者的回报；变化、知识、缺陷与验证集中在一处。

## 核心判断

### Deep 与 shallow

Deep module：

```text
┌─────────────────────┐
│   Small Interface   │
├─────────────────────┤
│                     │
│  Deep Implementation│
│                     │
└─────────────────────┘
```

Shallow module：

```text
┌─────────────────────────────────┐
│       Large Interface           │
├─────────────────────────────────┤
│  Thin Implementation            │
└─────────────────────────────────┘
```

设计 interface 时依次问：能否减少入口？能否简化参数？能否继续把约束和分支藏进 implementation？

### 四条原则

1. **Depth 是 interface 的属性，不是代码行比值。** 内部可以有多个私有 seam，但不应为了测试把它们全部暴露给调用者。
2. **Deletion test。** 想象删除 module：若复杂度一起消失，它只是 pass-through；若复杂度重新散落到多个调用者，它正在创造 locality。
3. **Interface 就是测试面。** 调用者和测试跨过同一 seam。测试若必须越过 interface，module 形状通常有问题。
4. **一个 adapter 多半是假设，两个 adapter 才证明 seam。** 没有真实变化点，不为“以后也许”引入间接层。

### 可测试性形状

- 接收依赖，不在 module 内偷偷创建不可替换依赖。
- 返回可观察结果，不把唯一结果藏在副作用里。
- 让测试通过公共 interface 观察行为，不绑定 implementation 状态。
- 小 surface area 不等于少能力；目标是用更少的调用者知识承载更多行为。

## 执行方式

### 1. 锁定设计对象

明确 module 候选、调用者、需要隐藏的复杂度、当前依赖、真实变化点和必须保留的行为。若对象不明确且
会改变 seam 选择，只问一个阻塞问题；否则基于仓库证据继续，并把推断标为 `INFERRED`。

### 2. 选择最小模式

- **快速诊断**：对一个现有 module 做 depth / interface / seam / deletion test 检查。
- **Deepening**：多个 shallow module 需要合并或重新放置 seam 时，读取 [DEEPENING.md](DEEPENING.md)。
- **Design It Twice**：用户要探索不同 interface，或首个方案杠杆不足时，读取 [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md)。

不要为了“完整”同时加载两个 reference；只加载本次模式需要的文件。

### 3. 交付设计结论

输出至少说明：

1. module 与调用者分别是谁；
2. interface 包含哪些入口、约束、错误和顺序；
3. implementation 隐藏了哪些复杂度；
4. seam 在哪里，为什么真实；
5. adapter 有哪些，是否通过“两 adapter”检验；
6. 测试如何只通过 interface 观察行为；
7. deletion test 的结果，以及被拒绝方案为什么 shallow。

若给出多案，最后必须给一个有理由的推荐；不要只把菜单扔给用户。

## 完成门

- 术语使用一致，没有把 type signature 当成完整 interface。
- proposal 比现状减少调用者必须知道的知识，而不是把复杂度改名后外泄。
- seam 对应真实变化或测试替身，不是 speculative generality。
- 测试面与调用面一致；内部重构不应迫使外部测试重写。
- 没有因为调用本 skill 静默改 workflow 状态或创建强制节点。

<!-- FILE_END: codebase-design/SKILL.md -->
