# Learning action commands

Read this file through EOF only after the shared office contract has already decided that a
self-reflection, explicit user correction, or governed skill-growth signal must be recorded. This
file supplies command mechanics; it does not decide whether a signal qualifies and does not permit
automatic promotion.

## Post-completion self-reflection observation

Use `--rule` only when the reflection produced a clear reusable rule.

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<简要描述发现了什么>" \
  --problem "<执行中遇到的隐性约束或错误假设>" \
  --correction "<下次如何避免或加速>" \
  --source self_reflection \
  [--rule "<一句可执行规则>" --applies-to <skill-name> --scenes "*"]
```

## Explicit user correction observation

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<用户原话或问题摘要>" \
  --problem "<问题定义>" \
  --correction "<下次如何避免>"
```

If the user also supplied a clear reusable future constraint, add an active rule:

```bash
python3 .claude/observability/scripts/write_observation.py \
  --skill <skill-name> \
  --message "<用户原话或问题摘要>" \
  --problem "<问题定义>" \
  --correction "<下次如何避免>" \
  --rule "<一句可执行规则>" \
  --applies-to <skill-name> [other-skill] \
  --scenes <A|B|C|D|*>
```

## Governed semantic skill-rule candidate

This writes a candidate only. Review/consolidation remains mandatory before promotion.

```bash
python3 memory/scripts/propose_semantic.py \
  --domain skill-rule \
  --fact "<skill名>: <规则描述>" \
  --confidence high \
  --evidence "<来源/复现>" \
  --scope "<skill名>" \
  --reviewer "<reviewer>" \
  --tags "<skill名>,rule"
```

Query existing rules before proposing a duplicate:

```bash
python3 memory/scripts/search_memory.py "<skill名> skill-rule" --limit 5
# Only expand semantic details after a relevant hit:
python3 memory/scripts/get_memory.py --layer semantic --domain skill-rule
```

The retired `.claude/hermes/scripts/*` commands remain invalid. Never write `CONTEXT.md`, either
root adapter, a skill contract, or promoted semantic facts automatically from these commands.

<!-- FILE_END: office/references/learning-actions.md -->
