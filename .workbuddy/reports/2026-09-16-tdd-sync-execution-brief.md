# tdd Skill 上游同步 — 执行简报

> 日期：2026-09-16
> 来源报告：`.workbuddy/reports/2026-09-16-mattpocock-skills-update-check.md`（v3 终审版）
> 任务性质：用户级 skill 目录的单文件级更新（非 luca_gstack 框架变更，不触碰框架只读区）
> 授权状态：luca 已在会话中确认执行更新

---

## 1. 背景（一句话）

mattpocock/skills 核查（v1→v3 终审链）确认：17 项本地对应中**唯一需要跟进的是 `~/.agents/skills/tdd`**——落后上游 5 个 commit，其中 `8a475c4`（2026-08-05）为实质性更新。其余 16 项零更新或仅机械差异，**不要动**。

## 2. 更新对象与范围

| 项 | 值 |
|---|---|
| 物理目录 | `~/.agents/skills/tdd/` |
| 软链 | `~/.claude/skills/tdd → ../../.agents/skills/tdd`（**只需改一处**，软链自动生效） |
| 本地安装锚 | `bd453a6`（2026-07-03，字节 match 已验证） |
| 同步目标 | 上游 HEAD `959a8e9`（2026-09-15）的 `skills/engineering/tdd/` |
| 更新范围 | **仅 SKILL.md 一个文件** + 可选新增 `agents/openai.yaml` |
| 不要动 | `tests.md`、`mocking.md`（已与上游 HEAD 字节一致，SHA 见 §5） |

## 3. 上游变更内容（bd453a6 → 959a8e9，共 5 commit）

| commit | 日期 | 性质 | 内容 |
|---|---|---|---|
| `8a475c4` | 2026-08-05 | **实质** | Seams 节新增 codebase-design 交叉引用段：interface 形状存疑时（module 深度/seam 位置/暴露面）调用 codebase-design 获取 Module/Interface/Depth/Seam/Adapter/Leverage/Locality 词汇 |
| `d28dfdc` | 2026-08-15 | 半实质 | 跨 skill 调用措辞标准化为 `call the Skill tool with "name"` |
| `fcf0071` | 2026-08-15 | 半实质 | 同上（措辞回改定型） |
| `697d4ce` | 2026-07-13 | 机械 | 新增 `agents/openai.yaml`（Codex 元数据，3 行） |
| `3216582` | 2026-08-19 | 机械 | em-dash 清理（SKILL.md 约 8 处 `—` → `:`/`(...)`） |

**同步方式**：直接采用上游 HEAD 版 SKILL.md 全文（即同时吃下实质 + 机械变更，保持与上游字节一致，便于下次核查）。**不建议**手工挑选 diff——该 skill 是原样安装（无本地改编），整文件替换是最干净的方案。

## 4. 执行步骤

```bash
# 0) 预检：确认当前状态（应输出 5363bb27...c6cf2f）
shasum -a 256 ~/.agents/skills/tdd/SKILL.md

# 1) 备份（必做）
cp ~/.agents/skills/tdd/SKILL.md ~/.agents/skills/tdd/SKILL.md.bak-bd453a6

# 2) 从上游 clone 取目标文件并替换
#    上游 clone 位于 /tmp/mattpocock-update-check.wPRCqX/repo（若已清理，重新 clone：
#    git clone https://github.com/mattpocock/skills.git 并 checkout 959a8e9）
cp /tmp/mattpocock-update-check.wPRCqX/repo/skills/engineering/tdd/SKILL.md \
   ~/.agents/skills/tdd/SKILL.md

# 3)（可选，随 metadata commit 一起对齐）新增 agents 目录
mkdir -p ~/.agents/skills/tdd/agents
cp /tmp/mattpocock-update-check.wPRCqX/repo/skills/engineering/tdd/agents/openai.yaml \
   ~/.agents/skills/tdd/agents/openai.yaml

# 4) 验收（见 §5 校验值）
```

## 5. 验收标准（SHA256，执行后必须逐项核对）

| 文件 | 更新前（本地现状） | 更新后（必须等于） |
|---|---|---|
| `SKILL.md` | `5363bb2775679fe9311fbb67947f95359169c6e7f1fac77c0f25e190bca6cf2f` | `cb01f66bebfaa25fa1f88e6b7e769cd9fd9f35b1120b8563749820738814c927` |
| `tests.md` | `859f9e592c188fda4fc7277dd180e4ce9c7a2e13f6efe1f6f29eccc9d28c106a` | 不变（已一致） |
| `mocking.md` | `3ceb807fdf4a47d6a93d4d9a891e5ba6d362a6247bd08adc451feebfc17361ef` | 不变（已一致） |
| `agents/openai.yaml` | （不存在） | `ea6f01cf1b8c06a4b0f5b649d74b1b8ce8685e72af1b38d70d877693e092af0b`（若执行步骤 3） |

验收命令：

```bash
cd ~/.agents/skills/tdd && shasum -a 256 SKILL.md tests.md mocking.md agents/openai.yaml
```

内容抽查（确认实质段已进来）：`grep -n "codebase-design" SKILL.md` 应在 Seams 节命中交叉引用段。

## 6. 边界与禁止项

- **只动 `~/.agents/skills/tdd/`**。不得触碰：luca_gstack 框架树（只读）、muse 项目、其他 16 项对应（均无更新）、`~/.claude/skills/` 下其他目录。
- 更新后**不要**更新 `~/.agents/.skill-lock.json` 的 folderHash——该文件由 skill 工具自身管理，手工改会造成锁与工具状态不一致。若工具日后重装 tdd 会自行刷新。
- 若想回滚：`mv ~/.agents/skills/tdd/SKILL.md.bak-bd453a6 ~/.agents/skills/tdd/SKILL.md`。

## 7. 完成后动作

1. 在 `.workbuddy/memory/2026-09-16.md` 追加一行执行记录（含验收 SHA 核对结果）。
2. 在来源报告 v3 末尾把第五节第 1 条标注为「已执行，日期」。

---

*本简报所有 SHA 与 commit 事实均来自 v3 终审链（终审审查员 + 终审监督员双重复核）。上游证据仓：/tmp/mattpocock-update-check.wPRCqX/repo。*
