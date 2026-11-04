'use strict';
/* RigLab core/power: Power draw estimate, PSU sizing and UPS sizing maths. Pure functions, no DOM. */
var isNil = require('./shared').isNil;
var roundUp = require('./shared').roundUp;

// ---------- power ----------
var BASE_OTHER_W = 75; // board + RAM + fans, rough
function psuFromLoad(totalW, headroom) {
  var h = isNil(headroom) ? 0.3 : headroom;
  return { total: Math.round(totalW), headroom: h, recommended: roundUp(totalW * (1 + h), 50) };
}
function estimatePower(parts, headroom) {
  var cpuW = parts.cpu ? parts.cpu.peakW : 0;
  var gpuW = parts.gpu ? parts.gpu.tdp : 0;
  var other = BASE_OTHER_W + (parts.storage ? 8 : 0) + (parts.cooler ? (parts.cooler.radiatorMm ? 15 : 5) : 0);
  var r = psuFromLoad(cpuW + gpuW + other, headroom);
  r.cpuW = cpuW; r.gpuW = gpuW; r.otherW = other;
  r.complete = !!(parts.cpu && parts.gpu);
  return r;
}

// ---------- UPS ----------
function upsEstimate(o) {
  var load = Math.max(1, +o.loadW || 1);
  var pf = o.powerFactor > 0 ? o.powerFactor : 0.6;
  var wh = (+o.batteryV || 0) * (+o.batteryAh || 0) * (+o.batteryCount || 0);
  var eff = o.inverterEff > 0 ? o.inverterEff : 0.85;
  var usable = o.usablePct > 0 ? o.usablePct : 0.5;
  var usableWh = wh * eff * usable;
  var head = isNil(o.headroom) ? 0.25 : o.headroom;
  var out = {
    loadW: load,
    nominalWh: wh,
    usableWh: usableWh,
    runtimeMin: usableWh / load * 60,
    minRatedVA: roundUp(load * (1 + head) / pf, 50),
    powerFactor: pf
  };
  if (o.ratedVA > 0) {
    out.ratedW = o.ratedVA * pf;
    out.fitsLoad = load <= out.ratedW;
  }
  return out;
}

module.exports = { BASE_OTHER_W, estimatePower, psuFromLoad, upsEstimate };
