
CREATE OR REPLACE FUNCTION public.owns_trip(_trip uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = _trip AND t.user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_trip_member(_trip uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members m WHERE m.trip_id = _trip AND m.user_id = _user);
$$;

REVOKE ALL ON FUNCTION public.owns_trip(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_trip_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_trip(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Members can view collaborative trips" ON public.trips;
CREATE POLICY "Members can view collaborative trips"
ON public.trips FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_trip_member(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view their trip memberships" ON public.trip_members;
CREATE POLICY "Members can view their trip memberships"
ON public.trip_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.owns_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Trip owners can add members" ON public.trip_members;
CREATE POLICY "Trip owners can add members"
ON public.trip_members FOR INSERT TO authenticated
WITH CHECK (public.owns_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Trip owners can update members" ON public.trip_members;
CREATE POLICY "Trip owners can update members"
ON public.trip_members FOR UPDATE TO authenticated
USING (public.owns_trip(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Trip owners or self can remove membership" ON public.trip_members;
CREATE POLICY "Trip owners or self can remove membership"
ON public.trip_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.owns_trip(trip_id, auth.uid()));
