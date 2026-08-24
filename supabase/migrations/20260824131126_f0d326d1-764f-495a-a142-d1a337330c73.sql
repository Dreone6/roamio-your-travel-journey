REVOKE ALL ON FUNCTION public.current_entitlement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_entitlement() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_subscription() TO authenticated, service_role;

-- Trigger-only helpers must not be callable from the API surface.
REVOKE ALL ON FUNCTION public.grant_reverse_trial() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sever_follows_on_block() FROM PUBLIC, anon, authenticated;

-- The signup trial is an entitlement grant: label its source explicitly.
CREATE OR REPLACE FUNCTION public.grant_reverse_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, tier, status, entitlement_source, platform,
    trial_started_at, trial_ends_at, current_period_start, current_period_end
  )
  VALUES (
    NEW.id, 'pro', 'trialing', 'trial', 'none',
    now(), now() + interval '7 days', now(), now() + interval '7 days'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE public.subscriptions
SET entitlement_source = 'trial'
WHERE status = 'trialing' AND entitlement_source = 'none';