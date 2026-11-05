import type { Market } from '../core/types';

const MARKETS: Record<string, Market> = {
  "IQ": {
    "code": "IQ",
    "currency": "IQD",
    "symbolAr": "د.ع",
    "symbolEn": "IQD",
    "supportedPrices": true
  },
  "SA": {
    "code": "SA",
    "currency": "SAR",
    "symbolAr": "ر.س",
    "symbolEn": "SAR",
    "supportedPrices": false
  },
  "AE": {
    "code": "AE",
    "currency": "AED",
    "symbolAr": "د.إ",
    "symbolEn": "AED",
    "supportedPrices": false
  }
};
export default MARKETS;
