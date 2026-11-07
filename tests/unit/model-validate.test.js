'use strict';
// Model onboarding validator (scripts/validate-models.ts) + identity compatibility rules.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validate } = require('../../scripts/validate-models.ts');
const ID = require('../../src/render3d/identity.js');
const C = require('../../src/core/index.ts');
const root = path.join(__dirname, '../..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'models/manifest.json'), 'utf8'));
const part = (cat, id) => C.partsOf(cat).find((p) => p.id === id);

// Builds a throw-away models/ dir: manifest + copies of real GLBs, with an optional mutation per case.
function sandbox(mut) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-models-')); fs.mkdirSync(path.join(dir, 'glb'));
  const m = JSON.parse(JSON.stringify({ 'cpu-3600': man['cpu-3600'], 'gpu-giga4060': man['gpu-giga4060'], 'mobo-b550f': man['mobo-b550f'] }));
  for (const k of Object.keys(m)) fs.copyFileSync(path.join(root, 'models', m[k].file), path.join(dir, m[k].file));
  if (mut) mut(m, dir);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m));
  return { opts: { manifestPath: path.join(dir, 'manifest.json'), glbRoot: dir }, dir };
}
const errors = (r) => r.findings.filter((f) => f.level === 'ERROR').map((f) => f.model + ': ' + f.msg);
const has = (r, re) => errors(r).some((e) => re.test(e));

test('the real manifest has no validation errors and every model is valid GLB with provenance', () => {
  const r = validate();
  assert.deepEqual(errors(r), []);
  assert.equal(Object.keys(r.infos).length, Object.keys(man).length);
  for (const [k, m] of Object.entries(man)) { assert.match(m.license, /^CC-BY-4\.0/, k); assert.ok(m.author && m.title && /^https:/.test(m.source), k + ' provenance'); }
});

test('sandbox baseline is clean', () => { const s = sandbox(); assert.deepEqual(errors(validate(s.opts)), []); });

test('validator rejects: missing licence / author / source', () => {
  assert.ok(has(validate(sandbox((m) => { delete m['cpu-3600'].license; }).opts), /license/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].author = ''; }).opts), /author/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].source = 'http://x'; }).opts), /source URL/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].license = 'All rights reserved'; }).opts), /license/));
});

test('validator rejects: unsafe path, missing file, duplicate asset, corrupt and truncated GLB', () => {
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].file = '../secret.glb'; }).opts), /file must be glb\//));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].file = 'glb/nope.glb'; }).opts), /missing on disk/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].file = m['gpu-giga4060'].file; }).opts), /already used/));
  assert.ok(has(validate(sandbox((m, d) => { fs.writeFileSync(path.join(d, m['cpu-3600'].file), Buffer.alloc(400, 7)); }).opts), /invalid GLB/));
  assert.ok(has(validate(sandbox((m, d) => { const f = path.join(d, m['cpu-3600'].file); fs.writeFileSync(f, fs.readFileSync(f).subarray(0, 200)); }).opts), /invalid GLB/));
});

test('validator rejects: cross-vendor, wrong form factor / socket, unknown product, bad level, false exact', () => {
  assert.ok(has(validate(sandbox((m) => { m['gpu-giga4060'].products.rx7600 = 'representative'; }).opts), /cross-vendor/));
  assert.ok(has(validate(sandbox((m) => { m['mobo-b550f'].products.b550m = 'representative'; }).opts), /physical mismatch/), 'ATX board for mATX product');
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].products['r7-7700x'] = 'representative'; }).opts), /physical mismatch/), 'AM4 model for AM5 CPU');
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].products['no-such-cpu'] = 'exact'; }).opts), /not a catalog cpu id/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].products['r5-5600'] = 'close'; }).opts), /level must be/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].products['r5-5600'] = 'exact'; }).opts), /does not match the model product/), 'exact must name the same product');
});

test('validator rejects: bad identity schema and transform metadata', () => {
  assert.ok(has(validate(sandbox((m) => { delete m['cpu-3600'].identity.socket; }).opts), /identity\.socket/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].identity.vendor = 'acme'; }).opts), /identity\.vendor/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].flip = [2, 1, 1]; }).opts), /flip/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].basis = [[1, 0, 0], [1, 0, 0], [0, 0, 1]]; }).opts), /orthogonal/));
  assert.ok(has(validate(sandbox((m) => { m['cpu-3600'].scale = 40; }).opts), /scale/));
});

test('declared real size (realMm) is compared with the GLB proportions', () => {
  const ok = validate(sandbox((m) => { m['cpu-3600'].realMm = [40, 40, 2.4]; }).opts);
  assert.ok(!ok.findings.some((f) => f.model === 'cpu-3600' && /realMm proportion/.test(f.msg)));
  const bad = validate(sandbox((m) => { m['cpu-3600'].realMm = [40, 30, 30]; }).opts);
  assert.ok(bad.findings.some((f) => f.model === 'cpu-3600' && /realMm proportion/.test(f.msg)));
});

test('identity: form factor, socket and RAM generation must agree (no ATX board for an mATX product)', () => {
  const reg = man;
  assert.equal(ID.resolve(reg, 'mobo', part('mobo', 'b550m')), null, 'B550M must not borrow the ATX B550-F model');
  assert.equal(ID.resolve(reg, 'mobo', part('mobo', 'b550-atx')).id, 'mobo-b550f');
  assert.equal(ID.resolve(reg, 'mobo', part('mobo', 'h510m')).id, 'mobo-h510m');
  assert.equal(ID.resolve(reg, 'cpu', part('cpu', 'r9-7950x3d')), null, 'broken 7950X3D asset stays unmapped');
  assert.equal(ID.resolve(reg, 'cpu', part('cpu', 'r5-3600')).level, 'exact');
  assert.equal(ID.resolve(reg, 'cpu', part('cpu', 'r5-5600')).id, 'cpu-3600'); assert.equal(ID.resolve(reg, 'cpu', part('cpu', 'r5-5600')).level, 'representative');
  assert.equal(ID.resolve(reg, 'cpu', part('cpu', 'r5-7600')).id, 'cpu-7800x3d', 'AM5 chip keeps the AM5 model, never the AM4 one');
  for (const id of ['i5-12400f', 'i7-14700k', 'i7-10700k']) assert.equal(ID.resolve(reg, 'cpu', part('cpu', id)), null, id + ' has no Intel model');
  const fake = { x: { cat: 'ram', identity: { vendor: 'neutral', ddr: 'DDR5' }, products: { 'ddr4-16-3200': 'representative' } } };
  assert.equal(ID.resolve(fake, 'ram', part('ram', 'ddr4-16-3200')), null, 'DDR5 model cannot stand for DDR4');
});

test('cross-brand guard over the whole catalog: no product resolves to a model of another vendor', () => {
  for (const cat of ['gpu', 'cpu', 'mobo']) for (const p of C.partsOf(cat)) {
    const r = ID.resolve(man, cat, p); if (!r) continue;
    assert.ok(!r.identity.vendor || r.identity.vendor === 'neutral' || r.identity.vendor === String(p.brand).toLowerCase(), p.id + ' -> ' + r.id);
  }
  for (const p of C.partsOf('gpu')) { const r = ID.resolve(man, 'gpu', p); if (r) assert.equal(r.identity.chip, p.id, 'GPU model must be the same chip: ' + p.id); }
});
