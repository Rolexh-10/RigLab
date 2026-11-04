'use strict';
/* Sample catalog: mobo. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
module.exports = [
  {"id":"a520m","brand":"AMD","name":"A520M (mATX)","nameAr":"لوحة A520M (mATX)","generic":true,"socket":"AM4","chipset":"A520","ramType":"DDR4","form":"mATX","needsBios":["zen3"],"price":70000},
  {"id":"b550m","brand":"AMD","name":"B550M (mATX)","nameAr":"لوحة B550M (mATX)","generic":true,"socket":"AM4","chipset":"B550","ramType":"DDR4","form":"mATX","needsBios":["zen3"],"price":105000},
  {"id":"b650m","brand":"AMD","name":"B650M (mATX)","nameAr":"لوحة B650M (mATX)","generic":true,"socket":"AM5","chipset":"B650","ramType":"DDR5","form":"mATX","needsBios":[],"price":190000},
  {"id":"b650-atx","brand":"AMD","name":"B650 (ATX)","nameAr":"لوحة B650 (ATX)","generic":true,"socket":"AM5","chipset":"B650","ramType":"DDR5","form":"ATX","needsBios":[],"price":260000},
  {"id":"b660m-ddr4","brand":"Intel","name":"B660M DDR4 (mATX)","nameAr":"لوحة B660M DDR4 (mATX)","generic":true,"socket":"LGA1700","chipset":"B660","ramType":"DDR4","form":"mATX","needsBios":["raptor"],"price":110000},
  {"id":"b760m-ddr4","brand":"Intel","name":"B760M DDR4 (mATX)","nameAr":"لوحة B760M DDR4 (mATX)","generic":true,"socket":"LGA1700","chipset":"B760","ramType":"DDR4","form":"mATX","needsBios":[],"price":125000},
  {"id":"b760m-ddr5","brand":"Intel","name":"B760M DDR5 (mATX)","nameAr":"لوحة B760M DDR5 (mATX)","generic":true,"socket":"LGA1700","chipset":"B760","ramType":"DDR5","form":"mATX","needsBios":[],"price":150000},
  {"id":"z790-ddr5","brand":"Intel","name":"Z790 DDR5 (ATX)","nameAr":"لوحة Z790 DDR5 (ATX)","generic":true,"socket":"LGA1700","chipset":"Z790","ramType":"DDR5","form":"ATX","needsBios":[],"price":300000},
  {"id":"b550-atx","brand":"AMD","name":"B550 (ATX)","nameAr":"لوحة B550 (ATX)","generic":true,"socket":"AM4","chipset":"B550","ramType":"DDR4","form":"ATX","needsBios":["zen3"],"price":140000},
  {"id":"x570-atx","brand":"AMD","name":"X570 (ATX)","nameAr":"لوحة X570 (ATX)","generic":true,"socket":"AM4","chipset":"X570","ramType":"DDR4","form":"ATX","needsBios":[],"price":170000},
  {"id":"x370-atx","brand":"AMD","name":"X370 (ATX)","nameAr":"لوحة X370 (ATX)","generic":true,"socket":"AM4","chipset":"X370","ramType":"DDR4","form":"ATX","needsBios":["zen3"],"price":90000},
  {"id":"h510m","brand":"Intel","name":"H510M (mATX)","nameAr":"لوحة H510M (mATX)","generic":true,"socket":"LGA1200","chipset":"H510","ramType":"DDR4","form":"mATX","needsBios":[],"price":80000},
  {"id":"z170-atx","brand":"Intel","name":"Z170 (ATX)","nameAr":"لوحة Z170 (ATX)","generic":true,"socket":"LGA1151","chipset":"Z170","ramType":"DDR4","form":"ATX","needsBios":[],"price":60000}
];
