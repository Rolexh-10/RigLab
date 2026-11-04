  // ---------- state ----------
  var EXAMPLES = [
    { ar: 'سوكيت مختلف', en: 'Socket mismatch', b: { cpu: 'r5-7600', mobo: 'a520m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' } },
    { ar: 'رام DDR4 على لوحة DDR5', en: 'DDR4 RAM on DDR5 board', b: { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr4-16-3200', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' } },
    { ar: 'كرت طويل بكيس صغير', en: 'Long GPU, small case', b: { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rx7800xt', storage: 'nvme-1tb', psu: 'psu-750', case: 'case-matx' } },
    { ar: 'باور ضعيف', en: 'Weak PSU', b: { cpu: 'i7-14700k', mobo: 'z790-ddr5', ram: 'ddr5-32-6000', gpu: 'rtx4070s', storage: 'nvme-1tb', psu: 'psu-550', case: 'case-atx-airflow', cooler: 'cool-dual-tower' } },
    { ar: 'احتمال تحديث BIOS', en: 'Possible BIOS update', b: { cpu: 'r5-5600', mobo: 'a520m', ram: 'ddr4-16-3200', gpu: 'rx7600', storage: 'nvme-500', psu: 'psu-550', case: 'case-atx-mid' } },
    { ar: 'تجميعة سليمة', en: 'Clean build', b: { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' } }
  ];
  var S = {
    build: C.cleanBuild(sget('riglab.current.v1', {})),
    saved: sget('riglab.builds.v1', []),
    compatBuild: C.cleanBuild(EXAMPLES[0].b),
    budget: { amount: 1800000, usage: '1080p' },
    budgetResult: null,
    pf: { cat: 'all', q: '', sort: 'price-asc', f: '', fav: false },
    cart: loadCart(),
    wish: loadWish(),
    ready: { usage: '1080p' },
    expanded: null,
    cmp: { mode: 'parts', cat: 'gpu', a: 'rtx4060', b: 'rx7600', ba: 'current', bb: '' },
    toolTab: 'psu',
    trustTab: 'about',
    picker: null,
    sheet: null,
    homeSamples: null,
    completedLogged: false
  };
  S.saved = C.normalizeSaved(S.saved);

  function loadCart() {
    var raw = sget('riglab.cart.v1', []), out = [], seen = {};
    if (!Array.isArray(raw)) return out;
    raw.forEach(function (it) {
      if (!it || typeof it !== 'object' || seen[it.partId]) return;
      if (!C.getPart(it.partId) || !C.storeById(it.storeId)) return;
      seen[it.partId] = 1;
      out.push({ partId: String(it.partId), storeId: String(it.storeId), qty: Math.max(1, Math.min(9, Math.floor(+it.qty || 1))) });
    });
    return out;
  }
  function loadWish() { var w = sget('riglab.wish.v1', []); return Array.isArray(w) ? w.filter(function (id) { return !!C.getPart(id); }) : []; }
  function persistWish() { sset('riglab.wish.v1', S.wish); }
  function persistCart() { sset('riglab.cart.v1', S.cart); updateBadge(); }
  function cartCount() { return S.cart.reduce(function (n, it) { return n + it.qty; }, 0); }
  function updateBadge() { var b = $('cart-badge'); if (b) b.textContent = cartCount() ? String(cartCount()) : ''; var bb = document.querySelector('#bnav .badge-n'); if (bb) bb.textContent = cartCount() ? String(cartCount()) : ''; }
  function addCart(partId, storeId) {
    var f = S.cart.filter(function (x) { return x.partId === partId; })[0];
    if (f) { f.storeId = storeId; } else S.cart.push({ partId: partId, storeId: storeId, qty: 1 });
    persistCart(); track('cart_added');
  }
  function persistBuild() { sset('riglab.current.v1', S.build); }
  function persistSaved() { sset('riglab.builds.v1', S.saved); }
  function bget(target) { return target === 'compat' ? S.compatBuild : S.build; }

