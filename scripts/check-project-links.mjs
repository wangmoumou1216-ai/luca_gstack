#!/usr/bin/env node
import assert from 'assert/strict';
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join, relative } from 'path';

const root = process.cwd();
const projectsRoot = join(homedir(), 'Desktop', '项目');
const docsLink = join(root, 'docs');
const stateLink = join(root, '.claude', 'workflow-state.yaml');
const topicLink = join(root, ".claude", "current-topic.txt");

const extraDocsAliases = readdirSync(root).filter(name => /^docs\s+/.test(name));
assert.deepEqual(
  extraDocsAliases,
  [],
  `root must not contain stale docs aliases: ${extraDocsAliases.join(", ")}`
);

function mustSymlink(path, label) {
  assert.ok(existsSync(path), `${label} missing: ${path}`);
  assert.ok(lstatSync(path).isSymbolicLink(), `${label} must be a symlink`);
  return readlinkSync(path);
}

function projectNameFromTarget(target, suffix, label) {
  assert.ok(target.startsWith(projectsRoot + '/'), `${label} target must be under ${projectsRoot}: ${target}`);
  assert.ok(target.endsWith(suffix), `${label} target must end with ${suffix}: ${target}`);
  const rel = relative(projectsRoot, target);
  return rel.slice(0, -suffix.length).replace(/\/$/, '');
}

const docsTarget = mustSymlink(docsLink, 'docs');
const stateTarget = mustSymlink(stateLink, 'workflow-state');
const topicTarget = mustSymlink(topicLink, 'current-topic');

const docsProject = projectNameFromTarget(docsTarget, '/docs', 'docs');
const stateProject = projectNameFromTarget(stateTarget, '/.luca/workflow-state.yaml', 'workflow-state');
const topicProject = projectNameFromTarget(topicTarget, '/.luca/current-topic.txt', 'current-topic');

assert.equal(stateProject, docsProject, 'docs and workflow-state must point to the same project');
assert.equal(topicProject, docsProject, 'docs and current-topic must point to the same project');
assert.ok(existsSync(docsTarget), `docs target does not exist: ${docsTarget}`);
assert.ok(existsSync(stateTarget), `workflow-state target does not exist: ${stateTarget}`);
assert.ok(existsSync(topicTarget), `current-topic target does not exist: ${topicTarget}`);

const state = readFileSync(stateTarget, 'utf8');
assert.match(state, /^nodes:/m, 'workflow-state must contain nodes');
assert.match(state, /^mode:\s*"(standalone|workflow)"/m, 'workflow-state mode must be standalone or workflow');

console.log(`PASS project links: ${docsProject}`);
