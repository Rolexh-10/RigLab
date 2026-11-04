/* RigLab engine: compatibility rules, power/UPS maths, rule-based budget builder, sample offers.
 * Pure functions, no DOM. Works in browsers (global RigLabCore) and Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.RigLabCore = factory(root.RigLabData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  var CATS = [
    { key: 'cpu', ar: 'المعالج (CPU)', en: 'CPU', required: true },
    { key: 'mobo', ar: 'اللوحة الأم', en: 'Motherboard', required: true },
    { key: 'ram', ar: 'الذاكرة (RAM)', en: 'RAM', required: true },
    { key: 'gpu', ar: 'كرت الشاشة (GPU)', en: 'GPU', required: true },
    { key: 'storage', ar: 'التخزين', en: 'Storage', required: true },
    { key: 'psu', ar: 'مزود الطاقة (PSU)', en: 'PSU', required: true },
    { key: 'case', ar: 'الكيس', en: 'Case', required: true },
    { key: 'cooler', ar: 'التبريد', en: 'Cooler', required: false }
  ];
  var CAT_KEYS = CATS.map(function (c) { return c.key; });
  function catInfo(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i].key === k) return CATS[i]; return null; }

  var VERDICT = {
    ok: { ar: 'متوافق مبدئياً', en: 'Looks compatible' },
    warn: { ar: 'تحذيرات', en: 'Warnings' },
    error: { ar: 'غير متوافق', en: 'Incompatible' },
    unknown: { ar: 'غير مؤكد', en: 'Unconfirmed' },
    empty: { ar: 'لم تبدأ بعد', en: 'Not started' }
  };

  var BY_ID = {};
  D.PARTS.forEach(function (p) { BY_ID[p.id] = p; });
  function getPart(id) { return BY_ID[id] || null; }
  function partsOf(cat) { return D.PARTS.filter(function (p) { return p.cat === cat; }); }
  function priceOf(p, market) { return p && p.price ? (p.price[market || 'IQ'] || 0) : 0; }

  function m(ar, en) { return { ar: ar, en: en }; }
  function nameList(keys) { return { ar: keys.map(function (k) { return catInfo(k).ar; }).join('، '), en: keys.map(function (k) { return catInfo(k).en; }).join(', ') }; }
  function isNil(v) { return v === null || v === undefined; }
  function roundUp(n, step) { return Math.ceil(n / step) * step; }

  // ---------- build helpers ----------
  function resolve(build) {
    var parts = {};
    CAT_KEYS.forEach(function (k) { var p = build && build[k] ? getPart(build[k]) : null; if (p && p.cat === k) parts[k] = p; });
    return parts;
  }
  function cleanBuild(build) {
    var out = {};
    CAT_KEYS.forEach(function (k) { var p = build && build[k] ? getPart(build[k]) : null; if (p && p.cat === k) out[k] = p.id; });
    return out;
  }
  function buildTotal(parts, market) {
    var t = 0; for (var k in parts) t += priceOf(parts[k], market); return t;
  }
  function encodeBuild(build) {
    var b = cleanBuild(build);
    return 'RL1.' + CAT_KEYS.map(function (k) { return b[k] || ''; }).join('.');
  }
  function decodeBuild(code) {
    if (typeof code !== 'string') return null;
    var s = code.trim();
    if (s.indexOf('RL1.') !== 0) return null;
    var seg = s.slice(4).split('.');
    if (seg.length !== CAT_KEYS.length) return null;
    var out = {};
    for (var i = 0; i < CAT_KEYS.length; i++) {
      if (!seg[i]) continue;
      var p = getPart(seg[i]);
      if (!p || p.cat !== CAT_KEYS[i]) return null;
      out[CAT_KEYS[i]] = p.id;
    }
    return out;
  }

  // ---------- power ----------
  var BASE_OTHER_W = 75; // board + RAM + fans, rough
  function psuFromLoad(totalW, headroom) {
    var h = isNil(headroom) ? 0.3 : headroom;
    return { total: Math.round(totalW), headroom: h, recommended: roundUp(totalW * (1 + h), 50) };
  }
  function estimatePower(parts, headroom) {
    var cpuW = parts.cpu ? parts.cpu.peakW : 0;
    var gpuW = parts.gpu ? parts.gpu.tdp : 0;
    var other = BASE_OTHER_W + (parts.storage ? 8 : 0) + (parts.cooler ? (parts.cooler.radiatorMm ? 15 : 5) : 0);
    var r = psuFromLoad(cpuW + gpuW + other, headroom);
    r.cpuW = cpuW; r.gpuW = gpuW; r.otherW = other;
    r.complete = !!(parts.cpu && parts.gpu);
    return r;
  }

  // ---------- UPS ----------
  function upsEstimate(o) {
    var load = Math.max(1, +o.loadW || 1);
    var pf = o.powerFactor > 0 ? o.powerFactor : 0.6;
    var wh = (+o.batteryV || 0) * (+o.batteryAh || 0) * (+o.batteryCount || 0);
    var eff = o.inverterEff > 0 ? o.inverterEff : 0.85;
    var usable = o.usablePct > 0 ? o.usablePct : 0.5;
    var usableWh = wh * eff * usable;
    var head = isNil(o.headroom) ? 0.25 : o.headroom;
    var out = {
      loadW: load,
      nominalWh: wh,
      usableWh: usableWh,
      runtimeMin: usableWh / load * 60,
      minRatedVA: roundUp(load * (1 + head) / pf, 50),
      powerFactor: pf
    };
    if (o.ratedVA > 0) {
      out.ratedW = o.ratedVA * pf;
      out.fitsLoad = load <= out.ratedW;
    }
    return out;
  }

  // ---------- compatibility ----------
  function checkCompat(parts) {
    var items = [];
    function rule(id, title, needs, fn) {
      var missing = needs.filter(function (k) { return !parts[k]; });
      if (missing.length) {
        var nl = nameList(missing);
        items.push({ id: id, status: 'pending', title: title, detail: m('بانتظار: ' + nl.ar, 'Waiting for: ' + nl.en), confidence: null, source: null, missing: missing });
        return;
      }
      var r = fn();
      r.id = id; r.title = title;
      if (!r.confidence) r.confidence = 'high';
      if (!r.source) r.source = 'spec';
      items.push(r);
    }
    var cpu = parts.cpu, mobo = parts.mobo, ram = parts.ram, gpu = parts.gpu, psu = parts.psu, pcase = parts.case, cooler = parts.cooler;

    rule('socket', m('السوكيت (CPU ↔ اللوحة)', 'Socket (CPU ↔ board)'), ['cpu', 'mobo'], function () {
      if (isNil(cpu.socket) || isNil(mobo.socket)) return { status: 'unknown', detail: m('السوكيت غير موثّق لإحدى القطعتين.', 'Socket not documented for one of the parts.'), confidence: 'low' };
      if (cpu.socket === mobo.socket) return { status: 'ok', detail: m('المعالج واللوحة كلاهما ' + cpu.socket + '.', 'Both CPU and board use ' + cpu.socket + '.') };
      return { status: 'error', detail: m('المعالج ' + cpu.socket + ' واللوحة ' + mobo.socket + ': لا يركّبان معاً.', 'CPU is ' + cpu.socket + ' but board is ' + mobo.socket + ': they do not fit together.') };
    });

    rule('bios', m('دعم الجيل / BIOS', 'Generation / BIOS support'), ['cpu', 'mobo'], function () {
      if (cpu.socket !== mobo.socket) return { status: 'info', detail: m('يُفحص بعد حل مشكلة السوكيت.', 'Checked once the socket matches.') };
      if (isNil(mobo.needsBios) || isNil(cpu.gen)) return { status: 'unknown', detail: m('بيانات دعم BIOS ناقصة.', 'BIOS support data is missing.'), confidence: 'low' };
      if (mobo.needsBios.indexOf(cpu.gen) >= 0) return { status: 'warn', detail: m('قد تحتاج هذه الفئة من اللوحات تحديث BIOS كي تعمل مع هذا المعالج، حسب تاريخ تصنيع اللوحة. اسأل المحل عن إصدار BIOS قبل الشراء.', 'This class of board may need a BIOS update to run this CPU, depending on its manufacture date. Ask the shop for the BIOS version before buying.'), confidence: 'low' };
      return { status: 'ok', detail: m('لا ملاحظة BIOS في بياناتنا الحالية (هذا لا يضمن الدعم الكامل).', 'No BIOS note in our current data (this does not guarantee full support).'), confidence: 'medium' };
    });

    rule('ramtype', m('نوع الذاكرة', 'Memory type'), ['mobo', 'ram'], function () {
      if (isNil(mobo.ramType) || isNil(ram.type)) return { status: 'unknown', detail: m('نوع الذاكرة غير موثّق.', 'Memory type not documented.'), confidence: 'low' };
      if (mobo.ramType !== ram.type) return { status: 'error', detail: m('اللوحة تدعم ' + mobo.ramType + ' فقط والرام المختار ' + ram.type + '.', 'The board takes ' + mobo.ramType + ' only but the selected RAM is ' + ram.type + '.') };
      if (cpu && cpu.memTypes && cpu.memTypes.indexOf(ram.type) < 0) return { status: 'error', detail: m('المعالج لا يدعم ' + ram.type + '.', 'The CPU does not support ' + ram.type + '.') };
      return { status: 'ok', detail: m('اللوحة والرام كلاهما ' + ram.type + '.', 'Board and RAM are both ' + ram.type + '.') };
    });

    rule('form', m('حجم اللوحة داخل الكيس', 'Board size in case'), ['mobo', 'case'], function () {
      if (isNil(mobo.form) || isNil(pcase.formFactors)) return { status: 'unknown', detail: m('بيانات الحجم ناقصة.', 'Form-factor data missing.'), confidence: 'low' };
      if (pcase.formFactors.indexOf(mobo.form) >= 0) return { status: 'ok', detail: m('الكيس يدعم لوحات ' + mobo.form + '.', 'The case supports ' + mobo.form + ' boards.') };
      return { status: 'error', detail: m('اللوحة ' + mobo.form + ' لكن الكيس يدعم: ' + pcase.formFactors.join('، ') + '.', 'Board is ' + mobo.form + ' but the case supports: ' + pcase.formFactors.join(', ') + '.') };
    });

    rule('gpulen', m('طول كرت الشاشة داخل الكيس', 'GPU length in case'), ['gpu', 'case'], function () {
      if (isNil(gpu.lengthMm) || isNil(pcase.maxGpuMm)) return { status: 'unknown', detail: m('طول الكرت أو سعة الكيس غير موثّقين.', 'GPU length or case clearance is not documented.'), confidence: 'low' };
      var margin = pcase.maxGpuMm - gpu.lengthMm;
      var note = m(' (الطول نموذجي ويختلف بين الموديلات)', ' (length is typical and varies between models)');
      if (margin < 0) return { status: 'error', detail: m('الكرت ' + gpu.lengthMm + 'mm والكيس يتسع لـ ' + pcase.maxGpuMm + 'mm.', 'GPU is ' + gpu.lengthMm + 'mm; case fits ' + pcase.maxGpuMm + 'mm.'), confidence: 'medium' };
      if (margin < 20) return { status: 'warn', detail: m('الهامش ' + margin + 'mm فقط' + note.ar + '. تأكد من الطول الفعلي للموديل.', 'Only ' + margin + 'mm of margin' + note.en + '. Check the exact model length.'), confidence: 'medium' };
      return { status: 'ok', detail: m('هامش ' + margin + 'mm' + note.ar + '.', margin + 'mm of margin' + note.en + '.'), confidence: 'medium' };
    });

    rule('coolersocket', m('تثبيت المبرد على السوكيت', 'Cooler socket support'), ['cpu', 'cooler'], function () {
      if (isNil(cooler.sockets)) return { status: 'unknown', detail: m('دعم السوكيت غير موثّق للمبرد.', 'Cooler socket support not documented.'), confidence: 'low' };
      if (cooler.sockets.indexOf(cpu.socket) >= 0) return { status: 'ok', detail: m('المبرد يدعم ' + cpu.socket + '.', 'Cooler supports ' + cpu.socket + '.') };
      return { status: 'error', detail: m('المبرد لا يدعم ' + cpu.socket + '.', 'Cooler does not support ' + cpu.socket + '.') };
    });

    rule('coolerfit', m('ارتفاع/حجم المبرد داخل الكيس', 'Cooler clearance in case'), ['cooler', 'case'], function () {
      if (cooler.radiatorMm) {
        if (isNil(pcase.radiators)) return { status: 'unknown', detail: m('دعم الرادييتر غير موثّق للكيس.', 'Radiator support not documented.'), confidence: 'low' };
        if (pcase.radiators.indexOf(cooler.radiatorMm) >= 0) return { status: 'ok', detail: m('الكيس يدعم رادييتر ' + cooler.radiatorMm + 'mm.', 'The case supports a ' + cooler.radiatorMm + 'mm radiator.'), confidence: 'medium' };
        return { status: 'error', detail: m('الكيس لا يدعم رادييتر ' + cooler.radiatorMm + 'mm.', 'The case does not support a ' + cooler.radiatorMm + 'mm radiator.'), confidence: 'medium' };
      }
      if (isNil(cooler.heightMm) || isNil(pcase.maxCoolerMm)) return { status: 'unknown', detail: m('الارتفاع غير موثّق.', 'Height not documented.'), confidence: 'low' };
      var margin = pcase.maxCoolerMm - cooler.heightMm;
      if (margin < 0) return { status: 'error', detail: m('المبرد ' + cooler.heightMm + 'mm والكيس يتسع لـ ' + pcase.maxCoolerMm + 'mm.', 'Cooler is ' + cooler.heightMm + 'mm; case fits ' + pcase.maxCoolerMm + 'mm.') };
      if (margin < 5) return { status: 'warn', detail: m('الهامش ' + margin + 'mm فقط.', 'Only ' + margin + 'mm of margin.'), confidence: 'medium' };
      return { status: 'ok', detail: m('هامش ' + margin + 'mm.', margin + 'mm of margin.') };
    });

    rule('coolerpower', m('قدرة المبرد مقابل المعالج', 'Cooler rating vs CPU'), ['cpu', 'cooler'], function () {
      if (isNil(cooler.tdpRating) || isNil(cpu.peakW)) return { status: 'unknown', detail: m('بيانات القدرة الحرارية ناقصة.', 'Thermal data missing.'), confidence: 'low' };
      if (cooler.tdpRating < cpu.peakW) return { status: 'warn', detail: m('تصنيف المبرد ' + cooler.tdpRating + 'W أقل من ذروة المعالج التقديرية ' + cpu.peakW + 'W؛ قد ترتفع الحرارة تحت الحمل الكامل.', 'Cooler rated ' + cooler.tdpRating + 'W is below the CPU peak estimate of ' + cpu.peakW + 'W; temperatures may climb under full load.'), confidence: 'medium', source: 'estimate' };
      return { status: 'ok', detail: m('تصنيف المبرد ' + cooler.tdpRating + 'W يغطي الذروة التقديرية ' + cpu.peakW + 'W.', 'Cooler rating ' + cooler.tdpRating + 'W covers the ' + cpu.peakW + 'W peak estimate.'), confidence: 'medium', source: 'estimate' };
    });

    if (cpu && !cooler) {
      if (isNil(cpu.stockCooler)) items.push({ id: 'cooleravail', title: m('مبرد المعالج', 'CPU cooler'), status: 'unknown', detail: m('لا نعرف إن كان المعالج يأتي بمبرد.', 'We do not know whether the CPU ships with a cooler.'), confidence: 'low', source: 'spec' });
      else if (cpu.stockCooler) items.push({ id: 'cooleravail', title: m('مبرد المعالج', 'CPU cooler'), status: 'ok', detail: m('يُفترض استخدام المبرد المرفق مع المعالج (تأكد أن النسخة التي تشتريها تحتويه).', 'The bundled cooler is assumed (make sure the version you buy includes it).'), confidence: 'medium', source: 'spec' });
      else items.push({ id: 'cooleravail', title: m('مبرد المعالج', 'CPU cooler'), status: 'warn', detail: m('هذا المعالج يُباع عادةً بدون مبرد. اختر مبرداً من قسم التبريد.', 'This CPU usually ships without a cooler. Pick one in the cooler slot.'), confidence: 'medium', source: 'spec' });
    }

    rule('psu', m('كفاية مزود الطاقة (تقدير)', 'PSU sufficiency (estimate)'), ['psu', 'cpu', 'gpu'], function () {
      if (isNil(psu.watts)) return { status: 'unknown', detail: m('قدرة PSU غير موثّقة.', 'PSU wattage not documented.'), confidence: 'low' };
      var e = estimatePower(parts);
      var txt = m('التقدير: ' + e.total + 'W (CPU ' + e.cpuW + ' + GPU ' + e.gpuW + ' + أخرى ' + e.otherW + ')، الموصى به مع هامش 30%: ' + e.recommended + 'W. المختار: ' + psu.watts + 'W.',
        'Estimate: ' + e.total + 'W (CPU ' + e.cpuW + ' + GPU ' + e.gpuW + ' + other ' + e.otherW + '); recommended with 30% headroom: ' + e.recommended + 'W. Selected: ' + psu.watts + 'W.');
      if (psu.watts < e.total) return { status: 'error', detail: txt, confidence: 'medium', source: 'estimate' };
      if (psu.watts < e.recommended) return { status: 'warn', detail: txt, confidence: 'medium', source: 'estimate' };
      return { status: 'ok', detail: txt, confidence: 'medium', source: 'estimate' };
    });

    rule('psuvendor', m('توصية الشركة لمزود الطاقة', 'Vendor PSU recommendation'), ['psu', 'gpu'], function () {
      if (isNil(gpu.vendorPsuW) || isNil(psu.watts)) return { status: 'unknown', detail: m('توصية الشركة غير متوفرة.', 'Vendor recommendation not available.'), confidence: 'low' };
      if (psu.watts < gpu.vendorPsuW) return { status: 'warn', detail: m('الشركة المصنّعة توصي بمزود ' + gpu.vendorPsuW + 'W على الأقل لهذا الكرت (تقريبي)، والمختار ' + psu.watts + 'W.', 'The vendor recommends at least ' + gpu.vendorPsuW + 'W for this GPU (approximate); selected is ' + psu.watts + 'W.'), confidence: 'medium', source: 'vendor-sample' };
      return { status: 'ok', detail: m('يحقق توصية الشركة (' + gpu.vendorPsuW + 'W).', 'Meets the vendor recommendation (' + gpu.vendorPsuW + 'W).'), confidence: 'medium', source: 'vendor-sample' };
    });

    items.push({
      id: 'limits', status: 'info', title: m('ما لم يُفحص بعد', 'Not checked yet'),
      detail: m('لا نفحص بعد: إصدار BIOS الفعلي، عدد منافذ M.2 وSATA، توصيلات الطاقة (PCIe/EPS)، قائمة الذاكرة المعتمدة (QVL)، وأبعاد أخرى. غياب الأخطاء أعلاه لا يعني ضمان توافق كامل.',
        'Not checked yet: actual BIOS version, M.2/SATA port counts, power connectors (PCIe/EPS), memory QVL and other dimensions. No errors above does not guarantee full compatibility.'),
      confidence: null, source: null
    });

    var counts = { ok: 0, warn: 0, error: 0, unknown: 0, pending: 0, info: 0 };
    items.forEach(function (i) { counts[i.status]++; });
    var missingRequired = CATS.filter(function (c) { return c.required && !parts[c.key]; }).map(function (c) { return c.key; });
    var anyPart = CAT_KEYS.some(function (k) { return parts[k]; });
    var verdict;
    if (!anyPart) verdict = 'empty';
    else if (counts.error) verdict = 'error';
    else if (counts.warn) verdict = 'warn';
    else if (missingRequired.length || counts.unknown) verdict = 'unknown';
    else verdict = 'ok';
    return { items: items, counts: counts, verdict: verdict, missingRequired: missingRequired };
  }

  // ---------- smart budget (rules, no AI claims) ----------
  var USAGE = {
    '1080p': { ar: 'ألعاب 1080p', en: '1080p gaming', w: { gpu: 0.5, cpu: 0.25, ram: 0.1, sto: 0.1 }, min: {} },
    '1440p': { ar: 'ألعاب 1440p', en: '1440p gaming', w: { gpu: 0.6, cpu: 0.2, ram: 0.1, sto: 0.1 }, min: { gpuTier: 6 } },
    'competitive': { ar: 'ألعاب تنافسية', en: 'Competitive gaming', w: { gpu: 0.35, cpu: 0.4, ram: 0.1, sto: 0.1 }, min: { cpuTier: 6 } },
    'editing': { ar: 'مونتاج وعمل', en: 'Video editing / work', w: { gpu: 0.15, cpu: 0.35, ram: 0.25, sto: 0.2 }, min: { ramGb: 32, stoGb: 1000 } }
  };

  function enumerate(opts) {
    var P = {
      cpu: partsOf('cpu'), mobo: partsOf('mobo'), ram: partsOf('ram'), gpu: partsOf('gpu'),
      storage: partsOf('storage'), psu: partsOf('psu'), case: partsOf('case'), cooler: partsOf('cooler')
    };
    var asc = function (a, b) { return priceOf(a) - priceOf(b); };
    for (var k in P) P[k].sort(asc);
    var minP = {}; for (var k2 in P) minP[k2] = P[k2].length ? priceOf(P[k2][0]) : 0;
    var budget = opts.budget, w = opts.weights, mn = opts.min || {};
    var map = {}; var minClean = Infinity;
    var minRamGb = Math.max(16, mn.ramGb || 0), minStoGb = Math.max(500, mn.stoGb || 0);

    P.cpu.forEach(function (cpu) {
      if (mn.cpuTier && cpu.tier < mn.cpuTier) return;
      var c1 = priceOf(cpu); if (c1 + minP.mobo + minP.ram + minP.gpu + minP.storage + minP.psu + minP.case > budget) return;
      P.mobo.forEach(function (mobo) {
        if (mobo.socket !== cpu.socket) return;
        var c2 = c1 + priceOf(mobo); if (c2 + minP.ram + minP.gpu + minP.storage + minP.psu + minP.case > budget) return;
        P.ram.forEach(function (ram) {
          if (ram.type !== mobo.ramType || cpu.memTypes.indexOf(ram.type) < 0 || ram.gb < minRamGb) return;
          var c3 = c2 + priceOf(ram); if (c3 + minP.gpu + minP.storage + minP.psu + minP.case > budget) return;
          P.case.forEach(function (pcase) {
            if (pcase.formFactors.indexOf(mobo.form) < 0) return;
            var c4 = c3 + priceOf(pcase); if (c4 + minP.gpu + minP.storage + minP.psu > budget) return;
            P.gpu.forEach(function (gpu) {
              if (mn.gpuTier && gpu.tier < mn.gpuTier) return;
              if (gpu.lengthMm > pcase.maxGpuMm) return;
              var c5 = c4 + priceOf(gpu); if (c5 + minP.storage + minP.psu > budget) return;
              P.psu.forEach(function (psu) {
                var c6 = c5 + priceOf(psu); if (c6 + minP.storage > budget) return;
                P.storage.forEach(function (sto) {
                  if (sto.gb < minStoGb) return;
                  var c7 = c6 + priceOf(sto); if (c7 > budget) return;
                  var coolers = cpu.stockCooler ? [null] : P.cooler;
                  coolers.forEach(function (cool) {
                    var total = c7 + (cool ? priceOf(cool) : 0);
                    if (total > budget) return;
                    if (opts.mode === 'min' && total >= minClean) return;
                    var key = cpu.id + '|' + gpu.id + '|' + ram.id + '|' + sto.id;
                    var ex = map[key];
                    if (opts.mode !== 'min' && ex && ex.total <= total) return;
                    var parts = { cpu: cpu, mobo: mobo, ram: ram, gpu: gpu, storage: sto, psu: psu, case: pcase };
                    if (cool) parts.cooler = cool;
                    var res = checkCompat(parts);
                    if (res.verdict !== 'ok') return;
                    if (opts.mode === 'min') { minClean = total; return; }
                    var score = w.gpu * gpu.tier / 10 + w.cpu * cpu.tier / 10 + w.ram * Math.min(ram.gb, 32) / 32 + w.sto * Math.min(sto.gb, 2000) / 2000;
                    map[key] = { total: total, score: score, ids: { cpu: cpu.id, mobo: mobo.id, ram: ram.id, gpu: gpu.id, storage: sto.id, psu: psu.id, case: pcase.id, cooler: cool ? cool.id : undefined } };
                  });
                });
              });
            });
          });
        });
      });
    });
    return { map: map, minClean: minClean };
  }

  function suggestBuilds(o) {
    var usage = USAGE[o.usage] || USAGE['1080p'];
    var budget = +o.budget || 0;
    var relaxed = false;
    var r = enumerate({ budget: budget, weights: usage.w, min: usage.min });
    var keys = Object.keys(r.map);
    if (!keys.length && Object.keys(usage.min).length) {
      r = enumerate({ budget: budget, weights: usage.w, min: {} });
      keys = Object.keys(r.map); relaxed = keys.length > 0;
    }
    var list = keys.map(function (k) { return r.map[k]; });
    list.sort(function (a, b) { return b.score - a.score || a.total - b.total; });
    var chosen = [];
    list.forEach(function (c) {
      if (chosen.length >= 3) return;
      var dup = chosen.some(function (x) { return x.ids.cpu === c.ids.cpu && x.ids.gpu === c.ids.gpu; });
      if (!dup) chosen.push(c);
    });
    var results = chosen.map(function (c) {
      var parts = resolve(c.ids), shares = {};
      CAT_KEYS.forEach(function (k) { if (parts[k]) shares[k] = priceOf(parts[k]) / c.total; });
      return { ids: cleanBuild(c.ids), total: c.total, score: c.score, remaining: budget - c.total, shares: shares };
    });
    var out = { results: results, relaxed: relaxed, usage: o.usage, budget: budget };
    if (!results.length) {
      var mm = enumerate({ budget: Infinity, weights: usage.w, min: {}, mode: 'min' });
      out.minTotal = isFinite(mm.minClean) ? mm.minClean : null;
    }
    return out;
  }

  // ---------- sample offers (Price Radar data model) ----------
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h; }
  function offersFor(partId, market) {
    var p = getPart(partId); if (!p) return [];
    var base = priceOf(p, market);
    var list = D.STORES.map(function (st) {
      var h = hash(p.id + '|' + st.id);
      var jitter = ((h % 5) - 2) * 0.01;
      return {
        partId: p.id, storeId: st.id, storeNameAr: st.nameAr, storeNameEn: st.nameEn,
        price: Math.round(base * (st.mult + jitter) / 1000) * 1000,
        currency: 'IQD', available: (hash(st.id + '|' + p.id) % 7) !== 0,
        warranty: st.warranty, deliveryIQD: st.deliveryIQD, sponsored: st.sponsored,
        updated: D.SAMPLE_DATE, source: 'sample'
      };
    });
    // sponsorship never affects order: sort strictly by price
    list.sort(function (a, b) { return a.price - b.price; });
    return list;
  }
  function costByStore(parts) {
    var ids = CAT_KEYS.filter(function (k) { return parts[k]; }).map(function (k) { return parts[k].id; });
    var stores = D.STORES.map(function (st) {
      var total = 0, missing = [];
      ids.forEach(function (id) {
        var o = offersFor(id).filter(function (x) { return x.storeId === st.id; })[0];
        if (o && o.available) total += o.price; else missing.push(id);
      });
      return { store: st, total: total, missing: missing, complete: missing.length === 0 && ids.length > 0 };
    });
    var mix = 0, unavailable = [];
    ids.forEach(function (id) {
      var av = offersFor(id).filter(function (x) { return x.available; });
      if (av.length) mix += av[0].price; else unavailable.push(id);
    });
    return { stores: stores, mixTotal: mix, mixUnavailable: unavailable, partCount: ids.length };
  }


  // ---------- cart (items: {partId, storeId, qty}) ----------
  function storeById(id) { for (var i = 0; i < D.STORES.length; i++) if (D.STORES[i].id === id) return D.STORES[i]; return null; }
  function offerFor(partId, storeId) { var l = offersFor(partId); for (var i = 0; i < l.length; i++) if (l[i].storeId === storeId) return l[i]; return null; }
  function bestOffer(partId) { var l = offersFor(partId).filter(function (o) { return o.available; }); return l[0] || null; }
  function clampQty(q) { q = Math.floor(+q || 1); return Math.max(1, Math.min(9, q)); }
  function cartGroups(items) {
    var map = {}, order = [];
    items.forEach(function (it) {
      var p = getPart(it.partId), st = storeById(it.storeId); if (!p || !st) return;
      var o = offerFor(it.partId, it.storeId), qty = clampQty(it.qty);
      var line = { part: p, offer: o, qty: qty, available: !!(o && o.available), unit: o ? o.price : 0, lineTotal: o ? o.price * qty : 0 };
      if (!map[st.id]) { map[st.id] = { store: st, lines: [], subtotal: 0, allAvailable: true, unavailable: 0 }; order.push(st.id); }
      var g = map[st.id]; g.lines.push(line);
      if (line.available) g.subtotal += line.lineTotal; else { g.allAvailable = false; g.unavailable++; }
    });
    var groups = order.map(function (k) { return map[k]; }), total = 0, un = 0, count = 0;
    groups.forEach(function (g) { total += g.subtotal; un += g.unavailable; g.lines.forEach(function (l) { count += l.qty; }); });
    return { groups: groups, total: total, unavailable: un, count: count };
  }
  // Re-assign every item to the cheapest store that has it in stock (keeps the item if nobody has it).
  function planCheapest(items) {
    return items.map(function (it) { var b = bestOffer(it.partId); return { partId: it.partId, qty: clampQty(it.qty), storeId: b ? b.storeId : it.storeId }; });
  }
  // Stores able to supply the whole cart, cheapest first.
  function planSingleStore(items) {
    var res = [];
    D.STORES.forEach(function (st) {
      var ok = items.length > 0, total = 0;
      items.forEach(function (it) { var o = offerFor(it.partId, st.id); if (!o || !o.available) ok = false; else total += o.price * clampQty(it.qty); });
      if (ok) res.push({ store: st, total: total });
    });
    res.sort(function (a, b) { return a.total - b.total; });
    return res;
  }
  // Destination for "buy from this store". Null for sample stores: there is no real shop to send people to.
  function buyUrl(store) {
    if (!store || !store.live || !store.url) return null;
    return store.url + (store.url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=riglab&utm_medium=referral';
  }

  // ---------- spec display ----------
  function specRows(p) {
    var r = [];
    function a(ar, en, v, raw, dir) { if (!isNil(v)) r.push({ ar: ar, en: en, v: String(v), raw: isNil(raw) ? null : raw, dir: dir || 0 }); }
    function yn(b) { return b ? { ar: 'نعم', en: 'Yes' } : { ar: 'لا', en: 'No' }; }
    switch (p.cat) {
      case 'cpu':
        a('السوكيت', 'Socket', p.socket);
        a('الأنوية', 'Cores', p.cores, p.cores, 1);
        a('الخيوط', 'Threads', p.threads, p.threads, 1);
        a('TDP', 'TDP', p.tdp + ' W', p.tdp, -1);
        a('ذروة الاستهلاك (تقدير)', 'Peak power (est.)', p.peakW + ' W', p.peakW, -1);
        a('الذاكرة المدعومة', 'Memory', p.memTypes.join(' / '));
        a('مبرد مرفق', 'Bundled cooler', (p.stockCooler ? 'Yes / نعم' : 'No / لا'));
        break;
      case 'mobo':
        a('السوكيت', 'Socket', p.socket); a('الشريحة', 'Chipset', p.chipset);
        a('الذاكرة', 'Memory', p.ramType); a('الحجم', 'Form factor', p.form);
        break;
      case 'ram':
        a('النوع', 'Type', p.type); a('السعة', 'Capacity', p.gb + ' GB', p.gb, 1); a('السرعة', 'Speed', p.speed + ' MT/s', p.speed, 1);
        break;
      case 'gpu':
        a('الذاكرة', 'VRAM', p.vram + ' GB', p.vram, 1);
        a('استهلاك الكرت', 'Board power', p.tdp + ' W', p.tdp, -1);
        a('الطول (نموذجي)', 'Length (typical)', p.lengthMm + ' mm', p.lengthMm, -1);
        a('PSU موصى (الشركة)', 'Vendor PSU rec.', p.vendorPsuW + ' W', p.vendorPsuW, -1);
        break;
      case 'storage':
        a('النوع', 'Type', p.type); a('السعة', 'Capacity', p.gb >= 1000 ? (p.gb / 1000) + ' TB' : p.gb + ' GB', p.gb, 1);
        break;
      case 'psu':
        a('القدرة', 'Wattage', p.watts + ' W', p.watts, 1);
        break;
      case 'case':
        a('أحجام اللوحات', 'Board sizes', p.formFactors.join(' / '));
        a('أقصى طول GPU', 'Max GPU length', p.maxGpuMm + ' mm', p.maxGpuMm, 1);
        a('أقصى ارتفاع مبرد', 'Max cooler height', p.maxCoolerMm + ' mm', p.maxCoolerMm, 1);
        a('رادييتر مدعوم', 'Radiators', p.radiators.join(' / ') + ' mm');
        break;
      case 'cooler':
        a('النوع', 'Type', p.type === 'aio' ? 'AIO' : 'Air / هوائي');
        if (p.heightMm) a('الارتفاع', 'Height', p.heightMm + ' mm', p.heightMm, -1);
        if (p.radiatorMm) a('الرادييتر', 'Radiator', p.radiatorMm + ' mm', p.radiatorMm, 0);
        a('تصنيف حراري', 'Thermal rating', p.tdpRating + ' W', p.tdpRating, 1);
        break;
    }
    return r;
  }
  function shortSpec(p) {
    switch (p.cat) {
      case 'cpu': return p.socket + ' · ' + p.cores + 'C/' + p.threads + 'T · ' + p.tdp + 'W';
      case 'mobo': return p.socket + ' · ' + p.ramType + ' · ' + p.form;
      case 'ram': return p.type + ' · ' + p.gb + 'GB · ' + p.speed;
      case 'gpu': return p.vram + 'GB · ' + p.tdp + 'W · ~' + p.lengthMm + 'mm';
      case 'storage': return p.type + ' · ' + (p.gb >= 1000 ? p.gb / 1000 + 'TB' : p.gb + 'GB');
      case 'psu': return p.watts + 'W';
      case 'case': return p.formFactors[0] + ' · GPU ≤ ' + p.maxGpuMm + 'mm';
      case 'cooler': return (p.type === 'aio' ? 'AIO ' + p.radiatorMm + 'mm' : p.heightMm + 'mm') + ' · ' + p.tdpRating + 'W';
    }
    return '';
  }

  return {
    CATS: CATS, CAT_KEYS: CAT_KEYS, VERDICT: VERDICT, USAGE: USAGE, STORES: D.STORES, PARTS: D.PARTS, MARKETS: D.MARKETS,
    NOTICE: D.NOTICE, SAMPLE_DATE: D.SAMPLE_DATE,
    catInfo: catInfo, getPart: getPart, partsOf: partsOf, priceOf: priceOf,
    resolve: resolve, cleanBuild: cleanBuild, buildTotal: buildTotal, encodeBuild: encodeBuild, decodeBuild: decodeBuild,
    estimatePower: estimatePower, psuFromLoad: psuFromLoad, upsEstimate: upsEstimate,
    checkCompat: checkCompat, suggestBuilds: suggestBuilds,
    offersFor: offersFor, costByStore: costByStore, storeById: storeById, offerFor: offerFor, bestOffer: bestOffer,
    cartGroups: cartGroups, planCheapest: planCheapest, planSingleStore: planSingleStore, buyUrl: buyUrl, specRows: specRows, shortSpec: shortSpec
  };
});
