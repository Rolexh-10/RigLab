/* RigLab UI. Vanilla JS, no framework. Arabic RTL first, English LTR toggle.
 * Persistence is localStorage only (trial). Nothing is sent to any server. */
(function () {
  'use strict';
  var C = window.RigLabCore;

  // ---------- storage (try/catch + in-memory fallback) ----------
  var mem = {};
  function sget(k, d) { try { var v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch (e) {} return (k in mem) ? mem[k] : d; }
  function sset(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var lang = sget('riglab.lang', 'ar') === 'en' ? 'en' : 'ar';
  function L(ar, en) { return (lang === 'en' && en != null) ? en : ar; }
  function T(o) { return o ? (lang === 'en' ? o.en : o.ar) : ''; }
  function pname(p) { return lang === 'ar' ? (p.nameAr || p.name) : p.name; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function unit() { return L('د.ع', 'IQD'); }
  function money(n) { return '<span class="mono">' + fmt(n) + '</span> ' + unit(); }
  function moneyT(n) { return fmt(n) + ' ' + unit(); }
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value : ''; }
  function num(id, d) { var v = parseFloat(val(id)); return isFinite(v) ? v : d; }
  function smp() { return '<span class="tag sample">' + L('تجريبي', 'Sample') + '</span>'; }

  // ---------- ad slots ----------
  // Fill a slot with a direct sponsor: ADS.home = { advertiser:'..', title:'..', text:'..', cta:'..', url:'https://..' }
  // Ads are always labelled, never appear inside compatibility results, and never change price order.
  var CONTACT = { email: 'rolexmud@gmail.com', wa: '+9647812388994', waLink: 'https://wa.me/9647812388994' };
  var ADS = { home: null, parts: null, builder: null, cart: null, budget: null, compat: null, compare: null, tools: null, builds: null };
  function adSlot(name) {
    var a = ADS[name], tag = '<span class="tag sp">' + L('إعلان', 'Ad') + '</span>';
    if (a && a.url) {
      return '<aside class="ad" data-slot="' + name + '" aria-label="' + L('إعلان', 'Advertisement') + '"><div class="row between">' + tag + '<span class="small muted">' + esc(a.advertiser || '') + '</span></div><h3>' + esc(a.title || '') + '</h3><p class="small">' + esc(a.text || '') + '</p><a class="btn sm pri" href="' + esc(a.url) + '" target="_blank" rel="sponsored noopener noreferrer" data-act="ad-click" data-slot="' + name + '">' + esc(a.cta || L('زيارة', 'Visit')) + ' ↗</a></aside>';
    }
    return '<aside class="ad empty" data-slot="' + name + '" aria-label="' + L('مساحة إعلانية', 'Ad space') + '"><div class="row between">' + tag + '</div><p class="small muted">' + L('مساحة إعلانية متاحة هنا · ', 'Ad space available here · ') + '<a href="' + CONTACT.waLink + '" target="_blank" rel="noopener noreferrer">' + L('للإعلان تواصل واتساب', 'Advertise via WhatsApp') + '</a></p></aside>';
  }

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
  if (!Array.isArray(S.saved)) S.saved = [];

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

  // ---------- analytics (local counters; GA4 only if a gtag exists) ----------
  function track(name) {
    var ev = sget('riglab.events', {}); ev[name] = (ev[name] || 0) + 1; sset('riglab.events', ev);
    try { if (window.gtag) window.gtag('event', name); } catch (e) {}
  }

  // ---------- routing ----------
  var TOOL_ROUTES = { 'psu-calc': 'psu', 'ups-calc': 'ups', 'upgrade-advisor': 'upgrade', 'monitor-selector': 'monitor', 'storage-calc': 'storage', 'power-calc': 'power' };
  var TOOL_HASH = { psu: 'psu-calc', ups: 'ups-calc', upgrade: 'upgrade-advisor', monitor: 'monitor-selector', storage: 'storage-calc', power: 'power-calc' };
  var NAV = [
    { r: 'home', ar: 'الرئيسية', en: 'Home' }, { r: 'parts', ar: 'القطع والأسعار', en: 'Parts & prices' }, { r: 'ready', ar: 'تجميعات جاهزة', en: 'Ready builds' },
    { r: 'builder', ar: 'PC Builder', en: 'PC Builder' }, { r: 'budget', ar: 'الميزانية الذكية', en: 'Smart Budget' },
    { r: 'compat', ar: 'فحص التوافق', en: 'Compatibility' }, { r: 'compare', ar: 'مقارنة', en: 'Compare' },
    { r: 'tools', ar: 'الأدوات', en: 'Tools' }, { r: 'builds', ar: 'تجميعاتي', en: 'My Builds' },
    { r: 'trust', ar: 'عن RigLab', en: 'About' }
  ];
  var ROUTES = ['home', 'parts', 'ready', 'builder', 'budget', 'compat', 'compare', 'tools', 'cart', 'builds', 'trust', 'admin'].concat(Object.keys(TOOL_ROUTES));
  function route() { var h = (location.hash || '#home').slice(1); return ROUTES.indexOf(h) >= 0 ? h : 'home'; }
  function go(r) { location.hash = '#' + r; }

  // ---------- small components ----------
  var ST_LABEL = {
    ok: ['متوافق', 'OK'], warn: ['تحذير', 'Warning'], error: ['غير متوافق', 'Incompatible'],
    unknown: ['غير مؤكد', 'Unconfirmed'], pending: ['بانتظار', 'Pending'], info: ['ملاحظة', 'Note']
  };
  function sb(s) { return '<span class="badge b-' + s + '">' + L(ST_LABEL[s][0], ST_LABEL[s][1]) + '</span>'; }
  function vb(v) { return '<span class="badge b-' + v + '">' + T(C.VERDICT[v]) + '</span>'; }
  var CONF = { high: ['ثقة عالية', 'High confidence'], medium: ['ثقة متوسطة', 'Medium confidence'], low: ['ثقة منخفضة', 'Low confidence'] };
  var SRC = { spec: ['من المواصفات', 'From specs'], estimate: ['تقدير', 'Estimate'], 'vendor-sample': ['توصية الشركة (عيّنة)', 'Vendor rec. (sample)'] };

  function compatPanel(parts) {
    var res = C.checkCompat(parts);
    var ord = { error: 0, warn: 1, unknown: 2, ok: 3, info: 4, pending: 5 };
    var items = res.items.slice().sort(function (a, b) { return ord[a.status] - ord[b.status]; });
    function li(i) {
      var meta = '';
      if (i.confidence) meta = L(CONF[i.confidence][0], CONF[i.confidence][1]) + (i.source ? ' · ' + L(SRC[i.source][0], SRC[i.source][1]) : '');
      return '<li class="s-' + i.status + '"><div><div class="t">' + sb(i.status) + '<b>' + T(i.title) + '</b></div><p>' + T(i.detail) + '</p>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div></li>';
    }
    var main = items.filter(function (i) { return i.status !== 'pending'; }).map(li).join('');
    var pend = items.filter(function (i) { return i.status === 'pending'; });
    var missing = res.missingRequired.map(function (k) { return T(C.catInfo(k)); }).join(L('، ', ', '));
    return '<div class="stack-s">' +
      '<div class="row between"><div class="row">' + vb(res.verdict) +
      '<span class="small muted">' + res.counts.error + ' ' + L('أخطاء', 'errors') + ' · ' + res.counts.warn + ' ' + L('تحذيرات', 'warnings') + '</span></div></div>' +
      (res.missingRequired.length && res.verdict !== 'empty' ? '<div class="note">' + L('قطع ناقصة: ', 'Missing parts: ') + missing + '. ' + L('الفحص غير مكتمل.', 'The check is incomplete.') + '</div>' : '') +
      (res.verdict === 'empty' ? '<div class="note">' + L('اختر قطعتين على الأقل ليبدأ الفحص.', 'Pick at least two parts to start checking.') + '</div>' : '') +
      '<ul class="chk">' + main + '</ul>' +
      (pend.length ? '<details><summary>' + L('فحوصات بانتظار قطع (' + pend.length + ')', 'Checks waiting for parts (' + pend.length + ')') + '</summary><ul class="chk">' + pend.map(li).join('') + '</ul></details>' : '') +
      '</div>';
  }
  function powerLine(parts) {
    if (!parts.cpu && !parts.gpu) return '';
    var e = C.estimatePower(parts);
    return '<div class="note">' + L('تقدير الاستهلاك: ', 'Estimated draw: ') + '<b class="mono">' + e.total + ' W</b> · ' + L('PSU موصى به: ', 'Recommended PSU: ') + '<b class="mono">' + e.recommended + ' W</b>' +
      (e.complete ? '' : ' · ' + L('(ناقص: أضف المعالج وكرت الشاشة)', '(incomplete: add CPU and GPU)')) + '</div>';
  }
  function partsList(ids) {
    var parts = C.resolve(ids);
    return '<ul class="parts-list">' + C.CATS.filter(function (c) { return parts[c.key]; }).map(function (c) {
      var p = parts[c.key];
      return '<li><span><span class="muted small">' + T(c) + ' · </span>' + esc(pname(p)) + '</span><span class="pr">' + fmt(C.priceOf(p)) + '</span></li>';
    }).join('') + '</ul>';
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function copyText(id) {
    var el = $(id); if (!el) return;
    function fb() { try { el.focus(); el.select(); } catch (e) {} toast(L('حدّد النص وانسخه يدوياً', 'Select the text and copy it manually')); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(function () { toast(L('تم النسخ', 'Copied')); }, fb);
      else fb();
    } catch (e) { fb(); }
  }

  // ---------- build mutation ----------
  function setPart(target, cat, id) {
    var b = bget(target);
    var wasEmpty = Object.keys(b).length === 0;
    b[cat] = id;
    if (target !== 'compat') {
      persistBuild();
      if (wasEmpty) track('build_started');
      var parts = C.resolve(b);
      var done = C.CATS.every(function (c) { return !c.required || parts[c.key]; });
      if (done && !S.completedLogged) { S.completedLogged = true; track('build_completed'); }
      if (!done) S.completedLogged = false;
    }
  }
  function summaryText(build) {
    var parts = C.resolve(build), res = C.checkCompat(parts);
    var lines = ['RigLab — ' + L('تجميعة (أسعار تجريبية)', 'Build (sample prices)')];
    C.CATS.forEach(function (c) { var p = parts[c.key]; if (p) lines.push(T(c) + ': ' + pname(p) + ' — ' + moneyT(C.priceOf(p))); });
    lines.push(L('المجموع: ', 'Total: ') + moneyT(C.buildTotal(parts)));
    lines.push(L('الحالة: ', 'Status: ') + T(C.VERDICT[res.verdict]));
    lines.push(L('كود الاستيراد: ', 'Import code: ') + C.encodeBuild(build));
    return lines.join('\n');
  }


  // ---------- interactive banner background: particles.js (MIT, github.com/VincentGarreau/particles.js) ----------
  var FX_ICONS = {
    cpu: '<rect x="18" y="18" width="28" height="28" rx="4"/><rect x="26" y="26" width="12" height="12" rx="2"/><path d="M24 18V8M32 18V8M40 18V8M24 46v10M32 46v10M40 46v10M18 24H8M18 32H8M18 40H8M46 24h10M46 32h10M46 40h10"/>',
    gpu: '<rect x="6" y="20" width="52" height="24" rx="4"/><circle cx="22" cy="32" r="7"/><circle cx="42" cy="32" r="7"/><path d="M22 26v12M16 32h12M42 26v12M36 32h12M10 44v6M14 44v6"/>',
    ram: '<rect x="6" y="22" width="52" height="18" rx="2"/><path d="M12 28h6v6h-6zM24 28h6v6h-6zM36 28h6v6h-6zM48 28h4v6h-4zM10 40v6M16 40v6M22 40v6M28 40v6M34 40v6M40 40v6M46 40v6M52 40v6"/>',
    fan: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="4"/><path d="M32 28c-2-10 4-14 10-12-2 6-4 10-10 12zM36 32c10-2 14 4 12 10-6-2-10-4-12-10zM32 36c2 10-4 14-10 12 2-6 4-10 10-12zM28 32c-10 2-14-4-12-10 6 2 10 4 12 10z"/>',
    gear: '<circle cx="32" cy="32" r="9"/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M15 49l6-6M43 21l6-6"/><circle cx="32" cy="32" r="18"/>',
    tools: '<path d="M14 50L38 26"/><path d="M38 26l-4-10 10-4 4 8z"/><path d="M50 14L22 42l-6 6 2 2 6-6 28-28z" opacity="0"/><path d="M46 52l-14-14M40 58l-6-6 8-8 6 6z"/>',
    pad: '<path d="M14 24h36c6 0 10 6 12 16l2 8c1 4-4 6-7 3l-8-9H15l-8 9c-3 3-8 1-7-3l2-8c2-10 6-16 12-16z" transform="translate(0 2)"/><path d="M20 32v8M16 36h8"/><circle cx="42" cy="32" r="2.5"/><circle cx="48" cy="38" r="2.5"/>',
    bolt: '<path d="M36 6L16 36h14l-4 22 22-32H34z"/>',
    lab: '<path d="M26 8h12M28 8v16L12 52c-2 4 1 6 4 6h32c3 0 6-2 4-6L36 24V8"/><path d="M20 42h24" opacity=".7"/><circle cx="30" cy="48" r="2"/><circle cx="38" cy="45" r="2"/>',
    ssd: '<rect x="8" y="18" width="48" height="28" rx="3"/><path d="M14 26h10M14 32h10M14 38h10"/><rect x="34" y="24" width="16" height="16" rx="2"/>'
  };
  function fxIcon(name, col) { var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + FX_ICONS[name] + '</svg>'; return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function initBannerFx() {
    var host = $('bg-fx'); if (!window.particlesJS || !host || host.__fx) return; host.__fx = 1;
    var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var common = { retina_detect: false };
    // layer 0: connecting network (circuit traces) that grabs towards the finger / pointer
    var base = document.createElement('div'); base.id = 'fx-net'; base.className = 'fxl'; host.appendChild(base);
    window.particlesJS('fx-net', {
      particles: { number: { value: 700, density: { enable: true, value_area: 800 } }, color: { value: ['#ff2d4b', '#7dff8a'] }, shape: { type: 'circle' }, opacity: { value: 0.6, random: true }, size: { value: 2.2, random: true },
        line_linked: { enable: true, distance: 105, color: '#ff2d4b', opacity: 0.4, width: 1 }, move: { enable: !reduce, speed: 1.1, direction: 'none', random: true, out_mode: 'out' } },
      interactivity: { detect_on: 'window', events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true }, modes: { grab: { distance: 170, line_linked: { opacity: 1 } }, push: { particles_nb: 3 } } },
      retina_detect: false
    });
    // icon layers: each one drifts as a small neon part (CPU, GPU, RAM, fan, tools, gamepad ...) and is pushed away from the finger
    var names = Object.keys(FX_ICONS), cols = ['#ff5d73', '#7dff8a', '#ff2d4b'];
    names.forEach(function (n, i) {
      var d = document.createElement('div'); d.id = 'fx-i' + i; d.className = 'fxl'; host.appendChild(d);
      window.particlesJS('fx-i' + i, {
        particles: { number: { value: 3, density: { enable: false } }, color: { value: '#ffffff' }, shape: { type: 'image', image: { src: fxIcon(n, cols[i % 3]), width: 64, height: 64 } }, opacity: { value: 0.9, random: true, anim: { enable: false } },
          size: { value: 26, random: true, anim: { enable: false } }, line_linked: { enable: false }, move: { enable: !reduce, speed: 0.9, direction: i % 2 ? 'left' : 'right', random: true, straight: false, out_mode: 'out' } },
        interactivity: { detect_on: 'window', events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: false }, resize: true }, modes: { repulse: { distance: 90, duration: 0.4 } } },
        retina_detect: false
      });
    });
  }

  // ---------- modal (picker + sheets) ----------
  function candFlags(target, cat, p) {
    var b = {}; var cur = bget(target); for (var k in cur) b[k] = cur[k]; delete b[cat];
    var base = C.checkCompat(C.resolve(b)), bi = {};
    base.items.forEach(function (i) { bi[i.id] = i.status; });
    var nb = {}; for (var k2 in b) nb[k2] = b[k2]; nb[cat] = p.id;
    var r = C.checkCompat(C.resolve(nb)), errs = [], warns = [];
    r.items.forEach(function (i) {
      if (i.status === 'error' && bi[i.id] !== 'error') errs.push(i);
      if (i.status === 'warn' && bi[i.id] !== 'warn') warns.push(i);
    });
    return { errs: errs, warns: warns };
  }
  function openPicker(cat, target) { S.sheet = null; S.picker = { cat: cat, target: target, q: '', sort: 'price-asc', hide: false }; renderModal(); }
  function has3d(cat, x) {
    var R = window.RIGLAB_MODELS || {}, c = cat === 'storage' ? 'ssd' : cat;
    for (var k in R) { var m = R[k]; if (m.cat !== c) continue; if ((m.ids && m.ids.indexOf(x.id) >= 0) || m.def || (m.type && (x.type === m.type || x.ramType === m.type))) return true; }
    return false;
  }
  function pickerList() {
    var p = S.picker, cur = bget(p.target)[p.cat];
    var q = p.q.trim().toLowerCase();
    var list = C.partsOf(p.cat).filter(function (x) { return !q || (x.name + ' ' + (x.nameAr || '') + ' ' + C.shortSpec(x)).toLowerCase().indexOf(q) >= 0; });
    list.sort(function (a, b) {
      if (p.sort === 'price-desc') return C.priceOf(b) - C.priceOf(a);
      if (p.sort === 'name') return a.name.localeCompare(b.name);
      return C.priceOf(a) - C.priceOf(b);
    });
    var html = '', shown = 0;
    list.forEach(function (x) {
      var f = candFlags(p.target, p.cat, x);
      if (p.hide && f.errs.length) return;
      shown++;
      var okc = !f.errs.length && !f.warns.length && Object.keys(bget(p.target)).filter(function (k) { return k !== p.cat && bget(p.target)[k]; }).length > 0;
      var flag = okc ? '<span class="badge b-ok">✔ ' + L('يركب مع اختيارك', 'Fits your picks') + '</span>' : f.errs.length ? sb('error') + ' <span class="small muted">' + T(f.errs[0].title) + '</span>' : (f.warns.length ? sb('warn') + ' <span class="small muted">' + T(f.warns[0].title) + '</span>' : '');
      html += '<button class="opt' + (cur === x.id ? ' cur' : '') + '" data-act="choose" data-id="' + x.id + '"><div class="b"><div class="nm">' + esc(pname(x)) + (x.generic ? ' <span class="tag">' + L('فئة نموذجية', 'generic class') + '</span>' : '') + (has3d(p.cat, x) ? ' <span class="tag t3d">3D</span>' : '') + '</div><div class="small muted mono">' + C.shortSpec(x) + '</div>' + (flag ? '<div class="row" style="margin-top:4px">' + flag + '</div>' : '') + '</div><div class="pr">' + fmt(C.priceOf(x)) + '<br><span class="small muted">' + unit() + '</span></div></button>';
    });
    return shown ? html : '<div class="note">' + L('لا نتائج مطابقة.', 'No matching results.') + '</div>';
  }
  function renderModal() {
    var el = $('modal');
    if (!S.picker && !S.sheet) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    var bg = '<div class="sheet-bg" data-act="close-sheet"></div>';
    var closeBtn = '<button class="btn sm ghost" data-act="close-sheet">' + L('إغلاق', 'Close') + '</button>';
    if (S.picker) {
      var p = S.picker, ci = C.catInfo(p.cat), cur = bget(p.target)[p.cat];
      el.innerHTML = bg + '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + T(ci) + '"><header><div class="row between"><h2>' + L('اختر ', 'Choose ') + T(ci) + '</h2>' + closeBtn + '</div>' +
        '<input type="text" id="pk-q" placeholder="' + L('بحث…', 'Search…') + '" value="' + esc(p.q) + '">' +
        '<div class="row"><select id="pk-sort" style="width:auto"><option value="price-asc"' + (p.sort === 'price-asc' ? ' selected' : '') + '>' + L('الأرخص أولاً', 'Cheapest first') + '</option><option value="price-desc"' + (p.sort === 'price-desc' ? ' selected' : '') + '>' + L('الأغلى أولاً', 'Priciest first') + '</option><option value="name"' + (p.sort === 'name' ? ' selected' : '') + '>' + L('الاسم', 'Name') + '</option></select>' +
        '<button class="chip" data-act="pk-hide" aria-pressed="' + p.hide + '">' + L('أخفِ غير المتوافق', 'Hide incompatible') + '</button>' +
        (cur ? '<button class="btn sm ghost" data-act="clear-slot" data-cat="' + p.cat + '" data-target="' + p.target + '">' + L('إزالة القطعة', 'Remove part') + '</button>' : '') + '</div>' +
        '<div class="small muted">' + L('الأسعار تجريبية. العلامات تعتمد على القطع المختارة حالياً.', 'Prices are sample data. Flags depend on the parts already selected.') + '</div></header><div class="list" id="pk-list">' + pickerList() + '</div></div>';
      return;
    }
    var sh = S.sheet, body = '';
    if (sh.type === 'more') {
      body = '<h2>' + L('المزيد', 'More') + '</h2><div class="morelist">' + [].concat(NAV.filter(function (n) { return ['home', 'parts', 'builder', 'compat', 'tools', 'builds', 'trust'].indexOf(n.r) < 0; }), [{ r: 'tools', ar: 'الأدوات', en: 'Tools' }, { r: 'psu-calc', ar: 'حاسبة PSU', en: 'PSU Calculator' }, { r: 'ups-calc', ar: 'حاسبة UPS', en: 'UPS Calculator' }, { r: 'upgrade-advisor', ar: 'Upgrade Advisor', en: 'Upgrade Advisor' }, { r: 'power-calc', ar: 'أمبيرات المولدة', en: 'Generator amps' }], NAV.filter(function (n) { return ['builds', 'trust'].indexOf(n.r) >= 0; })).map(function (n) {
        return '<a class="art" style="--tc:' + (ART_COL[n.r] || '#ff2d4b') + '" href="#' + n.r + '" data-act="close-sheet">' + toolArt(n.r) + '<span>' + L(n.ar, n.en) + '</span><span aria-hidden="true">‹</span></a>';
      }).join('') + '</div>';
    }
    else if (sh.type === 'save') {
      body = '<h2>' + L('حفظ التجميعة', 'Save build') + '</h2><p class="small muted">' + L('الحفظ محلي تجريبي: يبقى في هذا المتصفح فقط ولا يُرسل لأي خادم.', 'Trial local save: stays in this browser only and is not sent to any server.') + '</p>' +
        '<label class="f" for="save-name">' + L('اسم التجميعة', 'Build name') + '<input type="text" id="save-name" maxlength="60" value="' + L('تجميعتي ', 'My build ') + (S.saved.length + 1) + '"></label>' +
        '<div class="row"><button class="btn pri" data-act="save-do">' + L('حفظ', 'Save') + '</button></div>';
    } else if (sh.type === 'share' || sh.type === 'code') {
      var b = sh.type === 'code' ? sh.build : S.build;
      body = '<h2>' + L('مشاركة التجميعة', 'Share build') + '</h2>' +
        '<p class="small muted">' + L('لا يوجد خادم بعد، لذلك المشاركة عن طريق كود نصي يلصقه الطرف الآخر في «استيراد». لا يحتوي أي بيانات شخصية.', 'There is no server yet, so sharing works through a text code the other person pastes into "Import". It contains no personal data.') + '</p>' +
        '<label class="f" for="share-code">' + L('كود التجميعة', 'Build code') + '<input type="text" id="share-code" readonly class="mono" value="' + C.encodeBuild(b) + '"></label>' +
        '<div class="row"><button class="btn pri" data-act="copy" data-src="share-code">' + L('نسخ الكود', 'Copy code') + '</button></div>' +
        '<label class="f" for="share-sum">' + L('ملخص نصي للنشر في الكروبات', 'Text summary for groups') + '<textarea id="share-sum" readonly style="min-height:150px;direction:' + (lang === 'ar' ? 'rtl' : 'ltr') + '">' + esc(summaryText(b)) + '</textarea></label>' +
        '<div class="row"><button class="btn" data-act="copy" data-src="share-sum">' + L('نسخ الملخص', 'Copy summary') + '</button></div>';
    } else if (sh.type === 'import') {
      body = '<h2>' + L('استيراد تجميعة', 'Import build') + '</h2><p class="small muted">' + L('الصق كود RigLab (يبدأ بـ RL1).', 'Paste a RigLab code (starts with RL1).') + '</p>' +
        '<label class="f" for="import-code">' + L('الكود', 'Code') + '<textarea id="import-code" placeholder="RL1.r5-7600.b650m…"></textarea></label>' +
        '<div class="row"><button class="btn pri" data-act="import-do">' + L('استيراد', 'Import') + '</button></div>';
    }
    el.innerHTML = bg + '<div class="sheet" role="dialog" aria-modal="true"><div style="padding:16px;overflow-y:auto" class="stack-s"><div class="row between"><span></span>' + closeBtn + '</div>' + body + '</div></div>';
  }

  // ---------- views ----------
  var VIEWS = {};

  // Home
  function homeSamples() {
    if (!S.homeSamples) {
      S.homeSamples = [1000000, 1500000, 2500000].map(function (b) { var r = C.suggestBuilds({ budget: b, usage: '1080p' }); return { budget: b, r: r.results[0] || null }; });
    }
    return S.homeSamples;
  }
  // neon line-art for the home menu cards: each drawing hints at what the section does
  var ART = {
    parts: '<rect x="62" y="30" width="38" height="38" rx="5"/><path d="M72 30v-8M81 30v-8M90 30v-8M72 68v8M81 68v8M90 68v8M62 42h-8M62 52h-8M62 62h-8M100 42h8M100 52h8M100 62h8"/><circle cx="108" cy="62" r="17"/><path d="M120 74l16 16"/><path d="M100 62h16M108 54v16" opacity=".6"/>',
    builder: '<rect x="50" y="10" width="62" height="84" rx="6"/><rect x="58" y="20" width="46" height="36" rx="3" opacity=".7"/><circle cx="68" cy="72" r="8"/><circle cx="92" cy="72" r="8"/><path d="M68 64v16M60 72h16M92 64v16M84 72h16" opacity=".6"/><rect x="58" y="84" width="46" height="4" rx="2"/><path d="M118 20h22M118 36h30M118 52h16"/>',
    cart: '<path d="M30 20h18l10 46h54l10-34H52"/><circle cx="66" cy="82" r="7"/><circle cx="110" cy="82" r="7"/><path d="M70 44h40M72 54h36" opacity=".6"/><path d="M128 14l4 8M140 20l-6 6M146 36l-8 0" />',
    compat: '<path d="M80 10l34 12v26c0 22-14 38-34 46-20-8-34-24-34-46V22z"/><path d="M62 52l14 14 26-30"/><path d="M12 38h20M12 54h20M128 38h20M128 54h20" opacity=".6"/>',
    budget: '<ellipse cx="62" cy="76" rx="30" ry="9"/><path d="M32 76v-14c0 5 13 9 30 9s30-4 30-9v14M32 62V48c0 5 13 9 30 9s30-4 30-9v14M32 48V34c0 5 13 9 30 9s30-4 30-9"/><ellipse cx="62" cy="34" rx="30" ry="9"/><circle cx="116" cy="40" r="20"/><path d="M116 30v20M110 36h10a4 4 0 010 8h-8" />',
    compare: '<path d="M80 12v76M52 88h56M30 30h100"/><path d="M30 30l-16 34h32zM130 30l-16 34h32z"/><path d="M14 64a16 6 0 0032 0M114 64a16 6 0 0032 0"/><circle cx="80" cy="12" r="4"/>',
    'psu-calc': '<rect x="34" y="26" width="92" height="54" rx="6"/><circle cx="62" cy="53" r="17"/><path d="M62 36l-8 22h10l-4 14 14-22H62z" /><path d="M92 40h24M92 52h24M92 64h24" opacity=".6"/><path d="M34 40h-14M34 66h-14"/>',
    'ups-calc': '<rect x="24" y="30" width="100" height="48" rx="7"/><rect x="124" y="46" width="12" height="16" rx="3"/><rect x="32" y="38" width="20" height="32" rx="2" /><rect x="58" y="38" width="20" height="32" rx="2"/><rect x="84" y="38" width="20" height="32" rx="2" opacity=".5"/><path d="M96 12l-10 12h12l-8 12" />',
    'upgrade-advisor': '<rect x="38" y="44" width="44" height="44" rx="5"/><path d="M48 44v-8M60 44v-8M72 44v-8M48 88v8M60 88v8M72 88v8"/><path d="M104 84V30M88 46l16-18 16 18"/><path d="M122 62h18M122 76h26" opacity=".6"/>',
    'power-calc': '<path d="M84 8l-30 44h24l-10 40 40-54H88z"/><path d="M24 72a42 42 0 0112-44M136 72a42 42 0 00-12-44" opacity=".6"/><path d="M20 90h32M108 90h32" opacity=".6"/>'
  };
  ART.ready = '<rect x="46" y="14" width="56" height="74" rx="6"/><rect x="54" y="24" width="40" height="26" rx="3" opacity=".7"/><circle cx="74" cy="68" r="9"/><path d="M69 68l4 4 7-8"/><path d="M114 26h26M114 46h20M114 66h28" opacity=".6"/>';
  ART.tools = '<circle cx="62" cy="52" r="16"/><path d="M62 28v8M62 68v8M38 52h8M78 52h8M45 35l6 6M73 63l6 6M45 69l6-6M73 41l6-6"/><path d="M104 80l26-26a14 14 0 10-10-10L94 70z"/>';
  ART.builds = '<path d="M40 22h38l8 10h34v52H40z"/><path d="M40 44h80" opacity=".6"/><path d="M104 14v22l-8-6-8 6V14z"/>';
  ART.trust = '<path d="M80 10l34 12v26c0 22-14 38-34 46-20-8-34-24-34-46V22z"/><circle cx="80" cy="44" r="4"/><path d="M80 52v16"/><path d="M12 38h20M128 38h20M12 54h14M134 54h14" opacity=".6"/>';
  ART.budget = ART.budget;
  var ART_COL = { ready: '#ff2d4b', tools: '#ffb224', builds: '#ff5d73', trust: '#7dff8a', parts: '#ff2d4b', builder: '#ff2d4b', cart: '#ff5d73', compat: '#7dff8a', budget: '#ffb224', compare: '#8fb3ff', 'psu-calc': '#ffb224', 'ups-calc': '#7dff8a', 'upgrade-advisor': '#7dff8a', 'power-calc': '#ffb224' };
  function toolArt(id) { return ART[id] ? '<svg class="tart" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ART[id] + '</svg>' : ''; }

  VIEWS.home = {
    html: function () {
      var cards = [
        ['parts', L('القطع والأسعار', 'Parts & prices'), 'ابحث عن أي قطعة وقارن سعرها بين المتاجر.', 'Search any part and compare its price across stores.'],
        ['cart', L('سلة المشتريات', 'Cart'), 'اجمع القطع من أكثر من متجر وانتقل لموقع كل متجر للشراء.', 'Collect parts from several stores and go to each store to buy.'],
        ['compat', L('فحص التوافق', 'Compatibility Checker'), 'سوكيت، رام، أبعاد، وطاقة، مع سبب كل نتيجة ودرجة الثقة.', 'Socket, RAM, size and power with the reason and confidence for each result.']
      ];
      var catChips = C.CATS.map(function (c) { return '<button class="chip" data-act="qcat" data-cat="' + c.key + '">' + T(c) + '</button>'; }).join('');
      var samples = homeSamples().map(function (s) {
        if (!s.r) return '';
        var p = C.resolve(s.r.ids);
        return '<div class="card stack-s"><div class="row between"><h3>' + L('ميزانية ', 'Budget ') + fmt(s.budget) + '</h3>' + smp() + '</div><p class="small muted">' + L('ألعاب 1080p', '1080p gaming') + '</p><ul class="parts-list"><li><span>' + esc(pname(p.cpu)) + '</span></li><li><span>' + esc(pname(p.gpu)) + '</span></li><li><span>' + p.ram.gb + 'GB ' + p.ram.type + '</span></li></ul><div class="row between"><b>' + money(s.r.total) + '</b><button class="btn sm" data-act="open-build" data-b="' + C.encodeBuild(s.r.ids) + '">' + L('افتح في Builder', 'Open in Builder') + '</button></div></div>';
      }).join('');
      return '<div class="stack">' +
        '<section class="hero stack-s"><div class="kicker">BUILD SMARTER · SPEND LESS · GAME BETTER</div><h1>' + L('شنو تريد تشتري؟ ومنين الأرخص؟', 'What do you want to buy, and where is it cheapest?') + '</h1>' +
        '<p class="lead">' + L('ابحث عن معالج أو كرت شاشة أو أي قطعة، وشوف أي متجر عنده وبأي سعر، ثم أضفها للسلة.', 'Search a CPU, GPU or any part, see which stores have it and at what price, then add it to your cart.') + '</p>' +
        '<div class="searchbox"><input type="text" id="h-q" enterkeyhint="search" autocomplete="off" placeholder="' + L('مثال: Ryzen 5 أو RTX 4060…', 'e.g. Ryzen 5 or RTX 4060…') + '" aria-label="' + L('بحث عن قطعة', 'Search a part') + '"><button class="btn pri" data-act="q-search">' + L('ابحث', 'Search') + '</button></div>' +
        '<div class="chips">' + catChips + '</div></section>' +
        adSlot('home') + '<section class="card stack-s"><h2>' + L('ابدأ بميزانيتك', 'Start with your budget') + '</h2>' +
        '<div class="grid c2"><label class="f" for="h-amount">' + L('الميزانية (دينار عراقي)', 'Budget (IQD)') + '<input type="number" id="h-amount" inputmode="numeric" min="300000" step="50000" value="' + S.budget.amount + '"></label>' +
        '<label class="f" for="h-usage">' + L('الاستخدام', 'Use') + '<select id="h-usage">' + Object.keys(C.USAGE).map(function (k) { return '<option value="' + k + '"' + (S.budget.usage === k ? ' selected' : '') + '>' + T(C.USAGE[k]) + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="row"><button class="btn pri" data-act="home-go">' + L('اقترح تجميعات', 'Suggest builds') + '</button><a class="btn" href="#builder">' + L('ابدأ تجميعتك بنفسك', 'Build it yourself') + '</a></div></section>' +
        '<section class="stack-s"><div class="hdr-sec"><h2>' + L('كل الأقسام', 'Everything') + '</h2></div><div class="grid c3">' + cards.map(function (c) {
          return '<a class="card toolcard art" href="#' + c[0] + '" style="--tc:' + (ART_COL[c[0]] || '#ff2d4b') + '">' + toolArt(c[0]) + '<h3>' + c[1] + '</h3><p>' + L(c[2], c[3]) + '</p></a>';
        }).join('') + '</div></section>' +
        '<section class="stack-s"><div class="hdr-sec"><h2>' + L('تجميعات مقترحة من القواعد', 'Rule-based suggested builds') + '</h2></div><div class="grid c3">' + samples + '</div><p class="small muted">' + L('مولّدة من قواعد الميزانية على بيانات تجريبية، وليست عروض محلات.', 'Generated by the budget rules on sample data, not store offers.') + '</p></section>' +
        '</div>';
    }
  };

  // 3D view + build dashboard
  var CATCOL = { cpu: '#d9dde6', mobo: '#2a6b4f', ram: '#35e0a1', gpu: '#ff2d4b', storage: '#8fb3ff', psu: '#ffb224', case: '#8a8f9c', cooler: '#6b7280' };
  function viewer3dHtml(parts) {
    var items = window.RigLab3D ? window.RigLab3D.layout(parts) : [], bad = [];
    items.forEach(function (it) { if (it.bad) bad.push(it.key); });
    var msg = { gpu: L('كرت الشاشة أطول من الكيس المختار.', 'The GPU is longer than the chosen case.'), cooler: L('المبرد أعلى مما يسمح به الكيس.', 'The cooler is taller than the case allows.') };
    var legend = C.CATS.map(function (c) { return '<span class="lg"><i style="background:' + (CATCOL[c.key] || '#888') + '"></i>' + T(c) + '</span>'; }).join('');
    return '<section class="card stack-s"><div class="row between"><h2>' + L('تجميعتك بالـ 3D', 'Your build in 3D') + '</h2><div class="row"><button class="btn sm" data-act="rot3d" data-d="-0.5" aria-label="' + L('تدوير يميناً', 'Rotate right') + '">⟲</button><button class="btn sm" data-act="rot3d" data-d="0.5" aria-label="' + L('تدوير يساراً', 'Rotate left') + '">⟳</button><button class="btn sm" data-act="zoom3d" data-f="1.25" aria-label="' + L('تكبير', 'Zoom in') + '">＋</button><button class="btn sm" data-act="zoom3d" data-f="0.8" aria-label="' + L('تصغير', 'Zoom out') + '">－</button><button class="btn sm" data-act="auto3d" aria-label="' + L('دوران تلقائي', 'Auto-rotate') + '">▶</button></div></div>' +
      '<canvas id="rig3d" class="rig3d" role="img" aria-label="' + L('مجسم ثلاثي الأبعاد للتجميعة', '3D model of the build') + '"></canvas>' +
      '<div class="small muted">' + L('اسحب للتدوير · قرصة أو عجلة الماوس أو ＋ － للزوم · نقرتين للرجوع', 'Drag to rotate · pinch, wheel or ＋ － to zoom · double-tap to reset') + '</div><div class="legend">' + legend + '</div>' +
      (bad.length ? bad.map(function (k) { return '<div class="note warn">' + msg[k] + '</div>'; }).join('') : '') +
      '<p class="small muted">' + L('اسحب لتدوير الجهاز. الأبعاد من مواصفات الكتالوج (طول الكرت، ارتفاع المبرد، حجم الكيس)، والشكل العام تقريبي وليس موديلاً بعينه. الخطوط المتقطعة = قطعة لم تُختر بعد.', 'Drag to rotate. Sizes come from catalog specs (GPU length, cooler height, case size); the look is generic, not a specific model. Dashed outline = part not chosen yet.') + '</p></section>';
  }
  // Iraqi-summer cooling margin: editorial rule of thumb (cooler rating / CPU TDP), NOT a thermal measurement.
  function heatNote(parts) {
    var cpu = parts.cpu, cl = parts.cooler; if (!cpu) return '';
    var head = '<div class="stack-s"><h3>' + L('هامش التبريد لصيف العراق', 'Cooling margin for Iraqi summers') + '</h3>';
    var foot = '<p class="small muted">' + L('قاعدة تحريرية للتوجيه وليست قياس حرارة: نسبة قدرة المبرد المعلنة إلى TDP المعالج. الغرف الحارة تقلل الهامش، والهواء داخل الكيس وجودة المعجون يغيّران النتيجة.', 'An editorial rule of thumb, not a thermal measurement: advertised cooler rating ÷ CPU TDP. Hot rooms shrink the margin; case airflow and paste quality change the result.') + '</p></div>';
    if (!cl || !cl.tdpRating) return head + '<div class="note">' + (cl ? L('قدرة هذا المبرد غير معروفة بالكتالوج، فلا نحكم.', 'This cooler\'s rating is not in the catalog, so we do not judge.') : (cpu.stockCooler ? L('تستخدم مبرد الصندوق الخاص بالمعالج: مقبول للاستخدام الخفيف، لكن قدرته غير معروفة هنا. للألعاب الطويلة بالصيف يُفضّل مبرد برج.', 'You would use the CPU\'s box cooler: fine for light use but its rating is unknown here. For long summer gaming sessions a tower cooler is better.') : L('هذا المعالج بدون مبرد صندوق: أضف مبرداً.', 'This CPU has no box cooler: add one.'))) + '</div>' + foot;
    var ratio = cl.tdpRating / cpu.tdp, st = ratio >= 1.5 ? 'ok' : (ratio >= 1.2 ? 'warn' : 'error');
    var txt = st === 'ok' ? L('هامش جيد.', 'Comfortable margin.') : (st === 'warn' ? L('هامش ضيق: ممكن يسخن بالصيف وقت الأحمال الطويلة.', 'Tight margin: may run hot in summer under long loads.') : L('هامش قليل جداً: اختر مبرداً أقوى.', 'Very thin margin: pick a stronger cooler.'));
    return head + '<div class="row">' + sb(st) + '<span>' + txt + '</span><span class="mono small muted">' + cl.tdpRating + 'W / ' + cpu.tdp + 'W = ' + ratio.toFixed(2) + '×</span></div>' + foot;
  }
  function dashHtml(parts) {
    var total = C.buildTotal(parts), e = C.estimatePower(parts), pw = parts.psu ? parts.psu.watts : 0;
    var seg = C.CATS.filter(function (c) { return parts[c.key]; }).map(function (c) { var pr = C.priceOf(parts[c.key]); return { c: c, pr: pr, pct: total ? pr / total * 100 : 0 }; });
    var amps = e.total / 220, minVA = Math.ceil(e.total / 0.6 / 50) * 50;
    if (!seg.length) return '';
    return '<section class="card stack-s"><h2>' + L('لوحة التجميعة', 'Build dashboard') + '</h2>' +
      '<div class="costbar" role="img" aria-label="' + L('توزيع التكلفة', 'Cost split') + '">' + seg.map(function (x) { return '<span style="width:' + x.pct.toFixed(1) + '%;background:' + (CATCOL[x.c.key] || '#888') + '" title="' + T(x.c) + ' ' + x.pct.toFixed(0) + '%"></span>'; }).join('') + '</div>' +
      '<div class="small muted">' + seg.map(function (x) { return T(x.c) + ' ' + x.pct.toFixed(0) + '%'; }).join(' · ') + '</div>' +
      (e.complete ? '<div class="grid c3"><div class="stack-s"><div class="muted small">' + L('استهلاك تقديري', 'Estimated draw') + '</div><div class="big" style="font-size:1.4rem">' + e.total + ' W</div>' + (pw ? '<div class="small muted">' + L('من مزود ', 'of a ') + pw + 'W PSU · ' + Math.round(e.total / pw * 100) + '%</div>' : '') + '</div>' +
        '<div class="stack-s"><div class="muted small">' + L('أمبيرات المولدة', 'Generator amps') + '</div><div class="big" style="font-size:1.4rem">' + amps.toFixed(1) + ' A</div><div class="small muted">' + L('تقريبي عند 220V', 'approx. at 220V') + '</div></div>' +
        '<div class="stack-s"><div class="muted small">' + L('أقل UPS مقترح', 'Minimum UPS') + '</div><div class="big" style="font-size:1.4rem">' + minVA + ' VA</div><div class="small muted">' + L('معامل قدرة 0.6 (تقدير)', 'power factor 0.6 (estimate)') + '</div></div></div>' : '<div class="note">' + L('أضف المعالج وكرت الشاشة لحساب الاستهلاك والأمبيرات.', 'Add a CPU and GPU to estimate draw and amps.') + '</div>') + heatNote(parts) + '</section>';
  }

  // Builder
  VIEWS.builder = {
    bind: function () {
      var cv = $('rig3d'); if (!cv || !window.RigLab3D) return; cv.dataset.gl = '1';
      var R3 = window.RigLab3D, parts = C.resolve(S.build), gl = null;
      try { gl = R3.createGL && !/[?&]flat3d/.test(location.search) ? R3.createGL(cv) : null; if (gl) gl.setParts(parts); } catch (e) { gl = null; }
      if (gl) { S.v3 = gl; return; }
      if (cv.dataset.gl) { var c2 = cv.cloneNode(false); c2.dataset.gl = ''; cv.parentNode.replaceChild(c2, cv); cv = c2; }
      try { S.v3 = R3.create(cv); S.v3.setParts(parts); } catch (e) { cv.style.display = 'none'; }
    },
    html: function () {
      var parts = C.resolve(S.build), res = C.checkCompat(parts), total = C.buildTotal(parts);
      var slots = C.CATS.map(function (c) {
        var p = parts[c.key];
        if (p) return '<div class="slot filled"><button class="body" data-act="pick" data-cat="' + c.key + '" data-target="build"><span class="lbl">' + T(c).toUpperCase() + '</span><span class="nm">' + esc(pname(p)) + '</span><span class="sp mono">' + C.shortSpec(p) + '</span><span class="pr">' + fmt(C.priceOf(p)) + ' ' + unit() + '</span></button><button class="x" data-act="clear-slot" data-cat="' + c.key + '" data-target="build" aria-label="' + L('إزالة', 'Remove') + '">✕</button></div>';
        return '<div class="slot"><button class="body" data-act="pick" data-cat="' + c.key + '" data-target="build"><span class="lbl">' + T(c).toUpperCase() + (c.required ? '' : ' · ' + L('اختياري', 'optional')) + '</span><span class="add">+ ' + L('اختر', 'Choose') + ' ' + T(c) + '</span></button></div>';
      }).join('');
      var has = Object.keys(S.build).length > 0;
      return '<div class="stack"><div class="stack-s"><h1>PC Builder</h1><p class="muted">' + L('اختر القطع بأي ترتيب. الفحص والسعر يتحدثان فوراً.', 'Pick parts in any order. Compatibility and total update instantly.') + '</p><div class="note">' + T(C.NOTICE) + '</div></div>' +
        viewer3dHtml(parts) + dashHtml(parts) + '<div class="slots">' + slots + '</div>' +
        '<section class="stack-s"><h2>' + L('نتيجة الفحص', 'Compatibility result') + '</h2>' + compatPanel(parts) + powerLine(parts) + '</section>' + adSlot('builder') +
        '<div class="row"><button class="btn pri" data-act="cart-from-build"' + (has ? '' : ' disabled') + '>' + L('أضف قطع التجميعة للسلة (الأرخص)', 'Add build parts to cart (cheapest)') + '</button><a class="btn" href="#cart">' + L('السلة', 'Cart') + (cartCount() ? ' (' + cartCount() + ')' : '') + '</a>' +
        '<button class="btn ghost" data-act="sheet" data-type="import">' + L('استيراد كود', 'Import code') + '</button>' +
        (has ? '<button class="btn ghost" data-act="clear-build">' + L('مسح التجميعة', 'Clear build') + '</button>' : '') + '</div></div>' +
        '<div class="fixbar"><div class="in"><div class="total"><span class="n">' + fmt(total) + '</span><span class="u">' + unit() + ' · ' + L('أسعار تجريبية', 'sample prices') + '</span></div><div class="row">' + vb(res.verdict) +
        '<button class="btn sm" data-act="sheet" data-type="save"' + (has ? '' : ' disabled') + '>' + L('حفظ', 'Save') + '</button>' +
        '<button class="btn sm pri" data-act="sheet" data-type="share"' + (has ? '' : ' disabled') + '>' + L('مشاركة', 'Share') + '</button></div></div></div>';
    }
  };

  // Compatibility checker (own scratch build)
  VIEWS.compat = {
    html: function () {
      var b = S.compatBuild;
      var sels = C.CATS.map(function (c) {
        return '<label class="f" for="cs-' + c.key + '">' + T(c) + '<select id="cs-' + c.key + '" data-cat="' + c.key + '"><option value="">— ' + L('بدون', 'none') + ' —</option>' +
          C.partsOf(c.key).map(function (p) { return '<option value="' + p.id + '"' + (b[c.key] === p.id ? ' selected' : '') + '>' + esc(pname(p)) + '</option>'; }).join('') + '</select></label>';
      }).join('');
      return '<div class="stack"><div class="stack-s"><h1>' + L('فحص التوافق', 'Compatibility Checker') + '</h1><p class="muted">' + L('نتائجنا مبنية على مواصفات منظّمة. عند نقص البيانات نقول «غير مؤكد» ولا نقول «متوافق 100%».', 'Results come from structured specs. When data is missing we say "unconfirmed", never "100% compatible".') + '</p></div>' +
        '<section class="stack-s"><h3>' + L('أمثلة جاهزة للتجربة', 'Try an example') + '</h3><div class="chips">' + EXAMPLES.map(function (x, i) { return '<button class="chip" data-act="compat-example" data-i="' + i + '">' + L(x.ar, x.en) + '</button>'; }).join('') + '</div></section>' +
        '<div class="grid c2">' + sels + '</div>' +
        '<div class="row"><button class="btn" data-act="compat-current">' + L('حمّل تجميعة Builder', 'Load Builder build') + '</button><button class="btn" data-act="compat-to-builder">' + L('انقلها إلى Builder', 'Send to Builder') + '</button></div>' +
        '<section class="stack-s"><h2>' + L('النتيجة', 'Result') + '</h2><div id="compat-out"></div></section>' + adSlot('compat') + '</div>';
    },
    bind: function () { this.refresh(); },
    refresh: function () { var parts = C.resolve(S.compatBuild); $('compat-out').innerHTML = compatPanel(parts) + powerLine(parts); },
    input: function (e) {
      var c = e.target.getAttribute('data-cat'); if (!c) return;
      if (e.target.value) S.compatBuild[c] = e.target.value; else delete S.compatBuild[c];
      this.refresh();
    }
  };

  // Smart budget
  function runBudget() { return C.suggestBuilds({ budget: S.budget.amount, usage: S.budget.usage }); }
  VIEWS.budget = {
    html: function () {
      if (!S.budgetResult) S.budgetResult = runBudget();
      var br = S.budgetResult, usage = C.USAGE[br.usage];
      var presets = [800000, 1000000, 1500000, 1800000, 2500000].map(function (v) { return '<button class="chip" data-act="preset" data-v="' + v + '">' + fmt(v) + '</button>'; }).join('');
      var usages = Object.keys(C.USAGE).map(function (k) { return '<button class="chip" data-act="usage" data-v="' + k + '" aria-pressed="' + (S.budget.usage === k) + '">' + T(C.USAGE[k]) + '</button>'; }).join('');
      var cards = br.results.map(function (r, i) {
        var parts = C.resolve(r.ids), lines = [];
        lines.push(L('كرت الشاشة ' + Math.round((r.shares.gpu || 0) * 100) + '% من التكلفة والمعالج ' + Math.round((r.shares.cpu || 0) * 100) + '%.', 'GPU is ' + Math.round((r.shares.gpu || 0) * 100) + '% of the cost and CPU ' + Math.round((r.shares.cpu || 0) * 100) + '%.'));
        if (br.usage === 'editing') lines.push(L('رام ' + parts.ram.gb + 'GB وتخزين ' + (parts.storage.gb / 1000) + 'TB حسب شرط المونتاج.', parts.ram.gb + 'GB RAM and ' + (parts.storage.gb / 1000) + 'TB storage per the editing rule.'));
        if (br.usage === 'competitive') lines.push(L('أولوية للمعالج لأن الألعاب التنافسية تعتمد على سرعة الإطارات العالية.', 'CPU is prioritised because competitive games depend on high frame rates.'));
        if (br.usage === '1440p') lines.push(L('شرط 1440p: كرت شاشة من الفئة الأقوى فقط.', '1440p rule: only the stronger GPU tier is considered.'));
        lines.push(L('بقي من الميزانية ' + moneyT(r.remaining) + '.', moneyT(r.remaining) + ' of the budget is left.'));
        return '<div class="card stack-s"><div class="row between"><h3>' + L('الخيار ', 'Option ') + (i + 1) + '</h3><div class="row">' + vb('ok') + smp() + '</div></div>' + partsList(r.ids) +
          '<div class="row between"><b>' + L('المجموع', 'Total') + '</b><b>' + money(r.total) + '</b></div><ul class="small muted" style="margin:0;padding-inline-start:18px">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
          '<div class="row"><button class="btn pri" data-act="open-build" data-b="' + C.encodeBuild(r.ids) + '">' + L('افتح في Builder (يستبدل تجميعتك الحالية)', 'Open in Builder (replaces your current build)') + '</button></div></div>';
      }).join('');
      var empty = '';
      if (!br.results.length) empty = '<div class="note warn">' + L('لا توجد تجميعة متوافقة ضمن هذه الميزانية في الكتالوج التجريبي.', 'No compatible build fits this budget in the sample catalog.') + (br.minTotal ? ' ' + L('أقل تجميعة متوافقة تكلّف ' + moneyT(br.minTotal) + ' تقريباً.', 'The cheapest compatible build costs about ' + moneyT(br.minTotal) + '.') : '') + '</div>';
      return '<div class="stack"><div class="stack-s"><h1>' + L('الميزانية الذكية', 'Smart Budget') + '</h1><p class="muted">' + L('نسخة قواعد مبسطة: نبحث بين كل تجميعات الكتالوج المتوافقة ونرتبها حسب أولويات الاستخدام. لا يوجد ذكاء اصطناعي هنا.', 'Simple rules version: we search every compatible combination in the catalog and rank by usage priorities. No AI is involved.') + '</p></div>' +
        '<section class="card stack-s"><label class="f" for="b-amount">' + L('الميزانية (دينار عراقي)', 'Budget (IQD)') + '<input type="number" id="b-amount" inputmode="numeric" min="300000" step="50000" value="' + S.budget.amount + '"></label><div class="chips">' + presets + '</div>' +
        '<div class="chips">' + usages + '</div><div class="row"><button class="btn pri" data-act="budget-run">' + L('احسب', 'Calculate') + '</button></div></section>' +
        '<section class="stack-s"><h2>' + L('النتائج لـ ', 'Results for ') + moneyT(br.budget) + ' · ' + T(usage) + '</h2>' + (br.relaxed ? '<div class="note warn">' + L('الميزانية لا تحقق الشرط الخاص بهذا الاستخدام، فعرضنا أفضل ما هو متاح بدونه.', 'The budget cannot meet this use-case rule, so we show the best available without it.') + '</div>' : '') + empty + '<div class="grid c3">' + cards + '</div>' +
        '<p class="small muted">' + L('ترتيب القطع تصنيف تحريري داخلي للمقارنة بين خيارات الكتالوج فقط، وليس نتائج اختبارات أو FPS. الأسعار تجريبية.', 'Part ranking is an internal editorial ordering used only to compare catalog options. It is not benchmark or FPS data. Prices are sample data.') + '</p></section>' + adSlot('budget') + '</div>';
    },
    input: function (e) { if (e.target.id === 'b-amount') S.budget.amount = parseFloat(e.target.value) || 0; }
  };

  // Parts explorer + price comparison across stores
  var FILTER_FIELD = { cpu: 'socket', mobo: 'socket', ram: 'type', gpu: 'brand', storage: 'type', cooler: 'type' };
  function storeLabel(o) { return L(o.storeNameAr, o.storeNameEn); }
  function partMatches(p, q) {
    if (!q) return true;
    var ci = C.catInfo(p.cat) || {};
    var hay = (p.name + ' ' + (p.nameAr || '') + ' ' + C.shortSpec(p) + ' ' + (ci.ar || '') + ' ' + (ci.en || '')).toLowerCase();
    return q.split(/\s+/).every(function (t) { return !t || hay.indexOf(t) >= 0; });
  }
  function startPrice(p) { var b = C.bestOffer(p.id); return b ? b.price : C.priceOf(p) * 10; }
  function partsListHtml() {
    var f = S.pf, q = f.q.trim().toLowerCase(), ff = f.cat === 'all' ? null : FILTER_FIELD[f.cat];
    var base = f.cat === 'all' ? C.PARTS : C.partsOf(f.cat);
    var list = base.filter(function (p) {
      if (ff && f.f && p[ff] !== f.f) return false;
      if (f.fav && S.wish.indexOf(p.id) < 0) return false;
      return partMatches(p, q);
    });
    list.sort(function (a, b) {
      if (f.sort === 'price-desc') return startPrice(b) - startPrice(a);
      if (f.sort === 'name') return a.name.localeCompare(b.name);
      return startPrice(a) - startPrice(b);
    });
    if (!list.length) return '<div class="note">' + L('لا نتائج مطابقة. جرّب كلمة أقصر أو فئة «الكل».', 'No matching results. Try a shorter word or the "All" category.') + '</div>';
    var CAP = 40, more = list.length > CAP; list = list.slice(0, CAP);
    var out = list.map(function (p) {
      var open = S.expanded === p.id, offers = C.offersFor(p.id), inStock = offers.filter(function (o) { return o.available; }), best = inStock[0] || null, detail = '';
      var inCart = S.cart.filter(function (x) { return x.partId === p.id; })[0];
      if (open) {
        var rows = C.specRows(p).map(function (r) { return '<tr><th>' + L(r.ar, r.en) + '</th><td class="mono">' + esc(r.v) + '</td></tr>'; }).join('');
        var orows = offers.map(function (o) {
          var isBest = best && o.storeId === best.storeId, sel = inCart && inCart.storeId === o.storeId;
          return '<tr class="' + (isBest ? 'bestrow' : '') + '"><td>' + storeLabel(o) + (o.sponsored ? ' <span class="tag sp">' + L('برعاية', 'Sponsored') + '</span>' : '') + (isBest ? ' <span class="tag best">' + L('الأقل سعراً', 'Lowest') + '</span>' : '') + '</td><td class="num">' + fmt(o.price) + '</td><td>' + (o.available ? L('متوفر', 'In stock') : L('غير متوفر', 'Out of stock')) + '</td><td>' +
            (o.available ? '<button class="btn sm' + (sel ? '' : ' pri') + '" data-act="add-cart" data-id="' + p.id + '" data-store="' + o.storeId + '">' + (sel ? L('في السلة ✓', 'In cart ✓') : L('أضف للسلة', 'Add to cart')) + '</button>' : '—') + '</td></tr>';
        }).join('');
        detail = '<div class="stack-s" style="margin-top:12px"><div class="row"><b class="small">' + L('الأسعار حسب المتجر', 'Price by store') + '</b>' + smp() + '</div><div class="tw"><table style="min-width:440px"><thead><tr><th>' + L('المتجر', 'Store') + '</th><th class="num">' + L('السعر (د.ع)', 'Price (IQD)') + '</th><th>' + L('التوفر', 'Stock') + '</th><th></th></tr></thead><tbody>' + orows + '</tbody></table></div>' +
          '<p class="small muted">' + L('الترتيب حسب السعر فقط، والرعاية لا تغيّره. العروض تجريبية وليست أسعار محلات حقيقية.', 'Sorted by price only; sponsorship never changes it. Offers are samples, not real shop prices.') + '</p>' +
          '<details><summary>' + L('المواصفات', 'Specs') + '</summary><div class="tw"><table><tbody>' + rows + '</tbody></table></div></details></div>';
      }
      var priceBlock = best ? '<b class="mono" style="color:var(--accent)">' + fmt(best.price) + '</b> <span class="small muted">' + unit() + '</span><div class="small muted">' + storeLabel(best) + ' · ' + L(inStock.length + ' من ' + offers.length + ' متاجر', inStock.length + ' of ' + offers.length + ' stores') + '</div>' : '<span class="small muted">' + L('غير متوفر حالياً', 'Not in stock') + '</span>';
      return '<div class="card"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="small muted">' + T(C.catInfo(p.cat)) + '</div><h3 style="overflow-wrap:anywhere">' + esc(pname(p)) + '</h3><div class="small muted mono">' + C.shortSpec(p) + '</div></div><div style="text-align:end;flex:none">' + priceBlock + '<div>' + smp() + '</div></div></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="parts-toggle" data-id="' + p.id + '">' + (open ? L('إخفاء', 'Hide') : L('قارن الأسعار', 'Compare prices')) + '</button>' +
        '<button class="btn sm pri" data-act="add-cart" data-id="' + p.id + '" data-store="' + (best ? best.storeId : '') + '"' + (best ? '' : ' disabled') + '>' + (inCart ? L('في السلة ✓', 'In cart ✓') : L('أضف للسلة', 'Add to cart')) + '</button>' +
        '<button class="btn sm ghost" data-act="parts-add" data-id="' + p.id + '">' + L('للتجميعة', 'To build') + '</button><button class="btn sm ghost wishbtn' + (S.wish.indexOf(p.id) >= 0 ? ' on' : '') + '" data-act="wish" data-id="' + p.id + '" aria-pressed="' + (S.wish.indexOf(p.id) >= 0) + '" aria-label="' + L('المفضلة', 'Favourite') + '">' + (S.wish.indexOf(p.id) >= 0 ? '♥' : '♡') + '</button></div>' + detail + '</div>';
    }).join('');
    return out + (more ? '<div class="note" style="grid-column:1/-1">' + L('يعرض أول 40 نتيجة. ضيّق البحث لرؤية الباقي.', 'Showing the first 40 results. Narrow the search to see the rest.') + '</div>' : '');
  }
  VIEWS.parts = {
    html: function () {
      var f = S.pf, ff = f.cat === 'all' ? null : FILTER_FIELD[f.cat];
      var chips = '<button class="chip" data-act="parts-fav" aria-pressed="' + f.fav + '">♥ ' + L('المفضلة', 'Favourites') + ' (' + S.wish.length + ')</button><button class="chip" data-act="parts-cat" data-cat="all" aria-pressed="' + (f.cat === 'all') + '">' + L('الكل', 'All') + '</button>' + C.CATS.map(function (c) { return '<button class="chip" data-act="parts-cat" data-cat="' + c.key + '" aria-pressed="' + (f.cat === c.key) + '">' + T(c) + '</button>'; }).join('');
      var filt = '';
      if (ff) {
        var vals = []; C.partsOf(f.cat).forEach(function (p) { if (vals.indexOf(p[ff]) < 0) vals.push(p[ff]); });
        filt = '<select id="pfilt" aria-label="filter"><option value="">' + L('الكل', 'All') + '</option>' + vals.map(function (v) { return '<option value="' + esc(v) + '"' + (f.f === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select>';
      }
      return '<div class="stack"><div class="stack-s"><h1>' + L('القطع والأسعار', 'Parts & prices') + '</h1><div class="note warn">' + L('الأسعار والمتاجر هنا نماذج تجريبية. أسعار المتاجر العراقية الحقيقية تُضاف بموافقة كل متجر مع تاريخ تحديثها.', 'Prices and stores here are samples. Real Iraqi store prices are added with each store\'s consent and a last-updated date.') + '</div></div>' +
        '<div class="chips">' + chips + '</div><div class="grid c3"><input type="text" id="pq" placeholder="' + L('بحث: معالج، RTX 4060، DDR5…', 'Search: CPU, RTX 4060, DDR5…') + '" value="' + esc(f.q) + '" aria-label="' + L('بحث', 'Search') + '">' + filt +
        '<select id="psort" aria-label="sort"><option value="price-asc"' + (f.sort === 'price-asc' ? ' selected' : '') + '>' + L('الأرخص أولاً', 'Cheapest first') + '</option><option value="price-desc"' + (f.sort === 'price-desc' ? ' selected' : '') + '>' + L('الأغلى أولاً', 'Priciest first') + '</option><option value="name"' + (f.sort === 'name' ? ' selected' : '') + '>' + L('الاسم', 'Name') + '</option></select></div>' +
        adSlot('parts') + '<div class="grid c2" id="plist"></div></div>';
    },
    bind: function () { $('plist').innerHTML = partsListHtml(); },
    input: function (e) {
      if (e.target.id === 'pq') S.pf.q = e.target.value;
      else if (e.target.id === 'psort') S.pf.sort = e.target.value;
      else if (e.target.id === 'pfilt') S.pf.f = e.target.value;
      else return;
      $('plist').innerHTML = partsListHtml();
    }
  };

  // Compare
  function cmpOptions(cat, sel) { return C.partsOf(cat).map(function (p) { return '<option value="' + p.id + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(pname(p)) + '</option>'; }).join(''); }
  function buildOptions(sel) {
    var o = '<option value="current"' + (sel === 'current' ? ' selected' : '') + '>' + L('تجميعة Builder الحالية', 'Current Builder build') + '</option>';
    S.saved.forEach(function (b) { o += '<option value="' + b.id + '"' + (sel === String(b.id) ? ' selected' : '') + '>' + esc(b.name) + '</option>'; });
    return o;
  }
  function buildById(id) { if (id === 'current') return S.build; for (var i = 0; i < S.saved.length; i++) if (String(S.saved[i].id) === String(id)) return S.saved[i].parts; return {}; }
  VIEWS.compare = {
    html: function () {
      var c = S.cmp, body = '';
      if (c.mode === 'parts') {
        var A = C.getPart(c.a), B = C.getPart(c.b);
        if (A && B && A.cat !== c.cat) A = null;
        var ra = A ? C.specRows(A) : [], rb = B ? C.specRows(B) : [], rows = '';
        ra.forEach(function (r, i) {
          var o = rb[i], diff = o && o.v !== r.v;
          rows += '<tr><th>' + L(r.ar, r.en) + '</th><td class="' + (diff ? 'diff' : '') + ' mono">' + esc(r.v) + '</td><td class="' + (diff ? 'diff' : '') + ' mono">' + (o ? esc(o.v) : '—') + '</td></tr>';
        });
        if (A && B) {
          var pa = C.priceOf(A), pb = C.priceOf(B);
          rows += '<tr><th>' + L('السعر (تجريبي)', 'Price (sample)') + '</th><td class="mono ' + (pa < pb ? 'diff' : '') + '">' + fmt(pa) + '</td><td class="mono ' + (pb < pa ? 'diff' : '') + '">' + fmt(pb) + '</td></tr>';
        }
        body = '<div class="grid c3"><label class="f" for="c-cat">' + L('الفئة', 'Category') + '<select id="c-cat">' + C.CATS.map(function (x) { return '<option value="' + x.key + '"' + (c.cat === x.key ? ' selected' : '') + '>' + T(x) + '</option>'; }).join('') + '</select></label>' +
          '<label class="f" for="c-a">A<select id="c-a">' + cmpOptions(c.cat, c.a) + '</select></label><label class="f" for="c-b">B<select id="c-b">' + cmpOptions(c.cat, c.b) + '</select></label></div>' +
          '<div class="tw"><table><thead><tr><th></th><th>' + (A ? esc(pname(A)) : '—') + '</th><th>' + (B ? esc(pname(B)) : '—') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="small muted">' + L('التظليل يعني اختلافاً في القيمة (وليس أفضلية). لا نعرض FPS أو Benchmarks لأنها غير متوفرة بعد.', 'Shading marks a differing value, not a winner. No FPS or benchmarks are shown because none are available yet.') + '</p>';
      } else {
        var ba = buildById(c.ba), bb = buildById(c.bb || (S.saved[0] ? S.saved[0].id : 'current'));
        var pA = C.resolve(ba), pB = C.resolve(bb), rA = C.checkCompat(pA), rB = C.checkCompat(pB), eA = C.estimatePower(pA), eB = C.estimatePower(pB), rows2 = '';
        C.CATS.forEach(function (x) {
          var a = pA[x.key], b = pB[x.key], diff = (a && a.id) !== (b && b.id);
          rows2 += '<tr><th>' + T(x) + '</th><td class="' + (diff ? 'diff' : '') + '">' + (a ? esc(pname(a)) : '—') + '</td><td class="' + (diff ? 'diff' : '') + '">' + (b ? esc(pname(b)) : '—') + '</td></tr>';
        });
        var tA = C.buildTotal(pA), tB = C.buildTotal(pB);
        rows2 += '<tr><th>' + L('المجموع (تجريبي)', 'Total (sample)') + '</th><td class="mono ' + (tA < tB ? 'diff' : '') + '">' + fmt(tA) + '</td><td class="mono ' + (tB < tA ? 'diff' : '') + '">' + fmt(tB) + '</td></tr>' +
          '<tr><th>' + L('استهلاك تقديري', 'Est. draw') + '</th><td class="mono">' + eA.total + ' W</td><td class="mono">' + eB.total + ' W</td></tr>' +
          '<tr><th>' + L('الحالة', 'Status') + '</th><td>' + vb(rA.verdict) + '</td><td>' + vb(rB.verdict) + '</td></tr>';
        body = '<div class="grid c2"><label class="f" for="cb-a">A<select id="cb-a">' + buildOptions(c.ba) + '</select></label><label class="f" for="cb-b">B<select id="cb-b">' + buildOptions(c.bb || (S.saved[0] ? String(S.saved[0].id) : 'current')) + '</select></label></div><div class="tw"><table><thead><tr><th></th><th>A</th><th>B</th></tr></thead><tbody>' + rows2 + '</tbody></table></div>' +
          (S.saved.length ? '' : '<div class="note">' + L('احفظ تجميعة من Builder لتقارنها هنا.', 'Save a build from Builder to compare it here.') + '</div>');
      }
      return '<div class="stack"><h1>' + L('مقارنة', 'Compare') + '</h1><div class="chips"><button class="chip" data-act="cmp-mode" data-v="parts" aria-pressed="' + (c.mode === 'parts') + '">' + L('قطعتان', 'Two parts') + '</button><button class="chip" data-act="cmp-mode" data-v="builds" aria-pressed="' + (c.mode === 'builds') + '">' + L('تجميعتان', 'Two builds') + '</button></div>' + body + adSlot('compare') + '</div>';
    },
    input: function (e) {
      var c = S.cmp, id = e.target.id;
      if (id === 'c-cat') { c.cat = e.target.value; var l = C.partsOf(c.cat); c.a = l[0].id; c.b = (l[1] || l[0]).id; }
      else if (id === 'c-a') c.a = e.target.value;
      else if (id === 'c-b') c.b = e.target.value;
      else if (id === 'cb-a') c.ba = e.target.value;
      else if (id === 'cb-b') c.bb = e.target.value;
      else return;
      render();
    }
  };

  // Tools
  var TOOL_TABS = [['psu', 'PSU', 'PSU'], ['ups', 'UPS', 'UPS'], ['upgrade', 'Upgrade Advisor', 'Upgrade Advisor'], ['monitor', 'Monitor Selector', 'Monitor Selector'], ['storage', 'Storage', 'Storage'], ['power', 'المولدة والكهرباء', 'Power cost']];
  function selOpts(cat, blank) { return (blank ? '<option value="">— ' + blank + ' —</option>' : '') + C.partsOf(cat).map(function (p) { return '<option value="' + p.id + '">' + esc(pname(p)) + '</option>'; }).join(''); }
  var TOOLS = {
    psu: {
      html: function () {
        return '<div class="grid c2"><label class="f" for="psu-cpu">' + L('اختر معالجاً (يملأ القدرة)', 'Pick a CPU (fills wattage)') + '<select id="psu-cpu">' + selOpts('cpu', L('يدوي', 'manual')) + '</select></label>' +
          '<label class="f" for="psu-gpu">' + L('اختر كرت شاشة', 'Pick a GPU') + '<select id="psu-gpu">' + selOpts('gpu', L('يدوي', 'manual')) + '</select></label>' +
          '<label class="f" for="psu-cw">' + L('قدرة المعالج عند الذروة (W)', 'CPU peak power (W)') + '<input type="number" id="psu-cw" value="140" min="0"></label>' +
          '<label class="f" for="psu-gw">' + L('قدرة كرت الشاشة (W)', 'GPU board power (W)') + '<input type="number" id="psu-gw" value="200" min="0"></label>' +
          '<label class="f" for="psu-ow">' + L('بقية الجهاز (W): لوحة، رام، مراوح، أقراص', 'Rest of system (W): board, RAM, fans, drives') + '<input type="number" id="psu-ow" value="85" min="0"></label>' +
          '<label class="f" for="psu-h">' + L('هامش الأمان', 'Safety headroom') + ': <span id="psu-hv" class="mono">30%</span><input type="range" id="psu-h" min="10" max="50" step="5" value="30"></label></div>' +
          '<div class="row"><button class="btn" data-act="psu-use-build">' + L('استخدم تجميعتي', 'Use my build') + '</button></div><div id="tool-out"></div>';
      },
      calc: function () {
        var h = num('psu-h', 30); $('psu-hv').textContent = h + '%';
        var cw = num('psu-cw', 0), gw = num('psu-gw', 0), ow = num('psu-ow', 0);
        var r = C.psuFromLoad(cw + gw + ow, h / 100);
        $('tool-out').innerHTML = '<div class="card stack-s"><div class="muted small">' + L('مزود الطاقة الموصى به (تقريبي)', 'Recommended PSU (approximate)') + '</div><div class="big">' + r.recommended + ' W</div>' +
          '<dl class="kv"><dt>' + L('الحمل التقديري', 'Estimated load') + '</dt><dd>' + r.total + ' W</dd><dt>' + L('المعادلة', 'Formula') + '</dt><dd>(' + cw + ' + ' + gw + ' + ' + ow + ') × ' + (1 + h / 100).toFixed(2) + ' → ' + L('أقرب 50W', 'next 50W') + '</dd></dl>' +
          '<div class="note">' + L('هذا تقدير وليس ضماناً. جودة المزود (الشهادة والمصنّع) أهم من الواط وحده، والاستهلاك الفعلي يتغير حسب الألعاب والإعدادات.', 'This is an estimate, not a guarantee. PSU quality (certification and make) matters as much as watts, and real draw varies by game and settings.') + '</div></div>';
      },
      input: function (e) {
        if (e.target.id === 'psu-cpu' && e.target.value) $('psu-cw').value = C.getPart(e.target.value).peakW;
        if (e.target.id === 'psu-gpu' && e.target.value) $('psu-gw').value = C.getPart(e.target.value).tdp;
        this.calc();
      }
    },
    ups: {
      html: function () {
        return '<div class="grid c2"><label class="f" for="u-load">' + L('حمل الجهاز (W)', 'System load (W)') + '<input type="number" id="u-load" value="300" min="1"></label>' +
          '<label class="f" for="u-va">' + L('قدرة UPS المعلنة (VA) (اختياري)', 'UPS rated VA (optional)') + '<input type="number" id="u-va" value="1000" min="0"></label>' +
          '<label class="f" for="u-pf">' + L('معامل القدرة (W/VA)', 'Power factor (W/VA)') + '<input type="number" id="u-pf" value="0.6" min="0.3" max="1" step="0.05"></label>' +
          '<label class="f" for="u-v">' + L('جهد البطارية (V)', 'Battery voltage (V)') + '<input type="number" id="u-v" value="12" min="1"></label>' +
          '<label class="f" for="u-ah">' + L('سعة البطارية (Ah)', 'Battery capacity (Ah)') + '<input type="number" id="u-ah" value="9" min="1"></label>' +
          '<label class="f" for="u-n">' + L('عدد البطاريات', 'Battery count') + '<input type="number" id="u-n" value="2" min="1"></label>' +
          '<label class="f" for="u-eff">' + L('كفاءة المحوّل %', 'Inverter efficiency %') + '<input type="number" id="u-eff" value="85" min="50" max="100"></label>' +
          '<label class="f" for="u-use">' + L('نسبة الطاقة القابلة للاستخدام فعلياً %', 'Usable energy share %') + '<input type="number" id="u-use" value="50" min="10" max="100"></label></div>' +
          '<div class="row"><button class="btn" data-act="ups-use-build">' + L('خذ الحمل من تقدير تجميعتي', 'Take load from my build estimate') + '</button></div><div id="tool-out"></div>';
      },
      calc: function () {
        var r = C.upsEstimate({ loadW: num('u-load', 300), ratedVA: num('u-va', 0), powerFactor: num('u-pf', 0.6), batteryV: num('u-v', 12), batteryAh: num('u-ah', 9), batteryCount: num('u-n', 2), inverterEff: num('u-eff', 85) / 100, usablePct: num('u-use', 50) / 100 });
        var fit = r.ratedW != null ? (r.fitsLoad ? sb('ok') + ' ' + L('الحمل ضمن قدرة UPS (' + Math.round(r.ratedW) + ' W)', 'Load is within UPS capacity (' + Math.round(r.ratedW) + ' W)') : sb('error') + ' ' + L('الحمل يتجاوز قدرة UPS (' + Math.round(r.ratedW) + ' W)', 'Load exceeds UPS capacity (' + Math.round(r.ratedW) + ' W)')) : '';
        $('tool-out').innerHTML = '<div class="grid c2"><div class="card stack-s"><div class="muted small">' + L('زمن التشغيل التقريبي (سقف تقديري)', 'Approx. runtime (upper estimate)') + '</div><div class="big">' + r.runtimeMin.toFixed(0) + ' ' + L('دقيقة', 'min') + '</div><div class="small muted">' + L('الطاقة القابلة للاستخدام: ', 'Usable energy: ') + '<span class="mono">' + r.usableWh.toFixed(0) + ' Wh</span></div></div>' +
          '<div class="card stack-s"><div class="muted small">' + L('أقل قدرة UPS موصى بها', 'Minimum recommended UPS rating') + '</div><div class="big">' + r.minRatedVA + ' VA</div><div class="small">' + fit + '</div></div></div>' +
          '<div class="note">' + L('الافتراضات ظاهرة أعلاه وقابلة للتعديل. الزمن الفعلي يقل مع تقادم البطاريات والأحمال العالية. UPS مناسب لإطفاء الجهاز بأمان وليس لتشغيل طويل. مزودات الطاقة ذات PFC النشط تعمل غالباً بشكل أفضل مع UPS موجة جيبية نقية، فراجع دليل المصنّع.', 'Assumptions are shown above and editable. Real runtime drops with battery age and heavy loads. A UPS is for shutting down safely, not long runtime. PSUs with active PFC usually behave better on pure sine wave UPS units; check the manufacturer guide.') + '</div>';
      },
      input: function () { this.calc(); }
    },
    upgrade: {
      html: function () {
        return '<div class="note">' + L('نسخة مبسطة: تقترح قطعاً من الكتالوج التجريبي وتفحص القدرة والطول. ما تدّعي معرفة «عنق الزجاجة».', 'Simplified version: suggests parts from the sample catalog and checks power and length. It does not claim to know your "bottleneck".') + '</div>' +
          '<div class="grid c2"><label class="f" for="ua-mobo">' + L('لوحتك الأم (أقرب فئة)', 'Your motherboard (closest class)') + '<select id="ua-mobo">' + selOpts('mobo') + '</select></label>' +
          '<label class="f" for="ua-cpu">' + L('معالجك الحالي', 'Current CPU') + '<select id="ua-cpu">' + selOpts('cpu') + '</select></label>' +
          '<label class="f" for="ua-gpu">' + L('كرتك الحالي', 'Current GPU') + '<select id="ua-gpu">' + selOpts('gpu') + '</select></label>' +
          '<label class="f" for="ua-psu">' + L('قدرة PSU الحالي (W)', 'Current PSU (W)') + '<input type="number" id="ua-psu" value="550" min="200"></label>' +
          '<label class="f" for="ua-case">' + L('أقصى طول لكرت الشاشة بكيسك (mm)', 'Max GPU length in your case (mm)') + '<input type="number" id="ua-case" value="300" min="150"></label></div><div id="tool-out"></div>';
      },
      init: function () { $('ua-mobo').value = 'b550m'; $('ua-cpu').value = 'r5-5600'; $('ua-gpu').value = 'rx7600'; },
      calc: function () {
        var mobo = C.getPart(val('ua-mobo')), cpu = C.getPart(val('ua-cpu')), gpu = C.getPart(val('ua-gpu')), psuW = num('ua-psu', 550), caseMm = num('ua-case', 300);
        var gp = C.partsOf('gpu').filter(function (g) { return g.tier > gpu.tier; }).sort(function (a, b) { return a.tier - b.tier; }).slice(0, 5).map(function (g) {
          var f = [];
          if (g.vendorPsuW > psuW) f.push(sb('warn') + ' ' + L('الشركة توصي بـ PSU ≥ ' + g.vendorPsuW + 'W', 'Vendor recommends PSU ≥ ' + g.vendorPsuW + 'W'));
          if (g.lengthMm > caseMm) f.push(sb('error') + ' ' + L('الطول النموذجي ' + g.lengthMm + 'mm أكبر من كيسك', 'Typical length ' + g.lengthMm + 'mm exceeds your case'));
          if (!f.length) f.push(sb('ok') + ' ' + L('ضمن حدود القدرة والطول المدخلة', 'Within the power and length limits you entered'));
          return '<li class="card"><div class="row between"><b>' + esc(pname(g)) + '</b><span class="mono">' + fmt(C.priceOf(g)) + ' ' + unit() + '</span></div><div class="small row" style="margin-top:6px">' + f.join(' ') + '</div></li>';
        }).join('') || '<li class="note">' + L('كرتك الحالي هو الأقوى في الكتالوج.', 'Your GPU is already the strongest in the catalog.') + '</li>';
        var cp = C.partsOf('cpu').filter(function (c) { return c.socket === mobo.socket && c.tier > cpu.tier && c.memTypes.indexOf(mobo.ramType) >= 0; }).sort(function (a, b) { return a.tier - b.tier; }).slice(0, 4).map(function (c) {
          var f = [];
          if (mobo.needsBios.indexOf(c.gen) >= 0) f.push(sb('warn') + ' ' + L('قد يحتاج تحديث BIOS', 'May need a BIOS update'));
          if (!f.length) f.push(sb('ok') + ' ' + L('نفس السوكيت ونوع الرام', 'Same socket and RAM type'));
          return '<li class="card"><div class="row between"><b>' + esc(pname(c)) + '</b><span class="mono">' + fmt(C.priceOf(c)) + ' ' + unit() + '</span></div><div class="small row" style="margin-top:6px">' + f.join(' ') + '</div></li>';
        }).join('') || '<li class="note">' + L('لا معالجات أقوى بنفس السوكيت في الكتالوج.', 'No stronger CPU on the same socket in the catalog.') + '</li>';
        $('tool-out').innerHTML = '<div class="grid c2"><div class="stack-s"><h3>' + L('ترقية كرت الشاشة', 'GPU upgrade options') + ' ' + smp() + '</h3><ul class="chk" style="list-style:none;padding:0;margin:0">' + gp + '</ul></div><div class="stack-s"><h3>' + L('ترقية المعالج (نفس اللوحة)', 'CPU upgrade options (same board)') + ' ' + smp() + '</h3><ul class="chk" style="list-style:none;padding:0;margin:0">' + cp + '</ul></div></div>';
      },
      input: function () { this.calc(); }
    },
    monitor: {
      html: function () {
        return '<div class="grid c2"><label class="f" for="mo-gpu">' + L('كرت الشاشة', 'GPU') + '<select id="mo-gpu">' + selOpts('gpu') + '</select></label><label class="f" for="mo-use">' + L('نوع الألعاب', 'Game type') + '<select id="mo-use"><option value="comp">' + L('تنافسية (FPS عالي)', 'Competitive (high FPS)') + '</option><option value="aaa">' + L('ألعاب AAA بجودة عالية', 'High-quality AAA') + '</option><option value="mix">' + L('خليط', 'Mixed') + '</option></select></label></div><div id="tool-out"></div>';
      },
      init: function () { $('mo-gpu').value = 'rtx4060ti'; },
      calc: function () {
        var g = C.getPart(val('mo-gpu')), use = val('mo-use'), t = g.tier, rec;
        if (t < 6) rec = use === 'comp' ? ['1080p', '144 Hz'] : ['1080p', '60–100 Hz'];
        else if (t < 7.5) rec = use === 'comp' ? ['1080p', '165–240 Hz'] : (use === 'aaa' ? ['1080p', '100–144 Hz'] : ['1080p أو 1440p خفيف', '120–165 Hz']);
        else rec = use === 'comp' ? ['1440p', '165–240 Hz'] : ['1440p', '120–165 Hz'];
        $('tool-out').innerHTML = '<div class="card stack-s"><div class="muted small">' + L('الدقة ومعدل التحديث المناسبان (إرشاد عام)', 'Suitable resolution and refresh rate (general guidance)') + '</div><div class="big">' + rec[0] + ' · ' + rec[1] + '</div></div><div class="note">' + L('إرشاد عام مبني على فئة الكرت فقط، ولا يضمن FPS معيناً. الأداء الفعلي يختلف حسب اللعبة والإعدادات والمعالج.', 'General guidance from the GPU class only; it does not guarantee any FPS. Real performance depends on the game, settings and CPU.') + '</div>';
      },
      input: function () { this.calc(); }
    },
    power: {
      html: function () {
        return '<div class="note">' + L('الأرقام الافتراضية افتراضات قابلة للتعديل وليست تسعيرة رسمية. ضع سعر مولدتك أو كهرباء الدولة.', 'Defaults are editable assumptions, not an official tariff. Enter your generator or grid price.') + '</div>' +
          '<div class="grid c2"><label class="f" for="pw-w">' + L('استهلاك الجهاز وقت اللعب (W)', 'PC draw while gaming (W)') + '<input type="number" id="pw-w" value="300" min="1"></label>' +
          '<label class="f" for="pw-h">' + L('ساعات الاستخدام باليوم', 'Hours per day') + '<input type="number" id="pw-h" value="4" min="0" max="24" step="0.5"></label>' +
          '<label class="f" for="pw-v">' + L('فولتية المولدة/الشبكة (V)', 'Supply voltage (V)') + '<input type="number" id="pw-v" value="220" min="100"></label>' +
          '<label class="f" for="pw-pa">' + L('سعر الأمبير بالشهر (د.ع)', 'Price per amp per month (IQD)') + '<input type="number" id="pw-pa" value="10000" min="0" step="500"></label></div><div id="tool-out"></div>';
      },
      calc: function () {
        var w = num('pw-w', 300), h = num('pw-h', 4), v = Math.max(100, num('pw-v', 220)), pa = num('pw-pa', 0);
        var amps = w / v, kwh = w / 1000 * h * 30;
        $('tool-out').innerHTML = '<div class="grid c2"><div class="card stack-s"><div class="muted small">' + L('الأمبيرات التي يحتاجها الجهاز (تقريبي)', 'Amps the PC needs (approx.)') + '</div><div class="big">' + amps.toFixed(1) + ' A</div><div class="small muted">' + L('الأمبير = الواط ÷ الفولتية (معامل قدرة 1، تقدير)', 'Amps = watts ÷ volts (power factor 1, estimate)') + '</div></div>' +
          '<div class="card stack-s"><div class="muted small">' + L('الطاقة الشهرية', 'Monthly energy') + '</div><div class="big">' + kwh.toFixed(0) + ' kWh</div><div class="small muted">' + L('كلفة اشتراك المولدة المقابلة: ', 'Matching generator cost: ') + '<b class="mono">' + fmt(amps * pa) + '</b> ' + unit() + '</div></div></div>' +
          '<div class="note">' + L('الاشتراك بالأمبير يُدفع ثابتاً سواء لعبت أو لا، فالرقم أعلاه كلفة الأمبيرات التي يستهلكها جهازك فقط من اشتراكك.', 'A generator amp subscription is a fixed fee; the figure above is just the share your PC accounts for.') + '</div>';
      },
      input: function () { this.calc(); }
    },
    storage: {
      html: function () {
        function row(i, ar, en, n, s) { return '<div class="grid c2"><label class="f" for="st-n' + i + '">' + L(ar, en) + ' ' + L('(العدد)', '(count)') + '<input type="number" id="st-n' + i + '" value="' + n + '" min="0"></label><label class="f" for="st-s' + i + '">' + L('متوسط الحجم (GB)', 'Average size (GB)') + '<input type="number" id="st-s' + i + '" value="' + s + '" min="1"></label></div>'; }
        return '<div class="note">' + L('أحجام الألعاب أدناه افتراضات قابلة للتعديل وليست قياسات.', 'Game sizes below are editable assumptions, not measurements.') + '</div>' +
          '<label class="f" for="st-os">' + L('ويندوز وبرامج (GB)', 'Windows and apps (GB)') + '<input type="number" id="st-os" value="150" min="0"></label>' +
          row(1, 'ألعاب خفيفة', 'Light games', 5, 20) + row(2, 'ألعاب متوسطة', 'Medium games', 4, 60) + row(3, 'ألعاب ثقيلة', 'Heavy games', 2, 120) +
          '<div class="grid c2"><label class="f" for="st-m">' + L('ملفات ومشاريع (GB)', 'Files and projects (GB)') + '<input type="number" id="st-m" value="100" min="0"></label><label class="f" for="st-f">' + L('مساحة فارغة يُنصح بتركها %', 'Free space to keep %') + '<input type="number" id="st-f" value="20" min="0" max="60"></label></div><div id="tool-out"></div>';
      },
      calc: function () {
        var used = num('st-os', 0) + num('st-m', 0);
        [1, 2, 3].forEach(function (i) { used += num('st-n' + i, 0) * num('st-s' + i, 0); });
        var free = Math.min(60, Math.max(0, num('st-f', 20))) / 100, need = used / (1 - free);
        var sizes = [256, 500, 1000, 2000, 4000], cap = sizes.filter(function (s) { return s >= need; })[0] || 4000;
        var opt = C.partsOf('storage').filter(function (p) { return p.gb >= need; }).sort(function (a, b) { return C.priceOf(a) - C.priceOf(b); })[0];
        $('tool-out').innerHTML = '<div class="grid c2"><div class="card stack-s"><div class="muted small">' + L('المساحة المطلوبة', 'Space needed') + '</div><div class="big">' + Math.round(need) + ' GB</div><div class="small muted">' + L('المستخدم: ', 'Used: ') + Math.round(used) + ' GB</div></div><div class="card stack-s"><div class="muted small">' + L('السعة الموصى بها', 'Suggested capacity') + '</div><div class="big">' + (cap >= 1000 ? cap / 1000 + ' TB' : cap + ' GB') + '</div>' + (opt ? '<div class="small">' + esc(pname(opt)) + ' · ' + moneyT(C.priceOf(opt)) + ' ' + smp() + '</div>' : '<div class="small">' + L('لا خيار بهذه السعة في الكتالوج.', 'No option this large in the catalog.') + '</div>') + '</div></div>';
      },
      input: function () { this.calc(); }
    }
  };
  VIEWS.tools = {
    html: function () {
      var tabs = TOOL_TABS.map(function (t) { return '<a class="chip' + (S.toolTab === t[0] ? ' on' : '') + '"' + (S.toolTab === t[0] ? ' aria-current="page"' : '') + ' href="#' + TOOL_HASH[t[0]] + '" style="text-decoration:none;display:inline-flex;align-items:center">' + t[1] + '</a>'; }).join('');
      return '<div class="stack"><h1>' + L('الأدوات المجانية', 'Free tools') + '</h1><div class="chips">' + tabs + '</div><div class="stack-s" id="tool-body">' + TOOLS[S.toolTab].html() + '</div>' + adSlot('tools') + '</div>';
    },
    bind: function () { var t = TOOLS[S.toolTab]; if (t.init) t.init(); t.calc(); },
    input: function (e) { TOOLS[S.toolTab].input(e); }
  };

  // Ready builds: rule-based suggestions per budget tier, shareable to WhatsApp
  VIEWS.ready = {
    html: function () {
      var u = S.ready.usage, tiers = [900000, 1300000, 1800000, 2500000];
      var usages = Object.keys(C.USAGE).map(function (k) { return '<button class="chip" data-act="ready-usage" data-v="' + k + '" aria-pressed="' + (u === k) + '">' + T(C.USAGE[k]) + '</button>'; }).join('');
      var cards = tiers.map(function (b) {
        var r = C.suggestBuilds({ budget: b, usage: u }).results[0];
        if (!r) return '<div class="card stack-s"><div class="row between"><h3>' + moneyT(b) + '</h3>' + smp() + '</div><div class="note">' + L('ما تتوفر تجميعة متوافقة بهالميزانية بالكتالوج التجريبي.', 'No compatible build at this budget in the sample catalog.') + '</div></div>';
        var wa = 'https://wa.me/?text=' + encodeURIComponent(summaryText(r.ids));
        return '<div class="card stack-s"><div class="row between"><h3>' + moneyT(b) + '</h3><div class="row">' + vb('ok') + smp() + '</div></div>' + partsList(r.ids) +
          '<div class="row between"><b>' + L('المجموع', 'Total') + '</b><b>' + money(r.total) + '</b></div>' +
          '<div class="row"><button class="btn pri sm" data-act="open-build" data-b="' + C.encodeBuild(r.ids) + '">' + L('افتح بالـ 3D', 'Open in 3D') + '</button><button class="btn sm" data-act="cart-ids" data-b="' + C.encodeBuild(r.ids) + '">' + L('أضف للسلة', 'Add to cart') + '</button>' +
          '<a class="btn sm" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + L('شارك واتساب', 'Share on WhatsApp') + '</a></div></div>';
      }).join('');
      return '<div class="stack"><div class="stack-s"><h1>' + L('تجميعات جاهزة', 'Ready builds') + '</h1><p class="muted">' + L('اختر استخدامك وشوف أفضل تجميعة متوافقة لكل ميزانية، وشاركها أو افتحها بالـ 3D.', 'Pick a use and see the best compatible build per budget; share it or open it in 3D.') + '</p></div>' +
        '<div class="chips">' + usages + '</div><div class="grid c2">' + cards + '</div>' + adSlot('home') +
        '<p class="small muted">' + L('مولّدة بقواعد الميزانية على بيانات تجريبية، وليست عروض محلات.', 'Generated by budget rules on sample data, not store offers.') + '</p></div>';
    }
  };

  // Cart: grouped by store, each group ends in a referral button to that store's site
  function copyStr(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () { toast(L('تم نسخ القائمة', 'List copied')); }, function () { toast(L('النسخ غير متاح هنا', 'Copy is not available here')); }); return; } } catch (e) {}
    toast(L('النسخ غير متاح هنا', 'Copy is not available here'));
  }
  function groupText(g) {
    return g.store.nameEn + '\n' + g.lines.map(function (l) { return '- ' + l.part.name + ' x' + l.qty + (l.available ? ' — ' + fmt(l.lineTotal) + ' IQD' : ' (out of stock)'); }).join('\n') + '\nSubtotal: ' + fmt(g.subtotal) + ' IQD';
  }
  VIEWS.cart = {
    html: function () {
      if (!S.cart.length) {
        return '<div class="stack"><h1>' + L('سلة المشتريات', 'Cart') + '</h1><div class="card emptystate"><p>' + L('السلة فارغة. ابحث عن قطعة وقارن أسعارها بين المتاجر ثم أضفها هنا.', 'Your cart is empty. Search a part, compare store prices, then add it here.') + '</p><div class="row"><a class="btn pri" href="#parts">' + L('تصفّح القطع والأسعار', 'Browse parts & prices') + '</a><a class="btn" href="#builder">PC Builder</a></div></div></div>';
      }
      var g = C.cartGroups(S.cart), cheapest = C.cartGroups(C.planCheapest(S.cart)).total, saving = g.total - cheapest;
      var singles = g.groups.length > 1 ? C.planSingleStore(S.cart).slice(0, 3) : [];
      var plan = '';
      if (saving > 0) plan += '<button class="btn pri" data-act="cart-cheapest">' + L('وزّع على الأرخص لكل قطعة (توفير ' + moneyT(saving) + ')', 'Cheapest store per part (save ' + moneyT(saving) + ')') + '</button>';
      singles.forEach(function (x) { plan += '<button class="btn" data-act="cart-single" data-store="' + x.store.id + '">' + L('كله من ' + x.store.nameAr + ' · ' + moneyT(x.total), 'All from ' + x.store.nameEn + ' · ' + moneyT(x.total)) + '</button>'; });
      var groups = g.groups.map(function (gr) {
        var lines = gr.lines.map(function (l) {
          return '<div class="line' + (l.available ? '' : ' na') + '"><div class="nm"><b>' + esc(pname(l.part)) + '</b><div class="small muted">' + T(C.catInfo(l.part.cat)) + ' · ' + (l.available ? fmt(l.unit) + ' ' + unit() : '') + '</div>' + (l.available ? '' : '<span class="badge b-error">' + L('غير متوفر في هذا المتجر', 'Out of stock here') + '</span>') + '</div>' +
            '<div class="qty"><button data-act="cart-qty" data-id="' + l.part.id + '" data-d="-1" aria-label="-">−</button><span>' + l.qty + '</span><button data-act="cart-qty" data-id="' + l.part.id + '" data-d="1" aria-label="+">+</button></div>' +
            '<b class="mono">' + (l.available ? fmt(l.lineTotal) : '—') + '</b><button class="btn sm ghost" data-act="cart-rm" data-id="' + l.part.id + '" aria-label="' + L('إزالة', 'Remove') + '">✕</button></div>';
        }).join('');
        var url = C.buyUrl(gr.store), nm = L(gr.store.nameAr, gr.store.nameEn);
        var buy = url ? '<a class="btn pri" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" data-act="buy-store" data-store="' + gr.store.id + '">' + L('اشترِ من ' + nm + ' ↗', 'Buy at ' + nm + ' ↗') + '</a>'
          : '<button class="btn pri" disabled>' + L('اشترِ من ' + nm, 'Buy at ' + nm) + '</button><span class="tag">' + L('قريباً', 'Coming soon') + '</span>';
        return '<section class="card stack-s"><div class="row between"><h2>' + nm + (gr.store.sponsored ? ' <span class="tag sp">' + L('برعاية', 'Sponsored') + '</span>' : '') + ' ' + smp() + '</h2></div>' + lines +
          '<div class="row between"><b>' + L('المجموع الفرعي', 'Subtotal') + '</b><b>' + money(gr.subtotal) + '</b></div><div class="row">' + buy + '<button class="btn sm ghost" data-act="cart-copy" data-store="' + gr.store.id + '">' + L('نسخ قائمة هذا المتجر', 'Copy this store\'s list') + '</button></div>' +
          (url ? '<p class="small muted">' + L('يفتح موقع المتجر في تبويب جديد؛ أضف القطع هناك وأكمل الشراء من المتجر نفسه.', 'Opens the store\'s site in a new tab; add the parts there and complete the purchase with the store.') + '</p>' : '<p class="small muted">' + L('الزر يُفعَّل عندما يصبح هذا المتجر شريكاً حقيقياً في RigLab.', 'The button activates once this store becomes a real RigLab partner.') + '</p>') + '</section>';
      }).join('');
      function scen(label, items) {
        var gg = C.cartGroups(items), del = 0, unk = false;
        gg.groups.forEach(function (x) { var d = x.store.deliveryIQD; if (d == null) unk = true; else del += d; });
        return '<tr><td>' + label + '</td><td class="num">' + gg.groups.length + '</td><td class="num">' + fmt(gg.total) + '</td><td class="num">' + (unk ? L('+ غير معروف', '+ unknown') : fmt(del)) + '</td><td class="num"><b>' + fmt(gg.total + del) + '</b></td></tr>';
      }
      var scenRows = scen(L('سلتك الحالية', 'Your cart'), S.cart);
      if (saving > 0) scenRows += scen(L('الأرخص لكل قطعة', 'Cheapest per part'), C.planCheapest(S.cart));
      singles.forEach(function (x) { scenRows += scen(L('كله من ' + x.store.nameAr, 'All from ' + x.store.nameEn), S.cart.map(function (it) { return { partId: it.partId, storeId: x.store.id, qty: it.qty }; })); });
      var scenTable = g.groups.length > 1 || singles.length ? '<section class="stack-s"><h2>' + L('شكد يوفر لي؟', 'How much would I save?') + '</h2><div class="tw"><table style="min-width:460px"><thead><tr><th>' + L('الخيار', 'Option') + '</th><th class="num">' + L('متاجر', 'Stores') + '</th><th class="num">' + L('القطع', 'Items') + '</th><th class="num">' + L('توصيل', 'Delivery') + '</th><th class="num">' + L('المجموع', 'Total') + '</th></tr></thead><tbody>' + scenRows + '</tbody></table></div><p class="small muted">' + L('التوصيل من بيانات المتجر (تجريبية)، و«غير معروف» لا يُحسب. الشراء من عدة متاجر يعني توصيلاً لكل متجر.', 'Delivery comes from store data (sample); "unknown" is not counted. Buying from several stores means delivery from each.') + '</p></section>' : '';
      return '<div class="stack"><div class="row between"><h1>' + L('سلة المشتريات', 'Cart') + '</h1><div class="row"><button class="btn sm" data-act="cart-share">' + L('نسخ السلة كاملة', 'Copy whole cart') + '</button><button class="btn sm ghost" data-act="cart-clear">' + L('تفريغ السلة', 'Empty cart') + '</button></div></div>' +
        '<section class="card stack-s"><div class="row between"><span class="muted">' + L('المجموع (' + g.count + ' قطعة)', 'Total (' + g.count + ' items)') + '</span><span class="big" style="font-size:1.6rem">' + fmt(g.total) + ' <span class="small muted">' + unit() + '</span></span></div>' +
        (g.unavailable ? '<div class="note warn">' + L(g.unavailable + ' سطر غير متوفر ولا يدخل في المجموع. غيّر المتجر من صفحة القطع.', g.unavailable + ' line(s) unavailable and excluded from the total. Change the store on the Parts page.') + '</div>' : '') +
        (plan ? '<div class="row">' + plan + '</div>' : '') + '</section>' + scenTable + adSlot('cart') + groups +
        '<div class="note warn">' + L('تنبيه: التوصيل والتركيب غير مضافين، وسعر المتجر الفعلي قد يختلف عما هنا. كل الأسعار والمتاجر تجريبية حالياً، والشراء يتم عند المتجر نفسه وليس عبر RigLab.', 'Notice: delivery and assembly are not included, and the store\'s actual price may differ. All prices and stores are samples for now; purchases happen at the store, not through RigLab.') + '</div></div>';
    }
  };

  // My builds
  VIEWS.builds = {
    html: function () {
      var cards = S.saved.map(function (b) {
        var parts = C.resolve(b.parts), res = C.checkCompat(parts);
        return '<div class="card stack-s"><div class="row between"><h3>' + esc(b.name) + '</h3>' + vb(res.verdict) + '</div><div class="small muted">' + esc((b.savedAt || '').slice(0, 10)) + '</div>' + partsList(b.parts) +
          '<div class="row between"><b>' + L('المجموع', 'Total') + '</b><b>' + money(C.buildTotal(parts)) + '</b></div><div class="row"><button class="btn sm pri" data-act="builds-load" data-id="' + b.id + '">' + L('افتح في Builder', 'Open in Builder') + '</button><button class="btn sm" data-act="builds-cmp" data-id="' + b.id + '">' + L('قارن', 'Compare') + '</button><button class="btn sm" data-act="builds-code" data-id="' + b.id + '">' + L('كود / مشاركة', 'Code / share') + '</button><button class="btn sm ghost" data-act="builds-del" data-id="' + b.id + '">' + L('حذف', 'Delete') + '</button></div></div>';
      }).join('');
      return '<div class="stack"><div class="stack-s"><h1>' + L('تجميعاتي', 'My Builds') + '</h1><div class="note">' + L('الحفظ محلي تجريبي: التجميعات تُحفظ في هذا المتصفح فقط. لا حسابات ولا مزامنة بعد، ومسح بيانات المتصفح يحذفها.', 'Trial local save: builds are stored in this browser only. There are no accounts or sync yet, and clearing browser data deletes them.') + '</div></div>' +
        '<div class="row"><a class="btn pri" href="#builder">' + L('تجميعة جديدة', 'New build') + '</a><button class="btn" data-act="sheet" data-type="import">' + L('استيراد كود', 'Import code') + '</button></div>' +
        (cards ? '<div class="grid c2">' + cards + '</div>' : '<div class="card"><p>' + L('ما عندك تجميعات محفوظة بعد. ابنِ واحدة واضغط «حفظ».', 'No saved builds yet. Build one and press "Save".') + '</p></div>') + adSlot('builds') + '</div>';
    }
  };

  // Trust / about
  var MODEL_LINKS = { gpu: 'https://sketchfab.com/', mobo: 'https://sketchfab.com/', ram: 'https://sketchfab.com/' };
  function creditsHtml() {
    var reg = window.RIGLAB_MODELS || {}, esc2 = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var rows = Object.keys(reg).map(function (k) { var m = reg[k]; return '<li>' + esc2((m.title || m.name)) + ' — ' + L('المؤلف', 'by') + ' <b>' + esc2(m.author) + '</b> (Sketchfab) — <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> — ' + L('تم تغيير الحجم والاتجاه لتناسب العارض', 'resized and re-oriented for the viewer') + '</li>'; }).join('');
    return '<h3>' + L('نماذج 3D', '3D models') + '</h3><p>' + L('نماذج القطع في العارض ثلاثي الأبعاد من أعمال فنانين على Sketchfab بترخيص CC BY 4.0. الشعارات الظاهرة عليها تخص أصحابها وتُعرض للتوضيح فقط، ولا يعني ذلك رعاية أو شراكة.', 'Part models in the 3D viewer are by Sketchfab artists under CC BY 4.0. Logos visible on them belong to their owners and are shown for illustration only; no sponsorship or partnership is implied.') + '</p><ul>' + rows + '</ul><h3>' + L('مكتبات', 'Libraries') + '</h3><ul><li>particles.js — Vincent Garreau — MIT (' + L('خلفية الهيدر التفاعلية', 'interactive header background') + ')</li></ul>';
  }
  var TRUST_TABS = [['about', 'من نحن', 'About'], ['status', 'حالة النسخة', 'Status'], ['privacy', 'الخصوصية', 'Privacy'], ['ads', 'سياسة الإعلانات والمصادر', 'Ads and sources'], ['partners', 'الشراكات', 'Partners'], ['credits', 'الاعتمادات', 'Credits']];
  VIEWS.trust = {
    html: function () {
      var tabs = TRUST_TABS.map(function (t) { return '<button class="chip" data-act="trust-tab" data-v="' + t[0] + '" aria-pressed="' + (S.trustTab === t[0]) + '">' + L(t[1], t[2]) + '</button>'; }).join('');
      var body = {
        about: '<p>RigLab منصة أدوات مستقلة لتجميع الكمبيوتر وفحص التوافق وحساب التكلفة، موجّهة أولاً للمستخدم العراقي. ما نبيع قطع ولا ننافس المحلات.</p><p>هذه نسخة أولية تجريبية. لم تُسجَّل شركة بعد، ولا توجد شروط قانونية رسمية منشورة باسم جهة مسجلة.</p>',
        status: '<h3>ما نُفّذ فعلياً</h3><ul><li>PC Builder مع سعر فوري وفحص توافق (سوكيت، BIOS، رام، حجم اللوحة، طول الكرت، المبرد، الطاقة).</li><li>فحص التوافق بأمثلة جاهزة، وحالات «غير مؤكد» عند نقص البيانات.</li><li>الميزانية الذكية بقواعد، ومستكشف القطع، ومقارنة قطعتين أو تجميعتين.</li><li>حاسبة PSU وUPS وUpgrade Advisor وMonitor Selector وStorage (نسخ مبسطة).</li><li>حفظ محلي للتجميعات، كود استيراد/مشاركة، وملخص نصي.</li><li>نموذج Price Radar ببيانات تجريبية موسومة.</li></ul><h3>ما بقي</h3><ul><li>أسعار محلات حقيقية بموافقتها، وحسابات المستخدمين، وحفظ على خادم، وروابط مشاركة حقيقية.</li><li>Benchmarks موثقة، Community Builds، تنبيهات الأسعار، Academy، لوحة الإدارة الفعلية.</li><li>ترجمة إنكليزية كاملة (الحالية جزئية).</li></ul>',
        privacy: '<p>في هذه النسخة لا يُرسل أي شيء إلى خادم. التجميعات المحفوظة وتفضيل اللغة وعدّادات الأحداث تُحفظ في متصفحك فقط (localStorage) ويمكنك مسحها من إعدادات المتصفح.</p><p>لا نجمع أسماء أو أرقام هواتف أو مواقع. كود المشاركة يحتوي أرقام القطع فقط. عند إضافة تحليلات حقيقية (GA4) سنحدّث هذه الصفحة ونتجنب جمع بيانات شخصية.</p>',
        ads: '<p>توجد مساحة إعلانية موسومة «إعلان» بكل صفحة عمل (الرئيسية، القطع، Builder، السلة، الميزانية، التوافق، المقارنة، الأدوات، تجميعاتي)، واحدة بالصفحة وبعد المحتوى الأساسي. لا تظهر داخل نتائج التوافق ولا في صفحات السياسات.</p><p>أي إعلان أو رعاية تظهر بوسم واضح «إعلان» أو «برعاية». الرعاية لا تغيّر ترتيب «الأرخص» ولا نتائج التوافق.</p><p>مصادر البيانات: الكتالوج الحالي عيّنة تجريبية بمواصفات عامة تقريبية، والأسعار كلها تجريبية. لا نستخدم أسعار متاجر دون إذنها، ولا ننشر Benchmarks أو FPS غير موثقة.</p>',
        partners: '<h3>الإعلانات</h3><p>توجد مساحات إعلانية موسومة «إعلان» بكل صفحة عمل. لا تظهر الإعلانات داخل نتائج التوافق ولا تغيّر ترتيب الأسعار. للحجز تواصل على واتساب أو البريد (أدناه).</p><p>إذا كنت صاحب محل أو شركة وتريد إدراج أسعارك في RigLab، الفكرة: إدراج مجاني تجريبي بموافقتك، مع تاريخ تحديث لكل سعر ورابط مباشر لمحلك.</p><div class="note">للتواصل (شراكات، إدراج أسعار، إعلانات):<br>واتساب: <a href="' + CONTACT.waLink + '" target="_blank" rel="noopener noreferrer" class="mono">' + CONTACT.wa + '</a><br>البريد: <span class="mono">' + CONTACT.email + '</span></div>',
        credits: creditsHtml()
      }[S.trustTab];
      return '<div class="stack"><h1>' + L('عن RigLab', 'About RigLab') + '</h1>' + (lang === 'en' ? '<div class="note">English text for these pages is not translated yet; Arabic is shown.</div>' : '') + '<div class="chips">' + tabs + '</div><div class="card stack-s" style="line-height:1.8">' + body + '</div><p class="small muted"><a href="#admin">' + L('تصميم لوحة الإدارة (غير مفعّل)', 'Admin dashboard design (inactive)') + '</a></p></div>';
    }
  };

  // Admin dashboard design (static; no auth, no real data)
  VIEWS.admin = {
    html: function () {
      var ev = sget('riglab.events', {});
      var evs = ['build_started', 'build_completed', 'build_shared', 'cart_added', 'store_clicked', 'ad_click'].map(function (k) { return '<tr><td class="mono">' + k + '</td><td class="num">' + (ev[k] || 0) + '</td><td>' + (k === 'store_clicked' ? L('لم يُفعّل: لا متاجر حقيقية بعد', 'Not active: no real stores yet') : '') + '</td></tr>'; }).join('');
      return '<div class="stack"><div class="stack-s"><h1>' + L('تصميم لوحة الإدارة', 'Admin dashboard design') + '</h1><div class="note warn">' + L('تصميم مبدئي فقط. لا يوجد تسجيل دخول ولا صلاحيات ولا بيانات حقيقية، ولا تُستخدم هذه الصفحة للإدارة. الأرقام أدناه من هذا المتصفح فقط.', 'Design mock only. There is no login, no permissions and no real data; do not use this page for administration. Numbers below come from this browser only.') + '</div></div>' +
        '<div class="grid c2"><div class="card stack-s"><h3>' + L('قائمة مراجعة العروض (مثال)', 'Offer review queue (example)') + '</h3><div class="tw"><table><thead><tr><th>' + L('القطعة', 'Part') + '</th><th>' + L('المتجر', 'Store') + '</th><th>' + L('الحالة', 'Status') + '</th></tr></thead><tbody><tr><td>RTX 4060</td><td>' + L('متجر تجريبي (أ)', 'Sample store A') + '</td><td>' + sb('pending') + '</td></tr><tr><td>Ryzen 5 7600</td><td>' + L('متجر تجريبي (ب)', 'Sample store B') + '</td><td>' + sb('warn') + ' ' + L('سعر قديم', 'stale price') + '</td></tr></tbody></table></div></div>' +
        '<div class="card stack-s"><h3>' + L('الأدوار المقترحة', 'Proposed roles') + '</h3><div class="tw"><table><thead><tr><th>' + L('الدور', 'Role') + '</th><th>' + L('الصلاحية', 'Scope') + '</th></tr></thead><tbody><tr><td>Admin</td><td>' + L('كل شيء', 'Everything') + '</td></tr><tr><td>Editor</td><td>' + L('القطع والمواصفات', 'Parts and specs') + '</td></tr><tr><td>Store manager</td><td>' + L('عروض متجره فقط', 'Own offers only') + '</td></tr><tr><td>Moderator</td><td>' + L('منشورات المجتمع', 'Community posts') + '</td></tr></tbody></table></div></div></div>' +
        '<div class="card stack-s"><h3>' + L('أحداث القياس (هذا المتصفح)', 'Tracking events (this browser)') + '</h3><div class="tw"><table><tbody>' + evs + '</tbody></table></div></div>' +
        '<div class="card"><h3>' + L('أقسام اللوحة المخططة', 'Planned sections') + '</h3><p class="muted">' + L('القطع والمواصفات · عروض الأسعار وتواريخها · المتاجر والشراكات · الزيارات والإحالات · إشراف المجتمع · الإعلانات والاشتراكات.', 'Parts and specs · offers and dates · stores and partnerships · traffic and referrals · community moderation · ads and subscriptions.') + '</p></div></div>';
    }
  };

  // ---------- actions ----------
  var ACT = {
    lang: function () { lang = lang === 'ar' ? 'en' : 'ar'; sset('riglab.lang', lang); render(); renderModal(); },
    pick: function (el) { openPicker(el.getAttribute('data-cat'), el.getAttribute('data-target')); },
    'close-sheet': function () { S.picker = null; S.sheet = null; renderModal(); },
    choose: function (el) { var p = S.picker; setPart(p.target, p.cat, el.getAttribute('data-id')); S.picker = null; renderModal(); render(); },
    'pk-hide': function () { S.picker.hide = !S.picker.hide; renderModal(); },
    'clear-slot': function (el) {
      var t = el.getAttribute('data-target'); delete bget(t)[el.getAttribute('data-cat')];
      if (t !== 'compat') { persistBuild(); S.completedLogged = false; }
      S.picker = null; renderModal(); render();
    },
    'clear-build': function () { S.build = {}; persistBuild(); S.completedLogged = false; render(); },
    sheet: function (el) { S.picker = null; S.sheet = { type: el.getAttribute('data-type') }; if (S.sheet.type === 'share') track('build_shared'); renderModal(); },
    'save-do': function () {
      var name = (val('save-name') || '').trim() || (L('تجميعتي ', 'My build ') + (S.saved.length + 1));
      S.saved.unshift({ id: Date.now(), name: name.slice(0, 60), parts: C.cleanBuild(S.build), savedAt: new Date().toISOString() });
      persistSaved(); S.sheet = null; renderModal(); toast(L('تم الحفظ في هذا المتصفح', 'Saved in this browser')); render();
    },
    'import-do': function () {
      var b = C.decodeBuild(val('import-code'));
      if (!b) { toast(L('الكود غير صالح', 'Invalid code')); return; }
      S.build = b; persistBuild(); S.sheet = null; renderModal(); toast(L('تم الاستيراد', 'Imported')); go('builder'); render();
    },
    copy: function (el) { copyText(el.getAttribute('data-src')); },
    'open-build': function (el) { var b = C.decodeBuild(el.getAttribute('data-b')); if (b) { S.build = b; persistBuild(); track('build_started'); go('builder'); render(); } },
    'home-go': function () { S.budget.amount = num('h-amount', 1800000); S.budget.usage = val('h-usage') || '1080p'; S.budgetResult = null; go('budget'); render(); },
    preset: function (el) { S.budget.amount = +el.getAttribute('data-v'); S.budgetResult = null; render(); },
    usage: function (el) { S.budget.usage = el.getAttribute('data-v'); render(); },
    'budget-run': function () { S.budget.amount = num('b-amount', S.budget.amount); S.budgetResult = runBudget(); render(); },
    'parts-cat': function (el) { S.pf.cat = el.getAttribute('data-cat'); S.pf.f = ''; S.expanded = null; render(); },
    'parts-toggle': function (el) { var id = el.getAttribute('data-id'); S.expanded = S.expanded === id ? null : id; $('plist').innerHTML = partsListHtml(); },
    'parts-add': function (el) { var p = C.getPart(el.getAttribute('data-id')); setPart('build', p.cat, p.id); toast(L('أُضيف إلى التجميعة: ', 'Added to build: ') + pname(p)); },
    'cmp-mode': function (el) { S.cmp.mode = el.getAttribute('data-v'); render(); },
    'trust-tab': function (el) { S.trustTab = el.getAttribute('data-v'); render(); },
    'compat-example': function (el) { S.compatBuild = C.cleanBuild(EXAMPLES[+el.getAttribute('data-i')].b); render(); },
    'compat-current': function () { S.compatBuild = C.cleanBuild(S.build); render(); },
    'compat-to-builder': function () { S.build = C.cleanBuild(S.compatBuild); persistBuild(); toast(L('نُقلت إلى Builder', 'Sent to Builder')); go('builder'); render(); },
    'psu-use-build': function () {
      var p = C.resolve(S.build); if (!p.cpu && !p.gpu) { toast(L('أضف معالجاً أو كرت شاشة في Builder أولاً', 'Add a CPU or GPU in Builder first')); return; }
      var e = C.estimatePower(p); $('psu-cw').value = e.cpuW; $('psu-gw').value = e.gpuW; $('psu-ow').value = e.otherW;
      if (p.cpu) $('psu-cpu').value = p.cpu.id; if (p.gpu) $('psu-gpu').value = p.gpu.id; TOOLS.psu.calc();
    },
    'ups-use-build': function () {
      var p = C.resolve(S.build); if (!p.cpu && !p.gpu) { toast(L('أضف معالجاً أو كرت شاشة في Builder أولاً', 'Add a CPU or GPU in Builder first')); return; }
      $('u-load').value = C.estimatePower(p).total; TOOLS.ups.calc();
    },
    'builds-load': function (el) { var b = S.saved.filter(function (x) { return String(x.id) === el.getAttribute('data-id'); })[0]; if (b) { S.build = C.cleanBuild(b.parts); persistBuild(); go('builder'); render(); } },
    'builds-del': function (el) { S.saved = S.saved.filter(function (x) { return String(x.id) !== el.getAttribute('data-id'); }); persistSaved(); render(); },
    'builds-cmp': function (el) { S.cmp.mode = 'builds'; S.cmp.ba = 'current'; S.cmp.bb = el.getAttribute('data-id'); go('compare'); render(); },
    wish: function (el) {
      var id = el.getAttribute('data-id'), i = S.wish.indexOf(id);
      if (i >= 0) S.wish.splice(i, 1); else S.wish.push(id);
      persistWish(); if (route() === 'parts') render();
    },
    'parts-fav': function () { S.pf.fav = !S.pf.fav; render(); },
    'ready-usage': function (el) { S.ready.usage = el.getAttribute('data-v'); render(); },
    'cart-ids': function (el) {
      var b = C.decodeBuild(el.getAttribute('data-b')); if (!b) return;
      var n = 0; Object.keys(b).forEach(function (k) { var o = C.bestOffer(b[k]); if (o) { addCart(b[k], o.storeId); n++; } });
      toast(L('أُضيف ' + n + ' قطعة للسلة', n + ' part(s) added to cart')); go('cart'); render();
    },
    'q-search': function () { S.pf.q = val('h-q'); S.pf.cat = 'all'; S.pf.f = ''; S.expanded = null; go('parts'); render(); },
    qcat: function (el) { S.pf.cat = el.getAttribute('data-cat'); S.pf.q = ''; S.pf.f = ''; S.expanded = null; go('parts'); render(); },
    more: function () { S.picker = null; S.sheet = { type: 'more' }; renderModal(); },
    'add-cart': function (el) {
      var id = el.getAttribute('data-id'), st = el.getAttribute('data-store'); if (!id || !st) return;
      addCart(id, st); toast(L('أُضيفت إلى السلة', 'Added to cart'));
      if (route() === 'parts') $('plist').innerHTML = partsListHtml();
    },
    'cart-rm': function (el) { S.cart = S.cart.filter(function (x) { return x.partId !== el.getAttribute('data-id'); }); persistCart(); render(); },
    'cart-qty': function (el) {
      var it = S.cart.filter(function (x) { return x.partId === el.getAttribute('data-id'); })[0]; if (!it) return;
      it.qty = Math.max(1, Math.min(9, it.qty + (+el.getAttribute('data-d')))); persistCart(); render();
    },
    'cart-clear': function () { S.cart = []; persistCart(); render(); },
    'cart-cheapest': function () { S.cart = C.planCheapest(S.cart); persistCart(); toast(L('وُزّعت على الأرخص', 'Moved to the cheapest stores')); render(); },
    'cart-single': function (el) {
      var st = el.getAttribute('data-store');
      S.cart = S.cart.map(function (x) { return { partId: x.partId, storeId: st, qty: x.qty }; }); persistCart(); render();
    },
    'cart-from-build': function () {
      var parts = C.resolve(S.build), n = 0, miss = 0;
      C.CATS.forEach(function (c) { var p = parts[c.key]; if (!p) return; var b = C.bestOffer(p.id); if (b) { addCart(p.id, b.storeId); n++; } else miss++; });
      toast(L('أُضيف ' + n + ' قطعة للسلة' + (miss ? ' (' + miss + ' غير متوفرة)' : ''), n + ' part(s) added' + (miss ? ' (' + miss + ' unavailable)' : ''))); go('cart'); render();
    },
    'cart-copy': function (el) {
      var g = C.cartGroups(S.cart).groups.filter(function (x) { return x.store.id === el.getAttribute('data-store'); })[0]; if (g) copyStr(groupText(g));
    },
    'buy-store': function () { track('store_clicked'); },
    'ad-click': function () { track('ad_click'); },
    zoom3d: function (el) { if (S.v3) { if (S.v3.zoomBy) S.v3.zoomBy(+el.getAttribute('data-f')); else { window.RigLab3D.view.zoom = Math.max(0.5, Math.min(3, window.RigLab3D.view.zoom * +el.getAttribute('data-f'))); S.v3.rotate(0); } } },
    auto3d: function (el) { if (S.v3 && S.v3.toggleAuto) el.textContent = S.v3.toggleAuto() ? '⏸' : '▶'; },
    rot3d: function (el) { if (S.v3) S.v3.rotate(+el.getAttribute('data-d')); },
    'cart-share': function () {
      var g = C.cartGroups(S.cart);
      copyStr('RigLab — ' + L('سلتي (أسعار تجريبية)', 'My cart (sample prices)') + '\n\n' + g.groups.map(groupText).join('\n\n') + '\n\nTotal: ' + fmt(g.total) + ' IQD');
    },
    'builds-code': function (el) { var b = S.saved.filter(function (x) { return String(x.id) === el.getAttribute('data-id'); })[0]; if (b) { S.sheet = { type: 'code', build: b.parts }; track('build_shared'); renderModal(); } }
  };

  // ---------- render + events ----------
  var ICON = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    parts: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    builder: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L20.6 8H6.2"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }
  function curNav(r) { return TOOL_ROUTES[r] ? 'tools' : (r === 'admin' ? 'trust' : r); }
  function navHtml(r) {
    var cur = curNav(r);
    return NAV.map(function (n) { return '<a href="#' + n.r + '"' + (n.r === cur ? ' aria-current="page"' : '') + '>' + L(n.ar, n.en) + '</a>'; }).join('');
  }
  function bnavHtml(r) {
    var cur = curNav(r), main = ['home', 'parts', 'builder', 'cart'];
    var lab = { home: L('الرئيسية', 'Home'), parts: L('القطع', 'Parts'), builder: 'Builder', cart: L('السلة', 'Cart') };
    var h = main.map(function (k) {
      return '<a href="#' + k + '"' + (k === cur ? ' aria-current="page"' : '') + '>' + ic(k) + '<span>' + lab[k] + '</span>' + (k === 'cart' ? '<span class="badge-n"></span>' : '') + '</a>';
    }).join('');
    return h + '<button data-act="more"' + (main.indexOf(cur) < 0 ? ' aria-current="page"' : '') + '>' + ic('more') + '<span>' + L('المزيد', 'More') + '</span></button>';
  }
  var lastRoute = null;
  function render() {
    var r = route();
    if (TOOL_ROUTES[r]) { S.toolTab = TOOL_ROUTES[r]; r = 'tools'; }
    var rt = route();
    var root = $('rl'); root.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl'); root.setAttribute('lang', lang);
    $('lang-btn').textContent = lang === 'ar' ? 'EN' : 'عربي';
    $('tagline').textContent = 'Build Smarter. Spend Less. Game Better.';
    $('strip-text').textContent = T(C.NOTICE); $('strip-tag').textContent = L('تجريبي', 'SAMPLE');
    $('nav').innerHTML = navHtml(rt);
    $('bnav-in').innerHTML = bnavHtml(rt);
    updateBadge();
    var v = VIEWS[rt] || VIEWS[r];
    $('app').innerHTML = v.html();
    if (lastRoute !== rt) { var ap = $('app'); ap.classList.remove('enter'); void ap.offsetWidth; ap.classList.add('enter'); }
    $('app-main').className = rt === 'builder' ? 'has-bar' : '';
    $('foot-text').textContent = L('RigLab · نسخة تجريبية أولية · الأسعار والمواصفات عيّنات وليست عروض متاجر حقيقية.', 'RigLab · early trial build · prices and specs are samples, not real store offers.');
    if (v.bind) v.bind();
    if (lastRoute !== rt) { window.scrollTo(0, 0); lastRoute = rt; try { var a = document.querySelector('#nav [aria-current]'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
  }
  function curView() { var r = route(); return VIEWS[TOOL_ROUTES[r] ? 'tools' : r] || VIEWS.home; }

  function init() {
    var rootEl = $('rl');
    rootEl.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el || el.disabled) return;
      var a = ACT[el.getAttribute('data-act')];
      if (a) a(el, e);
    });
    function onInput(e) {
      var id = e.target.id;
      if (S.picker && (id === 'pk-q' || id === 'pk-sort')) {
        if (id === 'pk-q') S.picker.q = e.target.value; else S.picker.sort = e.target.value;
        $('pk-list').innerHTML = pickerList(); return;
      }
      if (e.target.closest && e.target.closest('#modal')) return;
      var v = curView(); if (v.input) v.input(e);
    }
    rootEl.addEventListener('input', onInput);
    document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'h-q') { e.preventDefault(); ACT['q-search'](); return; }
      if (e.key === 'Escape' && (S.picker || S.sheet)) ACT['close-sheet'](); });
    var raf = 0;
    document.addEventListener('pointermove', function (e) {
      if (raf) return; var x = e.clientX, y = e.clientY, t = e.target;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var card = t && t.closest ? t.closest('.card,.slot,.opt,.ad') : null;
        if (card) { var r = card.getBoundingClientRect(); card.style.setProperty('--mx', (x - r.left) + 'px'); card.style.setProperty('--my', (y - r.top) + 'px'); }
        var bn = $('banner');
        if (bn) { var b = bn.getBoundingClientRect(); bn.style.setProperty('--px', Math.max(-1, Math.min(1, (x - b.left) / b.width * 2 - 1)).toFixed(3)); bn.style.setProperty('--py', Math.max(-1, Math.min(1, (y - b.top) / b.height * 2 - 1)).toFixed(3)); }
      });
    }, { passive: true });
    window.addEventListener('hashchange', render);
    render(); try { initBannerFx(); } catch (e) {}
  }
  window.RigLabApp = { state: S, render: render, ACT: ACT, VIEWS: VIEWS, route: route };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
