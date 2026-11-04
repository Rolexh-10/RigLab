'use strict';
/* RigLab core/shared: Shared constants and catalog lookups (categories, verdict labels, part/price accessors). Pure functions, no DOM. */
var D = require('../data');

var CATS = [
  { key: 'cpu', ar: 'المعالج (CPU)', en: 'CPU', required: true },
  { key: 'mobo', ar: 'اللوحة الأم', en: 'Motherboard', required: true },
  { key: 'ram', ar: 'الذاكرة (RAM)', en: 'RAM', required: true },
  { key: 'gpu', ar: 'كرت الشاشة (GPU)', en: 'GPU', required: true },
  { key: 'storage', ar: 'التخزين', en: 'Storage', required: true },
  { key: 'psu', ar: 'مزود الطاقة (PSU)', en: 'PSU', required: true },
  { key: 'case', ar: 'الكيس', en: 'Case', required: true },
  { key: 'cooler', ar: 'التبريد', en: 'Cooler', required: false }
];
var CAT_KEYS = CATS.map(function (c) { return c.key; });
function catInfo(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i].key === k) return CATS[i]; return null; }

var VERDICT = {
  ok: { ar: 'متوافق مبدئياً', en: 'Looks compatible' },
  warn: { ar: 'تحذيرات', en: 'Warnings' },
  error: { ar: 'غير متوافق', en: 'Incompatible' },
  unknown: { ar: 'غير مؤكد', en: 'Unconfirmed' },
  empty: { ar: 'لم تبدأ بعد', en: 'Not started' }
};

var BY_ID = {};
D.PARTS.forEach(function (p) { BY_ID[p.id] = p; });
function getPart(id) { return BY_ID[id] || null; }
function partsOf(cat) { return D.PARTS.filter(function (p) { return p.cat === cat; }); }
function priceOf(p, market) { return p && p.price ? (p.price[market || 'IQ'] || 0) : 0; }

function m(ar, en) { return { ar: ar, en: en }; }
function nameList(keys) { return { ar: keys.map(function (k) { return catInfo(k).ar; }).join('، '), en: keys.map(function (k) { return catInfo(k).en; }).join(', ') }; }
function isNil(v) { return v === null || v === undefined; }
function roundUp(n, step) { return Math.ceil(n / step) * step; }

module.exports = { BY_ID, CATS, CAT_KEYS, VERDICT, catInfo, getPart, isNil, m, nameList, partsOf, priceOf, roundUp };
