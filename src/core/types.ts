/* RigLab core/types: the data model shared by data, core and UI. Types only, no runtime code. */

export type Cat = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case' | 'cooler';
export type MarketCode = 'IQ' | 'SA' | 'AE';
export type Lang = 'ar' | 'en';
export interface Bilingual { ar: string; en: string }

export interface CatInfo extends Bilingual { key: Cat; required: boolean }

/** Fields every catalog row has. `price` is per-market; only IQ is populated and it is SAMPLE data. */
export interface PartBase {
  id: string;
  brand?: string;
  name: string;
  nameAr?: string;
  generic?: boolean;
  priceSource: 'sample';
  price: Record<string, number | undefined>;
}
export interface Cpu extends PartBase { cat: 'cpu'; socket: string; gen: string; cores: number; threads: number; tdp: number; peakW: number; stockCooler: boolean; memTypes: string[]; tier: number }
export interface Mobo extends PartBase { cat: 'mobo'; socket: string; chipset: string; ramType: string; form: string; needsBios?: string[] }
export interface Ram extends PartBase { cat: 'ram'; type: string; gb: number; speed: number }
export interface Gpu extends PartBase { cat: 'gpu'; vram: number; tdp: number; lengthMm: number; vendorPsuW: number; tier: number }
export interface Storage extends PartBase { cat: 'storage'; type: string; gb: number }
export interface Psu extends PartBase { cat: 'psu'; watts: number }
export interface Case extends PartBase { cat: 'case'; formFactors: string[]; maxGpuMm: number; maxCoolerMm: number; radiators: number[]; dims?: { W: number; H: number; D: number } }
export interface Cooler extends PartBase { cat: 'cooler'; type: 'air' | 'aio'; heightMm: number; radiatorMm: number; sockets: string[]; tdpRating: number }
export type Part = Cpu | Mobo | Ram | Gpu | Storage | Psu | Case | Cooler;

/** A catalog source row: a Part without the fields data/index derives (cat, priceSource) and with a flat price. */
export type RawRow<P extends Part> = Omit<P, 'cat' | 'priceSource' | 'price'> & { price: number };

export interface PartMap { cpu?: Cpu; mobo?: Mobo; ram?: Ram; gpu?: Gpu; storage?: Storage; psu?: Psu; case?: Case; cooler?: Cooler }
export type BuildIds = Partial<Record<Cat, string>>;

export interface SavedBuild { id: string | number; name: string; parts: BuildIds; savedAt: string | null }

export interface Market { code: MarketCode; currency: string; symbolAr: string; symbolEn: string; supportedPrices: boolean }

export interface Store {
  id: string; nameAr: string; nameEn: string; mult: number; deliveryIQD: number | null;
  warranty: Bilingual; sponsored: boolean; live: boolean; url: string | null;
}
export interface Offer {
  partId: string; storeId: string; storeNameAr: string; storeNameEn: string; price: number; currency: 'IQD';
  available: boolean; warranty: Bilingual; deliveryIQD: number | null; sponsored: boolean; updated: string; source: 'sample';
}

export type Status = 'ok' | 'warn' | 'error' | 'unknown' | 'pending' | 'info';
export type Verdict = 'ok' | 'warn' | 'error' | 'unknown' | 'empty';
export type Confidence = 'high' | 'medium' | 'low' | null;
export interface CompatItem { id: string; status: Status; title: Bilingual; detail: Bilingual; confidence: Confidence; source: string | null; missing?: Cat[] }
export interface CompatResult { items: CompatItem[]; counts: Record<Status, number>; verdict: Verdict; missingRequired: Cat[] }

export interface SpecRow { ar: string; en: string; v: string; raw: number | null; dir: number }
export interface CartItem { partId: string; storeId: string; qty: number }
