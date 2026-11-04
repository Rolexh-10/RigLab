'use strict';
/* Sample catalog: storage. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
module.exports = [
  {"id":"nvme-500","name":"NVMe SSD 500GB","nameAr":"NVMe ‏500GB","type":"NVMe","gb":500,"price":40000},
  {"id":"nvme-1tb","name":"NVMe SSD 1TB","nameAr":"NVMe ‏1TB","type":"NVMe","gb":1000,"price":65000},
  {"id":"nvme-2tb","name":"NVMe SSD 2TB","nameAr":"NVMe ‏2TB","type":"NVMe","gb":2000,"price":120000},
  {"id":"sata-1tb","name":"SATA SSD 1TB","nameAr":"SATA ‏1TB","type":"SATA","gb":1000,"price":55000}
];
