
-- 1. trip_members
CREATE TABLE public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner','collaborator')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_members TO authenticated;
GRANT ALL ON public.trip_members TO service_role;

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their trip memberships"
ON public.trip_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);

CREATE POLICY "Trip owners can add members"
ON public.trip_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);

CREATE POLICY "Trip owners can update members"
ON public.trip_members FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);

CREATE POLICY "Trip owners or self can remove membership"
ON public.trip_members FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
);

-- 2. flight_alerts
CREATE TABLE public.flight_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flight_number text NOT NULL,
  origin text,
  destination text,
  departure_date date,
  alert_types text[] DEFAULT '{}',
  last_status jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_alerts TO authenticated;
GRANT ALL ON public.flight_alerts TO service_role;

ALTER TABLE public.flight_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flight alerts"
ON public.flight_alerts FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. waitlist
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user','partner')),
  referral_code text UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  referred_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Extend partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter','growth','elite')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS monthly_claim_target int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS monthly_view_target int NOT NULL DEFAULT 600,
  ADD COLUMN IF NOT EXISTS monthly_revenue_target numeric NOT NULL DEFAULT 3500;

-- Allow a partner to read their own partners row
CREATE POLICY "Partners can view own row"
ON public.partners FOR SELECT TO authenticated
USING (id = auth.uid());
