import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {resolve} from 'node:path';

// Observation only: preserve arguments, return values, errors and fixture placement.
const append = fs.appendFileSync;
const originalMkdtemp = fs.mkdtempSync;
const originalRm = fs.rmSync;
const audit = process.env.LUCA_C24_AUDIT_PATH;
const record = value => append(audit, `${JSON.stringify(value)}\n`);
record({kind: 'start', cwd: process.cwd(), pid: process.pid});
fs.mkdtempSync = function (...args) {
  const path = originalMkdtemp.apply(this, args);
  record({kind: 'owned-directory', path: resolve(String(path)), prefix: String(args[0])});
  return path;
};
fs.rmSync = function (...args) {
  const result = originalRm.apply(this, args);
  record({kind: 'removed', path: resolve(String(args[0]))});
  return result;
};
syncBuiltinESMExports();
