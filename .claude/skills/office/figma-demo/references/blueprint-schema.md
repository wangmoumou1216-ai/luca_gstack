# Blueprint Schema — blueprint.yaml 字段定义

> 共享 reference。被 `/figma-demo` Phase 3 引用。
> 定义 blueprint.yaml 的完整结构、字段含义、必填/可选、默认值。

---

## 完整 Schema

```yaml
# ============================================================
# blueprint.yaml — Demo 级蓝图
# 由 /figma-demo Phase 3 生成
# Builder SubAgent 每次调度时读取摘要
# Orchestrator 每次节点完成后更新
# ============================================================

# --- META（全局信息）---
meta:
  topic: ""                          # [必填] topic slug，来自 current-topic.txt 或推断
  title: ""                          # [必填] Demo 的中文标题
  created_at: ""                     # [必填] ISO 8601 时间戳
  total_nodes: 0                     # [必填] 节点总数
  current_progress: "0/N LOCKED"     # [自动] 格式 "{已锁定}/{总数} LOCKED"
  input_source: ""                   # [必填] "口述+Figma截图N张" / "口述+Figma链接" / "仅口述"
  presentation_target: ""            # [可选] "内部汇报" / "客户演示" / "领导评审" 等

  # 全局设计参数（从 gstack token 体系继承 + Figma 解析补充）
  design_system:
    color_primary: "#FF8000"         # [固定] 不可修改
    primary_usage_plan:              # [必填] 主色使用位置，≤ 3 项
      - ""                           # 格式："节点N: 具体位置 → 用法（bg-primary / text-primary）"
      - ""
      - ""                           # 无第 3 处写 "无"
    color_tokens: "gstack-standard"  # [固定] 使用 gstack 标准 token
    custom_colors: []                # [可选] Figma 中无法映射到 token 的颜色
                                     # 格式：[{name: "--custom-xxx", hex: "#NNNNNN", usage: "说明"}]
    typography: "L1:text-15/500 | L2:text-13/400 | L3:text-13/n11 | L4:text-12/n11"
                                     # [固定] gstack 四级字号
    spacing: "4/8/12/16/24/32/40px"  # [固定] gstack 七档间距
    border_radius: ""                # [必填] 统一圆角规格："rounded-md(6px)" 或 "rounded-lg(8px)"
    shadow_usage: []                 # [可选] 阴影使用位置，≤ 3 项
                                     # 格式：["弹窗: shadow-lg", "下拉菜单: shadow-md"]
    animation_baseline:              # [必填] 动效基准值
      fast: "150ms"                  # hover/active 反馈
      standard: "200ms"              # 状态切换
      slow: "300ms"                  # 弹窗/抽屉
      max: "400ms"                   # 绝对上限
      easing_standard: "cubic-bezier(0.4, 0, 0.2, 1)"
      easing_decelerate: "cubic-bezier(0, 0, 0.2, 1)"  # 进入
      easing_accelerate: "cubic-bezier(0.4, 0, 1, 1)"   # 退出

  # 适配目标
  viewport_targets:                  # [必填] 至少 1 个
    - 1440                           # 桌面汇报
    - 1024                           # 投屏/平板
    - 390                            # 手机预览（可选）

# --- GLOBAL DECISIONS（全局设计决策日志）---
global_decisions: []                 # [自动] 由 Builder 在执行中产生
  # 格式：
  # - id: "GD-001"
  #   decision: "所有弹窗使用半透明遮罩 rgba(0,0,0,0.4)"
  #   decided_at_node: "node-03"
  #   decided_at: "2026-05-03T10:30:00Z"

# --- NODES（节点清单）---
nodes:
  node-01-{name}:                    # [必填] 节点 ID 格式：node-{序号}-{英文短名}
    name: ""                         # [必填] 节点中文名（设计师原话）
    status: "PENDING"                # [必填] PENDING/ACTIVE/REVIEW/LOCKED/BLOCKED/REVISION（与下文状态机+更新规则一致）
    complexity: ""                   # [必填] S / M / L
    figma_frame: ""                  # [可选] 对应的 Figma Frame 名或编号，多个用逗号分隔
    figma_has_screenshot: false      # [必填] 是否有 Figma 截图可参考
    description: ""                  # [必填] 一句话描述该节点的功能
    template: ""                     # [必填] "framework/xxx.html" / "none"（弹窗/独立组件）
    replace_module: ""               # [条件] 使用母版时必填："mod-main-canvas" 等
    
    # 子任务（仅 L 级节点必填）
    sub_tasks: []                    # [条件] L 级必填
      # 格式：
      # - id: "01a-layout"
      #   desc: "基础布局和信息结构"
      #   status: "PENDING"          # PENDING/ACTIVE/LOCKED

    # 接口定义（第一个节点无 interface_in，最后一个节点 interface_out 可选）
    interface_in:                    # [条件] 非首节点必填
      from: ""                       # 来源节点 ID
      transition: ""                 # 动画类型：slide-left / modal-up / fade-in / ...
      duration: ""                   # 时长：如 "350ms"
      easing: ""                     # 缓动：如 "cubic-bezier(0.25, 0.1, 0.25, 1)"
    interface_out:                   # [条件] 非末节点必填
      to: ""                         # 目标节点 ID
      transition: ""
      duration: ""
      easing: ""

    # 执行记录（由 Orchestrator 在调度后填写）
    completed_at: ""                 # [自动] ISO 时间戳
    builder_session: ""              # [自动] SubAgent session ID
    retry_count: 0                   # [自动] 重试次数
    self_check_passed: false         # [自动] 自检是否全部通过

  # node-02-{name}: ...（每个节点同样结构）

# --- PRESENTATION（演示模式编排）---
presentation:
  mode: "keyboard"                   # [必填] keyboard / auto / click
  sequence: []                       # [自动] 节点 ID 顺序列表
  transition_between_nodes: ""       # [必填] 节点间默认过渡："crossfade" / "slide" / "none"
  auto_play_interval: null           # [条件] 仅 auto 模式，单位 ms，如 3000
  show_progress: true                # [必填] 底部进度指示器
  show_fullscreen: true              # [必填] 全屏按钮
  keyboard_bindings:                 # [固定]
    next: "ArrowRight"
    prev: "ArrowLeft"
    toggle_auto: "Space"
    exit: "Escape"
    fullscreen: "F11"

# --- TRACKING ---
last_updated: ""                     # [自动] 每次更新时写入 ISO 时间戳
builder_sessions_total: 0            # [自动] SubAgent 调度总次数
assembly_status: "PENDING"           # [自动] PENDING / DONE / FAILED
```

---

## 状态机定义

### 节点状态

```
PENDING     初始状态，尚未开始
    │
    ▼ (Orchestrator 开始调度该节点)
ACTIVE      正在执行
    │
    ├──→ REVIEW    Builder 提交了产出，等待自检/审查
    │       │
    │       ├──→ LOCKED     自检通过，锁定，不再修改
    │       │
    │       └──→ ACTIVE     自检不通过，回退重做（retry_count +1）
    │
    └──→ BLOCKED   连续 3 次不通过，或遇到无法解决的问题
            │
            └──→ ACTIVE     用户介入解决后，回退重做

特殊状态：
REVISION    用户在 Phase 6 要求修改已 LOCKED 的节点
    │
    ▼ (重新调度 Builder)
ACTIVE      → 正常流程
```

### 蓝图级状态

```
blueprint.assembly_status:
  PENDING   所有节点未全部 LOCKED
  DONE      组装完成
  FAILED    组装失败（需要回退节点修复）
```

---

## 字段更新规则

| 时机 | 谁更新 | 更新什么 |
|------|-------|---------|
| Phase 3 完成 | Orchestrator | 创建完整 blueprint，所有节点 PENDING |
| 调度 Builder 前 | Orchestrator | 当前节点 status → ACTIVE |
| Builder 返回 | Orchestrator | 应用 blueprint_patch（status/decisions/sub_tasks） |
| 自检通过 | Orchestrator | 当前节点 status → LOCKED，更新 current_progress |
| 自检不通过 | Orchestrator | retry_count +1，status 保持 ACTIVE |
| 3 次失败 | Orchestrator | status → BLOCKED |
| 用户要求改 | Orchestrator | status → REVISION |
| 组装完成 | Orchestrator | assembly_status → DONE |
| 每次更新 | Orchestrator | last_updated + builder_sessions_total |

---

## 摘要提取规则（传给 Builder 的精简版）

Builder 不需要读完整的 blueprint。Orchestrator 传给 Builder 的摘要格式：

```yaml
# Blueprint 摘要（传给 Builder）
meta:
  topic: "{topic}"
  total_nodes: {N}
  current_progress: "{M}/{N} LOCKED"
  design_system: {完整传入 design_system 段}
  viewport_targets: {完整传入}

global_decisions: {完整传入}

nodes_overview:   # 只传 ID + 名称 + 状态，一行一个
  - "node-01-home: 启动页 [LOCKED]"
  - "node-02-list: 客户列表 [LOCKED]"
  - "node-03-detail: 客户详情 [ACTIVE] ← 当前"
  - "node-04-modal: 分享弹窗 [PENDING]"
```

**不传入的内容：**
- 已 LOCKED 节点的 sub_tasks 详情
- 已 LOCKED 节点的 self_check 详情
- presentation 段（Builder 不关心演示模式）
- tracking 段

<!-- FILE_END: blueprint-schema.md -->
