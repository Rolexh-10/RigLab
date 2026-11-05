/* RigLab core/build: Build helpers: resolve ids to parts, clean/total builds, share-code encode/decode. Pure functions, no DOM. */
import type { BuildIds, Cat, Part, PartMap } from './types';
import { CAT_KEYS, getPart, priceOf } from './shared';

// ---------- build helpers ----------
function resolve(build: BuildIds | null | undefined): PartMap {
  var parts: Record<string, Part> = {};
  CAT_KEYS.forEach(function (k) { var p = build && build[k] ? getPart(build[k]) : null; if (p && p.cat === k) parts[k] = p; });
  return parts as PartMap;
}
function cleanBuild(build: BuildIds | null | undefined): BuildIds {
  var out: BuildIds = {};
  CAT_KEYS.forEach(function (k) { var p = build && build[k] ? getPart(build[k]) : null; if (p && p.cat === k) out[k] = p.id; });
  return out;
}
function buildTotal(parts: PartMap, market?: string): number {
  var t = 0; (Object.keys(parts) as Cat[]).forEach(function (k) { t += priceOf(parts[k], market); }); return t;
}
function encodeBuild(build: BuildIds | null | undefined): string {
  var b = cleanBuild(build);
  return 'RL1.' + CAT_KEYS.map(function (k) { return b[k] || ''; }).join('.');
}
function decodeBuild(code: unknown): BuildIds | null {
  if (typeof code !== 'string') return null;
  var s = code.trim();
  if (s.indexOf('RL1.') !== 0) return null;
  var seg = s.slice(4).split('.');
  if (seg.length !== CAT_KEYS.length) return null;
  var out: BuildIds = {};
  for (var i = 0; i < CAT_KEYS.length; i++) {
    if (!seg[i]) continue;
    var p = getPart(seg[i]);
    if (!p || p.cat !== CAT_KEYS[i]) return null;
    out[CAT_KEYS[i]] = p.id;
  }
  return out;
}

export { buildTotal, cleanBuild, decodeBuild, encodeBuild, resolve };
