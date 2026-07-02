# specs/（此目录已不是真实落点——2026-07-02 对齐说明）

**这个 fork 根目录的 `specs/` 不再是 REQ 数据的实际存放位置。** 早期脚手架（2026-07-01 Phase 0 之前）设想 REQ 数据放这里，但用户确认的架构决定（见 `muse-loop/ARCHITECTURE.md` "Loop 产出物理落点"）改成：Loop 产出走 muse 项目已有的 `docs/` 软链，保持 fork 自身 git 追踪树干净。

**真实落点：** `docs/loop/specs/REQ-<项目缩写>-<编号>/`（经 `docs -> /Users/luca/Desktop/项目/muse/docs` 软链，由 `muse-req-triage` Phase 4 写入 `requirement.md`，`muse-loop-orchestrate` 后续 Phase 写入 `design.md`/`prototype.html`/`scorecard.md`）。该目录截至本次修订尚不存在——因为还没有真实 REQ 被处理过完整一轮，不是遗漏。

本目录（fork 根 `specs/`）保留只是因为删除的收益不明显；不要在这里新建任何 REQ 数据，也不要假设这里的内容是最新的。
