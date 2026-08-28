# Design It Twice

当选定 deepening candidate 后需要探索不同 interface 时使用。第一案通常不是最优案，因此让独立视角
提出真正不同的形状，再用 **Depth / Locality / Seam placement** 比较。

## 1. 框定问题空间

先给用户一段简短说明：任何新 interface 必须满足的约束、依赖分类（见
[DEEPENING.md](DEEPENING.md)），以及只用于锚定问题的粗代码草图。草图不是预设答案；展示后直接继续。

## 2. 生成独立方案

优先并行派发 3 个独立 agent；可用并发槽不足时，串行做 3 次冷启动式独立推演，前一案不得作为后一案
的起点。每个 brief 都要包含相关文件、耦合证据、依赖分类、seam 后的行为，以及 SKILL.md 与当前项目
CONTEXT.md 中的稳定词汇。

三个默认约束：

1. **最小 interface**：目标 1–3 个入口，最大化每个入口的 leverage。
2. **扩展弹性**：支持已被需求证明的多种用例和替换点，不引入 speculative generality。
3. **默认调用者**：让最常见调用路径最简单，把罕见复杂度藏进 implementation。

只有存在真实跨 seam 依赖时才增加 ports & adapters 方向，不为凑数创建第四案。

每案返回：interface（含约束/顺序/错误）、调用示例、隐藏的 implementation、依赖与 adapter 策略、
leverage 最强和最薄的位置。

## 3. 比较并推荐

逐案展示，让用户能独立理解每案；随后按 depth、locality、seam placement 比较。最后明确推荐一案并说明
理由；若混合案更强，说明取自哪些案、为什么不会扩大 interface。不要输出无结论菜单。

<!-- FILE_END: codebase-design/DESIGN-IT-TWICE.md -->
