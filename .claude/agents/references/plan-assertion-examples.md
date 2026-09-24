# Plan Agent assertion examples

Read this file through EOF only when a plan uses one of these example templates. The main
`plan-agent.md` remains authoritative for assertion levels, behavioural evidence, criteria,
failure handling, and approval.

```bash
# [BLOCKING] <ID> — 文件存在
[ -f <path> ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 目录存在
[ -d <path> ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 文件包含关键词
grep -q "<keyword>" <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [WARNING] <ID> — 文件不包含某词
! grep -q "<keyword>" <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 文件可执行
[ -x <path> ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — Node.js 语法合法
node --check <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — Python 语法合法
python3 -m py_compile <file> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — YAML 合法
python3 -c "import yaml; yaml.safe_load(open('<file>'))" && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — JSON 合法
node -e "JSON.parse(require('fs').readFileSync('<file>'))" && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — Shell 脚本退出码 0
bash <script> && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — git 仓库存在
[ -d .git ] && echo "PASS <ID>" || echo "FAIL <ID>"

# [WARNING] <ID> — git hooks 路径配置
git config --get core.hooksPath | grep -q "<path>" && echo "PASS <ID>" || echo "FAIL <ID>"

# —— 行为级模板（跑真实测试，2026-07-10 验收闭环）——

# [BLOCKING] <ID> — npm 测试套件通过
npm test --silent && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — pytest 套件通过
python3 -m pytest -q && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — swift 测试套件通过
swift test && echo "PASS <ID>" || echo "FAIL <ID>"

# [BLOCKING] <ID> — 项目 verify 脚本通过
bash scripts/verify.sh && echo "PASS <ID>" || echo "FAIL <ID>"
```

<!-- FILE_END: agents/references/plan-assertion-examples.md -->
