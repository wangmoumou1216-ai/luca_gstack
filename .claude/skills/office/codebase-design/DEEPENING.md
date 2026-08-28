# Deepening

在已有依赖约束下，安全地把一组 shallow modules 深化。使用 [SKILL.md](SKILL.md) 的
**Module / Interface / Seam / Adapter** 词汇。

## 依赖分类

先给候选 module 的依赖分类；分类决定如何跨 seam 测试。

### 1. In-process

纯计算、内存状态、无 I/O。通常可直接合并，在新 interface 上测试，不需要 adapter。

### 2. Local-substitutable

存在本地测试替身的依赖，例如 PGLite 对 Postgres、内存文件系统对真实文件系统。替身存在时可以深化；
在测试套件内运行替身。seam 保持 module 内部，不必把 port 暴露成外部 interface。

### 3. Remote but owned（Ports & Adapters）

团队自己拥有的跨网络服务。把 port 放在 seam 上，deep module 持有业务逻辑，transport 作为 adapter
注入。测试用内存 adapter，生产用 HTTP/gRPC/queue adapter。

推荐表达：在 seam 定义 port；生产提供网络 adapter，测试提供内存 adapter，让逻辑仍集中在一个
deep module 中，即使部署跨越网络。

### 4. True external（Mock）

无法控制的第三方服务，例如 Stripe/Twilio。deep module 接收外部依赖 port，测试提供 mock adapter。

## Seam 纪律

- **一个 adapter 多半是假设，两个 adapter 才证明 seam。** 通常是 production + test；若第二个
  adapter 没有真实理由，就不要为了间接而间接。
- **区分 internal seam 与 external seam。** 测试使用的内部 seam 不必泄露进 module 的公共 interface。

## 测试策略：replace，不 layer

- 新 interface 的行为测试已经覆盖旧 shallow module 时，删除绑定内部结构的旧单元测试。
- 在 deep module interface 上写新测试；interface 就是测试面。
- 只断言可观察结果，不断言内部状态。
- 测试应承受 implementation 重构；implementation 一变测试就必须重写，说明测试越过了 interface。

<!-- FILE_END: codebase-design/DEEPENING.md -->
