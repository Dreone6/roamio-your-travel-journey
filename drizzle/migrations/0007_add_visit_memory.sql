ALTER TABLE public.memories ADD COLUMN client_request_id uuid;
CREATE INDEX memories_user_request_idx ON public.memories (user_id, client_request_id) WHERE client_request_id IS NOT NULL;

-- Add note/photos to an EXISTING visit owned by the caller. Atomic and idempotent.
-- SECURITY INVOKER: caller RLS + media-token trigger + same-user visit FK still apply.
CREATE OR REPLACE FUNCTION public.add_visit_memory(
  p_client_request_id uuid,
  p_visit_id uuid,
  p_note text,
  p_photos text[],
  p_visibility text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  v public.places_visited%ROWTYPE;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_photos text[] := coalesce(p_photos, '{}');
  v_base timestamptz;
  v_existing int;
  i int;
  n int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_client_request_id IS NULL THEN RAISE EXCEPTION 'request id required' USING ERRCODE = '22023'; END IF;

  -- Serialise retries of the same request so concurrent replays cannot double-insert.
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_client_request_id::text, 0));

  SELECT count(*) INTO v_existing FROM public.memories
   WHERE user_id = uid AND client_request_id = p_client_request_id;
  IF v_existing > 0 THEN
    RETURN jsonb_build_object('visit_id',
      (SELECT visit_id FROM public.memories WHERE user_id = uid AND client_request_id = p_client_request_id LIMIT 1),
      'memories', v_existing, 'replayed', true);
  END IF;

  SELECT * INTO v FROM public.places_visited WHERE id = p_visit_id AND user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'visit not found' USING ERRCODE = '42501'; END IF;
  IF v.source = 'demo' THEN RAISE EXCEPTION 'cannot add memories to demo visits' USING ERRCODE = '22023'; END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('private','followers','public') THEN
    RAISE EXCEPTION 'invalid visibility' USING ERRCODE = '22023';
  END IF;
  IF v_note IS NOT NULL AND length(v_note) > 2000 THEN RAISE EXCEPTION 'note too long' USING ERRCODE = '22023'; END IF;
  IF array_length(v_photos, 1) > 10 THEN RAISE EXCEPTION 'too many photos' USING ERRCODE = '22023'; END IF;
  IF v_note IS NULL AND coalesce(array_length(v_photos, 1), 0) = 0 THEN
    RAISE EXCEPTION 'add a note or a photo' USING ERRCODE = '22023';
  END IF;
  FOR i IN 1 .. coalesce(array_length(v_photos, 1), 0) LOOP
    IF NOT public.media_token_owned_by(v_photos[i], uid) THEN
      RAISE EXCEPTION 'photo does not belong to you' USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- Historical ordering: place new memories inside the visit's own date, after existing ones.
  v_base := coalesce(v.date_visited::timestamptz, now())
    + make_interval(secs => (SELECT count(*) FROM public.memories WHERE visit_id = v.id AND user_id = uid)::int);

  IF coalesce(array_length(v_photos, 1), 0) = 0 THEN
    INSERT INTO public.memories (user_id, media_url, media_type, caption, location_name, latitude, longitude,
      source, source_id, visibility, visit_id, created_at, client_request_id)
    VALUES (uid, NULL, 'note', v_note, v.city, v.latitude, v.longitude,
      'manual', v.id, p_visibility, v.id, v_base + interval '1 second', p_client_request_id);
    n := 1;
  ELSE
    FOR i IN 1 .. array_length(v_photos, 1) LOOP
      INSERT INTO public.memories (user_id, media_url, media_type, caption, location_name, latitude, longitude,
        source, source_id, visibility, visit_id, created_at, client_request_id)
      VALUES (uid, v_photos[i], 'photo', CASE WHEN i = 1 THEN v_note END, v.city, v.latitude, v.longitude,
        'manual', v.id, p_visibility, v.id, v_base + make_interval(secs => i), p_client_request_id);
      n := n + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('visit_id', v.id, 'memories', n, 'replayed', false);
END $$;

REVOKE ALL ON FUNCTION public.add_visit_memory(uuid, uuid, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_visit_memory(uuid, uuid, text, text[], text) TO authenticated;