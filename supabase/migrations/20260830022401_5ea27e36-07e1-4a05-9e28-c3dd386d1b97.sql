-- Helper: can this user edit the trip?
CREATE OR REPLACE FUNCTION public.can_edit_trip(_trip uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = _trip AND t.user_id = _user)
    OR EXISTS (
      SELECT 1 FROM public.trip_members m
      WHERE m.trip_id = _trip AND m.user_id = _user AND m.role IN ('owner','editor')
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.trip_is_public(_trip uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = _trip AND t.visibility = 'public')
$$;

-- TRIPS ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own trips" ON public.trips;

CREATE POLICY "Owners can create trips"
ON public.trips FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and editors can update trips"
ON public.trips FOR UPDATE TO authenticated
USING (public.can_edit_trip(id, auth.uid()))
WITH CHECK (public.can_edit_trip(id, auth.uid()));

CREATE POLICY "Owners and editors can delete trips"
ON public.trips FOR DELETE TO authenticated
USING (public.can_edit_trip(id, auth.uid()));

CREATE POLICY "Owners can view own trips"
ON public.trips FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public trips"
ON public.trips FOR SELECT TO anon, authenticated
USING (visibility = 'public');

GRANT SELECT ON public.trips TO anon;

-- ITINERARY ITEMS --------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can edit trip itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can update trip itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can delete trip itinerary" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can view trip itinerary" ON public.itinerary_items;

CREATE POLICY "Editors can insert itinerary items"
ON public.itinerary_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_edit_trip(trip_id, auth.uid()));

CREATE POLICY "Editors can update itinerary items"
ON public.itinerary_items FOR UPDATE TO authenticated
USING (public.can_edit_trip(trip_id, auth.uid()))
WITH CHECK (public.can_edit_trip(trip_id, auth.uid()));

CREATE POLICY "Editors can delete itinerary items"
ON public.itinerary_items FOR DELETE TO authenticated
USING (public.can_edit_trip(trip_id, auth.uid()));

CREATE POLICY "Members can view itinerary items"
ON public.itinerary_items FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_trip_member(trip_id, auth.uid()) OR public.can_edit_trip(trip_id, auth.uid()));

CREATE POLICY "Anyone can view public trip itineraries"
ON public.itinerary_items FOR SELECT TO anon, authenticated
USING (public.trip_is_public(trip_id));

GRANT SELECT ON public.itinerary_items TO anon;

-- REALTIME ---------------------------------------------------------------
ALTER TABLE public.itinerary_items REPLICA IDENTITY FULL;
ALTER TABLE public.trip_members REPLICA IDENTITY FULL;