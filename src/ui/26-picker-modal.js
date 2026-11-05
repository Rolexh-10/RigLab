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
    var r = window.RigLabIdentity && window.RigLabIdentity.resolve(R, c, x); return r ? r.level : '';
  }
  // 3D badge for each option: exact model / look-alike model / no model (neutral placeholder)
  function tag3d(cat, x) {
    var l = has3d(cat, x);
    if (l === 'exact') return ' <span class="tag t3d">' + L('موديل 3D', '3D model') + '</span>';
    if (l) return ' <span class="tag t3d sim">' + L('3D مشابه', '3D look-alike') + '</span>';
    return ' <span class="tag t3d no">' + L('بدون 3D', 'No 3D') + '</span>';
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
      html += '<button class="opt' + (cur === x.id ? ' cur' : '') + '" data-act="choose" data-id="' + x.id + '"><div class="b"><div class="nm">' + esc(pname(x)) + (x.generic ? ' <span class="tag">' + L('فئة نموذجية', 'generic class') + '</span>' : '') + tag3d(p.cat, x) + '</div><div class="small muted mono">' + C.shortSpec(x) + '</div>' + (flag ? '<div class="row" style="margin-top:4px">' + flag + '</div>' : '') + '</div><div class="pr">' + fmt(C.priceOf(x)) + '<br><span class="small muted">' + unit() + '</span></div></button>';
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
      body = '<h2>' + L('المزيد', 'More') + '</h2><div class="morelist">' + [].concat(NAV.filter(function (n) { return ['home', 'parts', 'builder', 'compat', 'tools', 'builds', 'trust'].indexOf(n.r) < 0; }), [{ r: 'tools', ar: 'الأدوات', en: 'Tools' }], NAV.filter(function (n) { return ['builds', 'trust'].indexOf(n.r) >= 0; })).map(function (n) {
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

