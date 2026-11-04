'use strict';
/* RigLab core/budget: Rule-based budget builder (enumerates candidate builds and re-checks each with the compat engine; no AI claims). Pure functions, no DOM. */
var cleanBuild = require('./build').cleanBuild;
var resolve = require('./build').resolve;
var checkCompat = require('./compat').checkCompat;
var CAT_KEYS = require('./shared').CAT_KEYS;
var partsOf = require('./shared').partsOf;
var priceOf = require('./shared').priceOf;

// ---------- smart budget (rules, no AI claims) ----------
var USAGE = {
  '1080p': { ar: 'ألعاب 1080p', en: '1080p gaming', w: { gpu: 0.5, cpu: 0.25, ram: 0.1, sto: 0.1 }, min: {} },
  '1440p': { ar: 'ألعاب 1440p', en: '1440p gaming', w: { gpu: 0.6, cpu: 0.2, ram: 0.1, sto: 0.1 }, min: { gpuTier: 6 } },
  'competitive': { ar: 'ألعاب تنافسية', en: 'Competitive gaming', w: { gpu: 0.35, cpu: 0.4, ram: 0.1, sto: 0.1 }, min: { cpuTier: 6 } },
  'editing': { ar: 'مونتاج وعمل', en: 'Video editing / work', w: { gpu: 0.15, cpu: 0.35, ram: 0.25, sto: 0.2 }, min: { ramGb: 32, stoGb: 1000 } }
};

function enumerate(opts) {
  var P = {
    cpu: partsOf('cpu'), mobo: partsOf('mobo'), ram: partsOf('ram'), gpu: partsOf('gpu'),
    storage: partsOf('storage'), psu: partsOf('psu'), case: partsOf('case'), cooler: partsOf('cooler')
  };
  var asc = function (a, b) { return priceOf(a) - priceOf(b); };
  for (var k in P) P[k].sort(asc);
  var minP = {}; for (var k2 in P) minP[k2] = P[k2].length ? priceOf(P[k2][0]) : 0;
  var budget = opts.budget, w = opts.weights, mn = opts.min || {};
  var map = {}; var minClean = Infinity;
  var minRamGb = Math.max(16, mn.ramGb || 0), minStoGb = Math.max(500, mn.stoGb || 0);

  P.cpu.forEach(function (cpu) {
    if (mn.cpuTier && cpu.tier < mn.cpuTier) return;
    var c1 = priceOf(cpu); if (c1 + minP.mobo + minP.ram + minP.gpu + minP.storage + minP.psu + minP.case > budget) return;
    P.mobo.forEach(function (mobo) {
      if (mobo.socket !== cpu.socket) return;
      var c2 = c1 + priceOf(mobo); if (c2 + minP.ram + minP.gpu + minP.storage + minP.psu + minP.case > budget) return;
      P.ram.forEach(function (ram) {
        if (ram.type !== mobo.ramType || cpu.memTypes.indexOf(ram.type) < 0 || ram.gb < minRamGb) return;
        var c3 = c2 + priceOf(ram); if (c3 + minP.gpu + minP.storage + minP.psu + minP.case > budget) return;
        P.case.forEach(function (pcase) {
          if (pcase.formFactors.indexOf(mobo.form) < 0) return;
          var c4 = c3 + priceOf(pcase); if (c4 + minP.gpu + minP.storage + minP.psu > budget) return;
          P.gpu.forEach(function (gpu) {
            if (mn.gpuTier && gpu.tier < mn.gpuTier) return;
            if (gpu.lengthMm > pcase.maxGpuMm) return;
            var c5 = c4 + priceOf(gpu); if (c5 + minP.storage + minP.psu > budget) return;
            P.psu.forEach(function (psu) {
              var c6 = c5 + priceOf(psu); if (c6 + minP.storage > budget) return;
              P.storage.forEach(function (sto) {
                if (sto.gb < minStoGb) return;
                var c7 = c6 + priceOf(sto); if (c7 > budget) return;
                var coolers = cpu.stockCooler ? [null] : P.cooler;
                coolers.forEach(function (cool) {
                  var total = c7 + (cool ? priceOf(cool) : 0);
                  if (total > budget) return;
                  if (opts.mode === 'min' && total >= minClean) return;
                  var key = cpu.id + '|' + gpu.id + '|' + ram.id + '|' + sto.id;
                  var ex = map[key];
                  if (opts.mode !== 'min' && ex && ex.total <= total) return;
                  var parts = { cpu: cpu, mobo: mobo, ram: ram, gpu: gpu, storage: sto, psu: psu, case: pcase };
                  if (cool) parts.cooler = cool;
                  var res = checkCompat(parts);
                  if (res.verdict !== 'ok') return;
                  if (opts.mode === 'min') { minClean = total; return; }
                  var score = w.gpu * gpu.tier / 10 + w.cpu * cpu.tier / 10 + w.ram * Math.min(ram.gb, 32) / 32 + w.sto * Math.min(sto.gb, 2000) / 2000;
                  map[key] = { total: total, score: score, ids: { cpu: cpu.id, mobo: mobo.id, ram: ram.id, gpu: gpu.id, storage: sto.id, psu: psu.id, case: pcase.id, cooler: cool ? cool.id : undefined } };
                });
              });
            });
          });
        });
      });
    });
  });
  return { map: map, minClean: minClean };
}

function suggestBuilds(o) {
  var usage = USAGE[o.usage] || USAGE['1080p'];
  var budget = +o.budget || 0;
  var relaxed = false;
  var r = enumerate({ budget: budget, weights: usage.w, min: usage.min });
  var keys = Object.keys(r.map);
  if (!keys.length && Object.keys(usage.min).length) {
    r = enumerate({ budget: budget, weights: usage.w, min: {} });
    keys = Object.keys(r.map); relaxed = keys.length > 0;
  }
  var list = keys.map(function (k) { return r.map[k]; });
  list.sort(function (a, b) { return b.score - a.score || a.total - b.total; });
  var chosen = [];
  list.forEach(function (c) {
    if (chosen.length >= 3) return;
    var dup = chosen.some(function (x) { return x.ids.cpu === c.ids.cpu && x.ids.gpu === c.ids.gpu; });
    if (!dup) chosen.push(c);
  });
  var results = chosen.map(function (c) {
    var parts = resolve(c.ids), shares = {};
    CAT_KEYS.forEach(function (k) { if (parts[k]) shares[k] = priceOf(parts[k]) / c.total; });
    return { ids: cleanBuild(c.ids), total: c.total, score: c.score, remaining: budget - c.total, shares: shares };
  });
  var out = { results: results, relaxed: relaxed, usage: o.usage, budget: budget };
  if (!results.length) {
    var mm = enumerate({ budget: Infinity, weights: usage.w, min: {}, mode: 'min' });
    out.minTotal = isFinite(mm.minClean) ? mm.minClean : null;
  }
  return out;
}

module.exports = { USAGE, enumerate, suggestBuilds };
