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
