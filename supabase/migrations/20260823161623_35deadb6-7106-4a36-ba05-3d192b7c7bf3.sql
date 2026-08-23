-- Enums for the normalized marketplace model
DO $$ BEGIN
  CREATE TYPE public.offer_source AS ENUM ('roavr_direct','partner','supplier','affiliate','demo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_type AS ENUM ('standard','roavr_price','roavr_exclusive','roavr_drop');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_mode AS ENUM ('preview_only','external_redirect','affiliate_redirect','supplier_checkout','roavr_checkout','direct_merchant_request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.offer_source NOT NULL DEFAULT 'roavr_direct',
  source_offer_id TEXT,
  merchant_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL,
  category public.offer_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  retail_price NUMERIC,
  roavr_price NUMERIC,
  merchant_payout NUMERIC,
  commission_amount NUMERIC,
  discount_amount NUMERIC,
  inventory_remaining INTEGER,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  booking_mode public.booking_mode NOT NULL DEFAULT 'preview_only',
  booking_url TEXT,
  deal_type public.deal_type NOT NULL DEFAULT 'standard',
  terms TEXT,
  cancellation_policy TEXT,
  whats_included TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC,
  rating_count INTEGER,
  rating_source TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_offers TO anon;
GRANT SELECT ON public.marketplace_offers TO authenticated;
GRANT ALL ON public.marketplace_offers TO service_role;

ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketplace offers"
  ON public.marketplace_offers FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage marketplace offers"
  ON public.marketplace_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketplace_offers_updated_at
  BEFORE UPDATE ON public.marketplace_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS marketplace_offers_geo_idx ON public.marketplace_offers (latitude, longitude);
CREATE INDEX IF NOT EXISTS marketplace_offers_city_idx ON public.marketplace_offers (lower(city));
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_offers_source_key
  ON public.marketplace_offers (source, source_offer_id) WHERE source_offer_id IS NOT NULL;

-- Legacy partner offers: flag existing seeded rows as demo content
ALTER TABLE public.partner_offers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT true;
UPDATE public.partner_offers SET is_demo = true WHERE partner_id IS NULL;

-- Migrate legacy seeded offers into the normalized model as clearly-marked preview inventory
INSERT INTO public.marketplace_offers (
  source, source_offer_id, merchant_id, merchant_name, category, title, description,
  address, latitude, longitude, image_url, deal_type, booking_mode, is_demo, active
)
SELECT 'demo', po.id::text, po.partner_id, po.business_name, po.category,
       COALESCE(NULLIF(po.discount, ''), po.business_name),
       po.offer_description, po.address, po.latitude, po.longitude, po.image,
       'roavr_exclusive', 'preview_only', true, po.active
FROM public.partner_offers po
ON CONFLICT DO NOTHING;

-- Radius search over normalized inventory
CREATE OR REPLACE FUNCTION public.nearby_marketplace_offers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 10,
  include_demo BOOLEAN DEFAULT true
)
RETURNS SETOF public.marketplace_offers
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.marketplace_offers o
  WHERE o.active = true
    AND (include_demo OR o.is_demo = false)
    AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
    AND (3959 * acos(
          LEAST(1, cos(radians(lat)) * cos(radians(o.latitude)) *
          cos(radians(o.longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(o.latitude)))
        )) <= radius_miles
  ORDER BY (3959 * acos(
          LEAST(1, cos(radians(lat)) * cos(radians(o.latitude)) *
          cos(radians(o.longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(o.latitude)))
        )) ASC;
$$;