# Plan Agent assertion examples

Read this file through EOF only when a plan uses one of these example templates. The main
`plan-agent.md` remains authoritative for assertion levels, behavioural evidence, criteria,
failure handling, and approval.

```bash
# [BLOCKING] <ID> — 文件存在
if ( set -o pipefail; [ -f "<path>" ] ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — 目录存在
if ( set -o pipefail; [ -d "<path>" ] ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — 文件包含关键词
if ( set -o pipefail; grep -q "<keyword>" "<file>" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [WARNING] <ID> — 文件不包含某词
if ( set -o pipefail;
  if grep -q "<keyword>" "<file>"; then
    exit 1
  else
    search_rc=$?
    if [ "$search_rc" -eq 1 ]; then exit 0; else exit "$search_rc"; fi
  fi
); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — 文件可执行
if ( set -o pipefail; [ -x "<path>" ] ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — Node.js 语法合法
if ( set -o pipefail; node --check "<file>" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — Python 语法合法
if ( set -o pipefail; python3 -m py_compile "<file>" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — YAML 合法
if ( set -o pipefail; python3 -c "import yaml; yaml.safe_load(open('<file>'))" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — JSON 合法
if ( set -o pipefail; node -e "JSON.parse(require('fs').readFileSync('<file>'))" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — Shell 脚本退出码 0
if ( set -o pipefail; bash "<script>" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — git 仓库存在
if ( set -o pipefail; [ -d .git ] ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [WARNING] <ID> — git hooks 路径配置
if ( set -o pipefail; git config --get core.hooksPath | grep -q "<path>" ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# —— 行为级模板（跑真实测试，2026-07-10 验收闭环）——

# [BLOCKING] <ID> — npm 测试套件通过
if ( set -o pipefail; npm test --silent ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — pytest 套件通过
if ( set -o pipefail; python3 -m pytest -q ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — swift 测试套件通过
if ( set -o pipefail; swift test ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi

# [BLOCKING] <ID> — 项目 verify 脚本通过
if ( set -o pipefail; bash scripts/verify.sh ); then
  echo "PASS <ID>"
else
  check_rc=$?
  echo "FAIL <ID>"
  exit "$check_rc"
fi
```

<!-- FILE_END: agents/references/plan-assertion-examples.md -->
