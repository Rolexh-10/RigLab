import { PARTS } from '../data';
import type { Part } from '../core';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const STOP = new Set(['the', 'with', 'and', 'for', 'gaming', 'desktop', 'processor', 'graphics', 'card', 'memory', 'ram', 'cpu', 'gpu', 'series', 'new', 'box', 'tray', 'warranty', 'معالج', 'كرت', 'كارت', 'شاشة', 'رام', 'ذاكرة']);

export function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/(\d)\s*(gb|tb|w|mm|mhz|mt\/s)\b/g, '$1$2')     // "16 GB" -> "16gb"
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ').split(' ').filter((t) => t && !STOP.has(t));
}
const partTokens = (p: Part): string[] => tokens([p.brand || '', p.name].join(' '));
const hasDigit = (t: string) => /\d/.test(t);
// Variant words that change the product. A title and a part must agree on them exactly ("4060" vs "4060 Ti", "4070" vs "4070 Super").
const VARIANT = new Set(['ti', 'super', 'xt', 'xtx', 'gre', 'x3d']);
const variants = (ts: Iterable<string>): string => Array.from(ts).filter((t) => VARIANT.has(t)).sort().join(',');

export interface Match { kind: 'match' | 'ambiguous' | 'none'; part?: Part; candidates: Part[] }

/** Conservative fuzzy match. Every model-like token (contains a digit) of the part must appear verbatim in the title, so
 *  "5600" never matches "5600X" and "16gb" never matches "32gb". Two equally good parts => ambiguous, never a guess. */
export function matchTitle(title: string, parts: Part[] = PARTS): Match {
  const tt = new Set(tokens(title));
  const scored: { p: Part; score: number }[] = [];
  for (const p of parts) {
    const pt = partTokens(p);
    if (!pt.length) continue;
    if (variants(pt) !== variants(tt)) continue;
    const nums = pt.filter(hasDigit);
    if (!nums.length || !nums.every((t) => tt.has(t))) continue;
    const hit = pt.filter((t) => tt.has(t)).length;
    if (hit / pt.length < 0.75) continue;
    scored.push({ p, score: hit / pt.length + pt.length * 0.001 });
  }
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) return { kind: 'none', candidates: [] };
  const top = scored[0];
  const rivals = scored.filter((s) => s.score >= top.score - 1e-9);
  if (rivals.length > 1) return { kind: 'ambiguous', candidates: rivals.map((r) => r.p) };
  return { kind: 'match', part: top.p, candidates: [top.p] };
}
