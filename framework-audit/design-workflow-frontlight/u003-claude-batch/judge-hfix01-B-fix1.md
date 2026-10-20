> 说明：这是 B-fix1（对 B 原型做 2 行 CSS 定点修）之后由另一位独立评审者盲评的报告，未进行任何整理；结论与采用方式见上级 README 与评估报告 §3.1/§9.1。

# Judge report — blind/hfix01 (reduced scope: T8 full, T1–T7 quick regression, Q/V skipped)

- Artifact: index.html, sha256 `8f170df2dfdb65b8380592b01fd6c84e1643d2d0718996aa7d9d654f779bfb98`
- Environment: Playwright Chromium (luca_gstack node_modules), file:// load; desktop 1280x800; mobile 390x844 (isMobile, hasTouch, DPR2). Driven by clicks/keyboard; only 演示控制 used for event injection.
- Script: scratchpad/judge_hfix01.cjs; full log: evidence/run-log.txt
- Console errors: desktop none, mobile none. Horizontal overflow: none (1280/1280, 390/390).

| Item | Actions (main path) | Observed | Verdict |
|---|---|---|---|
| T1 | Load → 追加语料(开场) | Header 录音进行中+计时; 依据表各源 未检索; after seg1 客户=待确认, 两候选并列 + "无法唯一确定…不是结论"; Playbook/建议 withheld "尚未确认客户" | PASS |
| T2 | 确认恒星半导体 → 更正客户 → 更正为恒星设备 | Playbook/建议 regenerated for 恒星设备; no 晶圆/洁净室/《产线扩容沟通要点》 residue; sources show 用户已确认客户：恒星设备 | PASS |
| T3 | 追加 seg2 预算十五万 → 查看依据 s3 | s2/s3 tagged 已更新 with "依据：第2段「预算十五万」"; source box separates 实时语料 / 知识库(合成) / 客户确认, each with status chip; suggestions framed 主问题/备选 "可跳过" | PASS |
| T4 | While viewing s3, 修订 → 保留当前 → 查看新版 | Viewed s3 NOT replaced; banner "依据已更新…内容未被替换，当前内容可能已过时" + 查看新版/保留当前; kept state still flags 过时; non-viewed s2 and pbC auto-updated to 五十万 with 依据已修订 tag | PASS |
| T5 | 模拟失败 → 重试检索(仍失败) → 模拟恢复 | 客户资料 检索失败 chip + red banner with 重试; per-card "缺少来源…重试"; retry shows 检索中→检索失败 honestly; after recover 已检索 + "资料已恢复，可更新" button; transcript (2 segs + revision) retained | PASS |
| T6 | 跳过 s2, 查看依据 | Marked 已跳过 (dim) with 撤销; 演示记录 "不保存到 CRM"; recording header unaffected (clock ticking) | PASS |
| T7 | 模拟知识库晚到 (wait 5s) → 切回恒星半导体 | 知识库 晚到 chip, cards "缺少来源：知识库未到"; on arrival only "知识库已到，可更新 Playbook" offer, not auto-applied as fact; switching client: no 设备品类/交付周期/售后 residue, marks cleared | PASS |
| T8 | See details below | Layout OK both viewports; focus lost after every activation | PARTIAL |

## T8 detail
Desktop 1280x800
- After budget revision (s2 shows 依据已修订 note) and 模拟资料检索失败 (missing-source banner on s1/s2/pbA), expanded main card s1 依据: card height 191→307px, children stacked without overlap (row/q/why/banner/row/srcs contiguous), card scrollHeight == clientHeight (not clipped), next card pushed from 471→587; suggestion panel scrolls internally (overflow:auto). Same for s2 expanded with revised note + missing banner (h 332, no clip). Main card not collapsed/overlapping. Evidence: evidence/d1-desktop-fail-banner-s1-expanded.png, evidence/d2-desktop-s2-expanded-revised-missing.png.
- Recording status stays in fixed top bar; demo bar separated by dashed border.
Mobile 390x844
- Same state; s1 expanded with banner: h 354, no clip/overlap. Header is sticky: scrolled to document bottom (scrollY 502, and 930 on Playbook tab) the 录音进行中 element remains at top 10–31px — visible. Evidence: evidence/m1-mobile-s1-expanded-missing.png, evidence/m2-mobile-bottom-rec.png, evidence/m3-mobile-playbook-bottom.png.
- Small mobile targets: "更多" summary 20px, inline "重试" link 24px (main buttons 40px).
Keyboard / focus / status
- Controls are native buttons/summary/radio; focus-visible outline 2px solid primary; 查看依据 has aria-expanded; tabs have role=tab/aria-selected; toast role=status.
- Defect: every action re-renders the whole app via innerHTML, so after Enter on 追加语料, 确认此客户, 查看依据 etc. document.activeElement becomes BODY — keyboard user loses position each step and must re-Tab from the top; timed re-renders (toast expiry, 700ms update) can also drop focus.
- Verdict PARTIAL: no critical occlusion at either viewport (the targeted regressions pass), but keyboard focus is not preserved, plus sub-40px mobile targets.

T-SUMMARY: 7/1/0/0
