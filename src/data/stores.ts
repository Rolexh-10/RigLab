import type { Store } from '../core/types';

// Sample stores (NOT real merchants). Replace with verified merchants in Phase 4.
const STORES: Store[] = [
  {
    "id": "sample-a",
    "nameAr": "متجر تجريبي (أ)",
    "nameEn": "Sample store A",
    "mult": 1,
    "deliveryIQD": 5000,
    "warranty": {
      "ar": "12 شهر (عيّنة)",
      "en": "12 months (sample)"
    },
    "sponsored": false,
    "live": false,
    "url": null
  },
  {
    "id": "sample-b",
    "nameAr": "متجر تجريبي (ب)",
    "nameEn": "Sample store B",
    "mult": 0.96,
    "deliveryIQD": null,
    "warranty": {
      "ar": "6 أشهر (عيّنة)",
      "en": "6 months (sample)"
    },
    "sponsored": false,
    "live": false,
    "url": null
  },
  {
    "id": "sample-c",
    "nameAr": "متجر تجريبي (ج)",
    "nameEn": "Sample store C",
    "mult": 1.03,
    "deliveryIQD": 0,
    "warranty": {
      "ar": "24 شهر (عيّنة)",
      "en": "24 months (sample)"
    },
    "sponsored": true,
    "live": false,
    "url": null
  }
];
export default STORES;
