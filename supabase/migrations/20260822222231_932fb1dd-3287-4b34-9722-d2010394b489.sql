-- Helper functions (security definer so RLS on the helper tables can't recurse)
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = _a AND b.blocked_id = _b)
       OR (b.blocker_id = _b AND b.blocked_id = _a)
  );
$$;

CREATE OR REPLACE FUNCTION public.follows_accepted(_follower uuid, _following uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = _follower AND f.following_id = _following AND f.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_is_private(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT p.is_private FROM public.profiles p WHERE p.id = _uid), false);
$$;

-- Visits of other travellers: block-aware and private-account aware
DROP POLICY IF EXISTS "Others can view shared places" ON public.places_visited;
CREATE POLICY "Others can view shared places"
ON public.places_visited FOR SELECT TO authenticated
USING (
  source <> 'demo'
  AND user_id <> auth.uid()
  AND NOT public.is_blocked_between(auth.uid(), user_id)
  AND (
    (visibility = 'public'
      AND (NOT public.profile_is_private(user_id) OR public.follows_accepted(auth.uid(), user_id)))
    OR (visibility = 'followers' AND public.follows_accepted(auth.uid(), user_id))
  )
);

-- Follow graph
CREATE UNIQUE INDEX IF NOT EXISTS follows_unique_pair ON public.follows (follower_id, following_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

DROP POLICY IF EXISTS "Users can manage own follows" ON public.follows;

CREATE POLICY "Accepted follows are visible, pending only to participants"
ON public.follows FOR SELECT TO authenticated
USING (status = 'accepted' OR auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users create their own follows"
ON public.follows FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = follower_id
  AND follower_id <> following_id
  AND NOT public.is_blocked_between(follower_id, following_id)
);

CREATE POLICY "Followed user can accept or reject"
ON public.follows FOR UPDATE TO authenticated
USING (auth.uid() = following_id)
WITH CHECK (auth.uid() = following_id);

CREATE POLICY "Either side can remove a follow"
ON public.follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Follow status is decided by the server, never the client
CREATE OR REPLACE FUNCTION public.set_follow_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status := CASE
    WHEN COALESCE((SELECT p.is_private FROM public.profiles p WHERE p.id = NEW.following_id), false)
      THEN 'pending' ELSE 'accepted' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS follows_set_status ON public.follows;
CREATE TRIGGER follows_set_status
BEFORE INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.set_follow_status();

-- Blocking severs the follow relationship in both directions
CREATE OR REPLACE FUNCTION public.sever_follows_on_block()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blocked_users_sever_follows ON public.blocked_users;
CREATE TRIGGER blocked_users_sever_follows
AFTER INSERT ON public.blocked_users
FOR EACH ROW EXECUTE FUNCTION public.sever_follows_on_block();