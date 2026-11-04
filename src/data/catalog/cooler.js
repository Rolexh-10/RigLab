'use strict';
/* Sample catalog: cooler. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
module.exports = [
  {"id":"cool-tower-120","name":"Single Tower 120mm","nameAr":"مبرد برج 120mm","type":"air","heightMm":150,"radiatorMm":0,"sockets":["AM4","AM5","LGA1700","LGA1200","LGA1151"],"tdpRating":150,"price":30000},
  {"id":"cool-dual-tower","name":"Dual Tower","nameAr":"مبرد برج مزدوج","type":"air","heightMm":160,"radiatorMm":0,"sockets":["AM4","AM5","LGA1700","LGA1200","LGA1151"],"tdpRating":220,"price":60000},
  {"id":"cool-aio-240","name":"AIO 240mm","nameAr":"تبريد مائي AIO 240mm","type":"aio","heightMm":0,"radiatorMm":240,"sockets":["AM4","AM5","LGA1700","LGA1200","LGA1151"],"tdpRating":250,"price":110000},
  {"id":"cool-aio-360","name":"AIO 360mm","nameAr":"تبريد مائي AIO 360mm","type":"aio","heightMm":0,"radiatorMm":360,"sockets":["AM4","AM5","LGA1700","LGA1200","LGA1151"],"tdpRating":300,"price":170000}
];
