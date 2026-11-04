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
      S.saved.unshift(C.createSaved(S.build, name, S.saved.length));
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
    'builds-load': function (el) { var b = C.findSaved(S.saved, el.getAttribute('data-id')); if (b) { S.build = C.cleanBuild(b.parts); persistBuild(); go('builder'); render(); } },
    'builds-del': function (el) { S.saved = C.removeSaved(S.saved, el.getAttribute('data-id')); persistSaved(); render(); },
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
    'builds-code': function (el) { var b = C.findSaved(S.saved, el.getAttribute('data-id')); if (b) { S.sheet = { type: 'code', build: b.parts }; track('build_shared'); renderModal(); } }
  };

