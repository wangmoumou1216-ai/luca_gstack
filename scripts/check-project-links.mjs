#!/usr/bin/env node
import assert from 'assert/strict';
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  PROJECTS_ROOT,
  canonicalProjectIdentity,
  projectNameFromLink,
  readProjectState,
  validatedBindingForState,
} from '../.claude/hooks/lib/project-substrate.mjs';

const root = process.cwd();
const docsLink = join(root, 'docs');
const stateLink = join(root, '.claude', 'workflow-state.yaml');
const topicLink = join(root, '.claude', 'current-topic.txt');

const extraDocsAliases = readdirSync(root).filter(name => /^docs\s+/.test(name));
assert.deepEqual(extraDocsAliases, [], `root must not contain stale docs aliases: ${extraDocsAliases.join(', ')}`);

function linkKind(path) {
  try { return lstatSync(path).isSymbolicLink() ? 'symlink' : 'other'; }
  catch (error) { if (error?.code === 'ENOENT') return 'absent'; throw error; }
}

const links = [
  { key: 'docs', path: docsLink, suffix: 'docs' },
  { key: 'workflow-state', path: stateLink, suffix: join('.luca', 'workflow-state.yaml') },
  { key: 'current-topic', path: topicLink, suffix: join('.luca', 'current-topic.txt') },
];
const kinds = links.map(item => linkKind(item.path));
assert.ok(kinds.every(kind => kind === 'absent') || kinds.every(kind => kind === 'symlink'),
  `display links must be an exact all-absent/all-symlink tuple: ${links.map((item, i) => `${item.key}=${kinds[i]}`).join(', ')}`);

let displayProject = '';
if (kinds[0] === 'symlink') {
  const targets = links.map(item => readlinkSync(item.path));
  displayProject = projectNameFromLink(targets[0], { projectsRoot: PROJECTS_ROOT });
  assert.ok(displayProject, `docs target has no canonical project identity: ${targets[0]}`);
  const identity = canonicalProjectIdentity(displayProject, PROJECTS_ROOT);
  const expected = [
    join(identity.realpath, 'docs'),
    join(identity.realpath, '.luca', 'workflow-state.yaml'),
    join(identity.realpath, '.luca', 'current-topic.txt'),
  ];
  assert.deepEqual(targets, expected, 'display tuple must target one exact canonical project identity');
  for (let i = 0; i < expected.length; i++) assert.ok(existsSync(expected[i]), `${links[i].key} target missing: ${expected[i]}`);
  const state = readFileSync(expected[1], 'utf8');
  assert.match(state, /^nodes:/m, 'workflow-state must contain nodes');
  assert.match(state, /^mode:\s*"(standalone|workflow)"/m, 'workflow-state mode must be standalone or workflow');
}

// Display links are not session identity. Validate every persisted session state
// independently; parallel sessions may legitimately bind different projects.
const claudeDir = join(root, '.claude');
const stateFiles = readdirSync(claudeDir).filter(name => /^\.session-project-[\w-]{1,36}$/.test(name));
for (const file of stateFiles) {
  const sid = file.slice('.session-project-'.length);
  let state;
  try {
    state = readProjectState(root, sid).value;
  } catch (error) {
    const message = String(error?.message || error);
    const legacy = message.match(/legacy project pin requires explicit migration: session=([^ ]+) project=(.+)$/);
    if (legacy) {
      throw new Error(`${file}: legacy pin is read-only until explicitly resolved. Existing project → node scripts/project-pin.mjs migrate-legacy-pin --session ${sid}; missing/stale project → node scripts/project-pin.mjs quarantine-legacy-pin --session ${sid} --expected-project ${legacy[2]}`);
    }
    throw error;
  }
  assert.notEqual(state.state, 'NO_PIN', `${file}: NO_PIN must be represented by absence`);
  validatedBindingForState(state, PROJECTS_ROOT);
}

console.log(`PASS project links: display=${displayProject || 'deactivated'}; validated session states=${stateFiles.length}`);
