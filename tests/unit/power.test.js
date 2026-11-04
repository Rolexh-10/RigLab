'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../src/core');

const GOOD = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' };

test('estimatePower: total = cpu + gpu + other; recommendation covers total with headroom, rounded to 50W', () => {
  const r = C.estimatePower(C.resolve(GOOD));
  assert.equal(r.total, r.cpuW + r.gpuW + r.otherW);
  assert.ok(r.recommended >= r.total * (1 + r.headroom) - 1e-9);
  assert.equal(r.recommended % 50, 0);
  assert.equal(r.complete, true);
});

test('estimatePower: a bigger GPU never lowers the estimate', () => {
  const small = C.estimatePower(C.resolve(GOOD)).total;
  const big = C.estimatePower(C.resolve({ ...GOOD, gpu: 'rtx4090' })).total;
  assert.ok(big > small);
});

test('estimatePower: partial builds are flagged incomplete instead of guessed', () => {
  assert.equal(C.estimatePower(C.resolve({ cpu: 'r5-7600' })).complete, false);
  assert.equal(C.estimatePower({}).complete, false);
});

test('psuFromLoad: monotonic in load and headroom, always a multiple of 50', () => {
  let prev = 0;
  for (let w = 100; w <= 1200; w += 37) {
    const r = C.psuFromLoad(w, 0.3).recommended;
    assert.ok(r >= prev && r % 50 === 0);
    assert.ok(r >= w);
    prev = r;
  }
  assert.ok(C.psuFromLoad(400, 0.5).recommended >= C.psuFromLoad(400, 0.1).recommended);
});

test('upsEstimate: missing battery data gives zero runtime, never NaN or Infinity', () => {
  const u = C.upsEstimate({ loadW: 300 });
  assert.equal(u.runtimeMin, 0);
  for (const v of Object.values(u)) if (typeof v === 'number') assert.ok(Number.isFinite(v));
});

test('upsEstimate: zero/negative/garbage load is clamped to 1W, runtime scales inversely with load', () => {
  const base = { batteryV: 12, batteryAh: 100, batteryCount: 1 };
  assert.equal(C.upsEstimate({ ...base, loadW: -5 }).loadW, 1);
  assert.equal(C.upsEstimate({ ...base, loadW: 'abc' }).loadW, 1);
  const a = C.upsEstimate({ ...base, loadW: 100 }).runtimeMin;
  const b = C.upsEstimate({ ...base, loadW: 200 }).runtimeMin;
  assert.ok(Math.abs(a / b - 2) < 1e-9);
});

test('upsEstimate: required VA grows with load and falls with a better power factor', () => {
  const lo = C.upsEstimate({ loadW: 200, powerFactor: 0.6 }).minRatedVA;
  const hi = C.upsEstimate({ loadW: 400, powerFactor: 0.6 }).minRatedVA;
  const pf = C.upsEstimate({ loadW: 400, powerFactor: 0.9 }).minRatedVA;
  assert.ok(hi > lo && pf < hi);
});
