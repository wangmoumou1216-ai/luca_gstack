#!/usr/bin/env node
import assert from 'node:assert/strict';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const args = process.argv.slice(2);
assert.ok(args.length >= 2 && args.length <= 3, 'usage: node scripts/check-plan-graph.mjs --graph <absolute-json-path> [--require-no-external-blockers]');
assert.equal(args[0], '--graph', 'only --graph is supported');
assert.ok(isAbsolute(args[1]), '--graph requires an absolute path');
const requireNoExternalBlockers = args[2] === '--require-no-external-blockers';
assert.ok(args.length === 2 || requireNoExternalBlockers, 'unknown graph checker option');
const path = resolve(args[1]);
let graph;
const graphStat = lstatSync(path);
assert.ok(graphStat.isFile() && !graphStat.isSymbolicLink(), 'graph must be a canonical regular file');
assert.equal(realpathSync(path), path, 'graph path must be canonical');
try { graph = JSON.parse(readFileSync(path, 'utf8')); } catch (error) { throw new Error('cannot read graph: ' + error.message); }
assert.ok(graph && typeof graph === 'object' && !Array.isArray(graph), 'graph must be an object');
for (const field of ['ready', 'authorized', 'execution_authorized', 'status', 'execution_state']) {
  assert.ok(!(field in graph), 'graph must not carry execution state: ' + field);
}
assert.match(graph.plan_id ?? '', /^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$/, 'plan_id is required');
assert.match(graph.plan_sha256 ?? '', /^[0-9a-f]{64}$/, 'plan_sha256 is required');
assert.ok(Array.isArray(graph.nodes) && graph.nodes.length > 0, 'nodes must be a non-empty array');
assert.ok(Array.isArray(graph.external_dependencies), 'external_dependencies must be an array');
const ids = new Set();
for (const node of graph.nodes) {
  assert.ok(node && typeof node === 'object', 'each node must be an object');
  assert.match(node.id ?? '', /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/, 'invalid node id');
  assert.ok(!ids.has(node.id), 'duplicate node id: ' + node.id);
  ids.add(node.id);
  assert.ok(Array.isArray(node.dependencies), 'dependencies must be an array: ' + node.id);
  assert.ok(!('ready' in node) && !('authorized' in node), 'graph must not carry execution state: ' + node.id);
}
const edges = new Map([...ids].map((id) => [id, []]));
for (const node of graph.nodes) {
  for (const dep of node.dependencies) {
    assert.match(dep ?? '', /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/, 'invalid dependency on ' + node.id);
    assert.ok(ids.has(dep), 'unknown dependency ' + dep + ' referenced by ' + node.id);
    assert.notEqual(dep, node.id, 'self dependency: ' + node.id);
    edges.get(dep).push(node.id);
  }
}
const externalBlockers = [];
assert.equal(new Set(graph.external_dependencies.map((x) => x?.node_id)).size, graph.external_dependencies.length, 'duplicate external dependency node_id');
for (const external of graph.external_dependencies) {
  assert.ok(external && ids.has(external.node_id), 'external dependency references unknown node: ' + external?.node_id);
  assert.match(external.source_ref ?? '', /^(?:https?:\/\/|[A-Za-z0-9._\/-])/, 'invalid external source_ref: ' + external?.node_id);
  assert.ok(['PASS', 'FAIL', 'UNKNOWN'].includes(external.status), 'invalid external status: ' + external.node_id);
  if (external.status !== 'PASS') externalBlockers.push({ node_id: external.node_id, source_ref: external.source_ref, status: external.status });
}
const indegree = new Map([...ids].map((id) => [id, 0]));
for (const children of edges.values()) for (const child of children) indegree.set(child, indegree.get(child) + 1);
const queue = [...ids].filter((id) => indegree.get(id) === 0).sort();
const order = [];
while (queue.length) {
  const id = queue.shift(); order.push(id);
  for (const child of edges.get(id)) {
    indegree.set(child, indegree.get(child) - 1);
    if (indegree.get(child) === 0) { queue.push(child); queue.sort(); }
  }
}
assert.equal(order.length, ids.size, 'dependency cycle detected; residual nodes: ' + [...ids].filter((id) => !order.includes(id)).sort().join(', '));
const level = new Map([...ids].map((id) => [id, 0]));
for (const id of order) for (const child of edges.get(id)) level.set(child, Math.max(level.get(child), level.get(id) + 1));
const layers = [...new Set([...level.values()])].sort((a, b) => a - b).map((n) => ({ level: n, node_ids: [...ids].filter((id) => level.get(id) === n).sort() }));
if (requireNoExternalBlockers) {
  assert.equal(externalBlockers.length, 0,
    'external dependencies are not all PASS: ' + externalBlockers.map((x) => x.node_id + ':' + x.status).join(', '));
}
console.log(JSON.stringify({ schema_version: 1, plan_id: graph.plan_id, topological_order: order, layers, external_blockers: externalBlockers }, null, 2));
