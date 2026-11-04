'use strict';
/* RigLab core/specs: Human-readable spec rows for the UI. Pure functions, no DOM. */
var isNil = require('./shared').isNil;

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

module.exports = { shortSpec, specRows };
