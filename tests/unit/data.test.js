'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../src/data');
const C = require('../../src/core');

const num = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const SCHEMA = {
  cpu: { str: ['brand', 'name', 'socket', 'gen'], num: ['cores', 'threads', 'tdp', 'peakW'] },
  mobo: { str: ['brand', 'name', 'socket', 'chipset', 'ramType', 'form'], num: [] },
  ram: { str: ['type'], num: ['gb'] },
  gpu: { str: ['brand', 'name'], num: ['vram', 'tdp', 'lengthMm'] },
  storage: { str: ['type'], num: ['gb'] },
  psu: { str: [], num: ['watts'] },
  case: { str: ['name'], num: ['maxGpuMm'] },
  cooler: { str: ['name'], num: ['tdpRating'] }
};

test('catalog rows satisfy the per-category schema', () => {
  for (const p of D.PARTS) {
    const s = SCHEMA[p.cat];
    assert.ok(s, 'known category ' + p.cat);
    assert.ok(typeof p.id === 'string' && /^[a-z0-9.-]+$/.test(p.id), 'id format ' + p.id);
    for (const k of s.str) assert.ok(typeof p[k] === 'string' && p[k], p.id + ' needs string ' + k);
    for (const k of s.num) assert.ok(num(p[k]), p.id + ' needs positive number ' + k);
  }
});

test('every category has at least one part and every required category is present', () => {
  for (const c of C.CAT_KEYS) assert.ok(C.partsOf(c).length >= 1, 'no parts for ' + c);
});

test('prices are sample IQD values and never marked verified', () => {
  for (const p of D.PARTS) {
    assert.equal(p.priceSource, 'sample');
    assert.ok(Number.isInteger(p.price.IQ) && p.price.IQ > 0);
  }
  assert.ok(D.NOTICE.ar && D.NOTICE.en);
});

test('stores are sample stores with sane multipliers; no store is live', () => {
  assert.ok(D.STORES.length >= 1);
  for (const s of D.STORES) {
    assert.ok(s.mult > 0.5 && s.mult < 1.5, s.id);
    assert.ok(!s.live, s.id + ' must not be live in sample data');
  }
});

test('cross references: boards use a CPU socket + RAM type that exist; coolers support real sockets', () => {
  const sockets = new Set(C.partsOf('cpu').map((c) => c.socket));
  const ramTypes = new Set(C.partsOf('ram').map((r) => r.type));
  for (const m of C.partsOf('mobo')) {
    assert.ok(sockets.has(m.socket), m.id + ' socket ' + m.socket + ' has no CPU');
    assert.ok(ramTypes.has(m.ramType), m.id + ' ram ' + m.ramType + ' has no kit');
  }
  for (const c of C.partsOf('cpu')) for (const t of c.memTypes || []) assert.ok(ramTypes.has(t), c.id + ' memType ' + t);
});

test('every part that the 3D manifest references exists in the catalog', () => {
  const man = require('../../models/manifest.json');
  for (const [k, m] of Object.entries(man)) for (const id of m.ids || []) {
    const p = C.getPart(id);
    assert.ok(p, 'manifest ' + k + ' references unknown part ' + id);
    assert.equal(p.cat === 'storage' ? 'ssd' : p.cat, m.cat, 'manifest ' + k + ' category for ' + id);
  }
});
