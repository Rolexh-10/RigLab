/* RigLab core/cart: Cart grouping per store, cheapest / single-store plans, buy links. Pure functions, no DOM. */
import * as D from '../data';
import { offersFor } from './offers';
import type { CartItem, Offer, Part, Store } from './types';
import { getPart } from './shared';

// ---------- cart (items: {partId, storeId, qty}) ----------
function storeById(id: string): Store | null { for (var i = 0; i < D.STORES.length; i++) if (D.STORES[i].id === id) return D.STORES[i]; return null; }
function offerFor(partId: string, storeId: string): Offer | null { var l = offersFor(partId); for (var i = 0; i < l.length; i++) if (l[i].storeId === storeId) return l[i]; return null; }
function bestOffer(partId: string): Offer | null { var l = offersFor(partId).filter(function (o) { return o.available; }); return l[0] || null; }
function clampQty(qty: unknown): number { var q = Math.floor(+(qty as number) || 1); return Math.max(1, Math.min(9, q)); }
export interface CartLine { part: Part; offer: Offer | null; qty: number; available: boolean; unit: number; lineTotal: number }
export interface CartGroup { store: Store; lines: CartLine[]; subtotal: number; allAvailable: boolean; unavailable: number }
function cartGroups(items: CartItem[]): { groups: CartGroup[]; total: number; unavailable: number; count: number } {
  var map: Record<string, CartGroup> = {}, order: string[] = [];
  items.forEach(function (it) {
    var p = getPart(it.partId), st = storeById(it.storeId); if (!p || !st) return;
    var o = offerFor(it.partId, it.storeId), qty = clampQty(it.qty);
    var line: CartLine = { part: p, offer: o, qty: qty, available: !!(o && o.available), unit: o ? o.price : 0, lineTotal: o ? o.price * qty : 0 };
    if (!map[st.id]) { map[st.id] = { store: st, lines: [], subtotal: 0, allAvailable: true, unavailable: 0 }; order.push(st.id); }
    var g = map[st.id]; g.lines.push(line);
    if (line.available) g.subtotal += line.lineTotal; else { g.allAvailable = false; g.unavailable++; }
  });
  var groups = order.map(function (k) { return map[k]; }), total = 0, un = 0, count = 0;
  groups.forEach(function (g) { total += g.subtotal; un += g.unavailable; g.lines.forEach(function (l) { count += l.qty; }); });
  return { groups: groups, total: total, unavailable: un, count: count };
}
// Re-assign every item to the cheapest store that has it in stock (keeps the item if nobody has it).
function planCheapest(items: CartItem[]): CartItem[] {
  return items.map(function (it) { var b = bestOffer(it.partId); return { partId: it.partId, qty: clampQty(it.qty), storeId: b ? b.storeId : it.storeId }; });
}
// Stores able to supply the whole cart, cheapest first.
function planSingleStore(items: CartItem[]): { store: Store; total: number }[] {
  var res: { store: Store; total: number }[] = [];
  D.STORES.forEach(function (st) {
    var ok = items.length > 0, total = 0;
    items.forEach(function (it) { var o = offerFor(it.partId, st.id); if (!o || !o.available) ok = false; else total += o.price * clampQty(it.qty); });
    if (ok) res.push({ store: st, total: total });
  });
  res.sort(function (a, b) { return a.total - b.total; });
  return res;
}
// Destination for "buy from this store". Null for sample stores: there is no real shop to send people to.
function buyUrl(store: Store | null | undefined): string | null {
  if (!store || !store.live || !store.url) return null;
  return store.url + (store.url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=riglab&utm_medium=referral';
}

export { bestOffer, buyUrl, cartGroups, clampQty, offerFor, planCheapest, planSingleStore, storeById };
