# Store integration (Phase 4)

**Status: pipeline built and tested with fixture data. No real Iraqi store is connected, and no real price is in this repo.**
Going live needs, per store, written permission (see `docs/STORES.md`) — nothing here scrapes anyone.

## Flow
`Connector` (CSV today; API later) -> `RawOffer[]` -> `ingest()` -> { accepted, review, rejected } -> `toSql()` -> service role -> DB.
- **Matching** (`src/ingest/match.ts`): store SKU map first (hand-verified), else conservative title matching. Every model token with a digit
  must appear verbatim (`5600` != `5600X`, `16GB` != `32GB`); variant words (Ti, SUPER, XT, X3D...) must agree exactly; ties => review.
  When unsure the row goes to the review queue — never a guess.
- **Validation:** price must be a positive integer IQD, date parseable and not in the future; price outside 0.4x–3x of the catalog reference
  => review (typo / wrong product); one row per (part, store).
- **Database guards** (`db/migrations/0002`): a store can be `is_live` only with `store_onboarding.status='active'` (with permission note + date);
  verified prices are written only through `upsert_verified_offer` (service role), which refuses non-active stores and ignores older observations;
  `offers_public.stale` flags prices older than 7 days — the UI must render those as outdated.
- **Freshness policy:** `MAX_AGE_DAYS = 7`.

## Onboarding a store (manual, by you)
1. Get written permission (WhatsApp/email screenshot is enough for private testing). 2. Insert the store (`is_live=false`) and its
`store_onboarding` row as `pending`. 3. Agree a feed: CSV columns `title,price[,sku,available,url,observed_at]`.
4. `node --import tsx scripts/ingest.ts --store <id> --csv feed.csv --sql out.sql`, read the report, resolve REVIEW lines (add SKUs to a map file).
5. Set onboarding `active` + `stores.is_live=true` (same transaction), then `psql -f out.sql` with the service role.

## Not done yet
- UI still shows sample offers from `core/offers.ts`; reading `offers_public` (and the "stale"/"verified" badges) comes with the Supabase wiring.
- No scheduler, no API connectors, no admin screen for the review queue (SQL only for now).
