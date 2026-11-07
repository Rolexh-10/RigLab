'use strict';
// 3D model identity guardrails: a selected product may only be drawn with a model the manifest explicitly assigns to it,
// never across vendors, and "exact" must really be the same product. Unmapped products render the neutral generic placeholder.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../src/core/index.ts');
const ID = require('../../src/render3d/identity.js');
const man = require('../../models/manifest.json');
const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
const catKey = (c) => (c === 'storage' ? 'ssd' : c);
const pick = (cat, id) => ID.resolve(man, catKey(cat), C.getPart(id));

test('manifest schema: every model has identity + products + valid levels', () => {
  for (const [k, m] of Object.entries(man)) {
    assert.ok(m.identity && m.identity.manufacturer && m.identity.product && m.identity.vendor, k + ' identity');
    assert.ok(m.products && typeof m.products === 'object', k + ' products');
    assert.ok(m.license && m.author && m.source, k + ' license/author/source');
    for (const lvl of Object.values(m.products)) assert.ok(ID.LEVELS.includes(lvl), k + ' level ' + lvl);
    for (const f of ['ids', 'type', 'def']) assert.ok(!(f in m), k + ' still has legacy field ' + f);
  }
});

test('every catalog product vs its assigned model: vendor, family and "exact" honesty', () => {
  let mapped = 0, generic = 0;
  for (const cat of ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'cooler']) for (const part of C.partsOf(cat)) {
    const r = ID.resolve(man, catKey(cat), part);
    if (!r) { generic++; continue; } mapped++;
    const idn = r.identity, name = part.id;
    if (['gpu', 'cpu', 'mobo'].includes(cat)) assert.equal(idn.vendor, String(part.brand).toLowerCase(), name + ' vendor mismatch with ' + r.id);
    if (cat === 'gpu') assert.equal(idn.chip, part.id, name + ' is drawn with a different GPU chip (' + r.id + ')');
    if (cat === 'cpu') assert.equal(idn.socket, part.socket, name + ' socket vs model ' + r.id);
    if (cat === 'mobo') { assert.equal(idn.chipset, part.chipset, name + ' chipset vs model ' + r.id); if (idn.form !== part.form) assert.ok(man[r.id].note, name + ': form-factor mismatch must be disclosed in note'); }
    if (cat === 'ram') assert.equal(idn.ddr, part.type, name + ' DDR generation vs model ' + r.id);
    if (r.level === 'exact') {
      const want = norm(part.name.replace(/^(AMD|Intel|NVIDIA)\s+/i, '')), have = norm(idn.manufacturer + idn.product);
      assert.ok(have.includes(want) || norm(part.name).includes(norm(idn.product)), name + ' marked exact but model is ' + idn.manufacturer + ' ' + idn.product);
    }
  }
  assert.ok(mapped > 0 && generic > 0);
});

test('named regressions: no Radeon->GeForce, Intel->Ryzen, B650->Z790 substitution', () => {
  for (const id of ['rx7600', 'rx7700xt', 'rx7800xt']) assert.equal(pick('gpu', id), null, id + ' must be generic (no Radeon model exists)');
  for (const id of ['rtx4070', 'rtx4070s', 'rtx5060ti', 'rtx5070ti']) assert.equal(pick('gpu', id), null, id + ' must not borrow another SKU');
  assert.equal(pick('gpu', 'rtx4060').id, 'gpu-giga4060');
  assert.equal(pick('gpu', 'rtx4060ti').id, 'gpu-msi4060ti');
  assert.equal(pick('gpu', 'rtx5070').id, 'gpu-trio');
  assert.equal(pick('gpu', 'rtx4090').id, 'gpu-aero4090');
  for (const id of ['i5-12400f', 'i5-13400f', 'i7-14700k', 'i7-10700k', 'i7-6700k']) assert.equal(pick('cpu', id), null, id + ' must be generic (no Intel model)');
  for (const id of ['r5-5600', 'r7-5700x', 'r5-3600']) assert.equal(pick('cpu', id), null, id + ' (AM4) must be generic');
  assert.equal(pick('cpu', 'r7-7800x3d').level, 'exact');
  assert.equal(pick('cpu', 'r5-7600').identity.vendor, 'amd');
  for (const id of ['b650m', 'b650-atx', 'a520m', 'b660m-ddr4', 'b760m-ddr4', 'b760m-ddr5']) assert.equal(pick('mobo', id), null, id + ' must be generic');
  assert.equal(pick('mobo', 'z790-ddr5').id, 'mobo-z790');
  assert.equal(pick('ram', 'ddr4-16-3200').identity.ddr, 'DDR4');
  assert.equal(pick('ram', 'ddr5-32-6000').identity.ddr, 'DDR5');
  assert.equal(pick('case', 'case-meshify-c').level, 'exact');
  assert.equal(pick('cooler', 'cool-aio-240'), null);
});

test('resolver refuses a cross-vendor entry even if the manifest is wrong', () => {
  const bad = { x: { cat: 'gpu', identity: { vendor: 'nvidia' }, products: { rx7600: 'representative' } }, y: { cat: 'cpu', identity: { vendor: 'amd' }, products: { 'i5-12400f': 'exact' } } };
  assert.equal(ID.resolve(bad, 'gpu', C.getPart('rx7600')), null);
  assert.equal(ID.resolve(bad, 'cpu', C.getPart('i5-12400f')), null);
});
