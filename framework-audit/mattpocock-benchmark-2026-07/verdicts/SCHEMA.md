# verdict 文件 schema（P2.5 单 judge 产出；P3 红队补 redteam 字段）

文件名：`verdicts/<id 中 : 和 / 换成 -->.yaml`。每个 inventory 单元一份（51 份全量）。

```yaml
id: skill:engineering/triage          # == inventory id
kind: skill | mechanism
tier: A | B | C
opponent_sha256: <skill 单元必填，抄 inventory>
dossier: dossiers/<file>.yaml         # 证据档案指针（Tier C mini-dossier 同）

# --- Tier A（头对头）---
scores:
  D: 0-10        # 净增量，每分对应 dossier 里一组双侧证据
  I: 0-10        # 现任强度（机读五项各 0-2）
  C: S | M | L   # 集成成本；触承重墙加 flag high_integration_risk: true
  E: 0-3         # 对方证据质量
score_derivation: |                   # 分数推导：逐机制列 D 的构成，I 的五项核对
  ...

# --- Tier B（7 维门禁）---
hard: { safety: PASS|FAIL, compatibility: PASS|FAIL, non_redundancy: PASS|FAIL }
soft: { fit: 0-3, quality: 0-3, adoption: 0-3, maintenance: 0-3 }
weighted_score: 0-100                 # fit30+quality30+adoption20+maintenance20

# --- 通用 ---
bucket: leave | merge | adopt | replace
bucket_rationale: |                   # 判据引用（rubric.md §3 哪条满足/不满足）
  ...
reconciliation: |                     # 仅 4 个既有裁决单元必填：旧 verdict 行号 + 新透镜下什么变了
  ...

# --- replace 桶专属（rubric §3 全五条）---
dominance_table:                      # 现任每条承重轴 头对头
  - axis: <现任 SKILL.md 职责轴>
    incumbent: <表现>
    opponent: <表现>
    winner: opponent | tie
incumbent_unique_behaviors:
  - behavior: <现任独有行为>
    disposition: ported | written-off # written-off 项 GATE-2 逐条用户签字

# --- P3 红队补写 ---
redteam:
  verdict: stands | downgraded | killed
  steelman_incumbent: <替换桶必填，独立文档路径亦可>
  attack_notes: |
    ...

# --- 落地预估（merge/adopt/replace 桶，供 GATE-2 成本标价单）---
landing_estimate:
  reuse_mode: install | port-pattern
  touched_files_estimate: <数字或列表>
  ab_runs_needed: <行为 A/B 次数（prose 改动数）>
  dual_repo: true | false
  new_gap_proposal: <机制单元无 open gap 时的新 gap 提案名，或 null>
```

判桶阈值以 `rubric.md` §3 为唯一标尺（GATE-1 已冻结）；judge 打分对齐三校准锚。
