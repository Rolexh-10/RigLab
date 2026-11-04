'use strict';
/* RigLab core/offers: Sample store offers (Price Radar data model). Deterministic, labelled sample, sponsorship never changes order. Pure functions, no DOM. */
var D = require('../data');
var CAT_KEYS = require('./shared').CAT_KEYS;
var getPart = require('./shared').getPart;
var priceOf = require('./shared').priceOf;

// ---------- sample offers (Price Radar data model) ----------
function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h; }
function offersFor(partId, market) {
  var p = getPart(partId); if (!p) return [];
  var base = priceOf(p, market);
  var list = D.STORES.map(function (st) {
    var h = hash(p.id + '|' + st.id);
    var jitter = ((h % 5) - 2) * 0.01;
    return {
      partId: p.id, storeId: st.id, storeNameAr: st.nameAr, storeNameEn: st.nameEn,
      price: Math.round(base * (st.mult + jitter) / 1000) * 1000,
      currency: 'IQD', available: (hash(st.id + '|' + p.id) % 7) !== 0,
      warranty: st.warranty, deliveryIQD: st.deliveryIQD, sponsored: st.sponsored,
      updated: D.SAMPLE_DATE, source: 'sample'
    };
  });
  // sponsorship never affects order: sort strictly by price
  list.sort(function (a, b) { return a.price - b.price; });
  return list;
}
function costByStore(parts) {
  var ids = CAT_KEYS.filter(function (k) { return parts[k]; }).map(function (k) { return parts[k].id; });
  var stores = D.STORES.map(function (st) {
    var total = 0, missing = [];
    ids.forEach(function (id) {
      var o = offersFor(id).filter(function (x) { return x.storeId === st.id; })[0];
      if (o && o.available) total += o.price; else missing.push(id);
    });
    return { store: st, total: total, missing: missing, complete: missing.length === 0 && ids.length > 0 };
  });
  var mix = 0, unavailable = [];
  ids.forEach(function (id) {
    var av = offersFor(id).filter(function (x) { return x.available; });
    if (av.length) mix += av[0].price; else unavailable.push(id);
  });
  return { stores: stores, mixTotal: mix, mixUnavailable: unavailable, partCount: ids.length };
}

module.exports = { costByStore, hash, offersFor };
