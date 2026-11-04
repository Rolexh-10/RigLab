-- RigLab PostgreSQL schema (design for the Next.js + Prisma phase). NOT used by the trial build,
-- which keeps catalog data in src/data.js and saves builds in the browser's localStorage.
-- Market and currency live in data, never in code (plan section 13).

CREATE TYPE part_category AS ENUM ('cpu','mobo','ram','gpu','storage','psu','case','cooler');
CREATE TYPE offer_status  AS ENUM ('draft','pending_review','published','stale','rejected');
CREATE TYPE price_source  AS ENUM ('sample','store_manual','store_csv','store_api');
CREATE TYPE admin_role    AS ENUM ('admin','editor','store_manager','moderator');

CREATE TABLE markets (
  code        text PRIMARY KEY,               -- 'IQ', 'SA', 'AE'
  currency    text NOT NULL,                  -- 'IQD', 'SAR', 'AED'
  prices_live boolean NOT NULL DEFAULT false  -- only IQ at launch
);

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  market_code text REFERENCES markets(code),
  locale      text NOT NULL DEFAULT 'ar',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role    admin_role NOT NULL,
  store_id uuid                                 -- set for store_manager
);

CREATE TABLE products (
  id        text PRIMARY KEY,                  -- slug, e.g. 'r5-7600'
  category  part_category NOT NULL,
  brand     text,
  name      text NOT NULL,
  name_ar   text,
  is_generic boolean NOT NULL DEFAULT false,   -- generic class, not a real SKU
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Structured specs used by the compatibility engine. NULL means "unknown", which the engine reports
-- as "unconfirmed" rather than "compatible".
CREATE TABLE product_specifications (
  product_id     text PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  socket         text, gen text, chipset text,
  ram_type       text, ram_gb int, ram_mts int,
  form_factor    text, form_factors text[],
  tdp_w          int, peak_w int, board_power_w int, psu_watts int, vendor_psu_w int,
  gpu_length_mm  int, case_max_gpu_mm int, case_max_cooler_mm int, case_radiators int[],
  cooler_height_mm int, cooler_radiator_mm int, cooler_sockets text[], cooler_rating_w int,
  stock_cooler   boolean, mem_types text[], needs_bios text[],
  storage_gb     int, storage_type text,
  extra          jsonb NOT NULL DEFAULT '{}'    -- BIOS lists, ports, M.2 slots, connectors (future rules)
);

CREATE TABLE compatibility_rules (
  id          text PRIMARY KEY,                -- 'socket', 'ramtype', ...
  title_ar    text NOT NULL, title_en text NOT NULL,
  needs       part_category[] NOT NULL,
  severity_if_failed text NOT NULL CHECK (severity_if_failed IN ('error','warn')),
  confidence  text NOT NULL CHECK (confidence IN ('high','medium','low')),
  enabled     boolean NOT NULL DEFAULT true
);

CREATE TABLE stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL REFERENCES markets(code),
  name        text NOT NULL,
  contact_url text,
  consent_to_list boolean NOT NULL DEFAULT false,  -- no real prices without consent
  delivery_fee numeric, warranty_note text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE offers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL REFERENCES products(id),
  store_id    uuid NOT NULL REFERENCES stores(id),
  price       numeric NOT NULL CHECK (price > 0),
  currency    text NOT NULL,
  in_stock    boolean NOT NULL,
  status      offer_status NOT NULL DEFAULT 'pending_review',
  source      price_source NOT NULL,
  is_sponsored boolean NOT NULL DEFAULT false, -- display label only; never affects price ordering
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, store_id)
);
CREATE INDEX offers_product_price ON offers (product_id, price) WHERE status = 'published';

CREATE TABLE price_history (
  id bigserial PRIMARY KEY,
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price numeric NOT NULL, in_stock boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE builds (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  share_code text UNIQUE,                       -- RL1.… compatible
  is_public  boolean NOT NULL DEFAULT false,    -- sharing never exposes personal data unless chosen
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE build_parts (
  build_id   uuid REFERENCES builds(id) ON DELETE CASCADE,
  category   part_category NOT NULL,
  product_id text NOT NULL REFERENCES products(id),
  PRIMARY KEY (build_id, category)
);

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  build_id uuid REFERENCES builds(id) ON DELETE SET NULL,
  campaign text, agreed_terms text,             -- per-lead or % commission agreed in writing
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE click_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL,                          -- build_started | build_completed | build_shared | store_clicked
  store_id uuid REFERENCES stores(id), campaign text,
  created_at timestamptz NOT NULL DEFAULT now() -- no IP / personal data stored
);
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  package text NOT NULL,                        -- basic_ad | featured_card | sponsored_campaign (test pricing only)
  label_text text NOT NULL DEFAULT 'إعلان',
  starts_on date NOT NULL, ends_on date NOT NULL
);

CREATE TABLE price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  target_price numeric NOT NULL
);
CREATE TABLE subscriptions (   -- RigLab Pro: only after demand is proven
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id), plan text NOT NULL,
  status text NOT NULL, started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (        -- not used until a payment gateway is contracted
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id), amount numeric NOT NULL,
  currency text NOT NULL, provider text NOT NULL, status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id), action text NOT NULL,
  entity text NOT NULL, entity_id text, detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
