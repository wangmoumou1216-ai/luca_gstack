# 程序记忆层（Procedural Memory）

存储 Skill 执行模式：成功的编排路径、避坑规则、输出路径约定。

## 架构决策

程序记忆**已并入 Semantic 层**，domain 固定为 `skill-rule`，不再委托给独立的 Hermes 脚本（相关脚本不存在）：

- 数据源：`memory/semantic/promoted-facts.yaml`（domain: skill-rule）
- 读取命令：`python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule`
- 写入命令：`python3 memory/scripts/propose_semantic.py --domain skill-rule --fact "..." --confidence high --evidence "..." --scope "<skill>" --reviewer "..."`

## 使用

```bash
# 读取所有 skill 规则
python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule

# 新增 skill 规则候选
python3 memory/scripts/propose_semantic.py \
  --domain skill-rule \
  --fact "html-prototype: framework/ 路径必须绝对引用，否则资源加载失败" \
  --confidence high \
  --evidence "复现或来源路径" \
  --scope "html-prototype" \
  --reviewer "reviewer" \
  --tags "html-prototype,rule"
```
