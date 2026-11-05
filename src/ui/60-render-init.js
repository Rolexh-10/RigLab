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
    var RR = window.RigLabReact, ported = !!(RR && RR.has(rt));
    if (ported) RR.mount($('app'), rt);
    else { if (RR) RR.unmount(); $('app').innerHTML = v.html(); }
    if (lastRoute !== rt) { var ap = $('app'); ap.classList.remove('enter'); void ap.offsetWidth; ap.classList.add('enter'); }
    $('app-main').className = rt === 'builder' ? 'has-bar' : '';
    $('foot-text').textContent = L('RigLab · نسخة تجريبية أولية · الأسعار والمواصفات عيّنات وليست عروض متاجر حقيقية.', 'RigLab · early trial build · prices and specs are samples, not real store offers.');
    if (!ported && v.bind) v.bind();
    rbNotify();
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
