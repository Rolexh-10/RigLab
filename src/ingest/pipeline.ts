import { priceOf } from '../core';
import { getPart } from '../core';
import { matchTitle } from './match';
import type { AcceptedOffer, IngestReport, RawOffer, SkuMap } from './types';

export const MAX_AGE_DAYS = 7;        // older than this = "stale": shown as outdated, never as current
export const SUSPECT_LOW = 0.4, SUSPECT_HIGH = 3; // vs the catalog reference price; outside => human review, not auto-accepted

export function isStale(observedAt: string, now: Date, maxDays = MAX_AGE_DAYS): boolean {
  const t = Date.parse(observedAt);
  return !isFinite(t) || now.getTime() - t > maxDays * 86400000;
}

export interface IngestOpts { now: Date; skuMap?: SkuMap }

/** Turns raw store rows into: accepted (safe to upsert as `verified`), review (a human decides), rejected (bad data). */
export function ingest(raws: RawOffer[], opts: IngestOpts): IngestReport {
  const rep: IngestReport = { accepted: [], review: [], rejected: [], stats: { rows: raws.length } };
  const seen = new Set<string>();
  for (const raw of raws) {
    if (!Number.isInteger(raw.priceIqd) || raw.priceIqd <= 0) { rep.rejected.push({ raw, reason: 'bad-price' }); continue; }
    const ts = Date.parse(raw.observedAt);
    if (!isFinite(ts) || ts > opts.now.getTime() + 3600000) { rep.rejected.push({ raw, reason: 'bad-date' }); continue; }

    let partId: string | undefined, by: AcceptedOffer['matchedBy'] = 'title';
    if (raw.sku && opts.skuMap && opts.skuMap[raw.sku]) { partId = opts.skuMap[raw.sku]; by = 'sku'; if (!getPart(partId)) { rep.review.push({ raw, reason: 'unmatched', detail: 'sku maps to unknown part ' + partId }); continue; } }
    else {
      const m = matchTitle(raw.title);
      if (m.kind === 'none') { rep.review.push({ raw, reason: 'unmatched', detail: 'no catalog part matches this title' }); continue; }
      if (m.kind === 'ambiguous') { rep.review.push({ raw, reason: 'ambiguous', detail: 'several parts match equally', candidates: m.candidates.map((p) => p.id) }); continue; }
      partId = m.part!.id;
    }
    const ref = priceOf(getPart(partId));
    if (ref > 0 && (raw.priceIqd < ref * SUSPECT_LOW || raw.priceIqd > ref * SUSPECT_HIGH)) {
      rep.review.push({ raw, reason: 'suspect-price', detail: `price ${raw.priceIqd} vs catalog reference ${ref}`, candidates: [partId] }); continue;
    }
    const key = partId + '|' + raw.storeId;
    if (seen.has(key)) { rep.rejected.push({ raw, reason: 'duplicate' }); continue; }
    seen.add(key);
    rep.accepted.push({ partId, storeId: raw.storeId, priceIqd: raw.priceIqd, available: raw.available, observedAt: raw.observedAt, url: raw.url, matchedBy: by });
  }
  rep.stats.accepted = rep.accepted.length; rep.stats.review = rep.review.length; rep.stats.rejected = rep.rejected.length;
  return rep;
}

const q = (v: string) => "'" + v.replace(/'/g, "''") + "'";
/** SQL for the service role. Calls the DB function that re-checks the store is active, so a wrong storeId cannot create live prices. */
export function toSql(rep: IngestReport): string {
  const lines = ['begin;'];
  for (const a of rep.accepted) lines.push(`select upsert_verified_offer(${q(a.partId)}, ${q(a.storeId)}, ${a.priceIqd}, ${a.available}, ${q(a.observedAt)}::timestamptz);`);
  for (const r of rep.review) lines.push(`insert into offer_review_queue (store_id, raw, reason, detail) values (${q(r.raw.storeId)}, ${q(JSON.stringify(r.raw))}::jsonb, ${q(r.reason)}, ${q(r.detail)});`);
  lines.push('commit;');
  return lines.join('\n') + '\n';
}
