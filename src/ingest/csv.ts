import type { Connector, RawOffer } from './types';

/** RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF, commas inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], f = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** "1,250,000" / "١٢٥٠٠٠٠" / "1 250 000 IQD" -> 1250000; NaN when not a clean number. */
export function parsePriceIqd(v: string): number {
  const t = v.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/(iqd|د\.?ع)/gi, '').replace(/[,\s٬]/g, '');
  return /^\d+$/.test(t) ? Number(t) : NaN;
}
const YES = /^(1|true|yes|y|متوفر|نعم|in stock|available)$/i;

/** Feed columns (header names case-insensitive): title, price, [sku], [available], [url], [observed_at]. */
export class CsvFeedConnector implements Connector {
  readonly kind = 'csv';
  constructor(private text: string, private storeId: string, private defaultObservedAt: string) {}
  async fetch(): Promise<RawOffer[]> {
    const [head, ...rows] = parseCsv(this.text);
    if (!head) return [];
    const col = (n: string) => head.findIndex((h) => h.trim().toLowerCase() === n);
    const ti = col('title'), pi = col('price');
    if (ti < 0 || pi < 0) throw new Error('CSV needs "title" and "price" columns');
    const si = col('sku'), ai = col('available'), ui = col('url'), oi = col('observed_at');
    return rows.map((r) => ({
      storeId: this.storeId, title: (r[ti] || '').trim(), priceIqd: parsePriceIqd(r[pi] || ''),
      sku: si >= 0 && r[si] ? r[si].trim() : undefined,
      available: ai >= 0 ? YES.test((r[ai] || '').trim()) : true,
      url: ui >= 0 && r[ui] ? r[ui].trim() : undefined,
      observedAt: oi >= 0 && r[oi] ? r[oi].trim() : this.defaultObservedAt
    }));
  }
}
