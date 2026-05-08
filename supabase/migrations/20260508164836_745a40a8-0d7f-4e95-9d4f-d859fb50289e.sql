
-- 1. Add trial fields to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- 2. Function: create trialing pro subscription on new profile
CREATE OR REPLACE FUNCTION public.grant_reverse_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status, trial_started_at, trial_ends_at, current_period_start, current_period_end)
  VALUES (NEW.id, 'pro', 'trialing', now(), now() + interval '7 days', now(), now() + interval '7 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_grant_trial ON public.profiles;
CREATE TRIGGER on_profile_created_grant_trial
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_reverse_trial();

-- 3. Backfill existing profiles without a subscription
INSERT INTO public.subscriptions (user_id, tier, status, trial_started_at, trial_ends_at, current_period_start, current_period_end)
SELECT p.id, 'pro', 'trialing', now(), now() + interval '7 days', now(), now() + interval '7 days'
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
WHERE s.id IS NULL;

-- 4. Sponsored pins table
CREATE TABLE IF NOT EXISTS public.sponsored_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text NOT NULL,
  category text NOT NULL DEFAULT 'experience',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  image text,
  sponsor_name text NOT NULL,
  cta_label text DEFAULT 'Learn more',
  cta_url text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sponsored pins"
ON public.sponsored_pins FOR SELECT
USING (active = true AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Admins can manage sponsored pins"
ON public.sponsored_pins FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Seed a few sample sponsored pins
INSERT INTO public.sponsored_pins (name, tagline, category, latitude, longitude, sponsor_name, cta_label) VALUES
  ('Sunset rooftop in Lisbon', 'Milo found a golden-hour spot locals love', 'food', 38.7139, -9.1334, 'Park Bar Lisboa', 'Reserve a table'),
  ('Hidden onsen near Kyoto', 'Quiet mountain bath, perfect after a long hike', 'wellness', 35.0116, 135.7681, 'Arashiyama Retreat', 'See details'),
  ('Street food crawl, Mexico City', 'Milo''s pick for the best 5 tacos in Roma Norte', 'food', 19.4144, -99.1709, 'Taco Tour CDMX', 'Join tonight');
