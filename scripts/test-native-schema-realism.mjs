#!/usr/bin/env node
// Native transcript realism guard (2026-09-09).
//
// 【为什么存在】ba4764a 引入原生事件认证时，全部断言都跑在手写夹具上，夹具写着
// `isMeta: false` —— 而 Claude Code **从未**发过这个字段（实测 2.1.233…2.1.266 共 15 个版本、
// 924 份 transcript，0 次）。结果：3000 行测试全绿，而真实环境里每一条真人 prompt 都被判成
// 'unknown'，Project Gate 对所有 Claude session 全线失效。
//
// 教训不是"再加一条断言"，是**让测试看见真实输入**。本文件因此有两层：
//   ① 冻结形状表：把真机上实际出现过的 user 行形状逐条钉死，含各自应得的判定。
//   ② 真机冒烟：直接拿 ~/.claude/projects 下的真实 transcript 跑公开认证路径。
//      文件不存在（CI / 干净机器）时跳过，绝不因环境缺失而假绿。
import { attestNativeUserEvent } from '../.claude/hooks/lib/event-attestation.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'native-schema-realism-')));
let failed = 0;
function run(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${name}\n    ${error.message}`); }
}

function candidateFor(session, cwd, prompt) {
  const bytes = Buffer.from(prompt, 'utf8');
  return {
    schema_version: 1, session_id: session, boundary_id: session, cwd, harness: 'claude',
    prompt_integrity: {
      encoding: 'utf-8', bytes_base64: bytes.toString('base64'), byte_length: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
    intent: { kind: 'turn' },
  };
}
const fenceFor = (session, cwd) => ({
  schema_version: 1, session_id: session, harness: 'claude', cwd, source_absent: true, cursor: null,
});
function attest(session, cwd, transcriptPath, prompt) {
  return attestNativeUserEvent({
    candidate: candidateFor(session, cwd, prompt), transcriptPath,
    bootstrapFence: fenceFor(session, cwd), observation: 'pre-tool', allowTestSourceRoot: true,
  });
}

// ── ① 冻结形状表 ─────────────────────────────────────────────────────────
// 逐条取自 2026-09-09 全量扫描（924 份 transcript / 十种形状）。`isMeta` 一律缺席——
// 这正是原判据要求它等于 false 的那个字段。accept = 该行可作为可认证的真人 prompt。
const REAL_SHAPES = [
  { n: 'human/typed（真人打字，267 条）', row: { origin: { kind: 'human' }, promptSource: 'typed' }, accept: true },
  { n: 'human/queued（真人排队，54 条）', row: { origin: { kind: 'human' }, promptSource: 'queued' }, accept: true },
  { n: 'human/suggestion_accepted（1 条）', row: { origin: { kind: 'human' }, promptSource: 'suggestion_accepted' }, accept: true },
  { n: 'human/无 promptSource（斜杠命令回合，2 条）', row: { origin: { kind: 'human' } }, accept: false },
  { n: '无 origin + sdk（104 条）', row: { promptSource: 'sdk' }, accept: false },
  { n: '无 origin + 无 promptSource（本地回显，82 条）', row: {}, accept: false },
  { n: 'task-notification/system（54 条）', row: { origin: { kind: 'task-notification' }, promptSource: 'system' }, accept: false },
];

function claudeRow(session, cwd, prompt, overrides) {
  return JSON.stringify({
    type: 'user', sessionId: session, uuid: randomUUID(), cwd,
    userType: 'external', isSidechain: false,
    message: { role: 'user', content: prompt },
    ...overrides,
  });
}

for (const shape of REAL_SHAPES) {
  run(`真实形状 · ${shape.n}`, () => {
    const session = randomUUID();
    const cwd = '/workspace/luca-gstack';
    const prompt = `prompt for ${shape.n}`;
    const transcript = join(root, `${session}.jsonl`);
    writeFileSync(transcript, claudeRow(session, cwd, prompt, shape.row) + '\n');
    let attested = false;
    let err = null;
    try { attest(session, cwd, realpathSync(transcript), prompt); attested = true; }
    catch (error) { err = error; }
    assert.strictEqual(attested, shape.accept,
      shape.accept ? `本应可认证，却被拒：${err?.code} ${err?.message}` : '本应被拒，却认证通过');
    // 已知的非真人来源必须是语义明确的拒绝；报 UNKNOWN_SCHEMA 等于又把一种正常行当成 schema 故障。
    if (!shape.accept) {
      assert.notStrictEqual(err?.code, 'UNKNOWN_SCHEMA', `已知形状不该报 UNKNOWN_SCHEMA：${err?.message}`);
    }
  });
}

run('真实形状 · 未知 origin.kind 仍 fail closed', () => {
  const session = randomUUID();
  const cwd = '/workspace/luca-gstack';
  const prompt = 'x';
  const transcript = join(root, `${session}.jsonl`);
  writeFileSync(transcript, claudeRow(session, cwd, prompt, { origin: { kind: 'future-human-kind' } }) + '\n');
  assert.throws(() => attest(session, cwd, realpathSync(transcript), prompt), (e) => e.code === 'UNKNOWN_SCHEMA');
});

run('真实形状 · promptSource 像真人但 origin 缺席 → fail closed', () => {
  const session = randomUUID();
  const cwd = '/workspace/luca-gstack';
  const prompt = 'x';
  const transcript = join(root, `${session}.jsonl`);
  writeFileSync(transcript, claudeRow(session, cwd, prompt, { promptSource: 'typed' }) + '\n');
  assert.throws(() => attest(session, cwd, realpathSync(transcript), prompt), (e) => e.code === 'UNKNOWN_SCHEMA');
});

// ── ② 真机冒烟 ───────────────────────────────────────────────────────────
const PROJECTS = join(homedir(), '.claude', 'projects');
function realTranscripts(limit) {
  if (!existsSync(PROJECTS)) return [];
  const out = [];
  for (const dir of readdirSync(PROJECTS)) {
    let names = [];
    try { names = readdirSync(join(PROJECTS, dir)); } catch { continue; }
    for (const name of names) {
      if (name.endsWith('.jsonl')) out.push(join(PROJECTS, dir, name));
      if (out.length >= limit) return out;
    }
  }
  return out;
}

const samples = realTranscripts(60);
if (!samples.length) {
  console.log('SKIP 真机冒烟 · 本机无 ~/.claude/projects transcript');
} else {
  run(`真机冒烟 · 真实 transcript 的首条真人 prompt 可认证（${samples.length} 份取样）`, () => {
    let checked = 0;
    let attested = 0;
    const failures = [];
    for (const file of samples) {
      let lines = [];
      try { lines = readFileSync(file, 'utf8').split('\n').filter(Boolean); } catch { continue; }
      const kept = [];
      let human = null;
      let prompt = '';
      for (const line of lines) {
        kept.push(line);
        let row;
        try { row = JSON.parse(line); } catch { continue; }
        // 取第一条真人行，不按 content 形态挑——扫描本身不会挑，挑了就测不到带图片那类。
        if (row?.type === 'user' && row?.origin?.kind === 'human') {
          const content = row.message?.content;
          // 与 strictClaudeText 同规则取文：字符串原样，数组则连接其 text part。
          prompt = typeof content === 'string' ? content
            : Array.isArray(content)
              ? content.filter((p) => p?.type === 'text' && typeof p.text === 'string').map((p) => p.text).join('\n')
              : '';
          if (prompt) { human = row; break; }
        }
      }
      if (!human) continue;
      const session = String(human.sessionId || human.session_id || '');
      if (!session || !human.cwd) continue;
      checked++;
      const trunc = join(root, `${session}.jsonl`);
      writeFileSync(trunc, kept.join('\n') + '\n');
      try { attest(session, human.cwd, realpathSync(trunc), prompt); attested++; }
      catch (error) { if (failures.length < 3) failures.push(`${session.slice(0, 8)}: ${error.code} ${error.message}`); }
    }
    assert.ok(checked > 0, '取样里没有任何可用的首条真人 prompt——冒烟没有真正跑到，不算通过');
    assert.strictEqual(attested, checked,
      `${checked} 份真实 transcript 里只有 ${attested} 份可认证：\n      ${failures.join('\n      ')}`);
  });
}

// ── ③ Codex 真机冒烟 ─────────────────────────────────────────────────────
// 双端对等：Claude 侧栽的是 `isMeta` 漂移，Codex 侧栽的是「注入前言被当成真人消息」。
// 两边都必须拿真实产物跑，不能只有一端有真机覆盖。
const CODEX_SESSIONS = join(homedir(), '.codex', 'sessions');
function realRollouts(limit) {
  if (!existsSync(CODEX_SESSIONS)) return [];
  const all = [];
  const walk = (dir, depth) => {
    if (depth > 4) return;
    let names = [];
    try { names = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of names) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) all.push(full);
    }
  };
  walk(CODEX_SESSIONS, 0);
  // 取最近的：老 rollout 的 session_meta 还没有 thread_source 字段（又一处运行时漂移），
  // 按字典序取会全部落在历史形状上，测不到当前运行时。
  return all
    .map((file) => { try { return { file, at: statSync(file).mtimeMs }; } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((entry) => entry.file);
}

function codexPrompt(payload) {
  const parts = payload?.content;
  if (!Array.isArray(parts)) return '';
  return parts.filter((p) => p?.type === 'input_text' && typeof p.text === 'string').map((p) => p.text).join('\n');
}

const rollouts = realRollouts(40);
if (!rollouts.length) {
  console.log('SKIP Codex 真机冒烟 · 本机无 ~/.codex/sessions rollout');
} else {
  run(`Codex 真机冒烟 · 真实 rollout 的首条真人 prompt 可认证（${rollouts.length} 份取样）`, () => {
    let checked = 0;
    let attested = 0;
    let sawPreamble = 0;
    const failures = [];
    for (const file of rollouts) {
      let records = [];
      try {
        records = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        });
      } catch { continue; }
      const meta = records[0]?.payload;
      if (records[0]?.type !== 'session_meta' || !meta?.id || !meta?.cwd) continue;
      if (meta.thread_source !== 'user' || meta.parent_thread_id || meta.forked_from_id) continue;
      const isUser = (r) => r?.type === 'response_item' && r?.payload?.type === 'message' && r?.payload?.role === 'user';
      const hasAnchor = (i) => [1, 2].some((d) => {
        const n = records[i + d];
        if (!n || isUser(n)) return false;
        return n.type === 'event_msg' && n.payload?.type === 'item_completed'
          && n.payload?.item?.type === 'UserMessage';
      });
      let idx = -1;
      for (let i = 0; i < records.length; i += 1) {
        if (!isUser(records[i])) continue;
        if (!hasAnchor(i)) { sawPreamble++; continue; }   // 注入前言
        idx = i; break;
      }
      if (idx < 0) continue;
      const payload = records[idx].payload;
      const prompt = codexPrompt(payload);
      const boundary = payload?.internal_chat_message_metadata_passthrough?.turn_id;
      if (!prompt || !boundary) continue;
      checked++;
      const bytes = Buffer.from(prompt, 'utf8');
      const candidate = {
        schema_version: 1, session_id: meta.id, boundary_id: boundary, cwd: meta.cwd, harness: 'codex',
        prompt_integrity: {
          encoding: 'utf-8', bytes_base64: bytes.toString('base64'), byte_length: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        },
        intent: { kind: 'turn' },
      };
      try {
        attestNativeUserEvent({
          candidate,
          transcriptPath: file,
          bootstrapFence: {
            schema_version: 1, session_id: meta.id, harness: 'codex', cwd: meta.cwd,
            source_absent: true, cursor: null,
          },
          observation: 'pre-tool',
          codexHome: join(homedir(), '.codex'),
          requireNoFollowingUser: false,
        });
        attested++;
      } catch (error) {
        if (failures.length < 3) failures.push(`${String(meta.id).slice(0, 8)}: ${error.code} ${error.message}`);
      }
    }
    assert.ok(checked > 0, '取样里没有任何可用的首条真人 prompt——冒烟没有真正跑到，不算通过');
    assert.ok(sawPreamble > 0,
      '取样里一条注入前言都没遇到——本用例正是为它而写，没遇到说明取样或判据失真，不算通过');
    assert.strictEqual(attested, checked,
      `${checked} 份真实 rollout 里只有 ${attested} 份可认证：\n      ${failures.join('\n      ')}`);
  });
}

console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
