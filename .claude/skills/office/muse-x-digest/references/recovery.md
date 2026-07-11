# 完整性门 + FxTwitter 恢复（muse-x-digest 阶段 2-3）

## 完整性门判据（阶段 2）
判 `COMPLETE / PARTIAL / EMPTY`：
- **capture.md 硬信号**：
  - 含 `⚠️ 未抓到正文` 或 `注意：线程可能不完整` 警告块 → PARTIAL/EMPTY 强嫌疑。
  - `## 正文` 是 `(未抓到正文文本)` → EMPTY 正文。
  - `类型: image` 且来源为 `/status/` 页 → 强嫌疑（很可能长文/长推/线程，正文不在推文节点里）。
- **体感**（借 mozilla readability `isProbablyReaderable`）：现有正文 + 图 OCR 文字，
  **够不够构成一条自足完整信息**？一张观点海报=自足=COMPLETE；一张"课程封面图 + Full course"
  字样=明显正文在别处=PARTIAL。
- **判定**：COMPLETE → 直接进阶段 4。PARTIAL/EMPTY → 进恢复。

## FxTwitter 恢复配方（阶段 3）
FxTwitter/FxEmbed 无 key 无登录返回 X 完整结构（长文在 `article`、长推在 `note_tweet`，
这些**都不在** DOM 可见 tweet 文本里——正是 DOM 抓取漏掉正文的根因）。

```bash
# handle 与 id 从 capture.md「来源」URL 抽取：https://x.com/<handle>/status/<id>
curl -s --max-time 20 "https://api.fxtwitter.com/<handle>/status/<id>" \
     -H "User-Agent: Mozilla/5.0" -o /tmp/muse-x-fx.json
```

取全文**优先级**（从上到下，命中即用）：
1. `.tweet.article` 存在 → X 长文。取 `.tweet.article.title` + 拼 `.tweet.article.content.blocks[]`：
   每块 `.text` 按 `.type` 映射为 markdown 保留结构——
   `header-one..six→#..######`、`unstyled→段落`、`unordered-list-item→- `、
   `ordered-list-item→1. `、`blockquote→> `、code-block 保留为代码块围栏。段间空行分隔。
   - **⚠️ atomic 块是头号静默漏内容源（2026-07-11 实测教训）：** `type=="atomic"` 的块 `.text` **恒为空**，
     真实内容（内嵌图 **和内嵌代码/命令块**）在 **`.tweet.article.content.entityMap`**，按该块
     `.entityRanges[0].key` 反查。**只拼 `blocks[].text` 会静默丢掉全部内嵌代码块**——而对教程/命令类长文，
     这些 `MARKDOWN` 代码块（/goal、/loop 模板等）正是全文核心载荷，漏了就等于把不完整当完整交付。
     entityMap 各实体：`MARKDOWN→data.markdown`（代码块，必取）、`MEDIA→data.mediaItems[0].mediaId`
     （内嵌图，标注即可）、`TWEMOJI→emoji`。
   （`.tweet.article.media_entities` 是文内插图清单，需要时一并说明。）
2. 否则 `.tweet.note_tweet.text`（>280 字长推全文；base `.tweet.text` 是截断的）。
3. 否则 `.tweet.text`（普通短推）。

一段 jq 参考（长文全文，**已含 atomic→entityMap 解析**，缺它必漏代码块）：
```bash
jq -r '
  if .tweet.article then
    (reduce (.tweet.article.content.entityMap // [])[] as $e ({}; .[$e.key] = $e.value)) as $emap
    | (.tweet.article.title // "") + "\n\n" +
      ([ .tweet.article.content.blocks[]
         | (.type // "unstyled") as $t | (.text // "") as $x
         | if   ($t|startswith("header"))  then "## " + $x
           elif $t=="unordered-list-item"  then "- " + $x
           elif $t=="ordered-list-item"    then "1. " + $x
           elif $t=="blockquote"           then "> " + $x
           elif $t=="code-block"           then "```\n" + $x + "\n```"
           elif $t=="atomic" then
             ( ($emap[(.entityRanges[0].key|tostring)]) as $ent
               | if   $ent.type=="MARKDOWN" then $ent.data.markdown
                 elif $ent.type=="MEDIA"    then "[图: mediaId=" + ($ent.data.mediaItems[0].mediaId // "?") + "]"
                 elif $ent.type=="TWEMOJI"  then ""
                 else "" end )
           else $x end
       ] | join("\n\n"))
  elif .tweet.note_tweet then .tweet.note_tweet.text
  else .tweet.text end' /tmp/muse-x-fx.json
```
> 收尾自检（阶段 5 preflight 追加一条）：**统计 `blocks[]` 里 `type=="atomic"` 的数量，逐一确认其
> entityMap 实体已解析**——凡 `MARKDOWN` 实体（代码块）必须出现在最终产出里，否则就是漏了核心内容。

## 校验再采用（借 qiaomu「先校验、不行再降级」）
- 恢复文本实质**明显多于** DOM 捕获（长度、信息量）才替换正文；否则视为恢复无效。
- `code != 200` / JSON 空 / 超时 / 拿到的仍是空 → **恢复失败**，不伪造，带"未恢复"进诚实兜底。
- 成功则在产出注明「（正文经 FxTwitter 恢复）」，出处透明。

## 恢复失败的诚实兜底
- 产出**开头即红旗**：`⚠️ 正文未抓取到，以下仅基于封面图/现有材料，不是完整内容。`
- 只在现有材料范围内翻译讲述（图当摘要，不当全文）。
- 指路：`要拿全文：在 X 里打开这条的长文阅读页 / 展开线程后，重新点提取。`
- **绝不**写"完整交付 / 覆盖全部内容"。

## 边界（v1）
- 主攻 **Article + note_tweet**（已实测可用）。同作者多推**线程**完整重构留作后续增强
  （FxTwitter 也带 conversation，v1 不做线程跟随）。

<!-- FILE_END: recovery.md -->
