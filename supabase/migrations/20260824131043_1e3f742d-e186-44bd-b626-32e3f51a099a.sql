-- 1. Entitlement columns backed by real store purchases
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS store_transaction_id text,
  ADD COLUMN IF NOT EXISTS store_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS store_environment text,
  ADD COLUMN IF NOT EXISTS entitlement_source text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS auto_renew boolean,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_platform_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_platform_check
  CHECK (platform IN ('none','apple','google','stripe','manual'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_entitlement_source_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_entitlement_source_check
  CHECK (entitlement_source IN ('none','app_store','play_store','stripe','manual_grant','trial'));

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON public.subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_store_original_txn_key
  ON public.subscriptions(platform, store_original_transaction_id)
  WHERE store_original_transaction_id IS NOT NULL;

-- 2. Clients may never write their own tier. Remove the self-insert path.
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Free row creation happens server-side only, always at tier 'free'.
CREATE OR REPLACE FUNCTION public.ensure_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.subscriptions (user_id, tier, status, entitlement_source, platform)
  VALUES (auth.uid(), 'free', 'active', 'none', 'none')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_subscription() TO authenticated;

-- Server-computed effective entitlement. Expiry collapses paid tiers to free.
CREATE OR REPLACE FUNCTION public.current_entitlement()
RETURNS TABLE (
  tier text,
  base_tier text,
  status text,
  entitlement_source text,
  platform text,
  product_id text,
  expires_at timestamptz,
  auto_renew boolean,
  last_verified_at timestamptz,
  is_trialing boolean,
  trial_ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN s.revoked_at IS NOT NULL THEN 'free'
      WHEN s.status = 'trialing' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now() THEN s.tier::text
      WHEN s.status NOT IN ('active','trialing','in_grace_period') THEN 'free'
      WHEN s.expires_at IS NOT NULL AND s.expires_at < now() THEN 'free'
      ELSE s.tier::text
    END AS tier,
    s.tier::text AS base_tier,
    s.status,
    s.entitlement_source,
    s.platform,
    s.product_id,
    s.expires_at,
    s.auto_renew,
    s.last_verified_at,
    (s.status = 'trialing' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now()) AS is_trialing,
    s.trial_ends_at
  FROM public.subscriptions s
  WHERE s.user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.current_entitlement() TO authenticated;

-- 3. Reports: give admins a real moderation workflow
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS details text;

DROP POLICY IF EXISTS "Admins can resolve reports" ON public.reports;
CREATE POLICY "Admins can resolve reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

-- 4. Auditable account deletion
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'requested',
  error text
);

GRANT ALL ON public.account_deletions TO service_role;
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view account deletions" ON public.account_deletions;
CREATE POLICY "Admins can view account deletions"
  ON public.account_deletions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
GRANT SELECT ON public.account_deletions TO authenticated;