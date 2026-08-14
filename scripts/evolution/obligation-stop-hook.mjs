#!/usr/bin/env node

import { stopHook } from './obligation-runtime.mjs';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

try {
  const result = await stopHook(Buffer.concat(chunks));
  if (result) process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`[obligation-stop] BLOCKED ${error.message}\n`);
  process.exitCode = 2;
}
