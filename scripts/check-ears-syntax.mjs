#!/usr/bin/env node
// EARS 语法机械化校验器（2026-07-02，"完美标准"复查发现的真实缺口——之前 GATE-1 的
// EARS 质量提示只是给人看的 AskUserQuestion 文案，没有任何确定性检查）。
// 参照 QuARS/ISO-29148 的思路：不用 LLM 判断，纯规则匹配，能在 requirement.md 进
// GATE-1 之前先筛掉明显不合规的 EARS 陈述。
//
// 用法：node scripts/check-ears-syntax.mjs <requirement.md 路径> [...更多路径]
//      或管道输入单条 statement_ears 文本：echo "..." | node scripts/check-ears-syntax.mjs -

import { readFileSync } from 'fs';

const TEMPLATES = [
  { name: '事件驱动 (WHEN...SHALL)', re: /当.+?时[,，].*?应当/ },
  { name: '状态驱动 (WHILE...SHALL)', re: /(处于|在).+?(期间|状态|时)[,，].*?应当/ },
  { name: '条件驱动 (IF...THEN...SHALL)', re: /(如果|若).+?(那么|,|，).*?应当/ },
  { name: '通用型 (THE SYSTEM SHALL)', re: /^[^,，]*应当/ },
];

const VAGUE_VERBS = ['优化', '改进', '支持', '处理', '提升体验', '改善'];
const VAGUE_REFERENTS = ['这个', '那个', '某些', '相关的', '一些'];

function checkStatement(statement) {
  const findings = [];
  if (!statement || statement.trim() === '' || statement.trim() === 'null') {
    return { pass: true, findings: ['空值（type=open_question 允许省略，视为合规）'] };
  }
  if (!/应当/.test(statement)) {
    findings.push('FAIL: 缺少 "应当"（EARS 的 SHALL 对应词），不是合规的 EARS 陈述');
    return { pass: false, findings };
  }
  // "应当"（SHALL）后必须有可执行/可衡量的系统响应，否则是无响应的空壳陈述
  // （通用型模板 /^[^,，]*应当/ 只校验存在性，会放过裸"应当"/"系统应当"；此门补齐）
  const afterShall = statement.split('应当')[1] || '';
  if (afterShall.trim().length === 0) {
    findings.push('FAIL: "应当"后没有任何响应内容（EARS 要求 SHALL 后必须有系统响应，如"应当<动作><对象>"）');
    return { pass: false, findings };
  }
  const matched = TEMPLATES.filter((t) => t.re.test(statement));
  if (matched.length === 0) {
    findings.push('FAIL: 不匹配任何一种 EARS 模板（事件驱动/状态驱动/条件驱动/通用型）');
  } else {
    findings.push(`PASS: 匹配模板 [${matched.map((t) => t.name).join(', ')}]`);
  }
  for (const verb of VAGUE_VERBS) {
    if (afterShall.includes(verb) && afterShall.trim().length < verb.length + 6) {
      findings.push(`WARN: "应当"后紧跟模糊动词"${verb}"且缺少具体宾语，响应部分可能不够可衡量`);
    }
  }
  for (const ref of VAGUE_REFERENTS) {
    if (statement.includes(ref)) {
      findings.push(`WARN: 包含模糊指代词"${ref}"，触发条件或响应对象可能不够具体`);
    }
  }
  const hardFail = findings.some((f) => f.startsWith('FAIL'));
  return { pass: !hardFail, findings };
}

function extractStatementsFromFile(path) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`错误: 无法读取文件 "${path}"（${err.code || err.message}）。文件尚未落盘时请用 stdin 模式：echo "<statement_ears>" | node scripts/check-ears-syntax.mjs -`);
    process.exit(1);
  }
  const matches = [...content.matchAll(/statement_ears:\s*"([^"]*)"/g)];
  return matches.map((m) => m[1]);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('用法: node scripts/check-ears-syntax.mjs <requirement.md 路径...> 或 "-" 读 stdin');
  process.exit(1);
}

let overallPass = true;
for (const arg of args) {
  if (arg === '-') {
    const stdinText = readFileSync(0, 'utf8').trim();
    const { pass, findings } = checkStatement(stdinText);
    console.log(`[stdin] ${pass ? 'PASS' : 'FAIL'}`);
    findings.forEach((f) => console.log('  ' + f));
    if (!pass) overallPass = false;
    continue;
  }
  const statements = extractStatementsFromFile(arg);
  if (statements.length === 0) {
    console.log(`[${arg}] 未找到 statement_ears 字段，跳过`);
    continue;
  }
  statements.forEach((s, i) => {
    const { pass, findings } = checkStatement(s);
    console.log(`[${arg}] statement_ears #${i + 1}: ${pass ? 'PASS' : 'FAIL'}`);
    findings.forEach((f) => console.log('  ' + f));
    if (!pass) overallPass = false;
  });
}

process.exit(overallPass ? 0 : 1);
