'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../src/core');

const GOOD = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' };
const NOW = new Date('2026-11-04T10:00:00Z');

test('createSaved cleans unknown parts, trims/limits the name and stamps the date', () => {
  const s = C.createSaved({ ...GOOD, gpu: 'does-not-exist', junk: 'x' }, '  ' + 'a'.repeat(80) + '  ', 0, NOW, 7);
  assert.equal(s.id, 7);
  assert.equal(s.name.length, 60);
  assert.equal(s.savedAt, '2026-11-04T10:00:00.000Z');
  assert.equal(s.parts.gpu, undefined);
  assert.equal(s.parts.cpu, 'r5-7600');
  assert.equal('junk' in s.parts, false);
});

test('createSaved falls back to a numbered default name', () => {
  assert.equal(C.createSaved(GOOD, '   ', 2, NOW).name, 'Build 3');
});

test('findSaved / removeSaved compare ids as strings (DOM attributes are strings)', () => {
  const list = [C.createSaved(GOOD, 'a', 0, NOW, 1), C.createSaved(GOOD, 'b', 1, NOW, 2)];
  assert.equal(C.findSaved(list, '2').name, 'b');
  assert.equal(C.findSaved(list, 'nope'), null);
  assert.deepEqual(C.removeSaved(list, '1').map((b) => b.id), [2]);
  assert.equal(list.length, 2, 'removeSaved must not mutate its input');
  assert.deepEqual(C.removeSaved(null, 1), []);
});

test('normalizeSaved survives corrupt localStorage content', () => {
  assert.deepEqual(C.normalizeSaved('garbage'), []);
  assert.deepEqual(C.normalizeSaved(null), []);
  const out = C.normalizeSaved([null, 5, { id: 1 }, { id: 2, parts: 'x' }, { id: 3, name: 'ok', parts: { cpu: 'r5-7600', gpu: 'gone' } }]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].parts, { cpu: 'r5-7600' });
});

test('savedParts resolves "current", saved ids and unknown ids', () => {
  const list = [C.createSaved(GOOD, 'a', 0, NOW, 1)];
  assert.deepEqual(C.savedParts(list, { cpu: 'r5-7600' }, 'current'), { cpu: 'r5-7600' });
  assert.deepEqual(C.savedParts(list, {}, '1'), list[0].parts);
  assert.deepEqual(C.savedParts(list, {}, '99'), {});
});

test('a saved build survives share-code round trip and still passes the compat check', () => {
  const s = C.createSaved(GOOD, 'x', 0, NOW);
  const back = C.decodeBuild(C.encodeBuild(s.parts));
  assert.deepEqual(back, s.parts);
  assert.equal(C.checkCompat(C.resolve(back)).verdict, 'ok');
});
