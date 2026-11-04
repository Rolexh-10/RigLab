/* RigLab sample catalog.
 * IMPORTANT: every price here is a SAMPLE (priceSource: 'sample'), not a real Iraqi store price.
 * Specs are general public hardware figures kept approximate; GPU lengths are typical values that
 * vary by exact model. Motherboards/cases/coolers/PSUs are generic classes, not real SKUs.
 * Verify against vendor datasheets before launch. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RigLabData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MARKETS = {
    IQ: { code: 'IQ', currency: 'IQD', symbolAr: 'د.ع', symbolEn: 'IQD', supportedPrices: true },
    // Data-level support only: no real prices exist for these markets yet.
    SA: { code: 'SA', currency: 'SAR', symbolAr: 'ر.س', symbolEn: 'SAR', supportedPrices: false },
    AE: { code: 'AE', currency: 'AED', symbolAr: 'د.إ', symbolEn: 'AED', supportedPrices: false }
  };

  var PARTS = [];
  function add(cat, o) {
    var p = {};
    for (var k in o) p[k] = o[k];
    p.cat = cat;
    p.priceSource = 'sample';
    p.price = { IQ: o.price };
    PARTS.push(p);
  }

  // ---- CPU (tier = internal editorial ordering 1-10, NOT a benchmark) ----
  add('cpu', { id: 'r5-5600', brand: 'AMD', name: 'Ryzen 5 5600', socket: 'AM4', gen: 'zen3', cores: 6, threads: 12, tdp: 65, peakW: 88, stockCooler: true, memTypes: ['DDR4'], tier: 5, price: 160000 });
  add('cpu', { id: 'r7-5700x', brand: 'AMD', name: 'Ryzen 7 5700X', socket: 'AM4', gen: 'zen3', cores: 8, threads: 16, tdp: 65, peakW: 88, stockCooler: false, memTypes: ['DDR4'], tier: 6, price: 215000 });
  add('cpu', { id: 'r5-7600', brand: 'AMD', name: 'Ryzen 5 7600', socket: 'AM5', gen: 'zen4', cores: 6, threads: 12, tdp: 65, peakW: 88, stockCooler: true, memTypes: ['DDR5'], tier: 7, price: 270000 });
  add('cpu', { id: 'r7-7700x', brand: 'AMD', name: 'Ryzen 7 7700X', socket: 'AM5', gen: 'zen4', cores: 8, threads: 16, tdp: 105, peakW: 142, stockCooler: false, memTypes: ['DDR5'], tier: 8, price: 400000 });
  add('cpu', { id: 'i5-12400f', brand: 'Intel', name: 'Core i5-12400F', socket: 'LGA1700', gen: 'alder', cores: 6, threads: 12, tdp: 65, peakW: 117, stockCooler: true, memTypes: ['DDR4', 'DDR5'], tier: 5.5, price: 150000 });
  add('cpu', { id: 'i5-13400f', brand: 'Intel', name: 'Core i5-13400F', socket: 'LGA1700', gen: 'raptor', cores: 10, threads: 16, tdp: 65, peakW: 148, stockCooler: true, memTypes: ['DDR4', 'DDR5'], tier: 6.5, price: 230000 });
  add('cpu', { id: 'i7-14700k', brand: 'Intel', name: 'Core i7-14700K', socket: 'LGA1700', gen: 'raptor', cores: 20, threads: 28, tdp: 125, peakW: 253, stockCooler: false, memTypes: ['DDR4', 'DDR5'], tier: 9, price: 560000 });
  add('cpu', { id: 'r5-3600', brand: 'AMD', name: 'Ryzen 5 3600', socket: 'AM4', gen: 'zen2', cores: 6, threads: 12, tdp: 65, peakW: 88, stockCooler: true, memTypes: ['DDR4'], tier: 4, price: 120000 });
  add('cpu', { id: 'r7-7800x3d', brand: 'AMD', name: 'Ryzen 7 7800X3D', socket: 'AM5', gen: 'zen4', cores: 8, threads: 16, tdp: 120, peakW: 162, stockCooler: false, memTypes: ['DDR5'], tier: 9.5, price: 600000 });
  add('cpu', { id: 'r9-7900x', brand: 'AMD', name: 'Ryzen 9 7900X', socket: 'AM5', gen: 'zen4', cores: 12, threads: 24, tdp: 170, peakW: 230, stockCooler: false, memTypes: ['DDR5'], tier: 9, price: 520000 });
  add('cpu', { id: 'r9-7950x3d', brand: 'AMD', name: 'Ryzen 9 7950X3D', socket: 'AM5', gen: 'zen4', cores: 16, threads: 32, tdp: 120, peakW: 160, stockCooler: false, memTypes: ['DDR5'], tier: 10.5, price: 900000 });
  add('cpu', { id: 'i7-10700k', brand: 'Intel', name: 'Core i7-10700K', socket: 'LGA1200', gen: 'comet', cores: 8, threads: 16, tdp: 125, peakW: 229, stockCooler: false, memTypes: ['DDR4'], tier: 6, price: 200000 });
  add('cpu', { id: 'i7-6700k', brand: 'Intel', name: 'Core i7-6700K', socket: 'LGA1151', gen: 'skylake', cores: 4, threads: 8, tdp: 91, peakW: 120, stockCooler: false, memTypes: ['DDR4'], tier: 3, price: 70000 });

  // ---- Motherboards (generic chipset classes) ----
  add('mobo', { id: 'a520m', brand: 'AMD', name: 'A520M (mATX)', nameAr: 'لوحة A520M (mATX)', generic: true, socket: 'AM4', chipset: 'A520', ramType: 'DDR4', form: 'mATX', needsBios: ['zen3'], price: 70000 });
  add('mobo', { id: 'b550m', brand: 'AMD', name: 'B550M (mATX)', nameAr: 'لوحة B550M (mATX)', generic: true, socket: 'AM4', chipset: 'B550', ramType: 'DDR4', form: 'mATX', needsBios: ['zen3'], price: 105000 });
  add('mobo', { id: 'b650m', brand: 'AMD', name: 'B650M (mATX)', nameAr: 'لوحة B650M (mATX)', generic: true, socket: 'AM5', chipset: 'B650', ramType: 'DDR5', form: 'mATX', needsBios: [], price: 190000 });
  add('mobo', { id: 'b650-atx', brand: 'AMD', name: 'B650 (ATX)', nameAr: 'لوحة B650 (ATX)', generic: true, socket: 'AM5', chipset: 'B650', ramType: 'DDR5', form: 'ATX', needsBios: [], price: 260000 });
  add('mobo', { id: 'b660m-ddr4', brand: 'Intel', name: 'B660M DDR4 (mATX)', nameAr: 'لوحة B660M DDR4 (mATX)', generic: true, socket: 'LGA1700', chipset: 'B660', ramType: 'DDR4', form: 'mATX', needsBios: ['raptor'], price: 110000 });
  add('mobo', { id: 'b760m-ddr4', brand: 'Intel', name: 'B760M DDR4 (mATX)', nameAr: 'لوحة B760M DDR4 (mATX)', generic: true, socket: 'LGA1700', chipset: 'B760', ramType: 'DDR4', form: 'mATX', needsBios: [], price: 125000 });
  add('mobo', { id: 'b760m-ddr5', brand: 'Intel', name: 'B760M DDR5 (mATX)', nameAr: 'لوحة B760M DDR5 (mATX)', generic: true, socket: 'LGA1700', chipset: 'B760', ramType: 'DDR5', form: 'mATX', needsBios: [], price: 150000 });
  add('mobo', { id: 'z790-ddr5', brand: 'Intel', name: 'Z790 DDR5 (ATX)', nameAr: 'لوحة Z790 DDR5 (ATX)', generic: true, socket: 'LGA1700', chipset: 'Z790', ramType: 'DDR5', form: 'ATX', needsBios: [], price: 300000 });
  add('mobo', { id: 'b550-atx', brand: 'AMD', name: 'B550 (ATX)', nameAr: 'لوحة B550 (ATX)', generic: true, socket: 'AM4', chipset: 'B550', ramType: 'DDR4', form: 'ATX', needsBios: ['zen3'], price: 140000 });
  add('mobo', { id: 'x570-atx', brand: 'AMD', name: 'X570 (ATX)', nameAr: 'لوحة X570 (ATX)', generic: true, socket: 'AM4', chipset: 'X570', ramType: 'DDR4', form: 'ATX', needsBios: [], price: 170000 });
  add('mobo', { id: 'x370-atx', brand: 'AMD', name: 'X370 (ATX)', nameAr: 'لوحة X370 (ATX)', generic: true, socket: 'AM4', chipset: 'X370', ramType: 'DDR4', form: 'ATX', needsBios: ['zen3'], price: 90000 });
  add('mobo', { id: 'h510m', brand: 'Intel', name: 'H510M (mATX)', nameAr: 'لوحة H510M (mATX)', generic: true, socket: 'LGA1200', chipset: 'H510', ramType: 'DDR4', form: 'mATX', needsBios: [], price: 80000 });
  add('mobo', { id: 'z170-atx', brand: 'Intel', name: 'Z170 (ATX)', nameAr: 'لوحة Z170 (ATX)', generic: true, socket: 'LGA1151', chipset: 'Z170', ramType: 'DDR4', form: 'ATX', needsBios: [], price: 60000 });

  // ---- RAM kits ----
  add('ram', { id: 'ddr4-16-3200', name: 'DDR4 16GB (2x8) 3200', nameAr: 'رام DDR4 ‏16GB (2×8) 3200', type: 'DDR4', gb: 16, speed: 3200, price: 38000 });
  add('ram', { id: 'ddr4-32-3200', name: 'DDR4 32GB (2x16) 3200', nameAr: 'رام DDR4 ‏32GB (2×16) 3200', type: 'DDR4', gb: 32, speed: 3200, price: 75000 });
  add('ram', { id: 'ddr5-16-5600', name: 'DDR5 16GB (2x8) 5600', nameAr: 'رام DDR5 ‏16GB (2×8) 5600', type: 'DDR5', gb: 16, speed: 5600, price: 55000 });
  add('ram', { id: 'ddr5-32-6000', name: 'DDR5 32GB (2x16) 6000', nameAr: 'رام DDR5 ‏32GB (2×16) 6000', type: 'DDR5', gb: 32, speed: 6000, price: 100000 });

  // ---- GPUs (lengthMm = typical, varies by exact model; vendorPsuW = vendor-recommended system PSU) ----
  add('gpu', { id: 'rx7600', brand: 'AMD', name: 'Radeon RX 7600', vram: 8, tdp: 165, lengthMm: 245, vendorPsuW: 550, tier: 5, price: 350000 });
  add('gpu', { id: 'rtx4060', brand: 'NVIDIA', name: 'GeForce RTX 4060', vram: 8, tdp: 115, lengthMm: 240, vendorPsuW: 550, tier: 5.5, price: 365000 });
  add('gpu', { id: 'rtx4060ti', brand: 'NVIDIA', name: 'GeForce RTX 4060 Ti', vram: 8, tdp: 160, lengthMm: 245, vendorPsuW: 550, tier: 6.5, price: 520000 });
  add('gpu', { id: 'rx7700xt', brand: 'AMD', name: 'Radeon RX 7700 XT', vram: 12, tdp: 245, lengthMm: 280, vendorPsuW: 700, tier: 7, price: 550000 });
  add('gpu', { id: 'rtx4070', brand: 'NVIDIA', name: 'GeForce RTX 4070', vram: 12, tdp: 200, lengthMm: 245, vendorPsuW: 650, tier: 7.5, price: 720000 });
  add('gpu', { id: 'rtx4070s', brand: 'NVIDIA', name: 'GeForce RTX 4070 SUPER', vram: 12, tdp: 220, lengthMm: 270, vendorPsuW: 650, tier: 8.5, price: 840000 });
  add('gpu', { id: 'rx7800xt', brand: 'AMD', name: 'Radeon RX 7800 XT', vram: 16, tdp: 263, lengthMm: 285, vendorPsuW: 700, tier: 8.5, price: 760000 });
  add('gpu', { id: 'rtx5060ti', brand: 'NVIDIA', name: 'GeForce RTX 5060 Ti 16GB', vram: 16, tdp: 180, lengthMm: 250, vendorPsuW: 600, tier: 7.5, price: 620000 });
  add('gpu', { id: 'rtx5070', brand: 'NVIDIA', name: 'GeForce RTX 5070', vram: 12, tdp: 250, lengthMm: 300, vendorPsuW: 650, tier: 9, price: 950000 });
  add('gpu', { id: 'rtx5070ti', brand: 'NVIDIA', name: 'GeForce RTX 5070 Ti', vram: 16, tdp: 300, lengthMm: 305, vendorPsuW: 750, tier: 10, price: 1250000 });
  add('gpu', { id: 'rtx4090', brand: 'NVIDIA', name: 'GeForce RTX 4090', vram: 24, tdp: 450, lengthMm: 340, vendorPsuW: 850, tier: 12, price: 2900000 });

  // ---- Storage ----
  add('storage', { id: 'nvme-500', name: 'NVMe SSD 500GB', nameAr: 'NVMe ‏500GB', type: 'NVMe', gb: 500, price: 40000 });
  add('storage', { id: 'nvme-1tb', name: 'NVMe SSD 1TB', nameAr: 'NVMe ‏1TB', type: 'NVMe', gb: 1000, price: 65000 });
  add('storage', { id: 'nvme-2tb', name: 'NVMe SSD 2TB', nameAr: 'NVMe ‏2TB', type: 'NVMe', gb: 2000, price: 120000 });
  add('storage', { id: 'sata-1tb', name: 'SATA SSD 1TB', nameAr: 'SATA ‏1TB', type: 'SATA', gb: 1000, price: 55000 });

  // ---- PSU (watts only; quality tier is not modelled) ----
  add('psu', { id: 'psu-550', name: '550W PSU', nameAr: 'مزود طاقة 550W', watts: 550, price: 55000 });
  add('psu', { id: 'psu-650', name: '650W PSU', nameAr: 'مزود طاقة 650W', watts: 650, price: 70000 });
  add('psu', { id: 'psu-750', name: '750W PSU', nameAr: 'مزود طاقة 750W', watts: 750, price: 90000 });
  add('psu', { id: 'psu-850', name: '850W PSU', nameAr: 'مزود طاقة 850W', watts: 850, price: 120000 });

  // ---- Cases (generic) ----
  add('case', { id: 'case-matx', name: 'Compact mATX Case', nameAr: 'كيس mATX مدمج', generic: true, formFactors: ['mATX', 'ITX'], maxGpuMm: 300, maxCoolerMm: 155, radiators: [240], price: 60000 });
  add('case', { id: 'case-atx-mid', name: 'Mid-Tower ATX Case', nameAr: 'كيس ATX متوسط', generic: true, formFactors: ['ATX', 'mATX', 'ITX'], maxGpuMm: 360, maxCoolerMm: 165, radiators: [240, 280], price: 85000 });
  add('case', { id: 'case-atx-airflow', name: 'Airflow ATX Case', nameAr: 'كيس ATX تهوية عالية', generic: true, formFactors: ['ATX', 'mATX', 'ITX'], maxGpuMm: 400, maxCoolerMm: 175, radiators: [240, 280, 360], price: 120000 });
  add('case', { id: 'case-meshify-c', brand: 'Fractal Design', name: 'Fractal Design Meshify C', nameAr: 'كيس Fractal Design Meshify C', formFactors: ['ATX', 'mATX', 'ITX'], maxGpuMm: 315, maxCoolerMm: 172, radiators: [240, 280, 360], dims: { W: 212, H: 440, D: 453 }, price: 150000 });

  // ---- Coolers ----
  add('cooler', { id: 'cool-tower-120', name: 'Single Tower 120mm', nameAr: 'مبرد برج 120mm', type: 'air', heightMm: 150, radiatorMm: 0, sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1151'], tdpRating: 150, price: 30000 });
  add('cooler', { id: 'cool-dual-tower', name: 'Dual Tower', nameAr: 'مبرد برج مزدوج', type: 'air', heightMm: 160, radiatorMm: 0, sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1151'], tdpRating: 220, price: 60000 });
  add('cooler', { id: 'cool-aio-240', name: 'AIO 240mm', nameAr: 'تبريد مائي AIO 240mm', type: 'aio', heightMm: 0, radiatorMm: 240, sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1151'], tdpRating: 250, price: 110000 });
  add('cooler', { id: 'cool-aio-360', name: 'AIO 360mm', nameAr: 'تبريد مائي AIO 360mm', type: 'aio', heightMm: 0, radiatorMm: 360, sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1200', 'LGA1151'], tdpRating: 300, price: 170000 });

  // ---- Sample stores. NOT real shops. ----
  var STORES = [
    { id: 'sample-a', nameAr: 'متجر تجريبي (أ)', nameEn: 'Sample store A', mult: 1.0, deliveryIQD: 5000, warranty: { ar: '12 شهر (عيّنة)', en: '12 months (sample)' }, sponsored: false, live: false, url: null },
    { id: 'sample-b', nameAr: 'متجر تجريبي (ب)', nameEn: 'Sample store B', mult: 0.96, deliveryIQD: null, warranty: { ar: '6 أشهر (عيّنة)', en: '6 months (sample)' }, sponsored: false, live: false, url: null },
    { id: 'sample-c', nameAr: 'متجر تجريبي (ج)', nameEn: 'Sample store C', mult: 1.03, deliveryIQD: 0, warranty: { ar: '24 شهر (عيّنة)', en: '24 months (sample)' }, sponsored: true, live: false, url: null }
  ];

  return {
    MARKETS: MARKETS,
    PARTS: PARTS,
    STORES: STORES,
    SAMPLE_DATE: '2026-10-29',
    NOTICE: {
      ar: 'الأسعار والمواصفات في هذه النسخة بيانات تجريبية، وليست أسعار محلات عراقية حقيقية.',
      en: 'Prices and specs in this build are sample data, not real Iraqi store prices.'
    }
  };
});
