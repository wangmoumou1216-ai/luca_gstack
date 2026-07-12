# mattpocock/skills 深度对标（2026-07）

对 [mattpocock/skills](https://github.com/mattpocock/skills) 做全量深度对标，把优点吸收进
luca_gstack。方法论计划：`~/.claude/plans/lucagstack-fork-https-github-com-mattpo-lively-island.md`。

## 复现指令

```bash
# 1. pin 到本次对标的确切 commit（结果对此 commit 有效）
git clone https://github.com/mattpocock/skills /tmp/mp-skills
git -C /tmp/mp-skills checkout 391a2701dd948f94f56a39f7533f8eea9a859c87

# 2. 重生成 inventory（分母）
BM_COMMIT=391a2701dd948f94f56a39f7533f8eea9a859c87 \
  python3 gen_inventory.py /tmp/mp-skills > inventory.yaml

# 3. 覆盖校验（P2.5/P4 入场券）
python3 check-coverage.py --assert all
```

## 对标基准

- **对方 commit**：`391a2701dd948f94f56a39f7533f8eea9a859c87`（2026-07-10，MIT）
- **分母**：51 单元 = 39 skill（22 user-invoked / 17 model-invoked / 21 promoted）+ 12 跨切机制
- **我方**：luca_gstack muse fork（32 SKILL.md + skill-os 真值源 + 6 hooks + 三层记忆）
- **透镜**：工程+设计全量深评（比 2026-06 CRM 设计 fit 窄透镜宽，见 rubric.md）

## 产物

| 文件 | Phase | 作用 |
|---|---|---|
| `gen_inventory.py` / `inventory.yaml` | P0 | 分母（每文件 sha256，防底稿漂移） |
| `mapping-matrix.yaml` | P1 | 51 单元 → 我方 counterpart + tier + prior_verdict |
| `rubric.md` | P1 | 透镜文本 + 头对头 4 维 rubric + 三桶判据 + 锚定样例 |
| `dossiers/*.yaml` | P2 | 每单元双侧证据档案（只采证不打分） |
| `verdicts/*.yaml` | P2.5/P3 | rubric 打分 + 红队结论 + 三桶初判 |
| `check-coverage.py` | P2.5+ | 覆盖/证据/翻案/hash 机器断言 |
| `FINAL-VERDICT-PACK.md` | P4 | 裁决包（GATE-2 交付） |

## 回写的 SSOT（不在本目录，落地时更新）

- skill 级裁决 → `.claude/skill-os/external-skills/vetting-registry.yaml`（append-only）
- 实际采纳 → `.claude/skill-os/evolution/{ADOPTED.md,adoption-log.jsonl}`（FUSION 步⑨）
- 新 gap 提案（用户批准后）→ `.claude/skill-os/evolution/gaps-register.yaml`
