ALTER TYPE public.itinerary_type ADD VALUE IF NOT EXISTS 'flight';
ALTER TYPE public.itinerary_type ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE public.itinerary_type ADD VALUE IF NOT EXISTS 'note';

ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmation_ref text;

CREATE POLICY "Members can update trip itinerary"
  ON public.itinerary_items FOR UPDATE TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can delete trip itinerary"
  ON public.itinerary_items FOR DELETE TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.trip_saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'place',
  title text NOT NULL,
  subtitle text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  source_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_saved_places TO authenticated;
GRANT ALL ON public.trip_saved_places TO service_role;

ALTER TABLE public.trip_saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip people can view saved places"
  ON public.trip_saved_places FOR SELECT TO authenticated
  USING (public.owns_trip(trip_id, auth.uid()) OR public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip people can save places"
  ON public.trip_saved_places FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.owns_trip(trip_id, auth.uid()) OR public.is_trip_member(trip_id, auth.uid())));

CREATE POLICY "Savers can update their saved places"
  ON public.trip_saved_places FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Savers or trip owners can remove saved places"
  ON public.trip_saved_places FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.owns_trip(trip_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trip_saved_places_updated_at
  BEFORE UPDATE ON public.trip_saved_places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS trip_saved_places_trip_idx ON public.trip_saved_places(trip_id);

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS world_visit_id uuid REFERENCES public.places_visited(id) ON DELETE SET NULL;