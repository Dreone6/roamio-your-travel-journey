ALTER TABLE public.memories DROP CONSTRAINT memories_source_check;
ALTER TABLE public.memories ADD CONSTRAINT memories_source_check
  CHECK (source = ANY (ARRAY['story','camera','check_in','manual']));

ALTER TABLE public.places_visited ADD COLUMN client_request_id uuid;
CREATE UNIQUE INDEX places_visited_user_request_key
  ON public.places_visited (user_id, client_request_id) WHERE client_request_id IS NOT NULL;

ALTER TABLE public.places_visited ADD CONSTRAINT places_visited_date_order_check
  CHECK (end_date IS NULL OR date_visited IS NULL OR end_date >= date_visited) NOT VALID;

-- Manual visits may never be dated in the future (current_date is not allowed in CHECK).
CREATE OR REPLACE FUNCTION public.guard_manual_visit_dates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source = 'manual' THEN
    IF NEW.date_visited IS NULL THEN
      RAISE EXCEPTION 'start date required' USING ERRCODE = '22023';
    END IF;
    IF NEW.date_visited > current_date OR (NEW.end_date IS NOT NULL AND NEW.end_date > current_date) THEN
      RAISE EXCEPTION 'visit dates cannot be in the future' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_manual_visit_dates BEFORE INSERT OR UPDATE OF date_visited, end_date, source
  ON public.places_visited FOR EACH ROW EXECUTE FUNCTION public.guard_manual_visit_dates();

-- Atomic, idempotent manual past visit (SECURITY INVOKER: caller RLS applies).
-- Place details come from the server-resolved canonical places row, never the client.
CREATE OR REPLACE FUNCTION public.record_manual_visit(
  p_client_request_id uuid,
  p_place_id uuid,
  p_start date,
  p_end date,
  p_note text,
  p_photos text[],
  p_visibility text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pl public.places%ROWTYPE;
  v_visit uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_photos text[] := coalesce(p_photos, '{}');
  v_end date := CASE WHEN p_end = p_start THEN NULL ELSE p_end END;
  i int;
  n int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_client_request_id IS NULL THEN RAISE EXCEPTION 'request id required' USING ERRCODE = '22023'; END IF;

  SELECT id INTO v_visit FROM public.places_visited
   WHERE user_id = uid AND client_request_id = p_client_request_id;
  IF v_visit IS NOT NULL THEN
    RETURN jsonb_build_object('visit_id', v_visit, 'replayed', true,
      'memories', (SELECT count(*) FROM public.memories WHERE visit_id = v_visit AND user_id = uid));
  END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('private','followers','public') THEN
    RAISE EXCEPTION 'invalid visibility' USING ERRCODE = '22023';
  END IF;
  IF p_start IS NULL THEN RAISE EXCEPTION 'start date required' USING ERRCODE = '22023'; END IF;
  IF p_start > current_date OR (p_end IS NOT NULL AND p_end > current_date) THEN
    RAISE EXCEPTION 'visit dates cannot be in the future' USING ERRCODE = '22023';
  END IF;
  IF p_end IS NOT NULL AND p_end < p_start THEN
    RAISE EXCEPTION 'end date is before start date' USING ERRCODE = '22023';
  END IF;
  IF v_note IS NOT NULL AND length(v_note) > 2000 THEN
    RAISE EXCEPTION 'note too long' USING ERRCODE = '22023';
  END IF;
  IF array_length(v_photos, 1) > 10 THEN
    RAISE EXCEPTION 'too many photos' USING ERRCODE = '22023';
  END IF;
  FOR i IN 1 .. coalesce(array_length(v_photos, 1), 0) LOOP
    IF NOT public.media_token_owned_by(v_photos[i], uid) THEN
      RAISE EXCEPTION 'photo does not belong to you' USING ERRCODE = '42501';
    END IF;
  END LOOP;

  SELECT * INTO pl FROM public.places WHERE id = p_place_id AND place_type = 'city';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown place' USING ERRCODE = '22023'; END IF;

  BEGIN
    INSERT INTO public.places_visited
      (user_id, city, country, latitude, longitude, date_visited, end_date,
       scanned_photo_count, visibility, source, canonical_place_id, client_request_id)
    VALUES
      (uid, pl.name, coalesce(pl.country, 'Unknown'), pl.latitude, pl.longitude, p_start, v_end,
       0, p_visibility, 'manual', pl.id, p_client_request_id)
    RETURNING id INTO v_visit;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_visit FROM public.places_visited
     WHERE user_id = uid AND client_request_id = p_client_request_id;
    RETURN jsonb_build_object('visit_id', v_visit, 'replayed', true,
      'memories', (SELECT count(*) FROM public.memories WHERE visit_id = v_visit AND user_id = uid));
  END;

  IF coalesce(array_length(v_photos, 1), 0) = 0 THEN
    IF v_note IS NOT NULL THEN
      INSERT INTO public.memories (user_id, media_url, media_type, caption, location_name,
        latitude, longitude, source, source_id, visibility, visit_id, created_at)
      VALUES (uid, NULL, 'note', v_note, pl.name, pl.latitude, pl.longitude,
        'manual', v_visit, p_visibility, v_visit, p_start::timestamptz);
      n := 1;
    END IF;
  ELSE
    FOR i IN 1 .. array_length(v_photos, 1) LOOP
      INSERT INTO public.memories (user_id, media_url, media_type, caption, location_name,
        latitude, longitude, source, source_id, visibility, visit_id, created_at)
      VALUES (uid, v_photos[i], 'photo', CASE WHEN i = 1 THEN v_note END, pl.name,
        pl.latitude, pl.longitude, 'manual', v_visit, p_visibility, v_visit,
        p_start::timestamptz + make_interval(secs => i));
      n := n + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('visit_id', v_visit, 'replayed', false, 'memories', n);
END $$;

REVOKE ALL ON FUNCTION public.record_manual_visit(uuid, uuid, date, date, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_manual_visit(uuid, uuid, date, date, text, text[], text) TO authenticated;