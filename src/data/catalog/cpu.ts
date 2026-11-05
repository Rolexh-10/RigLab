/* Sample catalog: cpu. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
import type { Cpu, RawRow } from '../../core/types';
const rows: RawRow<Cpu>[] = [
  {"id":"r5-5600","brand":"AMD","name":"Ryzen 5 5600","socket":"AM4","gen":"zen3","cores":6,"threads":12,"tdp":65,"peakW":88,"stockCooler":true,"memTypes":["DDR4"],"tier":5,"price":160000},
  {"id":"r7-5700x","brand":"AMD","name":"Ryzen 7 5700X","socket":"AM4","gen":"zen3","cores":8,"threads":16,"tdp":65,"peakW":88,"stockCooler":false,"memTypes":["DDR4"],"tier":6,"price":215000},
  {"id":"r5-7600","brand":"AMD","name":"Ryzen 5 7600","socket":"AM5","gen":"zen4","cores":6,"threads":12,"tdp":65,"peakW":88,"stockCooler":true,"memTypes":["DDR5"],"tier":7,"price":270000},
  {"id":"r7-7700x","brand":"AMD","name":"Ryzen 7 7700X","socket":"AM5","gen":"zen4","cores":8,"threads":16,"tdp":105,"peakW":142,"stockCooler":false,"memTypes":["DDR5"],"tier":8,"price":400000},
  {"id":"i5-12400f","brand":"Intel","name":"Core i5-12400F","socket":"LGA1700","gen":"alder","cores":6,"threads":12,"tdp":65,"peakW":117,"stockCooler":true,"memTypes":["DDR4","DDR5"],"tier":5.5,"price":150000},
  {"id":"i5-13400f","brand":"Intel","name":"Core i5-13400F","socket":"LGA1700","gen":"raptor","cores":10,"threads":16,"tdp":65,"peakW":148,"stockCooler":true,"memTypes":["DDR4","DDR5"],"tier":6.5,"price":230000},
  {"id":"i7-14700k","brand":"Intel","name":"Core i7-14700K","socket":"LGA1700","gen":"raptor","cores":20,"threads":28,"tdp":125,"peakW":253,"stockCooler":false,"memTypes":["DDR4","DDR5"],"tier":9,"price":560000},
  {"id":"r5-3600","brand":"AMD","name":"Ryzen 5 3600","socket":"AM4","gen":"zen2","cores":6,"threads":12,"tdp":65,"peakW":88,"stockCooler":true,"memTypes":["DDR4"],"tier":4,"price":120000},
  {"id":"r7-7800x3d","brand":"AMD","name":"Ryzen 7 7800X3D","socket":"AM5","gen":"zen4","cores":8,"threads":16,"tdp":120,"peakW":162,"stockCooler":false,"memTypes":["DDR5"],"tier":9.5,"price":600000},
  {"id":"r9-7900x","brand":"AMD","name":"Ryzen 9 7900X","socket":"AM5","gen":"zen4","cores":12,"threads":24,"tdp":170,"peakW":230,"stockCooler":false,"memTypes":["DDR5"],"tier":9,"price":520000},
  {"id":"r9-7950x3d","brand":"AMD","name":"Ryzen 9 7950X3D","socket":"AM5","gen":"zen4","cores":16,"threads":32,"tdp":120,"peakW":160,"stockCooler":false,"memTypes":["DDR5"],"tier":10.5,"price":900000},
  {"id":"i7-10700k","brand":"Intel","name":"Core i7-10700K","socket":"LGA1200","gen":"comet","cores":8,"threads":16,"tdp":125,"peakW":229,"stockCooler":false,"memTypes":["DDR4"],"tier":6,"price":200000},
  {"id":"i7-6700k","brand":"Intel","name":"Core i7-6700K","socket":"LGA1151","gen":"skylake","cores":4,"threads":8,"tdp":91,"peakW":120,"stockCooler":false,"memTypes":["DDR4"],"tier":3,"price":70000}
];
export default rows;
