'use strict';
/* RigLab sample data. IMPORTANT: every price is a SAMPLE (priceSource: 'sample'), not a real Iraqi store price.
 * Layout: catalog/<category>.js holds raw spec rows; this file derives cat/priceSource/price{IQ} so rows stay minimal. */
var CAT_ORDER = ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'];
var PARTS = [];
CAT_ORDER.forEach(function (cat) {
  require('./catalog/' + cat).forEach(function (o) {
    var p = {};
    for (var k in o) p[k] = o[k];
    p.cat = cat;
    p.priceSource = 'sample';
    p.price = { IQ: o.price };
    PARTS.push(p);
  });
});
var meta = require('./notice');
module.exports = { MARKETS: require('./markets'), PARTS: PARTS, STORES: require('./stores'), SAMPLE_DATE: meta.SAMPLE_DATE, NOTICE: meta.NOTICE };
