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

# 本地调用合同

下游任务先验证 Project Gate。默认只读分析/设计，不直接改代码，不拥有 workflow 节点。
绑定 module、调用者、真实证据、必须保留的行为及 caller 的 scope/U-ID/resume_target；未知依赖
标 UNKNOWN，不能编造代码或 adapter 证据。普通 depth 诊断无需三 agent。
内部原语结果由调用方写入自己的制品与 handoff；standalone completion 按共享规范判断实际
context-cost 和已授权落点，不以调用本 skill 自动创建项目交接。

选择最小模式：快速 depth/interface/deletion 诊断；依赖约束下 deepening；或用户明确要求的
替代 interface 设计。最后一项严格执行 DESIGN-IT-TWICE 的 Plan/批准/独立串行门。
来源：source03，MIT，pin `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`。

# Codebase Design

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles wherever code is being designed or restructured. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Glossary

Use these terms exactly: don't substitute "component," "service," "API," or "boundary." Consistent language is the whole point.

**Module**: anything with an interface and an implementation. Deliberately scale-agnostic: a function, class, package, or tier-spanning slice. _Avoid_: unit, component, service.

**Interface**: everything a caller must know to use the module correctly: the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature (too narrow, they refer only to the type-level surface).

**Implementation**: what's inside a module, its body of code. Distinct from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake). Reach for "adapter" when the seam is the topic; "implementation" otherwise.

**Depth**: leverage at the interface. The amount of behaviour a caller (or test) can exercise per unit of interface they have to learn. A module is **deep** when a large amount of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_: a place where you can alter behaviour without editing in that place; the *location* at which a module's interface lives. Where to put the seam is its own design decision, distinct from what goes behind it. _Avoid_: boundary (overloaded with DDD's bounded context).

**Adapter**: a concrete thing that satisfies an interface at a seam. Describes *role* (what slot it fills), not substance (what's inside).

**Leverage**: what callers get from depth. More capability per unit of interface they learn. One implementation pays back across N call sites and M tests.

**Locality**: what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place rather than spreading across callers. Fix once, fixed everywhere.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, mockable, swappable parts; they just aren't part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.

## Designing for testability

Good interfaces make testing natural:

1. **Accept dependencies, don't create them.**

   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, don't produce side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.

## Relationships

- A **Module** has exactly one **Interface** (the surface it presents to callers and tests).
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as ratio of implementation-lines to interface-lines** (Ousterhout): rewards padding the implementation. We use depth-as-leverage instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow: interface here includes every fact a caller must know.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Going deeper

- **Before deepening a cluster given its dependencies**, read through EOF [DEEPENING.md](DEEPENING.md): dependency categories, seam discipline, and replace-don't-layer testing.
- **Only when the user explicitly wants alternative interfaces**, read through EOF [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md): after an explicit alternative-interface request and approved read-only design phase, obtain at least three cold independent designs strictly serially, then compare depth, locality, and seam placement.


## 设计交付门

结果逐项说明 module/caller、完整 interface、隐藏 implementation、seam 位置、真实 adapter、
interface 行为测试、deletion test 和 trade-offs。仅有推荐时标 PROPOSED；真实用户选择才标
ADOPTED。选择设计不授予实现或 Git 效果。没有真实证据的项保留 UNKNOWN/NEEDS_CONTEXT。

## TypeScript packages：按需边界配方

用户明确要求把 TS package 的 interface 隐藏规则接入实际检查时，在提出或执行该配方前全文读
[references/ts-module-boundaries.md](references/ts-module-boundaries.md) 和
[assets/dependency-cruiser.config.cjs](assets/dependency-cruiser.config.cjs)。该配方使用完整五条具名
error 规则，不以源 prose 的“四条”替代实际 config。默认仍只读设计；配置写入、依赖安装、
example/检查变异、README pointer 与 Git 各取父 U-ID 明确权限交集，缺依赖或非 TS 只提 proposal。

<!-- FILE_END: codebase-design/SKILL.md -->
