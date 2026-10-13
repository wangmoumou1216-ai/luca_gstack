# Direct standalone brief source contract

Load through FILE_END before classifying a directly described brief or running its QA.
Source-kind selection grants no project, read/write or workflow authority.

- `standalone_brief`：spec 逐行记录 `Source kind: standalone_brief`、`Brief source: <实际用户输入引用>`
  和 `traceability 不完整`。checker 从该声明识别直接 brief，仍执行全部普通 UI/浏览器门；
  冷审须核实际来源符合 Phase 0，不以自报 source_kind 免除真实上游 D-ID/STATE/AC。
  存在实际 design-brief 时继续提供其精确路径与全部决策，不以 standalone 声明绕过。

没有实际上游时，省略第二个位置参数：
`node .claude/skills/office/html-prototype/scripts/verify-prototype.mjs "<已授权绝对 index.html 路径>"`。
存在实际上游时仍传其已验证精确路径；不得传不存在的占位路径或伪造 brief。

Source fields must contain a nonempty value on the same line; whitespace/newline alone is missing.
A supplied upstream brief never becomes absent because the caller declares standalone.
The checker is mechanical admission only; source provenance and actual user decisions still need
real evidence and independent review. Ordinary UI state/aesthetic/browser gates remain required.

<!-- FILE_END: html-prototype/references/standalone-brief.md -->
