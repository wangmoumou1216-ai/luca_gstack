#!/usr/bin/env node

import { taskStartHook } from './obligation-runtime.mjs';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

try {
  process.stdout.write(await taskStartHook(Buffer.concat(chunks)));
} catch (error) {
  process.stderr.write(`[obligation-task-start] BLOCKED ${error.message}\n`);
  process.exitCode = 2;
}
