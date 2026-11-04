'use strict';
// The browser bundle must expose exactly what Node tests exercise (same modules, no drift).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const vm = require('vm');
const { bundle } = require('../../scripts/lib/bundle');

test('bundled core/data behave like the required modules', () => {
  const code = bundle(path.join(__dirname, '../../src'), ['data', 'core'], { RigLabData: 'data/index', RigLabCore: 'core/index' });
  const win = {};
  vm.runInNewContext(code, { window: win });
  const C = require('../../src/core');
  assert.deepEqual(Object.keys(win.RigLabCore).sort(), Object.keys(C).sort());
  assert.equal(win.RigLabData.PARTS.length, require('../../src/data').PARTS.length);
  const g = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' };
  assert.equal(win.RigLabCore.checkCompat(win.RigLabCore.resolve(g)).verdict, 'ok');
  assert.equal(win.RigLabCore.encodeBuild(g), C.encodeBuild(g));
});

test('bundle has no stray references to Node-only globals', () => {
  const code = bundle(path.join(__dirname, '../../src'), ['data', 'core'], {});
  assert.ok(!/\bprocess\.|\bBuffer\b|require\('fs'\)/.test(code));
});
