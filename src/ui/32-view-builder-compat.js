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
