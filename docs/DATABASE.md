# RigLab database (Phase 3)

Target: Supabase (Postgres 15+ + Auth). Files: `db/migrations/0001_init.sql` (schema + RLS), `db/seed.sql` (GENERATED from `src/data` by
`scripts/gen-seed.ts`), `db/test/supabase-shim.sql` (local-test stand-in for Supabase roles/auth; never run on Supabase).

## Model
| Table | Purpose | Who can write |
|---|---|---|
| `parts` | catalog; common columns + `specs jsonb` (socket, tdp, ...) | service role only |
| `stores` | merchants; `is_live=false` for samples, live store must have `url` | service role only |
| `offers` | price per (part, store); `source` = `sample` / `verified` | service role only |
| `profiles` | 1 row per auth user (display_name, lang); auto-created by trigger | the user, only those 2 columns |
| `saved_builds` | `{cat: partId}` per user | the owner (RLS on every operation) |

Anyone (anon) can read `parts`, `stores`, `offers`. Nobody but the service role can write them, so "sample vs verified" cannot be spoofed from the browser.

## Decisions / trade-offs
1. **`specs` as jsonb, not one table per category.** 8 categories with different fields; jsonb keeps one query path and lets Phase 4 import
   arbitrary vendor data. Cost: the DB does not type-check spec fields. Mitigation: TypeScript types (`src/core/types.ts`) are the source
   of truth and a test compares DB rows to the TS catalog, so drift fails CI.
2. **Sample/verified rule is enforced in the database** (trigger): a `sample` offer can never sit on a live store and a `verified` offer must.
   This is the "no fabricated live pricing" requirement as a constraint, not a convention.
3. **`saved_builds.parts` ids are validated by trigger** (existing part, matching category), mirroring `core.cleanBuild`.
4. **`user_id` defaults to `auth.uid()`**; clients never send it. RLS `with check` also blocks inserting/handing rows to another user.
5. **Repository interface** (`src/repo`): UI/core depend on `BuildRepo`, with `LocalBuildRepo` (anonymous, same localStorage key/format as
   before) and `SupabaseBuildRepo`. Anonymous use keeps working; cloud storage is used only when signed in.
6. Prices are IQD integers (no floats). Multi-currency (SA/AE markets) is deferred until those markets have real prices.

## Setup on Supabase (UNVERIFIED: not done here)
1. Create a project. 2. SQL editor / `supabase db push`: run `0001_init.sql`, then `db/seed.sql` (sample data only).
3. Auth: enable Email (and Google if wanted). 4. Put `SUPABASE_URL` + anon key in the web app env (never the service-role key in the browser).
5. `npm i @supabase/supabase-js`, `createClient(url, anon)` and pass it to `chooseBuildRepo({ client, signedIn, storage: localStorage })`.

## Tests
- `scripts/db-local.sh start` prints a URL; `RIGLAB_TEST_PG=<url> npm run test:db` applies shim + migration + seed on a real Postgres and checks
  seed-vs-catalog equality, anon/authenticated privileges, RLS isolation between two users, build/offer triggers, profile auto-creation.
- `tests/unit/repo.test.js` runs both repos (Supabase one against a fake client with the supabase-js call shape).

## Not done in Phase 3 (on purpose)
- The UI does not use `BuildRepo` or sign-in yet (needs a Supabase project + supabase-js; Phase 3 delivers and tests the backend side).
- No admin write path for offers (Phase 4: store integration). No migrations tool beyond plain SQL files.
