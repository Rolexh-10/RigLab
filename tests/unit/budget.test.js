'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../src/core');

const BUDGETS = [900000, 1200000, 1500000, 1800000, 2500000, 4000000];

test('suggestBuilds: every result fits the budget, re-checks clean and total matches the catalog', () => {
  for (const usage of Object.keys(C.USAGE)) for (const budget of BUDGETS) {
    const r = C.suggestBuilds({ budget, usage });
    for (const x of r.results) {
      assert.ok(x.total <= budget, usage + ' ' + budget);
      assert.equal(x.remaining, budget - x.total);
      const parts = C.resolve(x.ids);
      assert.notEqual(C.checkCompat(parts).verdict, 'error');
      assert.equal(C.buildTotal(parts), x.total);
    }
  }
});

test('suggestBuilds is deterministic and sorted by score (best first)', () => {
  const a = C.suggestBuilds({ budget: 1800000, usage: '1080p' });
  const b = C.suggestBuilds({ budget: 1800000, usage: '1080p' });
  assert.deepEqual(a, b);
  for (let i = 1; i < a.results.length; i++) assert.ok(a.results[i - 1].score >= a.results[i].score);
});

test('a larger budget never produces a worse best score', () => {
  let prev = -1;
  for (const budget of BUDGETS) {
    const r = C.suggestBuilds({ budget, usage: '1440p' });
    const best = r.results.length ? r.results[0].score : -1;
    assert.ok(best >= prev - 1e-9 || prev === -1, 'score regressed at ' + budget);
    prev = Math.max(prev, best);
  }
});

test('invalid input is handled: zero, negative, NaN budgets and unknown usage never throw', () => {
  for (const budget of [0, -1, NaN, undefined, 'abc']) assert.doesNotThrow(() => C.suggestBuilds({ budget, usage: '1080p' }));
  assert.doesNotThrow(() => C.suggestBuilds({ budget: 1800000, usage: 'unknown-usage' }));
  assert.equal(C.suggestBuilds({ budget: 0, usage: '1080p' }).results.length, 0);
});
