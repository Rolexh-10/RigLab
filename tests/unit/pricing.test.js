'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../src/core');

const GOOD = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' };

test('every part has offers from every sample store, all labelled sample and positive', () => {
  for (const p of C.PARTS) {
    const offers = C.offersFor(p.id);
    assert.equal(offers.length, C.STORES.length, p.id);
    for (const o of offers) {
      assert.equal(o.source, 'sample');
      assert.ok(o.price > 0 && Number.isInteger(o.price), p.id + ' ' + o.storeId);
      assert.equal(o.currency, 'IQD');
      assert.ok(o.updated, 'has an update date');
    }
  }
});

test('offers are deterministic (same inputs, same output)', () => {
  assert.deepEqual(C.offersFor('rtx4060'), C.offersFor('rtx4060'));
});

test('offers for an unknown part are an empty list, not an exception', () => {
  assert.deepEqual(C.offersFor('nope'), []);
});

test('bestOffer is the cheapest available offer; out-of-stock offers never win', () => {
  for (const p of C.PARTS) {
    const avail = C.offersFor(p.id).filter((o) => o.available);
    const best = C.bestOffer(p.id);
    if (!avail.length) { assert.equal(best, null); continue; }
    assert.equal(best.price, Math.min(...avail.map((o) => o.price)));
    assert.ok(best.available);
  }
});

test('buildTotal equals the sum of part prices and ignores unknown ids', () => {
  const parts = C.resolve({ ...GOOD, gpu: 'nope' });
  assert.equal(C.buildTotal(parts), Object.values(parts).reduce((s, p) => s + C.priceOf(p), 0));
  assert.equal(C.buildTotal({}), 0);
});

test('costByStore: totals equal the sum of that store offers; incomplete stores are marked', () => {
  const parts = C.resolve(GOOD);
  for (const s of C.costByStore(parts).stores) {
    if (!s.complete) { assert.ok(s.missing.length > 0); continue; }
    const sum = Object.values(parts).reduce((t, p) => t + C.offerFor(p.id, s.store.id).price, 0);
    assert.equal(s.total, sum, s.store.id);
  }
});

test('cart: quantity is clamped to 1..9 and totals scale with quantity', () => {
  const one = C.cartGroups([{ partId: 'rtx4060', storeId: 'sample-a', qty: 1 }]);
  const many = C.cartGroups([{ partId: 'rtx4060', storeId: 'sample-a', qty: 500 }]);
  const neg = C.cartGroups([{ partId: 'rtx4060', storeId: 'sample-a', qty: -3 }]);
  assert.equal(many.groups[0].lines[0].qty, 9);
  assert.equal(neg.groups[0].lines[0].qty, 1);
  assert.equal(many.groups[0].lines[0].qty * one.groups[0].lines[0].offer.price, many.groups[0].lines[0].qty * C.offerFor('rtx4060', 'sample-a').price);
});

test('cart: empty cart and unknown store/part do not throw', () => {
  assert.doesNotThrow(() => C.cartGroups([]));
  assert.doesNotThrow(() => C.cartGroups([{ partId: 'nope', storeId: 'nope', qty: 1 }]));
});

test('offers are ordered strictly by price (sponsorship never reorders)', () => {
  for (const p of C.PARTS) {
    const prices = C.offersFor(p.id).map((x) => x.price);
    assert.deepEqual(prices, prices.slice().sort((a, b) => a - b), p.id);
  }
});
