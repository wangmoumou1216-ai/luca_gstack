# Judge report — blind he330f2

- sha256: b301c7915dd0238200f424d3b6096201b1d94b361099254752880ed762af79e4 (index.html, 54460 B)
- Environment: macOS, Playwright (luca_gstack/node_modules) headless Chromium, file:// load; viewports 1280x800 and 390x844 (isMobile, hasTouch). Driven by clicks / keyboard Tab/Shift+Tab/Enter / typing only; 演示控制 used only to inject named events. Scripts: scratchpad/judge-he330f2/run.cjs, kb.cjs.
- Console errors: desktop 0, mobile 0. Horizontal overflow: desktop scrollWidth 1280 = clientWidth; mobile 390 = 390 (initial, after flow, after failure).

## T items
| # | Actions | Observed | Verdict |
|---|---|---|---|
| T1 | Load; append seg1 | Header 录音进行中 + timer; 来源 未检索/客户未确认不检索; after seg1: "开场匹配到 2 个客户，请确认是哪一家（未预选）", both candidates with hit words highlighted and directory fields; suggestion = clarifying question "您是恒星半导体还是恒星设备？"; Playbook "待确认客户"; no source retrieved (d01, d02) | PASS |
| T2 | Confirm 恒星设备 → 更换 → confirm 恒星半导体; later switch back to 恒星设备 | Playbook/sources/suggestion basis switch fully (C-2041/KB-DIST ↔ C-1027/KB-SEMI); regex scan for previous-client terms after each switch = false; loading state shown during retrieval (d03–d05, d17) | PASS |
| T3 | Append seg2, seg3 | Suggestions show "依据：预算 15 万（段 3）· 封测扩容常见瓶颈 KB-SEMI-02"; corpus segments numbered, 事实账本 separate, AI tag "AI 建议·未经验证" on suggestion block; KB IDs as clickable source chips (d06) | PASS |
| T4 | Expand main "按预算 15 万…" → 修订 (十五万→五十万) → 查看更新版 → 完成查看 | While viewing: item kept (not replaced), tags "依据已更新：预算 15万→50万" + "已过期" on main and alt 1; banner "有新建议 2 条，收起后显示"; corpus shows 已修订 + strikethrough original; Playbook "50 万·已修订（原 15 万）"; "查看更新版" swaps in-place to 50 万 version with "已更新"; after collapse no suggestion uses 15 as current value (15 only in change note "15 万→50 万"); focus stayed; aria-live "段 3 已修订". Mobile header summary also shows 已过期/有新建议 (d07–d10, m05) | PASS |
| T5 | 模拟资料检索失败 ×2 → 模拟检索恢复 | Profile fail: Playbook rows replaced by "缺失 · 依赖客户资料的 N 条内容不可用（检索失败），未以推测补齐"; both fail: suggestions "缺少可用来源，暂不生成建议 — 查看来源状态"; corpus/facts retained; recovery restores sources with "已恢复/新增" tags and regenerates. BUT no in-product user action (重试/重新检索) exists — 0 retry buttons; recovery only via external demo event; the only user affordance is "查看来源状态" (d11–d13) | PARTIAL |
| T6 | 跳过, click KB-SEMI-02 chip and 段 link, 标记已问, 撤销 | Skip moves to 已处理 with 撤销; fill-in marked "补位"; source chip / 段 link scroll+highlight target (.hl); timer kept running, recording unaffected; bar states "只读检索与生成 · 不发送、不保存"; no send/CRM controls (d15, d16) | PASS |
| T7 | 模拟知识库晚到; switch customer | Late KB items appear in Playbook/sources tagged "新增" with own IDs; 事实账本 unchanged (only 语料-derived facts); case question only as source-attributed suggestion; switch clears handled list of old client and all old sources; facts ledger kept (meeting facts, labelled as such in change panel) (d14, d17) | PASS |
| T8 | Tab/Shift+Tab/Enter through flow; mobile 390 screenshots | 2px focus outline on all controls; confirm/expand/revise/skip operable by Enter; focus moved sensibly (custline after confirm, 收起 after expand, sugmain after skip); aria-live announcements; tablist on mobile; demo collapsible; no overflow. Minor: mobile header (145px)+assist bar+tabs leave ~446px pane; with demo open another 150px, but nothing critical hidden (pane scrolls, header summary mirrors main suggestion) (d18–d20, m01–m09) | PASS |

## Q items
- Q1 注意力/选择负担: 1 main + 2 alternates max; new items marked "刚更新·原因"; when viewing, reorder frozen and new count queued. 0 forced confirmations. Tag density per card can reach 3–4 chips (刚更新 + 依据已更新 + 已过期 + 依据). Judgement: good, slightly chip-heavy.
- Q2 修订纠错与上下文: stale visible immediately on viewed item + alternates; 1 click to 查看更新版 while keeping expansion; 1 click 完成查看 to apply. Viewed content retained; corpus keeps original text struck through; Playbook shows original. Judgement: strong.
- Q3 依据/可信边界: every suggestion has 依据 line with 段号 and source IDs, clickable trace; AI 未经验证 label; missing-source states explicit "未以推测补齐". Minor: confirmed customer block still carries "AI 建议·未经验证" tag after user confirmation (slightly confusing). No confidence numbers. Judgement: clear.

## V items (no brand DS; neutral system font, blue primary)
- V1: recording header top with red dot/timer; assist bar secondary; main suggestion larger/bold with blue border. Clear hierarchy at both viewports.
- V2: desktop 3-column dense but readable; mobile tabs split content; mobile header summary truncated with ellipsis.
- V3: warnings amber/red chips with icons, concise; failure states give 查看来源状态 link but no retry action (see T5).

## Evidence
evidence/d01–d20 (desktop), evidence/m01–m09 (mobile).

T-SUMMARY: 7/1/0/0
