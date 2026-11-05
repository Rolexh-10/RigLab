/* Store feed importer (dry-run by default; never touches a database itself).
 *   node --import tsx scripts/ingest.ts --store <storeId> --csv feed.csv [--sku skus.json] [--sql out.sql]
 * Prints a report; with --sql writes the statements to apply with the service role (psql -f out.sql). */
import { readFileSync, writeFileSync } from 'node:fs';
import { CsvFeedConnector, ingest, toSql } from '../src/ingest';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const store = arg('store'), csv = arg('csv');
if (!store || !csv) { console.error('usage: ingest.ts --store <id> --csv <file> [--sku map.json] [--sql out.sql]'); process.exit(2); }

async function main(): Promise<void> {
  const now = new Date();
  const raws = await new CsvFeedConnector(readFileSync(csv, 'utf8'), store, now.toISOString()).fetch();
  const skuFile = arg('sku');
  const rep = ingest(raws, { now, skuMap: skuFile ? JSON.parse(readFileSync(skuFile, 'utf8')) : undefined });
  console.log(JSON.stringify(rep.stats));
  for (const r of rep.review) console.log(`REVIEW [${r.reason}] ${r.raw.title} @ ${r.raw.priceIqd} - ${r.detail}`);
  for (const r of rep.rejected) console.log(`REJECT [${r.reason}] ${r.raw.title} @ ${r.raw.priceIqd}`);
  const out = arg('sql');
  if (out) { writeFileSync(out, toSql(rep)); console.log('wrote ' + out + ' (apply with the service role; upsert_verified_offer refuses non-active stores)'); }
  else console.log('dry run: no SQL written (use --sql)');
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
