/* RigLab core/power: Power draw estimate, PSU sizing and UPS sizing maths. Pure functions, no DOM. */
import type { PartMap } from './types';
import { isNil, roundUp } from './shared';

// ---------- power ----------
var BASE_OTHER_W = 75; // board + RAM + fans, rough
export interface PowerEstimate { total: number; headroom: number; recommended: number; cpuW: number; gpuW: number; otherW: number; complete: boolean }
function psuFromLoad(totalW: number, headroom?: number | null): { total: number; headroom: number; recommended: number } {
  var h = isNil(headroom) ? 0.3 : headroom;
  return { total: Math.round(totalW), headroom: h, recommended: roundUp(totalW * (1 + h), 50) };
}
function estimatePower(parts: PartMap, headroom?: number | null): PowerEstimate {
  var cpuW = parts.cpu ? parts.cpu.peakW : 0;
  var gpuW = parts.gpu ? parts.gpu.tdp : 0;
  var other = BASE_OTHER_W + (parts.storage ? 8 : 0) + (parts.cooler ? (parts.cooler.radiatorMm ? 15 : 5) : 0);
  var r = psuFromLoad(cpuW + gpuW + other, headroom);
  return { total: r.total, headroom: r.headroom, recommended: r.recommended, cpuW: cpuW, gpuW: gpuW, otherW: other, complete: !!(parts.cpu && parts.gpu) };
}

// ---------- UPS ----------
export interface UpsInput { loadW?: number; powerFactor?: number; batteryV?: number; batteryAh?: number; batteryCount?: number; inverterEff?: number; usablePct?: number; headroom?: number | null; ratedVA?: number }
export interface UpsResult { loadW: number; nominalWh: number; usableWh: number; runtimeMin: number; minRatedVA: number; powerFactor: number; ratedW?: number; fitsLoad?: boolean }
function upsEstimate(o: UpsInput): UpsResult {
  var load = Math.max(1, +o.loadW! || 1);
  var pf = o.powerFactor! > 0 ? o.powerFactor! : 0.6;
  var wh = (+o.batteryV! || 0) * (+o.batteryAh! || 0) * (+o.batteryCount! || 0);
  var eff = o.inverterEff! > 0 ? o.inverterEff! : 0.85;
  var usable = o.usablePct! > 0 ? o.usablePct! : 0.5;
  var usableWh = wh * eff * usable;
  var head = isNil(o.headroom) ? 0.25 : o.headroom;
  var out: UpsResult = {
    loadW: load,
    nominalWh: wh,
    usableWh: usableWh,
    runtimeMin: usableWh / load * 60,
    minRatedVA: roundUp(load * (1 + head) / pf, 50),
    powerFactor: pf
  };
  if (o.ratedVA! > 0) {
    out.ratedW = o.ratedVA! * pf;
    out.fitsLoad = load <= out.ratedW;
  }
  return out;
}

export { BASE_OTHER_W, estimatePower, psuFromLoad, upsEstimate };
