/* Store price ingestion (Phase 4). Pure logic, no network: connectors only produce RawOffer[]; the pipeline decides what is trustworthy. */
export interface RawOffer {
  storeId: string;
  title: string;            // product title as the store writes it
  sku?: string;             // store's own code, used with SkuMap when available
  priceIqd: number;
  available: boolean;
  url?: string;
  observedAt: string;       // ISO timestamp of when the store data was read
}
export interface Connector { readonly kind: string; fetch(): Promise<RawOffer[]> }

export type SkuMap = Record<string, string>; // storeSku -> partId (hand-verified mappings win over fuzzy matching)

export type RejectReason = 'bad-price' | 'bad-date' | 'unmatched' | 'ambiguous' | 'duplicate';
export interface AcceptedOffer { partId: string; storeId: string; priceIqd: number; available: boolean; observedAt: string; url?: string; matchedBy: 'sku' | 'title' }
export interface ReviewItem { raw: RawOffer; reason: 'suspect-price' | 'ambiguous' | 'unmatched'; detail: string; candidates?: string[] }
export interface IngestReport { accepted: AcceptedOffer[]; review: ReviewItem[]; rejected: { raw: RawOffer; reason: RejectReason }[]; stats: Record<string, number> }
