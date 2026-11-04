'use strict';
/* Sample catalog: case. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
module.exports = [
  {"id":"case-matx","name":"Compact mATX Case","nameAr":"كيس mATX مدمج","generic":true,"formFactors":["mATX","ITX"],"maxGpuMm":300,"maxCoolerMm":155,"radiators":[240],"price":60000},
  {"id":"case-atx-mid","name":"Mid-Tower ATX Case","nameAr":"كيس ATX متوسط","generic":true,"formFactors":["ATX","mATX","ITX"],"maxGpuMm":360,"maxCoolerMm":165,"radiators":[240,280],"price":85000},
  {"id":"case-atx-airflow","name":"Airflow ATX Case","nameAr":"كيس ATX تهوية عالية","generic":true,"formFactors":["ATX","mATX","ITX"],"maxGpuMm":400,"maxCoolerMm":175,"radiators":[240,280,360],"price":120000},
  {"id":"case-meshify-c","brand":"Fractal Design","name":"Fractal Design Meshify C","nameAr":"كيس Fractal Design Meshify C","formFactors":["ATX","mATX","ITX"],"maxGpuMm":315,"maxCoolerMm":172,"radiators":[240,280,360],"dims":{"W":212,"H":440,"D":453},"price":150000}
];
