/* Sample catalog: psu. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
import type { Psu, RawRow } from '../../core/types';
const rows: RawRow<Psu>[] = [
  {"id":"psu-550","name":"550W PSU","nameAr":"مزود طاقة 550W","watts":550,"price":55000},
  {"id":"psu-650","name":"650W PSU","nameAr":"مزود طاقة 650W","watts":650,"price":70000},
  {"id":"psu-750","name":"750W PSU","nameAr":"مزود طاقة 750W","watts":750,"price":90000},
  {"id":"psu-850","name":"850W PSU","nameAr":"مزود طاقة 850W","watts":850,"price":120000}
];
export default rows;
