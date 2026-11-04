'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/engine.js');
const D = require('../src/data.js');

const GOOD = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' };
const check = (b, tweak) => {
  const parts = C.resolve(b);
  if (tweak) tweak(parts);
  return C.checkCompat(parts);
};
const item = (res, id) => res.items.find((i) => i.id === id);

test('data integrity: unique ids, valid categories, positive sample IQD prices', () => {
  const ids = new Set();
  for (const p of D.PARTS) {
    assert.ok(!ids.has(p.id), 'duplicate id ' + p.id);
    ids.add(p.id);
    assert.ok(C.catInfo(p.cat), 'bad cat ' + p.id);
    assert.ok(p.price.IQ > 0, 'price ' + p.id);
    assert.equal(p.priceSource, 'sample');
  }
});

test('clean build is compatible with no errors or warnings', () => {
  const r = check(GOOD);
  assert.equal(r.verdict, 'ok');
  assert.equal(r.counts.error, 0);
  assert.equal(r.counts.warn, 0);
  assert.ok(item(r, 'limits'), 'always lists what was not checked');
});

test('QA-01 socket mismatch (AM5 CPU on AM4 board) is an error', () => {
  const r = check({ ...GOOD, mobo: 'a520m' });
  assert.equal(item(r, 'socket').status, 'error');
  assert.equal(r.verdict, 'error');
});

test('QA-02 DDR4 RAM on DDR5 board is an error', () => {
  const r = check({ ...GOOD, ram: 'ddr4-16-3200' });
  assert.equal(item(r, 'ramtype').status, 'error');
});

test('QA-03 GPU longer than case is an error; tight margin is a warning', () => {
  const tight = check({ ...GOOD, gpu: 'rx7800xt', case: 'case-matx' }); // 285 vs 300
  assert.equal(item(tight, 'gpulen').status, 'warn');
  const over = check({ ...GOOD, gpu: 'rx7800xt', case: 'case-matx' }, (p) => { p.case = { ...p.case, maxGpuMm: 280 }; });
  assert.equal(item(over, 'gpulen').status, 'error');
});

test('QA-04 ATX board in mATX-only case is an error', () => {
  const r = check({ ...GOOD, mobo: 'b650-atx', case: 'case-matx' });
  assert.equal(item(r, 'form').status, 'error');
});

test('QA-05 PSU below estimated draw is an error', () => {
  const r = check({ cpu: 'i7-14700k', mobo: 'z790-ddr5', ram: 'ddr5-32-6000', gpu: 'rtx4070s', storage: 'nvme-1tb', psu: 'psu-550', case: 'case-atx-airflow', cooler: 'cool-dual-tower' });
  assert.equal(item(r, 'psu').status, 'error');
});

test('QA-06 PSU meeting the estimate but under the vendor recommendation warns', () => {
  const r = check({ ...GOOD, gpu: 'rtx4070', psu: 'psu-550' });
  assert.equal(item(r, 'psu').status, 'ok');
  assert.equal(item(r, 'psuvendor').status, 'warn');
  assert.equal(r.verdict, 'warn');
});

test('QA-07 BIOS-update risk is a low-confidence warning, not an error', () => {
  const a = check({ cpu: 'r5-5600', mobo: 'a520m', ram: 'ddr4-16-3200', gpu: 'rx7600', storage: 'nvme-500', psu: 'psu-550', case: 'case-atx-mid' });
  assert.equal(item(a, 'bios').status, 'warn');
  assert.equal(item(a, 'bios').confidence, 'low');
  const b = check({ cpu: 'i5-13400f', mobo: 'b660m-ddr4', ram: 'ddr4-16-3200', gpu: 'rtx4060', storage: 'nvme-500', psu: 'psu-550', case: 'case-atx-mid' });
  assert.equal(item(b, 'bios').status, 'warn');
});

test('QA-08 CPU without bundled cooler and no cooler selected warns', () => {
  const r = check({ ...GOOD, cpu: 'r7-5700x', mobo: 'b550m', ram: 'ddr4-16-3200' });
  assert.equal(item(r, 'cooleravail').status, 'warn');
});

test('QA-09 cooler too tall / unsupported radiator are errors; weak cooler warns', () => {
  const tall = check({ ...GOOD, cooler: 'cool-dual-tower', case: 'case-matx' }); // 160 > 155
  assert.equal(item(tall, 'coolerfit').status, 'error');
  const hot = check({ cpu: 'i7-14700k', mobo: 'z790-ddr5', ram: 'ddr5-32-6000', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-850', case: 'case-atx-airflow', cooler: 'cool-tower-120' });
  assert.equal(item(hot, 'coolerpower').status, 'warn');
});

test('QA-10 missing spec data yields "unknown", never a false "compatible"', () => {
  const r = check(GOOD, (p) => { p.gpu = { ...p.gpu, lengthMm: null }; });
  assert.equal(item(r, 'gpulen').status, 'unknown');
  assert.equal(r.verdict, 'unknown');
});

test('QA-11 incomplete builds are "unknown" (not compatible) and empty builds are "empty"', () => {
  assert.equal(check({ cpu: 'r5-7600', mobo: 'b650m' }).verdict, 'unknown');
  assert.equal(check({}).verdict, 'empty');
  assert.ok(check({ cpu: 'r5-7600' }).missingRequired.includes('gpu'));
});

test('build code round-trips and rejects junk', () => {
  const code = C.encodeBuild(GOOD);
  assert.deepEqual(C.decodeBuild(code), GOOD);
  assert.equal(C.decodeBuild('nonsense'), null);
  assert.equal(C.decodeBuild('RL1.rtx4060.b650m..........'), null);
  assert.equal(C.decodeBuild(C.encodeBuild({}) + 'x'), null);
});

test('PSU and UPS maths', () => {
  const p = C.psuFromLoad(400, 0.3);
  assert.equal(p.recommended, 550); // 520 -> 550
  const u = C.upsEstimate({ loadW: 300, batteryV: 12, batteryAh: 9, batteryCount: 2, inverterEff: 0.85, usablePct: 0.5, powerFactor: 0.6, ratedVA: 1000 });
  assert.ok(Math.abs(u.nominalWh - 216) < 1e-9);
  assert.ok(Math.abs(u.runtimeMin - (216 * 0.85 * 0.5) / 300 * 60) < 1e-6);
  assert.equal(u.fitsLoad, true); // 600W capacity
  assert.equal(C.upsEstimate({ loadW: 700, batteryV: 12, batteryAh: 9, batteryCount: 2, ratedVA: 1000, powerFactor: 0.6 }).fitsLoad, false);
});

test('smart budget: results fit the budget and re-check clean; tiny budget explains minimum', () => {
  for (const usage of Object.keys(C.USAGE)) {
    const r = C.suggestBuilds({ budget: 1800000, usage });
    assert.ok(r.results.length >= 1, usage + ' has results');
    for (const x of r.results) {
      assert.ok(x.total <= 1800000);
      assert.equal(C.checkCompat(C.resolve(x.ids)).verdict, 'ok');
      assert.equal(C.buildTotal(C.resolve(x.ids)), x.total);
    }
  }
  const edit = C.suggestBuilds({ budget: 1800000, usage: 'editing' });
  assert.ok(C.resolve(edit.results[0].ids).ram.gb >= 32);
  const tiny = C.suggestBuilds({ budget: 300000, usage: '1080p' });
  assert.equal(tiny.results.length, 0);
  assert.ok(tiny.minTotal > 300000);
});

test('offers are labelled sample, dated, deterministic, and sponsorship does not change order', () => {
  const a = C.offersFor('rtx4060'), b = C.offersFor('rtx4060');
  assert.deepEqual(a, b);
  assert.equal(a.length, D.STORES.length);
  for (const o of a) { assert.equal(o.source, 'sample'); assert.ok(o.updated); }
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].price <= a[i].price);
  assert.ok(a.some((o) => o.sponsored), 'a sponsored sample store exists to exercise the label');
});

test('store cost: single-store totals only count fully available stores', () => {
  const r = C.costByStore(C.resolve(GOOD));
  assert.equal(r.partCount, 7);
  r.stores.forEach((s) => { if (!s.complete) assert.ok(s.missing.length > 0); });
});

test('cart: groups by store, totals only count in-stock lines, quantities are clamped', () => {
  const ids = ['r5-7600', 'rtx4060', 'ddr5-16-5600', 'nvme-1tb', 'psu-650'];
  const items = ids.map((partId) => ({ partId, storeId: C.bestOffer(partId).storeId, qty: 1 }));
  items[0].qty = 99;
  const g = C.cartGroups(items);
  assert.equal(g.count, 9 + 4);
  assert.equal(g.unavailable, 0);
  const sum = g.groups.reduce((n, x) => n + x.subtotal, 0);
  assert.equal(sum, g.total);
  assert.equal(g.groups.reduce((n, x) => n + x.lines.length, 0), ids.length);
});

test('cart: an out-of-stock line is flagged and excluded from the subtotal', () => {
  let found = null;
  for (const p of D.PARTS) for (const o of C.offersFor(p.id)) if (!o.available) { found = o; break; }
  assert.ok(found, 'sample data has at least one out-of-stock offer');
  const g = C.cartGroups([{ partId: found.partId, storeId: found.storeId, qty: 2 }]);
  assert.equal(g.unavailable, 1);
  assert.equal(g.total, 0);
  assert.equal(g.groups[0].lines[0].available, false);
});

test('cart: planCheapest never costs more than the current assignment; single-store needs full stock', () => {
  const parts = ['r5-7600', 'rtx4060', 'ddr5-16-5600', 'nvme-1tb'];
  const worst = parts.map((partId) => ({ partId, qty: 1, storeId: C.offersFor(partId).filter((o) => o.available).pop().storeId }));
  const cheap = C.planCheapest(worst);
  assert.ok(C.cartGroups(cheap).total <= C.cartGroups(worst).total);
  cheap.forEach((it) => assert.equal(it.storeId, C.bestOffer(it.partId).storeId));
  const single = C.planSingleStore(worst);
  for (const s of single) parts.forEach((id) => assert.ok(C.offerFor(id, s.store.id).available));
  for (let i = 1; i < single.length; i++) assert.ok(single[i - 1].total <= single[i].total);
  assert.deepEqual(C.planSingleStore([]), []);
});

test('buy link: sample stores have none; a live store gets a tracked store URL', () => {
  D.STORES.forEach((s) => assert.equal(C.buyUrl(s), null));
  assert.equal(C.buyUrl({ live: true, url: 'https://shop.example/' }), 'https://shop.example/?utm_source=riglab&utm_medium=referral');
  assert.equal(C.buyUrl({ live: true, url: 'https://shop.example/?a=1' }), 'https://shop.example/?a=1&utm_source=riglab&utm_medium=referral');
  assert.equal(C.buyUrl({ live: false, url: 'https://shop.example/' }), null);
});
