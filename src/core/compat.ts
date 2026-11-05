/* RigLab core/compat: Compatibility rules (socket, RAM type, form factor, clearances, PSU, BIOS risk). Never reports "compatible" when data is missing. Pure functions, no DOM. */
import type { Bilingual, Cat, Case, CompatItem, CompatResult, Confidence, Cooler, Cpu, Gpu, Mobo, PartMap, Psu, Ram, Status, Verdict } from './types';
import { estimatePower } from './power';
import { CATS, CAT_KEYS, isNil, m, nameList } from './shared';

// ---------- compatibility ----------
interface RuleResult { status: Status; detail: Bilingual; confidence?: Confidence; source?: string }
function checkCompat(parts: PartMap): CompatResult {
  var items: CompatItem[] = [];
  function rule(id: string, title: Bilingual, needs: Cat[], fn: () => RuleResult): void {
    var missing = needs.filter(function (k) { return !parts[k]; });
    if (missing.length) {
      var nl = nameList(missing);
      items.push({ id: id, status: 'pending', title: title, detail: m('بانتظار: ' + nl.ar, 'Waiting for: ' + nl.en), confidence: null, source: null, missing: missing });
      return;
    }
    var r = fn();
    items.push({ id: id, status: r.status, title: title, detail: r.detail, confidence: r.confidence || 'high', source: r.source || 'spec' });
  }
  // Inside a rule() callback, every part named in that rule's `needs` is guaranteed present (rule() returns 'pending' otherwise),
  // so those callbacks use these as non-optional. Code outside rule() must test `parts.x` instead.
  var cpu = parts.cpu as Cpu, mobo = parts.mobo as Mobo, ram = parts.ram as Ram, gpu = parts.gpu as Gpu, psu = parts.psu as Psu, pcase = parts.case as Case, cooler = parts.cooler as Cooler;

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
    if (parts.cpu && cpu.memTypes && cpu.memTypes.indexOf(ram.type) < 0) return { status: 'error', detail: m('المعالج لا يدعم ' + ram.type + '.', 'The CPU does not support ' + ram.type + '.') };
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

  if (parts.cpu && !parts.cooler) {
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

  var counts: Record<Status, number> = { ok: 0, warn: 0, error: 0, unknown: 0, pending: 0, info: 0 };
  items.forEach(function (i) { counts[i.status]++; });
  var missingRequired = CATS.filter(function (c) { return c.required && !parts[c.key]; }).map(function (c) { return c.key; });
  var anyPart = CAT_KEYS.some(function (k) { return parts[k]; });
  var verdict: Verdict;
  if (!anyPart) verdict = 'empty';
  else if (counts.error) verdict = 'error';
  else if (counts.warn) verdict = 'warn';
  else if (missingRequired.length || counts.unknown) verdict = 'unknown';
  else verdict = 'ok';
  return { items: items, counts: counts, verdict: verdict, missingRequired: missingRequired };
}

export { checkCompat };
