-- Trigger-only functions: nobody needs to call these directly
REVOKE ALL ON FUNCTION public.set_follow_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sever_follows_on_block() FROM PUBLIC, anon, authenticated;

-- Policy helpers: must stay callable by signed-in users (RLS evaluates them as the caller),
-- but never by anonymous visitors.
REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.follows_accepted(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.profile_is_private(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.follows_accepted(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_is_private(uuid) TO authenticated;