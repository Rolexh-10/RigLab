'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LocalBuildRepo, SupabaseBuildRepo, chooseBuildRepo, LOCAL_BUILDS_KEY } = require('../../src/repo');
const C = require('../../src/core');

const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, raw: m }; };
const GOOD = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' };
const NOW = () => new Date('2026-11-05T10:00:00Z');

test('LocalBuildRepo: save / list / remove, drops unknown ids, uses the legacy storage key and format', async () => {
  const s = mem(), r = new LocalBuildRepo(s, NOW);
  const b = await r.save('  أول تجميعة ', { ...GOOD, gpu: 'does-not-exist' });
  assert.equal(b.name, 'أول تجميعة'); assert.equal(b.parts.gpu, undefined); assert.equal(b.savedAt, '2026-11-05T10:00:00.000Z');
  assert.equal((await r.list()).length, 1);
  assert.deepEqual(JSON.parse(s.raw[LOCAL_BUILDS_KEY])[0].parts, b.parts);
  await r.remove(b.id);
  assert.deepEqual(await r.list(), []);
});
test('LocalBuildRepo: corrupt storage yields an empty list instead of throwing; default name is numbered', async () => {
  const s = mem(); s.setItem(LOCAL_BUILDS_KEY, '{not json');
  const r = new LocalBuildRepo(s, NOW);
  assert.deepEqual(await r.list(), []);
  assert.equal((await r.save('', GOOD)).name, 'Build 1');
});

// Fake with the supabase-js v2 call shape: from().select().order() / insert().select().single() / delete().eq()
function fakeClient() {
  const rows = [], calls = []; let n = 0;
  const q = (run) => { const o = { select: () => o, order: () => o, eq: (c, v) => { o.f = [c, v]; return o; }, single: () => o, then: (res, rej) => Promise.resolve(run(o)).then(res, rej) }; return o; };
  return {
    calls, rows,
    from: (t) => ({
      select: (cols) => { calls.push(['select', t, cols]); return q(() => ({ data: rows.slice().reverse(), error: null })); },
      insert: (row) => { calls.push(['insert', t, row]); return q(() => { const r = { id: 'uuid-' + (++n), saved_at: '2026-11-05T10:00:00Z', ...row }; rows.push(r); return { data: r, error: null }; }); },
      delete: () => { calls.push(['delete', t]); return q((o) => { const i = rows.findIndex((r) => r[o.f[0]] === o.f[1]); if (i >= 0) rows.splice(i, 1); return { data: null, error: null }; }); }
    })
  };
}
test('SupabaseBuildRepo (fake client): never sends user_id, cleans parts, maps rows, surfaces errors', async () => {
  const sb = fakeClient(), r = new SupabaseBuildRepo(sb);
  const b = await r.save('x'.repeat(80), { ...GOOD, cpu: 'nope' });
  const ins = sb.calls.find((c) => c[0] === 'insert')[2];
  assert.equal('user_id' in ins, false); assert.equal(ins.name.length, 60); assert.equal(ins.parts.cpu, undefined);
  assert.equal(b.id, 'uuid-1'); assert.equal(b.savedAt, '2026-11-05T10:00:00Z');
  assert.equal((await r.list()).length, 1);
  await r.remove('uuid-1'); assert.deepEqual(await r.list(), []);
  const bad = { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'JWT expired' } }) }) }) };
  await assert.rejects(new SupabaseBuildRepo(bad).list(), /JWT expired/);
});
test('chooseBuildRepo: cloud only when signed in AND a client exists, anonymous stays local', () => {
  const st = mem(), sb = fakeClient();
  assert.equal(chooseBuildRepo({ client: sb, signedIn: true, storage: st }).kind, 'supabase');
  assert.equal(chooseBuildRepo({ client: sb, signedIn: false, storage: st }).kind, 'local');
  assert.equal(chooseBuildRepo({ client: null, signedIn: true, storage: st }).kind, 'local');
});
test('repo layer stays presentation-free: no window/document in src/repo', () => {
  const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '../../src/repo');
  for (const f of fs.readdirSync(dir)) assert.ok(!/\b(window|document|localStorage)\b/.test(fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), f);
});
