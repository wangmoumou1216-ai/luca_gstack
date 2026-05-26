#!/usr/bin/env python3
"""
fix_long_lines.py — 安全修复 MD 文件超长行（> 120 字节，与 awk length 一致）

保护规则（这些行原样保留）：
  - 代码块内（``` / ~~~ 之间）
  - Markdown 表格行（以 | 开头）
  - ASCII art 行（含 box-drawing 字符）
  - URL 独占行 / 行内含超长 URL
  - YAML frontmatter 中除 description 外的所有行
  - CONTEXT.md 整文件跳过

处理规则：
  - YAML description 单行长字节串 → block scalar (>)
  - prose / bullet 列表长行 → 在词边界/标点处换行，目标 100 字节

度量单位：字节（UTF-8）。中文字符 = 3 字节，与 macOS awk length 一致。
"""

import re
import shutil
import unicodedata
from pathlib import Path

# 目标折行宽度（字节）
TARGET_BYTES = 100
# 检测阈值（字节）
THRESHOLD_BYTES = 120

# Box-drawing Unicode ranges U+2500–U+257F
BOX_DRAWING = set(range(0x2500, 0x2580))


def blen(s: str) -> int:
    """返回字符串的 UTF-8 字节长度（与 awk length 一致）。"""
    return len(s.encode('utf-8'))


def has_box_drawing(line: str) -> bool:
    return any(ord(c) in BOX_DRAWING for c in line)


def is_table_line(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith('|')


def is_url_only_line(line: str) -> bool:
    stripped = line.strip()
    return bool(re.match(r'^https?://\S+$', stripped))


def has_long_url(line: str) -> bool:
    """行内含超长 URL（单个 URL > 50 字符），保守不换行。"""
    return bool(re.search(r'https?://\S{50,}', line))


def inline_code_spans(text: str) -> list[tuple[int, int]]:
    """返回行内所有 `code` 或 ``code`` span 的 (start, end) 字符位置列表。"""
    spans = []
    i = 0
    n = len(text)
    while i < n:
        if text[i] != '`':
            i += 1
            continue
        # 计算连续 backtick 数
        j = i
        while j < n and text[j] == '`':
            j += 1
        tick_len = j - i
        # 寻找对应闭合序列（相同数量的 backtick）
        close = text.find('`' * tick_len, j)
        if close != -1:
            spans.append((i, close + tick_len))
            i = close + tick_len
        else:
            i = j
    return spans


def in_code_span(pos: int, spans: list[tuple[int, int]]) -> bool:
    return any(s <= pos < e for s, e in spans)


def wrap_prose_bytes(line: str, target: int = TARGET_BYTES) -> list[str]:
    """
    将一行 prose 按字节宽度 target 折行，保留前导缩进。
    支持中文（在空格/标点/闭合括号后断行，按字节计算累积宽度）。
    返回折行后的多行列表（不含换行符）。

    断点优先级：
      1. 空格（英文词边界，且不在 inline code span 内）
      2. 中文标点后（，。！？；：、，且不在 inline code span 内）
      3. 中文闭合符号后（」）】』，且不在 inline code span 内）
    严禁在 inline code span（`` `...` ``）内部或连续汉字中间截断。
    """
    indent_match = re.match(r'^(\s*)', line)
    indent = indent_match.group(1) if indent_match else ''
    content = line[len(indent):]

    # 引用块续行需保留 > 前缀
    bq_match = re.match(r'^(>+\s*)', content)
    bq_prefix = bq_match.group(1) if bq_match else ''

    # 列表项续行缩进
    content_after_bq = content[len(bq_prefix):]
    list_match = re.match(r'^([-*+]|\d+\.)\s+', content_after_bq)
    if list_match:
        continuation_indent = indent + bq_prefix + ' ' * len(list_match.group(0))
    elif bq_prefix:
        continuation_indent = indent + bq_prefix
    else:
        continuation_indent = indent

    if blen(line) <= target:
        return [line]

    zh_puncs = set('，。！？；：、')
    zh_close = set('」）】』')

    result = []
    current = indent + content

    while blen(current) > target:
        byte_acc = 0
        last_space = -1
        last_zh_punc = -1
        min_content_start = len(indent) + len(bq_prefix) + 8

        # 预计算当前行的 inline code spans（字符位置）
        code_spans = inline_code_spans(current)

        for ci, ch in enumerate(current):
            cb = len(ch.encode('utf-8'))
            if byte_acc + cb > target:
                break
            byte_acc += cb
            # 不在 inline code span 内才可断
            if in_code_span(ci, code_spans):
                continue
            if ch == ' ' and ci >= min_content_start:
                last_space = ci
            if (ch in zh_puncs or ch in zh_close) and ci >= min_content_start:
                last_zh_punc = ci + 1

        candidates = [p for p in [last_space, last_zh_punc] if p > min_content_start]
        if candidates:
            break_at = max(candidates)
        elif last_space > 0:
            break_at = last_space
        elif last_zh_punc > 0:
            break_at = last_zh_punc
        else:
            # 最后手段：找不在 code span 内的最后一个空格
            fallback = -1
            for fi in range(len(current) - 2, len(indent), -1):
                if current[fi] == ' ' and not in_code_span(fi, code_spans):
                    fallback = fi
                    break
            if fallback > len(indent):
                break_at = fallback
            else:
                # 整行都在 code span 内，无法合法断行，原样保留
                result.append(current)
                current = ''
                break

        chunk = current[:break_at].rstrip()
        result.append(chunk)
        remaining = current[break_at:].lstrip(' ')
        current = continuation_indent + remaining

    if current.strip():
        result.append(current)

    return result


def process_file(path: Path, dry_run: bool = False) -> bool:
    """
    处理单个文件。返回 True 表示文件被（或将被）修改。
    """
    content = path.read_text(encoding='utf-8')
    original_lines = content.splitlines(keepends=True)

    in_frontmatter = False
    frontmatter_done = False
    in_code_block = False
    code_fence_re = re.compile(r'^(\s*)(```|~~~)')

    output_lines = []
    i = 0
    lines = original_lines

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip('\n').rstrip('\r')

        # ── YAML frontmatter 检测 ──────────────────────────────
        if i == 0 and line.strip() == '---':
            in_frontmatter = True
            output_lines.append(raw)
            i += 1
            continue

        if in_frontmatter and not frontmatter_done:
            if line.strip() == '---':
                frontmatter_done = True
                in_frontmatter = False
                output_lines.append(raw)
                i += 1
                continue
            # 只处理 description 字段（单行字符串，跳过已是 block scalar 的）
            if re.match(r'^\s*description\s*:', line) and blen(line) > THRESHOLD_BYTES:
                # 检测 description: | 或 description: > 等 block scalar，跳过
                m_block = re.match(r'^\s*description:\s*[|>][-+]?\s*$', line)
                if m_block:
                    output_lines.append(raw)
                    i += 1
                    continue
                m = re.match(r'^\s*description:\s*(["\']?)(.*?)\1\s*$', line, re.DOTALL)
                if m:
                    value = m.group(2).strip()
                    wrapped = wrap_prose_bytes('  ' + value, TARGET_BYTES)
                    output_lines.append('description: >\n')
                    for w in wrapped:
                        output_lines.append(w + '\n')
                    i += 1
                    continue
            output_lines.append(raw)
            i += 1
            continue

        # ── 代码块切换 ────────────────────────────────────────
        if code_fence_re.match(line):
            in_code_block = not in_code_block
            output_lines.append(raw)
            i += 1
            continue

        if in_code_block:
            output_lines.append(raw)
            i += 1
            continue

        # ── 保护规则 ──────────────────────────────────────────
        if is_table_line(line):
            output_lines.append(raw)
            i += 1
            continue

        if has_box_drawing(line):
            output_lines.append(raw)
            i += 1
            continue

        if is_url_only_line(line):
            output_lines.append(raw)
            i += 1
            continue

        if blen(line) > THRESHOLD_BYTES and has_long_url(line):
            output_lines.append(raw)
            i += 1
            continue

        # ── 需要折行的 prose/list 行 ──────────────────────────
        if blen(line) > THRESHOLD_BYTES:
            wrapped = wrap_prose_bytes(line, TARGET_BYTES)
            for w in wrapped:
                output_lines.append(w + '\n')
        else:
            output_lines.append(raw)

        i += 1

    new_content = ''.join(output_lines)

    if new_content == content:
        return False

    if not dry_run:
        bak = path.with_suffix(path.suffix + '.bak')
        shutil.copy2(path, bak)
        path.write_text(new_content, encoding='utf-8')

    return True


def verify_yaml(path: Path) -> tuple[bool, str]:
    """验证文件的 YAML frontmatter 可正确解析。返回 (ok, error_msg)。"""
    try:
        import yaml
    except ImportError:
        return True, ''

    content = path.read_text(encoding='utf-8')
    if not content.startswith('---'):
        return True, ''
    try:
        rest = content[3:]
        end_idx = rest.find('\n---')
        if end_idx == -1:
            return True, ''
        fm = rest[:end_idx]
        yaml.safe_load(fm)
        return True, ''
    except Exception as e:
        return False, str(e)


def count_long_lines_bytes(path: Path, threshold: int = THRESHOLD_BYTES) -> int:
    """统计文件中超过 threshold 字节且不在代码块内的行数。"""
    content = path.read_text(encoding='utf-8')
    in_code = False
    count = 0
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith('```') or stripped.startswith('~~~'):
            in_code = not in_code
        if not in_code and blen(line) > threshold:
            count += 1
    return count


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Fix long lines in MD files')
    parser.add_argument('files', nargs='+', help='MD files to process')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--threshold', type=int, default=THRESHOLD_BYTES,
                        help=f'Byte threshold (default {THRESHOLD_BYTES})')
    args = parser.parse_args()

    total_modified = 0
    total_files = 0

    for f in args.files:
        path = Path(f)
        if not path.exists():
            print(f'⚠️  不存在: {f}')
            continue
        if path.name == 'CONTEXT.md':
            print(f'⏭️  跳过 CONTEXT.md（设计决策文件）')
            continue

        try:
            before = count_long_lines_bytes(path, args.threshold)
        except PermissionError:
            print(f'⛔ {path.name} — 只读文件，跳过')
            continue

        if before == 0:
            print(f'✅ {path.name} — 无超长行')
            continue

        total_files += 1
        original_yaml_ok, _ = verify_yaml(path)
        try:
            modified = process_file(path, dry_run=args.dry_run)
        except PermissionError:
            print(f'⛔ {path.name} — 只读文件，跳过')
            total_files -= 1
            continue

        if not modified:
            print(f'➡️  {path.name} — 无需修改（全为不可换行内容）')
            continue

        if args.dry_run:
            print(f'🔍 {path.name} — [dry-run] 有 {before} 条超长行会被处理')
        else:
            after = count_long_lines_bytes(path, args.threshold)
            yaml_ok, yaml_err = verify_yaml(path)
            if yaml_ok:
                print(f'✅ {path.name} — {before} → {after} 剩余（表格/代码/ASCII不可换行）')
                total_modified += 1
            elif not original_yaml_ok:
                # 原文件本来就 YAML 无效，保留 prose 修复，仅警告
                print(f'⚠️  {path.name} — {before} → {after} 剩余（原文件 YAML 已有问题，已保留 prose 修复）')
                total_modified += 1
            else:
                # 原文件 YAML 正常，但修改后损坏 → 回滚
                bak = path.with_suffix(path.suffix + '.bak')
                if bak.exists():
                    shutil.copy2(bak, path)
                print(f'❌ {path.name} — 修改破坏 YAML，已回滚: {yaml_err}')

    print(f'\n完成：共处理 {total_files} 个文件，修改 {total_modified} 个')


if __name__ == '__main__':
    main()
