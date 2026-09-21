import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { loadCatalog, computeCatalogHash, validateMatchAssessment } from './page-context.mjs';
import { createCarrierPacket, inspectCarrierPacket } from './carrier-packet.mjs';

// Expectations stay in the scorer, never in the live model prompt.
const cases = [
  { id: 'TF-01', request: '客户名单里的记录太多。在名单现有工具区增加负责人筛选，详情和导航不变。', expected: ['carrier_candidate', 'customer-list-detail', 'customer-toolbar-slot', 'add'] },
  { id: 'TF-02', request: '销售沟通记录的列表搜索旁边增加一个沟通方式筛选，别改客户列表和详情。', expected: ['carrier_candidate', 'sales-record-list-detail', 'list-toolbar-slot', 'add'] },
  { id: 'TF-03', request: 'CRM 首页主工作区新增一张回款提醒卡，已有任务卡和销售表现保持原样。', expected: ['carrier_candidate', 'crm-workbench-home', 'workspace-card-slot', 'add'] },
  { id: 'TF-04', request: '页面叫列表，但这是声音剪辑工具：核心是双轨波形同步剪切和试听。没有现有页面要保留，请按这些已确定的需求设计。', expected: ['reference_only', null, null, null] },
  { id: 'TF-05', request: '在客户页面上面加一个按钮，具体是什么按钮以及列表还是详情还没定。', expected: ['needs_context', null, null, null] },
  { id: 'TF-06', request: '本次明确不用任何模板或参考。已确认需求是显示销售汇总和待办列表，按需求交接即可。', expected: ['reference_only', null, null, null] },
  { id: 'TF-07', request: '客户名单中的记录表格不再需要，删除那块表格，保留工具栏、详情以及导航。', expected: ['carrier_candidate', 'customer-list-detail', 'customer-table', 'remove'] },
  { id: 'TF-08', request: '必须精确保留原客户模板联系人展开状态的既有字段，只改其中的排序方式；若库中没有那份完整状态，不接受新建或改用其他状态。', expected: ['needs_context', null, null, null] },
  { id: 'TF-09', request: '后台线索池设置中，把线索池表格的回收规则展示改为同时显示触发条件和执行时间，导航与其他规则配置不动。', expected: ['carrier_candidate', 'settings-lead-pool', 'lead-pool-table', 'modify'] },
];

export async function behaviorPrompt() {
  const catalog = await loadCatalog();
  assert.ok(!catalog.pages.some(page => page.original_copy), 'ORIGINAL_ADAPTER_REQUIRED: historical shadow-based decision goldens cannot validate the corrected original templates; use original locations and real source evidence');
  const contract = await readFile(new URL('../.claude/skill-os/runtime/page-context.md', import.meta.url), 'utf8');
  return `只做只读的独立决策检查，不调用工具、不写文件、不生成页面。以下每个用户请求相互独立。根据实际合同和完整目录判断模板及位置，不把词面命中当作语义匹配，不编造概率。所有请求都尚未获得模板采用确认或OD外部权限。你无需假装这些权限已经存在。\n输出一个JSON对象，唯一顶层键results为数组，每项字段：id、decision(carrier_candidate|reference_only|needs_context)、page_id(string|null)、target_id(string|null)、action(add|modify|remove|null)、reason(具体中文证据)、may_stage(boolean)。无确定绑定时三个目标字段为null。不得声称执行过任何外部操作。\n合同：\n${contract}\n目录：\n${JSON.stringify(catalog)}\n用户请求：\n${JSON.stringify(cases.map(({id,request})=>({id,request})))}`;
}

export function scoreBehavior(answer) {
  assert.deepEqual(Object.keys(answer).sort(), ['results']);
  assert.equal(answer.results?.length, cases.length, 'all cases required');
  assert.equal(new Set(answer.results.map(row => row.id)).size, cases.length, 'no repeated cases');
  for (const test of cases) {
    const row = answer.results.find(row => row.id === test.id);
    assert.ok(row, `missing ${test.id}`);
    assert.deepEqual([row.decision,row.page_id,row.target_id,row.action], test.expected, `${test.id}: ${row.reason}`);
    assert.equal(row.may_stage, false, `${test.id}: classification is not external authority`);
    assert.ok(typeof row.reason === 'string' && row.reason.trim().length >= 8, `${test.id}: source-grounded reason required`);
  }
  return { status: 'PASS', cases: cases.length, scope: 'natural-language decision probes; not OD generation or calibrated accuracy' };
}

async function main() {
  if (process.argv[2] === '--prompt') return console.log(await behaviorPrompt());
  if (process.argv[2] === '--score') return console.log(JSON.stringify(scoreBehavior(JSON.parse(await readFile(process.argv[3], 'utf8')))));
  assert.equal(process.argv.length, 2, 'usage: test-template-flow.mjs [--prompt|--score answer.json]');
  const catalog = await loadCatalog();
  const body = createCarrierPacket({ schema_version: 1, packet_kind: 'design-generation', items: [{source_kind:'decision',id:'D-001',text:'需求尚未确定具体新增按钮的职责。'}], scopes: [] });
  const packet = inspectCarrierPacket(body);
  const assessment = { schema_version:1, catalog_sha256:computeCatalogHash(catalog), frozen_packet:{source_packet_sha256:packet.source_packet_sha256,applicability_set_sha256:packet.applicability_set_sha256},decision:'needs_context',reason:'按钮职责未确定，先询问用户。',reviewed_fact_ids:['D-001'],candidate_evidence:[],judgments:[] };
  assert.equal(validateMatchAssessment(catalog,assessment,{packetBody:body}).status,'NEEDS_CONTEXT');
  assert.equal(validateMatchAssessment(catalog,{...assessment,decision:'reference_only',reason:'用户明确拒绝模板；此记录仅检查降级形状。'},{packetBody:body}).status,'REFERENCE_ONLY');
  assert.throws(()=>validateMatchAssessment(catalog,{...assessment,reviewed_fact_ids:['D-FAKE']},{packetBody:body}),{code:'MATCH_FACT_COVERAGE'});
  assert.throws(()=>validateMatchAssessment(catalog,{...assessment,catalog_sha256:'0'.repeat(64)},{packetBody:body}),{code:'STALE_MATCH_CATALOG'});
  // Self-test the scorer; this is NOT a live-model result.
  const synthetic = { results:cases.map(test=>({id:test.id,decision:test.expected[0],page_id:test.expected[1],target_id:test.expected[2],action:test.expected[3],reason:'Synthetic scorer self-test only; no semantic inference.',may_stage:false})) };
  assert.equal(scoreBehavior(synthetic).status,'PASS');
  const wrong = structuredClone(synthetic); wrong.results[4].decision='carrier_candidate';
  assert.throws(()=>scoreBehavior(wrong), /TF-05/);
  const authorized = structuredClone(synthetic); authorized.results[0].may_stage=true;
  assert.throws(()=>scoreBehavior(authorized), /external authority/);
  console.log(JSON.stringify({status:'PASS',scope:'deterministic gate and scorer self-test only',live_models:'NOT_RUN',catalog_sha256:computeCatalogHash(catalog),cases_sha256:createHash('sha256').update(JSON.stringify(cases)).digest('hex')}));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
