'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, parsePriceIqd, CsvFeedConnector, matchTitle, ingest, isStale, toSql } = require('../../src/ingest');
const NOW = new Date('2026-11-05T00:00:00Z');
const row = (o) => ({ storeId: 's', title: 'AMD Ryzen 5 7600', priceIqd: 270000, available: true, observedAt: '2026-11-04T00:00:00Z', ...o });

test('csv: quotes, commas, CRLF, BOM; prices in Arabic digits / separators / currency words', async () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n'), [['a', 'b'], ['x, y', 'he said "hi"']]);
  assert.equal(parsePriceIqd('١٢٥٠٠٠٠'), 1250000); assert.equal(parsePriceIqd('1,250,000 IQD'), 1250000); assert.equal(parsePriceIqd('1 250 000 د.ع'), 1250000);
  assert.ok(isNaN(parsePriceIqd('call us'))); assert.ok(isNaN(parsePriceIqd('12.5')));
  await assert.rejects(new CsvFeedConnector('name,cost\nx,1', 's', 'x').fetch(), /title/);
  const r = await new CsvFeedConnector('Title,Price,Available\nRyzen 5 7600,"270,000",no', 's', '2026-11-04T00:00:00Z').fetch();
  assert.equal(r[0].available, false); assert.equal(r[0].priceIqd, 270000); assert.equal(r[0].observedAt, '2026-11-04T00:00:00Z');
});

test('matcher: exact models match; variants (Ti / SUPER / X) never cross-match; vague titles are not guessed', () => {
  const id = (t) => { const m = matchTitle(t); return m.kind === 'match' ? m.part.id : m.kind; };
  assert.equal(id('AMD Ryzen 5 7600 AM5 Box'), 'r5-7600');
  assert.equal(id('Ryzen 7 7700X'), 'r7-7700x');
  assert.equal(id('Ryzen 5 5600'), 'r5-5600');
  assert.equal(id('NVIDIA GeForce RTX 4060 Ti 8GB'), 'rtx4060ti');
  assert.equal(id('NVIDIA GeForce RTX 4060 8GB'), 'rtx4060');
  assert.equal(id('NVIDIA GeForce RTX 4070 SUPER 12GB'), 'rtx4070s');
  assert.equal(id('NVIDIA GeForce RTX 4070'), 'rtx4070');
  assert.equal(id('DDR5 16GB (2x8) 5600 kit'), 'ddr5-16-5600');
  assert.notEqual(id('DDR5 32GB 5600'), 'ddr5-16-5600');
  assert.equal(id('Mystery gadget 9000'), 'none');
  assert.equal(id('GeForce RTX 4060 Ti'), 'rtx4060ti', 'missing brand word is tolerated');
  assert.equal(id('RTX 4060 Ti'), 'none', 'too few tokens match -> goes to review, not a guess');
});

test('pipeline: bad price/date rejected, suspect price + unknown go to review, duplicates dropped, sku map wins', () => {
  const rep = ingest([
    row({}), row({ priceIqd: 0 }), row({ priceIqd: 12.5 }), row({ observedAt: 'yesterday' }), row({ observedAt: '2027-01-01T00:00:00Z' }),
    row({ title: 'Ryzen 7 7700X', priceIqd: 5000 }), row({ title: 'Ryzen 7 7700X', priceIqd: 4000000 }), row({ title: 'Unknown thing' }),
    row({ title: 'whatever', sku: 'K9' }), row({ title: 'Ryzen 5 7600 again', priceIqd: 260000 })
  ], { now: NOW, skuMap: { K9: 'rtx4060' } });
  assert.deepEqual(rep.accepted.map((a) => a.partId + ':' + a.matchedBy), ['r5-7600:title', 'rtx4060:sku']);
  assert.deepEqual(rep.rejected.map((r) => r.reason), ['bad-price', 'bad-price', 'bad-date', 'bad-date', 'duplicate']);
  assert.deepEqual(rep.review.map((r) => r.reason), ['suspect-price', 'suspect-price', 'unmatched']);
  assert.deepEqual(rep.stats, { rows: 10, accepted: 2, review: 3, rejected: 5 });
});

test('pipeline: sku mapped to an unknown part goes to review; freshness helper', () => {
  const rep = ingest([row({ sku: 'Z', title: 'x' })], { now: NOW, skuMap: { Z: 'no-such-part' } });
  assert.equal(rep.accepted.length, 0); assert.equal(rep.review[0].reason, 'unmatched');
  assert.equal(isStale('2026-10-20T00:00:00Z', NOW), true); assert.equal(isStale('2026-11-01T00:00:00Z', NOW), false); assert.equal(isStale('garbage', NOW), true);
});

test("toSql: escapes quotes, only calls the guarded DB function for accepted rows, queues review rows", () => {
  const rep = ingest([row({ title: "AMD Ryzen 5 7600 'special'" }), row({ title: "O'Brien thing" })], { now: NOW });
  const sql = toSql(rep);
  assert.match(sql, /^begin;/); assert.match(sql, /commit;\n$/);
  assert.match(sql, /select upsert_verified_offer\('r5-7600', 's', 270000, true,/);
  assert.match(sql, /insert into offer_review_queue/); assert.ok(sql.includes("O''Brien"));
  assert.ok(!/insert into offers\b/.test(sql), 'never writes offers directly');
});
