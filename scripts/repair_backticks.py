#!/usr/bin/env python3
"""
repair_backticks.py — 修复 fix_long_lines.py 在 inline code span 内断行的问题。

策略：
  1. 扫描文件，找到行尾 backtick 计数为奇数的行（即 inline code 未闭合）
  2. 将该行与下一行合并（去掉续行缩进，用一个空格连接）
  3. 重复直到 backtick 平衡
  4. 用更新后的 wrap_prose_bytes 重新折行
  5. 写回文件（先备份）

只处理 prose 行（不在代码块/frontmatter 内的行）。
"""

import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fix_long_lines import wrap_prose_bytes, blen, THRESHOLD_BYTES, TARGET_BYTES

THRESHOLD = THRESHOLD_BYTES


def backtick_count(line: str) -> int:
    return line.count('`')


def repair_file(path: Path) -> bool:
    content = path.read_text(encoding='utf-8')
    lines = content.splitlines(keepends=True)

    in_frontmatter = False
    frontmatter_done = False
    in_code_block = False
    fence_re = re.compile(r'^(\s*)(```|~~~)')

    output = []
    i = 0
    changed = False

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip('\n').rstrip('\r')

        # frontmatter 检测
        if i == 0 and line.strip() == '---':
            in_frontmatter = True
            output.append(raw)
            i += 1
            continue
        if in_frontmatter and not frontmatter_done:
            if line.strip() == '---':
                frontmatter_done = True
                in_frontmatter = False
            output.append(raw)
            i += 1
            continue

        # 代码块切换
        if fence_re.match(line):
            in_code_block = not in_code_block
            output.append(raw)
            i += 1
            continue
        if in_code_block:
            output.append(raw)
            i += 1
            continue

        # 表格行：跳过
        if line.strip().startswith('|'):
            output.append(raw)
            i += 1
            continue

        # 检测行尾 backtick 是否为奇数（inline code 未闭合）
        bt = backtick_count(line)
        if bt % 2 == 1 and i + 1 < len(lines):
            # 合并下一行（去掉续行前导空格）
            merged = line
            j = i + 1
            while bt % 2 == 1 and j < len(lines):
                next_raw = lines[j]
                next_line = next_raw.rstrip('\n').rstrip('\r')
                # 不跨越空行、代码块、frontmatter 边界
                if not next_line.strip():
                    break
                if fence_re.match(next_line) or next_line.strip() == '---':
                    break
                # 合并：去掉续行的前导缩进（仅去掉 list continuation 的额外空格）
                merged = merged + ' ' + next_line.lstrip()
                bt = backtick_count(merged)
                j += 1

            if j > i + 1:
                # 确实合并了
                changed = True
                # 用新算法重新折行
                if blen(merged) > THRESHOLD:
                    wrapped = wrap_prose_bytes(merged, TARGET_BYTES)
                    for w in wrapped:
                        output.append(w + '\n')
                else:
                    output.append(merged + '\n')
                i = j
                continue

        output.append(raw)
        i += 1

    new_content = ''.join(output)
    if new_content == content:
        return False

    bak = path.with_suffix(path.suffix + '.bak')
    shutil.copy2(path, bak)
    path.write_text(new_content, encoding='utf-8')
    return True


def main():
    import glob
    files = (
        glob.glob('.claude/skills/**/*.md', recursive=True) +
        glob.glob('.agents/skills/**/*.md', recursive=True) +
        ['CLAUDE.md', 'AGENTS.md']
    )

    fixed = 0
    for f in files:
        path = Path(f)
        if not path.exists():
            continue
        try:
            if repair_file(path):
                print(f'  ✅ repaired: {f}')
                fixed += 1
        except PermissionError:
            pass
        except Exception as e:
            print(f'  ❌ error {f}: {e}')

    print(f'\n修复完成：{fixed} 个文件已重新折行')


if __name__ == '__main__':
    main()
