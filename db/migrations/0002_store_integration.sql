-- RigLab Phase 4: store onboarding, verified-offer ingestion, review queue, freshness. Requires 0001.

create type onboarding_status as enum ('pending','permitted','active','suspended');

-- One row per real merchant: we only go live after written permission (docs/STORES.md). Sample stores need no row.
create table store_onboarding (
  store_id         text primary key references stores(id) on delete cascade,
  status           onboarding_status not null default 'pending',
  permission_note  text,                         -- where/how permission was given (e.g. "WhatsApp 2026-11-10, owner Ahmed")
  contact          text,
  permitted_at     timestamptz,
  feed_kind        text check (feed_kind in ('csv','api','manual')),
  constraint permitted_needs_proof check (status in ('pending') or (permission_note is not null and permitted_at is not null))
);

-- A store may only be live while its onboarding is 'active'.
create function check_store_live() returns trigger language plpgsql as $$
begin
  if new.is_live and not exists (select 1 from store_onboarding o where o.store_id = new.id and o.status = 'active') then
    raise exception 'store % cannot be live without active onboarding', new.id using errcode = '23514';
  end if;
  return new;
end $$;
create constraint trigger stores_live_check after insert or update on stores
  deferrable initially deferred for each row execute function check_store_live();

-- Items the importer could not decide alone (suspect price, ambiguous / unknown product). Humans resolve them.
create table offer_review_queue (
  id          bigint generated always as identity primary key,
  store_id    text not null references stores(id) on delete cascade,
  raw         jsonb not null,
  reason      text not null check (reason in ('suspect-price','ambiguous','unmatched')),
  detail      text,
  status      text not null default 'open' check (status in ('open','accepted','dismissed')),
  created_at  timestamptz not null default now()
);

-- The only write path for verified prices. Refuses stores that are not live+active; older observations never overwrite newer ones.
create function upsert_verified_offer(p_part text, p_store text, p_price integer, p_available boolean, p_observed timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from stores s join store_onboarding o on o.store_id = s.id where s.id = p_store and s.is_live and o.status = 'active') then
    raise exception 'store % is not live/active', p_store using errcode = '42501';
  end if;
  insert into offers (part_id, store_id, price_iqd, available, source, observed_at)
  values (p_part, p_store, p_price, p_available, 'verified', p_observed)
  on conflict (part_id, store_id) do update
    set price_iqd = excluded.price_iqd, available = excluded.available, observed_at = excluded.observed_at
    where offers.observed_at <= excluded.observed_at;
end $$;
revoke all on function upsert_verified_offer(text,text,integer,boolean,timestamptz) from public, anon, authenticated;

-- Public read model: adds `stale` (older than 7 days). The UI must show stale prices as outdated, never as current.
create view offers_public with (security_invoker = true) as
  select o.part_id, o.store_id, o.price_iqd, o.available, o.source, o.observed_at,
         (o.observed_at < now() - interval '7 days') as stale
  from offers o;

alter table store_onboarding  enable row level security;   -- no policies: service role only
alter table offer_review_queue enable row level security;  -- no policies: service role only
revoke all on store_onboarding, offer_review_queue from anon, authenticated;
grant select on offers_public to anon, authenticated;
