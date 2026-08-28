#!/usr/bin/env node
// 能力 parity 自检：保留历史 anchor tripwire，同时验证 Claude/Codex skill projection 的语义形状。
// 默认 projection 必须是同源 symlink；只有 skill 自己声明 external-delegation + reason + authority
// pointer 时才能例外。义务只从 authority source 派生，Codex entry 仅存 canonical digest，避免
// 第二份 obligation catalog。
import { readFileSync, existsSync, lstatSync, realpathSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  gateProjection,
  readAuthority,
  readBoundedBlock,
  readSkillHeader,
} from './lib/semantic-projection.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.LUCA_PARITY_ROOT ? resolve(process.env.LUCA_PARITY_ROOT) : join(here, "..");
const manifest = JSON.parse(
  readFileSync(join(repoRoot, ".claude", "skill-os", "capability-parity.json"), "utf8"),
);
const missing = [];
const repoRootReal = realpathSync(repoRoot);

function repositoryOwnedDirectory(path, label) {
  let stat;
  try { stat = lstatSync(path); } catch { stat = null; }
  if (!stat?.isDirectory() || stat.isSymbolicLink()) {
    missing.push(`${label} 必须是仓内真实目录，禁止 symlink/缺失`);
    return false;
  }
  let real = '';
  try { real = realpathSync(path); } catch { }
  const rel = real ? relative(repoRootReal, real) : '';
  if (!real || !rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    missing.push(`${label} realpath 逃逸仓库：${real || '<unresolved>'}`);
    return false;
  }
  return true;
}

let anchorCount = 0;
for (const [file, anchors] of Object.entries(manifest.files)) {
  const p = join(repoRoot, file);
  if (!existsSync(p)) {
    for (const a of anchors) missing.push(`${file} 缺文件（锚点「${a}」）`);
    continue;
  }
  const text = readFileSync(p, "utf8");
  for (const a of anchors) {
    anchorCount++;
    if (!text.includes(a)) missing.push(`${file} 缺锚点「${a}」`);
  }
}

const officeRoot = join(repoRoot, '.claude', 'skills', 'office');
const agentsRoot = join(repoRoot, '.agents', 'skills');
const officeRootValid = repositoryOwnedDirectory(officeRoot, '.claude/skills/office');
const agentsRootValid = repositoryOwnedDirectory(agentsRoot, '.agents/skills');
if (!officeRootValid || !agentsRootValid) {
  console.error(`❌ capability parity FAIL（${missing.length} 处）：`);
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}

const sourceSkills = [{ name: 'office', dir: officeRoot }];
const invalidSourceNames = new Set();
for (const entry of readdirSync(officeRoot, { withFileTypes: true })) {
  const candidate = join(officeRoot, entry.name);
  if (entry.isSymbolicLink()) {
    missing.push(`.claude/skills/office/${entry.name} source skill 禁止 symlink`);
    invalidSourceNames.add(entry.name);
    continue;
  }
  if (!entry.isDirectory()) continue;
  const candidateSkill = join(candidate, 'SKILL.md');
  let candidateStat;
  try { candidateStat = lstatSync(candidateSkill); } catch { candidateStat = null; }
  if (!candidateStat) continue;
  if (!candidateStat.isFile() || candidateStat.isSymbolicLink()) {
    missing.push(`.claude/skills/office/${entry.name}/SKILL.md source SKILL.md 必须是普通文件，禁止 symlink`);
    invalidSourceNames.add(entry.name);
    continue;
  }
  sourceSkills.push({ name: entry.name, dir: candidate });
}
const expectedNames = new Set([
  ...sourceSkills.map(({ name }) => name),
  ...invalidSourceNames,
]);
for (const entry of readdirSync(agentsRoot, { withFileTypes: true })) {
  if (!expectedNames.has(entry.name)) {
    missing.push(`.agents/skills/${entry.name} 是无 source-owned projection 的 orphan entry`);
  }
}

let shared = 0;
let delegated = 0;
for (const { name, dir } of sourceSkills) {
  const sourceFile = join(dir, 'SKILL.md');
  let sourceStat;
  try { sourceStat = lstatSync(sourceFile); } catch { sourceStat = null; }
  if (!sourceStat?.isFile() || sourceStat.isSymbolicLink()) {
    missing.push(`${sourceFile.slice(repoRoot.length + 1)} source SKILL.md 必须是普通文件，禁止 symlink`);
    continue;
  }
  let sourceDirReal = '', sourceFileReal = '';
  try { sourceDirReal = realpathSync(dir); sourceFileReal = realpathSync(sourceFile); } catch { }
  if (!sourceDirReal || !sourceFileReal || dirname(sourceFileReal) !== sourceDirReal) {
    missing.push(`${sourceFile.slice(repoRoot.length + 1)} source SKILL.md 逃逸声明目录`);
    continue;
  }
  let source;
  try { source = readSkillHeader(sourceFile); } catch (error) {
    missing.push(`${sourceFile.slice(repoRoot.length + 1)} frontmatter 非法：${error.message}`);
    continue;
  }
  if (source.name !== name) {
    missing.push(`${sourceFile.slice(repoRoot.length + 1)} source name=${source.name || '<missing>'}，应与目录 ${name} 一致`);
  }
  const entryDir = join(repoRoot, '.agents', 'skills', name);
  const entryRelative = `.agents/skills/${name}`;
  if (!existsSync(entryDir)) {
    missing.push(`${entryRelative} 缺失（source=${sourceFile.slice(repoRoot.length + 1)}）`);
    continue;
  }

  const mode = source.metadata['codex-projection-mode'] || 'shared-symlink';
  if (mode === 'shared-symlink') {
    let stat;
    try { stat = lstatSync(entryDir); } catch { stat = null; }
    if (!stat?.isSymbolicLink()) {
      missing.push(`${entryRelative} 应为 shared-symlink；真实目录必须由 source metadata 显式声明 delegation`);
      continue;
    }
    let actual = '', expected = '';
    try { actual = realpathSync(entryDir); expected = realpathSync(dir); } catch { }
    if (!actual || actual !== expected) {
      missing.push(`${entryRelative} target swap：actual=${actual || '<unresolved>'} expected=${expected || '<unresolved>'}`);
      continue;
    }
    shared++;
    continue;
  }

  if (mode !== 'external-delegation') {
    missing.push(`${sourceFile.slice(repoRoot.length + 1)} codex-projection-mode 非法: ${mode}`);
    continue;
  }

  const expectedTarget = `.agents/skills/${name}/SKILL.md`;
  const target = source.metadata['codex-projection-target'];
  const reason = source.metadata['codex-projection-reason'];
  const authority = source.metadata['codex-obligation-source'];
  if (target !== expectedTarget) missing.push(`${name} delegation target swap：${target || '<missing>'} != ${expectedTarget}`);
  if (!reason || reason.length < 20) missing.push(`${name} delegation 缺 source-owned reason（至少 20 字符）`);
  if (!authority) missing.push(`${name} delegation 缺 codex-obligation-source`);
  let entryStat;
  try { entryStat = lstatSync(entryDir); } catch { entryStat = null; }
  if (!entryStat?.isDirectory() || entryStat.isSymbolicLink()) {
    missing.push(`${entryRelative} external-delegation 必须是独立目录而非 symlink`);
    continue;
  }
  if (!target) continue;

  const targetPath = join(repoRoot, target);
  let targetStat;
  try { targetStat = lstatSync(targetPath); } catch { targetStat = null; }
  if (!targetStat) {
    missing.push(`${target} delegation target 缺失`);
    continue;
  }
  if (!targetStat?.isFile() || targetStat.isSymbolicLink()) {
    missing.push(`${target} delegation target 必须是受控目录内的普通文件，禁止 symlink`);
    continue;
  }
  let entryReal = '', targetReal = '';
  try { entryReal = realpathSync(entryDir); targetReal = realpathSync(targetPath); } catch { }
  if (!entryReal || !targetReal || dirname(targetReal) !== entryReal) {
    missing.push(`${target} delegation target 逃逸声明目录：actual=${targetReal || '<unresolved>'}`);
    continue;
  }

  let projected;
  try { projected = readSkillHeader(targetPath); } catch (error) {
    missing.push(`${target} frontmatter 非法：${error.message}`);
    continue;
  }
  const wrapper = `.claude/skills/office/${name}/SKILL.md`;
  if (projected.name !== name) missing.push(`${target} name=${projected.name || '<missing>'}，应为 ${name}`);
  if (projected.metadata['luca-wrapper'] !== wrapper) {
    missing.push(`${target} 缺 back-pointer luca-wrapper=${wrapper}`);
  }
  if (projected.metadata['luca-obligation-source'] !== authority) {
    missing.push(`${target} obligation source 与 wrapper 不同源`);
  }
  const receiptBegin = '<!-- LUCA_RUNTIME_RECEIPT_BEGIN -->';
  const receiptEnd = '<!-- LUCA_RUNTIME_RECEIPT_END -->';
  let sourceReceipt = '', projectedReceipt = '';
  try { sourceReceipt = readBoundedBlock(source.source, receiptBegin, receiptEnd); } catch (error) {
    missing.push(`${wrapper} canonical runtime receipt 非法：${error.message}`);
  }
  try { projectedReceipt = readBoundedBlock(projected.source, receiptBegin, receiptEnd); } catch (error) {
    missing.push(`${target} runtime receipt 非法：${error.message}`);
  }
  if (sourceReceipt && projectedReceipt && sourceReceipt !== projectedReceipt) {
    missing.push(`${target} runtime receipt drift：必须精确投影 ${wrapper} 的 canonical block`);
  }
  if (authority) {
    try {
      const projection = gateProjection(authority, readAuthority(repoRoot, authority));
      if (projected.metadata['luca-obligation-digest'] !== projection.digest) {
        missing.push(`${target} obligation digest drift：actual=${projected.metadata['luca-obligation-digest'] || '<missing>'} expected=${projection.digest}`);
      }
    } catch (error) {
      missing.push(`${name} obligation authority 无法解析：${error.message}`);
    }
  }
  delegated++;
}

if (missing.length) {
  console.error(`❌ capability parity FAIL（${missing.length} 处）：`);
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}
console.log(`PASS capability parity: anchors=${anchorCount}, shared-projections=${shared}, delegated-projections=${delegated}`);
