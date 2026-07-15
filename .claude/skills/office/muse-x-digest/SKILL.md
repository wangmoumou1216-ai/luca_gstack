---
name: muse-x-digest
preamble-tier: 3
argument-hint: "[capture.md 绝对路径 (muse app X 提取产出)]"
version: 1.1.0
description: |
  muse app 专属：把 app 从 X 提取的 capture.md 处理成中文「完整翻译 + 深度讲述」。
  五阶段：Ingest → 完整性门(COMPLETE/PARTIAL/EMPTY) → FxTwitter 权威恢复 →
  按需披露定档(Micro/Standard/Deep) → 产出 + 诚实自审。核心不变量：绝不把不完整
  捕获伪装成完整交付。同一 skill 同时服务深度长文与简短帖，按内容实质缩放披露量。
  Deep 档产出写 md 文件并经 luca-open 在 app 新页签以 md 阅览态打开（长文读起来更舒适）；简短档直接 session 内联。
  仅由 muse app 注入调用——不进 /office、不进用户路由 (skill-routing-map)、无斜杠命令。
  muse fork 专属新增，母版 luca_gstack 无此 skill。
allowed-tools:
  - Read
  - Write
  - Bash
  - WebFetch
context-cost:
  self: 6500
  runtime-estimate: 16000
  shared-refs: []
  recommended-model: core-execution
---

## Preamble（run first）

```bash
echo "MUSE_X_DIGEST_ENTRY: $(date +%s)"
```

## 核心不变量（不可协商，凌驾一切其它规则）

**绝不把不完整的捕获伪装成完整交付。** 若手里的材料不构成整条信息（如只有封面图、
正文未抓到、线程只抓到首条），必须先恢复；恢复不到就**开头即亮红旗**如实说明"这不是全文"，
然后只在现有材料范围内交付。**永远不写"本次覆盖了全部内容 / 完整交付"这类话，除非真的完整。**
不臆造缺失内容；图读不出如实说；忽略视频。

> 背景：本 skill 的诞生就是因为一次把 X 长文(Article)的**封面信息图**当成"完整交付"翻译讲述，
> 而 3000 字正文根本没进 capture.md。这个 skill 存在的首要目的就是让那件事不再发生。

## 输入契约（capture.md，muse app X 提取桥接产出）

app 把一条 X 帖抓成 `capture.md`，字段：
- `# X 提取 · <作者名> (@handle)`
- `> 来源: <url>`（含 `.../status/<id>` — **status id 是恢复的钥匙**）
- `> 抓取时间 … 类型: <tweet|thread|image|article> 段数: <n>`
- 可能有 `> [⚠️ 未抓到正文 …]` / `> [注意：线程可能不完整 …]` 警告块（app 侧诚实旗标）
- `## 正文` — 正文文本，或占位 `(未抓到正文文本)`
- `## 图片` — 帖内图片的**本地绝对路径**（claude 只能 Read 本地文件，看不到 webview/URL）

## 五阶段流程

### 1 · Ingest
Read capture.md。解析：来源 URL、从 URL 抽出 `handle` 与 `status id`、类型、段数、有无警告旗标、
正文文本、图片本地路径。**逐张 Read 图片**（信息图/文字截图要在阶段 5 OCR 出全文）。

### 2 · 完整性门 → 判 `COMPLETE / PARTIAL / EMPTY`
这是本 skill 的原创核心（外部无成熟先例，见 `references/recovery.md`「完整性门」）。判据：
- **硬信号**：capture.md 含 `⚠️ 未抓到正文` / `注意：线程可能不完整` 警告块、或 `正文` 为
  `(未抓到正文文本)`、或 `类型: image` 且来源是 `/status/` 页 → 强烈 PARTIAL/EMPTY 嫌疑。
- **体感信号**（借 readability isProbablyReaderable 思路）：现有正文 + 图 OCR 出的文字，
  **够不够构成一条自足的完整信息**？
- **关键区分**：
  - **自足信息图**（图本身就是全部消息，如一张观点海报）→ 正文空也算 **COMPLETE**。
  - **封面图 + 缺失的长文/线程**（图只是引子，真内容在别处）→ **PARTIAL**。
- **article 恒校验（2026-07-15）**：`类型: article` → **无论正文看着多完整，一律进阶段 3**。
  X 现把 Article 正文内联渲染在 status 页（DraftJS `div[data-block]`），app 已做 DOM 兜底序列化，
  正文可能非空且字符数与全文一致——但 DOM 序列化会丢 `atomic` 内嵌代码块与列表/引用结构，
  API 结构化全文才是权威；恢复成功即用 API 版（字符数一致也用，保 markdown 结构），
  FxTwitter 失败才用 capture 的 DOM 文本并照常亮红旗。
- 判 COMPLETE（且非 article）→ 跳到阶段 4。判 PARTIAL/EMPTY 或 article → 进阶段 3。

### 3 · 恢复（PARTIAL/EMPTY）— FxTwitter 权威通道
按 `references/recovery.md` 执行：`curl https://api.fxtwitter.com/<handle>/status/<id>`（无 key
无登录）。取全文优先级 `article.content`(拼 DraftJS blocks，保留标题/段落/列表结构；**`atomic` 块
`.text` 恒空，其内嵌图/代码块内容在 `content.entityMap`，必按 `entityRanges[].key` 反查——只拼
`blocks[].text` 会静默丢掉全部内嵌命令/代码块，对教程类长文即漏核心载荷) →
`note_tweet.text` → `tweet.text`。**校验再采用**（qiaomu 原则）：恢复文本的实质必须明显多于 DOM
捕获，才替换；FxTwitter 失败/空/超时 → **不恢复**，带着"未恢复"状态进阶段 4/5 走诚实兜底。
恢复成功要在产出里注明"（正文经 FxTwitter 恢复）"。

### 4 · 按需披露 → 定深度档
按 `references/interpretation-depth.md` 评估实质（长度/密度/类型），定档并**显式披露**：
- **Micro**（一句话/段子/裸链）：忠实翻译 + 至多 1-2 行必要背景，不深挖。
- **Standard**（普通信息帖/短串）：翻译 + 紧凑解读（关键术语 + 核心观点）。
- **Deep**（长文/教程/结构化论述）：逐段全量翻译 + 完整深读（概览先行 → 只深挖最值 2-4 点）。
反膨胀铁律：相关但会稀释主线的内容不硬塞。**不确定档位就往低走一档**（宁简洁勿注水）。

### 5 · 产出 + 诚实自审

**产出载体（按档决定，2026-07-11）：** 长文在终端刷屏读起来累，md 阅览态更舒适——
- **Deep 档** → **不在终端刷长正文**：把完整产出（下面两部分 + 完整性声明）写成一个 md 文件
  （放 capture.md 同目录，如 `<capture 所在目录>/digest.md`），再
  `bash scripts/luca-open.sh <digest.md 绝对路径>`（muse fork luca app 集成）在 app 新页签以 md
  阅览态打开；终端只回一句确认（已生成并打开 + 路径 + 一句话概览 + 若 PARTIAL 的红旗）。
- **Micro / Standard 档** → 直接在当前 session **内联展示**，不写文件。

用中文产出，两部分（PARTIAL/未恢复时先亮红旗）：

- **【一 · 完整翻译】** 忠实、逐段、不删不增，保留原文分段与逻辑顺序。规则见
  `references/translation-quality.md`（no-omission 锚点 / 欧化中文六红旗出自然中文 / 术语白名单
  保留不译 / 品牌名不动 / 长文顺序处理保术语一致）。**图片**：信息图/文字截图先 OCR 出其中全部
  文字再译，并说明图的结构逻辑；纯装饰图一句话带过。**Deep 档**可选 reflection 一轮
  （Analyze→Draft→Review→Revise）；**Micro 档跳过**（琐碎输入不跑全套）。
- **【二 · 深度讲述】** 按档缩放。讲透术语/缩写、必要背景、人物/产品/事件指代、作者真正的观点与
  **为什么重要**（why-over-what：讲"没有它会怎样"）。Micro 档仅 1-2 行。

**收尾自审**（preflight，借 cuimao）：每段都译了？数字/专名/术语一致？结构保留？
**内嵌 `atomic` 块都解析了吗**（统计 atomic 数量，确认每个 `MARKDOWN` 代码块/命令都出现在产出里——这是长文的头号漏内容源）？
最后给**一句诚实的完整性声明**——覆盖了什么、（若有）未覆盖什么、正文是否经恢复。
**判为 PARTIAL 且未恢复时，收尾也要重申"这不是全文"，并指路怎么拿全文**（打开长文阅读页/线程后重新提取）。

<!-- FILE_END: muse-x-digest/SKILL.md -->
