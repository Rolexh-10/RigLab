/* RigLab core/shared: Shared constants and catalog lookups (categories, verdict labels, part/price accessors). Pure functions, no DOM. */
import * as D from '../data';
import type { Bilingual, Cat, CatInfo, Part, Verdict } from './types';

var CATS: CatInfo[] = [
  { key: 'cpu', ar: 'المعالج (CPU)', en: 'CPU', required: true },
  { key: 'mobo', ar: 'اللوحة الأم', en: 'Motherboard', required: true },
  { key: 'ram', ar: 'الذاكرة (RAM)', en: 'RAM', required: true },
  { key: 'gpu', ar: 'كرت الشاشة (GPU)', en: 'GPU', required: true },
  { key: 'storage', ar: 'التخزين', en: 'Storage', required: true },
  { key: 'psu', ar: 'مزود الطاقة (PSU)', en: 'PSU', required: true },
  { key: 'case', ar: 'الكيس', en: 'Case', required: true },
  { key: 'cooler', ar: 'التبريد', en: 'Cooler', required: false }
];
var CAT_KEYS: Cat[] = CATS.map(function (c) { return c.key; });
function catInfo(k: string): CatInfo | null { for (var i = 0; i < CATS.length; i++) if (CATS[i].key === k) return CATS[i]; return null; }

var VERDICT: Record<Verdict, Bilingual> = {
  ok: { ar: 'متوافق مبدئياً', en: 'Looks compatible' },
  warn: { ar: 'تحذيرات', en: 'Warnings' },
  error: { ar: 'غير متوافق', en: 'Incompatible' },
  unknown: { ar: 'غير مؤكد', en: 'Unconfirmed' },
  empty: { ar: 'لم تبدأ بعد', en: 'Not started' }
};

var BY_ID: Record<string, Part> = {};
D.PARTS.forEach(function (p) { BY_ID[p.id] = p; });
function getPart(id: string | null | undefined): Part | null { return (id != null && BY_ID[id]) || null; }
function partsOf<K extends Cat>(cat: K): Extract<Part, { cat: K }>[] { return D.PARTS.filter(function (p) { return p.cat === cat; }) as Extract<Part, { cat: K }>[]; }
function priceOf(p: Part | null | undefined, market?: string): number { return p && p.price ? (p.price[market || 'IQ'] || 0) : 0; }

function m(ar: string, en: string): Bilingual { return { ar: ar, en: en }; }
function nameList(keys: Cat[]): Bilingual { return { ar: keys.map(function (k) { return catInfo(k)!.ar; }).join('، '), en: keys.map(function (k) { return catInfo(k)!.en; }).join(', ') }; }
function isNil(v: unknown): v is null | undefined { return v === null || v === undefined; }
function roundUp(n: number, step: number): number { return Math.ceil(n / step) * step; }

export { BY_ID, CATS, CAT_KEYS, VERDICT, catInfo, getPart, isNil, m, nameList, partsOf, priceOf, roundUp };
