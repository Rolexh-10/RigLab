/* RigLab sample data. IMPORTANT: every price is a SAMPLE (priceSource: 'sample'), not a real Iraqi store price.
 * Layout: catalog/<category>.ts holds raw spec rows; this file derives cat/priceSource/price{IQ} so rows stay minimal. */
import type { Cat, Part, RawRow } from '../core/types';
import cpu from './catalog/cpu';
import mobo from './catalog/mobo';
import ram from './catalog/ram';
import gpu from './catalog/gpu';
import storage from './catalog/storage';
import psu from './catalog/psu';
import pcase from './catalog/case';
import cooler from './catalog/cooler';
import MARKETS from './markets';
import STORES from './stores';
import { NOTICE, SAMPLE_DATE } from './notice';

const CAT_ORDER: Cat[] = ['cpu', 'mobo', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'];
const ROWS: Record<Cat, ReadonlyArray<RawRow<Part>>> = { cpu, mobo, ram, gpu, storage, psu, case: pcase, cooler };

const PARTS: Part[] = [];
CAT_ORDER.forEach((cat) => {
  ROWS[cat].forEach((o) => {
    // The row type is the per-category shape; the cast is safe because ROWS[cat] only holds rows of that category.
    PARTS.push({ ...o, cat, priceSource: 'sample', price: { IQ: o.price } } as unknown as Part);
  });
});

export { MARKETS, NOTICE, PARTS, SAMPLE_DATE, STORES };
