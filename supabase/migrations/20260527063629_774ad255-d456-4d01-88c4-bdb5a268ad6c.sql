ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN NOT NULL DEFAULT false;

-- Allow members to view collaborative trips they belong to
DROP POLICY IF EXISTS "Members can view collaborative trips" ON public.trips;
CREATE POLICY "Members can view collaborative trips"
ON public.trips FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid())
);

-- Allow members to view itinerary items of trips they belong to
DROP POLICY IF EXISTS "Members can view trip itinerary" ON public.itinerary_items;
CREATE POLICY "Members can view trip itinerary"
ON public.itinerary_items FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = itinerary_items.trip_id AND tm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members can edit trip itinerary" ON public.itinerary_items;
CREATE POLICY "Members can edit trip itinerary"
ON public.itinerary_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = itinerary_items.trip_id AND tm.user_id = auth.uid())
);

-- Public read for invite lookup by code (only the columns needed to resolve a join request)
-- We expose via SECURITY DEFINER function instead to avoid widening trips RLS.
CREATE OR REPLACE FUNCTION public.find_trip_by_invite(_code text)
RETURNS TABLE (id uuid, title text, destination text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, destination FROM public.trips WHERE invite_code = _code LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_trip_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_trip_by_invite(text) TO authenticated, anon;

-- Votes table
CREATE TABLE IF NOT EXISTS public.itinerary_item_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('up','down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_item_votes TO authenticated;
GRANT ALL ON public.itinerary_item_votes TO service_role;

ALTER TABLE public.itinerary_item_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members vote on trip items"
ON public.itinerary_item_votes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = itinerary_item_votes.trip_id AND tm.user_id = auth.uid())
);
CREATE POLICY "Members read trip votes"
ON public.itinerary_item_votes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.trip_members tm WHERE tm.trip_id = itinerary_item_votes.trip_id AND tm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = itinerary_item_votes.trip_id AND t.user_id = auth.uid())
);
CREATE POLICY "Users delete own vote"
ON public.itinerary_item_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users update own vote"
ON public.itinerary_item_votes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_item_votes;