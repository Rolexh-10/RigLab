/* Sample catalog: gpu. Prices are SAMPLE IQD values (priceSource is set to "sample" by data/index.js), not real store prices.
 * Specs are approximate public figures; verify against vendor datasheets before launch. */
import type { Gpu, RawRow } from '../../core/types';
const rows: RawRow<Gpu>[] = [
  {"id":"rx7600","brand":"AMD","name":"Radeon RX 7600","vram":8,"tdp":165,"lengthMm":245,"vendorPsuW":550,"tier":5,"price":350000},
  {"id":"rtx4060","brand":"NVIDIA","name":"GeForce RTX 4060","vram":8,"tdp":115,"lengthMm":240,"vendorPsuW":550,"tier":5.5,"price":365000},
  {"id":"rtx4060ti","brand":"NVIDIA","name":"GeForce RTX 4060 Ti","vram":8,"tdp":160,"lengthMm":245,"vendorPsuW":550,"tier":6.5,"price":520000},
  {"id":"rx7700xt","brand":"AMD","name":"Radeon RX 7700 XT","vram":12,"tdp":245,"lengthMm":280,"vendorPsuW":700,"tier":7,"price":550000},
  {"id":"rtx4070","brand":"NVIDIA","name":"GeForce RTX 4070","vram":12,"tdp":200,"lengthMm":245,"vendorPsuW":650,"tier":7.5,"price":720000},
  {"id":"rtx4070s","brand":"NVIDIA","name":"GeForce RTX 4070 SUPER","vram":12,"tdp":220,"lengthMm":270,"vendorPsuW":650,"tier":8.5,"price":840000},
  {"id":"rx7800xt","brand":"AMD","name":"Radeon RX 7800 XT","vram":16,"tdp":263,"lengthMm":285,"vendorPsuW":700,"tier":8.5,"price":760000},
  {"id":"rtx5060ti","brand":"NVIDIA","name":"GeForce RTX 5060 Ti 16GB","vram":16,"tdp":180,"lengthMm":250,"vendorPsuW":600,"tier":7.5,"price":620000},
  {"id":"rtx5070","brand":"NVIDIA","name":"GeForce RTX 5070","vram":12,"tdp":250,"lengthMm":300,"vendorPsuW":650,"tier":9,"price":950000},
  {"id":"rtx5070ti","brand":"NVIDIA","name":"GeForce RTX 5070 Ti","vram":16,"tdp":300,"lengthMm":305,"vendorPsuW":750,"tier":10,"price":1250000},
  {"id":"rtx4090","brand":"NVIDIA","name":"GeForce RTX 4090","vram":24,"tdp":450,"lengthMm":340,"vendorPsuW":850,"tier":12,"price":2900000}
];
export default rows;
