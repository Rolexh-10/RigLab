'use strict';
// Runs the real migration + seed on a real Postgres and checks the security model (RLS, grants, triggers).
// Needs RIGLAB_TEST_PG (see scripts/db-local.sh); skipped otherwise. NOT run against Supabase itself.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const URL_ = process.env.RIGLAB_TEST_PG;
const skip = URL_ ? false : 'RIGLAB_TEST_PG not set (start scripts/db-local.sh)';
const root = path.join(__dirname, '../..');
const DB = 'riglab_test';

function psql(sql, { as, db = DB, file } = {}) {
  const u = new URL(URL_); u.pathname = '/' + db;
  const pre = as ? `set role ${as.role}; ${as.uid ? `set request.jwt.claim.sub = '${as.uid}';` : ''}\n` : '';
  const args = [u.toString(), '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'];
  if (file) args.push('-f', file); else args.push('-c', pre + sql);
  const r = spawnSync('psql', args, { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const must = (r) => { assert.ok(r.ok, r.err); return r.out; };
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
const GOOD = '{"cpu":"r5-7600","mobo":"b650m","ram":"ddr5-16-5600"}';

test.before(() => {
  if (skip) return;
  psql('drop database if exists ' + DB, { db: 'postgres' });
  must(psql('create database ' + DB, { db: 'postgres' }));
  must(psql('', { file: path.join(root, 'db/test/supabase-shim.sql') }));
  must(psql('', { file: path.join(root, 'db/migrations/0001_init.sql') }));
  must(psql('', { file: path.join(root, 'db/migrations/0002_store_integration.sql') }));
  must(psql('', { file: path.join(root, 'db/seed.sql') }));
  must(psql(`insert into auth.users (id,email) values ('${A}','a@test'),('${B}','b@test')`));
});

test('seed matches the TypeScript catalog (no drift) and every offer is sample', { skip }, () => {
  const D = require('../../src/data');
  assert.equal(Number(must(psql('select count(*) from parts'))), D.PARTS.length);
  assert.equal(Number(must(psql('select count(*) from offers'))), D.PARTS.length * D.STORES.length);
  assert.equal(must(psql("select count(*) from offers where source <> 'sample'")), '0');
  assert.equal(must(psql('select count(*) from stores where is_live')), '0');
  const rows = must(psql("select json_agg(row_to_json(t)) from (select id, cat, brand, name, name_ar, generic, specs from parts) t"));
  const byId = Object.fromEntries(JSON.parse(rows).map((r) => [r.id, r]));
  for (const p of D.PARTS) {
    const { id, cat, brand, name, nameAr, generic, price, priceSource, ...specs } = p;
    const r = byId[id];
    assert.equal(r.cat, cat); assert.equal(r.name, name); assert.equal(r.brand ?? null, brand ?? null); assert.equal(r.name_ar ?? null, nameAr ?? null);
    assert.equal(r.generic, !!generic); assert.deepEqual(r.specs, specs, id);
  }
});

test('anon: reads the public catalog, cannot write it, cannot touch builds or profiles', { skip }, () => {
  const anon = { role: 'anon' };
  assert.ok(Number(must(psql('select count(*) from parts', { as: anon }))) > 10);
  assert.match(psql("insert into parts (id,cat,name) values ('x','cpu','x')", { as: anon }).err, /permission denied/);
  assert.match(psql('select * from saved_builds', { as: anon }).err, /permission denied/);
  assert.match(psql('select * from profiles', { as: anon }).err, /permission denied/);
});

test('authenticated: catalog is read-only', { skip }, () => {
  const a = { role: 'authenticated', uid: A };
  assert.match(psql("update parts set name='hacked'", { as: a }).err, /permission denied/);
  assert.match(psql("insert into offers (part_id,store_id,price_iqd) values ('r5-7600','sample-a',1)", { as: a }).err, /permission denied/);
  assert.match(psql('delete from stores', { as: a }).err, /permission denied/);
});

test('saved_builds: owner-only (RLS) for select / update / delete, insert only as yourself', { skip }, () => {
  const a = { role: 'authenticated', uid: A }, b = { role: 'authenticated', uid: B };
  must(psql(`insert into saved_builds (user_id,name,parts) values ('${A}','my build','${GOOD}')`, { as: a }));
  assert.equal(must(psql('select count(*) from saved_builds', { as: a })), '1');
  assert.equal(must(psql('select count(*) from saved_builds', { as: b })), '0', 'B cannot see A');
  assert.equal(must(psql("update saved_builds set name='stolen' returning id", { as: b })), '', 'B cannot update A');
  assert.equal(must(psql('delete from saved_builds returning id', { as: b })), '', 'B cannot delete A');
  assert.match(psql(`insert into saved_builds (user_id,name,parts) values ('${A}','spoof','{}')`, { as: b }).err, /row-level security/);
  assert.equal(must(psql("select name from saved_builds", { as: a })), 'my build');
  assert.match(psql(`update saved_builds set user_id='${B}'`, { as: a }).err, /row-level security/, 'cannot hand a row to someone else');
  assert.equal(must(psql('delete from saved_builds returning 1', { as: a })), '1');
});

test('saved_builds: unknown part ids and wrong categories are rejected (mirrors core cleanBuild)', { skip }, () => {
  const a = { role: 'authenticated', uid: A };
  assert.match(psql(`insert into saved_builds (user_id,name,parts) values ('${A}','x','{"cpu":"nope"}')`, { as: a }).err, /invalid part/);
  assert.match(psql(`insert into saved_builds (user_id,name,parts) values ('${A}','x','{"gpu":"r5-7600"}')`, { as: a }).err, /invalid part/);
  assert.match(psql(`insert into saved_builds (user_id,name,parts) values ('${A}','','{}')`, { as: a }).err, /check/);
});

test('profiles: auto-created on signup, own row only, only display_name/lang editable', { skip }, () => {
  const a = { role: 'authenticated', uid: A }, b = { role: 'authenticated', uid: B };
  assert.equal(must(psql('select count(*) from profiles')), '2');
  assert.equal(must(psql('select count(*) from profiles', { as: a })), '1');
  must(psql("update profiles set display_name='Ali', lang='en'", { as: a }));
  assert.equal(must(psql('select display_name from profiles', { as: b })), '', 'B sees only B (no name set)');
  assert.match(psql(`update profiles set id='${B}'`, { as: a }).err, /permission denied/);
  assert.match(psql("update profiles set lang='fr'", { as: a }).err, /check/);
});

const LIVE = (id) => `insert into stores (id,name_ar,name_en,is_live,url) values ('${id}','x','${id}',true,'https://example.com/${id}');`;
const ONB = (id) => `insert into store_onboarding (store_id,status,permission_note,permitted_at,feed_kind) values ('${id}','active','WhatsApp OK (test fixture)',now(),'csv');`;

test('stores: cannot go live without active onboarding; onboarding needs written proof', { skip }, () => {
  assert.match(psql(LIVE('real-0')).err, /without active onboarding/);
  must(psql(LIVE('real-1') + ONB('real-1')));
  assert.match(psql("insert into stores (id,name_ar,name_en,is_live) values ('real-2','x','x',true)").err, /live_needs_url/);
  must(psql("insert into stores (id,name_ar,name_en) values ('pending-1','x','x')"));
  assert.match(psql("insert into store_onboarding (store_id,status) values ('pending-1','active')").err, /permitted_needs_proof/);
});

test('offers: sample prices cannot sit on a live store; verified must', { skip }, () => {
  assert.match(psql("insert into offers (part_id,store_id,price_iqd,source) values ('r5-7600','real-1',100000,'sample')").err, /does not match/);
  assert.match(psql("insert into offers (part_id,store_id,price_iqd,source) values ('r5-7600','sample-a',1,'verified') on conflict (part_id,store_id) do update set source='verified', price_iqd=1").err, /does not match/);
  assert.match(psql("insert into offers (part_id,store_id,price_iqd) values ('r5-7600','real-1',0) on conflict do nothing").err, /check|price_iqd/);
});

test('upsert_verified_offer: only the service role, only active live stores, newer observation wins, stale flag', { skip }, () => {
  const call = (st, price, ts) => `select upsert_verified_offer('r5-7600','${st}',${price},true,'${ts}'::timestamptz)`;
  assert.match(psql(call('real-1', 250000, '2026-11-01T00:00:00Z'), { as: { role: 'authenticated', uid: A } }).err, /permission denied/);
  assert.match(psql(call('real-1', 250000, '2026-11-01T00:00:00Z'), { as: { role: 'anon' } }).err, /permission denied/);
  assert.match(psql(call('sample-a', 250000, '2026-11-01T00:00:00Z')).err, /not live\/active/);
  assert.match(psql(call('pending-1', 250000, '2026-11-01T00:00:00Z')).err, /not live\/active/);
  must(psql(call('real-1', 250000, '2026-11-01T00:00:00Z')));
  must(psql(call('real-1', 999999, '2026-10-01T00:00:00Z')));   // older: ignored
  assert.equal(must(psql("select price_iqd||'/'||source from offers where store_id='real-1' and part_id='r5-7600'")), '250000/verified');
  must(psql(call('real-1', 240000, '2026-11-02T00:00:00Z')));   // newer: wins
  assert.equal(must(psql("select price_iqd from offers where store_id='real-1' and part_id='r5-7600'")), '240000');
  must(psql("update offers set observed_at = now() - interval '10 days' where store_id='real-1'"));
  assert.equal(must(psql("select stale from offers_public where store_id='real-1'", { as: { role: 'anon' } })), 't');
  must(psql("update offers set observed_at = now() where store_id='real-1'"));
  assert.equal(must(psql("select stale from offers_public where store_id='real-1'", { as: { role: 'anon' } })), 'f');
});

test('review queue and onboarding are invisible to clients', { skip }, () => {
  for (const t of ['offer_review_queue', 'store_onboarding']) {
    assert.match(psql('select * from ' + t, { as: { role: 'authenticated', uid: A } }).err, /permission denied/);
    assert.match(psql('select * from ' + t, { as: { role: 'anon' } }).err, /permission denied/);
  }
});

test('end to end: CSV feed -> ingest pipeline -> SQL -> database (fixture data, not real prices)', { skip }, async () => {
  const { CsvFeedConnector, ingest, toSql } = require('../../src/ingest');
  must(psql(LIVE('e2e-store') + ONB('e2e-store')));
  const csv = 'title,price,sku,available,observed_at\n' +
    '"AMD Ryzen 5 7600 Box",270000,A1,yes,2026-11-03T09:00:00Z\n' +
    'NVIDIA GeForce RTX 4060 Ti 8GB,"520,000",A2,نعم,2026-11-03T09:00:00Z\n' +
    'Ryzen 7 7700X,5000,A3,yes,2026-11-03T09:00:00Z\n' +      // suspect price -> review
    'Mystery gadget 9000,100000,A4,yes,2026-11-03T09:00:00Z\n'; // unknown -> review
  const rep = ingest(await new CsvFeedConnector(csv, 'e2e-store', '2026-11-03T09:00:00Z').fetch(), { now: new Date('2026-11-04T00:00:00Z') });
  assert.deepEqual(rep.accepted.map((a) => a.partId).sort(), ['r5-7600', 'rtx4060ti']);
  assert.equal(rep.review.length, 2);
  must(psql('', { file: writeTmp(toSql(rep)) }));
  assert.equal(must(psql("select count(*) from offers where store_id='e2e-store' and source='verified'")), '2');
  assert.equal(must(psql("select count(*) from offer_review_queue where store_id='e2e-store' and status='open'")), '2');
});
function writeTmp(sql) { const f = path.join(require('os').tmpdir(), 'riglab-e2e-' + process.pid + '.sql'); fs.writeFileSync(f, sql); return f; }
