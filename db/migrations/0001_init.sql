-- RigLab Phase 3: schema for Supabase (Postgres 15+). Idempotent-safe order; run with `psql -f` or the Supabase CLI.
-- Design notes: docs/DATABASE.md. Prices are ALWAYS tagged with a source; 'sample' rows can never be presented as live.

create type part_category as enum ('cpu','mobo','ram','gpu','storage','psu','case','cooler');
create type price_source  as enum ('sample','verified');   -- 'verified' = confirmed with a real store (Phase 4)

create table parts (
  id            text primary key,
  cat           part_category not null,
  brand         text,
  name          text not null,
  name_ar       text,
  generic       boolean not null default false,
  specs         jsonb not null default '{}'::jsonb,           -- category-specific fields (socket, tdp, ...); validated in app + CHECK below
  created_at    timestamptz not null default now(),
  constraint specs_is_object check (jsonb_typeof(specs) = 'object')
);
create index parts_cat_idx on parts (cat);

create table stores (
  id            text primary key,
  name_ar       text not null,
  name_en       text not null,
  is_live       boolean not null default false,               -- false = sample store, no buy link
  url           text,
  warranty_ar   text,
  warranty_en   text,
  delivery_iqd  integer check (delivery_iqd is null or delivery_iqd >= 0),
  sponsored     boolean not null default false,
  constraint live_needs_url check (not is_live or url is not null)
);

create table offers (
  id            bigint generated always as identity primary key,
  part_id       text not null references parts(id) on delete cascade,
  store_id      text not null references stores(id) on delete cascade,
  price_iqd     integer not null check (price_iqd > 0),
  available     boolean not null default true,
  source        price_source not null default 'sample',
  observed_at   timestamptz not null default now(),
  unique (part_id, store_id)
);
create index offers_part_idx on offers (part_id, price_iqd);

-- A 'sample' price can never belong to a live store and a 'verified' price must (cross-table rule => trigger, not CHECK).
create function check_offer_source() returns trigger language plpgsql as $$
declare live boolean;
begin
  select is_live into live from stores where id = new.store_id;
  if (new.source = 'verified') <> coalesce(live, false) then
    raise exception 'offer source % does not match store is_live=%', new.source, live using errcode = '23514';
  end if;
  return new;
end $$;
create trigger offers_source_check before insert or update on offers
  for each row execute function check_offer_source();

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text check (display_name is null or char_length(display_name) <= 60),
  lang          text not null default 'ar' check (lang in ('ar','en')),
  created_at    timestamptz not null default now()
);

create table saved_builds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  parts         jsonb not null default '{}'::jsonb,           -- {cat: partId}; ids checked by trigger below
  saved_at      timestamptz not null default now(),
  constraint parts_is_object check (jsonb_typeof(parts) = 'object')
);
create index saved_builds_user_idx on saved_builds (user_id, saved_at desc);

-- Every value in saved_builds.parts must be an existing part of the matching category (mirrors core cleanBuild()).
create function check_build_parts() returns trigger language plpgsql as $$
declare k text; v text;
begin
  for k, v in select key, value from jsonb_each_text(new.parts) loop
    if not exists (select 1 from parts p where p.id = v and p.cat::text = k) then
      raise exception 'invalid part % for category %', v, k using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
create trigger saved_builds_check before insert or update on saved_builds
  for each row execute function check_build_parts();

-- Auto-create a profile row when a user signs up (Supabase Auth).
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Row Level Security ----------
alter table parts        enable row level security;
alter table stores       enable row level security;
alter table offers       enable row level security;
alter table profiles     enable row level security;
alter table saved_builds enable row level security;

-- Catalog is public read-only. No insert/update/delete policy => only the service role (bypasses RLS) can write.
create policy parts_read  on parts  for select to anon, authenticated using (true);
create policy stores_read on stores for select to anon, authenticated using (true);
create policy offers_read on offers for select to anon, authenticated using (true);

create policy profiles_own_select on profiles for select to authenticated using (id = auth.uid());
create policy profiles_own_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy builds_own_select on saved_builds for select to authenticated using (user_id = auth.uid());
create policy builds_own_insert on saved_builds for insert to authenticated with check (user_id = auth.uid());
create policy builds_own_update on saved_builds for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy builds_own_delete on saved_builds for delete to authenticated using (user_id = auth.uid());

-- Table privileges (Supabase grants broad defaults; be explicit and minimal).
revoke all on parts, stores, offers, profiles, saved_builds from anon, authenticated;
grant select on parts, stores, offers to anon, authenticated;
grant select, update (display_name, lang) on profiles to authenticated;
grant select, insert, update, delete on saved_builds to authenticated;
