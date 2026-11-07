/* 3D model identity resolver.
 * A catalog product may only be drawn with a GLB that the manifest explicitly lists for that product id
 * (manifest[model].products[productId] = 'exact' | 'representative'). There is no category/type/default fallback:
 * anything else is drawn as the neutral generic placeholder. A model whose vendor conflicts with the product's
 * vendor (Radeon vs GeForce, Intel vs AMD ...) is never returned, even if the manifest is wrong. */
(function (root) {
  var LEVELS = { exact: 1, representative: 1 };
  function vendorOf(key, part) { return (key === 'gpu' || key === 'cpu' || key === 'mobo') ? String(part.brand || '').toLowerCase() : ''; }
  // Physical/electrical facts that must agree before a model may stand in for a product, on top of the vendor rule:
  // motherboard form factor (an ATX model squeezed into an mATX product distorts slots and geometry), CPU socket, RAM generation.
  function compatible(key, part, idn) {
    if (key === 'mobo' && idn.form && part.form && idn.form !== part.form) return false;
    if (key === 'cpu' && idn.socket && part.socket && idn.socket !== part.socket) return false;
    if (key === 'ram' && idn.ddr && part.type && idn.ddr !== part.type) return false;
    return true;
  }
  function resolve(reg, key, part) {
    if (!part || !reg) return null;
    var best = null, bp = -1, v = vendorOf(key, part);
    Object.keys(reg).forEach(function (id) {
      var m = reg[id]; if (m.cat !== key) return;
      var lvl = m.products && m.products[part.id]; if (!LEVELS[lvl]) return;
      var idn = m.identity || {};
      if (v && idn.vendor && idn.vendor !== 'neutral' && idn.vendor !== v) return; // cross-vendor substitution is forbidden
      if (!compatible(key, part, idn)) return;
      var pr = m.priority || 0; if (pr > bp) { bp = pr; best = { id: id, level: lvl, identity: idn, note: m.note || '' }; }
    });
    return best;
  }
  var api = { resolve: resolve, compatible: compatible, LEVELS: Object.keys(LEVELS) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RigLabIdentity = api;
})(typeof window !== 'undefined' ? window : this);
